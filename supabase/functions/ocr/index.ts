// =============================================================================
// UPlan Finance Tracker - OCR Edge Function
// Endpoint: /functions/v1/ocr
// Description: Extract transaction data from QRIS receipt images using
//              Google Cloud Vision API TEXT_DETECTION
// =============================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ─────────────────────────────────────────────────────────────────────────────
// CORS Headers
// ─────────────────────────────────────────────────────────────────────────────
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface OCRRequest {
  imageBase64: string;
}

interface OCRResponse {
  amount: number | null;
  merchant: string | null;
  date: string | null;
  rawText: string;
}

interface VisionAPIResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      locale?: string;
    }>;
    error?: {
      code: number;
      message: string;
    };
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Amount Extraction
// Parses Indonesian Rupiah amounts from receipt text
// Handles: Rp 50.000, Rp50000, Rp. 50,000, IDR 50.000, 50.000,00
// ─────────────────────────────────────────────────────────────────────────────
function extractAmount(text: string): number | null {
  // Patterns ordered by specificity (most specific first)
  const patterns: RegExp[] = [
    // "Rp" or "IDR" followed by amount with dots/commas as thousands separator
    /(?:Rp\.?\s*|IDR\s*)(\d{1,3}(?:[.,]\d{3})*)/gi,
    // "Total" or "Jumlah" line with amount
    /(?:total|jumlah|amount|nominal|bayar|pembayaran)\s*:?\s*(?:Rp\.?\s*|IDR\s*)?(\d{1,3}(?:[.,]\d{3})*)/gi,
    // Standalone large numbers (likely amounts, 4+ digits)
    /\b(\d{1,3}(?:\.\d{3})+)\b/g,
  ];

  const amounts: number[] = [];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const rawAmount = match[1];
      // Remove thousands separators (dots or commas) and parse
      const cleaned = rawAmount.replace(/[.,]/g, "");
      const parsed = parseInt(cleaned, 10);

      // Sanity check: amount should be reasonable for Indonesian transactions
      // (Rp 100 to Rp 100,000,000)
      if (parsed >= 100 && parsed <= 100_000_000) {
        amounts.push(parsed);
      }
    }
  }

  if (amounts.length === 0) return null;

  // Return the largest amount found (usually the total)
  return Math.max(...amounts);
}

// ─────────────────────────────────────────────────────────────────────────────
// Merchant Name Extraction
// Looks for "Kepada", "Merchant", or falls back to first meaningful line
// ─────────────────────────────────────────────────────────────────────────────
function extractMerchant(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Pattern 1: "Kepada: <merchant>" or "Merchant: <merchant>"
  const merchantPatterns = [
    /(?:kepada|merchant|toko|nama\s*(?:merchant|toko)|penerima|to)\s*[:=]\s*(.+)/i,
    /(?:merchant\s*name|nama\s*merchant)\s*[:=]\s*(.+)/i,
  ];

  for (const pattern of merchantPatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length >= 2 && name.length <= 100) {
          return name;
        }
      }
    }
  }

  // Pattern 2: Look for a line that seems like a business name
  // (capitalized, not a number, not a common label)
  const skipPatterns =
    /^(tanggal|date|waktu|time|total|jumlah|nominal|rp|idr|ref|no|transaksi|transaction|status|berhasil|sukses|success|pembayaran|payment)/i;

  for (const line of lines) {
    if (
      line.length >= 3 &&
      line.length <= 60 &&
      !skipPatterns.test(line) &&
      !/^\d+$/.test(line) &&
      !/^[.,\-=_]+$/.test(line)
    ) {
      return line;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Extraction
// Handles Indonesian date formats: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY
// ─────────────────────────────────────────────────────────────────────────────
function extractDate(text: string): string | null {
  const datePatterns = [
    // DD/MM/YYYY HH:MM or DD-MM-YYYY HH:MM
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*(?:(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
    // YYYY-MM-DD (ISO format)
    /(\d{4})-(\d{2})-(\d{2})(?:\s*(?:(\d{1,2}):(\d{2})(?::(\d{2}))?)?)?/,
    // DD Month YYYY (Indonesian months)
    /(\d{1,2})\s+(Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|Jun(?:i)?|Jul(?:i)?|Agu(?:stus)?|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Des(?:ember)?)\s+(\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Validation
// ─────────────────────────────────────────────────────────────────────────────
function validateInput(body: unknown): { valid: true; data: OCRRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const { imageBase64 } = body as Record<string, unknown>;

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return {
      valid: false,
      error: "Missing required field: imageBase64 (string)",
    };
  }

  // Validate base64 string (rough check)
  if (imageBase64.length < 100) {
    return { valid: false, error: "imageBase64 is too short to be a valid image" };
  }

  // Check max size (~10MB in base64 ≈ ~13.3MB string)
  if (imageBase64.length > 14_000_000) {
    return { valid: false, error: "Image too large. Maximum size is 10MB." };
  }

  return { valid: true, data: { imageBase64: imageBase64 as string } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { imageBase64 } = validation.data;

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Get Google Vision API key
    const visionKey = Deno.env.get("GOOGLE_VISION_KEY");
    if (!visionKey) {
      console.error("GOOGLE_VISION_KEY environment variable not set");
      return new Response(
        JSON.stringify({ error: "OCR service configuration error" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Call Google Cloud Vision API
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`;
    const visionPayload = {
      requests: [
        {
          image: { content: base64Data },
          features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          imageContext: {
            languageHints: ["id", "en"],
          },
        },
      ],
    };

    const visionResponse = await fetch(visionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visionPayload),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error(`Vision API error (${visionResponse.status}): ${errorText}`);
      return new Response(
        JSON.stringify({
          error: "OCR processing failed",
          details: `Vision API returned status ${visionResponse.status}`,
        }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const visionResult: VisionAPIResponse = await visionResponse.json();

    // Check for Vision API errors
    const firstResponse = visionResult.responses?.[0];
    if (firstResponse?.error) {
      console.error("Vision API response error:", firstResponse.error);
      return new Response(
        JSON.stringify({
          error: "OCR processing failed",
          details: firstResponse.error.message,
        }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Extract raw text from Vision response
    const rawText =
      firstResponse?.textAnnotations?.[0]?.description ?? "";

    if (!rawText) {
      return new Response(
        JSON.stringify({
          amount: null,
          merchant: null,
          date: null,
          rawText: "",
          message: "No text detected in the image",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Parse the extracted text
    const result: OCRResponse = {
      amount: extractAmount(rawText),
      merchant: extractMerchant(rawText),
      date: extractDate(rawText),
      rawText,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in OCR function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

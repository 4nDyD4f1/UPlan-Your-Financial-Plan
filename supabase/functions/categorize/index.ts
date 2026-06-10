// =============================================================================
// UPlan Finance Tracker - Categorize Edge Function
// Endpoint: /functions/v1/categorize
// Description: Categorize merchant names into spending categories using
//              OpenAI GPT-4o-mini with local keyword fallback
// =============================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

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
type SpendingCategory =
  | "food"
  | "coffee"
  | "transport"
  | "shopping"
  | "entertainment"
  | "bills"
  | "health"
  | "other";

const VALID_CATEGORIES: SpendingCategory[] = [
  "food",
  "coffee",
  "transport",
  "shopping",
  "entertainment",
  "bills",
  "health",
  "other",
];

interface CategorizeRequest {
  merchantName: string;
}

interface CategorizeResponse {
  category: SpendingCategory;
  confidence: "ai" | "keyword" | "default";
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Keyword Mapping (Fallback)
// Maps Indonesian & common merchant keywords to categories
// ─────────────────────────────────────────────────────────────────────────────
const KEYWORD_MAP: Array<{ keywords: string[]; category: SpendingCategory }> = [
  {
    category: "coffee",
    keywords: [
      "kopi",
      "coffee",
      "starbucks",
      "kenangan",
      "janji jiwa",
      "jiwa",
      "fore",
      "tuku",
      "point coffee",
      "tomoro",
      "flash coffee",
      "maxx coffee",
      "excelso",
      "anomali",
      "djournal",
      "tanamera",
      "kulo",
      "jco",
      "dunkin",
      "cafe",
      "kafe",
      "latte",
      "espresso",
      "cappuccino",
      "barista",
    ],
  },
  {
    category: "food",
    keywords: [
      "makan",
      "resto",
      "restaurant",
      "warteg",
      "warung",
      "mie ayam",
      "bakso",
      "nasi",
      "padang",
      "mcd",
      "mcdonald",
      "kfc",
      "burger",
      "pizza",
      "hokben",
      "yoshinoya",
      "solaria",
      "bakmi",
      "sate",
      "soto",
      "geprek",
      "ayam",
      "ikan",
      "seafood",
      "indomie",
      "sederhana",
      "mixue",
      "chatime",
      "boba",
      "bubble",
      "es krim",
      "ice cream",
      "alfamart",
      "indomaret",
      "supermarket",
      "minimarket",
      "mart",
    ],
  },
  {
    category: "transport",
    keywords: [
      "grab",
      "gojek",
      "goride",
      "gocar",
      "grabcar",
      "grabbike",
      "uber",
      "maxim",
      "bluebird",
      "blue bird",
      "taxi",
      "taksi",
      "ojek",
      "ojol",
      "transport",
      "parkir",
      "parking",
      "tol",
      "toll",
      "bensin",
      "pertamina",
      "shell",
      "spbu",
      "bbm",
      "mrt",
      "krl",
      "transjakarta",
      "busway",
      "kereta",
      "train",
      "bus",
      "angkot",
    ],
  },
  {
    category: "shopping",
    keywords: [
      "tokopedia",
      "shopee",
      "lazada",
      "blibli",
      "bukalapak",
      "toko",
      "shop",
      "store",
      "mall",
      "uniqlo",
      "zara",
      "h&m",
      "miniso",
      "daiso",
      "ikea",
      "ace hardware",
      "electronic",
      "elektronik",
      "gadget",
      "handphone",
      "hp",
      "fashion",
      "baju",
      "sepatu",
      "tas",
    ],
  },
  {
    category: "entertainment",
    keywords: [
      "cgv",
      "xxi",
      "cinema",
      "bioskop",
      "netflix",
      "spotify",
      "youtube",
      "game",
      "gaming",
      "steam",
      "playstation",
      "xbox",
      "disney",
      "vidio",
      "viu",
      "karaoke",
      "billiard",
      "bowling",
      "gym",
      "fitness",
      "tiket",
      "ticket",
      "konser",
      "concert",
      "wisata",
      "travel",
      "hotel",
    ],
  },
  {
    category: "bills",
    keywords: [
      "pln",
      "listrik",
      "pdam",
      "air",
      "telkom",
      "indihome",
      "internet",
      "wifi",
      "pulsa",
      "data",
      "telkomsel",
      "indosat",
      "xl",
      "tri",
      "smartfren",
      "asuransi",
      "insurance",
      "pajak",
      "tax",
      "sewa",
      "rent",
      "kos",
      "kontrakan",
      "cicilan",
      "installment",
      "bpjs",
      "iuran",
    ],
  },
  {
    category: "health",
    keywords: [
      "apotek",
      "apotik",
      "pharmacy",
      "obat",
      "medicine",
      "dokter",
      "doctor",
      "klinik",
      "clinic",
      "rumah sakit",
      "hospital",
      "rs ",
      "lab",
      "laboratorium",
      "vitamin",
      "supplement",
      "k-24",
      "kimia farma",
      "century",
      "guardian",
      "watson",
      "kesehatan",
      "medis",
      "dental",
      "gigi",
      "mata",
      "optik",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Keyword-based categorization (fallback)
// ─────────────────────────────────────────────────────────────────────────────
function categorizeByKeyword(merchantName: string): SpendingCategory | null {
  const normalized = merchantName.toLowerCase().trim();

  for (const { keywords, category } of KEYWORD_MAP) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return category;
      }
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI-based categorization (OpenAI GPT-4o-mini)
// ─────────────────────────────────────────────────────────────────────────────
async function categorizeByAI(
  merchantName: string,
  apiKey: string
): Promise<SpendingCategory | null> {
  const systemPrompt = `You are a transaction categorization engine for an Indonesian Gen Z finance app.
Given a merchant name, classify it into exactly ONE of these categories:
- food (restaurants, street food, snacks, groceries, bubble tea, ice cream)
- coffee (coffee shops, cafes specifically focused on coffee/tea beverages)
- transport (ride-hailing, taxis, fuel, parking, public transport)
- shopping (e-commerce, retail stores, fashion, electronics, general merchandise)
- entertainment (movies, streaming, gaming, events, travel, recreation)
- bills (utilities, phone, internet, rent, insurance, installments)
- health (pharmacy, hospitals, clinics, doctors, health products)
- other (anything that doesn't clearly fit above)

Respond with ONLY the category name, nothing else. No explanation, no punctuation.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: merchantName },
      ],
      temperature: 0,
      max_tokens: 10,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI API error (${response.status}): ${errorText}`);
    return null;
  }

  const result = await response.json();
  const category = result.choices?.[0]?.message?.content
    ?.trim()
    ?.toLowerCase() as SpendingCategory;

  if (VALID_CATEGORIES.includes(category)) {
    return category;
  }

  console.warn(
    `OpenAI returned invalid category "${category}" for merchant "${merchantName}"`
  );
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Validation
// ─────────────────────────────────────────────────────────────────────────────
function validateInput(
  body: unknown
): { valid: true; data: CategorizeRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const { merchantName } = body as Record<string, unknown>;

  if (!merchantName || typeof merchantName !== "string") {
    return {
      valid: false,
      error: "Missing required field: merchantName (string)",
    };
  }

  const trimmed = (merchantName as string).trim();

  if (trimmed.length < 1) {
    return { valid: false, error: "merchantName cannot be empty" };
  }

  if (trimmed.length > 200) {
    return {
      valid: false,
      error: "merchantName is too long (max 200 characters)",
    };
  }

  return { valid: true, data: { merchantName: trimmed } };
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
      {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { merchantName } = validation.data;

    // Strategy 1: Try AI categorization first
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let result: CategorizeResponse | null = null;

    if (openaiKey) {
      try {
        const aiCategory = await categorizeByAI(merchantName, openaiKey);
        if (aiCategory) {
          result = { category: aiCategory, confidence: "ai" };
        }
      } catch (error) {
        console.warn("AI categorization failed, falling back to keywords:", error);
      }
    } else {
      console.warn("OPENAI_API_KEY not set, using keyword fallback only");
    }

    // Strategy 2: Fallback to keyword mapping
    if (!result) {
      const keywordCategory = categorizeByKeyword(merchantName);
      if (keywordCategory) {
        result = { category: keywordCategory, confidence: "keyword" };
      }
    }

    // Strategy 3: Default to "other"
    if (!result) {
      result = { category: "other", confidence: "default" };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in categorize function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});

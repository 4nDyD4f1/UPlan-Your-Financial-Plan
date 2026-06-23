/**
 * UPlan — useOCR Hook
 * Pick image → OCR via free API → extract amount & merchant → auto-categorize
 * Uses OCR.space free API — no server/Docker needed!
 */

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from '../lib/database';

export interface OCRResult {
  amount: number | null;
  merchant: string;
  date: string;
  category: string;
  receiptUrl: string;
  rawText: string;
}

// OCR.space free API — get your own key at https://ocr.space/ocrapi/freekey
// The free tier gives 25,000 requests/month
const OCR_API_KEY = 'K85403024288957';
const OCR_API_URL = 'https://api.ocr.space/parse/image';

export function useOCR() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function processImage(base64: string): Promise<OCRResult | null> {
    setLoading(true);
    setError(null);

    try {
      // Call OCR.space free API
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2'); // Engine 2 auto-detects language

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        headers: {
          'apikey': OCR_API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.IsErroredOnProcessing) {
        throw new Error(data.ErrorMessage?.[0] || 'OCR processing failed');
      }

      const rawText = data.ParsedResults?.[0]?.ParsedText || '';
      
      if (!rawText.trim()) {
        throw new Error('Tidak bisa membaca teks dari gambar. Coba foto yang lebih jelas.');
      }

      console.log('[OCR] Raw text:', rawText);

      // Extract amount and merchant from the raw text
      const amount = extractAmount(rawText);
      const merchant = extractMerchant(rawText);
      const category = localCategorize(merchant);

      const ocrResult: OCRResult = {
        amount,
        merchant,
        date: new Date().toISOString(),
        category,
        receiptUrl: '',
        rawText,
      };

      console.log('[OCR] Extracted:', { amount, merchant, category });

      setResult(ocrResult);
      return ocrResult;
    } catch (err: any) {
      const msg = err.message || 'Gagal scan struk';
      console.error('[OCR] Error:', msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function pickAndScan(): Promise<OCRResult | null> {
    setError(null);
    setResult(null);

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Izin akses galeri ditolak');
      return null;
    }

    // Pick image
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });

    if (picked.canceled || !picked.assets?.[0]?.base64) {
      return null;
    }

    return processImage(picked.assets[0].base64);
  }

  async function takePhotoAndScan(): Promise<OCRResult | null> {
    setError(null);
    setResult(null);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Izin akses kamera ditolak');
      return null;
    }

    const taken = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    });

    if (taken.canceled || !taken.assets?.[0]?.base64) return null;

    return processImage(taken.assets[0].base64);
  }

  function clearResult() {
    setResult(null);
    setError(null);
  }

  return { pickAndScan, takePhotoAndScan, loading, result, error, clearResult };
}

// ─── Amount Extraction ───────────────────────────────────────
// Searches for Indonesian Rupiah patterns in OCR text
function extractAmount(text: string): number | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Priority patterns (most specific first)
  const patterns = [
    // "Total: Rp 50.000" or "TOTAL Rp50,000" or "Total 50000"
    /(?:total|grand\s*total|jumlah|bayar|amount|nominal|pembayaran)\s*[:\s]*(?:Rp\.?\s*)?([0-9][0-9.,]*)/i,
    // "Rp 50.000" or "Rp50,000" or "IDR 50.000"
    /(?:Rp\.?|IDR)\s*([0-9][0-9.,]*)/i,
    // Plain number that looks like money (>= 1000)
    /\b([0-9]{1,3}(?:[.,][0-9]{3})+)\b/,
  ];

  // First try to find "total" lines
  for (const line of lines) {
    if (/total|jumlah|bayar|amount|nominal|pembayaran/i.test(line)) {
      const match = line.match(/(?:Rp\.?|IDR)?\s*([0-9][0-9.,]*)/i);
      if (match) {
        const num = parseIndonesianNumber(match[1]);
        if (num && num >= 500) return num; // At least Rp500
      }
    }
  }

  // Then try each pattern on the full text
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseIndonesianNumber(match[1]);
      if (num && num >= 500) return num;
    }
  }

  // Last resort: find the largest number in the text
  const allNumbers: number[] = [];
  const numRegex = /([0-9][0-9.,]*)/g;
  let m;
  while ((m = numRegex.exec(text)) !== null) {
    const num = parseIndonesianNumber(m[1]);
    if (num && num >= 500 && num <= 100000000) { // Rp500 to Rp100jt
      allNumbers.push(num);
    }
  }

  if (allNumbers.length > 0) {
    // Return the largest number (likely the total)
    return Math.max(...allNumbers);
  }

  return null;
}

function parseIndonesianNumber(str: string): number | null {
  if (!str) return null;
  
  // Clean string
  let cleaned = str.trim();
  
  // 1. Remove trailing decimals like ,00 or .00 (a comma/dot followed by exactly 2 digits at the very end)
  cleaned = cleaned.replace(/[,.][0-9]{2}$/, '');
  
  // 2. Remove all remaining dots and commas (assumed to be thousands separators)
  cleaned = cleaned.replace(/[.,]/g, '');
  
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

// ─── Merchant Extraction ─────────────────────────────────────
function extractMerchant(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  
  // Common patterns for merchant name in receipts
  const skipWords = /^(total|jumlah|bayar|tanggal|date|waktu|time|no\.|ref|resi|struk|receipt|kasir|cashier|change|kembalian|tunai|cash|debit|kredit|credit|qris|dana|gopay|ovo|shopeepay|linkaja|rincian|berhasil|sukses|status|metode|\d+$)/i;
  
  // 1. Look for single-line "Kepada: MerchantName"
  for (const line of lines) {
    const merchantMatch = line.match(/(?:kepada|merchant|nama|to|tujuan|penerima|bayar ke)\s*[:]+\s*(.+)/i);
    if (merchantMatch) {
      const name = merchantMatch[1].trim();
      if (name.length > 1) return name;
    }
  }

  // 2. Look for two-line "Bayar Ke \n MerchantName" (ShopeePay/Gopay style)
  for (let i = 0; i < lines.length - 1; i++) {
    if (/(?:kepada|merchant|nama|to|tujuan|penerima|bayar ke)/i.test(lines[i])) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.length > 1 && !skipWords.test(nextLine)) {
        return nextLine;
      }
    }
  }

  // 3. Fallback: First non-skip line that looks like a name
  for (const line of lines) {
    // Remove symbols like '<', '>', '-', etc that might be attached
    const cleanLine = line.replace(/^[<>\-=\s]+|[<>\-=\s]+$/g, '');
    
    if (cleanLine.length > 2 && cleanLine.length < 50 && !skipWords.test(cleanLine) && !/^\d+$/.test(cleanLine)) {
      if (/[a-zA-Z]/.test(cleanLine)) {
        return cleanLine;
      }
    }
  }

  return 'Unknown Merchant';
}

// ─── Local Category Matching ─────────────────────────────────
function localCategorize(merchant: string): string {
  const m = merchant.toLowerCase();

  const keywords: Record<string, string[]> = {
    coffee: ['kopi', 'coffee', 'starbucks', 'fore', 'kenangan', 'janji jiwa', 'chatime', 'boba', 'tea', 'latte', 'cafe', 'kafe'],
    food: ['makan', 'nasi', 'warung', 'resto', 'restaurant', 'pizza', 'burger', 'sate', 'bakso', 'mie', 'ayam', 'indomaret', 'alfamart', 'snack', 'dapur', 'kitchen', 'canteen', 'kantin', 'padang'],
    transport: ['grab', 'gojek', 'uber', 'ride', 'taxi', 'angkot', 'bus', 'kereta', 'mrt', 'krl', 'parkir', 'bensin', 'pertamina', 'shell', 'fuel'],
    shopping: ['shopee', 'tokopedia', 'lazada', 'toko', 'mall', 'miniso', 'uniqlo', 'zara', 'h&m', 'market', 'mart'],
    entertainment: ['bioskop', 'cinema', 'cgv', 'xxi', 'spotify', 'netflix', 'game', 'concert', 'konser', 'karaoke'],
    bills: ['pln', 'listrik', 'pdam', 'air', 'internet', 'indihome', 'telkomsel', 'xl', 'pulsa', 'token', 'wifi'],
    health: ['apotek', 'pharmacy', 'gym', 'fitness', 'dokter', 'rumah sakit', 'vitamin', 'protein', 'klinik'],
  };

  for (const [category, words] of Object.entries(keywords)) {
    if (words.some((w) => m.includes(w))) return category;
  }

  return 'other';
}

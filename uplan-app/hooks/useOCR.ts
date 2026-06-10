/**
 * UPlan — useOCR Hook
 * Pick image → upload to Supabase Storage → OCR via Edge Function → categorize
 */

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export interface OCRResult {
  amount: number | null;
  merchant: string;
  date: string;
  category: string;
  receiptUrl: string;
  rawText: string;
}

export function useOCR() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickAndScan(): Promise<OCRResult | null> {
    setError(null);
    setResult(null);

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access gallery was denied');
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

    setLoading(true);
    try {
      const base64 = picked.assets[0].base64;

      // 1. Upload to Supabase Storage
      const fileName = `receipts/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, decode(base64), {
          contentType: 'image/jpeg',
        });

      let receiptUrl = '';
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
        receiptUrl = urlData?.publicUrl || '';
      }

      // 2. Call OCR Edge Function
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('ocr', {
        body: { imageBase64: base64 },
      });

      if (ocrError) throw new Error(ocrError.message || 'OCR failed');

      // 3. Auto-categorize merchant
      let category = 'other';
      if (ocrData?.merchant) {
        try {
          const { data: catData } = await supabase.functions.invoke('categorize', {
            body: { merchantName: ocrData.merchant },
          });
          category = catData?.category || 'other';
        } catch {
          // Fallback: local keyword matching
          category = localCategorize(ocrData.merchant);
        }
      }

      const ocrResult: OCRResult = {
        amount: ocrData?.amount ?? null,
        merchant: ocrData?.merchant ?? 'Unknown',
        date: ocrData?.date ?? new Date().toISOString(),
        category,
        receiptUrl,
        rawText: ocrData?.rawText ?? '',
      };

      setResult(ocrResult);
      return ocrResult;
    } catch (err: any) {
      setError(err.message || 'Failed to scan receipt');
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function takePhotoAndScan(): Promise<OCRResult | null> {
    setError(null);
    setResult(null);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access camera was denied');
      return null;
    }

    const taken = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    });

    if (taken.canceled || !taken.assets?.[0]?.base64) return null;

    // Reuse same logic
    setLoading(true);
    try {
      const base64 = taken.assets[0].base64;

      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('ocr', {
        body: { imageBase64: base64 },
      });

      if (ocrError) throw new Error('OCR failed');

      const category = ocrData?.merchant ? localCategorize(ocrData.merchant) : 'other';

      const ocrResult: OCRResult = {
        amount: ocrData?.amount ?? null,
        merchant: ocrData?.merchant ?? 'Unknown',
        date: ocrData?.date ?? new Date().toISOString(),
        category,
        receiptUrl: '',
        rawText: ocrData?.rawText ?? '',
      };

      setResult(ocrResult);
      return ocrResult;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  function clearResult() {
    setResult(null);
    setError(null);
  }

  return { pickAndScan, takePhotoAndScan, loading, result, error, clearResult };
}

// Fallback local categorization using keyword matching
function localCategorize(merchant: string): string {
  const m = merchant.toLowerCase();

  const keywords: Record<string, string[]> = {
    coffee: ['kopi', 'coffee', 'starbucks', 'fore', 'kenangan', 'janji jiwa', 'chatime', 'boba', 'tea', 'latte'],
    food: ['makan', 'nasi', 'warung', 'resto', 'pizza', 'burger', 'sate', 'bakso', 'mie', 'ayam', 'indomaret', 'alfamart', 'snack'],
    transport: ['grab', 'gojek', 'uber', 'ride', 'taxi', 'angkot', 'bus', 'kereta', 'mrt', 'krl', 'parkir'],
    shopping: ['shopee', 'tokopedia', 'lazada', 'toko', 'mall', 'miniso', 'uniqlo', 'zara', 'h&m'],
    entertainment: ['bioskop', 'cinema', 'cgv', 'xxi', 'spotify', 'netflix', 'game', 'concert', 'konser'],
    bills: ['pln', 'listrik', 'pdam', 'air', 'internet', 'indihome', 'telkomsel', 'xl', 'pulsa', 'token'],
    health: ['apotek', 'pharmacy', 'gym', 'fitness', 'dokter', 'rumah sakit', 'vitamin', 'protein'],
  };

  for (const [category, words] of Object.entries(keywords)) {
    if (words.some((w) => m.includes(w))) return category;
  }

  return 'other';
}

// Simple base64 decoder for React Native
function decode(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  const len = base64.length;
  let bufferLength = len * 0.75;
  if (base64[len - 1] === '=') bufferLength--;
  if (base64[len - 2] === '=') bufferLength--;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const e1 = lookup[base64.charCodeAt(i)];
    const e2 = lookup[base64.charCodeAt(i + 1)];
    const e3 = lookup[base64.charCodeAt(i + 2)];
    const e4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (e1 << 2) | (e2 >> 4);
    bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    bytes[p++] = ((e3 & 3) << 6) | e4;
  }

  return bytes;
}

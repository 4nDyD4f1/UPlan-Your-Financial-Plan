/**
 * UPlan — Impulse Spending Detector
 */

import type { DBTransaction } from './supabase';

interface ImpulseCheckParams {
  amount: number;
  paymentMethod: string;
  impulseThreshold: number;
  recentTransactions: DBTransaction[];
  withinHours?: number;
  minSimilarCount?: number;
}

/**
 * Determines whether a transaction should be flagged as impulse spending.
 *
 * Rules:
 * 1. Amount is below the user's impulse threshold (e.g., < Rp50.000)
 * 2. Payment method is QRIS (tap-and-go encourages impulse)
 * 3. There are already 2+ similar small QRIS transactions in the last 3 hours
 *
 * If rule 1 is met, it's a soft impulse flag.
 * If rules 1+2+3 are all met, it's a strong impulse flag.
 */
export function isImpulseTransaction({
  amount,
  paymentMethod,
  impulseThreshold,
  recentTransactions,
  withinHours = 3,
  minSimilarCount = 2,
}: ImpulseCheckParams): { isImpulse: boolean; severity: 'none' | 'soft' | 'strong'; reason: string } {
  // Rule 1: Amount below threshold
  if (amount >= impulseThreshold) {
    return { isImpulse: false, severity: 'none', reason: '' };
  }

  // Soft impulse: small amount
  if (paymentMethod !== 'qris') {
    return {
      isImpulse: true,
      severity: 'soft',
      reason: `Transaksi kecil di bawah ${formatRp(impulseThreshold)}`,
    };
  }

  // Check for frequency pattern (rule 3)
  const cutoff = new Date(Date.now() - withinHours * 3600 * 1000);
  const recentSimilar = recentTransactions.filter(
    (t) =>
      t.amount < impulseThreshold &&
      t.payment_method === 'qris' &&
      new Date(t.transaction_date) > cutoff
  );

  if (recentSimilar.length >= minSimilarCount) {
    return {
      isImpulse: true,
      severity: 'strong',
      reason: `Ini tap QRIS ke-${recentSimilar.length + 1} dalam ${withinHours} jam terakhir — beneran perlu?`,
    };
  }

  return {
    isImpulse: true,
    severity: 'soft',
    reason: `Pembelian kecil via QRIS — hati-hati impulse spending!`,
  };
}

/**
 * Calculate QRIS streak: consecutive days where QRIS taps <= daily limit
 */
export function calculateQRISStreak(
  snapshots: Array<{ snapshot_date: string; qris_count: number }>,
  dailyLimit: number
): number {
  if (!snapshots.length) return 0;

  // Sort by date descending
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const snap of sorted) {
    const snapDate = new Date(snap.snapshot_date);
    snapDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - streak);

    // Check if this snapshot is for the expected date
    if (snapDate.getTime() !== expectedDate.getTime()) break;

    // Check if under limit
    if (snap.qris_count <= dailyLimit) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get spending personality based on category distribution
 */
export function getSpendingPersonality(
  categoryTotals: Record<string, number>
): { emoji: string; type: string; description: string } {
  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  if (!entries.length || total === 0) {
    return {
      emoji: '🤔',
      type: 'Newbie Saver',
      description: 'Belum ada data spending. Mulai track pengeluaranmu!',
    };
  }

  const [topCat, topAmt] = entries[0];
  const topPct = Math.round((topAmt / total) * 100);

  const personalities: Record<string, { emoji: string; type: string; desc: string }> = {
    food: {
      emoji: '🍔',
      type: 'Foodie Impulsif',
      desc: `${topPct}% pengeluaranmu ke makanan. Coba batasi jajan ke 3x sehari!`,
    },
    coffee: {
      emoji: '☕',
      type: 'Coffee Addict',
      desc: `${topPct}% budget habis untuk ngopi. Coba bawa tumbler dari rumah!`,
    },
    shopping: {
      emoji: '🛍️',
      type: 'Shopaholic Explorer',
      desc: `${topPct}% budget habis belanja. Pakai wishlist 24 jam sebelum checkout!`,
    },
    transport: {
      emoji: '🚗',
      type: 'Urban Commuter',
      desc: `${topPct}% ke transport. Coba combine trips atau transport publik!`,
    },
    entertainment: {
      emoji: '🎬',
      type: 'Experience Seeker',
      desc: `${topPct}% untuk hiburan. Cari promo atau diskon member!`,
    },
    bills: {
      emoji: '📋',
      type: 'Bill Payer',
      desc: `${topPct}% untuk tagihan. Sisanya bisa dialokasikan ke tabungan!`,
    },
    health: {
      emoji: '💪',
      type: 'Health Enthusiast',
      desc: `${topPct}% untuk kesehatan. Investasi terbaik!`,
    },
  };

  const p = personalities[topCat] || {
    emoji: '🤔',
    type: 'Balanced Spender',
    desc: 'Pengeluaranmu cukup seimbang. Pertahankan!',
  };

  return { emoji: p.emoji, type: p.type, description: p.desc };
}

function formatRp(n: number): string {
  return 'Rp' + Math.abs(n).toLocaleString('id-ID');
}

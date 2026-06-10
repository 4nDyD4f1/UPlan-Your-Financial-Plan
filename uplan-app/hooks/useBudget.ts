/**
 * UPlan — useBudget Hook
 * Computes daily remaining, budget percentage, QRIS stats from transactions
 */

import { useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTransactionStore } from '../store/useTransactionStore';

export function useBudget() {
  const profile = useAuthStore((s) => s.profile);
  const transactions = useTransactionStore((s) => s.transactions);

  return useMemo(() => {
    const dailyLimit = profile?.daily_budget ?? 160000;
    const qrisDailyLimit = profile?.qris_daily_limit ?? 6;
    const impulseThreshold = profile?.impulse_threshold ?? 50000;

    // Today's transactions
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTx = transactions.filter(
      (t) => new Date(t.transaction_date) >= todayStart && t.amount > 0
    );

    const todayExpenses = todayTx.filter((t) => t.category !== 'topup');
    const todaySpent = todayExpenses.reduce((sum, t) => sum + t.amount, 0);
    const todayQRISTaps = todayTx.filter((t) => t.payment_method === 'qris').length;

    const remaining = dailyLimit - todaySpent;
    const budgetPct = dailyLimit > 0 ? Math.min((todaySpent / dailyLimit) * 100, 100) : 0;
    const isOverBudget = remaining < 0;
    const isNearLimit = budgetPct > 85;

    // This week's transactions
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekTx = transactions.filter(
      (t) => new Date(t.transaction_date) >= weekStart
    );
    const weeklyQRISTaps = weekTx.filter((t) => t.payment_method === 'qris').length;
    const weeklySpent = weekTx
      .filter((t) => t.category !== 'topup')
      .reduce((sum, t) => sum + t.amount, 0);

    // Impulse count
    const impulseCount = todayExpenses.filter((t) => t.is_impulse).length;
    const totalImpulse = transactions
      .filter((t) => t.is_impulse)
      .reduce((sum, t) => sum + t.amount, 0);

    // Category totals
    const categoryTotals: Record<string, number> = {};
    transactions
      .filter((t) => t.category !== 'topup')
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    // Total saved across goals
    const goals = useTransactionStore.getState().goals;
    const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);

    return {
      dailyLimit,
      todaySpent,
      remaining,
      budgetPct,
      isOverBudget,
      isNearLimit,
      todayQRISTaps,
      qrisDailyLimit,
      weeklyQRISTaps,
      weeklySpent,
      impulseCount,
      totalImpulse,
      impulseThreshold,
      categoryTotals,
      totalSaved,
      todayTransactionCount: todayTx.length,
    };
  }, [profile, transactions]);
}

/**
 * UPlan — Transaction & Goal Store (Zustand)
 * Uses database.ts for persistent SQLite-backed storage.
 */

import { create } from 'zustand';
import {
  getTransactions,
  insertTransaction,
  deleteTransaction as dbDeleteTransaction,
  getGoals,
  insertGoal,
  updateGoal as dbUpdateGoal,
  deleteGoal as dbDeleteGoal,
  type DBTransaction,
  type DBGoal,
} from '../lib/database';

interface TransactionState {
  transactions: DBTransaction[];
  goals: DBGoal[];
  loading: boolean;
  syncing: boolean;

  // Transaction actions
  fetchTransactions: (userId: string) => Promise<void>;
  addTransaction: (tx: Omit<DBTransaction, 'id' | 'created_at'>) => Promise<DBTransaction | null>;
  deleteTransaction: (id: string) => Promise<void>;

  // Goal actions
  fetchGoals: (userId: string) => Promise<void>;
  addGoal: (goal: Omit<DBGoal, 'id' | 'created_at' | 'updated_at' | 'is_completed'>) => Promise<DBGoal | null>;
  updateGoal: (id: string, updates: Partial<DBGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  contributeToGoal: (id: string, amount: number) => Promise<void>;

  // Realtime
  subscribeRealtime: (userId: string) => () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  goals: [],
  loading: false,
  syncing: false,

  // ─── Transactions ──────────────────────────────────────────
  fetchTransactions: async (userId: string) => {
    set({ loading: true });
    try {
      const data = await getTransactions(userId);
      set({ transactions: data });
      console.log('[Store] Fetched', data.length, 'transactions');
    } catch (error) {
      console.error('[Store] Fetch transactions error:', error);
    } finally {
      set({ loading: false });
    }
  },

  addTransaction: async (tx) => {
    try {
      const newTx = await insertTransaction(tx);

      // Update state immediately (optimistic)
      const currentTx = get().transactions;
      set({ transactions: [newTx, ...currentTx] });

      console.log('[Store] Transaction added:', newTx.merchant_name, 'Rp' + newTx.amount);
      return newTx;
    } catch (error) {
      console.error('[Store] Add transaction error:', error);
      return null;
    }
  },

  deleteTransaction: async (id: string) => {
    try {
      await dbDeleteTransaction(id);
      const updatedTx = get().transactions.filter((t) => t.id !== id);
      set({ transactions: updatedTx });
    } catch (error) {
      console.error('[Store] Delete transaction error:', error);
    }
  },

  // ─── Goals ─────────────────────────────────────────────────
  fetchGoals: async (userId: string) => {
    try {
      const data = await getGoals(userId);
      set({ goals: data });
      console.log('[Store] Fetched', data.length, 'goals');
    } catch (error) {
      console.error('[Store] Fetch goals error:', error);
    }
  },

  addGoal: async (goal) => {
    try {
      const newGoal = await insertGoal(goal);
      const currentGoals = get().goals;
      set({ goals: [newGoal, ...currentGoals] });
      console.log('[Store] Goal added:', newGoal.title);
      return newGoal;
    } catch (error) {
      console.error('[Store] Add goal error:', error);
      return null;
    }
  },

  updateGoal: async (id: string, updates: Partial<DBGoal>) => {
    try {
      await dbUpdateGoal(id, updates);

      // Update state immediately (optimistic)
      const updatedGoals = get().goals.map((g) => {
        if (g.id === id) {
          return { ...g, ...updates, updated_at: new Date().toISOString() };
        }
        return g;
      });
      set({ goals: updatedGoals });
    } catch (error) {
      console.error('[Store] Update goal error:', error);
    }
  },

  deleteGoal: async (id: string) => {
    try {
      await dbDeleteGoal(id);
      const updatedGoals = get().goals.filter((g) => g.id !== id);
      set({ goals: updatedGoals });
    } catch (error) {
      console.error('[Store] Delete goal error:', error);
    }
  },

  contributeToGoal: async (id: string, amount: number) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;

    const newAmount = Math.min(goal.current_amount + amount, goal.target_amount);
    const isCompleted = newAmount >= goal.target_amount;

    await get().updateGoal(id, {
      current_amount: newAmount,
      is_completed: isCompleted,
    });
  },

  // ─── Realtime ──────────────────────────────────────────────
  subscribeRealtime: (_userId: string) => {
    // Local database — no realtime subscription needed
    return () => {};
  },
}));

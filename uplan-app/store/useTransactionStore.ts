/**
 * UPlan — Transaction Store (Zustand)
 * CRUD transactions via Supabase with Realtime subscription
 */

import { create } from 'zustand';
import { supabase, type DBTransaction, type DBGoal } from '../lib/supabase';

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

  // --- Transactions ---
  fetchTransactions: async (userId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      set({ transactions: (data as DBTransaction[]) || [] });
    } catch (error) {
      console.error('Fetch transactions error:', error);
    } finally {
      set({ loading: false });
    }
  },

  addTransaction: async (tx) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(tx)
        .select()
        .single();

      if (error) throw error;

      const newTx = data as DBTransaction;
      set((state) => ({
        transactions: [newTx, ...state.transactions],
      }));
      return newTx;
    } catch (error) {
      console.error('Add transaction error:', error);
      return null;
    }
  },

  deleteTransaction: async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      }));
    } catch (error) {
      console.error('Delete transaction error:', error);
    }
  },

  // --- Goals ---
  fetchGoals: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ goals: (data as DBGoal[]) || [] });
    } catch (error) {
      console.error('Fetch goals error:', error);
    }
  },

  addGoal: async (goal) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...goal, is_completed: false })
        .select()
        .single();

      if (error) throw error;

      const newGoal = data as DBGoal;
      set((state) => ({ goals: [newGoal, ...state.goals] }));
      return newGoal;
    } catch (error) {
      console.error('Add goal error:', error);
      return null;
    }
  },

  updateGoal: async (id: string, updates: Partial<DBGoal>) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? (data as DBGoal) : g)),
      }));
    } catch (error) {
      console.error('Update goal error:', error);
    }
  },

  deleteGoal: async (id: string) => {
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
    } catch (error) {
      console.error('Delete goal error:', error);
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

  // --- Realtime ---
  subscribeRealtime: (userId: string) => {
    const channel = supabase
      .channel('user-data')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          set((state) => {
            if (eventType === 'INSERT') {
              // Avoid duplicates
              if (state.transactions.find((t) => t.id === (newRow as DBTransaction).id)) {
                return state;
              }
              return { transactions: [newRow as DBTransaction, ...state.transactions] };
            }
            if (eventType === 'DELETE') {
              return {
                transactions: state.transactions.filter((t) => t.id !== (oldRow as any).id),
              };
            }
            if (eventType === 'UPDATE') {
              return {
                transactions: state.transactions.map((t) =>
                  t.id === (newRow as DBTransaction).id ? (newRow as DBTransaction) : t
                ),
              };
            }
            return state;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          set((state) => {
            if (eventType === 'INSERT') {
              if (state.goals.find((g) => g.id === (newRow as DBGoal).id)) return state;
              return { goals: [newRow as DBGoal, ...state.goals] };
            }
            if (eventType === 'DELETE') {
              return { goals: state.goals.filter((g) => g.id !== (oldRow as any).id) };
            }
            if (eventType === 'UPDATE') {
              return {
                goals: state.goals.map((g) =>
                  g.id === (newRow as DBGoal).id ? (newRow as DBGoal) : g
                ),
              };
            }
            return state;
          });
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  },
}));

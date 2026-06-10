/**
 * UPlan — Goals Tab
 * Savings goals with progress bars, actions (add funds, edit, delete)
 */

import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Modal, TextInput, Platform,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useBudget } from '../../hooks/useBudget';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { UPlanColors } from '../../constants/colors';
import type { DBGoal } from '../../lib/supabase';

export default function GoalsScreen() {
  const { theme, isDark } = useTheme();
  const budget = useBudget();
  const { goals, fetchGoals, deleteGoal, addGoal, contributeToGoal, updateGoal } = useTransactionStore();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<DBGoal | null>(null);
  const [fundingGoal, setFundingGoal] = useState<DBGoal | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [fundAmount, setFundAmount] = useState('');

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await fetchGoals(user.id);
    setRefreshing(false);
  }, [user?.id]);

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Goal', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  };

  const openAddModal = () => {
    setEditingGoal(null);
    setTitle(''); setDescription(''); setTarget(''); setEmoji('🎯');
    setShowGoalModal(true);
  };

  const openEditModal = (goal: DBGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setTarget(goal.target_amount.toString());
    setEmoji(goal.emoji);
    setShowGoalModal(true);
  };

  const openFundModal = (goal: DBGoal) => {
    setFundingGoal(goal);
    setFundAmount('');
    setShowFundModal(true);
  };

  const handleSaveGoal = async () => {
    if (!user?.id || !title.trim() || !target) return;
    
    const targetAmt = parseInt(target);
    if (isNaN(targetAmt) || targetAmt <= 0) return;

    if (editingGoal) {
      await updateGoal(editingGoal.id, {
        title: title.trim(),
        description: description.trim(),
        target_amount: targetAmt,
        emoji,
      });
    } else {
      await addGoal({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        target_amount: targetAmt,
        current_amount: 0,
        emoji,
        color: 'pink',
        deadline: null,
      });
    }
    setShowGoalModal(false);
  };

  const handleAddFunds = async () => {
    if (!fundingGoal || !fundAmount) return;
    const amt = parseInt(fundAmount);
    if (isNaN(amt) || amt <= 0) return;

    await contributeToGoal(fundingGoal.id, amt);
    
    // Check if reached
    if (fundingGoal.current_amount + amt >= fundingGoal.target_amount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('🎉 Goal Reached!', `Congratulations, you achieved your goal: ${fundingGoal.title}`);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setShowFundModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={UPlanColors.primary} colors={[UPlanColors.primary]}
          />
        }
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>Savings Goals</Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>TODAY'S SAVINGS</Text>
            <Text style={[styles.statValue, { color: UPlanColors.success }]}>
              Rp{Math.max(budget.remaining, 0).toLocaleString('id-ID')}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>TOTAL SAVED</Text>
            <Text style={[styles.statValue, { color: UPlanColors.accent }]}>
              Rp{budget.totalSaved.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>

        {/* Goals List */}
        {goals.map((goal) => {
          const pct = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0;
          return (
            <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.goalTop}>
                <View style={styles.goalLeft}>
                  <Text style={styles.goalIcon}>{goal.emoji}</Text>
                  <View>
                    <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
                    <Text style={[styles.goalDesc, { color: theme.textMuted }]}>{goal.description}</Text>
                  </View>
                </View>
                <View style={styles.goalActions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                    onPress={() => openEditModal(goal)}>
                    <FontAwesome6 name="pen" size={12} color={theme.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                    onPress={() => handleDelete(goal.id, goal.title)}>
                    <FontAwesome6 name="trash" size={12} color={UPlanColors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={[styles.goalAmount, { color: UPlanColors.primary }]}>
                Rp{goal.current_amount.toLocaleString('id-ID')}
              </Text>
              <Text style={[styles.goalTarget, { color: theme.textMuted }]}>
                Target: Rp{goal.target_amount.toLocaleString('id-ID')}
              </Text>
              
              <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <LinearGradient
                  colors={[UPlanColors.accent, UPlanColors.primary]}
                  style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </View>
              
              <View style={styles.goalBottom}>
                <Text style={[styles.goalPct, { color: theme.textSecondary }]}>{pct}% complete</Text>
                {!goal.is_completed && (
                  <TouchableOpacity style={[styles.fundBtn, { backgroundColor: UPlanColors.primarySubtle, borderColor: 'rgba(255,0,213,0.15)' }]}
                    onPress={() => openFundModal(goal)}>
                    <FontAwesome6 name="plus" size={12} color={UPlanColors.primaryLight} />
                    <Text style={[styles.fundBtnText, { color: UPlanColors.primaryLight }]}>Add Funds</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={[styles.addGoalBtn, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
          onPress={openAddModal}>
          <FontAwesome6 name="plus-circle" size={16} color={theme.textMuted} />
          <Text style={[styles.addGoalBtnText, { color: theme.textMuted }]}>Add New Goal</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Goal Form Modal */}
      <Modal visible={showGoalModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContentWrap}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {editingGoal ? '✏️ Edit Goal' : '🎯 New Goal'}
                </Text>
                <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Emoji</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  value={emoji} onChangeText={setEmoji} maxLength={4} />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  value={title} onChangeText={setTitle} placeholder="New MacBook" placeholderTextColor={theme.textMuted} />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  value={description} onChangeText={setDescription} placeholder="MacBook Air M4" placeholderTextColor={theme.textMuted} />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Target Amount (Rp)</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  value={target} onChangeText={setTarget} placeholder="15000000" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
              </View>
              
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
                <LinearGradient colors={[UPlanColors.primary, UPlanColors.primaryLight]} style={styles.saveBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.saveBtnText}>{editingGoal ? 'Save Changes' : 'Create Goal'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Add Funds Modal */}
      <Modal visible={showFundModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContentWrap}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {fundingGoal?.emoji} Add to {fundingGoal?.title}
                </Text>
                <TouchableOpacity onPress={() => setShowFundModal(false)}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              
              {fundingGoal && (
                <View style={styles.fundHeader}>
                  <Text style={[styles.fundCurrent, { color: UPlanColors.primary }]}>
                    Rp{fundingGoal.current_amount.toLocaleString('id-ID')}
                  </Text>
                  <Text style={[styles.fundRemaining, { color: theme.textMuted }]}>
                    Rp{(fundingGoal.target_amount - fundingGoal.current_amount).toLocaleString('id-ID')} remaining
                  </Text>
                </View>
              )}
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Amount to add (Rp)</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  value={fundAmount} onChangeText={setFundAmount} placeholder="100000" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
              </View>

              <View style={styles.chipRow}>
                {['25000', '50000', '100000', '500000'].map(val => (
                  <TouchableOpacity key={val} style={[styles.chip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                    onPress={() => setFundAmount(val)}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }]}>{parseInt(val)/1000}K</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity style={[styles.saveBtn, { marginTop: 16 }]} onPress={handleAddFunds}>
                <LinearGradient colors={[UPlanColors.primary, UPlanColors.primaryLight]} style={styles.saveBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.saveBtnText}>Add Funds</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56 },
  pageTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16 },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },

  goalCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 12 },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  goalLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  goalIcon: { fontSize: 28 },
  goalTitle: { fontSize: 15, fontWeight: '700' },
  goalDesc: { fontSize: 12 },
  goalActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  
  goalAmount: { fontSize: 24, fontWeight: '900', letterSpacing: -1, marginBottom: 4 },
  goalTarget: { fontSize: 12, marginBottom: 10 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  goalBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalPct: { fontSize: 12, fontWeight: '600' },
  fundBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  fundBtnText: { fontSize: 12, fontWeight: '700' },

  addGoalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed' },
  addGoalBtnText: { fontSize: 14, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContentWrap: { width: '100%' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 15 },
  
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  saveBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  fundHeader: { alignItems: 'center', marginBottom: 20 },
  fundCurrent: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  fundRemaining: { fontSize: 13 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
});

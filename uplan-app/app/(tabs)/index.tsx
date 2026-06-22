/**
 * UPlan — Dashboard (Home Tab)
 * Daily limit card, QRIS streak, quick actions, goals preview, recent transactions
 */

import { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useBudget } from '../../hooks/useBudget';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useUIStore } from '../../store/useUIStore';
import { UPlanColors } from '../../constants/colors';
import { CATEGORIES } from '../../constants/categories';
import { useState } from 'react';
import { router } from 'expo-router';
import OCRScanner from '../../components/OCRScanner';
import { showAlert } from '../../lib/database';

const { width } = Dimensions.get('window');

// Safe haptics helper — silently fails on web/unsupported platforms
async function safeHaptics(type: 'success' | 'light' | 'medium' = 'success') {
  try {
    const Haptics = require('expo-haptics');
    if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'light') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {}
}

export default function DashboardScreen() {
  const { theme, isDark } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const { transactions, goals, fetchTransactions, fetchGoals } = useTransactionStore();
  const user = useAuthStore((s) => s.user);
  const budget = useBudget();
  const [refreshing, setRefreshing] = useState(false);

  // Scanner & Manual Modal states from global UI store
  const { showScanner, setShowScanner, showManualAdd: showManualModal, setShowManualAdd: setShowManualModal } = useUIStore();
  
  // Local states for forms
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [scanMerchant, setScanMerchant] = useState('');
  const [scanAmount, setScanAmount] = useState('');
  const [scanCategory, setScanCategory] = useState('other');
  
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState('food'); // Default

  // Edit Limit Modal
  const [showEditLimit, setShowEditLimit] = useState(false);
  const [limitInput, setLimitInput] = useState('');

  const handleScanComplete = (data: any) => {
    setScanMerchant(data.merchant || '');
    setScanAmount(data.amount ? data.amount.toString() : '');
    setScanCategory(data.category || 'other');
    setShowConfirmModal(true);
  };

  const handleSaveScan = async () => {
    if (!user?.id) {
      showAlert('Error', 'User belum login!');
      return;
    }
    const amt = parseInt(scanAmount);
    if (isNaN(amt) || amt <= 0) {
      showAlert('Oops', 'Nominal tidak valid!');
      return;
    }
    
    const result = await useTransactionStore.getState().addTransaction({
      user_id: user.id,
      amount: amt,
      merchant_name: scanMerchant.trim() || 'Unknown',
      category: scanCategory,
      payment_method: 'qris',
      note: 'Via OCR Scan',
      receipt_url: null,
      is_impulse: false,
      transaction_date: new Date().toISOString(),
    });
    
    if (!result) {
      showAlert('Gagal', 'Gagal menyimpan transaksi.');
      return;
    }
    
    setShowConfirmModal(false);
    safeHaptics('success');
    showAlert('Sukses', 'Transaksi QRIS berhasil disimpan!');
  };

  const handleSaveManual = async () => {
    if (!user?.id) {
      showAlert('Error', 'User belum login!');
      return;
    }
    const amt = parseInt(manualAmount);
    if (isNaN(amt) || amt <= 0) {
      showAlert('Oops', 'Nominal tidak valid! Masukkan angka.');
      return;
    }

    const result = await useTransactionStore.getState().addTransaction({
      user_id: user.id,
      amount: amt,
      merchant_name: manualMerchant.trim() || 'Manual Entry',
      category: manualCategory,
      payment_method: 'cash',
      note: 'Manual Record',
      receipt_url: null,
      is_impulse: false,
      transaction_date: new Date().toISOString(),
    });

    if (!result) {
      showAlert('Gagal', 'Gagal menyimpan transaksi manual.');
      return;
    }

    setShowManualModal(false);
    setManualMerchant('');
    setManualAmount('');
    safeHaptics('success');
    showAlert('Sukses!', 'Transaksi manual berhasil dicatat!');
  };

  const handleSaveLimit = async () => {
    const amt = parseInt(limitInput);
    if (isNaN(amt) || amt < 0) {
      showAlert('Oops', 'Nominal tidak valid!');
      return;
    }
    
    await useAuthStore.getState().updateProfile({ daily_budget: amt });
    setShowEditLimit(false);
    safeHaptics('success');
    showAlert('Sukses!', `Limit harian diubah menjadi Rp${amt.toLocaleString('id-ID')}`);
  };

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await Promise.all([fetchTransactions(user.id), fetchGoals(user.id)]);
    setRefreshing(false);
  }, [user?.id]);

  const recentTx = transactions.slice(0, 5);
  const greeting = getGreeting();
  const userName = profile?.full_name || 'User';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textMuted }]}>{greeting}</Text>
          <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.hdrBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowManualModal(true)}
          >
            <FontAwesome6 name="plus" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: UPlanColors.primary }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Daily Limit Card */}
      <View style={[styles.limitCard, { 
        borderColor: 'rgba(255,0,213,0.2)',
        shadowColor: UPlanColors.primary, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDark ? 0.15 : 0.05, shadowRadius: 20, elevation: 10
      }]}>
        <LinearGradient
          colors={isDark ? ['#1a1020', '#12101a'] : ['#FFF5FC', '#F8F0FF']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={styles.limitTop}>
          <Text style={[styles.limitLabel, { color: theme.textMuted }]}>TODAY'S LIMIT</Text>
          <TouchableOpacity 
            style={[styles.editBadge, { backgroundColor: UPlanColors.primarySubtle }]}
            onPress={() => {
              setLimitInput(budget.dailyLimit.toString());
              setShowEditLimit(true);
            }}
          >
            <FontAwesome6 name="pen" size={10} color={UPlanColors.primaryLight} />
            <Text style={[styles.editBadgeText, { color: UPlanColors.primaryLight }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.limitAmount, { color: theme.text }]}>
          Rp{Math.abs(budget.remaining).toLocaleString('id-ID')}
          <Text style={[styles.limitAmountLabel, { color: UPlanColors.accent }]}>
            {budget.remaining >= 0 ? ' left' : ' over!'}
          </Text>
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <LinearGradient
            colors={budget.isNearLimit
              ? [UPlanColors.warning, UPlanColors.danger]
              : [UPlanColors.accentDark, UPlanColors.accent]}
            style={[styles.progressFill, { width: `${budget.budgetPct}%` }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </View>
        <View style={styles.progressMeta}>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            Spent: Rp{budget.todaySpent.toLocaleString('id-ID')}
          </Text>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            Target: Rp{budget.dailyLimit.toLocaleString('id-ID')}
          </Text>
        </View>
      </View>

      {/* QRIS Streak Pill */}
      <View style={[styles.streakPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.streakIcon, { backgroundColor: UPlanColors.accentSubtle }]}>
          <FontAwesome6 name="fire-flame-curved" size={16} color={UPlanColors.accent} />
        </View>
        <View style={styles.streakInfo}>
          <Text style={[styles.streakCount, { color: theme.text }]}>
            {budget.todayQRISTaps <= budget.qrisDailyLimit ? '3' : '0'} Days Streak 🔥
          </Text>
          <Text style={[styles.streakSub, { color: theme.textMuted }]}>
            Under QRIS limit — keep going!
          </Text>
        </View>
        <View style={styles.streakDots}>
          {[1,2,3,4,5,6,7].map(i => (
            <View key={i} style={[styles.streakDot,
              i <= 3 && { backgroundColor: UPlanColors.accent, shadowColor: UPlanColors.accent }
            ]} />
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {[
          { icon: 'plus', label: 'Add', color: UPlanColors.primary, bg: UPlanColors.primarySubtle },
          { icon: 'camera', label: 'Scan', color: UPlanColors.accent, bg: UPlanColors.accentSubtle },
          { icon: 'piggy-bank', label: 'Save', color: UPlanColors.success, bg: UPlanColors.successSubtle },
          { icon: 'chart-simple', label: 'Stats', color: UPlanColors.warning, bg: UPlanColors.warningSubtle },
        ].map((a, i) => (
          <TouchableOpacity key={i} style={[styles.qaBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {
              safeHaptics('light');
              if (a.icon === 'camera') setShowScanner(true);
              else if (a.icon === 'plus') setShowManualModal(true);
              else if (a.icon === 'chart-simple') router.push('/(tabs)/qris');
              else if (a.icon === 'piggy-bank') router.push('/(tabs)/goals');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.qaIcon, { backgroundColor: a.bg }]}>
              <FontAwesome6 name={a.icon} size={16} color={a.color} />
            </View>
            <Text style={[styles.qaLabel, { color: theme.textSecondary }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Goals Scroll */}
      {goals.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>My Goals</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}>
              <Text style={[styles.sectionLink, { color: UPlanColors.primary }]}>See all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.goalsScroll}
          >
            {goals.slice(0, 3).map(goal => {
              const pct = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0;
              return (
                <View key={goal.id} style={[styles.goalMini, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.goalMiniTop}>
                    <Text style={styles.goalMiniIcon}>{goal.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalMiniName, { color: theme.text }]}>{goal.title}</Text>
                      <Text style={[styles.goalMiniSub, { color: theme.textMuted }]}>{goal.description}</Text>
                    </View>
                  </View>
                  <Text style={[styles.goalMiniAmount, { color: UPlanColors.primary }]}>
                    Rp{goal.current_amount.toLocaleString('id-ID')}
                  </Text>
                  <View style={[styles.goalMiniBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <LinearGradient
                      colors={[UPlanColors.accent, UPlanColors.primary]}
                      style={[styles.goalMiniBarFill, { width: `${Math.min(pct, 100)}%` }]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                  </View>
                  <Text style={[styles.goalMiniPct, { color: theme.textMuted }]}>
                    {pct}% of Rp{goal.target_amount.toLocaleString('id-ID')}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Recent Activity */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={[styles.sectionLink, { color: UPlanColors.primary }]}>View all →</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.txCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {recentTx.length > 0 ? recentTx.map(tx => (
          <TxItem key={tx.id} tx={tx} theme={theme} />
        )) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { color: theme.textMuted }]}>📝</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No transactions yet</Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* OCR Scanner */}
      <OCRScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleScanComplete}
      />

      {/* Confirm Scan Modal */}
      <Modal visible={showConfirmModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContentWrap}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Konfirmasi Transaksi</Text>
                <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Nama Merchant / Penerima</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                    value={scanMerchant} onChangeText={setScanMerchant} placeholder="Kopi Kenangan" placeholderTextColor={theme.textMuted} />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Nominal (Rp)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                    value={scanAmount} onChangeText={setScanAmount} placeholder="50000" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Kategori</Text>
                  <View style={styles.categoryRow}>
                    {Object.entries(CATEGORIES).slice(0, 4).map(([key, cat]) => (
                      <TouchableOpacity key={key} style={[styles.catBadge, scanCategory === key && { backgroundColor: cat.bgColor, borderColor: cat.color }]}
                        onPress={() => setScanCategory(key)}>
                        <FontAwesome6 name={cat.icon} size={12} color={scanCategory === key ? cat.color : theme.textMuted} />
                        <Text style={[styles.catText, { color: scanCategory === key ? cat.color : theme.textMuted }]}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveScan} activeOpacity={0.7}>
                  <LinearGradient pointerEvents="none" colors={[UPlanColors.primary, UPlanColors.primaryLight]} style={styles.saveBtnGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.saveBtnText}>Simpan Transaksi</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Manual Add Modal */}
      <Modal visible={showManualModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContentWrap}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Catat Manual</Text>
                <TouchableOpacity onPress={() => setShowManualModal(false)}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Keterangan (Merchant)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                    value={manualMerchant} onChangeText={setManualMerchant} placeholder="Makan Siang" placeholderTextColor={theme.textMuted} />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Nominal (Rp)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                    value={manualAmount} onChangeText={setManualAmount} placeholder="25000" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Kategori</Text>
                  <View style={styles.categoryRow}>
                    {Object.entries(CATEGORIES).slice(0, 4).map(([key, cat]) => (
                      <TouchableOpacity key={key} style={[styles.catBadge, manualCategory === key && { backgroundColor: cat.bgColor, borderColor: cat.color }]}
                        onPress={() => setManualCategory(key)}>
                        <FontAwesome6 name={cat.icon} size={12} color={manualCategory === key ? cat.color : theme.textMuted} />
                        <Text style={[styles.catText, { color: manualCategory === key ? cat.color : theme.textMuted }]}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveManual} activeOpacity={0.7}>
                  <LinearGradient pointerEvents="none" colors={[UPlanColors.primary, UPlanColors.primaryLight]} style={styles.saveBtnGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.saveBtnText}>Catat Pengeluaran</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Limit Modal */}
      <Modal visible={showEditLimit} animationType="fade" transparent>
        <View style={styles.modalOverlayCenter}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', alignItems: 'center' }}>
            <View style={[styles.modalCenterContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Ubah Limit Harian</Text>
                <TouchableOpacity onPress={() => setShowEditLimit(false)}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Nominal Target (Rp)</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  value={limitInput} onChangeText={setLimitInput} placeholder="160000" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLimit} activeOpacity={0.7}>
                <LinearGradient pointerEvents="none" colors={[UPlanColors.primary, UPlanColors.primaryLight]} style={styles.saveBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.saveBtnText}>Simpan Limit Baru</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </ScrollView>
  );
}

function TxItem({ tx, theme }: { tx: any; theme: any }) {
  const cat = CATEGORIES[tx.category as keyof typeof CATEGORIES] || CATEGORIES.other;
  const isExpense = tx.category !== 'topup';

  return (
    <View style={[styles.txItem, { borderBottomColor: theme.border }]}>
      <View style={[styles.txIcon, { backgroundColor: cat.bgColor }]}>
        <FontAwesome6 name={cat.icon} size={14} color={cat.color} />
      </View>
      <View style={styles.txInfo}>
        <View style={styles.txNameRow}>
          <Text style={[styles.txName, { color: theme.text }]} numberOfLines={1}>{tx.name || tx.merchant_name}</Text>
          {tx.is_impulse && (
            <View style={styles.impulseBadge}>
              <Text style={styles.impulseBadgeText}>IMPULSE</Text>
            </View>
          )}
        </View>
        <Text style={[styles.txMeta, { color: theme.textMuted }]}>
          {tx.merchant_name} • {formatRelativeDate(tx.transaction_date)}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: isExpense ? theme.text : UPlanColors.success }]}>
        {isExpense ? '-' : '+'} Rp{tx.amount.toLocaleString('id-ID')}
      </Text>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning 👋';
  if (h < 17) return 'Good Afternoon ☀️';
  return 'Good Evening 🌙';
}

function formatRelativeDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContentWrap: { width: '100%' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalCenterContent: { width: '100%', borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 15 },
  
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  saveBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  categoryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  catText: { fontSize: 12, fontWeight: '600' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hdrBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 12, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  limitCard: {
    borderRadius: 22, padding: 20, marginBottom: 14,
    borderWidth: 1, overflow: 'hidden', position: 'relative',
  },
  limitTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  limitLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  editBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20,
  },
  editBadgeText: { fontSize: 11, fontWeight: '600' },
  limitAmount: { fontSize: 40, fontWeight: '900', letterSpacing: -2, lineHeight: 46 },
  limitAmountLabel: { fontSize: 16, fontWeight: '600' },

  progressBar: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', borderRadius: 5 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressText: { fontSize: 11 },

  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 50, borderWidth: 1, marginBottom: 14,
  },
  streakIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  streakInfo: { flex: 1 },
  streakCount: { fontSize: 14, fontWeight: '800' },
  streakSub: { fontSize: 11 },
  streakDots: { flexDirection: 'row', gap: 3 },
  streakDot: {
    width: 18, height: 3, borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  qaBtn: {
    flex: 1, alignItems: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 16, borderWidth: 1,
  },
  qaIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  qaLabel: { fontSize: 11, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionLink: { fontSize: 12, fontWeight: '600' },

  goalsScroll: { gap: 12, paddingRight: 16 },
  goalMini: { width: 200, padding: 16, borderRadius: 16, borderWidth: 1 },
  goalMiniTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  goalMiniIcon: { fontSize: 24 },
  goalMiniName: { fontSize: 14, fontWeight: '700' },
  goalMiniSub: { fontSize: 10 },
  goalMiniAmount: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  goalMiniBar: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  goalMiniBarFill: { height: '100%', borderRadius: 3 },
  goalMiniPct: { fontSize: 10, textAlign: 'right' },

  txCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 4 },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  txIcon: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1, minWidth: 0 },
  txNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  txMeta: { fontSize: 11, marginTop: 1 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  impulseBadge: {
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8,
    backgroundColor: UPlanColors.dangerSubtle, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  impulseBadgeText: { fontSize: 8, fontWeight: '700', color: UPlanColors.danger, letterSpacing: 0.3 },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 13 },
});

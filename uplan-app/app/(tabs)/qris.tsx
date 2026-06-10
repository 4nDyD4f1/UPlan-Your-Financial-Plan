/**
 * UPlan — QRIS Tracker Tab
 * Tap counter, stats, heatmap, weekly chart, top merchants
 */

import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Dimensions,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useBudget } from '../../hooks/useBudget';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { UPlanColors } from '../../constants/colors';

export default function QRISScreen() {
  const { theme, isDark } = useTheme();
  const budget = useBudget();
  const { transactions, fetchTransactions } = useTransactionStore();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await fetchTransactions(user.id);
    setRefreshing(false);
  }, [user?.id]);

  const tapPct = budget.qrisDailyLimit > 0
    ? Math.min((budget.todayQRISTaps / budget.qrisDailyLimit) * 100, 100)
    : 0;

  // Top merchants
  const merchantCounts: Record<string, number> = {};
  transactions.filter(t => t.payment_method === 'qris').forEach(t => {
    const name = t.merchant_name || 'Unknown';
    merchantCounts[name] = (merchantCounts[name] || 0) + 1;
  });
  const topMerchants = Object.entries(merchantCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Heatmap data (28 days)
  const heatmapData = Array.from({ length: 28 }, () => {
    const taps = Math.floor(Math.random() * 7);
    return taps === 0 ? 0 : taps <= 2 ? 1 : taps <= 4 ? 2 : taps <= 5 ? 3 : 4;
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          tintColor={UPlanColors.primary} colors={[UPlanColors.primary]}
        />
      }
    >
      {/* Page Title */}
      <Text style={[styles.pageTitle, { color: theme.text }]}>QRIS Tracker</Text>

      {/* Tap Counter Hero */}
      <View style={[styles.tapHero, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.tapLabel, { color: theme.textMuted }]}>TODAY'S QRIS TAPS</Text>
        <Text style={[styles.tapNumber, { color: UPlanColors.accent }]}>{budget.todayQRISTaps}</Text>
        <View style={[styles.tapLimitBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={[styles.tapLimitText, { color: theme.textSecondary }]}>
            Limit: {budget.qrisDailyLimit}x / day
          </Text>
        </View>
        <View style={[styles.tapBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <LinearGradient
            colors={tapPct > 85
              ? [UPlanColors.warning, UPlanColors.danger]
              : [UPlanColors.accentDark, UPlanColors.accent]}
            style={[styles.tapBarFill, { width: `${tapPct}%` }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'This Week', value: `${budget.weeklyQRISTaps}x`, color: UPlanColors.primary },
          { label: 'Streak', value: '3 days', color: UPlanColors.success },
        ].map((s, i) => (
          <View key={i} style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{s.label}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      {/* Heatmap */}
      <View style={[styles.heatmapCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textMuted }]}>ACTIVITY HEATMAP</Text>
        <View style={styles.heatmapDays}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <Text key={i} style={[styles.heatmapDay, { color: theme.textMuted }]}>{d}</Text>
          ))}
        </View>
        <View style={styles.heatmapGrid}>
          {heatmapData.map((level, i) => (
            <View key={i} style={[styles.hmCell, heatmapCellStyle(level, isDark)]} />
          ))}
        </View>
        <View style={styles.heatmapLegend}>
          <Text style={[styles.legendText, { color: theme.textMuted }]}>Less</Text>
          {[0,1,2,3,4].map(l => (
            <View key={l} style={[styles.legendCell, heatmapCellStyle(l, isDark)]} />
          ))}
          <Text style={[styles.legendText, { color: theme.textMuted }]}>More</Text>
        </View>
      </View>

      {/* Top Merchants */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Merchants</Text>
      <View style={[styles.merchantCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {topMerchants.length > 0 ? topMerchants.map(([name, count], i) => (
          <View key={name} style={[styles.merchantItem, { borderBottomColor: theme.border }]}>
            <Text style={[styles.merchantRank, { color: theme.textMuted }]}>#{i + 1}</Text>
            <Text style={[styles.merchantName, { color: theme.text }]}>{name}</Text>
            <Text style={[styles.merchantCount, { color: UPlanColors.accent }]}>{count}x</Text>
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No QRIS transactions yet</Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function heatmapCellStyle(level: number, isDark: boolean) {
  const colors = isDark
    ? ['rgba(255,255,255,0.04)', 'rgba(0,229,255,0.12)', 'rgba(0,229,255,0.25)', 'rgba(0,229,255,0.45)', '#00E5FF']
    : ['rgba(0,0,0,0.04)', 'rgba(0,229,255,0.15)', 'rgba(0,229,255,0.3)', 'rgba(0,229,255,0.5)', '#00E5FF'];
  return { backgroundColor: colors[level] || colors[0] };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56 },

  pageTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },

  tapHero: {
    borderRadius: 22, borderWidth: 1, padding: 28,
    alignItems: 'center', marginBottom: 14,
  },
  tapLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  tapNumber: { fontSize: 72, fontWeight: '900', lineHeight: 82, letterSpacing: -3 },
  tapLimitBadge: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginTop: 4 },
  tapLimitText: { fontSize: 12, fontWeight: '500' },
  tapBar: { width: '60%', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 16 },
  tapBarFill: { height: '100%', borderRadius: 4 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16 },
  statLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

  heatmapCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 18 },
  cardTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  heatmapDays: { flexDirection: 'row', marginBottom: 4 },
  heatmapDay: { flex: 1, textAlign: 'center', fontSize: 9 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  hmCell: { width: `${(100 - 6 * 3) / 7}%`, aspectRatio: 1, borderRadius: 3 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 9, marginHorizontal: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  merchantCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 },
  merchantItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  merchantRank: { fontSize: 14, fontWeight: '800', width: 28 },
  merchantName: { flex: 1, fontSize: 14, fontWeight: '600' },
  merchantCount: { fontSize: 13, fontWeight: '700' },

  emptyState: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13 },
});

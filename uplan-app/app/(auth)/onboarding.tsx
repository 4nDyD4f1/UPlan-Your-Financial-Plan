/**
 * UPlan — Onboarding Screen
 * Post-signup: set name, monthly income, daily budget, triggers
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../hooks/useTheme';
import { UPlanColors } from '../../constants/colors';

const STEPS = [
  { emoji: '👋', title: 'Hey there!', subtitle: 'Let\'s set up your profile' },
  { emoji: '💰', title: 'Your Income', subtitle: 'How much do you earn monthly?' },
  { emoji: '🎯', title: 'Spending Triggers', subtitle: 'How do you usually pay?' },
];

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { user, updateProfile } = useAuthStore();
  const [step, setStep] = useState(0);

  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [income, setIncome] = useState('4800000');
  const [triggers, setTriggers] = useState<string[]>(['qris', 'card']);

  const dailyBudget = Math.round(parseInt(income || '0') / 30);

  async function handleComplete() {
    if (!name.trim()) { Alert.alert('Oops', 'Masukkan namamu!'); return; }
    if (!income || parseInt(income) <= 0) { Alert.alert('Oops', 'Masukkan income yang valid!'); return; }

    await updateProfile({
      full_name: name.trim(),
      monthly_income: parseInt(income),
      daily_budget: dailyBudget,
    });

    router.replace('/(tabs)');
  }

  function toggleTrigger(t: string) {
    setTriggers(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive,
              { backgroundColor: i === step ? UPlanColors.primary : theme.border }
            ]} />
          ))}
        </View>

        {/* Header */}
        <Text style={styles.emoji}>{STEPS[step].emoji}</Text>
        <Text style={[styles.title, { color: theme.text }]}>{STEPS[step].title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{STEPS[step].subtitle}</Text>

        {/* Step Content */}
        <View style={styles.formArea}>
          {step === 0 && (
            <View style={styles.form}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Andy Pratama"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          {step === 1 && (
            <View style={styles.form}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Monthly Income (Rp)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="4800000"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                value={income}
                onChangeText={setIncome}
              />
              <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Recommended Daily Budget</Text>
                <Text style={[styles.infoValue, { color: UPlanColors.primary }]}>
                  Rp{dailyBudget.toLocaleString('id-ID')}/day
                </Text>
              </View>

              <View style={styles.presetRow}>
                {[3000000, 4800000, 7500000, 10000000].map(v => (
                  <TouchableOpacity key={v}
                    style={[styles.preset, income === String(v) && styles.presetActive,
                      { borderColor: income === String(v) ? UPlanColors.primary : theme.border }
                    ]}
                    onPress={() => setIncome(String(v))}
                  >
                    <Text style={[styles.presetText,
                      { color: income === String(v) ? UPlanColors.primary : theme.textSecondary }
                    ]}>
                      {(v / 1000000).toFixed(1)}M
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.form}>
              <View style={styles.triggerGrid}>
                {[
                  { key: 'qris', label: 'QRIS', icon: '📱', desc: 'Scan & pay' },
                  { key: 'card', label: 'Kartu', icon: '💳', desc: 'Debit / Credit' },
                  { key: 'cash', label: 'Tunai', icon: '💵', desc: 'Cash payment' },
                  { key: 'transfer', label: 'Transfer', icon: '🏦', desc: 'Bank transfer' },
                ].map(t => (
                  <TouchableOpacity key={t.key}
                    style={[styles.triggerCard,
                      triggers.includes(t.key) && styles.triggerActive,
                      { backgroundColor: theme.surface, borderColor: triggers.includes(t.key) ? UPlanColors.primary : theme.border }
                    ]}
                    onPress={() => toggleTrigger(t.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.triggerIcon}>{t.icon}</Text>
                    <Text style={[styles.triggerLabel, { color: theme.text }]}>{t.label}</Text>
                    <Text style={[styles.triggerDesc, { color: theme.textMuted }]}>{t.desc}</Text>
                    {triggers.includes(t.key) && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomBtns}>
        {step > 0 && (
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: theme.border }]}
            onPress={() => setStep(step - 1)}
          >
            <Text style={[styles.backBtnText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => step < 2 ? setStep(step + 1) : handleComplete()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[UPlanColors.primary, UPlanColors.primaryLight]}
            style={styles.nextBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={styles.nextBtnText}>
              {step < 2 ? 'Next →' : 'Let\'s Go! 🚀'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 },
  dot: { width: 28, height: 4, borderRadius: 2 },
  dotActive: { width: 40 },

  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 32 },

  formArea: { flex: 1 },
  form: { gap: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: -4 },
  input: { paddingVertical: 16, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, fontSize: 16 },

  infoCard: { padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginTop: 4 },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  infoValue: { fontSize: 24, fontWeight: '800', letterSpacing: -1 },

  presetRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  preset: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  presetActive: { backgroundColor: 'rgba(255,0,213,0.08)' },
  presetText: { fontSize: 14, fontWeight: '700' },

  triggerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  triggerCard: {
    width: '47%', padding: 18, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', gap: 6, position: 'relative',
  },
  triggerActive: { backgroundColor: 'rgba(255,0,213,0.05)' },
  triggerIcon: { fontSize: 32 },
  triggerLabel: { fontSize: 15, fontWeight: '700' },
  triggerDesc: { fontSize: 11 },
  checkmark: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: UPlanColors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  checkmarkText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  bottomBtns: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 28, paddingBottom: 40, paddingTop: 16,
  },
  backBtn: { flex: 0.4, paddingVertical: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  backBtnText: { fontSize: 15, fontWeight: '600' },
  nextBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  nextBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

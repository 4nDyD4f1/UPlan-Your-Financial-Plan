/**
 * UPlan — Profile & Settings Tab
 * Budget limits, notifications, theme toggle, and account actions
 */

import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, Modal, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore, type ThemePreference } from '../../store/useThemeStore';
import { UPlanColors } from '../../constants/colors';
import type { DBUser } from '../../lib/supabase';

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const { profile, updateProfile, signOut } = useAuthStore();
  const { preference, setPreference } = useThemeStore();

  const [editModal, setEditModal] = useState<{
    visible: boolean;
    field: keyof DBUser | null;
    label: string;
    value: string;
  }>({ visible: false, field: null, label: '', value: '' });

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const openEdit = (field: keyof DBUser, label: string, currentVal: any) => {
    setEditModal({
      visible: true,
      field,
      label,
      value: String(currentVal || ''),
    });
  };

  const saveEdit = async () => {
    if (!editModal.field) return;
    
    const val = parseInt(editModal.value);
    if (isNaN(val) || val <= 0) return;

    await updateProfile({ [editModal.field]: val });
    setEditModal({ visible: false, field: null, label: '', value: '' });
  };

  const toggleTheme = (pref: ThemePreference) => {
    setPreference(pref);
  };

  const userName = profile?.full_name || 'User';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'New Member';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[UPlanColors.primary, '#6366F1']}
            style={styles.avatar}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
          <Text style={[styles.memberSince, { color: theme.textMuted }]}>Member since {memberSince}</Text>
        </View>

        {/* Budget Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>BUDGET & LIMITS</Text>
          
          <SettingItem
            icon="wallet" color={UPlanColors.success}
            label="Monthly Income"
            value={`Rp${(profile?.monthly_income || 0).toLocaleString('id-ID')}`}
            onPress={() => openEdit('monthly_income', 'Monthly Income', profile?.monthly_income)}
            theme={theme}
          />
          <SettingItem
            icon="bullseye" color={UPlanColors.primary}
            label="Daily Budget Limit"
            value={`Rp${(profile?.daily_budget || 0).toLocaleString('id-ID')}`}
            onPress={() => openEdit('daily_budget', 'Daily Budget', profile?.daily_budget)}
            theme={theme}
          />
          <SettingItem
            icon="mobile-screen" color={UPlanColors.warning}
            label="QRIS Daily Tap Limit"
            value={`${profile?.qris_daily_limit || 0}x / day`}
            onPress={() => openEdit('qris_daily_limit', 'QRIS Tap Limit', profile?.qris_daily_limit)}
            theme={theme}
          />
          <SettingItem
            icon="bolt" color={UPlanColors.danger}
            label="Impulse Threshold"
            value={`< Rp${(profile?.impulse_threshold || 0).toLocaleString('id-ID')}`}
            onPress={() => openEdit('impulse_threshold', 'Impulse Threshold', profile?.impulse_threshold)}
            theme={theme}
            isLast
          />
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>PREFERENCES</Text>
          
          <View style={[styles.themeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.themeLabel, { color: theme.text }]}>Theme</Text>
            <View style={[styles.themeSegment, { backgroundColor: theme.input }]}>
              {(['light', 'dark', 'system'] as const).map(pref => (
                <TouchableOpacity
                  key={pref}
                  style={[styles.themeBtn, preference === pref && { backgroundColor: theme.surfaceAlt }]}
                  onPress={() => toggleTheme(pref)}
                >
                  <Text style={[
                    styles.themeBtnText,
                    { color: preference === pref ? theme.text : theme.textMuted }
                  ]}>
                    {pref.charAt(0).toUpperCase() + pref.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleSignOut}
          >
            <FontAwesome6 name="arrow-right-from-bracket" size={16} color={UPlanColors.danger} />
            <Text style={[styles.actionBtnText, { color: UPlanColors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: theme.textMuted }]}>UPlan App v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal.visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContentWrap}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit {editModal.label}</Text>
                <TouchableOpacity onPress={() => setEditModal({ ...editModal, visible: false })}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>New Value (Number only)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  value={editModal.value}
                  onChangeText={(v) => setEditModal({ ...editModal, value: v })}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
              
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                <LinearGradient colors={[UPlanColors.primary, UPlanColors.primaryLight]} style={styles.saveBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function SettingItem({ icon, color, label, value, onPress, theme, isLast = false }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.settingItem,
        { backgroundColor: theme.card, borderBottomColor: theme.border },
        !isLast && { borderBottomWidth: 1 }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: `${color}1A` }]}>
          <FontAwesome6 name={icon} size={14} color={color} />
        </View>
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{value}</Text>
        <FontAwesome6 name="chevron-right" size={12} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56 },

  hero: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  memberSince: { fontSize: 13 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  
  settingItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingValue: { fontSize: 14, fontWeight: '600' },

  themeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1,
  },
  themeLabel: { fontSize: 15, fontWeight: '500' },
  themeSegment: { flexDirection: 'row', borderRadius: 8, padding: 4 },
  themeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  themeBtnText: { fontSize: 13, fontWeight: '600' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, borderWidth: 1,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700' },

  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContentWrap: { width: '100%' },
  modalContent: { borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { padding: 16, borderRadius: 12, borderWidth: 1, fontSize: 16, fontWeight: '600' },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

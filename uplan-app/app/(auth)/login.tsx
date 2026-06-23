/**
 * UPlan — Login Screen
 * Guest Login Flow (No Password)
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../hooks/useTheme';
import { UPlanColors } from '../../constants/colors';
import { showAlert } from '../../lib/database';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
  const { signInAsGuest, loading } = useAuthStore();
  const [name, setName] = useState('');

  async function handleGuestLogin() {
    if (!name.trim()) {
      showAlert('Oops', 'Mohon masukkan nama Anda');
      return;
    }
    
    const { error } = await signInAsGuest(name.trim());
    if (error) {
      showAlert('Error', error);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            {/* Removed logoBox as requested */}
            <Text style={[styles.title, { color: theme.text }]}>UPlan</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Smart budgeting & expense tracker
            </Text>
          </View>

          {/* Form Section */}
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.formTitle, { color: theme.text }]}>Masuk ke UPlan</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Nama Anda</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Misal: Andi"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity 
              style={styles.btn} 
              onPress={handleGuestLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[UPlanColors.primary, UPlanColors.primaryLight]}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
              >
                <Text style={styles.btnText}>
                  {loading ? 'Memuat...' : 'Mulai Sekarang (Guest)'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Semua data disimpan secara lokal dan aman di perangkat Anda.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// End of component

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 10,
    shadowColor: UPlanColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  formCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  btn: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 20,
  }
});

/**
 * UPlan — Login Screen
 * Google OAuth + Magic Link (no password)
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
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../hooks/useTheme';
import { UPlanColors } from '../../constants/colors';
import { showAlert } from '../../lib/database';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
  const { signInWithGoogle, signInWithMagicLink, signInWithPassword, signUpWithPassword, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handlePasswordAuth() {
    if (!email.trim() || !email.includes('@')) {
      showAlert('Oops', 'Masukkan email yang valid!');
      return;
    }
    if (password.length < 6) {
      showAlert('Oops', 'Password minimal 6 karakter!');
      return;
    }

    if (isSignUp) {
      const { error } = await signUpWithPassword(email.trim(), password);
      if (error) showAlert('Error', error);
      else showAlert('Sukses!', 'Akun berhasil dibuat!');
    } else {
      const { error } = await signInWithPassword(email.trim(), password);
      if (error) showAlert('Error', error);
    }
  }

  async function handleMagicLink() {
    if (!email.trim() || !email.includes('@')) {
      showAlert('Oops', 'Masukkan email yang valid!');
      return;
    }

    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      showAlert('Error', error);
    } else {
      setMagicLinkSent(true);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Background gradient glow */}
      <View style={styles.glowContainer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,0,213,0.15)', 'transparent']}
          style={styles.glow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <View style={styles.content}>
        {/* Logo & Brand */}
        <View style={styles.brandSection}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.brandName, { color: UPlanColors.primary }]}>UPlan</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            Smart QRIS Finance Tracker{'\n'}untuk Gen Z 🚀
          </Text>
        </View>

        {magicLinkSent ? (
          /* Success State */
          <View style={styles.successSection}>
            <Text style={styles.successEmoji}>📧</Text>
            <Text style={[styles.successTitle, { color: theme.text }]}>Check your email!</Text>
            <Text style={[styles.successDesc, { color: theme.textSecondary }]}>
              We sent a magic link to{'\n'}
              <Text style={{ color: UPlanColors.primary, fontWeight: '700' }}>{email}</Text>
              {'\n'}Click the link to sign in ✨
            </Text>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.border }]}
              onPress={() => setMagicLinkSent(false)}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Use different email</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Login Form */
          <View style={styles.formSection}>
            {/* Google OAuth */}
            <TouchableOpacity
              style={[styles.googleBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={signInWithGoogle}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={[styles.googleBtnText, { color: theme.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Email & Password */}
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
                color: theme.text,
              }]}
              placeholder="your@email.com"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />

            <TextInput
              style={[styles.input, {
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
                color: theme.text,
              }]}
              placeholder="Password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.magicLinkBtn, loading && styles.btnDisabled]}
              onPress={handlePasswordAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[UPlanColors.primary, UPlanColors.primaryLight]}
                style={styles.magicLinkGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.magicLinkBtnText}>
                  {loading ? 'Loading...' : isSignUp ? '📝 Create Account' : '🚀 Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              style={styles.toggleAuthBtn}
              disabled={loading}
            >
              <Text style={[styles.toggleAuthText, { color: theme.textSecondary }]}>
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.border, marginTop: 0 }]}
              onPress={handleMagicLink}
              disabled={loading}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>✨ Send Magic Link</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Footer */}
      <Text style={[styles.footer, { color: theme.textMuted }]}>
        By continuing, you agree to our Terms & Privacy Policy
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glowContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  glow: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },

  brandSection: { alignItems: 'center', marginBottom: 48 },
  logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 16 },
  brandName: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  tagline: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },

  formSection: { gap: 14 },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '600' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: '500' },

  input: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
  },

  magicLinkBtn: { borderRadius: 14, overflow: 'hidden' },
  magicLinkGradient: { paddingVertical: 16, alignItems: 'center' },
  magicLinkBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  hint: { fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 18 },

  successSection: { alignItems: 'center', gap: 12 },
  successEmoji: { fontSize: 48 },
  successTitle: { fontSize: 22, fontWeight: '800' },
  successDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  secondaryBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, marginTop: 12, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },

  toggleAuthBtn: { alignSelf: 'center', marginVertical: 8 },
  toggleAuthText: { fontSize: 13, fontWeight: '600' },

  footer: { fontSize: 11, textAlign: 'center', paddingBottom: 40, paddingHorizontal: 32 },
});

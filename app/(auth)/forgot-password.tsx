import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/tokens';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email) { setError('請輸入 Email'); return; }
    if (!isValidEmail(email)) { setError('Email 格式不正確'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'dripwardrobe://reset-password',
    });
    setLoading(false);
    if (err) {
      const msg = err.message.toLowerCase();
      if (msg.includes('network') || msg.includes('fetch')) {
        setError('網路連線失敗，請稍後再試');
      } else {
        setError(err.message);
      }
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>重設連結已送出</Text>
          <Text style={styles.successSub}>
            請檢查 {email} 的信箱{'\n'}
            點擊信中的連結來重設密碼
          </Text>
          <TouchableOpacity style={[styles.btn, styles.btnWide]} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.btnText}>回到登入</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← BACK</Text>
      </TouchableOpacity>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <Text style={styles.logo}>DRIP</Text>
          <Text style={styles.subtitle}>RESET YOUR PASSWORD</Text>

          <Text style={styles.desc}>
            輸入你的 Email，我們會寄送重設密碼的連結給你
          </Text>

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            placeholder="your@email.com"
            placeholderTextColor={colors.text.disabled}
            autoCapitalize="none"
            keyboardType="email-address"
            cursorColor={colors.brand.primary}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'SENDING...' : 'SEND RESET LINK'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12 },
  backText: { color: colors.brand.primary, fontSize: 12, letterSpacing: 1.5, fontWeight: '700' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: {
    fontSize: 48, fontWeight: '900', color: colors.brand.primary,
    letterSpacing: 8, textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontSize: 10, color: colors.text.secondary, letterSpacing: 3,
    textAlign: 'center', marginBottom: 32,
  },
  desc: {
    fontSize: 13, color: colors.text.placeholder, textAlign: 'center',
    lineHeight: 20, marginBottom: 32,
  },
  label: { fontSize: 10, color: colors.text.label, letterSpacing: 2, marginBottom: 6 },
  input: {
    backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default,
    color: colors.text.primary, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14,
  },
  inputError: { borderColor: colors.feedback.error },
  errorText: { color: colors.feedback.error, fontSize: 11, marginTop: 6, letterSpacing: 0.5 },
  btn: {
    backgroundColor: colors.brand.primary, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  btnWide: { paddingHorizontal: 48 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.text.onBrand, fontWeight: '800', fontSize: 13, letterSpacing: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  successIcon: { fontSize: 48, color: colors.brand.primary, marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '800', color: colors.text.primary, letterSpacing: 2, marginBottom: 8 },
  successSub: { fontSize: 12, color: colors.text.placeholder, letterSpacing: 1, marginBottom: 40, textAlign: 'center', lineHeight: 20 },
});

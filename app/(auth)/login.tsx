import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/tokens';

type FieldErrors = {
  email?: string;
  password?: string;
  general?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ email?: string; password?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState(params.password ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function validate() {
    const newErrors: FieldErrors = {};
    if (!email) newErrors.email = '請輸入 Email';
    else if (!isValidEmail(email)) newErrors.email = 'Email 格式不正確';
    if (!password) newErrors.password = '請輸入密碼';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
        setErrors({ password: '帳號或密碼不正確' });
      } else if (msg.includes('not found') || msg.includes('user')) {
        setErrors({ email: '此 Email 尚未註冊' });
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setErrors({ general: '網路連線失敗，請稍後再試' });
      } else {
        setErrors({ general: error.message });
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>DRIP</Text>
        <Text style={styles.subtitle}>YOUR PERSONAL WARDROBE STYLIST</Text>

        <View style={styles.form}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
            placeholder="your@email.com"
            placeholderTextColor={colors.text.disabled}
            autoCapitalize="none"
            keyboardType="email-address"
            cursorColor={colors.brand.primary}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
          <TextInput
            style={[styles.input, errors.password ? styles.inputError : null]}
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
            placeholder="••••••••"
            placeholderTextColor={colors.text.disabled}
            secureTextEntry
            cursorColor={colors.brand.primary}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>FORGOT PASSWORD?</Text>
          </TouchableOpacity>

          {errors.general && (
            <View style={styles.generalError}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'SIGNING IN...' : 'SIGN IN'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.link}>DON'T HAVE AN ACCOUNT? SIGN UP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: {
    fontSize: 48, fontWeight: '900', color: colors.brand.primary,
    letterSpacing: 8, textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontSize: 10, color: colors.text.secondary, letterSpacing: 3,
    textAlign: 'center', marginBottom: 48,
  },
  form: {},
  label: { fontSize: 10, color: colors.text.label, letterSpacing: 2, marginBottom: 6 },
  input: {
    backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default,
    color: colors.text.primary, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14,
  },
  inputError: { borderColor: colors.feedback.error },
  errorText: { color: colors.feedback.error, fontSize: 11, marginTop: 6, letterSpacing: 0.5 },
  generalError: { marginTop: 12 },
  btn: {
    backgroundColor: colors.brand.primary, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.text.onBrand, fontWeight: '800', fontSize: 13, letterSpacing: 2 },
  link: { color: colors.text.placeholder, fontSize: 10, letterSpacing: 1.5, textAlign: 'center', marginTop: 24 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { color: colors.brand.primary, fontSize: 10, letterSpacing: 1.5 },
});

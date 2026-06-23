import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

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
            placeholderTextColor="#555555"
            autoCapitalize="none"
            keyboardType="email-address"
            cursorColor="#9CE41C"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
          <TextInput
            style={[styles.input, errors.password ? styles.inputError : null]}
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
            placeholder="••••••••"
            placeholderTextColor="#555555"
            secureTextEntry
            cursorColor="#9CE41C"
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
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: {
    fontSize: 48, fontWeight: '900', color: '#9CE41C',
    letterSpacing: 8, textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontSize: 10, color: '#888888', letterSpacing: 3,
    textAlign: 'center', marginBottom: 48,
  },
  form: {},
  label: { fontSize: 10, color: '#999999', letterSpacing: 2, marginBottom: 6 },
  input: {
    backgroundColor: '#111', borderWidth: 1, borderColor: '#222',
    color: '#fff', paddingHorizontal: 16, paddingVertical: 14, fontSize: 14,
  },
  inputError: { borderColor: '#ff4444' },
  errorText: { color: '#ff4444', fontSize: 11, marginTop: 6, letterSpacing: 0.5 },
  generalError: { marginTop: 12 },
  btn: {
    backgroundColor: '#9CE41C', paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 13, letterSpacing: 2 },
  link: { color: '#666666', fontSize: 10, letterSpacing: 1.5, textAlign: 'center', marginTop: 24 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { color: '#9CE41C', fontSize: 10, letterSpacing: 1.5 },
});

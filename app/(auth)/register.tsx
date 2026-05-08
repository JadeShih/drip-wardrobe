import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  general?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  function validate() {
    const newErrors: FieldErrors = {};
    if (!fullName.trim()) newErrors.fullName = '請輸入你的名字';
    if (!email) newErrors.email = '請輸入 Email';
    else if (!isValidEmail(email)) newErrors.email = 'Email 格式不正確';
    if (!password) newErrors.password = '請輸入密碼';
    else if (password.length < 6) newErrors.password = '密碼至少需要 6 個字元';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
        setErrors({ email: '此 Email 已被註冊' });
      } else if (msg.includes('password')) {
        setErrors({ password: '密碼不符合要求' });
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setErrors({ general: '網路連線失敗，請稍後再試' });
      } else {
        setErrors({ general: error.message });
      }
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>帳號建立成功</Text>
        <Text style={styles.successSub}>請確認你的 Email 以驗證帳號</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>前往登入</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.logo}>DRIP</Text>
        <Text style={styles.subtitle}>CREATE YOUR ACCOUNT</Text>

        <View style={styles.form}>
          {/* Full Name */}
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={[styles.input, errors.fullName ? styles.inputError : null]}
            value={fullName}
            onChangeText={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: undefined })); }}
            placeholder="Jade Shih"
            placeholderTextColor="#333"
          />
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

          {/* Email */}
          <Text style={[styles.label, { marginTop: 16 }]}>EMAIL</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
            placeholder="your@email.com"
            placeholderTextColor="#333"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Password */}
          <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
          <TextInput
            style={[styles.input, errors.password ? styles.inputError : null]}
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
            placeholder="最少 6 個字元"
            placeholderTextColor="#333"
            secureTextEntry
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* General error */}
          {errors.general && (
            <View style={styles.generalError}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'CREATING...' : 'CREATE ACCOUNT'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>ALREADY HAVE AN ACCOUNT? SIGN IN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 60 },
  logo: {
    fontSize: 48, fontWeight: '900', color: '#9CE41C',
    letterSpacing: 8, textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontSize: 10, color: '#444', letterSpacing: 3,
    textAlign: 'center', marginBottom: 48,
  },
  form: {},
  label: { fontSize: 10, color: '#666', letterSpacing: 2, marginBottom: 6 },
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
  link: { color: '#444', fontSize: 10, letterSpacing: 1.5, textAlign: 'center', marginTop: 24 },
  successContainer: {
    flex: 1, backgroundColor: '#0a0a0a',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  successIcon: { fontSize: 48, color: '#9CE41C', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 2, marginBottom: 8 },
  successSub: { fontSize: 12, color: '#666', letterSpacing: 1, marginBottom: 40, textAlign: 'center' },
});

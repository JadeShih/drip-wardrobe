import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!password) { setError('請輸入新密碼'); return; }
    if (password.length < 6) { setError('密碼至少需要 6 個字元'); return; }
    if (password !== confirm) { setError('兩次密碼不一致'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>密碼重設成功</Text>
          <Text style={styles.successSub}>你的密碼已更新，請重新登入</Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnWide]}
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            }}
          >
            <Text style={styles.btnText}>前往登入</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <Text style={styles.logo}>DRIP</Text>
          <Text style={styles.subtitle}>SET NEW PASSWORD</Text>

          <Text style={styles.label}>NEW PASSWORD</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            placeholder="最少 6 個字元"
            placeholderTextColor="#555555"
            secureTextEntry
            cursorColor="#9CE41C"
          />

          <Text style={[styles.label, { marginTop: 16 }]}>CONFIRM PASSWORD</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={confirm}
            onChangeText={(v) => { setConfirm(v); setError(''); }}
            placeholder="再次輸入密碼"
            placeholderTextColor="#555555"
            secureTextEntry
            cursorColor="#9CE41C"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'UPDATING...' : 'UPDATE PASSWORD'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  label: { fontSize: 10, color: '#999999', letterSpacing: 2, marginBottom: 6 },
  input: {
    backgroundColor: '#111', borderWidth: 1, borderColor: '#222',
    color: '#fff', paddingHorizontal: 16, paddingVertical: 14, fontSize: 14,
  },
  inputError: { borderColor: '#ff4444' },
  errorText: { color: '#ff4444', fontSize: 11, marginTop: 6, letterSpacing: 0.5 },
  btn: {
    backgroundColor: '#9CE41C', paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  btnWide: { paddingHorizontal: 48 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 13, letterSpacing: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  successIcon: { fontSize: 48, color: '#9CE41C', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 2, marginBottom: 8 },
  successSub: { fontSize: 12, color: '#666', letterSpacing: 1, marginBottom: 40, textAlign: 'center' },
});

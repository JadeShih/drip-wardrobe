import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function WelcomeScreen() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name?.split(' ')[0] ?? '你';

  async function trackAndContinue() {
    await supabase.from('analytics_events').insert({
      user_id: user?.id,
      event: 'onboarding_started',
    });
    router.push('/onboarding/style-quiz');
  }

  async function trackAndSkip() {
    await supabase.from('analytics_events').insert({
      user_id: user?.id,
      event: 'onboarding_skipped',
    });
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <Text style={styles.logo}>DRIP</Text>
          <Text style={styles.greeting}>嗨，{name}</Text>
          <Text style={styles.title}>認識你的{'\n'}穿搭個性</Text>
          <Text style={styles.desc}>
            只需回答 5 個問題，不到一分鐘，我們就能了解你的穿搭風格。
          </Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity style={styles.btn} onPress={trackAndContinue}>
            <Text style={styles.btnText}>開始 →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={trackAndSkip}>
            <Text style={styles.skip}>暫時略過</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 40 },
  top: { marginTop: 60 },
  logo: { fontSize: 14, color: '#9CE41C', letterSpacing: 6, fontWeight: '800', marginBottom: 40 },
  greeting: { fontSize: 14, color: '#888888', letterSpacing: 2, marginBottom: 16 },
  title: {
    fontSize: 40, fontWeight: '900', color: '#fff',
    letterSpacing: -1, lineHeight: 44, marginBottom: 24,
  },
  desc: { fontSize: 16, color: '#888888', lineHeight: 26 },
  bottom: { gap: 16 },
  btn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center' },
  btnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  skip: { color: '#666666', fontSize: 14, letterSpacing: 1, textAlign: 'center' },
});

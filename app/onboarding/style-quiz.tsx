import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

const ROUNDS = [
  {
    left:  { label: 'MINIMAL', labelZh: '極簡', color: '#1a1a1a', accent: '#fff' },
    right: { label: 'STREETWEAR', labelZh: '街頭', color: '#2a1a00', accent: '#ff6b00' },
  },
  {
    left:  { label: 'CLASSIC', labelZh: '經典', color: '#0a1628', accent: '#4a90d9' },
    right: { label: 'ECLECTIC', labelZh: '混搭', color: '#1a0a1a', accent: '#cc44ff' },
  },
  {
    left:  { label: 'OUTDOOR', labelZh: '戶外', color: '#0d1f0d', accent: '#4caf50' },
    right: { label: 'FORMAL', labelZh: '正式', color: '#0d0d0d', accent: '#c9a84c' },
  },
  {
    left:  { label: 'VINTAGE', labelZh: '復古', color: '#1f1208', accent: '#c8864a' },
    right: { label: 'TECHWEAR', labelZh: '現代', color: '#080d14', accent: '#00d4ff' },
  },
  {
    left:  { label: 'ROMANTIC', labelZh: '浪漫', color: '#1f0d14', accent: '#ff6b9d' },
    right: { label: 'EDITORIAL', labelZh: '時尚感', color: '#0a0a0a', accent: '#9CE41C' },
  },
];

export default function StyleQuizScreen() {
  const { user } = useAuth();
  const [round, setRound] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);

  async function pick(label: string) {
    const newPicks = [...picks, label];
    setPicks(newPicks);

    if (round + 1 < ROUNDS.length) {
      setRound(round + 1);
    } else {
      await supabase.from('analytics_events').insert({
        user_id: user?.id,
        event: 'style_quiz_completed',
        properties: { picks: newPicks },
      });
      router.push({ pathname: '/onboarding/style-result', params: { picks: newPicks.join(',') } });
    }
  }

  const current = ROUNDS[round];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => {
              if (round === 0) router.back();
              else setRound(round - 1);
            }}
          >
            <Text style={styles.back}>← 上一步</Text>
          </TouchableOpacity>
          <Text style={styles.progress}>{round + 1} / {ROUNDS.length}</Text>
        </View>
        <View style={styles.progressBar}>
          {ROUNDS.map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= round && styles.progressDotActive]} />
          ))}
        </View>
      </View>

      <Text style={styles.question}>哪個風格{'\n'}更像你？</Text>

      <View style={styles.cards}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: current.left.color }]}
          onPress={() => pick(current.left.label)}
          activeOpacity={0.8}
        >
          <View style={[styles.cardAccent, { backgroundColor: current.left.accent }]} />
          <Text style={[styles.cardLabelEn, { color: current.left.accent }]}>{current.left.label}</Text>
          <Text style={[styles.cardLabelZh, { color: current.left.accent }]}>{current.left.labelZh}</Text>
        </TouchableOpacity>

        <View style={styles.orContainer}>
          <Text style={styles.or}>還是</Text>
        </View>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: current.right.color }]}
          onPress={() => pick(current.right.label)}
          activeOpacity={0.8}
        >
          <View style={[styles.cardAccent, { backgroundColor: current.right.accent }]} />
          <Text style={[styles.cardLabelEn, { color: current.right.accent }]}>{current.right.label}</Text>
          <Text style={[styles.cardLabelZh, { color: current.right.accent }]}>{current.right.labelZh}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingHorizontal: 24 },
  header: { marginTop: 16, marginBottom: 32, gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontSize: 14, color: '#9CE41C', fontWeight: '700', letterSpacing: 1 },
  progress: { fontSize: 14, color: '#666666', letterSpacing: 2 },
  progressBar: { flexDirection: 'row', gap: 6 },
  progressDot: { flex: 1, height: 2, backgroundColor: '#222' },
  progressDotActive: { backgroundColor: '#9CE41C' },
  question: {
    fontSize: 32, fontWeight: '900', color: '#fff',
    letterSpacing: -0.5, lineHeight: 36, marginBottom: 32,
  },
  cards: { flex: 1, gap: 12, paddingBottom: 40 },
  card: {
    flex: 1, justifyContent: 'flex-end', padding: 24,
    borderWidth: 1, borderColor: '#1a1a1a',
  },
  cardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  cardLabelEn: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  cardLabelZh: { fontSize: 14, fontWeight: '600', letterSpacing: 1, marginTop: 4 },
  orContainer: { alignItems: 'center' },
  or: { fontSize: 14, color: '#555555', letterSpacing: 2 },
});

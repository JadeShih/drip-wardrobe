import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

function getStyleTags(picks: string[]): string[] {
  const counts: Record<string, number> = {};
  picks.forEach(p => { counts[p] = (counts[p] || 0) + 1; });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label]) => label);
}

const STYLE_INFO: Record<string, { zh: string; desc: string }> = {
  MINIMAL:    { zh: '極簡', desc: '乾淨的線條、中性色調，每一件都是刻意的選擇。' },
  STREETWEAR: { zh: '街頭', desc: '大膽的圖案、寬鬆的版型，充滿都市態度。' },
  CLASSIC:    { zh: '經典', desc: '經得起時間考驗的單品，永遠不會過時。' },
  ECLECTIC:   { zh: '混搭', desc: '不按牌理出牌，各種風格信手拈來，穿出只屬於你的獨特樣子。' },
  OUTDOOR:    { zh: '戶外', desc: '機能與時尚並重，為冒險而生。' },
  FORMAL:     { zh: '正式', desc: '俐落、精緻，隨時保持最佳狀態。' },
  VINTAGE:    { zh: '復古', desc: '精心挑選的二手單品，充滿個性與故事。' },
  TECHWEAR:   { zh: '現代', desc: '俐落的剪裁、精準的細節，展現當代都市的自信態度。' },
  ROMANTIC:   { zh: '浪漫', desc: '柔軟的質地、細緻的細節，散發女性能量。' },
  EDITORIAL:  { zh: '時尚感', desc: '走在潮流前端，永遠是下一個趨勢的代表。' },
};

export default function StyleResultScreen() {
  const { picks: picksStr } = useLocalSearchParams<{ picks: string }>();
  const { user } = useAuth();
  const picks = picksStr?.split(',') ?? [];
  const tags = getStyleTags(picks);
  const desc = tags.map(t => STYLE_INFO[t]?.desc ?? '').filter(Boolean).join(' ');

  async function saveAndContinue() {
    if (user) {
      await supabase.from('users').update({
        style_tags: tags,
        style_description: desc,
      }).eq('id', user.id);
    }
    router.push('/onboarding/body-photo');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <Text style={styles.label}>你的風格</Text>
          <View style={styles.tags}>
            {tags.map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagEn}>{tag}</Text>
                <Text style={styles.tagZh}>{STYLE_INFO[tag]?.zh}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.desc}>{desc}</Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity style={styles.btn} onPress={saveAndContinue}>
            <Text style={styles.btnText}>就是這樣 →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.retake}>重新測驗</Text>
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
  label: { fontSize: 14, color: '#888888', letterSpacing: 2, marginBottom: 24 },
  tags: { flexDirection: 'row', gap: 8, marginBottom: 32, flexWrap: 'wrap' },
  tag: { backgroundColor: '#9CE41C', paddingHorizontal: 16, paddingVertical: 10, gap: 2 },
  tagEn: { color: '#0a0a0a', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  tagZh: { color: '#0a0a0a', fontWeight: '600', fontSize: 14 },
  desc: { fontSize: 16, color: '#888888', lineHeight: 26 },
  bottom: { gap: 16 },
  btn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center' },
  btnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  retake: { color: '#666666', fontSize: 14, letterSpacing: 1, textAlign: 'center' },
});

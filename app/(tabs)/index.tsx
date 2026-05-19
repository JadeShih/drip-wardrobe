import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const OCCASIONS = ['日常', '上班', '約會', '運動', '聚會', '旅行'];
const VIBES = ['輕鬆', '正式', '帥氣', '優雅', '休閒'];

type Step = 'occasion' | 'vibe' | 'generating' | 'result';

export default function HomeScreen() {
  const { user } = useAuth();
  const [wardrobeCount, setWardrobeCount] = useState<number | null>(null);
  const [step, setStep] = useState<Step>('occasion');
  const [occasion, setOccasion] = useState('');
  const [vibe, setVibe] = useState('');
  const [outfit, setOutfit] = useState<string | null>(null);
  const [hasBodyPhoto, setHasBodyPhoto] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? '';

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from('wardrobe_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setWardrobeCount(count ?? 0);

      const { data } = await supabase
        .from('users')
        .select('body_photo_url')
        .eq('id', user.id)
        .single();
      setHasBodyPhoto(!!data?.body_photo_url);
    })();
  }, [user]);

  async function generateOutfit() {
    if (!occasion || !vibe || !user) return;
    setStep('generating');
    await supabase.from('analytics_events').insert({
      user_id: user.id,
      event: 'outfit_generate_requested',
      properties: { occasion, vibe },
    });
    // TODO: call Claude API for outfit suggestion
    setTimeout(() => {
      setOutfit(`為你配搭了一套適合${occasion}的${vibe}風格穿搭`);
      setStep('result');
    }, 1800);
  }

  function reset() {
    setOccasion('');
    setVibe('');
    setOutfit(null);
    setStep('occasion');
  }

  // Loading
  if (wardrobeCount === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#9CE41C" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  // Empty state
  if (wardrobeCount === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.logo}>DRIP</Text>
            {firstName ? <Text style={styles.greeting}>嗨，{firstName}</Text> : null}
          </View>

          <View style={styles.emptyState}>
            <View style={styles.emptyBlock} />
            <Text style={styles.emptyTitle}>衣櫃還是空的</Text>
            <Text style={styles.emptyDesc}>
              先把你的單品加進來，{'\n'}穿搭建議才能派上用場。
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(tabs)/add')}
          >
            <Text style={styles.primaryBtnText}>新增第一件衣物 →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>DRIP</Text>
          {firstName ? <Text style={styles.greeting}>嗨，{firstName}</Text> : null}
        </View>

        {/* Step: Occasion */}
        {step === 'occasion' && (
          <View style={styles.section}>
            <Text style={styles.stepLabel}>今天要去哪</Text>
            <Text style={styles.stepTitle}>選個場合</Text>
            <View style={styles.chips}>
              {OCCASIONS.map(o => (
                <TouchableOpacity
                  key={o}
                  style={[styles.chip, occasion === o && styles.chipActive]}
                  onPress={() => setOccasion(o)}
                >
                  <Text style={[styles.chipText, occasion === o && styles.chipTextActive]}>
                    {o}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !occasion && styles.btnDisabled]}
              onPress={() => occasion && setStep('vibe')}
              disabled={!occasion}
            >
              <Text style={styles.primaryBtnText}>下一步 →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step: Vibe */}
        {step === 'vibe' && (
          <View style={styles.section}>
            <TouchableOpacity onPress={() => setStep('occasion')} style={styles.backRow}>
              <Text style={styles.back}>← 上一步</Text>
            </TouchableOpacity>
            <Text style={styles.stepLabel}>今天的感覺</Text>
            <Text style={styles.stepTitle}>選個氣圍</Text>
            <View style={styles.chips}>
              {VIBES.map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.chip, vibe === v && styles.chipActive]}
                  onPress={() => setVibe(v)}
                >
                  <Text style={[styles.chipText, vibe === v && styles.chipTextActive]}>
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !vibe && styles.btnDisabled]}
              onPress={generateOutfit}
              disabled={!vibe}
            >
              <Text style={styles.primaryBtnText}>生成穿搭 →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <View style={styles.generatingState}>
            <ActivityIndicator color="#9CE41C" size="large" />
            <Text style={styles.generatingText}>正在為你搭配…</Text>
            <Text style={styles.generatingSub}>{occasion} × {vibe}</Text>
          </View>
        )}

        {/* Step: Result */}
        {step === 'result' && (
          <View style={styles.section}>
            <Text style={styles.stepLabel}>{occasion} × {vibe}</Text>
            <Text style={styles.stepTitle}>今日穿搭</Text>

            <View style={styles.outfitCard}>
              <View style={styles.outfitPlaceholder}>
                <View style={styles.outfitDot} />
                <Text style={styles.outfitPlaceholderText}>穿搭圖</Text>
              </View>
              <Text style={styles.outfitDesc}>{outfit}</Text>
            </View>

            {!hasBodyPhoto && (
              <TouchableOpacity
                style={styles.ctaBanner}
                onPress={() => router.push('/onboarding/body-photo')}
              >
                <View style={styles.ctaDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaTitle}>上傳全身照，看穿搭效果</Text>
                  <Text style={styles.ctaDesc}>讓穿搭合成更直覺</Text>
                </View>
                <Text style={styles.ctaArrow}>→</Text>
              </TouchableOpacity>
            )}

            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>收藏這套</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.retryBtn} onPress={generateOutfit}>
                <Text style={styles.retryBtnText}>換一套</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={reset} style={styles.resetRow}>
              <Text style={styles.resetText}>重新選擇場合</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { paddingHorizontal: 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 16, marginBottom: 40,
  },
  logo: { fontSize: 14, color: '#9CE41C', letterSpacing: 6, fontWeight: '800' },
  greeting: { fontSize: 14, color: '#666666', letterSpacing: 1 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 16 },
  emptyBlock: { width: 64, height: 64, backgroundColor: '#1a1a1a' },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  emptyDesc: { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 22 },

  // Section
  section: {},
  stepLabel: { fontSize: 14, color: '#666666', letterSpacing: 2, marginBottom: 8 },
  stepTitle: {
    fontSize: 32, fontWeight: '900', color: '#fff',
    letterSpacing: -0.5, marginBottom: 32, lineHeight: 36,
  },
  backRow: { marginBottom: 24 },
  back: { fontSize: 14, color: '#9CE41C', fontWeight: '700', letterSpacing: 1 },

  // Chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 40 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#333333' },
  chipActive: { borderColor: '#9CE41C', backgroundColor: '#9CE41C' },
  chipText: { fontSize: 14, color: '#888888', letterSpacing: 1 },
  chipTextActive: { color: '#0a0a0a', fontWeight: '800' },

  // Buttons
  primaryBtn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.35 },
  primaryBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },

  // Generating
  generatingState: { alignItems: 'center', paddingVertical: 100, gap: 20 },
  generatingText: { fontSize: 16, color: '#fff', fontWeight: '700', letterSpacing: 1 },
  generatingSub: { fontSize: 14, color: '#666666', letterSpacing: 1 },

  // Result
  outfitCard: { marginBottom: 24 },
  outfitPlaceholder: {
    width: '100%', height: 360, backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16,
  },
  outfitDot: { width: 24, height: 24, backgroundColor: '#222222' },
  outfitPlaceholderText: { fontSize: 14, color: '#444444', letterSpacing: 2 },
  outfitDesc: { fontSize: 14, color: '#888888', lineHeight: 22 },

  // Body photo CTA
  ctaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#222222', padding: 16, marginBottom: 24,
  },
  ctaDot: { width: 8, height: 8, backgroundColor: '#9CE41C' },
  ctaTitle: { fontSize: 14, color: '#fff', fontWeight: '700' },
  ctaDesc: { fontSize: 14, color: '#666666', marginTop: 2 },
  ctaArrow: { fontSize: 16, color: '#9CE41C', fontWeight: '800' },

  // Result actions
  resultActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  saveBtn: { flex: 1, backgroundColor: '#9CE41C', paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  retryBtn: {
    flex: 1, borderWidth: 1, borderColor: '#333333',
    paddingVertical: 16, alignItems: 'center',
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 1 },

  resetRow: { alignItems: 'center', paddingTop: 8 },
  resetText: { fontSize: 14, color: '#555555', letterSpacing: 1 },
});

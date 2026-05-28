import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const GENDERS = [
  { value: 'female', label: '女性風格', desc: '女裝為主' },
  { value: 'male',   label: '男性風格', desc: '男裝為主' },
  { value: 'unisex', label: '中性風格', desc: '不限性別' },
];
const HEIGHTS = [
  { value: 'petite', label: '嬌小', desc: '< 160 cm' },
  { value: 'medium', label: '中等', desc: '160–170 cm' },
  { value: 'tall',   label: '高挑', desc: '> 170 cm' },
];
const BODY_TYPES = [
  { value: 'straight', label: '直筒型', desc: '肩臀同寬' },
  { value: 'pear',     label: '梨型',   desc: '臀寬肩窄' },
  { value: 'apple',    label: '蘋果型', desc: '腰腹圓潤' },
  { value: 'hourglass',label: '沙漏型', desc: '腰線明顯' },
];
const SKIN_TONES = [
  { value: 'light',  label: '偏白' },
  { value: 'medium', label: '中等' },
  { value: 'dark',   label: '偏深' },
];
const BUDGETS = [
  { value: 'low',    label: '平價',   desc: '< NT$1,000' },
  { value: 'mid',    label: '中價位', desc: 'NT$1,000–3,000' },
  { value: 'high',   label: '高端',   desc: '> NT$3,000' },
];
const LIFESTYLES = [
  { value: 'student',  label: '學生' },
  { value: 'office',   label: '辦公室' },
  { value: 'creative', label: '創意產業' },
  { value: 'freelance',label: '自由工作者' },
];

type Selections = {
  gender: string;
  height: string;
  body_type: string;
  skin_tone: string;
  budget: string;
  lifestyle: string;
};

export default function ProfileInfoScreen() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [sel, setSel] = useState<Selections>({
    gender: '', height: '', body_type: '',
    skin_tone: '', budget: '', lifestyle: '',
  });

  function set(key: keyof Selections, value: string) {
    setSel(prev => ({ ...prev, [key]: value }));
  }

  const canContinue = !!sel.gender && !!sel.height && !!sel.body_type;

  async function saveAndContinue() {
    if (!user || saving) return;
    setSaving(true);
    try {
      await supabase.from('users').update({
        gender: sel.gender,
        height: sel.height,
        body_type: sel.body_type,
        skin_tone: sel.skin_tone || null,
        budget: sel.budget || null,
        lifestyle: sel.lifestyle || null,
      }).eq('id', user.id);
    } catch (e) {
      console.error('profile-info save error:', e);
    }
    setSaving(false);
    router.push('/onboarding/body-photo');
  }

  function skip() {
    router.push('/onboarding/body-photo');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>告訴我們更多</Text>
        <Text style={styles.title}>你的{'\n'}穿搭輪廓</Text>
        <Text style={styles.desc}>幫助 AI 生成更貼近你的穿搭建議</Text>

        {/* ── 性別偏好 ─────────────────────────────────── */}
        <SectionTitle text="穿搭偏好" required />
        <View style={styles.cardRow}>
          {GENDERS.map(g => (
            <TouchableOpacity
              key={g.value}
              style={[styles.card, sel.gender === g.value && styles.cardActive]}
              onPress={() => set('gender', g.value)}
            >
              <Text style={[styles.cardLabel, sel.gender === g.value && styles.cardLabelActive]}>{g.label}</Text>
              <Text style={[styles.cardDesc, sel.gender === g.value && styles.cardDescActive]}>{g.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 身高 ─────────────────────────────────────── */}
        <SectionTitle text="身高" required />
        <View style={styles.chipRow}>
          {HEIGHTS.map(h => (
            <TouchableOpacity
              key={h.value}
              style={[styles.chip, sel.height === h.value && styles.chipActive]}
              onPress={() => set('height', h.value)}
            >
              <Text style={[styles.chipLabel, sel.height === h.value && styles.chipLabelActive]}>{h.label}</Text>
              <Text style={[styles.chipDesc, sel.height === h.value && styles.chipDescActive]}>{h.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 體型 ─────────────────────────────────────── */}
        <SectionTitle text="體型" required />
        <View style={styles.chipRow}>
          {BODY_TYPES.map(b => (
            <TouchableOpacity
              key={b.value}
              style={[styles.chip, sel.body_type === b.value && styles.chipActive]}
              onPress={() => set('body_type', b.value)}
            >
              <Text style={[styles.chipLabel, sel.body_type === b.value && styles.chipLabelActive]}>{b.label}</Text>
              <Text style={[styles.chipDesc, sel.body_type === b.value && styles.chipDescActive]}>{b.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 以下選填 ─────────────────────────────────── */}
        <View style={styles.optionalDivider}>
          <View style={styles.optionalLine} />
          <Text style={styles.optionalText}>以下選填，但能讓建議更準確</Text>
          <View style={styles.optionalLine} />
        </View>

        {/* ── 膚色 ─────────────────────────────────────── */}
        <SectionTitle text="膚色" />
        <View style={styles.smallChipRow}>
          {SKIN_TONES.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[styles.smallChip, sel.skin_tone === s.value && styles.chipActive]}
              onPress={() => set('skin_tone', sel.skin_tone === s.value ? '' : s.value)}
            >
              <Text style={[styles.smallChipLabel, sel.skin_tone === s.value && styles.chipLabelActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 預算 ─────────────────────────────────────── */}
        <SectionTitle text="單件預算偏好" />
        <View style={styles.chipRow}>
          {BUDGETS.map(b => (
            <TouchableOpacity
              key={b.value}
              style={[styles.chip, sel.budget === b.value && styles.chipActive]}
              onPress={() => set('budget', sel.budget === b.value ? '' : b.value)}
            >
              <Text style={[styles.chipLabel, sel.budget === b.value && styles.chipLabelActive]}>{b.label}</Text>
              <Text style={[styles.chipDesc, sel.budget === b.value && styles.chipDescActive]}>{b.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 生活方式 ─────────────────────────────────── */}
        <SectionTitle text="生活方式" />
        <View style={styles.smallChipRow}>
          {LIFESTYLES.map(l => (
            <TouchableOpacity
              key={l.value}
              style={[styles.smallChip, sel.lifestyle === l.value && styles.chipActive]}
              onPress={() => set('lifestyle', sel.lifestyle === l.value ? '' : l.value)}
            >
              <Text style={[styles.smallChipLabel, sel.lifestyle === l.value && styles.chipLabelActive]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={saveAndContinue}
          disabled={!canContinue || saving}
        >
          {saving
            ? <ActivityIndicator color="#0a0a0a" />
            : <Text style={styles.btnText}>下一步 →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={skip}>
          <Text style={styles.skipText}>略過</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ text, required }: { text: string; required?: boolean }) {
  return (
    <View style={sectionTitleStyles.row}>
      <Text style={sectionTitleStyles.text}>{text}</Text>
      {required && <Text style={sectionTitleStyles.req}>必填</Text>}
    </View>
  );
}
const sectionTitleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  text: { fontSize: 13, color: '#9CE41C', letterSpacing: 2, fontWeight: '800' },
  req: { fontSize: 10, color: '#444', letterSpacing: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { paddingHorizontal: 24, paddingBottom: 48 },
  label: { fontSize: 14, color: '#9CE41C', letterSpacing: 2, marginTop: 24, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 40, marginBottom: 12 },
  desc: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 36 },

  // Cards (3 column)
  cardRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  card: { flex: 1, borderWidth: 1, borderColor: '#222', padding: 14, gap: 4 },
  cardActive: { borderColor: '#9CE41C', backgroundColor: 'rgba(156,228,28,0.08)' },
  cardLabel: { fontSize: 13, fontWeight: '800', color: '#666', letterSpacing: 0.3 },
  cardLabelActive: { color: '#9CE41C' },
  cardDesc: { fontSize: 11, color: '#333' },
  cardDescActive: { color: '#666' },

  // Chips (wrapping)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  chip: { borderWidth: 1, borderColor: '#222', paddingHorizontal: 16, paddingVertical: 10, gap: 3 },
  chipActive: { borderColor: '#9CE41C', backgroundColor: 'rgba(156,228,28,0.08)' },
  chipLabel: { fontSize: 13, fontWeight: '700', color: '#666' },
  chipLabelActive: { color: '#9CE41C' },
  chipDesc: { fontSize: 11, color: '#333' },
  chipDescActive: { color: '#555' },

  // Small chips
  smallChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  smallChip: { borderWidth: 1, borderColor: '#222', paddingHorizontal: 18, paddingVertical: 10 },
  smallChipLabel: { fontSize: 13, color: '#666', letterSpacing: 0.5 },

  // Optional divider
  optionalDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  optionalLine: { flex: 1, height: 1, backgroundColor: '#1a1a1a' },
  optionalText: { fontSize: 11, color: '#333', letterSpacing: 0.5 },

  // Buttons
  btn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: '#444', letterSpacing: 1 },
});

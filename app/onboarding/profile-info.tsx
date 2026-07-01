import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/tokens';

const GENDERS = [
  { value: 'female', label: '女性風格', desc: '女裝為主' },
  { value: 'male',   label: '男性風格', desc: '男裝為主' },
  { value: 'unisex', label: '中性風格', desc: '不限性別' },
];
const BODY_TYPES = [
  { value: 'straight', label: '直筒型', desc: '肩臀同寬' },
  { value: 'pear',     label: '梨型',   desc: '臀寬肩窄' },
  { value: 'apple',    label: '蘋果型', desc: '腰腹圓潤' },
  { value: 'hourglass',label: '沙漏型', desc: '腰線明顯' },
];
const SKIN_TONES = [
  { value: 'light',  label: '偏白', color: '#F2D5B0' },
  { value: 'medium', label: '中等', color: '#C8956C' },
  { value: 'dark',   label: '偏深', color: '#8B5E3C' },
];
type Selections = {
  gender: string;
  height: string;
  body_type: string;
  skin_tone: string;
};

export default function ProfileInfoScreen() {
  const { user } = useAuth();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromProfile = from === 'profile';
  const [saving, setSaving] = useState(false);
  const [sel, setSel] = useState<Selections>({
    gender: '', height: '', body_type: '', skin_tone: '',
  });

  // 從個人頁進來時，預填已有資料
  useEffect(() => {
    if (!user) return;
    supabase.from('users')
      .select('gender, height, body_type, skin_tone, budget, lifestyle')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSel({
            gender: data.gender ?? '',
            height: data.height ?? '',
            body_type: data.body_type ?? '',
            skin_tone: data.skin_tone ?? '',
          });
        }
      });
  }, [user]);

  function set(key: keyof Selections, value: string) {
    setSel(prev => ({ ...prev, [key]: value }));
  }

  const canContinue = !!sel.gender && !!sel.body_type;

  async function saveAndContinue() {
    if (!user || saving) return;
    setSaving(true);
    try {
      await supabase.from('users').update({
        gender: sel.gender,
        height: sel.height || null,
        body_type: sel.body_type,
        skin_tone: sel.skin_tone || null,
      }).eq('id', user.id);
    } catch (e) {
      console.error('profile-info save error:', e);
    }
    setSaving(false);
    if (fromProfile) router.back();
    else router.push('/onboarding/body-photo');
  }

  function skip() {
    if (fromProfile) router.back();
    else router.push('/onboarding/body-photo');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.label}>{fromProfile ? '編輯資料' : '告訴我們更多'}</Text>
        <Text style={styles.title}>你的{'\n'}穿搭輪廓</Text>
        <Text style={styles.desc}>幫助我們生成更貼近你的穿搭建議</Text>

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

        {/* ── 身高 ─────────────────────────────────────── */}
        <SectionTitle text="身高" />
        <View style={styles.heightRow}>
          <TextInput
            style={styles.heightInput}
            value={sel.height}
            onChangeText={v => set('height', v.replace(/[^0-9]/g, ''))}
            placeholder="165"
            placeholderTextColor={colors.text.disabled}
            keyboardType="number-pad"
            maxLength={3}
            cursorColor={colors.brand.primary}
            selectionColor={colors.brand.primary}
          />
          <Text style={styles.heightUnit}>cm</Text>
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
              <View style={[styles.skinDot, { backgroundColor: s.color }]} />
              <Text style={[styles.smallChipLabel, sel.skin_tone === s.value && styles.chipLabelActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>


        <TouchableOpacity
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={saveAndContinue}
          disabled={!canContinue || saving}
        >
          {saving
            ? <ActivityIndicator color={colors.text.onBrand} />
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
  text: { fontSize: 13, color: colors.brand.primary, letterSpacing: 2, fontWeight: '800' },
  req: { fontSize: 11, color: colors.text.onBrand, letterSpacing: 1, fontWeight: '700', backgroundColor: colors.brand.primary, paddingHorizontal: 6, paddingVertical: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  inner: { paddingHorizontal: 24, paddingBottom: 48 },
  backBtn: { marginTop: 16, marginBottom: 8 },
  backText: { fontSize: 14, color: colors.brand.primary, fontWeight: '700', letterSpacing: 1 },
  label: { fontSize: 14, color: colors.brand.primary, letterSpacing: 2, marginTop: 24, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', color: colors.text.primary, letterSpacing: -0.5, lineHeight: 40, marginBottom: 12 },
  desc: { fontSize: 14, color: colors.text.disabled, lineHeight: 22, marginBottom: 36 },

  // Height input
  heightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  heightInput: {
    borderWidth: 1, borderColor: '#333',
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 20, color: colors.text.primary, fontWeight: '700',
    width: 100, textAlign: 'center',
  },
  heightUnit: { fontSize: 16, color: colors.text.placeholder, letterSpacing: 1 },

  // Cards (3 column)
  cardRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  card: { flex: 1, borderWidth: 1, borderColor: colors.border.default, padding: 14, gap: 4 },
  cardActive: { borderColor: colors.brand.primary, backgroundColor: 'rgba(156,228,28,0.08)' },
  cardLabel: { fontSize: 13, fontWeight: '800', color: '#aaa', letterSpacing: 0.3 },
  cardLabelActive: { color: colors.brand.primary },
  cardDesc: { fontSize: 11, color: colors.text.placeholder },
  cardDescActive: { color: colors.text.label },

  // Chips (wrapping)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  chip: { borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: 16, paddingVertical: 10, gap: 3 },
  chipActive: { borderColor: colors.brand.primary, backgroundColor: 'rgba(156,228,28,0.08)' },
  chipLabel: { fontSize: 13, fontWeight: '700', color: '#aaa' },
  chipLabelActive: { color: colors.brand.primary },
  chipDesc: { fontSize: 11, color: colors.text.placeholder },
  chipDescActive: { color: colors.text.secondary },

  // Small chips
  smallChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  smallChip: { borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallChipLabel: { fontSize: 13, color: '#aaa', letterSpacing: 0.5 },
  skinDot: { width: 18, height: 18, borderRadius: 9 },

  // Optional divider
  optionalDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  optionalLine: { flex: 1, height: 1, backgroundColor: colors.border.subtle },
  optionalText: { fontSize: 11, color: colors.text.disabled, letterSpacing: 0.5 },

  // Buttons
  btn: { backgroundColor: colors.brand.primary, paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: colors.text.onBrand, fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: colors.text.disabled, letterSpacing: 1 },
});

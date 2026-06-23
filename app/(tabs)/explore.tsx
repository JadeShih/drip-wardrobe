import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Animated, Easing, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';

type UserProfile = {
  gender?: string | null;
  skin_tone?: string | null;
  height?: string | null;
  body_type?: string | null;
};

const GENDER_LABEL: Record<string, string> = {
  female: 'female', male: 'male', unisex: 'androgynous',
};
const BODY_LABEL: Record<string, string> = {
  straight: 'straight body type', pear: 'pear body shape',
  apple: 'apple body shape', hourglass: 'hourglass figure',
};

const OCCASIONS: { label: string; icon: string }[] = [
  { label: '上班', icon: 'briefcase' },
  { label: '約會', icon: 'heart' },
  { label: '露營', icon: 'tent' },
  { label: '運動', icon: 'bolt' },
  { label: '派對', icon: 'star' },
  { label: '夜遊', icon: 'moon' },
];
const VIBES: { label: string; icon: string }[] = [
  { label: '輕鬆', icon: 'leaf' },
  { label: '正式', icon: 'building.2' },
  { label: '帥氣', icon: 'flame' },
  { label: '優雅', icon: 'sparkles' },
  { label: '休閒', icon: 'sun.max' },
];

type LookbookItem = { category: string; description: string; color: string };
type LookbookOutfit = {
  id: string;
  title: string;
  style: string;
  items: LookbookItem[];
  note: string;
  imageUrl?: string;
  imageGenerating: boolean;
};

type PageStep = 'landing' | 'pick' | 'generating' | 'result';

export default function ExploreScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState<PageStep>('landing');
  const [occasion, setOccasion] = useState('');
  const [vibe, setVibe] = useState('');
  const [outfits, setOutfits] = useState<LookbookOutfit[]>([]);
  const [profile, setProfile] = useState<UserProfile>({});
  const [genStepIndex, setGenStepIndex] = useState(0);
  const [imgStepIndex, setImgStepIndex] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const imgStepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const GEN_STEPS = [
    '分析場合與氛圍...',
    '構思穿搭輪廓...',
    '挑選主打單品...',
    '增加配飾細節...',
    '調整色系搭配...',
    '完成造型提案...',
  ];

  const IMG_STEPS = [
    '分析穿搭元素...',
    '調整光線與色調...',
    '增加配飾細節...',
    '渲染最終畫面...',
    '完成編輯圖...',
  ];

  useEffect(() => {
    if (!user) return;
    supabase.from('users')
      .select('gender, skin_tone, height, body_type')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const genStepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 圖片生成中的步驟文字
  useEffect(() => {
    const anyGenerating = outfits.some(o => o.imageGenerating);
    if (!anyGenerating) {
      if (imgStepRef.current) { clearInterval(imgStepRef.current); imgStepRef.current = null; }
      setImgStepIndex(0);
      return;
    }
    if (!imgStepRef.current) {
      imgStepRef.current = setInterval(() => {
        setImgStepIndex(p => (p + 1) % IMG_STEPS.length);
      }, 2000);
    }
    return () => {
      if (imgStepRef.current) { clearInterval(imgStepRef.current); imgStepRef.current = null; }
    };
  }, [outfits]);

  function startSpin() {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();
    // 分步驟文字 cycling
    setGenStepIndex(0);
    genStepRef.current = setInterval(() => {
      setGenStepIndex(p => (p + 1) % GEN_STEPS.length);
    }, 1800);
  }

  function stopSpin() {
    spinAnim.stopAnimation();
    if (genStepRef.current) { clearInterval(genStepRef.current); genStepRef.current = null; }
  }

  async function generate() {
    if (!occasion || !vibe) return;
    setStep('generating');
    startSpin();

    try {
      const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('missing key');

      const prompt = `你是頂尖時尚雜誌的造型師。請為「${occasion}場合 × ${vibe}氛圍」設計 3 套完整穿搭靈感，不受限於任何衣櫃。

每套穿搭包含 3-4 件單品，每件請給出具體顏色與描述。

只回傳 JSON 陣列，不要有其他文字或 markdown：
[
  {
    "title": "穿搭標題（8字內）",
    "style": "風格標籤（4字內，例：都市簡約）",
    "items": [
      { "category": "上衣", "description": "白色oversized T恤", "color": "白色" },
      { "category": "下著", "description": "直筒牛仔褲", "color": "淺藍" }
    ],
    "note": "造型師點評（30字內）"
  }
]`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`Claude ${res.status}`);
      const json = await res.json();
      const raw = json?.content?.[0]?.text ?? '[]';
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      const parsed: Omit<LookbookOutfit, 'id' | 'imageGenerating'>[] = JSON.parse(cleaned);

      const initialOutfits: LookbookOutfit[] = parsed.map((o, i) => ({
        ...o,
        id: String(i),
        imageGenerating: true,
      }));
      setOutfits(initialOutfits);
      setStep('result');
      stopSpin();

      // 逐一生成圖片
      const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (openaiKey) {
        for (const outfit of initialOutfits) {
          const itemsDesc = outfit.items
            .map(i => `${i.color} ${i.description}`)
            .join(', ');
          const genderStr = GENDER_LABEL[profile.gender ?? ''] ?? 'female';
          const bodyStr = profile.body_type ? `, ${BODY_LABEL[profile.body_type] ?? ''}` : '';
          const modelDesc = `Taiwanese East Asian ${genderStr} model${bodyStr}`;
          const imgPrompt = `Fashion editorial lookbook photo: full body shot of a ${modelDesc} wearing ${itemsDesc}. Style: ${outfit.style}. IMPORTANT: the model must look East Asian / Taiwanese. Complete figure visible from head to feet, nothing cropped. Minimal clean studio background, high fashion photography quality.`;

          fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-image-1',
              prompt: imgPrompt,
              n: 1,
              size: '1024x1536',
              quality: 'medium',
            }),
          })
            .then(r => r.json())
            .then(imgJson => {
              const b64 = imgJson?.data?.[0]?.b64_json;
              const url = imgJson?.data?.[0]?.url ?? (b64 ? `data:image/png;base64,${b64}` : null);
              if (url) {
                setOutfits(prev =>
                  prev.map(o => o.id === outfit.id ? { ...o, imageUrl: url, imageGenerating: false } : o)
                );
              } else {
                setOutfits(prev =>
                  prev.map(o => o.id === outfit.id ? { ...o, imageGenerating: false } : o)
                );
              }
            })
            .catch(() => {
              setOutfits(prev =>
                prev.map(o => o.id === outfit.id ? { ...o, imageGenerating: false } : o)
              );
            });
        }
      }
    } catch (e) {
      console.error('explore generate error:', e);
      stopSpin();
      setStep('pick');
    }
  }

  function reset() {
    setOccasion('');
    setVibe('');
    setOutfits([]);
    stopSpin();
    spinAnim.setValue(0);
    setGenStepIndex(0);
    setStep('landing');
  }

  // ── Landing ────────────────────────────────────────────────────────────────
  if (step === 'landing') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.logo}>DRIP</Text>
          </View>
          <Text style={styles.landingTag}>LOOKBOOK</Text>
          <Text style={styles.landingTitle}>{'探索無限\n穿搭靈感'}</Text>
          <Text style={styles.landingDesc}>
            不受限於你的衣櫃——專屬造型師為你設計完整穿搭，每次都是全新的時尚提案。
          </Text>

          <View style={styles.featureList}>
            {[
              '3 套完整穿搭概念',
              '每套配有編輯風格圖',
              '依場合與氛圍量身設計',
              '通用模特兒展示，非個人照片',
            ].map((f, i) => (
              <View key={i} style={[styles.featureRow, i === 3 && { marginTop: 4 }]}>
                <View style={[styles.featureDot, i === 3 && { backgroundColor: '#444' }]} />
                <Text style={[styles.featureText, i === 3 && { color: '#555', fontSize: 12 }]}>{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('pick')}>
            <Text style={styles.primaryBtnText}>開始探索 →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Pick occasion + vibe ───────────────────────────────────────────────────
  if (step === 'pick') {
    const ready = !!occasion && !!vibe;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pickHeader}>
          <TouchableOpacity onPress={reset}>
            <Text style={styles.back}>← 返回</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.pickInner} showsVerticalScrollIndicator={false}>
          <Text style={styles.pickTitle}>{'選擇場合\n與氛圍'}</Text>

          <Text style={styles.sectionLabel}>場合</Text>
          <View style={styles.chipGrid}>
            {OCCASIONS.map(o => (
              <TouchableOpacity
                key={o.label}
                style={[styles.chip, occasion === o.label && styles.chipActive]}
                onPress={() => setOccasion(o.label)}
              >
                <IconSymbol name={o.icon as any} size={14} color={occasion === o.label ? '#0a0a0a' : '#666'} />
                <Text style={[styles.chipText, occasion === o.label && styles.chipTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>氛圍</Text>
          <View style={styles.chipGrid}>
            {VIBES.map(v => (
              <TouchableOpacity
                key={v.label}
                style={[styles.chip, vibe === v.label && styles.chipActive]}
                onPress={() => setVibe(v.label)}
              >
                <IconSymbol name={v.icon as any} size={14} color={vibe === v.label ? '#0a0a0a' : '#666'} />
                <Text style={[styles.chipText, vibe === v.label && styles.chipTextActive]}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={styles.pickFooter}>
          <TouchableOpacity
            style={[styles.primaryBtn, !ready && styles.btnDisabled]}
            onPress={generate}
            disabled={!ready}
          >
            <Text style={styles.primaryBtnText}>生成 3 套靈感 →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Generating ─────────────────────────────────────────────────────────────
  if (step === 'generating') {
    const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.generatingBox}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <IconSymbol name="sparkles" size={36} color="#9CE41C" />
          </Animated.View>
          <Text style={styles.generatingText}>造型師構思中</Text>
          <Text style={styles.generatingSub}>{occasion} × {vibe}</Text>
          <View style={styles.genStepBox}>
            <View style={styles.genStepDot} />
            <Text style={styles.genStepText}>{GEN_STEPS[genStepIndex]}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.resultInner} showsVerticalScrollIndicator={false}>
        <View style={styles.resultHeader}>
          <TouchableOpacity onPress={() => setStep('pick')}>
            <Text style={styles.back}>← 重新選擇</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            Alert.alert(
              '重置 Lookbook',
              '確定要清空目前的結果並重新選擇嗎？',
              [
                { text: '取消', style: 'cancel' },
                { text: '確定清空', style: 'destructive', onPress: reset },
              ]
            );
          }}>
            <Text style={styles.resetText}>重置</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.resultTag}>LOOKBOOK</Text>
        <Text style={styles.resultTitle}>{occasion} × {vibe}</Text>

        {outfits.map((outfit, idx) => (
          <View key={outfit.id} style={styles.outfitCard}>
            {/* 編號 */}
            <View style={styles.cardIndexRow}>
              <Text style={styles.cardIndex}>0{idx + 1}</Text>
              <View style={styles.cardIndexLine} />
              <Text style={styles.cardStyle}>{outfit.style}</Text>
            </View>

            {/* 圖片 */}
            {outfit.imageUrl ? (
              <Image source={{ uri: outfit.imageUrl }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                {outfit.imageGenerating && (
                  <>
                    <ActivityIndicator color="#9CE41C" size="small" />
                    <Text style={styles.cardImageLoading}>編輯圖生成中</Text>
                    <View style={styles.imgStepBox}>
                      <View style={styles.imgStepDot} />
                      <Text style={styles.imgStepText}>{IMG_STEPS[imgStepIndex]}</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* 標題 */}
            <Text style={styles.cardTitle}>{outfit.title}</Text>

            {/* 單品清單 */}
            <View style={styles.cardItems}>
              {outfit.items.map((item, i) => (
                <View key={i} style={styles.cardItemRow}>
                  <View style={styles.cardItemColorDot} />
                  <Text style={styles.cardItemCat}>{item.category}</Text>
                  <Text style={styles.cardItemDesc}>{item.description}</Text>
                </View>
              ))}
            </View>

            {/* 造型師點評 */}
            <View style={styles.cardNote}>
              <Text style={styles.cardNoteLabel}>造型師點評</Text>
              <Text style={styles.cardNoteText}>{outfit.note}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={() => setStep('pick')}>
          <Text style={styles.primaryBtnText}>再生成一批 →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  // Landing
  inner: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { marginTop: 16, marginBottom: 32 },
  logo: { fontSize: 14, color: '#9CE41C', letterSpacing: 6, fontWeight: '800' },
  landingTag: { fontSize: 11, color: '#9CE41C', letterSpacing: 4, fontWeight: '900', marginBottom: 16 },
  landingTitle: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1, lineHeight: 44, marginBottom: 20 },
  landingDesc: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 32 },
  featureList: { gap: 14, marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureDot: { width: 6, height: 6, backgroundColor: '#9CE41C' },
  featureText: { fontSize: 14, color: '#888' },

  // Pick
  pickHeader: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  pickInner: { paddingHorizontal: 24, paddingBottom: 16 },
  pickFooter: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 },
  pickTitle: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 40, marginBottom: 32, marginTop: 8 },
  sectionLabel: { fontSize: 11, color: '#9CE41C', letterSpacing: 3, fontWeight: '900', marginBottom: 14 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#2a2a2a' },
  chipActive: { borderColor: '#9CE41C', backgroundColor: '#9CE41C' },
  chipText: { fontSize: 13, color: '#666', letterSpacing: 0.5 },
  chipTextActive: { color: '#0a0a0a', fontWeight: '800' },

  // Generating
  generatingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  generatingText: { fontSize: 18, color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  generatingSub: { fontSize: 14, color: '#555', letterSpacing: 2 },
  genStepBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  genStepDot: { width: 5, height: 5, backgroundColor: '#9CE41C' },
  genStepText: { fontSize: 13, color: '#666', letterSpacing: 1.5 },

  // Buttons
  primaryBtn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.35 },
  primaryBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  back: { fontSize: 14, color: '#9CE41C', fontWeight: '700', letterSpacing: 1 },
  resetText: { fontSize: 14, color: '#555', letterSpacing: 1 },

  // Result
  resultInner: { paddingHorizontal: 24, paddingBottom: 48 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 24 },
  resultTag: { fontSize: 11, color: '#9CE41C', letterSpacing: 4, fontWeight: '900', marginBottom: 8 },
  resultTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 32 },

  // Outfit card
  outfitCard: { marginBottom: 48 },
  cardIndexRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardIndex: { fontSize: 13, color: '#9CE41C', fontWeight: '900', letterSpacing: 2 },
  cardIndexLine: { flex: 1, height: 1, backgroundColor: '#1e1e1e' },
  cardStyle: { fontSize: 11, color: '#555', letterSpacing: 2 },
  cardImage: { width: '100%', aspectRatio: 2 / 3, backgroundColor: '#111', marginBottom: 20 },
  cardImagePlaceholder: {
    width: '100%', aspectRatio: 2 / 3, backgroundColor: '#111',
    alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20,
  },
  cardImageLoading: { fontSize: 12, color: '#555', letterSpacing: 1 },
  imgStepBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  imgStepDot: { width: 4, height: 4, backgroundColor: '#9CE41C' },
  imgStepText: { fontSize: 11, color: '#666', letterSpacing: 1 },
  cardTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.3, marginBottom: 16 },
  cardItems: { gap: 10, marginBottom: 16, borderLeftWidth: 1, borderLeftColor: '#1e1e1e', paddingLeft: 14 },
  cardItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardItemColorDot: { width: 5, height: 5, backgroundColor: '#9CE41C' },
  cardItemCat: { fontSize: 11, color: '#9CE41C', letterSpacing: 1.5, width: 32 },
  cardItemDesc: { fontSize: 14, color: '#aaa', flex: 1 },
  cardNote: { backgroundColor: '#111', padding: 14, gap: 6 },
  cardNoteLabel: { fontSize: 10, color: '#555', letterSpacing: 2 },
  cardNoteText: { fontSize: 13, color: '#888', lineHeight: 20 },
});

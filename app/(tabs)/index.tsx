import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Dimensions, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width: W } = Dimensions.get('window');

// Content width (after paddingHorizontal: 24 on each side)
const CONTENT_W = W - 48;

// Figure geometry — works within content bounds (no negative margin needed)
const FIG_W = 130;
const FIG_H = 420;
const FIG_LEFT = (CONTENT_W - FIG_W) / 2;   // centre within content
const FIG_RIGHT = FIG_LEFT + FIG_W;
const LABEL_W = 100;
const H_PAD = 0;

// Line widths bridging label to figure edge
const LEFT_LINE_W = Math.max(FIG_LEFT - LABEL_W - H_PAD, 12);
const RIGHT_LINE_W = Math.max(CONTENT_W - FIG_RIGHT - LABEL_W - H_PAD, 12);

const LABEL_DEFS: { cat: string; side: 'left' | 'right'; topFrac: number }[] = [
  { cat: '外套', side: 'right', topFrac: 0.08 },
  { cat: '上衣', side: 'left',  topFrac: 0.24 },
  { cat: '下著', side: 'right', topFrac: 0.52 },
  { cat: '鞋子', side: 'left',  topFrac: 0.80 },
];

const OCCASIONS = ['日常', '上班', '約會', '運動', '聚會', '旅行'];
const VIBES = ['輕鬆', '正式', '帥氣', '優雅', '休閒'];

type Step = 'map' | 'occasion' | 'vibe' | 'generating' | 'result';
type WardrobeItem = { name: string; brand: string | null; photo_url: string | null };
type WardrobeMap = Record<string, WardrobeItem>;

type OutfitResult = {
  selected: { category: string; item: WardrobeItem }[];
  notes: string;
  title: string;
};

// ── Grid background ──────────────────────────────────────────────────────────
const GRID_COL_COUNT = 9;
const GRID_ROW_COUNT = 12;
function GridBg({ height }: { height: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { height }]} pointerEvents="none">
      {Array.from({ length: GRID_ROW_COUNT }).map((_, i) => (
        <View
          key={`h${i}`}
          style={{
            position: 'absolute',
            left: 0, right: 0,
            top: (i * height) / GRID_ROW_COUNT,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        />
      ))}
      {Array.from({ length: GRID_COL_COUNT }).map((_, i) => (
        <View
          key={`v${i}`}
          style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: (i * W) / GRID_COL_COUNT,
            width: 1,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        />
      ))}
    </View>
  );
}

// ── Label chip ───────────────────────────────────────────────────────────────
function LabelChip({
  cat, item, side, top,
}: {
  cat: string;
  item?: { name: string; brand: string | null };
  side: 'left' | 'right';
  top: number;
}) {
  const filled = !!item;
  const lineColor = filled ? 'rgba(156,228,28,0.4)' : 'rgba(255,255,255,0.12)';

  if (side === 'left') {
    return (
      <View style={[styles.labelAbsolute, { top, left: H_PAD, flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ width: LABEL_W }}>
          <Text style={styles.labelCat}>{cat}</Text>
          <Text style={[styles.labelName, !filled && styles.labelNameEmpty]} numberOfLines={1}>
            {item?.name ?? '—'}
          </Text>
          {item?.brand ? (
            <Text style={styles.labelBrand} numberOfLines={1}>{item.brand}</Text>
          ) : null}
        </View>
        <View style={[styles.line, { width: LEFT_LINE_W, backgroundColor: lineColor }]} />
        <View style={[styles.lineDot, { backgroundColor: lineColor }]} />
      </View>
    );
  }

  return (
    <View style={[styles.labelAbsolute, { top, right: H_PAD, flexDirection: 'row', alignItems: 'center' }]}>
      <View style={[styles.lineDot, { backgroundColor: lineColor }]} />
      <View style={[styles.line, { width: RIGHT_LINE_W, backgroundColor: lineColor }]} />
      <View style={{ width: LABEL_W }}>
        <Text style={styles.labelCat}>{cat}</Text>
        <Text style={[styles.labelName, !filled && styles.labelNameEmpty]} numberOfLines={1}>
          {item?.name ?? '—'}
        </Text>
        {item?.brand ? (
          <Text style={styles.labelBrand} numberOfLines={1}>{item.brand}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const [bodyPhotoUrl, setBodyPhotoUrl] = useState<string | null>(null);
  const [wardrobeMap, setWardrobeMap] = useState<WardrobeMap>({});
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('map');
  const [occasion, setOccasion] = useState('');
  const [vibe, setVibe] = useState('');
  const [outfitResult, setOutfitResult] = useState<OutfitResult | null>(null);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? '';

  useFocusEffect(useCallback(() => {
    if (!user) return;
    (async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('body_photo_url')
        .eq('id', user.id)
        .single();
      setBodyPhotoUrl(userData?.body_photo_url ?? null);

      const { data: items } = await supabase
        .from('wardrobe_items')
        .select('category, name, brand, photo_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (items) {
        setTotalItems(items.length);
        const map: WardrobeMap = {};
        items.forEach(item => {
          if (!map[item.category]) {
            map[item.category] = {
              name: item.name,
              brand: item.brand ?? null,
              photo_url: item.photo_url ?? null,
            };
          }
        });
        setWardrobeMap(map);
      }
      setLoading(false);
    })();
  }, [user]));

  async function generate() {
    if (!occasion || !vibe || !user) return;
    setStep('generating');

    supabase.from('analytics_events').insert({
      user_id: user.id,
      event: 'outfit_generate_requested',
      properties: { occasion, vibe },
    });

    try {
      // Build wardrobe summary for the prompt
      const wardrobeLines = Object.entries(wardrobeMap)
        .map(([cat, item]) => {
          const brand = item.brand ? ` (${item.brand})` : '';
          return `- ${cat}：${item.name}${brand}`;
        })
        .join('\n');

      const prompt = `你是一位時尚造型師。用戶的衣櫃有：\n${wardrobeLines}\n\n場合：${occasion}\n氣圍：${vibe}\n\n請從衣櫃中選出最適合的單品組合，並給出簡短的穿搭建議。\n\n請回傳 JSON 格式（不要有其他文字）：\n{\n  "title": "穿搭標題（10字內）",\n  "selected_categories": ["上衣", "下著"],\n  "notes": "穿搭建議（50字內）"\n}`;

      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) throw new Error('API key not configured');

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const rawContent = json?.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error('Empty response from OpenAI');

      const content = JSON.parse(rawContent);
      const selectedCats: string[] = content.selected_categories ?? [];

      const result: OutfitResult = {
        title: content.title ?? `${occasion} 穿搭`,
        notes: content.notes ?? '',
        selected: selectedCats
          .filter(cat => wardrobeMap[cat])
          .map(cat => ({ category: cat, item: wardrobeMap[cat] })),
      };

      setOutfitResult(result);
    } catch (e) {
      console.error('generate error', e);
      setOutfitResult({
        title: `${occasion} 穿搭`,
        notes: '穿搭建議生成失敗，請稍後再試。',
        selected: [],
      });
    }

    setStep('result');
  }

  function reset() {
    setOccasion(''); setVibe(''); setOutfitResult(null);
    setStep('map');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#9CE41C" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  // ── Body map (default) ───────────────────────────────────────────────────
  if (step === 'map') {
    const FIG_CONTAINER_H = FIG_H + 80;
    const FIG_TOP = 30;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>DRIP</Text>
            {firstName ? <Text style={styles.greeting}>嗨，{firstName}</Text> : null}
          </View>

          {/* Figure container — stays within content padding, no negative margin */}
          <View style={{ height: FIG_CONTAINER_H, position: 'relative' }}>
            <GridBg height={FIG_CONTAINER_H} />

            {/* Body figure */}
            <View style={[styles.figureWrap, {
              left: FIG_LEFT, width: FIG_W, height: FIG_H, top: FIG_TOP,
            }]}>
              {bodyPhotoUrl ? (
                <Image source={{ uri: bodyPhotoUrl }} style={styles.bodyPhoto} />
              ) : (
                <View style={styles.silhouette}>
                  <IconSymbol name="person.fill" size={FIG_W - 10} color="#2a2a2a" />
                </View>
              )}
            </View>

            {/* Labels */}
            {LABEL_DEFS.map(({ cat, side, topFrac }) => (
              <LabelChip
                key={cat}
                cat={cat}
                item={wardrobeMap[cat]}
                side={side}
                top={FIG_TOP + topFrac * FIG_H}
              />
            ))}
          </View>

          {/* Item count */}
          <Text style={styles.itemCount}>{`${totalItems} ITEMS IN YOUR CLOSET`}</Text>

          {/* CTA */}
          {totalItems === 0 ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/add')}>
              <Text style={styles.primaryBtnText}>新增第一件衣物 →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('occasion')}>
              <Text style={styles.primaryBtnText}>生成今日穿搭 →</Text>
            </TouchableOpacity>
          )}

          {/* No body photo nudge */}
          {!bodyPhotoUrl && (
            <TouchableOpacity style={styles.nudge} onPress={() => router.push('/onboarding/body-photo')}>
              <View style={styles.nudgeDot} />
              <Text style={styles.nudgeText}>上傳全身照，讓人形看起來更像你</Text>
              <Text style={styles.nudgeArrow}>→</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Occasion ─────────────────────────────────────────────────────────────
  if (step === 'occasion') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep('map')}>
              <Text style={styles.back}>← 返回</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.stepLabel}>今天要去哪</Text>
          <Text style={styles.stepTitle}>選個場合</Text>
          <View style={styles.chips}>
            {OCCASIONS.map(o => (
              <TouchableOpacity
                key={o}
                style={[styles.chip, occasion === o && styles.chipActive]}
                onPress={() => setOccasion(o)}
              >
                <Text style={[styles.chipText, occasion === o && styles.chipTextActive]}>{o}</Text>
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
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Vibe ─────────────────────────────────────────────────────────────────
  if (step === 'vibe') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep('occasion')}>
              <Text style={styles.back}>← 上一步</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.stepLabel}>今天的感覺</Text>
          <Text style={styles.stepTitle}>選個氣圍</Text>
          <View style={styles.chips}>
            {VIBES.map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, vibe === v && styles.chipActive]}
                onPress={() => setVibe(v)}
              >
                <Text style={[styles.chipText, vibe === v && styles.chipTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, !vibe && styles.btnDisabled]}
            onPress={generate}
            disabled={!vibe}
          >
            <Text style={styles.primaryBtnText}>生成穿搭 →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Generating ───────────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.generatingState}>
          <ActivityIndicator color="#9CE41C" size="large" />
          <Text style={styles.generatingText}>正在為你搭配…</Text>
          <Text style={styles.generatingSub}>{`${occasion} × ${vibe}`}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Result ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={reset}>
            <Text style={styles.back}>← 重新選擇</Text>
          </TouchableOpacity>
          <Text style={styles.resultTag}>{`${occasion} × ${vibe}`}</Text>
        </View>

        <Text style={styles.stepTitle}>{outfitResult?.title ?? '今日穿搭'}</Text>

        {/* Selected item photos */}
        {outfitResult && outfitResult.selected.length > 0 ? (
          <View style={styles.outfitGrid}>
            {outfitResult.selected.map(({ category, item }) => (
              <View key={category} style={styles.outfitGridItem}>
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={styles.outfitItemPhoto} />
                ) : (
                  <View style={styles.outfitItemPlaceholder} />
                )}
                <View style={styles.outfitItemLabel}>
                  <Text style={styles.outfitItemCat}>{category}</Text>
                  <Text style={styles.outfitItemName} numberOfLines={1}>{item.name}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.outfitPlaceholder}>
            <View style={styles.outfitDot} />
            <Text style={styles.outfitPlaceholderText}>穿搭圖</Text>
          </View>
        )}

        {/* Styling notes */}
        {outfitResult?.notes ? (
          <View style={styles.notesBox}>
            <View style={styles.notesDot} />
            <Text style={styles.notesText}>{outfitResult.notes}</Text>
          </View>
        ) : null}

        <View style={styles.resultActions}>
          <TouchableOpacity style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>收藏這套</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retryBtn} onPress={generate}>
            <Text style={styles.retryBtnText}>換一套</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { paddingHorizontal: 24, paddingBottom: 48 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 16, marginBottom: 24,
  },
  logo: { fontSize: 14, color: '#9CE41C', letterSpacing: 6, fontWeight: '800' },
  greeting: { fontSize: 14, color: '#555555', letterSpacing: 1 },
  back: { fontSize: 14, color: '#9CE41C', fontWeight: '700', letterSpacing: 1 },
  resultTag: { fontSize: 14, color: '#666666', letterSpacing: 1 },

  // Figure map
  figureContainer: { position: 'relative', marginHorizontal: -24, overflow: 'hidden' },
  figureWrap: { position: 'absolute', overflow: 'hidden', backgroundColor: '#111111' },
  bodyPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  silhouette: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#141414',
  },

  // Labels
  labelAbsolute: { position: 'absolute' },
  labelCat: { fontSize: 11, color: '#666666', letterSpacing: 1.5, marginBottom: 2 },
  labelName: { fontSize: 15, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2, marginBottom: 2 },
  labelNameEmpty: { color: '#333333' },
  labelBrand: { fontSize: 12, color: '#9CE41C', letterSpacing: 0.5 },
  line: { height: 1 },
  lineDot: { width: 4, height: 4, borderRadius: 2 },

  itemCount: {
    fontSize: 14, color: '#444444', letterSpacing: 2,
    textAlign: 'center', marginTop: 16, marginBottom: 24,
  },

  // Buttons
  primaryBtn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.35 },
  primaryBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },

  // Nudge
  nudge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#1e1e1e', padding: 14, marginTop: 16,
  },
  nudgeDot: { width: 6, height: 6, backgroundColor: '#9CE41C' },
  nudgeText: { flex: 1, fontSize: 14, color: '#666666' },
  nudgeArrow: { fontSize: 14, color: '#555555' },

  // Step screens
  stepLabel: { fontSize: 14, color: '#666666', letterSpacing: 2, marginBottom: 8 },
  stepTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 32, lineHeight: 36 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 40 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#333333' },
  chipActive: { borderColor: '#9CE41C', backgroundColor: '#9CE41C' },
  chipText: { fontSize: 14, color: '#888888', letterSpacing: 1 },
  chipTextActive: { color: '#0a0a0a', fontWeight: '800' },

  // Generating
  generatingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  generatingText: { fontSize: 16, color: '#fff', fontWeight: '700', letterSpacing: 1 },
  generatingSub: { fontSize: 14, color: '#666666', letterSpacing: 1 },

  // Result
  outfitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  outfitGridItem: { width: '47%' },
  outfitItemPhoto: { width: '100%', aspectRatio: 3 / 4, resizeMode: 'cover', backgroundColor: '#1a1a1a' },
  outfitItemPlaceholder: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#1a1a1a' },
  outfitItemLabel: { paddingTop: 8, gap: 2, marginBottom: 8 },
  outfitItemCat: { fontSize: 11, color: '#666666', letterSpacing: 1.5 },
  outfitItemName: { fontSize: 14, fontWeight: '700', color: '#fff' },

  outfitPlaceholder: {
    width: '100%', height: 260, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16,
  },
  outfitDot: { width: 20, height: 20, backgroundColor: '#1e1e1e' },
  outfitPlaceholderText: { fontSize: 14, color: '#333333', letterSpacing: 2 },

  notesBox: {
    flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#1e1e1e',
    padding: 16, marginBottom: 24, alignItems: 'flex-start',
  },
  notesDot: { width: 6, height: 6, backgroundColor: '#9CE41C', marginTop: 4 },
  notesText: { flex: 1, fontSize: 14, color: '#888888', lineHeight: 22 },

  resultActions: { flexDirection: 'row', gap: 12 },
  saveBtn: { flex: 1, backgroundColor: '#9CE41C', paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  retryBtn: { flex: 1, borderWidth: 1, borderColor: '#333333', paddingVertical: 16, alignItems: 'center' },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 1 },
});

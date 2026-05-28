import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Dimensions, ActivityIndicator, ScrollView, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';
import { removeBackground } from '@/lib/background-removal';
import { virtualTryOnReplicate } from '@/lib/virtual-tryon-replicate';
import { IconSymbol } from '@/components/ui/icon-symbol';

/** Download a remote URL to a local temp file and return its local URI. */
async function downloadToTemp(url: string): Promise<string> {
  const ext = url.includes('.png') ? 'png' : 'jpg';
  const dest = `${FileSystem.cacheDirectory}tryon_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { uri } = await FileSystem.downloadAsync(url, dest);
  return uri;
}

const APPLIED_OUTFIT_KEY = 'drip:appliedOutfit';

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

const STYLE_TIPS: Record<string, string[]> = {
  '上班': [
    '輕鬆上班風的關鍵是版型——寬鬆剪裁搭配俐落下著，舒適又有型。',
    '辦公室穿搭以中性色為主，再用配件點綴個人風格。',
    '一件剪裁好的西裝外套，可以讓任何休閒單品瞬間升級。',
  ],
  '約會': [
    '約會穿搭不必過度，展現真實的自己才是最吸引人的。',
    '一個精心挑選的配件，往往比整套新衣更令人印象深刻。',
    '暖色系讓人感到親近，冷色系顯得神秘迷人——看你想傳遞什麼訊息。',
  ],
  '露營': [
    '機能與風格不衝突，層次穿搭是戶外活動的最佳解法。',
    '大地色系融入自然、耐髒又耐看，是露營穿搭的首選。',
    '一件好的防風外層，是所有戶外穿搭的核心單品。',
  ],
  '運動': [
    '選對顏色，運動時能量更滿——亮色讓你更有動力。',
    '合身的機能剪裁讓動作更流暢，也更有運動感。',
    'Athleisure 風格讓你從健身房直接走進咖啡廳。',
  ],
  '派對': [
    '派對穿搭的秘訣：一個亮點就夠，全身閃亮反而失焦。',
    '深色系在派對燈光下更顯神秘而有魅力。',
    '派對是嘗試平時不敢穿的風格的最好時機。',
  ],
  '夜遊': [
    '夜晚的燈光讓深色和金屬色系更加迷人。',
    '一件剪裁好的黑色單品，是夜遊衣櫃的萬能基礎。',
    '夜遊穿搭兼顧時尚與舒適，才能盡情享受夜晚。',
  ],
};
const GENERAL_TIPS = [
  '穿搭的最高境界不是追隨潮流，而是找到屬於自己的風格語言。',
  '版型比品牌更重要——合身的平價單品遠勝不合身的名牌。',
  '顏色搭配遵循「60-30-10 法則」：60% 主色、30% 輔色、10% 點綴色。',
  '每個衣櫃都需要幾件萬能單品：白 T、牛仔褲、黑色外套。',
];

const OCCASIONS: { label: string; en: string; icon: string }[] = [
  { label: '上班', en: 'WORK',      icon: 'briefcase'    },
  { label: '約會', en: 'DATE',      icon: 'heart'        },
  { label: '露營', en: 'CAMPING',   icon: 'tent'         },
  { label: '運動', en: 'SPORT',     icon: 'bolt'         },
  { label: '派對', en: 'PARTY',     icon: 'star'         },
  { label: '夜遊', en: 'NIGHT OUT', icon: 'moon'         },
];
const VIBES: { label: string; en: string; icon: string }[] = [
  { label: '輕鬆', en: 'RELAXED',  icon: 'leaf'         },
  { label: '正式', en: 'FORMAL',   icon: 'building.2'   },
  { label: '帥氣', en: 'COOL',     icon: 'flame'        },
  { label: '優雅', en: 'ELEGANT',  icon: 'sparkles'     },
  { label: '休閒', en: 'CASUAL',   icon: 'sun.max'      },
];

const GENERATING_STEPS = [
  '分析你的衣櫃中...',
  '搭配最佳色系與版型...',
  '渲染專屬穿搭圖...',
];

type Step = 'map' | 'occasion' | 'vibe' | 'generating' | 'result';
type WardrobeItem = { name: string; brand: string | null; photo_url: string | null };
type WardrobeMap = Record<string, WardrobeItem>;
type GridItem = { id: string; name: string; brand: string | null; photo_url: string | null; category: string };

type SuggestionItem = { category: string; description: string; reason: string };

type OutfitResult = {
  selected: { category: string; item: WardrobeItem }[];
  notes: string;
  title: string;
  tryOnImageUrl?: string;
  suggestions?: SuggestionItem[];
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
  cat, item, side, top, highlighted,
}: {
  cat: string;
  item?: { name: string; brand: string | null };
  side: 'left' | 'right';
  top: number;
  highlighted?: boolean;
}) {
  const filled = !!item;
  const lineColor = highlighted ? 'rgba(156,228,28,0.8)' : filled ? 'rgba(156,228,28,0.4)' : 'rgba(255,255,255,0.12)';

  if (side === 'left') {
    return (
      <View style={[styles.labelAbsolute, { top, left: H_PAD, flexDirection: 'row', alignItems: 'center' }]}>
        <View style={[styles.labelBox, { width: LABEL_W }, highlighted && styles.labelBoxHighlighted]}>
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
      <View style={[styles.labelBox, { width: LABEL_W }, highlighted && styles.labelBoxHighlighted]}>
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
  const [allItems, setAllItems] = useState<GridItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('map');
  const [occasion, setOccasion] = useState('');
  const [vibe, setVibe] = useState('');
  const [outfitResult, setOutfitResult] = useState<OutfitResult | null>(null);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appliedOutfit, setAppliedOutfit] = useState<OutfitResult | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const dotAnim = useRef(new Animated.Value(0)).current;
  const tipFadeAnim = useRef(new Animated.Value(1)).current;
  const tipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore last applied outfit from cache on mount
  useEffect(() => {
    AsyncStorage.getItem(APPLIED_OUTFIT_KEY).then(raw => {
      if (raw) {
        try { setAppliedOutfit(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  // 分步驟進度文字 cycling
  useEffect(() => {
    if (!imageGenerating) { setStepIndex(0); return; }
    const id = setInterval(() => setStepIndex(p => (p + 1) % GENERATING_STEPS.length), 2500);
    return () => clearInterval(id);
  }, [imageGenerating]);

  // Tips 自動輪播（6 秒）
  useEffect(() => {
    if (!imageGenerating) {
      setTipIndex(0);
      tipFadeAnim.setValue(1);
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
      return;
    }
    function startTipTimer() {
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
      tipIntervalRef.current = setInterval(() => changeTip(1), 6000);
    }
    startTipTimer();
    return () => { if (tipIntervalRef.current) clearInterval(tipIntervalRef.current); };
  }, [imageGenerating]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? '';

  useFocusEffect(useCallback(() => {
    if (!user) return;
    (async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('body_photo_url')
        .eq('id', user.id)
        .single();
      const rawBodyUrl = userData?.body_photo_url ?? null;
      const signedBodyUrl = await getSignedUrl(rawBodyUrl);
      console.log('body photo signed url:', signedBodyUrl);
      if (signedBodyUrl) {
        const probe = await fetch(signedBodyUrl);
        console.log('storage probe status:', probe.status, 'content-type:', probe.headers.get('content-type'), 'content-length:', probe.headers.get('content-length'));
      }
      setBodyPhotoUrl(signedBodyUrl);

      const { data: items } = await supabase
        .from('wardrobe_items')
        .select('id, category, name, brand, photo_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (items) {
        setTotalItems(items.length);
        // Sign all item photo URLs in parallel
        const signedPhotoUrls = await Promise.all(
          items.map(i => getSignedUrl(i.photo_url ?? null)),
        );
        const signedItems = items.map((i, idx) => ({
          id: i.id,
          name: i.name,
          brand: i.brand ?? null,
          photo_url: signedPhotoUrls[idx],
          category: i.category,
        }));
        setAllItems(signedItems);
        const map: WardrobeMap = {};
        signedItems.forEach(item => {
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

  function changeTip(dir: 1 | -1) {
    Animated.timing(tipFadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setTipIndex(prev => prev + dir);
      Animated.timing(tipFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }

  function handleTipNav(dir: 1 | -1) {
    if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
    tipIntervalRef.current = setInterval(() => changeTip(1), 6000);
    changeTip(dir);
  }

  async function generate() {
    console.log('[generate] called, occasion:', occasion, 'vibe:', vibe, 'user:', !!user);
    if (!occasion || !vibe || !user) {
      console.warn('[generate] early return — missing occasion/vibe/user');
      return;
    }
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

      const availableCategories = Object.keys(wardrobeMap);
      const prompt = `你是一位時尚造型師。用戶的衣櫃有以下單品（格式：分類：單品名稱）：\n${wardrobeLines}\n\n場合：${occasion}\n氛圍：${vibe}\n\n請從衣櫃中選出最適合的分類組合，並建議 1-2 件衣櫃以外可以添購的單品來提升整體造型。\n\n注意：selected_categories 只能從以下分類名稱中選擇，不可以填入單品名稱：${availableCategories.join('、')}\n\n只回傳 JSON，不要有其他文字或 markdown：\n{\n  "title": "穿搭標題（10字內）",\n  "selected_categories": ${JSON.stringify(availableCategories.slice(0, 2))},\n  "notes": "穿搭建議（50字內）",\n  "suggestions": [\n    { "category": "分類名稱", "description": "單品描述（10字內）", "reason": "添購原因（15字內）" }\n  ]\n}`;

      const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('Anthropic API key not configured');

      console.log('[generate] calling Anthropic API...');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Claude ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const rawContent = json?.content?.[0]?.text;
      if (!rawContent) throw new Error('Empty response from Claude');

      const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      const content = JSON.parse(cleaned);
      const selectedCats: string[] = content.selected_categories ?? [];
      console.log('[generate] Claude selectedCats:', selectedCats);
      console.log('[generate] wardrobeMap keys:', Object.keys(wardrobeMap));

      const result: OutfitResult = {
        title: content.title ?? `${occasion} 穿搭`,
        notes: content.notes ?? '',
        selected: selectedCats
          .filter(cat => wardrobeMap[cat])
          .map(cat => ({ category: cat, item: wardrobeMap[cat] })),
        suggestions: Array.isArray(content.suggestions) ? content.suggestions : [],
      };

      // ── 立刻顯示結果頁，圖片在背景生成 ──
      setOutfitResult(result);
      setStep('result');

      // 背景生成穿搭圖（虛擬試衣）
      console.log('[generate] outfit result:', result.title, '選了', result.selected.length, '件');
      const replicateToken = process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN;
      const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      const hasBodyPhoto = !!bodyPhotoUrl;
      const hasItemPhotos = result.selected.some(s => !!s.item.photo_url);

      if (result.selected.length > 0) {
        setImageGenerating(true);
        (async () => {
          try {
            let imageUrl: string | null = null;

            // ── 優先用 IDM-VTON（Replicate）──────────────────────────────────
            if (replicateToken && hasBodyPhoto) {
              try {
                console.log('[IDM-VTON] using Replicate virtual try-on');
                const items = result.selected.map(s => ({
                  category: s.category,
                  name: s.item.name,
                  brand: s.item.brand,
                  photo_url: s.item.photo_url,
                }));
                imageUrl = await virtualTryOnReplicate(bodyPhotoUrl!, items, replicateToken);
                console.log('[IDM-VTON] done, imageUrl:', imageUrl ? imageUrl.slice(0, 80) : null);
              } catch (repErr) {
                console.error('[IDM-VTON] failed, falling back to OpenAI:', repErr);
                imageUrl = null;
              }
            }

            // ── Fallback：OpenAI gpt-image-1 ────────────────────────────────
            if (!imageUrl && openaiKey) {
              const categoryMap: Record<string, string> = {
                '上衣': 'top', '下著': 'bottoms', '外套': 'outerwear', '鞋子': 'shoes', '配件': 'accessory',
              };
              const itemsDesc = result.selected
                .map(({ category, item }) => {
                  const catEn = categoryMap[category] ?? category;
                  const brand = item.brand ? ` by ${item.brand}` : '';
                  return `${catEn}${brand}`;
                })
                .join(', ');

              if (hasBodyPhoto || hasItemPhotos) {
                const fd = new FormData();
                fd.append('model', 'gpt-image-1');
                fd.append('n', '1');
                fd.append('size', '1024x1536');
                fd.append('quality', 'medium');
                const prompt = hasBodyPhoto
                  ? `Virtual try-on: dress the person in the first image with the clothing items shown in the reference images (${itemsDesc}). Keep the person's face, hair, body shape, and pose exactly the same. Only replace the clothing. IMPORTANT: the full body must be visible from the top of the head to the bottom of the feet. Clean studio background, fashion editorial quality.`
                  : `Fashion editorial photo: a person wearing ${itemsDesc}. IMPORTANT: full body from head to feet, nothing cropped. Clean white studio background, natural standing pose.`;
                fd.append('prompt', prompt);
                if (bodyPhotoUrl) {
                  try {
                    const localBody = await downloadToTemp(bodyPhotoUrl);
                    fd.append('image[]', { uri: localBody, type: 'image/png', name: 'body.png' } as any);
                  } catch {}
                }
                for (const { item } of result.selected) {
                  if (item.photo_url) {
                    try {
                      const localItem = await downloadToTemp(item.photo_url);
                      fd.append('image[]', { uri: localItem, type: 'image/png', name: 'item.png' } as any);
                    } catch {}
                  }
                }
                const imgRes = await fetch('https://api.openai.com/v1/images/edits', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${openaiKey}` },
                  body: fd,
                });
                if (imgRes.ok) {
                  const imgJson = await imgRes.json();
                  const b64 = imgJson?.data?.[0]?.b64_json;
                  imageUrl = imgJson?.data?.[0]?.url ?? (b64 ? `data:image/png;base64,${b64}` : null);
                } else {
                  const errText = await imgRes.text().catch(() => '');
                  console.error('OpenAI try-on error', imgRes.status, errText.slice(0, 300));
                }
              } else {
                const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
                  body: JSON.stringify({
                    model: 'gpt-image-1',
                    prompt: `Fashion editorial photo: a person wearing ${itemsDesc}. Full body from head to feet, nothing cropped. Minimal white studio background.`,
                    n: 1, size: '1024x1536', quality: 'medium',
                  }),
                });
                if (imgRes.ok) {
                  const imgJson = await imgRes.json();
                  const b64 = imgJson?.data?.[0]?.b64_json;
                  imageUrl = imgJson?.data?.[0]?.url ?? (b64 ? `data:image/png;base64,${b64}` : null);
                }
              }
            }

            if (imageUrl) {
              setOutfitResult(prev => prev ? { ...prev, tryOnImageUrl: imageUrl! } : prev);
            }
          } catch (imgErr) {
            console.error('try-on image generation failed:', imgErr);
          } finally {
            setImageGenerating(false);
          }
        })();
      }

    } catch (e: any) {
      console.error('generate error', e);
      setOutfitResult({
        title: `${occasion} 穿搭`,
        notes: e?.message ?? '穿搭建議生成失敗，請稍後再試。',
        selected: [],
      });
      setStep('result');
    }
  }

  function reset() {
    setOccasion(''); setVibe(''); setOutfitResult(null);
    setImageGenerating(false);
    setStep('map');
  }

  async function saveOutfit() {
    if (!outfitResult || !user || saving) return;
    setSaving(true);

    let tryOnImageUrl = outfitResult.tryOnImageUrl;

    // 如果有穿搭圖，自動去背再存到主頁
    if (tryOnImageUrl) {
      try {
        let localUri: string;
        if (tryOnImageUrl.startsWith('data:')) {
          // base64 data URL → 寫成暫存檔
          const base64 = tryOnImageUrl.replace(/^data:image\/\w+;base64,/, '');
          localUri = `${FileSystem.cacheDirectory}tryon_save_${Date.now()}.png`;
          await FileSystem.writeAsStringAsync(localUri, base64, { encoding: 'base64' as any });
        } else {
          localUri = await downloadToTemp(tryOnImageUrl);
        }
        tryOnImageUrl = await removeBackground(localUri);
      } catch (e) {
        console.warn('saveOutfit bg removal failed:', e);
        // 失敗就用原圖
      }
    }

    const outfitToSave: OutfitResult = { ...outfitResult, tryOnImageUrl };

    supabase.from('analytics_events').insert({
      user_id: user.id,
      event: 'outfit_saved',
      properties: { title: outfitResult.title },
    });
    setAppliedOutfit(outfitToSave);
    AsyncStorage.setItem(APPLIED_OUTFIT_KEY, JSON.stringify(outfitToSave));
    setSaving(false);
    reset();
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

          {/* Figure container */}
          <View style={{ height: FIG_CONTAINER_H, position: 'relative' }}>
            <GridBg height={FIG_CONTAINER_H} />

            {/* Body figure */}
            <View style={[styles.figureWrap, {
              left: FIG_LEFT, width: FIG_W, height: FIG_H, top: FIG_TOP,
            }]}>
              {appliedOutfit?.tryOnImageUrl ? (
                <Image source={{ uri: appliedOutfit.tryOnImageUrl }} style={styles.bodyPhoto} />
              ) : bodyPhotoUrl ? (
                <Image
                  source={{ uri: bodyPhotoUrl }}
                  style={styles.bodyPhoto}
                  onError={(e) => console.error('body photo load error', e.nativeEvent.error)}
                />
              ) : (
                <View style={styles.silhouette}>
                  <IconSymbol name="person.fill" size={FIG_W - 10} color="#3d3d3d" />
                </View>
              )}
            </View>

            {/* Labels — show applied outfit items if available, else wardrobe defaults */}
            {LABEL_DEFS.map(({ cat, side, topFrac }) => {
              const appliedItem = appliedOutfit?.selected.find(s => s.category === cat)?.item;
              return (
                <LabelChip
                  key={cat}
                  cat={cat}
                  item={appliedItem ?? wardrobeMap[cat]}
                  side={side}
                  top={FIG_TOP + topFrac * FIG_H}
                  highlighted={!!appliedItem}
                />
              );
            })}
          </View>

          {/* Applied outfit bar — tap to view result, 清除 to dismiss */}
          {appliedOutfit && (
            <TouchableOpacity
              style={styles.appliedBar}
              onPress={() => { setOutfitResult(appliedOutfit); setStep('result'); }}
              activeOpacity={0.7}
            >
              <View style={styles.appliedDot} />
              <Text style={styles.appliedTitle} numberOfLines={1}>{appliedOutfit.title}</Text>
              <View style={styles.appliedRight}>
                <Text style={styles.appliedView}>查看 →</Text>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setAppliedOutfit(null); AsyncStorage.removeItem(APPLIED_OUTFIT_KEY); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.appliedClear}>清除</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          {/* Item count */}
          <Text style={styles.itemCount}>{`${totalItems} ITEMS IN YOUR CLOSET`}</Text>

          {/* CTA */}
          {totalItems === 0 ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/add')}>
              <Text style={styles.primaryBtnText}>新增第一件衣物 →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('occasion')}>
              <Text style={styles.primaryBtnText}>{appliedOutfit ? '重新生成穿搭 →' : '生成今日穿搭 →'}</Text>
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

          {/* ITEM grid — 有套用穿搭時只顯示該套單品，否則顯示全部 */}
          {(appliedOutfit ? appliedOutfit.selected.length > 0 : allItems.length > 0) && (
            <View style={styles.itemsSection}>
              <Text style={styles.itemsSectionTitle}>
                {appliedOutfit ? '本次穿搭單品' : 'ITEM'}
              </Text>
              <View style={styles.itemsGrid}>
                {(appliedOutfit
                  ? appliedOutfit.selected.map(s => ({
                      id: s.category,
                      name: s.item.name,
                      brand: s.item.brand,
                      photo_url: s.item.photo_url,
                    }))
                  : allItems
                ).map(item => (
                  <View key={item.id} style={styles.itemCard}>
                    <Text style={styles.itemCardName} numberOfLines={1}>{item.name}</Text>
                    {item.brand
                      ? <Text style={styles.itemCardBrand} numberOfLines={1}>{item.brand}</Text>
                      : null}
                    {item.photo_url ? (
                      <Image
                        source={{ uri: item.photo_url }}
                        style={styles.itemCardPhoto}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.itemCardPhotoEmpty} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Occasion ─────────────────────────────────────────────────────────────
  if (step === 'occasion') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.genHeader}>
          <TouchableOpacity onPress={() => setStep('map')}>
            <Text style={styles.back}>← 返回</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.genInner}>
          <Text style={styles.genTitle}>{'GENERATE\nYOUR LOOK'}</Text>
          <Text style={styles.genSubtitle}>選擇今天的場合</Text>

          {OCCASIONS.map((o, i) => {
            const selected = occasion === o.label;
            return (
              <TouchableOpacity
                key={o.label}
                style={[styles.occasionRow, i === OCCASIONS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => setOccasion(o.label)}
                activeOpacity={0.6}
              >
                <IconSymbol
                  name={o.icon as any}
                  size={22}
                  color={selected ? '#fff' : '#555'}
                />
                <View style={styles.occasionText}>
                  <Text style={[styles.occasionLabel, selected && styles.occasionLabelSelected]}>
                    {o.label}
                  </Text>
                  <Text style={[styles.occasionEn, selected && styles.occasionEnSelected]}>
                    {o.en}
                  </Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <IconSymbol name="checkmark" size={11} color="#0a0a0a" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.genFooter}>
          <TouchableOpacity
            style={[styles.primaryBtn, !occasion && styles.btnDisabled]}
            onPress={() => occasion && setStep('vibe')}
            disabled={!occasion}
          >
            <Text style={styles.primaryBtnText}>下一步 →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Vibe ─────────────────────────────────────────────────────────────────
  if (step === 'vibe') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.genHeader}>
          <TouchableOpacity onPress={() => setStep('occasion')}>
            <Text style={styles.back}>← 返回</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.genInner}>
          <Text style={styles.genTitle}>{'CHOOSE\nYOUR VIBE'}</Text>
          <Text style={styles.genSubtitle}>選擇今天的氛圍</Text>

          {VIBES.map((v, i) => {
            const selected = vibe === v.label;
            return (
              <TouchableOpacity
                key={v.label}
                style={[styles.occasionRow, i === VIBES.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => setVibe(v.label)}
                activeOpacity={0.6}
              >
                <IconSymbol
                  name={v.icon as any}
                  size={22}
                  color={selected ? '#fff' : '#555'}
                />
                <View style={styles.occasionText}>
                  <Text style={[styles.occasionLabel, selected && styles.occasionLabelSelected]}>
                    {v.label}
                  </Text>
                  <Text style={[styles.occasionEn, selected && styles.occasionEnSelected]}>
                    {v.en}
                  </Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <IconSymbol name="checkmark" size={11} color="#0a0a0a" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.genFooter}>
          <TouchableOpacity
            style={[styles.primaryBtn, !vibe && styles.btnDisabled]}
            onPress={generate}
            disabled={!vibe}
          >
            <Text style={styles.primaryBtnText}>生成穿搭 →</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.back}>← 返回</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.stepTitle}>{outfitResult?.title ?? '今日穿搭'}</Text>

        {/* Try-on image / loading tips — 在單品格子上方 */}
        {outfitResult?.tryOnImageUrl ? (
          <Image
            source={{ uri: outfitResult.tryOnImageUrl }}
            style={styles.tryOnImage}
            resizeMode="cover"
          />
        ) : imageGenerating ? (() => {
          const allTips = [...(STYLE_TIPS[occasion] ?? []), ...GENERAL_TIPS];
          const idx = ((tipIndex % allTips.length) + allTips.length) % allTips.length;
          const currentTip = allTips[idx];
          return (
            <View style={styles.outfitPlaceholder}>
              {/* 分步驟進度 */}
              <View style={styles.generatingHeaderRow}>
                <ActivityIndicator color="#9CE41C" size="small" />
                <Text style={styles.outfitGeneratingStep}>{GENERATING_STEPS[stepIndex]}</Text>
              </View>
              <View style={styles.tipDivider} />
              {/* Tips 內容 */}
              <Animated.View style={[styles.tipBox, { opacity: tipFadeAnim }]}>
                <Text style={styles.tipLabel}>STYLE TIP</Text>
                <Text style={styles.tipContent}>{currentTip}</Text>
              </Animated.View>
              {/* 手動前後 + 點點指示 */}
              <View style={styles.tipNavRow}>
                <TouchableOpacity onPress={() => handleTipNav(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.tipNavArrow}>←</Text>
                </TouchableOpacity>
                <View style={styles.tipDotsRow}>
                  {allTips.map((_, i) => (
                    <View key={i} style={[styles.tipDotItem, i === idx && styles.tipDotItemActive]} />
                  ))}
                </View>
                <TouchableOpacity onPress={() => handleTipNav(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.tipNavArrow}>→</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })() : null}

        {/* Selected items grid — 立刻顯示，在穿搭圖下方 */}
        {outfitResult && outfitResult.selected.length > 0 && (
          <View>
          <Text style={styles.outfitGridTitle}>推薦單品</Text>
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
          </View>
        )}

        {/* Styling notes */}
        {outfitResult?.notes ? (
          <View style={styles.notesBox}>
            <View style={styles.notesDot} />
            <Text style={styles.notesText}>{outfitResult.notes}</Text>
          </View>
        ) : null}

        {/* 添購建議 */}
        {outfitResult?.suggestions && outfitResult.suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            <Text style={styles.suggestionsTitle}>MISSING PIECES</Text>
            {outfitResult.suggestions.map((s, i) => (
              <View key={i} style={[styles.suggestionRow, i < outfitResult.suggestions!.length - 1 && styles.suggestionRowBorder]}>
                <View style={styles.suggestionCatTag}>
                  <Text style={styles.suggestionCat}>{s.category}</Text>
                </View>
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionDesc}>{s.description}</Text>
                  <Text style={styles.suggestionReason}>{s.reason}</Text>
                </View>
                <View style={styles.suggestionPlus}>
                  <Text style={styles.suggestionPlusText}>+</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.resultActions}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={saveOutfit}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#0a0a0a" size="small" />
              : <Text style={styles.saveBtnText}>收藏這套</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              if (occasion && vibe) {
                // came from fresh generation — re-run with same occasion/vibe
                generate();
              } else {
                // came from applied outfit bar — go pick a new occasion
                setOutfitResult(null);
                setStep('occasion');
              }
            }}
          >
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
  figureWrap: { position: 'absolute' },
  bodyPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  silhouette: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#141414',
  },

  // Labels
  labelAbsolute: { position: 'absolute' },
  labelBox: {
    borderWidth: 1, borderColor: '#2a2a2a',
    backgroundColor: 'rgba(10,10,10,0.85)',
    padding: 8,
  },
  labelBoxHighlighted: {
    borderColor: '#9CE41C',
  },
  labelCat: { fontSize: 10, color: '#9CE41C', letterSpacing: 1.5, marginBottom: 3 },
  labelName: { fontSize: 14, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2, marginBottom: 2 },
  labelNameEmpty: { color: '#333333' },
  labelBrand: { fontSize: 11, color: '#888888', letterSpacing: 0.3 },
  line: { height: 1 },
  lineDot: { width: 4, height: 4, borderRadius: 2 },

  // ITEM grid
  itemsSection: { marginTop: 32 },
  itemsSectionTitle: {
    fontSize: 13, fontWeight: '900', color: '#9CE41C',
    letterSpacing: 3, marginBottom: 14,
  },
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  itemCard: {
    width: (CONTENT_W - 10) / 2,
    backgroundColor: '#131313',
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
    minHeight: 200,
  },
  itemCardName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  itemCardBrand: { fontSize: 12, color: '#666', marginBottom: 8 },
  itemCardPhoto: { width: '100%', height: 140, borderRadius: 6 },
  itemCardPhotoEmpty: { width: '100%', height: 140, backgroundColor: '#1e1e1e', borderRadius: 6 },

  itemCount: {
    fontSize: 14, color: '#444444', letterSpacing: 2,
    textAlign: 'center', marginTop: 16, marginBottom: 24,
  },

  // Buttons
  primaryBtn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.35 },
  primaryBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },

  // Nudge
  appliedBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111111', paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16,
  },
  appliedDot: { width: 6, height: 6, backgroundColor: '#9CE41C' },
  appliedTitle: { flex: 1, fontSize: 13, color: '#9CE41C', fontWeight: '700', letterSpacing: 0.5 },
  appliedRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  appliedView: { fontSize: 13, color: '#9CE41C', letterSpacing: 0.5 },
  appliedClear: { fontSize: 13, color: '#555555', letterSpacing: 1 },

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

  // Generate Your Look
  genHeader: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  genInner: { paddingHorizontal: 24, paddingBottom: 24 },
  genFooter: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 },
  genTitle: {
    fontSize: 36, fontWeight: '900', color: '#fff',
    letterSpacing: -0.5, lineHeight: 40, marginBottom: 8, marginTop: 8,
  },
  genSubtitle: { fontSize: 14, color: '#666', letterSpacing: 1, marginBottom: 24 },
  occasionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  occasionText: { flex: 1 },
  occasionLabel: { fontSize: 20, fontWeight: '700', color: '#888', marginBottom: 2 },
  occasionLabelSelected: { color: '#fff' },
  occasionEn: { fontSize: 11, color: '#444', letterSpacing: 2 },
  occasionEnSelected: { color: '#9CE41C' },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: '#444',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { backgroundColor: '#9CE41C', borderColor: '#9CE41C' },

  // Generating
  generatingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  generatingText: { fontSize: 16, color: '#fff', fontWeight: '700', letterSpacing: 1 },
  generatingSub: { fontSize: 14, color: '#666666', letterSpacing: 1 },

  // Result
  outfitGridTitle: {
    fontSize: 13, fontWeight: '900', color: '#9CE41C',
    letterSpacing: 3, marginBottom: 14, marginTop: 24,
  },
  outfitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  outfitGridItem: { width: '47%' },
  outfitItemPhoto: { width: '100%', aspectRatio: 3 / 4, resizeMode: 'cover', backgroundColor: '#1a1a1a' },
  outfitItemPlaceholder: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#1a1a1a' },
  outfitItemLabel: { paddingTop: 8, gap: 2, marginBottom: 8 },
  outfitItemCat: { fontSize: 11, color: '#666666', letterSpacing: 1.5 },
  outfitItemName: { fontSize: 14, fontWeight: '700', color: '#fff' },

  tryOnImage: {
    width: '100%', aspectRatio: 2 / 3, backgroundColor: '#111',
    marginBottom: 20,
  },
  outfitPlaceholder: {
    width: '100%', backgroundColor: '#111111',
    paddingVertical: 28, paddingHorizontal: 20,
    gap: 16, marginBottom: 20,
  },
  generatingHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  outfitGeneratingStep: { fontSize: 13, color: '#888888', letterSpacing: 1.5 },
  tipDivider: { height: 1, backgroundColor: '#1e1e1e', width: '100%' },
  tipBox: { gap: 10, minHeight: 72 },
  tipLabel: { fontSize: 11, color: '#9CE41C', letterSpacing: 3, fontWeight: '800' },
  tipContent: { fontSize: 15, color: '#cccccc', lineHeight: 24, letterSpacing: 0.3 },
  tipNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  tipNavArrow: { fontSize: 16, color: '#555555', fontWeight: '700', paddingHorizontal: 4 },
  tipDotsRow: { flexDirection: 'row', gap: 6 },
  tipDotItem: { width: 5, height: 5, backgroundColor: '#333333' },
  tipDotItemActive: { backgroundColor: '#9CE41C' },

  notesBox: {
    flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#1e1e1e',
    padding: 16, marginBottom: 24, alignItems: 'flex-start',
  },
  notesDot: { width: 6, height: 6, backgroundColor: '#9CE41C', marginTop: 4 },
  notesText: { flex: 1, fontSize: 14, color: '#888888', lineHeight: 22 },

  suggestionsBox: {
    borderWidth: 1, borderColor: '#1e1e1e',
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 11, fontWeight: '900', color: '#9CE41C',
    letterSpacing: 3, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  suggestionRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  suggestionCatTag: {
    backgroundColor: '#1a1a1a', paddingHorizontal: 8, paddingVertical: 4,
    minWidth: 44, alignItems: 'center',
  },
  suggestionCat: { fontSize: 11, color: '#666666', letterSpacing: 1 },
  suggestionInfo: { flex: 1, gap: 3 },
  suggestionDesc: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  suggestionReason: { fontSize: 12, color: '#555555', letterSpacing: 0.3 },
  suggestionPlus: {
    width: 24, height: 24, borderWidth: 1, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center',
  },
  suggestionPlusText: { fontSize: 16, color: '#9CE41C', lineHeight: 20 },

  resultActions: { flexDirection: 'row', gap: 12 },
  saveBtn: { flex: 1, backgroundColor: '#9CE41C', paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  retryBtn: { flex: 1, borderWidth: 1, borderColor: '#333333', paddingVertical: 16, alignItems: 'center' },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 1 },
});

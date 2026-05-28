import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Dimensions, ActivityIndicator, ScrollView, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';
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

type Step = 'map' | 'occasion' | 'vibe' | 'generating' | 'result';
type WardrobeItem = { name: string; brand: string | null; photo_url: string | null };
type WardrobeMap = Record<string, WardrobeItem>;
type GridItem = { id: string; name: string; brand: string | null; photo_url: string | null; category: string };

type OutfitResult = {
  selected: { category: string; item: WardrobeItem }[];
  notes: string;
  title: string;
  tryOnImageUrl?: string;
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
  const [appliedOutfit, setAppliedOutfit] = useState<OutfitResult | null>(null);
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!imageGenerating) { dotAnim.setValue(0); return; }
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
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

      const prompt = `你是一位時尚造型師。用戶的衣櫃有：\n${wardrobeLines}\n\n場合：${occasion}\n氣圍：${vibe}\n\n請從衣櫃中選出最適合的單品組合，並給出簡短的穿搭建議。\n\n只回傳 JSON，不要有其他文字或 markdown：\n{\n  "title": "穿搭標題（10字內）",\n  "selected_categories": ["上衣", "下著"],\n  "notes": "穿搭建議（50字內）"\n}`;

      const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('Anthropic API key not configured');

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

      const result: OutfitResult = {
        title: content.title ?? `${occasion} 穿搭`,
        notes: content.notes ?? '',
        selected: selectedCats
          .filter(cat => wardrobeMap[cat])
          .map(cat => ({ category: cat, item: wardrobeMap[cat] })),
      };

      // ── 立刻顯示結果頁，圖片在背景生成 ──
      setOutfitResult(result);
      setStep('result');

      // 背景生成穿搭圖（虛擬試衣）
      const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (openaiKey && result.selected.length > 0) {
        setImageGenerating(true);
        (async () => {
          try {
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

            // 有全身照 → 用 edits 端點做虛擬試衣
            // 沒有 → fallback 到 generations
            const hasBodyPhoto = !!bodyPhotoUrl;
            const hasItemPhotos = result.selected.some(s => !!s.item.photo_url);

            let imageUrl: string | null = null;

            if (hasBodyPhoto || hasItemPhotos) {
              // 虛擬試衣：把全身照 + 衣物照片傳給 gpt-image-1
              const fd = new FormData();
              fd.append('model', 'gpt-image-1');
              fd.append('n', '1');
              fd.append('size', '1024x1536');
              fd.append('quality', 'medium');

              const prompt = hasBodyPhoto
                ? `Virtual try-on: dress the person in the first image with the clothing items shown in the reference images (${itemsDesc}). Keep the person's face, hair, body shape, and pose exactly the same. Only replace the clothing. Clean studio background, full body visible, fashion editorial quality.`
                : `Fashion editorial try-on: show a person wearing these exact clothing items: ${itemsDesc}. Reference the clothing images provided. Full body shot, clean studio background, high quality fashion photography.`;
              fd.append('prompt', prompt);

              // 全身照
              if (bodyPhotoUrl) {
                fd.append('image[]', { uri: bodyPhotoUrl, type: 'image/jpeg', name: 'body.jpg' } as any);
              }
              // 衣物照片
              for (const { item } of result.selected) {
                if (item.photo_url) {
                  fd.append('image[]', { uri: item.photo_url, type: 'image/jpeg', name: 'item.jpg' } as any);
                }
              }

              const imgRes = await fetch('https://api.openai.com/v1/images/edits', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openaiKey}` },
                body: fd,
              });

              if (imgRes.ok) {
                const imgJson = await imgRes.json();
                const b64 = imgJson?.data?.[0]?.b64_json;
                const rawUrl = imgJson?.data?.[0]?.url;
                imageUrl = rawUrl ?? (b64 ? `data:image/png;base64,${b64}` : null);
              } else {
                const errJson = await imgRes.json().catch(() => null);
                console.error('virtual try-on error', imgRes.status, JSON.stringify(errJson));
              }
            } else {
              // Fallback：純文字生成
              const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
                body: JSON.stringify({
                  model: 'gpt-image-1',
                  prompt: `Fashion editorial photo: full body shot of a person wearing ${itemsDesc}. Minimal white studio background, natural standing pose, complete outfit visible from head to toe.`,
                  n: 1,
                  size: '1024x1536',
                  quality: 'medium',
                }),
              });
              if (imgRes.ok) {
                const imgJson = await imgRes.json();
                const b64 = imgJson?.data?.[0]?.b64_json;
                imageUrl = imgJson?.data?.[0]?.url ?? (b64 ? `data:image/png;base64,${b64}` : null);
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

  function saveOutfit() {
    if (!outfitResult || !user) return;
    supabase.from('analytics_events').insert({
      user_id: user.id,
      event: 'outfit_saved',
      properties: { title: outfitResult.title },
    });
    setAppliedOutfit(outfitResult);
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
                  onPress={(e) => { e.stopPropagation(); setAppliedOutfit(null); }}
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

          {/* ITEM grid */}
          {allItems.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.itemsSectionTitle}>ITEM</Text>
              <View style={styles.itemsGrid}>
                {allItems.map(item => (
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

        {/* Try-on image */}
        {outfitResult?.tryOnImageUrl ? (
          <Image
            source={{ uri: outfitResult.tryOnImageUrl }}
            style={styles.tryOnImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.outfitPlaceholder}>
            {imageGenerating ? (
              <>
                <ActivityIndicator color="#9CE41C" size="small" />
                <Text style={styles.outfitGeneratingText}>穿搭圖生成中</Text>
                <Animated.View style={[styles.outfitGeneratingBar, {
                  opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                  transform: [{ scaleX: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
                }]} />
              </>
            ) : (
              <>
                <View style={styles.outfitDot} />
                <Text style={styles.outfitPlaceholderText}>穿搭圖</Text>
              </>
            )}
          </View>
        )}

        {/* Selected items grid */}
        {outfitResult && outfitResult.selected.length > 0 && (
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
        )}

        {/* Styling notes */}
        {outfitResult?.notes ? (
          <View style={styles.notesBox}>
            <View style={styles.notesDot} />
            <Text style={styles.notesText}>{outfitResult.notes}</Text>
          </View>
        ) : null}

        <View style={styles.resultActions}>
          <TouchableOpacity style={styles.saveBtn} onPress={saveOutfit}>
            <Text style={styles.saveBtnText}>收藏這套</Text>
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
    width: '100%', height: 260, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16,
  },
  outfitDot: { width: 20, height: 20, backgroundColor: '#1e1e1e' },
  outfitPlaceholderText: { fontSize: 14, color: '#333333', letterSpacing: 2 },
  outfitGeneratingText: { fontSize: 13, color: '#666666', letterSpacing: 2, marginTop: 4 },
  outfitGeneratingBar: { width: 60, height: 2, backgroundColor: '#9CE41C', marginTop: 8 },

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

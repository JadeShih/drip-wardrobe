import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Image, ScrollView, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32) / 2.6;
const CARD_IMG_HEIGHT = CARD_WIDTH * 1.25;

const TABS: { label: string; value: string | null }[] = [
  { label: 'ALL', value: null },
  { label: 'TOPS', value: '上衣' },
  { label: 'BOTTOMS', value: '下著' },
  { label: 'OUTERWEAR', value: '外套' },
  { label: 'SHOES', value: '鞋子' },
  { label: 'ACCESSORIES', value: '配件' },
];

const CATEGORY_LABEL: Record<string, string> = {
  '上衣': 'TOPS', '下著': 'BOTTOMS', '外套': 'OUTERWEAR',
  '鞋子': 'SHOES', '配件': 'ACCESSORIES',
};

const CATEGORY_ORDER = ['上衣', '下著', '外套', '鞋子', '配件'];

export type WardrobeItem = {
  id: string;
  photo_url: string | null;
  category: string;
  main_color: string | null;
  name: string;
  brand: string | null;
};

// ── Item card (used in horizontal ALL view) ──────────────────────────────────
function ItemCard({
  item, onEdit, onDelete,
}: {
  item: WardrobeItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardImg}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <IconSymbol name="tshirt" size={36} color="#2a2a2a" />
        )}
        {/* Action overlay */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <IconSymbol name="pencil" size={14} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDelete]} onPress={onDelete}>
            <IconSymbol name="trash" size={14} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        {item.brand ? <Text style={styles.cardBrand} numberOfLines={1}>{item.brand}</Text> : null}
      </View>
    </View>
  );
}

function SectionHeader({
  category, count, onViewAll,
}: {
  category: string; count: number; onViewAll: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitleBold}>MY CLOSET </Text>
        <Text style={styles.sectionTitleCat}>{CATEGORY_LABEL[category]}</Text>
      </View>
      <TouchableOpacity onPress={onViewAll}>
        <Text style={styles.viewAll}>{`VIEW ALL (${count})`}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function WardrobeScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  async function fetchItems() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('wardrobe_items')
      .select('id, photo_url, category, main_color, name, brand')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      const signedPhotoUrls = await Promise.all(
        data.map(i => getSignedUrl(i.photo_url ?? null)),
      );
      setItems(data.map((i, idx) => ({ ...i, photo_url: signedPhotoUrls[idx] })));
    } else {
      setItems([]);
    }
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { fetchItems(); }, [user]));

  async function handleDelete(item: WardrobeItem) {
    Alert.alert(
      '刪除單品',
      `確定要刪除「${item.name}」嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除', style: 'destructive',
          onPress: async () => {
            await supabase.from('wardrobe_items').delete().eq('id', item.id);
            setItems(prev => prev.filter(i => i.id !== item.id));
          },
        },
      ],
    );
  }

  function handleEdit(item: WardrobeItem) {
    router.push({ pathname: '/item-edit', params: { id: item.id } });
  }

  const filtered = activeTab ? items.filter(i => i.category === activeTab) : items;

  const byCategory = CATEGORY_ORDER.reduce<Record<string, WardrobeItem[]>>((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>MY WARDROBE</Text>
          <Text style={styles.headerCount}>0 ITEMS</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <IconSymbol name="hanger" size={48} color="#2a2a2a" />
          </View>
          <Text style={styles.emptyTitle}>WARDROBE IS EMPTY</Text>
          <Text style={styles.emptyDesc}>
            加入你的第一件單品{'\n'}讓 DRIP 為你搭配穿搭
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/add')}>
            <Text style={styles.emptyBtnText}>新增單品 →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>MY WARDROBE</Text>
        <Text style={styles.headerCount}>{`${items.length} ITEMS`}</Text>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabBar} contentContainerStyle={styles.tabBarInner}
      >
        {TABS.map(t => {
          const isActive = activeTab === t.value;
          return (
            <TouchableOpacity key={t.label} style={styles.tabItem} onPress={() => setActiveTab(t.value)}>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{t.label}</Text>
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.divider} />

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === null ? (
          // ALL view — horizontal lists per category
          CATEGORY_ORDER.filter(cat => byCategory[cat]).map(cat => (
            <View key={cat} style={styles.section}>
              <SectionHeader
                category={cat}
                count={byCategory[cat].length}
                onViewAll={() => setActiveTab(cat)}
              />
              <FlatList
                data={byCategory[cat]}
                keyExtractor={i => i.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hList}
                ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
                renderItem={({ item }) => (
                  <ItemCard
                    item={item}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item)}
                  />
                )}
              />
              <View style={styles.sectionDivider} />
            </View>
          ))
        ) : (
          // Single category — 2-column grid
          <View style={styles.grid}>
            {filtered.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.gridCell, idx % 2 === 0 && { marginRight: 10 }]}
              >
                <View style={styles.gridImg}>
                  {item.photo_url ? (
                    <Image
                      source={{ uri: item.photo_url }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  ) : (
                    <IconSymbol name="tshirt" size={36} color="#2a2a2a" />
                  )}
                  {/* Action overlay */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                      <IconSymbol name="pencil" size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDelete]}
                      onPress={() => handleDelete(item)}
                    >
                      <IconSymbol name="trash" size={14} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.metaName} numberOfLines={1}>{item.name}</Text>
                {item.brand ? <Text style={styles.metaBrand} numberOfLines={1}>{item.brand}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerCount: { fontSize: 13, color: '#666', letterSpacing: 2, fontWeight: '600', paddingBottom: 4 },

  tabBar: { maxHeight: 44 },
  tabBarInner: { paddingHorizontal: 16 },
  tabItem: { marginRight: 24, paddingBottom: 10, position: 'relative' },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#555', letterSpacing: 1.5 },
  tabLabelActive: { color: '#fff' },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#9CE41C' },
  divider: { height: 1, backgroundColor: '#1c1c1c' },

  scrollContent: { paddingBottom: 40 },

  section: {},
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline' },
  sectionTitleBold: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  sectionTitleCat: { fontSize: 13, fontWeight: '700', color: '#9CE41C', letterSpacing: 1 },
  viewAll: { fontSize: 11, color: '#666', letterSpacing: 1, textDecorationLine: 'underline' },
  hList: { paddingHorizontal: 16 },
  sectionDivider: { height: 1, backgroundColor: '#1a1a1a', marginTop: 20 },

  // Card (horizontal)
  card: { width: CARD_WIDTH },
  cardImg: {
    width: CARD_WIDTH, height: CARD_IMG_HEIGHT,
    backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  cardInfo: { paddingTop: 6, gap: 2 },
  cardName: { fontSize: 13, color: '#fff', fontWeight: '700' },
  cardBrand: { fontSize: 12, color: '#777' },

  // Action overlay (shared by card + grid)
  cardActions: {
    position: 'absolute', top: 6, right: 6,
    flexDirection: 'row', gap: 4,
  },
  actionBtn: {
    width: 28, height: 28, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnDelete: { backgroundColor: 'rgba(0,0,0,0.55)' },

  // Grid (single category)
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 16 },
  gridCell: { width: (SCREEN_WIDTH - 42) / 2, marginBottom: 20 },
  gridImg: {
    width: '100%', aspectRatio: 3 / 4,
    backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 8,
  },
  metaName: { fontSize: 13, color: '#fff', fontWeight: '700', marginBottom: 2 },
  metaBrand: { fontSize: 12, color: '#777' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 80 },
  emptyIconWrap: {
    width: 80, height: 80, backgroundColor: '#111',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  emptyDesc: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: 8, backgroundColor: '#9CE41C',
    paddingHorizontal: 32, paddingVertical: 14,
  },
  emptyBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
});

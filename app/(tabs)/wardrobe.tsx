import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type WardrobeItem = {
  id: string;
  image_url: string;
  category: string;
  color: string;
  name: string;
};

export default function WardrobeScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchItems() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('wardrobe_items')
      .select('id, image_url, category, color, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { fetchItems(); }, [user]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#9CE41C" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>DRIP</Text>
        <Text style={styles.count}>{items.length} 件</Text>
      </View>

      <Text style={styles.title}>我的衣櫃</Text>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyBlock} />
          <Text style={styles.emptyTitle}>還沒有單品</Text>
          <Text style={styles.emptyDesc}>點右下角＋新增你的第一件</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(tabs)/add')}
          >
            <Text style={styles.addBtnText}>新增衣物 →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.item}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.itemImg} />
              ) : (
                <View style={styles.itemPlaceholder} />
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemCategory}>{item.category}</Text>
                {item.name ? <Text style={styles.itemName}>{item.name}</Text> : null}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24, marginTop: 16, marginBottom: 8,
  },
  logo: { fontSize: 14, color: '#9CE41C', letterSpacing: 6, fontWeight: '800' },
  count: { fontSize: 14, color: '#666666', letterSpacing: 1 },
  title: {
    fontSize: 28, fontWeight: '900', color: '#fff',
    letterSpacing: -0.5, paddingHorizontal: 24, marginBottom: 24,
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 80 },
  emptyBlock: { width: 64, height: 64, backgroundColor: '#1a1a1a' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  emptyDesc: { fontSize: 14, color: '#666666' },
  addBtn: { backgroundColor: '#9CE41C', paddingHorizontal: 24, paddingVertical: 14 },
  addBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  grid: { paddingHorizontal: 24, paddingBottom: 40 },
  row: { gap: 12, marginBottom: 12 },
  item: { flex: 1 },
  itemImg: { width: '100%', aspectRatio: 3 / 4, resizeMode: 'cover', backgroundColor: '#1a1a1a' },
  itemPlaceholder: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#1a1a1a' },
  itemInfo: { paddingTop: 8, gap: 2 },
  itemCategory: { fontSize: 14, color: '#666666', letterSpacing: 1 },
  itemName: { fontSize: 14, color: '#fff', fontWeight: '700' },
});

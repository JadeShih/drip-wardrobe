import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';
import { colors } from '@/constants/tokens';

type UserProfile = {
  body_photo_url: string | null;
  style_tags: string[] | null;
  gender: string | null;
  height: string | null;
  body_type: string | null;
};

type WishlistItem = {
  id: string;
  category: string;
  description: string;
  reason: string | null;
  purchased: boolean;
  created_at: string;
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wardrobeCount, setWardrobeCount] = useState(0);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  const name = user?.user_metadata?.full_name ?? '—';
  const email = user?.email ?? '—';

  useFocusEffect(useCallback(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('body_photo_url, style_tags, gender, height, body_type')
        .eq('id', user.id)
        .single();
      if (data) {
        const signedUrl = await getSignedUrl(data.body_photo_url ?? null);
        setProfile({ ...data, body_photo_url: signedUrl });
      } else {
        setProfile(data);
      }

      const { count } = await supabase
        .from('wardrobe_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setWardrobeCount(count ?? 0);

      const { data: wishlistData } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setWishlist(wishlistData ?? []);
    })();
  }, [user]));

  async function deleteWishlistItem(id: string) {
    Alert.alert('移除', '確定從願望清單移除？', [
      { text: '取消', style: 'cancel' },
      {
        text: '移除', style: 'destructive',
        onPress: async () => {
          await supabase.from('wishlist_items').delete().eq('id', id);
          setWishlist(prev => prev.filter(w => w.id !== id));
        },
      },
    ]);
  }

  async function handleSignOut() {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '登出', style: 'destructive',
        onPress: async () => { await signOut(); },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>DRIP</Text>
        </View>

        {/* Avatar + name */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarInitial}>
            <Text style={styles.avatarInitialText}>
              {name !== '—' ? name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{wardrobeCount}</Text>
            <Text style={styles.statLabel}>件單品</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile?.style_tags?.length ?? 0}</Text>
            <Text style={styles.statLabel}>風格標籤</Text>
          </View>
        </View>

        {/* Style tags */}
        {profile?.style_tags && profile.style_tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>你的風格</Text>
            <TouchableOpacity
              style={styles.tags}
              onPress={() => router.push('/onboarding/style-quiz')}
              activeOpacity={0.7}
            >
              {profile.style_tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              <View style={styles.tagEdit}>
                <Text style={styles.tagEditText}>編輯 →</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Body photo preview */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>全身照</Text>
          <TouchableOpacity
            style={styles.bodyPhotoWrap}
            onPress={() => router.push('/onboarding/body-photo?from=profile')}
            activeOpacity={0.8}
          >
            {profile?.body_photo_url ? (
              <>
                <Image
                  source={{ uri: profile.body_photo_url }}
                  style={styles.bodyPhotoImg}
                  resizeMode="contain"
                />
                <View style={styles.bodyPhotoOverlay}>
                  <Text style={styles.bodyPhotoOverlayText}>點擊更換</Text>
                </View>
              </>
            ) : (
              <View style={styles.bodyPhotoEmpty}>
                <Text style={styles.bodyPhotoEmptyText}>尚未上傳</Text>
                <Text style={styles.bodyPhotoEmptyAction}>點擊上傳全身照 →</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 願望清單 */}
        <View style={styles.section}>
          <View style={styles.wishlistHeader}>
            <Text style={styles.sectionLabel}>願望清單</Text>
            {wishlist.length > 0 && (
              <Text style={styles.wishlistCount}>{wishlist.length} 件</Text>
            )}
          </View>
          {wishlist.length === 0 ? (
            <View style={styles.wishlistEmpty}>
              <Text style={styles.wishlistEmptyText}>還沒有願望清單</Text>
              <Text style={styles.wishlistEmptyHint}>在穿搭結果頁點擊 MISSING PIECES 的 + 加入</Text>
            </View>
          ) : (
            <View style={styles.wishlistList}>
              {wishlist.map(item => (
                <View key={item.id} style={styles.wishlistItem}>
                  <View style={styles.wishlistInfo}>
                    <Text style={styles.wishlistCat}>{item.category}</Text>
                    <Text style={styles.wishlistDesc}>{item.description}</Text>
                    {item.reason ? (
                      <Text style={styles.wishlistReason}>{item.reason}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteWishlistItem(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol name="xmark" size={14} color="#555" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>設定</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/onboarding/profile-info?from=profile')}
          >
            <View style={{ gap: 4, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.rowText}>穿搭輪廓</Text>
                {profile?.gender && profile?.body_type && (
                  <View style={styles.doneTag}>
                    <Text style={styles.doneTagText}>✓ 已設定</Text>
                  </View>
                )}
              </View>
              <Text style={styles.rowSubText}>
                {profile?.gender && profile?.body_type
                  ? '性別、身高、體型...'
                  : '尚未設定 — 影響穿搭生成效果'}
              </Text>
            </View>
            <Text style={styles.rowArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>登出</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  inner: { paddingHorizontal: 24, paddingBottom: 60 },
  header: { marginTop: 16, marginBottom: 32 },
  logo: { fontSize: 14, color: colors.brand.primary, letterSpacing: 6, fontWeight: '800' },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  avatarInitial: {
    width: 64, height: 64, backgroundColor: colors.brand.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitialText: { fontSize: 26, fontWeight: '900', color: colors.text.onBrand },
  name: { fontSize: 18, fontWeight: '900', color: colors.text.primary, marginBottom: 4 },
  email: { fontSize: 14, color: colors.text.placeholder },

  statsRow: {
    flexDirection: 'row', borderWidth: 1, borderColor: colors.background.elevated,
    padding: 20, marginBottom: 32,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 28, fontWeight: '900', color: colors.text.primary },
  statLabel: { fontSize: 14, color: colors.text.placeholder, letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: colors.background.elevated },

  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 14, color: colors.text.placeholder, letterSpacing: 2, marginBottom: 16 },

  bodyPhotoWrap: { position: 'relative', width: '100%', height: 280, backgroundColor: colors.background.card },
  bodyPhotoImg: { width: '100%', height: '100%' },
  bodyPhotoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 12, alignItems: 'center',
  },
  bodyPhotoOverlayText: { fontSize: 13, color: '#aaaaaa', letterSpacing: 1 },
  bodyPhotoEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.border.subtle, borderStyle: 'dashed',
  },
  bodyPhotoEmptyText: { fontSize: 14, color: colors.text.disabled, letterSpacing: 1 },
  bodyPhotoEmptyAction: { fontSize: 14, color: colors.brand.primary, letterSpacing: 1 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  tag: { backgroundColor: colors.brand.primary, paddingHorizontal: 14, paddingVertical: 8 },
  tagText: { color: colors.text.onBrand, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  tagEdit: { paddingHorizontal: 4, paddingVertical: 8 },
  tagEditText: { fontSize: 13, color: colors.text.disabled, letterSpacing: 1 },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.background.elevated,
  },
  rowText: { fontSize: 14, color: colors.text.primary, letterSpacing: 0.5 },
  rowSubText: { fontSize: 12, color: colors.text.secondary, letterSpacing: 0.3, marginTop: 2 },
  doneTag: {
    backgroundColor: 'rgba(156,228,28,0.12)',
    borderWidth: 1, borderColor: 'rgba(156,228,28,0.3)',
    paddingHorizontal: 8, paddingVertical: 2,
  },
  doneTagText: { fontSize: 11, color: colors.brand.primary, fontWeight: '700', letterSpacing: 0.5 },
  rowArrow: { fontSize: 16, color: colors.text.placeholder },

  // Wishlist
  wishlistHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  wishlistCount: { fontSize: 12, color: colors.brand.primary, letterSpacing: 1 },
  wishlistEmpty: { borderWidth: 1, borderColor: colors.background.elevated, borderStyle: 'dashed', padding: 20, alignItems: 'center', gap: 8 },
  wishlistEmptyText: { fontSize: 14, color: colors.text.disabled, letterSpacing: 0.5 },
  wishlistEmptyHint: { fontSize: 12, color: '#333', textAlign: 'center', lineHeight: 18 },
  wishlistList: { gap: 1 },
  wishlistItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.background.card, paddingHorizontal: 14, paddingVertical: 14,
  },
  wishlistInfo: { flex: 1, gap: 3 },
  wishlistCat: { fontSize: 10, color: colors.brand.primary, letterSpacing: 2, marginBottom: 2 },
  wishlistDesc: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  wishlistReason: { fontSize: 12, color: colors.text.disabled, lineHeight: 18 },

  signOutBtn: {
    borderWidth: 1, borderColor: '#333333',
    paddingVertical: 16, alignItems: 'center',
  },
  signOutText: { fontSize: 14, color: colors.text.secondary, letterSpacing: 2 },
});

import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';

type UserProfile = {
  body_photo_url: string | null;
  style_tags: string[] | null;
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wardrobeCount, setWardrobeCount] = useState(0);

  const name = user?.user_metadata?.full_name ?? '—';
  const email = user?.email ?? '—';

  useFocusEffect(useCallback(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('body_photo_url, style_tags')
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
    })();
  }, [user]));

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
          {profile?.body_photo_url ? (
            <Image source={{ uri: profile.body_photo_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
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

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>設定</Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>登出</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { paddingHorizontal: 24, paddingBottom: 60 },
  header: { marginTop: 16, marginBottom: 32 },
  logo: { fontSize: 14, color: '#9CE41C', letterSpacing: 6, fontWeight: '800' },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  avatar: { width: 64, height: 64, resizeMode: 'cover' },
  avatarPlaceholder: { width: 64, height: 64, backgroundColor: '#1a1a1a' },
  name: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 4 },
  email: { fontSize: 14, color: '#666666' },

  statsRow: {
    flexDirection: 'row', borderWidth: 1, borderColor: '#1a1a1a',
    padding: 20, marginBottom: 32,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 28, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 14, color: '#666666', letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: '#1a1a1a' },

  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 14, color: '#666666', letterSpacing: 2, marginBottom: 16 },

  bodyPhotoWrap: { position: 'relative', width: '100%', height: 280, backgroundColor: '#111111' },
  bodyPhotoImg: { width: '100%', height: '100%' },
  bodyPhotoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 12, alignItems: 'center',
  },
  bodyPhotoOverlayText: { fontSize: 13, color: '#aaaaaa', letterSpacing: 1 },
  bodyPhotoEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: '#1e1e1e', borderStyle: 'dashed',
  },
  bodyPhotoEmptyText: { fontSize: 14, color: '#444444', letterSpacing: 1 },
  bodyPhotoEmptyAction: { fontSize: 14, color: '#9CE41C', letterSpacing: 1 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  tag: { backgroundColor: '#9CE41C', paddingHorizontal: 14, paddingVertical: 8 },
  tagText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  tagEdit: { paddingHorizontal: 4, paddingVertical: 8 },
  tagEditText: { fontSize: 13, color: '#555', letterSpacing: 1 },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  rowText: { fontSize: 14, color: '#fff', letterSpacing: 0.5 },
  rowArrow: { fontSize: 16, color: '#666666' },

  signOutBtn: {
    borderWidth: 1, borderColor: '#333333',
    paddingVertical: 16, alignItems: 'center',
  },
  signOutText: { fontSize: 14, color: '#888888', letterSpacing: 2 },
});

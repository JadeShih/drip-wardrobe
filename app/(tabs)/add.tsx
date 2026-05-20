import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';

const CATEGORIES = ['上衣', '下著', '外套', '鞋子', '配件'];

export default function AddScreen() {
  const { user } = useAuth();
  const [photo, setPhoto] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相機權限', '請在設定中允許相機存取');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  async function saveItem() {
    if (!photo || !category || !user) return;
    setUploading(true);
    try {
      const ext = photo.split('.').pop()?.split('?')[0] ?? 'jpg';
      const fileName = `${Date.now()}.${ext}`;
      const path = `${user.id}/wardrobe/${fileName}`;

      const formData = new FormData();
      formData.append('file', { uri: photo, name: fileName, type: `image/${ext}` } as any);

      const { error: uploadError } = await supabase.storage
        .from('wardrobe')
        .upload(path, formData);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('wardrobe').getPublicUrl(path);

      const { error: insertError } = await supabase.from('wardrobe_items').insert({
        user_id: user.id,
        photo_url: data.publicUrl,
        category,
        name: category,
      });
      if (insertError) throw insertError;

      supabase.from('analytics_events').insert({
        user_id: user.id,
        event: 'wardrobe_item_added',
        properties: { category },
      });

      setPhoto(null);
      setCategory('');
      router.replace('/(tabs)/wardrobe');
    } catch (e: any) {
      console.error('saveItem error:', e);
      Alert.alert('上傳失敗', e?.message ?? '請稍後再試');
    }
    setUploading(false);
  }

  const canSave = photo && category && !uploading;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>DRIP</Text>
        </View>

        <Text style={styles.stepLabel}>新增單品</Text>
        <Text style={styles.title}>上傳照片</Text>

        {/* Photo picker */}
        {photo ? (
          <TouchableOpacity onPress={pickPhoto} style={styles.preview}>
            <Image source={{ uri: photo }} style={styles.previewImg} />
            <View style={styles.previewOverlay}>
              <Text style={styles.previewChange}>點擊更換</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
              <IconSymbol name="camera.fill" size={28} color="#9CE41C" />
              <Text style={styles.photoBtnText}>拍攝照片</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
              <IconSymbol name="photo.on.rectangle" size={28} color="#9CE41C" />
              <Text style={styles.photoBtnText}>從相簿選擇</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Category */}
        <Text style={styles.sectionLabel}>類別</Text>
        <View style={styles.chips}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={saveItem}
          disabled={!canSave}
        >
          {uploading
            ? <ActivityIndicator color="#0a0a0a" />
            : <Text style={styles.saveBtnText}>加入衣櫃 →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { marginTop: 16, marginBottom: 32 },
  logo: { fontSize: 14, color: '#9CE41C', letterSpacing: 6, fontWeight: '800' },
  stepLabel: { fontSize: 14, color: '#666666', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 24 },

  photoActions: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  photoBtn: {
    flex: 1, borderWidth: 1, borderColor: '#555555', borderStyle: 'dashed',
    paddingVertical: 40, alignItems: 'center', gap: 12,
  },
  photoBtnText: { fontSize: 14, color: '#888888', letterSpacing: 1 },

  preview: { marginBottom: 32 },
  previewImg: { width: '100%', height: 280, resizeMode: 'cover' },
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 14, alignItems: 'center',
  },
  previewChange: { fontSize: 14, color: '#aaaaaa', letterSpacing: 1 },

  sectionLabel: { fontSize: 14, color: '#666666', letterSpacing: 2, marginBottom: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 40 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#333333' },
  chipActive: { borderColor: '#9CE41C', backgroundColor: '#9CE41C' },
  chipText: { fontSize: 14, color: '#888888', letterSpacing: 1 },
  chipTextActive: { color: '#0a0a0a', fontWeight: '800' },

  saveBtn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
});

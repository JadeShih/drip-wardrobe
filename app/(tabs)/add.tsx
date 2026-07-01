import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { removeBackground } from '@/lib/background-removal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors } from '@/constants/tokens';

const CATEGORIES = ['上衣', '下著', '外套', '鞋子', '配件'];

export default function AddScreen() {
  const { user } = useAuth();
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);

  async function processPhoto(uri: string) {
    setRemovingBg(true);
    try {
      const processed = await removeBackground(uri);
      setPhoto(processed);
    } catch (e: any) {
      if (e?.message === 'QUOTA_EXHAUSTED') {
        Alert.alert('去背額度已用完', '將使用原始照片繼續，可至 PhotoRoom 升級方案。');
      }
      setPhoto(uri); // fallback to original
    }
    setRemovingBg(false);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相機權限', '請在設定中允許相機存取');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
    if (!result.canceled) processPhoto(result.assets[0].uri);
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.8 });
    if (!result.canceled) processPhoto(result.assets[0].uri);
  }

  async function saveItem() {
    if (!photo || !name.trim() || !category || !user) return;
    setUploading(true);
    try {
      // After removeBackground the file is always PNG; fall back to original ext
      const isPng = photo.endsWith('.png');
      const ext = isPng ? 'png' : (photo.split('.').pop()?.split('?')[0] ?? 'jpg');
      const fileName = `${Date.now()}.${ext}`;
      const path = `${user.id}/wardrobe/${fileName}`;

      const imgResponse = await fetch(photo);
      const arrayBuffer = await imgResponse.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('wardrobe')
        .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('wardrobe').getPublicUrl(path);

      const { error: insertError } = await supabase.from('wardrobe_items').insert({
        user_id: user.id,
        photo_url: data.publicUrl,
        category,
        name: name.trim(),
        brand: brand.trim() || null,
      });
      if (insertError) throw insertError;

      supabase.from('analytics_events').insert({
        user_id: user.id,
        event: 'wardrobe_item_added',
        properties: { category, name: name.trim() },
      });

      setPhoto(null);
      setName('');
      setBrand('');
      setCategory('');
      router.replace('/(tabs)/wardrobe');
    } catch (e: any) {
      console.error('saveItem error:', e);
      Alert.alert('上傳失敗', e?.message ?? '請稍後再試');
    }
    setUploading(false);
  }

  const canSave = photo && name.trim() && category && !uploading && !removingBg;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>DRIP</Text>
        </View>

        <Text style={styles.stepLabel}>新增單品</Text>
        <Text style={styles.title}>上傳照片</Text>

        {/* Photo picker */}
        {removingBg ? (
          <View style={styles.removingBgBox}>
            <ActivityIndicator color={colors.brand.primary} size="small" />
            <Text style={styles.removingBgText}>自動去背中...</Text>
          </View>
        ) : photo ? (
          <TouchableOpacity onPress={pickPhoto} style={styles.preview}>
            <Image
              source={{ uri: photo }}
              style={styles.previewImg}
              resizeMode="contain"
            />
            <View style={styles.previewOverlay}>
              <Text style={styles.previewChange}>點擊更換</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <IconSymbol name="camera.fill" size={28} color={colors.brand.primary} />
                <Text style={styles.photoBtnText}>拍攝照片</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <IconSymbol name="photo.on.rectangle" size={28} color={colors.brand.primary} />
                <Text style={styles.photoBtnText}>從相簿選擇</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.photoTip}>
              <View style={styles.photoTipDot} />
              <Text style={styles.photoTipText}>建議使用白色或淺色背景拍攝，去背效果更佳</Text>
            </View>
          </>
        )}

        {/* Name */}
        <Text style={styles.sectionLabel}>名稱</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例：白色牛津衫"
          placeholderTextColor={colors.text.disabled}
          cursorColor={colors.brand.primary}
          selectionColor={colors.brand.primary}
        />

        {/* Brand */}
        <Text style={styles.sectionLabel}>品牌（選填）</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="例：Uniqlo"
          placeholderTextColor={colors.text.disabled}
          cursorColor={colors.brand.primary}
          selectionColor={colors.brand.primary}
        />

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
            ? <ActivityIndicator color={colors.text.onBrand} />
            : <Text style={styles.saveBtnText}>加入衣櫃 →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  inner: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { marginTop: 16, marginBottom: 32 },
  logo: { fontSize: 14, color: colors.brand.primary, letterSpacing: 6, fontWeight: '800' },
  stepLabel: { fontSize: 14, color: colors.text.placeholder, letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text.primary, letterSpacing: -0.5, marginBottom: 24 },

  photoActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  photoBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border.dashed, borderStyle: 'dashed',
    paddingVertical: 40, alignItems: 'center', gap: 12,
  },
  photoBtnText: { fontSize: 14, color: colors.text.secondary, letterSpacing: 1 },
  photoTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 24 },
  photoTipDot: { width: 5, height: 5, backgroundColor: colors.brand.primary, marginTop: 5 },
  photoTipText: { flex: 1, fontSize: 12, color: colors.text.disabled, lineHeight: 18, letterSpacing: 0.3 },

  removingBgBox: {
    height: 280, alignItems: 'center', justifyContent: 'center',
    gap: 12, borderWidth: 1, borderColor: colors.border.default, marginBottom: 32,
  },
  removingBgText: { fontSize: 13, color: colors.text.placeholder, letterSpacing: 1 },

  preview: { marginBottom: 32 },
  previewImg: { width: '100%', height: 280 },
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 14, alignItems: 'center',
  },
  previewChange: { fontSize: 14, color: '#aaaaaa', letterSpacing: 1 },

  sectionLabel: { fontSize: 14, color: colors.text.placeholder, letterSpacing: 2, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#333333',
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: colors.text.primary, marginBottom: 24, letterSpacing: 0.5,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 40 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#333333' },
  chipActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary },
  chipText: { fontSize: 14, color: colors.text.secondary, letterSpacing: 1 },
  chipTextActive: { color: colors.text.onBrand, fontWeight: '800' },

  saveBtn: { backgroundColor: colors.brand.primary, paddingVertical: 18, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: colors.text.onBrand, fontWeight: '800', fontSize: 14, letterSpacing: 2 },
});

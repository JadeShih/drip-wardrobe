import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors } from '@/constants/tokens';

const CATEGORIES = ['上衣', '下著', '外套', '鞋子', '配件'];

export default function ItemEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null); // local URI if user picked new photo
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('wardrobe_items')
        .select('name, category, brand, photo_url')
        .eq('id', id)
        .single();
      if (data) {
        setName(data.name ?? '');
        setCategory(data.category ?? '');
        setBrand(data.brand ?? '');
        const signedUrl = await getSignedUrl(data.photo_url ?? null);
        setExistingPhotoUrl(signedUrl);
      }
      setLoading(false);
    })();
  }, [id]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.8 });
    if (!result.canceled) setNewPhotoUri(result.assets[0].uri);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相機權限', '請在設定中允許相機存取');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
    if (!result.canceled) setNewPhotoUri(result.assets[0].uri);
  }

  async function save() {
    if (!name.trim() || !category || !user) {
      Alert.alert('請填寫名稱並選擇類別');
      return;
    }
    setSaving(true);
    try {
      let photoUrl = existingPhotoUrl;

      // Upload new photo if selected
      if (newPhotoUri) {
        const ext = newPhotoUri.split('.').pop()?.split('?')[0] ?? 'jpg';
        const fileName = `${Date.now()}.${ext}`;
        const path = `${user.id}/wardrobe/${fileName}`;

        const imgResponse = await fetch(newPhotoUri);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from('wardrobe')
          .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('wardrobe').getPublicUrl(path);
        photoUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from('wardrobe_items')
        .update({
          name: name.trim(),
          category,
          brand: brand.trim() || null,
          photo_url: photoUrl,
        })
        .eq('id', id);

      if (error) throw error;
      router.back();
    } catch (e: any) {
      Alert.alert('儲存失敗', e?.message ?? '請稍後再試');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const displayPhoto = newPhotoUri ?? existingPhotoUrl;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← 返回</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.stepLabel}>編輯單品</Text>
        <Text style={styles.title}>更新資訊</Text>

        {/* Photo */}
        <Text style={styles.fieldLabel}>照片</Text>
        {displayPhoto ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: displayPhoto }} style={styles.previewImg} />
            {/* Change photo actions */}
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.previewBtn} onPress={takePhoto}>
                <IconSymbol name="camera.fill" size={16} color={colors.brand.primary} />
                <Text style={styles.previewBtnText}>拍攝</Text>
              </TouchableOpacity>
              <View style={styles.previewDivider} />
              <TouchableOpacity style={styles.previewBtn} onPress={pickPhoto}>
                <IconSymbol name="photo.on.rectangle" size={16} color={colors.brand.primary} />
                <Text style={styles.previewBtnText}>從相簿選擇</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
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
        )}

        {/* Name */}
        <Text style={styles.fieldLabel}>名稱</Text>
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
        <Text style={styles.fieldLabel}>品牌（選填）</Text>
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
        <Text style={styles.fieldLabel}>類別</Text>
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
          style={[styles.saveBtn, (!name.trim() || !category || saving) && styles.saveBtnDisabled]}
          onPress={save}
          disabled={!name.trim() || !category || saving}
        >
          {saving
            ? <ActivityIndicator color={colors.text.onBrand} />
            : <Text style={styles.saveBtnText}>儲存變更 →</Text>
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
  back: { fontSize: 14, color: colors.brand.primary, fontWeight: '700', letterSpacing: 1 },
  stepLabel: { fontSize: 14, color: colors.text.placeholder, letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text.primary, letterSpacing: -0.5, marginBottom: 32 },
  fieldLabel: { fontSize: 14, color: colors.text.placeholder, letterSpacing: 2, marginBottom: 12 },

  // Photo — no existing photo
  photoActions: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  photoBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border.dashed, borderStyle: 'dashed',
    paddingVertical: 36, alignItems: 'center', gap: 10,
  },
  photoBtnText: { fontSize: 14, color: colors.text.secondary, letterSpacing: 1 },

  // Photo — has photo
  previewWrap: { marginBottom: 28 },
  previewImg: { width: '100%', height: 260, resizeMode: 'cover', backgroundColor: colors.background.card },
  previewActions: {
    flexDirection: 'row', borderWidth: 1, borderColor: colors.border.default,
    borderTopWidth: 0,
  },
  previewBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12,
  },
  previewBtnText: { fontSize: 14, color: colors.text.secondary, letterSpacing: 1 },
  previewDivider: { width: 1, backgroundColor: colors.border.default },

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

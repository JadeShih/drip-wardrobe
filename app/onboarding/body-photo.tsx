import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { removeBackground } from '@/lib/background-removal';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function BodyPhotoScreen() {
  const { user } = useAuth();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromProfile = from === 'profile';
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);

  async function processPhoto(uri: string) {
    setRemovingBg(true);
    const processed = await removeBackground(uri);
    setRemovingBg(false);
    // Confirm before setting
    Alert.alert(
      '確認使用這張照片？',
      '確認後將自動去背並上傳。',
      [
        { text: '重新選擇', style: 'cancel' },
        { text: '確認使用', onPress: () => setPhoto(processed) },
      ]
    );
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相機權限', '請在設定中允許相機存取');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false, quality: 0.8,
    });
    if (!result.canceled) processPhoto(result.assets[0].uri);
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false, quality: 0.8,
    });
    if (!result.canceled) processPhoto(result.assets[0].uri);
  }

  async function saveAndFinish() {
    if (!user) return;
    setUploading(true);
    try {
      if (photo) {
        const isPng = photo.endsWith('.png');
        const ext = isPng ? 'png' : (photo.split('.').pop()?.split('?')[0] ?? 'jpg');
        const fileName = `body-photo-${Date.now()}.${ext}`;
        const path = `${user.id}/${fileName}`;

        const imgResponse = await fetch(photo);
        const arrayBuffer = await imgResponse.arrayBuffer();
        console.log('arrayBuffer byteLength:', arrayBuffer.byteLength);

        const { error: uploadError } = await supabase.storage
          .from('wardrobe')
          .upload(path, arrayBuffer, { contentType: `image/${ext}` });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('wardrobe').getPublicUrl(path);
        const publicUrl = data.publicUrl;

        const { error: updateError } = await supabase.from('users').update({
          body_photo_url: publicUrl,
          ...(fromProfile ? {} : { onboarding_completed: true }),
        }).eq('id', user.id);
        if (updateError) throw updateError;

        supabase.from('analytics_events').insert({ user_id: user.id, event: 'body_photo_uploaded' });
      } else if (!fromProfile) {
        await supabase.from('users').update({ onboarding_completed: true }).eq('id', user.id);
        supabase.from('analytics_events').insert({ user_id: user.id, event: 'body_photo_skipped' });
      }
      if (!fromProfile) {
        supabase.from('analytics_events').insert({ user_id: user.id, event: 'onboarding_completed' });
      }
    } catch (e) {
      console.error(e);
    }
    setUploading(false);
    if (fromProfile) router.back();
    else router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        {fromProfile && (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← 返回</Text>
          </TouchableOpacity>
        )}
        <View style={styles.top}>
          <Text style={styles.label}>{fromProfile ? '更換全身照' : '最後一步'}</Text>
          <Text style={styles.title}>上傳你的{'\n'}全身照</Text>
          <Text style={styles.desc}>
            建議穿著貼身衣物拍攝（如運動背心＋短褲），穿搭合成效果更準確自然。
          </Text>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>拍攝建議</Text>
            {[
              '正面站立，雙腳與肩同寬',
              '雙手自然垂放身側',
              '純色背景，白牆最佳',
              '確保全身都在畫面內',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tip}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {removingBg ? (
          <View style={styles.removingBgBox}>
            <ActivityIndicator color="#9CE41C" size="small" />
            <Text style={styles.removingBgText}>自動去背中...</Text>
          </View>
        ) : photo ? (
          <TouchableOpacity onPress={pickPhoto} style={styles.preview}>
            <Image source={{ uri: photo }} style={styles.previewImg} resizeMode="contain" />
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

        <TouchableOpacity
          style={[styles.btn, (uploading || removingBg) && styles.btnDisabled]}
          onPress={saveAndFinish}
          disabled={uploading || removingBg}
        >
          <Text style={styles.btnText}>
            {uploading ? '儲存中...' : removingBg ? '處理中...' : photo ? '儲存並開始 →' : '略過，直接開始 →'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { paddingHorizontal: 24, paddingBottom: 40 },
  backBtn: { marginTop: 16, marginBottom: 8 },
  backText: { fontSize: 14, color: '#9CE41C', fontWeight: '700', letterSpacing: 1 },
  top: { marginTop: 24 },
  label: { fontSize: 14, color: '#9CE41C', letterSpacing: 2, marginBottom: 16 },
  title: {
    fontSize: 36, fontWeight: '900', color: '#fff',
    letterSpacing: -0.5, lineHeight: 40, marginBottom: 16,
  },
  desc: { fontSize: 14, color: '#888888', lineHeight: 22, marginBottom: 16 },
  tips: { borderWidth: 1, borderColor: '#222222', padding: 16, gap: 10 },
  tipsTitle: { fontSize: 14, color: '#999999', letterSpacing: 2, marginBottom: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  tipDot: { width: 8, height: 8, backgroundColor: '#9CE41C' },
  tip: { fontSize: 14, color: '#888888', flex: 1 },
  photoActions: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', marginVertical: 32 },
  photoBtn: {
    flex: 1, borderWidth: 1, borderColor: '#555555', borderStyle: 'dashed',
    paddingVertical: 40, alignItems: 'center', gap: 12,
  },
  photoBtnText: { fontSize: 14, color: '#888888', letterSpacing: 1 },
  removingBgBox: {
    width: '100%', aspectRatio: 9 / 16,
    alignItems: 'center', justifyContent: 'center',
    gap: 12, borderWidth: 1, borderColor: '#222', marginVertical: 24,
  },
  removingBgText: { fontSize: 13, color: '#666', letterSpacing: 1 },
  preview: { marginVertical: 24 },
  previewImg: { width: '100%', aspectRatio: 9 / 16 },
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 14, alignItems: 'center',
  },
  previewChange: { fontSize: 14, color: '#aaaaaa', letterSpacing: 1 },
  bottom: {},
  btn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
});

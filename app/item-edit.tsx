import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const CATEGORIES = ['上衣', '下著', '外套', '鞋子', '配件'];

export default function ItemEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('wardrobe_items')
        .select('name, category, brand')
        .eq('id', id)
        .single();
      if (data) {
        setName(data.name ?? '');
        setCategory(data.category ?? '');
        setBrand(data.brand ?? '');
      }
      setLoading(false);
    })();
  }, [id]);

  async function save() {
    if (!name.trim() || !category) {
      Alert.alert('請填寫名稱並選擇類別');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('wardrobe_items')
      .update({
        name: name.trim(),
        category,
        brand: brand.trim() || null,
      })
      .eq('id', id);

    if (error) {
      Alert.alert('儲存失敗', error.message);
    } else {
      router.back();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#9CE41C" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

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

        {/* Name */}
        <Text style={styles.fieldLabel}>名稱</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例：白色牛津衫"
          placeholderTextColor="#444"
          cursorColor="#9CE41C"
          selectionColor="#9CE41C"
        />

        {/* Brand */}
        <Text style={styles.fieldLabel}>品牌（選填）</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="例：Uniqlo"
          placeholderTextColor="#444"
          cursorColor="#9CE41C"
          selectionColor="#9CE41C"
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
            ? <ActivityIndicator color="#0a0a0a" />
            : <Text style={styles.saveBtnText}>儲存變更 →</Text>
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
  back: { fontSize: 14, color: '#9CE41C', fontWeight: '700', letterSpacing: 1 },
  stepLabel: { fontSize: 14, color: '#666666', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 32 },

  fieldLabel: { fontSize: 14, color: '#666666', letterSpacing: 2, marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: '#333333',
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: '#fff', marginBottom: 24,
    letterSpacing: 0.5,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 40 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#333333' },
  chipActive: { borderColor: '#9CE41C', backgroundColor: '#9CE41C' },
  chipText: { fontSize: 14, color: '#888888', letterSpacing: 1 },
  chipTextActive: { color: '#0a0a0a', fontWeight: '800' },

  saveBtn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
});

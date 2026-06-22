import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import DripSplash from '@/components/DripSplash';

const SPLASH_KEY = 'drip:splashShown';

function RootNavigator() {
  const { session, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [splashChecked, setSplashChecked] = useState(false);

  // 檢查是否需要顯示開場動畫
  useEffect(() => {
    AsyncStorage.getItem(SPLASH_KEY).then(val => {
      if (!val) {
        setShowSplash(true);
        AsyncStorage.setItem(SPLASH_KEY, '1');
      }
      setSplashChecked(true);
    });
  }, []);

  useEffect(() => {
    if (loading || !splashChecked) return;
    if (showSplash) return; // 等動畫結束再導航
    navigate();
  }, [session, loading, showSplash, splashChecked]);

  function navigate() {
    if (!session) {
      router.replace('/(auth)/login');
      setChecking(false);
      return;
    }
    supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.onboarding_completed) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding/welcome');
        }
        setChecking(false);
      });
  }

  function handleSplashFinished() {
    setShowSplash(false);
    navigate();
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
      {showSplash && <DripSplash onFinished={handleSplashFinished} />}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

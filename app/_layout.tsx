import { useEffect, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import DripSplash from '@/components/DripSplash';
import OnboardingGuide from '@/components/OnboardingGuide';

const SPLASH_KEY = 'drip:splashShown';
const GUIDE_KEY = 'drip:guideShown';

function RootNavigator() {
  const { session, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [splashChecked, setSplashChecked] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const guideNavigated = useRef(false);

  useEffect(() => {
    // splash 暫時關閉，專注測試新手導覽
    setShowSplash(false);
    setSplashChecked(true);
    setShowGuide(true);
  }, []);

  useEffect(() => {
    if (loading || !splashChecked) return;
    if (showSplash || showGuide) return;
    if (guideNavigated.current) return;
    navigate();
  }, [session, loading, showSplash, showGuide, splashChecked]);

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

  async function handleSplashFinished() {
    setShowSplash(false);
    const seen = await AsyncStorage.getItem(GUIDE_KEY);
    if (!seen) {
      setShowGuide(true);
    } else {
      navigate();
    }
  }

  function handleGuideNavigate() {
    guideNavigated.current = true;
    router.replace('/onboarding/welcome');
  }

  function handleGuideFinished() {
    setShowGuide(false);
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
      {showGuide && <OnboardingGuide onNavigate={handleGuideNavigate} onFinished={handleGuideFinished} />}
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

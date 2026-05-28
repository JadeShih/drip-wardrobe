import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const { width: W } = Dimensions.get('window');
const LETTERS = ['D', 'R', 'I', 'P'];

export default function WelcomeScreen() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name?.split(' ')[0] ?? '你';

  // ── Per-letter animations ─────────────────────────────────────────────────
  const letterAnims = useRef(
    LETTERS.map(() => ({
      translateY: new Animated.Value(-120),
      scale: new Animated.Value(1.6),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // ── Underline draw ────────────────────────────────────────────────────────
  const lineTranslateX = useRef(new Animated.Value(-(W - 48))).current;
  const lineOpacity = useRef(new Animated.Value(0)).current;

  // ── Content fade-up ───────────────────────────────────────────────────────
  const contentTranslateY = useRef(new Animated.Value(40)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const letterDrops = LETTERS.map((_, i) =>
      Animated.parallel([
        Animated.timing(letterAnims[i].opacity, {
          toValue: 1, duration: 200, useNativeDriver: true,
        }),
        Animated.spring(letterAnims[i].translateY, {
          toValue: 0, tension: 80, friction: 9, useNativeDriver: true,
        }),
        Animated.spring(letterAnims[i].scale, {
          toValue: 1, tension: 80, friction: 9, useNativeDriver: true,
        }),
      ])
    );

    Animated.sequence([
      // 1. Letters drop in staggered
      Animated.stagger(90, letterDrops),
      Animated.delay(80),

      // 2. Underline draws left → right
      Animated.parallel([
        Animated.timing(lineOpacity, {
          toValue: 1, duration: 80, useNativeDriver: true,
        }),
        Animated.timing(lineTranslateX, {
          toValue: 0, duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),

      // 3. Content fades up
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1, duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0, duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  async function trackAndContinue() {
    await supabase.from('analytics_events').insert({
      user_id: user?.id,
      event: 'onboarding_started',
    });
    router.push('/onboarding/style-quiz');
  }

  async function trackAndSkip() {
    await supabase.from('analytics_events').insert({
      user_id: user?.id,
      event: 'onboarding_skipped',
    });
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        {/* ── DRIP animated letters ── */}
        <View style={styles.logoArea}>
          <View style={styles.lettersRow}>
            {LETTERS.map((letter, i) => (
              <Animated.Text
                key={letter}
                style={[
                  styles.letter,
                  {
                    opacity: letterAnims[i].opacity,
                    transform: [
                      { translateY: letterAnims[i].translateY },
                      { scale: letterAnims[i].scale },
                    ],
                  },
                ]}
              >
                {letter}
              </Animated.Text>
            ))}
          </View>

          {/* Green underline */}
          <View style={styles.lineContainer}>
            <Animated.View
              style={[
                styles.line,
                {
                  opacity: lineOpacity,
                  transform: [{ translateX: lineTranslateX }],
                },
              ]}
            />
          </View>
        </View>

        {/* ── Content ── */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <Text style={styles.greeting}>嗨，{name}</Text>
          <Text style={styles.title}>認識你的{'\n'}穿搭個性</Text>
          <Text style={styles.desc}>
            只需回答幾個問題，我們就能了解你的穿搭風格，為你打造專屬造型。
          </Text>
        </Animated.View>

        {/* ── Buttons ── */}
        <Animated.View
          style={[
            styles.bottom,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <TouchableOpacity style={styles.btn} onPress={trackAndContinue}>
            <Text style={styles.btnText}>開始 →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={trackAndSkip}>
            <Text style={styles.skip}>暫時略過</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: {
    flex: 1, paddingHorizontal: 24,
    justifyContent: 'space-between', paddingBottom: 40, paddingTop: 48,
  },

  // Logo
  logoArea: { gap: 10 },
  lettersRow: { flexDirection: 'row', gap: 4 },
  letter: {
    fontSize: 76, fontWeight: '900', color: '#ffffff',
    letterSpacing: -2, lineHeight: 84,
  },
  lineContainer: {
    height: 4, overflow: 'hidden',
    width: '100%',
  },
  line: {
    height: 4, width: '100%',
    backgroundColor: '#9CE41C',
  },

  // Content
  content: { flex: 1, justifyContent: 'flex-start', paddingTop: 48 },
  greeting: { fontSize: 14, color: '#888888', letterSpacing: 2, marginBottom: 16 },
  title: {
    fontSize: 40, fontWeight: '900', color: '#fff',
    letterSpacing: -1, lineHeight: 44, marginBottom: 24,
  },
  desc: { fontSize: 15, color: '#666666', lineHeight: 26 },

  // Buttons
  bottom: { gap: 16 },
  btn: { backgroundColor: '#9CE41C', paddingVertical: 18, alignItems: 'center' },
  btnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  skip: { color: '#555555', fontSize: 14, letterSpacing: 1, textAlign: 'center' },
});

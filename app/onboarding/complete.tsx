import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/tokens';

export default function CompleteScreen() {
  const lineWidth   = useRef(new Animated.Value(0)).current;
  const contentOp  = useRef(new Animated.Value(0)).current;
  const contentY   = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(lineWidth, {
        toValue: 1, duration: 500,
        useNativeDriver: false,
      }),
      Animated.parallel([
        Animated.timing(contentOp, {
          toValue: 1, duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(contentY, {
          toValue: 0, duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const lineWidthInterp = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Logo + underline */}
      <View style={styles.logoArea}>
        <Text style={styles.logo}>DRIP</Text>
        <View style={styles.lineContainer}>
          <Animated.View style={[styles.line, { width: lineWidthInterp }]} />
        </View>
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: contentOp, transform: [{ translateY: contentY }] }]}>
        <Text style={styles.title}>你已準備好了</Text>
        <Text style={styles.desc}>
          衣櫃等你來填滿{'\n'}開始打造你的專屬風格
        </Text>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.btnText}>進入 DRIP →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background.primary,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoArea: { marginBottom: 48 },
  logo: {
    fontSize: 64, fontWeight: '900', color: colors.text.primary,
    letterSpacing: 8, marginBottom: 12,
  },
  lineContainer: { height: 4, overflow: 'hidden', width: '100%' },
  line: { height: 4, backgroundColor: colors.brand.primary },
  content: {},
  title: {
    fontSize: 36, fontWeight: '900', color: colors.text.primary,
    letterSpacing: -0.5, marginBottom: 16,
  },
  desc: {
    fontSize: 16, color: colors.text.placeholder, lineHeight: 26,
    marginBottom: 48,
  },
  btn: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 18, alignItems: 'center',
  },
  btnText: {
    color: colors.text.onBrand, fontWeight: '800',
    fontSize: 14, letterSpacing: 2,
  },
});

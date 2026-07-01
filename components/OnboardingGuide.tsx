import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Image, Animated,
} from 'react-native';
import { colors } from '@/constants/tokens';

const { width, height } = Dimensions.get('window');
const IMG_H = width * (844 / 390);

const PAGES = [
  {
    image: require('../assets/modals/guide1_hant.jpg'),
    title1: '你的衣櫃',
    title2: '變聰明了',
    subtitle: '拍照上傳，建立專屬衣物庫',
    last: false,
  },
  {
    image: require('../assets/modals/guide2_hant.jpg'),
    title1: '穿搭靈感',
    title2: '一鍵生成',
    subtitle: '依照場合，快速找到適合搭配',
    last: false,
  },
  {
    image: require('../assets/modals/guide3_hant.jpg'),
    title1: '穿上前',
    title2: '先看見效果',
    subtitle: '虛擬預覽上身效果，看見真實的穿搭',
    last: false,
  },
  {
    image: null,
    title1: '讓我們更懂',
    title2: '你的風格',
    subtitle: '完成基本設定，開始專屬穿搭推薦',
    last: true,
  },
];

interface Props {
  onNavigate: () => void;
  onFinished: () => void;
}

export default function OnboardingGuide({ onNavigate, onFinished }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // 第四頁動畫
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  function handleCtaPress() {
    // 立刻導頁，welcome 在底層載入
    onNavigate();

    // 按鈕縮放回彈
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    // 整頁 fade out + scale up，結束後移除 guide
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.06, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinished());
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        extraData={currentIndex}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        renderItem={({ item }) => (
          item.last ? (
            // 第四頁：fade+scale 動畫容器
            <Animated.View style={[styles.page, styles.lastPage, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.lastBlock}>
                <Text style={styles.lastTitle1}>{item.title1}</Text>
                <Text style={styles.lastTitle2}>{item.title2}</Text>
                <Text style={styles.lastSubtitle}>{item.subtitle}</Text>

                <Animated.View style={[styles.ctaWrap, { transform: [{ scale: btnScale }] }]}>
                  <TouchableOpacity
                    style={styles.ctaBtn}
                    onPress={handleCtaPress}
                    activeOpacity={1}
                  >
                    <Text style={styles.ctaText}>開始建立風格檔案 →</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>
          ) : (
            // 前三頁
            <View style={styles.page}>
              <Image source={item.image!} style={styles.bgImage} resizeMode="cover" />
              <View style={styles.textBlock}>
                <Text style={styles.title1}>{item.title1}</Text>
                <Text style={styles.title2}>{item.title2}</Text>
                <View style={styles.subtitleRow}>
                  <Text style={styles.star}>✦</Text>
                  <Text style={styles.subtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <View style={styles.footer}>
                <Dots currentIndex={currentIndex} />
                <TouchableOpacity
                  onPress={() => flatListRef.current?.scrollToIndex({ index: PAGES.length - 1, animated: true })}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.skip}>全部略過</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        )}
      />
    </View>
  );
}

function Dots({ currentIndex }: { currentIndex: number }) {
  return (
    <View style={styles.dots}>
      {PAGES.map((_, i) => (
        <View key={i} style={i === currentIndex ? styles.dotActive : styles.dotInactive} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
    backgroundColor: colors.background.primary,
  },
  page: {
    width,
    height,
    backgroundColor: colors.background.primary,
  },

  // 前三頁
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height: IMG_H,
  },
  textBlock: {
    position: 'absolute',
    top: 120,
    left: 24,
  },
  title1: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: -1,
    lineHeight: 60,
  },
  title2: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.brand.primary,
    letterSpacing: -1,
    lineHeight: 60,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  star: {
    color: colors.brand.primary,
    fontSize: 12,
  },
  subtitle: {
    color: colors.text.primary,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  footer: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dotActive: {
    width: 14,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
  },
  dotInactive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.text.disabled,
  },
  skip: {
    color: colors.text.secondary,
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // 第四頁
  lastPage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lastTitle1: {
    fontSize: 41,
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: -0.5,
    lineHeight: 52,
    textAlign: 'center',
  },
  lastTitle2: {
    fontSize: 41,
    fontWeight: '900',
    color: colors.brand.primary,
    letterSpacing: -0.5,
    lineHeight: 52,
    textAlign: 'center',
  },
  lastSubtitle: {
    color: '#898989',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  ctaWrap: {
    marginTop: 32,
    alignItems: 'center',
  },
  ctaBtn: {
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: colors.border.dashed,
    width: 260,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    color: colors.text.label,
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});

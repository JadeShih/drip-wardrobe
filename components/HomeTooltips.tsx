import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/tokens';

const { width: W, height: H } = Dimensions.get('window');
const TAB_BAR_H = 49;
const TAB_W = W / 5;

const BUBBLE_W = W - 48;
const BUBBLE_PADDING = 16;
const TAIL_SIZE = 12;

// Tab order: 主頁=0, 衣櫃=1, 探索=2, 新增=3, 個人=4
const STEPS = [
  { target: 'button', text: '先新增一件衣服，讓我們幫你搭配' },
  { target: 'tab0',   text: '回到主頁，隨時查看今日穿搭' },
  { target: 'tab1',   text: '你的虛擬衣櫃，所有服飾一目了然' },
  { target: 'tab2',   text: '探索穿搭靈感，找到下一套心儀搭配' },
  { target: 'tab3',   text: '拍照或上傳，輕鬆建立你的衣櫃' },
  { target: 'tab4',   text: '完善個人資料，讓建議更貼近你' },
];

interface Props {
  btnLayout: { x: number; y: number; width: number; height: number } | null;
  onDone: () => void;
  onSkip: () => void;
}

export default function HomeTooltips({ btnLayout, onDone, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();

  const tabBarTop = H - insets.bottom - TAB_BAR_H;

  function getTarget(): { cx: number; top: number; bottom: number; width: number; height: number } {
    const s = STEPS[step];

    if (s.target === 'button' && btnLayout) {
      return {
        cx: btnLayout.x + btnLayout.width / 2,
        top: btnLayout.y,
        bottom: btnLayout.y + btnLayout.height,
        width: btnLayout.width,
        height: btnLayout.height,
      };
    }

    const tabIndex = parseInt(s.target.replace('tab', ''));
    const cx = (tabIndex + 0.5) * TAB_W;
    return {
      cx,
      top: tabBarTop,
      bottom: H,
      width: TAB_W,
      height: TAB_BAR_H + insets.bottom,
    };
  }

  function advance() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onDone();
  }

  const target = getTarget();
  const PAD = 6;
  const highlightX = target.cx - target.width / 2 - PAD;
  const highlightY = target.top - PAD;
  const highlightW = target.width + PAD * 2;
  const highlightH = target.height + PAD * 2;

  // Bubble: prefer above target, fall back to below
  const bubbleX = 24;
  const spaceAbove = highlightY - TAIL_SIZE - 8;
  const bubbleAbove = spaceAbove > 120; // enough room above?
  const bubbleY = bubbleAbove
    ? highlightY - TAIL_SIZE - 8 // will position bottom edge here
    : target.bottom + TAIL_SIZE + 8;

  // Clamp tail anchor to bubble width
  const tailCx = Math.min(Math.max(target.cx, bubbleX + 24), bubbleX + BUBBLE_W - 24);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Dark overlay — 4 rectangles */}
      <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: Math.max(highlightY, 0) }]} />
      <View style={[styles.overlay, { top: highlightY + highlightH, left: 0, right: 0, bottom: 0 }]} />
      <View style={[styles.overlay, { top: highlightY, height: highlightH, left: 0, width: Math.max(highlightX, 0) }]} />
      <View style={[styles.overlay, { top: highlightY, height: highlightH, left: highlightX + highlightW, right: 0 }]} />

      {/* Highlight border */}
      <View style={[styles.highlight, { left: highlightX, top: highlightY, width: highlightW, height: highlightH }]} />

      {/* Tail (above bubble → points down; below bubble → points up) */}
      {bubbleAbove ? (
        // tail at bottom of bubble pointing down toward target
        <View style={[styles.tailDown, { left: tailCx - TAIL_SIZE, top: bubbleY }]} />
      ) : (
        // tail at top of bubble pointing up toward target
        <View style={[styles.tailUp, { left: tailCx - TAIL_SIZE, top: bubbleY - TAIL_SIZE }]} />
      )}

      {/* Bubble card */}
      <View style={[
        styles.bubble,
        { left: bubbleX, width: BUBBLE_W },
        bubbleAbove ? { bottom: H - bubbleY } : { top: bubbleY },
      ]}>
        <Text style={styles.bubbleText}>{STEPS[step].text}</Text>

        {/* Bottom row: dots + skip + next */}
        <View style={styles.bottomRow}>
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          <TouchableOpacity
            onPress={onSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>跳過</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={advance}>
            <Text style={styles.nextText}>{step === STEPS.length - 1 ? '完成' : '下一步'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const BUBBLE_BG = '#1C1C1C';

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  highlight: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
  },

  // Tail pointing down (bubble above target)
  tailDown: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: TAIL_SIZE,
    borderRightWidth: TAIL_SIZE,
    borderTopWidth: TAIL_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: BUBBLE_BG,
  },
  // Tail pointing up (bubble below target)
  tailUp: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: TAIL_SIZE,
    borderRightWidth: TAIL_SIZE,
    borderBottomWidth: TAIL_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: BUBBLE_BG,
  },

  bubble: {
    position: 'absolute',
    backgroundColor: BUBBLE_BG,
    borderRadius: 12,
    padding: BUBBLE_PADDING,
    gap: 16,
  },
  bubbleText: {
    color: colors.text.primary,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.3,
    fontWeight: '500',
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: colors.brand.primary,
    width: 14,
    borderRadius: 3,
  },
  skipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  nextBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  nextText: {
    color: colors.text.onBrand,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

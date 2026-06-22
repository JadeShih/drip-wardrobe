import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!$%&*';
const DRIP_LETTERS = ['D', 'R', 'I', 'P'];

// ── 節拍時間戳（ms）───────────────────────────────────────────────────────
const WORD_BEATS  = [1161, 2090, 3019, 3948];   // 時尚詞出現時機
const DRIP_BEATS  = [4950, 5414, 5878, 6342];   // D R I P 鎖定時機
const WORDS       = ['STYLE', 'LOOKS', 'FITS', 'WEAR'];
const WORD_COLORS = ['#9CE41C', '#0D1500', '#B4EC47', '#1a1a1a'];

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function isDark(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

interface Props {
  onFinished: () => void;
}

export default function DripSplash({ onFinished }: Props) {
  const [bgColor, setBgColor]       = useState('#0a0a0a');
  const [currentWord, setCurrentWord] = useState('');
  const [chars, setChars]           = useState(DRIP_LETTERS.map(() => randomChar()));
  const [locked, setLocked]         = useState([false, false, false, false]);
  const [dripVisible, setDripVisible] = useState(false);

  const wordOpacity  = useRef(new Animated.Value(0)).current;
  const lineWidth    = useRef(new Animated.Value(0)).current;
  const containerOp  = useRef(new Animated.Value(1)).current;

  const lockedRef = useRef([false, false, false, false]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function later(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  }

  useEffect(() => {
    // ── Phase 1：色塊 + 時尚詞 ──────────────────────────────────────────
    WORD_BEATS.forEach((t, i) => {
      const nextT = WORD_BEATS[i + 1] ?? (t + 929);

      // 色塊亮起
      later(() => setBgColor(WORD_COLORS[i]), t);
      // 200ms 後退回黑色
      later(() => setBgColor('#0a0a0a'), t + 200);

      // 詞出現
      later(() => {
        setCurrentWord(WORDS[i]);
        Animated.timing(wordOpacity, { toValue: 1, duration: 80, useNativeDriver: true }).start();
      }, t + 40);

      // 詞消失（下一拍前 160ms）
      later(() => {
        Animated.timing(wordOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      }, nextT - 160);
    });

    // ── Phase 2：DRIP 亂碼 + 逐字鎖定 ───────────────────────────────────
    const dripStart = DRIP_BEATS[0] - 100;

    later(() => setDripVisible(true), dripStart);

    // 亂碼 interval
    const scrambleId = setInterval(() => {
      setChars(prev =>
        prev.map((c, i) => (lockedRef.current[i] ? DRIP_LETTERS[i] : randomChar()))
      );
    }, 50);
    timers.current.push(scrambleId as any);

    DRIP_BEATS.forEach((t, i) => {
      later(() => {
        lockedRef.current[i] = true;
        setLocked(prev => { const next = [...prev]; next[i] = true; return next; });
        setChars(prev => { const next = [...prev]; next[i] = DRIP_LETTERS[i]; return next; });
      }, t);
    });

    // ── Phase 3：停止亂碼 → 底線 → 淡出 ─────────────────────────────────
    const lastBeat = DRIP_BEATS[DRIP_BEATS.length - 1];

    later(() => {
      clearInterval(scrambleId);
      Animated.timing(lineWidth, {
        toValue: 1, duration: 350,
        useNativeDriver: false,
      }).start();
    }, lastBeat + 150);

    later(() => {
      Animated.timing(containerOp, {
        toValue: 0, duration: 450,
        useNativeDriver: true,
      }).start(() => onFinished());
    }, lastBeat + 750);

    return () => {
      timers.current.forEach(t => clearTimeout(t));
      clearInterval(scrambleId);
    };
  }, []);

  const lineWidthInterp = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const wordColor = isDark(bgColor) ? '#ffffff' : '#0a0a0a';

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, opacity: containerOp }]}>

      {/* 時尚詞 */}
      <Animated.Text style={[styles.word, { opacity: wordOpacity, color: wordColor }]}>
        {currentWord}
      </Animated.Text>

      {/* DRIP */}
      {dripVisible && (
        <View style={styles.dripContent}>
          <View style={styles.lettersRow}>
            {chars.map((char, i) => (
              <Text key={i} style={[styles.letter, locked[i] && styles.letterLocked]}>
                {char}
              </Text>
            ))}
          </View>
          <View style={styles.lineContainer}>
            <Animated.View style={[styles.line, { width: lineWidthInterp }]} />
          </View>
        </View>
      )}

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  word: {
    position: 'absolute',
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
    textAlign: 'center',
  },
  dripContent: { alignItems: 'flex-start' },
  lettersRow: { flexDirection: 'row', gap: 2 },
  letter: {
    fontSize: 72,
    fontWeight: '900',
    color: '#2a2a2a',
    letterSpacing: -2,
    lineHeight: 80,
    width: 48,
    textAlign: 'center',
  },
  letterLocked: { color: '#ffffff' },
  lineContainer: { height: 4, width: '100%', overflow: 'hidden', marginTop: 6 },
  line: { height: 4, backgroundColor: '#9CE41C' },
});

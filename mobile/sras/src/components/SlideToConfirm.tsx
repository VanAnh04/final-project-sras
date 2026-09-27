import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, ActivityIndicator } from 'react-native';
import { ChevronsRight, Check } from 'lucide-react-native';

const KNOB = 52;
const PAD = 4;

/**
 * Thanh "trượt để xác nhận" — kéo núm từ trái sang hết cỡ để kích hoạt onConfirm.
 * Tránh bấm nhầm cho các hành động quan trọng (đã đến / hoàn thành).
 */
export default function SlideToConfirm({
  label,
  color = '#ea580c',
  onConfirm,
  busy = false,
}: {
  label: string;
  color?: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const x = useRef(new Animated.Value(0)).current;
  const startRef = useRef(0);
  const [done, setDone] = useState(false);

  const maxOf = () => Math.max(0, wRef.current - KNOB - PAD * 2);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3,
      onPanResponderGrant: () => x.stopAnimation((v) => (startRef.current = v)),
      onPanResponderMove: (_, g) => {
        const max = maxOf();
        x.setValue(Math.min(max, Math.max(0, startRef.current + g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        const max = maxOf();
        const cur = Math.min(max, Math.max(0, startRef.current + g.dx));
        if (max > 0 && cur >= max - 8) {
          setDone(true);
          Animated.timing(x, { toValue: max, duration: 120, useNativeDriver: true }).start(() => {
            onConfirm();
            // Reset sau một nhịp để lần sau dùng lại được.
            setTimeout(() => {
              setDone(false);
              Animated.timing(x, { toValue: 0, duration: 180, useNativeDriver: true }).start();
            }, 400);
          });
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    })
  ).current;

  const trackFill = x.interpolate({ inputRange: [0, Math.max(1, maxOf())], outputRange: [KNOB + PAD, w], extrapolate: 'clamp' });
  const labelOpacity = x.interpolate({ inputRange: [0, Math.max(1, maxOf() / 2)], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View
      style={[styles.track, { backgroundColor: `${color}14` }]}
      onLayout={(e) => {
        wRef.current = e.nativeEvent.layout.width;
        setW(e.nativeEvent.layout.width);
      }}
    >
      <Animated.View style={[styles.fill, { backgroundColor: `${color}22`, width: trackFill }]} pointerEvents="none" />
      <Animated.Text style={[styles.label, { color, opacity: labelOpacity }]} numberOfLines={1} pointerEvents="none">
        {label}
      </Animated.Text>
      <Animated.View
        style={[styles.knob, { backgroundColor: color, transform: [{ translateX: x }] }]}
        {...(busy || done ? {} : pan.panHandlers)}
      >
        {busy ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : done ? (
          <Check size={22} color="#ffffff" strokeWidth={2.8} />
        ) : (
          <ChevronsRight size={24} color="#ffffff" strokeWidth={2.6} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: KNOB + PAD * 2, borderRadius: (KNOB + PAD * 2) / 2, justifyContent: 'center', overflow: 'hidden',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: (KNOB + PAD * 2) / 2 },
  label: { textAlign: 'center', fontSize: 14.5, fontWeight: '900', letterSpacing: 0.3 },
  knob: {
    position: 'absolute', left: PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
});

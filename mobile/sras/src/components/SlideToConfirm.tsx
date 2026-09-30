import { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, ActivityIndicator } from 'react-native';
import { ChevronsRight, Check } from 'lucide-react-native';

const KNOB = 52;
const PAD = 4;

/**
 * Thanh "trượt để xác nhận" — kéo núm từ trái sang phải để kích hoạt onConfirm.
 * Ngưỡng trượt mượt mà (65% quãng đường) giúp thao tác dễ dàng trên mọi thiết bị.
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

  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const maxOf = () => Math.max(0, wRef.current - KNOB - PAD * 2);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6,
      onPanResponderGrant: () => {
        x.stopAnimation((v) => {
          startRef.current = typeof v === 'number' ? v : 0;
        });
      },
      onPanResponderMove: (_, g) => {
        const max = maxOf();
        const nextVal = Math.min(max, Math.max(0, startRef.current + g.dx));
        x.setValue(nextVal);
      },
      onPanResponderRelease: (_, g) => {
        const max = maxOf();
        const cur = Math.min(max, Math.max(0, startRef.current + g.dx));
        // Ngưỡng trượt thân thiện: chỉ cần qua 60% thanh hoặc cách mép 60px là tự động chốt thành công
        const threshold = Math.max(max * 0.6, max - 60);

        if (max > 0 && cur >= threshold) {
          setDone(true);
          Animated.timing(x, { toValue: max, duration: 140, useNativeDriver: false }).start(() => {
            try {
              onConfirmRef.current?.();
            } catch (err) {
              console.error('onConfirm error:', err);
            }
            setTimeout(() => {
              setDone(false);
              Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: false }).start();
            }, 600);
          });
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
      },
    })
  ).current;

  const trackFill = x.interpolate({
    inputRange: [0, Math.max(1, maxOf())],
    outputRange: [KNOB + PAD, Math.max(KNOB + PAD, w)],
    extrapolate: 'clamp',
  });

  const labelOpacity = x.interpolate({
    inputRange: [0, Math.max(1, maxOf() / 2)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[styles.track, { backgroundColor: `${color}14` }]}
      onLayout={(e) => {
        const measuredWidth = e.nativeEvent.layout.width;
        if (measuredWidth > 0) {
          wRef.current = measuredWidth;
          setW(measuredWidth);
        }
      }}
    >
      <Animated.View
        style={[styles.fill, { backgroundColor: `${color}22`, width: trackFill }]}
        pointerEvents="none"
      />
      <Animated.Text
        style={[styles.label, { color, opacity: labelOpacity }]}
        numberOfLines={1}
        pointerEvents="none"
      >
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
    height: KNOB + PAD * 2,
    borderRadius: (KNOB + PAD * 2) / 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: (KNOB + PAD * 2) / 2,
  },
  label: {
    textAlign: 'center',
    fontSize: 14.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  knob: {
    position: 'absolute',
    left: PAD,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});

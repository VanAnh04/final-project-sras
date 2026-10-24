import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Bot, X, MessageCircleQuestion } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 58;
const BRAND = '#ea580c';

export default function FloatingAiChatBubble() {
  const router = useRouter();

  // Vị trí mặc định ở góc dưới bên phải (trên thanh tab bar)
  const defaultPos = { x: SCREEN_WIDTH - BUBBLE_SIZE - 16, y: SCREEN_HEIGHT - 210 };
  const pan = useRef(new Animated.ValueXY(defaultPos)).current;
  const currentPos = useRef(defaultPos);
  const touchStartTime = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tooltipOpacity = useRef(new Animated.Value(1)).current;

  const [showTooltip, setShowTooltip] = useState(true);
  const isDragging = useRef(false);

  useEffect(() => {
    const listenerId = pan.addListener((value) => {
      currentPos.current = value;
    });
    return () => {
      pan.removeListener(listenerId);
    };
  }, []);

  // Hiệu ứng nhịp đập (pulse) cho bong bóng chat AI
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Tự động thu gọn tooltip sau 10 giây nếu người dùng không tương tác
    const timer = setTimeout(() => {
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowTooltip(false));
    }, 10000);

    return () => {
      pulseLoop.stop();
      clearTimeout(timer);
    };
  }, []);

  // Xử lý kéo thả (PanResponder) với cơ chế snap bám cạnh màn hình
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        touchStartTime.current = Date.now();
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.hypot(gestureState.dx, gestureState.dy) > 8) {
          isDragging.current = true;
          if (showTooltip) setShowTooltip(false);
        }
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const currentX = currentPos.current.x;
        const currentY = currentPos.current.y;

        // Giới hạn trong màn hình
        const minY = 80;
        const maxY = SCREEN_HEIGHT - 160;
        const clampedY = Math.min(Math.max(currentY, minY), maxY);

        // Snap sang cạnh trái hoặc cạnh phải gần nhất
        const snapX = currentX < SCREEN_WIDTH / 2 ? 14 : SCREEN_WIDTH - BUBBLE_SIZE - 14;

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          friction: 6,
          tension: 40,
          useNativeDriver: false,
        }).start();

        const moveDist = Math.hypot(gestureState.dx, gestureState.dy);
        const duration = Date.now() - touchStartTime.current;
        // Nếu chỉ bấm (tap nhẹ) trong vòng 500ms và không dịch chuyển quá 10px thì mở chat
        if (moveDist < 10 && duration < 500) {
          openChat();
        }
      },
    })
  ).current;

  const openChat = () => {
    router.push('/customer/ai-chat');
  };

  const dismissTooltip = () => {
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowTooltip(false));
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* TOOLTIP GỢI Ý BẤM HỎI GARA & GIÁ */}
      {showTooltip && (
        <Animated.View style={[styles.tooltipContainer, { opacity: tooltipOpacity }]}>
          <TouchableOpacity
            style={styles.tooltipPill}
            onPress={openChat}
            activeOpacity={0.88}
          >
            <View style={styles.tooltipIcon}>
              <MessageCircleQuestion size={13} color="#ea580c" />
            </View>
            <Text style={styles.tooltipText} numberOfLines={1}>
              Hỏi gara online & phí di chuyển 💬
            </Text>
            <TouchableOpacity
              style={styles.tooltipClose}
              onPress={dismissTooltip}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={12} color="#94a3b8" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* VÒNG PULSE TOẢ SÁNG CAM */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* BONG BÓNG CHAT CHÍNH (CHAT HEAD) */}
      <View style={styles.bubble}>
        <View style={styles.botIconWrap}>
          <Bot size={28} color="#ffffff" strokeWidth={2.4} />
        </View>

        {/* SPARKLE BADGE NHỎ */}
        <View style={styles.sparkleBadge}>
          <Sparkles size={11} color="#ea580c" strokeWidth={2.6} />
        </View>

        {/* CHẤM ONLINE XANH LÁ */}
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: BUBBLE_SIZE + 14,
    height: BUBBLE_SIZE + 14,
    borderRadius: (BUBBLE_SIZE + 14) / 2,
    backgroundColor: 'rgba(234, 88, 12, 0.22)',
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  botIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#16a34a',
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: BUBBLE_SIZE + 8,
    alignItems: 'center',
  },
  tooltipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 6,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#fed7aa',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    gap: 6,
  },
  tooltipIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1e293b',
    maxWidth: 190,
  },
  tooltipClose: {
    padding: 2,
  },
});

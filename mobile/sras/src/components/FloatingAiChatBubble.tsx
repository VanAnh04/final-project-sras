import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, Zap } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Kích thước chuẩn cho mascot robot cứu hộ dạng bong bóng thoại
const BUBBLE_WIDTH = 72;
const BUBBLE_HEIGHT = 64;

const MASCOT_IMG = require('../../assets/images/ai-rescue-bot-bubble.png');

export default function FloatingAiChatBubble() {
  const router = useRouter();

  // Vị trí mặc định ở góc dưới bên phải (trên thanh tab bar)
  const defaultPos = { x: SCREEN_WIDTH - BUBBLE_WIDTH - 14, y: SCREEN_HEIGHT - 215 };
  const pan = useRef(new Animated.ValueXY(defaultPos)).current;
  const currentPos = useRef(defaultPos);
  const touchStartTime = useRef(0);
  const isDragging = useRef(false);

  // Các hiệu ứng chuyển động animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scalePressAnim = useRef(new Animated.Value(1)).current;
  const tooltipOpacity = useRef(new Animated.Value(1)).current;

  const [showTooltip, setShowTooltip] = useState(true);
  const [isOnRightSide, setIsOnRightSide] = useState(true);

  useEffect(() => {
    const listenerId = pan.addListener((value) => {
      currentPos.current = value;
      // Cập nhật xem bóng đang ở nửa trái hay nửa phải màn hình để quay hướng tooltip phù hợp
      setIsOnRightSide(value.x > SCREEN_WIDTH / 2 - BUBBLE_WIDTH / 2);
    });
    return () => {
      pan.removeListener(listenerId);
    };
  }, []);

  useEffect(() => {
    // 1. Hiệu ứng nhịp đập hào quang phía sau (Aura pulse loop)
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );

    // 2. Hiệu ứng bồng bềnh lơ lửng (Floating wave)
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 3,
          duration: 1800,
          useNativeDriver: false,
        }),
      ])
    );

    pulseLoop.start();
    floatLoop.start();

    // Tự động thu gọn tooltip sau 12 giây nếu người dùng không tương tác
    const timer = setTimeout(() => {
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }).start(() => setShowTooltip(false));
    }, 12000);

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
      clearTimeout(timer);
    };
  }, []);

  // Xử lý kéo thả (PanResponder) với cơ chế hít bám cạnh thông minh
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        touchStartTime.current = Date.now();
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });

        // Co nhẹ khi chạm tay vào
        Animated.spring(scalePressAnim, {
          toValue: 0.92,
          friction: 6,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.hypot(gestureState.dx, gestureState.dy) > 6) {
          isDragging.current = true;
          if (showTooltip) setShowTooltip(false);
        }
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        Animated.spring(scalePressAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: false,
        }).start();

        const currentX = currentPos.current.x;
        const currentY = currentPos.current.y;

        // Giới hạn trong vùng hiển thị an toàn
        const minY = 80;
        const maxY = SCREEN_HEIGHT - 170;
        const clampedY = Math.min(Math.max(currentY, minY), maxY);

        // Hít sang mép trái hoặc phải gần nhất
        const snapX = currentX < SCREEN_WIDTH / 2 ? 14 : SCREEN_WIDTH - BUBBLE_WIDTH - 14;

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          friction: 6,
          tension: 45,
          useNativeDriver: false,
        }).start();

        const moveDist = Math.hypot(gestureState.dx, gestureState.dy);
        const duration = Date.now() - touchStartTime.current;
        // Nếu chỉ chạm nhẹ và không di chuyển nhiều thì mở màn hình chat AI
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
      duration: 250,
      useNativeDriver: false,
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
      {/* TOOLTIP GỢI Ý THÔNG MINH PHONG CÁCH GLASSMORPHISM */}
      {showTooltip && (
        <Animated.View
          style={[
            styles.tooltipContainer,
            isOnRightSide ? styles.tooltipOnRight : styles.tooltipOnLeft,
            { opacity: tooltipOpacity },
          ]}
        >
          <TouchableOpacity
            style={styles.tooltipCard}
            onPress={openChat}
            activeOpacity={0.9}
          >
            {/* Header tooltip: Icon AI + Badge Live */}
            <View style={styles.tooltipHeader}>
              <LinearGradient
                colors={['#ea580c', '#f97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tooltipMiniIcon}
              >
                <Zap size={11} color="#ffffff" strokeWidth={2.8} />
              </LinearGradient>
              <Text style={styles.tooltipBrand}>Trợ lý SRAS</Text>
              <View style={styles.livePill}>
                <View style={styles.livePillDot} />
                <Text style={styles.livePillText}>24/7</Text>
              </View>

              <TouchableOpacity
                style={styles.tooltipCloseBtn}
                onPress={dismissTooltip}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={13} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Nội dung gợi ý chính */}
            <View style={styles.tooltipBody}>
              <Text style={styles.tooltipTitle} numberOfLines={1}>
                Hỏi gara online & báo giá ngay
              </Text>
              <ChevronRight size={14} color="#ea580c" strokeWidth={2.6} />
            </View>

            {/* Mũi tên nhọn hướng về bóng */}
            <View
              style={[
                styles.tooltipArrow,
                isOnRightSide ? styles.tooltipArrowRight : styles.tooltipArrowLeft,
              ]}
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* KHỐI NỘI DUNG MASCOT VÀ AURA BỒNG BỀNH (NATIVE DRIVER) */}
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: floatAnim }],
        }}
      >
        {/* VÒNG HÀO QUANG PHÁT SÁNG TOẢ NHỊP THỞ PHÍA SAU (AURA) */}
        <Animated.View
          style={[
            styles.auraRing,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(251, 146, 60, 0.45)', 'rgba(234, 88, 12, 0.08)', 'transparent']}
            style={styles.auraGradient}
          />
        </Animated.View>

        {/* BONG BÓNG CHAT ROBOT CỨU HỘ CHÍNH (MASCOT BUBBLE) */}
        <Animated.View
          style={[
            styles.mascotWrapper,
            {
              transform: [{ scale: scalePressAnim }],
            },
          ]}
        >
          <Image
            source={MASCOT_IMG}
            style={styles.mascotImage}
            resizeMode="contain"
          />

          {/* CHẤM RADAR TRỰC TUYẾN XANH NGỌC (LIVE 24/7 BADGE) */}
          <View style={styles.radarStatusWrap}>
            <View style={styles.radarPulseRing} />
            <View style={styles.radarCenterDot} />
          </View>
        </Animated.View>
      </Animated.View>
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
  // Hào quang tỏa sáng phát xung
  auraRing: {
    position: 'absolute',
    width: BUBBLE_WIDTH + 18,
    height: BUBBLE_HEIGHT + 18,
    borderRadius: (BUBBLE_WIDTH + 18) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraGradient: {
    width: '100%',
    height: '100%',
    borderRadius: (BUBBLE_WIDTH + 18) / 2,
  },
  mascotWrapper: {
    width: BUBBLE_WIDTH,
    height: BUBBLE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 10,
    position: 'relative',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  // Chấm radar xanh lá trực tuyến
  radarStatusWrap: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarPulseRing: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#ffffff',
  },
  radarCenterDot: {
    width: 9.5,
    height: 9.5,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },

  // TOOLTIP DẠNG THẺ CAO CẤP (GLASSMORPHISM)
  tooltipContainer: {
    position: 'absolute',
    bottom: BUBBLE_HEIGHT + 8,
    zIndex: 10000,
  },
  tooltipOnRight: {
    right: 0,
    alignItems: 'flex-end',
  },
  tooltipOnLeft: {
    left: 0,
    alignItems: 'flex-start',
  },
  tooltipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#ffedd5',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 200,
    position: 'relative',
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tooltipMiniIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.3,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  livePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
  },
  livePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  tooltipCloseBtn: {
    marginLeft: 'auto',
    padding: 2,
  },
  tooltipBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  // Mũi tên tam giác hướng xuống quả cầu
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: '#ffffff',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#ffedd5',
    transform: [{ rotate: '45deg' }],
  },
  tooltipArrowRight: {
    right: 22,
  },
  tooltipArrowLeft: {
    left: 22,
  },
});

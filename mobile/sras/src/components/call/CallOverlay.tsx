import { useEffect, useState, type ReactNode } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Mic, MicOff, Phone, PhoneOff } from 'lucide-react-native';
import { resolveFileUrl } from '../../api/axiosClient';
import { useAuth } from '../../contexts/AuthContext';
import { callManager, useCallState, type CallUiState } from '../../realtime/callManager';
import { PEER_LABEL, formatDuration } from '../../utils/call';
import CallEngine from './CallEngine';

const BRAND = '#ea580c';
const BRAND_DARK = '#c2410c';
const GREEN = '#16a34a';
const RED = '#dc2626';

/** Số giây đã nói chuyện, cập nhật mỗi giây từ lúc `connectedAt` có giá trị. */
function useElapsedSeconds(connectedAt: number | null): number {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (connectedAt == null) return;
    const first = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [connectedAt]);
  return connectedAt != null && now != null ? Math.max(0, Math.floor((now - connectedAt) / 1000)) : 0;
}

function statusLine(s: CallUiState, elapsed: number): string {
  switch (s.phase) {
    case 'outgoing':
      return 'Đang gọi…';
    case 'incoming':
      return 'Cuộc gọi đến…';
    case 'connecting':
      return 'Đang kết nối…';
    case 'active':
      return s.reconnecting ? 'Đang kết nối lại…' : formatDuration(elapsed);
    case 'ended':
      return s.endText ?? 'Cuộc gọi kết thúc';
    default:
      return '';
  }
}

function RoundButton({
  label,
  onPress,
  background,
  children,
}: {
  label: string;
  onPress: () => void;
  background: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.btnWrap}>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: background }]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {children}
      </TouchableOpacity>
      <Text style={styles.btnLabel}>{label}</Text>
    </View>
  );
}

/**
 * Giao diện cuộc gọi nổi trên mọi màn: màn toàn màn hình (đổ chuông / đang gọi / đang nói), thanh thu nhỏ,
 * và WebView ẩn chạy WebRTC. Gắn một lần ở `_layout.tsx` gốc, bên trong AuthProvider.
 */
export default function CallOverlay() {
  const { user } = useAuth();
  const state = useCallState();
  const insets = useSafeAreaInsets();
  const elapsed = useElapsedSeconds(state.connectedAt);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);

  // Đăng ký nhận sự kiện cuộc gọi theo người dùng đang đăng nhập.
  useEffect(() => {
    if (user?.id == null) return;
    return callManager.init(user.id);
  }, [user?.id]);

  const visible = state.phase !== 'idle' && !state.minimized;
  const showBar =
    state.minimized && (state.phase === 'outgoing' || state.phase === 'connecting' || state.phase === 'active');

  const avatar = resolveFileUrl(state.peerAvatarUrl);
  const showAvatarImage = !!avatar && failedAvatar !== avatar;
  const initial = (state.peerName.trim()[0] || '?').toUpperCase();
  const inCall = state.phase === 'outgoing' || state.phase === 'connecting' || state.phase === 'active';

  return (
    <>
      {/* Đặt NGOÀI Modal: thu nhỏ màn gọi không làm unmount engine nên cuộc gọi không bị ngắt. */}
      {state.engineMounted && <CallEngine />}

      <Modal
        visible={visible}
        animationType="fade"
        // iOS: kiểu mặc định `fullScreen` gỡ màn hình bên dưới khỏi cửa sổ → WebView ẩn (engine WebRTC) bị WebKit coi là
        // "không hiển thị" và không chạy tiếp. `overFullScreen` giữ màn dưới trong cửa sổ (màn gọi vẫn phủ kín bằng nền gradient).
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          // Đang đổ chuông thì phải chọn Nghe / Từ chối; các pha khác Back = thu nhỏ.
          if (state.phase !== 'incoming') callManager.setMinimized(true);
        }}
      >
        <LinearGradient
          colors={[BRAND, BRAND_DARK]}
          style={[styles.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>Cuộc gọi thoại miễn phí · SRAS</Text>
            {!!state.rescueCode && <Text style={styles.code}>Đơn {state.rescueCode}</Text>}
          </View>

          <View style={styles.center}>
            {showAvatarImage ? (
              <Image source={{ uri: avatar }} style={styles.avatar} onError={() => setFailedAvatar(avatar ?? null)} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <Text style={styles.name} numberOfLines={2}>
              {state.peerName}
            </Text>
            {!!state.peerRole && <Text style={styles.role}>{PEER_LABEL[state.peerRole]}</Text>}
            <Text style={[styles.status, state.phase === 'active' && !state.reconnecting && styles.timer]}>
              {statusLine(state, elapsed)}
            </Text>
          </View>

          <View style={styles.actions}>
            {state.phase === 'incoming' && (
              <>
                <RoundButton label="Từ chối" background={RED} onPress={() => callManager.reject()}>
                  <PhoneOff size={30} color="#ffffff" strokeWidth={2.4} />
                </RoundButton>
                <RoundButton label="Nghe" background={GREEN} onPress={() => callManager.accept()}>
                  <Phone size={30} color="#ffffff" strokeWidth={2.4} />
                </RoundButton>
              </>
            )}

            {inCall && (
              <>
                <RoundButton
                  label={state.muted ? 'Bật mic' : 'Tắt mic'}
                  background={state.muted ? '#ffffff' : 'rgba(255,255,255,0.22)'}
                  onPress={() => callManager.toggleMute()}
                >
                  {state.muted ? (
                    <MicOff size={28} color={BRAND_DARK} strokeWidth={2.4} />
                  ) : (
                    <Mic size={28} color="#ffffff" strokeWidth={2.4} />
                  )}
                </RoundButton>
                <RoundButton
                  label="Thu nhỏ"
                  background="rgba(255,255,255,0.22)"
                  onPress={() => callManager.setMinimized(true)}
                >
                  <ChevronDown size={30} color="#ffffff" strokeWidth={2.4} />
                </RoundButton>
                <RoundButton label="Kết thúc" background={RED} onPress={() => callManager.hangup()}>
                  <PhoneOff size={30} color="#ffffff" strokeWidth={2.4} />
                </RoundButton>
              </>
            )}
          </View>
        </LinearGradient>
      </Modal>

      {/* Thanh thu nhỏ: chạm để quay lại màn gọi. */}
      {showBar && (
        <Pressable
          onPress={() => callManager.setMinimized(false)}
          style={[styles.bar, { top: insets.top + 6 }]}
          accessibilityRole="button"
          accessibilityLabel="Quay lại cuộc gọi"
        >
          <View style={styles.barDot} />
          <Text style={styles.barText} numberOfLines={1}>
            {state.peerName} · {statusLine(state, elapsed)}
          </Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },

  header: { alignItems: 'center', gap: 4 },
  brand: { color: '#ffffff', fontSize: 13.5, fontWeight: '700', letterSpacing: 0.2 },
  code: { color: '#ffedd5', fontSize: 12.5, fontWeight: '600' },

  center: { alignItems: 'center', paddingHorizontal: 8 },
  // Viền trắng để avatar nổi trên nền cam.
  avatar: { width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  avatarFallback: { backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#ffffff', fontSize: 44, fontWeight: '800' },
  name: { marginTop: 20, color: '#ffffff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  role: { marginTop: 6, color: '#ffedd5', fontSize: 15, fontWeight: '600' },
  status: { marginTop: 18, color: '#ffedd5', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  timer: { color: '#ffffff', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },

  actions: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', minHeight: 104 },
  btnWrap: { alignItems: 'center', gap: 8, minWidth: 84 },
  // Viền trắng mờ giúp nút đỏ / xanh không chìm vào nền cam.
  btn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  btnLabel: { color: '#fff7ed', fontSize: 13, fontWeight: '600' },

  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  barDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ffffff' },
  barText: { flex: 1, color: '#ffffff', fontSize: 14.5, fontWeight: '700' },
});

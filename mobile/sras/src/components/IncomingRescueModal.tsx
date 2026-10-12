import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import { Siren, ArrowRight, UserPlus } from 'lucide-react-native';
import { garageApi } from '../api/garageApi';
import { RescueRequestDto } from '../api/rescueApi';
import { useGarageSettings } from '../contexts/GarageSettingsContext';
import RescueOfferDetailModal from './RescueOfferDetailModal';
import AssignStaffModal from './AssignStaffModal';

const POLL_MS = 4000;
const COUNTDOWN_S = 60; // Tăng từ 25s lên 60s để gara có đủ thời gian đọc và xử lý đơn

/**
 * Popup "cuốc cứu hộ mới": icon + số tiền + nút "Xem chi tiết đơn cứu hộ".
 * Bấm vào popup → mở chi tiết yêu cầu → gán nhân viên & xe → gửi cứu hộ.
 */
export default function IncomingRescueModal() {
  const { autoAccept } = useGarageSettings();
  const [offers, setOffers] = useState<RescueRequestDto[]>([]);
  const [autoAccepted, setAutoAccepted] = useState<RescueRequestDto[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [assignFor, setAssignFor] = useState<RescueRequestDto | null>(null);

  const lastSeenId = useRef<number | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const countdownRef = useRef<Animated.CompositeAnimation | null>(null);

  // Poll lời mời đang chờ nhận + đơn vừa được tự động nhận (ACCEPTED, chưa gán nhân viên).
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const [pending, active] = await Promise.all([garageApi.listOffers(), garageApi.listActive()]);
        if (!alive) return;
        setOffers(pending);
        setAutoAccepted(active.filter((r) => r.status === 'ACCEPTED' && !r.staff));
      } catch {
        /* lỗi mạng tạm thời — bỏ qua */
      }
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  // Ưu tiên lời mời chờ nhận (thủ công); nếu không có thì tới đơn đã tự nhận cần gán nhân viên.
  const pendingItem = offers.find((o) => !dismissed.includes(o.id)) ?? null;
  const autoItem = autoAccept ? (autoAccepted.find((o) => !dismissed.includes(o.id)) ?? null) : null;
  const current = pendingItem ?? autoItem;
  const isAuto = !pendingItem && !!autoItem;
  const showPopup = current != null && !showDetail && assignFor == null;

  const dismiss = (id: number) => setDismissed((prev) => [...prev, id]);

  // Rung khi có cuốc mới.
  useEffect(() => {
    if (current && current.id !== lastSeenId.current) {
      lastSeenId.current = current.id;
      Vibration.vibrate([0, 400, 200, 400]);
    }
    if (!current) lastSeenId.current = null;
  }, [current?.id]);

  // Pulse icon.
  useEffect(() => {
    if (!showPopup) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [showPopup, pulse]);

  const stopCountdown = () => { countdownRef.current?.stop(); countdownRef.current = null; };

  // Đếm ngược để chuyển gara khác khi hết giờ (60s). Chỉ áp dụng cho lời mời CHỜ NHẬN thủ công;
  // đơn đã tự động nhận thì không đếm (đã là đơn của gara rồi).
  useEffect(() => {
    stopCountdown();
    if (!showPopup || !current || isAuto) return;
    progress.setValue(1);
    countdownRef.current = Animated.timing(progress, {
      toValue: 0, duration: COUNTDOWN_S * 1000, easing: Easing.linear, useNativeDriver: false,
    });
    countdownRef.current.start(({ finished }) => { if (finished) dismiss(current.id); });
    return stopCountdown;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, isAuto, showPopup]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <>
      <Modal
        visible={showPopup}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => current && dismiss(current.id)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.popup}
            activeOpacity={0.92}
            onPress={() => (isAuto ? setAssignFor(current) : setShowDetail(true))}
          >
            <Text style={styles.kicker}>{isAuto ? 'Đã tự nhận' : 'Đơn Cứu Hộ Mới'}</Text>

            <View style={styles.iconWrap}>
              <Animated.View style={[styles.iconRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
              <Animated.View style={[styles.iconCircle, { transform: [{ scale }] }]}>
                {isAuto
                  ? <UserPlus size={32} color="#ffffff" strokeWidth={2.4} />
                  : <Siren size={34} color="#ffffff" strokeWidth={2.3} />}
              </Animated.View>
            </View>

            <View style={styles.codeWrap}>
              <Text style={styles.codeLabel}>MÃ ĐƠN CỨU HỘ</Text>
              <Text style={styles.codeText}>
                {current?.code ? current.code : (current?.id ? `#${current.id}` : '—')}
              </Text>
            </View>
            {isAuto && <Text style={styles.autoNote}>Đơn đã được nhận tự động</Text>}

            <TouchableOpacity
              style={styles.cta}
              activeOpacity={0.88}
              onPress={() => (isAuto ? setAssignFor(current) : setShowDetail(true))}
            >
              <Text style={styles.ctaText}>
                {isAuto ? 'Gán nhân viên ngay' : 'Xem chi tiết đơn cứu hộ'}
              </Text>
              <ArrowRight size={18} color="#ffffff" strokeWidth={2.6} />
            </TouchableOpacity>

            {!isAuto && (
              <TouchableOpacity
                style={styles.skipBtn}
                activeOpacity={0.7}
                onPress={() => current && dismiss(current.id)}
              >
                <Text style={styles.skipText}>Bỏ qua đơn này</Text>
              </TouchableOpacity>
            )}

            {!isAuto && (
              <View style={styles.countTrack}>
                <Animated.View style={[styles.countFill, { width: barWidth }]} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Thủ công: chi tiết yêu cầu → nhận + gán nhân viên & xe → gửi cứu hộ */}
      <RescueOfferDetailModal
        visible={showDetail}
        request={pendingItem}
        onClose={() => setShowDetail(false)}
        onDecline={() => { if (pendingItem) dismiss(pendingItem.id); setShowDetail(false); }}
        onDispatched={() => { if (pendingItem) dismiss(pendingItem.id); setShowDetail(false); }}
      />

      {/* Auto-accept: đơn đã nhận sẵn → chỉ cần gán nhân viên & xe */}
      <AssignStaffModal
        visible={assignFor != null}
        request={assignFor}
        onClose={() => setAssignFor(null)}
        onAssigned={() => { if (assignFor) dismiss(assignFor.id); setAssignFor(null); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  popup: {
    width: 290, backgroundColor: '#ffffff', borderRadius: 28, paddingTop: 24, paddingBottom: 0, alignItems: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.28, shadowRadius: 24, elevation: 14,
  },
  kicker: { fontSize: 13, fontWeight: '900', color: '#ea580c', letterSpacing: 1.2, textTransform: 'uppercase' },

  iconWrap: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  iconRing: { position: 'absolute', width: 68, height: 68, borderRadius: 34, backgroundColor: '#ea580c' },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },

  codeWrap: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 18,
    paddingVertical: 7,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.6,
  },
  autoNote: { fontSize: 12.5, fontWeight: '700', color: '#059669', marginTop: 4 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#ea580c', alignSelf: 'stretch', marginHorizontal: 16, marginTop: 18, marginBottom: 10,
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 18,
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 10, elevation: 5,
  },
  ctaText: { fontSize: 15, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2, textAlign: 'center' },

  skipBtn: { paddingVertical: 6, paddingHorizontal: 16, marginBottom: 12 },
  skipText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },

  countTrack: { alignSelf: 'stretch', height: 5, backgroundColor: '#f1f5f9' },
  countFill: { height: 5, backgroundColor: '#ea580c' },
});

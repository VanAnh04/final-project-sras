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
import { resolveRescueFee, formatVnd } from '../utils/rescueFee';
import RescueOfferDetailModal from './RescueOfferDetailModal';
import AssignStaffModal from './AssignStaffModal';

const POLL_MS = 4000;
const COUNTDOWN_S = 25; // hết giờ → bỏ qua để hệ thống tìm gara khác

/**
 * Popup "cuốc cứu hộ mới" gọn kiểu Grab: chỉ icon + số tiền + "Đi thôi!".
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

  // Đếm ngược để chuyển gara khác khi hết giờ. Chỉ áp dụng cho lời mời CHỜ NHẬN thủ công;
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
            <Text style={styles.kicker}>{isAuto ? 'Đã tự nhận' : 'Cứu Hộ'}</Text>

            <View style={styles.iconWrap}>
              <Animated.View style={[styles.iconRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
              <Animated.View style={[styles.iconCircle, { transform: [{ scale }] }]}>
                {isAuto
                  ? <UserPlus size={32} color="#ffffff" strokeWidth={2.4} />
                  : <Siren size={34} color="#ffffff" strokeWidth={2.3} />}
              </Animated.View>
            </View>

            <Text style={styles.price}>{current ? formatVnd(resolveRescueFee(current)) : '—'}</Text>
            {isAuto && <Text style={styles.autoNote}>Đơn đã được nhận tự động</Text>}

            <View style={styles.cta}>
              <Text style={styles.ctaText}>{isAuto ? 'Gán nhân viên' : 'Đi thôi!'}</Text>
              <ArrowRight size={20} color="#ffffff" strokeWidth={2.8} />
            </View>

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
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  popup: {
    width: 250, backgroundColor: '#ffffff', borderRadius: 28, paddingTop: 22, paddingBottom: 0, alignItems: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.28, shadowRadius: 24, elevation: 14,
  },
  kicker: { fontSize: 14, fontWeight: '900', color: '#ea580c', letterSpacing: 1.5, textTransform: 'uppercase' },

  iconWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  iconRing: { position: 'absolute', width: 68, height: 68, borderRadius: 34, backgroundColor: '#ea580c' },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },

  price: { fontSize: 34, fontWeight: '900', color: '#0f172a', letterSpacing: -1, marginTop: 12 },
  autoNote: { fontSize: 12.5, fontWeight: '700', color: '#059669', marginTop: 4 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ea580c', alignSelf: 'stretch', marginHorizontal: 18, marginTop: 18, marginBottom: 18,
    paddingVertical: 15, borderRadius: 18,
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 10, elevation: 5,
  },
  ctaText: { fontSize: 17, fontWeight: '900', color: '#ffffff', letterSpacing: 0.4 },

  countTrack: { alignSelf: 'stretch', height: 5, backgroundColor: '#f1f5f9' },
  countFill: { height: 5, backgroundColor: '#ea580c' },
});

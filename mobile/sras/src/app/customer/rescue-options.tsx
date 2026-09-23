import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  Siren,
  MapPin,
  ShieldCheck,
  ListChecks,
  Clock,
} from 'lucide-react-native';

export default function RescueOptionsScreen() {
  const router = useRouter();

  // Nhịp beacon: truyền tín hiệu "đang trực / khẩn cấp" — motion có chủ đích.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color="#0f172a" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu cầu cứu hộ</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        {/* Vị trí hiện tại */}
        <TouchableOpacity style={styles.locationChip} activeOpacity={0.7}>
          <MapPin size={15} color="#ef4444" strokeWidth={2.4} />
          <Text style={styles.locationText} numberOfLines={1}>
            Cầu Giấy, Hà Nội
          </Text>
          <Text style={styles.locationEdit}>Đổi</Text>
        </TouchableOpacity>

        <Text style={styles.prompt}>Bạn cần hỗ trợ thế nào?</Text>
        <Text style={styles.promptSub}>
          Chọn cứu hộ khẩn cấp để hệ thống tự tìm gara gần nhất, hoặc tự chọn dịch vụ và gara.
        </Text>

        {/* 1 — CỨU HỘ KHẨN CẤP (hành động trội) */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => router.push('/customer/rescue-emergency' as any)}
          style={styles.emergencyShadow}
        >
          <LinearGradient
            colors={['#f43f5e', '#ea580c', '#c2410c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emergencyCard}
          >
            <View style={styles.beaconWrap}>
              <Animated.View
                style={[
                  styles.beaconRing,
                  { transform: [{ scale: ringScale }], opacity: ringOpacity },
                ]}
              />
              <View style={styles.beaconCore}>
                <Siren size={26} color="#ffffff" strokeWidth={2.4} />
              </View>
            </View>

            <View style={styles.emergencyTextCol}>
              <Text style={styles.emergencyTitle}>Cứu hộ khẩn cấp</Text>
              <Text style={styles.emergencyDesc}>
                Chọn vị trí, hệ thống quét và điều gara gần nhất tới ngay.
              </Text>

              <View style={styles.emergencyMetaRow}>
                <View style={styles.emergencyPill}>
                  <Clock size={12} color="#ffffff" strokeWidth={2.6} />
                  <Text style={styles.emergencyPillText}>Nhanh nhất</Text>
                </View>
                <View style={styles.emergencyPill}>
                  <Text style={styles.emergencyPillText}>Tự động ghép gara</Text>
                </View>
              </View>
            </View>

            <ChevronRight size={22} color="#ffffff" strokeWidth={2.6} />
          </LinearGradient>
        </TouchableOpacity>

        {/* 2 — CỨU HỘ THEO LỰA CHỌN (phụ) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/customer/map')}
          style={styles.optionCard}
        >
          <View style={styles.optionIconBox}>
            <ListChecks size={24} color="#ea580c" strokeWidth={2.3} />
          </View>
          <View style={styles.optionTextCol}>
            <Text style={styles.optionTitle}>Cứu hộ theo lựa chọn</Text>
            <Text style={styles.optionDesc}>
              Tự chọn loại dịch vụ hoặc gara bạn muốn trước khi gửi yêu cầu.
            </Text>
          </View>
          <ChevronRight size={20} color="#94a3b8" strokeWidth={2.4} />
        </TouchableOpacity>

        {/* Trust strip */}
        <View style={styles.trustRow}>
          <ShieldCheck size={15} color="#059669" strokeWidth={2.4} />
          <Text style={styles.trustText}>
            Mạng lưới gara đã thẩm định · Hỗ trợ 24/7
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  locationEdit: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e11d48',
    marginLeft: 2,
  },
  prompt: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 22,
    letterSpacing: 0.2,
  },
  promptSub: {
    fontSize: 13.5,
    color: '#64748b',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 22,
  },

  /* Emergency card */
  emergencyShadow: {
    borderRadius: 24,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 9,
  },
  emergencyCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  beaconWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beaconRing: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
  },
  beaconCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTextCol: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  emergencyDesc: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 17,
    marginTop: 4,
  },
  emergencyMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  emergencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  emergencyPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Option card */
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
  },
  optionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  optionDesc: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 17,
    marginTop: 4,
  },

  /* Trust */
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 'auto',
    marginBottom: 12,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
});

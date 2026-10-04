import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Siren,
  MapPin,
  SlidersHorizontal,
  Bookmark,
  RefreshCw,
  Navigation,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { goongApi } from '../../api/goongApi';
import LocationPickerModal, { PickedLocation } from '../../components/LocationPickerModal';

// Design tokens — 1 màu nhấn thương hiệu (cam-đỏ cứu hộ), nền trung tính ấm, neutrals warm.
const BRAND = '#ea580c';
const BRAND_DEEP = '#c2410c';
const BG = '#f7f7f5';
const CARD = '#ffffff';
const INK = '#1c1917';
const SUB = '#78716c';
const LINE = '#e7e5e4';

type LocState = 'loading' | 'ready' | 'denied' | 'error';

export default function RescueOptionsScreen() {
  const router = useRouter();

  const [locState, setLocState] = useState<LocState>('loading');
  const [canAsk, setCanAsk] = useState(true);
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Đọc GPS thật của thiết bị rồi reverse-geocode ra tên đường. Không hardcode địa chỉ.
  const locateMe = async () => {
    try {
      setLocState('loading');
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCanAsk(canAskAgain);
        setLocState('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCoord({ lat, lng });
      setLocState('ready');
      try {
        const addr = await goongApi.reverseGeocode(lat, lng);
        if (addr) setAddress(addr);
      } catch {
        /* giữ trạng thái ready dù chưa có tên đường */
      }
    } catch {
      setLocState('error');
    }
  };

  useEffect(() => {
    locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDeniedPress = () => {
    if (canAsk) locateMe();
    else Linking.openSettings();
  };

  const onPickConfirm = (loc: PickedLocation) => {
    setCoord({ lat: loc.lat, lng: loc.lng });
    if (loc.address) setAddress(loc.address);
    setLocState('ready');
    setPickerOpen(false);
  };

  const goEmergency = () => {
    router.push({
      pathname: '/customer/rescue-emergency',
      params: coord
        ? { lat: coord.lat.toFixed(6), lng: coord.lng.toFixed(6), address }
        : {},
    } as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={INK} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu cầu cứu hộ</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.body}>
        {/* Thanh vị trí thật — bấm để đổi */}
        <LocationBar
          state={locState}
          address={address}
          onEdit={() => setPickerOpen(true)}
          onDeniedPress={onDeniedPress}
          onRetry={locateMe}
          canAsk={canAsk}
        />

        {/* Câu hỏi */}
        <Text style={styles.prompt}>Bạn cần hỗ trợ thế nào?</Text>
        <Text style={styles.promptSub}>
          Chọn cứu hộ khẩn cấp để hệ thống tự ghép gara gần nhất, hoặc tự chọn dịch vụ và gara.
        </Text>

        {/* Hành động chính — Cứu hộ khẩn cấp (nền brand đặc, không gradient) */}
        <TouchableOpacity activeOpacity={0.92} onPress={goEmergency} style={styles.emergencyCard}>
          {/* Minh hoạ đường nét: vòng đồng tâm tĩnh, không pulse trang trí */}
          <View style={styles.emblem} pointerEvents="none">
            <View style={styles.emblemRingOuter} />
            <View style={styles.emblemRingInner} />
            <View style={styles.emblemCore}>
              <Siren size={26} color="#ffffff" strokeWidth={2.4} />
            </View>
          </View>

          <View style={styles.emergencyText}>
            <Text style={styles.emergencyTitle}>Cứu hộ khẩn cấp</Text>
            <Text style={styles.emergencyDesc}>
              Chọn vị trí, hệ thống quét và điều gara gần nhất tới ngay.
            </Text>
            {/*
              Thời gian phản hồi trung bình chỉ hiển thị khi backend cung cấp số thật.
              Hiện chưa có endpoint → không hiển thị (không bịa dữ liệu).
            */}
          </View>

          <ChevronRight size={22} color="#ffffff" strokeWidth={2.6} />
        </TouchableOpacity>

        {/* Hành động phụ — Chọn dịch vụ / gara (outline, trọng lượng thấp hơn) */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/customer/map')} style={styles.optionCard}>
          <View style={styles.optionIcon}>
            <SlidersHorizontal size={22} color={BRAND} strokeWidth={2.2} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Chọn dịch vụ / gara</Text>
            <Text style={styles.optionDesc}>Tự chọn loại dịch vụ hoặc gara trước khi gửi yêu cầu.</Text>
          </View>
          <ChevronRight size={20} color={SUB} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Địa chỉ đã lưu — empty-state (chưa có nguồn dữ liệu để lưu địa chỉ) */}
        <View style={styles.savedBlock}>
          <Text style={styles.savedLabel}>Địa chỉ đã lưu</Text>
          <View style={styles.savedEmpty}>
            <View style={styles.savedEmptyIcon}>
              <Bookmark size={18} color={SUB} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.savedEmptyTitle}>Chưa có địa chỉ đã lưu</Text>
              <Text style={styles.savedEmptyDesc}>
                Địa chỉ bạn dùng cho các yêu cầu sẽ xuất hiện ở đây để chọn nhanh.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <LocationPickerModal
        visible={pickerOpen}
        title="Vị trí cứu hộ"
        initial={coord}
        onClose={() => setPickerOpen(false)}
        onConfirm={onPickConfirm}
      />
    </SafeAreaView>
  );
}

/* Thanh vị trí — xử lý đủ trạng thái: loading / ready / denied / error */
function LocationBar({
  state,
  address,
  onEdit,
  onDeniedPress,
  onRetry,
  canAsk,
}: {
  state: LocState;
  address: string;
  onEdit: () => void;
  onDeniedPress: () => void;
  onRetry: () => void;
  canAsk: boolean;
}) {
  if (state === 'loading') {
    return (
      <View style={styles.locBar}>
        <ActivityIndicator size="small" color={BRAND} />
        <Text style={styles.locLoadingText}>Đang lấy vị trí của bạn...</Text>
      </View>
    );
  }

  if (state === 'denied') {
    return (
      <TouchableOpacity style={styles.locBar} activeOpacity={0.8} onPress={onDeniedPress}>
        <View style={styles.locPin}>
          <MapPin size={16} color={BRAND} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.locTitle} numberOfLines={1}>
            Xác định vị trí của bạn
          </Text>
          <Text style={styles.locHint} numberOfLines={1}>
            {canAsk ? 'Cho phép truy cập vị trí để tìm gara gần nhất' : 'Mở Cài đặt để bật quyền vị trí'}
          </Text>
        </View>
        <Text style={styles.locAction}>{canAsk ? 'Cho phép' : 'Cài đặt'}</Text>
      </TouchableOpacity>
    );
  }

  if (state === 'error') {
    return (
      <TouchableOpacity style={styles.locBar} activeOpacity={0.8} onPress={onRetry}>
        <View style={styles.locPin}>
          <MapPin size={16} color={BRAND} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.locTitle}>Không lấy được vị trí</Text>
          <Text style={styles.locHint}>Kiểm tra GPS rồi thử lại</Text>
        </View>
        <RefreshCw size={18} color={BRAND} strokeWidth={2.4} />
      </TouchableOpacity>
    );
  }

  // ready
  return (
    <TouchableOpacity style={styles.locBar} activeOpacity={0.8} onPress={onEdit}>
      <View style={styles.locPin}>
        <Navigation size={16} color={BRAND} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.locCaption}>Vị trí cứu hộ</Text>
        <Text style={styles.locTitle} numberOfLines={1}>
          {address || 'Đang xác định địa chỉ...'}
        </Text>
      </View>
      <Text style={styles.locAction}>Đổi</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: INK },

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  /* Location bar */
  locBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 56,
    paddingVertical: 8,
  },
  locPin: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#fff4ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locCaption: { fontSize: 11, fontWeight: '600', color: SUB, marginBottom: 1 },
  locTitle: { fontSize: 14, fontWeight: '800', color: INK },
  locHint: { fontSize: 12, fontWeight: '600', color: SUB, marginTop: 1 },
  locLoadingText: { fontSize: 14, fontWeight: '600', color: SUB },
  locAction: { fontSize: 12, fontWeight: '800', color: BRAND },

  /* Prompt */
  prompt: { fontSize: 28, fontWeight: '800', color: INK, marginTop: 24 },
  promptSub: { fontSize: 14, fontWeight: '600', color: SUB, lineHeight: 20, marginTop: 8, marginBottom: 24 },

  /* Emergency (primary) */
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: BRAND,
    borderRadius: 20,
    padding: 20,
    // Bóng trung tính nhẹ (không dùng bóng cam)
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  emblem: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  emblemRingOuter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  emblemRingInner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  emblemCore: {
    width: 44,
    height: 44,
    borderRadius: 20,
    backgroundColor: BRAND_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyText: { flex: 1 },
  emergencyTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  emergencyDesc: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.92)', lineHeight: 19, marginTop: 4 },

  /* Option (secondary) */
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff4ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '800', color: INK },
  optionDesc: { fontSize: 12, fontWeight: '600', color: SUB, lineHeight: 17, marginTop: 3 },

  /* Saved addresses — empty state */
  savedBlock: { marginTop: 32 },
  savedLabel: { fontSize: 11, fontWeight: '800', color: SUB, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  savedEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    padding: 14,
  },
  savedEmptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedEmptyTitle: { fontSize: 14, fontWeight: '800', color: INK },
  savedEmptyDesc: { fontSize: 12, fontWeight: '600', color: SUB, lineHeight: 16, marginTop: 2 },
});

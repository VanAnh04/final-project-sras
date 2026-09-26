import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Activity, ChevronRight, MapPin, Clock } from 'lucide-react-native';
import { rescueApi, RescueRequestDto, RescueStatus } from '../../api/rescueApi';

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };

// Trạng thái đang diễn ra (còn theo dõi) vs đã kết thúc.
const ONGOING: RescueStatus[] = [
  'SEARCHING', 'PENDING_GARAGE', 'ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED',
  'DIAGNOSED', 'REPAIRING_ONSITE', 'TOWING', 'AWAITING_PAYMENT',
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  SEARCHING: { label: 'Đang tìm gara', color: '#c2410c', bg: '#fff7ed' },
  PENDING_GARAGE: { label: 'Chờ gara nhận', color: '#c2410c', bg: '#fff7ed' },
  NO_GARAGE_FOUND: { label: 'Không tìm được gara', color: '#dc2626', bg: '#fef2f2' },
  ACCEPTED: { label: 'Gara đã nhận', color: '#2563eb', bg: '#eff6ff' },
  ASSIGNED: { label: 'Đã phân công', color: '#2563eb', bg: '#eff6ff' },
  EN_ROUTE: { label: 'Đang tới', color: '#0284c7', bg: '#f0f9ff' },
  ARRIVED: { label: 'Đã đến nơi', color: '#0284c7', bg: '#f0f9ff' },
  COMPLETED: { label: 'Hoàn thành', color: '#059669', bg: '#ecfdf5' },
  CANCELLED: { label: 'Đã huỷ', color: '#64748b', bg: '#f1f5f9' },
  DECLINED: { label: 'Bị từ chối', color: '#dc2626', bg: '#fef2f2' },
};

function statusMeta(s: RescueStatus) {
  return STATUS_META[s] ?? { label: s, color: '#64748b', bg: '#f1f5f9' };
}

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function ActivityScreen() {
  const router = useRouter();
  const [items, setItems] = useState<RescueRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await rescueApi.mine();
      setItems(list);
    } catch {
      // giữ danh sách cũ khi lỗi mạng
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tải lại mỗi khi vào tab (đơn mới đặt xong hiện ngay).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openDetail = (req: RescueRequestDto) => {
    router.push({ pathname: '/customer/rescue-tracking', params: { id: String(req.id) } } as any);
  };

  const ongoing = items.filter((r) => ONGOING.includes(r.status));
  const history = items.filter((r) => !ONGOING.includes(r.status));

  const renderCard = (req: RescueRequestDto) => {
    const meta = statusMeta(req.status);
    return (
      <TouchableOpacity key={req.id} style={styles.card} onPress={() => openDetail(req)} activeOpacity={0.8}>
        <View style={styles.cardTop}>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.code}>#{req.code}</Text>
        </View>

        <Text style={styles.vehicle}>Cứu hộ {VEHICLE_LABEL[req.vehicleType] || req.vehicleType}</Text>
        <Text style={styles.symptom} numberOfLines={1}>{req.symptom}</Text>

        {!!(req.pickupAddress || req.locationNote) && (
          <View style={styles.metaRow}>
            <MapPin size={13} color="#94a3b8" strokeWidth={2.2} />
            <Text style={styles.metaText} numberOfLines={1}>{req.pickupAddress || req.locationNote}</Text>
          </View>
        )}
        <View style={styles.cardBottom}>
          <View style={styles.metaRow}>
            <Clock size={13} color="#94a3b8" strokeWidth={2.2} />
            <Text style={styles.metaText}>{timeAgo(req.createdAt)}</Text>
          </View>
          <View style={styles.detailLink}>
            <Text style={styles.detailText}>Xem chi tiết</Text>
            <ChevronRight size={15} color="#ea580c" strokeWidth={2.4} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hoạt động</Text>
        <Text style={styles.headerSub}>Các yêu cầu cứu hộ đã đặt của bạn</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#ea580c" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.iconCircle}>
            <Activity size={30} color="#ea580c" strokeWidth={2.2} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có hoạt động nào</Text>
          <Text style={styles.emptySub}>Khi bạn đặt yêu cầu cứu hộ, nó sẽ xuất hiện ở đây để theo dõi.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#ea580c" />
          }
        >
          {ongoing.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Đang diễn ra</Text>
              {ongoing.map(renderCard)}
            </>
          )}
          {history.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: ongoing.length > 0 ? 18 : 0 }]}>Lịch sử</Text>
              {history.map(renderCard)}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12.5, color: '#64748b', marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff7ed',
    borderWidth: 1, borderColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13.5, color: '#64748b', textAlign: 'center', lineHeight: 20, marginTop: 8 },

  scroll: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 12, gap: 5,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  code: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  vehicle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  symptom: { fontSize: 12.5, color: '#475569' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: '#94a3b8', flexShrink: 1 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  detailLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailText: { fontSize: 12.5, fontWeight: '800', color: '#ea580c' },
});

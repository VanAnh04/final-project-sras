import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Phone, MapPin, Truck, ChevronRight, Camera, X } from 'lucide-react-native';
import { garageApi } from '../../api/garageApi';
import { RescueRequestDto, RescueStatus } from '../../api/rescueApi';
import { resolveFileUrl } from '../../api/axiosClient';
import AssignStaffModal from '../../components/AssignStaffModal';

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };
const STATUS_LABEL: Record<string, string> = {
  ACCEPTED: 'Đã nhận · chờ gán nhân viên',
  ASSIGNED: 'Đã gán nhân viên · chờ nhân viên xuất phát',
  EN_ROUTE: 'Nhân viên đang tới hiện trường',
  ARRIVED: 'Nhân viên đã đến nơi',
};

export default function GarageOrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'offers' | 'active'>('offers');
  const [offers, setOffers] = useState<RescueRequestDto[]>([]);
  const [active, setActive] = useState<RescueRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, a] = await Promise.all([garageApi.listOffers(), garageApi.listActive()]);
      setOffers(o);
      setActive(a);
    } catch (e: any) {
      // Không chặn UI khi lỗi mạng tạm thời
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 6000);
    return () => clearInterval(timer);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const callPhone = (phone?: string) => phone && Linking.openURL(`tel:${phone}`);

  const onAccept = (req: RescueRequestDto) => {
    Alert.alert('Nhận yêu cầu?', 'Bạn sẽ nhận đơn cứu hộ này và cần gán nhân viên ngay sau đó.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Nhận ngay',
        onPress: async () => {
          try {
            await garageApi.accept(req.id);
            await load();
            setActiveTab('active');
          } catch (e: any) {
            Alert.alert('Không nhận được', e?.response?.data?.message || 'Đơn có thể đã được gara khác nhận.');
          }
        },
      },
    ]);
  };

  // Chủ gara chỉ XEM chi tiết (trạng thái + vị trí nhân viên & khách trên map).
  // Việc xuất phát/đã đến/hoàn thành do NHÂN VIÊN của cuốc đó xác nhận.
  const openDetail = (req: RescueRequestDto) => {
    router.push({ pathname: '/garage-owner/order-detail', params: { id: String(req.id) } } as any);
  };

  // Đơn đang mở modal gán nhân viên + xe.
  const [assignFor, setAssignFor] = useState<RescueRequestDto | null>(null);

  const list = activeTab === 'offers' ? offers : active;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý Đơn cứu hộ</Text>
        <Text style={styles.headerSub}>Nhận và điều phối đơn cứu hộ của gara</Text>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'offers' && styles.tabBtnActive]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'offers' && styles.tabBtnTextActive]}>
            Chờ nhận ({offers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'active' && styles.tabBtnTextActive]}>
            Đang xử lý ({active.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#ea580c" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {list.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {activeTab === 'offers' ? 'Chưa có yêu cầu nào đang chờ nhận.' : 'Chưa có đơn nào đang xử lý.'}
              </Text>
            </View>
          )}

          {list.map((req) => (
            <View key={req.id} style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: '#fff7ed' }]}>
                  <Text style={[styles.badgeText, { color: '#ea580c' }]}>
                    Cứu hộ {VEHICLE_LABEL[req.vehicleType] || req.vehicleType}
                  </Text>
                </View>
                <Text style={styles.codeText}>#{req.code}</Text>
              </View>

              <Text style={styles.issueText}>Sự cố: {req.symptom}</Text>
              {(req.pickupAddress || req.locationNote) && (
                <View style={styles.addrRow}>
                  <MapPin size={13} color="#64748b" strokeWidth={2.2} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {req.pickupAddress || req.locationNote}
                  </Text>
                </View>
              )}
              {req.photos && req.photos.length > 0 && (
                <View style={styles.photoBlock}>
                  <View style={styles.photoHead}>
                    <Camera size={12.5} color="#64748b" strokeWidth={2.3} />
                    <Text style={styles.photoHeadText}>Ảnh khách gửi</Text>
                    <Text style={styles.photoCount}>{req.photos.length}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                    {req.photos.map((uri, i) => (
                      <TouchableOpacity key={`${uri}-${i}`} activeOpacity={0.85} onPress={() => setViewPhoto(resolveFileUrl(uri) || null)}>
                        <Image source={{ uri: resolveFileUrl(uri) }} style={styles.photoThumb} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.customerRow}>
                <Text style={styles.customerName} numberOfLines={1}>
                  Khách: {req.customer?.name || '—'}
                </Text>
                {req.customer?.phone && (
                  <TouchableOpacity onPress={() => callPhone(req.customer?.phone)} activeOpacity={0.7}>
                    <Text style={styles.customerPhone}>
                      <Phone size={12} color="#ea580c" /> {req.customer.phone}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {activeTab === 'active' && (
                <Text style={styles.statusLine}>{STATUS_LABEL[req.status] || req.status}</Text>
              )}

              {req.staff && (
                <View style={styles.assignedRow}>
                  <Truck size={13} color="#059669" strokeWidth={2.3} />
                  <Text style={styles.assignedText}>
                    {req.staff.name}
                    {req.rescueVehicle?.licensePlate ? ` · ${req.rescueVehicle.licensePlate}` : ''}
                  </Text>
                </View>
              )}

              {/* Actions */}
              {activeTab === 'offers' ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => onAccept(req)} activeOpacity={0.9}>
                  <Text style={styles.primaryBtnText}>Nhận yêu cầu</Text>
                </TouchableOpacity>
              ) : req.status === 'ACCEPTED' ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setAssignFor(req)} activeOpacity={0.9}>
                  <Text style={styles.primaryBtnText}>Gán nhân viên & xe</Text>
                </TouchableOpacity>
              ) : (
                // ASSIGNED / EN_ROUTE / ARRIVED — chủ gara chỉ theo dõi, không thao tác.
                <TouchableOpacity style={styles.detailBtn} onPress={() => openDetail(req)} activeOpacity={0.85}>
                  <Text style={styles.detailBtnText}>Xem chi tiết cứu hộ</Text>
                  <ChevronRight size={16} color="#ea580c" strokeWidth={2.4} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <AssignStaffModal
        visible={assignFor !== null}
        request={assignFor}
        onClose={() => setAssignFor(null)}
        onAssigned={() => load()}
      />

      {/* Xem ảnh phóng to */}
      <Modal visible={!!viewPhoto} transparent animationType="fade" onRequestClose={() => setViewPhoto(null)}>
        <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setViewPhoto(null)}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setViewPhoto(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={22} color="#ffffff" strokeWidth={2.6} />
          </TouchableOpacity>
          {!!viewPhoto && <Image source={{ uri: viewPhoto }} style={styles.lightboxImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f1f5f9' },
  tabBtnActive: { backgroundColor: '#ea580c' },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#ffffff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, gap: 12 },
  emptyBox: { padding: 28, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },

  orderCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  codeText: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  issueText: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressText: { flex: 1, fontSize: 12, color: '#64748b', lineHeight: 17 },
  photoBlock: { gap: 8 },
  photoHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoHeadText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  photoCount: {
    fontSize: 11, fontWeight: '800', color: '#64748b', backgroundColor: '#f1f5f9',
    minWidth: 20, textAlign: 'center', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 9, overflow: 'hidden',
  },
  photoStrip: { gap: 8, paddingRight: 4 },
  photoThumb: { width: 84, height: 84, borderRadius: 12, backgroundColor: '#e9eef4' },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImg: { width: '92%', height: '80%' },
  lightboxClose: { position: 'absolute', top: 46, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  customerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 2, gap: 8 },
  customerName: { fontSize: 12, fontWeight: '700', color: '#334155', flex: 1 },
  customerPhone: { fontSize: 12, fontWeight: '800', color: '#ea580c' },
  statusLine: { fontSize: 12.5, fontWeight: '800', color: '#c2410c' },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignedText: { fontSize: 12.5, fontWeight: '700', color: '#059669' },
  primaryBtn: { paddingVertical: 12, borderRadius: 12, backgroundColor: '#ea580c', alignItems: 'center', marginTop: 6 },
  primaryBtnText: { fontSize: 13, fontWeight: '900', color: '#ffffff' },
  detailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa', marginTop: 6,
  },
  detailBtnText: { fontSize: 13, fontWeight: '900', color: '#ea580c' },
});

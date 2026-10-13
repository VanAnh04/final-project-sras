import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Phone,
  Truck,
  User as UserIcon,
  MapPin,
  MessageCircle,
  Clock,
  Camera,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Wrench,
  X,
  Calendar,
  Home,
  CheckSquare,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto } from '../../api/rescueApi';
import { resolveFileUrl } from '../../api/axiosClient';
import { formatVnd, resolveRescueFee } from '../../utils/rescueFee';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const GREEN = '#16a34a';
const BLUE = '#2563eb';
const LINE = '#e2e8f0';

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${hh}:${mm} · ${dd}/${MM}/${yyyy}`;
}

export default function StaffOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;

  const [data, setData] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(requestId)) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await rescueApi.getOne(requestId);
        if (alive) setData(res);
      } catch (err) {
        console.warn('Lỗi lấy chi tiết đơn nhân viên:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [requestId]);

  const callCustomer = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const openChat = () => {
    if (!data) return;
    router.push({
      pathname: '/chat',
      params: {
        requestId: String(data.id),
        peer: 'CUSTOMER',
        peerName: data.customer?.name || 'Khách hàng',
        peerPhone: data.customer?.phone || '',
        peerRole: 'Khách hàng',
      },
    } as any);
  };

  const isPaid = data?.status === 'PAID' || data?.status === 'RATED';
  const isCash = data?.paymentMethod === 'CASH' || data?.cashConfirmedByCustomer;
  const isDeclined =
    data?.quoteStatus === 'DECLINED' ||
    (!data?.repairFee && !data?.serviceFee && (data?.status === 'AWAITING_PAYMENT' || (isPaid && (data?.totalAmount ?? 0) <= (data?.inspectionFee ?? data?.rescueFee ?? 0))));
  const inspectionFee = data?.inspectionFee ?? (data?.rescueFee ?? 100000);
  const towingFee = isDeclined ? 0 : (data?.towingFee ?? 0);
  const repairItems = isDeclined
    ? []
    : (data?.repairItems?.filter((item) => item.status !== 'REJECTED') || []);
  const repairTotal = isDeclined
    ? 0
    : (data?.repairFee ?? (data?.serviceFee ?? repairItems.reduce((acc, item) => acc + (item.price ?? 0), 0)));
  const grandTotal = isDeclined ? inspectionFee : (data?.totalAmount ?? (inspectionFee + towingFee + repairTotal));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/garage-staff/home');
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={INK} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            Chi tiết ca cứu hộ #{data?.code || requestId}
          </Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={{ marginTop: 12, color: SUB, fontWeight: '600' }}>Đang nạp chi tiết ca cứu hộ…</Text>
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <AlertCircle size={48} color="#94a3b8" />
          <Text style={{ fontSize: 16, fontWeight: '800', color: INK, marginTop: 12 }}>
            Không tìm thấy thông tin ca cứu hộ
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 16, paddingHorizontal: 20 }]}
            onPress={() => router.replace('/garage-staff/home')}
          >
            <Text style={styles.primaryText}>Về trang chủ</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* BANNER KẾT QUẢ CA CỨU HỘ */}
          {isPaid ? (
            <View style={styles.successBanner}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={36} color={BRAND} strokeWidth={2.4} />
              </View>
              <Text style={styles.successTitle}>Ca cứu hộ đã hoàn tất thành công</Text>
              <Text style={styles.successSub}>
                Đơn #{data.code} đã hoàn thành toàn bộ quy trình và thanh toán đầy đủ chi phí.
              </Text>

              <View style={styles.bannerGrid}>
                <View style={styles.bannerRow}>
                  <Text style={styles.bannerLabel}>Tổng tiền đã thanh toán:</Text>
                  <Text style={[styles.bannerVal, { color: BRAND, fontSize: 15 }]}>{formatVnd(grandTotal)}</Text>
                </View>
                <View style={styles.bannerRow}>
                  <Text style={styles.bannerLabel}>Hình thức thanh toán:</Text>
                  <Text style={styles.bannerVal} numberOfLines={1} ellipsizeMode="tail">
                    {isCash ? 'Tiền mặt tại hiện trường' : 'Chuyển khoản VietQR'}
                  </Text>
                </View>
                <View style={styles.bannerRow}>
                  <Text style={styles.bannerLabel}>Thời gian hoàn tất:</Text>
                  <Text style={styles.bannerVal}>{formatDateTime(data.completedAt || data.createdAt)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.pendingBanner}>
              <View style={[styles.successIconCircle, { backgroundColor: '#fff7ed' }]}>
                <Clock size={36} color="#c2410c" strokeWidth={2.4} />
              </View>
              <Text style={[styles.successTitle, { color: '#c2410c' }]}>CHỜ KHÁCH THANH TOÁN</Text>
              <Text style={styles.successSub}>
                Đơn #{data.code} đã hoàn thành sửa chữa, đang chờ khách xác nhận thanh toán {formatVnd(grandTotal)}.
              </Text>
            </View>
          )}

          {/* CARD 1: THÔNG TIN KHÁCH HÀNG & PHƯƠNG TIỆN */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Khách hàng & Phương tiện</Text>

            <View style={styles.customerRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {(data.customer?.name?.trim()?.[0] || 'K').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{data.customer?.name || 'Khách hàng'}</Text>
                <Text style={styles.customerPhone}>
                  {data.customer?.phone || 'Chưa có SĐT'} · {VEHICLE_LABEL[data.vehicleType] || data.vehicleType}
                </Text>
              </View>
              {!!data.customer?.phone && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
                  onPress={() => callCustomer(data.customer?.phone)}
                  activeOpacity={0.8}
                >
                  <Phone size={18} color={GREEN} strokeWidth={2.4} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
                onPress={openChat}
                activeOpacity={0.8}
              >
                <MessageCircle size={18} color={BLUE} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Loại sự cố / Triệu chứng:</Text>
              <Text style={styles.metaVal}>{data.symptom || 'Không có mô tả'}</Text>
            </View>

            {(data.pickupAddress || data.locationNote) && (
              <View style={styles.addressBox}>
                <MapPin size={15} color={BRAND} strokeWidth={2.3} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressText}>{data.pickupAddress}</Text>
                  {data.locationNote ? (
                    <Text style={styles.locationNoteText}>Ghi chú: {data.locationNote}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>

          {/* CARD 2: BẢNG KÊ CHI TIẾT CHI PHÍ & THU TIỀN */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Wrench size={18} color={BRAND} style={{ marginRight: 8 }} />
              <Text style={styles.cardSectionTitle}>Chi tiết chi phí & Thu tiền</Text>
            </View>

            {/* Phí kiểm tra */}
            <View style={styles.feeLine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.feeName}>Phí kiểm tra & chẩn đoán xe</Text>
                <Text style={styles.feeSub}>Phí cố định theo quy định dịch vụ</Text>
              </View>
              <Text style={styles.feeAmount}>{formatVnd(inspectionFee)}</Text>
            </View>

            {/* Cước kéo xe (nếu có và không từ chối) */}
            {!isDeclined && towingFee > 0 && (
              <View style={styles.feeLine}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feeName}>Cước kéo xe</Text>
                  <Text style={styles.feeSub}>Vận chuyển phương tiện về gara</Text>
                </View>
                <Text style={styles.feeAmount}>{formatVnd(towingFee)}</Text>
              </View>
            )}

            {/* Các hạng mục sửa chữa / phụ tùng (CHỈ hiển thị khi khách ĐỒNG Ý sửa chữa) */}
            {!isDeclined && repairItems.map((item, index) => (
              <View key={item.id || index} style={styles.feeLine}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.feeName}>• {item.name}</Text>
                  <Text style={styles.feeSub}>
                    {item.quantity && item.quantity > 1 ? `SL: ${item.quantity} · ` : ''}
                    Hạng mục sửa chữa / phụ tùng
                  </Text>
                </View>
                <Text style={styles.feeAmount}>{formatVnd(item.amount || item.price || 0)}</Text>
              </View>
            ))}

            {/* Ghi chú khi khách hàng từ chối sửa chữa */}
            {isDeclined && (
              <View style={{ backgroundColor: '#fef2f2', padding: 10, borderRadius: 10, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#fecaca' }}>
                <Text style={{ fontSize: 12, color: '#b91c1c', fontWeight: '600' }}>
                  Khách hàng từ chối báo giá nên không phát sinh chi phí kéo xe, dịch vụ & linh kiện. Chỉ thanh toán phí di chuyển đến & kiểm tra xe.
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TỔNG CỘNG HOÁ ĐƠN</Text>
              <Text style={styles.totalAmount}>{formatVnd(grandTotal)}</Text>
            </View>

            <View style={styles.payMethodBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                <Banknote size={16} color={isCash ? GREEN : BLUE} style={{ marginRight: 6 }} />
                <Text style={styles.payMethodLabel}>Phương thức thu:</Text>
              </View>
              <Text style={[styles.payMethodVal, { color: isCash ? GREEN : BLUE }]} numberOfLines={1} ellipsizeMode="tail">
                {isCash ? 'Tiền mặt tại hiện trường' : 'Chuyển khoản VietQR'}
              </Text>
            </View>
          </View>

          {/* CARD 3: HÌNH ẢNH MINH CHỨNG (NẾU CÓ) */}
          {data.photos && data.photos.length > 0 && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Camera size={16} color={SUB} style={{ marginRight: 6 }} />
                <Text style={styles.cardSectionTitle}>Hình ảnh chụp hiện trường ({data.photos.length})</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {data.photos.map((uri, idx) => (
                  <TouchableOpacity
                    key={`${uri}-${idx}`}
                    onPress={() => setViewPhoto(resolveFileUrl(uri) || null)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: resolveFileUrl(uri) }} style={styles.photoThumb} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* NÚT ĐIỀU HƯỚNG DƯỚI ĐÁY */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/garage-staff/home')}
              activeOpacity={0.9}
            >
              <Home size={19} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryText}>Về trang chủ nhận đơn mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/garage-staff/tasks')}
              activeOpacity={0.88}
            >
              <CheckSquare size={18} color={INK} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryText}>Xem danh sách nhiệm vụ & Lịch sử</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Xem ảnh phóng to */}
      <Modal visible={!!viewPhoto} transparent animationType="fade" onRequestClose={() => setViewPhoto(null)}>
        <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setViewPhoto(null)}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setViewPhoto(null)}>
            <X size={24} color="#ffffff" strokeWidth={2.6} />
          </TouchableOpacity>
          {!!viewPhoto && <Image source={{ uri: viewPhoto }} style={styles.lightboxImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  headerSafe: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: INK,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 4,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { flex: 1 },
  body: { padding: 16, paddingBottom: 60, gap: 16 },

  // Success Banner
  successBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    alignItems: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  pendingBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    alignItems: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#c2410c',
    textAlign: 'center',
    marginBottom: 4,
  },
  successSub: {
    fontSize: 13,
    color: SUB,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  bannerGrid: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: LINE,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  bannerLabel: { fontSize: 13, color: SUB, fontWeight: '500', flexShrink: 0 },
  bannerVal: { fontSize: 13, color: INK, fontWeight: '700', textAlign: 'right', flex: 1 },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: INK,
    marginBottom: 12,
  },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: BRAND,
  },
  customerName: { fontSize: 15, fontWeight: '800', color: INK },
  customerPhone: { fontSize: 13, color: SUB, marginTop: 2, fontWeight: '500' },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  divider: { height: 1, backgroundColor: LINE, marginVertical: 12 },

  metaRow: {
    marginBottom: 10,
  },
  metaLabel: { fontSize: 12.5, color: SUB, fontWeight: '600' },
  metaVal: { fontSize: 14, color: INK, fontWeight: '700', marginTop: 3 },

  addressBox: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: LINE,
  },
  addressText: { fontSize: 13.5, color: INK, fontWeight: '600', lineHeight: 19 },
  locationNoteText: { fontSize: 12, color: SUB, marginTop: 2 },

  // Fees
  feeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  feeName: { fontSize: 14, fontWeight: '700', color: INK },
  feeSub: { fontSize: 12, color: SUB, marginTop: 2 },
  feeAmount: { fontSize: 14, fontWeight: '800', color: INK },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '900', color: INK },
  totalAmount: { fontSize: 20, fontWeight: '900', color: BRAND },

  payMethodBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: LINE,
    gap: 8,
  },
  payMethodLabel: { fontSize: 13, color: SUB, fontWeight: '600', flexShrink: 0 },
  payMethodVal: { fontSize: 13, fontWeight: '700', textAlign: 'right', flex: 1 },

  photoThumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },

  bottomActions: {
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: BRAND,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryText: { fontSize: 15.5, fontWeight: '800', color: '#ffffff' },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 14.5, fontWeight: '700', color: INK },

  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImg: {
    width: '100%',
    height: '80%',
  },
});

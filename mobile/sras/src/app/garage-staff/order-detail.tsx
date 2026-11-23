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
  BackHandler,
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

const VEHICLE_LABEL: Record<string, string> = {
  CAR: 'Ô tô',
  MOTORBIKE: 'Xe máy',
  MOTORCYCLE: 'Xe máy',
  TRUCK: 'Xe tải',
};

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${hh}:${mm} - ${dd}/${MM}/${yyyy}`;
}

export default function StaffOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; from?: string }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;

  const [data, setData] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const handleBack = () => {
    if (params.from === 'wallet') {
      router.replace('/garage-staff/wallet');
      return;
    }
    if (params.from === 'tasks') {
      router.replace('/garage-staff/tasks');
      return;
    }
    if (params.from === 'home') {
      router.replace('/garage-staff/home');
      return;
    }
    if (params.from === 'notifications') {
      router.replace('/garage-staff/notifications');
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/garage-staff/wallet');
    }
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [params.from]);

  useEffect(() => {
    setData(null);
    setLoading(true);
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
  const hasPaidDeposit = Boolean(
    data?.depositRequired &&
      (data?.depositStatus === 'PAID' || data?.depositStatus === 'TRANSFERRED_TO_GARAGE')
  );
  const depositDeduction = hasPaidDeposit ? (data?.depositAmount || 50000) : 0;
  const grossTotal = isDeclined ? inspectionFee : (inspectionFee + towingFee + repairTotal);
  const grandTotal = isDeclined
    ? Math.max(0, inspectionFee - depositDeduction)
    : (data?.totalAmount ?? Math.max(0, grossTotal - depositDeduction));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
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
              <Text style={[styles.successTitle, { color: '#c2410c' }]}>
                {data.status === 'ASSIGNED'
                  ? 'ĐÃ ĐƯỢC PHÂN CÔNG'
                  : data.status === 'EN_ROUTE'
                  ? 'ĐANG DI CHUYỂN TỚI KHÁCH'
                  : data.status === 'ARRIVED'
                  ? 'ĐÃ TỚI HIỆN TRƯỜNG'
                  : data.status === 'DIAGNOSED'
                  ? 'ĐÃ GỬI BÁO GIÁ'
                  : data.status === 'REPAIRING_ONSITE'
                  ? 'ĐANG SỬA CHỮA TẠI CHỖ'
                  : data.status === 'TOWING'
                  ? 'ĐANG KÉO XE VỀ GARA'
                  : data.status === 'TOW_TO_GARAGE'
                  ? 'ĐÃ VỀ GARA & SỬA CHỮA'
                  : data.status === 'COMPLETED' || data.status === 'AWAITING_PAYMENT'
                  ? 'CHỜ KHÁCH THANH TOÁN'
                  : 'ĐANG XỬ LÝ'}
              </Text>
              <Text style={styles.successSub}>
                {data.status === 'COMPLETED' || data.status === 'AWAITING_PAYMENT'
                  ? `Đơn #${data.code} đã hoàn thành sửa chữa, đang chờ khách xác nhận thanh toán ${formatVnd(grandTotal)}.`
                  : `Đơn cứu hộ #${data.code} đang trong tiến trình xử lý.`}
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
                  {data.customer?.phone || data.contactPhone || 'Chưa có SĐT'}
                </Text>
              </View>
              {!!(data.customer?.phone || data.contactPhone) && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
                  onPress={() => callCustomer(data.customer?.phone || data.contactPhone)}
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

            {/* Chi tiết phương tiện */}
            <View style={styles.vehicleSpecGrid}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Loại xe:</Text>
                <Text style={styles.specValue}>{VEHICLE_LABEL[data.vehicleType] || data.vehicleType}</Text>
              </View>
              {data.customerVehicle?.licensePlate ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Biển số xe:</Text>
                  <Text style={[styles.specValue, { color: BRAND, fontWeight: '800' }]}>
                    {data.customerVehicle.licensePlate}
                  </Text>
                </View>
              ) : null}
              {data.customerVehicle?.brand ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Hãng / Dòng xe:</Text>
                  <Text style={styles.specValue}>
                    {[data.customerVehicle.brand, data.customerVehicle.model].filter(Boolean).join(' ')}
                  </Text>
                </View>
              ) : null}
              {data.customerVehicle?.color ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Màu sắc:</Text>
                  <Text style={styles.specValue}>{data.customerVehicle.color}</Text>
                </View>
              ) : null}
              {data.dispatchDistanceKm ? (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Cự ly điều phối:</Text>
                  <Text style={styles.specValue}>{data.dispatchDistanceKm.toFixed(1)} km</Text>
                </View>
              ) : null}
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
                    <Text style={styles.locationNoteText}>Ghi chú vị trí: {data.locationNote}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>

          {/* CARD 2: TRẠNG THÁI NỘP TIỀN MẶT CHO CHỦ GARA */}
          {isCash && isPaid && (
            <View style={[
              styles.card,
              data.cashSettled ? styles.settledCard : styles.unsettledCard
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {data.cashSettled ? (
                  <CheckCircle2 size={20} color="#16a34a" />
                ) : (
                  <Clock size={20} color="#ea580c" />
                )}
                <Text style={[
                  styles.cardSectionTitle,
                  { marginBottom: 0, color: data.cashSettled ? '#15803d' : '#c2410c' }
                ]}>
                  {data.cashSettled ? 'ĐÃ NỘP TIỀN CHO CHỦ GARA' : 'TIỀN MẶT ĐANG GIỮ (CHƯA NỘP)'}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: data.cashSettled ? '#166534' : '#9a3412', lineHeight: 20 }}>
                {data.cashSettled
                  ? `Chủ Gara đã xác nhận nhận đủ tiền mặt cho đơn này vào ${formatDateTime(data.cashSettledAt)}. Bạn không còn nợ tiền đơn này.`
                  : `Bạn đang giữ ${formatVnd(grandTotal)} tiền mặt từ khách. Vui lòng nộp lại cho Chủ Gara khi hết ca trực để quyết toán xong.`}
              </Text>
            </View>
          )}

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

            {hasPaidDeposit ? (
              <>
                <View style={styles.feeLine}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feeName}>Tổng giá trị dịch vụ (Gara nhận đủ)</Text>
                  </View>
                  <Text style={styles.feeAmount}>{formatVnd(grossTotal)}</Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f0fdf4',
                    padding: 10,
                    borderRadius: 10,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: '#86efac',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803d' }}>
                      ✓ Khách đã đặt cọc tại sàn
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#166534', marginTop: 2 }}>
                      {data.depositStatus === 'TRANSFERRED_TO_GARAGE'
                        ? 'Sàn đã chuyển trả đủ 50.000đ tiền cọc về ví tiền mặt Gara'
                        : 'Sàn sẽ chuyển trả đủ 50.000đ tiền cọc về ví tiền mặt Gara khi hoàn tất'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#15803d' }}>
                    -{formatVnd(depositDeduction)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    {isPaid ? 'KHÁCH ĐÃ THANH TOÁN THÊM' : 'KHÁCH CẦN TRẢ THÊM'}
                  </Text>
                  <Text style={styles.totalAmount}>{formatVnd(grandTotal)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TỔNG CỘNG HOÁ ĐƠN</Text>
                <Text style={styles.totalAmount}>{formatVnd(grandTotal)}</Text>
              </View>
            )}

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

          {/* CARD: TIẾN TRÌNH THỜI GIAN */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Clock size={16} color={BRAND} style={{ marginRight: 8 }} />
              <Text style={styles.cardSectionTitle}>Mốc thời gian tiến trình ca cứu hộ</Text>
            </View>
            <View style={styles.timelineList}>
              <View style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.timelineLabel}>Khách gửi yêu cầu:</Text>
                <Text style={styles.timelineVal}>{formatDateTime(data.createdAt)}</Text>
              </View>
              {data.enRouteAt ? (
                <View style={styles.timelineRow}>
                  <View style={[styles.timelineDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.timelineLabel}>Bắt đầu xuất phát:</Text>
                  <Text style={styles.timelineVal}>{formatDateTime(data.enRouteAt)}</Text>
                </View>
              ) : null}
              {data.arrivedAt ? (
                <View style={styles.timelineRow}>
                  <View style={[styles.timelineDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.timelineLabel}>Đã tới hiện trường:</Text>
                  <Text style={styles.timelineVal}>{formatDateTime(data.arrivedAt)}</Text>
                </View>
              ) : null}
              {data.completedAt ? (
                <View style={styles.timelineRow}>
                  <View style={[styles.timelineDot, { backgroundColor: BRAND }]} />
                  <Text style={styles.timelineLabel}>Hoàn tất & Thanh toán:</Text>
                  <Text style={[styles.timelineVal, { color: BRAND, fontWeight: '700' }]}>{formatDateTime(data.completedAt)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* CARD: HÌNH ẢNH MINH CHỨNG (NẾU CÓ) */}
          {((data.photos && data.photos.length > 0) ||
            (data.customerPhotos && data.customerPhotos.length > 0) ||
            (data.diagnosisPhotos && data.diagnosisPhotos.length > 0)) && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Camera size={16} color={SUB} style={{ marginRight: 6 }} />
                <Text style={styles.cardSectionTitle}>Hình ảnh chụp hiện trường</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {[
                  ...(data.customerPhotos || []),
                  ...(data.diagnosisPhotos || []),
                  ...(data.photos || []),
                ]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((uri, idx) => (
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
            {data.status === 'ARRIVED' && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#FF5500' }]}
                onPress={() => router.push({
                  pathname: '/garage-staff/create-quote',
                  params: { requestId: String(data.id) },
                })}
                activeOpacity={0.9}
              >
                <Wrench size={19} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryText}>📝 Lập Báo Giá & Gửi Khách</Text>
              </TouchableOpacity>
            )}

            {(data.status === 'REPAIRING_ONSITE' || data.status === 'TOW_TO_GARAGE') && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#FF5500' }]}
                onPress={() => router.push({
                  pathname: '/garage-staff/repair-progress',
                  params: {
                    id: String(data.id),
                    selectedServices: JSON.stringify(data.repairItems || []),
                  },
                })}
                activeOpacity={0.9}
              >
                <Wrench size={19} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryText}>🔧 Cập Nhật Tiến Độ Sửa Chữa</Text>
              </TouchableOpacity>
            )}

            {/* Nút chính: Thoát về đúng màn hình trước đó */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleBack}
              activeOpacity={0.9}
            >
              <ChevronLeft size={20} color="#ffffff" style={{ marginRight: 6 }} strokeWidth={2.4} />
              <Text style={styles.primaryText}>
                {params.from === 'wallet'
                  ? 'Quay lại Lịch sử cứu hộ'
                  : params.from === 'tasks'
                  ? 'Quay lại Danh sách nhiệm vụ'
                  : 'Quay lại trang trước'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/garage-staff/home')}
              activeOpacity={0.88}
            >
              <Home size={18} color={INK} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryText}>Về màn hình chính (Trang chủ)</Text>
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

  // Vehicle Spec Grid
  vehicleSpecGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  specItem: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    minWidth: '45%',
    flex: 1,
  },
  specLabel: {
    fontSize: 11,
    color: SUB,
    fontWeight: '500',
  },
  specValue: {
    fontSize: 13,
    color: INK,
    fontWeight: '700',
    marginTop: 2,
  },

  // Settlement Status Card
  settledCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1.5,
  },
  unsettledCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1.5,
  },

  // Timeline
  timelineList: {
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLabel: {
    fontSize: 13,
    color: SUB,
    fontWeight: '500',
    flex: 1,
  },
  timelineVal: {
    fontSize: 13,
    color: INK,
    fontWeight: '600',
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

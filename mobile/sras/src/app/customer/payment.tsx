import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Landmark,
  Banknote,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  FileText,
  CreditCard,
  QrCode,
  Car,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto } from '../../api/rescueApi';
import { formatVnd, resolveRescueFee } from '../../utils/rescueFee';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const GREEN = '#16a34a';
const BLUE = '#2563eb';
const LINE = '#e2e8f0';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; amount?: string; rejectQuote?: string }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;
  const isRejectQuote = params.rejectQuote === '1';

  const [data, setData] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'PAYOS' | 'CASH'>('PAYOS');

  useEffect(() => {
    if (Number.isNaN(requestId)) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await rescueApi.getOne(requestId);
        if (alive) {
          setData(res);
          if (res.paymentMethod === 'CASH') {
            setSelectedMethod('CASH');
          } else {
            setSelectedMethod('PAYOS');
          }
        }
      } catch {
        /* giữ trống */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [requestId]);

  // Phí kiểm tra xe cố định
  const inspectionFee = data?.inspectionFee ?? (data?.rescueFee ?? 100000);

  // Danh sách hạng mục sửa chữa & phụ tùng
  const repairItems = !isRejectQuote && data?.repairItems && data.repairItems.length > 0
    ? data.repairItems
    : [];

  const repairTotal = !isRejectQuote
    ? (data?.repairFee ?? repairItems.reduce((acc, item) => acc + (item.price ?? 0), 0))
    : 0;

  const grandTotal = isRejectQuote
    ? (params.amount ? Number(params.amount) : inspectionFee)
    : (data?.totalAmount ?? (inspectionFee + repairTotal));

  const isPaid = data?.status === 'PAID' || data?.status === 'RATED';

  // Thực hiện thanh toán PayOS / Chuyển khoản
  const handlePayOS = async () => {
    try {
      setPaying(true);
      await rescueApi.payTransfer(requestId);
      Alert.alert(
        'Thanh toán PayOS thành công!',
        `Đã thanh toán ${formatVnd(grandTotal)} cho đơn #${data?.code || requestId}. Cảm ơn bạn đã sử dụng dịch vụ SRAS!`,
        [
          {
            text: 'Về trang chủ',
            onPress: () => router.replace('/customer'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Không thanh toán được', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={INK} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết Thanh toán</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={{ marginTop: 10, color: SUB, fontWeight: '600' }}>Đang nạp bảng kê chi phí...</Text>
        </View>
      ) : Number.isNaN(requestId) ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Không tìm thấy yêu cầu cứu hộ.</Text>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {isRejectQuote && (
            <View style={styles.rejectNotice}>
              <Text style={styles.rejectNoticeText}>
                ⚠️ Bạn đã từ chối bảng báo giá sửa chữa. Bạn chỉ cần thanh toán Phí kiểm tra xe cố định theo chính sách SRAS.
              </Text>
            </View>
          )}

          {/* Bảng Kê Chi Tiết Hoá Đơn */}
          <View style={styles.invoiceCard}>
            <View style={styles.cardHeader}>
              <FileText size={18} color={BRAND} />
              <Text style={styles.cardTitle}>Bảng kê chi phí cứu hộ & sửa chữa</Text>
            </View>

            {/* Mã đơn */}
            <View style={styles.invoiceMetaRow}>
              <Text style={styles.metaLabel}>Mã đơn:</Text>
              <Text style={styles.metaVal}>{data?.code ? `#${data.code}` : `#TK-${requestId}`}</Text>
            </View>
            <View style={styles.invoiceMetaRow}>
              <Text style={styles.metaLabel}>Loại phương tiện:</Text>
              <Text style={styles.metaVal}>{data?.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'}</Text>
            </View>

            <View style={styles.divider} />

            {/* 1. Phí kiểm tra xe */}
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>Phí kiểm tra & chẩn đoán xe</Text>
                <Text style={styles.itemSub}>Phí cố định theo quy định</Text>
              </View>
              <Text style={styles.itemPrice}>{formatVnd(inspectionFee)}</Text>
            </View>

            {/* 2. Các hạng mục sửa chữa & phụ tùng */}
            {repairItems.map((item, index) => (
              <View key={item.id || index} style={styles.itemRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemSub}>
                    {item.quantity && item.quantity > 1 ? `SL: ${item.quantity} · ` : ''}
                    Hạng mục sửa chữa / phụ tùng
                  </Text>
                </View>
                <Text style={styles.itemPrice}>{formatVnd(item.amount || item.price || 0)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            {/* Tổng cộng */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
              <Text style={styles.totalAmount}>{formatVnd(grandTotal)}</Text>
            </View>
          </View>

          {isPaid ? (
            <View style={styles.paidBox}>
              <CheckCircle2 size={42} color={GREEN} strokeWidth={2.4} />
              <Text style={styles.paidTitle}>Đơn đã thanh toán thành công!</Text>
              <Text style={styles.paidSub}>Cảm ơn bạn đã tin tưởng dịch vụ cứu hộ xe SRAS.</Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace('/customer')}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryText}>Về trang chủ</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Chọn phương thức thanh toán */}
              <Text style={styles.sectionHeading}>Chọn phương thức thanh toán</Text>

              {/* Tùy chọn 1: PayOS / Chuyển khoản QR */}
              <TouchableOpacity
                style={[
                  styles.methodOption,
                  selectedMethod === 'PAYOS' && styles.methodOptionActive,
                ]}
                onPress={() => setSelectedMethod('PAYOS')}
                activeOpacity={0.88}
              >
                <View style={[styles.methodIconBox, { backgroundColor: '#eff6ff' }]}>
                  <QrCode size={24} color={BLUE} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.methodTitle}>PayOS / Chuyển khoản QR</Text>
                    <View style={styles.recommendBadge}>
                      <Text style={styles.recommendText}>KHUYÊN DÙNG</Text>
                    </View>
                  </View>
                  <Text style={styles.methodDesc}>Quét mã QR qua VietQR hoặc thanh toán tự động</Text>
                </View>
                <View style={[styles.radioCircle, selectedMethod === 'PAYOS' && styles.radioCircleOn]}>
                  {selectedMethod === 'PAYOS' && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>

              {/* Tùy chọn 2: Tiền mặt */}
              <TouchableOpacity
                style={[
                  styles.methodOption,
                  selectedMethod === 'CASH' && styles.methodOptionActive,
                  { marginTop: 10 },
                ]}
                onPress={() => setSelectedMethod('CASH')}
                activeOpacity={0.88}
              >
                <View style={[styles.methodIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <Banknote size={24} color={GREEN} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.methodTitle}>Tiền mặt</Text>
                  <Text style={styles.methodDesc}>Đưa tiền mặt trực tiếp cho nhân viên cứu hộ</Text>
                </View>
                <View style={[styles.radioCircle, selectedMethod === 'CASH' && styles.radioCircleOn]}>
                  {selectedMethod === 'CASH' && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>

              {/* Khối hành động thanh toán */}
              {selectedMethod === 'PAYOS' ? (
                <View style={{ marginTop: 22 }}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, paying && { opacity: 0.6 }]}
                    onPress={handlePayOS}
                    disabled={paying}
                    activeOpacity={0.9}
                  >
                    {paying ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <CreditCard size={18} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryText}>Thanh toán PayOS {formatVnd(grandTotal)}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <View style={styles.securityRow}>
                    <ShieldCheck size={16} color={GREEN} />
                    <Text style={styles.securityText}>Thanh toán bảo mật chuẩn SSL qua cổng PayOS</Text>
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 16 }}>
                  <View style={styles.cashNoticeBox}>
                    <Text style={styles.cashNoticeText}>
                      Vui lòng đưa đúng <Text style={{ fontWeight: '800' }}>{formatVnd(grandTotal)}</Text> tiền mặt cho nhân viên cứu hộ. Khi nhân viên xác nhận đã nhận tiền, chuyến đi sẽ hoàn tất.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.secondaryBtnText}>Về màn hình theo dõi cứu hộ</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: INK },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 14, fontWeight: '600', color: SUB },

  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },

  rejectNotice: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  rejectNoticeText: { fontSize: 13, color: '#991b1b', fontWeight: '600', lineHeight: 19 },

  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: INK },

  invoiceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaLabel: { fontSize: 13, color: SUB, fontWeight: '500' },
  metaVal: { fontSize: 13, color: INK, fontWeight: '700' },

  divider: { height: 1, backgroundColor: LINE, marginVertical: 12 },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemName: { fontSize: 14, fontWeight: '700', color: INK },
  itemSub: { fontSize: 12, color: SUB, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: INK },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '900', color: INK },
  totalAmount: { fontSize: 22, fontWeight: '900', color: BRAND },

  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: INK,
    marginBottom: 12,
  },

  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 16,
    padding: 14,
  },
  methodOptionActive: {
    borderColor: BRAND,
    backgroundColor: '#fffaf5',
  },
  methodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: { fontSize: 15, fontWeight: '800', color: INK },
  methodDesc: { fontSize: 12, color: SUB, marginTop: 2 },
  recommendBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  recommendText: { fontSize: 10, fontWeight: '800', color: '#c2410c' },

  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioCircleOn: { borderColor: BRAND },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: BRAND },

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
  primaryText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },

  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  securityText: { fontSize: 12, color: SUB, fontWeight: '600' },

  cashNoticeBox: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  cashNoticeText: { fontSize: 13.5, color: '#9a3412', lineHeight: 20, fontWeight: '600' },

  secondaryBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: SUB },

  paidBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: LINE,
    gap: 8,
  },
  paidTitle: { fontSize: 18, fontWeight: '900', color: INK, marginTop: 6 },
  paidSub: { fontSize: 13, color: SUB, textAlign: 'center', marginBottom: 14 },
});

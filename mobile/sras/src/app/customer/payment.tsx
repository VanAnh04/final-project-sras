import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Landmark, Banknote, CheckCircle2, ShieldCheck, Star } from 'lucide-react-native';
import { rescueApi, RescueRequestDto } from '../../api/rescueApi';
import { formatVnd, resolveRescueFee } from '../../utils/rescueFee';
import RatingModal from '../../components/RatingModal';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const GREEN = '#16a34a';
const BLUE = '#2563eb';
const LINE = '#e5e7eb';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; amount?: string; rejectQuote?: string }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;
  const isRejectQuote = params.rejectQuote === '1';

  const [data, setData] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    if (Number.isNaN(requestId)) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const res = await rescueApi.getStatus(requestId);
        if (alive) setData(res);
      } catch {
        /* giữ trống */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [requestId]);

  const method = data?.paymentMethod || 'CASH';
  const amount = isRejectQuote && params.amount
    ? Number(params.amount)
    : params.amount
    ? Number(params.amount)
    : data
    ? resolveRescueFee(data)
    : 0;
  const isPaid = data?.status === 'PAID';

  const payTransfer = async () => {
    try {
      setPaying(true);
      await rescueApi.payTransfer(requestId);
      Alert.alert(
        'Thanh toán thành công',
        'Đã trừ tiền từ tài khoản liên kết. Bạn có muốn đánh giá dịch vụ cứu hộ ngay không?',
        [
          { text: 'Để sau', onPress: () => router.replace('/customer'), style: 'cancel' },
          { text: 'Đánh giá ngay', onPress: () => setShowRating(true) },
        ]
      );
    } catch (e: any) {
      Alert.alert('Không thanh toán được', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={INK} strokeWidth={2.6} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={BRAND} /></View>
      ) : Number.isNaN(requestId) ? (
        <View style={styles.center}><Text style={styles.muted}>Không tìm thấy đơn.</Text></View>
      ) : (
        <View style={styles.body}>
          {isRejectQuote && (
            <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 13, color: '#991b1b', fontWeight: '600', lineHeight: 18 }}>
                Phí kiểm tra & chẩn đoán xe (Đã từ chối các hạng mục sửa chữa đề xuất).
              </Text>
            </View>
          )}

          {/* Số tiền */}
          <Text style={styles.amountLabel}>
            {isRejectQuote ? 'Phí kiểm tra xe' : 'Tổng thanh toán'}
          </Text>
          <Text style={styles.amount}>{formatVnd(amount)}</Text>
          {data?.code && <Text style={styles.code}>Đơn #{data.code}</Text>}

          {isPaid ? (
            <View style={styles.paidBox}>
              <CheckCircle2 size={30} color={GREEN} strokeWidth={2.3} />
              <Text style={styles.paidText}>Đơn đã được thanh toán</Text>
              
              {!data?.rated && (
                <TouchableOpacity
                  style={[styles.primary, { backgroundColor: '#f59e0b', marginTop: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }]}
                  onPress={() => setShowRating(true)}
                  activeOpacity={0.9}
                >
                  <Star size={18} color="#ffffff" fill="#ffffff" />
                  <Text style={styles.primaryText}>Đánh giá dịch vụ cứu hộ</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.ghost, { marginTop: 6 }]} onPress={() => router.replace('/customer')} activeOpacity={0.9}>
                <Text style={styles.ghostText}>Về trang chủ</Text>
              </TouchableOpacity>
            </View>
          ) : method === 'BANK_TRANSFER' ? (
            <>
              <View style={styles.methodCard}>
                <View style={[styles.methodIcon, { backgroundColor: '#eff6ff' }]}>
                  <Landmark size={22} color={BLUE} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodName}>Chuyển khoản ngân hàng</Text>
                  <Text style={styles.methodSub}>Trừ tự động từ ngân hàng kết nối</Text>
                </View>
                <ShieldCheck size={18} color={GREEN} strokeWidth={2.3} />
              </View>
              <TouchableOpacity style={[styles.primary, paying && styles.primaryOff]} onPress={payTransfer} disabled={paying} activeOpacity={0.9}>
                {paying ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryText}>Xác nhận chuyển khoản {formatVnd(amount)}</Text>}
              </TouchableOpacity>
              <Text style={styles.note}>Số tiền sẽ được trừ từ ngân hàng đã liên kết với tài khoản của bạn.</Text>
            </>
          ) : (
            <>
              <View style={styles.methodCard}>
                <View style={[styles.methodIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Banknote size={22} color={GREEN} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodName}>Tiền mặt</Text>
                  <Text style={styles.methodSub}>Thanh toán trực tiếp cho nhân viên cứu hộ</Text>
                </View>
              </View>
              <View style={styles.cashInfo}>
                <Text style={styles.cashInfoText}>
                  Vui lòng đưa {formatVnd(amount)} tiền mặt cho nhân viên. Nhân viên sẽ xác nhận đã nhận tiền, đơn tự chuyển sang “đã thanh toán”.
                </Text>
              </View>
              <TouchableOpacity style={styles.ghost} onPress={() => router.back()} activeOpacity={0.85}>
                <Text style={styles.ghostText}>Về theo dõi cứu hộ</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Rating Modal */}
      {!Number.isNaN(requestId) && (
        <RatingModal
          visible={showRating}
          requestId={requestId}
          requestCode={data?.code}
          garageName={data?.garage?.name}
          staffName={data?.staff?.name}
          onClose={() => setShowRating(false)}
          onSuccess={() => {
            setData((prev) => (prev ? { ...prev, rated: true } : null));
            router.replace('/customer');
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: INK },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 14, fontWeight: '600', color: SUB },

  body: { paddingHorizontal: 20, paddingTop: 28 },
  amountLabel: { fontSize: 13, fontWeight: '700', color: SUB, textAlign: 'center' },
  amount: { fontSize: 38, fontWeight: '900', color: INK, textAlign: 'center', marginTop: 6, letterSpacing: -0.5 },
  code: { fontSize: 12.5, fontWeight: '600', color: '#94a3b8', textAlign: 'center', marginTop: 6 },

  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: LINE, borderRadius: 16, padding: 14, marginTop: 30 },
  methodIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodName: { fontSize: 15, fontWeight: '800', color: INK },
  methodSub: { fontSize: 12.5, fontWeight: '600', color: SUB, marginTop: 2 },

  primary: { backgroundColor: BRAND, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryOff: { opacity: 0.6 },
  primaryText: { fontSize: 15.5, fontWeight: '900', color: '#ffffff' },
  note: { fontSize: 12.5, fontWeight: '600', color: '#94a3b8', textAlign: 'center', marginTop: 14, lineHeight: 18 },

  cashInfo: { backgroundColor: '#fff7ed', borderRadius: 14, padding: 14, marginTop: 16 },
  cashInfoText: { fontSize: 13.5, fontWeight: '600', color: '#9a3412', lineHeight: 20 },
  ghost: { alignItems: 'center', paddingVertical: 14, marginTop: 12 },
  ghostText: { fontSize: 14, fontWeight: '800', color: SUB },

  paidBox: { alignItems: 'center', marginTop: 40, gap: 12 },
  paidText: { fontSize: 16, fontWeight: '800', color: INK },
});

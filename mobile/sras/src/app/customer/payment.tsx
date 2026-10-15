import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Banknote,
  CheckCircle2,
  ShieldCheck,
  FileText,
  CreditCard,
  AlertCircle,
  HelpCircle,
  Clock,
  Receipt,
  Car,
  Wrench,
  Check,
  ExternalLink,
  QrCode,
  Copy,
  RefreshCw,
  X,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto } from '../../api/rescueApi';
import { paymentApi, PayOSPaymentLinkDto } from '../../api/paymentApi';
import { formatVnd } from '../../utils/rescueFee';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const GREEN = '#16a34a';
const BLUE = '#2563eb';
const LINE = '#e2e8f0';

function formatDateTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} · ${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; amount?: string; rejectQuote?: string }>();
  const initialRequestId = params.id ? parseInt(params.id, 10) : NaN;
  const isRejectQuote = params.rejectQuote === '1';

  // ID của hoá đơn đang được xem chi tiết (nếu null thì đang ở màn hình danh sách hoá đơn)
  const [viewingDetailId, setViewingDetailId] = useState<number | null>(
    Number.isFinite(initialRequestId) ? initialRequestId : null
  );

  const [allRequests, setAllRequests] = useState<RescueRequestDto[]>([]);
  const [data, setData] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'PAYOS' | 'CASH'>('PAYOS');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'PAID'>('PENDING');

  // Modal xác nhận đưa tiền mặt
  const [cashConfirmModalVisible, setCashConfirmModalVisible] = useState(false);

  // Modal thanh toán PayOS
  const [payOSData, setPayOSData] = useState<PayOSPaymentLinkDto | null>(null);
  const [payOSModalVisible, setPayOSModalVisible] = useState(false);
  const [checkingPayOS, setCheckingPayOS] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch { }
  };

  // Modal thông báo chung thay cho Alert.alert
  const [noticeModal, setNoticeModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    primaryText?: string;
    onPrimary?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  // Tự động kiểm tra trạng thái thanh toán PayOS định kỳ mỗi 3 giây
  useEffect(() => {
    if (!payOSModalVisible || !payOSData?.orderCode) return;
    const pollTimer = setInterval(() => {
      handleCheckPayOS(true);
    }, 3000);
    return () => clearInterval(pollTimer);
  }, [payOSModalVisible, payOSData]);

  // Cập nhật viewingDetailId khi params.id thay đổi từ bên ngoài
  useEffect(() => {
    if (params.id) {
      const pid = parseInt(params.id, 10);
      if (Number.isFinite(pid)) {
        setViewingDetailId(pid);
      }
    }
  }, [params.id]);

  // Nạp dữ liệu
  const loadData = useCallback(async (forceLoading = false) => {
    try {
      if (forceLoading || allRequests.length === 0) {
        setLoading(true);
      }
      const list = await rescueApi.mine();
      const safeList = Array.isArray(list) ? list : (list as any)?.data || [];
      setAllRequests(safeList);

      const pending = safeList.filter(
        (r: RescueRequestDto) => r.status === 'COMPLETED' || r.status === 'AWAITING_PAYMENT'
      );
      const paid = safeList.filter(
        (r: RescueRequestDto) => r.status === 'PAID' || r.status === 'RATED'
      );

      // Nếu không chỉ định xem chi tiết đơn nào, tự động chọn tab phù hợp
      if (viewingDetailId == null) {
        if (pending.length === 0 && paid.length > 0) {
          setActiveTab('PAID');
        }
      } else {
        // Nạp chi tiết đơn đang xem
        const current = safeList.find((r: RescueRequestDto) => r.id === viewingDetailId);
        if (current) {
          setData(current);
          if (current.cashConfirmedByCustomer) {
            setSelectedMethod('CASH');
          } else {
            setSelectedMethod('PAYOS');
          }
        } else {
          // Fallback gọi getOne
          try {
            const single = await rescueApi.getOne(viewingDetailId);
            setData(single);
            if (single.cashConfirmedByCustomer) {
              setSelectedMethod('CASH');
            } else {
              setSelectedMethod('PAYOS');
            }
          } catch (err) {
            console.warn('Lỗi lấy đơn đơn lẻ:', err);
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi nạp danh sách cứu hộ / hoá đơn:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewingDetailId, allRequests.length]);

  useFocusEffect(
    useCallback(() => {
      loadData(allRequests.length === 0);
    }, [loadData, allRequests.length])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const pendingList = allRequests.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'AWAITING_PAYMENT'
  );
  const paidList = allRequests.filter((r) => r.status === 'PAID' || r.status === 'RATED');

  // Khi chọn một đơn trong danh sách để xem chi tiết
  const handleSelectInvoice = (item: RescueRequestDto) => {
    setData(item);
    setViewingDetailId(item.id);
    if (item.cashConfirmedByCustomer) {
      setSelectedMethod('CASH');
    } else {
      setSelectedMethod('PAYOS');
    }
  };

  // Quay lại màn hình trước hoặc quay về danh sách hoá đơn
  const handleBack = () => {
    if (viewingDetailId != null) {
      if (Number.isFinite(initialRequestId) && params.id) {
        // Vào từ màn hình theo dõi cứu hộ -> quay lại màn hình đó
        router.back();
      } else {
        // Vào từ danh sách tab Thanh toán -> quay lại danh sách
        setViewingDetailId(null);
        setData(null);
      }
    } else {
      router.back();
    }
  };

  // Tính toán phí
  const inspectionFee = data?.inspectionFee ?? (data?.rescueFee ?? 100000);
  const isDeclined = data?.quoteStatus === 'DECLINED' || isRejectQuote;
  const towingFee = isDeclined ? 0 : (data?.towingFee ?? 0);
  const isTow = !isDeclined && (data?.quoteType === 'TOW' || data?.isTowing || towingFee > 0);
  const repairItems = !isDeclined && data?.repairItems && data.repairItems.length > 0
    ? data.repairItems.filter((item) => item.status !== 'REJECTED')
    : [];
  const repairTotal = !isDeclined
    ? (data?.repairFee ?? repairItems.reduce((acc, item) => acc + (item.price ?? 0), 0))
    : 0;
  const grandTotal = isDeclined
    ? inspectionFee
    : (data?.totalAmount ?? (inspectionFee + towingFee + repairTotal));

  const isPaid = data?.status === 'PAID' || data?.status === 'RATED';

  // Thực hiện tạo liên kết thanh toán PayOS
  const handlePayOS = async () => {
    const targetId = viewingDetailId || data?.id;
    if (!targetId) return;
    try {
      setPaying(true);
      const linkData = await paymentApi.createPayOSLink(targetId);
      setPayOSData(linkData);
      setPayOSModalVisible(true);
    } catch (e: any) {
      setNoticeModal({
        visible: true,
        title: 'Không thể tạo giao dịch PayOS',
        message: e?.response?.data?.message || e?.message || 'Có lỗi xảy ra trong quá trình kết nối cổng PayOS.',
        type: 'error',
      });
    } finally {
      setPaying(false);
    }
  };

  // Kiểm tra trạng thái thanh toán PayOS (gọi thủ công hoặc qua polling)
  const handleCheckPayOS = async (silent = false) => {
    const targetId = viewingDetailId || data?.id;
    if (!payOSData?.orderCode && !targetId) return;
    try {
      if (!silent) setCheckingPayOS(true);

      let updatedReq: RescueRequestDto | null = null;
      if (payOSData?.orderCode) {
        try {
          const res = await paymentApi.checkPayOSStatus(payOSData.orderCode);
          if (res) updatedReq = res;
        } catch (err) {
          console.warn('Lỗi gọi checkPayOSStatus:', err);
        }
      }

      // Nếu check theo orderCode chưa ra PAID, gọi thêm fallback theo request id
      if ((!updatedReq || (updatedReq.status !== 'PAID' && updatedReq.status !== 'RATED')) && targetId) {
        try {
          const fresh = await rescueApi.getOne(targetId);
          if (fresh && (fresh.status === 'PAID' || fresh.status === 'RATED')) {
            updatedReq = fresh;
          }
        } catch (err) {
          console.warn('Lỗi getOne fallback:', err);
        }
      }

      if (updatedReq && (updatedReq.status === 'PAID' || updatedReq.status === 'RATED')) {
        setPayOSModalVisible(false);
        setPayOSData(null);
        setData(updatedReq);
        setNoticeModal({
          visible: true,
          title: 'Thanh toán PayOS thành công!',
          message: `Hệ thống đã xác nhận thanh toán thành công cho đơn #${updatedReq.code}. Cảm ơn bạn đã tin tưởng dịch vụ cứu hộ SRAS!`,
          type: 'success',
          primaryText: 'Xem hoá đơn',
          onPrimary: () => {
            setNoticeModal((prev) => ({ ...prev, visible: false }));
            loadData();
          },
        });
      } else if (!silent) {
        setNoticeModal({
          visible: true,
          title: 'Chưa nhận được thanh toán',
          message: 'Hệ thống đang chờ ngân hàng đồng bộ. Nếu bạn đã chuyển khoản thành công, vui lòng bấm thử lại sau 5-10 giây.',
          type: 'info',
        });
      }
    } catch (e: any) {
      if (!silent) {
        setNoticeModal({
          visible: true,
          title: 'Kiểm tra thất bại',
          message: e?.response?.data?.message || e?.message || 'Không thể kiểm tra giao dịch PayOS.',
          type: 'error',
        });
      }
    } finally {
      if (!silent) setCheckingPayOS(false);
    }
  };

  // Khách hàng bấm nút xác nhận thanh toán tiền mặt
  const handleConfirmCash = async () => {
    setCashConfirmModalVisible(false);
    const targetId = viewingDetailId || data?.id;
    if (!targetId) return;
    try {
      setConfirmingCash(true);
      const res = await rescueApi.selectCash(targetId);
      setData((prev) => (prev ? { ...prev, ...res, cashConfirmedByCustomer: true, paymentMethod: 'CASH' } : res));
      router.replace({
        pathname: '/customer/rescue-tracking',
        params: { id: String(targetId), cashConfirmed: '1' },
      } as any);
    } catch (e: any) {
      setNoticeModal({
        visible: true,
        title: 'Không thể xác nhận tiền mặt',
        message: e?.response?.data?.message || e?.message || 'Vui lòng thử lại sau giây lát.',
        type: 'error',
      });
    } finally {
      setConfirmingCash(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={INK} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {viewingDetailId != null ? `Hoá đơn #${data?.code || viewingDetailId}` : 'Thanh toán & Hoá đơn'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={{ marginTop: 10, color: SUB, fontWeight: '600' }}>Đang nạp thông tin hoá đơn...</Text>
        </View>
      ) : viewingDetailId != null && data ? (
        /* ════════════════ MÀN HÌNH CHI TIẾT HOÁ ĐƠN ════════════════ */
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND]} />}
        >
          {/* Nút quay lại danh sách hoá đơn */}
          {!params.id && (
            <TouchableOpacity
              style={styles.backToListBtn}
              onPress={() => {
                setViewingDetailId(null);
                setData(null);
              }}
              activeOpacity={0.8}
            >
              <ChevronLeft size={18} color={BRAND} strokeWidth={2.4} />
              <Text style={styles.backToListText}>Quay lại danh sách hoá đơn</Text>
            </TouchableOpacity>
          )}

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
              <Text style={styles.metaLabel}>Mã yêu cầu cứu hộ:</Text>
              <Text style={styles.metaVal}>#{data?.code || data?.id}</Text>
            </View>
            <View style={styles.invoiceMetaRow}>
              <Text style={styles.metaLabel}>Loại phương tiện:</Text>
              <Text style={styles.metaVal}>{data?.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'}</Text>
            </View>
            {data?.garage?.name && (
              <View style={styles.invoiceMetaRow}>
                <Text style={styles.metaLabel}>Gara thực hiện:</Text>
                <Text style={styles.metaVal}>{data.garage.name}</Text>
              </View>
            )}
            {isTow && data?.garage?.address && (
              <View style={styles.invoiceMetaRow}>
                <Text style={styles.metaLabel}>Địa chỉ garage nhận xe:</Text>
                <Text style={[styles.metaVal, { flex: 1, textAlign: 'right' }]}>{data.garage.address}</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* 1. Phí di chuyển đến */}
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>1. Phí di chuyển đến & kiểm tra xe</Text>
                <Text style={styles.itemSub}>Phí di chuyển thợ cứu hộ đến hiện trường & kiểm tra</Text>
              </View>
              <Text style={styles.itemPrice}>{formatVnd(inspectionFee)}</Text>
            </View>

            {/* 2. Phí kéo xe về garage (nếu có và không từ chối) */}
            {!isDeclined && (towingFee > 0 || isTow) && (
              <View style={styles.itemRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.itemName}>2. Phí kéo xe về garage</Text>
                  <Text style={styles.itemSub}>
                    {data?.towingReason ? `Lý do: ${data.towingReason}` : 'Dịch vụ xe kéo chuyên dụng về garage'}
                  </Text>
                </View>
                <Text style={[styles.itemPrice, { color: '#ea580c' }]}>{formatVnd(towingFee)}</Text>
              </View>
            )}

            {/* 3. Các hạng mục sửa chữa & phụ tùng tại garage */}
            {repairItems.map((item, index) => (
              <View key={item.id || index} style={styles.itemRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.itemName}>
                    {`${(!isDeclined && (towingFee > 0 || isTow)) ? index + 3 : index + 2}. ${item.name}`}
                  </Text>
                  <Text style={styles.itemSub}>
                    {item.quantity && item.quantity > 1 ? `SL: ${item.quantity} · ` : ''}
                    Hạng mục sửa chữa & phụ tùng hoàn tất
                  </Text>
                </View>
                <Text style={styles.itemPrice}>{formatVnd(item.amount || item.price || 0)}</Text>
              </View>
            ))}

            {isDeclined && (
              <View style={{ backgroundColor: '#fef2f2', padding: 10, borderRadius: 10, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#fecaca' }}>
                <Text style={{ fontSize: 12, color: '#b91c1c', fontWeight: '600' }}>
                  Bạn đã từ chối báo giá nên chỉ thanh toán phí di chuyển đến & kiểm tra xe tại hiện trường. Không tính phí kéo xe hay sửa chữa.
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Tổng cộng */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
              <Text style={styles.totalAmount}>{formatVnd(grandTotal)}</Text>
            </View>
          </View>

          {/* Trạng thái ĐÃ THANH TOÁN */}
          {isPaid ? (
            <View style={styles.paidBox}>
              <View style={styles.paidIconWrap}>
                <CheckCircle2 size={44} color={GREEN} strokeWidth={2.4} />
              </View>
              <Text style={styles.paidTitle}>ĐÃ THANH TOÁN THÀNH CÔNG</Text>
              <Text style={styles.paidSub}>
                Đơn cứu hộ #{data?.code || data?.id} đã hoàn tất thanh toán toàn bộ chi phí.
              </Text>

              <View style={styles.paidInfoGrid}>
                <View style={styles.paidInfoRow}>
                  <Text style={styles.paidInfoLabel}>Số tiền đã trả:</Text>
                  <Text style={[styles.paidInfoVal, { color: GREEN, fontSize: 16 }]}>
                    {formatVnd(grandTotal)}
                  </Text>
                </View>
                <View style={styles.paidInfoRow}>
                  <Text style={styles.paidInfoLabel}>Hình thức thanh toán:</Text>
                  <Text style={styles.paidInfoVal} numberOfLines={1} ellipsizeMode="tail">
                    {data?.paymentMethod === 'CASH' || data?.cashConfirmedByCustomer
                      ? 'Tiền mặt tại hiện trường'
                      : 'Chuyển khoản VietQR'}
                  </Text>
                </View>
                {data?.completedAt ? (
                  <View style={styles.paidInfoRow}>
                    <Text style={styles.paidInfoLabel}>Thời gian hoàn tất:</Text>
                    <Text style={styles.paidInfoVal}>{formatDateTime(data.completedAt)}</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ width: '100%', marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.primaryBtn, { width: '100%' }]}
                  onPress={() => router.replace('/customer')}
                  activeOpacity={0.9}
                >
                  <Text style={styles.primaryText}>Về trang chủ</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Trạng thái CHỜ THANH TOÁN */
            <>
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
                  <CreditCard size={24} color={BLUE} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.methodTitle}>PayOS / Chuyển khoản ngân hàng</Text>
                  </View>
                  <Text style={styles.methodDesc}>Quét mã QR VietQR hoặc chuyển khoản trực tiếp</Text>
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
                  <Text style={styles.methodTitle}>Thanh toán tiền mặt</Text>
                  <Text style={styles.methodDesc}>
                    {isTow ? 'Thanh toán trực tiếp cho nhân viên khi nhận xe tại garage' : 'Thanh toán trực tiếp cho nhân viên cứu hộ'}
                  </Text>
                </View>
                <View style={[styles.radioCircle, selectedMethod === 'CASH' && styles.radioCircleOn]}>
                  {selectedMethod === 'CASH' && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>

              {/* Khu vực nút hành động tương ứng */}
              {selectedMethod === 'PAYOS' ? (
                <View style={{ marginTop: 24 }}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, paying && { opacity: 0.7 }]}
                    onPress={handlePayOS}
                    disabled={paying}
                    activeOpacity={0.9}
                  >
                    {paying ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryText}>Thanh toán {formatVnd(grandTotal)}</Text>
                    )}
                  </TouchableOpacity>
                  <View style={styles.securityRow}>
                    <ShieldCheck size={16} color={GREEN} />
                    <Text style={styles.securityText}>Thanh toán bảo mật chuẩn SSL qua cổng PayOS</Text>
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 20 }}>
                  {data?.cashConfirmedByCustomer ? (
                    <View style={styles.cashConfirmedCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <CheckCircle2 size={20} color={GREEN} />
                        <Text style={styles.cashConfirmedTitle}>Đã xác nhận trả tiền mặt</Text>
                      </View>
                      <Text style={styles.cashConfirmedDesc}>
                        Bạn đã xác nhận trả <Text style={{ fontWeight: '800' }}>{formatVnd(grandTotal)}</Text> tiền mặt.
                        {'\n'}
                        {isTow
                          ? 'Vui lòng thanh toán cho nhân viên tại garage khi bạn đến nhận xe. Khi nhân viên xác nhận thu tiền, đơn sẽ hoàn tất.'
                          : 'Vui lòng đưa tiền cho nhân viên cứu hộ. Khi nhân viên xác nhận thu tiền, đơn sẽ hoàn tất ngay.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.cashNoticeBox}>
                      <Text style={styles.cashNoticeText}>
                        {isTow
                          ? `Bạn chọn trả tiền mặt: Vui lòng nhấn nút xác nhận bên dưới, sau đó thanh toán đúng `
                          : `Bạn chọn trả tiền mặt: Vui lòng nhấn nút xác nhận bên dưới để thông báo cho nhân viên, sau đó đưa đúng `}
                        <Text style={{ fontWeight: '800' }}>{formatVnd(grandTotal)}</Text>
                        {isTow ? ' cho nhân viên khi bạn đến nhận xe tại garage.' : ' cho nhân viên cứu hộ.'}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.cashActionBtn, confirmingCash && { opacity: 0.7 }]}
                    onPress={() => setCashConfirmModalVisible(true)}
                    disabled={confirmingCash}
                    activeOpacity={0.88}
                  >
                    {confirmingCash ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Banknote size={20} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text style={styles.cashActionText}>
                          {data?.cashConfirmedByCustomer
                            ? `Xác nhận lại trả tiền mặt (${formatVnd(grandTotal)})`
                            : `Xác nhận thanh toán tiền mặt (${formatVnd(grandTotal)})`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryBtn, { marginTop: 12 }]}
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
      ) : (
        /* ════════════════ MÀN HÌNH DANH SÁCH HOÁ ĐƠN (TAB BAR THANH TOÁN) ════════════════ */
        <View style={styles.container}>
          {/* Tabs chuyển đổi Chờ thanh toán / Đã thanh toán */}
          <View style={styles.tabHeader}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'PENDING' && styles.tabButtonActive]}
              onPress={() => setActiveTab('PENDING')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, activeTab === 'PENDING' && styles.tabButtonTextActive]}>
                Chờ thanh toán
              </Text>
              {pendingList.length > 0 && (
                <View style={styles.tabBadgePending}>
                  <Text style={styles.tabBadgePendingText}>{pendingList.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'PAID' && styles.tabButtonActive]}
              onPress={() => setActiveTab('PAID')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, activeTab === 'PAID' && styles.tabButtonTextActive]}>
                Đã thanh toán
              </Text>
              {paidList.length > 0 && (
                <View style={styles.tabBadgePaid}>
                  <Text style={styles.tabBadgePaidText}>{paidList.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.listBody}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND]} />}
          >
            {activeTab === 'PENDING' ? (
              /* TAB: CHỜ THANH TOÁN */
              pendingList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: '#f0fdf4' }]}>
                    <CheckCircle2 size={40} color={GREEN} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.emptyTitle}>Không có khoản cần thanh toán</Text>
                  <Text style={styles.emptyDesc}>
                    Tất cả các chi phí cứu hộ của bạn đã được thanh toán hoặc không có đơn nào đang chờ.
                  </Text>
                  {paidList.length > 0 && (
                    <TouchableOpacity
                      style={[styles.primaryBtn, { paddingHorizontal: 20, height: 46, marginTop: 14 }]}
                      onPress={() => setActiveTab('PAID')}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.primaryText}>Xem hoá đơn đã thanh toán ({paidList.length})</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <Text style={styles.listSectionTitle}>Các yêu cầu cứu hộ chờ bạn thanh toán</Text>
                  {pendingList.map((item) => {
                    const fee = item.totalAmount ?? ((item.inspectionFee ?? item.rescueFee ?? 0) + (item.towingFee ?? 0) + (item.repairFee ?? 0));
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.pendingItemCard}
                        onPress={() => handleSelectInvoice(item)}
                        activeOpacity={0.88}
                      >
                        <View style={styles.itemCardTop}>
                          <View style={styles.pendingBadge}>
                            <Clock size={13} color="#c2410c" />
                            <Text style={styles.pendingBadgeText}>Chờ thanh toán</Text>
                          </View>
                          <Text style={styles.itemCode}>#{item.code || item.id}</Text>
                        </View>

                        <Text style={styles.itemVehicleText}>
                          {item.vehicleType === 'CAR' ? '🚗 Xe ô tô' : '🏍️ Xe máy'} · {item.symptom || 'Cứu hộ giao thông'}
                        </Text>
                        {item.garage?.name && (
                          <Text style={styles.itemGarageText}>Gara: {item.garage.name}</Text>
                        )}

                        <View style={styles.itemCardBottom}>
                          <View>
                            <Text style={styles.itemFeeLabel}>Số tiền cần trả:</Text>
                            <Text style={styles.itemFeeVal}>{formatVnd(fee)}</Text>
                          </View>
                          <View style={styles.payNowBtn}>
                            <Text style={styles.payNowText}>Thanh toán</Text>
                            <ChevronRight size={16} color="#ffffff" strokeWidth={2.4} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            ) : (
              /* TAB: ĐÃ THANH TOÁN */
              paidList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: '#f8fafc' }]}>
                    <Receipt size={40} color={SUB} strokeWidth={2} />
                  </View>
                  <Text style={styles.emptyTitle}>Chưa có hoá đơn đã thanh toán</Text>
                  <Text style={styles.emptyDesc}>
                    Lịch sử các lần thanh toán cứu hộ thành công của bạn sẽ được lưu trữ và hiển thị chi tiết tại đây.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <Text style={styles.listSectionTitle}>Lịch sử hoá đơn điện tử ({paidList.length})</Text>
                  {paidList.map((item) => {
                    const fee = item.totalAmount ?? ((item.inspectionFee ?? item.rescueFee ?? 0) + (item.towingFee ?? 0) + (item.repairFee ?? 0));
                    const isCash = item.paymentMethod === 'CASH' || item.cashConfirmedByCustomer;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.paidItemCard}
                        onPress={() => handleSelectInvoice(item)}
                        activeOpacity={0.88}
                      >
                        <View style={styles.itemCardTop}>
                          <View style={styles.paidBadge}>
                            <CheckCircle2 size={13} color="#15803d" />
                            <Text style={styles.paidBadgeText}>Đã thanh toán</Text>
                          </View>
                          <Text style={styles.itemCode}>#{item.code || item.id}</Text>
                        </View>

                        <Text style={styles.itemVehicleText}>
                          {item.vehicleType === 'CAR' ? '🚗 Ô tô' : '🏍️ Xe máy'} · {item.symptom || 'Cứu hộ giao thông'}
                        </Text>

                        {item.garage?.name && (
                          <Text style={styles.itemGarageText}>Gara: {item.garage.name}</Text>
                        )}

                        <View style={styles.dividerLight} />

                        <View style={styles.itemCardBottom}>
                          <View>
                            <Text style={styles.paidMethodText}>
                              {isCash ? '💵 Tiền mặt' : '💳 PayOS / QR'} · {formatDateTime(item.completedAt || item.createdAt)}
                            </Text>
                            <Text style={styles.paidAmountVal}>{formatVnd(fee)}</Text>
                          </View>
                          <View style={styles.viewInvoiceLink}>
                            <Text style={styles.viewInvoiceText}>Chi tiết</Text>
                            <ChevronRight size={16} color={BRAND} strokeWidth={2.4} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            )}
          </ScrollView>
        </View>
      )}

      {/* ── MODAL XÁC NHẬN CHỌN TRẢ TIỀN MẶT ── */}
      <Modal visible={cashConfirmModalVisible} transparent animationType="fade">
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalBox}>
            <View style={[styles.customModalIconCircle, { backgroundColor: '#fff7ed' }]}>
              <Banknote size={36} color={BRAND} />
            </View>
            <Text style={styles.customModalTitle}>Xác nhận thanh toán tiền mặt?</Text>
            <Text style={styles.customModalDesc}>
              Bạn đồng ý thanh toán trực tiếp số tiền{' '}
              <Text style={{ fontWeight: '800', color: INK }}>{formatVnd(grandTotal)}</Text>{' '}
              {isTow ? 'cho nhân viên khi đến nhận xe tại garage.' : 'cho nhân viên cứu hộ tại hiện trường.'}{'\n\n'}
              Sau khi bạn xác nhận, nhân viên mới có thể hoàn tất quy trình thu tiền và bàn giao xe cho bạn.
            </Text>

            <View style={styles.customModalBtnRow}>
              <TouchableOpacity
                style={styles.customModalCancelBtn}
                onPress={() => setCashConfirmModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.customModalCancelText}>Huỷ bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customModalConfirmBtn, { backgroundColor: BRAND }]}
                onPress={handleConfirmCash}
                disabled={confirmingCash}
                activeOpacity={0.88}
              >
                {confirmingCash ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.customModalConfirmText}>Xác nhận ngay</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL THANH TOÁN PAYOS (QUÉT MÃ VIETQR HOẶC MỞ LINK) ── */}
      <Modal visible={payOSModalVisible} transparent animationType="slide">
        <View style={styles.payOSOverlay}>
          <View style={styles.payOSModalContainer}>
            {/* Header Modal */}
            <View style={styles.payOSHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.payOSIconPill}>
                  <CreditCard size={18} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.payOSHeaderTitle}>Thanh toán trực tuyến PayOS</Text>
                  <Text style={styles.payOSHeaderSub}>Chuyển khoản VietQR tự động 24/7</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.payOSCloseBtn}
                onPress={() => setPayOSModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={BRAND} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.payOSScrollContent}>
              {/* Badge số tiền */}
              <View style={styles.payOSAmountBox}>
                <Text style={styles.payOSAmountLabel}>Số tiền cần thanh toán</Text>
                <Text style={styles.payOSAmountValue}>{formatVnd(payOSData?.amount || grandTotal)}</Text>
              </View>

              {/* Box Mã QR VietQR */}
              {payOSData && (
                <View style={styles.payOSQRCard}>
                  <Text style={styles.payOSQRInstruction}>Mở app ngân hàng bất kỳ để quét mã QR:</Text>
                  <View style={styles.payOSQRImageWrap}>
                    <Image
                      source={{
                        uri: payOSData.bin && payOSData.accountNumber
                          ? `https://img.vietqr.io/image/${payOSData.bin}-${payOSData.accountNumber}-compact2.png?amount=${payOSData.amount}&addInfo=${encodeURIComponent(payOSData.description)}&accountName=${encodeURIComponent(payOSData.accountName || '')}`
                          : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payOSData.checkoutUrl)}`,
                      }}
                      style={styles.payOSQRImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.payOSQRStatusRow}>
                    <ActivityIndicator size="small" color={BRAND} />
                    <Text style={styles.payOSQRStatusText}>Đang chờ bạn quét mã thanh toán...</Text>
                  </View>
                </View>
              )}

              {/* Thông tin chuyển khoản chi tiết */}
              {payOSData && (
                <View style={styles.payOSInfoCard}>
                  {payOSData.accountName ? (
                    <View style={styles.payOSInfoRow}>
                      <Text style={styles.payOSInfoLabel}>Người nhận:</Text>
                      <Text style={styles.payOSInfoValBold}>{payOSData.accountName}</Text>
                    </View>
                  ) : null}
                  {payOSData.accountNumber ? (
                    <View style={styles.payOSInfoRow}>
                      <Text style={styles.payOSInfoLabel}>Số tài khoản:</Text>
                      <TouchableOpacity
                        style={styles.payOSCopyRow}
                        onPress={() => copyToClipboard(payOSData.accountNumber!, 'acc')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.payOSInfoValMono}>{payOSData.accountNumber}</Text>
                        <Copy size={13} color={copiedField === 'acc' ? GREEN : BRAND} />
                        <Text style={[styles.copyTip, copiedField === 'acc' && { color: GREEN }]}>
                          {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  <View style={styles.payOSInfoRow}>
                    <Text style={styles.payOSInfoLabel}>Số tiền:</Text>
                    <Text style={[styles.payOSInfoValBold, { color: BRAND, fontSize: 16 }]}>
                      {formatVnd(payOSData.amount || grandTotal)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Box nội dung chuyển khoản riêng biệt, hiển thị đầy đủ, không bao giờ tràn viền */}
              {payOSData && (
                <View style={styles.payOSDescCard}>
                  <View style={styles.payOSDescHeader}>
                    <Text style={styles.payOSDescLabel}>Nội dung chuyển khoản (bắt buộc):</Text>
                    <TouchableOpacity
                      style={styles.payOSDescCopyBtn}
                      onPress={() => copyToClipboard(payOSData.description || 'SRAS chuyen tien sua xe', 'desc')}
                      activeOpacity={0.7}
                    >
                      <Copy size={13} color={copiedField === 'desc' ? GREEN : BRAND} />
                      <Text style={[styles.copyTip, copiedField === 'desc' && { color: GREEN }]}>
                        {copiedField === 'desc' ? 'Đã chép' : 'Sao chép'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.payOSDescBox}>
                    <Text style={styles.payOSDescText} selectable>
                      {payOSData.description || 'SRAS chuyen tien sua xe'}
                    </Text>
                  </View>
                  <Text style={styles.payOSDescNote}>
                    * Vui lòng giữ đúng nội dung chuyển khoản để hệ thống tự động hoàn tất đơn.
                  </Text>
                </View>
              )}

              {/* Tự động xác nhận giao dịch & các hành động */}
              <View style={styles.payOSActionGroup}>
                <View style={styles.payOSAutoStatusBox}>
                  <View style={styles.payOSAutoStatusPulse}>
                    <ActivityIndicator size="small" color="#16a34a" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.payOSAutoStatusTitle}>Đang tự động ghi nhận chuyển khoản...</Text>
                    <Text style={styles.payOSAutoStatusSub}>
                      Sau khi chuyển khoản thành công, hệ thống sẽ tự động hoàn tất đơn tức thì mà bạn không cần phải bấm xác nhận.
                    </Text>
                  </View>
                </View>

                {payOSData?.accountNumber && payOSData?.description ? (
                  <TouchableOpacity
                    style={styles.payOSCopyAllBtn}
                    onPress={async () => {
                      try {
                        await Clipboard.setStringAsync(
                          `STK: ${payOSData.accountNumber}\nNội dung: ${payOSData.description}\nSố tiền: ${payOSData.amount}`
                        );
                        copyToClipboard(payOSData.accountNumber || '', 'all');
                      } catch { }
                    }}
                    activeOpacity={0.88}
                  >
                    <Copy size={16} color={copiedField === 'all' ? GREEN : BLUE} style={{ marginRight: 8 }} />
                    <Text style={[styles.payOSCopyAllText, copiedField === 'all' && { color: GREEN }]}>
                      {copiedField === 'all' ? '✓ Đã chép thông tin chuyển khoản' : 'Sao chép đầy đủ thông tin chuyển khoản'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {payOSData?.checkoutUrl ? (
                  <TouchableOpacity
                    style={styles.payOSOpenBrowserBtn}
                    onPress={async () => {
                      if (payOSData.accountNumber && payOSData.description) {
                        try {
                          await Clipboard.setStringAsync(payOSData.description);
                        } catch { }
                      }
                      Linking.openURL(payOSData.checkoutUrl);
                    }}
                    activeOpacity={0.88}
                  >
                    <ExternalLink size={16} color={BRAND} style={{ marginRight: 8 }} />
                    <Text style={styles.payOSOpenBrowserText}>Mở trang thanh toán PayOS trên web</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL THÔNG BÁO CHUNG (THAY CHO ALERT.ALERT) ── */}
      <Modal visible={noticeModal.visible} transparent animationType="fade">
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalBox}>
            <View
              style={[
                styles.customModalIconCircle,
                {
                  backgroundColor:
                    noticeModal.type === 'success'
                      ? '#fff7ed'
                      : noticeModal.type === 'error'
                        ? '#fef2f2'
                        : '#eff6ff',
                },
              ]}
            >
              {noticeModal.type === 'success' ? (
                <CheckCircle2 size={36} color={BRAND} />
              ) : noticeModal.type === 'error' ? (
                <AlertCircle size={36} color="#dc2626" />
              ) : (
                <HelpCircle size={36} color={BRAND} />
              )}
            </View>
            <Text style={styles.customModalTitle}>{noticeModal.title}</Text>
            <Text style={styles.customModalDesc}>{noticeModal.message}</Text>

            <TouchableOpacity
              style={[
                styles.customModalSingleBtn,
                {
                  backgroundColor:
                    noticeModal.type === 'success'
                      ? BRAND
                      : noticeModal.type === 'error'
                        ? '#dc2626'
                        : BRAND,
                },
              ]}
              onPress={() => {
                if (noticeModal.onPrimary) {
                  noticeModal.onPrimary();
                } else {
                  setNoticeModal((prev) => ({ ...prev, visible: false }));
                }
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.customModalConfirmText}>
                {noticeModal.primaryText || 'Đã hiểu'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },
  listBody: { padding: 16, paddingBottom: 60 },

  // Tabs Header
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: SUB,
  },
  tabButtonTextActive: {
    color: BRAND,
    fontWeight: '800',
  },
  tabBadgePending: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgePendingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  tabBadgePaid: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgePaidText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },

  listSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SUB,
    marginBottom: 4,
  },

  // Empty Card
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: LINE,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: INK,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13.5,
    color: SUB,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // Items List Card
  pendingItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  paidItemCard: {
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
  itemCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#c2410c',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
  },
  itemCode: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#94a3b8',
  },
  itemVehicleText: {
    fontSize: 15,
    fontWeight: '800',
    color: INK,
    marginBottom: 4,
  },
  itemGarageText: {
    fontSize: 13,
    color: SUB,
    fontWeight: '500',
    marginBottom: 12,
  },
  itemCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemFeeLabel: {
    fontSize: 12,
    color: SUB,
    fontWeight: '600',
  },
  itemFeeVal: {
    fontSize: 18,
    fontWeight: '900',
    color: BRAND,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  payNowText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  paidMethodText: {
    fontSize: 12,
    color: SUB,
    fontWeight: '500',
    marginBottom: 2,
  },
  paidAmountVal: {
    fontSize: 17,
    fontWeight: '900',
    color: GREEN,
  },
  viewInvoiceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 2,
  },
  viewInvoiceText: {
    fontSize: 13,
    fontWeight: '800',
    color: BRAND,
  },
  dividerLight: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },

  // Back to list button inside detail view
  backToListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 4,
  },
  backToListText: {
    fontSize: 13,
    fontWeight: '800',
    color: BRAND,
  },

  rejectNotice: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  rejectNoticeText: { fontSize: 13, color: '#991b1b', fontWeight: '600', lineHeight: 19 },

  // Invoice Detail Card
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

  // Paid Detail Block
  paidBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#86efac',
    gap: 8,
  },
  paidIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  paidTitle: { fontSize: 18, fontWeight: '900', color: '#15803d', marginTop: 4 },
  paidSub: { fontSize: 13, color: SUB, textAlign: 'center', marginBottom: 10 },
  paidInfoGrid: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: LINE,
  },
  paidInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  paidInfoLabel: {
    fontSize: 13,
    color: SUB,
    fontWeight: '500',
    flexShrink: 0,
  },
  paidInfoVal: {
    fontSize: 13,
    color: INK,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },

  cashConfirmedCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  cashConfirmedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803d',
    marginLeft: 8,
  },
  cashConfirmedDesc: {
    fontSize: 13.5,
    color: '#166534',
    lineHeight: 20,
    marginTop: 4,
  },

  cashActionBtn: {
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
  cashActionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Modal Styles
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  customModalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  customModalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  customModalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
    marginBottom: 8,
  },
  customModalDesc: {
    fontSize: 14,
    color: SUB,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  customModalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  customModalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customModalCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND,
  },
  customModalConfirmBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  customModalConfirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  customModalSingleBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },

  // PayOS Modal Styles
  payOSOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  payOSModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    maxHeight: '90%',
    paddingBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  payOSHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  payOSIconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOSHeaderTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: INK,
  },
  payOSHeaderSub: {
    fontSize: 12,
    color: SUB,
    marginTop: 1,
  },
  payOSCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOSScrollContent: {
    padding: 20,
    gap: 16,
  },
  payOSAmountBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  payOSAmountLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#9a3412',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payOSAmountValue: {
    fontSize: 26,
    fontWeight: '900',
    color: BRAND,
    marginTop: 4,
  },
  payOSQRCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LINE,
  },
  payOSQRInstruction: {
    fontSize: 13,
    fontWeight: '600',
    color: SUB,
    marginBottom: 12,
    textAlign: 'center',
  },
  payOSQRImageWrap: {
    width: 220,
    height: 220,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  payOSQRImage: {
    width: '100%',
    height: '100%',
  },
  payOSQRStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  payOSQRStatusText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: BRAND,
  },
  payOSInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  payOSInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payOSInfoLabel: {
    fontSize: 13,
    color: SUB,
    fontWeight: '600',
  },
  payOSInfoValBold: {
    fontSize: 13.5,
    fontWeight: '800',
    color: INK,
  },
  payOSInfoValMono: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
    letterSpacing: 0.5,
  },
  payOSCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  copyTip: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND,
  },
  payOSDescCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
    gap: 8,
  },
  payOSDescHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payOSDescLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#854d0e',
    flex: 1,
  },
  payOSDescCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  payOSDescBox: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  payOSDescText: {
    fontSize: 14,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.3,
  },
  payOSDescNote: {
    fontSize: 11.5,
    color: '#a16207',
    lineHeight: 16,
  },
  payOSActionGroup: {
    gap: 10,
    marginTop: 4,
  },
  payOSAutoStatusBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  payOSAutoStatusPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payOSAutoStatusTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#15803d',
  },
  payOSAutoStatusSub: {
    fontSize: 11.5,
    color: '#166534',
    marginTop: 2,
    lineHeight: 16,
  },
  payOSCopyAllBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOSCopyAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
  },
  payOSOpenBrowserBtn: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOSOpenBrowserText: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Phone,
  MessageSquare,
  ShieldCheck,
  Clock,
  AlertCircle,
  Check,
  X,
  FileText,
  Car,
  Wrench,
  CheckCircle2,
  HelpCircle,
  Truck,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto } from '../../api/rescueApi';
import { chatApi } from '../../api/chatApi';
import { resolveFileUrl } from '../../api/axiosClient';
import { formatVnd } from '../../utils/rescueFee';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const LINE = '#e2e8f0';
const GREEN = '#16a34a';
const DANGER = '#dc2626';

export default function RescueQuoteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const requestId = params.id ? parseInt(params.id, 10) : NaN;

  const [data, setData] = useState<RescueRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
        console.warn('Lỗi nạp thông tin đơn báo giá:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    // Tự động kiểm tra mỗi 2.5s để cập nhật ngay khi thợ gửi báo giá
    const pollTimer = setInterval(async () => {
      try {
        const res = await rescueApi.getOne(requestId);
        if (alive) {
          setData(res);
        }
      } catch {}
    }, 2500);

    return () => {
      alive = false;
      clearInterval(pollTimer);
    };
  }, [requestId]);

  // Phí di chuyển / kiểm tra tối thiểu bắt buộc của thợ
  const inspectionFee = data?.inspectionFee ?? data?.rescueFee ?? (data?.minPayableAmount ?? 50000);
  const towingFee = data?.towingFee ?? 0;

  // Đề xuất kéo về garage
  const isTow = data?.quoteType === 'TOW' || data?.isTowing === true || (towingFee > 0 && !!data?.towingReason);

  // Danh sách các dịch vụ/phụ tùng thợ đề xuất sau khi kiểm tra
  const repairItems = data?.repairItems && data.repairItems.length > 0
    ? data.repairItems
    : [];

  const repairItemsSum = repairItems.reduce((acc, item) => {
    const qty = item.quantity || 1;
    const price = item.price ?? 0;
    const amount = item.amount != null ? item.amount : price * qty;
    return acc + amount;
  }, 0);

  const repairTotal = repairItems.length > 0
    ? repairItemsSum
    : (data?.repairFee ?? data?.serviceFee ?? 0);

  // Tổng dự kiến khi sửa = Phí kiểm tra + Phí kéo xe (nếu có) + Toàn bộ phí sửa chữa/phụ tùng
  const grandTotal = inspectionFee + towingFee + repairTotal;

  // Lấy ảnh minh chứng hiện trường do thợ chụp gửi qua
  const evidencePhoto = data?.photos && data.photos.length > 0
    ? resolveFileUrl(data.photos[0])
    : null;

  const staffName = data?.staff?.name || data?.garage?.name || 'Thợ cứu hộ SRAS';
  const staffPhone = data?.staff?.phone || data?.garage?.phone || '';

  const handleCall = () => {
    if (!staffPhone) {
      Alert.alert('Chưa có SĐT', 'Không tìm thấy số điện thoại của thợ cứu hộ.');
      return;
    }
    Linking.openURL(`tel:${staffPhone}`).catch(() => {
      Alert.alert('Không thể gọi', `Vui lòng quay số trực tiếp: ${staffPhone}`);
    });
  };

  const activeRequestId = Number.isFinite(requestId) ? requestId : (data?.id ? Number(data.id) : NaN);

  const handleChat = async () => {
    const targetId = Number.isFinite(activeRequestId) ? activeRequestId : (data?.id ? Number(data.id) : NaN);
    if (!Number.isFinite(targetId)) {
      Alert.alert('Chưa có thông tin', 'Không tìm thấy thông tin đơn cứu hộ để mở tin nhắn.');
      return;
    }

    let resolvedPeer: 'STAFF' | 'GARAGE' = data?.staff ? 'STAFF' : 'GARAGE';
    let resolvedPeerName = staffName;
    let resolvedPeerPhone = staffPhone;
    let resolvedPeerRole = data?.staff ? 'Thợ cứu hộ SRAS' : 'Đối tác Gara SRAS';
    let resolvedAvatar = '';
    let isOnline = true;
    let onlineText = 'Đang hoạt động';

    try {
      const convos = await chatApi.getConversations();
      const existing = convos.find((c) => c.rescueRequestId === targetId);
      if (existing) {
        resolvedPeer = existing.peerRole as 'STAFF' | 'GARAGE';
        resolvedPeerName = existing.peerName || resolvedPeerName;
        resolvedPeerPhone = existing.peerPhone || resolvedPeerPhone;
        resolvedPeerRole = existing.peerRole === 'STAFF' ? 'Thợ cứu hộ SRAS' : 'Đối tác Gara SRAS';
        resolvedAvatar = existing.peerAvatarUrl || '';
        isOnline = Boolean(existing.isOnline);
        onlineText = existing.onlineStatusText || (isOnline ? 'Đang hoạt động' : 'Ngoại tuyến');
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra hội thoại đã có:', err);
    }

    router.push({
      pathname: '/chat',
      params: {
        requestId: String(targetId),
        peer: resolvedPeer,
        peerName: resolvedPeerName,
        peerPhone: resolvedPeerPhone || '',
        peerRole: resolvedPeerRole,
        peerAvatar: resolvedAvatar,
        peerIsOnline: String(isOnline),
        onlineStatusText: onlineText,
      },
    } as any);
  };

  // Khách bấm Chấp nhận báo giá -> mở modal xác nhận đẹp
  const handleApproveQuote = () => {
    setApproveModalVisible(true);
  };

  const executeApproveQuote = async () => {
    try {
      setActionLoading(true);
      const targetId = Number.isFinite(activeRequestId) ? activeRequestId : (data?.id ? Number(data.id) : NaN);
      if (Number.isFinite(targetId)) {
        try {
          await rescueApi.acceptQuote(targetId);
        } catch (apiErr) {
          console.warn('Lỗi acceptQuote, fallback advance:', apiErr);
          const fallbackStatus = isTow ? 'TOW_TO_GARAGE' : 'REPAIRING_ONSITE';
          await rescueApi.advance(targetId, fallbackStatus);
        }
      }
      setApproveModalVisible(false);
      router.replace({
        pathname: '/customer/rescue-tracking',
        params: { id: String(targetId) },
      });
    } catch (err: any) {
      setApproveModalVisible(false);
      setErrorModalMsg(err?.message || 'Không thể duyệt báo giá lúc này. Vui lòng thử lại sau giây lát.');
    } finally {
      setActionLoading(false);
    }
  };

  // Khách xác nhận Từ chối báo giá (chỉ trả phí kiểm tra)
  const handleConfirmReject = async () => {
    try {
      setActionLoading(true);
      setRejectModalVisible(false);
      if (Number.isFinite(requestId)) {
        try {
          await rescueApi.declineQuote(requestId);
        } catch (e) {
          console.warn('Lỗi gọi declineQuote API:', e);
        }
      }
      router.replace({
        pathname: '/customer/payment',
        params: {
          id: String(requestId),
          amount: String(inspectionFee),
          rejectQuote: '1',
        },
      });
    } catch (err: any) {
      setErrorModalMsg(err?.message || 'Không thể cập nhật từ chối báo giá.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={INK} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Chi tiết báo giá sự cố</Text>
          <Text style={styles.headerSubtitle}>
            {data?.code ? `Mã đơn: #${data.code}` : `Mã đơn: #${requestId || 'TK-88291'}`}
          </Text>
        </View>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>CHỜ DUYỆT</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.loadingText}>Đang tải thông tin báo giá...</Text>
        </View>
      ) : (data?.status === 'ARRIVED' || (data?.status !== 'DIAGNOSED' && data?.quoteStatus !== 'PENDING' && data?.quoteStatus !== 'APPROVED' && data?.quoteStatus !== 'DECLINED')) ? (
        <View style={styles.centerBox}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: '#FED7AA' }}>
            <Wrench size={34} color={BRAND} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: INK, marginBottom: 8, textAlign: 'center' }}>
            Thợ đang kiểm tra & lập bảng giá
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, paddingHorizontal: 28, marginBottom: 20 }}>
            Nhân viên cứu hộ đang kiểm tra tình trạng phương tiện tại hiện trường và lập bảng giá chi tiết. Màn hình sẽ tự động cập nhật ngay khi thợ gửi báo giá.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA' }}>
            <ActivityIndicator size="small" color={BRAND} />
            <Text style={{ color: '#C2410C', fontWeight: '700', fontSize: 13 }}>
              Đang chờ nhân viên cập nhật bảng giá...
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 140 }}>
          {/* Banner trạng thái */}
          <View style={[styles.bannerBox, isTow && { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }]}>
            {isTow ? <Truck size={20} color="#2563eb" /> : <Clock size={20} color="#ea580c" />}
            <Text style={[styles.bannerText, isTow && { color: '#1e40af' }]}>
              {isTow
                ? 'Thợ kiểm tra và xác định xe không thể sửa tại chỗ, đề xuất kéo về garage để sửa chữa chuyên sâu. Vui lòng xem lý do và biểu phí dự kiến.'
                : 'Thợ đã hoàn tất kiểm tra hiện trường và lập bảng báo giá. Vui lòng xem kỹ các hạng mục trước khi xác nhận.'}
            </Text>
          </View>

          {/* Card Đề xuất kéo xe về garage (Nếu có) */}
          {isTow && (
            <View style={[styles.card, { borderColor: '#bfdbfe', borderWidth: 1.5, backgroundColor: '#f8fafc' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ backgroundColor: '#dbeafe', padding: 8, borderRadius: 10, marginRight: 10 }}>
                  <Truck size={22} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e40af' }}>
                    Đề xuất kéo xe về garage
                  </Text>
                  <Text style={{ fontSize: 12, color: '#3b82f6', marginTop: 1 }}>
                    {data?.garage?.name || 'Garage đối tác SRAS'} tiếp nhận sửa chữa
                  </Text>
                </View>
                <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563eb' }}>CỨU HỘ KÉO XE</Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#ffffff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>
                  LÝ DO CỤ THỂ TỪ THỢ KIỂM TRA XE:
                </Text>
                <Text style={{ fontSize: 13.5, color: '#0f172a', lineHeight: 20, fontWeight: '600' }}>
                  "{data?.towingReason || 'Xe hư hỏng phức tạp không thể khắc phục tại hiện trường, cần đưa về garage kiểm tra chuyên sâu'}"
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600' }}>Phí kéo xe về garage:</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#2563eb' }}>{formatVnd(towingFee)}</Text>
              </View>
            </View>
          )}

          {/* Card Thông tin thợ & phương tiện */}
          <View style={styles.card}>
            <View style={styles.mechanicRow}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarInitial}>
                  {(staffName[0] || 'T').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.mechanicName}>{staffName}</Text>
                <Text style={styles.mechanicRole}>
                  {data?.staff ? 'Thợ cứu hộ SRAS' : 'Đối tác Gara SRAS'}
                </Text>
                <View style={styles.vehicleRow}>
                  <Car size={13} color="#0284c7" />
                  <Text style={styles.vehicleInfo}>
                    {data?.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'} • {data?.symptom || 'Cứu hộ khẩn cấp'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Thanh nút liên hệ nhanh to rõ ràng */}
            <View style={styles.contactBarRow}>
              <TouchableOpacity
                style={[styles.contactPillBtn, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
                onPress={handleCall}
                activeOpacity={0.82}
              >
                <Phone size={15} color="#2563eb" />
                <Text style={[styles.contactPillText, { color: '#2563eb' }]}>Gọi điện</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.contactPillBtn, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}
                onPress={handleChat}
                activeOpacity={0.82}
              >
                <MessageSquare size={15} color={BRAND} />
                <Text style={[styles.contactPillText, { color: BRAND }]}>Nhắn tin trao đổi</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Minh chứng kiểm tra hiện trường */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Minh chứng kiểm tra xe</Text>
            </View>
            {evidencePhoto ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: evidencePhoto }} style={styles.evidenceImage} resizeMode="cover" />
              </View>
            ) : (
              <View style={[styles.imageContainer, { padding: 24, alignItems: 'center', backgroundColor: '#F8FAFC' }]}>
                <Text style={{ fontSize: 13, color: SUB, textAlign: 'center' }}>
                  Thợ cứu hộ chưa tải lên ảnh minh chứng hiện trường.
                </Text>
              </View>
            )}
            {data?.locationNote ? (
              <Text style={styles.locationNoteText}>
                Ghi chú: {data.locationNote}
              </Text>
            ) : null}
          </View>

          {/* Bảng chi tiết chi phí */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <FileText size={18} color={INK} />
              <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 6 }]}>
                Bóc tách chi phí minh bạch
              </Text>
            </View>

            {/* Mục 1: Phí di chuyển đến cố định */}
            <View style={styles.feeItem}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.feeItemTitle}>1. Phí di chuyển đến (Cố định)</Text>
                </View>
                <Text style={styles.feeItemSub}>
                  Phí di chuyển thợ cứu hộ đến hiện trường & kiểm tra xe
                </Text>
              </View>
              <Text style={styles.feeItemPrice}>{formatVnd(inspectionFee)}</Text>
            </View>

            {/* Mục kéo xe nếu có */}
            {towingFee > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.feeItem}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.feeItemTitle, { color: '#2563EB' }]}>2. Phí kéo xe về garage</Text>
                    <Text style={styles.feeItemSub}>
                      Vận chuyển phương tiện bằng xe cứu hộ chuyên dụng về garage
                    </Text>
                  </View>
                  <Text style={[styles.feeItemPrice, { color: '#2563EB', fontWeight: '800' }]}>{formatVnd(towingFee)}</Text>
                </View>
              </>
            )}

            <View style={styles.divider} />

            {/* Mục: Hạng mục sửa chữa & Phụ tùng */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Wrench size={15} color={BRAND} />
              <Text style={[styles.feeItemTitle, { marginLeft: 6 }]}>
                {towingFee > 0 ? '3.' : '2.'} Dịch vụ sửa chữa (Dự kiến):
              </Text>
            </View>

            {repairItems.length === 0 ? (
              <Text style={{ fontSize: 13, color: SUB, paddingVertical: 8 }}>
                Thợ không đề xuất thêm hạng mục sửa chữa (Chỉ tính phí di chuyển đến).
              </Text>
            ) : (
              repairItems.map((item, idx) => {
                const qty = item.quantity || 1;
                const price = item.price ?? 0;
                const itemTotal = item.amount != null ? item.amount : price * qty;
                return (
                  <View key={item.id || idx} style={styles.repairRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.repairName}>• {item.name}</Text>
                      {qty > 1 && (
                        <Text style={{ fontSize: 11, color: SUB, marginTop: 1 }}>
                          {formatVnd(price)} x {qty}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.repairPrice}>{formatVnd(itemTotal)}</Text>
                  </View>
                );
              })
            )}

            {/* Ô Tổng chi phí sửa chữa dự kiến căn chuẩn đẹp mắt */}
            <View style={styles.repairSubtotalBox}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.repairSubtotalLabel}>Tổng chi phí sửa chữa (Dự kiến):</Text>
                <Text style={styles.repairSubtotalSub}>
                  {repairItems.length > 0
                    ? `Bao gồm ${repairItems.length} hạng mục phụ tùng & công thợ`
                    : 'Chi phí theo danh mục đề xuất'}
                </Text>
              </View>
              <View style={styles.subtotalValueWrap}>
                <Text style={styles.repairSubtotalValue}>{formatVnd(repairTotal)}</Text>
              </View>
            </View>

            {repairTotal > 0 && (
              <View style={{ backgroundColor: '#FFF7ED', padding: 8, borderRadius: 8, marginTop: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 11, color: '#C2410C', fontStyle: 'italic', lineHeight: 16 }}>
                  * Chi phí sửa chữa mang tính chất DỰ KIẾN vì khi về garage có thể phát sinh thêm hư hỏng để thông báo bổ sung cho bạn.
                </Text>
              </View>
            )}

            {/* Khung Tổng chi phí dự kiến căn chuẩn, không bị lệch khỏi ô */}
            <View style={styles.totalBlock}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.totalLabel}>TỔNG CHI PHÍ DỰ KIẾN</Text>
                <Text style={styles.totalSubHint} numberOfLines={2}>
                  (Phí di chuyển + {towingFee > 0 ? 'Phí kéo xe + ' : ''}Sửa chữa dự kiến)
                </Text>
              </View>
              <View style={styles.totalAmountWrap}>
                <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {formatVnd(grandTotal)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Bottom Bar Hành Động */}
      {!loading && (data?.status === 'DIAGNOSED' || data?.quoteStatus === 'PENDING') && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handleApproveQuote}
            disabled={actionLoading}
            activeOpacity={0.88}
          >
            {actionLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : isTow ? (
              <>
                <Truck size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.acceptBtnText}>
                  ĐỒNG Ý KÉO VỀ GARAGE ({formatVnd(grandTotal)})
                </Text>
              </>
            ) : (
              <>
                <Check size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.acceptBtnText}>
                  CHẤP NHẬN BÁO GIÁ ({formatVnd(grandTotal)})
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => setRejectModalVisible(true)}
            disabled={actionLoading}
            activeOpacity={0.7}
          >
            <X size={17} color={DANGER} style={{ marginRight: 4 }} />
            <Text style={styles.rejectBtnText}>
              Từ chối sửa (Chỉ trả phí di chuyển đến {formatVnd(inspectionFee)})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── MODAL 1: XÁC NHẬN CHẤP NHẬN BÁO GIÁ / KÉO XE VỀ GARAGE ── */}
      <Modal visible={approveModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIconBox, { backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#FED7AA' }]}>
              {isTow ? (
                <Truck size={36} color={BRAND} />
              ) : (
                <CheckCircle2 size={40} color={BRAND} />
              )}
            </View>
            <Text style={styles.modalTitle}>
              {isTow ? 'Xác nhận kéo xe về garage?' : 'Xác nhận duyệt báo giá?'}
            </Text>
            <Text style={styles.modalSubDesc}>
              {isTow
                ? 'Bạn đồng ý để nhân viên cứu hộ kéo xe về garage để tiến hành sửa chữa chuyên sâu.'
                : 'Thợ cứu hộ sẽ bắt đầu sửa chữa xe ngay khi bạn xác nhận.'}
            </Text>

            {/* Bảng kê tóm tắt chi phí minh bạch */}
            <View style={styles.quoteSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>1. Phí di chuyển đến:</Text>
                <Text style={styles.summaryVal}>{formatVnd(inspectionFee)}</Text>
              </View>
              {towingFee > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: BRAND, fontWeight: '700' }]}>2. Phí kéo xe về garage:</Text>
                  <Text style={[styles.summaryVal, { color: BRAND, fontWeight: '800' }]}>{formatVnd(towingFee)}</Text>
                </View>
              )}
              {isTow && data?.towingReason ? (
                <View style={{ backgroundColor: '#FFF7ED', padding: 8, borderRadius: 8, marginVertical: 4, borderWidth: 1, borderColor: '#FED7AA' }}>
                  <Text style={{ fontSize: 11, color: '#C2410C', fontWeight: '700' }}>Lý do kéo xe:</Text>
                  <Text style={{ fontSize: 12, color: '#9A3412', marginTop: 2 }}>"{data.towingReason}"</Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {towingFee > 0 ? '3.' : '2.'} Sửa chữa & Phụ tùng (Dự kiến):
                </Text>
                <Text style={styles.summaryVal}>{formatVnd(repairTotal)}</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryGrandLabel}>TỔNG DỰ KIẾN:</Text>
                <Text style={styles.summaryGrandVal}>{formatVnd(grandTotal)}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: '#FFFBEB', padding: 8, borderRadius: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: '#B45309', lineHeight: 16 }}>
                💡 Chi phí sửa chữa là <Text style={{ fontWeight: '800' }}>dự kiến</Text>. Khi đưa xe về garage kiểm tra chi tiết, nếu có phát sinh thêm hư hỏng, nhân viên sẽ gửi thông báo bổ sung cho bạn trước khi làm.
              </Text>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setApproveModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Xem lại bảng kê</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, actionLoading && { opacity: 0.7 }]}
                onPress={executeApproveQuote}
                disabled={actionLoading}
                activeOpacity={0.88}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {isTow ? 'Đồng ý kéo xe' : 'Đồng ý sửa'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* ── MODAL 3: XÁC NHẬN TỪ CHỐI BÁO GIÁ (THẨM MỸ CAO) ── */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIconBox, { backgroundColor: '#fef2f2' }]}>
              <AlertCircle size={40} color={DANGER} />
            </View>
            <Text style={styles.modalTitle}>Từ chối sửa chữa?</Text>
            <Text style={styles.modalDesc}>
              Thợ sẽ không tiến hành sửa chữa hay thay linh kiện trên xe của bạn.{'\n\n'}
              Theo chính sách SRAS, bạn chỉ cần thanh toán phí di chuyển của thợ cứu hộ đến hiện trường cố định:
            </Text>

            <View style={styles.feeHighlightBox}>
              <Text style={styles.feeHighlightLabel}>Phí di chuyển đến:</Text>
              <Text style={styles.feeHighlightAmount}>{formatVnd(inspectionFee)}</Text>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Quay lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: DANGER },
                  actionLoading && { opacity: 0.7 },
                ]}
                onPress={handleConfirmReject}
                disabled={actionLoading}
                activeOpacity={0.88}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Xác nhận từ chối</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: BÁO LỖI ── */}
      <Modal visible={Boolean(errorModalMsg)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIconBox, { backgroundColor: '#fef2f2' }]}>
              <AlertCircle size={40} color={DANGER} />
            </View>
            <Text style={styles.modalTitle}>Thông báo</Text>
            <Text style={styles.modalDesc}>{errorModalMsg}</Text>
            <TouchableOpacity
              style={[styles.modalSingleActionBtn, { backgroundColor: DANGER }]}
              onPress={() => setErrorModalMsg(null)}
              activeOpacity={0.88}
            >
              <Text style={styles.modalConfirmText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: INK },
  headerSubtitle: { fontSize: 12, color: SUB, marginTop: 2 },
  priorityBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: { fontSize: 11, fontWeight: '700', color: BRAND },
  container: { flex: 1, padding: 16 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: SUB },
  bannerBox: {
    flexDirection: 'row',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  bannerText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#9a3412', lineHeight: 18 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: LINE,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  mechanicRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#c2410c' },
  mechanicName: { fontSize: 15, fontWeight: '700', color: INK },
  mechanicRole: { fontSize: 13, color: SUB, marginTop: 1 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  vehicleInfo: { fontSize: 12, color: '#0284c7', marginLeft: 4, fontWeight: '500' },
  actionButtons: { flexDirection: 'row' },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBarRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  contactPillBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  contactPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: INK },
  imageContainer: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  evidenceImage: { width: '100%', height: 180, borderRadius: 12 },
  locationNoteText: { marginTop: 8, fontSize: 13, color: SUB, fontStyle: 'italic' },
  verifiedTag: {
    backgroundColor: '#dcfce7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedTagText: { fontSize: 10, fontWeight: '700', color: '#15803d', marginLeft: 4 },
  feeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeItemTitle: { fontSize: 14, fontWeight: '600', color: INK },
  feeItemSub: { fontSize: 12, color: SUB, marginTop: 2 },
  feeItemPrice: { fontSize: 15, fontWeight: '700', color: INK },
  divider: { height: 1, backgroundColor: LINE, marginVertical: 12 },
  repairRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingLeft: 4,
  },
  repairName: { fontSize: 14, color: '#334155' },
  repairPrice: { fontSize: 14, fontWeight: '600', color: INK },
  repairSubtotalBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repairSubtotalLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  repairSubtotalSub: {
    fontSize: 11,
    color: SUB,
    marginTop: 2,
  },
  subtotalValueWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  repairSubtotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: INK,
    textAlign: 'right',
  },
  totalBlock: {
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9a3412',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  totalSubHint: {
    fontSize: 11,
    color: '#c2410c',
    marginTop: 2,
    lineHeight: 15,
  },
  totalAmountWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: BRAND,
    textAlign: 'right',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    borderTopWidth: 1,
    borderTopColor: LINE,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 8 },
    }),
  },
  acceptBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  acceptBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  rejectBtn: {
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnText: { color: DANGER, fontSize: 13, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 390,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  modalIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: INK,
    marginBottom: 6,
  },
  modalSubDesc: {
    fontSize: 13,
    color: SUB,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  modalDesc: {
    fontSize: 13.5,
    color: SUB,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  quoteSummaryBox: {
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#FED7AA',
    marginVertical: 6,
  },
  summaryGrandLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryGrandVal: {
    fontSize: 17,
    fontWeight: '900',
    color: BRAND,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  guaranteeText: {
    flex: 1,
    fontSize: 11.5,
    color: '#15803D',
    lineHeight: 16,
    fontWeight: '600',
  },
  feeHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  feeHighlightLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  feeHighlightAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: DANGER,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND,
  },
  modalConfirmBtn: {
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
  modalConfirmText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSingleActionBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
});

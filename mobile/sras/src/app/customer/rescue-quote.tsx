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
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto } from '../../api/rescueApi';
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
    return () => {
      alive = false;
    };
  }, [requestId]);

  // Phí kiểm tra xe cố định (lấy từ đơn hoặc mặc định 100.000đ)
  const inspectionFee = data?.inspectionFee ?? (data?.rescueFee ?? 100000);

  // Danh sách các dịch vụ/phụ tùng thợ đề xuất sau khi kiểm tra
  const repairItems = data?.repairItems && data.repairItems.length > 0
    ? data.repairItems
    : [];

  const repairTotal = data?.repairFee ?? repairItems.reduce((acc, item) => acc + (item.price ?? 0), 0);
  const grandTotal = inspectionFee + repairTotal;

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

  const handleChat = () => {
    if (Number.isFinite(requestId)) {
      router.push({
        pathname: '/chat',
        params: {
          requestId: String(requestId),
          peer: data?.staff?.id ? 'STAFF' : 'GARAGE',
        },
      });
    }
  };

  // Khách bấm Chấp nhận báo giá
  const handleApproveQuote = async () => {
    Alert.alert(
      'Xác nhận duyệt báo giá',
      `Bạn đồng ý với tổng chi phí ${formatVnd(grandTotal)} để thợ tiến hành sửa chữa?`,
      [
        { text: 'Kiểm tra lại', style: 'cancel' },
        {
          text: 'Đồng ý & Bắt đầu sửa',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              // Nếu có API cập nhật trạng thái
              if (Number.isFinite(requestId)) {
                try {
                  await rescueApi.advance(requestId, 'REPAIRING_ONSITE');
                } catch {
                  // Fallback nếu advance chỉ cho phép staff
                }
              }
              Alert.alert(
                'Đã duyệt báo giá thành công',
                'Thợ cứu hộ đang tiến hành sửa chữa phương tiện của bạn.',
                [
                  {
                    text: 'Xem tiến độ',
                    onPress: () => router.replace({
                      pathname: '/customer/rescue-tracking',
                      params: { id: String(requestId) },
                    }),
                  },
                ]
              );
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể duyệt báo giá lúc này.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Khách xác nhận Từ chối báo giá (chỉ trả phí kiểm tra)
  const handleConfirmReject = () => {
    setRejectModalVisible(false);
    router.replace({
      pathname: '/customer/payment',
      params: {
        id: String(requestId),
        amount: String(inspectionFee),
        rejectQuote: '1',
      },
    });
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
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 140 }}>
          {/* Banner trạng thái */}
          <View style={styles.bannerBox}>
            <Clock size={20} color="#ea580c" />
            <Text style={styles.bannerText}>
              Thợ đã hoàn tất kiểm tra hiện trường và lập bảng báo giá. Vui lòng xem kỹ các hạng mục trước khi xác nhận.
            </Text>
          </View>

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
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.circleBtn}
                  onPress={handleCall}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Phone size={17} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.circleBtn, { marginLeft: 8 }]}
                  onPress={handleChat}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MessageSquare size={17} color={BRAND} />
                </TouchableOpacity>
              </View>
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

            {/* Mục 1: Phí kiểm tra xe cố định */}
            <View style={styles.feeItem}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.feeItemTitle}>1. Phí kiểm tra xe (Cố định)</Text>
                </View>
                <Text style={styles.feeItemSub}>
                  Phí di chuyển & chẩn đoán sự cố (Tính trước khi sửa)
                </Text>
              </View>
              <Text style={styles.feeItemPrice}>{formatVnd(inspectionFee)}</Text>
            </View>

            <View style={styles.divider} />

            {/* Mục 2: Hạng mục sửa chữa & Phụ tùng */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Wrench size={15} color={BRAND} />
              <Text style={[styles.feeItemTitle, { marginLeft: 6 }]}>
                2. Dịch vụ & Phụ tùng đề xuất:
              </Text>
            </View>

            {repairItems.length === 0 ? (
              <Text style={{ fontSize: 13, color: SUB, paddingVertical: 8 }}>
                Thợ không đề xuất thêm hạng mục sửa chữa (Chỉ tính phí kiểm tra xe).
              </Text>
            ) : (
              repairItems.map((item, idx) => (
                <View key={item.id || idx} style={styles.repairRow}>
                  <Text style={styles.repairName}>• {item.name}</Text>
                  <Text style={styles.repairPrice}>{formatVnd(item.price ?? 0)}</Text>
                </View>
              ))
            )}

            <View style={styles.repairSubtotalRow}>
              <Text style={styles.repairSubtotalLabel}>Tạm tính phí sửa chữa:</Text>
              <Text style={styles.repairSubtotalValue}>{formatVnd(repairTotal)}</Text>
            </View>

            {/* Tổng cộng nếu duyệt */}
            <View style={styles.totalBlock}>
              <View>
                <Text style={styles.totalLabel}>TỔNG DỰ KIẾN KHI SỬA</Text>
                <Text style={styles.totalSubHint}>(Đã gồm phí kiểm tra + sửa chữa)</Text>
              </View>
              <Text style={styles.totalAmount}>{formatVnd(grandTotal)}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Bottom Bar Hành Động */}
      {!loading && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handleApproveQuote}
            disabled={actionLoading}
            activeOpacity={0.88}
          >
            {actionLoading ? (
              <ActivityIndicator color="#ffffff" />
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
              Từ chối (Chỉ trả phí kiểm tra {formatVnd(inspectionFee)})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal xác nhận Từ chối báo giá */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconBox}>
              <AlertCircle size={40} color={DANGER} />
            </View>
            <Text style={styles.modalTitle}>Xác nhận từ chối báo giá?</Text>
            <Text style={styles.modalDesc}>
              Thợ sẽ không tiến hành sửa chữa hay thay thế linh kiện trên xe.{'\n\n'}
              Theo quy định, bạn chỉ cần thanh toán{' '}
              <Text style={{ fontWeight: '700', color: INK }}>
                {formatVnd(inspectionFee)}
              </Text>{' '}
              (Phí kiểm tra và bắt bệnh tại chỗ) qua PayOS hoặc Tiền mặt để kết thúc đơn cứu hộ.
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Xem lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmReject}
                activeOpacity={0.88}
              >
                <Text style={styles.modalConfirmText}>Xác nhận & Thanh toán</Text>
              </TouchableOpacity>
            </View>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
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
  repairSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  repairSubtotalLabel: { fontSize: 13, color: SUB },
  repairSubtotalValue: { fontSize: 13, fontWeight: '600', color: INK },
  totalBlock: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#9a3412' },
  totalSubHint: { fontSize: 11, color: '#c2410c', marginTop: 1 },
  totalAmount: { fontSize: 18, fontWeight: '800', color: BRAND },
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalIconBox: { alignSelf: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: INK },
  modalDesc: { fontSize: 14, color: SUB, textAlign: 'center', marginVertical: 14, lineHeight: 21 },
  modalActionRow: { flexDirection: 'row', marginTop: 6 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  modalConfirmBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: DANGER,
    alignItems: 'center',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

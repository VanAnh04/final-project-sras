import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Activity,
  ChevronRight,
  MapPin,
  Clock,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  PhoneCall,
  Search,
  X,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Radio,
} from 'lucide-react-native';
import { rescueApi, RescueRequestDto, RescueStatus } from '../../api/rescueApi';
import { resolveFileUrl } from '../../api/axiosClient';
import { callManager } from '../../realtime/callManager';
import { canFreeCall } from '../../utils/call';

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };

// Trạng thái đang diễn ra (chưa thanh toán xong hoặc đang xử lý)
const ONGOING: RescueStatus[] = [
  'SEARCHING', 'PENDING_GARAGE', 'ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED',
  'DIAGNOSED', 'REPAIRING_ONSITE', 'TOWING', 'TOW_TO_GARAGE', 'AWAITING_PAYMENT', 'COMPLETED',
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  SEARCHING: { label: 'Đang tìm gara', color: '#ea580c', bg: '#fff7ed' },
  PENDING_GARAGE: { label: 'Chờ gara nhận', color: '#ea580c', bg: '#fff7ed' },
  NO_GARAGE_FOUND: { label: 'Không tìm được gara', color: '#dc2626', bg: '#fef2f2' },
  ACCEPTED: { label: 'Gara đã nhận', color: '#2563eb', bg: '#eff6ff' },
  ASSIGNED: { label: 'Đã phân công thợ', color: '#2563eb', bg: '#eff6ff' },
  EN_ROUTE: { label: 'Thợ đang tới', color: '#0284c7', bg: '#f0f9ff' },
  ARRIVED: { label: 'Thợ đã đến nơi', color: '#0284c7', bg: '#f0f9ff' },
  DIAGNOSED: { label: 'Chờ duyệt báo giá', color: '#ea580c', bg: '#fff7ed' },
  REPAIRING_ONSITE: { label: 'Đang sửa chữa', color: '#0284c7', bg: '#f0f9ff' },
  TOWING: { label: 'Đang kéo xe', color: '#0284c7', bg: '#f0f9ff' },
  TOW_TO_GARAGE: { label: 'Đang kéo về gara', color: '#0284c7', bg: '#f0f9ff' },
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', color: '#ea580c', bg: '#fff7ed' },
  COMPLETED: { label: 'Chờ thanh toán', color: '#ea580c', bg: '#fff7ed' },
  PAID: { label: 'Đã hoàn tất', color: '#059669', bg: '#ecfdf5' },
  RATED: { label: 'Đã hoàn tất', color: '#059669', bg: '#ecfdf5' },
  CANCELLED: { label: 'Đã huỷ', color: '#64748b', bg: '#f1f5f9' },
  DECLINED: { label: 'Bị từ chối', color: '#dc2626', bg: '#fef2f2' },
};

function statusMeta(s: RescueStatus) {
  return STATUS_META[s] ?? { label: s, color: '#64748b', bg: '#f1f5f9' };
}

function formatVnd(num?: number) {
  if (!num) return '0 đ';
  return num.toLocaleString('vi-VN') + ' đ';
}

function formatDateTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${hh}:${mm} · ${dd}/${MM}/${yyyy}`;
}

function getHeroStatusDesc(status: RescueStatus) {
  switch (status) {
    case 'SEARCHING':
    case 'PENDING_GARAGE':
      return 'Hệ thống đang kết nối gara cứu hộ gần bạn nhất...';
    case 'ACCEPTED':
    case 'ASSIGNED':
      return 'Gara đã tiếp nhận đơn, kỹ thuật viên đang chuẩn bị xuất phát';
    case 'EN_ROUTE':
      return 'Kỹ thuật viên đang di chuyển tới hiện trường của bạn';
    case 'ARRIVED':
      return 'Kỹ thuật viên đã có mặt tại hiện trường';
    case 'DIAGNOSED':
      return 'Đã kiểm tra xe xong, vui lòng xem và duyệt phiếu báo giá';
    case 'REPAIRING_ONSITE':
      return 'Đang tiến hành sửa chữa sự cố tại chỗ';
    case 'TOWING':
    case 'TOW_TO_GARAGE':
      return 'Đang hỗ trợ cẩu kéo xe về xưởng dịch vụ';
    case 'AWAITING_PAYMENT':
    case 'COMPLETED':
      return 'Đã hoàn tất sửa chữa, vui lòng xác nhận thanh toán';
    default:
      return 'Yêu cầu cứu hộ đang được xử lý';
  }
}

function getProgressStep(status: RescueStatus): number {
  switch (status) {
    case 'SEARCHING':
    case 'PENDING_GARAGE':
      return 1;
    case 'ACCEPTED':
    case 'ASSIGNED':
      return 1;
    case 'EN_ROUTE':
    case 'ARRIVED':
      return 2;
    case 'DIAGNOSED':
    case 'REPAIRING_ONSITE':
    case 'TOWING':
    case 'TOW_TO_GARAGE':
      return 3;
    case 'AWAITING_PAYMENT':
    case 'COMPLETED':
    case 'PAID':
    case 'RATED':
      return 4;
    default:
      return 1;
  }
}

type FilterStatusType = 'ALL' | 'ONGOING' | 'DONE' | 'CANCELLED';
type FilterVehicleType = 'ALL' | 'MOTORBIKE' | 'CAR';

interface HistoryCardItemProps {
  req: RescueRequestDto;
  onOpenDetail: (req: RescueRequestDto) => void;
  onOpenChat: (req: RescueRequestDto) => void;
}

const HistoryCardItem = React.memo(({
  req,
  onOpenDetail,
  onOpenChat,
}: HistoryCardItemProps) => {
  const meta = statusMeta(req.status);
  const finalAmount = req.totalAmount && req.totalAmount > 0 ? req.totalAmount : req.rescueFee;

  return (
    <TouchableOpacity
      style={styles.historyCard}
      onPress={() => onOpenDetail(req)}
      activeOpacity={0.82}
    >
      {/* Header Card: Loại xe + Mã đơn + Trạng thái */}
      <View style={styles.cardHeader}>
        <View style={styles.cardVehiclePill}>
          <Text style={styles.cardVehicleIcon}>
            {req.vehicleType === 'CAR' ? '🚗' : '🏍️'}
          </Text>
          <Text style={styles.cardVehicleText}>
            {VEHICLE_LABEL[req.vehicleType] || req.vehicleType}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.cardCodeText}>#{req.code}</Text>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
      </View>

      {/* Tên Gara & Thời gian */}
      <View style={styles.cardGarageRow}>
        <Text style={styles.cardGarageName} numberOfLines={1}>
          {req.garage?.name || 'Gara cứu hộ đối tác'}
        </Text>
        <View style={styles.cardTimeRow}>
          <Clock size={11} color="#94a3b8" />
          <Text style={styles.cardTimeText}>{formatDateTime(req.createdAt)}</Text>
        </View>
      </View>

      {/* Triệu chứng / Mô tả sự cố */}
      <View style={styles.cardSymptomBox}>
        <Text style={styles.cardSymptomLabel}>Sự cố:</Text>
        <Text style={styles.cardSymptomText} numberOfLines={2}>
          {req.symptom || 'Cứu hộ khẩn cấp'}
        </Text>
      </View>

      {/* Địa chỉ đón / hiện trường */}
      {!!(req.pickupAddress || req.locationNote) && (
        <View style={styles.cardLocationRow}>
          <MapPin size={13} color="#94a3b8" strokeWidth={2.2} style={{ marginTop: 1 }} />
          <Text style={styles.cardLocationText} numberOfLines={1}>
            {req.pickupAddress || req.locationNote}
          </Text>
        </View>
      )}

      {/* Phân cách nhẹ */}
      <View style={styles.cardDivider} />

      {/* Footer Card: Tổng tiền + Nút Nhắn tin + Xem chi tiết */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardAmountLabel}>Tổng thanh toán</Text>
          <Text style={styles.cardAmountValue}>{formatVnd(finalAmount)}</Text>
        </View>

        <View style={styles.cardActionsRight}>
          <TouchableOpacity
            style={styles.chatActionBtn}
            onPress={() => onOpenChat(req)}
            activeOpacity={0.8}
          >
            <MessageSquare size={13} color="#ea580c" strokeWidth={2.2} />
            <Text style={styles.chatActionBtnText}>Nhắn tin</Text>
          </TouchableOpacity>

          <View style={styles.detailActionBtn}>
            <Text style={styles.detailActionBtnText}>Xem chi tiết</Text>
            <ChevronRight size={15} color="#ea580c" strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function ActivityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string; tab?: string; subTab?: string; ts?: string }>();
  const [items, setItems] = useState<RescueRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<FilterStatusType>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<FilterVehicleType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (params.filter === 'DONE' || params.subTab === 'COMPLETED') {
      setStatusFilter('DONE');
    } else if (params.filter === 'CANCELLED' || params.subTab === 'CANCELLED') {
      setStatusFilter('CANCELLED');
    } else if (params.filter === 'ONGOING' || params.tab === 'ACTIVE') {
      setStatusFilter('ONGOING');
    } else if (params.filter === 'ALL' || params.tab === 'HISTORY') {
      setStatusFilter('ALL');
    }
  }, [params.filter, params.tab, params.subTab, params.ts]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/customer' as any);
    }
  }, [router]);

  const load = useCallback(async (isInitial = false) => {
    try {
      if (isInitial && !hasLoadedRef.current) {
        setLoading(true);
      }
      setError(null);
      const list = await rescueApi.mine();
      hasLoadedRef.current = true;
      setItems(list || []);
    } catch (err: any) {
      console.warn('Lỗi tải hoạt động cứu hộ:', err);
      setError(err?.message || 'Không thể tải dữ liệu cứu hộ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(!hasLoadedRef.current);
    }, [load])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load(false);
  }, [load]);

  const openDetail = useCallback((req: RescueRequestDto) => {
    router.push({ pathname: '/customer/rescue-tracking', params: { id: String(req.id), from: '/customer/activity' } } as any);
  }, [router]);

  const openChat = useCallback((req: RescueRequestDto) => {
    const isStaff = !!req.staff;
    const peer = isStaff ? 'STAFF' : 'GARAGE';
    const peerName = isStaff
      ? (req.staff?.name || 'Nhân viên cứu hộ')
      : (req.garage?.name || 'Gara cứu hộ');
    const peerPhone = isStaff
      ? (req.staff?.phone || req.garage?.phone || '')
      : (req.garage?.phone || '');
    const peerRole = isStaff ? 'Nhân viên cứu hộ' : 'Gara cứu hộ';

    router.push({
      pathname: '/chat',
      params: {
        requestId: String(req.id),
        peer,
        peerName,
        peerPhone,
        peerRole,
      },
    } as any);
  }, [router]);

  const handleFreeCall = (req: RescueRequestDto) => {
    if (!canFreeCall(req.status)) return;
    const isStaff = !!req.staff;
    const peer: 'GARAGE' | 'STAFF' = isStaff ? 'STAFF' : 'GARAGE';
    const peerName = isStaff
      ? (req.staff?.name || 'Nhân viên cứu hộ')
      : (req.garage?.name || 'Gara cứu hộ');
    callManager.startCall({ rescueRequestId: req.id, peer, peerName });
  };

  // Đơn đang diễn ra & đơn lịch sử
  const ongoingOrders = useMemo(() => items.filter((r) => ONGOING.includes(r.status)), [items]);
  const heroOrder = ongoingOrders.length > 0 ? ongoingOrders[0] : null;

  // Thống kê số lượng cho filter badge
  const doneCount = useMemo(() => items.filter((r) => r.status === 'PAID' || r.status === 'RATED').length, [items]);
  const cancelledCount = useMemo(
    () => items.filter((r) => r.status === 'CANCELLED' || r.status === 'DECLINED' || r.status === 'NO_GARAGE_FOUND').length,
    [items]
  );

  // Lọc danh sách lịch sử bên dưới
  const filteredList = useMemo(() => {
    let result = items;

    // Nếu đang có heroOrder và đang ở tab "Tất cả", không lặp lại heroOrder ở danh sách dưới
    if (heroOrder && statusFilter === 'ALL' && !searchQuery.trim()) {
      result = result.filter((r) => r.id !== heroOrder.id);
    }

    // 1. Lọc theo trạng thái
    if (statusFilter === 'ONGOING') {
      result = result.filter((r) => ONGOING.includes(r.status));
    } else if (statusFilter === 'DONE') {
      result = result.filter((r) => r.status === 'PAID' || r.status === 'RATED');
    } else if (statusFilter === 'CANCELLED') {
      result = result.filter((r) => r.status === 'CANCELLED' || r.status === 'DECLINED' || r.status === 'NO_GARAGE_FOUND');
    }

    // 2. Lọc theo phương tiện
    if (vehicleFilter === 'MOTORBIKE') {
      result = result.filter((r) => r.vehicleType === 'MOTORBIKE');
    } else if (vehicleFilter === 'CAR') {
      result = result.filter((r) => r.vehicleType === 'CAR');
    }

    // 3. Tìm kiếm theo từ khoá
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => {
        const code = (r.code || '').toLowerCase();
        const symptom = (r.symptom || '').toLowerCase();
        const garageName = (r.garage?.name || '').toLowerCase();
        const address = (r.pickupAddress || r.locationNote || '').toLowerCase();
        return code.includes(q) || symptom.includes(q) || garageName.includes(q) || address.includes(q);
      });
    }

    return result;
  }, [items, heroOrder, statusFilter, vehicleFilter, searchQuery]);

  const renderHistoryItem = useCallback(
    ({ item }: { item: RescueRequestDto }) => (
      <HistoryCardItem req={item} onOpenDetail={openDetail} onOpenChat={openChat} />
    ),
    [openDetail, openChat]
  );

  const listHeader = useMemo(() => (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          1. HERO CARD: ĐƠN CỨU HỘ ĐANG DIỄN RA (NỔI BẬT NHẤT TRÊN CÙNG)
         ══════════════════════════════════════════════════════════════════ */}
      {heroOrder && (
        <View style={styles.heroCardContainer}>
          <LinearGradient
            colors={['#ea580c', '#c2410c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Header Hero */}
            <View style={styles.heroTopRow}>
              <View style={styles.heroLivePill}>
                <Radio size={12} color="#ffffff" style={{ marginRight: 5 }} />
                <Text style={styles.heroLiveText}>ĐANG CỨU HỘ • TRỰC TIẾP</Text>
              </View>
              <Text style={styles.heroCodeText}>#{heroOrder.code}</Text>
            </View>

            {/* Phương tiện & Sự cố (1 dòng gọn gàng, không xuống dòng) */}
            <View style={styles.heroVehicleBox}>
              <Text style={styles.heroVehicleTitle} numberOfLines={1}>
                {heroOrder.vehicleType === 'CAR' ? '🚗 Cứu hộ Ô tô' : '🏍️ Cứu hộ Xe máy'}
                {heroOrder.symptom ? ` - ${heroOrder.symptom}` : ''}
              </Text>
            </View>

            {/* Thông báo tiến trình trực tiếp */}
            <View style={styles.heroStatusBox}>
              <View style={styles.heroStatusDot} />
              <Text style={styles.heroStatusDesc} numberOfLines={2}>
                {getHeroStatusDesc(heroOrder.status)}
              </Text>
            </View>

            {/* Thợ & Gara phụ trách (nếu có) */}
            {(heroOrder.staff || heroOrder.garage) && (
              <View style={styles.heroPartnerRow}>
                <View style={styles.heroAvatar}>
                  {resolveFileUrl(heroOrder.staff?.avatarUrl || heroOrder.garage?.avatarUrl) ? (
                    <Image
                      source={{ uri: resolveFileUrl(heroOrder.staff?.avatarUrl || heroOrder.garage?.avatarUrl) }}
                      style={styles.heroAvatarImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.heroAvatarText}>
                      {(heroOrder.staff?.name || heroOrder.garage?.name || 'G')[0].toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroStaffName} numberOfLines={1}>
                    {heroOrder.staff?.name || heroOrder.garage?.name || 'Gara cứu hộ'}
                  </Text>
                  <Text style={styles.heroGarageName} numberOfLines={1}>
                    {heroOrder.staff?.name && heroOrder.garage?.name ? heroOrder.garage.name : 'Gara đối tác SRAS'}
                    {heroOrder.garage?.avgRating ? ` · ⭐ ${heroOrder.garage.avgRating.toFixed(1)}` : ''}
                  </Text>
                </View>
                <View style={styles.heroActionButtons}>
                  {canFreeCall(heroOrder.status) && (
                    <TouchableOpacity
                      style={styles.heroSmallBtn}
                      onPress={() => handleFreeCall(heroOrder)}
                      activeOpacity={0.8}
                    >
                      <PhoneCall size={16} color="#16a34a" strokeWidth={2.4} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.heroSmallBtn}
                    onPress={() => openChat(heroOrder)}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={15} color="#ea580c" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Mini Stepper 4 bước */}
            <View style={styles.heroStepper}>
              {['Nhận đơn', 'Đang tới', 'Sửa chữa', 'Thanh toán'].map((stepLabel, idx) => {
                const stepNum = idx + 1;
                const activeStep = getProgressStep(heroOrder.status);
                const isDone = activeStep >= stepNum;
                const isCurrent = activeStep === stepNum;
                return (
                  <View key={stepLabel} style={styles.stepperItem}>
                    <View style={[styles.stepperDot, isDone && styles.stepperDotDone, isCurrent && styles.stepperDotCurrent]} />
                    <Text style={[styles.stepperText, isDone && styles.stepperTextDone]} numberOfLines={1}>
                      {stepLabel}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* CTA Nút bấm theo dõi Live to bản */}
            <TouchableOpacity
              style={styles.heroTrackingCta}
              activeOpacity={0.88}
              onPress={() => openDetail(heroOrder)}
            >
              <Text style={styles.heroTrackingCtaText}>Theo dõi trực tiếp trên bản đồ</Text>
              <ArrowRight size={17} color="#ea580c" strokeWidth={2.6} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* Banner nhỏ gợi ý đặt cứu hộ khi KHÔNG CÓ đơn đang hoạt động */}
      {!heroOrder && (
        <TouchableOpacity
          style={styles.quickEmergencyBanner}
          activeOpacity={0.88}
          onPress={() => router.push('/customer' as any)}
        >
          <View style={styles.quickEmergencyLeft}>
            <View style={styles.quickEmergencyIconWrap}>
              <ShieldAlert size={18} color="#ea580c" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickEmergencyTitle}>Xe bạn gặp sự cố trên đường?</Text>
              <Text style={styles.quickEmergencySub}>Đội ngũ cứu hộ SRAS túc trực 24/7 sẵn sàng hỗ trợ</Text>
            </View>
          </View>
          <View style={styles.quickEmergencyAction}>
            <Text style={styles.quickEmergencyActionText}>Gọi cứu hộ</Text>
            <ChevronRight size={15} color="#ea580c" strokeWidth={2.6} />
          </View>
        </TouchableOpacity>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          2. BỘ LỌC THÔNG MINH (HORIZONTAL FILTER CHIPS)
         ══════════════════════════════════════════════════════════════════ */}
      <View style={styles.filterSection}>
        {/* Hàng 1: Trạng thái đơn */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setStatusFilter('ALL')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, statusFilter === 'ALL' && styles.filterChipTextActive]}>
              Tất cả ({items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'ONGOING' && styles.filterChipActiveOngoing]}
            onPress={() => setStatusFilter('ONGOING')}
            activeOpacity={0.8}
          >
            <View style={[styles.filterDot, { backgroundColor: '#ea580c' }]} />
            <Text style={[styles.filterChipText, statusFilter === 'ONGOING' && styles.filterChipTextActive]}>
              Đang diễn ra ({ongoingOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'DONE' && styles.filterChipActiveDone]}
            onPress={() => setStatusFilter('DONE')}
            activeOpacity={0.8}
          >
            <View style={[styles.filterDot, { backgroundColor: '#10b981' }]} />
            <Text style={[styles.filterChipText, statusFilter === 'DONE' && styles.filterChipTextActive]}>
              Đã hoàn tất ({doneCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'CANCELLED' && styles.filterChipActiveCancelled]}
            onPress={() => setStatusFilter('CANCELLED')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, statusFilter === 'CANCELLED' && styles.filterChipTextActive]}>
              Đã huỷ ({cancelledCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Hàng 2: Lọc nhanh theo phương tiện */}
        <View style={styles.vehicleFilterRow}>
          <TouchableOpacity
            style={[styles.vehicleChip, vehicleFilter === 'ALL' && styles.vehicleChipActive]}
            onPress={() => setVehicleFilter('ALL')}
            activeOpacity={0.8}
          >
            <Text style={[styles.vehicleChipText, vehicleFilter === 'ALL' && styles.vehicleChipTextActive]}>
              Tất cả xe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.vehicleChip, vehicleFilter === 'MOTORBIKE' && styles.vehicleChipActive]}
            onPress={() => setVehicleFilter('MOTORBIKE')}
            activeOpacity={0.8}
          >
            <Text style={[styles.vehicleChipText, vehicleFilter === 'MOTORBIKE' && styles.vehicleChipTextActive]}>
              🏍️ Xe máy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.vehicleChip, vehicleFilter === 'CAR' && styles.vehicleChipActive]}
            onPress={() => setVehicleFilter('CAR')}
            activeOpacity={0.8}
          >
            <Text style={[styles.vehicleChipText, vehicleFilter === 'CAR' && styles.vehicleChipTextActive]}>
              🚗 Ô tô
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tiêu đề danh sách lịch sử */}
      <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
        <Text style={styles.sectionTitle}>
          {statusFilter === 'ONGOING'
            ? 'Đơn đang diễn ra'
            : statusFilter === 'DONE'
            ? 'Lịch sử đã hoàn tất'
            : statusFilter === 'CANCELLED'
            ? 'Lịch sử đơn đã huỷ'
            : 'Lịch sử hoạt động'}
        </Text>
        <Text style={styles.sectionCountText}>{filteredList.length} đơn</Text>
      </View>
    </>
  ), [
    heroOrder,
    statusFilter,
    vehicleFilter,
    items.length,
    ongoingOrders.length,
    doneCount,
    cancelledCount,
    filteredList.length,
    openDetail,
    openChat,
    router,
  ]);

  const listEmpty = useMemo(() => (
    <View style={styles.emptyFilterBox}>
      <Text style={styles.emptyFilterTitle}>Không tìm thấy yêu cầu phù hợp</Text>
      <Text style={styles.emptyFilterSub}>Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm</Text>
      {(statusFilter !== 'ALL' || vehicleFilter !== 'ALL' || searchQuery) && (
        <TouchableOpacity
          style={styles.resetFilterBtn}
          onPress={() => {
            setStatusFilter('ALL');
            setVehicleFilter('ALL');
            setSearchQuery('');
          }}
        >
          <Text style={styles.resetFilterBtnText}>Đặt lại bộ lọc</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [statusFilter, vehicleFilter, searchQuery]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header chính */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#0f172a" strokeWidth={2.3} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>Lịch sử hoạt động</Text>
            <Text style={styles.headerSub} numberOfLines={1}>Theo dõi và quản lý các chuyến cứu hộ của bạn</Text>
          </View>
          <TouchableOpacity
            style={[styles.searchToggleBtn, isSearchOpen && styles.searchToggleBtnActive]}
            activeOpacity={0.8}
            onPress={() => {
              setIsSearchOpen((prev) => !prev);
              if (isSearchOpen) setSearchQuery('');
            }}
          >
            {isSearchOpen ? <X size={18} color="#0f172a" /> : <Search size={18} color="#475569" />}
          </TouchableOpacity>
        </View>

        {/* Thanh tìm kiếm mở rộng */}
        {isSearchOpen && (
          <View style={styles.searchBarWrap}>
            <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo mã đơn, tên gara, sự cố..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Nội dung danh sách */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Đang tải hoạt động cứu hộ...</Text>
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <AlertCircle size={32} color="#dc2626" strokeWidth={2.2} />
          </View>
          <Text style={styles.emptyTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.emptySub}>
            Đã có lỗi xảy ra hoặc kết nối mạng không ổn định. Vui lòng thử lại.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              load();
            }}
            activeOpacity={0.8}
          >
            <RefreshCw size={15} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.retryBtnText}>Thử lại ngay</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        /* Trạng thái trống khi tài khoản chưa từng có đơn nào */
        <View style={styles.center}>
          <View style={styles.iconCircle}>
            <Activity size={32} color="#ea580c" strokeWidth={2.2} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có hoạt động nào</Text>
          <Text style={styles.emptySub}>
            Khi bạn gặp sự cố và đặt cứu hộ, lộ trình di chuyển và lịch sử xử lý sẽ hiển thị chi tiết tại đây.
          </Text>
          <TouchableOpacity
            style={styles.heroRescueBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/customer' as any)}
          >
            <Text style={styles.heroRescueBtnText}>🚨 Đặt yêu cầu cứu hộ ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderHistoryItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ea580c" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  headerSub: { fontSize: 12.5, color: '#64748b', marginTop: 2, fontWeight: '500' },
  searchToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchToggleBtnActive: { backgroundColor: '#e2e8f0' },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginTop: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', paddingVertical: 0 },

  scroll: { padding: 16, paddingBottom: 40 },

  // Center / Loading / Empty
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  loadingText: { marginTop: 12, fontSize: 13.5, color: '#64748b', fontWeight: '500' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  emptySub: { fontSize: 13.5, color: '#64748b', textAlign: 'center', lineHeight: 21, marginTop: 8 },
  heroRescueBtn: {
    marginTop: 20,
    backgroundColor: '#ea580c',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroRescueBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  retryBtnText: { color: '#ffffff', fontSize: 13.5, fontWeight: '700' },

  // ══════════════════════════════════════════════════════════════════
  // HERO LIVE CARD (ĐƠN ĐANG CỨU HỘ)
  // ══════════════════════════════════════════════════════════════════
  heroCardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  heroGradient: { padding: 16, borderRadius: 20 },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 100,
  },
  heroLiveText: { color: '#ffffff', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6 },
  heroCodeText: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 12, fontWeight: '800' },

  heroVehicleBox: { marginBottom: 10 },
  heroVehicleTitle: { fontSize: 17, fontWeight: '900', color: '#ffffff', letterSpacing: -0.2 },

  heroStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  heroStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  heroStatusDesc: { flex: 1, fontSize: 12.5, color: '#ffffff', fontWeight: '700' },

  heroPartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    gap: 10,
  },
  heroAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  heroAvatarText: { fontSize: 15, fontWeight: '900', color: '#ea580c' },
  heroStaffName: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  heroGarageName: { fontSize: 11.5, color: 'rgba(255, 255, 255, 0.85)', marginTop: 1, fontWeight: '500' },
  heroActionButtons: { flexDirection: 'row', gap: 6 },
  heroSmallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  heroStepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  stepperItem: { alignItems: 'center', gap: 4, flex: 1 },
  stepperDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  stepperDotDone: { backgroundColor: '#ffffff' },
  stepperDotCurrent: { borderWidth: 2, borderColor: '#ffffff', backgroundColor: '#ea580c' },
  stepperText: { fontSize: 10, color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600' },
  stepperTextDone: { color: '#ffffff', fontWeight: '800' },

  heroTrackingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  heroTrackingCtaText: { fontSize: 13.5, fontWeight: '900', color: '#ea580c' },

  // Quick Emergency Banner (Khi không có đơn)
  quickEmergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  quickEmergencyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  quickEmergencyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEmergencyTitle: { fontSize: 13, fontWeight: '800', color: '#9a3412' },
  quickEmergencySub: { fontSize: 11, color: '#c2410c', marginTop: 1, fontWeight: '500' },
  quickEmergencyAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  quickEmergencyActionText: { fontSize: 12, fontWeight: '800', color: '#ea580c' },

  // ══════════════════════════════════════════════════════════════════
  // FILTER SECTION
  // ══════════════════════════════════════════════════════════════════
  filterSection: { marginBottom: 14, gap: 8 },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 100,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 5,
  },
  filterChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterChipActiveOngoing: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  filterChipActiveDone: { backgroundColor: '#059669', borderColor: '#059669' },
  filterChipActiveCancelled: { backgroundColor: '#475569', borderColor: '#475569' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterChipTextActive: { color: '#ffffff' },
  filterDot: { width: 6, height: 6, borderRadius: 3 },

  vehicleFilterRow: { flexDirection: 'row', gap: 8 },
  vehicleChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vehicleChipActive: { backgroundColor: '#fff7ed', borderColor: '#ea580c' },
  vehicleChipText: { fontSize: 11.5, fontWeight: '700', color: '#64748b' },
  vehicleChipTextActive: { color: '#ea580c', fontWeight: '800' },

  // ══════════════════════════════════════════════════════════════════
  // HISTORY SECTION & CARDS
  // ══════════════════════════════════════════════════════════════════
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCountText: { fontSize: 11.5, color: '#94a3b8', fontWeight: '700' },

  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardVehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  cardVehicleIcon: { fontSize: 12 },
  cardVehicleText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  cardCodeText: { fontSize: 11.5, fontWeight: '700', color: '#94a3b8' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '800' },

  cardGarageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardGarageName: { fontSize: 13.5, fontWeight: '800', color: '#0f172a', flex: 1 },
  cardTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTimeText: { fontSize: 11.5, color: '#94a3b8', fontWeight: '600' },

  cardSymptomBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  cardSymptomLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  cardSymptomText: { flex: 1, fontSize: 12, color: '#334155', fontWeight: '600' },

  cardLocationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  cardLocationText: { fontSize: 12, color: '#64748b', flex: 1, lineHeight: 16 },

  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 2 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardAmountLabel: { fontSize: 10.5, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  cardAmountValue: { fontSize: 14.5, fontWeight: '900', color: '#ea580c', marginTop: 1 },

  cardActionsRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chatActionBtnText: { fontSize: 11.5, fontWeight: '800', color: '#ea580c' },
  detailActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailActionBtnText: { fontSize: 12.5, fontWeight: '800', color: '#ea580c' },

  emptyFilterBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFilterTitle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  emptyFilterSub: { fontSize: 12.5, color: '#64748b', marginTop: 4, textAlign: 'center' },
  resetFilterBtn: {
    marginTop: 12,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  resetFilterBtnText: { fontSize: 12, fontWeight: '700', color: '#ea580c' },
});

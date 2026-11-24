import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Phone,
  MapPin,
  Truck,
  Car,
  ChevronRight,
  ChevronLeft,
  Camera,
  X,
  Calendar,
  Filter,
  RotateCcw,
  Clock,
  CreditCard,
  AlertCircle,
  Search,
  User,
  CheckCircle2,
  DollarSign,
} from 'lucide-react-native';
import { garageApi, GarageStaffDto, RescueVehicleDto } from '../../api/garageApi';
import { RescueRequestDto, RescueStatus } from '../../api/rescueApi';
import { resolveFileUrl } from '../../api/axiosClient';
import AssignStaffModal from '../../components/AssignStaffModal';
import { useGarageOrders } from '../../contexts/GarageOrdersContext';

const VEHICLE_LABEL: Record<string, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };
const STATUS_LABEL: Record<string, string> = {
  ACCEPTED: 'Đã nhận · chờ gán nhân viên',
  ASSIGNED: 'Đã gán nhân viên · chờ xuất phát',
  EN_ROUTE: 'Nhân viên đang tới hiện trường',
  ARRIVED: 'Nhân viên đã đến nơi',
  DIAGNOSED: 'Đã kiểm tra · chờ duyệt báo giá',
  REPAIRING_ONSITE: 'Đang sửa chữa tại chỗ',
  TOW_TO_GARAGE: 'Đang kéo xe về xưởng',
  TOWING: 'Đang kéo xe về xưởng',
  AWAITING_PAYMENT: 'Chờ thanh toán',
  COMPLETED: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  RATED: 'Đã hoàn tất & đánh giá',
  CANCELLED: 'Đã huỷ',
  DECLINED: 'Đã từ chối',
};

const formatVnd = (num?: number) => {
  if (!num) return '0 đ';
  return num.toLocaleString('vi-VN') + ' đ';
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${hh}:${mm} ${dd}/${MM}/${yyyy}`;
};

const formatDateOnly = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${MM}/${yyyy}`;
};

const getHistoryStatusBadge = (status: RescueStatus) => {
  if (status === 'PAID' || status === 'RATED') {
    return { bg: '#ecfdf5', text: '#059669', label: status === 'RATED' ? 'Đã hoàn tất & đánh giá' : 'Đã hoàn tất' };
  }
  if (status === 'COMPLETED' || status === 'AWAITING_PAYMENT') {
    return { bg: '#fff7ed', text: '#ea580c', label: 'Chờ thanh toán' };
  }
  if (status === 'CANCELLED') {
    return { bg: '#fef2f2', text: '#dc2626', label: 'Đã huỷ' };
  }
  if (status === 'DECLINED') {
    return { bg: '#f1f5f9', text: '#64748b', label: 'Đã từ chối' };
  }
  return { bg: '#fff7ed', text: '#ea580c', label: STATUS_LABEL[status] || status };
};

type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
type HistoryStatusFilter = 'ALL' | 'DONE' | 'CANCELLED' | 'DECLINED';
type ActiveStageFilter = 'ALL' | 'NEED_ASSIGN' | 'EN_ROUTE' | 'IN_PROGRESS' | 'AWAITING_PAY';
type VehicleTypeFilter = 'ALL' | 'CAR' | 'MOTORBIKE';
type PaymentMethodFilter = 'ALL' | 'CASH' | 'BANK_TRANSFER';
type StaffFilter = 'ALL' | number;

const DATE_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'TODAY', label: 'Hôm nay' },
  { key: 'WEEK', label: '7 ngày qua' },
  { key: 'MONTH', label: 'Tháng này' },
  { key: 'CUSTOM', label: 'Chọn ngày' },
];

const STATUS_OPTIONS: { key: HistoryStatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DONE', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
  { key: 'DECLINED', label: 'Từ chối' },
];

const VEHICLE_FILTER_OPTIONS: { key: VehicleTypeFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'CAR', label: '🚗 Ô tô' },
  { key: 'MOTORBIKE', label: '🛵 Xe máy' },
];

const PAYMENT_FILTER_OPTIONS: { key: PaymentMethodFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'BANK_TRANSFER', label: 'Chuyển khoản (PayOS)' },
  { key: 'CASH', label: 'Tiền mặt' },
];

export default function GarageOrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'offers' | 'active' | 'history'>('offers');
  const [searchText, setSearchText] = useState('');

  // Lọc tab "Đang xử lý"
  const [activeStageFilter, setActiveStageFilter] = useState<ActiveStageFilter>('ALL');

  // Lọc tab "Đã xử lý"
  const [historyStatusFilter, setHistoryStatusFilter] = useState<HistoryStatusFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleTypeFilter>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('ALL');
  const [staffFilter, setStaffFilter] = useState<StaffFilter>('ALL');

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempDateFilter, setTempDateFilter] = useState<DateFilter>('ALL');
  const [tempStatusFilter, setTempStatusFilter] = useState<HistoryStatusFilter>('ALL');
  const [tempCustomDate, setTempCustomDate] = useState<Date>(new Date());
  const [tempVehicleTypeFilter, setTempVehicleTypeFilter] = useState<VehicleTypeFilter>('ALL');
  const [tempPaymentMethodFilter, setTempPaymentMethodFilter] = useState<PaymentMethodFilter>('ALL');
  const [tempStaffFilter, setTempStaffFilter] = useState<StaffFilter>('ALL');

  const openFilterModal = () => {
    setTempDateFilter(dateFilter);
    setTempStatusFilter(historyStatusFilter);
    setTempCustomDate(customDate);
    setTempVehicleTypeFilter(vehicleTypeFilter);
    setTempPaymentMethodFilter(paymentMethodFilter);
    setTempStaffFilter(staffFilter);
    setShowFilterModal(true);
  };

  const applyFilter = () => {
    setDateFilter(tempDateFilter);
    setHistoryStatusFilter(tempStatusFilter);
    setCustomDate(tempCustomDate);
    setVehicleTypeFilter(tempVehicleTypeFilter);
    setPaymentMethodFilter(tempPaymentMethodFilter);
    setStaffFilter(tempStaffFilter);
    setShowFilterModal(false);
  };

  const resetFilter = () => {
    const today = new Date();
    setTempDateFilter('ALL');
    setTempStatusFilter('ALL');
    setTempCustomDate(today);
    setTempVehicleTypeFilter('ALL');
    setTempPaymentMethodFilter('ALL');
    setTempStaffFilter('ALL');

    setDateFilter('ALL');
    setHistoryStatusFilter('ALL');
    setCustomDate(today);
    setVehicleTypeFilter('ALL');
    setPaymentMethodFilter('ALL');
    setStaffFilter('ALL');
    setShowFilterModal(false);
  };

  const isFiltered =
    dateFilter !== 'ALL' ||
    historyStatusFilter !== 'ALL' ||
    vehicleTypeFilter !== 'ALL' ||
    paymentMethodFilter !== 'ALL' ||
    staffFilter !== 'ALL';

  const getDateFilterLabel = (d: DateFilter) => {
    if (d === 'TODAY') return 'Hôm nay';
    if (d === 'WEEK') return '7 ngày qua';
    if (d === 'MONTH') return 'Tháng này';
    if (d === 'CUSTOM') return formatDateOnly(customDate);
    return '';
  };

  const getStatusFilterLabel = (s: HistoryStatusFilter) => {
    if (s === 'DONE') return 'Hoàn thành';
    if (s === 'CANCELLED') return 'Đã huỷ';
    if (s === 'DECLINED') return 'Từ chối';
    return '';
  };

  const getFilterSummaryText = () => {
    const parts: string[] = [];
    if (dateFilter !== 'ALL') parts.push(getDateFilterLabel(dateFilter));
    if (historyStatusFilter !== 'ALL') parts.push(getStatusFilterLabel(historyStatusFilter));
    if (vehicleTypeFilter === 'CAR') parts.push('Ô tô');
    if (vehicleTypeFilter === 'MOTORBIKE') parts.push('Xe máy');
    if (paymentMethodFilter === 'CASH') parts.push('Tiền mặt');
    if (paymentMethodFilter === 'BANK_TRANSFER') parts.push('Chuyển khoản');
    if (staffFilter !== 'ALL') {
      const st = staffList.find((s) => s.id === staffFilter);
      if (st) parts.push(st.fullName || st.name || 'Thợ');
    }
    return parts.length > 0 ? parts.join(' · ') : 'Tất cả';
  };

  // offers + active dùng chung từ GarageOrdersContext (poll 5s ở layout); lịch sử/nhân viên/xe chỉ tải khi cần.
  const { offers, active, loading: ordersLoading, refresh } = useGarageOrders();
  const [history, setHistory] = useState<RescueRequestDto[]>([]);
  const [staffList, setStaffList] = useState<GarageStaffDto[]>([]);
  const [vehicleList, setVehicleList] = useState<RescueVehicleDto[]>([]);
  const [myGarage, setMyGarage] = useState<any>(null);
  const [staticLoading, setStaticLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const loading = ordersLoading || staticLoading;

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const loadStatic = useCallback(async () => {
    try {
      // Dùng allSettled để mỗi API độc lập, API nào lỗi không ảnh hưởng các API khác
      const [resHistory, resStaff, resVehicles, resGarage] = await Promise.allSettled([
        garageApi.listHistory(),
        garageApi.listStaff(),
        garageApi.listVehicles(),
        garageApi.getMyGarage(),
      ]);

      if (resHistory.status === 'fulfilled' && Array.isArray(resHistory.value)) {
        setHistory(resHistory.value);
      }
      if (resStaff.status === 'fulfilled' && Array.isArray(resStaff.value)) {
        setStaffList(resStaff.value);
      }
      if (resVehicles.status === 'fulfilled' && Array.isArray(resVehicles.value)) {
        setVehicleList(resVehicles.value);
      }
      if (resGarage.status === 'fulfilled' && resGarage.value) {
        setMyGarage(resGarage.value);
      }
    } catch (e: any) {
      console.warn('[orders] load error:', e?.message);
    } finally {
      if (aliveRef.current) setStaticLoading(false);
    }
  }, []);

  // Tải lại khi màn được focus (vào tab / quay lại từ màn chi tiết).
  useFocusEffect(
    useCallback(() => {
      loadStatic();
    }, [loadStatic]),
  );

  // Luôn đảm bảo spinner biến mất sau tối đa 2.5s dù mạng có chậm
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (aliveRef.current) setStaticLoading(false);
    }, 2500);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Có đơn rời danh sách đang xử lý (xong/huỷ/thanh toán) → tải lại lịch sử + nhân viên/xe rảnh.
  const prevActiveIdsRef = useRef<Set<number> | null>(null);
  useEffect(() => {
    const currentIds = new Set(active.map((r) => r.id));
    if (prevActiveIdsRef.current !== null) {
      const anyLeft = [...prevActiveIdsRef.current].some((id) => !currentIds.has(id));
      if (anyLeft) {
        loadStatic();
      }
    }
    prevActiveIdsRef.current = currentIds;
  }, [active, loadStatic]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), loadStatic()]);
    setRefreshing(false);
  };

  const callPhone = (phone?: string) => phone && Linking.openURL(`tel:${phone}`);

  // Đếm nhân viên rảnh, xe cứu hộ rảnh và kiểm tra số dư ví ký quỹ (>= 500.000đ)
  // Chỉ đánh giá khi dữ liệu gara đã được tải xong từ API
  const isDataLoaded = !staticLoading && myGarage !== null;
  const freeStaffCount = staffList.filter((s) => s.isActive !== false && s.status === 'FREE').length;
  const freeVehicleCount = vehicleList.filter((v) => v.isActive !== false && v.status === 'FREE').length;
  const creditBalance = myGarage?.creditBalance ?? 0;
  const isWalletEligible = isDataLoaded ? creditBalance >= 500000 : true;
  const isReadyToAccept = isDataLoaded && freeStaffCount > 0 && freeVehicleCount > 0 && isWalletEligible;

  const onAccept = (req: RescueRequestDto) => {
    if (!isDataLoaded) {
      Alert.alert('Đang tải dữ liệu', 'Đang cập nhật trạng thái ví và nhân sự gara, vui lòng chờ trong giây lát.');
      return;
    }
    // 1. Kiểm tra số dư ví ký quỹ tối thiểu 500.000đ
    if (!isWalletEligible) {
      Alert.alert(
        'Số dư ví không đủ điều kiện',
        `Ví tín dụng của bạn hiện có ${formatVnd(creditBalance)}. Quy định hệ thống yêu cầu số dư tối thiểu 500.000đ để nhận đơn cứu hộ. Vui lòng nạp tiền vào ví.`,
        [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Nạp tiền ngay',
            onPress: () => router.push('/garage-owner/wallet' as any),
          },
        ]
      );
      return;
    }

    // 2. Kiểm tra có nhân viên sẵn sàng
    if (freeStaffCount <= 0) {
      Alert.alert(
        'Chưa thể nhận đơn',
        'Gara hiện không có nhân viên nào đang ở trạng thái sẵn sàng (rảnh). Vui lòng đợi nhân viên hoàn thành ca hiện tại.'
      );
      return;
    }

    // 3. Kiểm tra có xe cứu hộ sẵn sàng
    if (freeVehicleCount <= 0) {
      Alert.alert(
        'Chưa thể nhận đơn',
        'Gara hiện không có xe cứu hộ nào đang ở trạng thái sẵn sàng (rảnh). Vui lòng đợi xe hoàn thành ca hiện tại.'
      );
      return;
    }

    Alert.alert('Nhận yêu cầu?', 'Bạn sẽ nhận đơn cứu hộ này và cần gán nhân viên ngay sau đó.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Nhận ngay',
        onPress: async () => {
          try {
            await garageApi.accept(req.id);
            await Promise.all([refresh(), loadStatic()]);
            setActiveTab('active');
          } catch (e: any) {
            Alert.alert('Không nhận được', e?.response?.data?.message || 'Đơn có thể đã được gara khác nhận.');
          }
        },
      },
    ]);
  };

  // Chủ gara chỉ XEM chi tiết (trạng thái + vị trí nhân viên & khách trên map).
  const openDetail = (req: RescueRequestDto) => {
    router.push({ pathname: '/garage-owner/order-detail', params: { id: String(req.id), from: 'orders' } } as any);
  };

  // Đơn đang mở modal gán nhân viên + xe.
  const [assignFor, setAssignFor] = useState<RescueRequestDto | null>(null);

  // 1. Lọc danh sách Đơn chờ nhận
  const filteredOffers = offers.filter((req) => {
    if (searchText.trim()) {
      const s = searchText.toLowerCase().trim();
      const codeMatch = String(req.code || '').toLowerCase().includes(s);
      const plateMatch = String(req.customerVehicle?.licensePlate || '').toLowerCase().includes(s);
      const nameMatch = String(req.customer?.name || '').toLowerCase().includes(s);
      const phoneMatch = String(req.customer?.phone || '').toLowerCase().includes(s);
      const symptomMatch = String(req.symptom || '').toLowerCase().includes(s);
      return codeMatch || plateMatch || nameMatch || phoneMatch || symptomMatch;
    }
    return true;
  });

  // 2. Lọc danh sách Đơn đang xử lý
  const filteredActive = active.filter((req) => {
    // Tìm kiếm từ khoá
    if (searchText.trim()) {
      const s = searchText.toLowerCase().trim();
      const codeMatch = String(req.code || '').toLowerCase().includes(s);
      const plateMatch = String(req.customerVehicle?.licensePlate || '').toLowerCase().includes(s);
      const nameMatch = String(req.customer?.name || '').toLowerCase().includes(s);
      const phoneMatch = String(req.customer?.phone || '').toLowerCase().includes(s);
      const staffMatch = String(req.staff?.name || '').toLowerCase().includes(s);
      const symptomMatch = String(req.symptom || '').toLowerCase().includes(s);
      if (!codeMatch && !plateMatch && !nameMatch && !phoneMatch && !staffMatch && !symptomMatch) {
        return false;
      }
    }

    // Lọc theo tiến độ giai đoạn (ActiveStageFilter)
    if (activeStageFilter === 'NEED_ASSIGN') {
      return req.status === 'ACCEPTED';
    }
    if (activeStageFilter === 'EN_ROUTE') {
      return req.status === 'ASSIGNED' || req.status === 'EN_ROUTE' || req.status === 'ARRIVED';
    }
    if (activeStageFilter === 'IN_PROGRESS') {
      return (
        req.status === 'DIAGNOSED' ||
        req.status === 'REPAIRING_ONSITE' ||
        req.status === 'TOW_TO_GARAGE' ||
        req.status === 'TOWING'
      );
    }
    if (activeStageFilter === 'AWAITING_PAY') {
      return req.status === 'AWAITING_PAYMENT' || req.status === 'COMPLETED';
    }

    return true;
  });

  // 3. Lọc danh sách Đơn đã xử lý (Lịch sử)
  const filteredHistory = history.filter((req) => {
    // Tìm kiếm từ khoá
    if (searchText.trim()) {
      const s = searchText.toLowerCase().trim();
      const codeMatch = String(req.code || '').toLowerCase().includes(s);
      const plateMatch = String(req.customerVehicle?.licensePlate || '').toLowerCase().includes(s);
      const nameMatch = String(req.customer?.name || '').toLowerCase().includes(s);
      const phoneMatch = String(req.customer?.phone || '').toLowerCase().includes(s);
      const staffMatch = String(req.staff?.name || '').toLowerCase().includes(s);
      const symptomMatch = String(req.symptom || '').toLowerCase().includes(s);
      if (!codeMatch && !plateMatch && !nameMatch && !phoneMatch && !staffMatch && !symptomMatch) {
        return false;
      }
    }

    // Lọc theo trạng thái
    if (historyStatusFilter === 'DONE') {
      const isDone = req.status === 'PAID' || req.status === 'RATED';
      if (!isDone) return false;
    } else if (historyStatusFilter === 'CANCELLED') {
      if (req.status !== 'CANCELLED') return false;
    } else if (historyStatusFilter === 'DECLINED') {
      if (req.status !== 'DECLINED') return false;
    }

    // Lọc theo loại phương tiện
    if (vehicleTypeFilter !== 'ALL') {
      if (req.vehicleType !== vehicleTypeFilter) return false;
    }

    // Lọc theo phương thức thanh toán
    if (paymentMethodFilter !== 'ALL') {
      if (req.paymentMethod !== paymentMethodFilter) return false;
    }

    // Lọc theo nhân viên
    if (staffFilter !== 'ALL') {
      if (!req.staff || req.staff.id !== staffFilter) return false;
    }

    // Lọc theo ngày
    if (dateFilter !== 'ALL' && req.createdAt) {
      const now = new Date();
      const reqDate = new Date(req.createdAt);
      if (isNaN(reqDate.getTime())) return true;

      if (dateFilter === 'TODAY') {
        const isToday =
          reqDate.getFullYear() === now.getFullYear() &&
          reqDate.getMonth() === now.getMonth() &&
          reqDate.getDate() === now.getDate();
        if (!isToday) return false;
      } else if (dateFilter === 'WEEK') {
        const diffMs = now.getTime() - reqDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (dateFilter === 'MONTH') {
        const isSameMonth =
          reqDate.getFullYear() === now.getFullYear() &&
          reqDate.getMonth() === now.getMonth();
        if (!isSameMonth) return false;
      } else if (dateFilter === 'CUSTOM') {
        const isSameDate =
          reqDate.getFullYear() === customDate.getFullYear() &&
          reqDate.getMonth() === customDate.getMonth() &&
          reqDate.getDate() === customDate.getDate();
        if (!isSameDate) return false;
      }
    }

    return true;
  });

  // Tính tổng doanh thu hoàn tất theo kết quả lọc
  const totalFilteredHistoryRevenue = filteredHistory.reduce((acc, req) => {
    if (req.status === 'PAID' || req.status === 'RATED') {
      const amt =
        req.totalAmount && req.totalAmount > 0
          ? req.totalAmount
          : (req.rescueFee || 0) + (req.towingFee || 0) + (req.serviceFee || 0);
      return acc + amt;
    }
    return acc;
  }, 0);

  const list = activeTab === 'offers' ? filteredOffers : activeTab === 'active' ? filteredActive : filteredHistory;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý Đơn cứu hộ</Text>
        <Text style={styles.headerSub}>Nhận, điều phối và theo dõi lịch sử cứu hộ của gara</Text>
      </View>

      {/* Hàng Tabs chính nhỏ gọn */}
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

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
            Đã xử lý ({history.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── THANH TÌM KIẾM NHANH (MÃ ĐƠN, BIỂN SỐ, KHÁCH, SĐT, THỢ) ── */}
      <View style={styles.searchBarBox}>
        <Search size={15} color="#94a3b8" />
        <TextInput
          placeholder="Tìm mã đơn, biển số xe, khách, thợ..."
          placeholderTextColor="#94a3b8"
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {!!searchText && (
          <TouchableOpacity
            onPress={() => setSearchText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Trạng thái khả dụng nhân viên, xe cứu hộ & số dư ví khi ở tab Chờ nhận */}
      {activeTab === 'offers' && (
        !isDataLoaded ? (
          <View style={[styles.resourceBar, { backgroundColor: '#f8fafc', borderBottomColor: '#e2e8f0' }]}>
            {staticLoading ? (
              <>
                <ActivityIndicator size="small" color="#ea580c" style={{ transform: [{ scale: 0.75 }], marginRight: 6 }} />
                <Text style={[styles.resourceBarText, { color: '#64748b' }]}>
                  Đang kiểm tra khả dụng gara...
                </Text>
              </>
            ) : (
              <Text style={[styles.resourceBarText, { color: '#64748b' }]}>
                Chưa có dữ liệu ví gara (Kéo xuống để tải lại)
              </Text>
            )}
          </View>
        ) : (
          <View style={[styles.resourceBar, !isReadyToAccept && styles.resourceBarWarning]}>
            <View style={[styles.statusDot, { backgroundColor: isReadyToAccept ? '#16a34a' : (!isWalletEligible ? '#ea580c' : '#dc2626') }]} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.resourceBarText, !isReadyToAccept && { color: !isWalletEligible ? '#c2410c' : '#b91c1c' }]}>
                {isReadyToAccept
                  ? `Sẵn sàng: ${freeStaffCount} thợ rảnh · ${freeVehicleCount} xe rảnh · Ví: ${formatVnd(creditBalance)}`
                  : !isWalletEligible
                    ? `Chưa đủ điều kiện: Ví có ${formatVnd(creditBalance)} (Cần tối thiểu 500.000đ)`
                    : `Chưa thể nhận: ${freeStaffCount} thợ rảnh · ${freeVehicleCount} xe rảnh (Cần cả 2)`}
              </Text>
              {!isWalletEligible && (
                <TouchableOpacity
                  onPress={() => router.push('/garage-owner/wallet' as any)}
                  style={styles.topupQuickBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.topupQuickBtnText}>Nạp tiền</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )
      )}

      {/* ── BỘ LỌC TIẾN ĐỘ CHO TAB "ĐANG XỬ LÝ" ── */}
      {activeTab === 'active' && (
        <View style={styles.quickChipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.quickChipsBar}
          >
            {(
              [
                { key: 'ALL', label: `Tất cả (${active.length})` },
                {
                  key: 'NEED_ASSIGN',
                  label: `⚠️ Chưa gán thợ (${active.filter((r) => r.status === 'ACCEPTED').length})`,
                },
                {
                  key: 'EN_ROUTE',
                  label: `Đang di chuyển (${active.filter((r) => r.status === 'ASSIGNED' || r.status === 'EN_ROUTE' || r.status === 'ARRIVED').length})`,
                },
                {
                  key: 'IN_PROGRESS',
                  label: `Đang sửa / kéo (${active.filter((r) => r.status === 'DIAGNOSED' || r.status === 'REPAIRING_ONSITE' || r.status === 'TOW_TO_GARAGE' || r.status === 'TOWING').length})`,
                },
                {
                  key: 'AWAITING_PAY',
                  label: `Chờ thanh toán (${active.filter((r) => r.status === 'AWAITING_PAYMENT' || r.status === 'COMPLETED').length})`,
                },
              ] as { key: ActiveStageFilter; label: string }[]
            ).map((chip) => {
              const isSelected = activeStageFilter === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[styles.quickChip, isSelected && styles.quickChipActive]}
                  onPress={() => setActiveStageFilter(chip.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.quickChipText, isSelected && styles.quickChipTextActive]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── BỘ LỌC NHANH CHO TAB "ĐÃ XỬ LÝ" ── */}
      {activeTab === 'history' && (
        <View style={styles.historyFilterWrap}>
          {/* Hàng Quick Chips thời gian & trạng thái phổ biến */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.quickChipsBar}
          >
            {[
              {
                label: 'Tất cả',
                active: dateFilter === 'ALL' && historyStatusFilter === 'ALL' && vehicleTypeFilter === 'ALL',
                onPress: () => {
                  setDateFilter('ALL');
                  setHistoryStatusFilter('ALL');
                  setVehicleTypeFilter('ALL');
                },
              },
              {
                label: 'Hôm nay',
                active: dateFilter === 'TODAY',
                onPress: () => setDateFilter(dateFilter === 'TODAY' ? 'ALL' : 'TODAY'),
              },
              {
                label: '7 ngày qua',
                active: dateFilter === 'WEEK',
                onPress: () => setDateFilter(dateFilter === 'WEEK' ? 'ALL' : 'WEEK'),
              },
              {
                label: 'Tháng này',
                active: dateFilter === 'MONTH',
                onPress: () => setDateFilter(dateFilter === 'MONTH' ? 'ALL' : 'MONTH'),
              },
              {
                label: '✅ Hoàn thành',
                active: historyStatusFilter === 'DONE',
                onPress: () => setHistoryStatusFilter(historyStatusFilter === 'DONE' ? 'ALL' : 'DONE'),
              },
              {
                label: '❌ Đã huỷ',
                active: historyStatusFilter === 'CANCELLED',
                onPress: () => setHistoryStatusFilter(historyStatusFilter === 'CANCELLED' ? 'ALL' : 'CANCELLED'),
              },
              {
                label: '🚗 Ô tô',
                active: vehicleTypeFilter === 'CAR',
                onPress: () => setVehicleTypeFilter(vehicleTypeFilter === 'CAR' ? 'ALL' : 'CAR'),
              },
              {
                label: '🛵 Xe máy',
                active: vehicleTypeFilter === 'MOTORBIKE',
                onPress: () => setVehicleTypeFilter(vehicleTypeFilter === 'MOTORBIKE' ? 'ALL' : 'MOTORBIKE'),
              },
            ].map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.quickChip, chip.active && styles.quickChipActive]}
                onPress={chip.onPress}
                activeOpacity={0.8}
              >
                <Text style={[styles.quickChipText, chip.active && styles.quickChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Thanh tóm tắt kết quả lọc & Nút mở Popup bộ lọc chi tiết */}
          <View style={styles.filterSummaryBar}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.filterSummaryText} numberOfLines={1}>
                {isFiltered
                  ? `Lọc: ${getFilterSummaryText()} (${filteredHistory.length})`
                  : `Tất cả đơn (${history.length})`}
              </Text>
              {totalFilteredHistoryRevenue > 0 && (
                <Text style={styles.filterRevenueText}>
                  Doanh thu hoàn tất:{' '}
                  <Text style={{ fontWeight: '800', color: '#16a34a' }}>
                    {formatVnd(totalFilteredHistoryRevenue)}
                  </Text>
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.filterTriggerBtn, isFiltered && styles.filterTriggerBtnActive]}
              onPress={openFilterModal}
              activeOpacity={0.8}
            >
              <Filter size={12} color={isFiltered ? '#ea580c' : '#64748b'} strokeWidth={2.4} />
              <Text style={[styles.filterTriggerText, isFiltered && styles.filterTriggerTextActive]}>
                Bộ lọc
              </Text>
              {isFiltered && <View style={styles.filterDot} />}
            </TouchableOpacity>
          </View>
        </View>
      )}

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
                {activeTab === 'offers'
                  ? 'Chưa có yêu cầu nào đang chờ nhận.'
                  : activeTab === 'active'
                    ? 'Chưa có đơn nào đang xử lý.'
                    : 'Không có đơn cứu hộ nào trong mục này.'}
              </Text>
            </View>
          )}

          {list.map((req) => {
            const historyBadge = activeTab === 'history' ? getHistoryStatusBadge(req.status) : null;

            return (
              <View key={req.id} style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: '#fff7ed' }]}>
                    <Text style={[styles.badgeText, { color: '#ea580c' }]}>
                      Cứu hộ {VEHICLE_LABEL[req.vehicleType] || req.vehicleType}
                    </Text>
                  </View>
                  <Text style={styles.codeText}>#{req.code}</Text>
                </View>

                {/* Thời gian tạo & hoàn tất */}
                {req.createdAt && (
                  <View style={styles.timeRow}>
                    <Clock size={11} color="#64748b" strokeWidth={2.2} />
                    <Text style={styles.timeText}>
                      Tạo: {formatDateTime(req.createdAt)}
                      {req.completedAt ? ` · Xong: ${formatDateTime(req.completedAt)}` : ''}
                    </Text>
                  </View>
                )}

                <Text style={styles.issueText}>Sự cố: {req.symptom}</Text>

                {/* Thông tin phương tiện khách */}
                {req.customerVehicle?.licensePlate && (
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleText}>
                      Xe: <Text style={{ fontWeight: '800', color: '#0f172a' }}>{req.customerVehicle.licensePlate}</Text>
                      {req.customerVehicle.brand ? ` (${[req.customerVehicle.brand, req.customerVehicle.model].filter(Boolean).join(' ')})` : ''}
                    </Text>
                  </View>
                )}

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

                {activeTab === 'history' && historyBadge && (
                  <View style={styles.historyStatusRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.statusBadge, { backgroundColor: historyBadge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: historyBadge.text }]}>
                          {historyBadge.label}
                        </Text>
                      </View>
                      {req.paymentMethod && (
                        <View style={styles.payMethodBadge}>
                          <CreditCard size={10} color="#64748b" />
                          <Text style={styles.payMethodText}>
                            {req.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                          </Text>
                        </View>
                      )}
                    </View>
                    {((req.totalAmount || 0) > 0 || (req.rescueFee || 0) > 0 || (req.serviceFee || 0) > 0) ? (
                      <Text style={styles.historyFeeText}>
                        {formatVnd(req.status === 'DECLINED' || req.quoteStatus === 'DECLINED'
                          ? (req.rescueFee || 0)
                          : (req.totalAmount && req.totalAmount > 0
                            ? req.totalAmount
                            : ((req.rescueFee || 0) + (req.towingFee || 0) + (req.serviceFee || 0))))}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Lý do huỷ nếu có */}
                {req.cancelReason && (req.status === 'CANCELLED' || req.status === 'DECLINED') && (
                  <View style={styles.cancelBox}>
                    <AlertCircle size={12} color="#dc2626" />
                    <Text style={styles.cancelText} numberOfLines={2}>
                      Lý do: {req.cancelReason}
                    </Text>
                  </View>
                )}

                {/* Trạng thái bồi hoàn xăng xe nếu có */}
                {req.gasCompensationStatus && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: req.gasCompensationStatus === 'AUTO_CREDITED' || req.gasCompensationStatus === 'APPROVED' ? '#f0fdf4' : '#fffbeb',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    marginTop: 6,
                  }}>
                    <Text style={{
                      fontSize: 11.5,
                      fontWeight: '700',
                      color: req.gasCompensationStatus === 'AUTO_CREDITED' || req.gasCompensationStatus === 'APPROVED' ? '#16a34a' : '#d97706',
                    }}>
                      {req.gasCompensationStatus === 'AUTO_CREDITED'
                        ? `⛽ Đã bồi hoàn xăng xe: +${formatVnd(req.gasCompensationAmount || 0)}`
                        : req.gasCompensationStatus === 'PENDING_APPROVAL'
                          ? '⏳ Chờ Admin duyệt bồi hoàn xăng (30%)'
                          : req.gasCompensationStatus === 'APPROVED'
                            ? `⛽ Admin đã duyệt bồi hoàn: +${formatVnd(req.gasCompensationAmount || 0)}`
                            : 'Từ chối bồi hoàn hỗ trợ xăng xe'}
                    </Text>
                  </View>
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
                  <TouchableOpacity
                    style={[styles.primaryBtn, !isReadyToAccept && styles.primaryBtnDisabled]}
                    onPress={() => onAccept(req)}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.primaryBtnText}>
                      {isReadyToAccept ? 'Nhận yêu cầu' : 'Chưa đủ nhân viên / xe'}
                    </Text>
                  </TouchableOpacity>
                ) : activeTab === 'active' && req.status === 'ACCEPTED' ? (
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setAssignFor(req)} activeOpacity={0.9}>
                    <Text style={styles.primaryBtnText}>Gán nhân viên & xe</Text>
                  </TouchableOpacity>
                ) : (
                  // Đơn đang xử lý hoặc Đã xử lý → Xem chi tiết
                  <TouchableOpacity style={styles.detailBtn} onPress={() => openDetail(req)} activeOpacity={0.85}>
                    <Text style={styles.detailBtnText}>Xem chi tiết cứu hộ</Text>
                    <ChevronRight size={14} color="#ea580c" strokeWidth={2.4} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )
      }

      <AssignStaffModal
        visible={assignFor !== null}
        request={assignFor}
        onClose={() => setAssignFor(null)}
        onAssigned={() => { refresh(); loadStatic(); }}
      />

      {/* Popup Modal Bộ lọc */}
      < Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity style={styles.filterModalCard} activeOpacity={1}>
            {/* Tiêu đề Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <View style={styles.modalHeaderIconWrap}>
                  <Filter size={15} color="#ea580c" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Bộ lọc đơn cứu hộ</Text>
                  <Text style={styles.modalSubTitle}>Tùy chỉnh tiêu chí tìm kiếm đơn</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color="#64748b" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 440 }}
              contentContainerStyle={{ gap: 12, paddingBottom: 6 }}
            >
              {/* Mục 1: Lọc thời gian */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionLabelRow}>
                  <Calendar size={13} color="#ea580c" strokeWidth={2.4} />
                  <Text style={styles.modalSectionTitle}>Thời gian</Text>
                </View>
                <View style={styles.chipGrid}>
                  {DATE_OPTIONS.map((opt) => {
                    const isSel = tempDateFilter === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.popupChip, isSel && styles.popupChipActive]}
                        onPress={() => setTempDateFilter(opt.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.popupChipText, isSel && styles.popupChipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Nếu chọn ngày cụ thể -> hiển thị bộ chọn ngày trực quan */}
                {tempDateFilter === 'CUSTOM' && (
                  <View style={styles.customDateBox}>
                    <View style={styles.dateStepperRow}>
                      <TouchableOpacity
                        style={styles.dateStepBtn}
                        onPress={() => {
                          const d = new Date(tempCustomDate);
                          d.setDate(d.getDate() - 1);
                          setTempCustomDate(d);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <ChevronLeft size={16} color="#0f172a" strokeWidth={2.4} />
                      </TouchableOpacity>

                      <View style={styles.dateDisplayWrap}>
                        <Calendar size={13} color="#ea580c" strokeWidth={2.4} />
                        <Text style={styles.dateDisplayText}>
                          {formatDateOnly(tempCustomDate)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.dateStepBtn}
                        onPress={() => {
                          const d = new Date(tempCustomDate);
                          d.setDate(d.getDate() + 1);
                          setTempCustomDate(d);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <ChevronRight size={16} color="#0f172a" strokeWidth={2.4} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.todayQuickBtn}
                        onPress={() => setTempCustomDate(new Date())}
                      >
                        <Text style={styles.todayQuickText}>Hôm nay</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Hàng chọn nhanh các ngày gần nhất */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flexGrow: 0 }}
                      contentContainerStyle={styles.quickDaysRow}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((daysAgo) => {
                        const target = new Date();
                        target.setDate(target.getDate() - daysAgo);
                        const isSelected =
                          target.getFullYear() === tempCustomDate.getFullYear() &&
                          target.getMonth() === tempCustomDate.getMonth() &&
                          target.getDate() === tempCustomDate.getDate();
                        const label = daysAgo === 0 ? 'Hôm nay' : daysAgo === 1 ? 'Hôm qua' : `${target.getDate()}/${target.getMonth() + 1}`;

                        return (
                          <TouchableOpacity
                            key={daysAgo}
                            style={[styles.quickDayChip, isSelected && styles.quickDayChipActive]}
                            onPress={() => setTempCustomDate(target)}
                          >
                            <Text style={[styles.quickDayText, isSelected && styles.quickDayTextActive]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Mục 2: Lọc trạng thái */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionLabelRow}>
                  <CheckCircle2 size={13} color="#ea580c" strokeWidth={2.4} />
                  <Text style={styles.modalSectionTitle}>Trạng thái đơn</Text>
                </View>
                <View style={styles.chipGrid}>
                  {STATUS_OPTIONS.map((opt) => {
                    const isSel = tempStatusFilter === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.popupChip, isSel && styles.popupChipActive]}
                        onPress={() => setTempStatusFilter(opt.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.popupChipText, isSel && styles.popupChipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Mục 3: Lọc loại phương tiện */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionLabelRow}>
                  <Car size={13} color="#ea580c" strokeWidth={2.4} />
                  <Text style={styles.modalSectionTitle}>Loại phương tiện cứu hộ</Text>
                </View>
                <View style={styles.chipGrid}>
                  {VEHICLE_FILTER_OPTIONS.map((opt) => {
                    const isSel = tempVehicleTypeFilter === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.popupChip, isSel && styles.popupChipActive]}
                        onPress={() => setTempVehicleTypeFilter(opt.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.popupChipText, isSel && styles.popupChipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Mục 4: Lọc hình thức thanh toán */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionLabelRow}>
                  <CreditCard size={13} color="#ea580c" strokeWidth={2.4} />
                  <Text style={styles.modalSectionTitle}>Hình thức thanh toán</Text>
                </View>
                <View style={styles.chipGrid}>
                  {PAYMENT_FILTER_OPTIONS.map((opt) => {
                    const isSel = tempPaymentMethodFilter === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.popupChip, isSel && styles.popupChipActive]}
                        onPress={() => setTempPaymentMethodFilter(opt.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.popupChipText, isSel && styles.popupChipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Mục 5: Lọc theo nhân viên cứu hộ */}
              {staffList.length > 0 && (
                <View style={[styles.modalSection, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <View style={styles.modalSectionLabelRow}>
                    <User size={13} color="#ea580c" strokeWidth={2.4} />
                    <Text style={styles.modalSectionTitle}>Nhân viên phụ trách</Text>
                  </View>
                  <View style={styles.chipGrid}>
                    <TouchableOpacity
                      style={[styles.popupChip, tempStaffFilter === 'ALL' && styles.popupChipActive]}
                      onPress={() => setTempStaffFilter('ALL')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.popupChipText, tempStaffFilter === 'ALL' && styles.popupChipTextActive]}>
                        Tất cả nhân viên
                      </Text>
                    </TouchableOpacity>
                    {staffList.map((st) => {
                      const isSel = tempStaffFilter === st.id;
                      return (
                        <TouchableOpacity
                          key={st.id}
                          style={[styles.popupChip, isSel && styles.popupChipActive]}
                          onPress={() => setTempStaffFilter(st.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.popupChipText, isSel && styles.popupChipTextActive]}>
                            {st.fullName || st.name || 'Thợ'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Nút thao tác dưới Modal */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilter} activeOpacity={0.8}>
                <RotateCcw size={14} color="#64748b" strokeWidth={2.2} />
                <Text style={styles.resetBtnText}>Đặt lại</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.applyBtn} onPress={applyFilter} activeOpacity={0.9}>
                <Text style={styles.applyBtnText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 5.5,
    paddingHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#ea580c' },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#ffffff', fontWeight: '800' },

  /* Thanh tìm kiếm nhanh */
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
    paddingVertical: 2,
  },

  /* Thanh Quick Chips cuộn ngang */
  quickChipsWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quickChipsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 7,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'center',
  },
  quickChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  quickChipTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },

  historyFilterWrap: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterSummaryText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  filterRevenueText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '500',
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4.5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTriggerBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  filterTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTriggerTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  filterDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ea580c',
  },

  /* Modal Popup styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  filterModalCard: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '86%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
    fontWeight: '500',
  },
  modalCloseCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSection: {
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  modalSectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalSectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  popupChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  popupChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  popupChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  popupChipTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  applyBtn: {
    flex: 2,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  applyBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 14, gap: 10 },
  emptyBox: { padding: 28, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },

  orderCard: { backgroundColor: '#ffffff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
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
  customerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 2, gap: 8 },
  customerName: { fontSize: 12, fontWeight: '700', color: '#334155', flex: 1 },
  customerPhone: { fontSize: 12, fontWeight: '800', color: '#ea580c' },
  statusLine: { fontSize: 12, fontWeight: '800', color: '#c2410c' },

  historyStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  historyFeeText: { fontSize: 13, fontWeight: '900', color: '#0f172a' },

  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignedText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  primaryBtn: {
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7.5,
    borderRadius: 9,
    backgroundColor: '#fff7ed',
    borderWidth: 1.2,
    borderColor: '#fed7aa',
    marginTop: 4,
  },
  detailBtnText: { fontSize: 12, fontWeight: '800', color: '#ea580c' },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  timeText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  vehicleRow: { backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 1 },
  vehicleText: { fontSize: 11.5, color: '#475569' },
  payMethodBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 6 },
  payMethodText: { fontSize: 10.5, color: '#64748b', fontWeight: '700' },
  cancelBox: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef2f2', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2', marginTop: 2 },
  cancelText: { fontSize: 11.5, color: '#dc2626', fontWeight: '600', flex: 1 },

  customDateBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  dateStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  dateStepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplayWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  dateDisplayText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  todayQuickBtn: {
    paddingVertical: 5.5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  todayQuickText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  quickDaysRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  quickDayChip: {
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickDayChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  quickDayText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
  },
  quickDayTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },

  resourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 5.5,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  resourceBarWarning: {
    backgroundColor: '#fef2f2',
    borderBottomColor: '#fee2e2',
  },
  resourceBarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  topupQuickBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginLeft: 6,
  },
  topupQuickBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  primaryBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
});

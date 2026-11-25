import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  Wrench,
  AlertCircle,
  History,
  RefreshCw,
  Banknote,
  Calendar,
  Search,
  X,
  PhoneCall,
  MessageSquare,
  CreditCard,
  ChevronRight,
  RotateCcw,
  User,
  Car,
} from 'lucide-react-native';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';
import { useFocusEffect, useRouter } from 'expo-router';
import { callManager } from '../../realtime/callManager';
import { canFreeCall } from '../../utils/call';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: number;
  code: string;
  status: string;
  symptom: string;
  pickupAddress: string;
  totalAmount: number | null;
  rescueFee: number | null;
  completedAt: string | null;
  createdAt: string;
  paymentMethod: string | null;
  customer: { id: number; name: string; phone: string; avatarUrl?: string | null } | null;
  vehicleType: string | null;
  licensePlate?: string | null;
  customerVehicle?: { licensePlate?: string | null } | null;
}

type StatusFilter = 'ALL' | 'DONE' | 'CANCELLED';
type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
type VehicleFilter = 'ALL' | 'CAR' | 'MOTORBIKE';
type PaymentFilter = 'ALL' | 'CASH' | 'BANK_TRANSFER';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `${timeStr} Hôm nay`;
  if (diffDays === 1) return `${timeStr} Hôm qua`;
  return `${timeStr} ${d.toLocaleDateString('vi-VN')}`;
}

function formatMoney(amount: number | null | undefined): string {
  if (!amount) return '0đ';
  return amount.toLocaleString('vi-VN') + 'đ';
}

function vehicleTypeLabel(vt: string | null): string {
  switch (vt) {
    case 'MOTORCYCLE':
    case 'MOTORBIKE':
      return '🛵 Xe máy';
    case 'CAR':
      return '🚗 Ô tô';
    case 'TRUCK':
      return '🚚 Xe tải';
    default:
      return vt ?? 'Phương tiện';
  }
}

function paymentLabel(pm: string | null): string {
  switch (pm) {
    case 'CASH':
      return 'Tiền mặt';
    case 'BANK_TRANSFER':
      return 'Chuyển khoản';
    default:
      return pm ?? 'Chưa xác định';
  }
}

function getActivePaymentLabel(task: any): string {
  if (!task) return '';
  const isPaid = task.status === 'PAID' || task.status === 'RATED';
  if (isPaid) {
    return task.paymentMethod === 'CASH' || task.cashConfirmedByCustomer ? 'Tiền mặt' : 'Chuyển khoản';
  }
  if (task.cashConfirmedByCustomer) {
    return 'Tiền mặt';
  }
  return '';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GarageStaffTasksScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');

  // Active task (từ API /staff/active)
  const [activeTask, setActiveTask] = useState<any>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);
  const hasLoadedActiveRef = useRef(false);

  // History (từ API /staff/history)
  const [historyTasks, setHistoryTasks] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const hasLoadedHistoryRef = useRef(false);

  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch active ──
  const fetchActive = useCallback(async (showSpinner = false) => {
    if (showSpinner || !hasLoadedActiveRef.current) {
      setActiveLoading(true);
    }
    setActiveError(null);
    try {
      const apiRes: any = await axiosClient.get('/rescue-requests/staff/active');
      const payload = apiRes?.data !== undefined ? apiRes.data : apiRes;
      setActiveTask(payload && payload.id ? payload : null);
      hasLoadedActiveRef.current = true;
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Lỗi kết nối';
      console.warn('[tasks] fetchActive error:', msg);
      setActiveError(msg || 'Không thể tải nhiệm vụ hiện tại. Vui lòng thử lại.');
    } finally {
      setActiveLoading(false);
    }
  }, []);

  // ── Fetch history ──
  const fetchHistory = useCallback(async (showSpinner = false) => {
    if (showSpinner || !hasLoadedHistoryRef.current) {
      setHistoryLoading(true);
    }
    setHistoryError(null);
    try {
      const apiRes: any = await axiosClient.get('/rescue-requests/staff/history');
      const list = Array.isArray(apiRes?.data)
        ? apiRes.data
        : Array.isArray(apiRes)
          ? apiRes
          : [];
      setHistoryTasks(list);
      hasLoadedHistoryRef.current = true;
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? e?.message ?? 'Lỗi kết nối';
      console.error('[tasks] fetchHistory error:', status, msg);
      setHistoryError(`Không thể tải lịch sử nhiệm vụ (${msg}). Vui lòng thử lại.`);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ── Load khi tab được focus ──
  useFocusEffect(
    useCallback(() => {
      fetchActive();
      fetchHistory();
    }, [fetchActive, fetchHistory])
  );

  // ── Pull-to-refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchActive(), fetchHistory()]);
    setRefreshing(false);
  }, [fetchActive, fetchHistory]);

  // ── Call & Chat Actions ──
  const handleFreeCallCustomer = (task: any) => {
    if (!task) return;
    const peerName = task.customer?.name || 'Khách hàng';
    callManager.startCall({
      rescueRequestId: task.id,
      peer: 'CUSTOMER',
      peerName,
    });
  };

  const handleOpenChat = (task: any) => {
    if (!task) return;
    router.push({
      pathname: '/chat',
      params: {
        requestId: String(task.id),
        peer: 'CUSTOMER',
        peerName: task.customer?.name || 'Khách hàng',
        peerPhone: task.customer?.phone || '',
        peerRole: 'Khách hàng',
      },
    } as any);
  };

  const handleOpenMap = () => {
    router.replace('/garage-staff/home');
  };

  const handleArrived = async () => {
    if (!activeTask) return;
    Alert.alert('Xác nhận tới nơi', 'Bạn đã có mặt tại hiện trường cứu hộ?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đã tới nơi',
        onPress: async () => {
          try {
            await axiosClient.post(`/rescue-requests/${activeTask.id}/status`, { status: 'ARRIVED' });
            await fetchActive();
            Alert.alert('Cập nhật', 'Đã xác nhận bạn đã tới hiện trường.');
          } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể cập nhật trạng thái.');
          }
        },
      },
    ]);
  };

  const activeStatusLabel = () => {
    switch (activeTask?.status) {
      case 'ACCEPTED':
        return 'Đã nhận đơn';
      case 'ASSIGNED':
        return 'Đã phân công';
      case 'EN_ROUTE':
        return 'Đang di chuyển';
      case 'ARRIVED':
        return 'Đã tới hiện trường';
      case 'DIAGNOSED':
        return 'Chờ duyệt báo giá';
      case 'REPAIRING_ONSITE':
        return 'Đang sửa chữa';
      case 'TOWING':
        return 'Đang kéo xe';
      case 'TOW_TO_GARAGE':
        return 'Đang sửa tại Gara';
      case 'AWAITING_PAYMENT':
      case 'COMPLETED':
        return 'Chờ thanh toán';
      case 'PAID':
        return 'Đã thanh toán';
      case 'RATED':
        return 'Hoàn thành';
      default:
        return activeTask?.status ?? '';
    }
  };

  const getActiveStep = (status?: string): number => {
    switch (status) {
      case 'ACCEPTED':
      case 'ASSIGNED':
        return 1;
      case 'EN_ROUTE':
        return 2;
      case 'ARRIVED':
      case 'DIAGNOSED':
        return 3;
      case 'REPAIRING_ONSITE':
      case 'TOWING':
      case 'TOW_TO_GARAGE':
      case 'AWAITING_PAYMENT':
      case 'COMPLETED':
      case 'PAID':
      case 'RATED':
        return 4;
      default:
        return 1;
    }
  };

  // ── Lọc danh sách lịch sử ──
  const filteredHistory = useMemo(() => {
    let result = historyTasks;

    // 0. Lọc theo trạng thái
    if (statusFilter === 'DONE') {
      result = result.filter((it) => it.status !== 'CANCELLED' && it.status !== 'DECLINED');
    } else if (statusFilter === 'CANCELLED') {
      result = result.filter((it) => it.status === 'CANCELLED' || it.status === 'DECLINED');
    }

    // 1. Lọc theo thời gian
    const now = new Date();
    if (dateFilter === 'TODAY') {
      const todayStr = now.toDateString();
      result = result.filter((it) => {
        const d = new Date(it.completedAt || it.createdAt);
        return d.toDateString() === todayStr;
      });
    } else if (dateFilter === 'WEEK') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      result = result.filter((it) => {
        const d = new Date(it.completedAt || it.createdAt);
        return d >= sevenDaysAgo;
      });
    } else if (dateFilter === 'MONTH') {
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();
      result = result.filter((it) => {
        const d = new Date(it.completedAt || it.createdAt);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      });
    }

    // 2. Lọc theo phương tiện
    if (vehicleFilter === 'CAR') {
      result = result.filter((it) => it.vehicleType === 'CAR' || it.vehicleType === 'TRUCK');
    } else if (vehicleFilter === 'MOTORBIKE') {
      result = result.filter((it) => it.vehicleType === 'MOTORCYCLE' || it.vehicleType === 'MOTORBIKE');
    }

    // 3. Lọc theo hình thức thanh toán
    if (paymentFilter === 'CASH') {
      result = result.filter((it) => it.paymentMethod === 'CASH');
    } else if (paymentFilter === 'BANK_TRANSFER') {
      result = result.filter((it) => it.paymentMethod === 'BANK_TRANSFER');
    }

    // 4. Lọc theo từ khóa tìm kiếm
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((it) => {
        const code = (it.code || '').toLowerCase();
        const custName = (it.customer?.name || '').toLowerCase();
        const custPhone = (it.customer?.phone || '').toLowerCase();
        const symptom = (it.symptom || '').toLowerCase();
        const addr = (it.pickupAddress || '').toLowerCase();
        return (
          code.includes(q) ||
          custName.includes(q) ||
          custPhone.includes(q) ||
          symptom.includes(q) ||
          addr.includes(q)
        );
      });
    }

    return result;
  }, [historyTasks, statusFilter, dateFilter, vehicleFilter, paymentFilter, searchQuery]);

  // Tổng doanh thu / phí thu của các đơn sau khi lọc (bỏ qua đơn đã huỷ)
  const totalFilteredRevenue = useMemo(() => {
    return filteredHistory.reduce((sum, item) => {
      if (item.status === 'CANCELLED' || item.status === 'DECLINED') return sum;
      return sum + (item.totalAmount || item.rescueFee || 0);
    }, 0);
  }, [filteredHistory]);

  const isFiltered =
    statusFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    vehicleFilter !== 'ALL' ||
    paymentFilter !== 'ALL' ||
    !!searchQuery.trim();

  const resetAllFilters = () => {
    setStatusFilter('ALL');
    setDateFilter('ALL');
    setVehicleFilter('ALL');
    setPaymentFilter('ALL');
    setSearchQuery('');
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nhiệm vụ Cứu hộ</Text>
        <Text style={styles.headerSub}>Theo dõi và xử lý các ca cứu hộ được phân công</Text>
      </View>

      {/* Tabs Chuyển đổi: Đang thực hiện & Lịch sử */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'ACTIVE' && styles.tabBtnTextActive]}>
            Đang thực hiện{activeTask ? ' (1)' : ' (0)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'HISTORY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('HISTORY')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'HISTORY' && styles.tabBtnTextActive]}>
            Lịch sử ({historyTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm & Bộ lọc nhanh cho tab Lịch sử */}
      {activeTab === 'HISTORY' && (
        <View style={styles.historyFilterWrapper}>
          <View style={styles.searchBarBox}>
            <Search size={15} color="#94a3b8" />
            <TextInput
              placeholder="Tìm mã đơn, tên khách, SĐT, sự cố..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.quickChipsBar}
          >
            {[
              {
                label: 'Tất cả',
                active: !isFiltered,
                onPress: resetAllFilters,
              },
              {
                label: 'Hoàn thành',
                active: statusFilter === 'DONE',
                onPress: () => setStatusFilter(statusFilter === 'DONE' ? 'ALL' : 'DONE'),
              },
              {
                label: 'Đã huỷ',
                active: statusFilter === 'CANCELLED',
                onPress: () => setStatusFilter(statusFilter === 'CANCELLED' ? 'ALL' : 'CANCELLED'),
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
                label: '🚗 Ô tô',
                active: vehicleFilter === 'CAR',
                onPress: () => setVehicleFilter(vehicleFilter === 'CAR' ? 'ALL' : 'CAR'),
              },
              {
                label: '🛵 Xe máy',
                active: vehicleFilter === 'MOTORBIKE',
                onPress: () => setVehicleFilter(vehicleFilter === 'MOTORBIKE' ? 'ALL' : 'MOTORBIKE'),
              },
              {
                label: '💵 Tiền mặt',
                active: paymentFilter === 'CASH',
                onPress: () => setPaymentFilter(paymentFilter === 'CASH' ? 'ALL' : 'CASH'),
              },
              {
                label: '💳 Chuyển khoản',
                active: paymentFilter === 'BANK_TRANSFER',
                onPress: () => setPaymentFilter(paymentFilter === 'BANK_TRANSFER' ? 'ALL' : 'BANK_TRANSFER'),
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

          {/* Banner thống kê năng suất */}
          <View style={styles.summaryBar}>
            <Text style={styles.summaryBarText}>
              Hiển thị <Text style={{ fontWeight: '800', color: '#0f172a' }}>{filteredHistory.length}</Text> ca cứu hộ
              {totalFilteredRevenue > 0 && (
                <> · Tổng thu: <Text style={{ fontWeight: '900', color: '#ea580c' }}>{formatMoney(totalFilteredRevenue)}</Text></>
              )}
            </Text>
            {isFiltered && (
              <TouchableOpacity onPress={resetAllFilters} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.resetFilterText}>Đặt lại</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Danh sách nhiệm vụ cuộn dọc */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
      >
        {/* ══════════════════════════════════════════════════════════════════
            1. TAB ĐANG THỰC HIỆN (ACTIVE TASK)
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ACTIVE' && (
          <>
            {activeLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#ea580c" size="large" />
                <Text style={styles.loadingText}>Đang tải nhiệm vụ…</Text>
              </View>
            ) : activeError ? (
              <View style={styles.errorCard}>
                <AlertCircle size={36} color="#ef4444" />
                <Text style={styles.errorText}>{activeError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => fetchActive(true)} activeOpacity={0.8}>
                  <RefreshCw size={14} color="#ffffff" strokeWidth={2.2} />
                  <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : activeTask ? (
              <View style={styles.activeTaskCard}>
                {/* Header: Mã đơn + Trạng thái Live */}
                <View style={styles.taskCardHeader}>
                  <View style={styles.codeBadge}>
                    <Truck size={14} color="#ea580c" strokeWidth={2.4} />
                    <Text style={styles.codeBadgeText}>#{activeTask.code}</Text>
                  </View>
                  <View style={styles.statusLiveBadge}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.statusLiveText}>{activeStatusLabel()}</Text>
                  </View>
                </View>

                {/* Tiêu đề phương tiện & sự cố trên 1 dòng gọn gàng */}
                <View style={styles.activeVehicleBox}>
                  <Text style={styles.activeVehicleTitle} numberOfLines={1}>
                    {activeTask.vehicleType === 'CAR'
                      ? '🚗 Cứu hộ Ô tô'
                      : activeTask.vehicleType === 'TRUCK'
                        ? '🚚 Cứu hộ Xe tải'
                        : '🏍️ Cứu hộ Xe máy'}
                    {activeTask.symptom ? ` - ${activeTask.symptom}` : ''}
                  </Text>
                </View>

                {/* Mini Stepper 4 bước quy trình cứu hộ */}
                <View style={styles.stepperContainer}>
                  {['Nhận việc', 'Đang tới', 'Báo giá', 'Sửa & Thu tiền'].map((stepLabel, idx) => {
                    const stepNum = idx + 1;
                    const curStep = getActiveStep(activeTask.status);
                    const isDone = curStep >= stepNum;
                    const isCurrent = curStep === stepNum;

                    return (
                      <React.Fragment key={idx}>
                        <View style={styles.stepperItem}>
                          <View
                            style={[
                              styles.stepperDot,
                              isDone && styles.stepperDotDone,
                              isCurrent && styles.stepperDotCurrent,
                            ]}
                          >
                            <Text
                              style={[
                                styles.stepperDotNum,
                                (isDone || isCurrent) && styles.stepperDotNumActive,
                              ]}
                            >
                              {isDone && !isCurrent ? '✓' : stepNum}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.stepperLabel,
                              (isDone || isCurrent) && styles.stepperLabelActive,
                            ]}
                            numberOfLines={1}
                          >
                            {stepLabel}
                          </Text>
                        </View>
                        {idx < 3 && (
                          <View
                            style={[
                              styles.stepperLine,
                              curStep > stepNum && styles.stepperLineDone,
                            ]}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>

                {/* Khách hàng & Bộ nút liên lạc (Gọi miễn phí VoIP + Nhắn tin) */}
                <View style={styles.customerRow}>
                  <View style={styles.customerAvatar}>
                    {resolveFileUrl(activeTask.customer?.avatarUrl) ? (
                      <Image
                        source={{ uri: resolveFileUrl(activeTask.customer?.avatarUrl) }}
                        style={styles.customerAvatarImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.customerAvatarText}>
                        {(activeTask.customer?.name || 'K')[0].toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {activeTask.customer?.name ?? 'Khách hàng'}
                    </Text>
                    <Text style={styles.vehicleInfo} numberOfLines={1}>
                      {vehicleTypeLabel(activeTask.vehicleType)}
                      {(activeTask.customerVehicle?.licensePlate || activeTask.licensePlate)
                        ? ` · 🚘 ${activeTask.customerVehicle?.licensePlate || activeTask.licensePlate}`
                        : ''}
                    </Text>
                  </View>

                  <View style={styles.customerActions}>
                    {canFreeCall(activeTask.status) && (
                      <TouchableOpacity
                        style={styles.freeCallBtn}
                        onPress={() => handleFreeCallCustomer(activeTask)}
                        activeOpacity={0.8}
                      >
                        <PhoneCall size={15} color="#16a34a" strokeWidth={2.4} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => handleOpenChat(activeTask)}
                      activeOpacity={0.8}
                    >
                      <MessageSquare size={15} color="#ea580c" strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Địa chỉ đón */}
                <View style={styles.addressBox}>
                  <MapPin size={15} color="#ea580c" style={{ marginTop: 2 }} strokeWidth={2.4} />
                  <Text style={styles.addressText}>{activeTask.pickupAddress ?? 'Chưa xác định địa chỉ'}</Text>
                </View>

                {/* Phí cứu hộ nếu có */}
                {!!activeTask.totalAmount && (
                  <View style={styles.feeRow}>
                    <Banknote size={15} color="#16a34a" strokeWidth={2.4} />
                    <Text style={styles.feeText}>
                      Phí cứu hộ: <Text style={styles.feeAmount}>{formatMoney(activeTask.totalAmount)}</Text>
                    </Text>
                    {!!getActivePaymentLabel(activeTask) && (
                      <View style={styles.feePaymentBadge}>
                        <Text style={styles.feePaymentText}>{getActivePaymentLabel(activeTask)}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Các nút hành động chính */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionNavBtn}
                    onPress={handleOpenMap}
                    activeOpacity={0.85}
                  >
                    <Navigation size={16} color="#ffffff" strokeWidth={2.4} />
                    <Text style={styles.actionNavText}>Bản đồ chỉ đường</Text>
                  </TouchableOpacity>

                  {(activeTask.status === 'ASSIGNED' || activeTask.status === 'EN_ROUTE') && (
                    <TouchableOpacity style={styles.actionArriveBtn} onPress={handleArrived} activeOpacity={0.85}>
                      <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.4} />
                      <Text style={styles.actionArriveText}>Đã tới nơi</Text>
                    </TouchableOpacity>
                  )}

                  {(activeTask.status === 'ARRIVED' || activeTask.status === 'DIAGNOSED') && (
                    <TouchableOpacity
                      style={styles.actionQuoteBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/garage-staff/create-quote',
                          params: { id: String(activeTask.id) },
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <Wrench size={16} color="#ffffff" strokeWidth={2.4} />
                      <Text style={styles.actionQuoteText}>Lập báo giá</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Nút Xem chi tiết đơn */}
                <TouchableOpacity
                  style={styles.viewDetailLink}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/garage-staff/order-detail',
                      params: { id: String(activeTask.id), from: 'tasks' },
                    })
                  }
                >
                  <Text style={styles.viewDetailLinkText}>Xem toàn bộ thông tin chi tiết</Text>
                  <ChevronRight size={14} color="#ea580c" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <CheckCircle2 size={36} color="#16a34a" strokeWidth={2.2} />
                </View>
                <Text style={styles.emptyTitle}>Bạn đang sẵn sàng nhận việc</Text>
                <Text style={styles.emptySub}>
                  Hiện tại chưa có ca cứu hộ mới nào được giao. Khi có khách hàng cần cứu hộ trong khu vực, thông báo và chuông sẽ reo ngay lập tức.
                </Text>
                <TouchableOpacity
                  style={styles.emptyMapBtn}
                  onPress={handleOpenMap}
                  activeOpacity={0.85}
                >
                  <Navigation size={14} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.emptyMapBtnText}>Mở bản đồ trực ca</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            2. TAB LỊCH SỬ (HISTORY TASKS)
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'HISTORY' && (
          <>
            {historyLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#ea580c" size="large" />
                <Text style={styles.loadingText}>Đang tải lịch sử nhiệm vụ…</Text>
              </View>
            ) : historyError ? (
              <View style={styles.errorCard}>
                <AlertCircle size={36} color="#ef4444" />
                <Text style={styles.errorText}>{historyError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHistory(true)} activeOpacity={0.8}>
                  <RefreshCw size={14} color="#ffffff" strokeWidth={2.2} />
                  <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : filteredHistory.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#f1f5f9' }]}>
                  <History size={36} color="#94a3b8" strokeWidth={2.2} />
                </View>
                <Text style={styles.emptyTitle}>
                  {isFiltered ? 'Không có ca cứu hộ phù hợp' : 'Chưa có lịch sử nhiệm vụ'}
                </Text>
                <Text style={styles.emptySub}>
                  {isFiltered
                    ? 'Thử thay đổi bộ lọc thời gian, loại xe hoặc từ khóa tìm kiếm.'
                    : 'Các ca cứu hộ bạn đã hoàn thành sẽ được lưu trữ và thống kê chi tiết tại đây.'}
                </Text>
                {isFiltered && (
                  <TouchableOpacity
                    style={styles.resetFilterActionBtn}
                    onPress={resetAllFilters}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={13} color="#ea580c" strokeWidth={2.4} />
                    <Text style={styles.resetFilterActionText}>Đặt lại bộ lọc</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {filteredHistory.map((item) => {
                  const isCancelled = item.status === 'CANCELLED' || item.status === 'DECLINED';
                  return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyCard}
                    onPress={() =>
                      router.push({
                        pathname: '/garage-staff/order-detail',
                        params: { id: String(item.id), from: 'tasks' },
                      })
                    }
                    activeOpacity={0.88}
                  >
                    {/* Hàng 1: Vehicle Pill + Mã đơn & Phí thu */}
                    <View style={styles.historyCardHeader}>
                      <View style={styles.historyVehiclePill}>
                        <Text style={styles.historyVehiclePillText}>
                          {item.vehicleType === 'CAR' || item.vehicleType === 'TRUCK'
                            ? '🚗 Ô tô'
                            : '🛵 Xe máy'}
                        </Text>
                        <Text style={styles.historyCodePill}>#{item.code}</Text>
                      </View>
                      <Text style={[styles.historyFeeText, isCancelled && { color: '#94a3b8' }]}>
                        {isCancelled ? '—' : (item.totalAmount ? `+${formatMoney(item.totalAmount)}` : '—')}
                      </Text>
                    </View>

                    {/* Hàng 2: Khách hàng & Thời gian */}
                    <View style={styles.historyCustomerRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyCustomerName} numberOfLines={1}>
                          {item.customer?.name ?? 'Khách hàng'}
                        </Text>
                        {!!item.customer?.phone && (
                          <Text style={styles.historyCustomerPhone}>{item.customer.phone}</Text>
                        )}
                      </View>
                      <View style={styles.historyTimeBadge}>
                        <Calendar size={11} color="#64748b" />
                        <Text style={styles.historyTimeText}>
                          {formatDateTime(item.completedAt ?? item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Hàng 3: Sự cố (nếu có) */}
                    {!!item.symptom && (
                      <View style={styles.historySymptomBox}>
                        <Wrench size={13} color="#ea580c" style={{ marginTop: 2 }} />
                        <Text style={styles.historySymptomText} numberOfLines={2}>
                          {item.symptom}
                        </Text>
                      </View>
                    )}

                    {/* Hàng 4: Địa chỉ */}
                    <View style={styles.historyAddrRow}>
                      <MapPin size={13} color="#64748b" style={{ marginTop: 2 }} />
                      <Text style={styles.historyAddrText} numberOfLines={1}>
                        {item.pickupAddress ?? '—'}
                      </Text>
                    </View>

                    {/* Hàng 5: Footer trạng thái + Hình thức TT + Chi tiết link */}
                    <View style={styles.historyCardFooter}>
                      <View style={styles.historyBadgesRow}>
                        {isCancelled ? (
                          <View style={styles.cancelledBadge}>
                            <AlertCircle size={12} color="#dc2626" strokeWidth={2.4} />
                            <Text style={styles.cancelledText}>Đã huỷ</Text>
                          </View>
                        ) : (
                          <View style={styles.completedBadge}>
                            <CheckCircle2 size={12} color="#16a34a" strokeWidth={2.4} />
                            <Text style={styles.completedText}>
                              {item.status === 'PAID' ? 'Đã thanh toán' : 'Hoàn thành'}
                            </Text>
                          </View>
                        )}
                        {!isCancelled && !!item.paymentMethod && (
                          <View style={styles.paymentMethodBadge}>
                            <CreditCard size={11} color="#64748b" />
                            <Text style={styles.paymentMethodText}>
                              {paymentLabel(item.paymentMethod)}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.detailLinkWrap}>
                        <Text style={styles.detailLinkText}>Xem chi tiết</Text>
                        <ChevronRight size={13} color="#ea580c" strokeWidth={2.4} />
                      </View>
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // ── Tabs Row ──
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },

  // ── Search bar ──
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
    paddingVertical: 2,
  },

  // ── History Filter ──
  historyFilterWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quickChipsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
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
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  summaryBarText: {
    fontSize: 11.5,
    color: '#64748b',
  },
  resetFilterText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ea580c',
  },

  scrollContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 36,
  },

  // ── Loading & Error ──
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },

  // ── Active task card ──
  activeTaskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  statusLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  statusLiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },

  activeVehicleBox: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeVehicleTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },

  // ── Stepper ──
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  stepperItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepperDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDotDone: {
    backgroundColor: '#16a34a',
  },
  stepperDotCurrent: {
    backgroundColor: '#ea580c',
  },
  stepperDotNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  stepperDotNumActive: {
    color: '#ffffff',
  },
  stepperLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  stepperLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  stepperLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
    marginBottom: 14,
  },
  stepperLineDone: {
    backgroundColor: '#16a34a',
  },

  // ── Customer Row ──
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  customerAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  customerAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ea580c',
  },
  customerName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  customerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  freeCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Address & Fee ──
  addressBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 12.5,
    color: '#1e293b',
    fontWeight: '600',
    lineHeight: 18,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  feeText: {
    flex: 1,
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
  },
  feeAmount: {
    fontWeight: '900',
    color: '#15803d',
  },
  feePaymentBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  feePaymentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },

  // ── Actions ──
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  actionNavBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionNavText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  actionArriveBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionArriveText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  actionQuoteBtn: {
    flex: 1,
    backgroundColor: '#ea580c',
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionQuoteText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  viewDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 4,
  },
  viewDetailLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },

  // ── Empty Card ──
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  emptyMapBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  resetFilterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 6,
  },
  resetFilterActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },

  // ── History Card ──
  historyCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyVehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyVehiclePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyCodePill: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94a3b8',
  },
  historyFeeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16a34a',
  },
  historyCustomerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  historyCustomerName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyCustomerPhone: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  historyTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyTimeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  historySymptomBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#fff7ed',
    padding: 8,
    borderRadius: 8,
  },
  historySymptomText: {
    flex: 1,
    fontSize: 12,
    color: '#9a3412',
    lineHeight: 16,
    fontWeight: '500',
  },
  historyAddrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  historyAddrText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 2,
  },
  historyBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16a34a',
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cancelledText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentMethodText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
  detailLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
});

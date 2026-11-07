import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Linking,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  CreditCard,
  Search,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  X,
  CheckCircle2,
  Clock,
  Wrench,
  TrendingUp,
  BarChart3,
  User,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Banknote,
  ChevronRight,
} from 'lucide-react-native';
import axiosClient from '../../api/axiosClient';
import { garageWalletApi, PayOSTopupResponse } from '../../api/garageWalletApi';
import { resolveUserAvatar } from '../../utils/avatar';
import WithdrawDestinationSheet, { type WithdrawDestination } from '../../components/withdraw/WithdrawDestinationSheet';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G, Text as SvgText, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');

// typed routes chưa sinh lại cho các màn rút tiền
const WITHDRAW_ROUTES: Record<WithdrawDestination, Href> = {
  bank: { pathname: '/garage-owner/withdraw', params: { target: 'bank' } } as unknown as Href,
  'bank-setup': { pathname: '/garage-owner/bank-account', params: { next: 'withdraw' } } as unknown as Href,
  credit: { pathname: '/garage-owner/withdraw', params: { target: 'credit' } } as unknown as Href,
  history: '/garage-owner/withdrawals' as unknown as Href,
};

const formatVnd = (val: number) => {
  return (val || 0).toLocaleString('vi-VN') + 'đ';
};

const formatCompactVnd = (val: number) => {
  if (val >= 1000000) {
    const m = (val / 1000000).toFixed(1).replace('.0', '');
    return `${m}M`;
  }
  if (val >= 1000) {
    return `${Math.round(val / 1000)}k`;
  }
  return `${val}đ`;
};

type TimeFilterType = 'DAY' | 'MONTH' | 'YEAR';
type HistoryFilterType = 'TODAY' | 'MONTH' | 'YEAR' | 'ALL';

interface DailyChartPoint {
  dayLabel: string;
  amount: number;
  isToday?: boolean;
}

interface GarageTxn {
  id: number;
  orderCode: string;
  technicianName: string;
  technicianAvatar?: string;
  executedAtText: string;
  amount: number;
  status: string;
  serviceTitle?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | string;
  totalOrderAmount?: number;
  commissionAmount?: number;
  commissionRate?: number;
  txnType?: 'INCOME' | 'DEDUCTION' | 'TOPUP' | string;
  walletType?: 'CASH' | 'CREDIT' | string;
  description?: string;
  createdAt?: string;
}

interface GarageWalletData {
  cashBalance: number;
  creditBalance: number;
  todayIncome: number;
  todayOrdersCount: number;
  pendingOrdersCount: number;
  sevenDaysTotal: number;
  sevenDaysChart: DailyChartPoint[];
  monthlyChart: DailyChartPoint[];
  yearlyChart: DailyChartPoint[];
  transactions: GarageTxn[];
}

export default function GarageOwnerWalletScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('DAY');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilterType>('TODAY');

  const router = useRouter();

  // Sheet "Rút tiền": chọn nơi nhận (ngân hàng / ví tín dụng)
  const [withdrawSheetVisible, setWithdrawSheetVisible] = useState(false);

  // Modal nạp tiền vào ví tín dụng
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState('200.000');
  const [creatingTopup, setCreatingTopup] = useState(false);
  const [topupMethod, setTopupMethod] = useState<'PAYOS' | 'CASH_WALLET'>('PAYOS');
  const [transferringCash, setTransferringCash] = useState(false);

  // Modal hiển thị VietQR PayOS & Auto-polling
  const [payOSModalVisible, setPayOSModalVisible] = useState(false);
  const [payOSData, setPayOSData] = useState<PayOSTopupResponse | null>(null);
  const [checkingPayOS, setCheckingPayOS] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal xem chi tiết biến động số dư giao dịch
  const [selectedTxn, setSelectedTxn] = useState<GarageTxn | null>(null);

  // Theo dõi trạng thái bàn phím để nhấn backdrop tắt bàn phím hoặc đóng modal
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleBackdropPressTopup = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      setTopupModalVisible(false);
    }
  };

  const [data, setData] = useState<GarageWalletData>({
    cashBalance: 0,
    creditBalance: 0,
    todayIncome: 0,
    todayOrdersCount: 0,
    pendingOrdersCount: 0,
    sevenDaysTotal: 0,
    sevenDaysChart: [],
    monthlyChart: [],
    yearlyChart: [],
    transactions: [],
  });

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch { }
  };

  const fetchWalletOverview = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/garages/me/wallet/overview');
      if (res?.data) {
        setData({
          cashBalance: res.data.cashBalance ?? 0,
          creditBalance: res.data.creditBalance ?? 0,
          todayIncome: res.data.todayIncome ?? 0,
          todayOrdersCount: res.data.todayOrdersCount ?? 0,
          pendingOrdersCount: res.data.pendingOrdersCount ?? 0,
          sevenDaysTotal: res.data.sevenDaysTotal ?? 0,
          sevenDaysChart: Array.isArray(res.data.sevenDaysChart) ? res.data.sevenDaysChart : [],
          monthlyChart: Array.isArray(res.data.monthlyChart) ? res.data.monthlyChart : [],
          yearlyChart: Array.isArray(res.data.yearlyChart) ? res.data.yearlyChart : [],
          transactions: Array.isArray(res.data.transactions) ? res.data.transactions : [],
        });
      }
    } catch (e: any) {
      console.log('Error fetching garage wallet overview:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tải lại mỗi lần quay về tab (vd. sau luồng rút tiền) để số dư luôn mới.
  useFocusEffect(
    useCallback(() => {
      fetchWalletOverview();
    }, [fetchWalletOverview])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletOverview();
  };

  const handleWithdrawDestination = (dest: WithdrawDestination) => {
    setWithdrawSheetVisible(false);
    router.push(WITHDRAW_ROUTES[dest]);
  };

  // Tạo liên kết nạp tiền PayOS
  const handleCreateTopup = async () => {
    const amt = parseInt(topupAmount.replace(/\D/g, ''), 10);
    if (!amt || amt < 10000) {
      Alert.alert('Số tiền không hợp lệ', 'Số tiền nạp tối thiểu là 10.000đ.');
      return;
    }

    setCreatingTopup(true);
    try {
      const res = await garageWalletApi.createTopup(amt);
      setPayOSData(res);
      setTopupModalVisible(false);
      setPayOSModalVisible(true);
    } catch (e: any) {
      Alert.alert('Lỗi tạo giao dịch', e?.response?.data?.message || e?.message || 'Không thể kết nối cổng PayOS');
    } finally {
      setCreatingTopup(false);
    }
  };


  // Nạp tiền vào ví tín dụng bằng số dư ví tiền mặt
  const handleTransferCashToCredit = async () => {
    const amt = parseInt(topupAmount.replace(/\D/g, ''), 10);
    if (!amt || amt < 10000) {
      Alert.alert('Số tiền không hợp lệ', 'Số tiền nạp tối thiểu là 10.000đ.');
      return;
    }

    if (data.cashBalance < amt) {
      Alert.alert(
        'Số dư không đủ',
        `Số dư ví tiền mặt hiện tại (${formatVnd(data.cashBalance)}) không đủ để nạp ${formatVnd(amt)} vào ví tín dụng.`
      );
      return;
    }

    setTransferringCash(true);
    try {
      const overview = await garageWalletApi.transferToCredit(amt);
      setData(overview);
      setTopupModalVisible(false);
      Alert.alert(
        'Nạp tiền thành công! 🎉',
        `Đã chuyển thành công ${formatVnd(amt)} từ Ví tiền mặt sang Ví tín dụng.\n\n` +
        `• Số dư ví tiền mặt: ${formatVnd(overview.cashBalance)}\n` +
        `• Số dư ví tín dụng: ${formatVnd(overview.creditBalance)}`
      );
    } catch (e: any) {
      Alert.alert(
        'Lỗi chuyển tiền',
        e?.response?.data?.message || e?.message || 'Không thể chuyển tiền từ ví tiền mặt sang ví tín dụng'
      );
    } finally {
      setTransferringCash(false);
    }
  };

  // Kiểm tra thủ công trạng thái PayOS
  const handleManualCheckPayOS = async () => {
    if (!payOSData?.orderCode) return;
    setCheckingPayOS(true);
    try {
      const overview = await garageWalletApi.checkTopupStatus(payOSData.orderCode);
      const isPaid = overview.creditBalance > data.creditBalance;
      if (isPaid) {
        setData(overview);
        setPayOSModalVisible(false);
        setPayOSData(null);
        Alert.alert(
          'Nạp tiền thành công! 🎉',
          `Hệ thống đã ghi nhận nạp ${formatVnd(payOSData.amount)} vào ví tín dụng Gara.\nSố dư ví mới: ${formatVnd(overview.creditBalance)}.`
        );
      } else {
        Alert.alert('Chưa nhận được thanh toán', 'Hệ thống chưa ghi nhận tiền về. Nếu bạn đã chuyển khoản, vui lòng đợi 3-5 giây rồi thử lại.');
      }
    } catch (e: any) {
      Alert.alert('Thông báo', 'Đang cập nhật trạng thái từ PayOS...');
    } finally {
      setCheckingPayOS(false);
    }
  };

  // Tự động kiểm tra trạng thái thanh toán PayOS định kỳ mỗi 2.5 giây
  useEffect(() => {
    if (!payOSModalVisible || !payOSData?.orderCode) return;
    let isDone = false;
    const timer = setInterval(async () => {
      try {
        const overview = await garageWalletApi.checkTopupStatus(payOSData.orderCode);
        if (overview.creditBalance > data.creditBalance) {
          if (isDone) return;
          isDone = true;
          clearInterval(timer);
          setData(overview);
          setPayOSModalVisible(false);
          setPayOSData(null);
          Alert.alert(
            'Nạp tiền thành công! 🎉',
            `Bạn đã nạp thành công ${formatVnd(payOSData.amount)} vào ví tín dụng Gara.\nSố dư ví tín dụng mới: ${formatVnd(overview.creditBalance)}.`
          );
        }
      } catch (err) {
        console.log('Auto polling garage topup:', err);
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [payOSModalVisible, payOSData, data.creditBalance]);

  // Xác định chart points theo bộ lọc
  const activeChartPoints: DailyChartPoint[] =
    timeFilter === 'DAY'
      ? data.sevenDaysChart
      : timeFilter === 'MONTH'
        ? data.monthlyChart
        : data.yearlyChart;

  const activeChartTotal = activeChartPoints.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const maxActiveChartAmount = Math.max(...activeChartPoints.map(p => p.amount), 1);

  // 1. Sắp xếp lịch sử nhận tiền theo thời gian mới nhất trước
  const sortedTxns = [...data.transactions].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    return (b.id || 0) - (a.id || 0);
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  // 2. Lọc danh sách giao dịch theo từ khóa và Ngày / Tháng / Năm (Mặc định lọc Hôm nay)
  const filteredTxns = sortedTxns.filter(t => {
    // Bỏ qua giao dịch trừ tiền của ví tổng hệ thống (Gara chỉ nhận tiền bồi hoàn dương vào ví tiền mặt)
    if ((t as any).walletType === 'SYSTEM' || (t.txnType === 'COMPENSATION' && t.amount <= 0)) {
      return false;
    }

    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      const match =
        t.orderCode.toLowerCase().includes(s) ||
        t.technicianName.toLowerCase().includes(s) ||
        (t.serviceTitle && t.serviceTitle.toLowerCase().includes(s));
      if (!match) return false;
    }

    if (historyFilter === 'ALL') return true;

    if (t.createdAt) {
      const d = new Date(t.createdAt);
      if (historyFilter === 'TODAY') {
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth &&
          d.getDate() === currentDate
        );
      }
      if (historyFilter === 'MONTH') {
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth
        );
      }
      if (historyFilter === 'YEAR') {
        return d.getFullYear() === currentYear;
      }
    } else {
      // Fallback với chuỗi executedAtText
      if (historyFilter === 'TODAY') {
        return (t.executedAtText || '').includes('Hôm nay');
      }
    }

    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topHeaderTitle}>Ví tiền & Doanh thu Gara</Text>
          <Text style={styles.topHeaderSub}>Quản lý số dư ví và biến động doanh thu</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <RefreshCw size={14} color="#ea580c" strokeWidth={2.4} />
          <Text style={styles.refreshBtnText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
      >
        {/* ── 1. THẺ SỐ DƯ VÍ TIỀN MẶT (ĐƯA LÊN TRÊN, CÓ THỂ RÚT VỀ NGÂN HÀNG) ── */}
        <View style={styles.cashWalletCardPrimary}>
          <View style={styles.walletCardTop}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={styles.walletBadgeRow}>
                <View style={styles.cashBadgePrimary}>
                  <Banknote size={12} color="#ffffff" strokeWidth={2.6} />
                  <Text style={styles.cashBadgePrimaryText}>VÍ TIỀN MẶT</Text>
                </View>
              </View>
              <Text style={styles.walletCardBalance}>
                {formatVnd(data.cashBalance)}
              </Text>
              <Text style={styles.walletCardSubNote}>
                Nhận tiền từ các đơn thanh toán qua hệ thống (có thể rút về ngân hàng)
              </Text>
            </View>

            <View style={styles.walletIconWrap}>
              <Banknote size={24} color="#ffffff" strokeWidth={2.4} />
            </View>
          </View>

          {/* Nút rút tiền: chọn về ngân hàng hoặc sang ví tín dụng */}
          <TouchableOpacity
            style={styles.withdrawBtnWhite}
            activeOpacity={0.88}
            onPress={() => setWithdrawSheetVisible(true)}
          >
            <ArrowDownLeft size={18} color="#ea580c" strokeWidth={2.6} />
            <Text style={styles.withdrawBtnWhiteText}>Rút tiền</Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. THẺ SỐ DƯ VÍ TÍN DỤNG (CHUYỂN XUỐNG DƯỚI) ── */}
        <View style={styles.creditWalletCardSecondary}>
          <View style={styles.walletCardTop}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={styles.walletBadgeRow}>
                <View style={styles.creditBadgeSecondary}>
                  <ShieldCheck size={12} color="#ea580c" strokeWidth={2.6} />
                  <Text style={styles.creditBadgeSecondaryText}>VÍ TÍN DỤNG</Text>
                </View>
              </View>
              <Text style={styles.creditBalanceSecondaryAmount}>
                {formatVnd(data.creditBalance)}
              </Text>
              <Text style={styles.creditCardSecondarySubNote}>
                Dùng để trừ chiết khấu hoa hồng các đơn cứu hộ
              </Text>
            </View>

            <View style={styles.creditIconWrapSecondary}>
              <CreditCard size={22} color="#ea580c" strokeWidth={2.4} />
            </View>
          </View>

          {/* Nút nạp tiền PayOS */}
          <TouchableOpacity
            style={styles.topupBtnSecondary}
            activeOpacity={0.88}
            onPress={() => setTopupModalVisible(true)}
          >
            <ArrowUpRight size={18} color="#ffffff" strokeWidth={2.6} />
            <Text style={styles.topupBtnSecondaryText}>Nạp tiền vào ví tín dụng</Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. DOANH THU HÔM NAY VÀ SỐ ĐƠN (PHÍA DƯỚI VÍ) ── */}
        <View style={styles.quickStatsRow}>
          {/* Card Doanh thu hôm nay */}
          <View style={styles.statMiniCard}>
            <View style={styles.statMiniTop}>
              <Text style={styles.statMiniLabel}>DOANH THU HÔM NAY</Text>
              <TrendingUp size={16} color="#16a34a" />
            </View>
            <Text style={styles.statMiniValueBlack}>
              {formatVnd(data.todayIncome)}
            </Text>
            <Text style={styles.statMiniSub}>Thu thực nhận trong ngày</Text>
          </View>

          {/* Card Số đơn hôm nay */}
          <View style={styles.statMiniCard}>
            <View style={styles.statMiniTop}>
              <Text style={styles.statMiniLabel}>SỐ ĐƠN CỨU HỘ</Text>
              <CheckCircle2 size={16} color="#ea580c" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.statMiniValueOrange}>
                {data.todayOrdersCount ?? 0}
              </Text>
              <Text style={styles.statUnitText}>đơn hôm nay</Text>
            </View>
            <Text style={styles.statMiniSub}>
              Đang chờ xử lý: <Text style={{ color: '#ea580c', fontWeight: '800' }}>{data.pendingOrdersCount ?? 0}</Text>
            </Text>
          </View>
        </View>

        {/* ── 3. BIỂU ĐỒ DOANH THU CÓ BỘ LỌC NGÀY / THÁNG / NĂM ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <View>
              <Text style={styles.chartCardTitle}>Biểu đồ doanh thu</Text>
              <Text style={styles.chartCardSub}>
                Tổng:{' '}
                <Text style={{ fontWeight: '900', color: '#ea580c' }}>
                  {formatVnd(activeChartTotal)}
                </Text>
              </Text>
            </View>

            {/* Filter Tabs: Ngày - Tháng - Năm */}
            <View style={styles.filterTabsWrap}>
              {(['DAY', 'MONTH', 'YEAR'] as TimeFilterType[]).map(tab => {
                const label = tab === 'DAY' ? 'Ngày' : tab === 'MONTH' ? 'Tháng' : 'Năm';
                const isActive = timeFilter === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.filterTabBtn, isActive && styles.filterTabBtnActive]}
                    onPress={() => setTimeFilter(tab)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Biểu đồ doanh thu dạng LINE (Đường cong mượt + Gradient + Điểm nút) */}
          {activeChartPoints.length === 0 ? (
            <View style={styles.chartEmptyWrap}>
              <Text style={styles.chartEmptyText}>Chưa có dữ liệu doanh thu</Text>
            </View>
          ) : (
            (() => {
              const chartWidth = Math.max(300, width - 64);
              const chartHeight = 175;
              const padX = 22;
              const padTop = 32;
              const padBottom = 26;
              const n = activeChartPoints.length;

              const points = activeChartPoints.map((item, i) => {
                const x = n === 1 ? chartWidth / 2 : padX + (i / (n - 1)) * (chartWidth - padX * 2);
                const ratio = maxActiveChartAmount > 0 ? (item.amount || 0) / maxActiveChartAmount : 0;
                const y = padTop + (1 - ratio) * (chartHeight - padTop - padBottom);
                return { x, y, item };
              });

              let pathD = `M ${points[0].x} ${points[0].y}`;
              if (points.length === 1) {
                pathD += ` L ${points[0].x + 1} ${points[0].y}`;
              } else {
                for (let i = 0; i < points.length - 1; i++) {
                  const p0 = points[i];
                  const p1 = points[i + 1];
                  const cx1 = p0.x + (p1.x - p0.x) / 2;
                  const cy1 = p0.y;
                  const cx2 = p0.x + (p1.x - p0.x) / 2;
                  const cy2 = p1.y;
                  pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
                }
              }

              const bottomY = chartHeight - padBottom;
              const areaD = `${pathD} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;

              return (
                <View style={styles.lineChartWrap}>
                  <Svg width={chartWidth} height={chartHeight}>
                    <Defs>
                      <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#ea580c" stopOpacity="0.32" />
                        <Stop offset="70%" stopColor="#ea580c" stopOpacity="0.08" />
                        <Stop offset="100%" stopColor="#ea580c" stopOpacity="0.00" />
                      </LinearGradient>
                    </Defs>

                    {/* Lưới ngang mờ */}
                    <Line x1={padX} y1={padTop} x2={chartWidth - padX} y2={padTop} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="4, 4" />
                    <Line x1={padX} y1={(padTop + bottomY) / 2} x2={chartWidth - padX} y2={(padTop + bottomY) / 2} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="4, 4" />
                    <Line x1={padX} y1={bottomY} x2={chartWidth - padX} y2={bottomY} stroke="#e2e8f0" strokeWidth={1} />

                    {/* Vùng Gradient dưới đường */}
                    <Path d={areaD} fill="url(#chartGradient)" />

                    {/* Đường Line chính */}
                    <Path d={pathD} fill="none" stroke="#ea580c" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

                    {/* Các điểm Dots và Text */}
                    {points.map((p, idx) => {
                      const isToday = p.item.isToday;
                      return (
                        <G key={idx}>
                          {isToday && (
                            <Circle cx={p.x} cy={p.y} r={10} fill="#fed7aa" opacity={0.65} />
                          )}
                          <Circle
                            cx={p.x}
                            cy={p.y}
                            r={isToday ? 5.5 : 4}
                            fill={isToday ? '#ea580c' : '#ffffff'}
                            stroke="#ea580c"
                            strokeWidth={2.4}
                          />
                          <SvgText
                            x={p.x}
                            y={Math.max(12, p.y - 8)}
                            fontSize="10"
                            fontWeight="bold"
                            fill={isToday ? '#ea580c' : '#64748b'}
                            textAnchor="middle"
                          >
                            {formatCompactVnd(p.item.amount)}
                          </SvgText>
                          <SvgText
                            x={p.x}
                            y={chartHeight - 8}
                            fontSize="11"
                            fontWeight={isToday ? 'bold' : '600'}
                            fill={isToday ? '#ea580c' : '#94a3b8'}
                            textAnchor="middle"
                          >
                            {p.item.dayLabel}
                          </SvgText>
                        </G>
                      );
                    })}
                  </Svg>
                </View>
              );
            })()
          )}
        </View>

        {/* ── 4. LỊCH SỬ GIAO DỊCH DẠNG CARD HIỆN ĐẠI ── */}
        <View style={styles.historySection}>
          <View style={styles.historyHeaderRow}>
            <View>
              <Text style={styles.historySectionTitle}>Lịch sử nhận tiền đơn hàng</Text>
              <Text style={styles.historySectionSub}>
                {filteredTxns.length} giao dịch được ghi nhận {historyFilter === 'TODAY' ? '(Hôm nay)' : historyFilter === 'MONTH' ? '(Tháng này)' : historyFilter === 'YEAR' ? '(Năm này)' : '(Tất cả)'}
              </Text>
            </View>
          </View>

          {/* Bộ lọc Ngày / Tháng / Năm cho lịch sử nhận tiền (Mặc định lọc Hôm nay) */}
          <View style={styles.historyFilterTabsWrap}>
            {(
              [
                { key: 'TODAY', label: 'Hôm nay' },
                { key: 'MONTH', label: 'Tháng này' },
                { key: 'YEAR', label: 'Năm này' },
                { key: 'ALL', label: 'Tất cả' },
              ] as { key: HistoryFilterType; label: string }[]
            ).map((item) => {
              const isActive = historyFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setHistoryFilter(item.key)}
                  style={[
                    styles.historyFilterTabBtn,
                    isActive && styles.historyFilterTabBtnActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.historyFilterTabText,
                      isActive && styles.historyFilterTabTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Thanh tìm kiếm */}
          <View style={styles.searchBarWrap}>
            <Search size={16} color="#94a3b8" />
            <TextInput
              placeholder="Tìm theo mã đơn, nhân viên hoặc dịch vụ..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />
            {!!searchText && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Danh sách giao dịch dạng Card */}
          {filteredTxns.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>
                Không tìm thấy giao dịch nào phù hợp
              </Text>
            </View>
          ) : (
            <View style={styles.txnsList}>
              {filteredTxns.map((t, idx) => {
                const isCompensation = t.txnType === 'COMPENSATION';
                const isTopup = t.txnType === 'TOPUP';
                const isWithdrawal = t.txnType === 'WITHDRAWAL';
                const isRefund = t.txnType === 'WITHDRAWAL_REFUND';
                const isNegative = t.amount < 0 || t.txnType === 'DEDUCTION';
                // Rút tiền cũng âm nhưng không phải trừ hoa hồng ví tín dụng.
                const isDeduction = !isWithdrawal && !isRefund && isNegative;
                const withdrawalState = !isWithdrawal
                  ? null
                  : t.status === 'TRANSFERRED'
                    ? { label: 'Đã chuyển', color: '#15803d', bg: '#dcfce7' }
                    : t.status === 'FAILED' || t.status === 'REJECTED'
                      ? { label: 'Thất bại', color: '#b91c1c', bg: '#fee2e2' }
                      : { label: 'Đang xử lý', color: '#92400e', bg: '#fffbeb' };
                const formattedAmount = isNegative
                  ? `-${formatVnd(Math.abs(t.amount))}`
                  : `+${formatVnd(t.amount)}`;
                const amountColor = isNegative ? '#dc2626' : '#16a34a';

                return (
                  <TouchableOpacity
                    key={t.id || idx}
                    style={styles.txnCard}
                    activeOpacity={0.72}
                    onPress={() => setSelectedTxn(t)}
                  >
                    {/* Hàng 1: Mã đơn (trái) <────────────────> Số tiền biến động ví (phải) */}
                    <View style={styles.txnCardTopRow}>
                      <View style={styles.orderCodeTag}>
                        <Text style={styles.orderCodeTagText}>
                          {t.orderCode.startsWith('#') ? t.orderCode : '#' + t.orderCode}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.orderAmountEarned, { color: amountColor }]}>
                          {formattedAmount}
                        </Text>
                        <ChevronRight size={14} color="#94a3b8" />
                      </View>
                    </View>

                    {/* Hàng 2: Tên dịch vụ & Badge loại ví */}
                    <View style={styles.serviceRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
                        {isWithdrawal ? (
                          <ArrowDownLeft size={15} color="#dc2626" />
                        ) : isRefund ? (
                          <RefreshCw size={15} color="#16a34a" />
                        ) : isCompensation ? (
                          <Banknote size={15} color="#16a34a" />
                        ) : isTopup ? (
                          <ArrowUpRight size={15} color="#16a34a" />
                        ) : isDeduction ? (
                          <ShieldCheck size={15} color="#dc2626" />
                        ) : (
                          <Banknote size={15} color="#16a34a" />
                        )}
                        <Text style={styles.serviceRowTitle} numberOfLines={1}>
                          {isCompensation
                            ? 'Bồi hoàn xăng xe'
                            : (t.serviceTitle || (
                              isWithdrawal ? 'Rút tiền về ngân hàng' :
                              isRefund ? 'Hoàn tiền rút thất bại' :
                              isTopup ? 'Nạp tiền ví tín dụng Gara' :
                              isDeduction ? 'Chiết khấu hoa hồng hệ thống' :
                              'Sửa chữa cứu hộ phương tiện'
                            ))}
                        </Text>
                      </View>

                      {withdrawalState ? (
                        <View style={[styles.successBadge, { backgroundColor: withdrawalState.bg }]}>
                          <Text style={[styles.successBadgeText, { color: withdrawalState.color }]}>
                            {withdrawalState.label}
                          </Text>
                        </View>
                      ) : isRefund ? (
                        <View style={[styles.successBadge, { backgroundColor: '#dcfce7' }]}>
                          <Text style={[styles.successBadgeText, { color: '#15803d' }]}>Hoàn tiền</Text>
                        </View>
                      ) : isCompensation ? (
                        <View style={[styles.successBadge, { backgroundColor: '#dcfce7' }]}>
                          <CheckCircle2 size={12} color="#16a34a" />
                          <Text style={[styles.successBadgeText, { color: '#15803d' }]}>⛽ Bồi hoàn xăng xe</Text>
                        </View>
                      ) : isTopup ? (
                        <View style={[styles.successBadge, { backgroundColor: '#dcfce7' }]}>
                          <CheckCircle2 size={12} color="#16a34a" />
                          <Text style={[styles.successBadgeText, { color: '#15803d' }]}>⚡ Nạp ví tín dụng</Text>
                        </View>
                      ) : isDeduction ? (
                        <View style={[styles.successBadge, { backgroundColor: '#fee2e2' }]}>
                          <Text style={[styles.successBadgeText, { color: '#dc2626' }]}>🛡️ Trừ ví tín dụng</Text>
                        </View>
                      ) : (
                        <View style={[styles.successBadge, { backgroundColor: '#ecfdf5' }]}>
                          <CheckCircle2 size={12} color="#16a34a" />
                          <Text style={[styles.successBadgeText, { color: '#059669' }]}>💵 Vào ví tiền mặt</Text>
                        </View>
                      )}
                    </View>

                    {/* Dòng ghi chú đối soát ví tiền mặt / ví tín dụng */}
                    <View style={styles.calculationNoteWrap}>
                      <Text style={styles.calculationNoteText} numberOfLines={2}>
                        {t.description || (isWithdrawal
                          ? 'Chuyển về tài khoản ngân hàng đã liên kết'
                          : isRefund
                          ? 'Hoàn lại số tiền đã tạm giữ vào ví tiền mặt'
                          : isCompensation
                          ? 'Bồi hoàn 30% chi phí xăng xe vào Ví tiền mặt Gara'
                          : isTopup
                          ? 'Nạp tiền vào ví tín dụng Gara thành công qua cổng PayOS'
                          : isDeduction
                          ? `Trừ ${t.commissionRate ?? 15}% hoa hồng hệ thống từ ví tín dụng`
                          : `Tổng đơn: ${formatVnd(t.totalOrderAmount || t.amount)} · Đã cộng vào ví tiền mặt`)}
                      </Text>
                    </View>

                    {/* Hàng 3: Kỹ thuật viên & Thời gian */}
                    <View style={styles.txnCardBottomRow}>
                      <View style={styles.techInfoWrap}>
                        {t.technicianAvatar ? (
                          <Image
                            source={{
                              uri: resolveUserAvatar(t.technicianAvatar, t.technicianName),
                            }}
                            style={styles.techAvatarImg}
                          />
                        ) : (
                          <View style={styles.techAvatarPlaceholder}>
                            {isTopup ? (
                              <User size={13} color="#16a34a" />
                            ) : (
                              <User size={13} color="#ea580c" />
                            )}
                          </View>
                        )}
                        <Text style={styles.techFullName} numberOfLines={1}>
                          {isTopup || isWithdrawal || isRefund ? 'Chủ Gara (Bạn)' : t.technicianName}
                        </Text>
                      </View>

                      <View style={styles.timeWrap}>
                        <Clock size={12} color="#64748b" />
                        <Text style={styles.timeText}>{t.executedAtText}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <WithdrawDestinationSheet
        visible={withdrawSheetVisible}
        onClose={() => setWithdrawSheetVisible(false)}
        onSelect={handleWithdrawDestination}
      />

      {/* ── MODAL NẠP TIỀN VÀO VÍ TÍN DỤNG ── */}
      <Modal
        visible={topupModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setTopupModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={handleBackdropPressTopup} accessible={false}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View style={styles.withdrawModalBox}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Pressable onPress={Keyboard.dismiss}>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.modalIconWrap}>
                      <ArrowUpRight size={18} color="#ea580c" strokeWidth={2.6} />
                    </View>
                    <Text style={styles.modalTitle}>Nạp tiền vào ví tín dụng</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setTopupModalVisible(false);
                    }}
                  >
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Chọn phương thức nạp tiền */}
                <Text style={styles.inputLabel}>PHƯƠNG THỨC NẠP TIỀN</Text>
                <View style={styles.methodSelectorRow}>
                  {/* Phương thức 1: VietQR PayOS */}
                  <TouchableOpacity
                    style={[
                      styles.methodCard,
                      topupMethod === 'PAYOS' && styles.methodCardActive,
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setTopupMethod('PAYOS');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodRadio, topupMethod === 'PAYOS' && styles.methodRadioActive]}>
                      {topupMethod === 'PAYOS' && <View style={styles.methodRadioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.methodTitle, topupMethod === 'PAYOS' && styles.methodTitleActive]}>
                        🏦 VietQR
                      </Text>
                      <Text style={styles.methodDesc}>Quét mã ngân hàng</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Phương thức 2: Ví tiền mặt */}
                  <TouchableOpacity
                    style={[
                      styles.methodCard,
                      topupMethod === 'CASH_WALLET' && styles.methodCardActive,
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setTopupMethod('CASH_WALLET');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodRadio, topupMethod === 'CASH_WALLET' && styles.methodRadioActive]}>
                      {topupMethod === 'CASH_WALLET' && <View style={styles.methodRadioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.methodTitle, topupMethod === 'CASH_WALLET' && styles.methodTitleActive]}>
                        💵 Ví tiền mặt
                      </Text>
                      <Text style={styles.methodDesc} numberOfLines={1}>
                        Dư: {formatCompactVnd(data.cashBalance)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Thông tin giải thích tùy theo phương thức */}
                {topupMethod === 'CASH_WALLET' ? (
                  (() => {
                    const amt = parseInt(topupAmount.replace(/\D/g, ''), 10) || 0;
                    const isInsufficient = data.cashBalance < amt;
                    return isInsufficient ? (
                      <View style={[styles.topupInfoNote, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                        <AlertCircle size={16} color="#dc2626" />
                        <Text style={[styles.topupInfoNoteText, { color: '#991b1b' }]}>
                          Số dư ví tiền mặt ({formatVnd(data.cashBalance)}) không đủ để nạp {formatVnd(amt)}. Vui lòng giảm số tiền hoặc nạp qua VietQR PayOS.
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.topupInfoNote, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                        <CheckCircle2 size={16} color="#16a34a" />
                        <Text style={[styles.topupInfoNoteText, { color: '#166534' }]}>
                          Tiền sẽ được trừ trực tiếp từ Ví tiền mặt (hiện có: {formatVnd(data.cashBalance)}) và cộng ngay vào Ví tín dụng.
                        </Text>
                      </View>
                    );
                  })()
                ) : (
                  <View style={styles.topupInfoNote}>
                    <ShieldCheck size={16} color="#ea580c" />
                    <Text style={styles.topupInfoNoteText}>
                      Số tiền nạp sẽ được cộng trực tiếp vào ví tín dụng để trừ chiết khấu hoa hồng các đơn cứu hộ.
                    </Text>
                  </View>
                )}

                {/* Nhập số tiền */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>SỐ TIỀN CẦN NẠP (VNĐ)</Text>
                  <View style={styles.amountInputWrap}>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      placeholder="VD: 200.000"
                      placeholderTextColor="#94a3b8"
                      value={topupAmount}
                      onChangeText={(val) => {
                        const clean = val.replace(/\D/g, '');
                        setTopupAmount(clean ? parseInt(clean, 10).toLocaleString('vi-VN') : '');
                      }}
                    />
                    {topupAmount ? (
                      <TouchableOpacity
                        style={{ padding: 6, marginRight: 2 }}
                        onPress={() => setTopupAmount('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={15} color="#94a3b8" />
                      </TouchableOpacity>
                    ) : null}
                    <Text style={styles.currencySuffix}>đ</Text>
                  </View>
                  <Text style={styles.minAmountNote}>* Số tiền nạp tối thiểu là 10.000đ</Text>
                </View>

                {/* Gợi ý mức nạp nhanh */}
                <Text style={[styles.inputLabel, { marginBottom: 8 }]}>CHỌN NHANH MỨC NẠP</Text>
                <View style={styles.presetGrid}>
                  {[50000, 100000, 200000, 500000, 1000000, 2000000].map((preset) => {
                    const isSelected = topupAmount.replace(/\D/g, '') === String(preset);
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[styles.presetChip, isSelected && styles.presetChipActive]}
                        onPress={() => {
                          Keyboard.dismiss();
                          setTopupAmount(preset.toLocaleString('vi-VN'));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                          {formatCompactVnd(preset)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Nút hành động tùy theo phương thức */}
                {topupMethod === 'PAYOS' ? (
                  <TouchableOpacity
                    style={styles.submitTopupBtn}
                    activeOpacity={0.88}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleCreateTopup();
                    }}
                    disabled={creatingTopup}
                  >
                    {creatingTopup ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.submitTopupBtnText}>TẠO MÃ THANH TOÁN</Text>
                        <ArrowUpRight size={18} color="#ffffff" strokeWidth={2.4} />
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.submitTopupBtn,
                      { backgroundColor: '#059669' },
                      (data.cashBalance < (parseInt(topupAmount.replace(/\D/g, ''), 10) || 0) || transferringCash) && { opacity: 0.6 }
                    ]}
                    activeOpacity={0.88}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleTransferCashToCredit();
                    }}
                    disabled={transferringCash || data.cashBalance < (parseInt(topupAmount.replace(/\D/g, ''), 10) || 0)}
                  >
                    {transferringCash ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Banknote size={18} color="#ffffff" strokeWidth={2.4} />
                        <Text style={styles.submitTopupBtnText}>CHUYỂN TỪ VÍ TIỀN MẶT</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL THANH TOÁN VIETQR PAYOS ── */}
      <Modal
        visible={payOSModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayOSModalVisible(false)}
      >
        <View style={styles.payOSOverlay}>
          <View style={styles.payOSModalContainer}>
            {/* Header Modal */}
            <View style={styles.payOSHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.payOSIconPill}>
                  <CreditCard size={18} color="#ffffff" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.payOSHeaderTitle}>Nạp tiền qua PayOS / VietQR</Text>
                  <Text style={styles.payOSHeaderSub}>Chuyển khoản tự động xác nhận 24/7</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.payOSCloseBtn}
                onPress={() => setPayOSModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={20} color="#ea580c" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.payOSScrollContent}>
              {/* Badge số tiền */}
              <View style={styles.payOSAmountBox}>
                <Text style={styles.payOSAmountLabel}>Số tiền cần thanh toán</Text>
                <Text style={styles.payOSAmountValue}>{formatVnd(payOSData?.amount || 0)}</Text>
              </View>

              {/* Box Mã QR VietQR */}
              {payOSData && (
                <View style={styles.payOSQRCard}>
                  <Text style={styles.payOSQRInstruction}>Mở ứng dụng Ngân hàng bất kỳ để quét mã VietQR:</Text>
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
                    <ActivityIndicator size="small" color="#ea580c" />
                    <Text style={styles.payOSQRStatusText}>Đang chờ bạn quét mã thanh toán...</Text>
                  </View>
                </View>
              )}

              {/* Thông tin chuyển khoản chi tiết */}
              {payOSData && (
                <View style={styles.payOSInfoCard}>
                  {payOSData.accountName ? (
                    <View style={styles.payOSInfoRow}>
                      <Text style={styles.payOSInfoLabel}>Người thụ hưởng:</Text>
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
                        <Copy size={13} color={copiedField === 'acc' ? '#16a34a' : '#ea580c'} />
                        <Text style={[styles.copyTip, copiedField === 'acc' && { color: '#16a34a' }]}>
                          {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  <View style={styles.payOSInfoRow}>
                    <Text style={styles.payOSInfoLabel}>Số tiền:</Text>
                    <Text style={[styles.payOSInfoValBold, { color: '#ea580c', fontSize: 16 }]}>
                      {formatVnd(payOSData.amount)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Box nội dung chuyển khoản bắt buộc */}
              {payOSData && (
                <View style={styles.payOSDescCard}>
                  <View style={styles.payOSDescHeader}>
                    <Text style={styles.payOSDescLabel}>Nội dung chuyển khoản (bắt buộc):</Text>
                    <TouchableOpacity
                      style={styles.payOSDescCopyBtn}
                      onPress={() => copyToClipboard(payOSData.description, 'desc')}
                      activeOpacity={0.7}
                    >
                      <Copy size={13} color={copiedField === 'desc' ? '#16a34a' : '#ea580c'} />
                      <Text style={[styles.copyTip, copiedField === 'desc' && { color: '#16a34a' }]}>
                        {copiedField === 'desc' ? 'Đã chép' : 'Sao chép'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.payOSDescBox}>
                    <Text style={styles.payOSDescText} selectable>
                      {payOSData.description}
                    </Text>
                  </View>
                  <Text style={styles.payOSDescNote}>
                    * Vui lòng giữ đúng nội dung chuyển khoản để hệ thống tự động cộng tiền vào ví trong giây lát.
                  </Text>
                </View>
              )}

              {/* Tự động xác nhận giao dịch & Nút hành động */}
              <View style={styles.payOSActionGroup}>
                <View style={styles.payOSAutoStatusBox}>
                  <View style={styles.payOSAutoStatusPulse}>
                    <ActivityIndicator size="small" color="#16a34a" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.payOSAutoStatusTitle}>Đang tự động kiểm tra giao dịch...</Text>
                    <Text style={styles.payOSAutoStatusSub}>
                      Sau khi chuyển khoản thành công, hệ thống sẽ tự động cập nhật số dư ví tức thì mà bạn không cần phải chụp biên lai.
                    </Text>
                  </View>
                </View>

                {/* Sao chép toàn bộ thông tin */}
                {payOSData?.accountNumber && payOSData?.description ? (
                  <TouchableOpacity
                    style={styles.payOSCopyAllBtn}
                    onPress={async () => {
                      try {
                        await Clipboard.setStringAsync(
                          `STK: ${payOSData.accountNumber}\nChủ TK: ${payOSData.accountName || ''}\nSố tiền: ${payOSData.amount}\nNội dung: ${payOSData.description}`
                        );
                        copyToClipboard(payOSData.accountNumber || '', 'all');
                      } catch { }
                    }}
                    activeOpacity={0.88}
                  >
                    <Copy size={16} color={copiedField === 'all' ? '#16a34a' : '#ea580c'} style={{ marginRight: 8 }} />
                    <Text style={[styles.payOSCopyAllText, copiedField === 'all' && { color: '#16a34a' }]}>
                      {copiedField === 'all' ? '✓ Đã sao chép tất cả thông tin' : 'Sao chép đầy đủ thông tin chuyển khoản'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Nút kiểm tra thủ công */}
                <TouchableOpacity
                  style={styles.payOSManualCheckBtn}
                  onPress={handleManualCheckPayOS}
                  disabled={checkingPayOS}
                  activeOpacity={0.88}
                >
                  {checkingPayOS ? (
                    <ActivityIndicator color="#ea580c" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <RefreshCw size={15} color="#ea580c" strokeWidth={2.4} />
                      <Text style={styles.payOSManualCheckText}>Tôi đã chuyển tiền, kiểm tra ngay</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Mở link trình duyệt */}
                {payOSData?.checkoutUrl ? (
                  <TouchableOpacity
                    style={styles.payOSOpenBrowserBtn}
                    onPress={() => Linking.openURL(payOSData.checkoutUrl)}
                    activeOpacity={0.88}
                  >
                    <ExternalLink size={16} color="#ea580c" style={{ marginRight: 8 }} />
                    <Text style={styles.payOSOpenBrowserText}>Mở trang thanh toán PayOS trên web</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CHI TIẾT BIẾN ĐỘNG SỐ DƯ GIAO DỊCH ── */}
      <Modal
        visible={!!selectedTxn}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTxn(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setSelectedTxn(null)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View style={styles.txnDetailModalBox}>
            {/* Header Modal */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[
                  styles.modalIconWrap,
                  selectedTxn?.amount && selectedTxn.amount > 0
                    ? { backgroundColor: '#dcfce7' }
                    : { backgroundColor: '#fee2e2' }
                ]}>
                  {selectedTxn?.txnType === 'COMPENSATION' ? (
                    <Banknote size={18} color="#16a34a" strokeWidth={2.4} />
                  ) : selectedTxn?.txnType === 'TOPUP' ? (
                    <ArrowUpRight size={18} color="#16a34a" strokeWidth={2.4} />
                  ) : selectedTxn?.txnType === 'WITHDRAWAL' ? (
                    <ArrowDownLeft size={18} color="#dc2626" strokeWidth={2.4} />
                  ) : selectedTxn?.amount && selectedTxn.amount > 0 ? (
                    <CheckCircle2 size={18} color="#16a34a" strokeWidth={2.4} />
                  ) : (
                    <ShieldCheck size={18} color="#dc2626" strokeWidth={2.4} />
                  )}
                </View>
                <Text style={styles.modalTitle}>Chi tiết giao dịch</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedTxn(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedTxn && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                {/* Khối số tiền nổi bật & Trạng thái */}
                <View style={styles.detailAmountCard}>
                  <Text style={[
                    styles.detailAmountText,
                    { color: (selectedTxn.amount ?? 0) >= 0 ? '#16a34a' : '#dc2626' }
                  ]}>
                    {(selectedTxn.amount ?? 0) >= 0
                      ? `+${formatVnd(selectedTxn.amount)}`
                      : `-${formatVnd(Math.abs(selectedTxn.amount))}`}
                  </Text>
                  <View style={[
                    styles.detailStatusBadge,
                    selectedTxn.status === 'COMPLETED' || selectedTxn.status === 'PAID' || selectedTxn.status === 'TRANSFERRED'
                      ? { backgroundColor: '#dcfce7' }
                      : selectedTxn.status === 'FAILED' || selectedTxn.status === 'REJECTED'
                      ? { backgroundColor: '#fee2e2' }
                      : { backgroundColor: '#fef3c7' }
                  ]}>
                    <CheckCircle2
                      size={12}
                      color={
                        selectedTxn.status === 'COMPLETED' || selectedTxn.status === 'PAID' || selectedTxn.status === 'TRANSFERRED'
                          ? '#16a34a'
                          : selectedTxn.status === 'FAILED' || selectedTxn.status === 'REJECTED'
                          ? '#dc2626'
                          : '#d97706'
                      }
                    />
                    <Text style={[
                      styles.detailStatusText,
                      {
                        color:
                          selectedTxn.status === 'COMPLETED' || selectedTxn.status === 'PAID' || selectedTxn.status === 'TRANSFERRED'
                            ? '#15803d'
                            : selectedTxn.status === 'FAILED' || selectedTxn.status === 'REJECTED'
                            ? '#b91c1c'
                            : '#b45309'
                      }
                    ]}>
                      {selectedTxn.status === 'COMPLETED' || selectedTxn.status === 'PAID' || selectedTxn.status === 'TRANSFERRED'
                        ? 'Giao dịch thành công'
                        : selectedTxn.status === 'FAILED' || selectedTxn.status === 'REJECTED'
                        ? 'Giao dịch thất bại'
                        : 'Đang xử lý'}
                    </Text>
                  </View>
                </View>

                {/* Các trường thông tin chi tiết */}
                <View style={styles.detailRowsWrap}>
                  {/* Mã đơn / Mã giao dịch */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Mã giao dịch</Text>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      onPress={() => copyToClipboard(selectedTxn.orderCode, 'detailTxnCode')}
                    >
                      <Text style={styles.detailRowValueBold}>
                        {selectedTxn.orderCode.startsWith('#') ? selectedTxn.orderCode : '#' + selectedTxn.orderCode}
                      </Text>
                      {copiedField === 'detailTxnCode' ? (
                        <Check size={14} color="#16a34a" />
                      ) : (
                        <Copy size={14} color="#94a3b8" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Loại giao dịch */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Loại giao dịch</Text>
                    <Text style={styles.detailRowValue}>
                      {selectedTxn.txnType === 'COMPENSATION'
                        ? 'Bồi hoàn xăng xe (Bom đơn)'
                        : selectedTxn.txnType === 'TOPUP'
                        ? 'Nạp tiền ví tín dụng'
                        : selectedTxn.txnType === 'WITHDRAWAL'
                        ? 'Rút tiền về ngân hàng'
                        : selectedTxn.txnType === 'WITHDRAWAL_REFUND'
                        ? 'Hoàn tiền rút thất bại'
                        : selectedTxn.txnType === 'DEDUCTION'
                        ? 'Chiết khấu hoa hồng hệ thống'
                        : 'Thu phí dịch vụ cứu hộ'}
                    </Text>
                  </View>

                  {/* Ví giao dịch */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Ví áp dụng</Text>
                    <Text style={styles.detailRowValue}>
                      {selectedTxn.walletType === 'CREDIT' ? 'Ví tín dụng Gara' : 'Ví tiền mặt Gara'}
                    </Text>
                  </View>

                  {/* Thời gian */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Thời gian</Text>
                    <Text style={styles.detailRowValue}>{selectedTxn.executedAtText || 'Hôm nay'}</Text>
                  </View>

                  {/* Phụ trách / Người thực hiện */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Bên thực hiện</Text>
                    <Text style={styles.detailRowValue}>{selectedTxn.technicianName || 'Hệ thống SRAS'}</Text>
                  </View>

                  {/* Dịch vụ */}
                  {selectedTxn.serviceTitle ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Dịch vụ</Text>
                      <Text style={[styles.detailRowValue, { flex: 1, textAlign: 'right' }]}>
                        {selectedTxn.txnType === 'COMPENSATION' ? 'Bồi hoàn xăng xe' : selectedTxn.serviceTitle}
                      </Text>
                    </View>
                  ) : null}

                  {/* Tổng đơn & hoa hồng nếu có */}
                  {selectedTxn.totalOrderAmount && selectedTxn.totalOrderAmount > 0 && selectedTxn.commissionAmount ? (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailRowLabel}>Tổng giá trị đơn</Text>
                        <Text style={styles.detailRowValue}>{formatVnd(selectedTxn.totalOrderAmount)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailRowLabel}>Hoa hồng ({selectedTxn.commissionRate ?? 15}%)</Text>
                        <Text style={[styles.detailRowValue, { color: '#dc2626' }]}>
                          -{formatVnd(selectedTxn.commissionAmount)}
                        </Text>
                      </View>
                    </>
                  ) : null}

                  {/* Nội dung diễn giải chi tiết */}
                  <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 6, borderBottomWidth: 0 }]}>
                    <Text style={styles.detailRowLabel}>Nội dung / Diễn giải chi tiết</Text>
                    <View style={styles.detailDescBox}>
                      <Text style={styles.detailDescText}>
                        {selectedTxn.description || selectedTxn.serviceTitle || 'Không có ghi chú thêm.'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Nút đóng */}
                <TouchableOpacity
                  style={styles.detailCloseBtn}
                  onPress={() => setSelectedTxn(null)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.detailCloseBtnText}>Đóng</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  topHeaderSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  refreshBtnText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  scrollContent: {
    backgroundColor: '#f8fafc',
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  /* ── 1. Thẻ Ví Tiền Mặt (Primary - Ở trên) ── */
  cashWalletCardPrimary: {
    backgroundColor: '#ea580c',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  walletBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cashBadgePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cashBadgePrimaryText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  withdrawablePillWhite: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  withdrawablePillWhiteText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
  },
  walletCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  walletCardBalance: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  walletCardSubNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 15,
  },
  walletIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtnWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    height: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  withdrawBtnWhiteText: {
    color: '#ea580c',
    fontSize: 14.5,
    fontWeight: '900',
  },

  /* ── 2. Thẻ Ví Tín Dụng / Ký Quỹ (Secondary - Ở dưới) ── */
  creditWalletCardSecondary: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  creditBadgeSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  creditBadgeSecondaryText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#c2410c',
    letterSpacing: 0.5,
  },
  creditBalanceSecondaryAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  creditCardSecondarySubNote: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 15,
  },
  creditIconWrapSecondary: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topupBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    borderRadius: 16,
    height: 46,
    marginTop: 16,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  topupBtnSecondaryText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '900',
  },

  /* ── 2. Thẻ Thống Kê Nhanh (Doanh Thu Hôm Nay, Số Đơn) ── */
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statMiniTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statMiniLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  statMiniValueBlack: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0f172a',
  },
  statMiniValueOrange: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ea580c',
  },
  statUnitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  statMiniSub: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },

  /* ── 3. Biểu Đồ Doanh Thu ── */
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  chartCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  chartCardSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  filterTabsWrap: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  filterTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  filterTabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
  lineChartWrap: {
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 2,
  },
  chartEmptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  historyFilterTabsWrap: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  historyFilterTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyFilterTabBtnActive: {
    backgroundColor: '#ea580c',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  historyFilterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  historyFilterTabTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },

  /* ── 4. Lịch Sử Giao Dịch Dạng Card ── */
  historySection: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  historyHeaderRow: {
    marginBottom: 12,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  historySectionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    height: '100%',
  },
  emptyWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  txnsList: {
    gap: 12,
  },
  txnCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  txnCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderCodeTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderCodeTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  successBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
  },
  orderAmountEarned: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'right',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceRowTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  calculationNoteWrap: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  calculationNoteText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  txnCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  techInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  techAvatarImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  techAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techFullName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },

  /* ── Modal Rút Tiền ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  withdrawModalBox: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 18,
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    height: '100%',
  },

  /* ── MODAL NẠP TIỀN & PRESETS ── */
  methodSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  methodCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  methodCardActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  methodRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRadioActive: {
    borderColor: '#ea580c',
  },
  methodRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea580c',
  },
  methodTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
  },
  methodTitleActive: {
    color: '#c2410c',
  },
  methodDesc: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  topupInfoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 14,
  },
  topupInfoNoteText: {
    fontSize: 12,
    color: '#9a3412',
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  currencySuffix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
    marginLeft: 4,
  },
  minAmountNote: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 4,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  presetChip: {
    width: '31%',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
  submitTopupBtn: {
    backgroundColor: '#ea580c',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  submitTopupBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /* ── PAYOS MODAL STYLES ── */
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
    maxHeight: '92%',
    paddingBottom: 24,
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
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOSHeaderTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  payOSHeaderSub: {
    fontSize: 12,
    color: '#64748b',
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
    fontSize: 12,
    fontWeight: '700',
    color: '#9a3412',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payOSAmountValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ea580c',
    marginTop: 4,
  },
  payOSQRCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  payOSQRInstruction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
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
    marginTop: 12,
  },
  payOSQRStatusText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  payOSInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  payOSInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payOSInfoLabel: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  payOSInfoValBold: {
    fontSize: 13.5,
    color: '#0f172a',
    fontWeight: '800',
  },
  payOSInfoValMono: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
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
    color: '#ea580c',
  },
  payOSDescCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  payOSDescHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  payOSDescLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9a3412',
  },
  payOSDescCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  payOSDescBox: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  payOSDescText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  payOSDescNote: {
    fontSize: 11,
    color: '#9a3412',
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 15,
  },
  payOSActionGroup: {
    gap: 12,
    marginTop: 4,
  },
  payOSAutoStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  payOSAutoStatusPulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOSAutoStatusTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#15803d',
  },
  payOSAutoStatusSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
    lineHeight: 15,
  },
  payOSCopyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    height: 46,
    borderRadius: 14,
  },
  payOSCopyAllText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  payOSManualCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    height: 46,
    borderRadius: 14,
  },
  payOSManualCheckText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  payOSOpenBrowserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  payOSOpenBrowserText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
    textDecorationLine: 'underline',
  },

  /* ── 9. MODAL CHI TIẾT GIAO DỊCH ── */
  txnDetailModalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  detailAmountCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailAmountText: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailRowsWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailRowLabel: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  detailRowValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  detailRowValueBold: {
    fontSize: 13,
    color: '#ea580c',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  detailDescBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailDescText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  detailCloseBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  detailCloseBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
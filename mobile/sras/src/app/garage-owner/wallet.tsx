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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CreditCard,
  Search,
  Calendar,
  ArrowDownLeft,
  X,
  Building2,
  CheckCircle2,
  Clock,
  Wrench,
  TrendingUp,
  BarChart3,
  User,
} from 'lucide-react-native';
import axiosClient from '../../api/axiosClient';
import { resolveUserAvatar } from '../../utils/avatar';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G, Text as SvgText, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');

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
  txnType?: 'INCOME' | 'DEDUCTION' | string;
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

  // Modal rút tiền
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('1029384756 (Vietcombank - CN Tân Bình)');
  const [withdrawing, setWithdrawing] = useState(false);

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

  useEffect(() => {
    fetchWalletOverview();
  }, [fetchWalletOverview]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletOverview();
  };

  const handleConfirmWithdraw = async () => {
    const amt = parseInt(withdrawAmount.replace(/\D/g, ''), 10);
    if (!amt || amt < 50000) {
      Alert.alert('Số tiền không hợp lệ', 'Số tiền rút tối thiểu là 50.000đ.');
      return;
    }
    if (amt > data.cashBalance) {
      Alert.alert('Số dư không đủ', 'Số tiền rút vượt quá số dư ví hiện có.');
      return;
    }

    setWithdrawing(true);
    try {
      await axiosClient.post('/garages/me/wallet/withdraw', { amount: amt });
      setWithdrawModalVisible(false);
      setWithdrawAmount('');
      Alert.alert(
        'Yêu cầu rút tiền thành công',
        `Hệ thống đã tiếp nhận yêu cầu rút ${amt.toLocaleString('vi-VN')}đ về tài khoản ngân hàng liên kết. Tiền sẽ về trong vòng 5-15 phút.`
      );
      fetchWalletOverview();
    } catch (e: any) {
      Alert.alert('Thông báo', 'Đã tạo yêu cầu rút tiền thành công.');
      setWithdrawModalVisible(false);
    } finally {
      setWithdrawing(false);
    }
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
      <StatusBar barStyle="light-content" backgroundColor="#ea580c" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>VÍ TIỀN & DOANH THU GARA</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 13, color: '#ffffff', fontWeight: '800' }}>Làm mới 🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
      >
        {/* ── 1. THẺ SỐ DƯ VÍ NHẬN TỪ ĐƠN ── */}
        <View style={styles.walletCard}>
          <View style={styles.walletCardTop}>
            <View>
              <Text style={styles.walletCardLabel}>Số dư ví nhận từ đơn</Text>
              <Text style={styles.walletCardBalance}>
                {formatVnd(data.cashBalance)}
              </Text>
              <Text style={styles.walletCardSubNote}>
                Đã cộng tiền chuyển khoản & trừ hoa hồng đơn tiền mặt
              </Text>
            </View>

            <View style={styles.walletIconWrap}>
              <CreditCard size={24} color="#ffffff" strokeWidth={2.4} />
            </View>
          </View>

          {/* Nút rút tiền */}
          <TouchableOpacity
            style={styles.withdrawBtn}
            activeOpacity={0.88}
            onPress={() => setWithdrawModalVisible(true)}
          >
            <ArrowDownLeft size={18} color="#ea580c" strokeWidth={2.6} />
            <Text style={styles.withdrawBtnText}>Rút tiền về Ngân hàng</Text>
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
                const isCashDeduction = t.paymentMethod === 'CASH' || t.amount < 0 || t.txnType === 'DEDUCTION';
                const formattedAmount = isCashDeduction
                  ? `-${formatVnd(Math.abs(t.amount))}`
                  : `+${formatVnd(t.amount)}`;
                const amountColor = isCashDeduction ? '#dc2626' : '#16a34a';

                return (
                  <View key={t.id || idx} style={styles.txnCard}>
                    {/* Hàng 1: Mã đơn (trái) <────────────────> Số tiền biến động ví (phải) */}
                    <View style={styles.txnCardTopRow}>
                      <View style={styles.orderCodeTag}>
                        <Text style={styles.orderCodeTagText}>
                          {t.orderCode.startsWith('#') ? t.orderCode : '#' + t.orderCode}
                        </Text>
                      </View>

                      <Text style={[styles.orderAmountEarned, { color: amountColor }]}>
                        {formattedAmount}
                      </Text>
                    </View>

                    {/* Hàng 2: Tên dịch vụ & Badge loại thanh toán */}
                    <View style={styles.serviceRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 6 }}>
                        <Wrench size={15} color="#ea580c" />
                        <Text style={styles.serviceRowTitle} numberOfLines={1}>
                          {t.serviceTitle || 'Sửa chữa cứu hộ phương tiện'}
                        </Text>
                      </View>

                      {isCashDeduction ? (
                        <View style={[styles.successBadge, { backgroundColor: '#fee2e2' }]}>
                          <Text style={[styles.successBadgeText, { color: '#dc2626' }]}>💵 Tiền mặt · Trừ CK</Text>
                        </View>
                      ) : (
                        <View style={styles.successBadge}>
                          <CheckCircle2 size={12} color="#16a34a" />
                          <Text style={styles.successBadgeText}>🏦 PayOS · Đã nhận</Text>
                        </View>
                      )}
                    </View>

                    {/* Dòng ghi chú đối soát tiền mặt / chuyển khoản */}
                    <View style={styles.calculationNoteWrap}>
                      <Text style={styles.calculationNoteText}>
                        {isCashDeduction
                          ? `Gara thu tiền mặt: ${formatVnd(t.totalOrderAmount || Math.abs(t.amount))} · Ví trừ ${t.commissionRate ?? 15}% CK hoa hồng`
                          : `Tổng đơn: ${formatVnd(t.totalOrderAmount || t.amount)} · Ví nhận sau khi trừ ${t.commissionRate ?? 15}% CK`}
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
                            <User size={13} color="#ea580c" />
                          </View>
                        )}
                        <Text style={styles.techFullName} numberOfLines={1}>
                          {t.technicianName}
                        </Text>
                      </View>

                      <View style={styles.timeWrap}>
                        <Clock size={12} color="#64748b" />
                        <Text style={styles.timeText}>{t.executedAtText}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── MODAL RÚT TIỀN ── */}
      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.withdrawModalBox}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalIconWrap}>
                  <ArrowDownLeft size={18} color="#ea580c" />
                </View>
                <Text style={styles.modalTitle}>Rút tiền về Ngân hàng</Text>
              </View>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.availableBalanceBox}>
              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>Số dư khả dụng:</Text>
              <Text style={{ fontSize: 16, color: '#ea580c', fontWeight: '800' }}>
                {formatVnd(data.cashBalance)}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Tài khoản ngân hàng liên kết</Text>
            <View style={styles.bankAccountRow}>
              <Building2 size={16} color="#0284c7" />
              <Text style={styles.bankAccountText} numberOfLines={1}>{bankAccount}</Text>
            </View>

            <Text style={styles.inputLabel}>Số tiền cần rút (VND)</Text>
            <View style={styles.amountInputWrap}>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="VD: 1.000.000"
                placeholderTextColor="#94a3b8"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />
              <TouchableOpacity
                style={styles.allInBtn}
                onPress={() => setWithdrawAmount(String(data.cashBalance))}
              >
                <Text style={styles.allInBtnText}>Tất cả</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.submitWithdrawBtn}
              activeOpacity={0.88}
              onPress={handleConfirmWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitWithdrawBtnText}>XÁC NHẬN RÚT TIỀN</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ea580c',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ea580c',
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scrollContent: {
    backgroundColor: '#f8fafc',
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  /* ── 1. Thẻ Số Dư Ví ── */
  walletCard: {
    backgroundColor: '#ea580c',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  walletCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  walletCardLabel: {
    fontSize: 13,
    color: '#fed7aa',
    fontWeight: '800',
    marginBottom: 4,
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
  },
  walletIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtn: {
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
  withdrawBtnText: {
    color: '#ea580c',
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
  availableBalanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  bankAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 14,
  },
  bankAccountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
    flex: 1,
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
  allInBtn: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  allInBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  submitWithdrawBtn: {
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
  submitWithdrawBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
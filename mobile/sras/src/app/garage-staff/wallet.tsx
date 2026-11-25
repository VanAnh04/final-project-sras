import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Wrench,
  Receipt,
  Banknote,
  CreditCard,
  MapPin,
  User,
  Phone,
  Sparkles,
  Car,
  Bike,
  Truck,
  ChevronRight,
} from 'lucide-react-native';
import axiosClient from '../../api/axiosClient';

interface CustomerInfo {
  id: number;
  name?: string;
  phone?: string;
}

interface StaffHistoryItem {
  id: number;
  code?: string;
  status: string;
  vehicleType?: string;
  symptom?: string;
  pickupAddress?: string;
  totalAmount?: number;
  rescueFee?: number;
  paymentMethod?: string;
  cashSettled?: boolean;
  cashSettledAt?: string;
  createdAt?: string;
  completedAt?: string;
  customer?: CustomerInfo;
}

export default function GarageStaffHistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'UNSETTLED_CASH' | 'CASH' | 'BANK_TRANSFER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyList, setHistoryList] = useState<StaffHistoryItem[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/rescue-requests/staff/history');
      const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const list = rawList.filter(
        (it: StaffHistoryItem) => it.status !== 'CANCELLED' && it.status !== 'DECLINED'
      );
      setHistoryList(list);
    } catch (e: any) {
      console.warn('Lỗi tải lịch sử cứu hộ nhân viên:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatVnd = (amount?: number) => {
    if (amount === undefined || amount === null) return '0đ';
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    } catch {
      return iso;
    }
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalCount = historyList.length;
    const cashCount = historyList.filter(
      (item) => item.paymentMethod === 'CASH'
    ).length;
    const bankCount = historyList.filter(
      (item) => item.paymentMethod === 'BANK_TRANSFER' || item.paymentMethod === 'PAYOS'
    ).length;

    // Đơn tiền mặt chưa nộp cho chủ gara
    const unsettledOrders = historyList.filter(
      (item) => item.paymentMethod === 'CASH' && !item.cashSettled
    );
    const unsettledCashAmount = unsettledOrders.reduce(
      (sum, item) => sum + (item.totalAmount || item.rescueFee || 0),
      0
    );

    return {
      totalCount,
      cashCount,
      bankCount,
      unsettledCashAmount,
      unsettledCount: unsettledOrders.length,
    };
  }, [historyList]);

  // Danh sách đã lọc
  const filteredList = useMemo(() => {
    return historyList.filter((item) => {
      // Lọc theo phương thức & tiền mặt chưa nộp
      if (filterType === 'UNSETTLED_CASH') {
        if (item.paymentMethod !== 'CASH' || item.cashSettled) return false;
      }
      if (filterType === 'CASH' && item.paymentMethod !== 'CASH') return false;
      if (
        filterType === 'BANK_TRANSFER' &&
        item.paymentMethod !== 'BANK_TRANSFER' &&
        item.paymentMethod !== 'PAYOS'
      ) {
        return false;
      }

      // Lọc theo tìm kiếm
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const code = (item.code || `REQ-${item.id}`).toLowerCase();
        const custName = (item.customer?.name || '').toLowerCase();
        const custPhone = (item.customer?.phone || '').toLowerCase();
        const symptom = (item.symptom || '').toLowerCase();
        const address = (item.pickupAddress || '').toLowerCase();

        return (
          code.includes(query) ||
          custName.includes(query) ||
          custPhone.includes(query) ||
          symptom.includes(query) ||
          address.includes(query)
        );
      }

      return true;
    });
  }, [historyList, filterType, searchQuery]);

  const renderVehicleIcon = (vehicleType?: string) => {
    switch (vehicleType) {
      case 'MOTORCYCLE':
        return <Bike size={13} color="#ea580c" />;
      case 'TRUCK':
        return <Truck size={13} color="#ea580c" />;
      default:
        return <Car size={13} color="#ea580c" />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Lịch sử cứu hộ</Text>
          <Text style={styles.headerSubtitle}>Nhật ký các ca cứu hộ bạn đã hoàn thành</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />
        }
      >
        {/* ── THẺ TIỀN MẶT ĐANG GIỮ (CẦN NỘP CHO CHỦ GARA) ── */}
        <View style={styles.cashHoldingCard}>
          <View style={styles.cashHoldingTop}>
            <View style={styles.cashHoldingIconWrap}>
              <Banknote size={26} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cashHoldingLabel}>TIỀN MẶT ĐANG GIỮ (CẦN NỘP CHO CHỦ GARA)</Text>
              <Text style={styles.cashHoldingAmount}>{formatVnd(stats.unsettledCashAmount)}</Text>
            </View>
          </View>
          <View style={styles.cashHoldingDivider} />
          <View style={styles.cashHoldingBottom}>
            <Text style={styles.cashHoldingSub}>
              {stats.unsettledCount > 0
                ? `${stats.unsettledCount} đơn chưa nộp tiền mặt. Vui lòng bàn giao cho chủ gara.`
                : 'Đã bàn giao đủ tiền mặt cho chủ gara.'}
            </Text>
          </View>
        </View>

        {/* ── THỐNG KÊ TỔNG QUAN ── */}
        <View style={styles.statsGrid}>
          {/* Tổng ca */}
          <View style={[styles.statCard, { borderLeftColor: '#ea580c' }]}>
            <Text style={styles.statLabel}>TỔNG CA ĐÃ LÀM</Text>
            <Text style={[styles.statValue, { color: '#ea580c' }]}>{stats.totalCount}</Text>
            <Text style={styles.statSub}>Đã hoàn thành</Text>
          </View>

          {/* Tiền mặt */}
          <View style={[styles.statCard, { borderLeftColor: '#16a34a' }]}>
            <Text style={styles.statLabel}>TIỀN MẶT</Text>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.cashCount}</Text>
            <Text style={styles.statSub}>Bàn giao Gara</Text>
          </View>

          {/* Chuyển khoản */}
          <View style={[styles.statCard, { borderLeftColor: '#2563eb' }]}>
            <Text style={styles.statLabel}>CHUYỂN KHOẢN</Text>
            <Text style={[styles.statValue, { color: '#2563eb' }]}>{stats.bankCount}</Text>
            <Text style={styles.statSub}>PayOS trực tuyến</Text>
          </View>
        </View>

        {/* ── TÌM KIẾM & BỘ LỌC ── */}
        <View style={styles.filterSection}>
          {/* Ô tìm kiếm */}
          <View style={styles.searchBar}>
            <Search size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm mã đơn, khách hàng, triệu chứng..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs bộ lọc cuộn ngang */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.tabFilterRow}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.filterTab, filterType === 'ALL' && styles.filterTabActive]}
              onPress={() => setFilterType('ALL')}
            >
              <Text
                style={[styles.filterTabText, filterType === 'ALL' && styles.filterTabTextActive]}
              >
                Tất cả ({historyList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.filterTab, filterType === 'UNSETTLED_CASH' && styles.filterTabActive]}
              onPress={() => setFilterType('UNSETTLED_CASH')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterType === 'UNSETTLED_CASH' && styles.filterTabTextActive,
                ]}
              >
                Chưa nộp ({stats.unsettledCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.filterTab, filterType === 'CASH' && styles.filterTabActive]}
              onPress={() => setFilterType('CASH')}
            >
              <Text
                style={[styles.filterTabText, filterType === 'CASH' && styles.filterTabTextActive]}
              >
                Tiền mặt ({stats.cashCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.filterTab,
                filterType === 'BANK_TRANSFER' && styles.filterTabActive,
              ]}
              onPress={() => setFilterType('BANK_TRANSFER')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterType === 'BANK_TRANSFER' && styles.filterTabTextActive,
                ]}
              >
                Chuyển khoản ({stats.bankCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── DANH SÁCH CA CỨU HỘ ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.loadingText}>Đang tải lịch sử ca cứu hộ...</Text>
          </View>
        ) : filteredList.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Receipt size={40} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có ca cứu hộ nào</Text>
            <Text style={styles.emptySub}>
              {searchQuery.trim()
                ? 'Không tìm thấy ca cứu hộ khớp với từ khóa tìm kiếm.'
                : 'Các ca cứu hộ bạn hoàn thành sẽ xuất hiện tại đây.'}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredList.map((item) => {
              const isCash = item.paymentMethod === 'CASH';
              const codeDisplay = item.code || `REQ-${item.id}`;
              const amountDisplay = item.totalAmount || item.rescueFee || 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.cardCompact}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/garage-staff/order-detail',
                      params: { id: String(item.id), from: 'wallet' },
                    })
                  }
                >
                  {/* Cột trái: Mã đơn + Loại xe + Ngày giờ & Khách hàng */}
                  <View style={styles.cardCompactLeft}>
                    <View style={styles.cardCompactTopRow}>
                      <View style={styles.vehicleBadgeMini}>
                        {renderVehicleIcon(item.vehicleType)}
                      </View>
                      <Text style={styles.codeTextCompact}>{codeDisplay}</Text>
                      {item.vehicleType ? (
                        <View style={styles.vehicleTypeTag}>
                          <Text style={styles.vehicleTypeTagText}>
                            {item.vehicleType === 'CAR' ? 'Ô tô' : item.vehicleType === 'TRUCK' ? 'Xe tải' : 'Xe máy'}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.orderSubCompact} numberOfLines={1}>
                      {formatDateTime(item.completedAt || item.createdAt)}
                      {item.customer?.name ? ` • ${item.customer.name}` : ''}
                      {item.symptom ? ` • ${item.symptom}` : ''}
                    </Text>
                  </View>

                  {/* Cột phải: Số tiền + Badge trạng thái */}
                  <View style={styles.cardCompactRight}>
                    <Text style={styles.amountValueCompact}>
                      {formatVnd(amountDisplay)}
                    </Text>

                    <View style={styles.cardCompactStatusRow}>
                      {isCash ? (
                        item.cashSettled ? (
                          <View style={[styles.statusMiniBadge, styles.settledMiniBadge]}>
                            <CheckCircle2 size={11} color="#16a34a" />
                            <Text style={styles.settledMiniText}>Đã nộp</Text>
                          </View>
                        ) : (
                          <View style={[styles.statusMiniBadge, styles.unsettledMiniBadge]}>
                            <Clock size={11} color="#ea580c" />
                            <Text style={styles.unsettledMiniText}>Chưa nộp</Text>
                          </View>
                        )
                      ) : (
                        <View style={[styles.statusMiniBadge, styles.bankMiniBadge]}>
                          <CheckCircle2 size={11} color="#2563eb" />
                          <Text style={styles.bankMiniText}>PayOS</Text>
                        </View>
                      )}
                      <ChevronRight size={13} color="#94a3b8" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Thẻ tiền mặt đang giữ
  cashHoldingCard: {
    backgroundColor: '#ea580c',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#ea580c',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cashHoldingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cashHoldingIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashHoldingLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#fed7aa',
    letterSpacing: 0.5,
  },
  cashHoldingAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  cashHoldingDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 12,
  },
  cashHoldingBottom: {},
  cashHoldingSub: {
    fontSize: 11.5,
    color: '#ffedd5',
    lineHeight: 17,
    fontWeight: '500',
  },
  // Thống kê
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  statSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  // Bộ lọc & tìm kiếm
  filterSection: {
    marginBottom: 14,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    height: '100%',
  },
  tabFilterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingRight: 16,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  // Loading & Empty state
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  // Danh sách card rút gọn
  listContainer: {
    gap: 8,
  },
  cardCompact: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardCompactLeft: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  cardCompactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleBadgeMini: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  codeTextCompact: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  vehicleTypeTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  vehicleTypeTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  orderSubCompact: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
    fontWeight: '400',
  },
  cardCompactRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  amountValueCompact: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardCompactStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  settledMiniBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  settledMiniText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16a34a',
  },
  unsettledMiniBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  unsettledMiniText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  bankMiniBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  bankMiniText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563eb',
  },
});

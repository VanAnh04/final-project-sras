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
  Info,
  Car,
  Bike,
  Truck,
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
  createdAt?: string;
  completedAt?: string;
  customer?: CustomerInfo;
}

export default function GarageStaffHistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'CASH' | 'BANK_TRANSFER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyList, setHistoryList] = useState<StaffHistoryItem[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/rescue-requests/staff/history');
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
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
      return `${hours}:${minutes} · ${day}/${month}/${year}`;
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

    return { totalCount, cashCount, bankCount };
  }, [historyList]);

  // Danh sách đã lọc
  const filteredList = useMemo(() => {
    return historyList.filter((item) => {
      // Lọc theo phương thức
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
        return <Bike size={18} color="#ea580c" />;
      case 'TRUCK':
        return <Truck size={18} color="#ea580c" />;
      default:
        return <Car size={18} color="#ea580c" />;
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

        {/* ── BANNER QUY TRÌNH THU TIỀN ── */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Info size={18} color="#ea580c" />
            <Text style={styles.policyTitle}>Quy trình bàn giao thanh toán</Text>
          </View>
          <Text style={styles.policyText}>
            • <Text style={{ fontWeight: '700', color: '#1e293b' }}>Thanh toán chuyển khoản (PayOS):</Text> Khách quét QR thanh toán trực tiếp vào hệ thống. Tiền tự động chia hoa hồng cho sàn và gửi về ví Gara.{'\n'}
            • <Text style={{ fontWeight: '700', color: '#1e293b' }}>Thanh toán tiền mặt:</Text> Bạn nhận đủ tiền mặt từ khách và nộp lại toàn bộ cho Garage Admin. Hệ thống sẽ tự trừ phần chiết khấu từ ví của Gara. Bạn không cần nạp tiền vào ví ứng dụng.
          </Text>
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

          {/* Tabs bộ lọc */}
          <View style={styles.tabFilterRow}>
            <TouchableOpacity
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
          </View>
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
                  style={styles.card}
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push({
                      pathname: '/garage-staff/order-detail',
                      params: { id: String(item.id) },
                    })
                  }
                >
                  {/* Hàng 1: Mã đơn & Badge phương thức thanh toán */}
                  <View style={styles.cardHeader}>
                    <View style={styles.codeWrap}>
                      <View style={styles.vehicleBadge}>
                        {renderVehicleIcon(item.vehicleType)}
                      </View>
                      <View>
                        <Text style={styles.codeText}>{codeDisplay}</Text>
                        <Text style={styles.timeText}>
                          {formatDateTime(item.completedAt || item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.paymentBadge,
                        isCash ? styles.cashBadge : styles.bankBadge,
                      ]}
                    >
                      {isCash ? (
                        <Banknote size={13} color="#16a34a" />
                      ) : (
                        <CreditCard size={13} color="#2563eb" />
                      )}
                      <Text
                        style={[
                          styles.paymentBadgeText,
                          isCash ? { color: '#16a34a' } : { color: '#2563eb' },
                        ]}
                      >
                        {isCash ? 'Tiền mặt' : 'Chuyển khoản'}
                      </Text>
                    </View>
                  </View>

                  {/* Hàng 2: Thông tin khách hàng & Triệu chứng */}
                  <View style={styles.cardBody}>
                    {/* Khách hàng */}
                    {item.customer && (
                      <View style={styles.infoRow}>
                        <User size={14} color="#64748b" />
                        <Text style={styles.customerName}>
                          {item.customer.name || 'Khách hàng'}
                        </Text>
                        {item.customer.phone && (
                          <Text style={styles.customerPhone}>• {item.customer.phone}</Text>
                        )}
                      </View>
                    )}

                    {/* Sự cố / Triệu chứng */}
                    {item.symptom && (
                      <View style={styles.infoRow}>
                        <Wrench size={14} color="#ea580c" />
                        <Text style={styles.symptomText} numberOfLines={2}>
                          {item.symptom}
                        </Text>
                      </View>
                    )}

                    {/* Địa chỉ đón */}
                    {item.pickupAddress && (
                      <View style={styles.infoRow}>
                        <MapPin size={14} color="#64748b" />
                        <Text style={styles.addressText} numberOfLines={1}>
                          {item.pickupAddress}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Hàng 3: Tổng tiền & Trạng thái bàn giao */}
                  <View style={styles.cardFooter}>
                    <View style={styles.footerAmountWrap}>
                      <Text style={styles.amountLabel}>Tổng đơn dịch vụ:</Text>
                      <Text style={styles.amountValue}>{formatVnd(amountDisplay)}</Text>
                    </View>

                    <View style={styles.statusWrap}>
                      <CheckCircle2 size={14} color="#16a34a" />
                      <Text style={styles.statusText}>
                        {isCash ? 'Đã thu tiền mặt' : 'Đã thanh toán PayOS'}
                      </Text>
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
  // Hướng dẫn quy trình
  policyCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffedd5',
    padding: 14,
    marginBottom: 16,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  policyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9a3412',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  policyText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 18,
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
  // Danh sách card
  listContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vehicleBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  timeText: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 1,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cashBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  bankBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardBody: {
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  customerPhone: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  symptomText: {
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '600',
    flex: 1,
  },
  addressText: {
    fontSize: 11.5,
    color: '#64748b',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  footerAmountWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  amountLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
});

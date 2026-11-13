import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Search,
  X,
  ShieldCheck,
  CheckCircle2,
  Car,
  Clock,
  Wrench,
  Receipt,
  AlertCircle,
} from 'lucide-react-native';
import axiosClient from '../../api/axiosClient';

interface SpendingTxn {
  id: number;
  orderCode: string;
  serviceTitle: string;
  garageName: string;
  amount: number;
  paymentMethod: string;
  createdAtText: string;
  status: string;
}

interface CustomerWalletData {
  totalSpent: number;
  completedOrdersCount: number;
  transactions: SpendingTxn[];
}

export default function CustomerWalletScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [data, setData] = useState<CustomerWalletData>({
    totalSpent: 0,
    completedOrdersCount: 0,
    transactions: [],
  });

  const fetchWallet = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/customer/me/wallet/overview');
      if (res?.data) {
        setData({
          totalSpent: res.data.totalSpent ?? 0,
          completedOrdersCount: res.data.completedOrdersCount ?? 0,
          transactions: Array.isArray(res.data.transactions) ? res.data.transactions : [],
        });
      }
    } catch (e: any) {
      console.log('Error fetching customer wallet:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWallet();
    }, [fetchWallet])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  const formatVnd = (val: number) => {
    return (val || 0).toLocaleString('vi-VN') + 'đ';
  };

  const filteredTransactions = data.transactions.filter(t => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      (t.orderCode ? String(t.orderCode).toLowerCase().includes(q) : false) ||
      (t.serviceTitle ? String(t.serviceTitle).toLowerCase().includes(q) : false) ||
      (t.garageName ? String(t.garageName).toLowerCase().includes(q) : false)
    );
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LỊCH SỬ CỨU HỘ & CHI TIÊU</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
      >
        {/* Banner Tổng quan Chi tiêu & Số ca cứu hộ */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summarySubLabel}>TỔNG TIỀN ĐÃ CHI CỨU HỘ</Text>
              <Text style={styles.summaryTotalSpent}>{formatVnd(data.totalSpent)}</Text>
            </View>
            <View style={styles.summaryIconBadge}>
              <Receipt size={24} color="#ffffff" />
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBottomRow}>
            <View style={styles.statPill}>
              <Car size={16} color="#fed7aa" />
              <Text style={styles.statPillLabel}>Đã cứu hộ thành công:</Text>
              <Text style={styles.statPillValue}>{data.completedOrdersCount} ca</Text>
            </View>

            <View style={styles.guaranteeBadge}>
              <ShieldCheck size={14} color="#bbf7d0" />
              <Text style={styles.guaranteeText}>Bảo đảm minh bạch</Text>
            </View>
          </View>
        </View>

        {/* Lịch sử các ca cứu hộ */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <View>
              <Text style={styles.historyTitle}>Lịch sử ca cứu hộ</Text>
              <Text style={styles.historySubTitle}>Danh sách tất cả các đơn cứu hộ bạn đã thanh toán</Text>
            </View>
          </View>

          {/* Ô tìm kiếm */}
          <View style={styles.searchBar}>
            <Search size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo mã đơn, gara hoặc dịch vụ..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
            />
            {!!searchText && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color="#ea580c" />
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Car size={40} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Chưa có lịch sử cứu hộ</Text>
              <Text style={styles.emptyDesc}>Các yêu cầu cứu hộ hoàn thành và đã thanh toán sẽ hiển thị tại đây.</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredTransactions.map((t, idx) => (
                <TouchableOpacity
                  key={t.id || idx}
                  style={styles.orderCard}
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push({
                      pathname: '/customer/payment' as any,
                      params: { id: String(t.id) },
                    })
                  }
                >
                  {/* Card Header: Order Code & Paid Amount */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.orderCodeBadge}>
                      <Text style={styles.orderCodeText}>{t.orderCode}</Text>
                    </View>
                    <Text style={styles.orderAmountText}>{formatVnd(t.amount)}</Text>
                  </View>

                  {/* Service Title */}
                  <View style={styles.serviceRow}>
                    <Wrench size={16} color="#ea580c" style={{ marginTop: 2 }} />
                    <Text style={styles.serviceTitleText}>{t.serviceTitle}</Text>
                  </View>

                  {/* Garage Name */}
                  <Text style={styles.garageNameText}>Tiếp nhận: {t.garageName}</Text>

                  {/* Card Footer: Date, Payment Method & Status */}
                  <View style={styles.cardFooterRow}>
                    <View style={styles.dateRow}>
                      <Clock size={13} color="#64748b" />
                      <Text style={styles.dateText}>{t.createdAtText}</Text>
                    </View>

                    <View style={styles.badgeRow}>
                      <View style={styles.paymentMethodPill}>
                        {t.paymentMethod === 'CASH' ? (
                          <Banknote size={12} color="#16a34a" />
                        ) : (
                          <CreditCard size={12} color="#2563eb" />
                        )}
                        <Text style={styles.paymentMethodText}>
                          {t.paymentMethod === 'CASH' ? 'Tiền mặt' : 'PayOS / QR'}
                        </Text>
                      </View>

                      {t.status === 'CANCELLED' ? (
                        <View style={[styles.statusCompletedBadge, { backgroundColor: '#fee2e2' }]}>
                          <AlertCircle size={12} color="#dc2626" />
                          <Text style={[styles.statusCompletedText, { color: '#dc2626' }]}>Đã huỷ</Text>
                        </View>
                      ) : t.status === 'PAID' || t.status === 'RATED' || t.status === 'COMPLETED' ? (
                        <View style={styles.statusCompletedBadge}>
                          <CheckCircle2 size={12} color="#16a34a" />
                          <Text style={styles.statusCompletedText}>Hoàn tất</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusCompletedBadge, { backgroundColor: '#fff7ed' }]}>
                          <Clock size={12} color="#ea580c" />
                          <Text style={[styles.statusCompletedText, { color: '#ea580c' }]}>Đang xử lý</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ea580c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ea580c',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  scrollContent: {
    backgroundColor: '#f8fafc',
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  summaryBanner: {
    backgroundColor: '#ea580c',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summarySubLabel: {
    fontSize: 12,
    color: '#fed7aa',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryTotalSpent: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  summaryIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
  summaryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statPillLabel: {
    fontSize: 13,
    color: '#fed7aa',
    fontWeight: '600',
  },
  statPillValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '900',
  },
  guaranteeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  guaranteeText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
  historyCard: {
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
  historyHeader: {
    marginBottom: 14,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  historySubTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
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
  listContainer: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCodeBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  orderAmountText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  serviceTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  garageNameText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 10,
    paddingLeft: 22,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentMethodText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  statusCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusCompletedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#16a34a',
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748b',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

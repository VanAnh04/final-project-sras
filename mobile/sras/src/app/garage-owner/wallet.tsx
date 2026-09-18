import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp, CreditCard, DollarSign } from 'lucide-react-native';

export default function GarageWalletScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'withdraw'>('all');

  const transactions = [
    { id: 1, title: 'Cứu hộ xe Honda SH (Đơn #101)', amount: '+350.000 đ', type: 'income', date: 'Hôm nay, 08:30' },
    { id: 2, title: 'Thay lốp Mazda CX-5 (Đơn #98)', amount: '+850.000 đ', type: 'income', date: 'Hôm nay, 07:15' },
    { id: 3, title: 'Phí chiết khấu hệ thống 15%', amount: '-180.000 đ', type: 'expense', date: 'Hôm qua, 18:00' },
    { id: 4, title: 'Rút tiền về Vietcombank (*8899)', amount: '-2.000.000 đ', type: 'withdraw', date: '16/09/2026' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài chính & Ví tiền Gara</Text>
        <Text style={styles.headerSub}>Theo dõi doanh thu, số dư ví và rút tiền</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
          <Text style={styles.balanceAmount}>4.580.000 đ</Text>
          <Text style={styles.balanceSub}>Doanh thu ròng sau khi trừ chiết khấu 15%</Text>

          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Alert.alert('Rút tiền', 'Vui lòng nhập số tiền cần rút về tài khoản ngân hàng liên kết.')}
            >
              <ArrowDownLeft size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>Rút về ngân hàng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => Alert.alert('Nạp ví tín dụng', 'Nạp tiền vào ví tín dụng để duy trì nhận đơn cứu hộ liên tục.')}
            >
              <ArrowUpRight size={18} color="#ea580c" />
              <Text style={[styles.actionBtnText, { color: '#ea580c' }]}>Nạp ví tín dụng</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2 Mini Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Doanh thu tuần này</Text>
            <Text style={styles.statVal}>8.450.000 đ</Text>
            <Text style={styles.statTrend}>+18.5% so với tuần trước</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Ví tín dụng duy trì</Text>
            <Text style={[styles.statVal, { color: '#0284c7' }]}>500.000 đ</Text>
            <Text style={[styles.statTrend, { color: '#16a34a' }]}>Đủ điều kiện nhận đơn</Text>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Lịch sử biến động số dư</Text>
          <View style={styles.txnList}>
            {transactions.map((t) => (
              <View key={t.id} style={styles.txnItem}>
                <View
                  style={[
                    styles.txnIcon,
                    { backgroundColor: t.type === 'income' ? '#ecfdf5' : '#fee2e2' },
                  ]}
                >
                  {t.type === 'income' ? (
                    <ArrowDownLeft size={18} color="#16a34a" />
                  ) : (
                    <ArrowUpRight size={18} color="#dc2626" />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.txnTitle}>{t.title}</Text>
                  <Text style={styles.txnDate}>{t.date}</Text>
                </View>

                <Text
                  style={[
                    styles.txnAmount,
                    { color: t.type === 'income' ? '#16a34a' : '#dc2626' },
                  ]}
                >
                  {t.amount}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  balanceCard: {
    backgroundColor: '#ea580c',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#fed7aa',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 4,
  },
  balanceSub: {
    fontSize: 11,
    color: '#ffedd5',
    marginBottom: 16,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionBtnSecondary: {
    backgroundColor: '#ffffff',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginVertical: 4,
  },
  statTrend: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '700',
  },
  sectionWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  txnList: {
    gap: 10,
  },
  txnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  txnIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  txnDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
});
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, AlertTriangle, CheckCircle2, Clock, Car, Phone, Filter } from 'lucide-react-native';

export default function GarageOrdersScreen() {
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'completed'>('pending');

  const orders = [
    {
      id: 101,
      orderType: 'Khẩn cấp • Cứu hộ xe máy',
      customerName: 'Nguyễn Văn Minh',
      phone: '0912.333.444',
      vehicle: 'Honda SH 150i (59-X1 888.99)',
      issue: 'Chết máy giữa đường, đề không lên điện',
      address: '234 Kha Vạn Cân, P. Linh Trung, TP. Thủ Đức',
      time: '3 phút trước',
      isUrgent: true,
      status: 'pending',
    },
    {
      id: 102,
      orderType: 'Cứu hộ ô tô',
      customerName: 'Hoàng Anh Tuấn',
      phone: '0988.777.666',
      vehicle: 'Mazda CX-5 (51K-123.45)',
      issue: 'Nổ lốp trước bên phụ, cần thay lốp dự phòng',
      address: 'Ngã tư Thủ Đức, Xa Lộ Hà Nội',
      time: '12 phút trước',
      isUrgent: false,
      status: 'pending',
    },
    {
      id: 100,
      orderType: 'Cứu hộ ắc quy',
      customerName: 'Lê Minh Tâm',
      phone: '0977.111.222',
      vehicle: 'Toyota Vios (51H-987.65)',
      issue: 'Hết bình ắc quy tại hầm chung cư',
      address: 'Vinhomes Grand Park, TP. Thủ Đức',
      time: '45 phút trước',
      isUrgent: false,
      status: 'processing',
    },
  ];

  const filteredOrders = orders.filter((o) => o.status === activeTab || (activeTab === 'pending' && o.status === 'pending'));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý Đơn cứu hộ</Text>
        <Text style={styles.headerSub}>Theo dõi và điều phối đơn cứu hộ của Gara</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'pending' && styles.tabBtnTextActive]}>
            Chờ xử lý (2)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'processing' && styles.tabBtnActive]}
          onPress={() => setActiveTab('processing')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'processing' && styles.tabBtnTextActive]}>
            Đang cứu hộ (1)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'completed' && styles.tabBtnTextActive]}>
            Đã hoàn thành (4)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredOrders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.badge, { backgroundColor: order.isUrgent ? '#fee2e2' : '#eff6ff' }]}>
                <Text style={[styles.badgeText, { color: order.isUrgent ? '#dc2626' : '#2563eb' }]}>
                  {order.orderType}
                </Text>
              </View>
              <Text style={styles.timeText}>{order.time}</Text>
            </View>

            <Text style={styles.vehicleText}>{order.vehicle}</Text>
            <Text style={styles.issueText}>Sự cố: {order.issue}</Text>
            <Text style={styles.addressText}>Địa chỉ: {order.address}</Text>

            <View style={styles.customerRow}>
              <Text style={styles.customerName}>Khách: {order.customerName}</Text>
              <Text style={styles.customerPhone}><Phone size={12} color="#ea580c" /> {order.phone}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => Alert.alert('Thông tin đơn cứu hộ', `Khách hàng: ${order.customerName}\nSố điện thoại: ${order.phone}\nĐịa chỉ: ${order.address}\nSự cố: ${order.issue}`)}
              >
                <Text style={styles.detailBtnText}>Xem chi tiết</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => Alert.alert('Thành công', `Đã nhận đơn #${order.id}. Đang kết nối điều phối kỹ thuật viên.`)}
              >
                <Text style={styles.primaryBtnText}>Tiếp nhận & Điều phối</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  tabBtnActive: {
    backgroundColor: '#ea580c',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  issueText: {
    fontSize: 12,
    color: '#475569',
  },
  addressText: {
    fontSize: 12,
    color: '#64748b',
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 2,
  },
  customerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  customerPhone: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  detailBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  primaryBtn: {
    flex: 1.4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Radio, 
  Clock, 
  MapPin, 
  Wrench, 
  Car, 
  Phone, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Calendar,
  Filter
} from 'lucide-react-native';

interface RescueItem {
  id: string;
  code: string;
  status: 'SEARCHING' | 'ACCEPTED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  statusLabel: string;
  serviceType: string;
  vehicleType: string;
  licensePlate: string;
  garageName?: string;
  garagePhone?: string;
  staffName?: string;
  address: string;
  createdAt: string;
  price?: number;
}

const mockRequests: RescueItem[] = [
  {
    id: '1',
    code: 'SRAS-8942',
    status: 'EN_ROUTE',
    statusLabel: 'Thợ đang di chuyển',
    serviceType: 'Kích bình ắc quy & Vá vỏ',
    vehicleType: 'Honda SH 150i',
    licensePlate: '29A1 - 889.99',
    garageName: 'Gara Cứu Hộ 24/7 Thành Phát',
    garagePhone: '0988 123 456',
    staffName: 'Nguyễn Văn Hùng',
    address: 'Số 120 Cầu Giấy, P. Quan Hoa, Cầu Giấy, Hà Nội',
    createdAt: '15 phút trước',
    price: 250000
  },
  {
    id: '2',
    code: 'SRAS-7731',
    status: 'COMPLETED',
    statusLabel: 'Hoàn thành',
    serviceType: 'Cứu hộ chết máy ngập nước',
    vehicleType: 'Mazda CX-5',
    licensePlate: '30F - 678.90',
    garageName: 'Gara Ô tô AutoPro Mỹ Đình',
    garagePhone: '0912 345 678',
    staffName: 'Trần Đình Trọng',
    address: 'Ngã tư Lê Văn Lương - Hoàng Đạo Thúy, Thanh Xuân, Hà Nội',
    createdAt: '12/09/2026 14:30',
    price: 850000
  },
  {
    id: '3',
    code: 'SRAS-6520',
    status: 'COMPLETED',
    statusLabel: 'Hoàn thành',
    serviceType: 'Kéo xe về Gara',
    vehicleType: 'Toyota Vios',
    licensePlate: '29E - 345.12',
    garageName: 'Trung Tâm Cứu Hộ Giao Thông 116',
    garagePhone: '0903 999 888',
    staffName: 'Lê Hoàng Nam',
    address: 'Đại lộ Thăng Long (Km 8), Hà Nội',
    createdAt: '02/09/2026 09:15',
    price: 1200000
  }
];

export default function CustomerRequestsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  const activeList = mockRequests.filter(r => ['SEARCHING', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'].includes(r.status));
  const historyList = mockRequests.filter(r => ['COMPLETED', 'CANCELLED'].includes(r.status));
  const displayList = activeTab === 'ACTIVE' ? activeList : historyList;

  const getStatusColor = (status: RescueItem['status']) => {
    switch (status) {
      case 'EN_ROUTE':
      case 'IN_PROGRESS':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      case 'SEARCHING':
      case 'ACCEPTED':
        return { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' };
      case 'COMPLETED':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
      case 'CANCELLED':
        return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yêu cầu cứu hộ</Text>
        <Text style={styles.headerSubtitle}>Theo dõi & quản lý lịch sử cứu hộ của bạn</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabFilterContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('ACTIVE')}
          style={[
            styles.tabFilterButton,
            activeTab === 'ACTIVE' && styles.tabFilterButtonActive
          ]}
        >
          <Text style={[
            styles.tabFilterText,
            activeTab === 'ACTIVE' && styles.tabFilterTextActive
          ]}>
            Đang thực hiện ({activeList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('HISTORY')}
          style={[
            styles.tabFilterButton,
            activeTab === 'HISTORY' && styles.tabFilterButtonActive
          ]}
        >
          <Text style={[
            styles.tabFilterText,
            activeTab === 'HISTORY' && styles.tabFilterTextActive
          ]}>
            Lịch sử ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Request List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {displayList.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Radio size={36} color="#ea580c" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có yêu cầu cứu hộ nào</Text>
            <Text style={styles.emptySubtitle}>
              Khi bạn gửi tín hiệu cứu hộ khẩn cấp, tiến trình sẽ được cập nhật trực tiếp tại đây.
            </Text>
            <TouchableOpacity 
              onPress={() => router.push('/customer')}
              style={styles.newRequestBtn}
            >
              <Text style={styles.newRequestBtnText}>Tạo yêu cầu cứu hộ</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayList.map((item) => {
            const statusStyle = getStatusColor(item.status);
            const isOngoing = ['SEARCHING', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'].includes(item.status);

            return (
              <View key={item.id} style={styles.requestCard}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.requestCode}>{item.code}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                      <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                        {item.statusLabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.requestTime}>{item.createdAt}</Text>
                </View>

                {/* Service info */}
                <View style={styles.serviceRow}>
                  <View style={styles.serviceIconWrap}>
                    <Wrench size={18} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName}>{item.serviceType}</Text>
                    <Text style={styles.vehicleInfo}>
                      {item.vehicleType} • <Text style={{ fontWeight: '600', color: '#1e293b' }}>{item.licensePlate}</Text>
                    </Text>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#64748b" style={{ marginTop: 2 }} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {item.address}
                  </Text>
                </View>

                {/* Garage info if assigned */}
                {item.garageName && (
                  <View style={styles.garageBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.garageName}>{item.garageName}</Text>
                      {item.staffName && (
                        <Text style={styles.staffName}>Thợ hỗ trợ: {item.staffName}</Text>
                      )}
                    </View>
                    {item.garagePhone && isOngoing && (
                      <TouchableOpacity style={styles.callStaffBtn}>
                        <Phone size={16} color="#ffffff" />
                        <Text style={styles.callStaffBtnText}>Gọi ngay</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Footer price & actions */}
                <View style={styles.cardFooter}>
                  {item.price ? (
                    <View>
                      <Text style={styles.priceLabel}>Chi phí:</Text>
                      <Text style={styles.priceValue}>
                        {item.price.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  ) : <View />}

                  <TouchableOpacity style={styles.detailBtn}>
                    <Text style={styles.detailBtnText}>
                      {isOngoing ? 'Xem tiến độ cứu hộ' : 'Chi tiết đơn'}
                    </Text>
                    <ChevronRight size={16} color="#ea580c" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  tabFilterContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  tabFilterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  tabFilterButtonActive: {
    backgroundColor: '#ea580c',
  },
  tabFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabFilterTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  newRequestBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  newRequestBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  requestTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  serviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  garageBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  garageName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  staffName: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  callStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callStaffBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ea580c',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
});

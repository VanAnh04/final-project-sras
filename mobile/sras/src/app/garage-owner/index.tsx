import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import axiosClient from '../../api/axiosClient';
import {
  Building2,
  LogOut,
  TrendingUp,
  Users,
  Wrench,
  Clock,
  Navigation,
  Phone,
  AlertTriangle,
  Car,
} from 'lucide-react-native';

export default function GarageOwnerHomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>({
    garageName: 'Gara AutoCare Thủ Đức',
    isOnline: true,
    todayRevenue: 1200000,
    revenueGrowthPercent: 12.0,
    availableStaffCount: 3,
    busyStaffCount: 1,
    onlineStaffLocations: [
      { id: 1, name: 'Nguyễn Văn A', phone: '0988.111.222', distance: '1.2 km', isAvailable: true },
      { id: 2, name: 'Trần Văn B', phone: '0988.333.444', distance: '2.4 km', isAvailable: true },
      { id: 3, name: 'Lê Hoàng C', phone: '0988.555.666', distance: '3.8 km', isAvailable: false },
    ],
    pendingOrders: [
      {
        id: 101,
        orderType: 'Khẩn cấp • Cứu hộ xe máy',
        customerVehicle: 'Honda SH 150i (59-X1 888.99)',
        issueDescription: 'Chết máy giữa đường, đề không lên điện',
        timeAgo: 'Cách 2.1 km • 3 phút trước',
        isUrgent: true,
      },
      {
        id: 102,
        orderType: 'Cứu hộ ô tô',
        customerVehicle: 'Mazda CX-5 (51K-123.45)',
        issueDescription: 'Nổ lốp trước bên phụ, cần thay lốp dự phòng',
        timeAgo: 'Cách 4.5 km • 12 phút trước',
        isUrgent: false,
      },
    ],
    recentServices: [
      {
        id: 201,
        serviceName: 'Thay ắc quy khô GS 45Ah',
        licensePlate: '51H-987.65',
        technicianName: 'Nguyễn Văn A',
        price: '1.250.000 đ',
        status: 'Hoàn thành',
      },
      {
        id: 202,
        serviceName: 'Vá lốp ô tô lưu động',
        licensePlate: '59F-345.12',
        technicianName: 'Trần Văn B',
        price: '180.000 đ',
        status: 'Hoàn thành',
      },
    ],
  });

  const fetchDashboard = async () => {
    try {
      const res: any = await axiosClient.get('/garages/me/dashboard');
      if (res?.data) {
        setDashboardData(res.data);
        setIsOnline(Boolean(res.data.isOnline));
      }
    } catch (e) {
      console.warn('Using local/cached dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleOnline = async (val: boolean) => {
    setIsOnline(val);
    try {
      await axiosClient.put('/garages/me/status', { isOnline: val });
    } catch (e) {
      console.warn('Could not sync online status', e);
    }
  };

  const handleAcceptOrder = (orderId: number) => {
    Alert.alert(
      'Nhận đơn thành công!',
      `Gara đã tiếp nhận đơn cứu hộ #${orderId}. Vui lòng điều phối kỹ thuật viên xử lý.`
    );
    setDashboardData((prev: any) => ({
      ...prev,
      pendingOrders: prev.pendingOrders.filter((o: any) => o.id !== orderId),
    }));
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header Bar (Matching Image 3) */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrap}>
            <Building2 size={22} color="#ea580c" />
          </View>
          <View>
            <Text style={styles.garageName}>{dashboardData.garageName || 'Gara AutoCare Thủ Đức'}</Text>
            <View style={styles.onlineBadgeRow}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#16a34a' : '#94a3b8' }]} />
              <Text style={styles.onlineStatusText}>
                {isOnline ? 'Đang mở cửa nhận đơn' : 'Đang tạm dừng nhận đơn'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.toggleWrap}>
            <Text style={styles.toggleLabel}>{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#cbd5e1', true: '#86efac' }}
              thumbColor={isOnline ? '#16a34a' : '#f1f5f9'}
            />
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
            <LogOut size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDashboard();
            }}
            colors={['#ea580c']}
          />
        }
      >
        {/* Greeting Banner */}
        <View style={styles.greetingBanner}>
          <Text style={styles.greetingTitle}>Chào buổi sáng, garage của bạn đang hoạt động tốt!</Text>
          <Text style={styles.greetingSubtitle}>
            Hệ thống đang tích cực kết nối với các khách hàng gặp sự cố trong bán kính 15km.
          </Text>
        </View>

        {/* 3 Metric Cards (Matching Image 3) */}
        <View style={styles.kpiRow}>
          {/* Revenue */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Doanh thu hôm nay</Text>
            <Text style={styles.kpiValue}>
              {Number(dashboardData.todayRevenue || 1200000).toLocaleString('vi-VN')} đ
            </Text>
            <View style={styles.kpiTrend}>
              <TrendingUp size={12} color="#16a34a" />
              <Text style={styles.kpiTrendText}>
                +{dashboardData.revenueGrowthPercent || 12}% so với hôm qua
              </Text>
            </View>
          </View>

          {/* Rescues Status */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Trạng thái cứu hộ</Text>
            <Text style={[styles.kpiValue, { color: '#0284c7' }]}>5 cuốc</Text>
            <Text style={styles.kpiSubText}>1 Đang xử lý • 4 Hoàn thành</Text>
          </View>
        </View>

        {/* Staff availability banner */}
        <View style={styles.staffSummaryCard}>
          <View style={styles.staffSummaryLeft}>
            <Users size={20} color="#ea580c" />
            <Text style={styles.staffSummaryTitle}>Nhân viên trực ca:</Text>
          </View>
          <View style={styles.staffPills}>
            <Text style={styles.pillFree}>{dashboardData.availableStaffCount || 3} Rảnh (Sẵn sàng)</Text>
            <Text style={styles.pillBusy}>{dashboardData.busyStaffCount || 1} Bận (Đang cứu hộ)</Text>
          </View>
        </View>

        {/* Section: Bản đồ thợ cứu hộ (Live) - Matching Image 3 */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Navigation size={18} color="#ea580c" />
              <Text style={styles.sectionTitle}>Bản đồ thợ cứu hộ (Live)</Text>
            </View>
            <Text style={styles.sectionBadge}>
              {dashboardData.onlineStaffLocations.length} Kỹ thuật viên
            </Text>
          </View>

          {/* Visual Map Simulation Container */}
          <View style={styles.mapContainer}>
            <View style={styles.mapGridLines}>
              <View style={styles.mapGridCell} />
              <View style={styles.mapGridCell} />
              <View style={styles.mapGridCell} />
            </View>

            {/* Garage Center Pin */}
            <View style={[styles.mapPin, { top: '40%', left: '48%' }]}>
              <View style={styles.garageCenterPin}>
                <Building2 size={16} color="#ffffff" />
              </View>
              <Text style={styles.pinLabel}>Gara</Text>
            </View>

            {/* Tech 1 Pin */}
            <View style={[styles.mapPin, { top: '22%', left: '26%' }]}>
              <View style={[styles.techPin, { backgroundColor: '#16a34a' }]}>
                <Wrench size={12} color="#ffffff" />
              </View>
              <Text style={styles.pinLabel}>A (1.2km)</Text>
            </View>

            {/* Tech 2 Pin */}
            <View style={[styles.mapPin, { top: '65%', left: '72%' }]}>
              <View style={[styles.techPin, { backgroundColor: '#16a34a' }]}>
                <Wrench size={12} color="#ffffff" />
              </View>
              <Text style={styles.pinLabel}>B (2.4km)</Text>
            </View>

            {/* Tech 3 Pin (Busy) */}
            <View style={[styles.mapPin, { top: '28%', left: '78%' }]}>
              <View style={[styles.techPin, { backgroundColor: '#ea580c' }]}>
                <Car size={12} color="#ffffff" />
              </View>
              <Text style={styles.pinLabel}>C (Đang làm)</Text>
            </View>
          </View>

          {/* Technician Cards List */}
          <View style={styles.techList}>
            {dashboardData.onlineStaffLocations.map((tech: any) => (
              <View key={tech.id} style={styles.techItem}>
                <View style={styles.techAvatar}>
                  <Text style={styles.techAvatarText}>{tech.name.split(' ').pop()?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.techName}>{tech.name}</Text>
                  <Text style={styles.techPhone}>
                    <Phone size={10} color="#94a3b8" /> {tech.phone} • {tech.distance}
                  </Text>
                </View>
                <View
                  style={[
                    styles.techStatusBadge,
                    { backgroundColor: tech.isAvailable ? '#ecfdf5' : '#fff7ed' },
                  ]}
                >
                  <Text
                    style={[
                      styles.techStatusText,
                      { color: tech.isAvailable ? '#16a34a' : '#ea580c' },
                    ]}
                  >
                    {tech.isAvailable ? 'Sẵn sàng' : 'Đang cứu hộ'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section: Đơn cứu hộ đang chờ xử lý (Matching Image 3) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <AlertTriangle size={18} color="#ea580c" />
              <Text style={styles.sectionTitle}>Đơn cứu hộ đang chờ xử lý</Text>
            </View>
            <Text style={styles.urgentBadge}>
              {dashboardData.pendingOrders.length} đơn mới
            </Text>
          </View>

          <View style={styles.ordersList}>
            {dashboardData.pendingOrders.map((order: any) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View
                    style={[
                      styles.orderTypeTag,
                      { backgroundColor: order.isUrgent ? '#fee2e2' : '#eff6ff' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderTypeText,
                        { color: order.isUrgent ? '#dc2626' : '#2563eb' },
                      ]}
                    >
                      {order.orderType}
                    </Text>
                  </View>
                  <Text style={styles.orderTime}>{order.timeAgo}</Text>
                </View>

                <Text style={styles.vehicleName}>{order.customerVehicle}</Text>
                <Text style={styles.issueText}>{order.issueDescription}</Text>

                <View style={styles.orderActions}>
                  <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={() =>
                      Alert.alert(
                        'Chi tiết đơn cứu hộ',
                        `${order.customerVehicle}\nSự cố: ${order.issueDescription}\nThời gian: ${order.timeAgo}`
                      )
                    }
                  >
                    <Text style={styles.detailBtnText}>Xem chi tiết</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptOrder(order.id)}
                  >
                    <Text style={styles.acceptBtnText}>Nhận đơn cứu hộ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section: Lịch sử dịch vụ gần đây (Matching Image 3) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Clock size={18} color="#ea580c" />
              <Text style={styles.sectionTitle}>Lịch sử dịch vụ gần đây</Text>
            </View>
          </View>

          <View style={styles.historyList}>
            {dashboardData.recentServices.map((item: any) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <Wrench size={18} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyServiceName}>{item.serviceName}</Text>
                  <Text style={styles.historyMeta}>
                    Biển số: {item.licensePlate} • KTV: {item.technicianName}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.historyPrice}>{item.price}</Text>
                  <Text style={styles.historyStatus}>{item.status}</Text>
                </View>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  garageName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  onlineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  onlineStatusText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  greetingBanner: {
    backgroundColor: '#fff7ed',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  greetingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#c2410c',
  },
  greetingSubtitle: {
    fontSize: 12,
    color: '#9a3412',
    lineHeight: 18,
    marginTop: 4,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginVertical: 4,
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiTrendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  kpiSubText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  staffSummaryCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  staffSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staffSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  staffPills: {
    flexDirection: 'row',
    gap: 6,
  },
  pillFree: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillBusy: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgentBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mapContainer: {
    height: 160,
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  mapGridLines: {
    flex: 1,
    flexDirection: 'row',
  },
  mapGridCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.4)',
  },
  mapPin: {
    position: 'absolute',
    alignItems: 'center',
  },
  garageCenterPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  techPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  pinLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  techList: {
    gap: 8,
  },
  techItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  techAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ea580c',
  },
  techName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  techPhone: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  techStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  techStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderTypeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  orderTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  issueText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  detailBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  acceptBtn: {
    flex: 1.4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyServiceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  historyMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  historyPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  historyStatus: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '700',
  },
});
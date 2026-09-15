import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AlertTriangle, 
  Car, 
  Wrench, 
  MapPin, 
  Clock, 
  Sparkles,
  PhoneCall,
  ShieldCheck,
  ChevronRight,
  Bell
} from 'lucide-react-native';

export default function CustomerHome() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Profile Bar */}
        <View style={styles.headerCard}>
          <TouchableOpacity 
            onPress={() => router.push('/customer/profile')}
            style={styles.profileSection}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              {user?.avatarUrl ? (
                <Image 
                  source={{ uri: user.avatarUrl }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'K'}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.greetingText}>Xin chào,</Text>
              <Text style={styles.userNameText}>{user?.fullName || 'Khách hàng'}</Text>
              <Text style={styles.userPhoneText}>{user?.phone || 'SRAS Member'}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/customer/requests')}
            >
              <Bell size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SOS Emergency Callout Button */}
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => router.push('/customer/map')}
          style={styles.sosButton}
        >
          <View style={styles.sosIconCircle}>
            <AlertTriangle size={36} color="#ffffff" />
          </View>
          <Text style={styles.sosTitle}>
            GỌI CỨU HỘ KHẨN CẤP
          </Text>
          <Text style={styles.sosSubtitle}>
            Chạm để định vị và phát tín hiệu cứu hộ tức thì
          </Text>
          <View style={styles.sosBadge}>
            <ShieldCheck size={14} color="#ffffff" />
            <Text style={styles.sosBadgeText}>Hệ thống trực ban 24/7 • Có mặt 15-30p</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Services Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dịch vụ cứu hộ & sửa chữa</Text>
        </View>

        <View style={styles.servicesGrid}>
          <TouchableOpacity 
            onPress={() => router.push('/customer/map')}
            style={styles.serviceCard}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Car size={24} color="#2563eb" />
            </View>
            <Text style={styles.serviceName}>Cứu hộ Ô tô</Text>
            <Text style={styles.serviceDesc}>Kéo xe, kích bình, thay lốp</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/customer/map')}
            style={styles.serviceCard}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Wrench size={24} color="#059669" />
            </View>
            <Text style={styles.serviceName}>Cứu hộ Xe máy</Text>
            <Text style={styles.serviceDesc}>Vá lốp, sửa khóa, tiếp xăng</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/customer/map')}
            style={styles.serviceCard}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconWrap, { backgroundColor: '#fef3c7' }]}>
              <MapPin size={24} color="#d97706" />
            </View>
            <Text style={styles.serviceName}>Tìm Gara gần nhất</Text>
            <Text style={styles.serviceDesc}>Xem đánh giá, bảng giá</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/customer/map')}
            style={styles.serviceCard}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconWrap, { backgroundColor: '#fdf2f8' }]}>
              <Sparkles size={24} color="#db2777" />
            </View>
            <Text style={styles.serviceName}>Tư vấn sự cố AI</Text>
            <Text style={styles.serviceDesc}>Chẩn đoán hư hỏng tức thì</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Rescue Orders */}
        <View style={styles.recentOrdersCard}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Đơn cứu hộ gần đây</Text>
            <TouchableOpacity 
              onPress={() => router.push('/customer/requests')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <ChevronRight size={14} color="#ea580c" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/customer/requests')}
            activeOpacity={0.7}
            style={styles.activeOrderItem}
          >
            <View style={styles.orderLeft}>
              <View style={styles.activeDot} />
              <View>
                <Text style={styles.orderCode}>SRAS-8942 • Kích bình ắc quy & Vá vỏ</Text>
                <Text style={styles.orderGarage}>Gara Cứu Hộ 24/7 Thành Phát</Text>
              </View>
            </View>
            <View style={styles.orderStatusBadge}>
              <Text style={styles.orderStatusText}>Đang đến (15p)</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Emergency Hotline Support */}
        <View style={styles.hotlineBanner}>
          <View style={styles.hotlineIcon}>
            <PhoneCall size={22} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hotlineTitle}>Tổng đài hỗ trợ khẩn cấp</Text>
            <Text style={styles.hotlineNumber}>1900 6868 (Miễn phí 24/7)</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  headerCard: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  profileSection: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    flex: 1,
  },
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#ea580c', 
    alignItems: 'center', 
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  greetingText: { 
    fontSize: 12, 
    color: '#64748b' 
  },
  userNameText: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#0f172a' 
  },
  userPhoneText: { 
    fontSize: 11, 
    color: '#ea580c',
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  sosButton: {
    backgroundColor: '#ea580c',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  sosIconCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: 'rgba(255, 255, 255, 0.25)', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 10
  },
  sosTitle: { 
    color: '#ffffff', 
    fontSize: 20, 
    fontWeight: '800', 
    letterSpacing: 0.5 
  },
  sosSubtitle: { 
    color: '#ffedd5', 
    fontSize: 12, 
    textAlign: 'center', 
    marginTop: 4,
  },
  sosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  sosBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#0f172a' 
  },
  servicesGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginBottom: 18 
  },
  serviceCard: { 
    flex: 1, 
    minWidth: '47%', 
    backgroundColor: '#ffffff', 
    padding: 14, 
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 6
  },
  serviceIconWrap: { 
    width: 42, 
    height: 42, 
    borderRadius: 21, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  serviceName: { 
    fontWeight: '700', 
    color: '#1e293b', 
    fontSize: 13 
  },
  serviceDesc: { 
    color: '#94a3b8', 
    fontSize: 11, 
    textAlign: 'center' 
  },
  recentOrdersCard: { 
    backgroundColor: '#ffffff', 
    padding: 14, 
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  recentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  recentTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#0f172a' 
  },
  seeAllText: { 
    fontSize: 12, 
    color: '#ea580c',
    fontWeight: '600',
  },
  activeOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  orderCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderGarage: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  orderStatusBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  orderStatusText: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: '700',
  },
  hotlineBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hotlineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotlineTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  hotlineNumber: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
});

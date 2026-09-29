import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Switch,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Radio, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import axiosClient from '../../api/axiosClient';

const { width, height } = Dimensions.get('window');

export default function GarageStaffHomeScreen() {
  const { user } = useAuth();

  // State
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [staffData, setStaffData] = useState<any>({
    fullName: user?.fullName || 'NGUYỄN VĂN BÌNH',
    garageName: 'Gara Cứu Hộ',
    currentAddress: 'Đang xác định vị trí...',
    todayCompletedJobs: 3,
    todayEarnings: 900000,
    isOnline: true,
  });

  // Tải dữ liệu thợ từ backend
  const fetchDashboardData = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/garages/staff/me');
      if (res?.data) {
        setStaffData((prev: any) => ({
          ...prev,
          ...res.data,
          fullName: res.data.fullName || user?.fullName || 'NGUYỄN VĂN BÌNH',
          garageName: res.data.garageName || 'Gara Cứu Hộ',
          currentAddress: res.data.garageAddress || res.data.currentAddress || 'Đang cập nhật vị trí',
        }));
        if (res.data.isOnline !== undefined) {
          setIsOnline(res.data.isOnline);
        }
      }
    } catch (e: any) {
      console.log('Using default staff dashboard data:', e.message);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Bật/tắt trạng thái nhận đơn
  const handleToggleOnline = async (value: boolean) => {
    setIsOnline(value);
    try {
      await axiosClient.put('/garages/staff/me/status', { isOnline: value });
    } catch (e: any) {
      console.log('Error updating online status:', e.message);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '0đ';
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* ── 1. TOP HEADER BAR ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{
              uri:
                user?.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            }}
            style={styles.avatar}
          />
          <View style={styles.nameBlock}>
            <Text style={styles.staffName} numberOfLines={1}>
              {(staffData.fullName || user?.fullName || 'NGUYỄN VĂN BÌNH').toUpperCase()}
            </Text>
            <Text style={styles.garageName} numberOfLines={1}>
              Nhân viên {staffData.garageName || 'gara Bình Minh'}
            </Text>
          </View>
        </View>

        {/* Nút radar signal bên phải */}
        <TouchableOpacity style={styles.signalBtn} activeOpacity={0.8}>
          <Radio size={20} color="#ea580c" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* ── 2. CARD "SẴN SÀNG NHẬN ĐƠN" ── */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>Sẵn sàng nhận đơn</Text>
          <Text style={styles.toggleSub}>
            {isOnline ? 'Bạn đang trực tuyến' : 'Bạn đang ngoại tuyến'}
          </Text>
        </View>

        <Switch
          value={isOnline}
          onValueChange={handleToggleOnline}
          trackColor={{ false: '#e2e8f0', true: '#ea580c' }}
          thumbColor="#ffffff"
          ios_backgroundColor="#e2e8f0"
          style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] } : {}}
        />
      </View>

      {/* ── 3. KHU VỰC BẢN ĐỒ RADAR TRUNG TÂM ── */}
      <View style={styles.mapContainer}>
        <LinearGradient
          colors={['#1c3830', '#254d42', '#336557', '#498573', '#68a994']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.mapGradient}
        >
          {/* Vòng định vị GPS phát sáng tỏa sóng ở giữa */}
          <View style={styles.radarCenterAnchor}>
            {/* Vòng ngoài cùng */}
            <View style={styles.radarRingOuter} />
            {/* Vòng giữa */}
            <View style={styles.radarRingMiddle} />
            {/* Điểm tâm màu cam viền trắng */}
            <View style={styles.radarPinCenter} />
          </View>

          {/* Thẻ nổi hiển thị địa chỉ hiện tại ở đáy bản đồ */}
          <View style={styles.locationPill}>
            <View style={styles.locationIconWrap}>
              <MapPin size={22} color="#ea580c" strokeWidth={2.4} />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>Vị trí hiện tại</Text>
              <Text style={styles.locationAddress} numberOfLines={1}>
                {staffData.currentAddress || '12 Đường Nguyễn Trãi, Thanh Xuân, Hà Nội'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ── 4. THỐNG KÊ HIỆU SUẤT HÔM NAY (2 CỘT) ── */}
      <View style={styles.statsRow}>
        {/* Cột 1: Hoàn thành hôm nay */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>HOÀN THÀNH HÔM NAY</Text>
          <Text style={styles.statsValueLeft}>
            {String(staffData.todayCompletedJobs ?? 3).padStart(2, '0')}
          </Text>
        </View>

        {/* Cột 2: Thu nhập hôm nay */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>THU NHẬP HÔM NAY</Text>
          <Text style={styles.statsValueRight}>
            {formatCurrency(staffData.todayEarnings ?? 900000)}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
  },

  /* 1. Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#cbd5e1',
    borderWidth: 2,
    borderColor: '#ffedd5',
  },
  nameBlock: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  garageName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ea580c',
    marginTop: 2,
  },
  signalBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 2. Toggle Card */
  toggleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleInfo: {
    gap: 3,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  toggleSub: {
    fontSize: 12,
    color: '#64748b',
  },

  /* 3. Central Radar Map Card */
  mapContainer: {
    flex: 1,
    marginVertical: 14,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  mapGradient: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCenterAnchor: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(234, 88, 12, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(234, 88, 12, 0.25)',
  },
  radarRingMiddle: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(234, 88, 12, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(234, 88, 12, 0.45)',
  },
  radarPinCenter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ea580c',
    borderWidth: 5,
    borderColor: '#ffffff',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },

  /* Floating Location Pill */
  locationPill: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  locationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },

  /* 4. Stats Row */
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.2,
  },
  statsValueLeft: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  statsValueRight: {
    fontSize: 23,
    fontWeight: '900',
    color: '#ea580c',
    marginTop: 4,
  },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Phone, MapPin, Clock, Lock, LogOut, ChevronRight, ShieldCheck, HelpCircle } from 'lucide-react-native';

export default function GarageSettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cài đặt Gara</Text>
        <Text style={styles.headerSub}>Quản lý thông tin cơ sở và tài khoản quản trị</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Building2 size={24} color="#ea580c" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.garageName}>Gara AutoCare Thủ Đức</Text>
            <Text style={styles.ownerName}>Chủ cơ sở: {user?.fullName || 'Nguyễn Văn Thành'}</Text>
            <Text style={styles.phone}>SĐT: {user?.phone || '0988.111.222'}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin hoạt động</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Thông tin Gara', 'Địa chỉ: 123 Võ Văn Ngân, TP. Thủ Đức\nHotline: 0988.111.222')}
          >
            <View style={styles.menuLeft}>
              <Building2 size={18} color="#64748b" />
              <Text style={styles.menuText}>Hồ sơ & Địa chỉ cơ sở</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Thời gian mở cửa', 'Hiện tại: 24/7 (Sẵn sàng nhận đơn khẩn cấp)')}
          >
            <View style={styles.menuLeft}>
              <Clock size={18} color="#64748b" />
              <Text style={styles.menuText}>Thời gian phục vụ & Bán kính nhận đơn</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Bảo mật & Tài khoản</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Đổi mật khẩu', 'Chức năng đổi mật khẩu quản trị Gara.')}
          >
            <View style={styles.menuLeft}>
              <Lock size={18} color="#64748b" />
              <Text style={styles.menuText}>Đổi mật khẩu</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Hỗ trợ đối tác', 'Hotline hỗ trợ đối tác Gara SRAS: 1900 6868 (Phím 2)')}
          >
            <View style={styles.menuLeft}>
              <HelpCircle size={18} color="#64748b" />
              <Text style={styles.menuText}>Trợ giúp & Hỗ trợ kỹ thuật</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#dc2626" />
          <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>
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
  profileCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  garageName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  ownerName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  phone: {
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '700',
    marginTop: 1,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },
});
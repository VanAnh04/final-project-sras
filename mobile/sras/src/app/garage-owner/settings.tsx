import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Image, 
  Modal, 
  Switch, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useGarageSettings } from '../../contexts/GarageSettingsContext';
import { authApi } from '../../api/authApi';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';
import { garageApi } from '../../api/garageApi';
import CustomAlert, { AlertType } from '../../components/ui/CustomAlert';
import AvatarPickerModal from '../../components/ui/AvatarPickerModal';
import { resolveUserAvatar } from '../../utils/avatar';
import { 
  Building2, 
  Phone, 
  LogOut, 
  ChevronRight, 
  ShieldCheck, 
  HelpCircle, 
  Pencil, 
  Camera, 
  X, 
  User, 
  Bell, 
  Users, 
  Zap, 
  Star, 
  CheckCircle2,
  ArrowLeft,
  Lock,
  Tag
} from 'lucide-react-native';

export default function GarageSettingsScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const { autoAccept, setAutoAccept } = useGarageSettings();

  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const isReceivingOrders = autoAccept;

  const [garageInfo, setGarageInfo] = useState<{
    name: string;
    address: string;
    phone: string;
    status: string;
  }>({
    name: 'Gara Cứu Hộ',
    address: 'Đang tải địa chỉ cơ sở...',
    phone: user?.phone || '',
    status: 'Đang hoạt động',
  });

  const fetchGarage = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/garages/me');
      if (res?.data) {
        setGarageInfo({
          name: res.data.name || 'Gara Cứu Hộ',
          address: res.data.address || 'Chưa cập nhật địa chỉ cơ sở',
          phone: res.data.phone || user?.phone || '',
          status: res.data.status === 'APPROVED' ? 'Đã xác thực & cấp phép hoạt động' : 'Đang hoạt động',
        });
      }
    } catch (e: any) {
      console.log('Error fetching garage owner info:', e.message);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchGarage();
    }, [fetchGarage])
  );

  // Custom Alert state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (
    title: string, 
    message: string, 
    type: AlertType = 'info', 
    confirmText?: string,
    cancelText?: string,
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  const handleLogout = () => {
    showAlert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Quản trị Gara không?',
      'warning',
      'Đăng xuất',
      'Hủy',
      async () => {
        // Tắt trạng thái nhận đơn trước khi đăng xuất (best-effort, không chặn logout nếu lỗi mạng).
        try {
          await garageApi.setOnline(false);
        } catch {}
        await logout();
      }
    );
  };

  const handleUpdateAvatar = async (newAvatarUrl: string) => {
    try {
      if (user) {
        await authApi.updateProfile({
          userId: user.id,
          fullName: user.fullName || '',
          phone: user.phone || '',
          avatarUrl: newAvatarUrl,
        });
        await updateUser({ avatarUrl: newAvatarUrl });
        showAlert('Thành công', 'Ảnh đại diện của bạn đã được cập nhật thành công!', 'success');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Không thể cập nhật ảnh đại diện.';
      showAlert('Lỗi', msg, 'error');
    }
  };

  const openEditProfile = () => {
    setShowAvatarMenu(false);
    router.push('/garage-owner/edit-profile' as any);
  };

  const avatarUri = resolveUserAvatar(user?.avatarUrl, user?.fullName || 'Chủ cơ sở Gara');
  const displayName = user?.fullName || 'Chủ cơ sở Gara';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Navigation Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.replace('/garage-owner')}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#334155" />
          </TouchableOpacity>

          <View style={styles.logoBadge}>
            <Building2 size={18} color="#ea580c" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.logoTitle}>SRAS GARAGE</Text>
            <Text style={styles.logoSubtitle}>HỆ THỐNG QUẢN TRỊ</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.bellButton}
          onPress={() => router.push('/garage-owner/orders')}
          activeOpacity={0.75}
        >
          <Bell size={20} color="#ea580c" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            {/* Avatar with Edit Badge & Online Dot */}
            <TouchableOpacity 
              style={styles.avatarContainer}
              activeOpacity={0.85}
              onPress={() => setShowAvatarMenu(true)}
            >
              <Image
                source={{ uri: resolveFileUrl(avatarUri) }}
                style={styles.avatarImage}
              />
              <View style={styles.editBadge}>
                <Pencil size={13} color="#ffffff" strokeWidth={2.5} />
              </View>
              <View style={styles.onlineDot} />
            </TouchableOpacity>

            {/* User Main Details */}
            <View style={styles.heroInfo}>
              <Text style={styles.userNameText} numberOfLines={1}>
                {displayName}
              </Text>
              
              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Building2 size={12} color="#ea580c" strokeWidth={2.5} />
                  <Text style={styles.roleBadgeText}>Admin Gara</Text>
                </View>

                <View style={styles.ratingBadge}>
                  <Star size={12} color="#d97706" fill="#d97706" />
                  <Text style={styles.ratingBadgeText}>4.9 / 5.0</Text>
                </View>
              </View>

              <Text style={styles.phoneText}>
                📞 {user?.phone || '0988.111.222'}
              </Text>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>24/7</Text>
              <Text style={styles.metricLabel}>Thời gian trực</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>15 km</Text>
              <Text style={styles.metricLabel}>Bán kính nhận</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>15%</Text>
              <Text style={styles.metricLabel}>Chiết khấu</Text>
            </View>
          </View>
        </View>

        {/* Dispatch Mode Toggle Card */}
        <View style={styles.dispatchCard}>
          <View style={styles.dispatchLeft}>
            <View style={[styles.dispatchIconWrap, isReceivingOrders ? styles.dispatchIconActive : styles.dispatchIconInactive]}>
              <Zap size={20} color={isReceivingOrders ? '#ea580c' : '#94a3b8'} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.dispatchTitle}>Tự động nhận đơn cứu hộ</Text>
                <View style={[styles.statusPill, isReceivingOrders ? styles.statusPillActive : styles.statusPillInactive]}>
                  <Text style={[styles.statusPillText, isReceivingOrders ? styles.statusTextActive : styles.statusTextInactive]}>
                    {isReceivingOrders ? 'BẬT' : 'TẮT'}
                  </Text>
                </View>
              </View>
              <Text style={styles.dispatchSubtitle}>
                {isReceivingOrders ? 'Hệ thống đang sẵn sàng điều phối đơn mới' : 'Đang tạm dừng nhận các yêu cầu cứu hộ mới'}
              </Text>
            </View>
          </View>

          <Switch
            value={isReceivingOrders}
            onValueChange={(val) => {
              setAutoAccept(val);
              showAlert(
                val ? 'Đã bật nhận đơn' : 'Đã tạm dừng nhận đơn',
                val 
                  ? 'Gara của bạn hiện đang ở trạng thái trực chiến và sẽ nhận được thông báo cứu hộ tức thì.' 
                  : 'Gara của bạn đã tạm dừng nhận đơn mới. Các đơn đang xử lý vẫn tiếp tục bình thường.',
                val ? 'success' : 'info'
              );
            }}
            trackColor={{ false: '#e2e8f0', true: '#ffedd5' }}
            thumbColor={isReceivingOrders ? '#ea580c' : '#94a3b8'}
          />
        </View>

        {/* Group 1: Vận hành & Cơ sở Gara */}
        <View style={styles.menuCard}>
          <Text style={styles.groupTitle}>Vận hành & Cơ sở Gara</Text>

          {/* Hồ sơ Gara */}
          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => router.push('/garage-owner/garage-profile')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff7ed' }]}>
              <Building2 size={19} color="#ea580c" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Hồ sơ & Cấu hình dịch vụ</Text>
              <Text style={styles.menuSubLabel} numberOfLines={1}>
                {garageInfo.name} • {garageInfo.address}
              </Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Quản lý Nhân viên */}
          <TouchableOpacity 
            style={[styles.menuRow, styles.lastMenuRow]} 
            activeOpacity={0.7}
            onPress={() => router.push('/garage-owner/staff')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <Users size={19} color="#2563eb" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Đội ngũ Kỹ thuật & Cứu hộ</Text>
              <Text style={styles.menuSubLabel}>Phân công & quản lý nhân viên trực</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Group 2: Tài khoản & Bảo mật */}
        <View style={styles.menuCard}>
          <Text style={styles.groupTitle}>Tài khoản & Bảo mật</Text>

          {/* Chỉnh sửa hồ sơ */}
          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => router.push('/garage-owner/edit-profile' as any)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff7ed' }]}>
              <User size={19} color="#ea580c" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Chỉnh sửa thông tin cá nhân</Text>
              <Text style={styles.menuSubLabel}>Họ tên, số điện thoại, email liên hệ</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Đổi mật khẩu */}
          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => router.push('/garage-owner/change-password')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff7ed' }]}>
              <Lock size={19} color="#ea580c" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Đổi mật khẩu bảo mật</Text>
              <Text style={styles.menuSubLabel}>Cập nhật mã bảo vệ tài khoản của bạn</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Bảo mật & Chứng chỉ */}
          <TouchableOpacity 
            style={[styles.menuRow, styles.lastMenuRow]} 
            activeOpacity={0.7}
            onPress={() => showAlert('Trạng thái xác thực', 'Tài khoản của bạn đã được chứng thực cấp quyền Quản trị Đối tác Cứu hộ SRAS với cấp độ bảo mật cao nhất.', 'success')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#f0fdf4' }]}>
              <ShieldCheck size={19} color="#16a34a" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Chứng nhận Đối tác xác thực</Text>
              <Text style={styles.menuSubLabel}>Đã được SRAS chứng thực an toàn</Text>
            </View>
            <CheckCircle2 size={18} color="#16a34a" />
          </TouchableOpacity>
        </View>

        {/* Group 3: Hệ thống & Trợ giúp */}
        <View style={styles.menuCard}>
          <Text style={styles.groupTitle}>Hệ thống & Hỗ trợ</Text>

          {/* Hỗ trợ đối tác */}
          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => showAlert('Tổng đài hỗ trợ 24/7', 'Hotline hỗ trợ kỹ thuật và vận hành dành riêng cho Đối tác Gara SRAS:\n📞 1900 6868 (Phím 2)\n✉️ Email: support-garage@sras.vn', 'info')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <HelpCircle size={19} color="#2563eb" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Tổng đài Hỗ trợ Đối tác 24/7</Text>
              <Text style={styles.menuSubLabel}>Hotline: 1900 6868 (Phím 2)</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Đăng xuất */}
          <TouchableOpacity 
            style={[styles.menuRow, styles.lastMenuRow]} 
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fef2f2' }]}>
              <LogOut size={19} color="#dc2626" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuLabel, { color: '#dc2626' }]}>Đăng xuất tài khoản</Text>
              <Text style={styles.menuSubLabel}>Thoát phiên đăng nhập trên thiết bị này</Text>
            </View>
            <ChevronRight size={18} color="#fca5a5" />
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerBrand}>SRAS PARTNER SYSTEM</Text>
          <Text style={styles.footerText}>
            Phiên bản 1.0.0 (Build 2026) • Đồng hành an toàn trên mọi nẻo đường
          </Text>
        </View>

      </ScrollView>

      {/* Avatar Action Modal */}
      <Modal
        visible={showAvatarMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAvatarMenu(false)}
      >
        <TouchableOpacity 
          style={styles.avatarModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarMenu(false)}
        >
          <View style={styles.avatarModalContent}>
            <View style={styles.avatarModalHeader}>
              <Text style={styles.avatarModalTitle}>Ảnh đại diện</Text>
              <TouchableOpacity onPress={() => setShowAvatarMenu(false)} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.avatarActionItem}
              onPress={() => {
                setShowAvatarMenu(false);
                setShowAvatarPicker(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.modalActionIcon, { backgroundColor: '#fff7ed' }]}>
                <Camera size={20} color="#ea580c" />
              </View>
              <View>
                <Text style={styles.avatarActionText}>Chọn ảnh mới</Text>
                <Text style={styles.avatarActionSubText}>Từ thư viện hoặc bộ sưu tập mẫu</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.avatarActionItem}
              onPress={openEditProfile}
              activeOpacity={0.7}
            >
              <View style={[styles.modalActionIcon, { backgroundColor: '#eff6ff' }]}>
                <Pencil size={20} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.avatarActionText}>Chỉnh sửa thông tin hồ sơ</Text>
                <Text style={styles.avatarActionSubText}>Cập nhật tên, số điện thoại & email</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modern Avatar Picker Modal */}
      <AvatarPickerModal
        visible={showAvatarPicker}
        currentAvatarUrl={avatarUri}
        userName={displayName}
        onClose={() => setShowAvatarPicker(false)}
        onSelectAvatar={handleUpdateAvatar}
      />

      {/* Modern Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
      },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginTop: -1,
  },
  bellButton: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ea580c',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#ea580c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0 4px 12px rgba(234, 88, 12, 0.05)',
      },
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ffedd5',
    backgroundColor: '#f1f5f9',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 3,
  },
  onlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  userNameText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginVertical: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  phoneText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#e2e8f0',
  },
  dispatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    ...Platform.select({
      ios: {
        shadowColor: '#ea580c',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)',
      },
    }),
  },
  dispatchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  dispatchIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchIconActive: {
    backgroundColor: '#fff7ed',
  },
  dispatchIconInactive: {
    backgroundColor: '#f1f5f9',
  },
  dispatchTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  dispatchSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: '#dcfce7',
  },
  statusPillInactive: {
    backgroundColor: '#f1f5f9',
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  statusTextActive: {
    color: '#16a34a',
  },
  statusTextInactive: {
    color: '#64748b',
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
      },
    }),
  },
  groupTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 12,
  },
  lastMenuRow: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  menuSubLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
    gap: 3,
  },
  footerBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
    paddingHorizontal: 24,
  },
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  avatarModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 14,
  },
  avatarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  avatarActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  avatarActionSubText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
});
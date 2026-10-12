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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  User,
  Phone,
  Building2,
  Lock,
  LogOut,
  ChevronRight,
  ShieldCheck,
  DoorOpen,
  Headphones,
  Pencil,
  Camera,
  X,
  MapPin,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/authApi';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';
import CustomAlert, { AlertType } from '../../components/ui/CustomAlert';
import AvatarPickerModal from '../../components/ui/AvatarPickerModal';
import { resolveUserAvatar } from '../../utils/avatar';

export default function GarageStaffProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [garageInfo, setGarageInfo] = useState<{
    garageName: string;
    garageAddress: string;
    garagePhone?: string;
  }>({
    garageName: '',
    garageAddress: '',
  });
  const [loadingGarage, setLoadingGarage] = useState(true);

  // Dữ liệu trạng thái ca thực tế của thợ
  const [dashboardData, setDashboardData] = useState<{
    isOnline: boolean;
    status: 'FREE' | 'BUSY' | string;
    todayCompletedJobs: number;
  }>({
    isOnline: true,
    status: 'FREE',
    todayCompletedJobs: 0,
  });
  const [updatingShiftStatus, setUpdatingShiftStatus] = useState(false);

  // Tải thông tin gara trực thuộc và trạng thái ca
  const fetchStaffGarageInfo = useCallback(async () => {
    setLoadingGarage(true);
    try {
      // 1. Thử lấy dữ liệu thợ cứu hộ từ /garages/staff/me
      const res: any = await axiosClient.get('/garages/staff/me');
      if (res?.data) {
        setGarageInfo({
          garageName: res.data.garageName || 'Gara Cứu Hộ',
          garageAddress:
            res.data.garageAddress ||
            res.data.currentAddress ||
            'Chưa cập nhật địa chỉ cơ sở',
          garagePhone: res.data.garagePhone,
        });
        setDashboardData({
          isOnline: res.data.isOnline !== undefined ? Boolean(res.data.isOnline) : true,
          status: res.data.status || 'FREE',
          todayCompletedJobs: res.data.todayCompletedJobs || 0,
        });
        return;
      }

      // 2. Fallback nếu là tài khoản Chủ Gara đang mở màn hình này
      const ownerRes: any = await axiosClient.get('/garages/me');
      if (ownerRes?.data) {
        setGarageInfo({
          garageName: ownerRes.data.name || 'Gara Cứu Hộ',
          garageAddress: ownerRes.data.address || 'Chưa cập nhật địa chỉ cơ sở',
          garagePhone: ownerRes.data.phone,
        });
        return;
      }
    } catch (e: any) {
      // Nếu /garages/staff/me gặp lỗi (VD: tài khoản là Chủ Gara), thử gọi /garages/me
      try {
        const ownerRes: any = await axiosClient.get('/garages/me');
        if (ownerRes?.data) {
          setGarageInfo({
            garageName: ownerRes.data.name || 'Gara Cứu Hộ',
            garageAddress: ownerRes.data.address || 'Chưa cập nhật địa chỉ cơ sở',
            garagePhone: ownerRes.data.phone,
          });
          return;
        }
      } catch (errOwner: any) {
        console.log('Error fetching garage info:', errOwner.message);
      }
    } finally {
      setLoadingGarage(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStaffGarageInfo();
    }, [fetchStaffGarageInfo])
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

  // Đổi Avatar nhanh
  const handleUpdateAvatar = async (newAvatarUrl: string) => {
    try {
      if (user) {
        await authApi.updateProfile({
          userId: user.id,
          fullName: user.fullName || '',
          phone: user.phone || '',
          email: user.email,
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
    router.push('/garage-staff/edit-profile' as any);
  };

  // Thôi việc / Rời khỏi Gara
  const handleLeaveGarage = () => {
    showAlert(
      'Xác nhận rời khỏi Gara',
      'Bạn có chắc chắn muốn thôi việc và rời khỏi Gara hiện tại? Sau khi rời Gara, bạn sẽ trở về tài khoản Khách hàng tự do và có thể gia nhập Gara khác.',
      'warning',
      'Xác nhận rời',
      'Hủy',
      async () => {
        try {
          await axiosClient.post('/garages/staff/leave');
          showAlert(
            'Đã rời Gara',
            'Bạn đã rời Gara thành công. Hệ thống sẽ đăng xuất để cập nhật lại vai trò tài khoản.',
            'success',
            'Đồng ý',
            undefined,
            logout
          );
        } catch (e: any) {
          const msg = e?.response?.data?.message || 'Không thể rời Gara vào lúc này.';
          showAlert('Không thể thực hiện', msg, 'error');
        }
      }
    );
  };

  const handleLogout = () => {
    showAlert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản SRAS trên thiết bị này không?',
      'warning',
      'Đăng xuất',
      'Hủy',
      logout
    );
  };

  const displayName = user?.fullName || 'Nhân viên gara';
  const avatarUri = resolveUserAvatar(user?.avatarUrl, displayName);

  // Xác định trạng thái ca thực tế
  const isOnline = dashboardData.isOnline;
  const isBusy = dashboardData.status === 'BUSY';

  let shiftStatusText = 'Sẵn sàng';
  let shiftStatusColor = '#16a34a';
  if (!isOnline) {
    shiftStatusText = 'Nghỉ ca';
    shiftStatusColor = '#64748b';
  } else if (isBusy) {
    shiftStatusText = 'Đang bận';
    shiftStatusColor = '#ea580c';
  }

  // Chuyển đổi trạng thái ca (Online <-> Offline)
  const handleToggleShiftStatus = async () => {
    if (isBusy) {
      showAlert(
        'Đang trong ca cứu hộ',
        'Bạn đang thực hiện nhiệm vụ cứu hộ (trạng thái Bận). Vui lòng hoàn thành ca cứu hộ trước khi thay đổi trạng thái ca.',
        'warning'
      );
      return;
    }

    const nextOnline = !isOnline;
    setUpdatingShiftStatus(true);
    try {
      setDashboardData((prev) => ({ ...prev, isOnline: nextOnline }));
      const res: any = await axiosClient.put('/garages/staff/me/status', { isOnline: nextOnline });
      if (res?.data?.isOnline !== undefined) {
        setDashboardData((prev) => ({ ...prev, isOnline: Boolean(res.data.isOnline) }));
      }
      showAlert(
        'Đã đổi trạng thái ca',
        nextOnline
          ? 'Bạn đã bật trạng thái Sẵn sàng nhận cuốc cứu hộ.'
          : 'Bạn đã chuyển sang trạng thái Nghỉ ca (Tạm ngưng nhận cuốc).',
        'success'
      );
    } catch (err: any) {
      setDashboardData((prev) => ({ ...prev, isOnline: !nextOnline }));
      showAlert('Lỗi', err?.response?.data?.message || 'Không thể cập nhật trạng thái ca', 'error');
    } finally {
      setUpdatingShiftStatus(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <ShieldCheck size={20} color="#ea580c" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Hồ sơ Kỹ thuật viên</Text>
            <Text style={styles.headerSubtitle}>SRAS RESCUE CREW</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            {/* Avatar with Edit Badge */}
            <TouchableOpacity
              style={styles.avatarContainer}
              activeOpacity={0.85}
              onPress={() => setShowAvatarMenu(true)}
            >
              <Image source={{ uri: resolveFileUrl(avatarUri) }} style={styles.avatarImage} />
              <View style={styles.editBadge}>
                <Pencil size={13} color="#ffffff" strokeWidth={2.5} />
              </View>
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: !isOnline ? '#94a3b8' : isBusy ? '#ea580c' : '#22c55e' },
                ]}
              />
            </TouchableOpacity>

            {/* Staff Details */}
            <View style={styles.heroInfo}>
              <Text style={styles.userNameText} numberOfLines={1}>
                {displayName}
              </Text>

              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <ShieldCheck size={12} color="#ea580c" strokeWidth={2.5} />
                  <Text style={styles.roleBadgeText}>Kỹ thuật viên cứu hộ</Text>
                </View>
              </View>

              <Text style={styles.phoneText}>
                📞 {user?.phone || '0988.xxx.xxx'}
              </Text>
              {user?.email ? (
                <Text style={styles.emailText} numberOfLines={1}>
                  ✉️ {user.email}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsRow}>
            <TouchableOpacity
              style={styles.metricItem}
              activeOpacity={0.7}
              onPress={handleToggleShiftStatus}
              disabled={updatingShiftStatus}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: shiftStatusColor,
                  }}
                />
                <Text style={[styles.metricValue, { color: shiftStatusColor }]}>
                  {updatingShiftStatus ? '...' : shiftStatusText}
                </Text>
              </View>
              <Text style={styles.metricLabel}>Trạng thái ca</Text>
            </TouchableOpacity>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{dashboardData.todayCompletedJobs} ca</Text>
              <Text style={styles.metricLabel}>Hôm nay</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>100%</Text>
              <Text style={styles.metricLabel}>Đạt chuẩn</Text>
            </View>
          </View>
        </View>

        {/* Garage Affiliation Card */}
        <View style={styles.garageCard}>
          <View style={styles.garageIconWrap}>
            <Building2 size={24} color="#0284c7" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.garageLabel}>Gara trực thuộc</Text>
              <View style={styles.activePill}>
                <CheckCircle2 size={11} color="#16a34a" />
                <Text style={styles.activePillText}>Đang hoạt động</Text>
              </View>
            </View>
            <Text style={styles.garageName}>
              {garageInfo.garageName || (loadingGarage ? 'Đang tải thông tin Gara...' : 'Chưa có thông tin Gara')}
            </Text>
            <View style={styles.addressRow}>
              <MapPin size={13} color="#64748b" />
              <Text style={styles.garageAddress} numberOfLines={2}>
                {garageInfo.garageAddress || (loadingGarage ? 'Đang tải địa chỉ...' : 'Chưa cập nhật địa chỉ cơ sở')}
              </Text>
            </View>
          </View>
        </View>

        {/* Group 1: Tài khoản & Thông tin cá nhân */}
        <View style={styles.menuCard}>
          <Text style={styles.groupTitle}>Tài khoản & Thông tin cá nhân</Text>

          {/* Chỉnh sửa hồ sơ */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => router.push('/garage-staff/edit-profile' as any)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff7ed' }]}>
              <User size={19} color="#ea580c" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Chỉnh sửa thông tin cá nhân</Text>
              <Text style={styles.menuSubLabel}>Họ tên, ảnh đại diện, số điện thoại, email</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Đổi mật khẩu */}
          <TouchableOpacity
            style={[styles.menuRow, styles.lastMenuRow]}
            activeOpacity={0.7}
            onPress={() => router.push('/garage-staff/change-password' as any)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <Lock size={19} color="#2563eb" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Đổi mật khẩu tài khoản</Text>
              <Text style={styles.menuSubLabel}>Bảo vệ an toàn tài khoản với mật khẩu mới</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Group 2: Vận hành & Hỗ trợ */}
        <View style={styles.menuCard}>
          <Text style={styles.groupTitle}>Vận hành & Hỗ trợ cứu hộ</Text>

          {/* Hotline hỗ trợ */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() =>
              showAlert(
                'Tổng đài Hỗ trợ 24/7',
                'Kênh hỗ trợ khẩn cấp dành riêng cho Kỹ thuật viên cứu hộ SRAS:\n📞 Hotline: 1900 6868 (Phím 1)\n✉️ Email: dispatch@sras.vn',
                'info'
              )
            }
          >
            <View style={[styles.iconWrap, { backgroundColor: '#f0fdf4' }]}>
              <Headphones size={19} color="#16a34a" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Tổng đài Hỗ trợ Kỹ thuật & Điều phối</Text>
              <Text style={styles.menuSubLabel}>Hotline cứu hộ: 1900 6868 (24/7)</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Thôi việc / Rời gara */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={handleLeaveGarage}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff1f2' }]}>
              <DoorOpen size={19} color="#e11d48" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuLabel, { color: '#e11d48' }]}>Rời khỏi Gara (Thôi việc)</Text>
              <Text style={styles.menuSubLabel}>Chuyển sang Gara khác hoặc quay về tài khoản tự do</Text>
            </View>
            <ChevronRight size={18} color="#fecdd3" />
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
              <Text style={styles.menuSubLabel}>Thoát phiên đăng nhập trên thiết bị</Text>
            </View>
            <ChevronRight size={18} color="#fca5a5" />
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerBrand}>SRAS RESCUE CREW SYSTEM</Text>
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarMenu(false)}
        >
          <View style={styles.actionSheetContent}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>Ảnh đại diện & Hồ sơ</Text>
              <TouchableOpacity onPress={() => setShowAvatarMenu(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionSheetOption}
              activeOpacity={0.8}
              onPress={openEditProfile}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: '#fff7ed' }]}>
                <Pencil size={18} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Chỉnh sửa thông tin cá nhân</Text>
                <Text style={styles.optionSubtitle}>Cập nhật tên, SĐT, Email và Mật khẩu</Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetOption}
              activeOpacity={0.8}
              onPress={() => {
                setShowAvatarMenu(false);
                setShowAvatarPicker(true);
              }}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: '#eff6ff' }]}>
                <Camera size={18} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Đổi ảnh đại diện</Text>
                <Text style={styles.optionSubtitle}>Chọn từ bộ sưu tập hoặc nhập liên kết ảnh</Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        visible={showAvatarPicker}
        currentAvatarUrl={avatarUri}
        userName={displayName}
        onClose={() => setShowAvatarPicker(false)}
        onSelectAvatar={handleUpdateAvatar}
      />

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
    letterSpacing: 1.2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
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
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderColor: '#ea580c',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  onlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  heroInfo: {
    flex: 1,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  phoneText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  emailText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  garageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  garageIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  garageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
    textTransform: 'uppercase',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  garageName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  garageAddress: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  lastMenuRow: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuSubLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
  },
  footerText: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});

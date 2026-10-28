import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Image,
  Modal,
  Linking,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/authApi';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';
import CustomAlert, { AlertType } from '../../components/ui/CustomAlert';
import AvatarPickerModal from '../../components/ui/AvatarPickerModal';
import { resolveUserAvatar } from '../../utils/avatar';
import {
  Bell,
  Pencil,
  Car,
  CreditCard,
  Contact,
  History,
  Settings,
  LogOut,
  ChevronRight,
  X,
  Camera,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Lock,
  Headphones,
  CheckCircle2,
  Building2,
  Sparkles,
  ArrowRight,
  Clock,
  Plus,
  AlertTriangle,
  User,
  HeartHandshake,
  MapPin,
  Trash2,
  Bike,
  Check,
  Palette,
  Calendar,
  ArrowLeft,
} from 'lucide-react-native';
import { customerVehicleApi, CustomerVehicleDto } from '../../api/customerVehicleApi';

const MOTORBIKE_BRANDS = ['Honda', 'Yamaha', 'Piaggio', 'Vespa', 'VinFast', 'Suzuki', 'SYM'];
const CAR_BRANDS = ['Toyota', 'Hyundai', 'Kia', 'Mazda', 'Honda', 'Ford', 'VinFast', 'Mitsubishi'];
const COMMON_COLORS = ['Trắng', 'Đen', 'Đỏ', 'Xám / Ghi', 'Xanh lam', 'Bạc'];

interface CustomerVehicleItem {
  id: number;
  licensePlate: string;
  vehicleType?: string;
  brand?: string;
  model?: string;
  color?: string;
}

export default function CustomerProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Dữ liệu tổng quan của Khách hàng
  const [walletData, setWalletData] = useState<{
    totalSpent: number;
    completedOrdersCount: number;
  }>({
    totalSpent: 0,
    completedOrdersCount: 0,
  });

  const [vehicles, setVehicles] = useState<CustomerVehicleDto[]>([]);
  const [showVehiclesModal, setShowVehiclesModal] = useState(false);
  const [vehicleModalView, setVehicleModalView] = useState<'LIST' | 'ADD'>('LIST');

  // Form thêm xe mới trực tiếp trong cùng modal (tránh lồng modal gây treo đơ)
  const [newVehType, setNewVehType] = useState<'CAR' | 'MOTORBIKE'>('MOTORBIKE');
  const [newVehBrand, setNewVehBrand] = useState('');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehColor, setNewVehColor] = useState('');
  const [newVehYear, setNewVehYear] = useState('');
  const [newVehDefault, setNewVehDefault] = useState(false);
  const [newVehSubmitting, setNewVehSubmitting] = useState(false);

  const [showSosModal, setShowSosModal] = useState(false);
  const [sosContact, setSosContact] = useState<{ name: string; phone: string }>({
    name: 'Người thân SOS',
    phone: '19006868',
  });

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

  const fetchCustomerOverview = useCallback(async () => {
    try {
      const [walletRes, vehicleList]: any = await Promise.allSettled([
        axiosClient.get('/customer/me/wallet/overview'),
        customerVehicleApi.mine(),
      ]);

      if (walletRes.status === 'fulfilled' && walletRes.value?.data) {
        setWalletData({
          totalSpent: walletRes.value.data.totalSpent ?? 0,
          completedOrdersCount: walletRes.value.data.completedOrdersCount ?? 0,
        });
      }

      if (vehicleList.status === 'fulfilled' && Array.isArray(vehicleList.value)) {
        setVehicles(vehicleList.value);
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleDeleteVehicle = (vehicleId: number, name: string) => {
    Alert.alert(
      'Xóa phương tiện',
      `Bạn có chắc chắn muốn xóa "${name}" khỏi danh sách xe không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await customerVehicleApi.delete(vehicleId);
              setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
            } catch (err: any) {
              console.error('[Delete Vehicle] error:', err);
              Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể xóa phương tiện.');
            }
          },
        },
      ]
    );
  };

  const handleCreateVehicleInProfile = async () => {
    if (!newVehBrand.trim()) {
      showAlert('Thiếu thông tin', 'Vui lòng nhập hoặc chọn hãng xe (ví dụ: Honda, Toyota, Yamaha...)', 'warning');
      return;
    }

    try {
      setNewVehSubmitting(true);
      const created = await customerVehicleApi.create({
        vehicleType: newVehType,
        brand: newVehBrand.trim(),
        model: newVehModel.trim() || undefined,
        licensePlate: newVehPlate.trim().toUpperCase() || undefined,
        color: newVehColor.trim() || undefined,
        year: newVehYear.trim() ? parseInt(newVehYear.trim(), 10) : undefined,
        isDefault: newVehDefault,
      });

      if (newVehDefault) {
        setVehicles((prev) => [created, ...prev.map((v) => ({ ...v, isDefault: false }))]);
      } else {
        setVehicles((prev) => [created, ...prev]);
      }

      // Reset form
      setNewVehBrand('');
      setNewVehModel('');
      setNewVehPlate('');
      setNewVehColor('');
      setNewVehYear('');
      setNewVehDefault(false);
      setVehicleModalView('LIST');
      showAlert('Thành công', 'Đã thêm phương tiện mới vào gara của bạn!', 'success');
    } catch (err: any) {
      console.error('[Profile Add Vehicle] error:', err);
      showAlert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể thêm phương tiện.', 'error');
    } finally {
      setNewVehSubmitting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCustomerOverview();
    }, [fetchCustomerOverview])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomerOverview();
  };

  const handleLogout = () => {
    showAlert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản SRAS không?',
      'warning',
      'Đăng xuất',
      'Hủy',
      logout
    );
  };

  const handlePartnerRegister = () => {
    router.push('/customer/register-partner' as any);
  };

  const handleUpdateAvatar = async (newAvatarUrl: string) => {
    try {
      if (user) {
        await authApi.updateProfile({
          userId: user.id,
          fullName: user.fullName,
          phone: user.phone,
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

  const formatVnd = (val: number) => {
    if (!val || val <= 0) return '0đ';
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1).replace('.0', '') + 'tr đ';
    }
    return val.toLocaleString('vi-VN') + 'đ';
  };

  // Avatar url or placeholder
  const avatarUri = resolveUserAvatar(user?.avatarUrl, user?.fullName);
  const displayName = user?.fullName || 'Khách hàng';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <ShieldCheck size={20} color="#ea580c" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Hồ sơ Khách hàng</Text>
            <Text style={styles.headerSubtitle}>SRAS MEMBER · THÀNH VIÊN</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => router.push('/customer/requests')}
          activeOpacity={0.8}
        >
          <Bell size={20} color="#0f172a" strokeWidth={2.2} />
          <View style={styles.bellDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />}
      >
        {/* Profile Hero Card (Thẻ Khách Hàng VIP) */}
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
                <Pencil size={12} color="#ffffff" strokeWidth={2.6} />
              </View>
              <View style={styles.onlineDot} />
            </TouchableOpacity>

            {/* Customer Details */}
            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userNameText} numberOfLines={1}>
                  {displayName}
                </Text>
                <CheckCircle2 size={16} color="#059669" strokeWidth={2.4} />
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <ShieldCheck size={11} color="#ea580c" strokeWidth={2.5} />
                  <Text style={styles.roleBadgeText}>Khách hàng</Text>
                </View>
              </View>

              <Text style={styles.phoneText}>
                📞 {user?.phone || 'Chưa cập nhật số điện thoại'}
              </Text>
              {user?.email ? (
                <Text style={styles.emailText} numberOfLines={1}>
                  ✉️ {user.email}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Quick Metrics Bar: Thống kê phương tiện, số cuốc, chi tiêu */}
          <View style={styles.metricsRow}>
            <TouchableOpacity
              style={styles.metricItem}
              activeOpacity={0.7}
              onPress={() => setShowVehiclesModal(true)}
            >
              <Text style={styles.metricValue}>
                {vehicles.length > 0 ? `${vehicles.length} xe` : '0 xe'}
              </Text>
              <Text style={styles.metricLabel}>Phương tiện</Text>
            </TouchableOpacity>

            <View style={styles.metricDivider} />

            <TouchableOpacity
              style={styles.metricItem}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/customer/requests', params: { tab: 'HISTORY' } } as any)}
            >
              <Text style={styles.metricValue}>{walletData.completedOrdersCount} chuyến</Text>
              <Text style={styles.metricLabel}>Đã cứu hộ</Text>
            </TouchableOpacity>

            <View style={styles.metricDivider} />

            <TouchableOpacity
              style={styles.metricItem}
              activeOpacity={0.7}
              onPress={() => router.push('/customer/wallet' as any)}
            >
              <Text style={[styles.metricValue, { color: '#ea580c' }]}>
                {formatVnd(walletData.totalSpent)}
              </Text>
              <Text style={styles.metricLabel}>Chi tiêu SRAS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SOS Emergency Hotline Banner */}
        <View style={styles.hotlineCard}>
          <View style={styles.hotlineIconBox}>
            <Headphones size={22} color="#ea580c" strokeWidth={2.3} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hotlineTitle}>Tổng Đài Cứu Hộ Khẩn Cấp 24/7</Text>
            <Text style={styles.hotlineSub}>Đội xe cứu hộ sẵn sàng cơ động trong 15-30 phút</Text>
          </View>
          <TouchableOpacity
            style={styles.hotlineCallBtn}
            onPress={() => Linking.openURL('tel:19006868').catch(() => { })}
            activeOpacity={0.85}
          >
            <Phone size={14} color="#ffffff" strokeWidth={2.4} />
            <Text style={styles.hotlineCallBtnText}>1900 6868</Text>
          </TouchableOpacity>
        </View>

        {/* GROUP 1: Phương tiện & Dịch vụ cứu hộ */}
        <View style={styles.menuCard}>
          <Text style={styles.groupTitle}>Phương tiện & Lịch sử cứu hộ</Text>

          {/* Phương tiện của tôi */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => setShowVehiclesModal(true)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <Car size={20} color="#2563eb" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.menuLabel}>Phương tiện của tôi</Text>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>
                    {vehicles.length > 0 ? `${vehicles.length} xe` : 'Thêm xe'}
                  </Text>
                </View>
              </View>
              <Text style={styles.menuSubLabel}>Quản lý biển số xe, dòng xe ô tô / xe máy cá nhân</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Lịch sử cứu hộ & Báo giá */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/customer/requests', params: { tab: 'HISTORY' } } as any)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff7ed' }]}>
              <History size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Lịch sử cứu hộ & Báo giá</Text>
              <Text style={styles.menuSubLabel}>Tra cứu biên lai, chi phí và lộ trình các cuốc cứu hộ</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Yêu cầu cứu hộ đang chờ */}
          <TouchableOpacity
            style={[styles.menuRow, styles.lastMenuRow]}
            activeOpacity={0.7}
            onPress={() => router.push('/customer/requests')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#f0fdf4' }]}>
              <Clock size={20} color="#16a34a" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Đơn cứu hộ đang xử lý</Text>
              <Text style={styles.menuSubLabel}>Xem tiến độ điều xe và vị trí thợ đang đến</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* GROUP 2: Tài chính & Thanh toán */}
        <View style={styles.menuCard}>
          <Text style={styles.groupTitle}>Tài chính & Thanh toán</Text>

          {/* Ví thanh toán SRAS Pay */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => router.push('/customer/wallet' as any)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff7ed' }]}>
              <Wallet size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Ví thanh toán SRAS Pay</Text>
              <Text style={styles.menuSubLabel}>Số dư, nạp tiền, hoàn phí & quản lý chi tiêu</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Cổng thanh toán & Thẻ */}
          <TouchableOpacity
            style={[styles.menuRow, styles.lastMenuRow]}
            activeOpacity={0.7}
            onPress={() => router.push('/customer/payment' as any)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <CreditCard size={20} color="#2563eb" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Cổng thanh toán & Thẻ</Text>
              <Text style={styles.menuSubLabel}>Liên kết VNPay, MoMo, thẻ ATM nội địa & Quốc tế</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* GROUP 3: Tài khoản & An toàn */}
        <View style={styles.menuCard}>
          <Text style={styles.groupTitle}>Tài khoản & An toàn cá nhân</Text>

          {/* Chỉnh sửa thông tin cá nhân */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => router.push('/customer/edit-profile')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#f1f5f9' }]}>
              <User size={20} color="#475569" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Chỉnh sửa thông tin cá nhân</Text>
              <Text style={styles.menuSubLabel}>Cập nhật họ tên, số điện thoại, email, địa chỉ</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Liên hệ khẩn cấp (SOS) */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => setShowSosModal(true)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fef2f2' }]}>
              <ShieldAlert size={20} color="#dc2626" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Liên hệ khẩn cấp (Người thân SOS)</Text>
              <Text style={styles.menuSubLabel}>Tự động gửi tin nhắn báo vị trí khi gặp tai nạn khẩn cấp</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Đổi mật khẩu */}
          <TouchableOpacity
            style={[styles.menuRow, styles.lastMenuRow]}
            activeOpacity={0.7}
            onPress={() => router.push('/customer/change-password' as any)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#f8fafc' }]}>
              <Lock size={20} color="#64748b" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Đổi mật khẩu tài khoản</Text>
              <Text style={styles.menuSubLabel}>Tăng cường bảo mật đăng nhập cho tài khoản của bạn</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* GROUP 4: Dành cho Đối tác Gara Cứu Hộ */}
        <View style={styles.partnerCard}>
          <View style={styles.partnerCardTop}>
            <View style={styles.partnerIconBox}>
              <Building2 size={24} color="#ea580c" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.partnerCardTitle}>Trở thành Đối tác Gara Cứu Hộ</Text>
                <View style={styles.partnerTag}>
                  <Text style={styles.partnerTagText}>Mở rộng quy mô</Text>
                </View>
              </View>
              <Text style={styles.partnerCardSub}>
                Kết nối với hàng chục ngàn tài xế, tiếp nhận cứu hộ 24/7 và gia tăng thu nhập vượt trội.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.partnerActionBtn}
            activeOpacity={0.88}
            onPress={handlePartnerRegister}
          >
            <Text style={styles.partnerActionBtnText}>Đăng ký mở Gara đối tác ngay</Text>
            <ArrowRight size={16} color="#ffffff" strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        {/* GROUP 5: Đăng xuất */}
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={[styles.menuRow, styles.lastMenuRow]}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff1f2' }]}>
              <LogOut size={20} color="#e11d48" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuLabel, { color: '#e11d48', fontWeight: '800' }]}>
                Đăng xuất tài khoản
              </Text>
              <Text style={styles.menuSubLabel}>Đăng xuất khỏi thiết bị này an toàn</Text>
            </View>
            <ChevronRight size={18} color="#fca5a5" />
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerVersion}>SRAS Customer App v1.2.0 (Build 2026)</Text>
          <Text style={styles.footerCopy}>
            Hệ thống Cứu hộ Giao thông Thông minh Việt Nam · SRAS Team
          </Text>
        </View>
      </ScrollView>

      {/* MODAL 1: CHỌN HÀNH ĐỘNG ẢNH ĐẠI DIỆN */}
      <Modal
        visible={showAvatarMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarMenu(false)}
        >
          <View style={styles.bottomMenu}>
            <View style={styles.menuHandle} />
            <Text style={styles.bottomMenuTitle}>Ảnh đại diện cá nhân</Text>

            <TouchableOpacity
              style={styles.bottomMenuItem}
              onPress={() => {
                setShowAvatarMenu(false);
                setShowAvatarPicker(true);
              }}
            >
              <View style={[styles.bottomMenuIcon, { backgroundColor: '#fff7ed' }]}>
                <Camera size={19} color="#ea580c" />
              </View>
              <Text style={styles.bottomMenuText}>Chụp ảnh / Chọn ảnh từ thư viện</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomMenuItem}
              onPress={() => {
                setShowAvatarMenu(false);
                router.push('/customer/edit-profile');
              }}
            >
              <View style={[styles.bottomMenuIcon, { backgroundColor: '#eff6ff' }]}>
                <Pencil size={19} color="#2563eb" />
              </View>
              <Text style={styles.bottomMenuText}>Chỉnh sửa toàn bộ hồ sơ cá nhân</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomMenuItem, styles.cancelItem]}
              onPress={() => setShowAvatarMenu(false)}
            >
              <Text style={styles.cancelItemText}>Hủy bỏ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 2: XEM VÀ QUẢN LÝ PHƯƠNG TIỆN CỦA TÔI (DUAL VIEW: LIST & ADD TRONG CÙNG MODAL) */}
      <Modal
        visible={showVehiclesModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowVehiclesModal(false);
          setVehicleModalView('LIST');
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.vehicleSheet, vehicleModalView === 'ADD' && { maxHeight: '92%' }]}>
            {/* SHEET HEADER */}
            {vehicleModalView === 'LIST' ? (
              <View style={styles.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
                    <Car size={22} color="#2563eb" strokeWidth={2.4} />
                  </View>
                  <View>
                    <Text style={styles.sheetTitle}>Phương tiện của tôi</Text>
                    <Text style={styles.sheetSubtitle}>
                      {vehicles.length} phương tiện đã liên kết
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setShowVehiclesModal(false)}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.sheetHeader}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
                  onPress={() => setVehicleModalView('LIST')}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={20} color="#ea580c" strokeWidth={2.4} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#ea580c' }}>Quay lại</Text>
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.sheetTitle}>Thêm phương tiện mới</Text>
                  <Text style={styles.sheetSubtitle}>Lưu vào hồ sơ xe của bạn</Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => {
                    setShowVehiclesModal(false);
                    setVehicleModalView('LIST');
                  }}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}

            {/* SHEET BODY */}
            {vehicleModalView === 'LIST' ? (
              /* VIEW 1: DANH SÁCH XE */
              <>
                {vehicles.length === 0 ? (
                  <View style={styles.emptyVehiclesBox}>
                    <Car size={48} color="#cbd5e1" strokeWidth={1.5} />
                    <Text style={styles.emptyVehiclesTitle}>Chưa có phương tiện nào</Text>
                    <Text style={styles.emptyVehiclesDesc}>
                      Thêm biển số xe và dòng xe để kỹ thuật viên cứu hộ nhận diện chính xác xe của bạn khi gặp sự cố trên đường.
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                    {vehicles.map((v) => {
                      const isCar = v.vehicleType === 'CAR';
                      const VIcon = isCar ? Car : Bike;
                      const vName = [v.brand, v.model].filter(Boolean).join(' ') || 'Phương tiện';
                      return (
                        <View key={v.id} style={styles.vehicleCard}>
                          <View style={[
                            styles.vehiclePlateBox,
                            !isCar && { backgroundColor: '#fff7ed', borderColor: '#fdba74' },
                            !v.licensePlate && { minWidth: 40, paddingHorizontal: 6 },
                          ]}>
                            <VIcon size={14} color={isCar ? '#2563eb' : '#ea580c'} strokeWidth={2.4} style={v.licensePlate ? { marginBottom: 2 } : undefined} />
                            {v.licensePlate ? (
                              <Text style={[styles.vehiclePlateText, !isCar && { color: '#c2410c' }]}>
                                {v.licensePlate}
                              </Text>
                            ) : null}
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.vehicleNameText} numberOfLines={1}>
                                {vName}
                              </Text>
                              {v.isDefault && (
                                <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 10, color: '#b45309', fontWeight: '700' }}>Mặc định</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.vehicleMetaText}>
                              {isCar ? 'Ô tô' : 'Xe máy'} {v.color ? `· Màu: ${v.color}` : ''} {v.year ? `· Đời ${v.year}` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={{ padding: 8, borderRadius: 8, backgroundColor: '#fff1f2' }}
                            onPress={() => handleDeleteVehicle(v.id, vName)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={16} color="#e11d48" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}

                <View style={styles.sheetBottomRow}>
                  <TouchableOpacity
                    style={styles.sheetAddBtn}
                    onPress={() => {
                      setVehicleModalView('ADD');
                    }}
                    activeOpacity={0.85}
                  >
                    <Plus size={16} color="#ffffff" strokeWidth={2.6} />
                    <Text style={styles.sheetAddBtnText}>+ Thêm phương tiện mới</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sheetCancelBtn}
                    onPress={() => setShowVehiclesModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sheetCancelBtnText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* VIEW 2: FORM THÊM XE MỚI (TRỰC TIẾP TRONG SHEET) */
              <>
                <ScrollView
                  style={{ maxHeight: 440 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Loại xe */}
                  <Text style={styles.modalFieldLabel}>Loại phương tiện <Text style={{ color: '#ea580c' }}>*</Text></Text>
                  <View style={styles.modalTypeRow}>
                    <TouchableOpacity
                      style={[styles.modalTypeBtn, newVehType === 'MOTORBIKE' && styles.modalTypeBtnActive]}
                      onPress={() => setNewVehType('MOTORBIKE')}
                      activeOpacity={0.8}
                    >
                      <Bike size={20} color={newVehType === 'MOTORBIKE' ? '#ffffff' : '#ea580c'} strokeWidth={2.4} />
                      <Text style={[styles.modalTypeBtnText, newVehType === 'MOTORBIKE' && styles.modalTypeBtnTextActive]}>
                        Xe máy
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalTypeBtn, newVehType === 'CAR' && styles.modalTypeBtnActive]}
                      onPress={() => setNewVehType('CAR')}
                      activeOpacity={0.8}
                    >
                      <Car size={20} color={newVehType === 'CAR' ? '#ffffff' : '#2563eb'} strokeWidth={2.4} />
                      <Text style={[styles.modalTypeBtnText, newVehType === 'CAR' && styles.modalTypeBtnTextActive]}>
                        Ô tô
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Hãng xe */}
                  <Text style={styles.modalFieldLabel}>Hãng xe <Text style={{ color: '#ea580c' }}>*</Text></Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={newVehType === 'MOTORBIKE' ? 'VD: Honda, Yamaha, Piaggio, VinFast...' : 'VD: Toyota, Mazda, Hyundai, Kia...'}
                    placeholderTextColor="#94a3b8"
                    value={newVehBrand}
                    onChangeText={setNewVehBrand}
                  />
                  <View style={styles.modalChipsRow}>
                    {(newVehType === 'MOTORBIKE' ? MOTORBIKE_BRANDS : CAR_BRANDS).map((b) => (
                      <TouchableOpacity
                        key={b}
                        style={[styles.modalChip, newVehBrand.toLowerCase() === b.toLowerCase() && styles.modalChipActive]}
                        onPress={() => setNewVehBrand(b)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modalChipText, newVehBrand.toLowerCase() === b.toLowerCase() && styles.modalChipTextActive]}>
                          {b}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Dòng xe */}
                  <Text style={styles.modalFieldLabel}>Dòng xe / Tên xe (tùy chọn)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={newVehType === 'MOTORBIKE' ? 'VD: Wave Alpha, SH 150i, Vision...' : 'VD: Vios, CX-5, Accent, Ranger...'}
                    placeholderTextColor="#94a3b8"
                    value={newVehModel}
                    onChangeText={setNewVehModel}
                  />

                  {/* Biển số xe */}
                  <Text style={styles.modalFieldLabel}>Biển số xe (giúp cứu hộ tìm đúng xe)</Text>
                  <TextInput
                    style={[styles.modalInput, { textTransform: 'uppercase', fontWeight: '700' }]}
                    placeholder="VD: 29A-123.45 hoặc 43K-999.99"
                    placeholderTextColor="#94a3b8"
                    value={newVehPlate}
                    onChangeText={(t) => setNewVehPlate(t.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={15}
                  />

                  {/* Màu sắc xe */}
                  <Text style={styles.modalFieldLabel}>Màu sắc xe (tùy chọn)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="VD: Trắng, Đen, Đỏ, Bạc..."
                    placeholderTextColor="#94a3b8"
                    value={newVehColor}
                    onChangeText={setNewVehColor}
                  />
                  <View style={styles.modalChipsRow}>
                    {COMMON_COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.modalChip, newVehColor.toLowerCase() === c.toLowerCase() && styles.modalChipActive]}
                        onPress={() => setNewVehColor(c)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modalChipText, newVehColor.toLowerCase() === c.toLowerCase() && styles.modalChipTextActive]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Năm sản xuất */}
                  <Text style={styles.modalFieldLabel}>Năm sản xuất / Đời xe (tùy chọn)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="VD: 2022, 2023..."
                    placeholderTextColor="#94a3b8"
                    value={newVehYear}
                    onChangeText={setNewVehYear}
                    keyboardType="numeric"
                    maxLength={4}
                  />

                  {/* Đặt làm xe mặc định */}
                  <TouchableOpacity
                    style={styles.modalDefaultRow}
                    activeOpacity={0.8}
                    onPress={() => setNewVehDefault((prev) => !prev)}
                  >
                    <View style={[styles.modalCheckbox, newVehDefault && styles.modalCheckboxActive]}>
                      {newVehDefault && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalDefaultTitle}>Đặt làm phương tiện mặc định</Text>
                      <Text style={styles.modalDefaultSub}>Tự động chọn xe này khi bạn gửi yêu cầu cứu hộ</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={{ height: 16 }} />
                </ScrollView>

                <View style={styles.sheetBottomRow}>
                  <TouchableOpacity
                    style={styles.sheetCancelBtn}
                    onPress={() => setVehicleModalView('LIST')}
                    disabled={newVehSubmitting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sheetCancelBtnText}>Quay lại</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sheetAddBtn, newVehSubmitting && { opacity: 0.6 }]}
                    onPress={handleCreateVehicleInProfile}
                    disabled={newVehSubmitting}
                    activeOpacity={0.85}
                  >
                    {newVehSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <ShieldCheck size={16} color="#ffffff" strokeWidth={2.4} />
                        <Text style={styles.sheetAddBtnText}>Lưu phương tiện</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 3: LIÊN HỆ KHẨN CẤP SOS */}
      <Modal
        visible={showSosModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSosModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.vehicleSheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.iconWrap, { backgroundColor: '#fef2f2' }]}>
                  <ShieldAlert size={22} color="#dc2626" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.sheetTitle}>Liên hệ Khẩn cấp (SOS)</Text>
                  <Text style={styles.sheetSubtitle}>Bảo vệ an toàn khi di chuyển</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setShowSosModal(false)}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10 }}>
              <Text style={styles.sosDescText}>
                Số điện thoại này sẽ nhận được thông báo tọa độ GPS khi bạn kích hoạt trạng thái "Khẩn cấp / Sự cố nghiêm trọng":
              </Text>

              <View style={styles.sosCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sosNameLabel}>{sosContact.name}</Text>
                  <Text style={styles.sosPhoneText}>{sosContact.phone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.sosCallBtn}
                  onPress={() => Linking.openURL(`tel:${sosContact.phone}`).catch(() => { })}
                >
                  <Phone size={14} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.sosCallBtnText}>Gọi ngay</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sheetBottomRow}>
              <TouchableOpacity
                style={styles.sheetAddBtn}
                onPress={() => {
                  setShowSosModal(false);
                  router.push('/customer/edit-profile');
                }}
              >
                <Pencil size={15} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.sheetAddBtnText}>Cài đặt liên hệ SOS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={() => setShowSosModal(false)}
              >
                <Text style={styles.sheetCancelBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AVATAR PICKER MODAL */}
      <AvatarPickerModal
        visible={showAvatarPicker}
        currentAvatarUrl={avatarUri}
        userName={displayName}
        onClose={() => setShowAvatarPicker(false)}
        onSelectAvatar={handleUpdateAvatar}
      />

      {/* CUSTOM ALERT */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea580c',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 14,
  },

  /* HERO CARD */
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#16a34a',
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  heroInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  phoneText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 2,
  },
  emailText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  /* METRICS */
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },

  /* HOTLINE CARD */
  hotlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  hotlineIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  hotlineTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#9a3412',
  },
  hotlineSub: {
    fontSize: 11,
    color: '#c2410c',
    marginTop: 2,
    lineHeight: 15,
  },
  hotlineCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ea580c',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  hotlineCallBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* MENU CARD */
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  groupTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 4,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  menuSubLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  tagBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },

  /* PARTNER CARD */
  partnerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  partnerCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  partnerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  partnerTag: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  partnerTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  partnerCardSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 16,
  },
  partnerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  partnerActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* FOOTER */
  footerWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  footerVersion: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94a3b8',
  },
  footerCopy: {
    fontSize: 10.5,
    color: '#cbd5e1',
    textAlign: 'center',
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomMenu: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomMenuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 18,
  },
  bottomMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  bottomMenuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  cancelItem: {
    marginTop: 8,
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  cancelItemText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },

  /* VEHICLE SHEET */
  vehicleSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyVehiclesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyVehiclesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyVehiclesDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginTop: 10,
  },
  vehiclePlateBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0f172a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vehiclePlateText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  vehicleNameText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  vehicleMetaText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sheetBottomRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  sheetAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  sheetAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  sheetCancelBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },

  /* MODAL ADD VEHICLE FORM STYLES */
  modalFieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
  modalTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  modalTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalTypeBtnActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  modalTypeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  modalTypeBtnTextActive: {
    color: '#ffffff',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0f172a',
  },
  modalChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  modalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  modalChipText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  modalChipTextActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  modalDefaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  modalCheckboxActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  modalDefaultTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalDefaultSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },

  /* SOS STYLES */
  sosDescText: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  sosCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  sosNameLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#991b1b',
  },
  sosPhoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: 2,
  },
  sosCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  sosCallBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});

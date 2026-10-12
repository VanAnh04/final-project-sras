import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  StyleSheet, 
  Image, 
  Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/authApi';
import { resolveFileUrl } from '../../api/axiosClient';
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
  MessageSquare, 
  ChevronRight, 
  X,
  Camera
} from 'lucide-react-native';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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

  const openEditProfile = () => {
    setShowAvatarMenu(false);
    router.push('/customer/edit-profile');
  };

  // Avatar url or placeholder
  const avatarUri = resolveUserAvatar(user?.avatarUrl, user?.fullName);
  const displayName = user?.fullName || 'Khách hàng';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: resolveFileUrl(avatarUri) }}
            style={styles.headerSmallAvatar}
          />
          <Text style={styles.logoText}>SRAS</Text>
        </View>

        <TouchableOpacity 
          style={styles.bellButton}
          onPress={() => router.push('/customer/requests')}
        >
          <Bell size={22} color="#ea580c" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Big Center Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.bigAvatarContainer}
            activeOpacity={0.85}
            onPress={() => setShowAvatarMenu(true)}
          >
            <Image
              source={{ uri: resolveFileUrl(avatarUri) }}
              style={styles.bigAvatarImage}
            />
            <View style={styles.editBadge}>
              <Pencil size={14} color="#ffffff" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
          <Text style={styles.userNameText}>{displayName}</Text>
        </View>

        {/* Menu Items Card */}
        <View style={styles.menuCard}>
          {/* Item 1: Phương tiện của tôi */}
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <Car size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <Text style={styles.menuLabel}>Phương tiện của tôi</Text>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Item 2: Thanh toán */}
          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => router.push('/customer/payment')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <CreditCard size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <Text style={styles.menuLabel}>Thanh toán</Text>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Item 3: Liên hệ khẩn cấp */}
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <Contact size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <Text style={styles.menuLabel}>Liên hệ khẩn cấp</Text>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Item 4: Lịch sử cứu hộ */}
          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/customer/requests', params: { tab: 'HISTORY' } } as any)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <History size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <Text style={styles.menuLabel}>Lịch sử cứu hộ</Text>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Item 5: Cài đặt */}
          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => router.push('/customer/edit-profile')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <Settings size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <Text style={styles.menuLabel}>Cài đặt</Text>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Item 6: Đăng xuất */}
          <TouchableOpacity 
            style={[styles.menuRow, styles.lastMenuRow]} 
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff1f2' }]}>
              <LogOut size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <Text style={[styles.menuLabel, { color: '#ea580c' }]}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        {/* Big Orange Button: Đăng kí Đối tác cứu hộ */}
        <TouchableOpacity 
          style={styles.partnerButton}
          activeOpacity={0.88}
          onPress={handlePartnerRegister}
        >
          <View style={styles.partnerBtnContent}>
            <View style={styles.partnerIconWrap}>
              <MessageSquare size={20} color="#ea580c" fill="#ffffff" />
            </View>
            <Text style={styles.partnerButtonText}>Đăng kí Đối tác cứu hộ</Text>
          </View>
        </TouchableOpacity>

        {/* Footer info text */}
        <Text style={styles.footerText}>
          Đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7 đối với mọi trường hợp khẩn cấp hoặc vấn đề kỹ thuật.
        </Text>
      </ScrollView>

      {/* Avatar / Profile Action Popup Modal */}
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
              <Text style={styles.actionSheetTitle}>Tài khoản & Hồ sơ</Text>
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
                <Text style={styles.optionTitle}>Chỉnh sửa hồ sơ</Text>
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
                <Text style={styles.optionSubtitle}>Chọn từ bộ sưu tập hoặc nhập link ảnh</Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
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

      {/* Modern Custom Alert (Replaces browser alert/confirm) */}
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
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSmallAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  bellButton: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bigAvatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  bigAvatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#e2e8f0',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 3,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 14,
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
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  partnerButton: {
    backgroundColor: '#ea580c',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  partnerBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partnerIconWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 2,
  },
  partnerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
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
    gap: 12,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});

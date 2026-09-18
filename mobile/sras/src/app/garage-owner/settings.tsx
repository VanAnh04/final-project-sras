import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Image,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/authApi';
import CustomAlert, { AlertType } from '../../components/ui/CustomAlert';
import AvatarPickerModal from '../../components/ui/AvatarPickerModal';
import { 
  Building2, 
  Phone, 
  MapPin, 
  Clock, 
  LogOut, 
  ChevronRight, 
  ShieldCheck, 
  HelpCircle,
  Pencil,
  Camera,
  X,
  User,
  Settings,
  Bell,
  Wallet,
  FileText
} from 'lucide-react-native';

export default function GarageSettingsScreen() {
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
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Quản trị Gara không?',
      'warning',
      'Đăng xuất',
      'Hủy',
      logout
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
    router.push('/garage-owner/edit-profile');
  };

  const avatarUri = user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
  const displayName = user?.fullName || 'Chủ cơ sở Gara';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: avatarUri }}
            style={styles.headerSmallAvatar}
          />
          <Text style={styles.logoText}>SRAS GARAGE</Text>
        </View>

        <TouchableOpacity 
          style={styles.bellButton}
          onPress={() => router.push('/garage-owner/orders')}
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
              source={{ uri: avatarUri }}
              style={styles.bigAvatarImage}
            />
            <View style={styles.editBadge}>
              <Pencil size={14} color="#ffffff" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
          <Text style={styles.userNameText}>{displayName}</Text>
          <View style={styles.roleBadge}>
            <Building2 size={13} color="#ea580c" />
            <Text style={styles.roleBadgeText}>Admin Gara / Chủ cơ sở</Text>
          </View>
          <Text style={styles.phoneText}>{user?.phone || '0988.111.222'}</Text>
        </View>

        {/* Group 1: Hoạt động Gara */}
        <View style={styles.menuCard}>
          <Text style={styles.groupTitle}>Thông tin cơ sở Gara</Text>

          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => showAlert('Thông tin Gara', 'Địa chỉ: 123 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức\nHotline: 0988.111.222\nTrạng thái: Đã phê duyệt hoạt động', 'info')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff7ed' }]}>
              <Building2 size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Hồ sơ & Địa chỉ cơ sở</Text>
              <Text style={styles.menuSubLabel}>Gara AutoCare Thủ Đức</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => showAlert('Thời gian phục vụ', 'Thời gian hoạt động: 24/7 (Sẵn sàng nhận cứu hộ khẩn cấp)\nBán kính nhận đơn: 15 km', 'info')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff7ed' }]}>
              <Clock size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Thời gian phục vụ & Bán kính</Text>
              <Text style={styles.menuSubLabel}>24/7 • Bán kính 15km</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuRow, { borderBottomWidth: 0 }]} 
            activeOpacity={0.7}
            onPress={() => router.push('/garage-owner/wallet')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff7ed' }]}>
              <Wallet size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Ví doanh thu & Chiết khấu</Text>
              <Text style={styles.menuSubLabel}>Chiết khấu hệ thống: 15%</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Group 2: Tài khoản & Hệ thống */}
        <View style={styles.menuCard}>
          <Text style={styles.groupTitle}>Tài khoản & Hỗ trợ</Text>

          {/* Chỉnh sửa hồ sơ */}
          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => router.push('/garage-owner/edit-profile')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <User size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <Text style={styles.menuLabel}>Chỉnh sửa thông tin cá nhân</Text>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Trợ giúp */}
          <TouchableOpacity 
            style={styles.menuRow} 
            activeOpacity={0.7}
            onPress={() => showAlert('Hỗ trợ đối tác', 'Hotline hỗ trợ kỹ thuật và vận hành dành riêng cho Gara đối tác SRAS:\n📞 1900 6868 (Phím 2)', 'info')}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <HelpCircle size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <Text style={styles.menuLabel}>Hỗ trợ đối tác 24/7</Text>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Đăng xuất */}
          <TouchableOpacity 
            style={[styles.menuRow, styles.lastMenuRow]} 
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fff1f2' }]}>
              <LogOut size={20} color="#ea580c" strokeWidth={2.2} />
            </View>
            <Text style={[styles.menuLabel, { color: '#ea580c' }]}>Đăng xuất tài khoản</Text>
          </TouchableOpacity>
        </View>

        {/* Footer info text */}
        <Text style={styles.footerText}>
          Hệ thống Quản trị Đối tác Cứu hộ SRAS • Phiên bản 1.0.0
        </Text>
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
              <TouchableOpacity onPress={() => setShowAvatarMenu(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.avatarActionItem}
              onPress={() => {
                setShowAvatarMenu(false);
                setShowAvatarPicker(true);
              }}
            >
              <Camera size={20} color="#ea580c" />
              <Text style={styles.avatarActionText}>Chọn ảnh từ bộ sưu tập</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.avatarActionItem}
              onPress={openEditProfile}
            >
              <Pencil size={20} color="#ea580c" />
              <Text style={styles.avatarActionText}>Chỉnh sửa thông tin hồ sơ</Text>
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerSmallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  bellButton: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 10,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  phoneText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
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
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
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
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  avatarModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 16,
  },
  avatarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  avatarActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  avatarActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
});
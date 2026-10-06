import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/authApi';
import { resolveFileUrl } from '../../api/axiosClient';
import CustomAlert, { AlertType } from '../../components/ui/CustomAlert';
import AvatarPickerModal from '../../components/ui/AvatarPickerModal';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Lock,
  ChevronRight,
  X,
  Camera,
  ShieldCheck,
} from 'lucide-react-native';

export default function GarageStaffEditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  // Form states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [initialEmail, setInitialEmail] = useState(user?.email || '');

  // Avatar
  const [avatarUri, setAvatarUri] = useState(
    user?.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  );
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.fullName) setFullName(user.fullName);
      if (user.phone) setPhone(user.phone);
      if (user.email) {
        setEmail(user.email);
        setInitialEmail(user.email);
        setIsEmailVerified(true);
      }
      if (user.avatarUrl) setAvatarUri(user.avatarUrl);
    }
  }, [user]);

  const handleSelectAvatar = async (newUrl: string) => {
    setAvatarUri(newUrl);
    try {
      if (user) {
        await authApi.updateProfile({
          userId: user.id,
          fullName: fullName.trim() || user.fullName,
          phone: (user.phone || phone).trim(),
          email: email.trim() || undefined,
          avatarUrl: newUrl,
        });
        await updateUser({ avatarUrl: newUrl });
      }
    } catch (err: any) {
      // error handled silently
    }
  };

  // Email verification modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isEmailVerified, setIsEmailVerified] = useState(!!user?.email);

  // Custom Alert state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (title: string, message: string, type: AlertType = 'info', onOk?: () => void) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        if (onOk) onOk();
      },
    });
  };

  // Countdown for OTP resend
  useEffect(() => {
    let timer: any;
    if (showOtpModal && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, countdown]);

  // Handle Save Profile
  const handleSave = async () => {
    if (!fullName.trim()) {
      showAlert('Thiếu thông tin', 'Vui lòng nhập họ và tên của bạn.', 'warning');
      return;
    }

    const currentPhone = user?.phone || phone;
    if (!currentPhone.trim()) {
      showAlert('Thiếu thông tin', 'Vui lòng nhập số điện thoại.', 'warning');
      return;
    }

    const trimmedEmail = email.trim();

    // Check email requirement: If user entered a new email or changed it
    if (trimmedEmail && trimmedEmail !== initialEmail && !isEmailVerified) {
      setIsSendingEmail(true);
      try {
        await authApi.sendEmailOtp(trimmedEmail);
        setShowOtpModal(true);
        setCountdown(60);
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          'Không thể gửi mã OTP về email. Vui lòng kiểm tra lại địa chỉ email.';
        showAlert('Lỗi gửi Email', errorMsg, 'error');
      } finally {
        setIsSendingEmail(false);
      }
      return;
    }

    // Save directly to Backend & Local context
    await applyProfileChanges(trimmedEmail);
  };

  const applyProfileChanges = async (verifiedEmail?: string) => {
    setIsSaving(true);
    const targetEmail = verifiedEmail !== undefined ? verifiedEmail : email.trim();
    const currentPhone = (user?.phone || phone).trim();
    try {
      try {
        await authApi.updateProfile({
          userId: user?.id,
          fullName: fullName.trim(),
          phone: currentPhone,
          email: targetEmail || undefined,
          avatarUrl: avatarUri,
        });
      } catch (apiErr: any) {
        // Continue if local updates succeed
      }

      await updateUser({
        fullName: fullName.trim(),
        phone: currentPhone,
        email: targetEmail,
        avatarUrl: avatarUri,
      });

      setInitialEmail(targetEmail);
      if (targetEmail) {
        setIsEmailVerified(true);
      }

      showAlert(
        'Thành công',
        'Thông tin hồ sơ của bạn đã được cập nhật thành công!',
        'success',
        () => router.back()
      );
    } catch (err: any) {
      showAlert('Lỗi', 'Không thể lưu thay đổi. Vui lòng thử lại sau.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle verify OTP for email
  const handleVerifyOtp = async () => {
    if (otpCode.trim().length < 4) {
      showAlert('Thiếu mã OTP', 'Vui lòng nhập đầy đủ mã xác thực OTP.', 'warning');
      return;
    }

    setIsVerifyingEmail(true);
    const trimmedEmail = email.trim();

    try {
      await authApi.verifyEmailOtp(trimmedEmail, otpCode.trim());
      setIsEmailVerified(true);
      setShowOtpModal(false);
      await applyProfileChanges(trimmedEmail);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Mã xác thực OTP không đúng hoặc đã hết hạn.';
      showAlert('Xác thực thất bại', errorMsg, 'error');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    try {
      await authApi.sendEmailOtp(trimmedEmail);
      setCountdown(60);
      showAlert('Đã gửi mã mới', `Mã xác thực mới đã được gửi tới email ${trimmedEmail}`, 'success');
    } catch (err: any) {
      showAlert('Lỗi gửi lại', 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#ea580c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa thông tin</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            activeOpacity={0.85}
            onPress={() => setShowAvatarPicker(true)}
          >
            <Image source={{ uri: resolveFileUrl(avatarUri) }} style={styles.avatarImage} />
            <View style={styles.cameraIconBadge}>
              <Camera size={14} color="#ffffff" strokeWidth={2.4} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Chạm vào ảnh để đổi ảnh đại diện</Text>

          <View style={styles.roleTag}>
            <ShieldCheck size={13} color="#ea580c" strokeWidth={2.4} />
            <Text style={styles.roleTagText}>Kỹ thuật viên cứu hộ</Text>
          </View>
        </View>

        {/* Form Fields Card */}
        <View style={styles.formCard}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Họ và tên <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <User size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Phone (read-only for security) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <View style={[styles.inputWrapper, styles.disabledInput]}>
              <Phone size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: '#64748b' }]}
                value={phone}
                editable={false}
                placeholder="Số điện thoại"
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.fixedBadge}>
                <Text style={styles.fixedBadgeText}>Cố định</Text>
              </View>
            </View>
            <Text style={styles.helperText}>Số điện thoại được dùng làm mã định danh tài khoản thợ.</Text>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email liên hệ</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (text.trim() !== initialEmail) {
                    setIsEmailVerified(false);
                  } else {
                    setIsEmailVerified(true);
                  }
                }}
                placeholder="Nhập email liên hệ (VD: tho@gara.vn)"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {isEmailVerified && email.trim().length > 0 && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Đã xác thực</Text>
                </View>
              )}
            </View>
            {email.trim().length > 0 && !isEmailVerified && (
              <Text style={styles.warningHelperText}>
                Email mới cần xác thực mã OTP khi bạn lưu thông tin.
              </Text>
            )}
          </View>

          {/* Change Password Link */}
          <TouchableOpacity
            style={styles.changePasswordRow}
            activeOpacity={0.7}
            onPress={() => router.push('/garage-staff/change-password' as any)}
          >
            <View style={styles.changePasswordLeft}>
              <View style={styles.lockIconWrap}>
                <Lock size={18} color="#ea580c" />
              </View>
              <View>
                <Text style={styles.changePasswordTitle}>Đổi mật khẩu tài khoản</Text>
                <Text style={styles.changePasswordSub}>Thay đổi mật khẩu đăng nhập của bạn</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && { opacity: 0.8 }]}
          activeOpacity={0.88}
          onPress={handleSave}
          disabled={isSaving || isSendingEmail}
        >
          {isSaving || isSendingEmail ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Email OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalCard}>
            <View style={styles.otpModalHeader}>
              <Text style={styles.otpModalTitle}>Xác thực Email</Text>
              <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.otpModalSubtitle}>
              Mã xác thực đã được gửi tới email <Text style={{ fontWeight: '700', color: '#ea580c' }}>{email}</Text>. Vui lòng nhập mã để hoàn tất.
            </Text>

            <TextInput
              style={styles.otpInput}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="Nhập mã OTP (6 số)"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              style={styles.verifyButton}
              activeOpacity={0.85}
              onPress={handleVerifyOtp}
              disabled={isVerifyingEmail}
            >
              {isVerifyingEmail ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.verifyButtonText}>Xác nhận & Cập nhật</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Chưa nhận được mã? </Text>
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={countdown > 0}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendLink, countdown > 0 && { color: '#94a3b8' }]}>
                  {countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại mã'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        visible={showAvatarPicker}
        currentAvatarUrl={avatarUri}
        userName={fullName}
        onClose={() => setShowAvatarPicker(false)}
        onSelectAvatar={handleSelectAvatar}
      />

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#ea580c',
  },
  cameraIconBadge: {
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
  },
  avatarHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ea580c',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#dc2626',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  helperText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  warningHelperText: {
    fontSize: 11,
    color: '#d97706',
    marginTop: 4,
  },
  fixedBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fixedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  verifiedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  changePasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 6,
  },
  changePasswordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePasswordTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  changePasswordSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  otpModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
  },
  otpModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  otpModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  otpModalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  otpInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#ea580c',
    borderRadius: 12,
    height: 48,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
    color: '#0f172a',
    marginBottom: 16,
  },
  verifyButton: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  resendText: {
    fontSize: 12,
    color: '#64748b',
  },
  resendLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
});

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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/authApi';
import { resolveFileUrl } from '../../api/axiosClient';
import CustomAlert, { AlertType } from '../../components/ui/CustomAlert';
import AvatarPickerModal from '../../components/ui/AvatarPickerModal';
import { resolveUserAvatar } from '../../utils/avatar';
import { 
  ArrowLeft, 
  Bell, 
  Pencil, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  ChevronRight, 
  X, 
  Camera, 
  Building2 
} from 'lucide-react-native';

export default function GarageOwnerEditProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnRoute = params?.from === 'garage-profile' ? '/garage-owner/garage-profile' : '/garage-owner/settings';
  const { user, updateUser } = useAuth();

  // Form states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [initialEmail, setInitialEmail] = useState(user?.email || '');
  
  // Avatar
  const [avatarUri, setAvatarUri] = useState(
    resolveUserAvatar(user?.avatarUrl, user?.fullName)
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
      setAvatarUri(resolveUserAvatar(user.avatarUrl, user.fullName));
    }
  }, [user]);

  const handleSelectAvatar = async (newUrl: string) => {
    setAvatarUri(newUrl);
    try {
      if (user) {
        await authApi.updateProfile({
          userId: user.id,
          fullName: fullName.trim(),
          phone: (user.phone || phone).trim(),
          email: email.trim() || undefined,
          avatarUrl: newUrl,
        });
        await updateUser({ avatarUrl: newUrl });
      }
    } catch (err: any) {
      // error handled
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
        const errorMsg = err?.response?.data?.message || err?.message || 'Không thể gửi mã OTP về email. Vui lòng kiểm tra lại địa chỉ email.';
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
      // Call Backend API to update DB
      try {
        await authApi.updateProfile({
          userId: user?.id,
          fullName: fullName.trim(),
          phone: currentPhone,
          email: targetEmail || undefined,
          avatarUrl: avatarUri,
        });
      } catch (apiErr: any) {
        // ignore background profile sync error
      }

      // Update Local context
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

      showAlert('Thành công', 'Thông tin hồ sơ Admin Gara đã được cập nhật thành công!', 'success', () => {
        router.replace(returnRoute as any);
      });
    } catch (err: any) {
      showAlert('Lỗi', 'Không thể lưu thay đổi. Vui lòng thử lại sau.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle verify OTP for email
  const handleVerifyOtp = async () => {
    if (otpCode.trim().length < 4) {
      showAlert('Thiếu mã OTP', 'Vui lòng nhập đầy đủ 6 số mã xác thực OTP.', 'warning');
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

  const handleBack = () => {
    router.replace(returnRoute as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ Gara</Text>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          
          {/* Avatar & Display Name */}
          <View style={styles.avatarSection}>
            <TouchableOpacity 
              style={styles.avatarWrapper} 
              activeOpacity={0.85}
              onPress={() => setShowAvatarPicker(true)}
            >
              <Image 
                source={{ uri: resolveFileUrl(avatarUri) }} 
                style={styles.avatarImage} 
              />
              <View style={styles.editBadge}>
                <Camera size={13} color="#ffffff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowAvatarPicker(true)}
              style={styles.changeAvatarLink}
              activeOpacity={0.7}
            >
              <Text style={styles.changeAvatarText}>Đổi ảnh đại diện</Text>
            </TouchableOpacity>
            <Text style={styles.avatarName}>{fullName || user?.fullName || 'Admin Gara'}</Text>
            <View style={styles.roleTag}>
              <Building2 size={12} color="#ea580c" />
              <Text style={styles.roleTagText}>Quản trị viên Gara</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Field 1: Họ và tên */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Họ và tên chủ cơ sở</Text>
              <View style={styles.inputContainer}>
                <User size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Field 2: Số điện thoại (Disabled) */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Số điện thoại</Text>
                <Text style={styles.disabledTag}>Không thể thay đổi</Text>
              </View>
              <View style={[styles.inputContainer, styles.inputContainerDisabled]}>
                <Phone size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, styles.textInputDisabled]}
                  value={phone}
                  editable={false}
                  placeholder="Số điện thoại"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <Text style={styles.fieldHint}>
                Số điện thoại liên kết với tài khoản Gara không thể chỉnh sửa.
              </Text>
            </View>

            {/* Field 3: Email */}
            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.label}>Email quản trị</Text>
                {email && email !== initialEmail && !isEmailVerified && (
                  <Text style={styles.unverifiedTag}>Cần xác thực mã OTP</Text>
                )}
                {isEmailVerified && email && (
                  <Text style={styles.verifiedTag}>✓ Đã xác thực</Text>
                )}
              </View>
              <View style={styles.inputContainer}>
                <Mail size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (val !== initialEmail) {
                      setIsEmailVerified(false);
                    }
                  }}
                  placeholder="Thêm email (để nhận hóa đơn & thông báo hệ thống)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.fieldHint}>
                Dùng để nhận thông báo đối soát doanh thu và đơn cứu hộ.
              </Text>
            </View>

            {/* Field 4: Mật khẩu */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Bảo mật tài khoản</Text>
              <TouchableOpacity 
                style={styles.passwordRow}
                activeOpacity={0.8}
                onPress={() => router.push('/garage-owner/change-password' as any)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Lock size={18} color="#64748b" />
                  <Text style={styles.passwordLabel}>Đổi mật khẩu</Text>
                </View>
                <ChevronRight size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                activeOpacity={0.8}
                onPress={() => router.back()}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveButton}
                activeOpacity={0.88}
                onPress={handleSave}
                disabled={isSendingEmail || isSaving}
              >
                {isSendingEmail || isSaving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </ScrollView>

      {/* Modal Email OTP Verification */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Mail size={24} color="#ea580c" />
              </View>
              <TouchableOpacity 
                style={styles.closeModalBtn}
                onPress={() => setShowOtpModal(false)}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Xác nhận địa chỉ Email</Text>
            <Text style={styles.modalSubtitle}>
              Mã xác thực gồm 6 chữ số đã được gửi qua email đến:
            </Text>
            <Text style={styles.modalEmailTarget}>{email}</Text>

            <View style={styles.otpInputWrap}>
              <TextInput
                style={styles.otpTextInput}
                placeholder="Nhập mã OTP 6 số"
                placeholderTextColor="#94a3b8"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={true}
              />
            </View>

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Không nhận được mã? </Text>
              <TouchableOpacity onPress={handleResendOtp} disabled={countdown > 0}>
                <Text style={[styles.resendAction, countdown > 0 && { color: '#94a3b8' }]}>
                  {countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại ngay'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.verifyBtn}
              onPress={handleVerifyOtp}
              disabled={isVerifyingEmail}
            >
              {isVerifyingEmail ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>Xác nhận & Lưu email</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modern Avatar Picker Modal */}
      <AvatarPickerModal
        visible={showAvatarPicker}
        currentAvatarUrl={avatarUri}
        userName={fullName || user?.fullName || 'Admin Gara'}
        onClose={() => setShowAvatarPicker(false)}
        onSelectAvatar={handleSelectAvatar}
      />

      {/* Modern Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#e2e8f0',
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
  changeAvatarLink: {
    marginBottom: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  changeAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  formSection: {
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  disabledTag: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unverifiedTag: {
    fontSize: 11,
    color: '#ea580c',
    fontWeight: '600',
  },
  verifiedTag: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputContainerDisabled: {
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
    height: '100%',
  },
  textInputDisabled: {
    color: '#64748b',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  buttonsContainer: {
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtn: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
  },
  modalEmailTarget: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c',
    textAlign: 'center',
    marginVertical: 4,
  },
  otpInputWrap: {
    marginVertical: 16,
    alignItems: 'center',
  },
  otpTextInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 6,
    color: '#0f172a',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 13,
    color: '#64748b',
  },
  resendAction: {
    fontSize: 13,
    color: '#ea580c',
    fontWeight: '700',
  },
  verifyBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

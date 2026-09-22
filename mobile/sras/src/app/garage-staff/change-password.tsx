import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/authApi';
import CustomAlert, { AlertType } from '../../components/ui/CustomAlert';
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  RotateCcw,
  KeyRound,
  ShieldCheck,
} from 'lucide-react-native';

export default function GarageStaffChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Custom Alert state (SRAS Orange theme)
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

  // Password strength calculation
  const getStrengthLevel = (pass: string) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    return strength;
  };

  const strength = getStrengthLevel(newPassword);

  const getStrengthColor = (index: number) => {
    if (strength === 0) return '#e2e8f0';
    if (index >= strength) return '#e2e8f0';
    if (strength === 1) return '#dc2626'; // weak
    if (strength === 2) return '#ea580c'; // medium
    if (strength === 3) return '#3b82f6'; // good
    return '#16a34a'; // strong
  };

  const getStrengthLabel = () => {
    if (!newPassword) return '';
    if (strength <= 1) return 'Yếu';
    if (strength === 2) return 'Trung bình';
    if (strength === 3) return 'Khá an toàn';
    return 'Rất mạnh & bảo mật';
  };

  const handleSubmit = async () => {
    if (!newPassword.trim()) {
      showAlert('Thiếu thông tin', 'Vui lòng nhập mật khẩu mới của bạn.', 'warning');
      return;
    }

    if (newPassword.length < 8) {
      showAlert('Mật khẩu quá ngắn', 'Mật khẩu phải có ít nhất 8 ký tự để đảm bảo an toàn.', 'warning');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showAlert(
        'Mật khẩu chưa đủ an toàn',
        'Mật khẩu phải bao gồm ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số.',
        'warning'
      );
      return;
    }

    if (!confirmPassword.trim()) {
      showAlert('Thiếu thông tin', 'Vui lòng xác nhận lại mật khẩu mới.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert(
        'Mật khẩu không khớp',
        'Mật khẩu xác nhận không trùng khớp với mật khẩu mới. Vui lòng kiểm tra lại.',
        'error'
      );
      return;
    }

    setIsLoading(true);

    try {
      await authApi.changePassword({
        newPassword: newPassword.trim(),
      });
      setIsLoading(false);
      showAlert(
        'Thành công',
        'Mật khẩu của bạn đã được cập nhật thành công! Vui lòng sử dụng mật khẩu mới cho các lần đăng nhập tiếp theo.',
        'success',
        () => {
          router.back();
        }
      );
    } catch (err: any) {
      setIsLoading(false);
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại sau.';
      showAlert('Đổi mật khẩu thất bại', errorMsg, 'error');
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

        <Text style={styles.logoText}>SRAS</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Center Icon Circle */}
        <View style={styles.iconCircleWrapper}>
          <View style={styles.iconCircle}>
            <RotateCcw size={28} color="#ea580c" strokeWidth={2.4} />
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.mainTitle}>Đặt lại mật khẩu</Text>
        <Text style={styles.subTitle}>
          Tài khoản kỹ thuật viên cứu hộ: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{user?.phone || 'Kỹ thuật viên'}</Text>
          {'\n'}Vui lòng thiết lập mật khẩu mới để bảo vệ an toàn cho tài khoản của bạn.
        </Text>

        {/* Form Inputs Card */}
        <View style={styles.cardContainer}>
          {/* New Password */}
          <View style={styles.inputSection}>
            <Text style={styles.fieldLabel}>Mật khẩu mới</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.prefixIcon}>
                <Lock size={19} color="#ea580c" strokeWidth={2} />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.suffixIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
                activeOpacity={0.7}
              >
                {showNewPassword ? (
                  <EyeOff size={19} color="#94a3b8" />
                ) : (
                  <Eye size={19} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </View>

            {/* Password Strength Meter */}
            {newPassword.length > 0 && (
              <View style={styles.strengthWrapper}>
                <View style={styles.strengthBarsRow}>
                  {[0, 1, 2, 3].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: getStrengthColor(index) },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabelText, { color: getStrengthColor(strength - 1) }]}>
                  {getStrengthLabel()}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={[styles.inputSection, { marginTop: 16 }]}>
            <Text style={styles.fieldLabel}>Xác nhận mật khẩu</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.prefixIcon}>
                <KeyRound size={19} color="#ea580c" strokeWidth={2} />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.suffixIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                activeOpacity={0.7}
              >
                {showConfirmPassword ? (
                  <EyeOff size={19} color="#94a3b8" />
                ) : (
                  <Eye size={19} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Requirements Checklist */}
          <View style={styles.checklistCard}>
            <Text style={styles.checklistHeader}>Yêu cầu bảo mật:</Text>
            <Text style={[styles.checklistItem, newPassword.length >= 8 && styles.checklistItemMet]}>
              • Tối thiểu 8 ký tự
            </Text>
            <Text
              style={[
                styles.checklistItem,
                /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && styles.checklistItemMet,
              ]}
            >
              • Chứa chữ hoa và chữ thường
            </Text>
            <Text
              style={[styles.checklistItem, /[0-9]/.test(newPassword) && styles.checklistItemMet]}
            >
              • Chứa ít nhất 1 chữ số
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && { opacity: 0.85 }]}
            activeOpacity={0.88}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Text style={styles.submitBtnText}>Cập nhật mật khẩu</Text>
                <ArrowRight size={18} color="#ffffff" strokeWidth={2.4} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconCircleWrapper: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  inputSection: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
  },
  prefixIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  suffixIcon: {
    padding: 6,
  },
  strengthWrapper: {
    marginTop: 8,
  },
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabelText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  checklistCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  checklistHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c',
    marginBottom: 4,
  },
  checklistItem: {
    fontSize: 11,
    color: '#9a3412',
    lineHeight: 18,
  },
  checklistItemMet: {
    color: '#16a34a',
    fontWeight: '700',
  },
  submitButton: {
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
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

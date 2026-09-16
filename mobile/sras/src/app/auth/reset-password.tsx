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
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axiosClient from '../../api/axiosClient';
import CustomAlert, { AlertType } from '../../components/ui/CustomAlert';
import { 
  ArrowLeft, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  KeyRound,
  ShieldCheck
} from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const identifier = (params.identifier as string) || '';
  const otp = (params.otp as string) || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!identifier || !otp) {
      showAlert('Lỗi phiên làm việc', 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thử lại từ đầu.', 'error', () => {
        router.replace('/auth/forgot-password');
      });
      return;
    }

    if (!newPassword.trim()) {
      showAlert('Thiếu thông tin', 'Vui lòng nhập mật khẩu mới của bạn.', 'warning');
      return;
    }

    if (newPassword.length < 8) {
      showAlert('Mật khẩu quá ngắn', 'Mật khẩu phải có ít nhất 8 ký tự để đảm bảo an toàn.', 'warning');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showAlert('Mật khẩu chưa đủ an toàn', 'Mật khẩu phải bao gồm ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số.', 'warning');
      return;
    }

    if (!confirmPassword.trim()) {
      showAlert('Thiếu thông tin', 'Vui lòng xác nhận lại mật khẩu mới.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới. Vui lòng kiểm tra lại.', 'error');
      return;
    }

    try {
      setIsLoading(true);

      await axiosClient.post('/auth/forgot-password/reset-password', {
        identifier,
        otp,
        newPassword,
      });

      showAlert(
        'Đặt lại mật khẩu thành công',
        'Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.',
        'success',
        () => {
          router.replace('/auth/login');
        }
      );
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại sau.';
      showAlert('Đặt lại mật khẩu thất bại', errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#ea580c" />
        </TouchableOpacity>

        <Text style={styles.logoText}>SRAS</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Center Illustrated Icon Circle */}
        <View style={styles.graphicCircleWrapper}>
          <View style={styles.graphicCircle}>
            <View style={styles.iconCenter}>
              <KeyRound size={36} color="#ea580c" strokeWidth={2.4} />
            </View>
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.screenTitle}>Đặt lại mật khẩu</Text>
        <Text style={styles.screenSubtitle}>
          Thiết lập mật khẩu mới an toàn cho tài khoản{'\n'}
          <Text style={styles.identifierHighlight}>{identifier}</Text>
        </Text>

        {/* Form */}
        <View style={styles.formContainer}>
          
          {/* Field 1: Mật khẩu mới */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Mật khẩu mới</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color="#94a3b8" style={styles.inputLeftIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeBtn}
                onPress={() => setShowNewPassword(!showNewPassword)}
                activeOpacity={0.7}
              >
                {showNewPassword ? (
                  <EyeOff size={18} color="#94a3b8" />
                ) : (
                  <Eye size={18} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator Bars */}
            <View style={styles.strengthBarRow}>
              <View style={[styles.strengthSegment, { backgroundColor: getStrengthColor(0) }]} />
              <View style={[styles.strengthSegment, { backgroundColor: getStrengthColor(1) }]} />
              <View style={[styles.strengthSegment, { backgroundColor: getStrengthColor(2) }]} />
              <View style={[styles.strengthSegment, { backgroundColor: getStrengthColor(3) }]} />
            </View>
            <Text style={styles.helperText}>Mật khẩu gồm chữ hoa, chữ thường và chữ số.</Text>
          </View>

          {/* Field 2: Xác nhận mật khẩu mới */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Xác nhận mật khẩu mới</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color="#94a3b8" style={styles.inputLeftIcon} />
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
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                activeOpacity={0.7}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} color="#94a3b8" />
                ) : (
                  <Eye size={18} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Button: Đặt lại mật khẩu */}
          <TouchableOpacity 
            style={styles.submitButton}
            activeOpacity={0.88}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.submitButtonText}>Đặt lại mật khẩu</Text>
                <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
              </View>
            )}
          </TouchableOpacity>

          {/* Secondary Button: Hủy và quay lại đăng nhập */}
          <TouchableOpacity 
            style={styles.cancelBtn}
            onPress={() => router.replace('/auth/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>← Hủy và quay lại Đăng nhập</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

      {/* Modern Custom Alert (SRAS Orange Theme) */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    padding: 6,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  graphicCircleWrapper: {
    alignItems: 'center',
    marginVertical: 18,
  },
  graphicCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fed7aa',
  },
  iconCenter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 12,
    marginBottom: 28,
  },
  identifierHighlight: {
    fontWeight: '700',
    color: '#ea580c',
  },
  formContainer: {
    width: '100%',
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  strengthSegment: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#ea580c',
    borderRadius: 26,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
});

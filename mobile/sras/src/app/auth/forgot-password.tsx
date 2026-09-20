import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  ActivityIndicator,
  StatusBar,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '../../api/axiosClient';
import CustomAlert, { AlertType } from '../../components/ui/CustomAlert';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Send, 
  ChevronRight,
  KeyRound,
  ShieldCheck,
  Lock
} from 'lucide-react-native';

interface ForgotPasswordFormData {
  identifier: string;
}

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    defaultValues: {
      identifier: '',
    },
  });
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

  const onSubmit = async (data: ForgotPasswordFormData) => {
    const rawInput = data.identifier.trim();
    if (!rawInput) {
      showAlert('Thiếu thông tin', 'Vui lòng nhập số điện thoại hoặc email đã đăng ký.', 'warning');
      return;
    }

    const isEmail = rawInput.includes('@');
    const phone = isEmail ? '' : rawInput;
    const email = isEmail ? rawInput.toLowerCase() : '';

    try {
      setIsLoading(true);

      await axiosClient.post('/auth/forgot-password/send-otp', {
        identifier: rawInput,
      });

      const message = isEmail
        ? `Mã OTP gồm 6 chữ số đã được gửi tới email ${email}. Vui lòng kiểm tra hòm thư của bạn.`
        : `Mã xác thực OTP đã được gửi đến số điện thoại ${phone}.`;

      showAlert(
        'Đã gửi mã xác nhận',
        message,
        'success',
        () => {
          router.push({
            pathname: '/auth/verify-otp',
            params: {
              identifier: rawInput,
              phone: phone || '',
              email: email || '',
              isForgotPassword: 'true',
            },
          });
        }
      );
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Không tìm thấy tài khoản hoặc không thể gửi mã. Vui lòng kiểm tra lại.';
      showAlert('Không thể gửi mã', errorMsg, 'error');
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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) + 8 }]}>
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
        
        {/* Center Illustrated Circle */}
        <View style={styles.graphicCircleWrapper}>
          <View style={styles.graphicCircle}>
            <View style={styles.keyIllustrationBox}>
              <View style={styles.keyholeShape}>
                <Lock size={28} color="#ea580c" strokeWidth={2.4} />
              </View>
              <View style={styles.keyGlow}>
                <KeyRound size={32} color="#f97316" strokeWidth={2.5} />
              </View>
            </View>
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.screenTitle}>Quên mật khẩu?</Text>
        <Text style={styles.screenSubtitle}>
          Vui lòng nhập số điện thoại hoặc email đã đăng ký để nhận mã xác thực đặt lại mật khẩu.
        </Text>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Số điện thoại / Email</Text>
            <View style={[styles.inputWrap, errors.identifier && styles.inputWrapError]}>
              <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
              <Controller
                control={control}
                rules={{
                  required: 'Vui lòng nhập số điện thoại hoặc email'
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.textInput}
                    placeholder="example@gmail.com hoặc 090..."
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                )}
                name="identifier"
              />
            </View>
            {errors.identifier && (
              <Text style={styles.fieldErrorText}>{errors.identifier.message as string}</Text>
            )}
          </View>

          {/* Action Button: Gửi mã xác nhận ⩥ */}
          <TouchableOpacity
            style={styles.submitButton}
            activeOpacity={0.88}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.submitButtonText}>Gửi mã xác nhận</Text>
                <ChevronRight size={22} color="#ffffff" strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <TouchableOpacity 
            style={styles.backToLoginBtn}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.backToLoginText}>← Quay lại Đăng nhập</Text>
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
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fed7aa',
  },
  keyIllustrationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  keyholeShape: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  keyGlow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
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
  inputWrapError: {
    borderColor: '#dc2626',
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
  fieldErrorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
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
    gap: 6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  backToLoginBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c',
  },
});

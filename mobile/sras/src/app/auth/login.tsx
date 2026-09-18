import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSSO, useAuth as useClerkAuth } from '@clerk/expo';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();
import { 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  MapPin, 
  Radio 
} from 'lucide-react-native';

export default function LoginScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { startSSOFlow } = useSSO();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();

  const signInWithGoogle = useCallback(async () => {
    try {
      setErrorMsg('');
      setIsGoogleLoading(true);

      // Clerk lưu session vào tokenCache (còn nguyên qua các lần mở lại app). Nếu lần
      // trước OAuth đã xong phía Clerk nhưng exchange với backend fail, session cũ vẫn
      // "treo" → startSSOFlow báo "You're already signed in". LUÔN signOut trước khi bắt
      // đầu flow mới (không dựa vào isSignedIn vì cache có thể chưa load kịp lúc bấm nút).
      await clerkSignOut().catch(() => {});

      // 1. Clerk lo toàn bộ Google OAuth (mở browser → Google → quay lại app)
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      // Người dùng huỷ, hoặc cần bước bổ sung (MFA...) → không có session
      if (!createdSessionId || !setActive) {
        return;
      }

      // 2. Kích hoạt session Clerk rồi lấy session token gửi cho backend
      await setActive({ session: createdSessionId });
      const clerkToken = await getToken();
      if (!clerkToken) {
        throw new Error('Không lấy được phiên đăng nhập Google.');
      }

      // 3. Đổi Clerk token lấy JWT của hệ thống (backend verify + map user)
      const response: any = await axiosClient.post('/auth/clerk/exchange', { clerkToken });
      const result = response?.data || response;

      // App chỉ mượn Clerk để xác thực Google → xong thì thoát Clerk, dùng JWT riêng
      await clerkSignOut().catch(() => {});

      if (result.exists && result.auth) {
        const authData = result.auth;
        await login(authData.accessToken, authData.refreshToken, authData.user);
        const role = authData.user?.role?.toUpperCase();
        if (role === 'GARAGE_OWNER') {
          router.replace('/garage-owner');
        } else if (role === 'GARAGE_STAFF') {
          router.replace('/garage-staff');
        } else {
          router.replace('/customer');
        }
      } else {
        // Customer mới → bổ sung số điện thoại + OTP
        router.push({
          pathname: '/auth/google-phone',
          params: {
            registrationToken: result.registrationToken,
            email: result.email,
            fullName: result.fullName,
            avatarUrl: result.avatarUrl || '',
          },
        });
      }
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message || error.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.',
      );
    } finally {
      setIsGoogleLoading(false);
    }
  }, [startSSOFlow, getToken, clerkSignOut, login, router]);

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      // Gửi đăng nhập (phone hoặc email)
      const isEmail = data.identifier.includes('@');
      const payload = isEmail 
        ? { email: data.identifier, password: data.password }
        : { phone: data.identifier, password: data.password };

      const response: any = await axiosClient.post('/auth/login', payload);
      
      const authData = response?.data || response;
      if (!authData?.accessToken) {
        throw new Error('Dữ liệu xác thực không hợp lệ (không tìm thấy accessToken)');
      }
      
      await login(authData.accessToken, authData.refreshToken, authData.user);
      const role = authData.user?.role?.toUpperCase();
      
      if (role === 'GARAGE_OWNER') {
        router.replace('/garage-owner');
      } else if (role === 'GARAGE_STAFF') {
        router.replace('/garage-staff');
      } else {
        router.replace('/customer');
      }
    } catch (error: any) {
      console.error(`📱 [Login Screen Error]`, error?.response?.data || error.message);
      setErrorMsg(
        error.response?.data?.message || 
        error.message || 
        'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu.'
      );
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <View style={styles.signalWaves}>
              <Radio size={18} color="#f95700" />
            </View>
            <MapPin size={28} color="#f95700" fill="#f95700" />
          </View>
          <Text style={styles.brandTitle}>SRAS</Text>
          <Text style={styles.brandSubtitle}>
            Dịch vụ cứu hộ khẩn cấp luôn sẵn sàng{'\n'}trong tầm tay bạn.
          </Text>
        </View>

        {/* Social Login Buttons (Google & Facebook) */}
        <View style={styles.socialRow}>
          {/* Google Button */}
          <TouchableOpacity 
            style={styles.socialBtn} 
            onPress={signInWithGoogle}
            disabled={isLoading || isGoogleLoading}
            activeOpacity={0.7}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#ea4335" />
            ) : (
              <>
                <View style={styles.googleIconBox}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.socialBtnText}>Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Facebook Button */}
          <TouchableOpacity 
            style={styles.socialBtn} 
            onPress={() => setErrorMsg('Đăng nhập Facebook sẽ sớm được hỗ trợ trong bản cập nhật tới.')}
            activeOpacity={0.7}
          >
            <View style={styles.fbIconBox}>
              <Text style={styles.fbIconText}>f</Text>
            </View>
            <Text style={styles.socialBtnText}>Facebook</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Hoặc</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Error Alert */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          
          {/* SĐT hoặc Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại hoặc Email</Text>
            <View style={[styles.inputWrapper, errors.identifier && styles.inputWrapperError]}>
              <UserIcon size={18} color="#94a3b8" style={styles.leftIcon} />
              <Controller
                control={control}
                rules={{ 
                  required: 'Vui lòng nhập số điện thoại hoặc email'
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +1 234 567 890"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                  />
                )}
                name="identifier"
              />
            </View>
            {errors.identifier && (
              <Text style={styles.fieldErrorText}>{errors.identifier.message as string}</Text>
            )}
          </View>

          {/* Mật khẩu */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Mật khẩu</Text>
              <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
              <Lock size={18} color="#94a3b8" style={styles.leftIcon} />
              <Controller
                control={control}
                rules={{ required: 'Vui lòng nhập mật khẩu' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    secureTextEntry={!showPassword}
                  />
                )}
                name="password"
              />
              <TouchableOpacity 
                style={styles.rightIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.fieldErrorText}>{errors.password.message as string}</Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading || isGoogleLoading}
            style={[styles.submitButton, (isLoading || isGoogleLoading) && styles.submitButtonDisabled]}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Text style={styles.submitButtonText}>Đăng nhập</Text>
                <ArrowRight size={18} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Trải nghiệm SRAS? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.registerLink}>Đăng kí ngay</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 36,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff3eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  signalWaves: {
    position: 'absolute',
    top: 10,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f95700',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
  },
  googleIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  fbIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1877f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    color: '#f95700',
    fontWeight: '600',
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
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    padding: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    height: '100%',
  },
  fieldErrorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#f95700',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#f95700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: '#64748b',
    fontSize: 13,
  },
  registerLink: {
    color: '#f95700',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 18,
  },
  quickAccountList: {
    gap: 8,
    marginBottom: 14,
  },
  quickAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  accountAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  accountName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  accountEmail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  customEmailBox: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  customEmailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  customInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  confirmGoogleBtn: {
    backgroundColor: '#f95700',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmGoogleText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});



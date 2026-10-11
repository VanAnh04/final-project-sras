import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  StatusBar,
  Image,
  Alert,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSSO, useAuth as useClerkAuth, useUser } from '@clerk/expo';
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
  Radio,
  Check,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react-native';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialIdentifier = (params.registeredPhone as string) || (params.identifier as string) || (params.phone as string) || '';
  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      identifier: initialIdentifier,
      password: '',
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(
    params.registeredSuccess === 'true'
      ? 'Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.'
      : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  // OTP Verification Modal States (khi tài khoản bắt buộc xác thực số điện thoại)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [targetPhone, setTargetPhone] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  // Đồng bộ prefill thông tin tài khoản và thông báo đăng ký thành công
  useEffect(() => {
    const prefill = (params.registeredPhone as string) || (params.identifier as string) || (params.phone as string);
    if (prefill) {
      setValue('identifier', prefill);
    }
    if (params.registeredSuccess === 'true') {
      setSuccessMsg('Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.');
    }
  }, [params.registeredPhone, params.identifier, params.phone, params.registeredSuccess, setValue]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (showOtpModal && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, otpCountdown]);

  // Auto-redirect khi đã đăng nhập
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user) {
      const role = user.role?.toUpperCase();
      if (role === 'GARAGE_OWNER') {
        router.replace('/garage-owner');
      } else if (role === 'GARAGE_STAFF') {
        router.replace('/garage-staff/home');
      } else {
        router.replace('/customer');
      }
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { startSSOFlow } = useSSO();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useUser();

  const signInWithGoogle = useCallback(async () => {
    try {
      setErrorMsg('');
      setIsGoogleLoading(true);

      // Clerk lưu session vào tokenCache (còn nguyên qua các lần mở lại app). Nếu lần
      // trước OAuth đã xong phía Clerk nhưng exchange với backend fail, session cũ vẫn
      // "treo" → startSSOFlow báo "You're already signed in". LUÔN signOut trước khi bắt
      // đầu flow mới (không dựa vào isSignedIn vì cache có thể chưa load kịp lúc bấm nút).
      await clerkSignOut().catch(() => { });

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
      const payload: any = { clerkToken };
      if (clerkUser) {
        payload.email = clerkUser.primaryEmailAddress?.emailAddress;
        payload.fullName = clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
        payload.avatarUrl = clerkUser.imageUrl;
      }

      const response: any = await axiosClient.post('/auth/clerk/exchange', payload);
      const result = response?.data || response;

      // App chỉ mượn Clerk để xác thực Google → xong thì thoát Clerk, dùng JWT riêng
      await clerkSignOut().catch(() => { });

      if (result.exists && result.auth) {
        const authData = result.auth;
        await login(authData.accessToken, authData.refreshToken, authData.user);
        const role = authData.user?.role?.toUpperCase();
        if (role === 'GARAGE_OWNER') {
          router.replace('/garage-owner');
        } else if (role === 'GARAGE_STAFF') {
          router.replace('/garage-staff/home');
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
        ? { email: data.identifier, password: data.password, rememberMe }
        : { phone: data.identifier, password: data.password, rememberMe };

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
        router.replace('/garage-staff/home');
      } else {
        router.replace('/customer');
      }
    } catch (error: any) {
      console.log('📱 [Login Screen]:', error?.response?.data?.message || error.message);
      const resData = error?.response?.data;
      const requiresPhoneVerification =
        resData?.data?.requiresPhoneVerification ||
        resData?.message?.includes('chưa được xác minh') ||
        error?.message?.includes('chưa được xác minh');

      if (requiresPhoneVerification) {
        const targetPhone = resData?.data?.phone || (!data.identifier.includes('@') ? data.identifier : '');
        router.push({
          pathname: '/auth/verify-otp',
          params: {
            phone: targetPhone,
            identifier: data.identifier,
            fromLogin: 'true',
          }
        });
        return;
      }

      const respMsg =
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : '') ||
        error?.message ||
        '';

      const isUnverified =
        respMsg.includes('chưa được xác minh') ||
        respMsg.includes('chưa xác minh') ||
        (respMsg.toLowerCase().includes('xác minh') && respMsg.toLowerCase().includes('otp'));

      if (isUnverified) {
        const isEmail = data.identifier.includes('@');
        const phoneToVerify = isEmail ? '' : data.identifier.trim();
        setTargetPhone(phoneToVerify || data.identifier.trim());
        setOtpValue(['', '', '', '', '', '']);
        setOtpError('');
        setOtpSuccess('');
        setOtpCountdown(60);
        setShowOtpModal(true);
        return;
      }

      setErrorMsg(
        respMsg ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otpValue];
    newOtp[index] = value;
    setOtpValue(newOtp);

    if (value !== '' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace' && otpValue[index] === '' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtpModal = async () => {
    const code = otpValue.join('');
    if (code.length < 6) {
      setOtpError('Vui lòng nhập đủ 6 số OTP');
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError('');

      const response: any = await axiosClient.post('/auth/verify-otp', {
        phone: targetPhone,
        otpCode: code,
      });

      const authData = response?.data || response;
      if (!authData?.accessToken) {
        throw new Error('Dữ liệu xác thực không hợp lệ (không tìm thấy accessToken)');
      }

      setOtpSuccess('Xác thực thành công! Đang đăng nhập...');
      await login(authData.accessToken, authData.refreshToken, authData.user);

      setTimeout(() => {
        setShowOtpModal(false);
        const role = authData.user?.role?.toUpperCase();
        if (role === 'GARAGE_OWNER') {
          router.replace('/garage-owner');
        } else if (role === 'GARAGE_STAFF') {
          router.replace('/garage-staff');
        } else {
          router.replace('/customer');
        }
      }, 1000);
    } catch (error: any) {
      setOtpError(error.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtpModal = async () => {
    if (otpCountdown > 0) return;
    try {
      setOtpLoading(true);
      setOtpError('');
      await axiosClient.post('/auth/resend-otp', { phone: targetPhone });
      setOtpCountdown(60);
      setOtpSuccess('Mã OTP mới đã được gửi tới số điện thoại!');
      setTimeout(() => setOtpSuccess(''), 3000);
    } catch (error: any) {
      setOtpError(error.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 12 }
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../../assets/images/sras-rescue-logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
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

        {/* Success Alert */}
        {successMsg ? (
          <View style={styles.successBox}>
            <CheckCircle2 size={18} color="#16a34a" style={styles.alertIcon} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

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

          {/* Ghi nhớ đăng nhập */}
          <TouchableOpacity
            style={styles.rememberMeRow}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </View>
            <Text style={styles.rememberMeText}>Ghi nhớ đăng nhập</Text>
          </TouchableOpacity>

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

      {/* Modal Xác thực OTP trực tiếp khi tài khoản chưa xác minh SĐT */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {/* Header Icon & Close Button */}
            <View style={styles.modalTopRow}>
              <View style={styles.modalShieldBox}>
                <ShieldCheck size={28} color="#ea580c" />
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowOtpModal(false)}
                activeOpacity={0.7}
              >
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMainTitle}>Xác thực mã OTP</Text>
            <Text style={styles.modalSubDesc}>
              Tài khoản cần xác minh số điện thoại để đăng nhập. Mã xác thực 6 số đã được gửi qua SMS đến:
            </Text>
            <Text style={styles.modalPhoneHighlight}>{targetPhone}</Text>

            {/* Error & Success Alert inside Modal */}
            {otpError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{otpError}</Text>
              </View>
            ) : null}

            {otpSuccess ? (
              <View style={styles.modalSuccessBox}>
                <Text style={styles.modalSuccessText}>{otpSuccess}</Text>
              </View>
            ) : null}

            {/* 6 OTP Input Boxes */}
            <View style={styles.modalOtpRow}>
              {otpValue.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { otpInputRefs.current[index] = ref; }}
                  style={[styles.modalOtpBox, digit !== '' && styles.modalOtpBoxFilled]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  onChangeText={(val) => handleOtpChange(index, val)}
                  onKeyPress={(e) => handleOtpKeyPress(index, e)}
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {/* Resend Action */}
            <View style={styles.modalResendRow}>
              <Text style={styles.modalResendText}>Chưa nhận được mã? </Text>
              <TouchableOpacity onPress={handleResendOtpModal} disabled={otpCountdown > 0}>
                <Text style={[styles.modalResendLink, otpCountdown > 0 && styles.modalResendDisabled]}>
                  {otpCountdown > 0 ? `Gửi lại sau (${otpCountdown}s)` : 'Gửi lại ngay'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.modalConfirmBtn, otpLoading && styles.submitButtonDisabled]}
              onPress={handleVerifyOtpModal}
              disabled={otpLoading}
              activeOpacity={0.85}
            >
              {otpLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Text style={styles.modalConfirmText}>Xác nhận & Đăng nhập</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    marginBottom: 20,
  },
  logoWrapper: {
    width: 90,
    height: 90,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#f95700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  brandLogo: {
    width: 90,
    height: 90,
    borderRadius: 24,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f95700',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 16,
    fontWeight: '500',
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  alertIcon: {
    marginRight: 4,
  },
  successText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#f95700',
    borderColor: '#f95700',
  },
  rememberMeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
  },
  modalTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalShieldBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff3eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  modalMainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  modalPhoneHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ea580c',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  modalErrorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginBottom: 12,
  },
  modalErrorText: {
    color: '#dc2626',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalSuccessBox: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginBottom: 12,
  },
  modalSuccessText: {
    color: '#059669',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalOtpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
    width: '100%',
  },
  modalOtpBox: {
    flex: 1,
    height: 52,
    maxWidth: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalOtpBoxFilled: {
    borderColor: '#ea580c',
    backgroundColor: '#fff3eb',
  },
  modalResendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  modalResendText: {
    color: '#64748b',
    fontSize: 13,
  },
  modalResendLink: {
    color: '#ea580c',
    fontSize: 13,
    fontWeight: '700',
  },
  modalResendDisabled: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  modalConfirmBtn: {
    width: '100%',
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});



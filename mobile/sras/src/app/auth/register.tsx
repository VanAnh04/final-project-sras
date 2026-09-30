import React, { useState, useCallback } from 'react';
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
  Modal,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSSO, useAuth as useClerkAuth, useUser } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();
import {
  User as UserIcon,
  Phone,
  Lock,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowRight,
  Car,
  ChevronDown,
  Check,
  MapPin,
  Radio,
  X
} from 'lucide-react-native';

const CAR_BRANDS = [
  'VinFast', 'Toyota', 'Honda', 'Hyundai', 'Kia', 'Mazda',
  'Ford', 'Mercedes-Benz', 'BMW', 'Audi', 'Porsche', 'Mitsubishi',
  'Nissan', 'Suzuki', 'Xe máy Honda', 'Xe máy Yamaha', 'Khác'
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { control, handleSubmit, watch, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState('VinFast');
  const [showBrandModal, setShowBrandModal] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { login } = useAuth();
  const password = watch("password");

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { startSSOFlow } = useSSO();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useUser();

  const signInWithGoogle = useCallback(async () => {
    try {
      setErrorMsg('');
      setIsGoogleLoading(true);

      // Clerk lưu session vào tokenCache (còn nguyên qua các lần mở lại app). Nếu còn
      // session cũ "treo", startSSOFlow sẽ báo "You're already signed in". LUÔN signOut
      // trước khi bắt đầu flow mới (không dựa vào isSignedIn vì cache có thể chưa load kịp).
      await clerkSignOut().catch(() => {});

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (!createdSessionId || !setActive) {
        return;
      }

      await setActive({ session: createdSessionId });
      const clerkToken = await getToken();
      if (!clerkToken) {
        throw new Error('Không lấy được phiên đăng nhập Google.');
      }

      const payload: any = { clerkToken };
      if (clerkUser) {
        payload.email = clerkUser.primaryEmailAddress?.emailAddress;
        payload.fullName = clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
        payload.avatarUrl = clerkUser.imageUrl;
      }

      const response: any = await axiosClient.post('/auth/clerk/exchange', payload);
      const result = response?.data || response;

      await clerkSignOut().catch(() => {});

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
        error.response?.data?.message || error.message || 'Đăng ký Google thất bại. Vui lòng thử lại.',
      );
    } finally {
      setIsGoogleLoading(false);
    }
  }, [startSSOFlow, getToken, clerkSignOut, login, router]);

  const onSubmit = async (data: any) => {
    if (!agreeTerms) {
      setErrorMsg('Vui lòng đồng ý với điều khoản và chính sách của SRAS để tiếp tục.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');

      const isEmail = data.phoneOrEmail.includes('@');
      const phone = isEmail ? '' : data.phoneOrEmail;
      const email = isEmail ? data.phoneOrEmail : null;

      // Chuẩn bị payload đăng ký
      await axiosClient.post('/auth/register', {
        fullName: data.fullName,
        phone: phone || data.phoneOrEmail,
        email: email,
        password: data.password,
        role: 'CUSTOMER',
        vehicleBrand: selectedBrand,
        vehicleModel: data.vehicleModel || null,
      });

      router.push({
        pathname: '/auth/verify-otp',
        params: { phone: phone || data.phoneOrEmail }
      });
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
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

      {/* Top Header Navigation Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
        <View style={styles.topLogoContainer}>
          <View style={styles.smallLogoBadge}>
            <MapPin size={18} color="#ea580c" fill="#ea580c" />
          </View>
          <View style={styles.logoTextContainer}>
            <Text style={styles.topLogoText}>SRAS</Text>
            <Text style={styles.topLogoTag}>CỨU HỘ 24/7</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => router.push('/auth/login')} 
          style={styles.topLoginPill}
          activeOpacity={0.8}
        >
          <Text style={styles.topLoginText}>Đăng nhập</Text>
          <View style={styles.loginArrowCircle}>
            <ArrowRight size={12} color="#ffffff" strokeWidth={2.6} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Main Card Container */}
        <View style={styles.cardContainer}>

          {/* Card Title & Subtitle */}
          <Text style={styles.cardTitle}>Đăng kí</Text>
          <Text style={styles.cardSubtitle}>
            Hãy để chúng tôi đồng hành cùng bạn trên mọi nẻo đường, đảm bảo an toàn tuyệt đối.
          </Text>

          {/* Error Alert */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* SECTION 1: THÔNG TIN CÁ NHÂN */}
          <Text style={styles.sectionHeader}>THÔNG TIN CÁ NHÂN</Text>

          {/* Họ và tên */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và tên</Text>
            <View style={[styles.inputWrapper, errors.fullName && styles.inputWrapperError]}>
              <UserIcon size={18} color="#94a3b8" style={styles.leftIcon} />
              <Controller
                control={control}
                rules={{ required: 'Vui lòng nhập họ và tên' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
                name="fullName"
              />
            </View>
            {errors.fullName && <Text style={styles.fieldErrorText}>{errors.fullName.message as string}</Text>}
          </View>

          {/* Số điện thoại hoặc email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <View style={[styles.inputWrapper, errors.phoneOrEmail && styles.inputWrapperError]}>
              <Phone size={18} color="#94a3b8" style={styles.leftIcon} />
              <Controller
                control={control}
                rules={{
                  required: 'Vui lòng nhập số điện thoại hoặc email'
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="0901234567"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                  />
                )}
                name="phoneOrEmail"
              />
            </View>
            {errors.phoneOrEmail && <Text style={styles.fieldErrorText}>{errors.phoneOrEmail.message as string}</Text>}
          </View>

          {/* Mật khẩu */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
              <Lock size={18} color="#94a3b8" style={styles.leftIcon} />
              <Controller
                control={control}
                rules={{
                  required: 'Vui lòng nhập mật khẩu',
                  minLength: { value: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Mật khẩu phải bao gồm cả chữ hoa, chữ thường và chữ số'
                  }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
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
            {errors.password && <Text style={styles.fieldErrorText}>{errors.password.message as string}</Text>}
          </View>

          {/* Xác nhận mật khẩu */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Xác nhận mật khẩu</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
              <RotateCcw size={18} color="#94a3b8" style={styles.leftIcon} />
              <Controller
                control={control}
                rules={{
                  required: 'Vui lòng xác nhận mật khẩu',
                  validate: value => value === password || 'Mật khẩu xác nhận không khớp'
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showConfirmPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
                name="confirmPassword"
              />
              <TouchableOpacity
                style={styles.rightIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.fieldErrorText}>{errors.confirmPassword.message as string}</Text>}
          </View>

          {/* SECTION 2: THÔNG TIN PHƯƠNG TIỆN */}
          <Text style={[styles.sectionHeader, { marginTop: 8 }]}>THÔNG TIN PHƯƠNG TIỆN</Text>

          {/* Hãng xe & Dòng xe 2 columns */}
          <View style={styles.vehicleRow}>
            {/* Hãng xe */}
            <View style={{ flex: 1 }}>
              <View style={styles.vehicleLabelRow}>
                <Car size={15} color="#1e293b" />
                <Text style={styles.vehicleLabel}>Hãng xe</Text>
              </View>
              <TouchableOpacity
                style={styles.selectWrapper}
                onPress={() => setShowBrandModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.selectText} numberOfLines={1}>{selectedBrand}</Text>
                <ChevronDown size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Dòng xe */}
            <View style={{ flex: 1 }}>
              <View style={styles.vehicleLabelRow}>
                <Car size={15} color="#1e293b" />
                <Text style={styles.vehicleLabel}>Dòng xe</Text>
              </View>
              <Controller
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.vehicleInput}
                    placeholder="Ví dụ: VF8"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
                name="vehicleModel"
              />
            </View>
          </View>

          {/* Terms & Policies Checkbox */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreeTerms(!agreeTerms)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
              {agreeTerms && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </View>
            <Text style={styles.termsText}>
              Tôi đồng ý với các <Text style={styles.termsLink}>điều khoản</Text> và <Text style={styles.termsLink}>chính sách</Text> của SRAS.
            </Text>
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
                <Text style={styles.submitButtonText}>Đăng ký ngay</Text>
                <ArrowRight size={18} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Hoặc đăng ký với</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            style={[styles.googleButton, isGoogleLoading && styles.submitButtonDisabled]}
            onPress={signInWithGoogle}
            disabled={isLoading || isGoogleLoading}
            activeOpacity={0.85}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#ea580c" />
            ) : (
              <View style={styles.googleButtonContent}>
                <View style={styles.googleIconBox}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
              </View>
            )}
          </TouchableOpacity>

        </View>

      </ScrollView>

      {/* Brand Selection Modal */}
      <Modal
        visible={showBrandModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBrandModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn hãng xe</Text>
              <TouchableOpacity onPress={() => setShowBrandModal(false)} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={CAR_BRANDS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.brandItem, selectedBrand === item && styles.brandItemSelected]}
                  onPress={() => {
                    setSelectedBrand(item);
                    setShowBrandModal(false);
                  }}
                >
                  <Text style={[styles.brandItemText, selectedBrand === item && styles.brandItemTextSelected]}>
                    {item}
                  </Text>
                  {selectedBrand === item && <Check size={16} color="#f95700" strokeWidth={2.5} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
      },
    }),
  },
  topLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallLogoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1.2,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextContainer: {
    justifyContent: 'center',
  },
  topLogoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.8,
  },
  topLogoTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginTop: -2,
  },
  topLoginPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#ea580c',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 6px rgba(234, 88, 12, 0.1)',
      },
    }),
  },
  topLoginText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  loginArrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8b7365',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
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
    fontSize: 13.5,
    color: '#1e293b',
    height: '100%',
  },
  fieldErrorText: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 3,
    marginLeft: 4,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  vehicleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  vehicleLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  selectText: {
    fontSize: 13,
    color: '#1e293b',
    flex: 1,
  },
  vehicleInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#1e293b',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
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
  termsText: {
    flex: 1,
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
  },
  termsLink: {
    color: '#f95700',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#f95700',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#f95700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
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
    fontSize: 14.5,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 11.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ea4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  googleButtonText: {
    color: '#1e293b',
    fontSize: 13.5,
    fontWeight: '600',
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
    padding: 20,
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brandItemSelected: {
    backgroundColor: '#fff7ed',
  },
  brandItemText: {
    fontSize: 14,
    color: '#334155',
  },
  brandItemTextSelected: {
    fontWeight: '700',
    color: '#f95700',
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  quickAccountList: {
    gap: 8,
    marginBottom: 12,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    color: '#ffffff',
    fontSize: 13,
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
    paddingTop: 10,
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



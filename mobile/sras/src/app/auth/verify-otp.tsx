import React, { useState, useEffect, useRef } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react-native';

export default function VerifyOtpScreen() {
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const identifier = (params.identifier as string) || (params.phone as string) || (params.email as string);
  const phone = params.phone as string;
  const email = params.email as string;
  const fullName = params.fullName as string;
  const avatarUrl = params.avatarUrl as string;
  const registrationToken = params.registrationToken as string;
  const isGoogleFlow = params.isGoogleFlow === 'true';
  const isForgotPassword = params.isForgotPassword === 'true';
  const { login } = useAuth();

  useEffect(() => {
    if (!phone && !email && !identifier) {
      router.replace('/auth/login');
    }
    
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [phone, email, identifier]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 số OTP');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');

      if (isForgotPassword) {
        const targetIdentifier = identifier || email || phone;
        
        await axiosClient.post('/auth/forgot-password/verify-otp', {
          identifier: targetIdentifier,
          otp: otpCode,
        });

        setSuccessMsg('Xác thực mã OTP thành công! Đang chuyển đến trang đặt lại mật khẩu...');
        setTimeout(() => {
          router.replace({
            pathname: '/auth/reset-password',
            params: {
              identifier: targetIdentifier,
              otp: otpCode,
            },
          });
        }, 1000);
      } else if (isGoogleFlow) {
        const response: any = await axiosClient.post('/auth/clerk/register', {
          registrationToken,
          phone,
          otpCode,
        });

        const authData = response?.data || response;
        if (!authData?.accessToken) {
          throw new Error('Dữ liệu xác thực không hợp lệ (không tìm thấy accessToken)');
        }

        await login(authData.accessToken, authData.refreshToken, authData.user);
        setSuccessMsg('Đăng ký & xác thực thành công! Đang chuyển hướng...');
        
        setTimeout(() => {
          const role = authData.user?.role?.toUpperCase();
          if (role === 'GARAGE_OWNER') {
            router.replace('/garage-owner');
          } else if (role === 'GARAGE_STAFF') {
            router.replace('/garage-staff');
          } else {
            router.replace('/customer');
          }
        }, 1200);
      } else {
        const response: any = await axiosClient.post('/auth/verify-otp', {
          phone: phone || identifier,
          otpCode,
        });
        
        const authData = response?.data || response;
        if (authData?.accessToken && authData?.user) {
          await login(authData.accessToken, authData.refreshToken, authData.user);
          setSuccessMsg('Xác thực số điện thoại thành công! Đang chuyển hướng...');
          
          setTimeout(() => {
            const role = authData.user?.role?.toUpperCase();
            if (role === 'GARAGE_OWNER') {
              router.replace('/garage-owner');
            } else if (role === 'GARAGE_STAFF') {
              router.replace('/garage-staff');
            } else {
              router.replace('/customer');
            }
          }, 1200);
        } else {
          setSuccessMsg('Xác thực số điện thoại thành công! Đang chuyển hướng...');
          setTimeout(() => {
            router.replace('/auth/login');
          }, 1500);
        }
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    try {
      setIsLoading(true);
      setErrorMsg('');
      if (isForgotPassword) {
        const targetIdentifier = identifier || email || phone;
        await axiosClient.post('/auth/forgot-password/send-otp', {
          identifier: targetIdentifier,
        });
      } else if (isGoogleFlow) {
        await axiosClient.post('/auth/clerk/send-otp', { registrationToken, phone });
      } else {
        await axiosClient.post('/auth/resend-otp', { phone: phone || identifier });
      }
      setCountdown(60);
      setSuccessMsg('Mã OTP mới đã được gửi!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const isEmail = !isGoogleFlow && (
    (isForgotPassword && (email?.includes('@') || identifier?.includes('@'))) ||
    (!phone && email?.includes('@'))
  );
  const targetDisplay = isGoogleFlow
    ? (phone || identifier)
    : (isEmail ? (email || identifier) : (phone || identifier));

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: 40 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        
        {/* Back Button */}
        <TouchableOpacity 
          style={{ alignSelf: 'flex-start', padding: 6, marginBottom: 12 }} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#ea580c" />
        </TouchableOpacity>

        {/* Header Icon */}
        <View style={styles.iconCircle}>
          <ShieldCheck size={40} color="#ea580c" />
        </View>

        <Text style={styles.title}>Xác thực OTP</Text>
        <Text style={styles.subtitle}>
          Mã xác thực gồm 6 chữ số đã được gửi tới {isEmail ? 'email' : 'số điện thoại'}{'\n'}
          <Text style={styles.phoneHighlight}>{targetDisplay}</Text>
        </Text>

        {/* Alerts */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* 6 OTP Inputs */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[styles.otpBox, digit !== '' && styles.otpBoxFilled]}
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={(val) => handleChange(index, val)}
              onKeyPress={(e) => handleKeyPress(index, e)}
            />
          ))}
        </View>

        {/* Resend Counter */}
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Chưa nhận được mã? </Text>
          <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
            <Text style={[styles.resendLink, countdown > 0 && styles.resendDisabled]}>
              {countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại ngay'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          onPress={handleVerify}
          disabled={isLoading}
          style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.verifyButtonText}>Xác nhận</Text>
              <ArrowRight size={20} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>

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
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff3eb',
    borderWidth: 2,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#f95700',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  successText: {
    color: '#059669',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  otpBoxFilled: {
    borderColor: '#f95700',
    backgroundColor: '#fff3eb',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  resendText: {
    color: '#6b7280',
    fontSize: 14,
  },
  resendLink: {
    color: '#f95700',
    fontSize: 14,
    fontWeight: '700',
  },
  resendDisabled: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  verifyButton: {
    width: '100%',
    backgroundColor: '#f95700',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#f95700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});



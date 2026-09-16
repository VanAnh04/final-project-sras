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
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import axiosClient from '../../api/axiosClient';
import { Smartphone, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react-native';

export default function GooglePhoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const email = (params.email as string) || '';
  const fullName = (params.fullName as string) || '';
  const avatarUrl = (params.avatarUrl as string) || '';

  const { control, handleSubmit, formState: { errors } } = useForm();
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      await axiosClient.post('/auth/google/send-otp', {
        phone: data.phone,
        email: email,
      });

      router.push({
        pathname: '/auth/verify-otp',
        params: {
          phone: data.phone,
          email: email,
          fullName: fullName,
          avatarUrl: avatarUrl,
          isGoogleFlow: 'true',
        },
      });
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message ||
        'Không thể gửi mã OTP tới số điện thoại này. Vui lòng kiểm tra lại.'
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
        
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <Smartphone size={32} color="#ea580c" />
          </View>
          <Text style={styles.title}>Liên kết số điện thoại</Text>
          <Text style={styles.subtitle}>
            Chỉ còn một bước nữa để hoàn tất đăng nhập với Google và nhận hỗ trợ cứu hộ khẩn cấp 24/7.
          </Text>
        </View>

        {/* Google User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{fullName ? fullName.charAt(0).toUpperCase() : 'G'}</Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{fullName || 'Tài khoản Google'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <CheckCircle2 size={16} color="#16a34a" />
            <Text style={styles.verifiedText}>Google</Text>
          </View>
        </View>

        {/* Error Box */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <ShieldAlert size={18} color="#dc2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Phone Input Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại nhận mã xác thực (OTP)</Text>
            <Controller
              control={control}
              rules={{
                required: 'Vui lòng nhập số điện thoại',
                pattern: {
                  value: /^(0|\+84)[3|5|7|8|9][0-9]{8}$/,
                  message: 'Số điện thoại không hợp lệ (VD: 0901234567)',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  placeholder="Ví dụ: 0912345678"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  autoFocus
                />
              )}
              name="phone"
            />
            {errors.phone && (
              <Text style={styles.fieldErrorText}>{errors.phone.message as string}</Text>
            )}
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              💡 Mã OTP sẽ được gửi qua tin nhắn SMS tới số điện thoại này để xác thực danh tính chủ sở hữu xe.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Tiếp tục & Nhận mã OTP</Text>
                <ArrowRight size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Cancel / Back to Login */}
        <TouchableOpacity
          onPress={() => router.replace('/auth/login')}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>Quay lại trang Đăng nhập</Text>
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
    paddingVertical: 36,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff3eb',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f95700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    flex: 1,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  fieldErrorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  noteBox: {
    backgroundColor: '#fff3eb',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 18,
  },
  noteText: {
    fontSize: 12,
    color: '#c2410c',
    lineHeight: 18,
  },
  submitButton: {
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
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
});


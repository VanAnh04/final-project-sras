import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { 
  AlertTriangle, 
  Clock, 
  ShieldCheck 
} from 'lucide-react-native';

export default function RootIndex() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Đang tải SRAS...</Text>
      </View>
    );
  }

  // Đã đăng nhập → chuyển hướng ngay lập tức bằng Redirect (tránh kẹt màn hình loading)
  if (isAuthenticated && user) {
    const role = user.role?.toUpperCase();
    if (role === 'GARAGE_OWNER') {
      return <Redirect href="/garage-owner" />;
    } else if (role === 'GARAGE_STAFF') {
      return <Redirect href="/garage-staff/home" />;
    } else {
      return <Redirect href="/customer" />;
    }
  }

  // Chưa đăng nhập → Welcome screen (Trang mở đầu)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.content}>
        
        {/* Logo & Intro */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <AlertTriangle size={44} color="#ea580c" />
          </View>
          <Text style={styles.brandTitle}>SRAS</Text>
          <Text style={styles.brandSubtitle}>Cứu hộ xe máy & ô tô 24/7</Text>
          <Text style={styles.brandDescription}>
            Hệ thống kết nối cứu hộ giao thông khẩn cấp nhanh chóng, minh bạch và an toàn hàng đầu.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIconWrap, { backgroundColor: '#ffedd5' }]}>
              <Clock size={20} color="#ea580c" />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Có mặt sau 15 - 30 phút</Text>
              <Text style={styles.featureSub}>Định vị gara và thợ sửa chữa gần nhất</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIconWrap, { backgroundColor: '#dbeafe' }]}>
              <ShieldCheck size={20} color="#2563eb" />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Báo giá rõ ràng, minh bạch</Text>
              <Text style={styles.featureSub}>Duyệt chi phí trước khi sửa, không lo chặt chém</Text>
            </View>
          </View>
        </View>

        {/* Auth Buttons */}
        <View style={styles.authActions}>
          <TouchableOpacity 
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.8}
            style={styles.loginBtn}
          >
            <Text style={styles.loginBtnText}>Đăng nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.8}
            style={styles.registerBtn}
          >
            <Text style={styles.registerBtnText}>Đăng ký tài khoản mới</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffedd5',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ea580c',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
  },
  brandDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  features: {
    gap: 16,
    marginVertical: 32,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 12,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontWeight: '600',
    color: '#111827',
    fontSize: 14,
  },
  featureSub: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  authActions: {
    gap: 12,
    marginBottom: 16,
  },
  loginBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  registerBtn: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerBtnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
});

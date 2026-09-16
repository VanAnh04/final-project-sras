import { View, Text, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  ShieldCheck
} from 'lucide-react-native';

export default function RootIndex() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Auto-redirect khi đã đăng nhập
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const role = user.role?.toUpperCase();
      if (role === 'GARAGE_OWNER') {
        router.replace('/garage-owner');
      } else if (role === 'GARAGE_STAFF') {
        router.replace('/garage-staff');
      } else {
        // CUSTOMER hoặc các role khác
        router.replace('/customer');
      }
    }
  }, [isLoading, isAuthenticated, user]);

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>Đang tải SRAS...</Text>
      </View>
    );
  }

  // Đã đăng nhập → đang redirect, hiện loading
  if (isAuthenticated && user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>Đang chuyển hướng...</Text>
      </View>
    );
  }

  // Chưa đăng nhập → Welcome screen
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        
        {/* Logo & Intro */}
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <View style={{ 
            width: 88, 
            height: 88, 
            borderRadius: 44, 
            backgroundColor: '#fff7ed', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#ffedd5',
            marginBottom: 16 
          }}>
            <AlertTriangle size={44} color="#ea580c" />
          </View>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#ea580c', letterSpacing: 1 }}>SRAS</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginTop: 8 }}>Cứu hộ xe máy & ô tô 24/7</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
            Hệ thống kết nối cứu hộ giao thông khẩn cấp nhanh chóng, minh bạch và an toàn hàng đầu.
          </Text>
        </View>

        {/* Features */}
        <View style={{ gap: 16, marginVertical: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f9fafb', padding: 14, borderRadius: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="#ea580c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>Có mặt sau 15 - 30 phút</Text>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>Định vị gara và thợ sửa chữa gần nhất</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f9fafb', padding: 14, borderRadius: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>Báo giá rõ ràng, minh bạch</Text>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>Duyệt chi phí trước khi sửa, không lo chặt chém</Text>
            </View>
          </View>
        </View>

        {/* Auth Buttons */}
        <View style={{ gap: 12, marginBottom: 16 }}>
          <TouchableOpacity 
            onPress={() => router.push('/auth/login')}
            style={{
              backgroundColor: '#ea580c',
              paddingVertical: 15,
              borderRadius: 12,
              alignItems: 'center',
              shadowColor: '#ea580c',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Đăng nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/auth/register')}
            style={{
              backgroundColor: '#f3f4f6',
              borderWidth: 1,
              borderColor: '#e5e7eb',
              paddingVertical: 15,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#374151', fontWeight: '600', fontSize: 16 }}>Đăng ký tài khoản mới</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}



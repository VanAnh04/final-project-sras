import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AlertTriangle, 
  Car, 
  Wrench, 
  MapPin, 
  LogOut, 
  Clock, 
  ChevronRight,
  Sparkles
} from 'lucide-react-native';

export default function CustomerHome() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        
        {/* Header Profile Bar */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: 16,
          borderRadius: 16,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 24, 
              backgroundColor: '#ea580c', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'K'}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 13, color: '#64748b' }}>Xin chào,</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>{user?.fullName || 'Khách hàng'}</Text>
              <Text style={{ fontSize: 12, color: '#ea580c' }}>{user?.phone}</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={logout}
            style={{ 
              padding: 10, 
              borderRadius: 10, 
              backgroundColor: '#fee2e2' 
            }}
          >
            <LogOut size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* SOS Emergency Callout Button */}
        <TouchableOpacity 
          activeOpacity={0.9}
          style={{
            backgroundColor: '#ea580c',
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            marginBottom: 24,
            shadowColor: '#ea580c',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View style={{ 
            width: 72, 
            height: 72, 
            borderRadius: 36, 
            backgroundColor: 'rgba(255, 255, 255, 0.25)', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: 12
          }}>
            <AlertTriangle size={38} color="#ffffff" />
          </View>
          <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 }}>
            GỌI CỨU HỘ KHẨN CẤP
          </Text>
          <Text style={{ color: '#ffedd5', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
            Chạm để định vị và phát tín hiệu cứu hộ tức thì
          </Text>
        </TouchableOpacity>

        {/* Quick Services Grid */}
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 }}>
          Dịch vụ cứu hộ & sửa chữa
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              minWidth: '45%', 
              backgroundColor: '#ffffff', 
              padding: 16, 
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              alignItems: 'center',
              gap: 8
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={24} color="#2563eb" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 14 }}>Cứu hộ Ô tô</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>Kéo xe, kích bình, thay lốp</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ 
              flex: 1, 
              minWidth: '45%', 
              backgroundColor: '#ffffff', 
              padding: 16, 
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              alignItems: 'center',
              gap: 8
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={24} color="#059669" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 14 }}>Cứu hộ Xe máy</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>Vá lốp, sửa khóa, tiếp xăng</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ 
              flex: 1, 
              minWidth: '45%', 
              backgroundColor: '#ffffff', 
              padding: 16, 
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              alignItems: 'center',
              gap: 8
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={24} color="#d97706" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 14 }}>Tìm Gara gần nhất</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>Xem đánh giá, bảng giá</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ 
              flex: 1, 
              minWidth: '45%', 
              backgroundColor: '#ffffff', 
              padding: 16, 
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              alignItems: 'center',
              gap: 8
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fdf2f8', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={24} color="#db2777" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 14 }}>Tư vấn sự cố AI</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>Chẩn đoán hư hỏng tự động</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Rescue Orders */}
        <View style={{ 
          backgroundColor: '#ffffff', 
          padding: 16, 
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#f1f5f9',
          marginBottom: 16
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a' }}>Đơn cứu hộ gần đây</Text>
            <Text style={{ fontSize: 12, color: '#ea580c' }}>Xem tất cả</Text>
          </View>
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Clock size={28} color="#94a3b8" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 13, color: '#94a3b8' }}>Hiện tại bạn không có yêu cầu cứu hộ nào.</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

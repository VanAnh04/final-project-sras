import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Truck, 
  Wrench, 
  MapPin, 
  Navigation, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  PhoneCall
} from 'lucide-react-native';

export default function GarageStaffHome() {
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
              backgroundColor: '#0284c7', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Truck size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={{ fontSize: 13, color: '#64748b' }}>Thợ cứu hộ</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>{user?.fullName || 'Nhân viên'}</Text>
              <Text style={{ fontSize: 12, color: '#0284c7' }}>{user?.phone}</Text>
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

        {/* Work Status Banner */}
        <View style={{ 
          backgroundColor: '#0284c7', 
          padding: 16, 
          borderRadius: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={24} color="#ffffff" />
            <View>
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}>Trạng Thái: Đang Trực Nhiệm Vụ</Text>
              <Text style={{ color: '#e0f2fe', fontSize: 12 }}>GPS trực tuyến, sẵn sàng nhận cuốc</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation size={22} color="#2563eb" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 13 }}>Dẫn đường GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall size={22} color="#059669" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 13 }}>Gọi khách hàng</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={22} color="#d97706" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 13 }}>Báo giá</Text>
          </TouchableOpacity>
        </View>

        {/* Assigned Mission Section */}
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 }}>
          Nhiệm vụ được phân công
        </Text>

        <View style={{ 
          backgroundColor: '#ffffff', 
          padding: 20, 
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#f1f5f9',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <Clock size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }}>Chưa có nhiệm vụ mới</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
            Hệ thống sẽ phát chuông và rung ngay khi có khách hàng cần cứu hộ gần bạn.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

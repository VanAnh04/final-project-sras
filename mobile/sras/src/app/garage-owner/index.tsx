import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Building2, 
  Wrench, 
  Users, 
  Wallet, 
  LogOut, 
  CheckCircle, 
  TrendingUp,
  ShieldCheck
} from 'lucide-react-native';

export default function GarageOwnerHome() {
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
              <Building2 size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={{ fontSize: 13, color: '#64748b' }}>Chủ Gara / Đối tác</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>{user?.fullName || 'Gara Quản Lý'}</Text>
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

        {/* Garage Status Banner */}
        <View style={{ 
          backgroundColor: '#16a34a', 
          padding: 16, 
          borderRadius: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={24} color="#ffffff" />
            <View>
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}>Gara Đang Mở Cửa Nhận Cuốc</Text>
              <Text style={{ color: '#dcfce7', fontSize: 12 }}>Sẵn sàng tiếp nhận yêu cầu trong bán kính 15km</Text>
            </View>
          </View>
        </View>

        {/* Dashboard Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <Text style={{ fontSize: 12, color: '#64748b' }}>Cuốc hôm nay</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginVertical: 4 }}>0</Text>
            <Text style={{ fontSize: 11, color: '#16a34a' }}>+0% so với hôm qua</Text>
          </View>

          <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <Text style={{ fontSize: 12, color: '#64748b' }}>Số dư ví</Text>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#ea580c', marginVertical: 4 }}>0 đ</Text>
            <Text style={{ fontSize: 11, color: '#64748b' }}>Ví tín dụng khả dụng</Text>
          </View>
        </View>

        {/* Management Grid */}
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 }}>
          Quản lý gara
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <TouchableOpacity style={{ flex: 1, minWidth: '45%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={24} color="#2563eb" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 14 }}>Bảng giá dịch vụ</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>Cấu hình dịch vụ & phụ tùng</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ flex: 1, minWidth: '45%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} color="#d97706" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 14 }}>Đội ngũ nhân viên</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>Phân quyền thợ & điều phối</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ flex: 1, minWidth: '45%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={24} color="#059669" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 14 }}>Ví & Rút tiền</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>Lịch sử đối soát và rút</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ flex: 1, minWidth: '45%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fdf4ff', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} color="#9333ea" />
            </View>
            <Text style={{ fontWeight: '600', color: '#1e293b', fontSize: 14 }}>Doanh thu</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>Thống kê & báo cáo</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

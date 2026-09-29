import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Truck,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Navigation,
  Wrench,
  Camera,
  AlertCircle,
  FileCheck,
} from 'lucide-react-native';

export default function GarageStaffTasksScreen() {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  const [activeTask, setActiveTask] = useState<any>({
    id: 'RQ20260922-0042',
    customerName: 'Trần Hoàng Long',
    customerPhone: '0912.888.999',
    vehicleInfo: 'Honda SH 150i (Biển số: 29E1-889.99)',
    symptom: 'Chết máy đột ngột khi đang đi trên đường, đề không lên điện, nghi hỏng ắc quy.',
    address: 'Số 12 Đường Nguyễn Trãi, P. Thanh Xuân Bắc, Thanh Xuân, Hà Nội',
    status: 'EN_ROUTE', // EN_ROUTE, ARRIVED, DIAGNOSED, REPAIRING_ONSITE, COMPLETED
    fee: 250000,
    time: 'Cách đây 10 phút',
  });

  const historyTasks = [
    {
      id: 'RQ20260922-0035',
      customerName: 'Lê Thu Trang',
      vehicleInfo: 'Mazda CX-5',
      address: 'Ngã tư Khuất Duy Tiến - Nguyễn Trãi',
      fee: 350000,
      completedAt: '15:30 Hôm nay',
    },
    {
      id: 'RQ20260922-0028',
      customerName: 'Hoàng Minh Tuấn',
      vehicleInfo: 'Yamaha Exciter 150',
      address: '234 Hoàng Đạo Thúy, Cầu Giấy',
      fee: 300000,
      completedAt: '11:15 Hôm nay',
    },
  ];

  const handleCallCustomer = () => {
    if (activeTask?.customerPhone) {
      Linking.openURL(`tel:${activeTask.customerPhone}`).catch(() => {});
    }
  };

  const handleOpenMap = () => {
    Alert.alert('Dẫn đường GPS', `Đang mở bản đồ chỉ đường tới: ${activeTask.address}`);
  };

  const handleArrived = () => {
    Alert.alert('Xác nhận tới nơi', 'Bạn đã có mặt tại hiện trường cứu hộ của khách hàng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đã tới nơi',
        onPress: () => {
          setActiveTask((prev: any) => ({ ...prev, status: 'ARRIVED' }));
          Alert.alert('Thông báo', 'Đã cập nhật trạng thái: Bạn đã tới hiện trường.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nhiệm vụ Cứu hộ</Text>
        <Text style={styles.headerSub}>Theo dõi và xử lý các ca cứu hộ được giao</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'ACTIVE' && styles.tabBtnTextActive]}>
            Đang thực hiện (1)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'HISTORY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('HISTORY')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'HISTORY' && styles.tabBtnTextActive]}>
            Lịch sử hôm nay (2)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'ACTIVE' ? (
          activeTask ? (
            <View style={styles.activeTaskCard}>
              {/* Top Task Header */}
              <View style={styles.taskCardHeader}>
                <View style={styles.codeBadge}>
                  <Truck size={14} color="#ea580c" />
                  <Text style={styles.codeBadgeText}>{activeTask.id}</Text>
                </View>

                <View style={styles.statusLiveBadge}>
                  <View style={styles.pulsingDot} />
                  <Text style={styles.statusLiveText}>
                    {activeTask.status === 'EN_ROUTE' ? 'Đang di chuyển' : 'Đã tới nơi'}
                  </Text>
                </View>
              </View>

              {/* Customer Info */}
              <View style={styles.customerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{activeTask.customerName}</Text>
                  <Text style={styles.vehicleInfo}>{activeTask.vehicleInfo}</Text>
                </View>
                <TouchableOpacity style={styles.phoneCallBtn} onPress={handleCallCustomer}>
                  <Phone size={16} color="#ffffff" />
                  <Text style={styles.phoneCallText}>Gọi</Text>
                </TouchableOpacity>
              </View>

              {/* Address */}
              <View style={styles.addressBox}>
                <MapPin size={16} color="#ea580c" style={{ marginTop: 2 }} />
                <Text style={styles.addressText}>{activeTask.address}</Text>
              </View>

              {/* Symptom */}
              <View style={styles.symptomBox}>
                <Text style={styles.symptomLabel}>Mô tả sự cố của khách:</Text>
                <Text style={styles.symptomText}>{activeTask.symptom}</Text>
              </View>

              {/* Actions Grid */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionNavBtn} onPress={handleOpenMap} activeOpacity={0.85}>
                  <Navigation size={18} color="#ffffff" />
                  <Text style={styles.actionNavText}>Chỉ đường</Text>
                </TouchableOpacity>

                {activeTask.status === 'EN_ROUTE' ? (
                  <TouchableOpacity style={styles.actionArriveBtn} onPress={handleArrived} activeOpacity={0.85}>
                    <CheckCircle2 size={18} color="#ffffff" />
                    <Text style={styles.actionArriveText}>Đã tới nơi</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.actionQuoteBtn}
                    onPress={() => Alert.alert('Báo giá', 'Mở màn hình lập phiếu báo giá phụ tùng/sửa chữa cho khách.')}
                    activeOpacity={0.85}
                  >
                    <Wrench size={18} color="#ffffff" />
                    <Text style={styles.actionQuoteText}>Lập báo giá</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <CheckCircle2 size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Không có ca cứu hộ nào</Text>
              <Text style={styles.emptySub}>
                Bạn đang trong trạng thái sẵn sàng. Khi có khách hàng cần cứu hộ, chuông thông báo sẽ reo.
              </Text>
            </View>
          )
        ) : (
          /* HISTORY TAB */
          <View style={{ gap: 12 }}>
            {historyTasks.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyTopRow}>
                  <Text style={styles.historyCode}>{item.id}</Text>
                  <Text style={styles.historyFee}>+{item.fee.toLocaleString('vi-VN')}đ</Text>
                </View>
                <Text style={styles.historyCustomer}>{item.customerName} • {item.vehicleInfo}</Text>
                <Text style={styles.historyAddress} numberOfLines={1}>📍 {item.address}</Text>
                <View style={styles.historyBottomRow}>
                  <View style={styles.completedBadge}>
                    <CheckCircle2 size={12} color="#16a34a" />
                    <Text style={styles.completedText}>Hoàn thành</Text>
                  </View>
                  <Text style={styles.historyTime}>{item.completedAt}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  tabBtnActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ea580c',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  activeTaskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  statusLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  statusLiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  phoneCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  phoneCallText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  addressBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    lineHeight: 18,
  },
  symptomBox: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  symptomLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
    marginBottom: 2,
  },
  symptomText: {
    fontSize: 12.5,
    color: '#7c2d12',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionNavBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionNavText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  actionArriveBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionArriveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  actionQuoteBtn: {
    flex: 1,
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionQuoteText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 6,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  historyFee: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16a34a',
  },
  historyCustomer: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyAddress: {
    fontSize: 12,
    color: '#64748b',
  },
  historyBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  historyTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
});

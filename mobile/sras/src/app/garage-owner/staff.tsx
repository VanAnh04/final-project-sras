import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Phone, UserPlus, Wrench, ShieldCheck, MapPin } from 'lucide-react-native';

export default function GarageStaffScreen() {
  const [staffList, setStaffList] = useState([
    { id: 1, name: 'Nguyễn Văn A', phone: '0988.111.222', role: 'Thợ chính', status: 'available', todayJobs: 3 },
    { id: 2, name: 'Trần Văn B', phone: '0988.333.444', role: 'Thợ điện & bình', status: 'available', todayJobs: 2 },
    { id: 3, name: 'Lê Hoàng C', phone: '0988.555.666', role: 'Thợ cứu hộ lưu động', status: 'busy', todayJobs: 4 },
    { id: 4, name: 'Phạm Minh Đức', phone: '0988.999.000', role: 'Học việc / Phụ việc', status: 'off', todayJobs: 0 },
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Đội ngũ Kỹ thuật viên</Text>
          <Text style={styles.headerSub}>Quản lý phân ca và theo dõi trạng thái thợ</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Thêm nhân viên', 'Chức năng mời kỹ thuật viên tham gia Gara qua mã QR hoặc SĐT.')}
        >
          <UserPlus size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>Thêm thợ</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNum}>4</Text>
          <Text style={styles.summaryLabel}>Tổng nhân viên</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryNum, { color: '#16a34a' }]}>2</Text>
          <Text style={styles.summaryLabel}>Đang sẵn sàng</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryNum, { color: '#ea580c' }]}>1</Text>
          <Text style={styles.summaryLabel}>Đang cứu hộ</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryNum, { color: '#94a3b8' }]}>1</Text>
          <Text style={styles.summaryLabel}>Nghỉ ca</Text>
        </View>
      </View>

      {/* Staff List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {staffList.map((staff) => (
          <View key={staff.id} style={styles.staffCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{staff.name.split(' ').pop()?.charAt(0)}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.staffName}>{staff.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        staff.status === 'available'
                          ? '#ecfdf5'
                          : staff.status === 'busy'
                          ? '#fff7ed'
                          : '#f1f5f9',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          staff.status === 'available'
                            ? '#16a34a'
                            : staff.status === 'busy'
                            ? '#ea580c'
                            : '#94a3b8',
                      },
                    ]}
                  >
                    {staff.status === 'available' ? 'Sẵn sàng' : staff.status === 'busy' ? 'Đang làm' : 'Nghỉ ca'}
                  </Text>
                </View>
              </View>

              <Text style={styles.staffRole}>{staff.role} • Đã hoàn thành {staff.todayJobs} cuốc hôm nay</Text>
              <Text style={styles.staffPhone}><Phone size={11} color="#64748b" /> {staff.phone}</Text>
            </View>
          </View>
        ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  staffCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ea580c',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  staffRole: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  staffPhone: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    marginTop: 3,
  },
});
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Phone,
  UserPlus,
  Wrench,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Trash2,
  Power,
  RefreshCw,
  X,
  Lock,
  KeyRound,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import axiosClient from '../../api/axiosClient';

interface StaffItem {
  id: number;
  userId: number;
  fullName: string;
  phone: string;
  avatarUrl?: string;
  staffCode?: string;
  status: 'FREE' | 'BUSY';
  isActive: boolean;
  activeJobsCount?: number;
  todayCompletedJobs?: number;
  createdAt: string;
}

export default function GarageStaffScreen() {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Thêm nhân viên
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inputPhone, setInputPhone] = useState('');
  const [inputFullName, setInputFullName] = useState('');
  const [inputStaffCode, setInputStaffCode] = useState('');

  // Modal Thông báo Thành công + Sao chép mật khẩu
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [newStaffInfo, setNewStaffInfo] = useState<{
    fullName: string;
    phone: string;
    tempPassword?: string;
    staffCode?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Tải danh sách thợ từ Backend
  const fetchStaffList = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/garages/me/staff');
      setStaffList(res?.data || []);
    } catch (e: any) {
      console.warn('Lỗi khi tải danh sách nhân viên:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaffList();
  };

  // Mở modal thêm nhân viên
  const handleOpenAddModal = () => {
    setInputPhone('');
    setInputFullName('');
    setInputStaffCode(`NV-${String(staffList.length + 1).padStart(2, '0')}`);
    setAddModalVisible(true);
  };

  // Xác nhận thêm nhân viên
  const handleConfirmAdd = async () => {
    const phoneTrimmed = inputPhone.trim();
    const nameTrimmed = inputFullName.trim();

    if (!phoneTrimmed) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại nhân viên');
      return;
    }
    if (!nameTrimmed) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên nhân viên');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        phone: phoneTrimmed,
        fullName: nameTrimmed,
        staffCode: inputStaffCode.trim() || undefined,
      };

      const res: any = await axiosClient.post('/garages/me/staff', payload);
      const createdStaff = res?.data;

      setAddModalVisible(false);

      // Hiển thị modal sao chép mật khẩu
      setNewStaffInfo({
        fullName: nameTrimmed,
        phone: phoneTrimmed,
        tempPassword: createdStaff?.tempPassword,
        staffCode: createdStaff?.staffCode || inputStaffCode.trim(),
      });
      setCopied(false);
      setSuccessModalVisible(true);

      // Cập nhật lại danh sách
      fetchStaffList();
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Có lỗi xảy ra khi thêm nhân viên. Vui lòng kiểm tra lại.';
      Alert.alert('Không thể thêm nhân viên', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Sao chép mật khẩu vào bộ nhớ tạm
  const handleCopyPassword = async () => {
    if (!newStaffInfo?.tempPassword) return;
    try {
      await Clipboard.setStringAsync(newStaffInfo.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      Alert.alert('Thông báo', `Mật khẩu của thợ là: ${newStaffInfo.tempPassword}`);
    }
  };

  // Bật / Tắt trạng thái hoạt động (nghỉ ca)
  const handleToggleActive = async (staff: StaffItem) => {
    try {
      const res: any = await axiosClient.patch(`/garages/me/staff/${staff.id}/toggle-active`);
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Không thể đổi trạng thái nhân viên';
      Alert.alert('Thông báo', msg);
    }
  };

  // Xóa / Cho thôi việc
  const handleRemoveStaff = (staff: StaffItem) => {
    Alert.alert(
      'Xác nhận cho thôi việc',
      `Bạn có chắc chắn muốn xóa nhân viên "${staff.fullName}" (${staff.phone}) khỏi Gara? Tài khoản này sẽ trở về trạng thái Khách hàng tự do.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosClient.delete(`/garages/me/staff/${staff.id}`);
              setStaffList((prev) => prev.filter((s) => s.id !== staff.id));
              Alert.alert('Thành công', `Đã cho nhân viên "${staff.fullName}" thôi việc.`);
            } catch (error: any) {
              const msg = error?.response?.data?.message || 'Không thể xóa nhân viên';
              Alert.alert('Lỗi', msg);
            }
          },
        },
      ]
    );
  };

  // Thống kê nhanh số liệu
  const totalCount = staffList.length;
  const readyCount = staffList.filter((s) => s.isActive && s.status === 'FREE').length;
  const busyCount = staffList.filter((s) => s.isActive && s.status === 'BUSY').length;
  const offCount = staffList.filter((s) => !s.isActive).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Đội ngũ Kỹ thuật viên</Text>
          <Text style={styles.headerSub}>Quản lý phân ca và theo dõi trạng thái thợ</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal} activeOpacity={0.85}>
          <UserPlus size={16} color="#ffffff" strokeWidth={2.4} />
          <Text style={styles.addBtnText}>Thêm thợ</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNum}>{totalCount}</Text>
          <Text style={styles.summaryLabel}>Tổng nhân viên</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryNum, { color: '#16a34a' }]}>{readyCount}</Text>
          <Text style={styles.summaryLabel}>Sẵn sàng</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryNum, { color: '#ea580c' }]}>{busyCount}</Text>
          <Text style={styles.summaryLabel}>Đang cứu hộ</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryNum, { color: '#94a3b8' }]}>{offCount}</Text>
          <Text style={styles.summaryLabel}>Nghỉ ca</Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Đang tải danh sách kỹ thuật viên...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />}
        >
          {staffList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Users size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Chưa có nhân viên nào</Text>
              <Text style={styles.emptySub}>
                Bấm vào nút "Thêm thợ" ở góc trên để thêm kỹ thuật viên cứu hộ vào Gara của bạn.
              </Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAddModal}>
                <UserPlus size={16} color="#ffffff" />
                <Text style={styles.emptyAddBtnText}>Thêm nhân viên ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            staffList.map((staff) => {
              const isFree = staff.isActive && staff.status === 'FREE';
              const isBusy = staff.isActive && staff.status === 'BUSY';
              const isOff = !staff.isActive;

              return (
                <View key={staff.id} style={styles.staffCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{staff.fullName.split(' ').pop()?.charAt(0) || 'T'}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.staffName}>{staff.fullName}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isFree ? '#ecfdf5' : isBusy ? '#fff7ed' : '#f1f5f9',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color: isFree ? '#16a34a' : isBusy ? '#ea580c' : '#94a3b8',
                            },
                          ]}
                        >
                          {isFree ? 'Sẵn sàng' : isBusy ? 'Đang làm' : 'Nghỉ ca'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.staffRole}>
                      {staff.staffCode ? `Mã: ${staff.staffCode} • ` : ''}Hoàn thành {staff.todayCompletedJobs || 0} cuốc hôm nay
                    </Text>
                    <Text style={styles.staffPhone}>
                      <Phone size={11} color="#64748b" /> {staff.phone}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsCol}>
                    <TouchableOpacity
                      style={[styles.actionBtn, isOff ? styles.actionBtnActive : styles.actionBtnPause]}
                      onPress={() => handleToggleActive(staff)}
                      activeOpacity={0.7}
                    >
                      <Power size={14} color={isOff ? '#16a34a' : '#ea580c'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDelete]}
                      onPress={() => handleRemoveStaff(staff)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── MODAL 1: THÊM NHÂN VIÊN MỚI ── */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <UserPlus size={20} color="#ea580c" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Thêm Kỹ Thuật Viên</Text>
                  <Text style={styles.modalSub}>Nhập thông tin nhân viên tham gia Gara</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Số điện thoại nhân viên <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: 0988123456"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={inputPhone}
                  onChangeText={setInputPhone}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Họ và tên nhân viên <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: Nguyễn Văn Bình"
                  placeholderTextColor="#94a3b8"
                  value={inputFullName}
                  onChangeText={setInputFullName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mã nhân viên (Tùy chọn)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: NV-01"
                  placeholderTextColor="#94a3b8"
                  value={inputStaffCode}
                  onChangeText={setInputStaffCode}
                />
              </View>

              <View style={styles.noteBox}>
                <ShieldCheck size={16} color="#0284c7" style={{ marginTop: 2 }} />
                <Text style={styles.noteBoxText}>
                  Hệ thống sẽ cấp một <Text style={{ fontWeight: '700' }}>mật khẩu khởi tạo ngẫu nhiên</Text>. Bạn có thể sao chép để gửi cho thợ đăng nhập ngay.
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleConfirmAdd}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={16} color="#ffffff" strokeWidth={2.5} />
                    <Text style={styles.submitBtnText}>Xác nhận thêm</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: THÔNG BÁO THÀNH CÔNG & SAO CHÉP MẬT KHẨU ── */}
      <Modal visible={successModalVisible} transparent animationType="fade" onRequestClose={() => setSuccessModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderTopWidth: 4, borderTopColor: '#16a34a' }]}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 size={48} color="#16a34a" />
            </View>

            <Text style={styles.successTitle}>Thêm nhân viên thành công!</Text>
            <Text style={styles.successDesc}>
              Đã liên kết thợ <Text style={{ fontWeight: '800', color: '#0f172a' }}>{newStaffInfo?.fullName}</Text> vào Gara. Vui lòng gửi thông tin đăng nhập bên dưới cho nhân viên:
            </Text>

            {/* Thông tin tài khoản */}
            <View style={styles.credentialBox}>
              <View style={styles.credentialRow}>
                <Text style={styles.credentialLabel}>Tài khoản (SĐT):</Text>
                <Text style={styles.credentialValue}>{newStaffInfo?.phone}</Text>
              </View>

              <View style={[styles.credentialRow, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <KeyRound size={15} color="#ea580c" />
                  <Text style={styles.credentialLabel}>Mật khẩu khởi tạo:</Text>
                </View>
                <Text style={styles.credentialPassword}>{newStaffInfo?.tempPassword || '123456@'}</Text>
              </View>
            </View>

            {/* Nút Sao chép mật khẩu */}
            <TouchableOpacity
              style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
              onPress={handleCopyPassword}
              activeOpacity={0.85}
            >
              {copied ? (
                <>
                  <Check size={18} color="#ffffff" strokeWidth={2.5} />
                  <Text style={styles.copyBtnText}>Đã sao chép mật khẩu!</Text>
                </>
              ) : (
                <>
                  <Copy size={18} color="#ffffff" />
                  <Text style={styles.copyBtnText}>Sao chép mật khẩu gửi thợ</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.doneBtnText}>Hoàn tất</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
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
  actionsCol: {
    gap: 6,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionBtnPause: {
    backgroundColor: '#fff7ed',
    borderColor: '#ffedd5',
  },
  actionBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
  },
  actionBtnDelete: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },

  /* Modal Backdrop & Cards */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    gap: 14,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  noteBox: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
  },
  noteBoxText: {
    flex: 1,
    fontSize: 11,
    color: '#0369a1',
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Success Modal */
  successIconWrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  credentialBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginVertical: 16,
    gap: 10,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credentialLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  credentialValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  credentialPassword: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 10,
  },
  copyBtnSuccess: {
    backgroundColor: '#16a34a',
  },
  copyBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  doneBtn: {
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
  },
  doneBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
});
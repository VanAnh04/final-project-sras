import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Plus,
  Star,
  Truck,
  Bike,
  Power,
  Trash2,
  UserPlus,
  X,
  CheckCircle2,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { garageApi, GarageStaffDto, RescueVehicleDto } from '../../api/garageApi';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';
import StaffReviewsModal from '../../components/StaffReviewsModal';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const MUTE = '#94a3b8';
const LINE = '#e2e8f0';
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const KIND_LABEL: Record<string, string> = { TOW_TRUCK: 'Xe kéo', MOTORBIKE: 'Xe máy', VAN: 'Xe tải nhỏ' };
const isBusy = (s?: string) => s === 'BUSY';

const initials = (name?: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function GarageStaffScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'staff' | 'vehicle'>('staff');
  const [staff, setStaff] = useState<GarageStaffDto[]>([]);
  const [vehicles, setVehicles] = useState<RescueVehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [selectedReviewStaff, setSelectedReviewStaff] = useState<GarageStaffDto | null>(null);

  // Modal Thêm nhân viên (AddGarageStaffRequest)
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

  const load = useCallback(async () => {
    try {
      const [s, v] = await Promise.all([garageApi.listStaff(), garageApi.listVehicles()]);
      setStaff(s || []);
      setVehicles(v || []);
    } catch (e: any) {
      console.warn('Lỗi khi tải danh sách:', e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Kiểm tra trùng mã nhân viên trong danh sách hiện tại của Gara
  const isStaffCodeDuplicate = useMemo(() => {
    const code = inputStaffCode.trim().toLowerCase();
    if (!code) return false;
    return staff.some((s) => (s.staffCode || '').trim().toLowerCase() === code);
  }, [inputStaffCode, staff]);

  const goAdd = () => {
    if (tab === 'staff') {
      setInputPhone('');
      setInputFullName('');
      const existingCodes = new Set(
        staff.map((s) => (s.staffCode || '').trim().toLowerCase()).filter(Boolean)
      );
      let nextNum = staff.length + 1;
      let nextCode = `NV-${String(nextNum).padStart(2, '0')}`;
      while (existingCodes.has(nextCode.toLowerCase())) {
        nextNum++;
        nextCode = `NV-${String(nextNum).padStart(2, '0')}`;
      }
      setInputStaffCode(nextCode);
      setAddModalVisible(true);
    } else {
      router.push({
        pathname: '/garage-owner/add-vehicle',
        params: { t: String(Date.now()) },
      } as any);
    }
  };

  // Xác nhận thêm nhân viên qua API POST /garages/me/staff (AddGarageStaffRequest)
  const handleConfirmAdd = async () => {
    const phoneTrimmed = inputPhone.trim();
    const nameTrimmed = inputFullName.trim();
    const staffCodeTrimmed = inputStaffCode.trim();

    if (!phoneTrimmed) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại nhân viên');
      return;
    }
    if (!nameTrimmed) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên nhân viên');
      return;
    }
    if (staffCodeTrimmed && isStaffCodeDuplicate) {
      Alert.alert(
        'Trùng mã nhân viên',
        `Mã nhân viên "${staffCodeTrimmed}" đã tồn tại trong gara. Vui lòng nhập mã khác.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        phone: phoneTrimmed,
        fullName: nameTrimmed,
        staffCode: staffCodeTrimmed || undefined,
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

      // Cập nhật lại danh sách nhân viên
      load();
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

  // Sao chép mật khẩu vào clipboard
  const handleCopyPassword = async () => {
    if (!newStaffInfo?.tempPassword) return;
    try {
      await Clipboard.setStringAsync(newStaffInfo.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      Alert.alert('Mật khẩu', `Mật khẩu của thợ là: ${newStaffInfo.tempPassword}`);
    }
  };

  // Bật / Tắt trạng thái hoạt động của thợ (Toggle Active)
  const handleToggleActive = async (s: GarageStaffDto) => {
    if (s.status === 'BUSY') {
      Alert.alert('Không thể tạm ngưng', 'Nhân viên đang trong ca cứu hộ, không thể tạm ngưng lúc này.');
      return;
    }

    try {
      setActionLoadingId(s.id);
      const res: any = await axiosClient.patch(`/garages/me/staff/${s.id}/toggle-active`);
      const updated = res?.data;
      setStaff((prev) =>
        prev.map((item) =>
          item.id === s.id
            ? { ...item, isActive: updated?.isActive !== undefined ? updated.isActive : !item.isActive }
            : item
        )
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể cập nhật trạng thái làm việc');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cho nhân viên thôi việc (Delete)
  const handleRemoveStaff = (s: GarageStaffDto) => {
    if (s.status === 'BUSY') {
      Alert.alert('Không thể thôi việc', 'Nhân viên đang trong ca cứu hộ, không thể thôi việc lúc này.');
      return;
    }

    Alert.alert(
      'Xác nhận thôi việc',
      `Bạn có chắc chắn muốn cho nhân viên "${s.fullName || s.name}" thôi việc và xóa khỏi Gara?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(s.id);
              await axiosClient.delete(`/garages/me/staff/${s.id}`);
              setStaff((prev) => prev.filter((item) => item.id !== s.id));
              Alert.alert('Thành công', `Đã cho nhân viên "${s.fullName || s.name}" thôi việc.`);
            } catch (e: any) {
              Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể xóa nhân viên');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Xóa xe cứu hộ
  const handleRemoveVehicle = (v: RescueVehicleDto) => {
    if (v.status === 'BUSY') {
      Alert.alert('Không thể xóa', 'Xe cứu hộ đang trong ca cứu hộ, không thể xóa lúc này.');
      return;
    }

    Alert.alert(
      'Xác nhận xóa xe cứu hộ',
      `Bạn có chắc chắn muốn xóa xe cứu hộ biển số "${v.licensePlate}" khỏi Gara?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(v.id);
              await garageApi.deleteVehicle(v.id);
              setVehicles((prev) => prev.filter((item) => item.id !== v.id));
              Alert.alert('Thành công', `Đã xóa xe cứu hộ "${v.licensePlate}".`);
            } catch (e: any) {
              Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể xóa xe cứu hộ');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Thống kê nhanh số liệu thợ
  const readyCount = staff.filter((s) => s.isActive !== false && s.status !== 'BUSY').length;
  const busyCount = staff.filter((s) => s.isActive !== false && s.status === 'BUSY').length;
  const offCount = staff.filter((s) => s.isActive === false).length;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={INK} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Đội cứu hộ</Text>
            <Text style={styles.headerSub}>Quản lý nhân viên và phương tiện cứu hộ của Gara</Text>
          </View>
        </View>
      </View>

      {/* Segmented Tabs: Nhân viên | Xe cứu hộ */}
      <View style={styles.tabs}>
        {[
          { k: 'staff' as const, label: 'Nhân viên', n: staff.length },
          { k: 'vehicle' as const, label: 'Xe cứu hộ', n: vehicles.length },
        ].map((t) => {
          const on = tab === t.k;
          return (
            <TouchableOpacity key={t.k} style={styles.tab} onPress={() => setTab(t.k)} activeOpacity={0.7}>
              <View style={styles.tabInner}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
                {!loading && (
                  <View style={[styles.tabBadge, on && styles.tabBadgeOn]}>
                    <Text style={[styles.tabCount, on && styles.tabCountOn]}>{t.n}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.tabBar, on && styles.tabBarOn]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary Row for Staff */}
      {tab === 'staff' && !loading && staff.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNum, { color: '#059669' }]}>{readyCount}</Text>
            <Text style={styles.summaryLabel}>Sẵn sàng</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNum, { color: '#d97706' }]}>{busyCount}</Text>
            <Text style={styles.summaryLabel}>Đang cứu hộ</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNum, { color: '#94a3b8' }]}>{offCount}</Text>
            <Text style={styles.summaryLabel}>Nghỉ ca</Text>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={styles.loadingText}>Đang tải danh sách...</Text>
          </View>
        ) : tab === 'staff' ? (
          staff.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Chưa có nhân viên nào</Text>
              <Text style={styles.emptySub}>Bấm "Thêm nhân viên" bên dưới để tạo tài khoản cho kỹ thuật viên cứu hộ.</Text>
            </View>
          ) : (
            staff.map((s, i) => {
              const b = isBusy(s.status);
              const off = s.isActive === false;
              const photo = s.avatarUrl && s.avatarUrl.trim() ? resolveFileUrl(s.avatarUrl) : null;
              const nameDisplay = s.fullName || s.name || 'Kỹ thuật viên';
              const isActioning = actionLoadingId === s.id;

              return (
                <View key={s.id} style={[styles.card, i > 0 && styles.cardSpacing, off && styles.cardOff]}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={[styles.mark, b && styles.dim, off && styles.dim]} />
                  ) : (
                    <View style={[styles.mark, styles.markInitials, b && styles.dim, off && styles.dim]}>
                      <Text style={styles.markText}>{initials(nameDisplay)}</Text>
                    </View>
                  )}

                  <View style={styles.infoCol}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.title, off && styles.titleOff]} numberOfLines={1}>
                        {nameDisplay}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          off
                            ? styles.badgeOff
                            : b
                            ? styles.badgeBusy
                            : styles.badgeFree,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            off
                              ? styles.badgeTextOff
                              : b
                              ? styles.badgeTextBusy
                              : styles.badgeTextFree,
                          ]}
                        >
                          {off ? 'Nghỉ ca' : b ? 'Đang bận' : 'Sẵn sàng'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.sub} numberOfLines={1}>
                      {s.staffCode ? `Mã: ${s.staffCode} • ` : ''}
                      {s.phone}
                    </Text>

                    <TouchableOpacity
                      style={styles.ratingRow}
                      activeOpacity={0.7}
                      onPress={() => setSelectedReviewStaff(s)}
                    >
                      <Star size={13} color="#f59e0b" fill="#f59e0b" strokeWidth={0} />
                      <Text style={styles.ratingScore}>
                        {s.rating != null && (s.ratingCount ?? 0) > 0 ? s.rating.toFixed(1) : '5.0'}
                      </Text>
                      <Text style={styles.ratingCount}>
                        ({s.ratingCount ?? 0} đánh giá · Xem)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Actions: Bật/Tắt hoạt động & Cho thôi việc */}
                  <View style={styles.actionsCol}>
                    {isActioning ? (
                      <ActivityIndicator size="small" color={BRAND} />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.iconBtn, off ? styles.iconBtnOn : styles.iconBtnOff]}
                          onPress={() => handleToggleActive(s)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Power size={15} color={off ? '#16a34a' : '#ea580c'} strokeWidth={2.4} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.iconBtn, styles.iconBtnDelete]}
                          onPress={() => handleRemoveStaff(s)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={15} color="#ef4444" strokeWidth={2.4} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Chưa có xe cứu hộ nào</Text>
            <Text style={styles.emptySub}>Bấm "Thêm xe cứu hộ" bên dưới để đăng ký phương tiện cứu hộ của Gara.</Text>
          </View>
        ) : (
          vehicles.map((v, i) => {
            const b = isBusy(v.status);
            const KindIcon = v.vehicleKind === 'MOTORBIKE' ? Bike : Truck;
            const vImg = v.imageUrl && v.imageUrl.trim() ? resolveFileUrl(v.imageUrl) : null;

            const isActioning = actionLoadingId === v.id;

            return (
              <View key={v.id} style={[styles.card, i > 0 && styles.cardSpacing]}>
                {vImg ? (
                  <Image source={{ uri: vImg }} style={[styles.mark, styles.markSquare, b && styles.dim]} />
                ) : (
                  <View style={[styles.mark, styles.markSquare, b && styles.dim]}>
                    <KindIcon size={24} color="#475569" strokeWidth={2} />
                  </View>
                )}

                <View style={styles.infoCol}>
                  <View style={styles.nameRow}>
                    <Text style={styles.plate} numberOfLines={1}>
                      {v.licensePlate}
                    </Text>
                    <View style={[styles.badge, b ? styles.badgeBusy : styles.badgeFree]}>
                      <Text style={[styles.badgeText, b ? styles.badgeTextBusy : styles.badgeTextFree]}>
                        {b ? 'Đang bận' : 'Sẵn sàng'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.sub} numberOfLines={1}>
                    {KIND_LABEL[v.vehicleKind || ''] || 'Xe cứu hộ'}
                  </Text>
                </View>

                {/* Actions: Xóa xe cứu hộ */}
                <View style={styles.actionsCol}>
                  {isActioning ? (
                    <ActivityIndicator size="small" color={BRAND} />
                  ) : (
                    <TouchableOpacity
                      style={[styles.iconBtn, styles.iconBtnDelete]}
                      onPress={() => handleRemoveVehicle(v)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={15} color="#ef4444" strokeWidth={2.4} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Footer Add Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={goAdd} activeOpacity={0.88}>
          <Plus size={18} color="#ffffff" strokeWidth={2.6} />
          <Text style={styles.primaryBtnText}>{tab === 'staff' ? 'Thêm nhân viên' : 'Thêm xe cứu hộ'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── MODAL 1: THÊM NHÂN VIÊN MỚI (AddGarageStaffRequest) ── */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <UserPlus size={20} color={BRAND} />
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
                  placeholderTextColor={MUTE}
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
                  placeholderTextColor={MUTE}
                  value={inputFullName}
                  onChangeText={setInputFullName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mã nhân viên (Tùy chọn)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    isStaffCodeDuplicate ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : null,
                  ]}
                  placeholder="Ví dụ: NV-01"
                  placeholderTextColor={MUTE}
                  value={inputStaffCode}
                  onChangeText={setInputStaffCode}
                  autoCapitalize="characters"
                />
                {isStaffCodeDuplicate && (
                  <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4, fontWeight: '500' }}>
                    * Mã nhân viên "{inputStaffCode.trim()}" đã tồn tại trong gara
                  </Text>
                )}
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
                style={[styles.submitBtn, isStaffCodeDuplicate ? { opacity: 0.6 } : null]}
                onPress={handleConfirmAdd}
                disabled={submitting || isStaffCodeDuplicate}
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
              <CheckCircle2 size={46} color="#16a34a" />
            </View>

            <Text style={styles.successTitle}>Thêm nhân viên thành công!</Text>
            <Text style={styles.successDesc}>
              Đã liên kết thợ <Text style={{ fontWeight: '800', color: INK }}>{newStaffInfo?.fullName}</Text> vào Gara. Vui lòng gửi thông tin đăng nhập bên dưới cho nhân viên:
            </Text>

            {/* Thông tin tài khoản */}
            <View style={styles.credentialBox}>
              <View style={styles.credentialRow}>
                <Text style={styles.credentialLabel}>Tài khoản (SĐT):</Text>
                <Text style={styles.credentialValue}>{newStaffInfo?.phone}</Text>
              </View>

              {newStaffInfo?.staffCode ? (
                <View style={styles.credentialRow}>
                  <Text style={styles.credentialLabel}>Mã nhân viên:</Text>
                  <Text style={styles.credentialValue}>{newStaffInfo?.staffCode}</Text>
                </View>
              ) : null}

              <View style={[styles.credentialRow, { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <KeyRound size={15} color={BRAND} />
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

      {/* Modal Xem Đánh Giá Của Thợ */}
      <StaffReviewsModal
        visible={!!selectedReviewStaff}
        staffId={selectedReviewStaff?.id || null}
        staffName={selectedReviewStaff?.fullName || selectedReviewStaff?.name}
        staffCode={selectedReviewStaff?.staffCode || undefined}
        avgRating={selectedReviewStaff?.rating}
        ratingCount={selectedReviewStaff?.ratingCount}
        onClose={() => setSelectedReviewStaff(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, backgroundColor: '#ffffff' },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 21, fontWeight: '900', color: INK, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, fontWeight: '500', color: SUB, marginTop: 3 },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: { flex: 1 },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
  },
  tabText: { fontSize: 14, fontWeight: '700', color: MUTE },
  tabTextOn: { color: INK },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  tabBadgeOn: { backgroundColor: '#ffedd5' },
  tabCount: { fontSize: 11.5, fontWeight: '800', color: MUTE },
  tabCountOn: { color: BRAND },
  tabBar: { height: 2.5, backgroundColor: 'transparent' },
  tabBarOn: { backgroundColor: BRAND },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
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
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: SUB,
    marginTop: 2,
  },

  body: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 },
  center: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 13.5, color: SUB, marginTop: 10, fontWeight: '500' },

  emptyWrap: {
    paddingVertical: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: INK, marginBottom: 6 },
  emptySub: { fontSize: 13.5, color: MUTE, textAlign: 'center', lineHeight: 20 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardSpacing: { marginTop: 10 },
  cardOff: { backgroundColor: '#fbfcfd', opacity: 0.75 },

  mark: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e9eef4' },
  markSquare: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  markInitials: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fed7aa' },
  markText: { fontSize: 16, fontWeight: '900', color: '#c2410c' },
  dim: { opacity: 0.6 },

  infoCol: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  title: { fontSize: 15, fontWeight: '800', color: INK, flex: 1 },
  titleOff: { color: MUTE },
  plate: { fontSize: 16, fontWeight: '800', color: INK, fontFamily: MONO, letterSpacing: 0.5 },
  sub: { fontSize: 12.5, fontWeight: '500', color: SUB, marginTop: 3 },

  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeFree: { backgroundColor: '#ecfdf5' },
  badgeBusy: { backgroundColor: '#fff7ed' },
  badgeOff: { backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeTextFree: { color: '#059669' },
  badgeTextBusy: { color: '#d97706' },
  badgeTextOff: { color: '#94a3b8' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingScore: { fontSize: 12.5, fontWeight: '800', color: '#b45309' },
  ratingCount: { fontSize: 11.5, fontWeight: '500', color: MUTE },

  actionsCol: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnOn: { backgroundColor: '#f0fdf4' },
  iconBtnOff: { backgroundColor: '#fff7ed' },
  iconBtnDelete: { backgroundColor: '#fef2f2' },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 14,
    height: 50,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#ffffff', letterSpacing: 0.2 },

  /* Modal Backdrop & Cards */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
    color: INK,
  },
  modalSub: {
    fontSize: 11.5,
    color: SUB,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    gap: 12,
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
    borderColor: LINE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: INK,
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
    fontSize: 11.5,
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
    backgroundColor: BRAND,
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
    marginVertical: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: INK,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 12.5,
    color: SUB,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  credentialBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    padding: 14,
    marginVertical: 14,
    gap: 10,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credentialLabel: {
    fontSize: 12,
    color: SUB,
    fontWeight: '600',
  },
  credentialValue: {
    fontSize: 13,
    fontWeight: '800',
    color: INK,
  },
  credentialPassword: {
    fontSize: 15,
    fontWeight: '900',
    color: BRAND,
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: BRAND,
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

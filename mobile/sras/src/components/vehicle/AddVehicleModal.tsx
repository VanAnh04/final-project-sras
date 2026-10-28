import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Car,
  Bike,
  X,
  Plus,
  Check,
  Tag,
  Palette,
  Calendar,
  CreditCard,
  ShieldCheck,
} from 'lucide-react-native';
import { customerVehicleApi, CustomerVehicleDto, CreateCustomerVehicleDto } from '../../api/customerVehicleApi';

interface AddVehicleModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (vehicle: CustomerVehicleDto) => void;
  initialVehicleType?: 'CAR' | 'MOTORBIKE';
}

const MOTORBIKE_BRANDS = ['Honda', 'Yamaha', 'Piaggio', 'Vespa', 'VinFast', 'Suzuki', 'SYM'];
const CAR_BRANDS = ['Toyota', 'Hyundai', 'Kia', 'Mazda', 'Honda', 'Ford', 'VinFast', 'Mitsubishi'];
const COMMON_COLORS = ['Trắng', 'Đen', 'Đỏ', 'Xám / Ghi', 'Xanh lam', 'Bạc'];

export default function AddVehicleModal({
  visible,
  onClose,
  onSuccess,
  initialVehicleType = 'MOTORBIKE',
}: AddVehicleModalProps) {
  const [vehicleType, setVehicleType] = useState<'CAR' | 'MOTORBIKE'>(initialVehicleType);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setVehicleType(initialVehicleType);
      setBrand('');
      setModel('');
      setLicensePlate('');
      setColor('');
      setYear('');
      setIsDefault(false);
      setSubmitting(false);
    }
  }, [visible, initialVehicleType]);

  const quickBrands = vehicleType === 'MOTORBIKE' ? MOTORBIKE_BRANDS : CAR_BRANDS;

  const handleSubmit = async () => {
    if (!brand.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập hoặc chọn hãng xe (ví dụ: Honda, Toyota, Yamaha...)');
      return;
    }

    const payload: CreateCustomerVehicleDto = {
      vehicleType,
      brand: brand.trim(),
      model: model.trim() || undefined,
      licensePlate: licensePlate.trim().toUpperCase() || undefined,
      color: color.trim() || undefined,
      year: year.trim() ? parseInt(year.trim(), 10) : undefined,
      isDefault,
    };

    try {
      setSubmitting(true);
      const created = await customerVehicleApi.create(payload);
      Alert.alert('Thành công', 'Đã lưu phương tiện của bạn vào danh sách!');
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('[AddVehicleModal] error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể lưu xe. Vui lòng thử lại.';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconWrap}>
                <Plus size={20} color="#ea580c" strokeWidth={2.6} />
              </View>
              <View>
                <Text style={styles.title}>Thêm phương tiện mới</Text>
                <Text style={styles.subtitle}>Lưu vào hồ sơ xe để gọi cứu hộ nhanh chóng</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* 1. Chọn loại xe */}
            <Text style={styles.fieldLabel}>Loại phương tiện <Text style={styles.req}>*</Text></Text>
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[styles.typeBtn, vehicleType === 'MOTORBIKE' && styles.typeBtnActive]}
                onPress={() => setVehicleType('MOTORBIKE')}
                activeOpacity={0.8}
              >
                <Bike size={22} color={vehicleType === 'MOTORBIKE' ? '#ffffff' : '#ea580c'} strokeWidth={2.4} />
                <Text style={[styles.typeBtnText, vehicleType === 'MOTORBIKE' && styles.typeBtnTextActive]}>
                  Xe máy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, vehicleType === 'CAR' && styles.typeBtnActive]}
                onPress={() => setVehicleType('CAR')}
                activeOpacity={0.8}
              >
                <Car size={22} color={vehicleType === 'CAR' ? '#ffffff' : '#2563eb'} strokeWidth={2.4} />
                <Text style={[styles.typeBtnText, vehicleType === 'CAR' && styles.typeBtnTextActive]}>
                  Ô tô
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. Hãng xe & Gợi ý hãng */}
            <Text style={styles.fieldLabel}>Hãng xe <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={styles.textInput}
              placeholder={vehicleType === 'MOTORBIKE' ? 'VD: Honda, Yamaha, Piaggio...' : 'VD: Toyota, Mazda, Hyundai...'}
              placeholderTextColor="#94a3b8"
              value={brand}
              onChangeText={setBrand}
            />
            {/* Quick chips */}
            <View style={styles.chipsRow}>
              {quickBrands.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chip, brand.toLowerCase() === b.toLowerCase() && styles.chipActive]}
                  onPress={() => setBrand(b)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, brand.toLowerCase() === b.toLowerCase() && styles.chipTextActive]}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 3. Dòng xe / Model */}
            <Text style={styles.fieldLabel}>Dòng xe / Tên xe (tùy chọn)</Text>
            <TextInput
              style={styles.textInput}
              placeholder={vehicleType === 'MOTORBIKE' ? 'VD: Wave Alpha, SH 150i, Vision, Air Blade...' : 'VD: Vios, CX-5, Accent, Ranger...'}
              placeholderTextColor="#94a3b8"
              value={model}
              onChangeText={setModel}
            />

            {/* 4. Biển số xe */}
            <Text style={styles.fieldLabel}>Biển số xe (giúp cứu hộ tìm đúng xe)</Text>
            <View style={styles.inputWithIcon}>
              <CreditCard size={18} color="#94a3b8" style={{ marginLeft: 12 }} />
              <TextInput
                style={[styles.textInputClean, { textTransform: 'uppercase', fontWeight: '700' }]}
                placeholder="VD: 29A-123.45 hoặc 43K-999.99"
                placeholderTextColor="#94a3b8"
                value={licensePlate}
                onChangeText={(t) => setLicensePlate(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={15}
              />
            </View>

            {/* 5. Màu sắc xe */}
            <Text style={styles.fieldLabel}>Màu sắc xe (tùy chọn)</Text>
            <View style={styles.inputWithIcon}>
              <Palette size={18} color="#94a3b8" style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.textInputClean}
                placeholder="VD: Trắng, Đen, Đỏ, Bạc..."
                placeholderTextColor="#94a3b8"
                value={color}
                onChangeText={setColor}
              />
            </View>
            <View style={styles.chipsRow}>
              {COMMON_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, color.toLowerCase() === c.toLowerCase() && styles.chipActive]}
                  onPress={() => setColor(c)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, color.toLowerCase() === c.toLowerCase() && styles.chipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 6. Đời xe / Năm sản xuất */}
            <Text style={styles.fieldLabel}>Năm sản xuất / Đời xe (tùy chọn)</Text>
            <View style={styles.inputWithIcon}>
              <Calendar size={18} color="#94a3b8" style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.textInputClean}
                placeholder="VD: 2022, 2023..."
                placeholderTextColor="#94a3b8"
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>

            {/* 7. Đặt làm xe mặc định */}
            <TouchableOpacity
              style={styles.defaultCheckRow}
              activeOpacity={0.8}
              onPress={() => setIsDefault((prev) => !prev)}
            >
              <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
                {isDefault && <Check size={14} color="#ffffff" strokeWidth={3} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.defaultCheckTitle}>Đặt làm phương tiện mặc định</Text>
                <Text style={styles.defaultCheckSub}>Tự động chọn xe này khi bạn gửi yêu cầu cứu hộ</Text>
              </View>
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <ShieldCheck size={18} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.submitBtnText}>Lưu phương tiện</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  req: {
    color: '#ea580c',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  typeBtnActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  typeBtnTextActive: {
    color: '#ffffff',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  textInputClean: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  defaultCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  defaultCheckTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  defaultCheckSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

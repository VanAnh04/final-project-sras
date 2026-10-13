import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Image,
} from 'react-native';
import { AlertTriangle, X, Camera, ImagePlus, CheckCircle2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { complaintApi, ComplaintDto, ComplaintTargetType } from '../api/complaintApi';
import { rescueApi } from '../api/rescueApi';

interface ComplaintModalProps {
  visible: boolean;
  requestId?: number;
  requestCode?: string;
  targetType?: ComplaintTargetType;
  targetName?: string;
  onClose: () => void;
  onSuccess: (complaint: ComplaintDto) => void;
}

const COMMON_REASONS = [
  'Thu phí sai báo giá / Chặt chém phụ phí',
  'Thái độ phục vụ thiếu chuyên nghiệp',
  'Làm hư hỏng phương tiện thêm',
  'Đến quá muộn hoặc tự ý huỷ bỏ ca',
  'Không hoàn tất đúng hạng mục đã cam kết',
  'Vấn đề khác',
];

export default function ComplaintModal({
  visible,
  requestId,
  requestCode,
  targetType = 'GARAGE',
  targetName,
  onClose,
  onSuccess,
}: ComplaintModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [details, setDetails] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setImageUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện.');
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền chụp ảnh.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setImageUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể khởi động camera.');
    }
  };

  const chooseSource = () => {
    Alert.alert('Đính kèm minh chứng', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh mới', onPress: takePhoto },
      { text: 'Chọn từ thư viện', onPress: pickImage },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    const fullContent = selectedReason === 'Vấn đề khác'
      ? details.trim()
      : `[${selectedReason}] ${details.trim()}`.trim();

    if (!fullContent || fullContent.length < 5) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả chi tiết sự việc để ban quản trị đối soát.');
      return;
    }

    try {
      setSubmitting(true);
      let attachmentUrl: string | undefined = undefined;

      if (imageUri) {
        setUploadingImage(true);
        try {
          attachmentUrl = await rescueApi.uploadPhoto(imageUri);
        } catch {
          console.warn('Không thể upload ảnh minh chứng');
        } finally {
          setUploadingImage(false);
        }
      }

      const res = await complaintApi.create({
        requestId,
        targetType,
        content: fullContent,
        attachmentUrl,
      });

      // Kích hoạt onSuccess và đóng modal ngay để parent screen cập nhật tức thì
      onSuccess(res);
      onClose();

      Alert.alert(
        'Đã gửi khiếu nại',
        'Ban quản trị SRAS đã tiếp nhận khiếu nại của bạn và sẽ tiến hành xác minh xử lý trong vòng 24h làm việc.',
        [{ text: 'Đã hiểu' }]
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không thể gửi khiếu nại lúc này.';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconCircle}>
                    <AlertTriangle size={20} color="#dc2626" strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Gửi khiếu nại dịch vụ</Text>
                    <Text style={styles.subTitle}>
                      {requestCode ? `Đơn #${requestCode}` : requestId ? `Đơn #${requestId}` : 'Phản ánh hệ thống'}
                      {targetName ? ` · ${targetName}` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={submitting}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                {/* Warning note */}
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>
                    Mọi khiếu nại sẽ được chuyển trực tiếp tới Ban Quản Trị sàn SRAS để đảm bảo quyền lợi và tính công bằng cho bạn.
                  </Text>
                </View>

                {/* Common Reasons */}
                <Text style={styles.sectionLabel}>Lý do khiếu nại chính</Text>
                <View style={styles.reasonsList}>
                  {COMMON_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <TouchableOpacity
                        key={reason}
                        style={[styles.reasonItem, isSelected && styles.reasonItemActive]}
                        onPress={() => setSelectedReason(reason)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Details input */}
                <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Mô tả chi tiết sự việc</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ghi rõ thời điểm, thái độ hoặc các thiệt hại xảy ra..."
                  placeholderTextColor="#94a3b8"
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                />

                {/* Attachment photo */}
                <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Ảnh chụp bằng chứng / Hoá đơn</Text>
                {imageUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setImageUri(null)}
                      activeOpacity={0.8}
                    >
                      <X size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadBtn} onPress={chooseSource} activeOpacity={0.8}>
                    <ImagePlus size={22} color="#dc2626" />
                    <Text style={styles.uploadBtnText}>Chụp ảnh hoặc đính kèm biên lai</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
                    <Text style={styles.submitBtnText}>Xác nhận gửi khiếu nại</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 440,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  noticeBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  noticeText: {
    fontSize: 12.5,
    color: '#92400e',
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 14,
    marginBottom: 8,
  },
  reasonsList: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  reasonItemActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#dc2626',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#dc2626',
  },
  reasonText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  reasonTextActive: {
    color: '#991b1b',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13.5,
    color: '#0f172a',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  previewContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});

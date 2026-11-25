import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  Camera,
  ImageIcon,
  X,
  UploadCloud,
} from 'lucide-react-native';

export interface ImagePickerChoiceModalProps {
  visible: boolean;
  title?: string;
  onCamera: () => void;
  onLibrary: () => void;
  onClose: () => void;
}

export default function ImagePickerChoiceModal({
  visible,
  title = 'Chọn phương thức tải ảnh',
  onCamera,
  onLibrary,
  onClose,
}: ImagePickerChoiceModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerIconWrap}>
                  <UploadCloud size={20} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>Chụp ảnh gốc hoặc tải từ thư viện thiết bị</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View style={styles.optionsWrap}>
                {/* Chụp trực tiếp */}
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    onClose();
                    setTimeout(() => {
                      onCamera();
                    }, 350);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
                    <Camera size={24} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Máy ảnh (Chụp trực tiếp)</Text>
                    <Text style={styles.optionDesc}>Khuyến nghị để ảnh rõ nét, đủ ánh sáng và không mất góc</Text>
                  </View>
                </TouchableOpacity>

                {/* Chọn từ thư viện */}
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    onClose();
                    setTimeout(() => {
                      onLibrary();
                    }, 350);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                    <ImageIcon size={24} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Thư viện ảnh thiết bị</Text>
                    <Text style={styles.optionDesc}>Chọn tệp hình ảnh có sẵn trong bộ nhớ máy</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Nút hủy */}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
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
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsWrap: {
    gap: 10,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
  },
  cancelBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
});


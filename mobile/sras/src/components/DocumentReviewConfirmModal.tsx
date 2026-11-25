import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import {
  AlertTriangle,
  X,
  FileWarning,
  Clock,
  ArrowRight,
} from 'lucide-react-native';

export interface FlaggedDocItem {
  title: string;
  reason?: string;
}

export interface DocumentReviewConfirmModalProps {
  visible: boolean;
  flaggedDocs?: FlaggedDocItem[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function DocumentReviewConfirmModal({
  visible,
  flaggedDocs = [],
  loading = false,
  onClose,
  onConfirm,
}: DocumentReviewConfirmModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={loading ? undefined : onClose}
    >
      <TouchableWithoutFeedback onPress={loading ? undefined : onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Nút đóng góc phải */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.7}
              >
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>

              {/* Icon trung tâm */}
              <View style={styles.iconWrap}>
                <AlertTriangle size={30} color="#d97706" strokeWidth={2.4} />
              </View>

              {/* Badge */}
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>Đối soát hồ sơ</Text>
              </View>

              {/* Tiêu đề & phụ đề */}
              <Text style={styles.title}>Tài liệu cần xem xét</Text>
              <Text style={styles.subtitle}>
                Hệ thống ghi nhận một số hình ảnh có thể chưa rõ nét, mất góc hoặc chưa đúng chuẩn giấy tờ gốc.
              </Text>

              {/* Danh sách tài liệu có vấn đề */}
              {flaggedDocs.length > 0 && (
                <View style={styles.flaggedListCard}>
                  <Text style={styles.flaggedListTitle}>CÁC MỤC CẦN LƯU Ý ({flaggedDocs.length}):</Text>
                  <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                    {flaggedDocs.map((item, index) => (
                      <View key={index} style={styles.flaggedItem}>
                        <FileWarning size={15} color="#dc2626" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.flaggedDocTitle}>{item.title}</Text>
                          {item.reason ? (
                            <Text style={styles.flaggedDocReason}>{item.reason}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Hộp ghi chú / hướng dẫn */}
              <View style={styles.noteBox}>
                <Clock size={16} color="#92400e" style={{ marginTop: 2, flexShrink: 0 }} />
                <Text style={styles.noteText}>
                  Bạn vẫn có thể gửi hồ sơ để <Text style={{ fontWeight: '800' }}>Ban Quản Trị xét duyệt thủ công</Text>, hoặc chọn chụp lại để tăng tỷ lệ duyệt nhanh.
                </Text>
              </View>

              {/* Hai nút hành động */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Chụp / Chọn lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={onConfirm}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Gửi hồ sơ xét duyệt</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fffbeb',
    borderWidth: 2,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  badgeWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#fffbeb',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  flaggedListCard: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 12,
  },
  flaggedListTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991b1b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  scrollList: {
    maxHeight: 120,
  },
  flaggedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  flaggedDocTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  flaggedDocReason: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '500',
    marginTop: 2,
  },
  noteBox: {
    width: '100%',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 18,
  },
  noteText: {
    fontSize: 11.5,
    color: '#92400e',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.15,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

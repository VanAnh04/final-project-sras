import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  ShieldCheck,
  Lock,
  FileText,
  ChevronRight,
  Server,
  Image as ImageIcon,
  Mic,
  MapPin,
  X,
} from 'lucide-react-native';

export interface AiConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onViewPrivacyPolicy?: () => void;
}

export default function AiConsentModal({
  visible,
  onAccept,
  onDecline,
  onViewPrivacyPolicy,
}: AiConsentModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Chấp thuận chia sẻ dữ liệu</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onDecline}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Để chẩn đoán sự cố xe chính xác và hỗ trợ bạn tức thời, SRAS sử dụng mô hình trí tuệ nhân tạo (AI). Vui lòng xác nhận sự đồng thuận trước khi gửi dữ liệu.
          </Text>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Box: Dữ liệu được gửi */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <FileText size={16} color="#ea580c" />
                <Text style={styles.sectionTitle}>1. Dữ liệu cần chia sẻ</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Mô tả sự cố & Loại xe:</Text> Nội dung văn bản tình trạng hư hỏng, loại xe (xe máy, ô tô) và dòng xe.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Hình ảnh & Giọng nói:</Text> Ảnh chụp hiện trường hỏng hóc hoặc tệp ghi âm giọng nói khi bạn chủ động cung cấp.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Vị trí địa lý:</Text> Tọa độ cứu hộ để AI đề xuất gara gần nhất phù hợp phương án khắc phục.
                </Text>
              </View>
            </View>

            {/* Box: Bên thứ ba tiếp nhận & Cam kết bảo mật */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Server size={16} color="#2563eb" />
                <Text style={[styles.sectionTitle, { color: '#2563eb' }]}>2. Đơn vị xử lý & Bảo mật</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Bên thứ ba:</Text> Dữ liệu được chuyển tiếp xử lý qua API của <Text style={styles.boldText}>Google Gemini (Google Cloud Platform)</Text>.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Bảo mật đầu cuối:</Text> Toàn bộ dữ liệu được mã hóa truyền tải theo chuẩn TLS 1.3 và cam kết tuân thủ chính sách bảo mật quốc tế ISO 27001, GDPR.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Mục đích duy nhất:</Text> Chỉ dùng để phân tích kỹ thuật và chẩn đoán sự cố trong phiên làm việc hiện tại; không dùng cho mục đích quảng cáo hoặc huấn luyện AI công khai.
                </Text>
              </View>
            </View>

            {/* Link to Privacy Policy */}
            {onViewPrivacyPolicy && (
              <TouchableOpacity
                style={styles.policyLinkRow}
                onPress={onViewPrivacyPolicy}
                activeOpacity={0.7}
              >
                <Lock size={15} color="#ea580c" />
                <Text style={styles.policyLinkText}>
                  Xem chi tiết Chính sách quyền riêng tư
                </Text>
                <ChevronRight size={15} color="#ea580c" />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={onDecline}
              activeOpacity={0.7}
            >
              <Text style={styles.declineText}>Từ chối</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <ShieldCheck size={18} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.acceptText}>Tôi đồng ý</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  container: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    marginBottom: 14,
  },
  scrollArea: {
    maxHeight: 280,
    marginBottom: 16,
  },
  sectionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingRight: 6,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ea580c',
    marginTop: 6,
    marginRight: 8,
  },
  bulletText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
    color: '#1e293b',
  },
  policyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  policyLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  declineButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  acceptButton: {
    flex: 1.6,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

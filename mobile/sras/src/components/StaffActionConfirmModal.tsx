import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  UserMinus,
  UserCheck,
  UserX,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Phone,
  Hash,
  X,
  Check,
} from 'lucide-react-native';

export type StaffActionType =
  | 'REMOVE_STAFF' // Chủ Gara cho nhân viên thôi việc
  | 'CANCEL_INVITATION' // Chủ Gara thu hồi lời mời
  | 'ACCEPT_INVITATION' // Nhân viên đồng ý gia nhập
  | 'REJECT_INVITATION'; // Nhân viên từ chối gia nhập

export interface StaffActionConfirmModalProps {
  visible: boolean;
  type: StaffActionType;
  title?: string | null;
  subtitle?: string | null;
  staffName?: string | null;
  staffPhone?: string | null;
  staffCode?: string | null;
  garageName?: string | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function StaffActionConfirmModal({
  visible,
  type,
  title,
  subtitle,
  staffName,
  staffPhone,
  staffCode,
  garageName,
  loading = false,
  onClose,
  onConfirm,
}: StaffActionConfirmModalProps) {
  if (!visible) return null;

  const getConfig = () => {
    switch (type) {
      case 'REMOVE_STAFF':
        return {
          icon: <UserMinus size={28} color="#ea580c" strokeWidth={2.4} />,
          iconBg: '#fff7ed',
          iconBorder: '#fed7aa',
          defaultTitle: 'Xác nhận cho thôi việc',
          defaultSubtitle: 'Bạn có chắc chắn muốn cho nhân viên này thôi việc và xóa khỏi Gara?',
          badgeText: 'Thôi việc nhân viên',
          badgeBg: '#fff7ed',
          badgeColor: '#c2410c',
          confirmText: 'Xác nhận thôi việc',
          confirmBg: '#ea580c',
          note: 'Nhân viên này sẽ bị xóa khỏi đội ngũ thợ cứu hộ của Gara. Quyền tài khoản sẽ trở về Khách hàng tự do.',
          noteBg: '#fff7ed',
          noteColor: '#9a3412',
        };

      case 'CANCEL_INVITATION':
        return {
          icon: <UserX size={28} color="#ea580c" strokeWidth={2.4} />,
          iconBg: '#fff7ed',
          iconBorder: '#fed7aa',
          defaultTitle: 'Thu hồi lời mời gia nhập',
          defaultSubtitle: 'Bạn có chắc chắn muốn thu hồi lời mời gia nhập đã gửi cho ứng viên này?',
          badgeText: 'Thu hồi lời mời',
          badgeBg: '#fff7ed',
          badgeColor: '#c2410c',
          confirmText: 'Thu hồi lời mời',
          confirmBg: '#ea580c',
          note: 'Lời mời trên ứng dụng của nhân viên này sẽ tự động biến mất. Bạn có thể gửi lại lời mời khác sau.',
          noteBg: '#fff7ed',
          noteColor: '#9a3412',
        };

      case 'ACCEPT_INVITATION':
        return {
          icon: <UserCheck size={28} color="#ea580c" strokeWidth={2.4} />,
          iconBg: '#fff7ed',
          iconBorder: '#fed7aa',
          defaultTitle: 'Xác nhận gia nhập Đội cứu hộ',
          defaultSubtitle: 'Tham gia làm kỹ thuật viên cứu hộ chính thức cho Gara đối tác',
          badgeText: 'Lời mời gia nhập',
          badgeBg: '#fff7ed',
          badgeColor: '#c2410c',
          confirmText: 'Đồng ý gia nhập',
          confirmBg: '#ea580c',
          note: 'Sau khi đồng ý, bạn sẽ được cấp quyền Kỹ thuật viên cứu hộ và chuyển sang giao diện điều phối công việc.',
          noteBg: '#fff7ed',
          noteColor: '#9a3412',
        };

      case 'REJECT_INVITATION':
        return {
          icon: <UserX size={28} color="#ea580c" strokeWidth={2.4} />,
          iconBg: '#fff7ed',
          iconBorder: '#fed7aa',
          defaultTitle: 'Từ chối lời mời gia nhập',
          defaultSubtitle: 'Bạn có chắc chắn muốn từ chối tham gia Đội cứu hộ của Gara này?',
          badgeText: 'Từ chối lời mời',
          badgeBg: '#fff7ed',
          badgeColor: '#c2410c',
          confirmText: 'Xác nhận từ chối',
          confirmBg: '#ea580c',
          note: 'Thẻ lời mời sẽ bị xóa. Bạn vẫn giữ nguyên tài khoản Khách hàng để sử dụng các dịch vụ cứu hộ bình thường.',
          noteBg: '#fff7ed',
          noteColor: '#9a3412',
        };
    }
  };

  const config = getConfig();

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
              <View style={[styles.iconWrap, { backgroundColor: config.iconBg, borderColor: config.iconBorder }]}>
                {config.icon}
              </View>

              {/* Badge loại thao tác */}
              <View style={[styles.badgeWrap, { backgroundColor: config.badgeBg }]}>
                <Text style={[styles.badgeText, { color: config.badgeColor }]}>{config.badgeText}</Text>
              </View>

              {/* Tiêu đề & phụ đề */}
              <Text style={styles.title}>{title || config.defaultTitle}</Text>
              <Text style={styles.subtitle}>{subtitle || config.defaultSubtitle}</Text>

              {/* Thẻ thông tin chi tiết */}
              <View style={styles.infoCard}>
                {garageName ? (
                  <View style={styles.infoRow}>
                    <Building2 size={16} color="#64748b" />
                    <Text style={styles.infoLabel}>Gara:</Text>
                    <Text style={[styles.infoValue, { fontWeight: '700', color: '#1e293b' }]} numberOfLines={1}>
                      {garageName}
                    </Text>
                  </View>
                ) : null}

                {staffName ? (
                  <View style={styles.infoRow}>
                    <View style={styles.dotIndicator} />
                    <Text style={styles.infoLabel}>Nhân viên:</Text>
                    <Text style={[styles.infoValue, { fontWeight: '800', color: '#0f172a' }]} numberOfLines={1}>
                      {staffName}
                    </Text>
                  </View>
                ) : null}

                {staffPhone ? (
                  <View style={styles.infoRow}>
                    <Phone size={15} color="#64748b" />
                    <Text style={styles.infoLabel}>Số điện thoại:</Text>
                    <Text style={styles.infoValue}>{staffPhone}</Text>
                  </View>
                ) : null}

                {staffCode ? (
                  <View style={styles.infoRow}>
                    <Hash size={15} color="#64748b" />
                    <Text style={styles.infoLabel}>Mã nhân viên:</Text>
                    <Text style={[styles.infoValue, { fontWeight: '700', color: '#ea580c' }]}>{staffCode}</Text>
                  </View>
                ) : null}
              </View>

              {/* Hộp ghi chú / cảnh báo hệ quả */}
              {config.note ? (
                <View style={[styles.noteBox, { backgroundColor: config.noteBg }]}>
                  <AlertTriangle size={15} color={config.noteColor} style={{ marginTop: 2 }} />
                  <Text style={[styles.noteText, { color: config.noteColor }]}>{config.note}</Text>
                </View>
              ) : null}

              {/* Hai nút hành động */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>
                    {type === 'ACCEPT_INVITATION' ? 'Suy nghĩ thêm' : 'Hủy bỏ'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: config.confirmBg }]}
                  onPress={onConfirm}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>{config.confirmText}</Text>
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
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  badgeWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea580c',
  },
  infoLabel: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    textAlign: 'right',
  },
  noteBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 18,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748b',
  },
  confirmBtn: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});

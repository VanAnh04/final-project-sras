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
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react-native';

export type AlertType = 'warning' | 'error' | 'success' | 'info';

export interface CustomAlertModalProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function CustomAlertModal({
  visible,
  type = 'warning',
  title,
  message,
  confirmText = 'Đã hiểu',
  cancelText,
  onConfirm,
  onCancel,
}: CustomAlertModalProps) {
  const handleClose = () => {
    if (onCancel) {
      onCancel();
    } else {
      onConfirm();
    }
  };

  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={32} color="#059669" strokeWidth={2.4} />,
          iconBg: '#ecfdf5',
          iconBorder: '#a7f3d0',
          btnBg: '#059669',
          badgeText: 'Thành công',
          badgeBg: '#ecfdf5',
          badgeColor: '#047857',
        };
      case 'error':
        return {
          icon: <XCircle size={32} color="#dc2626" strokeWidth={2.4} />,
          iconBg: '#fef2f2',
          iconBorder: '#fecaca',
          btnBg: '#dc2626',
          badgeText: 'Thông báo lỗi',
          badgeBg: '#fef2f2',
          badgeColor: '#b91c1c',
        };
      case 'info':
        return {
          icon: <Info size={32} color="#2563eb" strokeWidth={2.4} />,
          iconBg: '#eff6ff',
          iconBorder: '#bfdbfe',
          btnBg: '#2563eb',
          badgeText: 'Hệ thống',
          badgeBg: '#eff6ff',
          badgeColor: '#1d4ed8',
        };
      case 'warning':
      default:
        return {
          icon: <AlertTriangle size={32} color="#d97706" strokeWidth={2.4} />,
          iconBg: '#fff7ed',
          iconBorder: '#fed7aa',
          btnBg: '#ea580c',
          badgeText: 'Cần lưu ý',
          badgeBg: '#fff7ed',
          badgeColor: '#c2410c',
        };
    }
  };

  const theme = getTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Nút đóng góc phải */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>

              {/* Icon trung tâm */}
              <View style={[styles.iconWrap, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}>
                {theme.icon}
              </View>

              {/* Badge loại thông báo */}
              <View style={[styles.badgeWrap, { backgroundColor: theme.badgeBg }]}>
                <Text style={[styles.badgeText, { color: theme.badgeColor }]}>{theme.badgeText}</Text>
              </View>

              {/* Tiêu đề & Nội dung */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Nút thao tác */}
              <View style={styles.actions}>
                {cancelText && onCancel && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>{cancelText}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: theme.btnBg }, cancelText ? { flex: 1.3 } : { width: '100%' }]}
                  onPress={onConfirm}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmBtnText}>{confirmText}</Text>
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
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeWrap: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  confirmBtn: {
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});


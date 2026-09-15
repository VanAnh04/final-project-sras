import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, ShieldCheck } from 'lucide-react-native';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export default function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  confirmText = 'Đồng ý',
  cancelText,
  onConfirm,
  onCancel,
  onClose,
}: CustomAlertProps) {
  if (!visible) return null;

  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={32} color="#ea580c" strokeWidth={2.5} />,
          iconBg: '#fff7ed',
          iconBorder: '#fed7aa',
          btnBg: '#ea580c',
          titleColor: '#ea580c',
        };
      case 'error':
        return {
          icon: <AlertCircle size={32} color="#ea580c" strokeWidth={2.5} />,
          iconBg: '#fff7ed',
          iconBorder: '#fdba74',
          btnBg: '#ea580c',
          titleColor: '#c2410c',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={32} color="#ea580c" strokeWidth={2.5} />,
          iconBg: '#fff7ed',
          iconBorder: '#fed7aa',
          btnBg: '#ea580c',
          titleColor: '#ea580c',
        };
      case 'info':
      default:
        return {
          icon: <Info size={32} color="#ea580c" strokeWidth={2.5} />,
          iconBg: '#fff7ed',
          iconBorder: '#fed7aa',
          btnBg: '#ea580c',
          titleColor: '#ea580c',
        };
    }
  };

  const theme = getTheme();

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    else if (onClose) onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose || handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button top-right */}
          {onClose && (
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}

          {/* Icon circle (SRAS Orange Theme) */}
          <View style={[styles.iconCircle, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}>
            {theme.icon}
          </View>

          {/* Title & Message */}
          <Text style={[styles.title, { color: theme.titleColor }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            {cancelText ? (
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.8}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: theme.btnBg },
                cancelText ? { flex: 1 } : { width: '100%' }
              ]}
              activeOpacity={0.88}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ffedd5',
    ...Platform.select({
      ios: {
        shadowColor: '#ea580c',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0 20px 40px -15px rgba(234, 88, 12, 0.25)',
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  confirmButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});

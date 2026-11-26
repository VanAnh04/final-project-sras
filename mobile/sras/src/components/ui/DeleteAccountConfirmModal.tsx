import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertTriangle, Trash2, X } from 'lucide-react-native';

export interface DeleteAccountConfirmModalProps {
  visible: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteAccountConfirmModal({
  visible,
  loading = false,
  onCancel,
  onConfirm,
}: DeleteAccountConfirmModalProps) {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (!visible) {
      setConfirmInput('');
    }
  }, [visible]);

  const isMatch = confirmInput.trim() === 'XOA';
  const canConfirm = isMatch && !loading;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {!loading && (
            <TouchableOpacity style={styles.closeBtn} onPress={onCancel} activeOpacity={0.7}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}

          <View style={styles.iconCircle}>
            <AlertTriangle size={30} color="#dc2626" strokeWidth={2.4} />
          </View>

          <Text style={styles.title}>Xóa tài khoản vĩnh viễn</Text>
          <Text style={styles.message}>
            Tài khoản và toàn bộ quyền truy cập của bạn sẽ bị khóa vĩnh viễn và không thể khôi phục. Nếu chỉ muốn chuyển tài khoản, hãy dùng nút Đăng xuất.
          </Text>

          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>
              Nhập đúng chữ <Text style={styles.keyword}>XOA</Text> (viết hoa) để xác nhận xóa:
            </Text>
            <TextInput
              style={styles.input}
              value={confirmInput}
              onChangeText={setConfirmInput}
              placeholder="Nhập chữ XOA"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && { opacity: 0.6 }]}
              activeOpacity={0.8}
              disabled={loading}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
              activeOpacity={0.88}
              disabled={!canConfirm}
              onPress={onConfirm}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Trash2 size={15} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.confirmButtonText}>Xóa vĩnh viễn</Text>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
    borderColor: '#fecaca',
    ...Platform.select({
      ios: {
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0 20px 40px -15px rgba(220, 38, 38, 0.25)',
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#fecaca',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#b91c1c',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  inputBox: {
    width: '100%',
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  keyword: {
    fontWeight: '900',
    color: '#dc2626',
  },
  input: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmButton: {
    flex: 1.2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#fca5a5',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});


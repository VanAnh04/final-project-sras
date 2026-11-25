import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  Trash2,
  AlertTriangle,
  Building2,
  Phone,
  MapPin,
  X,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
} from 'lucide-react-native';

export interface WithdrawRegistrationModalProps {
  visible: boolean;
  garageName?: string | null;
  garagePhone?: string | null;
  garageAddress?: string | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  onNewRegistration?: () => void;
  onGoProfile?: () => void;
}

export default function WithdrawRegistrationModal({
  visible,
  garageName,
  garagePhone,
  garageAddress,
  loading = false,
  onClose,
  onConfirm,
  onNewRegistration,
  onGoProfile,
}: WithdrawRegistrationModalProps) {
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSuccess(false);
    }
  }, [visible]);

  const handleConfirmPress = async () => {
    try {
      const res = await onConfirm();
      if (res !== false) {
        setSuccess(true);
      }
    } catch {
      // Error handled by parent
    }
  };

  const handleModalClose = () => {
    if (loading) return;
    setSuccess(false);
    onClose();
  };

  const handleCreateNew = () => {
    setSuccess(false);
    if (onNewRegistration) {
      onNewRegistration();
    } else {
      onClose();
    }
  };

  const handleBackToProfile = () => {
    setSuccess(false);
    if (onGoProfile) {
      onGoProfile();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleModalClose}
    >
      <TouchableWithoutFeedback onPress={handleModalClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Nút đóng góc phải */}
              {!success && (
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleModalClose}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}

              {success ? (
                /* Trạng thái thành công */
                <View style={styles.successContainer}>
                  <View style={styles.successIconWrap}>
                    <CheckCircle2 size={44} color="#16a34a" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.successTitle}>Rút hồ sơ thành công</Text>
                  <Text style={styles.successSubtitle}>
                    Hồ sơ đăng ký Gara đã được hủy bỏ và toàn bộ dữ liệu biểu mẫu đã được làm sạch. Bạn có thể đăng ký mới ngay lập tức.
                  </Text>
                  <View style={styles.successActionsCol}>
                    <TouchableOpacity
                      style={styles.newFormBtn}
                      onPress={handleCreateNew}
                      activeOpacity={0.85}
                    >
                      <PlusCircle size={18} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.newFormBtnText}>Làm sạch & Đăng ký mới</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.backProfileBtn}
                      onPress={handleBackToProfile}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.backProfileBtnText}>Về trang cá nhân</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Trạng thái xác nhận rút */
                <>
                  {/* Icon trung tâm */}
                  <View style={styles.iconWrap}>
                    <Trash2 size={28} color="#dc2626" strokeWidth={2.4} />
                  </View>

                  {/* Badge */}
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>Rút hồ sơ đăng ký Gara</Text>
                  </View>

                  {/* Tiêu đề & phụ đề */}
                  <Text style={styles.title}>Xác nhận rút hồ sơ</Text>
                  <Text style={styles.subtitle}>
                    Bạn có chắc chắn muốn rút lại hồ sơ đăng ký đối tác Gara?
                  </Text>

                  {/* Thẻ thông tin Gara */}
                  <View style={styles.infoCard}>
                    {garageName ? (
                      <View style={styles.infoRow}>
                        <Building2 size={16} color="#64748b" />
                        <Text style={styles.infoLabel}>Tên Gara:</Text>
                        <Text style={[styles.infoValue, { fontWeight: '700', color: '#0f172a' }]} numberOfLines={1}>
                          {garageName}
                        </Text>
                      </View>
                    ) : null}

                    {garagePhone ? (
                      <View style={styles.infoRow}>
                        <Phone size={15} color="#64748b" />
                        <Text style={styles.infoLabel}>Hotline:</Text>
                        <Text style={styles.infoValue}>{garagePhone}</Text>
                      </View>
                    ) : null}

                    {garageAddress ? (
                      <View style={styles.infoRow}>
                        <MapPin size={15} color="#64748b" />
                        <Text style={styles.infoLabel}>Địa chỉ:</Text>
                        <Text style={styles.infoValue} numberOfLines={2}>
                          {garageAddress}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Cảnh báo hậu quả */}
                  <View style={styles.noteBox}>
                    <AlertTriangle size={16} color="#b91c1c" style={{ marginTop: 1 }} />
                    <Text style={styles.noteText}>
                      Hồ sơ đang chờ phê duyệt sẽ bị hủy bỏ. Sau khi rút, bạn có thể gửi lại hồ sơ mới bất cứ lúc nào hoặc tham gia làm kỹ thuật viên cho Gara khác.
                    </Text>
                  </View>

                  {/* Nút thao tác */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={handleModalClose}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelBtnText}>Giữ lại hồ sơ</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={handleConfirmPress}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.confirmBtnText}>Xác nhận rút</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  badgeWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b91c1c',
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
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  noteBox: {
    width: '100%',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#ffe4e6',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 18,
  },
  noteText: {
    fontSize: 11.5,
    color: '#9f1239',
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
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803d',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  successActionsCol: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  newFormBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  newFormBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  backProfileBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
});

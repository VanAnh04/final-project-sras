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
  Image,
} from 'react-native';
import {
  Truck,
  Bike,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Check,
  ShieldCheck,
  Hash,
  Sparkles,
  RefreshCw,
  Camera,
} from 'lucide-react-native';
import { VehiclePhotoAnalysisResult } from '../api/aiVerifyApi';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const LINE = '#e2e8f0';
const SUCCESS = '#16a34a';
const DANGER = '#ef4444';
const WARNING = '#d97706';

const KIND_NAMES: Record<string, string> = {
  TOW_TRUCK: 'Xe kéo',
  MOTORBIKE: 'Xe máy',
  VAN: 'Xe tải nhỏ',
};

/* ─────────────────────────────────────────────────────────
   1. MODAL XÁC NHẬN THÊM XE CỨU HỘ (CONFIRM MODAL)
   ───────────────────────────────────────────────────────── */
export interface VehicleSaveConfirmModalProps {
  visible: boolean;
  imageUri: string | null;
  plate: string;
  kind: string | null;
  aiResult?: VehiclePhotoAnalysisResult | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function VehicleSaveConfirmModal({
  visible,
  imageUri,
  plate,
  kind,
  aiResult,
  loading = false,
  onClose,
  onConfirm,
}: VehicleSaveConfirmModalProps) {
  if (!visible) return null;

  const kindLabel = kind ? KIND_NAMES[kind] || kind : 'Chưa chọn';
  const isMotorbike = kind === 'MOTORBIKE';
  const isAiRejected = Boolean(
    aiResult && (
      aiResult.status === 'REJECTED' ||
      aiResult.isRescueVehicle === false ||
      !aiResult.vehiclePresent ||
      aiResult.isScreenCapture
    )
  );
  const isVerified = !isAiRejected && aiResult?.status === 'VERIFIED';
  const isWarning = !isAiRejected && aiResult?.status === 'WARNING';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose} disabled={loading}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Nút đóng */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.7}
              >
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>

              {/* Icon đại diện phương tiện */}
              <View style={styles.iconWrap}>
                {isMotorbike ? (
                  <Bike size={30} color={BRAND} strokeWidth={2.4} />
                ) : (
                  <Truck size={30} color={BRAND} strokeWidth={2.4} />
                )}
              </View>

              {/* Badge Tiêu đề nhỏ */}
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>Xác nhận phương tiện cứu hộ</Text>
              </View>

              <Text style={styles.title}>Thêm xe vào đội cứu hộ?</Text>
              <Text style={styles.subtitle}>
                Kiểm tra thông tin phương tiện trước khi kích hoạt sẵn sàng nhận đơn.
              </Text>

              {/* Thẻ thông tin chi tiết xe */}
              <View style={styles.infoCard}>
                {imageUri ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image source={{ uri: imageUri }} style={styles.vehicleImage} resizeMode="cover" />
                    {isVerified && (
                      <View style={styles.imageAiBadge}>
                        <ShieldCheck size={13} color="#ffffff" strokeWidth={2.6} />
                        <Text style={styles.imageAiBadgeText}>AI Đã duyệt</Text>
                      </View>
                    )}
                  </View>
                ) : null}

                {/* Dòng Biển số xe */}
                <View style={styles.infoRow}>
                  <View style={styles.infoRowLeft}>
                    <Hash size={16} color={SUB} />
                    <Text style={styles.infoLabel}>Biển số xe:</Text>
                  </View>
                  <Text style={styles.infoValuePlate}>{plate}</Text>
                </View>

                {/* Dòng Loại xe */}
                <View style={styles.infoRow}>
                  <View style={styles.infoRowLeft}>
                    {isMotorbike ? <Bike size={16} color={SUB} /> : <Truck size={16} color={SUB} />}
                    <Text style={styles.infoLabel}>Loại xe:</Text>
                  </View>
                  <Text style={styles.infoValue}>{kindLabel}</Text>
                </View>

                {/* Dòng Trạng thái xác thực AI */}
                <View style={styles.infoRow}>
                  <View style={styles.infoRowLeft}>
                    <Sparkles size={16} color={isVerified ? SUCCESS : isWarning ? WARNING : isAiRejected ? DANGER : SUB} />
                    <Text style={styles.infoLabel}>Kiểm tra AI:</Text>
                  </View>
                  <View
                    style={[
                      styles.aiStatusPill,
                      isVerified && styles.aiStatusPillVerified,
                      isWarning && styles.aiStatusPillWarning,
                      isAiRejected && { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.aiStatusPillText,
                        isVerified && { color: SUCCESS },
                        isWarning && { color: '#b45309' },
                        isAiRejected && { color: DANGER },
                      ]}
                    >
                      {isVerified
                        ? '✓ Hợp lệ'
                        : isWarning
                        ? '⚠ Cảnh báo mờ/tối'
                        : isAiRejected
                        ? '✗ Không hợp lệ'
                        : 'Chờ xác thực'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Hộp ghi chú sẵn sàng */}
              <View style={styles.readyNoteBox}>
                <CheckCircle2 size={15} color="#0369a1" style={{ marginTop: 1 }} />
                <Text style={styles.readyNoteText}>
                  Xe cứu hộ sau khi lưu sẽ ở trạng thái <Text style={{ fontWeight: '800' }}>Sẵn sàng (FREE)</Text> để Gara phân công nhiệm vụ ngay.
                </Text>
              </View>

              {/* Hai nút hành động: Hủy & Xác nhận */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Kiểm tra lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={onConfirm}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Check size={18} color="#ffffff" strokeWidth={2.8} />
                      <Text style={styles.confirmBtnText}>Xác nhận lưu</Text>
                    </>
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

/* ─────────────────────────────────────────────────────────
   2. MODAL THÔNG BÁO THÀNH CÔNG (SUCCESS MODAL)
   ───────────────────────────────────────────────────────── */
export interface VehicleSaveSuccessModalProps {
  visible: boolean;
  plate: string;
  kind: string | null;
  onDone: () => void;
}

export function VehicleSaveSuccessModal({
  visible,
  plate,
  kind,
  onDone,
}: VehicleSaveSuccessModalProps) {
  if (!visible) return null;

  const kindLabel = kind ? KIND_NAMES[kind] || kind : 'Xe cứu hộ';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.overlay}>
        <View style={[styles.card, { borderTopWidth: 4, borderTopColor: SUCCESS }]}>
          {/* Vòng tròn icon thành công */}
          <View style={styles.successIconWrap}>
            <CheckCircle2 size={46} color={SUCCESS} strokeWidth={2.4} />
          </View>

          <Text style={styles.successTitle}>Đã thêm xe cứu hộ!</Text>
          <Text style={styles.successDesc}>
            Phương tiện <Text style={{ fontWeight: '800', color: INK }}>{plate}</Text> đã được thêm thành công vào Gara và sẵn sàng nhận nhiệm vụ cứu hộ.
          </Text>

          {/* Hộp tóm tắt thông tin */}
          <View style={styles.successSummaryBox}>
            <View style={styles.successSummaryRow}>
              <Text style={styles.successSummaryLabel}>Biển số:</Text>
              <Text style={styles.successSummaryPlate}>{plate}</Text>
            </View>
            <View style={[styles.successSummaryRow, { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10 }]}>
              <Text style={styles.successSummaryLabel}>Loại xe:</Text>
              <Text style={styles.successSummaryValue}>{kindLabel}</Text>
            </View>
            <View style={[styles.successSummaryRow, { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10 }]}>
              <Text style={styles.successSummaryLabel}>Trạng thái:</Text>
              <View style={styles.statusBadgeFree}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.statusTextFree}>Sẵn sàng (FREE)</Text>
              </View>
            </View>
          </View>

          {/* Nút Hoàn tất */}
          <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.88}>
            <Text style={styles.doneBtnText}>Về danh sách đội xe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────
   3. MODAL CẢNH BÁO / THÔNG BÁO LỖI (NOTICE MODAL)
   ───────────────────────────────────────────────────────── */
export interface VehicleNoticeModalProps {
  visible: boolean;
  type?: 'WARNING' | 'DANGER' | 'INFO';
  title: string;
  message: string;
  primaryBtnText?: string;
  secondaryBtnText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  onClose: () => void;
}

export function VehicleNoticeModal({
  visible,
  type = 'WARNING',
  title,
  message,
  primaryBtnText = 'Đã hiểu',
  secondaryBtnText,
  onPrimaryPress,
  onSecondaryPress,
  onClose,
}: VehicleNoticeModalProps) {
  if (!visible) return null;

  const isDanger = type === 'DANGER';
  const isWarning = type === 'WARNING';

  const iconColor = isDanger ? DANGER : isWarning ? '#d97706' : '#2563eb';
  const iconBg = isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : '#eff6ff';
  const iconBorder = isDanger ? '#fecaca' : isWarning ? '#fef3c7' : '#bfdbfe';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { borderTopWidth: 4, borderTopColor: iconColor }]}>
              {/* Nút đóng */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>

              {/* Icon cảnh báo */}
              <View style={[styles.iconWrap, { backgroundColor: iconBg, borderColor: iconBorder }]}>
                {isDanger ? (
                  <XCircle size={32} color={iconColor} strokeWidth={2.4} />
                ) : isWarning ? (
                  <AlertTriangle size={32} color={iconColor} strokeWidth={2.4} />
                ) : (
                  <Sparkles size={32} color={iconColor} strokeWidth={2.4} />
                )}
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{message}</Text>

              {/* Các nút hành động */}
              <View style={styles.actionsRow}>
                {secondaryBtnText && onSecondaryPress ? (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      onSecondaryPress();
                      onClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>{secondaryBtnText}</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: iconColor }]}
                  onPress={() => {
                    if (onPrimaryPress) onPrimaryPress();
                    onClose();
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.confirmBtnText}>{primaryBtnText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────
   STYLES ĐỒNG BỘ CHUẨN SRAS GARAGE-OWNER
   ───────────────────────────────────────────────────────── */
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
    maxWidth: 370,
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
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff7ed',
    borderWidth: 2,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  badgeWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c2410c',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: INK,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    color: SUB,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 6,
  },

  infoCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  imagePreviewWrap: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e2e8f0',
    marginBottom: 4,
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  imageAiBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 163, 74, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  imageAiBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 12.5,
    color: SUB,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13.5,
    color: INK,
    fontWeight: '700',
  },
  infoValuePlate: {
    fontSize: 15,
    color: INK,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  aiStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: LINE,
  },
  aiStatusPillVerified: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  aiStatusPillWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  aiStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: SUB,
  },

  readyNoteBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  readyNoteText: {
    flex: 1,
    fontSize: 11.5,
    color: '#0369a1',
    lineHeight: 16,
  },

  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.4,
    backgroundColor: BRAND,
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Styles cho Success Modal */
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: INK,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 13,
    color: SUB,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  successSummaryBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    padding: 14,
    marginVertical: 16,
    gap: 10,
  },
  successSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successSummaryLabel: {
    fontSize: 12.5,
    color: SUB,
    fontWeight: '600',
  },
  successSummaryPlate: {
    fontSize: 15,
    color: INK,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  successSummaryValue: {
    fontSize: 13.5,
    color: INK,
    fontWeight: '700',
  },
  statusBadgeFree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusDotGreen: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: SUCCESS,
  },
  statusTextFree: {
    fontSize: 11.5,
    fontWeight: '800',
    color: SUCCESS,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: BRAND,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});


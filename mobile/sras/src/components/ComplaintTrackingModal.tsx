import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Building2,
  MessageSquare,
  FileText,
  HelpCircle,
} from 'lucide-react-native';
import { ComplaintDto, complaintApi } from '../api/complaintApi';
import { resolveFileUrl } from '../api/axiosClient';

interface ComplaintTrackingModalProps {
  visible: boolean;
  complaint: ComplaintDto | null;
  requestCode?: string;
  garageName?: string;
  onClose: () => void;
}

export default function ComplaintTrackingModal({
  visible,
  complaint,
  requestCode,
  garageName,
  onClose,
}: ComplaintTrackingModalProps) {
  const [activeComplaint, setActiveComplaint] = React.useState<ComplaintDto | null>(complaint);

  React.useEffect(() => {
    setActiveComplaint(complaint);
    if (visible && complaint?.requestId) {
      complaintApi
        .getByRequest(complaint.requestId)
        .then((latest) => {
          if (latest) setActiveComplaint(latest);
        })
        .catch(() => {});
    }
  }, [visible, complaint?.id, complaint?.requestId]);

  if (!activeComplaint) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'OPEN':
        return {
          title: 'Chờ tiếp nhận',
          desc: 'Khiếu nại đã được gửi lên hệ thống và đang chờ Ban quản trị duyệt.',
          color: '#f59e0b',
          bgColor: '#fffbeb',
          borderColor: '#fde68a',
          Icon: Clock,
          stepIndex: 1,
        };
      case 'IN_REVIEW':
        return {
          title: 'Đang xác minh',
          desc: 'Ban quản trị đang liên hệ đối soát giữa khách hàng và Gara.',
          color: '#2563eb',
          bgColor: '#eff6ff',
          borderColor: '#bfdbfe',
          Icon: AlertTriangle,
          stepIndex: 2,
        };
      case 'RESOLVED':
        return {
          title: 'Đã giải quyết',
          desc: 'Khiếu nại đã có phán quyết và giải pháp xử lý chính thức.',
          color: '#16a34a',
          bgColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          Icon: CheckCircle2,
          stepIndex: 3,
        };
      case 'REJECTED':
        return {
          title: 'Đã bác bỏ',
          desc: 'Khiếu nại không đủ căn cứ chứng minh hoặc không có vi phạm.',
          color: '#dc2626',
          bgColor: '#fef2f2',
          borderColor: '#fecaca',
          Icon: XCircle,
          stepIndex: 3,
        };
      default:
        return {
          title: 'Đang xử lý',
          desc: 'Tiến trình đang cập nhật.',
          color: '#64748b',
          bgColor: '#f8fafc',
          borderColor: '#e2e8f0',
          Icon: HelpCircle,
          stepIndex: 1,
        };
    }
  };

  const statusInfo = getStatusInfo(activeComplaint.status);
  const StatusIcon = statusInfo.Icon;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.shieldIconWrapper}>
                <ShieldAlert size={22} color="#dc2626" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Theo dõi khiếu nại</Text>
                <Text style={styles.modalSubTitle}>
                  Mã khiếu nại: #{activeComplaint.id} • Đơn #{requestCode || activeComplaint.requestCode || activeComplaint.requestId}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Status Highlight Banner */}
            <View
              style={[
                styles.statusBanner,
                { backgroundColor: statusInfo.bgColor, borderColor: statusInfo.borderColor },
              ]}
            >
              <StatusIcon size={24} color={statusInfo.color} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusBannerTitle, { color: statusInfo.color }]}>
                  {statusInfo.title}
                </Text>
                <Text style={styles.statusBannerDesc}>{statusInfo.desc}</Text>
              </View>
            </View>

            {/* Stepper Progress Timeline */}
            <View style={styles.timelineCard}>
              <Text style={styles.sectionTitle}>Tiến trình giải quyết</Text>
              <View style={styles.stepsContainer}>
                {/* Step 1 */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      statusInfo.stepIndex >= 1 ? styles.stepDotActive : styles.stepDotInactive,
                    ]}
                  >
                    <Text style={styles.stepNumber}>1</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepName}>Gửi khiếu nại</Text>
                    <Text style={styles.stepTime}>{formatDate(activeComplaint.createdAt)}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.stepLine,
                    statusInfo.stepIndex >= 2 ? styles.stepLineActive : styles.stepLineInactive,
                  ]}
                />

                {/* Step 2 */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      statusInfo.stepIndex >= 2 ? styles.stepDotActive : styles.stepDotInactive,
                    ]}
                  >
                    <Text style={styles.stepNumber}>2</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepName}>Ban QTV xác minh</Text>
                    <Text style={styles.stepTime}>
                      {activeComplaint.status === 'RESOLVED' || activeComplaint.status === 'REJECTED'
                        ? 'Đã xác minh'
                        : activeComplaint.status === 'IN_REVIEW'
                        ? 'Đang thẩm định'
                        : 'Chờ phân công'}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.stepLine,
                    statusInfo.stepIndex >= 3 ? styles.stepLineActive : styles.stepLineInactive,
                  ]}
                />

                {/* Step 3 */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      statusInfo.stepIndex >= 3
                        ? activeComplaint.status === 'RESOLVED'
                          ? styles.stepDotSuccess
                          : styles.stepDotDanger
                        : styles.stepDotInactive,
                    ]}
                  >
                    <Text style={styles.stepNumber}>3</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepName}>Phán quyết xử lý</Text>
                    <Text style={styles.stepTime}>
                      {activeComplaint.status === 'RESOLVED' || activeComplaint.status === 'REJECTED'
                        ? activeComplaint.updatedAt
                          ? formatDate(activeComplaint.updatedAt)
                          : 'Đã hoàn tất'
                        : 'Chờ kết luận'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Official Resolution Result (if available) */}
            {activeComplaint.resolution ? (
              <View
                style={[
                  styles.resolutionCard,
                  activeComplaint.status === 'RESOLVED'
                    ? styles.resolutionCardSuccess
                    : styles.resolutionCardReject,
                ]}
              >
                <View style={styles.resolutionHeader}>
                  <CheckCircle2
                    size={18}
                    color={activeComplaint.status === 'RESOLVED' ? '#16a34a' : '#dc2626'}
                  />
                  <Text
                    style={[
                      styles.resolutionTitle,
                      { color: activeComplaint.status === 'RESOLVED' ? '#16a34a' : '#dc2626' },
                    ]}
                  >
                    Kết luận từ Ban Quản Trị
                  </Text>
                </View>
                <Text style={styles.resolutionContent}>{activeComplaint.resolution}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
                  <Text style={styles.resolutionAuthor}>
                    Người xử lý: {activeComplaint.handledByUserName || 'Ban Quản Trị'} (Admin)
                  </Text>
                  {activeComplaint.updatedAt && (
                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500' }}>
                      {formatDate(activeComplaint.updatedAt)}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}

            {/* Complaint Detail Info */}
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Thông tin khiếu nại</Text>

              {/* Target Garage */}
              <View style={styles.detailRow}>
                <Building2 size={16} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.detailLabel}>Đối tượng:</Text>
                <Text style={styles.detailValue}>
                  {garageName || activeComplaint.garageName || 'Gara cứu hộ'}
                </Text>
              </View>

              {/* Content */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MessageSquare size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <Text style={styles.detailLabel}>Nội dung phản ánh:</Text>
                </View>
                <View style={styles.contentBox}>
                  <Text style={styles.contentText}>{activeComplaint.content}</Text>
                </View>
              </View>

              {/* Attachment photo */}
              {activeComplaint.attachmentUrl ? (
                <View style={{ marginTop: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <FileText size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <Text style={styles.detailLabel}>Hình ảnh bằng chứng:</Text>
                  </View>
                  <Image
                    source={{ uri: resolveFileUrl(activeComplaint.attachmentUrl) }}
                    style={styles.attachmentImg}
                    resizeMode="cover"
                  />
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={onClose} style={styles.closeActionBtn} activeOpacity={0.85}>
              <Text style={styles.closeActionText}>Đóng</Text>
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
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shieldIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    padding: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusBannerDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  timelineCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 80,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepDotActive: {
    backgroundColor: '#ea580c',
  },
  stepDotInactive: {
    backgroundColor: '#cbd5e1',
  },
  stepDotSuccess: {
    backgroundColor: '#16a34a',
  },
  stepDotDanger: {
    backgroundColor: '#dc2626',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  stepTextContainer: {
    alignItems: 'center',
  },
  stepName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  stepTime: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginBottom: 20,
  },
  stepLineActive: {
    backgroundColor: '#ea580c',
  },
  stepLineInactive: {
    backgroundColor: '#e2e8f0',
  },
  resolutionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  resolutionCardSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  resolutionCardReject: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  resolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resolutionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  resolutionContent: {
    fontSize: 13,
    color: '#1e293b',
    lineHeight: 19,
    fontWeight: '500',
  },
  resolutionAuthor: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 6,
  },
  contentBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  contentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  attachmentImg: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  closeActionBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});

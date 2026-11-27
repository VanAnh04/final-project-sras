import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';
import {
  Building2,
  ArrowLeft,
  Images,
  Eye,
  X,
  ChevronRight,
  ShieldCheck,
  Phone,
  MapPin,
  Car,
  FileCheck,
} from 'lucide-react-native';

const getDocTitle = (docType: string, note?: string) => {
  switch (docType) {
    case 'GARAGE_PHOTO':
      return 'Ảnh mặt tiền Gara';
    case 'BUSINESS_LICENSE':
      return 'Giấy phép ĐKKD';
    case 'OWNER_ID_CARD_FRONT':
      return 'CCCD Chủ cơ sở (Mặt trước)';
    case 'OWNER_ID_CARD_BACK':
      return 'CCCD Chủ cơ sở (Mặt sau)';
    case 'CRIMINAL_RECORD':
      return 'Lý lịch tư pháp';
    case 'VEHICLE_REGISTRATION':
      return 'Đăng ký xe cứu hộ';
    default:
      return note || 'Tài liệu hồ sơ';
  }
};

export default function GarageProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Danh sách tài liệu/chứng từ & state popup
  const [documents, setDocuments] = useState<any[]>([]);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  const [garage, setGarage] = useState<{
    code: string;
    name: string;
    phone: string;
    address: string;
    coverUrl: string;
    isOnline: boolean;
    status: string;
    capability: string;
  }>({
    code: '',
    name: 'Đang tải thông tin...',
    phone: user?.phone || '',
    address: 'Đang tải địa chỉ...',
    coverUrl: '',
    isOnline: true,
    status: 'APPROVED',
    capability: 'BOTH',
  });

  const fetchGarageDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await axiosClient.get('/garages/me');
      if (res?.data) {
        const d = res.data;
        const docs = Array.isArray(d.documents) ? d.documents : [];
        setDocuments(docs);
        const photoDoc = docs.find((doc: any) => doc.docType === 'GARAGE_PHOTO');
        const photoUrl = photoDoc?.fileUrl ? resolveFileUrl(photoDoc.fileUrl) : '';

        setGarage({
          code: d.code || (d.id ? `GR-${String(d.id).padStart(4, '0')}` : 'GR-0001'),
          name: d.name || 'Gara Cứu Hộ',
          phone: d.phone || user?.phone || 'Chưa cập nhật hotline',
          address: d.address || 'Chưa cập nhật địa chỉ cơ sở',
          coverUrl: photoUrl || '',
          isOnline: d.isOnline !== undefined ? Boolean(d.isOnline) : true,
          status: d.status || 'APPROVED',
          capability: d.capability || 'BOTH',
        });
      }
    } catch (e) {
      console.log('Error fetching garage profile from API');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchGarageDetails();
    }, [fetchGarageDetails])
  );

  const handleBack = () => {
    router.replace('/garage-owner/settings');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#334155" />
          </TouchableOpacity>

          <View style={styles.headerLogoWrap}>
            <Building2 size={19} color="#ea580c" strokeWidth={2.5} />
          </View>
          <Text style={styles.headerTitle}>Hồ sơ Gara</Text>
        </View>

        <View style={[styles.onlineBadge, !garage.isOnline && styles.offlineBadge]}>
          <View style={[styles.onlineDot, !garage.isOnline && styles.offlineDot]} />
          <Text style={[styles.onlineText, !garage.isOnline && styles.offlineText]}>
            {garage.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Section 1: Thông tin Gara */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Thông tin Gara</Text>
          <TouchableOpacity
            onPress={() => router.push('/garage-owner/edit-profile?from=garage-profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.editLinkText}>Chỉnh sửa</Text>
          </TouchableOpacity>
        </View>

        {/* Cover Banner Card (Ảnh Gara) */}
        <TouchableOpacity
          style={styles.coverCard}
          activeOpacity={0.9}
          onPress={() => setShowDocsModal(true)}
        >
          {garage.coverUrl ? (
            <Image
              source={{ uri: garage.coverUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              {loading ? (
                <ActivityIndicator size="small" color="#ea580c" />
              ) : (
                <Building2 size={36} color="#64748b" strokeWidth={1.8} />
              )}
              <Text style={styles.coverPlaceholderText}>
                {loading ? 'Đang tải ảnh cơ sở...' : 'Chưa có ảnh mặt tiền cơ sở'}
              </Text>
            </View>
          )}
          <View style={styles.coverOverlay} />

          {/* Nút xem tất cả ảnh hồ sơ trên góc phải ảnh bìa */}
          <TouchableOpacity
            style={styles.viewDocsBadge}
            activeOpacity={0.8}
            onPress={() => setShowDocsModal(true)}
          >
            <Images size={13} color="#ffffff" strokeWidth={2.3} />
            <Text style={styles.viewDocsBadgeText}>
              {documents.length > 0 ? `Ảnh hồ sơ (${documents.length})` : 'Ảnh hồ sơ'}
            </Text>
          </TouchableOpacity>

          <View style={styles.bannerInfoBox}>
            <View style={styles.avatarCircle}>
              <Building2 size={24} color="#ea580c" strokeWidth={2.4} />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerGarageName} numberOfLines={1}>{garage.name}</Text>
              <Text style={styles.bannerGarageId}>Mã cơ sở: {garage.code || 'GR-0001'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Details Fields Card */}
        <View style={styles.detailsCard}>
          <View style={styles.fieldRowWithIcon}>
            <Building2 size={16} color="#64748b" style={styles.fieldIcon} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Tên Gara</Text>
              <Text style={styles.fieldValue}>{garage.name}</Text>
            </View>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.fieldRowWithIcon}>
            <Phone size={16} color="#64748b" style={styles.fieldIcon} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Hotline liên hệ</Text>
              <Text style={styles.fieldValue}>{garage.phone}</Text>
            </View>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.fieldRowWithIcon}>
            <MapPin size={16} color="#64748b" style={styles.fieldIcon} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Địa chỉ cơ sở</Text>
              <Text style={styles.fieldValue}>{garage.address}</Text>
            </View>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.fieldRowWithIcon}>
            <Car size={16} color="#64748b" style={styles.fieldIcon} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phạm vi cứu hộ</Text>
              <Text style={styles.fieldValue}>
                {garage.capability === 'CAR' ? 'Cứu hộ Ô tô' : garage.capability === 'MOTORBIKE' ? 'Cứu hộ Xe máy' : 'Cứu hộ Ô tô & Xe máy'}
              </Text>
            </View>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.fieldRowWithIcon}>
            <ShieldCheck size={16} color={garage.status === 'APPROVED' ? '#16a34a' : '#d97706'} style={styles.fieldIcon} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Trạng thái xét duyệt</Text>
              <Text style={[styles.fieldValue, { color: garage.status === 'APPROVED' ? '#16a34a' : '#d97706', fontWeight: '700' }]}>
                {garage.status === 'APPROVED' ? 'Đã xác thực & cấp phép' : 'Đang chờ xét duyệt'}
              </Text>
            </View>
          </View>
          <View style={styles.fieldDivider} />

          {/* Dòng xem ảnh & hồ sơ chứng từ */}
          <TouchableOpacity
            style={styles.fieldRowClickable}
            activeOpacity={0.7}
            onPress={() => setShowDocsModal(true)}
          >
            <View style={styles.fieldRowWithIconFlex}>
              <FileCheck size={16} color="#ea580c" style={styles.fieldIcon} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.fieldLabel}>Ảnh & Chứng từ pháp lý</Text>
                <Text style={styles.fieldValue}>
                  {documents.length > 0 ? `${documents.length} tài liệu hồ sơ đã lưu` : 'Chưa có tài liệu đính kèm'}
                </Text>
              </View>
            </View>
            <View style={styles.viewDocsLinkPill}>
              <Eye size={13} color="#ea580c" strokeWidth={2.2} />
              <Text style={styles.viewDocsLinkText}>Xem tất cả</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* MODAL XEM CHI TIẾT DANH SÁCH ẢNH & TÀI LIỆU HỒ SƠ */}
      <Modal
        visible={showDocsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (selectedImage) {
            setSelectedImage(null);
          } else {
            setShowDocsModal(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalHeaderIconWrap}>
                  <Images size={18} color="#ea580c" strokeWidth={2.2} />
                </View>
                <Text style={styles.modalTitle}>Tài liệu & Hồ sơ Gara</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowDocsModal(false)}
                activeOpacity={0.7}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.docsListScroll} showsVerticalScrollIndicator={false}>
              {documents.length === 0 ? (
                <View style={styles.emptyDocsBox}>
                  <Text style={styles.emptyDocsText}>Chưa có tài liệu hồ sơ nào được tải lên.</Text>
                </View>
              ) : (
                documents.map((doc, index) => {
                  const resolvedUrl = doc.fileUrl ? resolveFileUrl(doc.fileUrl) : '';
                  const docTitle = getDocTitle(doc.docType, doc.note);

                  return (
                    <View key={doc.id || index} style={styles.docItemCard}>
                      <View style={styles.docItemHeader}>
                        <Text style={styles.docItemTitle}>{docTitle}</Text>
                        {doc.aiVerified ? (
                          <View style={styles.aiVerifiedBadge}>
                            <Text style={styles.aiVerifiedText}>AI Đã xác thực</Text>
                          </View>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        style={styles.docImageWrapper}
                        activeOpacity={0.85}
                        onPress={() => {
                          if (resolvedUrl) {
                            setSelectedImage({ url: resolvedUrl, title: docTitle });
                          }
                        }}
                      >
                        {resolvedUrl ? (
                          <Image
                            source={{ uri: resolvedUrl }}
                            style={styles.docThumbnail}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.docImageFallback}>
                            <Text style={styles.docImageFallbackText}>Không thể tải ảnh</Text>
                          </View>
                        )}
                        <View style={styles.docZoomOverlay} pointerEvents="none">
                          <Eye size={15} color="#ffffff" />
                          <Text style={styles.docZoomText}>Chạm để phóng to</Text>
                        </View>
                      </TouchableOpacity>

                      {doc.note ? (
                        <Text style={styles.docNoteText}>{doc.note}</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>

        {/* FULL SCREEN IMAGE VIEWER OVERLAY */}
        {selectedImage ? (
          <View style={styles.fullScreenBackdrop}>
            <SafeAreaView style={styles.fullScreenSafeArea} edges={['top', 'bottom']}>
              <View style={styles.fullScreenHeader}>
                <Text style={styles.fullScreenTitle} numberOfLines={1}>
                  {selectedImage.title || 'Xem ảnh hồ sơ'}
                </Text>
                <TouchableOpacity
                  style={styles.fullScreenCloseBtn}
                  onPress={() => setSelectedImage(null)}
                  activeOpacity={0.7}
                >
                  <X size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.fullScreenBody}
                activeOpacity={1}
                onPress={() => setSelectedImage(null)}
              >
                {selectedImage.url ? (
                  <Image
                    source={{ uri: selectedImage.url }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                ) : null}
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
    marginRight: 2,
  },
  headerLogoWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  offlineBadge: {
    backgroundColor: '#f1f5f9',
  },
  offlineDot: {
    backgroundColor: '#94a3b8',
  },
  offlineText: {
    color: '#64748b',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.1,
  },
  editLinkText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  coverCard: {
    position: 'relative',
    height: 210,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  bannerInfoBox: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffedd5',
  },
  bannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  bannerGarageName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  bannerGarageId: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  viewDocsBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    zIndex: 10,
  },
  viewDocsBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      default: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
      },
    }),
  },
  fieldRowWithIcon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  fieldRowWithIconFlex: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  fieldIcon: {
    marginTop: 2,
  },
  fieldRow: {
    flex: 1,
    gap: 3,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 19,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  fieldRowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewDocsLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  viewDocsLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  docsListScroll: {
    padding: 16,
    gap: 16,
  },
  emptyDocsBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDocsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  docItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  docItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  aiVerifiedBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  aiVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  docImageWrapper: {
    position: 'relative',
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  docThumbnail: {
    width: '100%',
    height: '100%',
  },
  docImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  docImageFallbackText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  docZoomOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  docZoomText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  docNoteText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  fullScreenBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 9999,
  },
  fullScreenSafeArea: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fullScreenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  fullScreenCloseBtn: {
    padding: 8,
  },
  fullScreenBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Switch,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';
import {
  Building2,
  ArrowLeft,
  Disc,
  Zap,
  Truck,
  Wrench,
  Fuel,
  Key,
  Gauge,
  BatteryCharging,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Pencil,
  Images,
  Eye,
  X,
  FileText,
  CheckCircle2,
  Star,
  MessageCircle
} from 'lucide-react-native';
import { ratingApi, RatingDto } from '../../api/ratingApi';

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
  const [expanded, setExpanded] = useState(false);

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

  const [services, setServices] = useState<any[]>([]);
  const [ratings, setRatings] = useState<RatingDto[]>([]);

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

        // Tải danh sách đánh giá từ khách hàng
        if (d.id) {
          try {
            const rList = await ratingApi.getByGarageList(d.id);
            setRatings(rList || []);
          } catch (rErr) {
            console.log('Error fetching ratings:', rErr);
          }
        }
      }
    } catch (e) {
      console.log('Error fetching garage profile from API');
    }

    try {
      const svcRes: any = await axiosClient.get('/garages/me/services');
      if (Array.isArray(svcRes?.data) && svcRes.data.length > 0) {
        const iconMap: Record<string, any> = {
          tire: Disc,
          tire_repair: Disc,
          tire_change: Disc,
          battery: Zap,
          battery_jump: Zap,
          towing: Truck,
          engine: Wrench,
          fuel: Fuel,
          unlock: Key,
          spare_tire: Disc,
          ecu_scan: Gauge,
          brakes: ShieldAlert,
          battery_replace: BatteryCharging,
        };

        const subtitleMap: Record<string, string> = {
          tire: 'Hỗ trợ tận nơi 24/7',
          battery: 'Kích bình & thay mới',
          towing: 'Xe cứu hộ chuyên dụng',
          engine: 'Tại xưởng kỹ thuật',
        };

        const mapped = svcRes.data.map((item: any) => {
          const rawCode = item.serviceCode?.toLowerCase() || '';
          const key = rawCode.includes('tire') ? 'tire'
            : rawCode.includes('battery') || rawCode.includes('kich_binh') ? 'battery'
              : rawCode.includes('tow') || rawCode.includes('keo') ? 'towing'
                : rawCode.includes('engine') || rawCode.includes('sua') ? 'engine' : 'other';

          const baseDesc = subtitleMap[key] || 'Khẩn cấp 24/7';
          const defaultSub = item.price
            ? `${Number(item.price).toLocaleString('vi-VN')}₫ • ${baseDesc}`
            : baseDesc;

          return {
            id: String(item.serviceId || item.id),
            dbId: item.serviceId || item.id,
            title: item.serviceName || 'Dịch vụ',
            subtitle: defaultSub,
            categoryName: item.categoryName || 'Dịch vụ cứu hộ',
            categoryCode: item.categoryCode,
            categoryVehicleType: item.categoryVehicleType,
            feeType: item.feeType,
            unit: item.unit,
            minPrice: item.minPrice,
            maxPrice: item.maxPrice,
            icon: iconMap[rawCode] || iconMap[key] || Wrench,
            enabled: Boolean(item.isActive),
            color: '#ea580c',
            bgColor: '#fff7ed',
            price: item.price,
            isConfigured: Boolean(item.isConfigured),
            distanceTiersJson: item.distanceTiersJson,
            nightSurgeEnabled: item.nightSurgeEnabled,
            nightSurgePercent: item.nightSurgePercent,
            holidaySurgeEnabled: item.holidaySurgeEnabled,
            holidaySurgePercent: item.holidaySurgePercent,
          };
        });
        setServices(mapped);
      }
    } catch (e) {
      console.log('Error fetching services from API');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchGarageDetails();
    }, [fetchGarageDetails])
  );

  const toggleService = async (id: string) => {
    const target = services.find((item) => item.id === id);
    if (!target) return;
    const nextState = !target.enabled;

    setServices((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: nextState } : item
      )
    );

    try {
      const res: any = await axiosClient.put(`/garages/me/services/${id}/toggle`, {
        isActive: nextState,
      });

      if (res?.data) {
        setServices((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                ...item,
                enabled: Boolean(res.data.isActive),
                price: res.data.price,
                isConfigured: Boolean(res.data.isConfigured),
              }
              : item
          )
        );
      }

      if (nextState && !target.isConfigured) {
        Alert.alert(
          'Dịch vụ đã được kích hoạt',
          `Đã kích hoạt dịch vụ "${target.title}" với mức giá sàn (${Number(target.minPrice).toLocaleString('vi-VN')} ₫). Bạn có thể bấm vào dịch vụ để điều chỉnh lại giá bất kỳ lúc nào.`
        );
      }
    } catch (e: any) {
      setServices((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, enabled: !nextState } : item
        )
      );
      const errMsg = e?.response?.data?.message || e?.message || 'Không thể cập nhật trạng thái dịch vụ.';
      Alert.alert('Không thể bật dịch vụ', errMsg);
    }
  };

  const handleBack = () => {
    router.replace('/garage-owner/settings');
  };

  const displayedServices = expanded ? services : services.slice(0, 4);

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
          <Text style={styles.headerTitle}>Hồ sơ & Dịch vụ Gara</Text>
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
              <Building2 size={22} color="#ea580c" strokeWidth={2.4} />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerGarageName} numberOfLines={1}>{garage.name}</Text>
              <Text style={styles.bannerGarageId}>Mã cơ sở: {garage.code || 'GR-0001'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Details Fields Card */}
        <View style={styles.detailsCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Tên Gara</Text>
            <Text style={styles.fieldValue}>{garage.name}</Text>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Hotline liên hệ</Text>
            <Text style={styles.fieldValue}>{garage.phone}</Text>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Địa chỉ cơ sở</Text>
            <Text style={styles.fieldValue}>{garage.address}</Text>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Phạm vi cứu hộ</Text>
            <Text style={styles.fieldValue}>
              {garage.capability === 'CAR' ? 'Cứu hộ Ô tô' : garage.capability === 'MOTORBIKE' ? 'Cứu hộ Xe máy' : 'Cứu hộ Ô tô & Xe máy'}
            </Text>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Trạng thái xét duyệt</Text>
            <Text style={[styles.fieldValue, { color: garage.status === 'APPROVED' ? '#16a34a' : '#d97706', fontWeight: '700' }]}>
              {garage.status === 'APPROVED' ? 'Đã xác thực & cấp phép' : 'Đang chờ xét duyệt'}
            </Text>
          </View>
          <View style={styles.fieldDivider} />

          {/* Dòng xem ảnh & hồ sơ chứng từ */}
          <TouchableOpacity
            style={styles.fieldRowClickable}
            activeOpacity={0.7}
            onPress={() => setShowDocsModal(true)}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.fieldLabel}>Ảnh & Chứng từ hồ sơ</Text>
              <Text style={styles.fieldValue}>
                {documents.length > 0 ? `${documents.length} tài liệu hồ sơ đã lưu` : 'Chưa có tài liệu đính kèm'}
              </Text>
            </View>
            <View style={styles.viewDocsLinkPill}>
              <Eye size={13} color="#ea580c" strokeWidth={2.2} />
              <Text style={styles.viewDocsLinkText}>Xem tất cả</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 2: Cấu hình dịch vụ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Cấu hình dịch vụ</Text>
        </View>

        {services.length === 0 ? (
          <View style={styles.emptyServicesBox}>
            <Text style={styles.emptyServicesText}>Chưa có dịch vụ nào trong cơ sở dữ liệu.</Text>
          </View>
        ) : (
          <View style={styles.servicesCard}>
            {displayedServices.map((svc, index) => {
              const IconComp = svc.icon;
              const isLast = index === displayedServices.length - 1;
              const unitLabel = svc.unit === 'KM' ? 'km' : 'lần';
              const isFloorPrice = !svc.isConfigured || svc.price === svc.minPrice;

              return (
                <React.Fragment key={svc.id}>
                  <TouchableOpacity
                    style={styles.serviceRow}
                    activeOpacity={0.7}
                    onPress={() => router.push({
                      pathname: '/garage-owner/service-pricing',
                      params: {
                        id: svc.id,
                        title: svc.title,
                        subtitle: svc.subtitle,
                        categoryName: svc.categoryName || 'Dịch vụ cứu hộ',
                        categoryCode: svc.categoryCode || '',
                        categoryVehicleType: svc.categoryVehicleType || 'BOTH',
                        minPrice: String(svc.minPrice || 0),
                        maxPrice: String(svc.maxPrice || 0),
                        price: String(svc.price || svc.minPrice || 0),
                        isActive: String(Boolean(svc.enabled)),
                        isConfigured: String(Boolean(svc.isConfigured)),
                        feeType: svc.feeType || '',
                        unit: svc.unit || '',
                      }
                    })}
                  >
                    <View style={[styles.serviceIconBox, { backgroundColor: svc.bgColor || '#fff7ed' }]}>
                      <IconComp size={20} color="#ea580c" strokeWidth={2.2} />
                    </View>

                    <View style={styles.serviceTextWrap}>
                      <View style={styles.serviceTitleRow}>
                        <Text style={styles.serviceTitle} numberOfLines={1}>{svc.title}</Text>
                        {svc.enabled ? (
                          isFloorPrice ? (
                            <View style={styles.floorBadge}>
                              <Text style={styles.floorBadgeText}>Giá sàn</Text>
                            </View>
                          ) : (
                            <View style={styles.activeBadge}>
                              <Text style={styles.activeBadgeText}>✓ Đang bật</Text>
                            </View>
                          )
                        ) : (
                          <View style={styles.inactiveBadge}>
                            <Text style={styles.inactiveBadgeText}>Đang tắt</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.servicePriceRow}>
                        <Text style={styles.servicePriceMain}>
                          {Number(svc.price || svc.minPrice || 0).toLocaleString('vi-VN')} ₫/{unitLabel}
                        </Text>
                      </View>

                      <Text style={styles.serviceBandText}>
                        Khung: {Number(svc.minPrice || 0).toLocaleString('vi-VN')} ₫ – {Number(svc.maxPrice || 0).toLocaleString('vi-VN')} ₫
                      </Text>
                    </View>

                    <View style={styles.serviceActionWrap}>
                      <TouchableOpacity
                        onPress={() => router.push({
                          pathname: '/garage-owner/service-pricing',
                          params: {
                            id: svc.id,
                            title: svc.title,
                            subtitle: svc.subtitle,
                            categoryName: svc.categoryName || 'Dịch vụ cứu hộ',
                            categoryCode: svc.categoryCode || '',
                            categoryVehicleType: svc.categoryVehicleType || 'BOTH',
                            minPrice: String(svc.minPrice || 0),
                            maxPrice: String(svc.maxPrice || 0),
                            price: String(svc.price || svc.minPrice || 0),
                            isActive: String(Boolean(svc.enabled)),
                            isConfigured: String(Boolean(svc.isConfigured)),
                            feeType: svc.feeType || '',
                            unit: svc.unit || '',
                          }
                        })}
                        style={styles.pencilBtn}
                        activeOpacity={0.7}
                      >
                        <Pencil size={16} color="#94a3b8" />
                      </TouchableOpacity>

                      <Switch
                        value={svc.enabled}
                        onValueChange={() => toggleService(svc.id)}
                        trackColor={{ false: '#e2e8f0', true: '#fdba74' }}
                        thumbColor={svc.enabled ? '#ea580c' : '#ffffff'}
                      />
                    </View>
                  </TouchableOpacity>
                  {!isLast && <View style={styles.fieldDivider} />}
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* Nút Xem thêm / Thu gọn danh sách dịch vụ */}
        {services.length > 4 && (
          <View style={styles.moreBtnWrapper}>
            <TouchableOpacity
              style={styles.moreConfigBtn}
              activeOpacity={0.8}
              onPress={() => setExpanded(!expanded)}
            >
              <Text style={styles.moreConfigBtnText}>
                {expanded ? 'Thu gọn' : `Xem thêm (${services.length} dịch vụ)`}
              </Text>
              {expanded ? (
                <ChevronUp size={16} color="#ea580c" strokeWidth={2.4} />
              ) : (
                <ChevronDown size={16} color="#ea580c" strokeWidth={2.4} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Section 3: Đánh giá từ khách hàng */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Đánh giá từ khách hàng</Text>
          {ratings.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#b45309' }}>
                {(ratings.reduce((acc, r) => acc + (r.stars || 5), 0) / ratings.length).toFixed(1)}
              </Text>
              <Text style={{ fontSize: 12, color: '#94a3b8' }}>({ratings.length})</Text>
            </View>
          )}
        </View>

        {ratings.length === 0 ? (
          <View style={styles.emptyServicesBox}>
            <Star size={24} color="#cbd5e1" />
            <Text style={[styles.emptyServicesText, { marginTop: 6 }]}>Chưa có lượt đánh giá nào từ khách hàng.</Text>
          </View>
        ) : (
          <View style={[styles.detailsCard, { paddingVertical: 10, gap: 12 }]}>
            {ratings.map((r, rIdx) => (
              <View key={r.id || rIdx}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0f172a' }}>
                      {r.raterName || 'Khách hàng'}
                    </Text>
                    {r.staffName && (
                      <Text style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                        Thợ: <Text style={{ fontWeight: '600', color: '#334155' }}>{r.staffName}</Text>
                      </Text>
                    )}
                    {r.requestCode && (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#ea580c', marginTop: 1 }}>
                        #{r.requestCode}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748b', marginRight: 4 }}>Gara:</Text>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          color={s <= r.stars ? '#f59e0b' : '#cbd5e1'}
                          fill={s <= r.stars ? '#f59e0b' : 'none'}
                        />
                      ))}
                    </View>
                    {r.staffName && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284c7', marginRight: 4 }}>Thợ:</Text>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            color={s <= (r.staffStars || r.stars) ? '#f59e0b' : '#cbd5e1'}
                            fill={s <= (r.staffStars || r.stars) ? '#f59e0b' : 'none'}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Gara comment */}
                {r.comment ? (
                  <View style={{ backgroundColor: '#fff7ed', padding: 8, borderRadius: 8, marginTop: 6 }}>
                    <Text style={{ fontSize: 12, color: '#9a3412', lineHeight: 17 }}>
                      <Text style={{ fontWeight: '700' }}>Gara: </Text>"{r.comment}"
                    </Text>
                  </View>
                ) : null}

                {/* Staff comment */}
                {r.staffComment && r.staffName ? (
                  <View style={{ backgroundColor: '#f0f9ff', padding: 8, borderRadius: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#0369a1', lineHeight: 17 }}>
                      <Text style={{ fontWeight: '700' }}>Thợ ({r.staffName}): </Text>"{r.staffComment}"
                    </Text>
                  </View>
                ) : null}

                <Text style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 4 }}>
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>

                {rIdx < ratings.length - 1 && <View style={styles.fieldDivider} />}
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* MODAL XEM TẤT CẢ ẢNH HỒ SƠ */}
      <Modal
        visible={showDocsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDocsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowDocsModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />

            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <Images size={20} color="#ea580c" strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Hồ sơ & Chứng từ Gara</Text>
                  <Text style={styles.modalSubtitle}>
                    {documents.length} tài liệu pháp lý & hình ảnh cơ sở
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowDocsModal(false)}
                activeOpacity={0.7}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Danh sách ảnh hồ sơ */}
            <ScrollView
              contentContainerStyle={styles.docsListContainer}
              showsVerticalScrollIndicator={false}
            >
              {documents.length === 0 ? (
                <View style={styles.docsEmptyWrap}>
                  <Images size={42} color="#cbd5e1" strokeWidth={1.5} />
                  <Text style={styles.docsEmptyTitle}>Chưa có ảnh hồ sơ</Text>
                  <Text style={styles.docsEmptySubtitle}>
                    Gara chưa tải lên giấy tờ hoặc hình ảnh pháp lý nào trong hệ thống.
                  </Text>
                </View>
              ) : (
                documents.map((doc, idx) => {
                  const docTitle = getDocTitle(doc.docType, doc.note);
                  const fullUrl = doc.fileUrl ? resolveFileUrl(doc.fileUrl) : '';
                  return (
                    <View key={doc.id || idx} style={styles.docCard}>
                      <View style={styles.docCardHeader}>
                        <View style={styles.docBadge}>
                          <FileText size={14} color="#ea580c" strokeWidth={2.2} />
                          <Text style={styles.docBadgeText}>{docTitle}</Text>
                        </View>
                        <View style={styles.verifiedTag}>
                          <CheckCircle2 size={12} color="#16a34a" />
                          <Text style={styles.verifiedTagText}>Đã xác minh</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.docImageWrap}
                        onPress={() => {
                          if (fullUrl) {
                            setSelectedImage({ url: fullUrl, title: docTitle });
                          }
                        }}
                      >
                        {fullUrl ? (
                          <Image
                            source={{ uri: fullUrl }}
                            style={styles.docImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.docImageFallback}>
                            <Images size={32} color="#94a3b8" />
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

        {/* FULL SCREEN IMAGE VIEWER OVERLAY (Nằm ngay bên trong Modal để không bị lỗi 2 native Modal của React Native) */}
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
    gap: 12,
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
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.06)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  bannerInfoBox: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffedd5',
  },
  bannerTextWrap: {
    gap: 1,
  },
  bannerGarageName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  bannerGarageId: {
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
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
  fieldRow: {
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
  servicesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
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
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  serviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTextWrap: {
    flex: 1,
    gap: 2,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  serviceTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  servicePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  servicePriceMain: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  serviceBandText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  activeBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  floorBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  floorBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c2410c',
  },
  inactiveBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  serviceSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  serviceActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pencilBtn: {
    padding: 6,
  },
  moreBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  moreConfigBtn: {
    backgroundColor: '#fff7ed',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  moreConfigBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  emptyServicesBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyServicesText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
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
  viewDocsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  viewDocsLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  // Modal Sheet Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  modalDragHandle: {
    width: 38,
    height: 4.5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docsListContainer: {
    padding: 18,
    gap: 16,
  },
  docsEmptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  docsEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  docsEmptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 260,
  },
  docCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docBadgeText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  docImageWrap: {
    position: 'relative',
    height: 170,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  docImage: {
    width: '100%',
    height: '100%',
  },
  docImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
  },
  docImageFallbackText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  docZoomOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 14,
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
  // Full screen Modal
  fullScreenBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
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
    zIndex: 10,
  },
  fullScreenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  fullScreenCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  fullScreenImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

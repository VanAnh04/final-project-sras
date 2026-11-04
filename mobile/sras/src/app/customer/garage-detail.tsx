import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Star,
  MapPin,
  Clock,
  Banknote,
  Phone,
  ShieldCheck,
  AlertCircle,
  Zap,
  CheckCircle2,
  Wrench,
  Truck,
  Users,
  Award,
  Calendar,
  Sparkles,
  UserCheck,
  ThumbsUp,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
} from 'lucide-react-native';
import {
  garageApi,
  GaragePublicProfileDto,
  GarageRatingDto,
  GarageServiceItemDto,
} from '../../api/garageApi';
import { rescueApi, VehicleType } from '../../api/rescueApi';
import { resolveGarageCover } from '../../utils/garageMedia';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BRAND = '#ea580c';
const BRAND_DEEP = '#c2410c';
const INK = '#1c1917';
const SUB = '#78716c';
const LINE = '#e7e5e4';
const CARD = '#ffffff';
const BG = '#f7f7f5';
const SUCCESS = '#16a34a';
const SUCCESS_BG = '#f0fdf4';
const WARNING = '#d97706';
const WARNING_BG = '#fffbeb';
const BLUE = '#2563eb';
const BLUE_BG = '#eff6ff';

type TabKey = 'SERVICES' | 'REVIEWS' | 'FACILITY';
type ReviewScope = 'ALL' | 'GARAGE' | 'STAFF';


export default function GarageDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    garageId?: string;
    lat?: string;
    lng?: string;
    address?: string;
    vehicleType?: string;
    symptom?: string;
    issueType?: string;
    contactPhone?: string;
    paymentMethod?: string;
    customerVehicleId?: string;
    photoUrls?: string;
    garagePhone?: string;
    garageName?: string;
    garageAddress?: string;
    distanceKm?: string;
    estimatedRescueFee?: string;
    estimatedEtaMin?: string;
    avgRating?: string;
    ratingCount?: string;
    coverImageUrl?: string;
    availabilityStatus?: string;
    available?: string;
    activeRescueVehicleCount?: string;
    totalOrders?: string;
    score?: string;
    badges?: string;
  }>();

  const garageId = params.garageId ? parseInt(params.garageId, 10) : NaN;
  const lat = params.lat ? parseFloat(params.lat) : NaN;
  const lng = params.lng ? parseFloat(params.lng) : NaN;
  const vehicleType = (params.vehicleType as VehicleType) || 'MOTORBIKE';

  const passedBadges = useMemo<string[]>(() => {
    if (!params.badges) return [];
    try {
      const parsed = JSON.parse(params.badges);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [params.badges]);

  // Khởi tạo ngay lập tức từ dữ liệu truyền sang (Optimistic / Instant hydration) để màn hình mở 0ms không phải chờ
  const initialProfile = useMemo<GaragePublicProfileDto | null>(() => {
    if (!params.garageName) return null;
    return {
      id: garageId,
      name: String(params.garageName),
      phone: String(params.garagePhone || ''),
      address: String(params.garageAddress || ''),
      lat: !Number.isNaN(lat) ? lat : 0,
      lng: !Number.isNaN(lng) ? lng : 0,
      capability: 'BOTH',
      isOnline: true,
      autoAccept: false,
      available: params.available !== '0',
      availabilityStatus: (params.availabilityStatus as any) || 'READY',
      avgRating: params.avgRating ? parseFloat(String(params.avgRating)) : 5.0,
      ratingCount: params.ratingCount ? parseInt(String(params.ratingCount), 10) : 0,
      totalOrders: params.totalOrders ? parseInt(String(params.totalOrders), 10) : 0,
      score: params.score ? parseFloat(String(params.score)) : undefined,
      distanceKm: params.distanceKm ? parseFloat(String(params.distanceKm)) : undefined,
      estimatedEtaMin: params.estimatedEtaMin ? parseInt(String(params.estimatedEtaMin), 10) : undefined,
      estimatedRescueFee: params.estimatedRescueFee ? parseInt(String(params.estimatedRescueFee), 10) : undefined,
      badges: Array.from(new Set(['VERIFIED', ...passedBadges])),
      coverImageUrl: String(params.coverImageUrl || ''),
      photos: params.coverImageUrl ? [String(params.coverImageUrl)] : [],
      services: [],
      specialties: [],
      totalStaff: 5,
      activeStaff: 3,
      rescueVehicleCount: 3,
      activeRescueVehicleCount: params.activeRescueVehicleCount ? parseInt(String(params.activeRescueVehicleCount), 10) : 2,
    };
  }, [params, garageId, lat, lng, passedBadges]);

  const [profile, setProfile] = useState<GaragePublicProfileDto | null>(initialProfile);
  const [loading, setLoading] = useState(!initialProfile);
  const [activeTab, setActiveTab] = useState<TabKey>('SERVICES');
  const [submitting, setSubmitting] = useState(false);

  // Đánh giá
  const [ratings, setRatings] = useState<GarageRatingDto[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);
  const [reviewScope, setReviewScope] = useState<ReviewScope>('ALL');

  // Tìm kiếm dịch vụ & Quản lý đóng/mở danh mục dạng Accordion
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<{ [cat: string]: boolean }>({});

  const toggleCategory = (catName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  // Nhóm các dịch vụ theo danh mục, hỗ trợ tìm kiếm theo tên dịch vụ hoặc tên danh mục
  const groupedServices = useMemo<{ categoryName: string; items: GarageServiceItemDto[]; totalInCategory: number }[]>(() => {
    if (!profile?.services || profile.services.length === 0) return [];
    const query = searchQuery.trim().toLowerCase();

    const fullGroups: { [cat: string]: GarageServiceItemDto[] } = {};
    for (const s of profile.services) {
      const cat = s.categoryName ? s.categoryName.trim() : 'Dịch vụ khác';
      if (!fullGroups[cat]) fullGroups[cat] = [];
      fullGroups[cat].push(s);
    }

    return Object.entries(fullGroups)
      .map(([categoryName, allItems]) => {
        const filteredItems = !query
          ? allItems
          : allItems.filter((s) => {
              const sName = (s.serviceName || '').toLowerCase();
              const cName = categoryName.toLowerCase();
              return sName.includes(query) || cName.includes(query);
            });

        return {
          categoryName,
          items: filteredItems,
          totalInCategory: allItems.length,
        };
      })
      .filter((group) => {
        if (query) {
          return group.items.length > 0;
        }
        return true;
      });
  }, [profile?.services, searchQuery]);

  // Tự động mở rộng danh mục khi người dùng đang nhập từ khóa tìm kiếm
  const isCategoryExpanded = (catName: string) => {
    if (searchQuery.trim().length > 0) {
      return true;
    }
    return !!expandedCategories[catName];
  };

  // Kiểm tra xem tất cả danh mục hiện có đã mở hay chưa
  const allExpanded = useMemo(() => {
    if (groupedServices.length === 0) return false;
    return groupedServices.every((g) => expandedCategories[g.categoryName]);
  }, [groupedServices, expandedCategories]);

  const toggleAllCategories = () => {
    const nextState = !allExpanded;
    const nextMap: { [cat: string]: boolean } = {};
    for (const g of groupedServices) {
      nextMap[g.categoryName] = nextState;
    }
    setExpandedCategories(nextMap);
  };

  const parsedPhotoUrls = useMemo<string[]>(() => {
    if (!params.photoUrls) return [];
    try {
      return JSON.parse(params.photoUrls);
    } catch {
      return [];
    }
  }, [params.photoUrls]);

  // Ngay khi đổi sang Gara khác (Gara A -> Gara B): lập tức xóa cache Gara cũ, cập nhật sang Gara mới ngay 0ms
  useEffect(() => {
    setProfile(initialProfile);
    setLoading(true);
    setRatings([]);
    setActiveTab('SERVICES');
    setSelectedStarFilter(null);
    setSearchQuery('');
    setExpandedCategories({});
  }, [garageId, params.garageName]);

  useEffect(() => {
    if (Number.isNaN(garageId)) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin Gara');
      router.back();
      return;
    }

    let isCurrent = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await garageApi.getPublicProfile(
          garageId,
          !Number.isNaN(lat) ? lat : undefined,
          !Number.isNaN(lng) ? lng : undefined,
          vehicleType
        );
        if (isCurrent) {
          const combinedBadges = Array.from(new Set([...(data.badges || []), ...passedBadges]));
          setProfile({
            ...data,
            badges: combinedBadges,
          });
        }
      } catch (err: any) {
        if (isCurrent && !initialProfile) {
          Alert.alert('Không thể tải thông tin Gara', err?.message || 'Vui lòng thử lại sau.');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCurrent = false;
    };
  }, [garageId, lat, lng, vehicleType]);

  // Tải danh sách đánh giá thật từ hệ thống khi chuyển qua tab REVIEWS
  useEffect(() => {
    if (activeTab === 'REVIEWS' && !Number.isNaN(garageId)) {
      const loadReviews = async () => {
        try {
          setRatingsLoading(true);
          const res = await garageApi.getGarageRatings(garageId, 0, 50);
          setRatings(res.content || []);
        } catch (err) {
          console.warn('Lỗi tải đánh giá thật:', err);
          setRatings([]);
        } finally {
          setRatingsLoading(false);
        }
      };
      loadReviews();
    }
  }, [activeTab, garageId]);

  // Số xe cứu hộ rảnh sẵn sàng phục vụ
  const readyVehicleCount = useMemo(() => {
    if (profile?.activeRescueVehicleCount != null) {
      return profile.activeRescueVehicleCount;
    }
    const total = profile?.rescueVehicleCount || 0;
    if (profile?.availabilityStatus === 'NO_VEHICLE') {
      return 0;
    }
    if (profile?.available) {
      return total > 0 ? total : 1;
    }
    return Math.max(0, total - 1);
  }, [
    profile?.activeRescueVehicleCount,
    profile?.available,
    profile?.availabilityStatus,
    profile?.rescueVehicleCount,
  ]);


  // Danh sách đánh giá thật sau khi áp dụng bộ lọc sao và phạm vi
  const filteredRatings = useMemo(() => {
    return ratings.filter((r) => {
      // Lọc theo sao
      if (selectedStarFilter !== null) {
        const targetStars = reviewScope === 'STAFF' ? (r.staffStars || r.stars) : r.stars;
        if (targetStars !== selectedStarFilter) return false;
      }
      // Lọc theo phạm vi (Đánh giá thợ phải có tên thợ hoặc nhận xét thợ)
      if (reviewScope === 'STAFF') {
        return !!(r.staffName || r.staffComment || r.staffStars);
      }
      return true;
    });
  }, [ratings, selectedStarFilter, reviewScope]);

  // Điểm trung bình Thợ tính từ các đánh giá thật
  const staffAvgRating = useMemo(() => {
    const list = ratings.filter((r) => r.staffStars != null);
    if (list.length === 0) return null;
    const total = list.reduce((sum, r) => sum + (r.staffStars || 5), 0);
    return Math.round((total / list.length) * 10) / 10;
  }, [ratings]);

  const garagePhone = (profile?.phone || params.garagePhone || '').trim();

  const handleCallHotline = () => {
    if (!garagePhone) {
      Alert.alert(
        'Chưa có số liên hệ',
        `${profile?.name || 'Gara này'} hiện chưa cập nhật số điện thoại Hotline liên hệ.`
      );
      return;
    }
    Linking.openURL(`tel:${garagePhone}`).catch(() => {
      Alert.alert('Không thể thực hiện cuộc gọi', `Không thể quay số tới: ${garagePhone}`);
    });
  };

  const handleSelectAndOrder = () => {
    if (!profile || submitting) return;

    const feeText = profile.estimatedRescueFee
      ? `${profile.estimatedRescueFee.toLocaleString('vi-VN')} đ`
      : 'Theo biểu phí chuẩn';

    if (!profile.available) {
      const reason =
        profile.availabilityStatus === 'NO_STAFF'
          ? 'hiện đang hết thợ kỹ thuật viên rảnh lúc này'
          : profile.availabilityStatus === 'NO_VEHICLE'
            ? 'hiện đang hết xe cứu hộ rảnh phù hợp lúc này'
            : 'hiện đang bận phục vụ';

      Alert.alert(
        'Gara đang bận phục vụ',
        `${profile.name} ${reason}.\n\nThời gian tiếp nhận có thể lâu hơn hoặc gara có thể từ chối ca này. Bạn vẫn muốn gửi yêu cầu tới gara?`,
        [
          { text: 'Chọn Gara khác', style: 'cancel' },
          {
            text: 'Vẫn gửi yêu cầu',
            onPress: executeBooking,
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Gửi yêu cầu tới Gara?',
      `Bạn đang chọn ${profile.name}.\nGara sẽ có 90 giây để phản hồi tiếp nhận.\n\nPhí di chuyển, kiểm tra xe: ${feeText}`,
      [
        { text: 'Suy nghĩ lại', style: 'cancel' },
        {
          text: 'Xác nhận gửi',
          onPress: executeBooking,
        },
      ]
    );
  };

  const executeBooking = async () => {
    if (!profile) return;
    try {
      setSubmitting(true);
      const res = await rescueApi.create({
        vehicleType,
        symptom: params.symptom || 'Cần cứu hộ xe',
        pickupLat: lat,
        pickupLng: lng,
        pickupAddress: params.address || undefined,
        issueType: params.issueType || undefined,
        contactPhone: params.contactPhone || undefined,
        paymentMethod: (params.paymentMethod as any) || 'CASH',
        customerVehicleId: params.customerVehicleId ? parseInt(params.customerVehicleId, 10) : undefined,
        photoUrls: parsedPhotoUrls,
        garageId: profile.id,
      });

      router.replace({
        pathname: '/customer/rescue-tracking',
        params: { id: String(res.id) },
      } as any);
    } catch (e: any) {
      Alert.alert('Không thể gửi yêu cầu', e?.response?.data?.message || e?.message || 'Thử lại sau');
    } finally {
      setSubmitting(false);
    }
  };

  // Chỉ chặn toàn màn hình khi HOÀN TOÀN CHƯA CÓ profile (tránh hiện tượng xoay vòng mấy giây gây khó chịu)
  if (loading && !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>Đang tải hồ sơ Gara...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={40} color={SUB} />
        <Text style={styles.errorText}>Không tìm thấy thông tin Gara này</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAvail = profile.available;
  const badges = profile.badges || [];
  const coverImageUri = resolveGarageCover(profile.coverImageUrl, profile.id, profile.capability);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
            disabled={submitting}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={INK} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Hồ sơ chi tiết Gara
          </Text>
          <TouchableOpacity
            style={styles.phoneHeaderBtn}
            onPress={handleCallHotline}
            activeOpacity={0.7}
          >
            <Phone size={18} color={BRAND} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Cover / Gallery */}
        <View style={styles.heroBanner}>
          <Image
            source={{ uri: coverImageUri }}
            style={styles.coverImage}
            resizeMode="cover"
          />

          {/* Lớp gradient tối chân ảnh làm nổi bật thông tin */}
          <View style={styles.heroGradientOverlay} />

          {/* Overlay trạng thái trực tuyến */}
          <View style={styles.statusFloatBadge}>
            {!profile.isOnline ? (
              <View style={[styles.statusPill, styles.pillOffline]}>
                <View style={[styles.statusDot, styles.dotOffline]} />
                <Text style={styles.textOffline}>Tạm đóng cửa</Text>
              </View>
            ) : profile.availabilityStatus === 'NO_STAFF' ? (
              <View style={[styles.statusPill, styles.pillNoStaff]}>
                <AlertCircle size={12} color="#d97706" strokeWidth={2.4} />
                <Text style={styles.textNoStaff}>Hết thợ</Text>
              </View>
            ) : profile.availabilityStatus === 'NO_VEHICLE' ? (
              <View style={[styles.statusPill, styles.pillNoVehicle]}>
                <Truck size={12} color="#c2410c" strokeWidth={2.4} />
                <Text style={styles.textNoVehicle}>Hết xe cứu hộ</Text>
              </View>
            ) : isAvail ? (
              <View style={[styles.statusPill, styles.pillAvail]}>
                <View style={[styles.statusDot, styles.dotAvail]} />
                <Text style={[styles.statusPillText, styles.textAvail]}>
                  Sẵn sàng (thợ & xe rảnh)
                </Text>
              </View>
            ) : (
              <View style={[styles.statusPill, styles.pillBusy]}>
                <View style={[styles.statusDot, styles.dotBusy]} />
                <Text style={[styles.statusPillText, styles.textBusy]}>
                  Tạm bận
                </Text>
              </View>
            )}
          </View>

          {/* Tag loại phương tiện hỗ trợ */}
          <View style={styles.capabilityBadgeOnCover}>
            <Text style={styles.capabilityBadgeText}>
              {profile.capability === 'BOTH'
                ? '🚗 🏍️ Cứu hộ Ô tô & Xe máy'
                : profile.capability === 'CAR'
                  ? '🚗 Chuyên Cứu hộ Ô tô'
                  : '🏍️ Chuyên Cứu hộ Xe máy'}
            </Text>
          </View>
        </View>

        {/* Thông tin chính Gara */}
        <View style={styles.mainInfoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.garageName}>{profile.name}</Text>
          </View>

          {/* Dòng địa chỉ */}
          <View style={styles.addressRow}>
            <MapPin size={16} color={BRAND} strokeWidth={2.2} style={{ marginTop: 2 }} />
            <Text style={styles.addressText}>{profile.address}</Text>
          </View>

          {/* Danh sách Badges nổi bật tạo sự khác biệt */}
          <View style={styles.badgesWrapper}>
            {profile.score != null && (
              <View style={styles.scoreBadgeDetail}>
                <Sparkles size={13} color="#c2410c" strokeWidth={2.4} />
                <Text style={styles.scoreBadgeDetailText}>Điểm đề xuất: {Math.round(profile.score)}/100</Text>
              </View>
            )}

            {badges.includes('TOP_RATED') && (
              <View style={styles.topRatedBadge}>
                <Star size={13} color="#eab308" fill="#eab308" />
                <Text style={styles.topRatedText}>Đánh giá xuất sắc</Text>
              </View>
            )}

            {badges.includes('FASTEST') && (
              <View style={styles.fastestBadge}>
                <Zap size={13} color={BLUE} strokeWidth={2.4} />
                <Text style={styles.fastestText}>Gần nhất</Text>
              </View>
            )}

            {badges.includes('BEST_PRICE') && (
              <View style={styles.bestPriceBadge}>
                <Sparkles size={13} color="#059669" strokeWidth={2.4} />
                <Text style={styles.bestPriceText}>Giá tốt</Text>
              </View>
            )}
          </View>

          {/* 4 Chỉ số nhanh (KPIs) - Gọn gàng, vừa vặn màn hình */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Star size={13} color="#eab308" fill="#eab308" />
                <Text style={styles.kpiValue} numberOfLines={1}>
                  {profile.avgRating ? profile.avgRating.toFixed(1) : '5.0'}
                </Text>
              </View>
              <Text style={styles.kpiLabel} numberOfLines={1}>
                {profile.ratingCount ? `${profile.ratingCount} đánh giá` : 'Đánh giá'}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <MapPin size={13} color={BRAND} strokeWidth={2.2} />
                <Text style={styles.kpiValue} numberOfLines={1}>
                  {profile.distanceKm != null ? `${profile.distanceKm} km` : '--'}
                </Text>
              </View>
              <Text style={styles.kpiLabel} numberOfLines={1}>Khoảng cách</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Clock size={13} color={BLUE} strokeWidth={2.2} />
                <Text style={styles.kpiValue} numberOfLines={1}>
                  {profile.estimatedEtaMin != null ? `~${profile.estimatedEtaMin}'` : '--'}
                </Text>
              </View>
              <Text style={styles.kpiLabel} numberOfLines={1}>Thời gian tới</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Award size={13} color={SUCCESS} strokeWidth={2.2} />
                <Text style={styles.kpiValue} numberOfLines={1}>{profile.totalOrders || 0}</Text>
              </View>
              <Text style={styles.kpiLabel} numberOfLines={1}>Ca cứu hộ</Text>
            </View>
          </View>
        </View>

        {/* Thanh chuyển Tabs dạng Segmented Pills hiện đại */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsTrack}>
            <TouchableOpacity
              style={[styles.tabSegment, activeTab === 'SERVICES' && styles.tabSegmentActive]}
              onPress={() => setActiveTab('SERVICES')}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.tabSegmentText, activeTab === 'SERVICES' && styles.tabSegmentTextActive]}
                numberOfLines={1}
              >
                Bảng giá
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabSegment, activeTab === 'REVIEWS' && styles.tabSegmentActive]}
              onPress={() => setActiveTab('REVIEWS')}
              activeOpacity={0.8}
            >
              <View style={styles.tabBadgeRow}>
                <Text
                  style={[styles.tabSegmentText, activeTab === 'REVIEWS' && styles.tabSegmentTextActive]}
                  numberOfLines={1}
                >
                  Đánh giá
                </Text>
                {(profile.ratingCount || ratings.length) > 0 ? (
                  <View
                    style={[
                      styles.countBadge,
                      activeTab === 'REVIEWS' ? styles.countBadgeActive : styles.countBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        activeTab === 'REVIEWS' ? styles.countBadgeTextActive : styles.countBadgeTextInactive,
                      ]}
                    >
                      {profile.ratingCount || ratings.length}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabSegment, activeTab === 'FACILITY' && styles.tabSegmentActive]}
              onPress={() => setActiveTab('FACILITY')}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.tabSegmentText, activeTab === 'FACILITY' && styles.tabSegmentTextActive]}
                numberOfLines={1}
              >
                Cơ sở vật chất
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* NỘI DUNG TỪNG TAB */}
        <View style={styles.tabContentArea}>
          {/* TAB 1: BẢNG GIÁ DỊCH VỤ */}
          {activeTab === 'SERVICES' && (
            <View>
              {/* Box ước tính cứu hộ */}
              <View style={styles.feeEstimateCard}>
                <View style={styles.feeEstimateTop}>
                  <View style={styles.feeEstimateIcon}>
                    <Banknote size={20} color={BRAND} strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feeEstimateTitle}>Phí di chuyển, kiểm tra xe</Text>
                    <Text style={styles.feeEstimateSub}>
                      Tính theo khoảng cách đường bộ thực tế ({profile.distanceKm || 0} km)
                    </Text>
                  </View>
                  <Text style={styles.feeEstimateAmount}>
                    {profile.estimatedRescueFee
                      ? `${profile.estimatedRescueFee.toLocaleString('vi-VN')} đ`
                      : 'Chuẩn quy định'}
                  </Text>
                </View>
                <View style={styles.feeCommitmentRow}>
                  <ShieldCheck size={14} color={SUCCESS} strokeWidth={2.2} />
                  <Text style={styles.feeCommitmentText}>
                    Cam kết minh bạch giá, không tự ý nâng phụ phí bất hợp lý.
                  </Text>
                </View>
              </View>

              {/* Thanh tìm kiếm dịch vụ & danh mục thiết kế hiện đại */}
              <View style={styles.searchBarContainer}>
                <View style={styles.searchBarInner}>
                  <Search size={18} color={BRAND} strokeWidth={2.4} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm dịch vụ, phụ tùng, danh mục..."
                    placeholderTextColor="#a8a29e"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    clearButtonMode="never"
                    autoCorrect={false}
                  />
                  {searchQuery.trim().length > 0 && (
                    <TouchableOpacity
                      style={styles.clearSearchBtn}
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <X size={14} color="#78716c" strokeWidth={2.5} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Header tiêu đề danh mục & nút Mở tất cả / Thu gọn */}
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeading}>Danh mục dịch vụ & Bảng giá</Text>
                  <Text style={styles.sectionHeadingSub}>
                    {searchQuery.trim()
                      ? `Tìm thấy ${groupedServices.reduce((sum, g) => sum + g.items.length, 0)} dịch vụ phù hợp`
                      : `${groupedServices.length} danh mục • ${profile.services?.length || 0} dịch vụ niêm yết`}
                  </Text>
                </View>

                {!searchQuery.trim() && groupedServices.length > 0 && (
                  <TouchableOpacity
                    style={styles.toggleAllBtn}
                    onPress={toggleAllCategories}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.toggleAllBtnText}>
                      {allExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Danh sách danh mục dạng Accordion */}
              {loading && (!profile.services || profile.services.length === 0) ? (
                <View style={styles.loadingBoxSub}>
                  <ActivityIndicator size="small" color={BRAND} />
                  <Text style={styles.subLoadingText}>Đang nạp bảng giá chi tiết...</Text>
                </View>
              ) : groupedServices.length > 0 ? (
                groupedServices.map((group) => {
                  const expanded = isCategoryExpanded(group.categoryName);
                  return (
                    <View key={group.categoryName} style={styles.categoryAccordionCard}>
                      {/* Tiêu đề danh mục có thể nhấn để mở ra hoặc thu gọn */}
                      <TouchableOpacity
                        style={[
                          styles.accordionHeader,
                          expanded && styles.accordionHeaderExpanded,
                        ]}
                        onPress={() => toggleCategory(group.categoryName)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.accordionHeaderLeft}>
                          <View
                            style={[
                              styles.categoryIconBadge,
                              expanded && styles.categoryIconBadgeActive,
                            ]}
                          >
                            <Layers
                              size={16}
                              color={expanded ? BRAND : '#78716c'}
                              strokeWidth={2.2}
                            />
                          </View>
                          <View style={styles.accordionTitleCol}>
                            <Text style={styles.accordionTitle} numberOfLines={1}>
                              {group.categoryName}
                            </Text>
                            <Text style={styles.accordionSub}>
                              {group.items.length} dịch vụ{' '}
                              {expanded ? '• Nhấn để thu gọn' : '• Nhấn để xem bảng giá'}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.chevronBubble,
                            expanded && styles.chevronBubbleExpanded,
                          ]}
                        >
                          {expanded ? (
                            <ChevronUp size={18} color={BRAND} strokeWidth={2.5} />
                          ) : (
                            <ChevronDown size={18} color="#78716c" strokeWidth={2.5} />
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* Danh sách các dịch vụ bên trong khi được mở ra */}
                      {expanded && (
                        <View style={styles.accordionBody}>
                          {group.items.map((item, idx) => (
                            <View
                              key={item.serviceId || idx}
                              style={[
                                styles.serviceRow,
                                idx < group.items.length - 1 && styles.serviceRowDivider,
                              ]}
                            >
                              <View style={styles.serviceItemLeft}>
                                <Text style={styles.serviceItemName}>{item.serviceName}</Text>
                                {item.unit ? (
                                  <Text style={styles.unitText}>Đơn vị tính: {item.unit}</Text>
                                ) : null}
                              </View>

                              <View style={styles.serviceItemRight}>
                                {item.price ? (
                                  <Text style={styles.servicePriceMain}>
                                    {item.price.toLocaleString('vi-VN')} đ
                                  </Text>
                                ) : item.minPrice && item.maxPrice ? (
                                  <Text style={styles.servicePriceMain}>
                                    {item.minPrice.toLocaleString('vi-VN')} -{' '}
                                    {item.maxPrice.toLocaleString('vi-VN')} đ
                                  </Text>
                                ) : (
                                  <Text style={styles.servicePriceQuote}>Báo giá theo ca</Text>
                                )}
                                {item.isActive ? (
                                  <View style={styles.serviceActiveTag}>
                                    <CheckCircle2 size={11} color={SUCCESS} strokeWidth={2.4} />
                                    <Text style={styles.serviceActiveText}>Sẵn sàng</Text>
                                  </View>
                                ) : (
                                  <Text style={styles.serviceInactiveText}>Tạm dừng</Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyNotice}>
                  <Text style={styles.emptyNoticeText}>
                    {searchQuery.trim()
                      ? `Không tìm thấy dịch vụ nào phù hợp với từ khóa "${searchQuery}".`
                      : 'Gara áp dụng theo biểu phí cứu hộ chuẩn chung của hệ thống.'}
                  </Text>
                  {searchQuery.trim().length > 0 && (
                    <TouchableOpacity
                      style={styles.clearSearchNoticeBtn}
                      onPress={() => setSearchQuery('')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.clearSearchNoticeBtnText}>Xóa bộ lọc tìm kiếm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* TAB 2: ĐÁNH GIÁ CẢ GARA VÀ THỢ */}
          {activeTab === 'REVIEWS' && (
            <View>
              {/* Thẻ tổng quan điểm số 2 chiều: Gara & Kỹ thuật viên */}
              <View style={styles.ratingOverviewCard}>
                <View style={styles.dualScoreRow}>
                  {/* Cột 1: Điểm Gara */}
                  <View style={styles.scoreCol}>
                    <View style={styles.scoreColHeader}>
                      <Wrench size={14} color={BRAND} strokeWidth={2.2} />
                      <Text style={styles.scoreColTitle}>Đánh giá Gara</Text>
                    </View>
                    <Text style={styles.scoreNumber}>
                      {profile.avgRating ? profile.avgRating.toFixed(1) : '--'}
                    </Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          color="#eab308"
                          fill={
                            profile.avgRating && s <= Math.round(profile.avgRating)
                              ? '#eab308'
                              : '#e5e7eb'
                          }
                        />
                      ))}
                    </View>
                    <Text style={styles.scoreSubText}>
                      {profile.avgRating ? 'Cơ sở & Dịch vụ' : 'Chưa có đánh giá'}
                    </Text>
                  </View>

                  {/* Vạch ngăn cách */}
                  <View style={styles.scoreDivider} />

                  {/* Cột 2: Điểm Thợ kỹ thuật viên */}
                  <View style={styles.scoreCol}>
                    <View style={styles.scoreColHeader}>
                      <UserCheck size={14} color={BLUE} strokeWidth={2.2} />
                      <Text style={styles.scoreColTitle}>Đánh giá Thợ</Text>
                    </View>
                    <Text style={[styles.scoreNumber, { color: BLUE }]}>
                      {staffAvgRating !== null ? staffAvgRating.toFixed(1) : '--'}
                    </Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          color="#eab308"
                          fill={
                            staffAvgRating !== null && s <= Math.round(staffAvgRating)
                              ? '#eab308'
                              : '#e5e7eb'
                          }
                        />
                      ))}
                    </View>
                    <Text style={styles.scoreSubText}>
                      {staffAvgRating !== null ? 'Tay nghề & Thái độ' : 'Chưa có đánh giá thợ'}
                    </Text>
                  </View>
                </View>

                {/* Bộ lọc phạm vi: Tất cả | Đánh giá Gara | Đánh giá Thợ */}
                <View style={styles.scopeFilterRow}>
                  <TouchableOpacity
                    style={[styles.scopeBtn, reviewScope === 'ALL' && styles.scopeBtnActive]}
                    onPress={() => setReviewScope('ALL')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.scopeBtnText, reviewScope === 'ALL' && styles.scopeBtnTextActive]}>
                      Tất cả ({ratings.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.scopeBtn, reviewScope === 'GARAGE' && styles.scopeBtnActive]}
                    onPress={() => setReviewScope('GARAGE')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.scopeBtnText, reviewScope === 'GARAGE' && styles.scopeBtnTextActive]}>
                      🏢 Nhận xét Gara
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.scopeBtn, reviewScope === 'STAFF' && styles.scopeBtnActive]}
                    onPress={() => setReviewScope('STAFF')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.scopeBtnText, reviewScope === 'STAFF' && styles.scopeBtnTextActive]}>
                      🔧 Nhận xét Thợ
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Phân loại bộ lọc theo sao */}
                <View style={styles.filterStarPills}>
                  <TouchableOpacity
                    style={[
                      styles.starFilterPill,
                      selectedStarFilter === null && styles.starFilterPillActive,
                    ]}
                    onPress={() => setSelectedStarFilter(null)}
                  >
                    <Text
                      style={[
                        styles.starFilterText,
                        selectedStarFilter === null && styles.starFilterTextActive,
                      ]}
                    >
                      Tất cả sao
                    </Text>
                  </TouchableOpacity>

                  {[5, 4, 3, 2, 1].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.starFilterPill,
                        selectedStarFilter === s && styles.starFilterPillActive,
                      ]}
                      onPress={() => setSelectedStarFilter(selectedStarFilter === s ? null : s)}
                    >
                      <Star
                        size={11}
                        color={selectedStarFilter === s ? '#ffffff' : '#eab308'}
                        fill={selectedStarFilter === s ? '#ffffff' : '#eab308'}
                      />
                      <Text
                        style={[
                          styles.starFilterText,
                          selectedStarFilter === s && styles.starFilterTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Danh sách review: Hiển thị tách bạch CẢ GARA VÀ THỢ */}
              {ratingsLoading ? (
                <View style={styles.loadingBoxSub}>
                  <ActivityIndicator size="small" color={BRAND} />
                  <Text style={styles.subLoadingText}>Đang tải đánh giá...</Text>
                </View>
              ) : filteredRatings.length === 0 ? (
                <View style={styles.emptyNotice}>
                  <Star size={36} color="#d6d3d1" strokeWidth={1.8} />
                  <Text style={styles.emptyReviewTitle}>Chưa có đánh giá nào</Text>
                  <Text style={styles.emptyNoticeText}>
                    Gara này hiện chưa có lượt đánh giá nào từ khách hàng trên hệ thống. Các đánh giá thật sẽ xuất hiện tại đây sau khi khách hàng hoàn tất ca cứu hộ.
                  </Text>
                </View>
              ) : (
                filteredRatings.map((r, index) => {
                  const staffStars = r.staffStars || r.stars;
                  return (
                    <View key={r.id || index} style={styles.reviewCard}>
                      {/* Header thông tin người đánh giá */}
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewerAvatar}>
                          <Text style={styles.reviewerAvatarText}>
                            {(r.raterName || 'K')[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.reviewerNameRow}>
                            <Text style={styles.reviewerName}>{r.raterName || 'Khách hàng'}</Text>
                            <View style={styles.verifiedReviewPill}>
                              <ShieldCheck size={11} color={SUCCESS} strokeWidth={2.4} />
                              <Text style={styles.verifiedReviewText}>Đã hoàn thành</Text>
                            </View>
                          </View>
                          <Text style={styles.reviewDate}>
                            {r.requestCode ? `Mã ca: #${r.requestCode} · ` : ''}
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                          </Text>
                        </View>
                      </View>

                      {/* PHẦN 1: ĐÁNH GIÁ GARA */}
                      {(reviewScope === 'ALL' || reviewScope === 'GARAGE') && (
                        <View style={styles.garageRatingBlock}>
                          <View style={styles.blockTitleRow}>
                            <View style={styles.blockIconBox}>
                              <Wrench size={13} color={BRAND} strokeWidth={2.4} />
                            </View>
                            <Text style={styles.blockTitleText}>Đánh giá Gara & Dịch vụ:</Text>
                            <View style={styles.starsInline}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={13}
                                  color="#eab308"
                                  fill={s <= r.stars ? '#eab308' : '#e5e7eb'}
                                />
                              ))}
                            </View>
                          </View>

                          <Text style={styles.reviewBodyText}>
                            {r.comment || 'Khách hàng chấm 5 sao cho chất lượng dịch vụ của Gara.'}
                          </Text>
                        </View>
                      )}

                      {/* PHẦN 2: ĐÁNH GIÁ KỸ THUẬT VIÊN (THỢ) */}
                      {(reviewScope === 'ALL' || reviewScope === 'STAFF') && (
                        <View style={styles.staffRatingBlock}>
                          <View style={styles.blockTitleRow}>
                            <View style={[styles.blockIconBox, { backgroundColor: '#dbeafe' }]}>
                              <UserCheck size={13} color={BLUE} strokeWidth={2.4} />
                            </View>
                            <Text style={styles.staffBlockTitleText}>
                              Kỹ thuật viên: <Text style={styles.staffNameHighlight}>{r.staffName || 'Thợ phụ trách ca'}</Text>
                            </Text>
                            <View style={styles.starsInline}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={13}
                                  color="#eab308"
                                  fill={s <= staffStars ? '#eab308' : '#e5e7eb'}
                                />
                              ))}
                            </View>
                          </View>

                          <Text style={styles.staffCommentText}>
                            {r.staffComment ||
                              'Kỹ thuật viên thao tác nhanh nhẹn, tay nghề chuyên môn tốt và nhiệt tình hỗ trợ khách hàng.'}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 3: CƠ SỞ VẬT CHẤT & ĐỘI NGŨ */}
          {activeTab === 'FACILITY' && (
            <View>
              {/* Trang thiết bị & Nhân sự */}
              <View style={styles.facilitySection}>
                <Text style={styles.sectionHeading}>Năng lực phục vụ & Đội ngũ</Text>

                <View style={styles.facilityCard}>
                  <View style={styles.facilityRow}>
                    <View style={styles.facilityIconCircle}>
                      <Users size={18} color={BRAND} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.facilityRowTitle}>Đội ngũ Kỹ thuật viên</Text>
                      <Text style={styles.facilityRowSub}>
                        {profile.activeStaffCount || 0} thợ sẵn sàng xuất phát (Tổng{' '}
                        {profile.totalStaffCount || 0} nhân viên lành nghề)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.facilityDivider} />

                  <View style={styles.facilityRow}>
                    <View style={styles.facilityIconCircle}>
                      <Truck size={18} color={BLUE} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.facilityRowTitle}>Phương tiện cứu hộ chuyên dụng</Text>
                      <Text style={styles.facilityRowSub}>
                        {readyVehicleCount} xe sẵn sàng xuất phát (Tổng{' '}
                        {profile.rescueVehicleCount || readyVehicleCount || 0} xe cứu hộ chuyên dụng)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.facilityDivider} />

                  <View style={styles.facilityRow}>
                    <View style={styles.facilityIconCircle}>
                      <Calendar size={18} color={SUCCESS} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.facilityRowTitle}>Thành viên hệ thống SRAS</Text>
                      <Text style={styles.facilityRowSub}>
                        Đối tác từ{' '}
                        {profile.memberSince
                          ? new Date(profile.memberSince).toLocaleDateString('vi-VN')
                          : 'Hệ thống'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>


              {/* Hotline liên hệ */}
              <View style={styles.contactSupportCard}>
                <Text style={styles.contactTitle}>Cần tư vấn thêm trước khi gửi xe?</Text>
                <Text style={styles.contactSub}>
                  Liên hệ trực tiếp với quản lý Gara để trao đổi chi tiết về tình trạng xe.
                </Text>
                <TouchableOpacity
                  style={[styles.callNowBtn, !garagePhone && { backgroundColor: '#a8a29e' }]}
                  onPress={handleCallHotline}
                  activeOpacity={0.85}
                >
                  <Phone size={16} color="#ffffff" strokeWidth={2.2} />
                  <Text style={styles.callNowBtnText}>
                    {garagePhone ? `Gọi Hotline: ${garagePhone}` : 'Hotline: Chưa cập nhật'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar CTA */}
      <SafeAreaView edges={['bottom']} style={styles.safeBottom}>
        <View style={styles.bottomBar}>
          <View style={styles.bottomFeeColumn}>
            <Text style={styles.bottomFeeLabel}>Phí di chuyển, kiểm tra xe:</Text>
            <Text style={styles.bottomFeeVal}>
              {profile.estimatedRescueFee
                ? `${profile.estimatedRescueFee.toLocaleString('vi-VN')} đ`
                : 'Theo quy định'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.ctaOrderBtn, !isAvail && styles.ctaOrderBtnBusy]}
            onPress={handleSelectAndOrder}
            disabled={submitting}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.ctaOrderBtnText}>
                  {isAvail
                    ? 'Gửi yêu cầu'
                    : profile.availabilityStatus === 'NO_STAFF'
                      ? 'Hết thợ · Vẫn gửi'
                      : profile.availabilityStatus === 'NO_VEHICLE'
                        ? 'Hết xe · Vẫn gửi'
                        : 'Gửi yêu cầu ca bận'}
                </Text>
                <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: BG,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: SUB,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BRAND,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  safeHeader: {
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: INK,
    flex: 1,
    textAlign: 'center',
  },
  phoneHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroBanner: {
    width: SCREEN_WIDTH,
    height: 190,
    backgroundColor: '#1c1917',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  statusFloatBadge: {
    position: 'absolute',
    top: 12,
    right: 14,
  },
  capabilityBadgeOnCover: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capabilityBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  pillAvail: {
    backgroundColor: SUCCESS_BG,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  pillBusy: {
    backgroundColor: WARNING_BG,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pillNoStaff: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  textNoStaff: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  pillNoVehicle: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  textNoVehicle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c',
  },
  pillOffline: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotAvail: {
    backgroundColor: SUCCESS,
  },
  dotBusy: {
    backgroundColor: WARNING,
  },
  dotOffline: {
    backgroundColor: SUB,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textAvail: {
    color: SUCCESS,
  },
  textBusy: {
    color: WARNING,
  },
  textOffline: {
    color: SUB,
    fontSize: 12,
    fontWeight: '600',
  },
  mainInfoCard: {
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  garageName: {
    fontSize: 20,
    fontWeight: '800',
    color: INK,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 13,
    color: SUB,
    lineHeight: 18,
    flex: 1,
  },
  badgesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  scoreBadgeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  scoreBadgeDetailText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c2410c',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SUCCESS_BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: SUCCESS,
  },
  topRatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fefce8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  topRatedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#854d0e',
  },
  fastestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BLUE_BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  fastestText: {
    fontSize: 11,
    fontWeight: '700',
    color: BLUE,
  },
  bestPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  bestPriceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  kpiCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fafaf9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LINE,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: INK,
  },
  kpiLabel: {
    fontSize: 10,
    color: SUB,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabsWrapper: {
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  tabsTrack: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f4',
    borderRadius: 10,
    padding: 3,
  },
  tabSegment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabSegmentActive: {
    backgroundColor: CARD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  tabSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: SUB,
  },
  tabSegmentTextActive: {
    color: BRAND,
    fontWeight: '700',
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: '#ffedd5',
  },
  countBadgeInactive: {
    backgroundColor: '#e7e5e4',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  countBadgeTextActive: {
    color: BRAND_DEEP,
  },
  countBadgeTextInactive: {
    color: SUB,
  },
  tabContentArea: {
    padding: 16,
  },
  feeEstimateCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 16,
  },
  feeEstimateTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  feeEstimateIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feeEstimateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
  },
  feeEstimateSub: {
    fontSize: 11,
    color: SUB,
    marginTop: 1,
  },
  feeEstimateAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND_DEEP,
  },
  feeCommitmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#ffedd5',
  },
  feeCommitmentText: {
    fontSize: 11,
    color: '#9a3412',
    flex: 1,
  },
  searchBarContainer: {
    marginBottom: 14,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: INK,
    padding: 0,
  },
  clearSearchBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },
  sectionHeadingSub: {
    fontSize: 12,
    color: SUB,
    fontWeight: '500',
    marginTop: 1,
  },
  toggleAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  toggleAllBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BRAND_DEEP,
  },
  categoryAccordionCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1.5,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: CARD,
  },
  accordionHeaderExpanded: {
    backgroundColor: '#fafaf9',
    borderBottomWidth: 1,
    borderBottomColor: '#f0eeec',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  categoryIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconBadgeActive: {
    backgroundColor: '#ffedd5',
  },
  accordionTitleCol: {
    flex: 1,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
    marginBottom: 2,
  },
  accordionSub: {
    fontSize: 11,
    color: SUB,
    fontWeight: '500',
  },
  chevronBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBubbleExpanded: {
    backgroundColor: '#ffedd5',
  },
  accordionBody: {
    backgroundColor: CARD,
  },
  clearSearchNoticeBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ffedd5',
    alignSelf: 'center',
  },
  clearSearchNoticeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_DEEP,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  serviceRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  serviceItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  serviceItemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: INK,
    marginBottom: 2,
  },
  unitText: {
    fontSize: 11,
    color: SUB,
  },
  serviceItemRight: {
    alignItems: 'flex-end',
  },
  servicePriceMain: {
    fontSize: 13.5,
    fontWeight: '800',
    color: BRAND_DEEP,
    marginBottom: 2,
  },
  servicePriceQuote: {
    fontSize: 11.5,
    fontWeight: '600',
    color: SUB,
    fontStyle: 'italic',
  },
  serviceActiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  serviceActiveText: {
    fontSize: 10,
    color: SUCCESS,
    fontWeight: '600',
  },
  serviceInactiveText: {
    fontSize: 10,
    color: SUB,
  },
  ratingOverviewCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
    marginBottom: 16,
  },
  dualScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  scoreCol: {
    flex: 1,
    alignItems: 'center',
  },
  scoreColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  scoreColTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: INK,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: INK,
    lineHeight: 36,
  },
  scoreSubText: {
    fontSize: 11,
    color: SUB,
    marginTop: 2,
  },
  scoreDivider: {
    width: 1,
    height: 60,
    backgroundColor: LINE,
    marginHorizontal: 12,
  },
  scopeFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f4',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  scopeBtnActive: {
    backgroundColor: CARD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  scopeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: SUB,
  },
  scopeBtnTextActive: {
    color: BRAND,
    fontWeight: '700',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 2,
  },
  filterStarPills: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  starFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f5f5f4',
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  starFilterPillActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  starFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: SUB,
  },
  starFilterTextActive: {
    color: '#ffffff',
  },
  reviewCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LINE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  reviewerAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: BRAND_DEEP,
  },
  reviewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
  },
  verifiedReviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: SUCCESS_BG,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  verifiedReviewText: {
    fontSize: 9,
    fontWeight: '700',
    color: SUCCESS,
  },
  reviewDate: {
    fontSize: 11,
    color: SUB,
    marginTop: 1,
  },
  garageRatingBlock: {
    backgroundColor: '#fbfbfa',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f0eeed',
    marginBottom: 8,
  },
  staffRatingBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  blockIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: INK,
  },
  staffBlockTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  staffNameHighlight: {
    color: BLUE,
    fontWeight: '800',
  },
  starsInline: {
    flexDirection: 'row',
    gap: 2,
    marginLeft: 'auto',
  },
  reviewBodyText: {
    fontSize: 12.5,
    color: INK,
    lineHeight: 18,
  },
  staffCommentText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  facilitySection: {},
  facilityCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
    marginTop: 8,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  facilityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
  },
  facilityRowSub: {
    fontSize: 12,
    color: SUB,
    marginTop: 2,
  },
  facilityDivider: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 10,
  },
  galleryScroll: {
    paddingVertical: 4,
    gap: 12,
  },
  galleryCardItem: {
    width: 170,
    backgroundColor: CARD,
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: LINE,
  },
  galleryThumbLarge: {
    width: '100%',
    height: 105,
    borderRadius: 8,
    backgroundColor: '#e7e5e4',
  },
  galleryTagBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  galleryTagText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
  },
  galleryCardCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: INK,
    marginTop: 6,
    lineHeight: 15,
  },
  contactSupportCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
    marginTop: 18,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    marginBottom: 4,
  },
  contactSub: {
    fontSize: 12,
    color: SUB,
    textAlign: 'center',
    marginBottom: 12,
  },
  callNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  callNowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyNotice: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
  },
  emptyReviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyNoticeText: {
    fontSize: 12,
    color: SUB,
    textAlign: 'center',
  },
  loadingBoxSub: {
    padding: 20,
    alignItems: 'center',
  },
  subLoadingText: {
    fontSize: 12,
    color: SUB,
    marginTop: 6,
  },
  safeBottom: {
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  bottomFeeColumn: {
    flex: 1,
  },
  bottomFeeLabel: {
    fontSize: 11,
    color: SUB,
  },
  bottomFeeVal: {
    fontSize: 16,
    fontWeight: '900',
    color: BRAND_DEEP,
  },
  ctaOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaOrderBtnBusy: {
    backgroundColor: '#ea580c',
  },
  ctaOrderBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});

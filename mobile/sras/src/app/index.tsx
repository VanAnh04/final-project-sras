import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  StyleSheet,
  Modal,
  Linking,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import {
  Car,
  Truck,
  Wrench,
  BatteryCharging,
  Disc,
  Fuel,
  Sparkles,
  Radio,
  MapPin,
  Phone,
  ChevronRight,
  ChevronDown,
  X,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Camera,
  Mic,
  Settings,
  User
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Card width calculated so 4 items fit nicely across standard screen, with horizontal scroll if > 4
const CATEGORY_CARD_WIDTH = Math.max(84, (SCREEN_WIDTH - 32 - 24) / 4);

// Default fallback categories
const FALLBACK_CATEGORIES = [
  {
    id: 1,
    name: 'Xe kéo cứu hộ',
    description: 'Cứu hộ xe chết máy, ngập nước, tai nạn hoặc sự cố giao thông bằng xe chuyên dụng sàn trượt & cẩu kéo 24/7.',
    iconKey: 'truck',
    colorScheme: { bg: '#fff7ed', border: '#ffedd5', text: '#ea580c' }
  },
  {
    id: 2,
    name: 'Kích bình ắc quy',
    description: 'Kích nổ bình ắc quy lưu động, đo kiểm tình trạng sạc phát và thay thế bình mới chính hãng tận nơi.',
    iconKey: 'battery',
    colorScheme: { bg: '#fefce8', border: '#fef08a', text: '#d97706' }
  },
  {
    id: 3,
    name: 'Vá & thay lốp',
    description: 'Vá lốp không ruột lưu động, thay lốp dự phòng, bơm lốp khẩn cấp tại chỗ nhanh chóng.',
    iconKey: 'tire',
    colorScheme: { bg: '#eff6ff', border: '#dbeafe', text: '#2563eb' }
  },
  {
    id: 4,
    name: 'Tiếp nhiên liệu',
    description: 'Giao xăng/dầu khẩn cấp tận nơi khi phương tiện của bạn hết nhiên liệu giữa đường.',
    iconKey: 'fuel',
    colorScheme: { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' }
  }
];

// Fallback services for categories
const FALLBACK_SERVICES: Record<number, any[]> = {
  1: [
    { id: 101, name: 'Cứu hộ kéo xe máy < 175cc', description: 'Kéo xe về gara hoặc địa chỉ chỉ định trong bán kính 10km', basePrice: 150000, priceUnit: 'chuyến' },
    { id: 102, name: 'Cứu hộ xe ô tô con 4-7 chỗ', description: 'Xe sàn trượt chuyên dụng, bảo vệ gầm xe an toàn tuyệt đối', basePrice: 450000, priceUnit: 'chuyến' },
    { id: 103, name: 'Cứu hộ xe tải / xe bán tải', description: 'Hỗ trợ xe tải nhẹ dưới 3.5 tấn chết máy trên đường', basePrice: 650000, priceUnit: 'chuyến' }
  ],
  2: [
    { id: 201, name: 'Kích bình ắc quy xe máy', description: 'Kích nổ bình xe máy, kiểm tra điện áp sạc', basePrice: 80000, priceUnit: 'lần' },
    { id: 202, name: 'Kích bình ắc quy ô tô 12V', description: 'Kích bình nhanh với bộ kích chuyên dụng công suất cao', basePrice: 150000, priceUnit: 'lần' },
    { id: 203, name: 'Thay ắc quy ô tô tận nơi', description: 'Thay bình GS/Atlas chính hãng, bảo hành 12 tháng', basePrice: 1200000, priceUnit: 'bình' }
  ],
  3: [
    { id: 301, name: 'Vá lốp xe máy tận nơi', description: 'Vá dùi hoặc vá ép lốp không săm tại chỗ', basePrice: 50000, priceUnit: 'lỗ' },
    { id: 302, name: 'Vá lốp ô tô lưu động', description: 'Vá lốp ô tô bằng đinh nấm hoặc cao su chuyên dụng', basePrice: 120000, priceUnit: 'lỗ' },
    { id: 303, name: 'Thay bánh sơ cua ô tô', description: 'Hỗ trợ nâng gầm, tháo lắp bánh phụ an toàn nhanh chóng', basePrice: 150000, priceUnit: 'lần' }
  ],
  4: [
    { id: 401, name: 'Tiếp xăng xe máy (2 lít)', description: 'Giao xăng A95 khẩn cấp tận xe của bạn', basePrice: 60000, priceUnit: 'lần' },
    { id: 402, name: 'Tiếp xăng / dầu ô tô (5 lít)', description: 'Giao 5 lít xăng RON 95 hoặc dầu Diesel tận nơi', basePrice: 160000, priceUnit: 'lần' }
  ]
};

export default function RootIndex() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // State for data and interactions
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);

  // Category Detail Modal State
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);

  // Auth Guard Modal State
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalReason, setAuthModalReason] = useState<{ title: string; desc: string }>({
    title: 'Yêu cầu đăng nhập',
    desc: 'Vui lòng đăng nhập để sử dụng tính năng cứu hộ khẩn cấp & dịch vụ SRAS.'
  });

  // AI Diagnostic Options Modal
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Auto-redirect if logged in as Garage Owner or Staff
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const role = user.role?.toUpperCase();
      if (role === 'GARAGE_OWNER') {
        router.replace('/garage-owner');
      } else if (role === 'GARAGE_STAFF') {
        router.replace('/garage-staff');
      }
    }
  }, [isLoading, isAuthenticated, user]);

  // Fetch Categories from Backend API
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res: any = await axiosClient.get('/service-categories');
      const apiData = res?.data || res;
      if (Array.isArray(apiData) && apiData.length > 0) {
        const mapped = apiData.map((cat: any, idx: number) => {
          const fallback = FALLBACK_CATEGORIES[idx % FALLBACK_CATEGORIES.length];
          return {
            id: cat.id,
            name: cat.name,
            description: cat.description || fallback.description,
            iconKey: getCategoryIconKey(cat.name, idx),
            colorScheme: getCategoryColorScheme(cat.name, idx)
          };
        });
        setCategories(mapped);
      } else {
        setCategories(FALLBACK_CATEGORIES);
      }
    } catch (e) {
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      setLoadingCategories(false);
    }
  };

  const getCategoryIconKey = (name: string, idx: number) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('kéo') || lower.includes('cứu hộ')) return 'truck';
    if (lower.includes('bình') || lower.includes('ắc quy')) return 'battery';
    if (lower.includes('lốp') || lower.includes('vá')) return 'tire';
    if (lower.includes('nhiên liệu') || lower.includes('xăng')) return 'fuel';
    return FALLBACK_CATEGORIES[idx % 4].iconKey;
  };

  const getCategoryColorScheme = (name: string, idx: number) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('kéo') || lower.includes('cứu hộ')) return { bg: '#fff7ed', border: '#ffedd5', text: '#ea580c' };
    if (lower.includes('bình') || lower.includes('ắc quy')) return { bg: '#fefce8', border: '#fef08a', text: '#d97706' };
    if (lower.includes('lốp') || lower.includes('vá')) return { bg: '#eff6ff', border: '#dbeafe', text: '#2563eb' };
    if (lower.includes('nhiên liệu') || lower.includes('xăng')) return { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' };
    return FALLBACK_CATEGORIES[idx % 4].colorScheme;
  };

  const renderCategoryIcon = (iconKey: string, color: string, size = 24) => {
    switch (iconKey) {
      case 'truck':
        return <Truck size={size} color={color} strokeWidth={2.2} />;
      case 'battery':
        return <BatteryCharging size={size} color={color} strokeWidth={2.2} />;
      case 'tire':
        return <Disc size={size} color={color} strokeWidth={2.2} />;
      case 'fuel':
        return <Fuel size={size} color={color} strokeWidth={2.2} />;
      default:
        return <Wrench size={size} color={color} strokeWidth={2.2} />;
    }
  };

  const handleCategoryPress = async (cat: any) => {
    setSelectedCategory(cat);
    setShowCategoryModal(true);
    setLoadingServices(true);
    try {
      const res: any = await axiosClient.get(`/services?categoryId=${cat.id}`);
      const apiServices = res?.data || res;
      if (Array.isArray(apiServices) && apiServices.length > 0) {
        setServicesList(apiServices);
      } else {
        setServicesList(FALLBACK_SERVICES[cat.id] || FALLBACK_SERVICES[1]);
      }
    } catch (e) {
      setServicesList(FALLBACK_SERVICES[cat.id] || FALLBACK_SERVICES[1]);
    } finally {
      setLoadingServices(false);
    }
  };

  const requireAuthOrExecute = (actionName: string, onAuthorized: () => void) => {
    if (!isAuthenticated) {
      let desc = 'Vui lòng đăng nhập để sử dụng tính năng cứu hộ khẩn cấp & dịch vụ SRAS.';
      if (actionName === 'rescue') {
        desc = 'Vui lòng đăng nhập để kết nối với đội xe cứu hộ khẩn cấp và truyền tọa độ chính xác.';
      } else if (actionName === 'ai') {
        desc = 'Vui lòng đăng nhập để sử dụng trí tuệ nhân tạo (AI) chẩn đoán sự cố xe thông minh.';
      } else if (actionName === 'service') {
        desc = 'Vui lòng đăng nhập để đặt dịch vụ và kết nối thợ sửa chữa.';
      }
      setAuthModalReason({
        title: 'Yêu cầu đăng nhập',
        desc
      });
      setShowAuthModal(true);
      return;
    }
    onAuthorized();
  };

  const handleEmergencyRescue = () => {
    requireAuthOrExecute('rescue', () => {
      router.push('/customer/map');
    });
  };

  const handleAiDiagnostic = () => {
    requireAuthOrExecute('ai', () => {
      setShowAiModal(true);
    });
  };

  const handleSelectService = (service: any) => {
    setShowCategoryModal(false);
    requireAuthOrExecute('service', () => {
      router.push('/customer/map');
    });
  };

  const handleCallHotline = () => {
    Linking.openURL('tel:19006868').catch(() => { });
  };

  const formatPrice = (price?: number) => {
    if (!price || price <= 0) return 'Liên hệ báo giá';
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  if (isLoading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Đang tải SRAS...</Text>
      </View>
    );
  }

  const activeCategories = categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER BAR (Enlarged & Prominent) */}
      <View style={styles.headerBar}>
        {/* Left: Brand Icon + Role + Location dropdown */}
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Car size={24} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View style={styles.headerLocationCol}>
            <Text style={styles.customerRoleTag}>KHÁCH HÀNG</Text>
            <TouchableOpacity style={styles.locationSelector} activeOpacity={0.7}>
              <MapPin size={14} color="#ef4444" strokeWidth={2.4} />
              <Text style={styles.locationCityText}>Hà Nội</Text>
              <ChevronDown size={15} color="#4b5563" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Right: Hotline Pill & Auth/Profile Pill */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.hotlinePill}
            onPress={handleCallHotline}
            activeOpacity={0.75}
          >
            <Phone size={14} color="#ef4444" strokeWidth={2.5} />
            <Text style={styles.hotlineText}>1900 6868</Text>
          </TouchableOpacity>

          {isAuthenticated && user ? (
            <TouchableOpacity
              style={styles.profilePill}
              onPress={() => router.push('/customer/profile')}
              activeOpacity={0.75}
            >
              <User size={14} color="#059669" strokeWidth={2.5} />
              <Text style={styles.profileNameText} numberOfLines={1}>
                {user.fullName ? user.fullName.split(' ').pop() : 'Tài khoản'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginPill}
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginPillText}>Đăng nhập</Text>
              <ChevronRight size={15} color="#ffffff" strokeWidth={2.6} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HERO CARD: GỌI CỨU HỘ KHẨN CẤP */}
        <LinearGradient
          colors={['#ff5722', '#ea580c', '#c2410c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emergencyCard}
        >
          {/* Top Translucent Beacon Antenna */}
          <View style={styles.beaconCircleOuter}>
            <View style={styles.beaconCircleInner}>
              <Radio size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
          </View>

          <Text style={styles.emergencyTitle}>Gọi cứu hộ khẩn cấp</Text>
          <Text style={styles.emergencySubtitle}>
            Điều phối hỗ trợ đến vị trí hiện tại của bạn ngay lập tức với mạng lưới xe trực chiến 24/7.
          </Text>

          {/* White CTA Button */}
          <TouchableOpacity
            style={styles.emergencyCtaBtn}
            onPress={handleEmergencyRescue}
            activeOpacity={0.88}
          >
            <View style={styles.redPulseDot} />
            <Text style={styles.emergencyCtaText}>CHẠM ĐỂ GỌI CỨU HỘ NGAY</Text>
            <ChevronRight size={16} color="#ea580c" strokeWidth={2.8} />
          </TouchableOpacity>
        </LinearGradient>

        {/* 2. AI SMART DIAGNOSTICS CARD */}
        <View style={styles.aiCard}>
          <View style={styles.aiIconSquircle}>
            <Cpu size={24} color="#f97316" strokeWidth={2.2} />
          </View>

          <View style={styles.aiFeatureBadge}>
            <Sparkles size={12} color="#ea580c" strokeWidth={2.4} />
            <Text style={styles.aiFeatureBadgeText}>CÔNG NGHỆ THÔNG MINH</Text>
          </View>

          <Text style={styles.aiTitle}>Chẩn đoán AI Thông minh</Text>
          <Text style={styles.aiSubtitle}>
            Phân tích sự cố xe qua hình ảnh và âm thanh tiếng máy bằng công nghệ AI tiên tiến.
          </Text>

          <TouchableOpacity
            style={styles.aiActionBtn}
            onPress={handleAiDiagnostic}
            activeOpacity={0.88}
          >
            <Text style={styles.aiActionBtnText}>Bắt đầu chẩn đoán</Text>
            <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.aiChipsRow}>
            <TouchableOpacity
              style={styles.aiChip}
              onPress={handleAiDiagnostic}
              activeOpacity={0.7}
            >
              <Camera size={12} color="#ea580c" strokeWidth={2} style={{ marginRight: 4 }} />
              <Text style={styles.aiChipText}>Ảnh chụp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiChip}
              onPress={handleAiDiagnostic}
              activeOpacity={0.7}
            >
              <Mic size={12} color="#2563eb" strokeWidth={2} style={{ marginRight: 4 }} />
              <Text style={styles.aiChipText}>Âm thanh máy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiChip}
              onPress={handleAiDiagnostic}
              activeOpacity={0.7}
            >
              <Settings size={12} color="#d97706" strokeWidth={2} style={{ marginRight: 4 }} />
              <Text style={styles.aiChipText}>Mã lỗi OBD</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. DỊCH VỤ PHỔ BIẾN (Horizontal Scrollable) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dịch vụ phổ biến</Text>
          <Text style={styles.sectionSubtitle}>Hỗ trợ 24/7</Text>
        </View>

        {loadingCategories ? (
          <View style={styles.categoriesLoadingContainer}>
            <ActivityIndicator size="small" color="#ea580c" />
            <Text style={styles.categoriesLoadingText}>Đang tải danh mục dịch vụ...</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {activeCategories.map((cat, index) => (
              <TouchableOpacity
                key={cat.id || index}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.75}
              >
                <View style={[
                  styles.categoryIconBox,
                  {
                    backgroundColor: cat.colorScheme?.bg || '#fff7ed',
                    borderColor: cat.colorScheme?.border || '#ffedd5'
                  }
                ]}>
                  {renderCategoryIcon(
                    cat.iconKey,
                    cat.colorScheme?.text || '#ea580c',
                    24
                  )}
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* 4. ĐỘI CỨU HỘ XUNG QUANH (RADAR TECH MAP PREVIEW) */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWithBadge}>
            <Text style={styles.sectionTitle}>Đội cứu hộ xung quanh</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.liveBadgeText}>Trực tiếp</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => requireAuthOrExecute('rescue', () => router.push('/customer/map'))}
            activeOpacity={0.7}
          >
            <Text style={styles.expandLink}>Mở rộng</Text>
          </TouchableOpacity>
        </View>

        {/* Radar Tech Map Card */}
        <TouchableOpacity
          style={styles.radarMapCard}
          onPress={() => requireAuthOrExecute('rescue', () => router.push('/customer/map'))}
          activeOpacity={0.92}
        >
          <View style={styles.radarGridOverlay}>
            <View style={[styles.radarCircle, { width: 90, height: 90, borderRadius: 45 }]} />
            <View style={[styles.radarCircle, { width: 170, height: 170, borderRadius: 85 }]} />
            <View style={[styles.radarCircle, { width: 250, height: 250, borderRadius: 125 }]} />

            <View style={styles.gridLineHorizontal1} />
            <View style={styles.gridLineHorizontal2} />
            <View style={styles.gridLineVertical1} />
            <View style={styles.gridLineVertical2} />
            <View style={styles.gridLineDiagonal} />

            {/* Pulsing User Location Marker */}
            <View style={styles.userPulseMarker}>
              <View style={styles.userPulseRing} />
              <View style={styles.userPulseDot} />
            </View>

            {/* Rescue Fleet Pin 1 */}
            <View style={[styles.fleetPin, { top: 32, left: '32%' }]}>
              <View style={styles.fleetPinCircle}>
                <Car size={11} color="#ffffff" strokeWidth={2.4} />
              </View>
            </View>

            {/* Rescue Fleet Pin 2 */}
            <View style={[styles.fleetPin, { top: 74, left: '22%' }]}>
              <View style={styles.fleetPinCircle}>
                <Car size={11} color="#ffffff" strokeWidth={2.4} />
              </View>
            </View>

            {/* Wrench Repair Pin 3 */}
            <View style={[styles.fleetPin, { top: 72, right: '32%' }]}>
              <View style={[styles.fleetPinCircle, { backgroundColor: '#f59e0b' }]}>
                <Wrench size={10} color="#ffffff" strokeWidth={2.4} />
              </View>
            </View>

            {/* Top Node Pin 4 */}
            <View style={[styles.fleetPin, { top: 12, right: '35%' }]}>
              <View style={[styles.fleetPinCircle, { backgroundColor: '#eab308', width: 14, height: 14, borderRadius: 7 }]} />
            </View>
          </View>

          {/* Floating Bottom Info Pill */}
          <View style={styles.mapBottomPill}>
            <View style={styles.mapBottomPillLeft}>
              <View style={styles.pillGreenDot} />
              <Text style={styles.mapBottomPillText}>4 xe cứu hộ đang sẵn sàng gần bạn</Text>
            </View>
            <Text style={styles.mapEtaText}>&lt; 8 phút</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* MODAL 1: CATEGORY SERVICES DETAILS MODAL */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[
                  styles.modalIconBox,
                  { backgroundColor: selectedCategory?.colorScheme?.bg || '#fff7ed' }
                ]}>
                  {selectedCategory && renderCategoryIcon(
                    selectedCategory.iconKey,
                    selectedCategory.colorScheme?.text || '#ea580c',
                    24
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedCategory?.name}</Text>
                  <Text style={styles.modalBadgeText}>Hỗ trợ khẩn cấp 24/7</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowCategoryModal(false)}
              >
                <X size={20} color="#64748b" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCategoryDesc}>
              {selectedCategory?.description}
            </Text>

            <View style={styles.modalDivider} />

            <Text style={styles.modalSectionTitle}>Danh sách dịch vụ & Bảng giá tham khảo</Text>

            {loadingServices ? (
              <View style={styles.servicesLoadingBox}>
                <ActivityIndicator size="small" color="#ea580c" />
                <Text style={styles.servicesLoadingText}>Đang tải danh sách dịch vụ...</Text>
              </View>
            ) : (
              <ScrollView style={styles.servicesScrollView} showsVerticalScrollIndicator={false}>
                {servicesList.map((svc: any) => (
                  <View key={svc.id} style={styles.serviceItemCard}>
                    <View style={styles.serviceItemInfo}>
                      <Text style={styles.serviceItemName}>{svc.name}</Text>
                      {svc.description ? (
                        <Text style={styles.serviceItemDesc} numberOfLines={2}>
                          {svc.description}
                        </Text>
                      ) : null}
                      <View style={styles.servicePriceRow}>
                        <Text style={styles.servicePriceLabel}>Giá từ: </Text>
                        <Text style={styles.servicePriceVal}>
                          {formatPrice(svc.basePrice || svc.minPrice)}
                        </Text>
                        {svc.priceUnit ? (
                          <Text style={styles.servicePriceUnit}> / {svc.priceUnit}</Text>
                        ) : null}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.selectServiceBtn}
                      onPress={() => handleSelectService(svc)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.selectServiceBtnText}>Đặt dịch vụ</Text>
                      <ChevronRight size={14} color="#ffffff" strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalBottomRow}>
              <TouchableOpacity
                style={styles.modalDirectCallBtn}
                onPress={handleCallHotline}
              >
                <Phone size={15} color="#ef4444" strokeWidth={2.2} />
                <Text style={styles.modalDirectCallText}>Gọi 1900 6868</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseMainBtn}
                onPress={() => setShowCategoryModal(false)}
              >
                <Text style={styles.modalCloseMainBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: AUTH REQUIRED GUARD MODAL */}
      <Modal
        visible={showAuthModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.authModalBackdrop}>
          <View style={styles.authModalCard}>
            <View style={styles.authModalIconBox}>
              <ShieldCheck size={34} color="#ea580c" strokeWidth={2.3} />
            </View>

            <Text style={styles.authModalTitle}>{authModalReason.title}</Text>
            <Text style={styles.authModalDesc}>{authModalReason.desc}</Text>

            <TouchableOpacity
              style={styles.authModalLoginBtn}
              onPress={() => {
                setShowAuthModal(false);
                router.push('/auth/login');
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.authModalLoginText}>Đăng nhập ngay</Text>
              <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authModalRegisterBtn}
              onPress={() => {
                setShowAuthModal(false);
                router.push('/auth/register');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.authModalRegisterText}>Đăng ký tài khoản mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authModalCancelBtn}
              onPress={() => setShowAuthModal(false)}
            >
              <Text style={styles.authModalCancelText}>Để sau</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: AI DIAGNOSTIC OPTIONS MODAL */}
      <Modal
        visible={showAiModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAiModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBox, { backgroundColor: '#fff7ed' }]}>
                  <Cpu size={22} color="#ea580c" strokeWidth={2.3} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Chẩn đoán AI SRAS</Text>
                  <Text style={styles.modalBadgeText}>Trí tuệ nhân tạo hỗ trợ sự cố</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowAiModal(false)}
              >
                <X size={20} color="#64748b" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCategoryDesc}>
              Chọn phương thức để hệ thống AI nhận diện nguyên nhân sự cố xe và gợi ý phương án xử lý tức thì:
            </Text>

            <View style={{ gap: 12, marginVertical: 12 }}>
              <TouchableOpacity
                style={styles.aiOptionCard}
                onPress={() => {
                  setShowAiModal(false);
                  router.push('/customer/map');
                }}
              >
                <View style={[styles.aiOptionIconBox, { backgroundColor: '#fff7ed' }]}>
                  <Camera size={22} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiOptionTitle}>1. Chụp ảnh hiện trường & sự cố</Text>
                  <Text style={styles.aiOptionSubtitle}>Nhận diện vết móp, thủng lốp, rò rỉ dầu hoặc hư hỏng ngoại quan</Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aiOptionCard}
                onPress={() => {
                  setShowAiModal(false);
                  router.push('/customer/map');
                }}
              >
                <View style={[styles.aiOptionIconBox, { backgroundColor: '#eff6ff' }]}>
                  <Mic size={22} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiOptionTitle}>2. Thu âm tiếng máy bất thường</Text>
                  <Text style={styles.aiOptionSubtitle}>Phân tích tiếng gõ xú-páp, dây curoa trượt hoặc tiếng đề yếu</Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aiOptionCard}
                onPress={() => {
                  setShowAiModal(false);
                  router.push('/customer/map');
                }}
              >
                <View style={[styles.aiOptionIconBox, { backgroundColor: '#fefce8' }]}>
                  <Settings size={22} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiOptionTitle}>3. Tra cứu mã lỗi OBD-II</Text>
                  <Text style={styles.aiOptionSubtitle}>Giải mã lỗi Check Engine (P0300, P0420...) và hướng khắc phục</Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCloseMainBtn}
              onPress={() => setShowAiModal(false)}
            >
              <Text style={styles.modalCloseMainBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* HEADER BAR (Bigger, prominent and spacious) */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  headerLocationCol: {
    justifyContent: 'center',
  },
  customerRoleTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.8,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationCityText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hotlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hotlineText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#e11d48',
  },
  loginPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loginPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profileNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    maxWidth: 80,
  },

  /* 1. EMERGENCY CARD */
  emergencyCard: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  beaconCircleOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 10,
  },
  beaconCircleInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  emergencySubtitle: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  emergencyCtaBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingVertical: 13,
    paddingHorizontal: 18,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  redPulseDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  emergencyCtaText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.4,
  },

  /* 2. AI SMART DIAGNOSTICS CARD */
  aiCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  aiIconSquircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  aiFeatureBadge: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  aiFeatureBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.3,
  },
  aiTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  aiSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  aiActionBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  aiActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  aiChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    width: '100%',
  },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  aiChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },

  /* 3. POPULAR SERVICES (Horizontal Scrollable) */
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  categoriesLoadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesLoadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
  categoriesScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 2,
  },
  categoryCard: {
    width: CATEGORY_CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  categoryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 15,
  },

  /* 4. RADAR TECH MAP SECTION */
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16a34a',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
  },
  expandLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  radarMapCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    height: 165,
    backgroundColor: '#0a1128',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  radarGridOverlay: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  gridLineHorizontal1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '35%',
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  gridLineHorizontal2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '65%',
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  gridLineVertical1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '30%',
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  gridLineVertical2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: '30%',
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  gridLineDiagonal: {
    position: 'absolute',
    top: '25%',
    left: '25%',
    right: '35%',
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    transform: [{ rotate: '25deg' }]
  },
  userPulseMarker: {
    position: 'absolute',
    bottom: 45,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPulseRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
    borderWidth: 1.5,
    borderColor: '#60a5fa',
  },
  userPulseDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  fleetPin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetPinCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  mapBottomPill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  mapBottomPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  pillGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  mapBottomPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  mapEtaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },

  /* MODALS COMMON */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#ea580c',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCategoryDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginTop: 12,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  servicesLoadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicesLoadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  servicesScrollView: {
    maxHeight: 280,
  },
  serviceItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  serviceItemDesc: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 6,
  },
  servicePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicePriceLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  servicePriceVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  servicePriceUnit: {
    fontSize: 11,
    color: '#64748b',
  },
  selectServiceBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  selectServiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  modalDirectCallBtn: {
    flex: 1,
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalDirectCallText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e11d48',
  },
  modalCloseMainBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseMainBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  /* AUTH GUARD MODAL */
  authModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  authModalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  authModalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff7ed',
    borderWidth: 2,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  authModalDesc: {
    fontSize: 13.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  authModalLoginBtn: {
    width: '100%',
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  authModalLoginText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  authModalRegisterBtn: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  authModalRegisterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  authModalCancelBtn: {
    paddingVertical: 8,
  },
  authModalCancelText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },

  /* AI MODAL OPTIONS */
  aiOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  aiOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  aiOptionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  }
});

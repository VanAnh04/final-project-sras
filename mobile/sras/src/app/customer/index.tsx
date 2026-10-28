import { useState, useEffect, useMemo } from 'react';
import axiosClient from '../../api/axiosClient';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Image,
  Modal,
  Linking,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { resolveFileUrl } from '../../api/axiosClient';
import { notificationApi } from '../../api/notificationApi';
import { resolveUserAvatar } from '../../utils/avatar';
import NearbyGaragesMap from '../../components/NearbyGaragesMap';
import FloatingAiChatBubble from '../../components/FloatingAiChatBubble';
import {
  Search,
  Bell,
  Phone,
  User,
  Zap,
  ShieldCheck,
  ArrowRight,
  Truck,
  Car,
  BatteryCharging,
  Disc,
  Fuel,
  Wrench,
  FileText,
  Headphones,
  Cpu,
  MapPin,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Camera,
  Mic,
  Settings,
  PackageCheck,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 8;
const TILE_W = (SCREEN_WIDTH - 32 - GRID_GAP * 4) / 5;

const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Xe kéo cứu hộ', iconKey: 'truck' },
  { id: 2, name: 'Kích bình ắc quy', iconKey: 'battery' },
  { id: 3, name: 'Vá & thay lốp', iconKey: 'disc' },
  { id: 4, name: 'Tiếp nhiên liệu', iconKey: 'fuel' },
];

const FALLBACK_SERVICES: Record<number, any[]> = {
  1: [
    { id: 101, name: 'Cứu hộ kéo xe máy < 175cc', description: 'Kéo xe về gara hoặc địa chỉ chỉ định trong bán kính 10km', basePrice: 150000, priceUnit: 'chuyến' },
    { id: 102, name: 'Cứu hộ xe ô tô con 4-7 chỗ', description: 'Xe sàn trượt chuyên dụng, bảo vệ gầm xe an toàn tuyệt đối', basePrice: 450000, priceUnit: 'chuyến' },
    { id: 103, name: 'Cứu hộ xe tải / xe bán tải', description: 'Hỗ trợ xe tải nhẹ dưới 3.5 tấn chết máy trên đường', basePrice: 650000, priceUnit: 'chuyến' },
  ],
  2: [
    { id: 201, name: 'Kích bình ắc quy xe máy', description: 'Kích nổ bình xe máy, kiểm tra điện áp sạc', basePrice: 80000, priceUnit: 'lần' },
    { id: 202, name: 'Kích bình ắc quy ô tô 12V', description: 'Kích bình nhanh với bộ kích chuyên dụng công suất cao', basePrice: 150000, priceUnit: 'lần' },
    { id: 203, name: 'Thay ắc quy ô tô tận nơi', description: 'Thay bình GS/Atlas chính hãng, bảo hành 12 tháng', basePrice: 1200000, priceUnit: 'bình' },
  ],
  3: [
    { id: 301, name: 'Vá lốp xe máy tận nơi', description: 'Vá dùi hoặc vá ép lốp không săm tại chỗ', basePrice: 50000, priceUnit: 'lỗ' },
    { id: 302, name: 'Vá lốp ô tô lưu động', description: 'Vá lốp ô tô bằng đinh nấm hoặc cao su chuyên dụng', basePrice: 120000, priceUnit: 'lỗ' },
    { id: 303, name: 'Thay bánh sơ cua ô tô', description: 'Hỗ trợ nâng gầm, tháo lắp bánh phụ an toàn nhanh chóng', basePrice: 150000, priceUnit: 'lần' },
  ],
  4: [
    { id: 401, name: 'Tiếp xăng xe máy (2 lít)', description: 'Giao xăng A95 khẩn cấp tận xe của bạn', basePrice: 60000, priceUnit: 'lần' },
    { id: 402, name: 'Tiếp xăng / dầu ô tô (5 lít)', description: 'Giao 5 lít xăng RON 95 hoặc dầu Diesel tận nơi', basePrice: 160000, priceUnit: 'lần' },
  ],
};

type Tile = {
  key: string;
  label: string;
  icon: string;
  action?: 'ai' | 'rescue' | 'requests' | 'call';
  categoryId?: number;
  dark?: boolean;
};

const SERVICE_TILES: Tile[] = [
  { key: 'tow', label: 'Cứu hộ kéo xe', icon: 'truck', categoryId: 1 },
  { key: 'transport', label: 'Cứu hộ vận chuyển', icon: 'truck', categoryId: 1 },
  { key: 'battery', label: 'Cứu hộ ắc quy', icon: 'battery', categoryId: 2 },
  { key: 'ai', label: 'Trợ lý AI 24/7', icon: 'cpu', action: 'ai', dark: true },
  { key: 'fuel', label: 'Cấp cứu nhiên liệu', icon: 'fuel', categoryId: 4 },
  { key: 'repair', label: 'Sửa chữa khẩn cấp', icon: 'wrench', action: 'rescue' },
  { key: 'tire', label: 'Thay lốp', icon: 'disc', categoryId: 3 },
  { key: 'history', label: 'Báo giá & lịch sử', icon: 'file', action: 'requests' },
  { key: 'support', label: 'Hỗ trợ 24/7', icon: 'headset', action: 'call' },
  { key: 'inspect', label: 'Kiểm tra xe', icon: 'carcheck', action: 'rescue' },
];

const FEATURED = [
  { key: 'tow24', title: 'Kéo xe 24/7', desc: 'Từ xe máy đến ô tô', eta: '15 - 40 phút', icon: 'truck', categoryId: 1 },
  { key: 'tire', title: 'Thay lốp tại chỗ', desc: 'Nhanh chóng, chuyên nghiệp', eta: '15 - 30 phút', icon: 'disc', categoryId: 3 },
];

function ServiceIcon({ iconKey, color, size = 24 }: { iconKey: string; color: string; size?: number }) {
  switch (iconKey) {
    case 'truck':
      return <Truck size={size} color={color} strokeWidth={2.2} />;
    case 'battery':
      return <BatteryCharging size={size} color={color} strokeWidth={2.2} />;
    case 'zap':
      return <Zap size={size} color={color} strokeWidth={2.4} />;
    case 'disc':
      return <Disc size={size} color={color} strokeWidth={2.2} />;
    case 'fuel':
      return <Fuel size={size} color={color} strokeWidth={2.2} />;
    case 'cpu':
      return <Cpu size={size} color={color} strokeWidth={2.2} />;
    case 'wrench':
      return <Wrench size={size} color={color} strokeWidth={2.2} />;
    case 'file':
      return <FileText size={size} color={color} strokeWidth={2.2} />;
    case 'headset':
      return <Headphones size={size} color={color} strokeWidth={2.2} />;
    case 'carcheck':
      return <Car size={size} color={color} strokeWidth={2.2} />;
    case 'insurance':
      return <PackageCheck size={size} color={color} strokeWidth={2.2} />;
    default:
      return <Wrench size={size} color={color} strokeWidth={2.2} />;
  }
}

export default function CustomerHome() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [garageNotice, setGarageNotice] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  const [allServices, setAllServices] = useState<any[]>([]);
  const [loadingPopular, setLoadingPopular] = useState<boolean>(false);

  // States cho tính năng Tìm kiếm & Xem tất cả dịch vụ
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllServicesModal, setShowAllServicesModal] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | 'ALL'>('ALL');

  const checkGarageStatus = async () => {
    try {
      const notifs = await notificationApi.getRecent();
      const garageNotif = notifs.find((n) => n.refType === 'GARAGE' && !n.isRead);
      if (garageNotif) {
        setGarageNotice({
          id: garageNotif.id,
          title: garageNotif.title,
          body: garageNotif.body,
          isApproved: garageNotif.title.toLowerCase().includes('duyệt') || garageNotif.body.toLowerCase().includes('thành công'),
        });
        return;
      }
      const gRes: any = await axiosClient.get('/garages/me');
      if (gRes?.data?.status === 'APPROVED' && user?.role !== 'GARAGE_OWNER') {
        setGarageNotice({
          title: 'Hồ sơ Gara đã được phê duyệt!',
          body: `Gara "${gRes.data.name}" đã được phê duyệt. Vui lòng bấm đồng ý để chuyển sang tài khoản Admin Gara.`,
          isApproved: true,
        });
      } else if (gRes?.data?.status === 'REJECTED') {
        setGarageNotice({
          title: 'Hồ sơ Gara bị từ chối',
          body: gRes.data.rejectionReason || 'Hồ sơ chưa đạt tiêu chuẩn. Vui lòng cập nhật lại thông tin.',
          isApproved: false,
        });
      }
    } catch (e) {}
  };

  const fetchCategories = async () => {
    try {
      const res: any = await axiosClient.get('/service-categories');
      const apiData = res?.data || res;
      if (Array.isArray(apiData) && apiData.length > 0) {
        setCategories(apiData);
      }
    } catch (e) {}
  };

  const fetchServicesData = async () => {
    try {
      setLoadingPopular(true);
      const res: any = await axiosClient.get('/services');
      const apiData = res?.data || res;
      if (Array.isArray(apiData) && apiData.length > 0) {
        setAllServices(apiData);
      }
    } catch (e) {
      // silent
    } finally {
      setLoadingPopular(false);
    }
  };

  useEffect(() => {
    checkGarageStatus();
    fetchCategories();
    fetchServicesData();
  }, []);

  // Lấy giá khởi điểm thực tế từ Database cho từng nhóm dịch vụ phổ biến
  const getMinPrice = (keywords: string[], fallbackPrice: number): number => {
    if (!allServices || allServices.length === 0) return fallbackPrice;
    const matches = allServices.filter((s: any) => {
      const code = (s.code || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return keywords.some((k) => code.includes(k) || name.includes(k));
    });
    if (matches.length === 0) return fallbackPrice;
    const prices = matches
      .map((s: any) => s.minPrice || s.basePrice)
      .filter((p: any) => typeof p === 'number' && p > 0);
    return prices.length > 0 ? Math.min(...prices) : fallbackPrice;
  };

  const displayPopularCards = useMemo(() => {
    const batteryMin = getMinPrice(['battery', 'ắc quy'], 60000);
    const tireMin = getMinPrice(['tire', 'lốp'], 50000);
    const towingMin = getMinPrice(['towing', 'kéo', 'cẩu'], 100000);
    const fuelMin = getMinPrice(['fuel', 'key', 'xăng', 'khóa'], 50000);

    return [
      {
        id: 'battery',
        title: 'Kích & Thay Ắc Quy',
        desc: 'Đo dòng, kích nổ & thay ắc quy GS/Varta tận nơi chính hãng',
        badge: batteryMin >= 1000 ? `Từ ${Math.round(batteryMin / 1000)}k` : 'Từ 200k',
        tag: 'Bảo hành 12T',
        icon: 'zap',
        categoryId: 3,
      },
      {
        id: 'tire',
        title: 'Vá & Thay Lốp Sơ Cua',
        desc: 'Vá nấm cao tốc, kích gầm thay lốp trong 15p an toàn',
        badge: tireMin >= 1000 ? `Từ ${Math.round(tireMin / 1000)}k` : 'Từ 150k',
        tag: 'Có mặt 15p',
        icon: 'disc',
        categoryId: 2,
      },
      {
        id: 'towing',
        title: 'Cẩu Kéo Sàn Trượt',
        desc: 'An toàn cho xe số tự động, xe điện EV & gầm siêu thấp',
        badge: 'Chuyên dụng',
        tag: 'Bảo hiểm 100%',
        icon: 'truck',
        categoryId: 4,
      },
      {
        id: 'fuel',
        title: 'Nhiên Liệu & Khóa Xe',
        desc: 'Tiếp xăng/dầu 95/0.05S khẩn cấp, mở khóa Smartkey',
        badge: '24/24',
        tag: 'Nhanh & An toàn',
        icon: 'fuel',
        categoryId: 6,
      },
    ];
  }, [allServices]);

  // Gom toàn bộ danh sách dịch vụ (ưu tiên từ API, fallback sang mock tĩnh)
  const combinedAllServices = useMemo(() => {
    if (allServices && allServices.length > 0) {
      return allServices.map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        description: s.description,
        basePrice: s.basePrice || s.minPrice || 0,
        priceUnit: s.priceUnit || (s.unit ? s.unit.toLowerCase() : 'lượt'),
        categoryId: s.categoryId,
        categoryName: s.categoryName || 'Dịch vụ cứu hộ',
      }));
    }
    const fallbackList: any[] = [];
    Object.entries(FALLBACK_SERVICES).forEach(([catIdStr, svcs]) => {
      const catId = Number(catIdStr);
      const catObj = FALLBACK_CATEGORIES.find((c) => c.id === catId);
      svcs.forEach((svc) => {
        fallbackList.push({
          ...svc,
          categoryId: catId,
          categoryName: catObj?.name || 'Dịch vụ cứu hộ',
        });
      });
    });
    return fallbackList;
  }, [allServices]);

  const availableCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories;
    }
    return FALLBACK_CATEGORIES;
  }, [categories]);

  // Bộ lọc theo danh mục & từ khóa tìm kiếm
  const filteredAllServices = useMemo(() => {
    let result = combinedAllServices;
    if (selectedCategoryFilter !== 'ALL') {
      result = result.filter((s: any) => s.categoryId === selectedCategoryFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((s: any) => {
        const name = (s.name || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const cat = (s.categoryName || '').toLowerCase();
        const code = (s.code || '').toLowerCase();
        return name.includes(q) || desc.includes(q) || cat.includes(q) || code.includes(q);
      });
    }
    return result;
  }, [combinedAllServices, selectedCategoryFilter, searchQuery]);

  // Mở modal danh sách dịch vụ cho 1 danh mục. Ưu tiên category thật từ API (khớp theo id),
  // fallback về FALLBACK_SERVICES để luôn có dữ liệu hiển thị.
  const openCategory = async (categoryId: number, label: string, iconKey: string) => {
    const real = categories.find((c: any) => c.id === categoryId);
    const cat = { id: categoryId, name: real?.name || label, iconKey };
    setSelectedCategory(cat);
    setShowCategoryModal(true);
    setLoadingServices(true);
    try {
      const res: any = await axiosClient.get(`/services?categoryId=${categoryId}`);
      const apiServices = res?.data || res;
      setServicesList(Array.isArray(apiServices) && apiServices.length > 0 ? apiServices : FALLBACK_SERVICES[categoryId] || FALLBACK_SERVICES[1]);
    } catch (e) {
      setServicesList(FALLBACK_SERVICES[categoryId] || FALLBACK_SERVICES[1]);
    } finally {
      setLoadingServices(false);
    }
  };

  const onTilePress = (t: Tile) => {
    switch (t.action) {
      case 'ai':
        return router.push('/customer/ai-chat');
      case 'requests':
        return router.push('/customer/requests');
      case 'call':
        return Linking.openURL('tel:19006868').catch(() => {});
      case 'rescue':
        return router.push('/customer/rescue-options' as any);
      default:
        if (t.categoryId) return openCategory(t.categoryId, t.label, t.icon);
        return router.push('/customer/rescue-options' as any);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price || price <= 0) return 'Liên hệ báo giá';
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  const handleAgreeAndSwitchRole = async () => {
    try {
      setUpgrading(true);
      if (garageNotice?.id) {
        await notificationApi.markRead(garageNotice.id);
      }
      const res: any = await axiosClient.post('/auth/sync-role');
      if (res?.data?.user) {
        await updateUser(res.data.user);
      } else {
        await updateUser({ role: 'GARAGE_OWNER' });
      }
      setGarageNotice(null);
      router.replace('/garage-owner');
    } catch (e) {
      await updateUser({ role: 'GARAGE_OWNER' });
      setGarageNotice(null);
      router.replace('/garage-owner');
    } finally {
      setUpgrading(false);
    }
  };

  const handleDismissNotice = async () => {
    if (garageNotice?.id) {
      try { await notificationApi.markRead(garageNotice.id); } catch (e) {}
    }
    setGarageNotice(null);
  };

  const firstName = user?.fullName ? user.fullName.split(' ').pop() : 'bạn';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER (gradient cam) */}
      <LinearGradient
        colors={['#f97316', '#ea580c', '#c2410c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.headerLeft}
              onPress={() => router.push('/customer/profile')}
              activeOpacity={0.8}
            >
              <View style={styles.avatarCircle}>
                <Image
                  source={{ uri: resolveUserAvatar(user?.avatarUrl, user?.fullName) }}
                  style={styles.avatarImg}
                />
              </View>
              <View>
                <Text style={styles.helloLabel}>Xin chào,</Text>
                <View style={styles.helloNameRow}>
                  <Text style={styles.helloName} numberOfLines={1}>
                    {user?.fullName || 'Khách hàng'}
                  </Text>
                  <ChevronRight size={16} color="#ffffff" strokeWidth={2.6} />
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconCircleBtn} activeOpacity={0.8}>
                <Bell size={18} color="#ffffff" strokeWidth={2.3} />
                <View style={styles.bellDot} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconCircleBtn}
                onPress={() => router.push('/customer/profile')}
                activeOpacity={0.8}
              >
                <User size={18} color="#ffffff" strokeWidth={2.3} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search bar hoạt động thực tế */}
          <View style={styles.searchBar}>
            <Search size={18} color="#ea580c" strokeWidth={2.3} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm dịch vụ (kéo xe, ắc quy, vá lốp, xăng...)"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={(txt) => {
                setSearchQuery(txt);
                if (txt.trim().length > 0) {
                  setShowAllServicesModal(true);
                }
              }}
              onFocus={() => setShowAllServicesModal(true)}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.searchClearBtn}
              >
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategoryFilter('ALL');
                  setShowAllServicesModal(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.searchBadgeAll}>Tất cả</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Garage notice */}
        {garageNotice && (
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: garageNotice.isApproved ? '#f0fdf4' : '#fef2f2',
                borderColor: garageNotice.isApproved ? '#86efac' : '#fecaca',
              },
            ]}
          >
            <View style={styles.noticeHeaderRow}>
              <View style={styles.noticeHeaderLeft}>
                {garageNotice.isApproved ? (
                  <CheckCircle2 size={20} color="#16a34a" />
                ) : (
                  <AlertTriangle size={20} color="#dc2626" />
                )}
                <Text style={[styles.noticeTitle, { color: garageNotice.isApproved ? '#15803d' : '#b91c1c' }]}>
                  {garageNotice.title}
                </Text>
              </View>
              <TouchableOpacity onPress={handleDismissNotice} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.noticeBody}>{garageNotice.body}</Text>
            {garageNotice.isApproved ? (
              <TouchableOpacity style={styles.noticeAgreeBtn} onPress={handleAgreeAndSwitchRole} disabled={upgrading}>
                {upgrading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.noticeAgreeBtnText}>ĐỒNG Ý VÀ CHUYỂN SANG ADMIN GARA</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.noticeDetailBtn}
                onPress={() => {
                  handleDismissNotice();
                  router.push('/customer/register-partner' as any);
                }}
              >
                <Text style={styles.noticeDetailBtnText}>Xem chi tiết & Kháng cáo / Nộp lại</Text>
                <ChevronRight size={16} color="#dc2626" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* HERO BANNER */}
        <LinearGradient
          colors={['#fb923c', '#ea580c', '#c2410c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTextCol}>
            <View style={styles.heroBadge}>
              <ShieldCheck size={13} color="#ffffff" strokeWidth={2.6} />
              <Text style={styles.heroBadgeText}>Cứu hộ thông minh</Text>
            </View>
            <Text style={styles.heroTitle}>Có sự cố trên đường?{'\n'}Chúng tôi sẽ đến ngay!</Text>
            <Text style={styles.heroSub}>Nhanh chóng · An toàn · Minh bạch</Text>

            <TouchableOpacity
              style={styles.heroCta}
              onPress={() => router.push('/customer/rescue-options' as any)}
              activeOpacity={0.9}
            >
              <Text style={styles.heroCtaText}>Gọi cứu hộ ngay</Text>
              <ArrowRight size={16} color="#ea580c" strokeWidth={2.8} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroArt}>
            <View style={styles.heroPin}>
              <MapPin size={20} color="#ffffff" strokeWidth={2.6} fill="#ef4444" />
            </View>
            <View style={styles.heroTruckCircle}>
              <Truck size={54} color="#ffffff" strokeWidth={1.7} />
            </View>
          </View>
        </LinearGradient>

        {/* BẢN ĐỒ GARA GẦN ĐÂY (ONLINE) */}
        <NearbyGaragesMap />

        {/* DỊCH VỤ CỨU HỘ PHỔ BIẾN (LẤY TỪ DATA) */}
        <View style={styles.popularSection}>
          <View style={styles.popularHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.popularTitle}>Dịch vụ cứu hộ phổ biến</Text>
              <Text style={styles.popularSub}>Chi phí rõ ràng, thợ kỹ thuật có mặt siêu tốc</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSelectedCategoryFilter('ALL');
                setShowAllServicesModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.popularLink}>Xem tất cả &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.popularGrid}>
            {displayPopularCards.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.popularCard}
                activeOpacity={0.85}
                onPress={() => openCategory(item.categoryId, item.title, item.icon)}
              >
                <View style={styles.popularCardTop}>
                  <View style={styles.popularIconWrap}>
                    <ServiceIcon iconKey={item.icon} color="#ea580c" size={22} />
                  </View>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>{item.badge}</Text>
                  </View>
                </View>

                <View style={styles.popularCardContent}>
                  <Text style={styles.popularCardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.popularCardDesc} numberOfLines={2}>{item.desc}</Text>
                </View>

                <View style={styles.popularCardBottom}>
                  <Text style={styles.popularTagText}>{item.tag}</Text>
                  <ChevronRight size={14} color="#ea580c" strokeWidth={2.6} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* BANNER CAM KẾT BÁO GIÁ MINH BẠCH 100% */}
          <View style={styles.commitmentBanner}>
            <View style={styles.commitmentCircle}>
              <ShieldCheck size={22} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.commitmentTitle}>Cam Kết Báo Giá Minh Bạch 100%</Text>
              <Text style={styles.commitmentSub}>Không chặt chém · Niêm yết công khai · Bảo hành cứu hộ 30 ngày</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* BONG BÓNG CHAT AI (DRAGGABLE FLOATING CHAT BUBBLE) */}
      <FloatingAiChatBubble />

      {/* CATEGORY SERVICES MODAL */}
      <Modal visible={showCategoryModal} animationType="slide" transparent onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  {selectedCategory && <ServiceIcon iconKey={selectedCategory.iconKey} color="#ea580c" size={24} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedCategory?.name}</Text>
                  <Text style={styles.modalBadgeText}>Hỗ trợ khẩn cấp 24/7</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCategoryModal(false)}>
                <X size={20} color="#64748b" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionTitle}>Danh sách dịch vụ & Bảng giá tham khảo</Text>

            {loadingServices ? (
              <View style={styles.servicesLoadingBox}>
                <ActivityIndicator size="small" color="#ea580c" />
                <Text style={styles.servicesLoadingText}>Đang tải danh sách dịch vụ...</Text>
              </View>
            ) : (
              <ScrollView style={styles.servicesScroll} showsVerticalScrollIndicator={false}>
                {servicesList.map((svc: any) => (
                  <View key={svc.id} style={styles.serviceItemCard}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={styles.serviceItemName}>{svc.name}</Text>
                      {svc.description ? (
                        <Text style={styles.serviceItemDesc} numberOfLines={2}>{svc.description}</Text>
                      ) : null}
                      <View style={styles.servicePriceRow}>
                        <Text style={styles.servicePriceLabel}>Giá từ: </Text>
                        <Text style={styles.servicePriceVal}>{formatPrice(svc.basePrice || svc.minPrice)}</Text>
                        {svc.priceUnit ? <Text style={styles.servicePriceUnit}> / {svc.priceUnit}</Text> : null}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.selectServiceBtn}
                      onPress={() => {
                        setShowCategoryModal(false);
                        router.push('/customer/rescue-options' as any);
                      }}
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
              <TouchableOpacity style={styles.modalDirectCallBtn} onPress={() => Linking.openURL('tel:19006868').catch(() => {})}>
                <Phone size={15} color="#ef4444" strokeWidth={2.2} />
                <Text style={styles.modalDirectCallText}>Gọi 1900 6868</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCloseMainBtn} onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.modalCloseMainBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ALL SERVICES & SEARCH MODAL (XEM TẤT CẢ DỊCH VỤ & TÌM KIẾM CHI TIẾT) */}
      <Modal
        visible={showAllServicesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAllServicesModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { maxHeight: '92%', height: '88%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBox, { backgroundColor: '#fff7ed' }]}>
                  <Wrench size={22} color="#ea580c" strokeWidth={2.3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Tất cả dịch vụ cứu hộ</Text>
                  <Text style={styles.modalBadgeText}>
                    {filteredAllServices.length} dịch vụ · Niêm yết công khai
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowAllServicesModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748b" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {/* Ô tìm kiếm trong modal */}
            <View style={styles.modalSearchBox}>
              <Search size={17} color="#ea580c" strokeWidth={2.3} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Tìm tên dịch vụ, lỗi xe, danh mục..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Thanh chọn danh mục ngang (Filter Chips) */}
            <View style={{ marginBottom: 12, marginTop: 4 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryFilterChip,
                    selectedCategoryFilter === 'ALL' && styles.categoryFilterChipActive,
                  ]}
                  onPress={() => setSelectedCategoryFilter('ALL')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryFilterChipText,
                      selectedCategoryFilter === 'ALL' && styles.categoryFilterChipTextActive,
                    ]}
                  >
                    Tất cả ({combinedAllServices.length})
                  </Text>
                </TouchableOpacity>

                {availableCategories.map((cat: any) => {
                  const isActive = selectedCategoryFilter === cat.id;
                  const count = combinedAllServices.filter((s: any) => s.categoryId === cat.id).length;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryFilterChip,
                        isActive && styles.categoryFilterChipActive,
                      ]}
                      onPress={() => setSelectedCategoryFilter(cat.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryFilterChipText,
                          isActive && styles.categoryFilterChipTextActive,
                        ]}
                      >
                        {cat.name} {count > 0 ? `(${count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Danh sách dịch vụ */}
            {filteredAllServices.length === 0 ? (
              <View style={styles.emptyServicesBox}>
                <Search size={44} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={styles.emptyServicesTitle}>Không tìm thấy dịch vụ phù hợp</Text>
                <Text style={styles.emptyServicesSub}>
                  Không có dịch vụ nào khớp với "{searchQuery}". Thử từ khóa: "kéo", "ắc quy", "lốp", "xăng"...
                </Text>
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.emptyResetBtn}
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedCategoryFilter('ALL');
                    }}
                  >
                    <Text style={styles.emptyResetBtnText}>Xem lại tất cả dịch vụ</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {filteredAllServices.map((svc: any) => (
                  <View key={svc.id} style={styles.serviceItemCard}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View style={styles.serviceCategoryTagRow}>
                        <Text style={styles.serviceCategoryTagText}>
                          {svc.categoryName || 'Cứu hộ khẩn cấp'}
                        </Text>
                      </View>
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
                      onPress={() => {
                        setShowAllServicesModal(false);
                        router.push({
                          pathname: '/customer/rescue-options',
                          params: {
                            serviceId: String(svc.id),
                            serviceName: svc.name,
                            basePrice: String(svc.basePrice || svc.minPrice || 0),
                          },
                        } as any);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.selectServiceBtnText}>Đặt dịch vụ</Text>
                      <ChevronRight size={14} color="#ffffff" strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Bottom Controls */}
            <View style={styles.modalBottomRow}>
              <TouchableOpacity
                style={styles.modalDirectCallBtn}
                onPress={() => Linking.openURL('tel:19006868').catch(() => {})}
              >
                <Phone size={15} color="#ef4444" strokeWidth={2.2} />
                <Text style={styles.modalDirectCallText}>Gọi tổng đài 1900 6868</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseMainBtn}
                onPress={() => setShowAllServicesModal(false)}
              >
                <Text style={styles.modalCloseMainBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI DIAGNOSTIC MODAL */}
      <Modal visible={showAiModal} animationType="slide" transparent onRequestClose={() => setShowAiModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBox, { backgroundColor: '#0f172a' }]}>
                  <Cpu size={22} color="#fb923c" strokeWidth={2.3} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Chẩn đoán AI SRAS</Text>
                  <Text style={styles.modalBadgeText}>Trí tuệ nhân tạo hỗ trợ sự cố</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowAiModal(false)}>
                <X size={20} color="#64748b" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCategoryDesc}>
              Chọn phương thức để hệ thống AI nhận diện nguyên nhân sự cố xe và gợi ý phương án xử lý tức thì:
            </Text>

            <View style={{ gap: 12, marginVertical: 12 }}>
              {[
                { icon: <Camera size={22} color="#ea580c" />, bg: '#fff7ed', title: '1. Chụp ảnh hiện trường & sự cố', sub: 'Nhận diện vết móp, thủng lốp, rò rỉ dầu hoặc hư hỏng ngoại quan' },
                { icon: <Mic size={22} color="#2563eb" />, bg: '#eff6ff', title: '2. Thu âm tiếng máy bất thường', sub: 'Phân tích tiếng gõ xú-páp, dây curoa trượt hoặc tiếng đề yếu' },
                { icon: <Settings size={22} color="#d97706" />, bg: '#fefce8', title: '3. Tra cứu mã lỗi OBD-II', sub: 'Giải mã lỗi Check Engine (P0300, P0420...) và hướng khắc phục' },
              ].map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.aiOptionCard}
                  onPress={() => {
                    setShowAiModal(false);
                    router.push('/customer/rescue-options' as any);
                  }}
                >
                  <View style={[styles.aiOptionIconBox, { backgroundColor: opt.bg }]}>{opt.icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiOptionTitle}>{opt.title}</Text>
                    <Text style={styles.aiOptionSubtitle}>{opt.sub}</Text>
                  </View>
                  <ChevronRight size={16} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalCloseMainBtn} onPress={() => setShowAiModal(false)}>
              <Text style={styles.modalCloseMainBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  /* HEADER */
  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  helloLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  helloNameRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  helloName: { fontSize: 16, fontWeight: '900', color: '#ffffff', maxWidth: 130 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hotlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hotlineText: { fontSize: 12.5, fontWeight: '800', color: '#ea580c' },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
    color: '#0f172a',
    paddingVertical: 0,
    marginLeft: 8,
  },
  searchClearBtn: {
    padding: 6,
  },
  searchBadgeAll: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  /* SCROLL */
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  /* NOTICE */
  noticeCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  noticeTitle: { fontSize: 14, fontWeight: 'bold' },
  noticeBody: { fontSize: 12.5, color: '#334155', marginTop: 6, lineHeight: 18 },
  noticeAgreeBtn: { backgroundColor: '#16a34a', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  noticeAgreeBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  noticeDetailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginTop: 8, gap: 4 },
  noticeDetailBtnText: { color: '#dc2626', fontWeight: 'bold', fontSize: 12.5 },

  /* HERO */
  hero: {
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 7,
  },
  heroTextCol: { flex: 1, paddingRight: 8 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', lineHeight: 26, letterSpacing: 0.2 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.92)', marginTop: 8, fontWeight: '600' },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 11,
    paddingHorizontal: 18,
    marginTop: 16,
  },
  heroCtaText: { fontSize: 13.5, fontWeight: '900', color: '#ea580c' },
  heroArt: { width: 96, height: 110, alignItems: 'center', justifyContent: 'center' },
  heroPin: { position: 'absolute', top: 0, right: 14, zIndex: 2 },
  heroTruckCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* GRID */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: 18,
  },
  tile: { width: TILE_W, alignItems: 'center' },
  tileIconBox: {
    width: TILE_W - 12,
    height: TILE_W - 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileIconBoxLight: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5' },
  tileIconBoxDark: { backgroundColor: '#0f172a' },
  aiSpark: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fb923c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: 10.5, fontWeight: '600', color: '#334155', textAlign: 'center', lineHeight: 13.5 },

  /* LOCATION */
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 18,
    padding: 12,
    marginTop: 20,
  },
  locationThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  locationThumbGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 8,
    borderColor: 'rgba(22,163,74,0.08)',
  },
  locationTextCol: { flex: 1 },
  autoLocateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 4,
  },
  autoLocateText: { fontSize: 10.5, fontWeight: '800', color: '#059669' },
  locationTitle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  locationDesc: { fontSize: 11.5, color: '#64748b', marginTop: 2 },

  /* POPULAR SERVICES SECTION */
  popularSection: {
    marginTop: 22,
    marginBottom: 10,
  },
  popularHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  popularTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  popularSub: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 3,
    fontWeight: '500',
  },
  popularLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
    paddingVertical: 2,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  popularCard: {
    width: (SCREEN_WIDTH - 32 - 12) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'space-between',
    minHeight: 182,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  popularCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  popularIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  popularCardContent: {
    flex: 1,
  },
  popularCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 19,
    marginBottom: 5,
  },
  popularCardDesc: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 10,
  },
  popularCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  popularTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },

  /* COMMITMENT BANNER */
  commitmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  commitmentCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  commitmentTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  commitmentSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },

  /* MODALS */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalBadgeText: { fontSize: 11.5, fontWeight: '600', color: '#ea580c', marginTop: 2 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCategoryDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginTop: 12 },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 16, marginBottom: 10 },
  servicesLoadingBox: { paddingVertical: 30, alignItems: 'center', justifyContent: 'center' },
  servicesLoadingText: { fontSize: 12, color: '#64748b', marginTop: 8 },
  servicesScroll: { maxHeight: 300 },
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
  serviceItemName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  serviceItemDesc: { fontSize: 11.5, color: '#64748b', lineHeight: 16, marginBottom: 6 },
  servicePriceRow: { flexDirection: 'row', alignItems: 'center' },
  servicePriceLabel: { fontSize: 11, color: '#64748b' },
  servicePriceVal: { fontSize: 13, fontWeight: '800', color: '#ea580c' },
  servicePriceUnit: { fontSize: 11, color: '#64748b' },
  selectServiceBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  selectServiceBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  modalBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
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
  modalDirectCallText: { fontSize: 13, fontWeight: '700', color: '#e11d48' },
  modalCloseMainBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseMainBtnText: { fontSize: 13, fontWeight: '600', color: '#475569' },
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
  aiOptionIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aiOptionTitle: { fontSize: 13.5, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  aiOptionSubtitle: { fontSize: 11, color: '#64748b', lineHeight: 15 },
  floatingAiBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 5,
    gap: 8,
  },
  floatingAiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingAiTextCol: {
    justifyContent: 'center',
  },
  floatingAiTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  floatingAiSub: {
    fontSize: 10,
    color: '#78716c',
  },

  /* ALL SERVICES & SEARCH MODAL STYLES */
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
    marginTop: 12,
    marginBottom: 6,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
    color: '#0f172a',
    paddingVertical: 0,
  },
  categoryFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryFilterChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  categoryFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryFilterChipTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  serviceCategoryTagRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  serviceCategoryTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  emptyServicesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyServicesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyServicesSub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyResetBtn: {
    marginTop: 16,
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  emptyResetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
});

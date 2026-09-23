import { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search,
  Bell,
  Phone,
  User,
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
  { key: 'ai', label: 'Chẩn đoán AI', icon: 'cpu', action: 'ai', dark: true },
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

  const checkGarageStatus = async () => {
    try {
      const notifRes: any = await axiosClient.get('/notifications/recent');
      const notifs = notifRes?.data || [];
      const garageNotif = notifs.find((n: any) => n.refType === 'GARAGE' && !n.isRead);
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

  useEffect(() => {
    checkGarageStatus();
    fetchCategories();
  }, []);

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
        return setShowAiModal(true);
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
        await axiosClient.put(`/notifications/${garageNotice.id}/read`);
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
      try { await axiosClient.put(`/notifications/${garageNotice.id}/read`); } catch (e) {}
    }
    setGarageNotice(null);
  };

  const firstName = user?.fullName ? user.fullName.split(' ').pop() : 'bạn';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#ea580c" />

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
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Truck size={22} color="#ea580c" strokeWidth={2.4} />
                )}
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
              <TouchableOpacity
                style={styles.hotlinePill}
                onPress={() => Linking.openURL('tel:19006868').catch(() => {})}
                activeOpacity={0.8}
              >
                <Phone size={14} color="#ea580c" strokeWidth={2.6} />
                <Text style={styles.hotlineText}>1900 6868</Text>
              </TouchableOpacity>

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

          {/* Search */}
          <View style={styles.searchBar}>
            <Search size={18} color="#94a3b8" strokeWidth={2.2} />
            <Text style={styles.searchPlaceholder}>Tìm dịch vụ cứu hộ...</Text>
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

        {/* SERVICE GRID */}
        <View style={styles.grid}>
          {SERVICE_TILES.map((t) => (
            <TouchableOpacity key={t.key} style={styles.tile} activeOpacity={0.75} onPress={() => onTilePress(t)}>
              <View style={[styles.tileIconBox, t.dark ? styles.tileIconBoxDark : styles.tileIconBoxLight]}>
                <ServiceIcon iconKey={t.icon} color={t.dark ? '#fb923c' : '#ea580c'} size={24} />
                {t.dark && (
                  <View style={styles.aiSpark}>
                    <Sparkles size={10} color="#0f172a" strokeWidth={2.6} />
                  </View>
                )}
              </View>
              <Text style={styles.tileLabel} numberOfLines={2}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LOCATION SHARE CARD */}
        <TouchableOpacity
          style={styles.locationCard}
          activeOpacity={0.85}
          onPress={() => router.push('/customer/rescue-options' as any)}
        >
          <View style={styles.locationThumb}>
            <View style={styles.locationThumbGrid} />
            <MapPin size={20} color="#ea580c" strokeWidth={2.6} fill="#fed7aa" />
          </View>
          <View style={styles.locationTextCol}>
            <View style={styles.autoLocateBadge}>
              <MapPin size={11} color="#059669" strokeWidth={2.6} />
              <Text style={styles.autoLocateText}>Định vị tự động</Text>
            </View>
            <Text style={styles.locationTitle}>Chia sẻ vị trí hiện tại</Text>
            <Text style={styles.locationDesc}>Giúp tài xế đến nhanh hơn và chính xác hơn</Text>
          </View>
          <ChevronRight size={20} color="#94a3b8" strokeWidth={2.4} />
        </TouchableOpacity>

        {/* FEATURED */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dịch vụ nổi bật</Text>
          <TouchableOpacity onPress={() => router.push('/customer/rescue-options' as any)} activeOpacity={0.7}>
            <Text style={styles.sectionLink}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuredRow}>
          {FEATURED.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={styles.featuredCard}
              activeOpacity={0.85}
              onPress={() => openCategory(f.categoryId, f.title, f.icon)}
            >
              <View style={styles.featuredIconBox}>
                <ServiceIcon iconKey={f.icon} color="#ea580c" size={22} />
              </View>
              <Text style={styles.featuredTitle} numberOfLines={1}>{f.title}</Text>
              <Text style={styles.featuredDesc} numberOfLines={1}>{f.desc}</Text>
              <View style={styles.featuredEtaRow}>
                <View style={styles.etaDot} />
                <Text style={styles.featuredEta}>{f.eta}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 16,
  },
  searchPlaceholder: { fontSize: 14, color: '#94a3b8' },

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

  /* SECTION */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  sectionLink: { fontSize: 13, fontWeight: '700', color: '#ea580c' },

  /* FEATURED */
  featuredRow: { flexDirection: 'row', gap: 12 },
  featuredCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
  },
  featuredIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featuredTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  featuredDesc: { fontSize: 11.5, color: '#64748b', marginTop: 3 },
  featuredEtaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  etaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  featuredEta: { fontSize: 11.5, fontWeight: '800', color: '#ea580c' },

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
});

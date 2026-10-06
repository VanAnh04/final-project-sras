import React, { useState, useEffect } from 'react';
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
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import axiosClient from '../../api/axiosClient';
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
  Pencil
} from 'lucide-react-native';

export default function GarageProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [garage, setGarage] = useState({
    code: 'GR-8829',
    name: 'AutoCare Premium Services',
    shortName: 'AutoCare Premium',
    phone: '0900 123 456',
    address: '123 Đường Công Nghệ, Quận 7, TP. Hồ Chí Minh',
    coverUrl: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?w=800&auto=format&fit=crop&q=80',
    isOnline: true,
  });

  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    const fetchGarageDetails = async () => {
      try {
        setLoading(true);
        const res: any = await axiosClient.get('/garages/me');
        if (res?.data) {
          const d = res.data;
          setGarage({
            code: d.code || `GR-${String(d.id || 8829).padStart(4, '0')}`,
            name: d.name || 'AutoCare Premium Services',
            shortName: d.name ? d.name.split(' ').slice(0, 2).join(' ') : 'AutoCare Premium',
            phone: d.phone || user?.phone || '0900 123 456',
            address: d.address || '123 Đường Công Nghệ, Quận 7, TP. Hồ Chí Minh',
            coverUrl: d.coverUrl || 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?w=800&auto=format&fit=crop&q=80',
            isOnline: d.isOnline !== undefined ? Boolean(d.isOnline) : true,
          });
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

            const defaultSub = subtitleMap[key] || (item.price ? `Từ ${Number(item.price).toLocaleString('vi-VN')}₫` : 'Khẩn cấp 24/7');

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
              bgColor: '#ffe4e6',
              price: item.price,
              distanceTiersJson: item.distanceTiersJson,
              nightSurgeEnabled: item.nightSurgeEnabled,
              nightSurgePercent: item.nightSurgePercent,
              holidaySurgeEnabled: item.holidaySurgeEnabled,
              holidaySurgePercent: item.holidaySurgePercent,
            };
          });
          setServices(mapped);
        } else {
          // Fallback sample list matching image exactly if no services yet
          setServices([
            {
              id: '1',
              title: 'Vá lốp',
              subtitle: 'Hỗ trợ tận nơi 24/7',
              icon: Disc,
              enabled: true,
              color: '#ea580c',
              bgColor: '#ffe4e6',
              price: 150000,
            },
            {
              id: '2',
              title: 'Cứu hộ ắc quy',
              subtitle: 'Kích bình & thay mới',
              icon: Zap,
              enabled: true,
              color: '#ea580c',
              bgColor: '#ffe4e6',
              price: 200000,
            },
            {
              id: '3',
              title: 'Kéo xe',
              subtitle: 'Xe cứu hộ chuyên dụng',
              icon: Truck,
              enabled: false,
              color: '#ea580c',
              bgColor: '#ffe4e6',
              price: 350000,
            },
            {
              id: '4',
              title: 'Sửa máy nặng',
              subtitle: 'Tại xưởng kỹ thuật',
              icon: Wrench,
              enabled: true,
              color: '#ea580c',
              bgColor: '#ffe4e6',
              price: 500000,
            },
          ]);
        }
      } catch (e) {
        console.log('Error fetching services from API');
      } finally {
        setLoading(false);
      }
    };
    fetchGarageDetails();
  }, [user]);

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
      await axiosClient.put(`/garages/me/services/${id}/toggle`, {
        isActive: nextState,
      });
    } catch (e) {
      console.log('Online toggle fallback state');
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
          <Text style={styles.headerTitle}>Hồ sơ Gara</Text>
        </View>

        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
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
        <View style={styles.coverCard}>
          <Image 
            source={{ uri: garage.coverUrl }} 
            style={styles.coverImage} 
            resizeMode="cover"
          />
          <View style={styles.coverOverlay} />

          <View style={styles.bannerInfoBox}>
            <View style={styles.avatarCircle}>
              <Building2 size={22} color="#ea580c" strokeWidth={2.4} />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerGarageName}>{garage.shortName}</Text>
              <Text style={styles.bannerGarageId}>ID: {garage.code}</Text>
            </View>
          </View>
        </View>

        {/* Details Fields Card */}
        <View style={styles.detailsCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Tên Gara</Text>
            <Text style={styles.fieldValue}>{garage.name}</Text>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Hotline</Text>
            <Text style={styles.fieldValue}>{garage.phone}</Text>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Địa chỉ</Text>
            <Text style={styles.fieldValue}>{garage.address}</Text>
          </View>
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
                        price: svc.price ? String(svc.price) : '0',
                        distanceTiersJson: svc.distanceTiersJson || '',
                        nightSurgeEnabled: String(Boolean(svc.nightSurgeEnabled)),
                        nightSurgePercent: String(svc.nightSurgePercent || 0),
                        holidaySurgeEnabled: String(Boolean(svc.holidaySurgeEnabled)),
                        holidaySurgePercent: String(svc.holidaySurgePercent || 0),
                        feeType: svc.feeType || '',
                        unit: svc.unit || '',
                      }
                    })}
                  >
                    <View style={[styles.serviceIconBox, { backgroundColor: svc.bgColor || '#ffe4e6' }]}>
                      <IconComp size={20} color="#ea580c" strokeWidth={2.2} />
                    </View>

                    <View style={styles.serviceTextWrap}>
                      <Text style={styles.serviceTitle}>{svc.title}</Text>
                      <Text style={styles.serviceSubtitle}>{svc.subtitle}</Text>
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
                            minPrice: String(svc.minPrice || 0),
                            maxPrice: String(svc.maxPrice || 0),
                            price: svc.price ? String(svc.price) : '0',
                          }
                        })}
                        style={styles.pencilBtn}
                        activeOpacity={0.7}
                      >
                        <Pencil size={15} color="#94a3b8" />
                      </TouchableOpacity>

                      <Switch
                        value={svc.enabled}
                        onValueChange={() => toggleService(svc.id)}
                        trackColor={{ false: '#e2e8f0', true: '#fb923c' }}
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

        {/* Nút Xem thêm cấu hình (Pill shape màu xanh nhạt như ảnh) */}
        {services.length > 4 && (
          <View style={styles.moreBtnWrapper}>
            <TouchableOpacity 
              style={styles.moreConfigBtn}
              activeOpacity={0.8}
              onPress={() => setExpanded(!expanded)}
            >
              <Text style={styles.moreConfigBtnText}>
                {expanded ? 'Thu gọn cấu hình' : 'Xem thêm cấu hình'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
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
  serviceTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  serviceSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  serviceActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    backgroundColor: '#e8effe',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
});

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
  CheckCircle2
} from 'lucide-react-native';

export default function GarageProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [garage, setGarage] = useState({
    code: '',
    name: '',
    shortName: '',
    phone: '',
    address: '',
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
            code: d.code || `GR-${String(d.id || 1).padStart(4, '0')}`,
            name: d.name || '',
            shortName: d.name ? d.name.split(' ')[0] : '',
            phone: d.phone || user?.phone || '',
            address: d.address || '',
            coverUrl: d.coverUrl || 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?w=800&auto=format&fit=crop&q=80',
            isOnline: d.isOnline !== undefined ? Boolean(d.isOnline) : true,
          });
        }
      } catch (e) {
        console.log('Error fetching garage profile from API');
      }

      try {
        const svcRes: any = await axiosClient.get('/garages/me/services');
        if (Array.isArray(svcRes?.data)) {
          const iconMap: Record<string, any> = {
            tire: Disc,
            battery: Zap,
            towing: Truck,
            engine: Wrench,
            fuel: Fuel,
            unlock: Key,
            spare_tire: Disc,
            ecu_scan: Gauge,
            brakes: ShieldAlert,
            battery_replace: BatteryCharging,
          };

          const mapped = svcRes.data.map((item: any) => ({
            id: String(item.serviceId || item.id),
            dbId: item.serviceId || item.id,
            title: item.serviceName || 'Dịch vụ',
            subtitle: `Chi phí từ ${item.price ? Number(item.price).toLocaleString('vi-VN') : '0'} VNĐ`,
            feeType: item.feeType,
            unit: item.unit,
            icon: iconMap[item.serviceCode?.toLowerCase()] || Wrench,
            enabled: Boolean(item.isActive),
            color: '#ea580c',
            bgColor: '#ffedd5',
            price: item.price,
            distanceTiersJson: item.distanceTiersJson,
            nightSurgeEnabled: item.nightSurgeEnabled,
            nightSurgePercent: item.nightSurgePercent,
            holidaySurgeEnabled: item.holidaySurgeEnabled,
            holidaySurgePercent: item.holidaySurgePercent,
          }));
          setServices(mapped);
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

  const displayedServices = expanded ? services : services.slice(0, 4);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#334155" />
          </TouchableOpacity>

          <View style={styles.headerLogoWrap}>
            <Building2 size={18} color="#ea580c" strokeWidth={2.4} />
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
            onPress={() => router.push('/garage-owner/edit-profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.editLinkText}>Chỉnh sửa</Text>
          </TouchableOpacity>
        </View>

        {/* Cover Banner Card */}
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
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Cấu hình dịch vụ</Text>
          <Text style={styles.serviceCountBadge}>{services.filter((s) => s.enabled).length}/{services.length} Đang bật</Text>
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
                    <View style={[styles.serviceIconBox, { backgroundColor: svc.bgColor }]}>
                      <IconComp size={20} color={svc.color} strokeWidth={2.2} />
                    </View>

                    <View style={styles.serviceTextWrap}>
                      <Text style={styles.serviceTitle}>{svc.title}</Text>
                      <Text style={styles.serviceSubtitle}>{svc.subtitle}</Text>
                    </View>

                    <Switch
                      value={svc.enabled}
                      onValueChange={() => toggleService(svc.id)}
                      trackColor={{ false: '#cbd5e1', true: '#ffedd5' }}
                      thumbColor={svc.enabled ? '#ea580c' : '#ffffff'}
                    />
                  </TouchableOpacity>
                  {!isLast && <View style={styles.fieldDivider} />}
                </React.Fragment>
              );
            })}
          </View>
        )}

        {services.length > 4 && (
          <TouchableOpacity 
            style={styles.moreConfigBtn}
            activeOpacity={0.8}
            onPress={() => setExpanded(!expanded)}
          >
            <View style={styles.moreConfigBtnContent}>
              <Text style={styles.moreConfigBtnText}>
                {expanded ? 'Thu gọn cấu hình' : `Xem thêm cấu hình (${services.length} dịch vụ)`}
              </Text>
              {expanded ? (
                <ChevronUp size={18} color="#2563eb" strokeWidth={2.4} />
              ) : (
                <ChevronDown size={18} color="#2563eb" strokeWidth={2.4} />
              )}
            </View>
          </TouchableOpacity>
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
    gap: 10,
  },
  backBtn: {
    padding: 4,
    marginRight: 2,
  },
  headerLogoWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16a34a',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.1,
  },
  editLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c',
  },
  serviceCountBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  coverCard: {
    position: 'relative',
    height: 140,
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
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  bannerInfoBox: {
    position: 'absolute',
    bottom: 16,
    left: 16,
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
    gap: 2,
  },
  bannerGarageName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  bannerGarageId: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
      },
    }),
  },
  fieldRow: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  fieldValue: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  servicesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
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
    borderRadius: 22,
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
  moreConfigBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  moreConfigBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moreConfigBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
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

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Star, Truck, Bike } from 'lucide-react-native';
import { garageApi, GarageStaffDto, RescueVehicleDto } from '../../api/garageApi';
import { resolveFileUrl } from '../../api/axiosClient';

const BRAND = '#ea580c';
const INK = '#0f172a';
const SUB = '#64748b';
const MUTE = '#94a3b8';
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const KIND_LABEL: Record<string, string> = { TOW_TRUCK: 'Xe kéo', MOTORBIKE: 'Xe máy', VAN: 'Xe tải nhỏ' };
const isBusy = (s?: string) => s === 'BUSY';

const initials = (name?: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function GarageStaffScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'staff' | 'vehicle'>('staff');
  const [staff, setStaff] = useState<GarageStaffDto[]>([]);
  const [vehicles, setVehicles] = useState<RescueVehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, v] = await Promise.all([garageApi.listStaff(), garageApi.listVehicles()]);
      setStaff(s);
      setVehicles(v);
    } catch {
      /* lỗi mạng tạm thời — giữ dữ liệu cũ */
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải lại mỗi khi màn được focus (quay lại từ trang thêm → thấy mục mới ngay).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const goAdd = () => router.push(tab === 'staff' ? '/garage-owner/add-staff' : '/garage-owner/add-vehicle' as any);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đội cứu hộ</Text>
        <Text style={styles.headerSub}>Quản lý nhân viên và xe cứu hộ của gara</Text>
      </View>

      {/* Segmented Nhân viên | Xe */}
      <View style={styles.tabs}>
        {([
          { k: 'staff' as const, label: 'Nhân viên', n: staff.length },
          { k: 'vehicle' as const, label: 'Xe cứu hộ', n: vehicles.length },
        ]).map((t) => {
          const on = tab === t.k;
          return (
            <TouchableOpacity key={t.k} style={styles.tab} onPress={() => setTab(t.k)} activeOpacity={0.7}>
              <View style={styles.tabInner}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
                {!loading && <Text style={styles.tabCount}>{t.n}</Text>}
              </View>
              <View style={[styles.tabBar, on && styles.tabBarOn]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={BRAND} /></View>
        ) : tab === 'staff' ? (
          staff.length === 0 ? (
            <Text style={styles.empty}>Chưa có nhân viên. Bấm "Thêm nhân viên" để tạo tài khoản cho thợ.</Text>
          ) : (
            staff.map((s, i) => {
              const b = isBusy(s.status);
              const photo = s.avatarUrl && s.avatarUrl.trim() ? resolveFileUrl(s.avatarUrl) : null;
              return (
                <View key={s.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={[styles.mark, b && styles.dim]} />
                  ) : (
                    <View style={[styles.mark, styles.markInitials, b && styles.dim]}>
                      <Text style={styles.markText}>{initials(s.name)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {s.phone} · <Text style={b ? styles.stBusy : styles.stFree}>{b ? 'đang bận' : 'sẵn sàng'}</Text>
                    </Text>
                  </View>
                  {s.rating != null && (s.ratingCount ?? 0) > 0 && (
                    <View style={styles.rating}>
                      <Star size={13} color="#f59e0b" fill="#f59e0b" strokeWidth={0} />
                      <Text style={styles.ratingText}>{s.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )
        ) : vehicles.length === 0 ? (
          <Text style={styles.empty}>Chưa có xe cứu hộ. Bấm "Thêm xe cứu hộ" để thêm xe.</Text>
        ) : (
          vehicles.map((v, i) => {
            const b = isBusy(v.status);
            const KindIcon = v.vehicleKind === 'MOTORBIKE' ? Bike : Truck;
            const vImg = v.imageUrl && v.imageUrl.trim() ? resolveFileUrl(v.imageUrl) : null;
            return (
              <View key={v.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                {vImg ? (
                  <Image source={{ uri: vImg }} style={[styles.mark, styles.markSquare, b && styles.dim]} />
                ) : (
                  <View style={[styles.mark, styles.markSquare, b && styles.dim]}>
                    <KindIcon size={22} color="#475569" strokeWidth={2} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.plate} numberOfLines={1}>{v.licensePlate}</Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {KIND_LABEL[v.vehicleKind || ''] || 'Xe cứu hộ'} · <Text style={b ? styles.stBusy : styles.stFree}>{b ? 'đang bận' : 'sẵn sàng'}</Text>
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primary} onPress={goAdd} activeOpacity={0.9}>
          <Plus size={18} color="#ffffff" strokeWidth={2.6} />
          <Text style={styles.primaryText}>{tab === 'staff' ? 'Thêm nhân viên' : 'Thêm xe cứu hộ'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: INK, letterSpacing: -0.2 },
  headerSub: { fontSize: 12.5, fontWeight: '600', color: MUTE, marginTop: 2 },

  tabs: { flexDirection: 'row', paddingHorizontal: 20 },
  tab: { flex: 1 },
  tabInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingBottom: 10 },
  tabText: { fontSize: 14, fontWeight: '800', color: MUTE },
  tabTextOn: { color: INK },
  tabCount: { fontSize: 11.5, fontWeight: '800', color: MUTE },
  tabBar: { height: 2, backgroundColor: '#e2e8f0' },
  tabBarOn: { backgroundColor: BRAND, height: 2.5 },

  body: { paddingHorizontal: 20, paddingBottom: 20 },
  center: { paddingVertical: 40, alignItems: 'center' },
  empty: { fontSize: 13, fontWeight: '600', color: MUTE, textAlign: 'center', lineHeight: 20, paddingVertical: 40, paddingHorizontal: 20 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  mark: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e9eef4' },
  markSquare: { borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  markInitials: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  markText: { fontSize: 16, fontWeight: '900', color: '#334155', letterSpacing: 0.3 },
  dim: { opacity: 0.5 },

  title: { fontSize: 15, fontWeight: '800', color: INK },
  plate: { fontSize: 16, fontWeight: '700', color: INK, fontFamily: MONO, letterSpacing: 0.5 },
  sub: { fontSize: 12.5, fontWeight: '600', color: SUB, marginTop: 3 },
  stFree: { color: '#059669', fontWeight: '800' },
  stBusy: { color: '#d97706', fontWeight: '800' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '800', color: '#b45309' },

  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND, borderRadius: 14, height: 52 },
  primaryText: { fontSize: 15, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2 },
});

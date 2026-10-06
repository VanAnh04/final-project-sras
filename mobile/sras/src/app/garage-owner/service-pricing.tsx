import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StatusBar,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Tag,
  Route,
  Zap,
  Trash2,
  Plus
} from 'lucide-react-native';

import axiosClient from '../../api/axiosClient';

export default function ServicePricingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const serviceTitle = (params.title as string) || 'Kéo xe cứu hộ';
  const serviceSubtitle = (params.subtitle as string) || 'Quản lý chi phí cơ bản và phụ phí cho dịch vụ kéo xe cứu hộ.';

  const categoryName = (params.categoryName as string) || 'Danh mục chung';
  const categoryVehicleType = (params.categoryVehicleType as string) || 'BOTH';
  const minPrice = parseInt(params.minPrice as string, 10) || 0;
  const maxPrice = parseInt(params.maxPrice as string, 10) || 0;
  const unit = (params.unit as string) || 'LAN';

  const [baseFee, setBaseFee] = useState(params.price ? String(params.price) : '100000');

  const [distanceTiers, setDistanceTiers] = useState([
    { id: '1', range: '0 - 10', pricePerKm: '15.000' },
    { id: '2', range: '> 10', pricePerKm: '12.000' }
  ]);

  const [nightSurgeEnabled, setNightSurgeEnabled] = useState(params.nightSurgeEnabled === 'true');
  const [nightSurgePercent, setNightSurgePercent] = useState(params.nightSurgePercent ? String(params.nightSurgePercent) : '20');

  const [holidaySurgeEnabled, setHolidaySurgeEnabled] = useState(params.holidaySurgeEnabled === 'true');
  const [holidaySurgePercent, setHolidaySurgePercent] = useState(params.holidaySurgePercent ? String(params.holidaySurgePercent) : '50');

  const addDistanceTier = () => {
    const newId = String(Date.now());
    setDistanceTiers(prev => [
      ...prev,
      { id: newId, range: '10 - 20', pricePerKm: '10.000' }
    ]);
  };

  const removeDistanceTier = (id: string) => {
    setDistanceTiers(prev => prev.filter(t => t.id !== id));
  };

  const updateTierRange = (id: string, text: string) => {
    setDistanceTiers(prev =>
      prev.map(t => (t.id === id ? { ...t, range: text } : t))
    );
  };

  const updateTierPrice = (id: string, text: string) => {
    setDistanceTiers(prev =>
      prev.map(t => (t.id === id ? { ...t, pricePerKm: text } : t))
    );
  };

  const handleSave = async () => {
    const numericPrice = parseInt(baseFee.replace(/[^0-9]/g, ''), 10) || 100000;
    const serviceId = params.id || '1';

    if (minPrice > 0 && numericPrice < minPrice) {
      Alert.alert('Giá không hợp lệ', `Mức giá không được thấp hơn giá sàn quy định bởi Admin (${minPrice.toLocaleString('vi-VN')} VNĐ).`);
      return;
    }
    if (maxPrice > 0 && numericPrice > maxPrice) {
      Alert.alert('Giá không hợp lệ', `Mức giá không được vượt quá giá trần quy định bởi Admin (${maxPrice.toLocaleString('vi-VN')} VNĐ).`);
      return;
    }

    try {
      await axiosClient.put(`/garages/me/services/${serviceId}/pricing`, {
        price: numericPrice,
        isActive: true,
        distanceTiersJson: JSON.stringify(distanceTiers),
        nightSurgeEnabled,
        nightSurgePercent: parseInt(nightSurgePercent, 10) || 0,
        holidaySurgeEnabled,
        holidaySurgePercent: parseInt(holidaySurgePercent, 10) || 0,
      });
      Alert.alert('Thành công', 'Đã lưu thiết lập bảng giá dịch vụ.', [
        { text: 'OK', onPress: () => router.replace('/garage-owner/garage-profile') }
      ]);
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || 'Không thể lưu bảng giá dịch vụ.';
      Alert.alert('Thông báo', errorMsg);
    }
  };

  const handleBack = () => {
    router.replace('/garage-owner/garage-profile');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#ea580c" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thiết lập Bảng giá</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category & Service Header Box */}
        <View style={styles.titleSection}>
          <View style={styles.categoryBadgeWrap}>
            <Text style={styles.categoryBadgeText}>Danh mục: {categoryName}</Text>
            <Text style={styles.vehicleBadgeText}>
              {categoryVehicleType === 'CAR' ? '🚗 Ô tô' : categoryVehicleType === 'MOTORBIKE' ? '🏍️ Xe máy' : '🚗🏍️ Cả hai'}
            </Text>
          </View>
          <Text style={styles.mainTitle}>{serviceTitle}</Text>
          <Text style={styles.subTitle}>
            {serviceSubtitle.includes('Quản lý')
              ? serviceSubtitle
              : `Quản lý chi phí cơ bản và phụ phí cho dịch vụ ${serviceTitle.toLowerCase()}.`}
          </Text>

          {minPrice > 0 && maxPrice > 0 && (
            <View style={styles.priceBandAlert}>
              <Text style={styles.priceBandAlertTitle}>Khung giá sàn - trần Ban quản trị quy định:</Text>
              <Text style={styles.priceBandAlertValue}>
                {minPrice.toLocaleString('vi-VN')} ₫ – {maxPrice.toLocaleString('vi-VN')} ₫ ({unit === 'KM' ? '₫/km' : '₫/lần'})
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconCircle, { backgroundColor: '#ea580c' }]}>
              <Tag size={18} color="#ffffff" strokeWidth={2.2} />
            </View>
            <Text style={styles.cardTitle}>Giá cơ bản của Gara</Text>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.inputLabel}>Mức giá áp dụng ({unit === 'KM' ? 'VND / KM' : 'VND / Lần'})</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                value={baseFee}
                onChangeText={setBaseFee}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.currencySuffix}>VNĐ</Text>
            </View>
            <Text style={styles.helperText}>Mức giá gara áp dụng cho khách hàng khi yêu cầu dịch vụ.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#2563eb' }]}>
                <Route size={18} color="#ffffff" strokeWidth={2.2} />
              </View>
              <Text style={styles.cardTitle}>Phụ phí khoảng cách</Text>
            </View>

            <TouchableOpacity onPress={addDistanceTier} activeOpacity={0.7} style={styles.addTierBtn}>
              <Text style={styles.addTierText}>+ Thêm mốc</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tiersContainer}>
            {distanceTiers.map((tier) => (
              <View key={tier.id} style={styles.tierBox}>
                <View style={styles.tierField}>
                  <Text style={styles.tierLabel}>Khoảng cách (km)</Text>
                  <View style={styles.tierInputBox}>
                    <TextInput
                      style={styles.tierTextInput}
                      value={tier.range}
                      onChangeText={(text) => updateTierRange(tier.id, text)}
                      placeholder="0 - 10"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <View style={[styles.tierField, { marginTop: 10 }]}>
                  <Text style={styles.tierLabel}>Giá mỗi km</Text>
                  <View style={styles.tierInputBox}>
                    <TextInput
                      style={styles.tierTextInput}
                      value={tier.pricePerKm}
                      onChangeText={(text) => updateTierPrice(tier.id, text)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                    />
                    <Text style={styles.tierCurrencySuffix}>VNĐ</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => removeDistanceTier(tier.id)}
                  style={styles.deleteTierBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconCircle, { backgroundColor: '#eab308' }]}>
              <Zap size={18} color="#ffffff" strokeWidth={2.2} />
            </View>
            <Text style={styles.cardTitle}>Phụ phí đặc biệt (Surge Pricing)</Text>
          </View>

          <View style={styles.surgeItem}>
            <View style={styles.surgeHeaderRow}>
              <Text style={styles.surgeTitle}>Phụ phí ban đêm</Text>
              <Switch
                value={nightSurgeEnabled}
                onValueChange={setNightSurgeEnabled}
                trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                thumbColor="#ffffff"
              />
            </View>
            <Text style={styles.surgeDescription}>
              Áp dụng thêm phí cho các dịch vụ diễn ra từ 22:00 - 06:00.
            </Text>
            <View style={[styles.inputBox, styles.percentInputBox]}>
              <TextInput
                style={styles.textInput}
                value={nightSurgePercent}
                onChangeText={setNightSurgePercent}
                keyboardType="numeric"
                editable={nightSurgeEnabled}
              />
              <Text style={styles.currencySuffix}>%</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.surgeItem}>
            <View style={styles.surgeHeaderRow}>
              <Text style={styles.surgeTitle}>Phụ phí lễ/Tết</Text>
              <Switch
                value={holidaySurgeEnabled}
                onValueChange={setHolidaySurgeEnabled}
                trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                thumbColor="#ffffff"
              />
            </View>
            <Text style={styles.surgeDescription}>
              Tự động áp dụng mức giá nhân hệ số trong các ngày nghỉ lễ quốc gia.
            </Text>
            <View style={[styles.inputBox, styles.percentInputBox]}>
              <TextInput
                style={styles.textInput}
                value={holidaySurgePercent}
                onChangeText={setHolidaySurgePercent}
                keyboardType="numeric"
                editable={holidaySurgeEnabled}
              />
              <Text style={styles.currencySuffix}>%</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.auditText}>
            Cập nhật lần cuối: 12/05/2024 lúc 14:30 bởi Admin
          </Text>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
          </TouchableOpacity>
        </View>
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
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ea580c',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  titleSection: {
    marginTop: 4,
    gap: 6,
  },
  categoryBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  vehicleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  priceBandAlert: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 10,
    gap: 2,
    marginTop: 4,
  },
  priceBandAlertTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
    textTransform: 'uppercase',
  },
  priceBandAlertValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9a3412',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.1,
  },
  subTitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 14,
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  addTierBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addTierText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  fieldWrap: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 0,
  },
  currencySuffix: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 6,
  },
  helperText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  tiersContainer: {
    gap: 12,
  },
  tierBox: {
    position: 'relative',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tierField: {
    gap: 4,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tierInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  tierTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 0,
  },
  tierCurrencySuffix: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 6,
  },
  deleteTierBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    padding: 6,
  },
  surgeItem: {
    gap: 6,
  },
  surgeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  surgeTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  surgeDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  percentInputBox: {
    width: 110,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
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
  auditText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4,
  },
  cancelBtn: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#334155',
  },
  saveBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4500',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});

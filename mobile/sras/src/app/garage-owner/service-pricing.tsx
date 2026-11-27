import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Tag,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Info,
  Package,
} from 'lucide-react-native';

import axiosClient from '../../api/axiosClient';

export default function ServicePricingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const serviceId = (params.id as string) || '1';
  const serviceTitle = (params.title as string) || 'Dịch vụ cứu hộ';
  const serviceSubtitle = (params.subtitle as string) || 'Quản lý mức giá áp dụng cho dịch vụ.';

  const categoryName = (params.categoryName as string) || 'Danh mục chung';
  const categoryVehicleType = (params.categoryVehicleType as string) || 'BOTH';
  const minPrice = parseInt(params.minPrice as string, 10) || 0;
  const maxPrice = parseInt(params.maxPrice as string, 10) || 0;
  const costPrice = parseInt(params.costPrice as string, 10) || 0;
  const itemType = (params.itemType as string) || 'LABOR';
  const unit = (params.unit as string) || 'LAN';
  const unitLabel = unit === 'KM' ? 'km' : (unit === 'LAN' ? 'lần' : unit);

  // Cost price (Giá vốn / nhập vào)
  const initialCostPrice = costPrice > 0 ? costPrice : 0;
  const [costPriceInput, setCostPriceInput] = useState(
    initialCostPrice > 0 ? initialCostPrice.toLocaleString('vi-VN') : ''
  );

  const numericCostPrice = useMemo(() => {
    const rawDigits = costPriceInput.replace(/\D/g, '');
    return rawDigits ? parseInt(rawDigits, 10) : 0;
  }, [costPriceInput]);

  const handleCostPriceChange = (text: string) => {
    const rawDigits = text.replace(/\D/g, '');
    if (!rawDigits) {
      setCostPriceInput('');
      return;
    }
    const val = parseInt(rawDigits, 10);
    setCostPriceInput(val.toLocaleString('vi-VN'));
  };

  // Initial price
  const initialPrice = parseInt(params.price as string, 10) || (minPrice > 0 ? minPrice : 100000);
  const [priceInput, setPriceInput] = useState(
    initialPrice > 0 ? initialPrice.toLocaleString('vi-VN') : ''
  );
  const [isActive, setIsActive] = useState<boolean>(params.isActive === 'true');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đồng bộ lại toàn bộ state khi params thay đổi (chuyển qua dịch vụ khác)
  // Vì trong Expo Router (Tabs layout), component không unmount nên useState không tự reset
  useEffect(() => {
    const rawCost = parseInt(params.costPrice as string, 10) || 0;
    setCostPriceInput(rawCost > 0 ? rawCost.toLocaleString('vi-VN') : '');

    const p = parseInt(params.price as string, 10);
    const m = parseInt(params.minPrice as string, 10) || 0;
    const rawPrice = !isNaN(p) && p > 0 ? p : (m > 0 ? m : 100000);
    setPriceInput(rawPrice > 0 ? rawPrice.toLocaleString('vi-VN') : '');

    setIsActive(params.isActive !== 'false');
  }, [params.id, params.price, params.costPrice, params.isActive, params.minPrice]);

  // Parse numeric price from input
  const numericPrice = useMemo(() => {
    const rawDigits = priceInput.replace(/\D/g, '');
    return rawDigits ? parseInt(rawDigits, 10) : 0;
  }, [priceInput]);

  // Validation
  const validation = useMemo(() => {
    if (!numericPrice || numericPrice <= 0) {
      return {
        isValid: false,
        type: 'EMPTY',
        message: 'Vui lòng nhập mức giá áp dụng cho dịch vụ.',
      };
    }
    if (minPrice > 0 && numericPrice < minPrice) {
      return {
        isValid: false,
        type: 'BELOW_MIN',
        message: `Mức giá thấp hơn giá sàn quy định: ${minPrice.toLocaleString('vi-VN')} ₫.`,
      };
    }
    if (maxPrice > 0 && numericPrice > maxPrice) {
      return {
        isValid: false,
        type: 'ABOVE_MAX',
        message: `Mức giá vượt quá giá trần quy định: ${maxPrice.toLocaleString('vi-VN')} ₫.`,
      };
    }
    return {
      isValid: true,
      type: 'VALID',
      message: 'Mức giá hợp lệ, nằm trong khung quy định của hệ thống.',
    };
  }, [numericPrice, minPrice, maxPrice]);

  const handlePriceChange = (text: string) => {
    const rawDigits = text.replace(/\D/g, '');
    if (!rawDigits) {
      setPriceInput('');
      return;
    }
    const val = parseInt(rawDigits, 10);
    setPriceInput(val.toLocaleString('vi-VN'));
  };

  const setPresetPrice = (val: number) => {
    setPriceInput(val.toLocaleString('vi-VN'));
  };

  const avgPrice = useMemo(() => {
    if (minPrice > 0 && maxPrice >= minPrice) {
      return Math.round((minPrice + maxPrice) / 2 / 1000) * 1000;
    }
    return minPrice;
  }, [minPrice, maxPrice]);

  const handleSave = async () => {
    if (!validation.isValid) {
      Alert.alert('Giá không hợp lệ', validation.message);
      return;
    }

    try {
      setIsSubmitting(true);
      await axiosClient.put(`/garages/me/services/${serviceId}/pricing`, {
        price: numericPrice,
        costPrice: numericCostPrice,
        isActive: isActive,
      });

      Alert.alert(
        'Thành công',
        `Đã lưu bảng giá dịch vụ "${serviceTitle}": ${numericPrice.toLocaleString('vi-VN')} ₫/${unitLabel}.`,
        [
          {
            text: 'Đóng',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/garage-owner/inventory');
              }
            },
          },
        ]
      );
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.message ||
        e?.message ||
        'Không thể lưu bảng giá dịch vụ. Vui lòng kiểm tra lại.';
      Alert.alert('Không thể lưu bảng giá', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/garage-owner/inventory');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0f172a" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thiết lập Bảng giá</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service & Category Header Info */}
        <View style={styles.infoCard}>
          <View style={styles.badgesRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryName}</Text>
            </View>
            <View style={styles.vehicleBadge}>
              <Text style={styles.vehicleBadgeText}>
                {categoryVehicleType === 'CAR'
                  ? '🚗 Ô tô'
                  : categoryVehicleType === 'MOTORBIKE'
                  ? '🏍️ Xe máy'
                  : '🚗🏍️ Xe máy & Ô tô'}
              </Text>
            </View>
          </View>

          <Text style={styles.serviceName}>{serviceTitle}</Text>
        </View>

        {/* Khung giá quy định Banner */}
        <View style={styles.bandCard}>
          <View style={styles.bandHeader}>
            <ShieldCheck size={18} color="#c2410c" strokeWidth={2.2} />
            <Text style={styles.bandHeaderTitle}>Khung giá quy định hệ thống</Text>
            <View style={styles.unitPill}>
              <Text style={styles.unitPillText}>Đơn vị: ₫/{unitLabel}</Text>
            </View>
          </View>

          <View style={styles.bandColumns}>
            <View style={styles.bandCol}>
              <Text style={styles.bandColLabel}>GIÁ VỐN</Text>
              <Text style={[styles.bandColValue, { color: '#c2410c' }]}>
                {costPrice > 0 ? `${costPrice.toLocaleString('vi-VN')} đ` : '0 đ'}
              </Text>
            </View>
            <View style={styles.bandDivider} />
            <View style={styles.bandCol}>
              <Text style={styles.bandColLabel}>GIÁ SÀN</Text>
              <Text style={[styles.bandColValue, { color: '#c2410c' }]}>
                {minPrice.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View style={styles.bandDivider} />
            <View style={styles.bandCol}>
              <Text style={styles.bandColLabel}>GIÁ TRẦN</Text>
              <Text style={[styles.bandColValue, { color: '#c2410c' }]}>
                {maxPrice.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>
        </View>

        {/* Card 1: Cấu hình Giá vốn nhập kho */}
        <View style={styles.card}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.iconCircle}>
              <Package size={17} color="#ffffff" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Giá vốn nhập vào</Text>
              <Text style={styles.cardSub}>Đơn giá nhập kho từ nhà cung cấp</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                value={costPriceInput}
                onChangeText={handleCostPriceChange}
                keyboardType="numeric"
                placeholder="Nhập giá vốn nhập vào (VD: 150.000)"
                placeholderTextColor="#94a3b8"
                selectTextOnFocus
              />
              <Text style={styles.currencySuffix}>₫ / {unitLabel}</Text>
            </View>
          </View>
        </View>

        {numericCostPrice > 0 && numericPrice > 0 && numericPrice < numericCostPrice && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#fef2f2',
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#fecaca',
            marginHorizontal: 16,
            marginBottom: 12,
          }}>
            <AlertTriangle size={18} color="#dc2626" />
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: '#b91c1c' }}>
              Cảnh báo: Giá sửa chữa ({numericPrice.toLocaleString('vi-VN')} ₫) thấp hơn giá vốn nhập vào ({numericCostPrice.toLocaleString('vi-VN')} ₫). Gara có nguy cơ chịu lỗ!
            </Text>
          </View>
        )}

        {/* Card 2: Cấu hình giá sửa chữa / bán niêm yết của Gara */}
        <View style={styles.card}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.iconCircle}>
              <Tag size={17} color="#ffffff" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Giá sửa chữa / bán niêm yết</Text>
              <Text style={styles.cardSub}>Đơn giá Gara áp dụng khi cứu hộ (nằm trong khung sàn - trần)</Text>
            </View>
          </View>

          {/* Input Box */}
          <View style={styles.inputContainer}>
            <View
              style={[
                styles.inputBox,
                validation.type === 'VALID' && styles.inputBoxValid,
                (validation.type === 'BELOW_MIN' || validation.type === 'ABOVE_MAX') &&
                  styles.inputBoxError,
              ]}
            >
              <TextInput
                style={styles.textInput}
                value={priceInput}
                onChangeText={handlePriceChange}
                keyboardType="numeric"
                placeholder="Nhập giá tiền"
                placeholderTextColor="#94a3b8"
                selectTextOnFocus
              />
              <Text style={styles.currencySuffix}>₫ / {unitLabel}</Text>
            </View>
          </View>

          {/* Quick preset buttons */}
          {minPrice > 0 && maxPrice > 0 && (
            <View style={styles.presetsWrap}>
              <Text style={styles.presetsLabel}>Chọn nhanh:</Text>
              <View style={styles.presetsRow}>
                <TouchableOpacity
                  style={[
                    styles.presetBtn,
                    numericPrice === minPrice && styles.presetBtnActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setPresetPrice(minPrice)}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      numericPrice === minPrice && styles.presetBtnTextActive,
                    ]}
                  >
                    Sàn: {minPrice.toLocaleString('vi-VN')}₫
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetBtn,
                    numericPrice === avgPrice && styles.presetBtnActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setPresetPrice(avgPrice)}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      numericPrice === avgPrice && styles.presetBtnTextActive,
                    ]}
                  >
                    TB: {avgPrice.toLocaleString('vi-VN')}₫
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetBtn,
                    numericPrice === maxPrice && styles.presetBtnActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setPresetPrice(maxPrice)}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      numericPrice === maxPrice && styles.presetBtnTextActive,
                    ]}
                  >
                    Trần: {maxPrice.toLocaleString('vi-VN')}₫
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Real-time Validation Banner */}
          <View
            style={[
              styles.feedbackBanner,
              validation.type === 'VALID'
                ? styles.feedbackBannerValid
                : validation.type === 'EMPTY'
                ? styles.feedbackBannerNeutral
                : styles.feedbackBannerError,
            ]}
          >
            {validation.type === 'VALID' ? (
              <CheckCircle2 size={16} color="#15803d" strokeWidth={2.4} />
            ) : (
              <AlertTriangle
                size={16}
                color={validation.type === 'EMPTY' ? '#64748b' : '#dc2626'}
                strokeWidth={2.4}
              />
            )}
            <Text
              style={[
                styles.feedbackText,
                validation.type === 'VALID'
                  ? styles.feedbackTextValid
                  : validation.type === 'EMPTY'
                  ? styles.feedbackTextNeutral
                  : styles.feedbackTextError,
              ]}
            >
              {validation.message}
            </Text>
          </View>
        </View>

        {/* Nút Hành động */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!validation.isValid || isSubmitting) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!validation.isValid || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu cấu hình bảng giá</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleBack}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Quay lại</Text>
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
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
      android: { elevation: 2 },
      default: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)' },
    }),
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  vehicleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vehicleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  serviceName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  serviceDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  bandCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    gap: 12,
  },
  bandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bandHeaderTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#9a3412',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  unitPill: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unitPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  bandColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  bandCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  bandDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#fed7aa',
  },
  bandColLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  bandColValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  bandHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bandHintText: {
    fontSize: 11.5,
    color: '#9a3412',
    flex: 1,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
      android: { elevation: 2 },
      default: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)' },
    }),
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  inputContainer: {
    marginTop: 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputBoxValid: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffdfb',
  },
  inputBoxError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    paddingVertical: 0,
  },
  currencySuffix: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
    marginLeft: 8,
  },
  presetsWrap: {
    gap: 6,
  },
  presetsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  presetBtnTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  feedbackBannerValid: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  feedbackBannerError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  feedbackBannerNeutral: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  feedbackText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  feedbackTextValid: {
    color: '#15803d',
  },
  feedbackTextError: {
    color: '#b91c1c',
  },
  feedbackTextNeutral: {
    color: '#64748b',
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
      android: { elevation: 2 },
      default: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)' },
    }),
  },
  switchTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  switchSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  actionSection: {
    gap: 10,
    marginTop: 6,
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    ...Platform.select({
      ios: { shadowColor: '#ea580c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 3 },
      default: { boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)' },
    }),
  },
  saveBtnDisabled: {
    backgroundColor: '#fdba74',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  cancelBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
});

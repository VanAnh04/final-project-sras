import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Package,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  Sliders,
  History,
  X,
  Layers,
  Car,
  Bike,
} from 'lucide-react-native';
import { garageApi } from '../../api/garageApi';
import { formatVnd } from '../../utils/rescueFee';

const BRAND = '#ea580c';
const GREEN = '#059669';
const BLUE = '#2563eb';
const RED = '#dc2626';
const INK = '#0f172a';
const SUB = '#64748b';

const PRESET_CATEGORIES = [
  'Ắc quy & Hệ thống điện',
  'Lốp, Săm & Bánh xe',
  'Nhiên liệu & Dầu nhớt',
  'Hệ thống phanh',
  'Động cơ & Truyền động',
  'Phụ tùng cứu hộ khác',
];

const PRESET_UNITS = ['Cái', 'Bình', 'Chiếc', 'Bộ', 'Lít', 'Chai'];

export default function GarageOwnerInventoryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LEDGER'>('STOCK');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'RESERVED'>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | 'CAR' | 'MOTORBIKE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [summary, setSummary] = useState<any>({
    totalSkuCount: 0,
    totalOnHandUnits: 0,
    totalReservedUnits: 0,
    totalAvailableUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalInventoryCostValue: 0,
  });
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Modal 1: Nhập kho / Kiểm kê / Báo hỏng
  const [adjustItem, setAdjustItem] = useState<any | null>(null);
  const [txType, setTxType] = useState<'INBOUND' | 'ADJUSTMENT' | 'DAMAGED'>('INBOUND');
  const [qtyInput, setQtyInput] = useState('10');
  const [costInput, setCostInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [minStockInput, setMinStockInput] = useState('5');
  const [noteInput, setNoteInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal 2: Thêm Phụ tùng Mới vào Kho Gara
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState(PRESET_CATEGORIES[0]);
  const [newVehicleType, setNewVehicleType] = useState<'BOTH' | 'CAR' | 'MOTORBIKE'>('BOTH');
  const [newUnit, setNewUnit] = useState('Cái');
  const [newInitialQty, setNewInitialQty] = useState('10');
  const [newMinStock, setNewMinStock] = useState('5');
  const [newCostPrice, setNewCostPrice] = useState('100000');
  const [newSellingPrice, setNewSellingPrice] = useState('150000');
  const [newNote, setNewNote] = useState('');
  const [creatingItem, setCreatingItem] = useState(false);

  const fetchInventory = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const data = await garageApi.getMyInventory();
      if (data) {
        if (data.summary) setSummary(data.summary);
        setItems(Array.isArray(data.items) ? data.items : []);
        setTransactions(Array.isArray(data.recentTransactions) ? data.recentTransactions : []);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể tải dữ liệu kho phụ tùng');
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
      const timer = setInterval(() => {
        fetchInventory(true);
      }, 3000);
      return () => clearInterval(timer);
    }, [fetchInventory])
  );

  const handleSyncCatalog = async () => {
    try {
      setSyncing(true);
      await garageApi.syncInventoryCatalog();
      await fetchInventory(true);
      Alert.alert('Thành công', 'Đã đồng bộ đầy đủ danh mục phụ tùng chuẩn từ Sàn vào kho Gara!');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể đồng bộ danh mục');
    } finally {
      setSyncing(false);
    }
  };

  // Trích xuất danh sách các nhóm phân loại phụ tùng thực tế đang có trong kho kèm số lượng mã
  const categoryOptions = useMemo(() => {
    const countMap = new Map<string, number>();
    items.forEach(item => {
      const cat = (item.categoryName || 'Phụ tùng khác').trim();
      countMap.set(cat, (countMap.get(cat) || 0) + 1);
    });
    return Array.from(countMap.entries()).map(([name, count]) => ({ name, count }));
  }, [items]);

  const openAdjustModal = (item: any, mode: 'INBOUND' | 'ADJUSTMENT' | 'DAMAGED') => {
    setAdjustItem(item);
    setTxType(mode);
    setQtyInput(mode === 'ADJUSTMENT' ? String(item.onHandQty) : mode === 'INBOUND' ? '10' : '1');
    setCostInput(String(item.costPrice || 0));
    setPriceInput(String(item.sellingPrice || 0));
    setMinStockInput(String(item.minStockQty ?? 5));
    setNoteInput('');
  };

  const handleConfirmAdjust = async () => {
    if (!adjustItem) return;
    Keyboard.dismiss();
    const qty = parseInt(qtyInput.replace(/\D/g, ''), 10);
    if (isNaN(qty) || (txType !== 'ADJUSTMENT' && qty <= 0) || qty < 0) {
      Alert.alert('Số lượng không hợp lệ', 'Vui lòng nhập số lượng lớn hơn 0.');
      return;
    }

    try {
      setSubmitting(true);
      await garageApi.adjustInventoryStock(adjustItem.id, {
        txType,
        quantity: qty,
        unitCost: parseInt(costInput.replace(/\D/g, ''), 10) || adjustItem.costPrice,
        sellingPrice: parseInt(priceInput.replace(/\D/g, ''), 10) || adjustItem.sellingPrice,
        minStockQty: parseInt(minStockInput.replace(/\D/g, ''), 10) || 5,
        note: noteInput.trim(),
      });
      setAdjustItem(null);
      await fetchInventory(true);
    } catch (e: any) {
      Alert.alert('Không thể cập nhật kho', e?.response?.data?.message || e?.message || 'Vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setNewName('');
    setNewSku('');
    setNewCategory(categoryOptions.length > 0 ? categoryOptions[0].name : PRESET_CATEGORIES[0]);
    setNewVehicleType('BOTH');
    setNewUnit('Cái');
    setNewInitialQty('10');
    setNewMinStock('5');
    setNewCostPrice('100000');
    setNewSellingPrice('150000');
    setNewNote('Nhập kho phụ tùng mới');
    setCreateModalVisible(true);
  };

  const handleConfirmCreate = async () => {
    Keyboard.dismiss();
    if (!newName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên phụ tùng / vật tư.');
      return;
    }

    const initQty = parseInt(newInitialQty.replace(/\D/g, ''), 10) || 0;
    const minStock = parseInt(newMinStock.replace(/\D/g, ''), 10) || 5;
    const cost = parseInt(newCostPrice.replace(/\D/g, ''), 10) || 0;
    const sell = parseInt(newSellingPrice.replace(/\D/g, ''), 10) || cost;

    try {
      setCreatingItem(true);
      await garageApi.createInventoryItem({
        name: newName.trim(),
        skuCode: newSku.trim().toUpperCase(),
        categoryName: newCategory.trim() || 'Phụ tùng cứu hộ',
        vehicleType: newVehicleType,
        unitLabel: newUnit.trim() || 'Cái',
        initialQty: initQty,
        minStockQty: minStock,
        costPrice: cost,
        sellingPrice: sell,
        note: newNote.trim() || 'Thêm mới phụ tùng vào kho Gara',
      });
      setCreateModalVisible(false);
      await fetchInventory(true);
      Alert.alert('Thành công', `Đã thêm phụ tùng "${newName.trim()}" vào kho Gara!`);
    } catch (e: any) {
      Alert.alert('Không thể thêm phụ tùng', e?.response?.data?.message || e?.message || 'Vui lòng thử lại');
    } finally {
      setCreatingItem(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (stockFilter === 'LOW' && item.stockStatus === 'OK') return false;
      if (stockFilter === 'RESERVED' && (!item.reservedQty || item.reservedQty <= 0)) return false;
      if (vehicleFilter !== 'ALL' && item.vehicleType !== 'BOTH' && item.vehicleType !== vehicleFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL' && (item.categoryName || 'Phụ tùng khác').trim() !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = item.name?.toLowerCase().includes(q);
        const mSku = item.skuCode?.toLowerCase().includes(q);
        const mCat = item.categoryName?.toLowerCase().includes(q);
        if (!mName && !mSku && !mCat) return false;
      }
      return true;
    }).sort((a, b) => {
      const resA = a.reservedQty || 0;
      const resB = b.reservedQty || 0;
      if (resA !== resB) return resB - resA;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [items, stockFilter, vehicleFilter, categoryFilter, searchQuery]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header có cả nút + Thêm phụ tùng và Đồng bộ */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={INK} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Kho Phụ tùng & Vật tư
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Giữ & trừ kho tự động theo đơn cứu hộ
          </Text>
        </View>

        <TouchableOpacity onPress={openCreateModal} style={styles.addHeaderBtn} activeOpacity={0.85}>
          <Plus size={15} color="#ffffff" strokeWidth={2.6} />
          <Text style={styles.addHeaderBtnText}>Thêm mới</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSyncCatalog} disabled={syncing} style={styles.syncBtn}>
          <RefreshCw size={14} color={BRAND} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 85 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchInventory(true);
            }}
          />
        }
      >
        {/* 3 Ô KPI */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
            <Text style={[styles.kpiLabel, { color: GREEN }]}>KHẢ DỤNG</Text>
            <Text style={[styles.kpiValue, { color: GREEN }]}>{summary.totalAvailableUnits}</Text>
            <Text style={styles.kpiSub}>{summary.totalSkuCount} mã phụ tùng</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.kpiLabel, { color: BLUE }]}>ĐANG GIỮ ĐƠN</Text>
            <Text style={[styles.kpiValue, { color: BLUE }]}>{summary.totalReservedUnits}</Text>
            <Text style={styles.kpiSub}>Chờ khách duyệt</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}>
            <Text style={[styles.kpiLabel, { color: RED }]}>SẮP HẾT / HẾT</Text>
            <Text style={[styles.kpiValue, { color: RED }]}>
              {(summary.lowStockCount || 0) + (summary.outOfStockCount || 0)}
            </Text>
            <Text style={styles.kpiSub}>{summary.outOfStockCount || 0} mã hết hàng</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'STOCK' && styles.tabBtnActive]}
            onPress={() => setActiveTab('STOCK')}
          >
            <Package size={16} color={activeTab === 'STOCK' ? '#ffffff' : SUB} />
            <Text style={[styles.tabBtnText, activeTab === 'STOCK' && styles.tabBtnTextActive]}>
              Tồn kho ({items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'LEDGER' && styles.tabBtnActive]}
            onPress={() => setActiveTab('LEDGER')}
          >
            <History size={16} color={activeTab === 'LEDGER' ? '#ffffff' : SUB} />
            <Text style={[styles.tabBtnText, activeTab === 'LEDGER' && styles.tabBtnTextActive]}>
              Sổ cái Xuất/Nhập ({transactions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'STOCK' ? (
          <>
            {/* Ô tìm kiếm + Nút Thêm Phụ Tùng nhanh */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={[styles.searchBox, { flex: 1, marginBottom: 0 }]}>
                <Search size={16} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm tên phụ tùng, mã SKU..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.inlineAddBtn} onPress={openCreateModal} activeOpacity={0.85}>
                <Plus size={16} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.inlineAddBtnText}>Thêm phụ tùng</Text>
              </TouchableOpacity>
            </View>

            {/* Hàng 1: Lọc theo Loại phương tiện & Trạng thái tồn */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
            >
              {[
                { key: 'ALL', label: `Tất cả (${items.length})` },
                {
                  key: 'LOW',
                  label: `⚠️ Sắp hết / Hết (${(summary.lowStockCount || 0) + (summary.outOfStockCount || 0)})`,
                },
                { key: 'RESERVED', label: `🔒 Đang giữ đơn (${summary.totalReservedUnits || 0})` },
              ].map((f: any) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setStockFilter(f.key)}
                  style={[styles.filterChip, stockFilter === f.key && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, stockFilter === f.key && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Lọc theo loại xe */}
              {[
                { key: 'CAR', label: '🚗 Ô tô' },
                { key: 'MOTORBIKE', label: '🏍️ Xe máy' },
              ].map((vf: any) => {
                const isSelected = vehicleFilter === vf.key;
                return (
                  <TouchableOpacity
                    key={vf.key}
                    onPress={() => setVehicleFilter(isSelected ? 'ALL' : vf.key)}
                    style={[styles.filterChip, isSelected && styles.filterChipBlueActive]}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {vf.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Hàng 2: PHÂN LOẠI PHỤ TÙNG (Danh mục phụ tùng ngang dễ lọc) */}
            {categoryOptions.length > 0 && (
              <View style={styles.categoryFilterContainer}>
                <View style={styles.categoryFilterLabelRow}>
                  <Layers size={13} color={BRAND} />
                  <Text style={styles.categoryFilterTitle}>Phân loại phụ tùng:</Text>
                  {categoryFilter !== 'ALL' && (
                    <TouchableOpacity onPress={() => setCategoryFilter('ALL')} style={{ marginLeft: 'auto' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: BRAND }}>Bỏ lọc ✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingTop: 4 }}
                >
                  <TouchableOpacity
                    onPress={() => setCategoryFilter('ALL')}
                    style={[
                      styles.catChip,
                      categoryFilter === 'ALL' && styles.catChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        categoryFilter === 'ALL' && styles.catChipTextActive,
                      ]}
                    >
                      Tất cả nhóm ({items.length})
                    </Text>
                  </TouchableOpacity>

                  {categoryOptions.map(cat => {
                    const isSelected = categoryFilter === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.name}
                        onPress={() => setCategoryFilter(isSelected ? 'ALL' : cat.name)}
                        style={[styles.catChip, isSelected && styles.catChipActive]}
                      >
                        <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                          {cat.name} ({cat.count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={BRAND} size="large" />
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Không có phụ tùng nào khớp bộ lọc</Text>
                <TouchableOpacity
                  onPress={() => {
                    setCategoryFilter('ALL');
                    setVehicleFilter('ALL');
                    setStockFilter('ALL');
                    setSearchQuery('');
                  }}
                  style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff7ed', borderRadius: 8 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: BRAND }}>Đặt lại bộ lọc</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredItems.map(item => {
                const isOut = item.stockStatus === 'OUT_OF_STOCK';
                const isLow = item.stockStatus === 'LOW_STOCK';
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View style={styles.skuBadgeWrap}>
                            <Text style={styles.skuBadgeText} numberOfLines={1}>
                              {item.skuCode}
                            </Text>
                          </View>
                          <View style={styles.catBadgeWrap}>
                            <Text style={styles.catBadgeText} numberOfLines={1}>
                              {item.categoryName || 'Phụ tùng'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.itemName}>{item.name}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isOut
                            ? { backgroundColor: '#fef2f2', borderColor: '#fecaca' }
                            : isLow
                            ? { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
                            : { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: isOut ? RED : isLow ? '#d97706' : GREEN,
                          }}
                        >
                          {isOut ? 'Hết hàng' : isLow ? 'Sắp hết' : 'Đủ hàng'}
                        </Text>
                      </View>
                    </View>

                    {/* 3 Cột số lượng */}
                    <View style={styles.qtyBoxRow}>
                      <View style={styles.qtyBox}>
                        <Text style={styles.qtyBoxLabel}>TỒN THỰC TẾ</Text>
                        <Text style={styles.qtyBoxVal}>
                          {item.onHandQty} {item.unitLabel}
                        </Text>
                      </View>
                      <View style={styles.qtyBox}>
                        <Text style={styles.qtyBoxLabel}>TẠM GIỮ ĐƠN</Text>
                        <Text style={[styles.qtyBoxVal, { color: BLUE }]}>
                          {item.reservedQty} {item.unitLabel}
                        </Text>
                      </View>
                      <View style={styles.qtyBox}>
                        <Text style={styles.qtyBoxLabel}>KHẢ DỤNG</Text>
                        <Text
                          style={[
                            styles.qtyBoxVal,
                            { color: isOut ? RED : isLow ? '#d97706' : GREEN },
                          ]}
                        >
                          {item.availableQty} {item.unitLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.priceRow}>
                      <Text style={styles.costText}>Giá vốn: {formatVnd(item.costPrice)}</Text>
                      <Text style={styles.sellText}>Giá bán: {formatVnd(item.sellingPrice)}</Text>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: GREEN }]}
                        onPress={() => openAdjustModal(item, 'INBOUND')}
                      >
                        <Plus size={14} color="#ffffff" />
                        <Text style={styles.actionBtnTextWhite}>Nhập kho (+)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]}
                        onPress={() => openAdjustModal(item, 'ADJUSTMENT')}
                      >
                        <Sliders size={14} color={INK} />
                        <Text style={styles.actionBtnTextDark}>Kiểm kê</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
                        onPress={() => openAdjustModal(item, 'DAMAGED')}
                      >
                        <AlertTriangle size={14} color={RED} />
                        <Text style={[styles.actionBtnTextDark, { color: RED }]}>Báo hỏng</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : (
          /* SỔ CÁI XUẤT NHẬP TỒN */
          <View style={{ gap: 10 }}>
            {transactions.map(tx => {
              const isPos = tx.quantityChange > 0;
              return (
                <View key={tx.id} style={styles.txCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <Text style={[styles.txItemName, { flex: 1, minWidth: 0 }]} numberOfLines={2}>
                      {tx.itemName}
                    </Text>
                    <View
                      style={[
                        styles.txDeltaBadge,
                        {
                          backgroundColor: isPos ? '#ecfdf5' : '#fef2f2',
                          borderColor: isPos ? '#a7f3d0' : '#fecaca',
                        },
                      ]}
                    >
                      <Text style={[styles.txDeltaText, { color: isPos ? GREEN : RED }]}>
                        {isPos ? `+${tx.quantityChange}` : tx.quantityChange} {tx.unitLabel}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8 }}>
                    <Text style={[styles.txMeta, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
                      {tx.txType === 'OUTBOUND_ORDER'
                        ? `Xuất đơn cứu hộ #${tx.rescueRequestCode || ''}`
                        : tx.txType === 'RETURN_ORDER'
                        ? `Hoàn kho từ đơn #${tx.rescueRequestCode || ''}`
                        : tx.txType === 'INBOUND'
                        ? 'Nhập bổ sung kho'
                        : 'Kiểm kê / Điều chỉnh'}
                    </Text>
                    <Text style={[styles.txMeta, { flexShrink: 0 }]}>
                      Tồn sau GD: <Text style={{ fontWeight: '800', color: INK }}>{tx.onHandAfter}</Text>
                    </Text>
                  </View>
                  {tx.note ? <Text style={styles.txNote}>{tx.note}</Text> : null}
                  <Text style={styles.txTime}>
                    {tx.performedByName || 'Hệ thống'} •{' '}
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Nút Nổi (FAB) "+ Thêm phụ tùng mới" ở góc dưới bên phải */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={openCreateModal}
        activeOpacity={0.9}
      >
        <Plus size={18} color="#ffffff" strokeWidth={2.8} />
        <Text style={styles.fabBtnText}>Thêm phụ tùng</Text>
      </TouchableOpacity>

      {/* ── MODAL 1: NHẬP KHO / KIỂM KÊ — Tự động đẩy lên phía trên bàn phím khi gõ ── */}
      <Modal visible={!!adjustItem} transparent animationType="fade" onRequestClose={() => setAdjustItem(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.backdropDismissArea} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {txType === 'INBOUND'
                  ? 'Nhập thêm phụ tùng vào kho'
                  : txType === 'DAMAGED'
                  ? 'Xuất hủy phụ tùng hư hỏng'
                  : 'Kiểm kê tồn kho thực tế'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.hideKbBtn}>
                  <Text style={styles.hideKbBtnText}>Ẩn phím</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAdjustItem(null)} style={{ padding: 4 }}>
                  <X size={20} color={SUB} />
                </TouchableOpacity>
              </View>
            </View>

            {adjustItem && (
              <ScrollView
                style={{ maxHeight: 420 }}
                contentContainerStyle={{ gap: 11, paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalItemSummary}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: INK }} numberOfLines={2}>
                    {adjustItem.name}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: SUB, marginTop: 2 }}>
                    Tồn thực tế hiện tại:{' '}
                    <Text style={{ fontWeight: '800', color: INK }}>
                      {adjustItem.onHandQty} {adjustItem.unitLabel}
                    </Text>{' '}
                    • Đang giữ cho đơn:{' '}
                    <Text style={{ fontWeight: '800', color: BLUE }}>
                      {adjustItem.reservedQty} {adjustItem.unitLabel}
                    </Text>
                  </Text>
                </View>

                <View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 5,
                    }}
                  >
                    <Text style={styles.inputLabel}>
                      {txType === 'INBOUND'
                        ? `Số lượng nhập thêm (${adjustItem.unitLabel})`
                        : txType === 'DAMAGED'
                        ? `Số lượng báo hỏng (${adjustItem.unitLabel})`
                        : `Số lượng tồn thực tế sau kiểm kê (${adjustItem.unitLabel})`}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                      {[5, 10, 20, 50].map(preset => (
                        <TouchableOpacity
                          key={preset}
                          onPress={() => {
                            setQtyInput(String(preset));
                            Keyboard.dismiss();
                          }}
                          style={[
                            styles.quickQtyChip,
                            qtyInput === String(preset) && styles.quickQtyChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.quickQtyChipText,
                              qtyInput === String(preset) && styles.quickQtyChipTextActive,
                            ]}
                          >
                            {txType === 'INBOUND' ? `+${preset}` : preset}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.stepperInputRow}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => {
                        const cur = parseInt(qtyInput.replace(/\D/g, ''), 10) || 0;
                        setQtyInput(String(Math.max(1, cur - 1)));
                      }}
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '900' }]}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      value={qtyInput}
                      onChangeText={setQtyInput}
                    />
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => {
                        const cur = parseInt(qtyInput.replace(/\D/g, ''), 10) || 0;
                        setQtyInput(String(cur + 1));
                      }}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Giá vốn nhập (VNĐ)</Text>
                    <TextInput
                      style={styles.modalInput}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      value={costInput}
                      onChangeText={setCostInput}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Giá bán ra (VNĐ)</Text>
                    <TextInput
                      style={styles.modalInput}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      value={priceInput}
                      onChangeText={setPriceInput}
                    />
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>Ghi chú / Lý do (Tùy chọn)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="VD: Nhập thêm lô hàng mới..."
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    value={noteInput}
                    onChangeText={setNoteInput}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.confirmModalBtn, submitting && { opacity: 0.6 }]}
                  disabled={submitting}
                  onPress={handleConfirmAdjust}
                >
                  <Text style={styles.confirmModalBtnText}>
                    {submitting ? 'Đang cập nhật...' : 'Xác nhận & Ghi sổ cái kho'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 2: THÊM PHỤ TÙNG MỚI VÀO KHO GARA ── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.backdropDismissArea} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm Phụ tùng / Vật tư Mới vào Kho</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.hideKbBtn}>
                  <Text style={styles.hideKbBtnText}>Ẩn phím</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={{ padding: 4 }}>
                  <X size={20} color={SUB} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={{ maxHeight: 460 }}
              contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Tên phụ tùng */}
              <View>
                <Text style={styles.inputLabel}>Tên Phụ tùng / Vật tư (*)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="VD: Bình ắc quy GS 12V-45Ah, Lốp Michelin..."
                  returnKeyType="done"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              {/* Phân loại phụ tùng */}
              <View>
                <Text style={styles.inputLabel}>Phân loại nhóm phụ tùng (*)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingBottom: 6 }}
                >
                  {Array.from(
                    new Set([...categoryOptions.map(c => c.name), ...PRESET_CATEGORIES])
                  ).map(catName => {
                    const active = newCategory === catName;
                    return (
                      <TouchableOpacity
                        key={catName}
                        onPress={() => setNewCategory(catName)}
                        style={[styles.catChip, active && styles.catChipActive]}
                      >
                        <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                          {catName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TextInput
                  style={[styles.modalInput, { marginTop: 2 }]}
                  placeholder="Hoặc tự nhập nhóm phân loại..."
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
              </View>

              {/* Loại phương tiện áp dụng */}
              <View>
                <Text style={styles.inputLabel}>Loại phương tiện áp dụng</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { key: 'BOTH', label: 'Cả Ô tô & Xe máy' },
                    { key: 'CAR', label: '🚗 Ô tô' },
                    { key: 'MOTORBIKE', label: '🏍️ Xe máy' },
                  ].map((v: any) => {
                    const active = newVehicleType === v.key;
                    return (
                      <TouchableOpacity
                        key={v.key}
                        onPress={() => setNewVehicleType(v.key)}
                        style={[
                          styles.vehSelectBtn,
                          active && styles.vehSelectBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.vehSelectBtnText,
                            active && styles.vehSelectBtnTextActive,
                          ]}
                        >
                          {v.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Đơn vị tính */}
              <View>
                <Text style={styles.inputLabel}>Đơn vị tính trong kho</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {PRESET_UNITS.map(u => {
                    const active = newUnit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setNewUnit(u)}
                        style={[styles.quickQtyChip, active && styles.quickQtyChipActive, { paddingHorizontal: 11, paddingVertical: 5 }]}
                      >
                        <Text style={[styles.quickQtyChipText, active && styles.quickQtyChipTextActive]}>
                          {u}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Số lượng nhập đầu kỳ & Ngưỡng cảnh báo */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Số lượng nhập ban đầu ({newUnit})</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    value={newInitialQty}
                    onChangeText={setNewInitialQty}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Ngưỡng báo sắp hết ({newUnit})</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    value={newMinStock}
                    onChangeText={setNewMinStock}
                  />
                </View>
              </View>

              {/* Giá vốn & Giá bán */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Giá vốn nhập (VNĐ)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    value={newCostPrice}
                    onChangeText={setNewCostPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Giá bán ra (VNĐ)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    value={newSellingPrice}
                    onChangeText={setNewSellingPrice}
                  />
                </View>
              </View>

              {/* Mã SKU tùy chọn */}
              <View>
                <Text style={styles.inputLabel}>Mã SKU (Để trống hệ thống sẽ tự tạo)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="VD: PT-ACQUY-GS45"
                  autoCapitalize="characters"
                  value={newSku}
                  onChangeText={setNewSku}
                />
              </View>

              <TouchableOpacity
                style={[styles.confirmModalBtn, creatingItem && { opacity: 0.6 }]}
                disabled={creatingItem}
                onPress={handleConfirmCreate}
              >
                <Text style={styles.confirmModalBtnText}>
                  {creatingItem ? 'Đang tạo & nhập kho...' : 'Tạo Phụ tùng & Nhập kho ngay'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15.5, fontWeight: '800', color: INK },
  headerSub: { fontSize: 10.5, color: SUB, marginTop: 1 },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: BRAND,
  },
  addHeaderBtnText: { fontSize: 11.5, fontWeight: '800', color: '#ffffff' },
  syncBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiLabel: { fontSize: 9.5, fontWeight: '800' },
  kpiValue: { fontSize: 19, fontWeight: '900', marginTop: 3 },
  kpiSub: { fontSize: 10, color: SUB, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabBtnActive: { backgroundColor: BRAND },
  tabBtnText: { fontSize: 12, fontWeight: '800', color: SUB },
  tabBtnTextActive: { color: '#ffffff' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 9, paddingLeft: 8, fontSize: 13, color: INK },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  inlineAddBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: INK, borderColor: INK },
  filterChipBlueActive: { backgroundColor: BLUE, borderColor: BLUE },
  filterChipText: { fontSize: 11.5, fontWeight: '700', color: SUB },
  filterChipTextActive: { color: '#ffffff' },
  categoryFilterContainer: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  categoryFilterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  categoryFilterTitle: { fontSize: 11.5, fontWeight: '800', color: INK },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: BRAND,
  },
  catChipText: { fontSize: 11, fontWeight: '700', color: SUB },
  catChipTextActive: { color: BRAND, fontWeight: '800' },
  emptyCard: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: SUB },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  skuBadgeWrap: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    maxWidth: 120,
  },
  skuBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  catBadgeWrap: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffedd5',
    maxWidth: 155,
  },
  catBadgeText: { fontSize: 10, color: BRAND, fontWeight: '700' },
  itemName: { fontSize: 14, fontWeight: '800', color: INK, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, flexShrink: 0 },
  qtyBoxRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  qtyBox: { flex: 1, alignItems: 'center' },
  qtyBoxLabel: { fontSize: 9, fontWeight: '800', color: SUB },
  qtyBoxVal: { fontSize: 13, fontWeight: '900', color: INK, marginTop: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costText: { fontSize: 11.5, color: SUB, fontWeight: '600' },
  sellText: { fontSize: 12.5, color: BRAND, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnTextWhite: { fontSize: 11.5, fontWeight: '800', color: '#ffffff' },
  actionBtnTextDark: { fontSize: 11.5, fontWeight: '800', color: INK },
  txCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  txItemName: { fontSize: 13.5, fontWeight: '800', color: INK, lineHeight: 19 },
  txDeltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  txDeltaText: { fontSize: 11.5, fontWeight: '900' },
  txMeta: { fontSize: 11.5, color: SUB, fontWeight: '600' },
  txNote: { fontSize: 11.5, color: '#334155', marginTop: 4 },
  txTime: { fontSize: 10.5, color: '#94a3b8', marginTop: 4 },
  fabBtn: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  modalTitle: { fontSize: 15, fontWeight: '800', color: INK, flex: 1 },
  hideKbBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
  },
  hideKbBtnText: { fontSize: 11, fontWeight: '700', color: SUB },
  modalItemSummary: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputLabel: { fontSize: 11.5, fontWeight: '700', color: SUB, marginBottom: 4 },
  quickQtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickQtyChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: BRAND,
  },
  quickQtyChipText: { fontSize: 11, fontWeight: '800', color: SUB },
  quickQtyChipTextActive: { color: BRAND },
  vehSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  vehSelectBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: BRAND,
  },
  vehSelectBtnText: { fontSize: 11, fontWeight: '700', color: SUB },
  vehSelectBtnTextActive: { color: BRAND, fontWeight: '800' },
  stepperInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, fontWeight: '900', color: BRAND },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    backgroundColor: '#ffffff',
  },
  confirmModalBtn: {
    backgroundColor: BRAND,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmModalBtnText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
});

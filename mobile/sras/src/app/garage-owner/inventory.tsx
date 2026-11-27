import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
  Disc,
  Zap,
  Truck,
  Wrench,
  Fuel,
  Key,
  Gauge,
  ShieldAlert,
  BatteryCharging,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Pencil,
  CheckCircle2,
  PackageCheck,
  Boxes,
  Clock,
  Filter,
} from 'lucide-react-native';
import axiosClient from '../../api/axiosClient';
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
  const params = useLocalSearchParams<{
    tab?: string;
    search?: string;
    itemId?: string;
    openAdjust?: string;
    from?: string;
  }>();

  // 3 Tabs: SERVICES (Dịch vụ & Bảng giá), STOCK (Kho Phụ tùng), LEDGER (Nhật ký giao dịch)
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'STOCK' | 'LEDGER'>(
    params.tab === 'STOCK' || params.itemId || params.search ? 'STOCK' : 'SERVICES'
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'OUT' | 'LOW' | 'RESERVED' | 'LABOR'>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | 'CAR' | 'MOTORBIKE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [serviceStatusFilter, setServiceStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<{ [cat: string]: boolean }>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const hasLoadedOnce = useRef(false);

  // Dữ liệu Dịch vụ
  const [services, setServices] = useState<any[]>([]);

  // Dữ liệu Kho
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

  // Khi nhận params từ Cảnh báo hệ thống (GarageSystemAlertsModal hoặc Push Notification)
  useEffect(() => {
    if (params.tab === 'STOCK' || params.itemId || params.search) {
      setActiveTab('STOCK');
      if (params.search) {
        setSearchQuery(String(params.search));
      }
      setStockFilter('ALL');
    }
  }, [params.tab, params.search, params.itemId]);

  // Tự động tìm đúng mặt hàng đang hết / sắp hết và mở modal Nhập hàng
  const hasAutoOpenedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!params.itemId && !params.search) return;
    if (items.length === 0) return;

    const key = `${params.itemId || ''}_${params.search || ''}`;
    if (hasAutoOpenedRef.current === key) return;

    const found = items.find((i) => {
      if (params.itemId && String(i.id) === String(params.itemId)) return true;
      if (params.search && i.name) {
        const s = String(params.search).toLowerCase().trim();
        const n = i.name.toLowerCase().trim();
        return n.includes(s) || s.includes(n);
      }
      return false;
    });

    if (found) {
      hasAutoOpenedRef.current = key;
      setActiveTab('STOCK');
      setSearchQuery(found.name);
      setStockFilter('ALL');

      if (params.openAdjust === '1') {
        setAdjustItem(found);
        setTxType('INBOUND');
        setQtyInput('10');
        setMinStockInput(String(found.minStockQty ?? 3));
        setCostInput(found.costPrice ? String(found.costPrice) : '');
        setPriceInput(found.sellingPrice ? String(found.sellingPrice) : '');
        setNoteInput('Nhập bổ sung kho theo cảnh báo tồn kho');
      }
    }
  }, [items, params.itemId, params.search, params.openAdjust]);

  // Modal 1: Nhập kho / Kiểm kê / Báo hỏng
  const [adjustItem, setAdjustItem] = useState<any | null>(null);
  const [txType, setTxType] = useState<'INBOUND' | 'ADJUSTMENT' | 'DAMAGED'>('INBOUND');
  const [qtyInput, setQtyInput] = useState('10');
  const [costInput, setCostInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [minStockInput, setMinStockInput] = useState('3');
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

  // Icon map cho các dịch vụ
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

  const fetchAllData = useCallback(async (isSilent = false) => {
    try {
      // Chỉ hiện loading xoay toàn màn hình ở lần đầu tiên khi chưa có dữ liệu
      if (!isSilent && !hasLoadedOnce.current) {
        setLoading(true);
      }

      // 1. Tải danh sách Dịch vụ & Bảng giá
      try {
        const svcRes: any = await axiosClient.get('/garages/me/services');
        const rawList = Array.isArray(svcRes?.data) ? svcRes.data : (Array.isArray(svcRes) ? svcRes : []);
        if (Array.isArray(rawList)) {
          const mapped = rawList.map((item: any) => {
            const rawCode = item.serviceCode?.toLowerCase() || '';
            const key = rawCode.includes('tire') ? 'tire'
              : rawCode.includes('battery') || rawCode.includes('kich_binh') ? 'battery'
                : rawCode.includes('tow') || rawCode.includes('keo') ? 'towing'
                  : rawCode.includes('engine') || rawCode.includes('sua') ? 'engine' : 'other';

            return {
              id: String(item.serviceId || item.id),
              dbId: item.serviceId || item.id,
              title: item.serviceName || 'Dịch vụ',
              categoryName: item.categoryName || 'Dịch vụ cứu hộ',
              categoryCode: item.categoryCode,
              categoryVehicleType: item.categoryVehicleType,
              feeType: item.feeType,
              unit: item.unit,
              minPrice: item.minPrice,
              maxPrice: item.maxPrice,
              icon: iconMap[rawCode] || iconMap[key] || Wrench,
              enabled: Boolean(item.isActive),
              price: item.price,
              isConfigured: Boolean(item.isConfigured),
              itemType: item.itemType || 'LABOR',
              unitLabel: item.unitLabel || (item.unit === 'KM' ? 'km' : 'lần'),
              inventoryItemId: item.inventoryItemId,
              onHandQty: item.onHandQty ?? 0,
              reservedQty: item.reservedQty ?? 0,
              availableQty: item.availableQty ?? 0,
              minStockQty: item.minStockQty ?? 3,
              lowStock: Boolean(item.lowStock),
              outOfStock: Boolean(item.outOfStock),
            };
          });
          setServices(mapped);
        }
      } catch (e) {
        console.log('Error fetching garage services');
      }

      // 2. Tải dữ liệu Kho & Phụ tùng
      try {
        const data = await garageApi.getMyInventory();
        if (data) {
          if (data.summary) setSummary(data.summary);
          setItems(Array.isArray(data.items) ? data.items : []);
          setTransactions(Array.isArray(data.recentTransactions) ? data.recentTransactions : []);
        }
      } catch (e: any) {
        console.log('Error fetching garage inventory');
      }
    } finally {
      hasLoadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Làm mới dữ liệu trong nền (isSilent = true) để không bao giờ bị đè màn hình loading
      fetchAllData(true);
    }, [fetchAllData])
  );

  // Bật/tắt dịch vụ tức thì (Optimistic UI mượt mà, không xoay loading)
  const toggleService = async (id: string) => {
    const target = services.find((item) => item.id === id);
    if (!target) return;
    const nextState = !target.enabled;

    // 1. Cập nhật state Dịch vụ ngay lập tức
    setServices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: nextState } : item))
    );

    // 2. Cập nhật state Kho Phụ tùng ngay lập tức (nếu đã có item trong kho)
    setItems((prev) =>
      prev.map((item) => {
        if (item.serviceId === target.dbId) {
          return { ...item, isActive: nextState };
        }
        return item;
      })
    );

    try {
      const res: any = await axiosClient.put(`/garages/me/services/${id}/toggle`, {
        isActive: nextState,
      });

      if (res?.data) {
        setServices((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  enabled: Boolean(res.data.isActive),
                  price: res.data.price,
                  isConfigured: Boolean(res.data.isConfigured),
                  inventoryItemId: res.data.inventoryItemId || item.inventoryItemId,
                  availableQty: res.data.availableQty ?? item.availableQty,
                  outOfStock: Boolean(res.data.outOfStock),
                }
              : item
          )
        );
      }

      // Làm mới ngầm tồn kho trong nền
      fetchAllData(true);
    } catch (e: any) {
      setServices((prev) =>
        prev.map((item) => (item.id === id ? { ...item, enabled: !nextState } : item))
      );
      setItems((prev) =>
        prev.map((item) => (item.serviceId === target.dbId ? { ...item, isActive: !nextState } : item))
      );
      const errMsg = e?.response?.data?.message || e?.message || 'Không thể cập nhật trạng thái dịch vụ.';
      Alert.alert('Không thể cập nhật trạng thái', errMsg);
    }
  };

  // Accordion toggle cho dịch vụ
  const toggleCategory = (catName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  // Grouped Services
  const groupedServices = useMemo(() => {
    if (!services || services.length === 0) return [];
    const query = searchQuery.trim().toLowerCase();

    const fullGroups: { [cat: string]: any[] } = {};
    for (const s of services) {
      const cat = s.categoryName ? s.categoryName.trim() : 'Dịch vụ cứu hộ';
      if (!fullGroups[cat]) fullGroups[cat] = [];
      fullGroups[cat].push(s);
    }

    return Object.entries(fullGroups)
      .filter(([categoryName]) => {
        if (categoryFilter !== 'ALL' && categoryName !== categoryFilter) return false;
        return true;
      })
      .map(([categoryName, allItems]) => {
        let filteredItems = allItems;

        if (vehicleFilter !== 'ALL') {
          filteredItems = filteredItems.filter(
            (s) => !s.categoryVehicleType || s.categoryVehicleType === 'BOTH' || s.categoryVehicleType === vehicleFilter
          );
        }

        if (serviceStatusFilter === 'ENABLED') {
          filteredItems = filteredItems.filter((s) => s.enabled);
        } else if (serviceStatusFilter === 'DISABLED') {
          filteredItems = filteredItems.filter((s) => !s.enabled);
        }

        if (query) {
          filteredItems = filteredItems.filter((s) => {
            const sTitle = (s.title || '').toLowerCase();
            const cName = categoryName.toLowerCase();
            return sTitle.includes(query) || cName.includes(query);
          });
        }

        const activeCount = filteredItems.filter((s) => s.enabled).length;

        return {
          categoryName,
          items: filteredItems,
          activeCount,
          totalInCategory: allItems.length,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [services, searchQuery, serviceStatusFilter, vehicleFilter, categoryFilter]);

  // Số đếm dịch vụ biến đổi động theo bộ lọc (Loại xe, Danh mục, Từ khóa tìm kiếm)
  const serviceCounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = services.filter((s) => {
      if (vehicleFilter !== 'ALL') {
        const vType = s.categoryVehicleType;
        if (vType && vType !== 'BOTH' && vType !== vehicleFilter) return false;
      }
      if (categoryFilter !== 'ALL') {
        const cName = (s.categoryName || 'Dịch vụ cứu hộ').trim();
        if (cName !== categoryFilter) return false;
      }
      if (query) {
        const title = (s.title || '').toLowerCase();
        const cat = (s.categoryName || '').toLowerCase();
        if (!title.includes(query) && !cat.includes(query)) return false;
      }
      return true;
    });

    const total = filtered.length;
    const enabled = filtered.filter((s) => s.enabled).length;
    const disabled = total - enabled;

    return { total, enabled, disabled };
  }, [services, searchQuery, vehicleFilter, categoryFilter]);

  const toggleAllCategories = () => {
    const nextState = !allExpanded;
    const nextMap: { [cat: string]: boolean } = {};
    for (const g of groupedServices) {
      nextMap[g.categoryName] = nextState;
    }
    setExpandedCategories(nextMap);
  };

  // Đồng bộ danh mục phụ tùng chuẩn từ Sàn
  const handleSyncCatalog = async () => {
    try {
      setSyncing(true);
      await garageApi.syncInventoryCatalog();
      await fetchAllData(true);
      Alert.alert('Thành công', 'Đã đồng bộ đầy đủ danh mục phụ tùng chuẩn từ Sàn vào kho Gara!');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể đồng bộ danh mục');
    } finally {
      setSyncing(false);
    }
  };

  // Hàm Việt hóa loại giao dịch kho (loại bỏ từ tiếng Anh)
  const getTxTypeLabel = (type: string, desc?: string) => {
    if (desc && !['INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'DAMAGED', 'RETURN'].includes(desc)) {
      return desc;
    }
    switch (type) {
      case 'INBOUND':
        return 'Nhập kho';
      case 'OUTBOUND':
        return 'Xuất cứu hộ';
      case 'ADJUSTMENT':
        return 'Kiểm kê';
      case 'DAMAGED':
        return 'Báo hỏng / Hủy';
      case 'RETURN':
        return 'Hoàn trả kho';
      default:
        return 'Giao dịch kho';
    }
  };
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.categoryName) set.add(s.categoryName.trim());
    });
    items.forEach((item) => {
      if (item.categoryName) set.add(item.categoryName.trim());
    });
    return Array.from(set).map((name) => ({ name }));
  }, [services, items]);

  // Số đếm Phụ tùng trong kho biến đổi động theo bộ lọc (Loại xe, Danh mục, Từ khóa tìm kiếm)
  const stockCounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const baseItems = items.filter((item) => {
      if (q) {
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchSku = (item.skuCode || '').toLowerCase().includes(q);
        const matchCat = (item.categoryName || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat) return false;
      }
      if (vehicleFilter !== 'ALL' && item.vehicleType !== 'BOTH' && item.vehicleType !== vehicleFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL' && item.categoryName !== categoryFilter) {
        return false;
      }
      return true;
    });

    const total = baseItems.length;
    const labor = baseItems.filter((item) => item.itemType === 'LABOR').length;

    // Hết hàng: Các mặt hàng Phụ tùng / Vật tư có số lượng tồn khả dụng = 0
    const out = baseItems.filter((item) => {
      const isPart = item.itemType === 'PART' || (item.itemType !== 'LABOR' && (item.skuCode?.startsWith('PT-') || item.skuCode?.startsWith('PRD_')));
      return isPart && (item.stockStatus === 'OUT_OF_STOCK' || item.availableQty <= 0);
    }).length;

    // Sắp hết: Các mặt hàng Phụ tùng / Vật tư có số lượng tồn còn 1 đến 3 cái (hoặc <= minStockQty)
    const low = baseItems.filter((item) => {
      const isPart = item.itemType === 'PART' || (item.itemType !== 'LABOR' && (item.skuCode?.startsWith('PT-') || item.skuCode?.startsWith('PRD_')));
      const minStock = item.minStockQty ?? 3;
      const isOut = item.stockStatus === 'OUT_OF_STOCK' || item.availableQty <= 0;
      return isPart && !isOut && (item.stockStatus === 'LOW_STOCK' || item.lowStock || item.availableQty <= minStock);
    }).length;

    const reserved = baseItems.filter((item) => (item.reservedQty || 0) > 0).length;

    return { total, labor, out, low, reserved };
  }, [items, searchQuery, vehicleFilter, categoryFilter]);

  // Lọc danh sách Phụ tùng trong kho
  const filteredStockItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchSku = (item.skuCode || '').toLowerCase().includes(q);
        const matchCat = (item.categoryName || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat) return false;
      }
      if (stockFilter === 'LABOR' && item.itemType !== 'LABOR') return false;
      if (stockFilter === 'OUT') {
        const isPart = item.itemType === 'PART' || (item.itemType !== 'LABOR' && (item.skuCode?.startsWith('PT-') || item.skuCode?.startsWith('PRD_')));
        if (!isPart) return false;
        return item.stockStatus === 'OUT_OF_STOCK' || item.availableQty <= 0;
      }
      if (stockFilter === 'LOW') {
        const isPart = item.itemType === 'PART' || (item.itemType !== 'LABOR' && (item.skuCode?.startsWith('PT-') || item.skuCode?.startsWith('PRD_')));
        if (!isPart) return false;
        const minStock = item.minStockQty ?? 3;
        const isOut = item.stockStatus === 'OUT_OF_STOCK' || item.availableQty <= 0;
        return !isOut && (item.stockStatus === 'LOW_STOCK' || item.lowStock || item.availableQty <= minStock);
      }
      if (stockFilter === 'RESERVED' && (item.reservedQty || 0) <= 0) return false;
      if (vehicleFilter !== 'ALL' && item.vehicleType !== 'BOTH' && item.vehicleType !== vehicleFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL' && item.categoryName !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [items, searchQuery, stockFilter, vehicleFilter, categoryFilter]);

  const openAdjustModal = (item: any, mode: 'INBOUND' | 'ADJUSTMENT' | 'DAMAGED') => {
    setAdjustItem(item);
    setTxType(mode);
    setQtyInput(mode === 'ADJUSTMENT' ? String(item.onHandQty) : mode === 'INBOUND' ? '10' : '1');
    setCostInput(String(item.costPrice || 0));
    setPriceInput(String(item.sellingPrice || 0));
    setMinStockInput(String(item.minStockQty ?? 3));
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

    const currentItem = adjustItem;
    const unitCost = parseInt(costInput.replace(/\D/g, ''), 10) || currentItem.costPrice || 0;
    const sellingPrice = parseInt(priceInput.replace(/\D/g, ''), 10) || currentItem.sellingPrice || 0;
    const minStock = parseInt(minStockInput.replace(/\D/g, ''), 10) || 3;

    // Tính toán số lượng tồn mới tức thì (Optimistic UI)
    let nextOnHand = currentItem.onHandQty || 0;
    if (txType === 'INBOUND') nextOnHand += qty;
    else if (txType === 'DAMAGED') nextOnHand = Math.max(0, nextOnHand - qty);
    else if (txType === 'ADJUSTMENT') nextOnHand = qty;

    const nextAvailable = Math.max(0, nextOnHand - (currentItem.reservedQty || 0));

    // Cập nhật danh sách phụ tùng ngay lập tức
    setItems((prev) =>
      prev.map((item) =>
        item.id === currentItem.id
          ? {
              ...item,
              onHandQty: nextOnHand,
              availableQty: nextAvailable,
              costPrice: unitCost,
              sellingPrice: sellingPrice,
              minStockQty: minStock,
              stockStatus: nextAvailable <= 0 ? 'OUT_OF_STOCK' : (nextAvailable <= minStock ? 'LOW_STOCK' : 'OK'),
            }
          : item
      )
    );

    // Đóng modal ngay tức thì để trải nghiệm mượt mà không bị đơ
    setAdjustItem(null);

    try {
      setSubmitting(true);
      await garageApi.adjustInventoryStock(currentItem.id, {
        txType,
        quantity: qty,
        unitCost,
        sellingPrice,
        minStockQty: minStock,
        note: noteInput.trim(),
      });
      // Đồng bộ ngầm với backend
      fetchAllData(true);
    } catch (e: any) {
      fetchAllData(true);
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
    setNewMinStock('3');
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
    const minStock = parseInt(newMinStock.replace(/\D/g, ''), 10) || 3;
    const cost = parseInt(newCostPrice.replace(/\D/g, ''), 10) || 0;
    const sell = parseInt(newSellingPrice.replace(/\D/g, ''), 10) || cost;

    try {
      setCreatingItem(true);
      await garageApi.createInventoryItem({
        name: newName.trim(),
        skuCode: newSku.trim(),
        categoryName: newCategory,
        vehicleType: newVehicleType,
        unitLabel: newUnit,
        initialQty: initQty,
        minStockQty: minStock,
        costPrice: cost,
        sellingPrice: sell,
        supplierName: 'Nhà cung cấp Gara',
        note: newNote.trim(),
      });
      setCreateModalVisible(false);
      await fetchAllData(true);
      Alert.alert('Thành công', `Đã thêm phụ tùng "${newName}" vào kho!`);
    } catch (e: any) {
      Alert.alert('Lỗi tạo phụ tùng', e?.response?.data?.message || e?.message || 'Vui lòng thử lại');
    } finally {
      setCreatingItem(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/garage-owner/settings');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={INK} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Dịch vụ & Kho Phụ tùng</Text>
            <Text style={styles.headerSubtitle}>Quản lý giá bán, định mức tồn kho & phụ tùng</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleSyncCatalog}
          disabled={syncing}
          activeOpacity={0.7}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={BRAND} />
          ) : (
            <RefreshCw size={17} color="#475569" />
          )}
        </TouchableOpacity>
      </View>

      {/* 3 Main Tabs */}
      <View style={styles.tabsWrap}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'SERVICES' && styles.tabBtnActive]}
          onPress={() => setActiveTab('SERVICES')}
          activeOpacity={0.8}
        >
          <Layers size={16} color={activeTab === 'SERVICES' ? BRAND : '#64748b'} strokeWidth={2.4} />
          <Text style={[styles.tabBtnText, activeTab === 'SERVICES' && styles.tabBtnTextActive]} numberOfLines={1}>
            Dịch vụ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'STOCK' && styles.tabBtnActive]}
          onPress={() => setActiveTab('STOCK')}
          activeOpacity={0.8}
        >
          <Package size={16} color={activeTab === 'STOCK' ? BRAND : '#64748b'} strokeWidth={2.4} />
          <Text style={[styles.tabBtnText, activeTab === 'STOCK' && styles.tabBtnTextActive]} numberOfLines={1}>
            Kho Phụ tùng
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'LEDGER' && styles.tabBtnActive]}
          onPress={() => setActiveTab('LEDGER')}
          activeOpacity={0.8}
        >
          <History size={16} color={activeTab === 'LEDGER' ? BRAND : '#64748b'} strokeWidth={2.4} />
          <Text style={[styles.tabBtnText, activeTab === 'LEDGER' && styles.tabBtnTextActive]} numberOfLines={1}>
            Nhật ký
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar & Filter button */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBarInner}>
          <Search size={16} color={SUB} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'SERVICES'
                ? 'Tìm tên dịch vụ, danh mục...'
                : 'Tìm tên phụ tùng, nhóm danh mục...'
            }
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <X size={14} color={SUB} />
            </TouchableOpacity>
          )}
        </View>

        {/* Nút lọc theo loại xe & danh mục */}
        <TouchableOpacity
          style={[
            styles.filterTriggerBtn,
            (vehicleFilter !== 'ALL' || categoryFilter !== 'ALL') && styles.filterTriggerBtnActive,
          ]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.8}
        >
          <Filter
            size={16}
            color={vehicleFilter !== 'ALL' || categoryFilter !== 'ALL' ? BRAND : '#475569'}
            strokeWidth={2.2}
          />
          {(vehicleFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <View style={styles.filterActiveDot} />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.loadingText}>Đang tải dữ liệu Dịch vụ & Kho...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAllData(true);
              }}
              colors={[BRAND]}
            />
          }
        >
          {/* ========================================================================= */}
          {/* TAB 1: DỊCH VỤ & BẢNG GIÁ                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'SERVICES' && (
            <View style={{ gap: 12 }}>
              {/* Filter chips cho Dịch vụ */}
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={[styles.chip, serviceStatusFilter === 'ALL' && styles.chipActive]}
                  onPress={() => setServiceStatusFilter('ALL')}
                >
                  <Text style={[styles.chipText, serviceStatusFilter === 'ALL' && styles.chipTextActive]} numberOfLines={1}>
                    Tất cả ({serviceCounts.total})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chip, serviceStatusFilter === 'ENABLED' && styles.chipActive]}
                  onPress={() => setServiceStatusFilter('ENABLED')}
                >
                  <Text style={[styles.chipText, serviceStatusFilter === 'ENABLED' && styles.chipTextActive]} numberOfLines={1}>
                    Đang bật ({serviceCounts.enabled})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chip, serviceStatusFilter === 'DISABLED' && styles.chipActive]}
                  onPress={() => setServiceStatusFilter('DISABLED')}
                >
                  <Text style={[styles.chipText, serviceStatusFilter === 'DISABLED' && styles.chipTextActive]} numberOfLines={1}>
                    Chưa bật ({serviceCounts.disabled})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Header tổng quan danh mục */}
              <View style={styles.accordionHeaderRow}>
                <Text style={styles.groupOverviewText}>
                  {groupedServices.length} nhóm danh mục • {services.filter((s) => s.enabled).length} dịch vụ đang nhận đơn
                </Text>
                {(vehicleFilter !== 'ALL' || categoryFilter !== 'ALL') && (
                  <TouchableOpacity
                    style={styles.clearFilterChip}
                    onPress={() => {
                      setVehicleFilter('ALL');
                      setCategoryFilter('ALL');
                    }}
                  >
                    <Text style={styles.clearFilterChipText}>Xóa lọc</Text>
                    <X size={11} color={BRAND} />
                  </TouchableOpacity>
                )}
              </View>

              {groupedServices.length === 0 ? (
                <View style={styles.emptyCard}>
                  <PackageCheck size={40} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>Không tìm thấy dịch vụ nào</Text>
                  <Text style={styles.emptySub}>Thử tìm kiếm với từ khóa khác hoặc bấm làm mới</Text>
                </View>
              ) : (
                groupedServices.map((group) => {
                  const isExpanded = searchQuery.trim().length > 0 ? true : !!expandedCategories[group.categoryName];

                  return (
                    <View key={group.categoryName} style={styles.categoryCard}>
                      <TouchableOpacity
                        style={[styles.catHeader, isExpanded && styles.catHeaderExpanded]}
                        activeOpacity={0.8}
                        onPress={() => toggleCategory(group.categoryName)}
                      >
                        <View style={styles.catHeaderLeft}>
                          <View style={styles.catIconWrap}>
                            <Layers size={17} color={BRAND} />
                          </View>
                          <View>
                            <Text style={styles.catTitle}>{group.categoryName}</Text>
                            <Text style={styles.catSub}>
                              {group.activeCount}/{group.totalInCategory} dịch vụ đang bật
                            </Text>
                          </View>
                        </View>
                        <View style={styles.chevronBox}>
                          {isExpanded ? (
                            <ChevronUp size={16} color={BRAND} strokeWidth={2.4} />
                          ) : (
                            <ChevronDown size={16} color={SUB} strokeWidth={2.4} />
                          )}
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.servicesListWrap}>
                          {group.items.map((svc) => {
                            const IconComp = svc.icon;
                            const isPart = svc.itemType === 'PART';
                            const outOfStock = isPart && svc.availableQty <= 0;
                            const lowStock = isPart && !outOfStock && (svc.lowStock || svc.availableQty <= (svc.minStockQty ?? 3));

                            // Tìm phụ tùng tương ứng trong kho để lấy giá vốn
                            const matchedInv = items.find((i) => i.serviceId === svc.dbId);
                            const costPrice = matchedInv?.costPrice || 0;

                            return (
                              <View key={svc.id} style={styles.serviceItemCard}>
                                <View style={styles.svcTopRow}>
                                  <View style={styles.svcIconBox}>
                                    <IconComp size={20} color={BRAND} />
                                  </View>
                                  <View style={styles.svcTitleCol}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <Text style={styles.svcName}>{svc.title}</Text>
                                      {isPart ? (
                                        <View style={styles.partPill}>
                                          <Text style={styles.partPillText}>Phụ tùng</Text>
                                        </View>
                                      ) : (
                                        <View style={styles.laborPill}>
                                          <Text style={styles.laborPillText}>Công thợ</Text>
                                        </View>
                                      )}
                                    </View>
                                    <Text style={styles.svcPriceBand}>
                                      Khung sàn: {Number(svc.minPrice).toLocaleString('vi-VN')}₫ - {Number(svc.maxPrice).toLocaleString('vi-VN')}₫
                                    </Text>
                                  </View>

                                  <Switch
                                    value={svc.enabled}
                                    onValueChange={() => toggleService(svc.id)}
                                    trackColor={{ false: '#e2e8f0', true: '#ffedd5' }}
                                    thumbColor={svc.enabled ? BRAND : '#94a3b8'}
                                  />
                                </View>

                                {/* Thông tin giá niêm yết & Tồn kho thực tế */}
                                <View style={styles.svcBottomRow}>
                                  <View style={styles.svcPriceTagWrap}>
                                    <Text style={styles.svcPriceLabel}>Giá bán:</Text>
                                    <Text style={styles.svcPriceValue}>
                                      {svc.price ? `${Number(svc.price).toLocaleString('vi-VN')} ₫` : 'Chưa đặt'}
                                    </Text>
                                    <Text style={styles.svcPriceUnit}>/{svc.unitLabel}</Text>
                                  </View>

                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    {isPart && (
                                      <View
                                        style={[
                                          styles.stockBadge,
                                          outOfStock
                                            ? styles.stockBadgeRed
                                            : lowStock
                                            ? styles.stockBadgeAmber
                                            : styles.stockBadgeGreen,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.stockBadgeText,
                                            outOfStock
                                              ? styles.stockTextRed
                                              : lowStock
                                              ? styles.stockTextAmber
                                              : styles.stockTextGreen,
                                          ]}
                                        >
                                          {outOfStock
                                            ? 'Hết hàng (0)'
                                            : lowStock
                                            ? `Sắp hết (${svc.availableQty})`
                                            : `Còn: ${svc.availableQty} ${svc.unitLabel}`}
                                        </Text>
                                      </View>
                                    )}

                                    <TouchableOpacity
                                      style={styles.svcEditPriceBtn}
                                      activeOpacity={0.8}
                                      onPress={() => {
                                        router.push({
                                          pathname: '/garage-owner/service-pricing',
                                          params: {
                                            id: String(svc.dbId || svc.id),
                                            title: svc.title,
                                            categoryName: svc.categoryName,
                                            categoryVehicleType: svc.categoryVehicleType || 'BOTH',
                                            minPrice: String(svc.minPrice || 0),
                                            maxPrice: String(svc.maxPrice || 0),
                                            price: String(svc.price || svc.minPrice || 0),
                                            costPrice: String(costPrice || 0),
                                            itemType: svc.itemType || (isPart ? 'PART' : 'LABOR'),
                                            unit: svc.unitLabel || 'lần',
                                            isActive: String(svc.enabled),
                                          },
                                        });
                                      }}
                                    >
                                      <Pencil size={11} color="#ea580c" strokeWidth={2.4} />
                                      <Text style={styles.svcEditPriceText}>Cài giá & Tỷ lệ</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                {/* Hướng dẫn khi dịch vụ đang bật: thông báo tĩnh */}
                                {svc.enabled && (
                                  <View style={styles.noticeToStockBanner}>
                                    <Package size={13} color={BRAND} strokeWidth={2.2} />
                                    <Text style={styles.noticeToStockText}>
                                      {isPart
                                        ? 'Đã kích hoạt • Vui lòng vào Kho để nhập số lượng và cài đặt giá'
                                        : 'Đã kích hoạt • Sẵn sàng nhận đơn cứu hộ của khách hàng'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: KHO PHỤ TÙNG                                                       */}
          {/* ========================================================================= */}
          {activeTab === 'STOCK' && (
            <View style={{ gap: 12 }}>
              {/* KPI Summary Banner */}
              <View style={styles.kpiGrid}>
                <TouchableOpacity
                  style={[styles.kpiCard, stockFilter === 'ALL' && { borderColor: '#cbd5e1' }]}
                  onPress={() => setStockFilter('ALL')}
                  activeOpacity={0.8}
                >
                  <View style={styles.kpiHeaderRow}>
                    <Text style={styles.kpiLabel}>TỔNG MẶT HÀNG</Text>
                    <View style={[styles.kpiIconDot, { backgroundColor: '#f1f5f9' }]}>
                      <Boxes size={12} color="#64748b" />
                    </View>
                  </View>
                  <Text style={styles.kpiValue}>{summary.totalSkuCount || items.length}</Text>
                  <Text style={styles.kpiSub}>Mặt hàng hoạt động</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.kpiCard}
                  onPress={() => setStockFilter('ALL')}
                  activeOpacity={0.8}
                >
                  <View style={styles.kpiHeaderRow}>
                    <Text style={[styles.kpiLabel, { color: '#059669' }]}>KHẢ DỤNG</Text>
                    <View style={[styles.kpiIconDot, { backgroundColor: '#ecfdf5' }]}>
                      <CheckCircle2 size={12} color="#059669" />
                    </View>
                  </View>
                  <Text style={[styles.kpiValue, { color: '#059669' }]}>{summary.totalAvailableUnits || 0}</Text>
                  <Text style={styles.kpiSub}>Sẵn sàng xuất dùng</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.kpiCard, stockFilter === 'LOW' && { borderColor: '#f59e0b' }]}
                  onPress={() => setStockFilter('LOW')}
                  activeOpacity={0.8}
                >
                  <View style={styles.kpiHeaderRow}>
                    <Text style={[styles.kpiLabel, { color: '#d97706' }]}>SẮP HẾT</Text>
                    <View style={[styles.kpiIconDot, { backgroundColor: '#fffbeb' }]}>
                      <Clock size={12} color="#d97706" />
                    </View>
                  </View>
                  <Text style={[styles.kpiValue, { color: '#d97706' }]}>{stockCounts.low}</Text>
                  <Text style={styles.kpiSub}>Còn 1 - 3 cái</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.kpiCard, stockFilter === 'OUT' && { borderColor: '#fca5a5' }]}
                  onPress={() => setStockFilter('OUT')}
                  activeOpacity={0.8}
                >
                  <View style={styles.kpiHeaderRow}>
                    <Text style={[styles.kpiLabel, { color: '#dc2626' }]}>HẾT HÀNG</Text>
                    <View style={[styles.kpiIconDot, { backgroundColor: '#fef2f2' }]}>
                      <AlertTriangle size={12} color="#dc2626" />
                    </View>
                  </View>
                  <Text style={[styles.kpiValue, { color: '#dc2626' }]}>{stockCounts.out}</Text>
                  <Text style={styles.kpiSub}>Cần nhập hàng gấp (0)</Text>
                </TouchableOpacity>
              </View>

              {/* Filter chips cho Kho */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScrollContent}
              >
                <TouchableOpacity
                  style={[styles.chipScrollItem, stockFilter === 'ALL' && styles.chipActive]}
                  onPress={() => setStockFilter('ALL')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, stockFilter === 'ALL' && styles.chipTextActive]} numberOfLines={1}>
                    Tất cả ({stockCounts.total})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chipScrollItem, stockFilter === 'LABOR' && styles.chipActive]}
                  onPress={() => setStockFilter('LABOR')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, stockFilter === 'LABOR' && styles.chipTextActive]} numberOfLines={1}>
                    Công thợ ({stockCounts.labor})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chipScrollItem, stockFilter === 'OUT' && { borderColor: '#ef4444', backgroundColor: '#fef2f2' }]}
                  onPress={() => setStockFilter('OUT')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, stockFilter === 'OUT' && { color: '#dc2626', fontWeight: '800' }]} numberOfLines={1}>
                    Hết hàng ({stockCounts.out})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chipScrollItem, stockFilter === 'LOW' && { borderColor: '#f59e0b', backgroundColor: '#fffbeb' }]}
                  onPress={() => setStockFilter('LOW')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, stockFilter === 'LOW' && { color: '#d97706', fontWeight: '800' }]} numberOfLines={1}>
                    Sắp hết ({stockCounts.low})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chipScrollItem, stockFilter === 'RESERVED' && styles.chipActive]}
                  onPress={() => setStockFilter('RESERVED')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, stockFilter === 'RESERVED' && styles.chipTextActive]} numberOfLines={1}>
                    Giữ chỗ ({stockCounts.reserved})
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Danh sách phụ tùng */}
              {filteredStockItems.length === 0 ? (
                items.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Boxes size={40} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>
                      {services.some((s) => s.enabled)
                        ? 'Chưa có phụ tùng nào trong kho'
                        : 'Chưa có dịch vụ nào được bật'}
                    </Text>
                    <Text style={styles.emptySub}>
                      {services.some((s) => s.enabled)
                        ? 'Dịch vụ của bạn đã được bật. Vui lòng bấm "Đồng bộ từ Sàn" để tự động nhập đầy đủ danh mục phụ tùng chuẩn vào kho.'
                        : 'Hãy chuyển sang tab "Dịch vụ" để bật các dịch vụ bạn muốn cung cấp. Phụ tùng tương ứng sẽ tự động xuất hiện tại đây để bạn nhập kho và cài giá.'}
                    </Text>
                    {services.some((s) => s.enabled) ? (
                      <TouchableOpacity
                        style={[styles.emptyActionBtn, { marginTop: 12, backgroundColor: BRAND, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }]}
                        onPress={handleSyncCatalog}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Đồng bộ danh mục chuẩn</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.emptyActionBtn, { marginTop: 12, backgroundColor: BRAND, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }]}
                        onPress={() => setActiveTab('SERVICES')}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Sang tab Dịch vụ</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Boxes size={40} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>
                      {stockFilter === 'OUT'
                        ? 'Không có mặt hàng hết hàng'
                        : stockFilter === 'LOW'
                        ? 'Không có mặt hàng sắp hết'
                        : stockFilter === 'LABOR'
                        ? 'Không có dịch vụ công thợ'
                        : 'Không có mặt hàng nào phù hợp'}
                    </Text>
                    <Text style={styles.emptySub}>
                      {stockFilter === 'OUT'
                        ? 'Kho hàng hiện tại không có phụ tùng nào bị hết hàng (tồn khả dụng = 0).'
                        : stockFilter === 'LOW'
                        ? 'Kho hàng hiện tại không có phụ tùng nào sắp hết (còn 1-3 cái).'
                        : stockFilter === 'RESERVED'
                        ? 'Hiện không có mặt hàng nào đang được giữ chỗ theo đơn cứu hộ.'
                        : stockFilter === 'LABOR'
                        ? 'Hiện không có dịch vụ công thợ nào phù hợp với bộ lọc.'
                        : 'Không tìm thấy phụ tùng phù hợp với bộ lọc hiện tại.'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.emptyActionBtn, { marginTop: 12, backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }]}
                      onPress={() => {
                        setStockFilter('ALL');
                        setSearchQuery('');
                        setVehicleFilter('ALL');
                        setCategoryFilter('ALL');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#475569', fontWeight: '700', fontSize: 13 }}>Xem tất cả mặt hàng</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                filteredStockItems.map((item) => {
                  const isPart = item.itemType === 'PART';
                  const outOfStock = isPart && (item.stockStatus === 'OUT_OF_STOCK' || item.availableQty <= 0);
                  const lowStock = isPart && !outOfStock && (item.stockStatus === 'LOW_STOCK' || item.lowStock || item.availableQty <= (item.minStockQty ?? 3));

                  return (
                    <View key={item.id} style={styles.stockItemCard}>
                      {/* Top Header của Card */}
                      <View style={styles.stockItemTop}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.stockCatPill}>{item.categoryName || 'Phụ tùng'}</Text>
                          </View>
                          <Text style={styles.stockItemName}>{item.name}</Text>
                        </View>

                        <View
                          style={[
                            styles.stockBadge,
                            !isPart
                              ? { backgroundColor: '#f1f5f9' }
                              : outOfStock
                              ? styles.stockBadgeRed
                              : lowStock
                              ? styles.stockBadgeAmber
                              : styles.stockBadgeGreen,
                          ]}
                        >
                          <Text
                            style={[
                              styles.stockBadgeText,
                              !isPart
                                ? { color: '#475569' }
                                : outOfStock
                                ? styles.stockTextRed
                                : lowStock
                                ? styles.stockTextAmber
                                : styles.stockTextGreen,
                            ]}
                          >
                            {!isPart ? 'Dịch vụ công thợ' : outOfStock ? 'Hết hàng' : lowStock ? 'Sắp hết' : 'Đủ hàng'}
                          </Text>
                        </View>
                      </View>

                      {/* Khối định mức tồn kho */}
                      <View style={styles.stockQuantitiesRow}>
                        <View style={styles.qtyBox}>
                          <Text style={styles.qtyBoxLabel}>Tồn thực tế</Text>
                          <Text style={styles.qtyBoxVal}>{isPart ? item.onHandQty : '--'}</Text>
                        </View>
                        <View style={styles.qtyDivider} />
                        <View style={styles.qtyBox}>
                          <Text style={styles.qtyBoxLabel}>Đang giữ chỗ</Text>
                          <Text style={[styles.qtyBoxVal, { color: '#2563eb' }]}>{isPart ? item.reservedQty : '0'}</Text>
                        </View>
                        <View style={styles.qtyDivider} />
                        <View style={styles.qtyBox}>
                          <Text style={styles.qtyBoxLabel}>Khả dụng</Text>
                          <Text
                            style={[
                              styles.qtyBoxVal,
                              { color: !isPart ? '#059669' : outOfStock ? '#ef4444' : '#059669', fontWeight: '800' },
                            ]}
                          >
                            {isPart ? (
                              <>
                                {item.availableQty} <Text style={{ fontSize: 11, fontWeight: '600', color: SUB }}>{item.unitLabel}</Text>
                              </>
                            ) : (
                              'Sẵn sàng'
                            )}
                          </Text>
                        </View>
                      </View>

                      {/* Khối Giá vốn & Giá sửa chữa */}
                      <View style={styles.stockPricesContainer}>
                        {item.minAllowedPrice > 0 && (
                          <View style={styles.priceRangeCenterRow}>
                            <View style={styles.priceRangeTag}>
                              <Text style={styles.priceRangeHint}>
                                Khung sàn - trần: {Number(item.minAllowedPrice).toLocaleString('vi-VN')}₫ - {Number(item.maxAllowedPrice).toLocaleString('vi-VN')}₫
                              </Text>
                            </View>
                          </View>
                        )}

                        <View style={styles.stockPricesRow}>
                          <View style={styles.priceColumn}>
                            <Text style={styles.stockPriceSubLabel}>Giá vốn (nhập):</Text>
                            <Text style={styles.costPriceValue}>{formatVnd(item.costPrice)}</Text>
                          </View>

                          <View style={styles.verticalDivider} />

                          <View style={[styles.priceColumn, { alignItems: 'flex-end' }]}>
                            <Text style={styles.stockPriceSubLabel}>Giá sửa chữa:</Text>
                            <Text style={styles.sellingPriceValue}>{formatVnd(item.sellingPrice)}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Thanh tác vụ: 1 Nút chính Cài giá & Tỷ lệ + 3 Nút phụ gọn gàng */}
                      <View style={styles.stockActionContainer}>
                        <TouchableOpacity
                          style={styles.primaryConfigBtn}
                          activeOpacity={0.8}
                          onPress={() => {
                            router.push({
                              pathname: '/garage-owner/service-pricing',
                              params: {
                                id: String(item.serviceId || item.id),
                                title: item.name,
                                categoryName: item.categoryName || 'Phụ tùng cứu hộ',
                                categoryVehicleType: item.vehicleType || 'BOTH',
                                minPrice: String(item.minAllowedPrice || 0),
                                maxPrice: String(item.maxAllowedPrice || 0),
                                price: String(item.sellingPrice || item.minAllowedPrice || 0),
                                costPrice: String(item.costPrice || 0),
                                itemType: item.itemType || (isPart ? 'PART' : 'LABOR'),
                                unit: item.unitLabel || 'Cái',
                                isActive: String(item.isActive ?? true),
                              },
                            });
                          }}
                        >
                          <Pencil size={13} color="#ffffff" strokeWidth={2.4} />
                          <Text style={styles.primaryConfigBtnText}>Cài giá & Tỷ lệ</Text>
                        </TouchableOpacity>

                        <View style={styles.secondaryActionsGroup}>
                          <TouchableOpacity
                            style={[styles.smallActionBtn, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}
                            onPress={() => {
                              if (!isPart) {
                                Alert.alert('Dịch vụ công thợ', 'Dịch vụ công thợ không quản lý số lượng tồn kho vật lý.');
                                return;
                              }
                              openAdjustModal(item, 'INBOUND');
                            }}
                            activeOpacity={0.7}
                          >
                            <Plus size={13} color="#059669" strokeWidth={2.4} />
                            <Text style={[styles.smallActionBtnText, { color: '#059669' }]}>Nhập kho</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.smallActionBtn, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}
                            onPress={() => {
                              if (!isPart) {
                                Alert.alert('Dịch vụ công thợ', 'Dịch vụ công thợ không quản lý số lượng tồn kho vật lý.');
                                return;
                              }
                              openAdjustModal(item, 'ADJUSTMENT');
                            }}
                            activeOpacity={0.7}
                          >
                            <Sliders size={13} color="#475569" strokeWidth={2.4} />
                            <Text style={[styles.smallActionBtnText, { color: '#475569' }]}>Kiểm kê</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.smallActionBtn, { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }]}
                            onPress={() => {
                              if (!isPart) {
                                Alert.alert('Dịch vụ công thợ', 'Dịch vụ công thợ không quản lý số lượng tồn kho vật lý.');
                                return;
                              }
                              openAdjustModal(item, 'DAMAGED');
                            }}
                            activeOpacity={0.7}
                          >
                            <AlertTriangle size={13} color="#e11d48" strokeWidth={2.4} />
                            <Text style={[styles.smallActionBtnText, { color: '#e11d48' }]}>Báo hỏng</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: NHẬT KÝ GIAO DỊCH KHO                                              */}
          {/* ========================================================================= */}
          {activeTab === 'LEDGER' && (
            <View style={{ gap: 10 }}>
              <Text style={styles.groupOverviewText}>
                {transactions.length} giao dịch phát sinh gần đây nhất
              </Text>

              {transactions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <History size={40} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>Chưa có lịch sử giao dịch</Text>
                  <Text style={styles.emptySub}>Mọi lượt nhập kho hoặc thợ xuất phụ tùng sẽ lưu tại đây</Text>
                </View>
              ) : (
                transactions.map((tx) => {
                  const isPlus = tx.quantityChange > 0;

                  return (
                    <View key={tx.id} style={styles.txCard}>
                      <View style={styles.txTopRow}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.txItemName}>{tx.itemName || 'Phụ tùng'}</Text>
                          <Text style={styles.txTime}>{tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : ''}</Text>
                        </View>
                        <Text style={[styles.txQtyChange, { color: isPlus ? '#059669' : '#dc2626' }]}>
                          {isPlus ? `+${tx.quantityChange}` : tx.quantityChange}
                        </Text>
                      </View>
                      <View style={styles.txBottomRow}>
                        <Text style={styles.txTypeBadge}>{getTxTypeLabel(tx.txType, tx.txTypeDescription)}</Text>
                        <Text style={styles.txNote} numberOfLines={1}>
                          {tx.note && !tx.note.includes('INBOUND') && !tx.note.includes('ADJUSTMENT') ? tx.note : 'Không có ghi chú'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NHẬP KHO / KIỂM KÊ / BÁO HỎNG                                      */}
      {/* ========================================================================= */}
      <Modal visible={!!adjustItem} transparent animationType="slide" onRequestClose={() => setAdjustItem(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { maxHeight: '82%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.modalHeaderIconBox,
                    {
                      backgroundColor:
                        txType === 'INBOUND' ? '#fff7ed' : txType === 'ADJUSTMENT' ? '#f1f5f9' : '#fff1f2',
                    },
                  ]}
                >
                  {txType === 'INBOUND' ? (
                    <Plus size={16} color={BRAND} strokeWidth={2.4} />
                  ) : txType === 'ADJUSTMENT' ? (
                    <Sliders size={16} color="#475569" strokeWidth={2.4} />
                  ) : (
                    <AlertTriangle size={16} color="#e11d48" strokeWidth={2.4} />
                  )}
                </View>
                <Text style={styles.modalTitle}>
                  {txType === 'INBOUND' ? 'Nhập thêm phụ tùng' : txType === 'ADJUSTMENT' ? 'Kiểm kê kho' : 'Báo hỏng / Xuất hủy'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAdjustItem(null)} style={styles.modalCloseBtn}>
                <X size={20} color={SUB} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
              {/* Card thông tin mặt hàng */}
              <View style={styles.modalItemHeader}>
                <Text style={styles.modalItemName}>{adjustItem?.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Text style={styles.modalUnitTag}>Đơn vị tính: {adjustItem?.unitLabel || 'Cái'}</Text>
                  <Text style={styles.modalStockTag}>Tồn hiện tại: {adjustItem?.onHandQty ?? 0}</Text>
                </View>
              </View>

              {/* Ô nhập số lượng */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {txType === 'ADJUSTMENT' ? 'Số lượng thực tế sau kiểm kê' : 'Số lượng thay đổi'} *
                </Text>
                <View style={styles.modalInputWrap}>
                  <TextInput
                    style={styles.modalInputInner}
                    keyboardType="numeric"
                    value={qtyInput}
                    onChangeText={setQtyInput}
                    placeholder="Nhập số lượng"
                    placeholderTextColor="#94a3b8"
                  />
                  <Text style={styles.modalInputSuffix}>{adjustItem?.unitLabel || 'Cái'}</Text>
                </View>
              </View>

              {/* Ô ghi chú */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ghi chú lý do</Text>
                <TextInput
                  style={[styles.modalInputInner, { height: 68, textAlignVertical: 'top', paddingTop: 8 }]}
                  multiline
                  value={noteInput}
                  onChangeText={setNoteInput}
                  placeholder={
                    txType === 'INBOUND'
                      ? 'VD: Nhập thêm phụ tùng từ nhà cung cấp...'
                      : txType === 'ADJUSTMENT'
                      ? 'VD: Kiểm đếm kho định kỳ phát hiện chênh lệch...'
                      : 'VD: Rơi vỡ, hỏng hóc trong quá trình lưu kho...'
                  }
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Nút hành động */}
              <TouchableOpacity
                style={[
                  styles.confirmModalBtn,
                  { backgroundColor: txType === 'DAMAGED' ? '#e11d48' : BRAND, marginTop: 8 },
                ]}
                onPress={handleConfirmAdjust}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmModalBtnText}>
                    {txType === 'INBOUND'
                      ? 'Xác nhận nhập kho'
                      : txType === 'ADJUSTMENT'
                      ? 'Xác nhận kiểm kê'
                      : 'Xác nhận báo hỏng'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: BỘ LỌC THEO LOẠI XE & DANH MỤC                                     */}
      {/* ========================================================================= */}
      <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { maxHeight: '75%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Filter size={18} color={BRAND} />
                <Text style={styles.modalTitle}>Bộ lọc nâng cao</Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color={SUB} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
              {/* Lọc theo Loại phương tiện */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Loại phương tiện</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.filterChipBtn, vehicleFilter === 'ALL' && styles.filterChipBtnActive]}
                    onPress={() => setVehicleFilter('ALL')}
                  >
                    <Text style={[styles.filterChipBtnText, vehicleFilter === 'ALL' && styles.filterChipBtnTextActive]}>
                      Tất cả xe
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChipBtn, vehicleFilter === 'CAR' && styles.filterChipBtnActive]}
                    onPress={() => setVehicleFilter('CAR')}
                  >
                    <Car size={15} color={vehicleFilter === 'CAR' ? BRAND : '#64748b'} />
                    <Text style={[styles.filterChipBtnText, vehicleFilter === 'CAR' && styles.filterChipBtnTextActive]}>
                      Ô tô
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChipBtn, vehicleFilter === 'MOTORBIKE' && styles.filterChipBtnActive]}
                    onPress={() => setVehicleFilter('MOTORBIKE')}
                  >
                    <Bike size={15} color={vehicleFilter === 'MOTORBIKE' ? BRAND : '#64748b'} />
                    <Text style={[styles.filterChipBtnText, vehicleFilter === 'MOTORBIKE' && styles.filterChipBtnTextActive]}>
                      Xe máy
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Lọc theo Nhóm danh mục */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nhóm danh mục</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.categoryFilterChip, categoryFilter === 'ALL' && styles.categoryFilterChipActive]}
                    onPress={() => setCategoryFilter('ALL')}
                  >
                    <Text
                      style={[
                        styles.categoryFilterChipText,
                        categoryFilter === 'ALL' && styles.categoryFilterChipTextActive,
                      ]}
                    >
                      Tất cả danh mục
                    </Text>
                  </TouchableOpacity>

                  {categoryOptions.map((c) => (
                    <TouchableOpacity
                      key={c.name}
                      style={[styles.categoryFilterChip, categoryFilter === c.name && styles.categoryFilterChipActive]}
                      onPress={() => setCategoryFilter(c.name)}
                    >
                      <Text
                        style={[
                          styles.categoryFilterChipText,
                          categoryFilter === c.name && styles.categoryFilterChipTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Nút hành động */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.confirmModalBtn, { flex: 1, backgroundColor: '#f1f5f9' }]}
                  onPress={() => {
                    setVehicleFilter('ALL');
                    setCategoryFilter('ALL');
                    setFilterModalVisible(false);
                  }}
                >
                  <Text style={[styles.confirmModalBtnText, { color: '#475569' }]}>Đặt lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmModalBtn, { flex: 2 }]}
                  onPress={() => setFilterModalVisible(false)}
                >
                  <Text style={styles.confirmModalBtnText}>Áp dụng bộ lọc</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: INK,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: SUB,
    marginTop: 1,
  },
  syncBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
  },
  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tabBtnActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: BRAND,
    fontWeight: '800',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#f8fafc',
  },
  searchBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTriggerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTriggerBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BRAND,
  },
  clearFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#fff7ed',
  },
  clearFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND,
  },
  filterChipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  filterChipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipBtnTextActive: {
    color: BRAND,
    fontWeight: '800',
  },
  categoryFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryFilterChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  categoryFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryFilterChipTextActive: {
    color: BRAND,
    fontWeight: '800',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: INK,
    padding: 0,
  },
  clearSearchBtn: {
    padding: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: SUB,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chipsScrollContent: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  chipScrollItem: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: SUB,
    textAlign: 'center',
  },
  chipTextActive: {
    color: BRAND,
    fontWeight: '700',
  },
  accordionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  groupOverviewText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: SUB,
  },
  toggleAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
  },
  toggleAllBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BRAND,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#ffffff',
  },
  catHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  catHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: INK,
  },
  catSub: {
    fontSize: 11.5,
    color: SUB,
    marginTop: 1,
  },
  chevronBox: {
    padding: 4,
  },
  servicesListWrap: {
    padding: 12,
    gap: 10,
  },
  serviceItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  svcTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  svcIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svcTitleCol: {
    flex: 1,
  },
  svcName: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
  },
  svcPriceBand: {
    fontSize: 11,
    color: SUB,
    marginTop: 2,
  },
  partPill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  partPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1',
  },
  laborPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  laborPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  svcBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  svcPriceTagWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  svcPriceLabel: {
    fontSize: 12,
    color: SUB,
  },
  svcPriceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND,
  },
  svcPriceUnit: {
    fontSize: 11,
    color: SUB,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  svcEditPriceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  svcEditPriceText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND,
  },
  stockBadgeGreen: {
    backgroundColor: '#ecfdf5',
  },
  stockBadgeAmber: {
    backgroundColor: '#fffbeb',
  },
  stockBadgeRed: {
    backgroundColor: '#fef2f2',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stockTextGreen: {
    color: GREEN,
  },
  stockTextAmber: {
    color: '#d97706',
  },
  stockTextRed: {
    color: RED,
  },
  noticeToStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginTop: 4,
  },
  noticeToStockText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
    lineHeight: 16,
  },
  svcActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 2,
  },
  svcPricingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  svcPricingBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BRAND,
  },
  svcStockInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  svcStockInBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: GREEN,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiIconDot: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    color: INK,
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },
  emptySub: {
    fontSize: 12,
    color: SUB,
    textAlign: 'center',
    lineHeight: 18,
  },
  stockItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  stockItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  skuPill: {
    fontSize: 10.5,
    fontWeight: '700',
    color: BRAND,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#fed7aa',
  },
  stockCatPill: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockItemName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: INK,
    lineHeight: 20,
  },
  stockQuantitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  qtyBox: {
    flex: 1,
    alignItems: 'center',
  },
  qtyBoxLabel: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '500',
  },
  qtyBoxVal: {
    fontSize: 14.5,
    fontWeight: '800',
    color: INK,
    marginTop: 2,
  },
  qtyDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  stockPricesContainer: {
    backgroundColor: '#fbfcfd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 8,
  },
  priceRangeCenterRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRangeTag: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#fed7aa',
  },
  priceRangeHint: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#c2410c',
  },
  stockPricesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceColumn: {
    flex: 1,
    gap: 2,
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 10,
  },
  stockPriceSubLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  costPriceValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
  },
  sellingPriceValue: {
    fontSize: 15,
    fontWeight: '900',
    color: BRAND,
  },
  priceRangeTag: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
    borderWidth: 0.5,
    borderColor: '#fed7aa',
  },
  priceRangeHint: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c2410c',
  },
  stockActionContainer: {
    gap: 8,
    marginTop: 2,
  },
  primaryConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryConfigBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryActionsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  smallActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  txCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  txItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
    lineHeight: 19,
  },
  txTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  txQtyChange: {
    fontSize: 17,
    fontWeight: '900',
  },
  txBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  txTypeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#fed7aa',
  },
  txNote: {
    flex: 1,
    fontSize: 11.5,
    color: '#64748b',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: INK,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalHeaderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemHeader: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '800',
    color: INK,
    lineHeight: 20,
  },
  modalUnitTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalStockTag: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  modalInputInner: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: INK,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  modalInputSuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: SUB,
    marginLeft: 6,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: INK,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: INK,
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  smallChipActive: {
    backgroundColor: '#ffedd5',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  smallChipText: {
    fontSize: 11.5,
    color: SUB,
    fontWeight: '600',
  },
  smallChipTextActive: {
    color: BRAND,
    fontWeight: '800',
  },
  confirmModalBtn: {
    backgroundColor: BRAND,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  confirmModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

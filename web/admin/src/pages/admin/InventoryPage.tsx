import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Store,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  Car,
  Bike,
  BellRing,
  Edit3,
  Layers,
  AlertCircle,
  Check,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

interface GarageStockSummaryItem {
  garageId: number;
  garageName: string;
  garageAddress: string;
  garagePhone: string;
  isOnline: boolean;
  totalSkus: number;
  totalOnHandUnits: number;
  totalReservedUnits: number;
  lowStockSkus: number;
  outOfStockSkus: number;
  totalCostValue: number;
}

interface InventoryItemDto {
  id: number;
  garageId: number;
  garageName: string;
  serviceId?: number | null;
  serviceCode?: string | null;
  serviceName?: string | null;
  minAllowedPrice?: number | null;
  maxAllowedPrice?: number | null;
  sku: string;
  name: string;
  itemType: 'PART' | 'LABOR';
  categoryName?: string;
  vehicleType?: 'CAR' | 'MOTORBIKE' | 'BOTH';
  unitLabel: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  minStockQty: number;
  costPrice: number;
  sellingPrice: number;
  supplierName?: string | null;
  isActive: boolean;
  stockStatus: 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | string;
  updatedAt?: string;
}

interface StandardServiceItem {
  id: number;
  categoryId: number;
  categoryName?: string;
  categoryCode?: string;
  name: string;
  code: string;
  feeType: 'RESCUE_FEE' | 'TOWING_FEE' | 'SERVICE_FEE';
  minPrice: number;
  maxPrice: number;
  unit: 'LAN' | 'KM';
  itemType: 'PART' | 'LABOR';
  defaultUnitLabel?: string;
  recommendedMinStock?: number;
  isActive?: boolean;
  createdAt?: string;
}

const formatVnd = (n?: number | null) => {
  if (n === null || n === undefined) return '0 ₫';
  return Number(n).toLocaleString('vi-VN') + ' ₫';
};

const formatCurrencyInput = (val: string | number) => {
  if (!val) return '';
  const num = String(val).replace(/\D/g, '');
  return num ? Number(num).toLocaleString('vi-VN') : '';
};

const parseCurrency = (val: string): number => {
  const digits = String(val).replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

export default function InventoryPage() {
  // ── Tabs: TỔNG QUAN (tab mở đầu), DANH MỤC CHUẨN (màn làm việc chính), GIÁM SÁT GARA ──
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STANDARD_CATALOG' | 'GARAGE_MONITOR'>('OVERVIEW');

  // Dữ liệu từ API
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [, setScanning] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [garageSummaries, setGarageSummaries] = useState<GarageStockSummaryItem[]>([]);
  const [garageItems, setGarageItems] = useState<InventoryItemDto[]>([]);
  const [standardServices, setStandardServices] = useState<StandardServiceItem[]>([]);

  // ── Tab 2: Danh Mục Chuẩn States ──
  const [catalogFilterType, setCatalogFilterType] = useState<'ALL' | 'PART' | 'LABOR'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [editingPriceService, setEditingPriceService] = useState<StandardServiceItem | null>(null);
  const [inlineMinPrice, setInlineMinPrice] = useState('');
  const [inlineMaxPrice, setInlineMaxPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState<number>(4);

  // ── Tab 3: Giám Sát Gara States ──
  const [selectedMonitorGarageId, setSelectedMonitorGarageId] = useState<number | null>(null);
  const [monitorQuickFilter, setMonitorQuickFilter] = useState<'ALL' | 'OUT' | 'LOW' | 'PART' | 'LABOR'>('ALL');
  const [monitorSearch, setMonitorSearch] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Tải dữ liệu toàn hệ thống
  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);

      const [invRes, svcRes] = await Promise.all([
        axiosClient.get('/admin/inventory/overview'),
        axiosClient.get('/services').catch(() => ({ data: [] })),
      ]);

      // 1. Dữ liệu kho & gara
      const invData = (invRes as any)?.data || invRes;
      if (invData) {
        const garList = Array.isArray(invData.garageSummaries) ? invData.garageSummaries : [];
        setGarageSummaries(garList);
        setGarageItems(Array.isArray(invData.items) ? invData.items : []);

        // Mặc định chọn Gara đầu tiên trong tab Giám Sát
        if (garList.length > 0 && selectedMonitorGarageId === null) {
          setSelectedMonitorGarageId(garList[0].garageId);
        }
      }

      // 2. Dữ liệu danh mục chuẩn
      const svcData = (svcRes as any)?.data?.data || (svcRes as any)?.data || svcRes;
      if (Array.isArray(svcData)) {
        setStandardServices(svcData);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu:', err);
      showToast('Không thể đồng bộ dữ liệu hệ thống');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [selectedMonitorGarageId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Đồng bộ danh mục chuẩn tới kho Gara
  const handleSyncCatalog = async () => {
    try {
      setSyncing(true);
      await axiosClient.post('/admin/inventory/sync-catalog');
      showToast('Đồng bộ danh mục chuẩn vào kho các Gara đối tác thành công!');
      await fetchData(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Lỗi khi đồng bộ danh mục chuẩn');
    } finally {
      setSyncing(false);
    }
  };

  // ── TÍNH TOÁN DỮ LIỆU TAB 1: TỔNG QUAN ──
  // 1. Dải 4 chỉ số gọn:
  // - Số mục trong danh mục chuẩn
  // - Số gara đang bán phụ tùng
  // - Số gara có phụ tùng hết hàng
  // - Tổng số mã đang hết hàng toàn hệ thống (ô này có nền đỏ nhạt)
  const overviewStats = useMemo(() => {
    const totalStandardItems = standardServices.length;

    // Gara đang bán phụ tùng: Có ít nhất 1 mã phụ tùng đang bật
    const activeSellingGaragesSet = new Set<number>();
    // Gara có phụ tùng hết hàng: Có ít nhất 1 mã phụ tùng đang bật mà availableQty <= 0
    const outStockGaragesSet = new Set<number>();
    let totalOutStockCodes = 0;

    garageItems.forEach(item => {
      if (item.isActive && item.itemType === 'PART') {
        activeSellingGaragesSet.add(Number(item.garageId));
        if (item.availableQty <= 0) {
          outStockGaragesSet.add(Number(item.garageId));
          totalOutStockCodes++;
        }
      }
    });

    return {
      totalStandardItems,
      garagesSellingParts: activeSellingGaragesSet.size,
      garagesWithOutOfStock: outStockGaragesSet.size,
      totalOutOfStockCodes: totalOutStockCodes,
    };
  }, [standardServices, garageItems]);

  // 2. Danh sách "Gara cần chú ý": Gara có nhiều mã hết hàng nhất
  const attentionGarages = useMemo(() => {
    const map = new Map<number, {
      garageId: number;
      garageName: string;
      garageAddress: string;
      isOnline: boolean;
      activeParts: number;
      outStockCount: number;
      lowStockCount: number;
    }>();

    // Khởi tạo từ garageSummaries
    garageSummaries.forEach(g => {
      map.set(g.garageId, {
        garageId: g.garageId,
        garageName: g.garageName,
        garageAddress: g.garageAddress,
        isOnline: g.isOnline,
        activeParts: 0,
        outStockCount: 0,
        lowStockCount: 0,
      });
    });

    // Tính toán từ garageItems (chỉ tính các mặt hàng ĐANG BẬT)
    garageItems.forEach(item => {
      if (!item.isActive || item.itemType !== 'PART') return;
      const g = map.get(Number(item.garageId));
      if (g) {
        g.activeParts++;
        if (item.availableQty <= 0) {
          g.outStockCount++;
        } else if (item.availableQty <= (item.minStockQty || 3)) {
          g.lowStockCount++;
        }
      }
    });

    return Array.from(map.values())
      .filter(g => g.outStockCount > 0 || g.lowStockCount > 0)
      .sort((a, b) => b.outStockCount - a.outStockCount || b.lowStockCount - a.lowStockCount);
  }, [garageSummaries, garageItems]);

  // 3. Danh sách "Mục hết hàng nhiều nơi": Gộp các dịch vụ trùng nhau bị nhiều Gara hết
  const widespreadShortages = useMemo(() => {
    // Tra cứu danh mục chuẩn theo ID và theo tên chuẩn hóa để đảm bảo dịch vụ trùng tên/id luôn gom lại 1 dòng
    const stdById = new Map<number, StandardServiceItem>();
    const stdByName = new Map<string, StandardServiceItem>();
    standardServices.forEach(s => {
      stdById.set(s.id, s);
      if (s.name) {
        stdByName.set(s.name.trim().toLowerCase().replace(/\s+/g, ' '), s);
      }
    });

    const map = new Map<string, {
      serviceCode: string;
      name: string;
      categoryName: string;
      unitLabel: string;
      garageIds: Set<number>;
    }>();

    garageItems.forEach(item => {
      // Chỉ xét phụ tùng vật lý đang bật bán nhưng hết hàng
      if (!item.isActive || item.itemType !== 'PART' || item.availableQty > 0) return;

      const normName = (item.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const stdSvc = (item.serviceId ? stdById.get(item.serviceId) : null) || stdByName.get(normName);

      const canonicalName = (stdSvc?.name || item.name || '').trim();
      const canonicalCategory = stdSvc?.categoryName || item.categoryName || 'Phụ tùng';
      const canonicalUnit = stdSvc?.defaultUnitLabel || item.unitLabel || 'Cái';
      const canonicalCode = stdSvc?.code || item.serviceCode || item.sku || 'PT';

      // Khóa gom nhóm duy nhất: gom theo ID danh mục chuẩn hoặc theo tên chuẩn hóa
      const key = stdSvc?.id
        ? `std_${stdSvc.id}`
        : (item.serviceCode?.trim().toUpperCase() || canonicalName.toLowerCase().replace(/\s+/g, ' '));

      const curr = map.get(key) || {
        serviceCode: canonicalCode,
        name: canonicalName,
        categoryName: canonicalCategory,
        unitLabel: canonicalUnit,
        garageIds: new Set<number>(),
      };

      curr.garageIds.add(item.garageId);
      map.set(key, curr);
    });

    return Array.from(map.values())
      .map(item => ({
        ...item,
        outGarageCount: item.garageIds.size,
      }))
      .filter(item => item.outGarageCount >= 1)
      .sort((a, b) => b.outGarageCount - a.outGarageCount);
  }, [garageItems, standardServices]);

  // ── TÍNH TOÁN DỮ LIỆU TAB 2: DANH MỤC CHUẨN ──
  // Đếm số lượng Gara đang bật từng mục chuẩn
  const serviceActiveGaragesCountMap = useMemo(() => {
    const map = new Map<number, number>();
    garageItems.forEach(item => {
      if (item.serviceId && item.isActive) {
        map.set(item.serviceId, (map.get(item.serviceId) || 0) + 1);
      }
    });
    return map;
  }, [garageItems]);

  // Danh sách tên các nhóm danh mục cho dropdown lọc
  const availableCategoryNames = useMemo(() => {
    const set = new Set<string>();
    standardServices.forEach(s => {
      if (s.categoryName) set.add(s.categoryName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [standardServices]);

  // Nhóm dịch vụ theo Category
  const groupedStandardServices = useMemo(() => {
    const filtered = standardServices.filter(svc => {
      if (catalogFilterType === 'PART' && svc.itemType !== 'PART') return false;
      if (catalogFilterType === 'LABOR' && svc.itemType === 'PART') return false;
      if (selectedCategoryFilter !== 'ALL' && svc.categoryName !== selectedCategoryFilter) return false;
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase();
        const matchName = svc.name?.toLowerCase().includes(q);
        const matchCode = svc.code?.toLowerCase().includes(q);
        const matchCat = svc.categoryName?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCat) return false;
      }
      return true;
    });

    const groups = new Map<string, StandardServiceItem[]>();
    filtered.forEach(svc => {
      const catName = svc.categoryName || 'Dịch vụ khác';
      const list = groups.get(catName) || [];
      list.push(svc);
      groups.set(catName, list);
    });

    return Array.from(groups.entries()).map(([categoryName, items]) => ({
      categoryName,
      items,
    }));
  }, [standardServices, catalogFilterType, selectedCategoryFilter, catalogSearch]);

  // Tự động chuyển về trang 1 khi thay đổi bộ lọc hoặc số lượng hiển thị
  useEffect(() => {
    setCatalogPage(1);
  }, [catalogFilterType, selectedCategoryFilter, catalogSearch, catalogPageSize]);

  // Tính toán phân trang cho Danh mục chuẩn
  const totalCatalogGroups = groupedStandardServices.length;
  const totalCatalogPages = catalogPageSize === 0 ? 1 : Math.ceil(totalCatalogGroups / catalogPageSize) || 1;

  const currentCatalogGroups = useMemo(() => {
    if (catalogPageSize === 0) return groupedStandardServices;
    const start = (catalogPage - 1) * catalogPageSize;
    return groupedStandardServices.slice(start, start + catalogPageSize);
  }, [groupedStandardServices, catalogPage, catalogPageSize]);

  const totalFilteredItems = useMemo(
    () => groupedStandardServices.reduce((sum, g) => sum + g.items.length, 0),
    [groupedStandardServices]
  );

  // Bật/tắt mục toàn hệ thống
  const handleToggleStandardService = async (service: StandardServiceItem) => {
    const nextActive = !service.isActive;
    try {
      await axiosClient.put(`/services/${service.id}`, {
        isActive: nextActive,
      });
      setStandardServices(prev =>
        prev.map(s => (s.id === service.id ? { ...s, isActive: nextActive } : s))
      );
      showToast(nextActive ? `Đã bật "${service.name}" toàn hệ thống` : `Đã tắt "${service.name}" toàn hệ thống`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể đổi trạng thái dịch vụ');
    }
  };

  // Lưu chỉnh sửa khung giá
  const handleSavePriceRange = async () => {
    if (!editingPriceService) return;
    const minP = parseCurrency(inlineMinPrice);
    const maxP = parseCurrency(inlineMaxPrice);

    if (minP < 0 || maxP < 0) {
      showToast('Giá không được để số âm');
      return;
    }
    if (minP > maxP) {
      showToast('Giá tối thiểu không được lớn hơn giá tối đa');
      return;
    }

    try {
      setSavingPrice(true);
      await axiosClient.put(`/services/${editingPriceService.id}`, {
        minPrice: minP,
        maxPrice: maxP,
      });
      setStandardServices(prev =>
        prev.map(s => (s.id === editingPriceService.id ? { ...s, minPrice: minP, maxPrice: maxP } : s))
      );
      setEditingPriceService(null);
      showToast(`Đã cập nhật khung giá cho "${editingPriceService.name}" thành công!`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể cập nhật khung giá');
    } finally {
      setSavingPrice(false);
    }
  };

  // ── TÍNH TOÁN DỮ LIỆU TAB 3: GIÁM SÁT GARA ──
  // Thống kê số lượng theo từng Gara (chỉ tính các mục ĐANG BẬT)
  const monitorGaragesMetrics = useMemo(() => {
    return garageSummaries.map(g => {
      let activeSelling = 0;
      let lowStock = 0;
      let outStock = 0;

      garageItems.forEach(i => {
        if (Number(i.garageId) === Number(g.garageId) && i.isActive) {
          activeSelling++;
          if (i.itemType === 'PART') {
            if (i.availableQty <= 0) outStock++;
            else if (i.availableQty <= (i.minStockQty || 3)) lowStock++;
          }
        }
      });

      return {
        ...g,
        activeSelling,
        lowStock,
        outStock,
      };
    });
  }, [garageSummaries, garageItems]);

  // Danh sách các mặt hàng của Gara đang được chọn
  const selectedGarageInfo = useMemo(() => {
    return garageSummaries.find(g => g.garageId === selectedMonitorGarageId);
  }, [garageSummaries, selectedMonitorGarageId]);

  const selectedGarageInventoryItems = useMemo(() => {
    if (!selectedMonitorGarageId) return [];
    return garageItems
      .filter(item => {
        if (Number(item.garageId) !== Number(selectedMonitorGarageId)) return false;
        if (!item.isActive) return false; // Chỉ hiển thị dịch vụ đang bật

        if (monitorQuickFilter === 'OUT' && (item.itemType !== 'PART' || item.availableQty > 0)) return false;
        if (monitorQuickFilter === 'LOW' && (item.itemType !== 'PART' || item.availableQty <= 0 || item.availableQty > (item.minStockQty || 3))) return false;
        if (monitorQuickFilter === 'PART' && item.itemType !== 'PART') return false;
        if (monitorQuickFilter === 'LABOR' && item.itemType === 'PART') return false;

        if (monitorSearch.trim()) {
          const q = monitorSearch.toLowerCase();
          const matchName = item.name?.toLowerCase().includes(q);
          const matchCat = item.categoryName?.toLowerCase().includes(q);
          if (!matchName && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const isOutA = a.itemType === 'PART' && a.availableQty <= 0 ? 1 : 0;
        const isOutB = b.itemType === 'PART' && b.availableQty <= 0 ? 1 : 0;
        if (isOutA !== isOutB) return isOutB - isOutA;

        const isLowA = a.itemType === 'PART' && a.availableQty > 0 && a.availableQty <= (a.minStockQty || 3) ? 1 : 0;
        const isLowB = b.itemType === 'PART' && b.availableQty > 0 && b.availableQty <= (b.minStockQty || 3) ? 1 : 0;
        if (isLowA !== isLowB) return isLowB - isLowA;

        return (a.name || '').localeCompare(b.name || '');
      });
  }, [garageItems, selectedMonitorGarageId, monitorQuickFilter, monitorSearch]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── HEADER CHÍNH ── */}
      <div className="bg-white px-6 py-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Trị Kho & Danh Mục Chuẩn
          </h1>
        </div>

        {/* Nút hành động nhanh */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncCatalog}
            disabled={syncing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Đồng bộ danh mục chuẩn tới kho tất cả Gara đối tác"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-orange-500' : ''}`} />
            <span>Đồng bộ Danh mục</span>
          </button>
        </div>
      </div>

      {/* ── THANH CHUYỂN ĐỔI 3 TAB CHỦ ĐẠO ── */}
      <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-5 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Layers className="w-4.5 h-4.5" />
          <span>1. Tổng quan</span>
        </button>

        <button
          onClick={() => setActiveTab('STANDARD_CATALOG')}
          className={`px-5 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
            activeTab === 'STANDARD_CATALOG'
              ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Package className="w-4.5 h-4.5" />
          <span>2. Danh mục chuẩn</span>
        </button>

        <button
          onClick={() => setActiveTab('GARAGE_MONITOR')}
          className={`px-5 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
            activeTab === 'GARAGE_MONITOR'
              ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Store className="w-4.5 h-4.5" />
          <span>3. Giám sát gara</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200/80 shadow-xs text-center text-slate-400 text-xs">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-500" />
          <span>Đang đồng bộ dữ liệu quản trị kho & danh mục chuẩn...</span>
        </div>
      ) : (
        <>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: TỔNG QUAN (TAB MỞ ĐẦU) ── */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Dải 4 chỉ số gọn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ô 1: Số mục trong danh mục chuẩn */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-orange-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mục trong danh mục
                </span>
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {overviewStats.totalStandardItems} <span className="text-xs font-semibold text-slate-500">mục chuẩn</span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-1">
                Bao gồm cả công thợ và phụ tùng
              </p>
            </div>

            {/* Ô 2: Số gara đang bán phụ tùng */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-orange-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Gara đang bán phụ tùng
                </span>
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {overviewStats.garagesSellingParts} <span className="text-xs font-semibold text-slate-500">/ {garageSummaries.length} Gara</span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-1">
                Có phụ tùng đang bật phục vụ cứu hộ
              </p>
            </div>

            {/* Ô 3: Số gara có phụ tùng hết hàng */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-orange-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Gara có hàng hết
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {overviewStats.garagesWithOutOfStock} <span className="text-xs font-semibold text-slate-500">Gara cần nhắc</span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-1">
                Cần nhập bổ sung kho để đảm bảo cứu hộ
              </p>
            </div>

            {/* Ô 4: Tổng số mã đang hết hàng (NỀN ĐỎ NHẠT THEO YÊU CẦU) */}
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 shadow-xs transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Mã đang hết hàng
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-700 mt-2">
                {overviewStats.totalOutOfStockCodes} <span className="text-xs font-bold text-rose-600">mã hết toàn sàn</span>
              </div>
              <p className="text-[11.5px] text-rose-600/90 mt-1 font-medium">
                Nguy cơ từ chối đơn do thiếu vật tư
              </p>
            </div>
          </div>

          {/* 2 Danh Sách "Cần Chú Ý" (Chia 2/5 và 3/5) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Danh sách 1: Gara cần chú ý (Chiếm 2/5) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Gara Cần Chú Ý</h2>
                  <p className="text-xs text-slate-500">Các Gara có nhiều phụ tùng đang bật bị hết kho</p>
                </div>
              </div>

              {attentionGarages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  Toàn bộ các Gara đối tác hiện đều đủ hàng sẵn sàng phục vụ.
                </div>
              ) : (
                <div className="space-y-3">
                  {attentionGarages.map(g => (
                    <div
                      key={g.garageId}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-orange-50/30 hover:border-orange-300 flex items-center justify-between gap-2.5 transition-all shadow-2xs overflow-hidden"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm truncate">{g.garageName}</span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              g.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                            title={g.isOnline ? 'Đang mở cửa' : 'Ngoại tuyến'}
                          />
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{g.garageAddress}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold whitespace-nowrap shadow-2xs">
                          {g.outStockCount} hết
                        </span>
                        {g.lowStockCount > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold whitespace-nowrap shadow-2xs">
                            {g.lowStockCount} sắp hết
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setSelectedMonitorGarageId(g.garageId);
                            setActiveTab('GARAGE_MONITOR');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-orange-500 hover:text-white hover:border-orange-500 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
                        >
                          Xem kho
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danh sách 2: Mục hết hàng nhiều nơi (Chiếm 3/5) */}
            <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Mục Hết Hàng Nhiều Nơi</h2>
                  <p className="text-xs text-slate-500">Phụ tùng nhiều Gara hết (dấu hiệu thiếu nguồn cung)</p>
                </div>
              </div>

              {widespreadShortages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  Không phát hiện tình trạng khan hiếm nguồn cung trên toàn sàn.
                </div>
              ) : (
                <div className="space-y-3">
                  {widespreadShortages.map(item => (
                    <div
                      key={item.serviceCode || item.name}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-orange-50/30 hover:border-orange-300 flex items-center justify-between gap-2.5 transition-all shadow-2xs overflow-hidden"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-bold text-slate-900 text-sm truncate" title={item.name}>{item.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 truncate">
                          <span className="font-semibold text-slate-600">{item.categoryName}</span>
                          <span>•</span>
                          <span>ĐVT: {item.unitLabel}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-3 py-1.5 rounded-lg font-bold text-xs bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs whitespace-nowrap">
                          {item.outGarageCount} Gara hết
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: DANH MỤC CHUẨN (MÀN LÀM VIỆC CHÍNH) ── */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'STANDARD_CATALOG' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4 p-5">
          {/* Thanh công cụ: Lọc loại, lọc nhóm danh mục, tìm kiếm */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Lọc loại: Tất cả vs Phụ tùng vs Công sửa */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setCatalogFilterType('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    catalogFilterType === 'ALL'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({standardServices.length})
                </button>
                <button
                  onClick={() => setCatalogFilterType('PART')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    catalogFilterType === 'PART'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Phụ tùng ({standardServices.filter(s => s.itemType === 'PART').length})
                </button>
                <button
                  onClick={() => setCatalogFilterType('LABOR')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    catalogFilterType === 'LABOR'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Công sửa ({standardServices.filter(s => s.itemType !== 'PART').length})
                </button>
              </div>

              {/* Lọc theo Nhóm danh mục */}
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedCategoryFilter}
                  onChange={e => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-orange-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">Tất cả nhóm ({availableCategoryNames.length} nhóm)</option>
                  {availableCategoryNames.map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ô tìm kiếm */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên mục, mã dịch vụ..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 bg-white font-medium"
                />
                {catalogSearch && (
                  <button
                    onClick={() => setCatalogSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Hiển thị số lượng nhóm */}
            <div className="text-xs font-semibold text-slate-500">
              Trang <span className="text-orange-600 font-extrabold">{catalogPage}</span> / {totalCatalogPages} ({totalCatalogGroups} nhóm danh mục)
            </div>
          </div>

          {/* Bảng chia theo Category */}
          <div className="space-y-6">
            {groupedStandardServices.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs">
                Không tìm thấy dịch vụ hoặc phụ tùng chuẩn nào phù hợp với bộ lọc.
              </div>
            ) : (
              currentCatalogGroups.map(group => (
                <div key={group.categoryName} className="border border-slate-200/80 rounded-2xl overflow-hidden">
                  {/* Category Group Header */}
                  <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-orange-600" />
                      {group.categoryName} ({group.items.length} mục)
                    </span>
                  </div>

                  {/* Table trong nhóm */}
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-left border-collapse text-xs">
                      <colgroup>
                        <col className="w-[40%]" />
                        <col className="w-[10%]" />
                        <col className="w-[12%]" />
                        <col className="w-[18%]" />
                        <col className="w-[10%]" />
                        <col className="w-[10%]" />
                      </colgroup>
                      <thead className="bg-white border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        <tr>
                          <th className="py-3 px-4">Tên Mục</th>
                          <th className="py-3 px-3">Loại</th>
                          <th className="py-3 px-3 text-center">Loại Xe</th>
                          <th className="py-3 px-4 text-right">Khung Giá Sàn</th>
                          <th className="py-3 px-4 text-center">Số Gara Bật</th>
                          <th className="py-3 px-4 text-center">Bật/Tắt Hệ Thống</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.items.map(svc => {
                          const isPart = svc.itemType === 'PART';
                          const activeGarages = serviceActiveGaragesCountMap.get(svc.id) || 0;

                          return (
                            <tr key={svc.id} className="hover:bg-orange-50/20 transition-colors">
                              {/* Cột 1: Tên mục (Đã ẩn mã, độ rộng 40% thoải mái) */}
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900 text-sm truncate" title={svc.name}>
                                  {svc.name}
                                </div>
                              </td>

                              {/* Cột 2: Phân loại */}
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {isPart ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200/70 font-bold text-[10px]">
                                    Phụ tùng
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/70 font-bold text-[10px]">
                                    Công thợ
                                  </span>
                                )}
                              </td>

                              {/* Cột 3: Loại xe */}
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 text-slate-600 font-semibold text-xs">
                                  {svc.categoryName?.includes('Ô tô') ? (
                                    <>
                                      <Car className="w-3.5 h-3.5 text-slate-500" /> Ô tô
                                    </>
                                  ) : svc.categoryName?.includes('Xe máy') ? (
                                    <>
                                      <Bike className="w-3.5 h-3.5 text-orange-600" /> Xe máy
                                    </>
                                  ) : (
                                    'Cả 2 loại xe'
                                  )}
                                </span>
                              </td>

                              {/* Cột 5: Khung giá quy định (cho phép sửa nhanh) */}
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="font-extrabold text-slate-900">
                                    {formatVnd(svc.minPrice)} — {formatVnd(svc.maxPrice)}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingPriceService(svc);
                                      setInlineMinPrice(String(svc.minPrice || 0));
                                      setInlineMaxPrice(String(svc.maxPrice || 0));
                                    }}
                                    className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors"
                                    title="Sửa khung giá min - max"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                              {/* Cột 6: Số gara đang bật mục này */}
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                                  {activeGarages} Gara
                                </span>
                              </td>

                              {/* Cột 7: Công tắc bật/tắt toàn hệ thống */}
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStandardService(svc)}
                                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer mx-auto ${
                                    svc.isActive !== false ? 'bg-orange-500' : 'bg-slate-300'
                                  }`}
                                  title={svc.isActive !== false ? 'Mục đang bật trên toàn hệ thống' : 'Mục đang tắt toàn hệ thống'}
                                >
                                  <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                      svc.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Thanh phân trang danh mục chuẩn */}
          {groupedStandardServices.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 font-medium">
                Đang hiển thị nhóm{' '}
                <strong className="text-slate-800">
                  {catalogPageSize === 0 ? 1 : Math.min((catalogPage - 1) * catalogPageSize + 1, totalCatalogGroups)}
                </strong>
                {' - '}
                <strong className="text-slate-800">
                  {catalogPageSize === 0 ? totalCatalogGroups : Math.min(catalogPage * catalogPageSize, totalCatalogGroups)}
                </strong>
                {' trên tổng số '}
                <strong className="text-orange-600 font-bold">{totalCatalogGroups}</strong> nhóm danh mục ({totalFilteredItems} dịch vụ)
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Dropdown số nhóm / trang */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Hiển thị:</span>
                  <select
                    value={catalogPageSize}
                    onChange={e => setCatalogPageSize(Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-orange-500 cursor-pointer shadow-2xs"
                  >
                    <option value={3}>3 nhóm/trang</option>
                    <option value={4}>4 nhóm/trang</option>
                    <option value={6}>6 nhóm/trang</option>
                    <option value={10}>10 nhóm/trang</option>
                    <option value={0}>Tất cả nhóm</option>
                  </select>
                </div>

                {/* Nút chuyển trang */}
                {totalCatalogPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setCatalogPage(prev => Math.max(1, prev - 1));
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      disabled={catalogPage === 1}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                    >
                      Trước
                    </button>

                    {Array.from({ length: totalCatalogPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => {
                          setCatalogPage(page);
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          page === catalogPage
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-orange-50 hover:border-orange-300'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => {
                        setCatalogPage(prev => Math.min(totalCatalogPages, prev + 1));
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      disabled={catalogPage === totalCatalogPages}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: GIÁM SÁT GARA ── */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'GARAGE_MONITOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CỘT BÊN TRÁI: DANH SÁCH CÁC GARA (4 Cột lg:col-span-4) */}
          <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-orange-600" />
                Gara Đối Tác ({garageSummaries.length})
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Chọn để xem kho</span>
            </div>

            <div className="space-y-2.5">
              {monitorGaragesMetrics.map(g => {
                const isSelected = selectedMonitorGarageId === g.garageId;

                return (
                  <div
                    key={g.garageId}
                    onClick={() => setSelectedMonitorGarageId(g.garageId)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200/80 hover:border-orange-300 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">{g.garageName}</span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            g.isOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-300'
                          }`}
                          title={g.isOnline ? 'Gara đang mở' : 'Gara ngoại tuyến'}
                        />
                      </div>
                      <p className="text-[10.5px] text-slate-500 truncate mt-0.5">{g.garageAddress}</p>
                    </div>

                    {/* Dải 3 chỉ số gọn trên mỗi Gara */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10.5px] font-bold">
                      <span className="text-slate-600">
                        Bán: <strong className="text-slate-900">{g.activeSelling}</strong>
                      </span>
                      <span className="text-amber-700">
                        Sắp hết: <strong>{g.lowStock}</strong>
                      </span>
                      <span className={g.outStock > 0 ? 'text-rose-600 font-black' : 'text-slate-500'}>
                        Hết: <strong>{g.outStock}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT BÊN PHẢI: KHO CỦA GARA ĐANG CHỌN (8 Cột lg:col-span-8) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
            {/* Header kho Gara */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900">
                    Kho {selectedGarageInfo?.garageName || 'Gara'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Giám sát các dịch vụ & phụ tùng Gara đang bật nhận đơn cứu hộ.
                </p>
              </div>

              {/* Nút gửi cảnh báo tới gara này nếu có hàng hết */}
              {selectedGarageInfo && (
                <button
                  onClick={async () => {
                    try {
                      setScanning(true);
                      await axiosClient.post('/admin/inventory/scan-and-warn', null, {
                        params: { garageId: selectedGarageInfo.garageId },
                      });
                      showToast(`Đã gửi cảnh báo tồn kho tới ${selectedGarageInfo.garageName}!`);
                    } catch (err: any) {
                      showToast(err?.response?.data?.message || 'Không thể gửi cảnh báo');
                    } finally {
                      setScanning(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-500 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <BellRing className="w-4 h-4" />
                  <span>Cảnh báo hết kho Gara này</span>
                </button>
              )}
            </div>

            {/* Thanh lọc nhanh trong kho */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  onClick={() => setMonitorQuickFilter('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    monitorQuickFilter === 'ALL'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setMonitorQuickFilter('OUT')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    monitorQuickFilter === 'OUT'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Hết hàng
                </button>
                <button
                  onClick={() => setMonitorQuickFilter('LOW')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    monitorQuickFilter === 'LOW'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Sắp hết
                </button>
                <button
                  onClick={() => setMonitorQuickFilter('PART')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    monitorQuickFilter === 'PART'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Phụ tùng
                </button>
                <button
                  onClick={() => setMonitorQuickFilter('LABOR')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    monitorQuickFilter === 'LABOR'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Công thợ
                </button>
              </div>

              {/* Ô tìm kiếm mặt hàng trong kho */}
              <div className="relative w-52">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm trong kho Gara..."
                  value={monitorSearch}
                  onChange={e => setMonitorSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 bg-white font-medium"
                />
              </div>
            </div>

            {/* Bảng danh sách phụ tùng trong kho Gara */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full table-fixed text-left border-collapse">
                <colgroup>
                  <col className="w-[48%]" />
                  <col className="w-[28%]" />
                  <col className="w-[24%]" />
                </colgroup>
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <tr>
                    <th className="py-3 px-4">Tên Mục / Phụ Tùng</th>
                    <th className="py-3 px-4 text-right">Giá Gara vs Khung</th>
                    <th className="py-3 px-4 text-center">Tồn Kho Khả Dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedGarageInventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-400 text-xs">
                        Không có mặt hàng nào phù hợp với bộ lọc trong kho Gara này.
                      </td>
                    </tr>
                  ) : (
                    selectedGarageInventoryItems.map(item => {
                      const isPart = item.itemType === 'PART';
                      const isOut = isPart && item.availableQty <= 0;
                      const isLow = isPart && !isOut && item.availableQty <= (item.minStockQty || 3);

                      const minP = item.minAllowedPrice || 0;
                      const maxP = item.maxAllowedPrice || 999999999;
                      const isPriceValid = item.sellingPrice >= minP && item.sellingPrice <= maxP;

                      return (
                        <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                          {/* Cột 1: Tên mục */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm truncate" title={item.name}>
                              {item.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              {isPart ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-bold text-[10px]">
                                  Phụ tùng
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                                  Công thợ
                                </span>
                              )}
                              <span>{item.categoryName}</span>
                            </div>
                          </td>

                          {/* Cột 2: Giá niêm yết */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="font-black text-slate-900 text-sm">{formatVnd(item.sellingPrice)}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Khung: {formatVnd(item.minAllowedPrice)} — {formatVnd(item.maxAllowedPrice)}
                            </div>
                            {!isPriceValid && (
                              <div className="text-[10px] text-orange-600 font-bold mt-0.5">
                                Ngoài khung sàn
                              </div>
                            )}
                          </td>

                          {/* Cột 3: Tồn kho khả dụng */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {!isPart ? (
                              <span className="text-slate-500 font-medium text-xs">Không giới hạn</span>
                            ) : isOut ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
                                Hết hàng
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/70 font-bold text-xs">
                                Còn {item.availableQty} {item.unitLabel}
                              </span>
                            ) : (
                              <span className="text-slate-700 font-semibold text-xs">
                                Còn {item.availableQty} {item.unitLabel}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ── MODAL: SỬA KHUNG GIÁ (MIN — MAX) TRỰC TIẾP ── */}
      {/* ──────────────────────────────────────────────────────────── */}
      {editingPriceService && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Sửa Khung Giá Quy Định</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">{editingPriceService.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPriceService(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Giá Sàn Tối Thiểu (₫):</label>
                <input
                  type="text"
                  value={formatCurrencyInput(inlineMinPrice)}
                  onChange={e => setInlineMinPrice(e.target.value)}
                  placeholder="VD: 250.000"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Giá Trần Tối Đa (₫):</label>
                <input
                  type="text"
                  value={formatCurrencyInput(inlineMaxPrice)}
                  onChange={e => setInlineMaxPrice(e.target.value)}
                  placeholder="VD: 350.000"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPriceService(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSavePriceRange}
                disabled={savingPrice}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {savingPrice ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Lưu khung giá</span>
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}

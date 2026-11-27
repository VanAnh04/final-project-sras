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
  ShieldCheck,
  BellRing,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

interface SummaryStats {
  totalGaragesWithInventory: number;
  totalSkuCount: number;
  totalOnHandUnits: number;
  totalReservedUnits: number;
  totalAvailableUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryCostValue: number;
  totalInventoryRetailValue: number;
}

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
  skuCode: string;
  name: string;
  itemType: 'PART' | 'LABOR' | string;
  categoryName: string;
  vehicleType: 'CAR' | 'MOTORBIKE' | 'BOTH' | string;
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

const formatVnd = (n?: number | null) => {
  if (n === null || n === undefined) return '0 ₫';
  return Number(n).toLocaleString('vi-VN') + ' ₫';
};

export default function InventoryPage() {
  const [selectedGarageId, setSelectedGarageId] = useState<number | 'ALL'>('ALL');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'OUT' | 'LOW' | 'ENABLED' | 'DISABLED' | 'PART' | 'LABOR'>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | 'CAR' | 'MOTORBIKE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryStats>({
    totalGaragesWithInventory: 0,
    totalSkuCount: 0,
    totalOnHandUnits: 0,
    totalReservedUnits: 0,
    totalAvailableUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalInventoryCostValue: 0,
    totalInventoryRetailValue: 0,
  });
  const [garageSummaries, setGarageSummaries] = useState<GarageStockSummaryItem[]>([]);
  const [items, setItems] = useState<InventoryItemDto[]>([]);

  // Modal Gửi Thông báo Cảnh báo Kho tới Chủ Gara
  const [warnItem, setWarnItem] = useState<InventoryItemDto | null>(null);
  const [warnTitle, setWarnTitle] = useState('');
  const [warnMessage, setWarnMessage] = useState('');
  const [sendingWarn, setSendingWarn] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchOverview = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res: any = await axiosClient.get('/admin/inventory/overview');
      const data = res?.data || res;
      if (data) {
        if (data.summary) setSummary(data.summary);
        setGarageSummaries(Array.isArray(data.garageSummaries) ? data.garageSummaries : []);
        setItems(Array.isArray(data.items) ? data.items : []);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu quản lý kho:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const timer = setInterval(() => {
      fetchOverview(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchOverview]);

  const handleSyncCatalog = async () => {
    try {
      setSyncing(true);
      const params = selectedGarageId !== 'ALL' ? { garageId: selectedGarageId } : {};
      await axiosClient.post('/admin/inventory/sync-catalog', null, { params });
      await fetchOverview(true);
      showToast('Đã đồng bộ đầy đủ danh mục chuẩn Sàn vào các Gara đối tác!');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể đồng bộ danh mục kho');
    } finally {
      setSyncing(false);
    }
  };

  const handleScanAndWarnAll = async () => {
    try {
      setScanning(true);
      const params = selectedGarageId !== 'ALL' ? { garageId: selectedGarageId } : {};
      const res = await axiosClient.post('/admin/inventory/scan-and-warn', null, { params });
      showToast(res.data?.message || 'Đã quét và gửi cảnh báo tồn kho tới các Gara thành công!');
      await fetchOverview(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể gửi cảnh báo tồn kho');
    } finally {
      setScanning(false);
    }
  };

  const openWarnModal = (item: InventoryItemDto) => {
    setWarnItem(item);
    const minStock = item.minStockQty || 3;
    const isOutOfStock = item.itemType === 'PART' && item.availableQty <= 0;
    const isLowStock = item.itemType === 'PART' && !isOutOfStock && item.availableQty <= minStock;

    if (isOutOfStock) {
      setWarnTitle(`Cảnh báo đã hết hàng: ${item.name}`);
      setWarnMessage(
        `Mặt hàng "${item.name}" tại ${item.garageName} đã hết hàng (tồn khả dụng: 0 ${item.unitLabel}). Để tránh gián đoạn việc cứu hộ, hãy nhập thêm hàng ngay!`
      );
    } else if (isLowStock) {
      setWarnTitle(`Cảnh báo sắp hết hàng: ${item.name}`);
      setWarnMessage(
        `Mặt hàng "${item.name}" tại ${item.garageName} sắp hết (hiện chỉ còn ${item.availableQty} ${item.unitLabel}, định mức: ${minStock} ${item.unitLabel}). Vui lòng kiểm tra và nhập thêm hàng.`
      );
    } else {
      setWarnTitle(`Nhắc nhở kiểm tra dịch vụ: ${item.name}`);
      setWarnMessage(
        `Ban Quản Trị yêu cầu ${item.garageName} kiểm tra và đối soát lại chất lượng cung ứng và giá niêm yết của mặt hàng "${item.name}".`
      );
    }
  };

  const handleSendWarnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warnItem) return;
    try {
      setSendingWarn(true);
      await axiosClient.post(`/admin/inventory/items/${warnItem.id}/warn`, {
        title: warnTitle.trim(),
        message: warnMessage.trim(),
      });
      const targetName = warnItem.garageName;
      setWarnItem(null);
      showToast(`Đã gửi thông báo cảnh báo trực tiếp tới Chủ Gara (${targetName})!`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể gửi thông báo cảnh báo');
    } finally {
      setSendingWarn(false);
    }
  };

  // Trích xuất danh sách các nhóm phân loại để lọc nhanh
  const availableCategories = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(item => {
      if (selectedGarageId !== 'ALL' && Number(item.garageId) !== Number(selectedGarageId)) return;
      const cat = (item.categoryName || 'Dịch vụ khác').trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [items, selectedGarageId]);

  // Tính toán số liệu dịch vụ theo từng Gara
  const garageMetricsMap = useMemo(() => {
    const map = new Map<number, { total: number; active: number; outCount: number; lowCount: number }>();
    items.forEach(item => {
      const gid = Number(item.garageId);
      const curr = map.get(gid) || { total: 0, active: 0, outCount: 0, lowCount: 0 };
      curr.total += 1;
      if (item.isActive) curr.active += 1;
      if (item.itemType === 'PART') {
        if (item.availableQty <= 0) curr.outCount += 1;
        else if (item.availableQty <= (item.minStockQty || 3)) curr.lowCount += 1;
      }
      map.set(gid, curr);
    });
    return map;
  }, [items]);

  // Bộ lọc dữ liệu bảng
  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        if (selectedGarageId !== 'ALL' && Number(item.garageId) !== Number(selectedGarageId)) return false;
        if (quickFilter === 'OUT' && (item.itemType !== 'PART' || item.availableQty > 0)) return false;
        if (quickFilter === 'LOW' && (item.itemType !== 'PART' || item.availableQty <= 0 || item.availableQty > (item.minStockQty || 3))) return false;
        if (quickFilter === 'ENABLED' && !item.isActive) return false;
        if (quickFilter === 'DISABLED' && item.isActive) return false;
        if (quickFilter === 'PART' && item.itemType !== 'PART') return false;
        if (quickFilter === 'LABOR' && item.itemType === 'PART') return false;

        if (vehicleFilter !== 'ALL' && item.vehicleType !== 'BOTH' && item.vehicleType !== vehicleFilter) return false;
        if (categoryFilter !== 'ALL' && (item.categoryName || 'Dịch vụ khác').trim() !== categoryFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name?.toLowerCase().includes(q);
          const matchGarage = item.garageName?.toLowerCase().includes(q);
          const matchCat = item.categoryName?.toLowerCase().includes(q);
          if (!matchName && !matchGarage && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Ưu tiên hiển thị mặt hàng hết hàng hoặc sắp hết lên đầu để Admin dễ thấy
        const isOutA = a.itemType === 'PART' && a.availableQty <= 0 ? 1 : 0;
        const isOutB = b.itemType === 'PART' && b.availableQty <= 0 ? 1 : 0;
        if (isOutA !== isOutB) return isOutB - isOutA;

        const isLowA = a.itemType === 'PART' && a.availableQty > 0 && a.availableQty <= (a.minStockQty || 3) ? 1 : 0;
        const isLowB = b.itemType === 'PART' && b.availableQty > 0 && b.availableQty <= (b.minStockQty || 3) ? 1 : 0;
        if (isLowA !== isLowB) return isLowB - isLowA;

        return (a.name || '').localeCompare(b.name || '');
      });
  }, [items, selectedGarageId, quickFilter, vehicleFilter, categoryFilter, searchQuery]);

  // Thống kê nhanh toàn sàn
  const counts = useMemo(() => {
    let enabled = 0;
    let disabled = 0;
    let outStock = 0;
    let lowStock = 0;
    let inPriceRange = 0;
    let parts = 0;
    let labors = 0;

    items.forEach(i => {
      if (selectedGarageId !== 'ALL' && Number(i.garageId) !== Number(selectedGarageId)) return;
      if (i.isActive) enabled++;
      else disabled++;

      if (i.itemType === 'PART') {
        parts++;
        if (i.availableQty <= 0) outStock++;
        else if (i.availableQty <= (i.minStockQty || 3)) lowStock++;
      } else {
        labors++;
      }

      const minP = i.minAllowedPrice || 0;
      const maxP = i.maxAllowedPrice || 999999999;
      if (i.sellingPrice >= minP && i.sellingPrice <= maxP) {
        inPriceRange++;
      }
    });

    const total = enabled + disabled;
    return { total, enabled, disabled, outStock, lowStock, inPriceRange, parts, labors };
  }, [items, selectedGarageId]);

  return (
    <div className="space-y-6 pb-10">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Header & Giới thiệu */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-200 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">
              Giám Sát Dịch Vụ & Kho Phụ Tùng Gara
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Quản lý danh sách dịch vụ các Gara đang bật, kiểm soát giá bán niêm yết so với khung giá quy định và cảnh báo kịp thời mặt hàng sắp hết.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleScanAndWarnAll}
            disabled={scanning}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Quét toàn bộ mặt hàng hết hoặc sắp hết kho và gửi cảnh báo đẩy tới Chủ Gara"
          >
            <AlertTriangle className={`w-4 h-4 ${scanning ? 'animate-bounce' : ''}`} />
            <span>{scanning ? 'Đang gửi cảnh báo...' : 'Cảnh báo hết hàng Gara'}</span>
          </button>

          <button
            onClick={handleSyncCatalog}
            disabled={syncing}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 text-xs font-bold text-gray-700 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Khởi tạo và đồng bộ các mặt hàng chuẩn của Sàn vào kho các Gara đối tác"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-orange-500' : ''}`} />
            <span>Đồng bộ Danh mục Chuẩn</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards: 3 Chỉ Số Quản Trị Trọng Tâm */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Dịch vụ đang mở */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>DỊCH VỤ GARA ĐANG MỞ (BẬT)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {counts.enabled} <span className="text-xs font-bold text-gray-500">/ {counts.total} dịch vụ</span>
          </div>
          <div className="text-[11.5px] text-gray-600 mt-1">
            Đạt <strong className="text-emerald-700">{counts.total > 0 ? Math.round((counts.enabled / counts.total) * 100) : 0}%</strong> tỷ lệ sẵn sàng phục vụ tại {summary.totalGaragesWithInventory || garageSummaries.length} Gara đối tác
          </div>
        </div>

        {/* Card 2: Cảnh báo Hết & Sắp hết hàng */}
        <div className="bg-white p-5 rounded-2xl border border-red-100 bg-red-50/25 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-red-700">
            <span>CẢNH BÁO HẾT & SẮP HẾT HÀNG</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-600 mt-2">
            {counts.outStock + counts.lowStock} <span className="text-xs font-bold text-gray-500">mặt hàng cần nhập</span>
          </div>
          <div className="text-[11.5px] text-red-700/90 mt-1 flex items-center gap-2">
            <span><strong className="font-extrabold">{counts.outStock}</strong> hết hàng (0)</span>
            <span>•</span>
            <span><strong className="font-extrabold">{counts.lowStock}</strong> sắp hết (1 - 3 cái)</span>
          </div>
        </div>

        {/* Card 3: Kiểm soát khung giá Sàn */}
        <div className="bg-white p-5 rounded-2xl border border-blue-100 bg-blue-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-800">
            <span>KIỂM SOÁT KHUNG GIÁ QUY ĐỊNH</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2">
            {counts.inPriceRange} <span className="text-xs font-bold text-gray-500">/ {counts.total} dịch vụ</span>
          </div>
          <div className="text-[11.5px] text-gray-600 mt-1">
            Đảm bảo giá Gara set luôn tuân thủ <strong className="text-blue-700">Khung sàn - trần</strong>
          </div>
        </div>
      </div>

      {/* 3. Thanh Chọn Nhanh Gara Đối Tác */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Store className="w-4 h-4 text-orange-600" />
            Chọn Gara Đối Tác ({garageSummaries.length} Gara)
          </span>
          {selectedGarageId !== 'ALL' && (
            <button
              onClick={() => setSelectedGarageId('ALL')}
              className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
            >
              Xem tất cả Gara →
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          <button
            onClick={() => setSelectedGarageId('ALL')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedGarageId === 'ALL'
                ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/20'
                : 'bg-gray-50/80 border-gray-200 hover:border-orange-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-900">Tất cả Gara</span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-700">
                {garageSummaries.length} Gara
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Toàn bộ danh mục dịch vụ & kho trên hệ thống
            </p>
          </button>

          {garageSummaries.map(g => {
            const isSelected = selectedGarageId === g.garageId;
            const metrics = garageMetricsMap.get(g.garageId) || { total: g.totalSkus, active: 0, outCount: g.outOfStockSkus, lowCount: g.lowStockSkus };
            const hasAlert = metrics.outCount > 0 || metrics.lowCount > 0;

            return (
              <div
                key={g.garageId}
                onClick={() => setSelectedGarageId(g.garageId)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20'
                    : 'bg-gray-50/60 border-gray-200/80 hover:border-orange-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-extrabold text-gray-900 truncate">{g.garageName}</span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        g.isOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-gray-400'
                      }`}
                      title={g.isOnline ? 'Gara đang trực tuyến' : 'Gara đang ngoại tuyến'}
                    />
                  </div>
                  <p className="text-[10.5px] text-gray-500 truncate mt-0.5">{g.garageAddress}</p>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/60 text-[10.5px]">
                  <span className="font-bold text-gray-700">
                    <strong className="text-emerald-700 font-extrabold">{metrics.active}</strong>/{metrics.total} dịch vụ bật
                  </span>
                  {hasAlert ? (
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-extrabold text-[10px]">
                      {metrics.outCount > 0 && metrics.lowCount > 0 ? (
                        <>🚨 {metrics.outCount} hết • ⚠️ {metrics.lowCount} sắp hết</>
                      ) : metrics.outCount > 0 ? (
                        <>🚨 {metrics.outCount} hết</>
                      ) : (
                        <>⚠️ {metrics.lowCount} sắp hết</>
                      )}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                      🟢 Đủ hàng
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Bộ Lọc Nhanh & Bảng Giám Sát Dịch Vụ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-3">
        {/* Thanh tìm kiếm & Lọc nhanh trực quan */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              onClick={() => setQuickFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'ALL'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả ({counts.total})
            </button>
            <button
              onClick={() => setQuickFilter('OUT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'OUT'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              🚨 Hết hàng ({counts.outStock})
            </button>
            <button
              onClick={() => setQuickFilter('LOW')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'LOW'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              ⚠️ Sắp hết ({counts.lowStock})
            </button>
            <button
              onClick={() => setQuickFilter('ENABLED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'ENABLED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              🟢 Đang bật ({counts.enabled})
            </button>
            <button
              onClick={() => setQuickFilter('DISABLED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'DISABLED'
                  ? 'bg-gray-700 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ⚪ Đang tắt ({counts.disabled})
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setQuickFilter('PART')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'PART'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
            >
              📦 Phụ tùng ({counts.parts})
            </button>
            <button
              onClick={() => setQuickFilter('LABOR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'LABOR'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              🔧 Công thợ ({counts.labors})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none max-w-[170px] truncate"
            >
              <option value="ALL">Phân loại ({availableCategories.length})</option>
              {availableCategories.map(cat => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>

            <select
              value={vehicleFilter}
              onChange={e => setVehicleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
            >
              <option value="ALL">Mọi loại xe</option>
              <option value="CAR">🚗 Ô tô</option>
              <option value="MOTORBIKE">🛵 Xe máy</option>
            </select>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm dịch vụ, phụ tùng..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500 bg-gray-50 focus:bg-white transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bảng Quản Lý Giám Sát Dịch Vụ & Tồn Kho */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              <tr>
                <th className="py-3.5 px-5">Gara Đối Tác</th>
                <th className="py-3.5 px-4">Tên Dịch Vụ / Phụ Tùng</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái Mở</th>
                <th className="py-3.5 px-4 text-right">Giá Gara Set vs Khung Sàn</th>
                <th className="py-3.5 px-4 text-center">Tồn Kho Khả Dụng</th>
                <th className="py-3.5 px-5 text-right">Cảnh Báo Gara</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Đang đồng bộ dữ liệu dịch vụ & kho các Gara...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-gray-400">
                    Không tìm thấy dịch vụ hoặc phụ tùng nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isPart = item.itemType === 'PART';
                  const isOut = isPart && item.availableQty <= 0;
                  const isLow = isPart && !isOut && item.availableQty <= (item.minStockQty || 3);

                  // Kiểm tra khung giá quy định
                  const minP = item.minAllowedPrice || 0;
                  const maxP = item.maxAllowedPrice || 999999999;
                  const isPriceValid = item.sellingPrice >= minP && item.sellingPrice <= maxP;

                  return (
                    <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                      {/* Cột 1: Gara đối tác */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-extrabold text-gray-900">{item.garageName}</div>
                        <div className="text-[10.5px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Store className="w-3 h-3 text-gray-400" />
                          <span>Mã cơ sở: #{item.garageId}</span>
                        </div>
                      </td>

                      {/* Cột 2: Tên Dịch vụ / Mặt hàng */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-gray-900 text-sm">{item.name}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {isPart ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-extrabold text-[10px]">
                              📦 Phụ tùng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-extrabold text-[10px]">
                              🔧 Công thợ
                            </span>
                          )}

                          <span className="text-[10.5px] text-gray-500 font-medium">
                            {item.categoryName}
                          </span>

                          <span className="text-gray-300">•</span>

                          {item.vehicleType === 'CAR' ? (
                            <span className="inline-flex items-center gap-0.5 text-gray-600 font-bold text-[10.5px]">
                              <Car className="w-3 h-3 text-blue-600" /> Ô tô
                            </span>
                          ) : item.vehicleType === 'MOTORBIKE' ? (
                            <span className="inline-flex items-center gap-0.5 text-gray-600 font-bold text-[10.5px]">
                              <Bike className="w-3 h-3 text-orange-600" /> Xe máy
                            </span>
                          ) : (
                            <span className="text-gray-500 text-[10.5px]">
                              Cả 2 loại xe
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 3: Trạng thái cung ứng (Đang bật / Đang tắt) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Đang bật
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Đang tắt
                          </span>
                        )}
                      </td>

                      {/* Cột 4: Giá Gara set vs Khung giá quy định */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-black text-gray-900 text-sm">
                          {formatVnd(item.sellingPrice)}
                        </div>
                        <div className="text-[10.5px] text-gray-500 mt-0.5">
                          Khung: {formatVnd(item.minAllowedPrice)} — {formatVnd(item.maxAllowedPrice)}
                        </div>
                        {!isPriceValid && (
                          <div className="text-[10px] text-red-600 font-extrabold mt-0.5">
                            ⚠️ Ngoài khung giá quy định
                          </div>
                        )}
                      </td>

                      {/* Cột 5: Tồn kho khả dụng */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {!isPart ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-bold text-[11px]">
                            Vô hạn (Công thợ)
                          </span>
                        ) : isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 font-extrabold text-xs">
                            🔴 Hết hàng (0 {item.unitLabel})
                          </span>
                        ) : isLow ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-black text-xs">
                              🟠 Còn {item.availableQty} {item.unitLabel}
                            </span>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Định mức tối thiểu: {item.minStockQty || 3}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold text-xs">
                              🟢 Còn {item.availableQty} {item.unitLabel}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Cột 6: Nút Cảnh báo tới Chủ Gara */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => openWarnModal(item)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                            isOut
                              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              : isLow
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                          }`}
                          title="Gửi thông báo cảnh báo kho hoặc nhắc nhở giá tới App Chủ Gara"
                        >
                          <BellRing className={`w-3.5 h-3.5 ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-500'}`} />
                          <span>Cảnh báo</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: GỬI THÔNG BÁO CẢNH BÁO TỚI CHỦ GARA ── */}
      {warnItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    Gửi Cảnh Báo Tới Chủ Gara
                  </h3>
                  <p className="text-xs text-gray-500">
                    {warnItem.garageName} • Mặt hàng: <strong>{warnItem.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWarnItem(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendWarnSubmit} className="space-y-4">
              {/* Mẫu cảnh báo nhanh */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold text-gray-500 uppercase">
                  Chọn mẫu thông báo nhanh:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setWarnTitle(`Cảnh báo đã hết hàng: ${warnItem.name}`);
                      setWarnMessage(
                        `Mặt hàng "${warnItem.name}" tại ${warnItem.garageName} đã hết hàng (tồn khả dụng: 0 ${warnItem.unitLabel}). Để tránh gián đoạn việc cứu hộ, hãy nhập thêm hàng ngay!`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold cursor-pointer"
                  >
                    🚨 Đã hết hàng (Nhập gấp)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWarnTitle(`Cảnh báo sắp hết hàng: ${warnItem.name}`);
                      setWarnMessage(
                        `Mặt hàng "${warnItem.name}" tại ${warnItem.garageName} sắp hết (hiện chỉ còn ${warnItem.availableQty} ${warnItem.unitLabel}, định mức: ${warnItem.minStockQty || 3} ${warnItem.unitLabel}). Vui lòng kiểm tra và nhập thêm hàng.`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold cursor-pointer"
                  >
                    ⚠️ Sắp hết hàng (Kiểm tra & nhập thêm)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWarnTitle(`Nhắc nhở rà soát giá bán: ${warnItem.name}`);
                      setWarnMessage(
                        `Đề nghị ${warnItem.garageName} rà soát lại mức giá niêm yết (${formatVnd(warnItem.sellingPrice)}) của mặt hàng "${warnItem.name}" để đảm bảo tính cạnh tranh và đúng khung giá quy định.`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold cursor-pointer"
                  >
                    💰 Rà soát giá bán
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tiêu đề thông báo:</label>
                <input
                  type="text"
                  required
                  value={warnTitle}
                  onChange={e => setWarnTitle(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-extrabold text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Nội dung cảnh báo gửi tới App Chủ Gara:
                </label>
                <textarea
                  rows={4}
                  required
                  value={warnMessage}
                  onChange={e => setWarnMessage(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setWarnItem(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={sendingWarn}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm shadow-orange-300 disabled:opacity-50 cursor-pointer"
                >
                  {sendingWarn ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Gửi cảnh báo ngay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

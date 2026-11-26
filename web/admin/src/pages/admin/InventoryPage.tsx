import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Store,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Sliders,
  History,
  CheckCircle2,
  XCircle,
  X,
  Car,
  Bike,
  Layers,
  ShieldCheck,
  BellRing,
  Send,
  TrendingUp,
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

interface InventoryTransactionDto {
  id: number;
  garageId: number;
  garageName: string;
  inventoryItemId: number;
  skuCode: string;
  itemName: string;
  unitLabel: string;
  txType: 'INBOUND' | 'OUTBOUND_ORDER' | 'RETURN_ORDER' | 'ADJUSTMENT' | 'DAMAGED' | string;
  quantityChange: number;
  onHandAfter: number;
  unitCostSnapshot?: number | null;
  unitPriceSnapshot?: number | null;
  rescueRequestId?: number | null;
  rescueRequestCode?: string | null;
  performedByName?: string | null;
  performedByRole?: string | null;
  note?: string | null;
  createdAt?: string;
}

const formatVnd = (n?: number | null) => {
  if (n === null || n === undefined) return '0 ₫';
  return Number(n).toLocaleString('vi-VN') + ' ₫';
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LEDGER'>('STOCK');
  const [selectedGarageId, setSelectedGarageId] = useState<number | 'ALL'>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'RESERVED'>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | 'CAR' | 'MOTORBIKE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('ALL');

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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
  const [transactions, setTransactions] = useState<InventoryTransactionDto[]>([]);

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
        setTransactions(Array.isArray(data.recentTransactions) ? data.recentTransactions : []);
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
    }, 3000);
    return () => clearInterval(timer);
  }, [fetchOverview]);

  const handleSyncCatalog = async () => {
    try {
      setSyncing(true);
      const params = selectedGarageId !== 'ALL' ? { garageId: selectedGarageId } : {};
      await axiosClient.post('/admin/inventory/sync-catalog', null, { params });
      await fetchOverview(true);
      showToast('Đã đồng bộ đầy đủ danh mục phụ tùng chuẩn Sàn vào kho các Gara!');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể đồng bộ danh mục kho');
    } finally {
      setSyncing(false);
    }
  };

  const openWarnModal = (item: InventoryItemDto) => {
    setWarnItem(item);
    const isLowOrOut = item.availableQty <= item.minStockQty;
    setWarnTitle(
      isLowOrOut
        ? `Cảnh báo sắp hết phụ tùng: ${item.name}`
        : `Nhắc nhở kiểm tra kho phụ tùng: ${item.name}`
    );
    setWarnMessage(
      isLowOrOut
        ? `Phụ tùng "${item.name}" (${item.skuCode}) tại ${item.garageName} hiện chỉ còn ${item.availableQty} ${item.unitLabel} khả dụng (Định mức tối thiểu: ${item.minStockQty} ${item.unitLabel}). Vui lòng nhập bổ sung kho để đảm bảo phục vụ các ca cứu hộ!`
        : `Ban Quản Trị yêu cầu ${item.garageName} kiểm tra và đối soát lại số lượng tồn kho thực tế của mặt hàng "${item.name}" (${item.skuCode}) — Hiện ghi nhận ${item.onHandQty} ${item.unitLabel}.`
    );
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
      showToast(`Đã gửi thông báo cảnh báo kho trực tiếp tới Chủ Gara (${targetName})!`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể gửi thông báo cảnh báo');
    } finally {
      setSendingWarn(false);
    }
  };

  // Trích xuất danh sách các nhóm phân loại phụ tùng để lọc nhanh
  const availableCategories = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(item => {
      if (selectedGarageId !== 'ALL' && Number(item.garageId) !== Number(selectedGarageId)) return;
      const cat = (item.categoryName || 'Phụ tùng khác').trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [items, selectedGarageId]);

  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        if (selectedGarageId !== 'ALL' && Number(item.garageId) !== Number(selectedGarageId)) return false;
        if (stockFilter === 'LOW_STOCK' && item.stockStatus !== 'LOW_STOCK') return false;
        if (stockFilter === 'OUT_OF_STOCK' && item.stockStatus !== 'OUT_OF_STOCK') return false;
        if (stockFilter === 'RESERVED' && (!item.reservedQty || item.reservedQty <= 0)) return false;
        if (vehicleFilter !== 'ALL' && item.vehicleType !== 'BOTH' && item.vehicleType !== vehicleFilter) return false;
        if (categoryFilter !== 'ALL' && (item.categoryName || 'Phụ tùng khác').trim() !== categoryFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name?.toLowerCase().includes(q);
          const matchSku = item.skuCode?.toLowerCase().includes(q);
          const matchGarage = item.garageName?.toLowerCase().includes(q);
          const matchCat = item.categoryName?.toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchGarage && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const resA = a.reservedQty || 0;
        const resB = b.reservedQty || 0;
        if (resA !== resB) return resB - resA;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [items, selectedGarageId, stockFilter, vehicleFilter, categoryFilter, searchQuery]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (selectedGarageId !== 'ALL' && Number(tx.garageId) !== Number(selectedGarageId)) return false;
      if (ledgerTypeFilter !== 'ALL' && tx.txType !== ledgerTypeFilter) return false;
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const mItem = tx.itemName?.toLowerCase().includes(q) || tx.skuCode?.toLowerCase().includes(q);
        const mReq = tx.rescueRequestCode?.toLowerCase().includes(q);
        const mGarage = tx.garageName?.toLowerCase().includes(q);
        const mUser = tx.performedByName?.toLowerCase().includes(q);
        if (!mItem && !mReq && !mGarage && !mUser) return false;
      }
      return true;
    });
  }, [transactions, selectedGarageId, ledgerTypeFilter, ledgerSearch]);

  const renderTxBadge = (txType: string) => {
    switch (txType) {
      case 'INBOUND':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
            <ArrowUpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Nhập kho (+)</span>
          </span>
        );
      case 'OUTBOUND_ORDER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap shrink-0">
            <ArrowDownCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Xuất đơn cứu hộ (-)</span>
          </span>
        );
      case 'RETURN_ORDER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap shrink-0">
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>Hoàn từ đơn hủy (+)</span>
          </span>
        );
      case 'DAMAGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap shrink-0">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Xuất hủy hỏng (-)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap shrink-0">
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>Kiểm kê kho</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Header & Action Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-200 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-extrabold text-gray-900">
                Quản lý Kho Phụ tùng & Vật tư Gara Đối tác
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tự động tạm giữ tồn kho khi Thợ gửi báo giá • Chốt trừ kho khi Khách duyệt • Tự động hoàn kho 100% khi từ chối hoặc hủy đơn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSyncCatalog}
            disabled={syncing}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 text-xs font-bold text-gray-700 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Khởi tạo và đồng bộ các mặt hàng phụ tùng chuẩn của Sàn vào kho các Gara"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-orange-500' : ''}`} />
            <span>Đồng bộ Danh mục Chuẩn</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Tổng quan Kho Toàn Hệ Thống */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>TỔNG MÃ PHỤ TÙNG (SKU)</span>
            <Layers className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{summary.totalSkuCount}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            Tại <strong className="text-gray-800">{summary.totalGaragesWithInventory}</strong> Gara đối tác
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>TỒN KHO KHẢ DỤNG</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {summary.totalAvailableUnits.toLocaleString('vi-VN')}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Tổng tồn thực tế: <strong className="text-gray-800">{summary.totalOnHandUnits}</strong> đơn vị
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-100 bg-blue-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700">
            <span>ĐANG TẠM GIỮ THEO ĐƠN</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2">
            {summary.totalReservedUnits}
          </div>
          <div className="text-[11px] text-blue-600/80 mt-1">
            Giữ chỗ cho các báo giá chờ khách duyệt
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-100 bg-red-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-red-700">
            <span>CẢNH BÁO SẮP HẾT / HẾT HÀNG</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-600 mt-2">
            {summary.lowStockCount + summary.outOfStockCount}
          </div>
          <div className="text-[11px] text-red-600/90 mt-1">
            <strong className="font-extrabold">{summary.outOfStockCount}</strong> hết hàng •{' '}
            <strong className="font-extrabold">{summary.lowStockCount}</strong> chạm ngưỡng tối thiểu
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>GIÁ TRỊ KHO (GIÁ VỐN)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-gray-900 mt-2 truncate">
            {formatVnd(summary.totalInventoryCostValue)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 truncate">
            Giá trị bán lẻ: <strong className="text-orange-600">{formatVnd(summary.totalInventoryRetailValue)}</strong>
          </div>
        </div>
      </div>

      {/* 3. Thanh chọn nhanh Kho theo từng Gara Đối tác */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Store className="w-4 h-4 text-orange-600" />
            Chọn Kho Gara Đối Tác ({garageSummaries.length} Gara)
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {garageSummaries.map(g => {
            const isSelected = Number(selectedGarageId) === Number(g.garageId);
            const hasAlert = g.outOfStockSkus > 0 || g.lowStockSkus > 0;
            return (
              <div
                key={g.garageId}
                onClick={() => setSelectedGarageId(isSelected ? 'ALL' : g.garageId)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
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
                    />
                  </div>
                  <p className="text-[10.5px] text-gray-500 truncate mt-0.5">{g.garageAddress}</p>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/60 text-[10.5px]">
                  <span className="font-bold text-gray-700">
                    {g.totalSkus} mã • <strong>{g.totalOnHandUnits}</strong> tồn
                  </span>
                  {hasAlert ? (
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-extrabold text-[10px]">
                      ⚠️ {g.outOfStockSkus + g.lowStockSkus} sắp hết
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                      Đủ hàng
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Tabs: Danh sách Tồn kho Phụ tùng vs Sổ cái Lịch sử Xuất - Nhập - Tồn */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2.5 border-b border-gray-100 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('STOCK')}
              className={`px-3 py-2 border-b-2 text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                activeTab === 'STOCK'
                  ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-xl'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>Tồn kho Phụ tùng ({filteredItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-3 py-2 border-b-2 text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                activeTab === 'LEDGER'
                  ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-xl'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Sổ cái Xuất - Nhập ({filteredTransactions.length})</span>
            </button>
          </div>

          {/* Bộ lọc theo Tab — Nằm gọn đều trên cùng 1 hàng ngang */}
          {activeTab === 'STOCK' ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-[11.5px] font-bold whitespace-nowrap shrink-0">
                <button
                  onClick={() => setStockFilter('ALL')}
                  className={`px-2 py-1 rounded-lg cursor-pointer ${
                    stockFilter === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setStockFilter('LOW_STOCK')}
                  className={`px-2 py-1 rounded-lg cursor-pointer ${
                    stockFilter === 'LOW_STOCK' ? 'bg-amber-500 text-white shadow-2xs' : 'text-gray-600'
                  }`}
                >
                  Sắp hết ({summary.lowStockCount})
                </button>
                <button
                  onClick={() => setStockFilter('OUT_OF_STOCK')}
                  className={`px-2 py-1 rounded-lg cursor-pointer ${
                    stockFilter === 'OUT_OF_STOCK' ? 'bg-red-600 text-white shadow-2xs' : 'text-gray-600'
                  }`}
                >
                  Hết hàng ({summary.outOfStockCount})
                </button>
                <button
                  onClick={() => setStockFilter('RESERVED')}
                  className={`px-2 py-1 rounded-lg cursor-pointer ${
                    stockFilter === 'RESERVED' ? 'bg-blue-600 text-white shadow-2xs' : 'text-gray-600'
                  }`}
                >
                  Giữ đơn ({summary.totalReservedUnits})
                </button>
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[11.5px] font-bold text-gray-700 outline-none max-w-[165px] truncate shrink-0"
              >
                <option value="ALL">Phân loại ({items.length})</option>
                {availableCategories.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name} ({cat.count})
                  </option>
                ))}
              </select>

              <select
                value={vehicleFilter}
                onChange={e => setVehicleFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[11.5px] font-bold text-gray-700 outline-none shrink-0"
              >
                <option value="ALL">Mọi xe</option>
                <option value="CAR">Ô tô</option>
                <option value="MOTORBIKE">Xe máy</option>
              </select>

              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm phụ tùng, SKU, gara..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2.5 py-1.5 border border-gray-200 rounded-xl text-[11.5px] font-medium text-gray-800 w-44 xl:w-48 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={ledgerTypeFilter}
                onChange={e => setLedgerTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none shrink-0"
              >
                <option value="ALL">Tất cả loại giao dịch</option>
                <option value="INBOUND">Nhập kho (+)</option>
                <option value="OUTBOUND_ORDER">Xuất cho đơn cứu hộ (-)</option>
                <option value="RETURN_ORDER">Hoàn từ đơn hủy (+)</option>
                <option value="ADJUSTMENT">Kiểm kê điều chỉnh</option>
                <option value="DAMAGED">Xuất hủy hỏng (-)</option>
              </select>

              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm mã đơn #RQ, phụ tùng, người thực hiện..."
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 w-60 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4.1. BẢNG TỒN KHO PHỤ TÙNG */}
        {activeTab === 'STOCK' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <tr>
                  <th className="py-3.5 px-5">Gara Đối tác</th>
                  <th className="py-3.5 px-4">Mã SKU & Tên Phụ tùng</th>
                  <th className="py-3.5 px-4">Loại xe</th>
                  <th className="py-3.5 px-4 text-center">Tồn thực tế</th>
                  <th className="py-3.5 px-4 text-center">Tạm giữ (Báo giá)</th>
                  <th className="py-3.5 px-4 text-center">Khả dụng</th>
                  <th className="py-3.5 px-4 text-right">Giá vốn / Giá bán</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-5 text-right">Thao tác kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                      Đang đồng bộ dữ liệu tồn kho các Gara...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-gray-400">
                      Không tìm thấy mặt hàng phụ tùng nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const isOut = item.stockStatus === 'OUT_OF_STOCK';
                    const isLow = item.stockStatus === 'LOW_STOCK';
                    return (
                      <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-extrabold text-gray-900">{item.garageName}</div>
                          <div className="text-[10.5px] text-gray-400">{item.supplierName || 'Kho Gara'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                              {item.skuCode}
                            </span>
                            <span className="text-[10.5px] text-gray-400">{item.categoryName}</span>
                          </div>
                          <div className="font-extrabold text-gray-900 text-sm mt-0.5">{item.name}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.vehicleType === 'CAR' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] whitespace-nowrap">
                              <Car className="w-3 h-3 shrink-0" /> Ô tô
                            </span>
                          ) : item.vehicleType === 'MOTORBIKE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-bold text-[11px] whitespace-nowrap">
                              <Bike className="w-3 h-3 shrink-0" /> Xe máy
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold text-[11px] whitespace-nowrap">
                              Cả 2 loại
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="text-sm font-black text-gray-900">
                            {item.onHandQty}
                          </span>{' '}
                          <span className="text-gray-500 font-semibold">{item.unitLabel}</span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {item.reservedQty > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-xs whitespace-nowrap">
                              🔒 {item.reservedQty} {item.unitLabel}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block text-sm font-black px-2.5 py-1 rounded-lg whitespace-nowrap ${
                              isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.availableQty} {item.unitLabel}
                          </span>
                          <div className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                            Tối thiểu: {item.minStockQty}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-extrabold text-orange-600">{formatVnd(item.sellingPrice)}</div>
                          <div className="text-[10.5px] text-gray-500">Giá vốn: {formatVnd(item.costPrice)}</div>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-extrabold text-[11px] whitespace-nowrap">
                              🔴 Hết hàng
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-extrabold text-[11px] whitespace-nowrap">
                              🟠 Sắp hết
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[11px] whitespace-nowrap">
                              🟢 Đủ hàng
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openWarnModal(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                              title="Gửi thông báo cảnh báo / nhắc nhở kho cho Chủ Gara"
                            >
                              <BellRing className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Cảnh báo</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4.2. BẢNG SỔ CÁI LỊCH SỬ XUẤT - NHẬP - TỒN */}
        {activeTab === 'LEDGER' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <tr>
                  <th className="py-3.5 px-5">Thời gian</th>
                  <th className="py-3.5 px-4">Gara Đối tác</th>
                  <th className="py-3.5 px-4">Loại giao dịch</th>
                  <th className="py-3.5 px-4">Phụ tùng / Vật tư</th>
                  <th className="py-3.5 px-4 text-center">Biến động</th>
                  <th className="py-3.5 px-4 text-center">Tồn sau GD</th>
                  <th className="py-3.5 px-4">Đơn cứu hộ</th>
                  <th className="py-3.5 px-4">Người thực hiện</th>
                  <th className="py-3.5 px-5">Diễn giải chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-gray-400">
                      Chưa có lịch sử giao dịch kho nào khớp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => {
                    const isPositive = tx.quantityChange > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-5 text-gray-500 whitespace-nowrap">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">{tx.garageName}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">{renderTxBadge(tx.txType)}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-gray-900">{tx.itemName}</div>
                          <div className="font-mono text-[10px] text-gray-400">{tx.skuCode}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block text-sm font-black px-2.5 py-0.5 rounded-md whitespace-nowrap ${
                              isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                            }`}
                          >
                            {isPositive ? `+${tx.quantityChange}` : tx.quantityChange} {tx.unitLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-gray-900 whitespace-nowrap">
                          {tx.onHandAfter} {tx.unitLabel}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {tx.rescueRequestCode ? (
                            <span className="inline-block px-2 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-200 font-mono font-extrabold text-[11px] whitespace-nowrap">
                              #{tx.rescueRequestCode}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-gray-800">{tx.performedByName || 'Hệ thống'}</div>
                          <div className="text-[10px] text-gray-400">{tx.performedByRole}</div>
                        </td>
                        <td className="py-3.5 px-5 text-gray-600 max-w-xs">{tx.note}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: GỬI THÔNG BÁO CẢNH BÁO KHO TỚI CHỦ GARA ── */}
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
                    Gửi Cảnh báo Kho tới Chủ Gara
                  </h3>
                  <p className="text-xs text-gray-500">
                    {warnItem.garageName} • Phụ tùng: <strong>{warnItem.name}</strong> ({warnItem.skuCode})
                  </p>
                </div>
              </div>
              <button
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
                      setWarnTitle(`Cảnh báo bổ sung kho: ${warnItem.name}`);
                      setWarnMessage(
                        `Phụ tùng "${warnItem.name}" (${warnItem.skuCode}) tại ${warnItem.garageName} hiện còn ${warnItem.availableQty} ${warnItem.unitLabel} khả dụng. Đề nghị Gara nhập bổ sung kho để đảm bảo năng lực cứu hộ!`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold cursor-pointer"
                  >
                    ⚠️ Yêu cầu nhập thêm hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWarnTitle(`Yêu cầu kiểm kê tồn kho: ${warnItem.name}`);
                      setWarnMessage(
                        `Ban Quản Trị yêu cầu ${warnItem.garageName} kiểm kê và đối soát lại số lượng tồn thực tế của "${warnItem.name}" (${warnItem.skuCode}) trong kho.`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold cursor-pointer"
                  >
                    📋 Yêu cầu kiểm kê thực tế
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWarnTitle(`Nhắc nhở rà soát giá bán phụ tùng: ${warnItem.name}`);
                      setWarnMessage(
                        `Đề nghị ${warnItem.garageName} rà soát lại mức giá niêm yết (${formatVnd(warnItem.sellingPrice)}) của phụ tùng "${warnItem.name}" để đảm bảo tính cạnh tranh và đúng khung giá quy định.`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold cursor-pointer"
                  >
                    💰 Nhắc nhở rà soát giá bán
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingWarn ? 'Đang gửi...' : 'Gửi Thông báo Cảnh báo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

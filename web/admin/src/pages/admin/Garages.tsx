import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Filter, CheckCircle2, XCircle, FileText, 
  ExternalLink, Eye, MapPin, Phone, Building2, 
  Percent, AlertCircle, RefreshCw, X, Check, Lock, Unlock,
  Car, Bike, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Mail, User,
  AlertTriangle, Sparkles
} from 'lucide-react';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';

interface GarageDocument {
  id: number;
  docType: string;
  fileUrl: string;
  note?: string;
}

interface GarageItem {
  id: number;
  code?: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  lat: number;
  lng: number;
  capability?: 'CAR' | 'MOTORBIKE' | 'BOTH' | string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  commissionRate: number;
  isOnline: boolean;
  autoAccept?: boolean;
  creditBalance?: number;
  cashBalance?: number;
  avgRating?: number;
  ratingCount?: number;
  approvedAt?: string;
  createdAt: string;
  ownerId?: number;
  ownerName?: string;
  ownerPhone?: string;
  documents?: GarageDocument[];
}

type TabStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';

export default function Garages() {
  const [activeTab, setActiveTab] = useState<TabStatus>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [capabilityFilter, setCapabilityFilter] = useState<'ALL' | 'CAR' | 'MOTORBIKE' | 'BOTH'>('ALL');
  const [onlineFilter, setOnlineFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  
  const [garages, setGarages] = useState<GarageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [stats, setStats] = useState({ 
    PENDING: 0, 
    APPROVED: 0, 
    SUSPENDED: 0, 
    REJECTED: 0, 
    TOTAL: 0 
  });

  const [selectedGarage, setSelectedGarage] = useState<GarageItem | null>(null);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [editCommission, setEditCommission] = useState(15);

  // Modal từ chối
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Modal tạm khóa đối tác
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendTargetId, setSuspendTargetId] = useState<number | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/admin/garages/stats');
      if (res?.data) {
        setStats({
          PENDING: res.data.PENDING || 0,
          APPROVED: res.data.APPROVED || 0,
          SUSPENDED: res.data.SUSPENDED || 0,
          REJECTED: res.data.REJECTED || 0,
          TOTAL: res.data.TOTAL || 0,
        });
      }
    } catch (e) {
      console.warn('Could not fetch stats', e);
    }
  }, []);

  const fetchGarages = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params: any = { 
        page: targetPage, 
        size: PAGE_SIZE 
      };

      if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }

      const res: any = await axiosClient.get('/admin/garages', { params });
      
      const pageData = res?.data;
      let items: GarageItem[] = pageData?.content || [];

      // Lọc thêm client-side theo capability và online nếu có chọn
      if (capabilityFilter !== 'ALL') {
        items = items.filter(g => g.capability === capabilityFilter);
      }
      if (onlineFilter === 'ONLINE') {
        items = items.filter(g => g.isOnline === true);
      } else if (onlineFilter === 'OFFLINE') {
        items = items.filter(g => g.isOnline === false);
      }

      setGarages(items);
      setTotalPages(pageData?.totalPages || 1);
      setTotalElements(pageData?.totalElements || items.length);
      setPage(targetPage);
    } catch (e: any) {
      console.error('Error fetching garages:', e);
      showToast(e?.response?.data?.message || 'Không thể tải danh sách Gara đối tác', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchKeyword, capabilityFilter, onlineFilter, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchGarages(0);
  }, [activeTab, capabilityFilter, onlineFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGarages(0);
  };

  const handleOpenDrawer = (garage: GarageItem) => {
    setSelectedGarage(garage);
    setSelectedDocIndex(0);
    setEditCommission(garage.commissionRate || 15);
  };

  // Phê duyệt hoặc Mở khóa lại đối tác
  const handleApprove = async (id: number, commissionRate?: number) => {
    const finalRate = commissionRate !== undefined ? commissionRate : editCommission;
    setSubmitting(true);
    try {
      await axiosClient.put(`/admin/garages/${id}/review`, {
        status: 'APPROVED',
        commissionRate: finalRate
      });
      showToast('Đã phê duyệt Gara thành công! Tài khoản đã được kích hoạt làm Đối tác.', 'success');
      setSelectedGarage(null);
      await Promise.all([fetchStats(), fetchGarages(page)]);
    } catch (e: any) {
      console.error('Error approving garage:', e);
      showToast(e?.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt Gara', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Từ chối hồ sơ
  const handleOpenReject = (id: number) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối để thông báo cho đối tác', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await axiosClient.put(`/admin/garages/${rejectTargetId}/review`, {
        status: 'REJECTED',
        rejectionReason: rejectReason.trim()
      });
      showToast('Đã từ chối hồ sơ Gara và gửi thông báo tới người đăng ký', 'success');
      setRejectModalOpen(false);
      setSelectedGarage(null);
      await Promise.all([fetchStats(), fetchGarages(page)]);
    } catch (e: any) {
      console.error('Error rejecting garage:', e);
      showToast(e?.response?.data?.message || 'Lỗi khi từ chối hồ sơ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Tạm khóa đối tác
  const handleOpenSuspend = (id: number) => {
    setSuspendTargetId(id);
    setSuspendReason('');
    setSuspendModalOpen(true);
  };

  const handleConfirmSuspend = async () => {
    if (!suspendTargetId) return;
    setSubmitting(true);
    try {
      await axiosClient.put(`/admin/garages/${suspendTargetId}/review`, {
        status: 'SUSPENDED',
        rejectionReason: suspendReason.trim() || 'Tạm khóa hoạt động bởi Quản trị viên'
      });
      showToast('Đã tạm khóa hoạt động Gara đối tác', 'success');
      setSuspendModalOpen(false);
      setSelectedGarage(null);
      await Promise.all([fetchStats(), fetchGarages(page)]);
    } catch (e: any) {
      console.error('Error suspending garage:', e);
      showToast(e?.response?.data?.message || 'Lỗi khi tạm khóa Gara', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getDocTypeTitle = (type: string) => {
    switch (type) {
      case 'BUSINESS_LICENSE': return 'Giấy phép ĐKKD';
      case 'OWNER_ID_CARD_FRONT': return 'CCCD Mặt trước';
      case 'OWNER_ID_CARD_BACK': return 'CCCD Mặt sau';
      case 'GARAGE_PHOTO': return 'Ảnh mặt tiền Gara';
      default: return 'Tài liệu pháp lý';
    }
  };

  const renderStatusBadge = (status: GarageItem['status'], rejectionReason?: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Chờ xét duyệt
            </span>
            {rejectionReason && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200" title={`Lý do từ chối trước: ${rejectionReason}`}> 
                Nộp lại hồ sơ
              </span>
            )}
          </div>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Đang hoạt động
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Đang tạm ngưng
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300" title={rejectionReason}>
            <XCircle className="w-3.5 h-3.5 text-gray-500" />
            Đã từ chối
          </span>
        );
      default:
        return null;
    }
  };

  const renderCapabilityBadge = (capability?: string) => {
    if (capability === 'CAR') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Car className="w-3.5 h-3.5" /> Ô tô
        </span>
      );
    }
    if (capability === 'MOTORBIKE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Bike className="w-3.5 h-3.5" /> Xe máy
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <Sparkles className="w-3.5 h-3.5" /> Cả hai loại xe
      </span>
    );
  };

  const getPaginationRange = (currentPage: number, total: number): (number | 'DOTS')[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i);
    }
    const delta = 1;
    const range: (number | 'DOTS')[] = [0];
    const leftBound = Math.max(1, currentPage - delta);
    const rightBound = Math.min(total - 2, currentPage + delta);

    if (leftBound > 1) {
      range.push('DOTS');
    }

    for (let i = leftBound; i <= rightBound; i++) {
      range.push(i);
    }

    if (rightBound < total - 2) {
      range.push('DOTS');
    }

    range.push(total - 1);
    return range;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white transition-all transform animate-bounce ${
          toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Quản lý Gara đối tác</h1>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-orange-100 text-orange-800 border border-orange-200">
              {totalElements} đối tác
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Phê duyệt hồ sơ đăng ký kinh doanh, kiểm tra thẩm định pháp lý và điều hành mạng lưới gara cứu hộ SRAS
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { fetchStats(); fetchGarages(page); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-gray-300 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-orange-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 5 Interactive Metric Status Cards (Click to filter, Harmonious SRAS Theme, No dark black) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Tất cả đối tác */}
        <div 
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'ALL'
              ? 'bg-gradient-to-br from-orange-50/80 to-amber-50/40 border-orange-500 ring-2 ring-orange-500/20 shadow-sm'
              : 'bg-white border-gray-200/80 hover:border-orange-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'ALL' ? 'text-orange-900' : 'text-gray-500'}`}>
              Tổng mạng lưới
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === 'ALL' ? 'bg-orange-500 text-white shadow-xs' : 'bg-orange-50 text-orange-600'
            }`}>
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${activeTab === 'ALL' ? 'text-orange-600' : 'text-gray-900'}`}>
                {stats.TOTAL}
              </span>
              <span className="text-xs text-gray-500 font-medium">Gara</span>
            </div>
            {activeTab === 'ALL' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Đang xem
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Chờ xét duyệt */}
        <div 
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'PENDING'
              ? 'bg-gradient-to-br from-amber-50/80 to-yellow-50/40 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-gray-200/80 hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          {stats.PENDING > 0 && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
            </span>
          )}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'PENDING' ? 'text-amber-900' : 'text-amber-700'}`}>
              Chờ xét duyệt
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === 'PENDING' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-600'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${activeTab === 'PENDING' ? 'text-amber-600' : 'text-gray-900'}`}>
                {stats.PENDING}
              </span>
              <span className="text-xs text-amber-600 font-semibold">Hồ sơ mới</span>
            </div>
            {activeTab === 'PENDING' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Đang xem
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Đang hoạt động */}
        <div 
          onClick={() => setActiveTab('APPROVED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'APPROVED'
              ? 'bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-gray-200/80 hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'APPROVED' ? 'text-emerald-900' : 'text-emerald-700'}`}>
              Đang hoạt động
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === 'APPROVED' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${activeTab === 'APPROVED' ? 'text-emerald-600' : 'text-gray-900'}`}>
                {stats.APPROVED}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Đã duyệt</span>
            </div>
            {activeTab === 'APPROVED' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Đang xem
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Đang tạm ngưng */}
        <div 
          onClick={() => setActiveTab('SUSPENDED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'SUSPENDED'
              ? 'bg-gradient-to-br from-rose-50/80 to-red-50/40 border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white border-gray-200/80 hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'SUSPENDED' ? 'text-rose-900' : 'text-rose-700'}`}>
              Đang tạm ngưng
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === 'SUSPENDED' ? 'bg-rose-500 text-white shadow-xs' : 'bg-rose-50 text-rose-600'
            }`}>
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${activeTab === 'SUSPENDED' ? 'text-rose-600' : 'text-gray-900'}`}>
                {stats.SUSPENDED}
              </span>
              <span className="text-xs text-rose-600 font-semibold">Tạm khóa</span>
            </div>
            {activeTab === 'SUSPENDED' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Đang xem
              </span>
            )}
          </div>
        </div>

        {/* Card 5: Đã từ chối */}
        <div 
          onClick={() => setActiveTab('REJECTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'REJECTED'
              ? 'bg-gradient-to-br from-slate-100/90 to-gray-50 border-slate-400 ring-2 ring-slate-400/20 shadow-sm'
              : 'bg-white border-gray-200/80 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'REJECTED' ? 'text-slate-900' : 'text-slate-600'}`}>
              Đã từ chối
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === 'REJECTED' ? 'bg-slate-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
            }`}>
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${activeTab === 'REJECTED' ? 'text-slate-700' : 'text-gray-900'}`}>
                {stats.REJECTED}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Hồ sơ loại</span>
            </div>
            {activeTab === 'REJECTED' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                Đang xem
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Full-Width Table Card */}
      <div className="w-full bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden">
        
        {/* Unified Search & Operational Filter Bar (No duplicate status tabs!) */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm kiếm theo tên Gara, mã đối tác, hotline, địa chỉ hoặc chủ sở hữu..."
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all shadow-2xs"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => { setSearchKeyword(''); fetchGarages(0); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Filter className="w-4 h-4" />
              <span>Tìm kiếm</span>
            </button>
          </form>

          {/* Sub-filters & Reset */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Capability Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Phương tiện:</span>
              <select
                value={capabilityFilter}
                onChange={(e) => setCapabilityFilter(e.target.value as any)}
                className="bg-transparent text-gray-700 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả xe</option>
                <option value="CAR">Chỉ Ô tô</option>
                <option value="MOTORBIKE">Chỉ Xe máy</option>
                <option value="BOTH">Cả Ô tô & Xe máy</option>
              </select>
            </div>

            {/* Online Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Kết nối:</span>
              <select
                value={onlineFilter}
                onChange={(e) => setOnlineFilter(e.target.value as any)}
                className="bg-transparent text-gray-700 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả</option>
                <option value="ONLINE">Đang Online</option>
                <option value="OFFLINE">Ngoại tuyến</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter State Pill Bar */}
        <div className="px-5 py-2.5 border-b border-gray-100 bg-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Trạng thái hiển thị:</span>
            {activeTab === 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-orange-50 text-orange-700 border border-orange-200">
                Tất cả mạng lưới ({totalElements})
              </span>
            )}
            {activeTab === 'PENDING' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Chờ xét duyệt ({totalElements})
              </span>
            )}
            {activeTab === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Đang hoạt động ({totalElements})
              </span>
            )}
            {activeTab === 'SUSPENDED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Đang tạm ngưng ({totalElements})
              </span>
            )}
            {activeTab === 'REJECTED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-300">
                Đã từ chối ({totalElements})
              </span>
            )}

            {capabilityFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-gray-100 text-gray-700">
                {capabilityFilter === 'CAR' ? 'Chỉ Ô tô' : capabilityFilter === 'MOTORBIKE' ? 'Chỉ Xe máy' : 'Cả hai loại xe'}
              </span>
            )}

            {onlineFilter !== 'ALL' && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                onlineFilter === 'ONLINE' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {onlineFilter === 'ONLINE' ? 'Đang Online' : 'Ngoại tuyến'}
              </span>
            )}
          </div>

          <span className="text-gray-400 font-medium hidden sm:inline">
            Tìm thấy <strong className="text-gray-700 font-bold">{garages.length}</strong> kết quả
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-400">
                <th className="py-4 px-6">Thông tin Gara & Đại diện</th>
                <th className="py-4 px-6">Địa chỉ & Tọa độ</th>
                <th className="py-4 px-5 text-center">Năng lực cứu hộ</th>
                <th className="py-4 px-5 text-center">Kết nối</th>
                <th className="py-4 px-4 text-center">Chiết khấu (%)</th>
                <th className="py-4 px-5 text-center">Hồ sơ pháp lý</th>
                <th className="py-4 px-5 text-center">Trạng thái</th>
                <th className="py-4 px-6 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-gray-400 font-medium">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
                    Đang đồng bộ danh sách Gara đối tác từ máy chủ...
                  </td>
                </tr>
              ) : garages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-gray-400 font-medium">
                    <Building2 className="w-14 h-14 mx-auto mb-3 text-gray-300 stroke-[1.2]" />
                    <p className="text-base font-bold text-gray-600">Không tìm thấy đối tác nào phù hợp</p>
                    <p className="text-xs text-gray-400 mt-1">Vui lòng thử lại với từ khóa hoặc bộ lọc trạng thái khác</p>
                  </td>
                </tr>
              ) : (
                garages.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/30 transition-colors group">
                    {/* Cột 1: Thông tin Gara */}
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-black text-base shadow-xs overflow-hidden">
                          {item.documents?.find(d => d.docType === 'GARAGE_PHOTO')?.fileUrl ? (
                            <img 
                              src={resolveFileUrl(item.documents.find(d => d.docType === 'GARAGE_PHOTO')?.fileUrl)} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-6 h-6" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-gray-900 text-base group-hover:text-orange-600 transition-colors truncate">
                              {item.name}
                            </p>
                            <span className="font-mono text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md shrink-0">
                              {item.code || `GR-${String(item.id).padStart(4, '0')}`}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mt-1">
                            <span className="flex items-center gap-1 text-gray-700">
                              <Phone className="w-3.5 h-3.5 text-orange-600" /> {item.phone}
                            </span>
                            {item.ownerName && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-gray-600 truncate">
                                  <User className="w-3.5 h-3.5 text-gray-400" /> {item.ownerName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Địa chỉ & Tọa độ */}
                    <td className="py-4 px-6 max-w-xs">
                      <p className="text-xs text-gray-800 font-medium line-clamp-2" title={item.address}>
                        {item.address}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-gray-400">
                          {item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}
                        </span>
                        <a 
                          href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          <MapPin className="w-3 h-3" /> Map
                        </a>
                      </div>
                    </td>

                    {/* Cột 3: Năng lực cứu hộ */}
                    <td className="py-4 px-5 text-center">
                      {renderCapabilityBadge(item.capability)}
                    </td>

                    {/* Cột 4: Kết nối & Nhận cuốc */}
                    <td className="py-4 px-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {item.isOnline ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            Offline
                          </span>
                        )}
                        {item.autoAccept && (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                            Tự động nhận
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 5: Chiết khấu (%) */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-black text-sm px-3 py-1 bg-gray-100 text-gray-800 rounded-xl">
                        <Percent className="w-3.5 h-3.5 text-orange-600" />
                        {item.commissionRate || 15}%
                      </span>
                    </td>

                    {/* Cột 6: Hồ sơ pháp lý */}
                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => handleOpenDrawer(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Xem hồ sơ</span>
                        <span className="bg-blue-200 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                          {item.documents?.length || 0}
                        </span>
                      </button>
                    </td>

                    {/* Cột 7: Trạng thái */}
                    <td className="py-4 px-5 text-center">
                      {renderStatusBadge(item.status, item.rejectionReason)}
                    </td>

                    {/* Cột 8: Thao tác */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Khi đang chờ duyệt */}
                        {item.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(item.id, item.commissionRate)}
                              title="Phê duyệt đối tác ngay"
                              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                            <button
                              onClick={() => handleOpenReject(item.id)}
                              title="Từ chối hồ sơ"
                              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-all cursor-pointer"
                            >
                              <X className="w-4 h-4 stroke-[3]" />
                            </button>
                          </>
                        )}

                        {/* Khi đang hoạt động: Cho phép tạm khóa */}
                        {item.status === 'APPROVED' && (
                          <button
                            onClick={() => handleOpenSuspend(item.id)}
                            title="Tạm khóa hoạt động đối tác"
                            className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 rounded-xl transition-all cursor-pointer"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}

                        {/* Khi đang tạm ngưng: Cho phép mở khóa lại */}
                        {item.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleApprove(item.id, item.commissionRate)}
                            title="Mở khóa và kích hoạt lại đối tác"
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl transition-all cursor-pointer"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}

                        {/* Khi đã từ chối: Cho phép xem xét và duyệt lại */}
                        {item.status === 'REJECTED' && (
                          <button
                            onClick={() => handleApprove(item.id, item.commissionRate)}
                            title="Xem xét lại và phê duyệt Gara này"
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-xl transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Nút xem chi tiết drawer */}
                        <button
                          onClick={() => handleOpenDrawer(item)}
                          title="Xem chi tiết đầy đủ"
                          className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-xl transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Full-featured Interactive Pagination Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 flex items-center justify-end bg-gray-50/50">
          {/* Rich Numbered Pagination */}
          <div className="flex items-center gap-1.5">
            {/* First Page << */}
            <button
              disabled={page <= 0 || loading}
              onClick={() => fetchGarages(0)}
              title="Trang đầu"
              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page < */}
            <button
              disabled={page <= 0 || loading}
              onClick={() => fetchGarages(page - 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Trước</span>
            </button>

            {/* Page Number Buttons */}
            <div className="flex items-center gap-1 mx-1">
              {getPaginationRange(page, Math.max(1, totalPages)).map((pItem, idx) => {
                if (pItem === 'DOTS') {
                  return (
                    <span key={`dots-${idx}`} className="px-1.5 text-gray-400 font-bold select-none text-xs">
                      •••
                    </span>
                  );
                }
                const isCurrent = page === pItem;
                return (
                  <button
                    key={pItem}
                    disabled={loading}
                    onClick={() => fetchGarages(pItem)}
                    className={`min-w-8 h-8 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-orange-600 text-white shadow-xs shadow-orange-500/30'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-orange-200 hover:text-orange-600'
                    }`}
                  >
                    {pItem + 1}
                  </button>
                );
              })}
            </div>

            {/* Next Page > */}
            <button
              disabled={page >= totalPages - 1 || loading}
              onClick={() => fetchGarages(page + 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <span className="hidden sm:inline">Sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page >> */}
            <button
              disabled={page >= totalPages - 1 || loading}
              onClick={() => fetchGarages(Math.max(0, totalPages - 1))}
              title="Trang cuối"
              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Right Drawer: Chi tiết & Hồ sơ pháp lý */}
      {selectedGarage && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedGarage(null)}
          />

          <div className="fixed inset-y-0 right-0 w-[580px] max-w-full bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-black text-gray-900">Hồ sơ chi tiết Gara đối tác</h2>
                <p className="text-xs text-gray-500 font-medium">Hồ sơ thẩm định pháp lý & giấy tờ doanh nghiệp</p>
              </div>
              <button
                onClick={() => setSelectedGarage(null)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Garage Summary Card */}
              <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-4.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-gray-900 text-lg">{selectedGarage.name}</h3>
                  <span className="text-xs font-mono font-bold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-lg">
                    {selectedGarage.code || `GR-${String(selectedGarage.id).padStart(4, '0')}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 text-xs font-medium text-gray-600">
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-bold text-gray-500">Chủ gara:</span> {selectedGarage.ownerName || 'Chưa cập nhật'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="font-bold text-gray-500">Hotline:</span> {selectedGarage.phone}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-bold text-gray-500">Email:</span> {selectedGarage.email || 'Chưa có'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-bold text-gray-500">Năng lực:</span> {selectedGarage.capability === 'CAR' ? 'Ô tô' : selectedGarage.capability === 'MOTORBIKE' ? 'Xe máy' : 'Cả hai'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-orange-200/50 text-xs text-gray-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                  <span>{selectedGarage.address}</span>
                </div>
              </div>

              {/* Previous Rejection / Appeal Alert Card */}
              {selectedGarage.rejectionReason && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>LÝ DO TỪ CHỐI / GHI CHÚ QUẢN TRỊ VIÊN</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    {selectedGarage.rejectionReason}
                  </p>
                </div>
              )}

              {/* Document Selection Tabs */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-2.5">
                  Chứng từ đính kèm ({selectedGarage.documents?.length || 0} tài liệu)
                </label>
                
                {selectedGarage.documents && selectedGarage.documents.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedGarage.documents.map((doc, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDocIndex(idx)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-all text-left cursor-pointer ${
                          selectedDocIndex === idx
                            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <FileText className={`w-4 h-4 shrink-0 ${selectedDocIndex === idx ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="truncate">{getDocTypeTitle(doc.docType)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-xl">
                    Chưa có tài liệu pháp lý nào được tải lên cho hồ sơ này.
                  </p>
                )}
              </div>

              {/* Document Preview Box */}
              {selectedGarage.documents && selectedGarage.documents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700">
                      Bản xem trước: {getDocTypeTitle(selectedGarage.documents[selectedDocIndex]?.docType)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const rawUrl = selectedGarage.documents?.[selectedDocIndex]?.fileUrl;
                        if (!rawUrl) return;
                        const fullUrl = resolveFileUrl(rawUrl);
                        window.open(fullUrl, '_blank');
                      }}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Mở toàn màn hình
                    </button>
                  </div>

                  <div className="relative w-full h-84 bg-slate-900/5 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center shadow-inner group">
                    <img
                      src={resolveFileUrl(selectedGarage.documents[selectedDocIndex]?.fileUrl)}
                      alt="Document preview"
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        // Fallback image nếu ảnh lỗi
                        (e.target as any).src = 'https://images.unsplash.com/photo-1618042164219-62c820f10723?w=800&auto=format&fit=crop&q=60';
                      }}
                    />

                    {/* Con dấu xác thực đỏ SRAS */}
                    <div className="absolute top-5 right-5 pointer-events-none transform rotate-[-12deg] opacity-85 select-none">
                      <div className="w-28 h-28 border-4 border-red-600 rounded-full flex flex-col items-center justify-center p-1 text-center text-red-600 shadow-md bg-red-50/20 backdrop-blur-[0.5px]">
                        <div className="w-24 h-24 border border-red-600 rounded-full flex flex-col items-center justify-center p-1">
                          <span className="text-[7px] font-black uppercase tracking-tighter leading-none">HỆ THỐNG SRAS</span>
                          <div className="w-10 h-px bg-red-600 my-0.5"></div>
                          <span className="text-[10px] font-black uppercase tracking-tight text-red-700 leading-tight">ĐÃ XÁC THỰC</span>
                          <span className="text-[7px] font-bold text-red-500 uppercase mt-0.5">HỒ SƠ GỐC</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-2 italic text-center">
                    Tài liệu được bảo mật và mã hóa số học theo tiêu chuẩn xét duyệt của SRAS.
                  </p>
                </div>
              )}

              {/* Commission Rate Setting Form */}
              <div className="bg-gray-50 p-4.5 rounded-2xl border border-gray-200 space-y-2">
                <label className="block text-xs font-bold text-gray-800">
                  Tỷ lệ chiết khấu hệ thống (%) áp dụng cho Gara này:
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="5"
                      max="40"
                      step="0.5"
                      value={editCommission}
                      onChange={(e) => setEditCommission(Number(e.target.value))}
                      className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-xs text-gray-500 font-semibold">Khuyến nghị: 15%</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
              {selectedGarage.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleOpenReject(selectedGarage.id)}
                    className="flex-1 py-3 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Từ chối hồ sơ
                  </button>
                  <button
                    onClick={() => handleApprove(selectedGarage.id, editCommission)}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Phê duyệt đối tác
                  </button>
                </>
              )}

              {selectedGarage.status === 'APPROVED' && (
                <button
                  disabled={submitting}
                  onClick={() => handleOpenSuspend(selectedGarage.id)}
                  className="w-full py-3 px-4 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  Tạm ngưng hoạt động Gara này
                </button>
              )}

              {selectedGarage.status === 'SUSPENDED' && (
                <button
                  disabled={submitting}
                  onClick={() => handleApprove(selectedGarage.id, editCommission)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  Mở khóa & Tái kích hoạt đối tác
                </button>
              )}

              {selectedGarage.status === 'REJECTED' && (
                <button
                  disabled={submitting}
                  onClick={() => handleApprove(selectedGarage.id, editCommission)}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Xét duyệt lại & Cấp phép đối tác
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Reject Modal with Reason Input */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Từ chối hồ sơ đăng ký Gara</h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Vui lòng nêu rõ lý do từ chối để hệ thống gửi thông báo chi tiết đến chủ gara bổ sung hoặc chỉnh sửa lại hồ sơ.
            </p>
            <div>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Giấy phép kinh doanh bị mờ, ảnh chụp mặt tiền không khớp với địa chỉ đăng ký, CCCD hết hạn..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-gray-800"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-200 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-black text-gray-900">Tạm khóa hoạt động Gara</h3>
              </div>
              <button
                onClick={() => setSuspendModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Khi bị tạm khóa, Gara sẽ không thể nhận các cuốc cứu hộ mới từ khách hàng cho đến khi được Quản trị viên kích hoạt lại.
            </p>
            <div>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Nhập lý do tạm khóa (vi phạm quy chế dịch vụ, nợ hoa hồng quá hạn, bảo trì gara...)"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-gray-800"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSuspendModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmSuspend}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-200 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận tạm khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
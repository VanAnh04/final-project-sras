import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, CheckCircle2, Eye, 
  Phone, Building2, RefreshCw, X, 
  ChevronLeft, ChevronRight, 
  AlertTriangle, Wrench, Users, Clock, ShieldCheck,
  UserPlus, ArrowRightLeft, Trash2, Power, Star, Copy,
  CheckCircle
} from 'lucide-react';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';

export type WorkStatus = 'FREE' | 'BUSY';

export interface TechnicianItem {
  id: number;
  userId?: number;
  fullName: string;
  phone: string;
  avatarUrl?: string | null;
  staffCode: string;
  status: WorkStatus;
  isActive: boolean;
  garageId?: number;
  garageName?: string;
  garageAddress?: string;
  garagePhone?: string;
  activeJobsCount?: number;
  todayCompletedJobs?: number;
  rating?: number | null;
  ratingCount?: number;
  tempPassword?: string;
  createdAt: string;
}

interface GarageOption {
  id: number;
  name: string;
  address: string;
  phone: string;
}

export default function TechniciansPage() {
  // Data states
  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [garages, setGarages] = useState<GarageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    TOTAL: 0,
    ACTIVE: 0,
    FREE: 0,
    BUSY: 0,
    INACTIVE: 0
  });

  // Filter states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FREE' | 'BUSY'>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedGarageId, setSelectedGarageId] = useState<string>('ALL');

  // Pagination states
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Modals
  const [detailModalItem, setDetailModalItem] = useState<TechnicianItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reassignModalItem, setReassignModalItem] = useState<TechnicianItem | null>(null);
  const [targetNewGarageId, setTargetNewGarageId] = useState<string>('');
  const [deleteModalItem, setDeleteModalItem] = useState<TechnicianItem | null>(null);

  // Add Form state
  const [addForm, setAddForm] = useState({
    garageId: '',
    fullName: '',
    phone: '',
    email: '',
    password: '',
    staffCode: ''
  });
  const [createdPasswordNotice, setCreatedPasswordNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Garages for dropdowns
  const fetchGarages = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/admin/garages', { params: { size: 100 } });
      const items = res?.data?.content || res?.content || (Array.isArray(res?.data) ? res.data : []);
      if (Array.isArray(items)) {
        setGarages(items.map((g: any) => ({
          id: g.id,
          name: g.name,
          address: g.address || '',
          phone: g.phone || ''
        })));
      }
    } catch (err) {
      console.error('Error fetching garages for filter:', err);
      setGarages([]);
    }
  }, []);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/admin/technicians/stats');
      const data = res?.data || res;
      if (data && typeof data === 'object') {
        setStats({
          TOTAL: Number(data.TOTAL || 0),
          ACTIVE: Number(data.ACTIVE || 0),
          FREE: Number(data.FREE || 0),
          BUSY: Number(data.BUSY || 0),
          INACTIVE: Number(data.INACTIVE || 0)
        });
      }
    } catch (err) {
      console.warn('Could not fetch technician stats:', err);
    }
  }, []);

  // Fetch Technicians
  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: PAGE_SIZE,
      };

      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (activeFilter === 'ACTIVE') {
        params.isActive = true;
      } else if (activeFilter === 'INACTIVE') {
        params.isActive = false;
      }
      if (selectedGarageId !== 'ALL') {
        params.garageId = Number(selectedGarageId);
      }

      const res: any = await axiosClient.get('/admin/technicians', { params });
      const pageData = res?.data || res;

      if (pageData?.content && Array.isArray(pageData.content)) {
        setTechnicians(pageData.content);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements ?? pageData.content.length);
        return;
      } else if (Array.isArray(pageData)) {
        setTechnicians(pageData);
        setTotalPages(1);
        setTotalElements(pageData.length);
        return;
      }

      setTechnicians([]);
      setTotalPages(1);
      setTotalElements(0);
    } catch (err: any) {
      console.error('Error fetching technicians:', err);
      showToast(err?.response?.data?.message || 'Không thể tải danh sách kỹ thuật viên', 'error');
      setTechnicians([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchKeyword, statusFilter, activeFilter, selectedGarageId]);

  useEffect(() => {
    fetchGarages();
    fetchStats();
  }, [fetchGarages, fetchStats]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  // Handle Toggle Active
  const handleToggleActive = async (tech: TechnicianItem) => {
    try {
      const res: any = await axiosClient.patch(`/admin/technicians/${tech.id}/toggle-active`);
      showToast(res?.message || 'Cập nhật trạng thái kỹ thuật viên thành công');
      fetchTechnicians();
      fetchStats();
      if (detailModalItem && detailModalItem.id === tech.id) {
        setDetailModalItem(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể đổi trạng thái hoạt động', 'error');
    }
  };

  // Handle Add Technician
  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.garageId) {
      showToast('Vui lòng chọn Gara trực thuộc', 'error');
      return;
    }
    if (!addForm.phone.trim()) {
      showToast('Vui lòng nhập số điện thoại', 'error');
      return;
    }
    if (!addForm.fullName.trim()) {
      showToast('Vui lòng nhập họ và tên', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res: any = await axiosClient.post(`/admin/technicians?garageId=${addForm.garageId}`, {
        fullName: addForm.fullName.trim(),
        phone: addForm.phone.trim(),
        email: addForm.email.trim() || undefined,
        password: addForm.password.trim() || undefined,
        staffCode: addForm.staffCode.trim() || undefined
      });

      const data = res?.data || res;
      if (data?.tempPassword) {
        setCreatedPasswordNotice(data.tempPassword);
      } else {
        setIsAddModalOpen(false);
        showToast('Thêm kỹ thuật viên thành công!');
      }

      setAddForm({
        garageId: '',
        fullName: '',
        phone: '',
        email: '',
        password: '',
        staffCode: ''
      });
      fetchTechnicians();
      fetchStats();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Thêm kỹ thuật viên thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reassign Garage
  const handleReassignGarage = async () => {
    if (!reassignModalItem || !targetNewGarageId) return;
    setIsSubmitting(true);
    try {
      const res: any = await axiosClient.patch(`/admin/technicians/${reassignModalItem.id}/reassign`, {
        garageId: Number(targetNewGarageId)
      });
      showToast(res?.message || 'Điều chuyển Gara thành công');
      setReassignModalItem(null);
      setTargetNewGarageId('');
      fetchTechnicians();
      fetchStats();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể điều chuyển Gara', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete / Remove Staff
  const handleDeleteStaff = async () => {
    if (!deleteModalItem) return;
    setIsSubmitting(true);
    try {
      const res: any = await axiosClient.delete(`/admin/technicians/${deleteModalItem.id}`);
      showToast(res?.message || 'Đã cho kỹ thuật viên thôi việc và xóa khỏi Gara');
      setDeleteModalItem(null);
      fetchTechnicians();
      fetchStats();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Xóa kỹ thuật viên thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Đã sao chép vào bộ nhớ tạm');
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl transition-all duration-300 border ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-500 text-white border-emerald-400' 
            : 'bg-rose-500 text-white border-rose-400'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Quản lý Kỹ thuật viên
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Giám sát, phân phối và quản lý nhân sự thợ cứu hộ thuộc hệ thống Gara đối tác
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchTechnicians();
              fetchStats();
              fetchGarages();
              showToast('Đã làm mới dữ liệu');
            }}
            className="p-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm flex items-center gap-2 text-sm font-semibold"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => {
              setCreatedPasswordNotice(null);
              setIsAddModalOpen(true);
            }}
            className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-[0.98] flex items-center gap-2 text-sm font-bold"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Thêm Kỹ thuật viên</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Tổng số KTV */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tổng Kỹ thuật viên</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.TOTAL}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">Đang hoạt động: {stats.ACTIVE}</p>
          </div>
        </div>

        {/* Card 2: Sẵn sàng nhận đơn */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sẵn sàng (Rảnh)</p>
            </div>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.FREE}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Sẵn sàng xuất phát cứu hộ</p>
          </div>
        </div>

        {/* Card 3: Đang làm việc / cứu hộ */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Đang cứu hộ (Bận)</p>
            <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{stats.BUSY}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Đang thực hiện ca cứu hộ</p>
          </div>
        </div>

        {/* Card 4: Tạm dừng / Nghỉ ca */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tạm dừng / Nghỉ phép</p>
            <h3 className="text-3xl font-extrabold text-gray-700 mt-1">{stats.INACTIVE}</h3>
            <p className="text-xs text-gray-400 font-medium mt-1">Đang khóa hoặc tạm ngưng</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, mã KTV..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(0);
              }}
              className="w-full pl-12 pr-10 py-3 bg-[#f9fafc] border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => {
                  setSearchKeyword('');
                  setPage(0);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Garage Selector */}
          <div>
            <select
              value={selectedGarageId}
              onChange={(e) => {
                setSelectedGarageId(e.target.value);
                setPage(0);
              }}
              className="w-full px-4 py-3 bg-[#f9fafc] border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900 font-medium"
            >
              <option value="ALL">🏢 Tất cả Gara trực thuộc</option>
              {garages.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Work Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(0);
              }}
              className="w-full px-4 py-3 bg-[#f9fafc] border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900 font-medium"
            >
              <option value="ALL">⚡ Trạng thái: Tất cả</option>
              <option value="FREE">🟢 Sẵn sàng (Rảnh)</option>
              <option value="BUSY">🟠 Đang cứu hộ (Bận)</option>
            </select>
          </div>

          {/* Active Status Filter */}
          <div>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as any);
                setPage(0);
              }}
              className="w-full px-4 py-3 bg-[#f9fafc] border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900 font-medium"
            >
              <option value="ALL">🛡️ Hoạt động: Tất cả</option>
              <option value="ACTIVE">✅ Đang làm việc</option>
              <option value="INACTIVE">⏸️ Tạm nghỉ / Khóa</option>
            </select>
          </div>
        </div>

        {/* Active Filters Pill list */}
        {(searchKeyword || statusFilter !== 'ALL' || activeFilter !== 'ALL' || selectedGarageId !== 'ALL') && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
            <span className="text-xs font-semibold text-gray-400">Bộ lọc đang áp dụng:</span>
            {searchKeyword && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 rounded-xl text-xs font-semibold">
                Từ khóa: "{searchKeyword}"
                <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setSearchKeyword('')} />
              </span>
            )}
            {selectedGarageId !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold">
                Gara: {garages.find(g => String(g.id) === selectedGarageId)?.name || selectedGarageId}
                <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setSelectedGarageId('ALL')} />
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-semibold">
                {statusFilter === 'FREE' ? 'Sẵn sàng' : 'Đang cứu hộ'}
                <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setStatusFilter('ALL')} />
              </span>
            )}
            {activeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-600 rounded-xl text-xs font-semibold">
                {activeFilter === 'ACTIVE' ? 'Đang làm việc' : 'Tạm nghỉ'}
                <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setActiveFilter('ALL')} />
              </span>
            )}
            <button
              onClick={() => {
                setSearchKeyword('');
                setStatusFilter('ALL');
                setActiveFilter('ALL');
                setSelectedGarageId('ALL');
                setPage(0);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 underline font-medium ml-2"
            >
              Đặt lại tất cả
            </button>
          </div>
        )}
      </div>

      {/* Main Technicians Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_25px_rgb(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#fafbfe] text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4.5 px-6">Kỹ thuật viên</th>
                <th className="py-4.5 px-6">Mã KTV</th>
                <th className="py-4.5 px-6">Gara trực thuộc</th>
                <th className="py-4.5 px-6 text-center">Trạng thái ca</th>
                <th className="py-4.5 px-6 text-center">Hoạt động</th>
                <th className="py-4.5 px-6">Đánh giá</th>
                <th className="py-4.5 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <div className="inline-flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-semibold">Đang tải danh sách kỹ thuật viên...</span>
                    </div>
                  </td>
                </tr>
              ) : technicians.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                        <Users className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-gray-800">Không tìm thấy kỹ thuật viên nào</h3>
                      <p className="text-xs text-gray-400">
                        Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại các bộ lọc đã chọn.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                technicians.map((tech) => (
                  <tr key={tech.id} className="hover:bg-orange-50/20 transition-colors group">
                    {/* User profile */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={tech.avatarUrl ? resolveFileUrl(tech.avatarUrl) : `https://ui-avatars.com/api/?name=${encodeURIComponent(tech.fullName)}&background=ea580c&color=fff`}
                          alt={tech.fullName}
                          className="w-11 h-11 rounded-2xl object-cover border border-gray-100 shadow-sm shrink-0"
                        />
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                            {tech.fullName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 font-medium">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{tech.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Staff Code */}
                    <td className="py-4 px-6">
                      <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold font-mono tracking-wide">
                        {tech.staffCode || `NV-${tech.id}`}
                      </span>
                    </td>

                    {/* Garage */}
                    <td className="py-4 px-6 max-w-xs">
                      <div>
                        <p className="font-semibold text-gray-800 flex items-center gap-1.5 truncate" title={tech.garageName}>
                          <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          {tech.garageName || 'Chưa gán Gara'}
                        </p>
                        {tech.garageAddress && (
                          <p className="text-xs text-gray-400 truncate mt-0.5" title={tech.garageAddress}>
                            {tech.garageAddress}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Work Status (FREE / BUSY) */}
                    <td className="py-4 px-6 text-center">
                      {tech.status === 'FREE' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Sẵn sàng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          Đang cứu hộ
                        </span>
                      )}
                    </td>

                    {/* Active Toggle Status */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleActive(tech)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          tech.isActive 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        }`}
                        title="Bấm để bật / tạm ngưng nhân viên"
                      >
                        <Power className="w-3 h-3" />
                        {tech.isActive ? 'Hoạt động' : 'Tạm dừng'}
                      </button>
                    </td>

                    {/* Rating & Performance */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-gray-800 text-sm">
                          {tech.rating != null ? tech.rating.toFixed(1) : 'Chưa có'}
                        </span>
                        {tech.ratingCount ? (
                          <span className="text-xs text-gray-400">
                            ({tech.ratingCount})
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Hôm nay: <strong className="text-gray-700">{tech.todayCompletedJobs || 0}</strong> ca
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Detail Modal */}
                        <button
                          onClick={() => setDetailModalItem(tech)}
                          className="p-2 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-600 rounded-xl transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Reassign Garage */}
                        <button
                          onClick={() => {
                            setReassignModalItem(tech);
                            setTargetNewGarageId(tech.garageId ? String(tech.garageId) : '');
                          }}
                          className="p-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-xl transition-colors"
                          title="Điều chuyển Gara"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>

                        {/* Remove / Delete */}
                        <button
                          onClick={() => setDeleteModalItem(tech)}
                          className="p-2 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 rounded-xl transition-colors"
                          title="Cho thôi việc / Xóa khỏi Gara"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Hiển thị <strong className="text-gray-900">{technicians.length}</strong> / <strong>{totalElements}</strong> kỹ thuật viên
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-semibold text-gray-700 px-3">
              Trang {page + 1} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL 1: CHI TIẾT KỸ THUẬT VIÊN ────────────────────── */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-orange-500 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={detailModalItem.avatarUrl ? resolveFileUrl(detailModalItem.avatarUrl) : `https://ui-avatars.com/api/?name=${encodeURIComponent(detailModalItem.fullName)}&background=fff&color=ea580c`}
                  alt={detailModalItem.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40 shadow-lg"
                />
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold">{detailModalItem.fullName}</h2>
                    <span className="px-2.5 py-0.5 bg-white/20 rounded-lg text-xs font-mono font-bold">
                      {detailModalItem.staffCode || `NV-${detailModalItem.id}`}
                    </span>
                  </div>
                  <p className="text-xs text-orange-100 mt-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {detailModalItem.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Badges Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-2xl p-3.5 text-center">
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Trạng thái ca</p>
                  <p className={`text-sm font-bold mt-1 ${detailModalItem.status === 'FREE' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {detailModalItem.status === 'FREE' ? '🟢 Sẵn sàng' : '🟠 Đang cứu hộ'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3.5 text-center">
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Hoạt động</p>
                  <p className={`text-sm font-bold mt-1 ${detailModalItem.isActive ? 'text-blue-600' : 'text-rose-600'}`}>
                    {detailModalItem.isActive ? 'Hoạt động' : 'Tạm dừng'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3.5 text-center">
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Đánh giá sao</p>
                  <p className="text-sm font-bold text-amber-500 mt-1 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400" />
                    {detailModalItem.rating != null ? detailModalItem.rating.toFixed(1) : 'Chưa có'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3.5 text-center">
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Ca đang xử lý</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {detailModalItem.activeJobsCount || 0} ca
                  </p>
                </div>
              </div>

              {/* Gara Info */}
              <div className="bg-orange-50/50 rounded-2xl p-5 border border-orange-100">
                <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Đơn vị trực thuộc
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-gray-500 font-medium">Tên Gara:</span>
                    <strong className="text-gray-900 text-right">{detailModalItem.garageName || 'Chưa gán'}</strong>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-gray-500 font-medium">Địa chỉ:</span>
                    <span className="text-gray-700 text-right max-w-sm">{detailModalItem.garageAddress || '---'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Hotline Gara:</span>
                    <span className="text-gray-700 font-semibold">{detailModalItem.garagePhone || '---'}</span>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-3 text-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thông tin hệ thống</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs text-gray-400 block">Mã định danh User:</span>
                    <span className="font-semibold text-gray-800">#{detailModalItem.userId || detailModalItem.id}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs text-gray-400 block">Ngày gia nhập đội ngũ:</span>
                    <span className="font-semibold text-gray-800">
                      {new Date(detailModalItem.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleActive(detailModalItem)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
                  detailModalItem.isActive 
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                <Power className="w-4 h-4" />
                {detailModalItem.isActive ? 'Tạm ngưng nhân viên' : 'Kích hoạt lại'}
              </button>

              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: THÊM KỸ THUẬT VIÊN MỚI ─────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Thêm Kỹ thuật viên mới</h3>
                  <p className="text-xs text-gray-400">Gán nhân sự vào Gara đối tác để bắt đầu nhận đơn</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdPasswordNotice ? (
              <div className="p-6 sm:p-8 space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Đã tạo Kỹ thuật viên thành công!</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Dưới đây là mật khẩu tạm thời được hệ thống cấp. Vui lòng gửi thông tin này cho kỹ thuật viên để đăng nhập App:
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-2xl flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[11px] text-gray-400 block font-bold uppercase">Mật khẩu khởi tạo:</span>
                    <strong className="text-lg font-mono text-orange-600">{createdPasswordNotice}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdPasswordNotice)}
                    className="p-2.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedPasswordNotice(null);
                    setIsAddModalOpen(false);
                  }}
                  className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm transition-all"
                >
                  Hoàn tất
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateTechnician} className="p-6 sm:p-8 space-y-4">
                {/* Select Garage */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Gara trực thuộc <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.garageId}
                    onChange={(e) => setAddForm(prev => ({ ...prev, garageId: e.target.value }))}
                    required
                    className="w-full px-4 py-3 bg-[#f9fafc] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900 font-medium"
                  >
                    <option value="">-- Chọn Gara đối tác --</option>
                    {garages.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} - ({g.address.split(',')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Full name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn A"
                    value={addForm.fullName}
                    onChange={(e) => setAddForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#f9fafc] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0912345678"
                    value={addForm.phone}
                    onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#f9fafc] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900"
                  />
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Email <span className="text-gray-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="VD: ktv@gara.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#f9fafc] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900"
                  />
                </div>

                {/* Staff Code */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Mã nhân viên <span className="text-gray-400 font-normal">(Để trống sẽ tự sinh)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: KTV-088"
                    value={addForm.staffCode}
                    onChange={(e) => setAddForm(prev => ({ ...prev, staffCode: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#f9fafc] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900"
                  />
                </div>

                {/* Initial Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Mật khẩu đăng nhập <span className="text-gray-400 font-normal">(Để trống hệ thống sẽ sinh ngẫu nhiên)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Để trống để sinh ngẫu nhiên 8 ký tự"
                    value={addForm.password}
                    onChange={(e) => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#f9fafc] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900 font-mono"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang tạo...' : 'Tạo Kỹ thuật viên'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 3: ĐIỀU CHUYỂN GARA (REASSIGN) ─────────────── */}
      {reassignModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Điều chuyển Gara</h3>
                  <p className="text-xs text-gray-400">Chuyển nhân sự sang Gara khác</p>
                </div>
              </div>
              <button
                onClick={() => setReassignModalItem(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl text-sm">
                <p className="text-xs text-gray-400 font-bold uppercase">Kỹ thuật viên:</p>
                <p className="font-bold text-gray-900 mt-0.5">{reassignModalItem.fullName} ({reassignModalItem.phone})</p>
                <p className="text-xs text-gray-500 mt-1">Gara hiện tại: <strong className="text-gray-700">{reassignModalItem.garageName}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Chọn Gara mới muốn điều chuyển đến:
                </label>
                <select
                  value={targetNewGarageId}
                  onChange={(e) => setTargetNewGarageId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f9fafc] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 font-medium"
                >
                  <option value="">-- Chọn Gara mới --</option>
                  {garages
                    .filter(g => g.id !== reassignModalItem.garageId)
                    .map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} - ({g.address.split(',')[0]})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReassignModalItem(null)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!targetNewGarageId || isSubmitting}
                  onClick={handleReassignGarage}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-md shadow-blue-500/20"
                >
                  {isSubmitting ? 'Đang chuyển...' : 'Xác nhận chuyển'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: CHO THÔI VIỆC / XÓA KHỎI GARA ──────────── */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Xác nhận cho thôi việc</h3>
                <p className="text-xs text-gray-400">Thao tác này sẽ xóa kỹ thuật viên khỏi Gara</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Bạn có chắc chắn muốn cho kỹ thuật viên <strong className="text-gray-900">{deleteModalItem.fullName}</strong> thôi việc và rời khỏi Gara <strong className="text-gray-900">{deleteModalItem.garageName}</strong> không?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                ⚠️ Tài khoản của người này sẽ được chuyển về vai trò Khách hàng thông thường (CUSTOMER) và ngưng quyền nhận đơn cứu hộ.
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalItem(null)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteStaff}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-md shadow-rose-500/20"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thôi việc'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

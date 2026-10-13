import { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Building2,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ratingApi } from '../../api/ratingApi';
import type { RatingDto, AdminRatingStatsDto } from '../../api/ratingApi';
import axiosClient from '../../api/axiosClient';

export default function RatingsPage() {
  const [ratings, setRatings] = useState<RatingDto[]>([]);
  const [stats, setStats] = useState<AdminRatingStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 10;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [starFilter, setStarFilter] = useState<number | ''>('');
  const [garageFilter, setGarageFilter] = useState<number | ''>('');
  const [garagesList, setGaragesList] = useState<{ id: number; name: string }[]>([]);

  // Modals & Actions
  const [selectedRating, setSelectedRating] = useState<RatingDto | null>(null);
  const [deleteModalRating, setDeleteModalRating] = useState<RatingDto | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Garages list for filter dropdown
  useEffect(() => {
    const fetchGarages = async () => {
      try {
        const res: any = await axiosClient.get('/admin/garages?size=100');
        if (res.data?.data?.content) {
          setGaragesList(
            res.data.data.content.map((g: any) => ({ id: g.id, name: g.name }))
          );
        }
      } catch (err) {
        console.error('Không tải được danh sách gara lọc:', err);
      }
    };
    fetchGarages();
  }, []);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const raw: any = await ratingApi.getAdminStats();
      const data = raw?.totalRatings !== undefined ? raw : (raw?.data || null);
      if (data) setStats(data);
    } catch (err) {
      console.error('Lỗi tải thống kê đánh giá:', err);
    }
  }, []);

  // Fetch Ratings
  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const raw: any = await ratingApi.getAdminRatings({
        garageId: garageFilter || '',
        stars: starFilter || '',
        keyword: searchTerm.trim() || undefined,
        page,
        size: PAGE_SIZE,
      });

      const pageData = raw?.content !== undefined ? raw : (raw?.data || raw);

      if (pageData?.content && Array.isArray(pageData.content)) {
        setRatings(pageData.content);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements || pageData.content.length);
      } else if (Array.isArray(pageData)) {
        setRatings(pageData);
        setTotalPages(1);
        setTotalElements(pageData.length);
      } else {
        setRatings([]);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách đánh giá:', err);
      showToast('Không thể tải danh sách đánh giá', 'error');
    } finally {
      setLoading(false);
    }
  }, [garageFilter, starFilter, searchTerm, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  // Handle Delete Rating
  const handleDeleteRating = async () => {
    if (!deleteModalRating) return;
    setActionLoading(true);
    try {
      await ratingApi.deleteRating(deleteModalRating.id);
      showToast('Đã xóa đánh giá thành công');
      setDeleteModalRating(null);
      fetchRatings();
      fetchStats();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Xóa đánh giá thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper render Stars
  const renderStars = (starCount?: number | null, max = 5, size = 'w-4 h-4') => {
    const val = starCount ?? 0;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={`${size} ${
              i < val ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-100'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl transition-all duration-300 border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Quản lý Đánh giá
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {totalElements} lượt đánh giá
            </span>
          </div>
          <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">
            Theo dõi, tổng hợp và giám sát chất lượng dịch vụ của các Gara và Thợ cứu hộ qua đánh giá từ khách hàng
          </p>
        </div>

        <button
          onClick={() => {
            fetchRatings();
            fetchStats();
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 shadow-sm transition active:scale-95 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Ratings */}
        <div
          onClick={() => {
            setStarFilter('');
            setPage(0);
          }}
          className={`cursor-pointer p-5 rounded-2xl border transition bg-white ${
            starFilter === ''
              ? 'border-amber-300 shadow-sm ring-2 ring-amber-500/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng lượt đánh giá
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {stats?.totalRatings ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Tất cả phản hồi từ khách</div>
        </div>

        {/* Average Score */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Điểm trung bình
            </span>
            <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
              <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 flex items-baseline gap-2">
            <span>{stats?.avgStars ? stats.avgStars.toFixed(1) : '5.0'}</span>
            <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            Chất lượng toàn hệ thống
          </div>
        </div>

        {/* Positive (4-5 Stars) */}
        <div
          onClick={() => {
            setStarFilter(5);
            setPage(0);
          }}
          className={`cursor-pointer p-5 rounded-2xl border transition bg-white ${
            starFilter === 5
              ? 'border-emerald-300 shadow-sm ring-2 ring-emerald-500/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Đánh giá tích cực (5★)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 mt-2">
            {stats?.fiveStarCount ?? 0}
          </div>
          <div className="text-xs text-emerald-600 mt-1">Khách hài lòng tuyệt đối</div>
        </div>

        {/* Negative / Low rating (1-2 Stars) */}
        <div
          onClick={() => {
            setStarFilter(1);
            setPage(0);
          }}
          className={`cursor-pointer p-5 rounded-2xl border transition bg-white ${
            starFilter === 1
              ? 'border-rose-300 shadow-sm ring-2 ring-rose-500/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Cần lưu ý (1-2★)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600 mt-2">
            {(stats?.oneStarCount ?? 0) + (stats?.twoStarCount ?? 0)}
          </div>
          <div className="text-xs text-rose-500 mt-1">Khách chưa hài lòng dịch vụ</div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, khách, gara, thợ, nội dung..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Star Filter */}
          <select
            value={starFilter}
            onChange={(e) => {
              setStarFilter(e.target.value === '' ? '' : Number(e.target.value));
              setPage(0);
            }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition cursor-pointer"
          >
            <option value="">Tất cả số sao</option>
            <option value="5">5 sao ⭐⭐⭐⭐⭐</option>
            <option value="4">4 sao ⭐⭐⭐⭐</option>
            <option value="3">3 sao ⭐⭐⭐</option>
            <option value="2">2 sao ⭐⭐</option>
            <option value="1">1 sao ⭐</option>
          </select>

          {/* Garage Filter */}
          <select
            value={garageFilter}
            onChange={(e) => {
              setGarageFilter(e.target.value === '' ? '' : Number(e.target.value));
              setPage(0);
            }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition cursor-pointer max-w-xs truncate"
          >
            <option value="">Tất cả Gara</option>
            {garagesList.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {(searchTerm || starFilter !== '' || garageFilter !== '') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStarFilter('');
                setGarageFilter('');
                setPage(0);
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-5">Mã đơn cứu hộ</th>
                <th className="py-4 px-5">Khách hàng</th>
                <th className="py-4 px-5">Đánh giá Gara</th>
                <th className="py-4 px-5">Đánh giá Thợ cứu hộ</th>
                <th className="py-4 px-5">Thời gian</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
                    Đang tải danh sách đánh giá...
                  </td>
                </tr>
              ) : ratings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Star className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    Không tìm thấy đánh giá nào phù hợp
                  </td>
                </tr>
              ) : (
                ratings.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition group">
                    {/* Mã đơn */}
                    <td className="py-4 px-5">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                        #{r.requestCode || r.requestId || '—'}
                      </span>
                    </td>

                    {/* Khách hàng */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase border border-slate-200">
                          {r.raterName ? r.raterName.charAt(0) : 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-snug">
                            {r.raterName || 'Khách hàng'}
                          </p>
                          <p className="text-xs text-slate-400">{r.raterPhone || '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Đánh giá Gara */}
                    <td className="py-4 px-5 max-w-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          {renderStars(r.stars)}
                          <span className="font-bold text-xs text-amber-600">{r.stars}★</span>
                        </div>
                        <p className="font-medium text-xs text-slate-700 mt-1 truncate">
                          {r.garageName || 'Gara cứu hộ'}
                        </p>
                        {r.comment ? (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">
                            "{r.comment}"
                          </p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Không có nhận xét</span>
                        )}
                      </div>
                    </td>

                    {/* Đánh giá Thợ cứu hộ */}
                    <td className="py-4 px-5 max-w-xs">
                      {r.staffName || r.staffStars ? (
                        <div>
                          <div className="flex items-center gap-2">
                            {renderStars(r.staffStars || r.stars)}
                            <span className="font-bold text-xs text-amber-600">
                              {r.staffStars || r.stars}★
                            </span>
                          </div>
                          <p className="font-medium text-xs text-slate-700 mt-1 truncate flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-slate-400" />
                            {r.staffName || 'Thợ cứu hộ'}
                            {r.staffCode && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                {r.staffCode}
                              </span>
                            )}
                          </p>
                          {r.staffComment ? (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">
                              "{r.staffComment}"
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Không có nhận xét riêng
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Chưa chỉ định thợ</span>
                      )}
                    </td>

                    {/* Thời gian */}
                    <td className="py-4 px-5 text-xs text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(r.createdAt)}
                      </div>
                    </td>

                    {/* Thao tác */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRating(r)}
                          title="Xem chi tiết"
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModalRating(r)}
                          title="Xóa đánh giá (vi phạm)"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
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
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Hiển thị trang <span className="font-bold text-slate-700">{page + 1}</span> /{' '}
            <span className="font-bold text-slate-700">{totalPages}</span> (Tổng{' '}
            <span className="font-bold text-slate-700">{totalElements}</span> đánh giá)
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-slate-600">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Chi tiết Đánh giá #{selectedRating.id}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mã đơn cứu hộ: #{selectedRating.requestCode || selectedRating.requestId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRating(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Info: Customer */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Khách hàng đánh giá
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {selectedRating.raterName || 'Khách hàng'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Số điện thoại: {selectedRating.raterPhone || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Info: Garage Review Card */}
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Đánh giá Gara đối tác
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {renderStars(selectedRating.stars, 5, 'w-4 h-4')}
                  <span className="text-sm font-black text-amber-700">
                    {selectedRating.stars}★
                  </span>
                </div>
              </div>

              <p className="text-sm font-bold text-slate-900">
                {selectedRating.garageName || 'Gara cứu hộ'}
              </p>

              <div className="bg-white p-3 rounded-xl border border-amber-100 text-sm text-slate-700">
                {selectedRating.comment ? (
                  <p className="italic">"{selectedRating.comment}"</p>
                ) : (
                  <p className="text-slate-400 italic">Khách hàng không để lại bình luận chữ</p>
                )}
              </div>
            </div>

            {/* Modal Info: Staff Review Card */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                    Đánh giá Thợ cứu hộ phụ trách
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {renderStars(selectedRating.staffStars || selectedRating.stars, 5, 'w-4 h-4')}
                  <span className="text-sm font-black text-blue-700">
                    {selectedRating.staffStars || selectedRating.stars}★
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">
                  {selectedRating.staffName || 'Thợ cứu hộ'}
                </p>
                {selectedRating.staffCode && (
                  <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">
                    {selectedRating.staffCode}
                  </span>
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-blue-100 text-sm text-slate-700">
                {selectedRating.staffComment ? (
                  <p className="italic">"{selectedRating.staffComment}"</p>
                ) : (
                  <p className="text-slate-400 italic">
                    Không có bình luận riêng (Tính theo đánh giá chung)
                  </p>
                )}
              </div>
            </div>

            {/* Metadata Footer */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
              <span>Thời gian gửi: {formatDate(selectedRating.createdAt)}</span>
              <button
                onClick={() => setSelectedRating(null)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteModalRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa đánh giá?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa đánh giá của đơn #{deleteModalRating.requestCode || deleteModalRating.requestId}?
              Hành động này chỉ nên dùng khi đánh giá chứa từ ngữ xúc phạm hoặc vi phạm tiêu chuẩn cộng đồng.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setDeleteModalRating(null)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteRating}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-md shadow-rose-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'Đang xóa...' : 'Xóa đánh giá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

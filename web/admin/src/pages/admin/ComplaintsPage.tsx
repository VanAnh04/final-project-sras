import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
  FileText,
  User,
  Building2,
  Send,
  Loader2,
} from 'lucide-react';
import { complaintApi } from '../../api/complaintApi';
import type {
  ComplaintDto,
  ComplaintStatus,
  ComplaintTargetType,
} from '../../api/complaintApi';
import { resolveFileUrl } from '../../api/axiosClient';

const STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  OPEN: {
    label: 'Chờ xử lý',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: AlertTriangle,
  },
  IN_REVIEW: {
    label: 'Đang xác minh',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
  },
  RESOLVED: {
    label: 'Đã giải quyết',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Đã bác bỏ',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: XCircle,
  },
};

const TARGET_LABELS: Record<ComplaintTargetType, { label: string; badge: string }> = {
  GARAGE: { label: 'Gara cứu hộ', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  CUSTOMER: { label: 'Khách hàng', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  PLATFORM: { label: 'Hệ thống / Sàn', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('');
  const [targetFilter, setTargetFilter] = useState<ComplaintTargetType | ''>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Selected complaint for modal
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintDto | null>(null);
  const [resolvingStatus, setResolvingStatus] = useState<ComplaintStatus>('IN_REVIEW');
  const [resolutionText, setResolutionText] = useState<string>('');
  const [savingResolution, setSavingResolution] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');
  const [actionErrorMsg, setActionErrorMsg] = useState<string>('');

  // Image zoom modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const res = await complaintApi.getAdminComplaints({
        status: statusFilter,
        targetType: targetFilter,
        page,
        size: 10,
      });

      if (res && res.content) {
        setComplaints(res.content);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || 0);
      } else if (Array.isArray(res)) {
        setComplaints(res);
        setTotalPages(1);
        setTotalElements(res.length);
      } else {
        setComplaints([]);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách khiếu nại:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, targetFilter, page]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleOpenDetail = (item: ComplaintDto) => {
    setSelectedComplaint(item);
    setResolvingStatus(item.status === 'OPEN' ? 'IN_REVIEW' : item.status);
    setResolutionText(item.resolution || '');
    setActionSuccessMsg('');
    setActionErrorMsg('');
  };

  const handleSaveResolution = async () => {
    if (!selectedComplaint) return;
    try {
      setSavingResolution(true);
      setActionSuccessMsg('');
      setActionErrorMsg('');

      const updated = await complaintApi.resolveComplaint(selectedComplaint.id, {
        status: resolvingStatus,
        resolution: resolutionText.trim(),
      });

      setActionSuccessMsg('Đã cập nhật trạng thái khiếu nại và gửi thông báo thành công!');
      setSelectedComplaint(updated);
      // Cập nhật lại trong list
      setComplaints((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể lưu xử lý khiếu nại.';
      setActionErrorMsg(msg);
    } finally {
      setSavingResolution(false);
    }
  };

  // Filter search client-side if searchTerm typed
  const filteredList = complaints.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      String(c.id).includes(term) ||
      (c.requestCode && c.requestCode.toLowerCase().includes(term)) ||
      (c.createdByUserName && c.createdByUserName.toLowerCase().includes(term)) ||
      (c.createdByUserPhone && c.createdByUserPhone.toLowerCase().includes(term)) ||
      (c.garageName && c.garageName.toLowerCase().includes(term)) ||
      c.content.toLowerCase().includes(term)
    );
  });

  // Calculate status counts
  const openCount = complaints.filter((c) => c.status === 'OPEN').length;
  const inReviewCount = complaints.filter((c) => c.status === 'IN_REVIEW').length;
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length;

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Quản lý Khiếu nại
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">
            Theo dõi, xác minh và xử lý các phản ánh của khách hàng & đối tác gara trên toàn hệ thống
          </p>
        </div>

        <button
          onClick={fetchComplaints}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 shadow-sm transition active:scale-95 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-600' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => { setStatusFilter(''); setPage(0); }}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === ''
              ? 'bg-rose-50/60 border-rose-300 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tất cả khiếu nại</span>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalElements}</div>
          <div className="text-xs text-slate-400 mt-1">Tổng lượt phản ánh</div>
        </div>

        <div
          onClick={() => { setStatusFilter('OPEN'); setPage(0); }}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'OPEN'
              ? 'bg-rose-50 border-rose-300 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Chờ xử lý</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">{openCount}</div>
          <div className="text-xs text-rose-500 mt-1">Cần ban quản trị tiếp nhận</div>
        </div>

        <div
          onClick={() => { setStatusFilter('IN_REVIEW'); setPage(0); }}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'IN_REVIEW'
              ? 'bg-amber-50 border-amber-300 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Đang xác minh</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{inReviewCount}</div>
          <div className="text-xs text-amber-500 mt-1">Đang đối soát giữa 2 bên</div>
        </div>

        <div
          onClick={() => { setStatusFilter('RESOLVED'); setPage(0); }}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-50 border-emerald-300 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Đã giải quyết</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{resolvedCount}</div>
          <div className="text-xs text-emerald-500 mt-1">Đã thỏa thuận xong</div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã KN, mã đơn, khách hàng, gara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Target Type Filter */}
          <select
            value={targetFilter}
            onChange={(e) => {
              setTargetFilter(e.target.value as ComplaintTargetType | '');
              setPage(0);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition"
          >
            <option value="">Tất cả đối tượng</option>
            <option value="GARAGE">Bị khiếu nại: Gara</option>
            <option value="CUSTOMER">Bị khiếu nại: Khách hàng</option>
            <option value="PLATFORM">Bị khiếu nại: Hệ thống</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ComplaintStatus | '');
              setPage(0);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="OPEN">Chờ xử lý</option>
            <option value="IN_REVIEW">Đang xác minh</option>
            <option value="RESOLVED">Đã giải quyết</option>
            <option value="REJECTED">Đã bác bỏ</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã KN</th>
                <th className="py-3.5 px-4">Đơn cứu hộ</th>
                <th className="py-3.5 px-4">Người khiếu nại</th>
                <th className="py-3.5 px-4">Đối tượng</th>
                <th className="py-3.5 px-4">Nội dung phản ánh</th>
                <th className="py-3.5 px-4">Bằng chứng</th>
                <th className="py-3.5 px-4">Ngày tạo</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                    Đang tải dữ liệu khiếu nại...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Không tìm thấy khiếu nại nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.OPEN;
                  const targetConf = TARGET_LABELS[item.targetType] || TARGET_LABELS.GARAGE;
                  const StatusIcon = statusConf.icon;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(item)}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        #{item.id}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.requestId ? (
                          <div className="inline-flex items-center gap-1 font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md text-xs border border-rose-100">
                            {item.requestCode ? `#${item.requestCode}` : `#${item.requestId}`}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Khiếu nại chung</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.createdByUserName || 'Người dùng'}
                        </div>
                        {item.createdByUserPhone && (
                          <div className="text-xs text-slate-400">{item.createdByUserPhone}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md border ${targetConf.badge}`}
                        >
                          {targetConf.label}
                        </span>
                        {item.garageName && (
                          <div className="text-xs text-slate-500 font-medium truncate max-w-[150px] mt-0.5">
                            {item.garageName}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-700 line-clamp-2 text-xs leading-relaxed">
                          {item.content}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.attachmentUrl ? (
                          <img
                            src={resolveFileUrl(item.attachmentUrl)}
                            alt="Minh chứng"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(resolveFileUrl(item.attachmentUrl));
                            }}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 hover:scale-105 transition cursor-zoom-in"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">Không có</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConf.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(item);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xử lý
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Trang <span className="font-bold text-slate-700">{page + 1}</span> / {totalPages} (Tổng {totalElements} khiếu nại)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Xử lý Khiếu nại Chi tiết */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-6">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Chi tiết & Xử lý Khiếu nại #{selectedComplaint.id}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Ngày gửi: {new Date(selectedComplaint.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin đối tượng liên quan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Người khiếu nại:</span>
                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  {selectedComplaint.createdByUserName || 'Người dùng'}
                </div>
                <div className="text-slate-500 mt-0.5">{selectedComplaint.createdByUserPhone || 'Chưa cập nhật SĐT'}</div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Đơn & Gara liên quan:</span>
                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {selectedComplaint.garageName || 'Nền tảng SRAS'}
                </div>
                {selectedComplaint.requestCode && (
                  <div className="text-rose-600 font-semibold mt-0.5">
                    Mã đơn: #{selectedComplaint.requestCode}
                  </div>
                )}
              </div>
            </div>

            {/* Nội dung khiếu nại & Bằng chứng */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Nội dung khiếu nại chi tiết
              </label>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedComplaint.content}
              </div>

              {selectedComplaint.attachmentUrl && (
                <div className="mt-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Hình ảnh / Biên lai bằng chứng
                  </label>
                  <img
                    src={resolveFileUrl(selectedComplaint.attachmentUrl)}
                    alt="Bằng chứng"
                    onClick={() => setPreviewImage(resolveFileUrl(selectedComplaint.attachmentUrl))}
                    className="max-h-56 rounded-2xl border border-slate-200 object-contain bg-slate-900/5 hover:opacity-95 transition cursor-zoom-in"
                  />
                </div>
              )}
            </div>

            {/* Form Phản hồi & Xử lý của Admin */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-rose-600" />
                Hướng xử lý của Ban Quản Trị
              </h4>

              {/* Status Select Buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">Trạng thái giải quyết:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolvingStatus('IN_REVIEW')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      resolvingStatus === 'IN_REVIEW'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Đang xác minh
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolvingStatus('RESOLVED')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      resolvingStatus === 'RESOLVED'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã giải quyết
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolvingStatus('REJECTED')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      resolvingStatus === 'REJECTED'
                        ? 'bg-slate-700 text-white border-slate-800 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Bác bỏ
                  </button>
                </div>
              </div>

              {/* Resolution Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">
                  Kết luận xử lý & Lời nhắn gửi người khiếu nại:
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ hướng giải quyết (ví dụ: Gara đã hoàn tiền chênh lệch 150.000đ cho khách; hoặc bác bỏ khiếu nại do không có căn cứ)..."
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>

              {actionSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  {actionSuccessMsg}
                </div>
              )}

              {actionErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  {actionErrorMsg}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={handleSaveResolution}
                  disabled={savingResolution}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-60"
                >
                  {savingResolution ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang lưu xử lý...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Lưu & Phản hồi khiếu nại
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Bằng chứng phóng to"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-white text-slate-800 rounded-full shadow-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

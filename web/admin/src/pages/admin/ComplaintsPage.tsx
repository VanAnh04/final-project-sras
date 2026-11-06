import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  X,
  FileText,
  User,
  Building2,
  Send,
  Loader2,
  MapPin,
  Navigation,
  Car,
  Bike,
  Phone,
  DollarSign,
  Wrench,
  AlertCircle,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { complaintApi } from '../../api/complaintApi';
import type {
  ComplaintDto,
  ComplaintStatus,
  ComplaintTargetType,
} from '../../api/complaintApi';
import { resolveFileUrl } from '../../api/axiosClient';

const formatVnd = (val?: number | null) => (val || 0).toLocaleString('vi-VN') + 'đ';

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTimeOnly = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

function buildAdminGoongMapHtml(
  pickupLat?: number | null,
  pickupLng?: number | null,
  garageLat?: number | null,
  garageLng?: number | null,
  rescuerLat?: number | null,
  rescuerLng?: number | null,
) {
  const pLat = pickupLat ?? 16.0678;
  const pLng = pickupLng ?? 108.2208;
  const hasPickup = pickupLat != null && pickupLng != null;
  const hasGarage = garageLat != null && garageLng != null;
  const hasRescuer = rescuerLat != null && rescuerLng != null;

  // Nếu thợ và khách cùng toạ độ thì dịch nhẹ thợ sang bên một chút để cả 2 ghim màu đều nhìn thấy được
  const isOverlap =
    hasPickup &&
    hasRescuer &&
    Math.abs((pickupLat || 0) - (rescuerLat || 0)) < 0.0002 &&
    Math.abs((pickupLng || 0) - (rescuerLng || 0)) < 0.0002;
  const rLng = isOverlap && rescuerLng != null ? rescuerLng + 0.0006 : rescuerLng;
  const rLat = rescuerLat;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #f1f5f9; font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    if (typeof goongjs !== 'undefined') {
      goongjs.accessToken = 'tLGn6mdYdxZ2fDhZnsm8Dbhf7iSW3zPnHU4fStP0';
      var map = new goongjs.Map({
        container: 'map',
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [${pLng}, ${pLat}],
        zoom: 14
      });

      map.on('load', function() {
        var bounds = new goongjs.LngLatBounds();
        var hasBounds = false;

        ${hasPickup ? `
          new goongjs.Marker({ color: '#ea580c' })
            .setLngLat([${pickupLng}, ${pickupLat}])
            .setPopup(new goongjs.Popup({ offset: 25 }).setHTML('<strong>📍 Điểm hẹn cứu hộ / Khách</strong>'))
            .addTo(map);
          bounds.extend([${pickupLng}, ${pickupLat}]);
          hasBounds = true;
        ` : ''}

        ${hasGarage ? `
          new goongjs.Marker({ color: '#2563eb' })
            .setLngLat([${garageLng}, ${garageLat}])
            .setPopup(new goongjs.Popup({ offset: 25 }).setHTML('<strong>🏢 Gara sửa chữa</strong>'))
            .addTo(map);
          bounds.extend([${garageLng}, ${garageLat}]);
          hasBounds = true;
        ` : ''}

        ${hasRescuer ? `
          new goongjs.Marker({ color: '#16a34a' })
            .setLngLat([${rLng}, ${rLat}])
            .setPopup(new goongjs.Popup({ offset: 25 }).setHTML('<strong>🛵 Vị trí thợ cứu hộ đến hiện trường / báo bom đơn</strong>'))
            .addTo(map);
          bounds.extend([${rLng}, ${rLat}]);
          hasBounds = true;
        ` : ''}

        if (hasBounds) {
          map.fitBounds(bounds, { padding: 45, maxZoom: 15, duration: 600 });
        }
      });
    }
  </script>
</body>
</html>`;
}

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

const isBomComplaint = (c?: ComplaintDto | null): boolean => {
  if (!c) return false;
  return Boolean(
    c.targetType === 'CUSTOMER' &&
      (c.suggestedCompensationAmount != null ||
        c.bomWaitingMinutes != null ||
        c.content?.toLowerCase().includes('bom'))
  );
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
  const [compensationAmount, setCompensationAmount] = useState<number | string>('');
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
    setCompensationAmount(item.approvedCompensationAmount ?? item.suggestedCompensationAmount ?? '');
    setActionSuccessMsg('');
    setActionErrorMsg('');
  };

  const handleSaveResolution = async () => {
    if (!selectedComplaint || selectedComplaint.status === 'RESOLVED') return;
    try {
      setSavingResolution(true);
      setActionSuccessMsg('');
      setActionErrorMsg('');

      const updated = await complaintApi.resolveComplaint(selectedComplaint.id, {
        status: resolvingStatus,
        resolution: resolutionText.trim(),
        approvedCompensationAmount:
          isBomComplaint(selectedComplaint) && compensationAmount !== ''
            ? Number(compensationAmount)
            : undefined,
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
  const rejectedCount = complaints.filter((c) => c.status === 'REJECTED').length;

  const isResolved = selectedComplaint?.status === 'RESOLVED';

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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

        <div
          onClick={() => { setStatusFilter('REJECTED'); setPage(0); }}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'REJECTED'
              ? 'bg-slate-100 border-slate-400 shadow-sm ring-2 ring-slate-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Đã bác bỏ</span>
            <XCircle className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-700 mt-2">{rejectedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Từ chối / Bác bỏ</div>
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
                        {isBomComplaint(item) ? (
                          <div className="font-bold text-slate-900 text-xs inline-block bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                            Khiếu nại bom đơn
                          </div>
                        ) : (
                          <p className="text-slate-700 line-clamp-2 text-xs leading-relaxed">
                            {item.content}
                          </p>
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6">
            {/* Header Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm flex-shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {isBomComplaint(selectedComplaint)
                        ? `Đối soát Khiếu nại Bom Đơn #${selectedComplaint.id}`
                        : `Chi tiết & Xử lý Khiếu nại #${selectedComplaint.id}`}
                    </h3>
                    {selectedComplaint.requestCode && (
                      <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                        Đơn #{selectedComplaint.requestCode}
                      </span>
                    )}
                    {isBomComplaint(selectedComplaint) && selectedComplaint.orderStatus && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Trạng thái đơn: {selectedComplaint.orderStatus}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span>Gửi lúc: {formatDateTime(selectedComplaint.createdAt)}</span>
                    <span>•</span>
                    <span>Đối tượng: <strong className="text-slate-700">{TARGET_LABELS[selectedComplaint.targetType]?.label || selectedComplaint.targetType}</strong></span>
                    <span>•</span>
                    <span>Trạng thái KN: <strong className="text-rose-600">{STATUS_CONFIG[selectedComplaint.status]?.label || selectedComplaint.status}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition self-end sm:self-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TRƯỜNG HỢP 1: GARA KHIẾU NẠI KHÁCH BOM ĐƠN (ĐỐI SOÁT BOM ĐƠN / BỒI HOÀN XĂNG XE) */}
            {isBomComplaint(selectedComplaint) ? (
              <div className="space-y-6">
                {/* 1. THÔNG TIN 3 BÊN LIÊN QUAN (ĐẦY ĐỦ SĐT) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-500" />
                      Thông tin các bên liên quan
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Cột 1: Khách hàng */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">
                        1. Khách hàng gặp sự cố
                      </span>
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-400" />
                        {selectedComplaint.customerName || selectedComplaint.createdByUserName || 'Khách hàng'}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        {selectedComplaint.customerPhone ? (
                          <a href={`tel:${selectedComplaint.customerPhone}`} className="text-emerald-700 font-bold hover:underline">
                            {selectedComplaint.customerPhone}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có SĐT</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 pt-1 border-t border-slate-200/60 mt-1 flex items-center gap-1.5">
                        {selectedComplaint.vehicleType === 'CAR' ? <Car className="w-3.5 h-3.5 text-slate-400" /> : <Bike className="w-3.5 h-3.5 text-slate-400" />}
                        <span>
                          {selectedComplaint.customerVehiclePlate || 'Chưa rõ biển số'}
                          {selectedComplaint.customerVehicleModel ? ` · ${selectedComplaint.customerVehicleModel}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Cột 2: Kỹ thuật viên / Thợ */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                        2. Thợ cứu hộ hiện trường
                      </span>
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-slate-400" />
                        {selectedComplaint.staffName || 'Chưa gán thợ cứu hộ'}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        {selectedComplaint.staffPhone ? (
                          <a href={`tel:${selectedComplaint.staffPhone}`} className="text-emerald-700 font-bold hover:underline">
                            {selectedComplaint.staffPhone}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có SĐT thợ</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 pt-1 border-t border-slate-200/60 mt-1 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedComplaint.rescueVehiclePlate ? `Xe cứu hộ: ${selectedComplaint.rescueVehiclePlate}` : 'Chưa điều xe cứu hộ'}</span>
                      </div>
                    </div>

                    {/* Cột 3: Gara & Chủ gara */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">
                        3. Gara tiếp nhận & Chủ gara
                      </span>
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {selectedComplaint.garageName || 'Nền tảng SRAS'}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Hotline: </span>
                        {selectedComplaint.garagePhone ? (
                          <a href={`tel:${selectedComplaint.garagePhone}`} className="text-emerald-700 font-bold hover:underline">
                            {selectedComplaint.garagePhone}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 pt-1 border-t border-slate-200/60 mt-1 truncate" title={selectedComplaint.garageAddress || ''}>
                        Chủ: <strong>{selectedComplaint.garageOwnerName || '—'}</strong>
                        {selectedComplaint.garageOwnerPhone ? ` (${selectedComplaint.garageOwnerPhone})` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CHI TIẾT ĐƠN HÀNG & TÀI CHÍNH */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    Thông số cuốc cứu hộ & Tài chính
                  </span>

                  {/* Chỉ số tài chính */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-medium block">Tổng cước cuốc xe cứu hộ:</span>
                      <span className="text-lg font-black text-slate-900 mt-0.5 block">
                        {formatVnd(selectedComplaint.orderTotalAmount || selectedComplaint.orderRescueFee)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-amber-800 font-medium block">Đề xuất bồi hoàn 30% xăng xe:</span>
                      <span className="text-lg font-black text-amber-700 mt-0.5 block">
                        {formatVnd(selectedComplaint.suggestedCompensationAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Địa chỉ & Triệu chứng sự cố */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        Địa chỉ hiện trường sự cố:
                      </span>
                      <p className="text-slate-800 font-semibold leading-relaxed">
                        {selectedComplaint.pickupAddress || 'Đang cập nhật địa chỉ'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        Mô tả sự cố xe của khách hàng:
                      </span>
                      <p className="text-slate-800 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        "{selectedComplaint.symptom || 'Khách không nhập mô tả sự cố'}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. GIÁM SÁT TIẾN ĐỘ & HÀNH ĐỘNG CỦA NHÂN VIÊN */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-500" />
                      Giám sát dòng thời gian & Hành động của Kỹ thuật viên
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${((selectedComplaint.bomWaitingMinutes ?? 0) >= 10) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      Thời gian chờ: {selectedComplaint.bomWaitingMinutes ?? 10} phút {((selectedComplaint.bomWaitingMinutes ?? 0) >= 10) ? '✅ (≥ 10 phút)' : '⚠️'}
                    </span>
                  </div>

                  {/* 4 Mốc thời gian trực quan */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block font-semibold">1. Xuất phát:</span>
                      <span className="text-slate-900 font-black text-sm block mt-0.5">
                        {selectedComplaint.enRouteAt ? formatTimeOnly(selectedComplaint.enRouteAt) : 'Chưa có'}
                      </span>
                      <span className="text-[10px] text-blue-600 block mt-0.5 font-bold">
                        {selectedComplaint.enRouteAt ? 'Đã xuất phát từ Gara' : 'Chưa xuất phát'}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block font-semibold">2. Đến nơi:</span>
                      <span className="text-slate-900 font-black text-sm block mt-0.5">
                        {selectedComplaint.arrivedAt ? formatTimeOnly(selectedComplaint.arrivedAt) : 'N/A'}
                      </span>
                      <span className="text-[10px] text-emerald-600 block mt-0.5 font-bold">
                        {selectedComplaint.arrivedAt ? 'Đã có mặt hiện trường' : 'Chưa đến'}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block font-semibold">3. Báo bom đơn lúc:</span>
                      <span className="text-rose-600 font-black text-sm block mt-0.5">
                        {selectedComplaint.bomReportedAt ? formatTimeOnly(selectedComplaint.bomReportedAt) : 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Đã đợi: <strong>{selectedComplaint.bomWaitingMinutes ?? 10} phút</strong>
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block font-semibold">4. Khách giải trình lúc:</span>
                      <span className="text-slate-900 font-black text-sm block mt-0.5">
                        {selectedComplaint.customerCounteredAt ? formatTimeOnly(selectedComplaint.customerCounteredAt) : 'Chưa gửi'}
                      </span>
                      <span className={`text-[10px] font-bold block mt-0.5 ${selectedComplaint.customerCounterExplanation ? 'text-blue-600' : 'text-amber-600'}`}>
                        {selectedComplaint.customerCounterExplanation ? 'Đã nhận giải trình' : 'Khách chưa phản hồi'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. BẢN ĐỒ GIÁM SÁT VỊ TRÍ ĐỐI SOÁT */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-rose-500" />
                      Bản đồ Giám sát Vị trí Hiện trường & Gara
                    </span>
                    {selectedComplaint.pickupLat && selectedComplaint.pickupLng && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedComplaint.pickupLat},${selectedComplaint.pickupLng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg border border-rose-200 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Mở Google Maps vệ tinh
                      </a>
                    )}
                  </div>

                  {/* Map Iframe */}
                  <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
                    <iframe
                      title="Admin Goong Map"
                      srcDoc={buildAdminGoongMapHtml(
                        selectedComplaint.pickupLat,
                        selectedComplaint.pickupLng,
                        selectedComplaint.garageLat,
                        selectedComplaint.garageLng,
                        selectedComplaint.rescuerLat ?? selectedComplaint.enRouteLat,
                        selectedComplaint.rescuerLng ?? selectedComplaint.enRouteLng,
                      )}
                      className="w-full h-full border-0"
                    />
                  </div>

                  {/* Chú thích map */}
                  <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-2 flex-wrap px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-orange-600 inline-block shadow-2xs flex-shrink-0" />
                      <span>Điểm hẹn cứu hộ (Khách hàng)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-2xs flex-shrink-0" />
                      <span>Gara sửa chữa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shadow-2xs flex-shrink-0" />
                      <span>Vị trí thợ cứu hộ đến hiện trường / báo bom đơn</span>
                    </div>
                  </div>
                </div>

                {/* 5. ĐỐI SOÁT BẰNG CHỨNG 2 CHIỀU (THỢ VS KHÁCH) - HIỂN THỊ DUY NHẤT 1 LẦN (KHÔNG BỊ LẶP) */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚖️</span>
                      <div>
                        <h4 className="font-extrabold text-amber-950 text-sm">
                          Đối soát Bằng chứng 2 Chiều & Bồi hoàn Xăng xe
                        </h4>
                        <p className="text-xs text-amber-800">
                          So sánh minh chứng giữa Kỹ thuật viên báo bom đơn và Giải trình của Khách hàng
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-200/80 text-amber-900 border border-amber-300 self-start sm:self-auto">
                      Chính sách bồi hoàn 30% cước
                    </span>
                  </div>

                  {/* 2 Cột Đối Soát */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Cột trái: Phía Thợ cứu hộ / Gara */}
                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-amber-600" />
                          1. Báo cáo & Bằng chứng từ Thợ cứu hộ:
                        </span>
                        {selectedComplaint.bomReportedAt && (
                          <span className="text-[10px] text-slate-400">
                            {formatTimeOnly(selectedComplaint.bomReportedAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-800 font-medium leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-100 italic">
                        "{selectedComplaint.content}"
                      </p>

                      {selectedComplaint.attachmentUrl ? (
                        <div>
                          <span className="text-slate-500 text-[11px] font-bold block mb-1.5">
                            Ảnh hiện trường chụp lúc báo bom đơn (Click để phóng to):
                          </span>
                          <img
                            src={resolveFileUrl(selectedComplaint.attachmentUrl)}
                            alt="Ảnh hiện trường thợ"
                            onClick={() => setPreviewImage(resolveFileUrl(selectedComplaint.attachmentUrl))}
                            className="h-44 w-full object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:opacity-90 transition shadow-xs"
                          />
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-lg text-slate-400 text-center italic">
                          Thợ không đính kèm ảnh hiện trường
                        </div>
                      )}
                    </div>

                    {/* Cột phải: Phía Khách hàng giải trình */}
                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                          <User className="w-4 h-4 text-blue-600" />
                          2. Giải trình & Phản hồi từ Khách hàng:
                        </span>
                        {selectedComplaint.customerCounteredAt && (
                          <span className="text-[10px] text-slate-400">
                            {formatTimeOnly(selectedComplaint.customerCounteredAt)}
                          </span>
                        )}
                      </div>

                      {selectedComplaint.customerCounterExplanation ? (
                        <>
                          <p className="text-slate-800 font-medium leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100 italic">
                            "{selectedComplaint.customerCounterExplanation}"
                          </p>

                          {selectedComplaint.customerCounterAttachmentUrl ? (
                            <div>
                              <span className="text-slate-500 text-[11px] font-bold block mb-1.5">
                                Ảnh khách cung cấp đối chứng (Click để phóng to):
                              </span>
                              <img
                                src={resolveFileUrl(selectedComplaint.customerCounterAttachmentUrl)}
                                alt="Ảnh khách gửi"
                                onClick={() => setPreviewImage(resolveFileUrl(selectedComplaint.customerCounterAttachmentUrl))}
                                className="h-44 w-full object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:opacity-90 transition shadow-xs"
                              />
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-lg text-slate-400 text-center italic">
                              Khách không đính kèm hình ảnh
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-8 bg-amber-50/60 rounded-xl border border-amber-200/80 text-center space-y-1">
                          <span className="block font-bold text-amber-900 text-sm">Khách chưa gửi giải trình</span>
                          <p className="text-[11px] text-amber-800/80 leading-relaxed">
                            Hệ thống đã gửi cảnh báo nhưng khách hàng chưa nhập ý kiến phản hồi hoặc đã quá thời hạn giải trình.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Duyệt số tiền bồi hoàn xăng xe */}
                  {isResolved ? (
                    <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-300 shadow-sm space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <label className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Số tiền bồi hoàn xăng xe đã duyệt & giải ngân vào Ví tiền mặt Gara:
                        </label>
                        <span className="text-base font-black text-emerald-700">
                          {formatVnd(selectedComplaint.approvedCompensationAmount || selectedComplaint.suggestedCompensationAmount)}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-normal">
                        ✅ <strong>Đã giải ngân thành công vào ví Gara.</strong> Giao dịch đã hoàn tất và được khóa bảo vệ, không thể hoàn lại lần 2.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-xl border border-amber-300 shadow-sm space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <label className="text-xs font-extrabold text-slate-800">
                          Số tiền bồi hoàn xăng xe giải ngân vào Ví tiền mặt Gara:
                        </label>
                        <span className="text-xs text-amber-800 font-bold">
                          Mức hệ thống đề xuất (30% cước): {formatVnd(selectedComplaint.suggestedCompensationAmount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={5000}
                          min={0}
                          value={compensationAmount}
                          onChange={(e) => setCompensationAmount(e.target.value)}
                          placeholder="Nhập số tiền duyệt (VNĐ)..."
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setCompensationAmount(selectedComplaint.suggestedCompensationAmount || 0)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
                        >
                          Dùng số đề xuất
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        💡 <strong>Quy chế:</strong> Khi chọn <strong>"Đã giải quyết"</strong> và bấm Lưu, hệ thống sẽ tự động <strong>cộng tiền vào Ví tiền mặt của Gara</strong>, ghi nhận lịch sử giao dịch và gửi thông báo đẩy tới điện thoại của Chủ Gara.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TRƯỜNG HỢP 2: KHIẾU NẠI CỦA KHÁCH HÀNG / KHIẾU NẠI DỊCH VỤ (GIỮ NGUYÊN LOGIC CŨ) */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Người khiếu nại (Khách hàng):</span>
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      {selectedComplaint.createdByUserName || 'Khách hàng'}
                    </div>
                    <div className="text-slate-500 mt-0.5">{selectedComplaint.createdByUserPhone || 'Chưa cập nhật SĐT'}</div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Đối tượng bị phản ánh:</span>
                    <div className="font-bold text-slate-800 text-sm">
                      {TARGET_LABELS[selectedComplaint.targetType]?.label || selectedComplaint.targetType}
                    </div>
                    {selectedComplaint.garageName && (
                      <div className="text-slate-700 font-semibold mt-0.5">
                        Gara: {selectedComplaint.garageName}
                      </div>
                    )}
                    {selectedComplaint.requestCode && (
                      <div className="text-rose-600 font-semibold mt-0.5">
                        Mã đơn liên quan: #{selectedComplaint.requestCode}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Nội dung khiếu nại chi tiết
                  </label>
                  <div className={`grid gap-4 ${selectedComplaint.attachmentUrl ? 'grid-cols-1 md:grid-cols-12' : 'grid-cols-1'}`}>
                    <div className={`bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap ${selectedComplaint.attachmentUrl ? 'md:col-span-8' : ''}`}>
                      {selectedComplaint.content}
                    </div>

                    {selectedComplaint.attachmentUrl && (
                      <div className="md:col-span-4 bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                        <span className="text-[11px] font-bold text-slate-500 mb-1.5 self-start">
                          Hình ảnh / Biên lai đính kèm:
                        </span>
                        <img
                          src={resolveFileUrl(selectedComplaint.attachmentUrl)}
                          alt="Bằng chứng"
                          onClick={() => setPreviewImage(resolveFileUrl(selectedComplaint.attachmentUrl))}
                          className="max-h-40 w-full object-contain rounded-xl border border-slate-200 bg-white hover:opacity-95 transition cursor-zoom-in"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form Phản hồi & Xử lý của Admin */}
            <div className="bg-slate-50/80 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-200/80 pb-3">
                <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-rose-600" />
                  {isResolved
                    ? 'Kết luận Xử lý & Phán quyết của Ban Quản Trị'
                    : 'Hành động Xử lý & Ra quyết định của Ban Quản Trị'}
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  {isResolved
                    ? 'Khiếu nại đã giải quyết hoàn tất (Hồ sơ đã khóa)'
                    : 'Cập nhật trạng thái giải quyết và gửi thông báo tới các bên'}
                </span>
              </div>

              {isResolved ? (
                /* Banner khi đã giải quyết xong */
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-sm font-extrabold text-emerald-900">
                      Khiếu nại đã giải quyết hoàn tất (Đã khóa)
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      {isBomComplaint(selectedComplaint)
                        ? `Ban quản trị đã phê duyệt giải quyết khiếu nại và giải ngân số tiền bồi hoàn ${formatVnd(selectedComplaint.approvedCompensationAmount || selectedComplaint.suggestedCompensationAmount)} vào ví Gara. Quyết định đã thực thi và được khóa để tránh hoàn trùng lần 2.`
                        : 'Khiếu nại này đã được Ban quản trị giải quyết và đóng hồ sơ thành công.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Status Select Buttons khi chưa giải quyết (IN_REVIEW hoặc REJECTED hoặc OPEN) */
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Chọn trạng thái / Hành động giải quyết:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setResolvingStatus('IN_REVIEW')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 ${
                        resolvingStatus === 'IN_REVIEW'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50/50'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      Đang xác minh
                    </button>

                    <button
                      type="button"
                      onClick={() => setResolvingStatus('RESOLVED')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 ${
                        resolvingStatus === 'RESOLVED'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isBomComplaint(selectedComplaint)
                        ? 'Đã giải quyết (Duyệt bồi hoàn)'
                        : 'Đã giải quyết'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setResolvingStatus('REJECTED')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 ${
                        resolvingStatus === 'REJECTED'
                          ? 'bg-slate-800 text-white border-slate-900 shadow-md ring-2 ring-slate-700/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      Bác bỏ khiếu nại
                    </button>
                  </div>
                </div>
              )}

              {/* Resolution Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Kết luận xử lý & Lời nhắn gửi người khiếu nại:
                </label>
                <textarea
                  rows={3}
                  disabled={isResolved}
                  placeholder={
                    isBomComplaint(selectedComplaint)
                      ? 'Ghi rõ hướng giải quyết (ví dụ: Đã xác minh thợ chờ đủ 10 phút, duyệt bồi hoàn 30% xăng xe vào ví tiền mặt Gara; hoặc bác bỏ khiếu nại)...'
                      : 'Ghi rõ hướng giải quyết (ví dụ: Đã yêu cầu Gara bồi hoàn khoản chênh lệch và gửi lời xin lỗi khách hàng; hoặc bác bỏ khiếu nại do không có căn cứ)...'
                  }
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  className={`w-full p-3.5 border rounded-xl text-sm transition shadow-sm ${
                    isResolved
                      ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                  }`}
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
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                    isResolved
                      ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-md'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Đóng
                </button>

                {!isResolved && (
                  <button
                    type="button"
                    onClick={handleSaveResolution}
                    disabled={savingResolution}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-md transition active:scale-95 disabled:opacity-60"
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
                )}
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

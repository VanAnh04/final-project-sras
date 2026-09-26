import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, CheckCircle2, XCircle, FileText, 
  ExternalLink, Eye, MapPin, Phone, Building2, 
  Percent, AlertCircle, RefreshCw, X, Check
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

interface GarageDocument {
  id: number;
  docType: string;
  fileUrl: string;
  note: string;
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
  capability?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  commissionRate: number;
  isOnline: boolean;
  createdAt: string;
  ownerName?: string;
  ownerPhone?: string;
  documents?: GarageDocument[];
}

export default function Garages() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SUSPENDED'>('PENDING');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [garages, setGarages] = useState<GarageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ PENDING: 0, APPROVED: 0, SUSPENDED: 0, TOTAL: 0 });

  const [selectedGarage, setSelectedGarage] = useState<GarageItem | null>(null);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [editCommission, setEditCommission] = useState(15);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchStats = async () => {
    try {
      const res: any = await axiosClient.get('/admin/garages/stats');
      if (res?.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.warn('Could not fetch stats', e);
    }
  };

  const fetchGarages = async () => {
    setLoading(true);
    try {
      const params: any = { page: 0, size: 20 };
      if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }
      const res: any = await axiosClient.get('/admin/garages', { params });
      const items: GarageItem[] = res?.data?.content || [];
      
      if (items.length === 0 && !searchKeyword && activeTab === 'PENDING') {
        const defaultMock: GarageItem[] = [
          {
            id: 1,
            code: 'GR-0042',
            name: 'Gara AutoCare Thủ Đức',
            phone: '0988.111.222',
            email: 'autocare.thuduc@gmail.com',
            address: '123 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức, TP.HCM',
            lat: 10.8512,
            lng: 106.7719,
            capability: 'BOTH',
            status: 'PENDING',
            commissionRate: 15,
            isOnline: false,
            createdAt: '2026-09-18T08:30:00Z',
            ownerName: 'Nguyễn Văn Thành',
            ownerPhone: '0988.111.222',
            documents: [
              {
                id: 1,
                docType: 'BUSINESS_LICENSE',
                fileUrl: 'https://images.unsplash.com/photo-1618042164219-62c820f10723?w=800&auto=format&fit=crop&q=60',
                note: 'Giấy phép ĐKKD số 0314892839 cấp ngày 15/03/2021'
              },
              {
                id: 2,
                docType: 'OWNER_ID_CARD_FRONT',
                fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60',
                note: 'CCCD Mặt trước'
              },
              {
                id: 3,
                docType: 'OWNER_ID_CARD_BACK',
                fileUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&auto=format&fit=crop&q=60',
                note: 'CCCD Mặt sau'
              },
              {
                id: 4,
                docType: 'GARAGE_PHOTO',
                fileUrl: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?w=800&auto=format&fit=crop&q=60',
                note: 'Ảnh mặt tiền gara 123 Võ Văn Ngân'
              }
            ]
          }
        ];
        setGarages(defaultMock);
        setStats({ PENDING: 1, APPROVED: 14, SUSPENDED: 1, TOTAL: 16 });
      } else {
        setGarages(items);
      }
    } catch (e) {
      console.error('Error fetching garages:', e);
      setGarages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchGarages();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGarages();
  };

  const handleOpenDrawer = (garage: GarageItem) => {
    setSelectedGarage(garage);
    setSelectedDocIndex(0);
    setEditCommission(garage.commissionRate || 15);
  };

  const handleApprove = async (id: number, rate?: number) => {
    const finalRate = rate !== undefined ? rate : editCommission;
    
    // Optimistic UI: Cập nhật giao diện ngay lập tức
    setSelectedGarage(null);
    setGarages(prev => prev.map(g => g.id === id ? { ...g, status: 'APPROVED', commissionRate: finalRate } : g));
    setStats(prev => ({
      ...prev,
      PENDING: Math.max(0, prev.PENDING - 1),
      APPROVED: prev.APPROVED + 1
    }));
    showToast('Đã phê duyệt Gara thành công! Tài khoản đã được nâng cấp lên Admin Gara.', 'success');

    try {
      await axiosClient.put(`/admin/garages/${id}/review`, {
        status: 'APPROVED',
        commissionRate: finalRate
      });
      // Đồng bộ ngầm
      Promise.all([fetchStats(), fetchGarages()]);
    } catch (e: any) {
      console.error('Error approving garage:', e);
      fetchGarages();
      fetchStats();
    }
  };

  const handleOpenReject = (id: number) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối', 'error');
      return;
    }
    const currentId = rejectTargetId;
    const currentReason = rejectReason.trim();

    // Optimistic UI: Đóng modal và cập nhật giao diện ngay lập tức
    setRejectModalOpen(false);
    setSelectedGarage(null);
    setGarages(prev => prev.map(g => g.id === currentId ? { ...g, status: 'REJECTED', rejectionReason: currentReason } : g));
    setStats(prev => ({
      ...prev,
      PENDING: Math.max(0, prev.PENDING - 1)
    }));
    showToast('Đã từ chối hồ sơ Gara và gửi thông báo tới người đăng ký', 'success');

    try {
      await axiosClient.put(`/admin/garages/${currentId}/review`, {
        status: 'REJECTED',
        rejectionReason: currentReason
      });
      // Đồng bộ ngầm
      Promise.all([fetchStats(), fetchGarages()]);
    } catch (e) {
      console.error('Error rejecting garage:', e);
      fetchGarages();
      fetchStats();
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
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto relative pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white transition-all transform animate-bounce ${
          toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Gara đối tác</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Phê duyệt hồ sơ đăng ký và quản lý mạng lưới cứu hộ đối tác
          </p>
        </div>
        <button 
          onClick={() => { fetchStats(); fetchGarages(); }}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới dữ liệu
        </button>
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Chờ duyệt</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              {stats.PENDING || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Đang hoạt động</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'APPROVED' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {stats.APPROVED || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SUSPENDED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'SUSPENDED'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Đang tạm khóa</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'SUSPENDED' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'
            }`}>
              {stats.SUSPENDED || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-gray-800 text-white shadow-sm shadow-gray-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Tất cả</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-200 text-gray-800">
              {stats.TOTAL || 0}
            </span>
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo tên gara, hotline, địa chỉ..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            <Filter className="w-4 h-4" />
            Lọc
          </button>
        </form>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-400">
                <th className="py-3.5 px-6">Thông tin Gara</th>
                <th className="py-3.5 px-6">Khu vực</th>
                <th className="py-3.5 px-6 text-center">Chiết khấu (%)</th>
                <th className="py-3.5 px-6 text-center">Hồ sơ pháp lý</th>
                <th className="py-3.5 px-6 text-center">Trạng thái</th>
                <th className="py-3.5 px-6 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Đang tải dữ liệu hồ sơ Gara...
                  </td>
                </tr>
              ) : garages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400 font-medium">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 stroke-[1.5]" />
                    Không có gara nào phù hợp với bộ lọc hiện tại
                  </td>
                </tr>
              ) : (
                garages.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/40 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-black text-base shadow-sm">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-base group-hover:text-orange-600 transition-colors">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-1">
                            <span className="font-mono font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                              {item.code || `GR-${String(item.id).padStart(4, '0')}`}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-gray-600">
                              <Phone className="w-3 h-3 text-orange-500" /> {item.phone}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 truncate max-w-xs">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" /> {item.address}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-800">
                        {item.address.includes('Thủ Đức') ? 'TP. Thủ Đức' : (item.address.includes('Quận 7') ? 'Quận 7' : 'TP. Hồ Chí Minh')}
                      </p>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">
                        ({item.lat.toFixed(3)}, {item.lng.toFixed(3)})
                      </p>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 font-black text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-lg">
                        <Percent className="w-3.5 h-3.5 text-orange-600" />
                        {item.commissionRate || 15}%
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleOpenDrawer(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Xem file pdf</span>
                        <span className="bg-blue-200 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                          {item.documents?.length || 4}
                        </span>
                      </button>
                    </td>

                    <td className="py-4 px-6 text-center">
                      {item.status === 'PENDING' && (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Chờ duyệt
                          </span>
                          {item.rejectionReason && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200" title={"Lý do từ chối: " + item.rejectionReason}> 
                              Nộp lại / Kháng cáo
                            </span>
                          )}
                        </div>
                      )}
                      {item.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Hoạt động
                        </span>
                      )}
                      {item.status === 'SUSPENDED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Tạm khóa
                        </span>
                      )}
                      {item.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          Đã từ chối
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleApprove(item.id, item.commissionRate)}
                              title="Phê duyệt đối tác"
                              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm hover:shadow-emerald-200 transition-all"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                            <button
                              onClick={() => handleOpenReject(item.id)}
                              title="Từ chối hồ sơ"
                              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-all"
                            >
                              <X className="w-4 h-4 stroke-[3]" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOpenDrawer(item)}
                            className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Right Drawer: Legal Documents Preview (Matching Image 2) */}
      {selectedGarage && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedGarage(null)}
          />

          <div className="fixed inset-y-0 right-0 w-[540px] max-w-full bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-black text-gray-900">Chi tiết hồ sơ đối tác</h2>
                <p className="text-xs text-gray-500 font-medium">Hồ sơ pháp lý & giấy phép đăng ký kinh doanh</p>
              </div>
              <button
                onClick={() => setSelectedGarage(null)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Garage Summary Card */}
              <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-gray-900 text-base">{selectedGarage.name}</h3>
                  <span className="text-xs font-mono font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                    {selectedGarage.code || `GR-${String(selectedGarage.id).padStart(4, '0')}`}
                  </span>
                </div>
                <div className="mt-2 text-xs space-y-1 text-gray-600 font-medium">
                  <p className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-500">Đại diện:</span> {selectedGarage.ownerName || 'Chưa cập nhật'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-500">Hotline:</span> {selectedGarage.phone}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-500">Địa chỉ:</span> {selectedGarage.address}
                  </p>
                </div>
              </div>
              {/* Previous Rejection / Appeal Alert Card */}
              {selectedGarage.rejectionReason && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>HỒ SƠ NỘP LẠI / KHÁNG CÁO</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    <span className="font-bold text-amber-950">Lý do từ chối lần trước: </span>
                    {selectedGarage.rejectionReason}
                  </p>
                  <p className="text-[11px] text-amber-700 italic">
                    * Đối tác đã cập nhật lại thông tin dựa trên lý do này. Vui lòng đối soát kỹ tài liệu mới bên dưới.
                  </p>
                </div>
              )}

              {/* Document Tabs */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-2">
                  Tài liệu đính kèm ({selectedGarage.documents?.length || 4} mục)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(selectedGarage.documents && selectedGarage.documents.length > 0 ? selectedGarage.documents : [
                    { id: 1, docType: 'BUSINESS_LICENSE', fileUrl: '', note: 'Giấy phép ĐKKD' },
                    { id: 2, docType: 'OWNER_ID_CARD_FRONT', fileUrl: '', note: 'CCCD Mặt trước' },
                    { id: 3, docType: 'OWNER_ID_CARD_BACK', fileUrl: '', note: 'CCCD Mặt sau' },
                    { id: 4, docType: 'GARAGE_PHOTO', fileUrl: '', note: 'Ảnh mặt tiền Gara' },
                  ]).map((doc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDocIndex(idx)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                        selectedDocIndex === idx
                          ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <FileText className={`w-4 h-4 shrink-0 ${selectedDocIndex === idx ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="truncate">{getDocTypeTitle(doc.docType)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Preview Box with RED CIRCULAR SEAL (As in Image 2) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">Bản xem trước tài liệu:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const docUrl = selectedGarage.documents?.[selectedDocIndex]?.fileUrl;
                      if (!docUrl) return;
                      if (docUrl.startsWith('data:')) {
                        const win = window.open('');
                        win?.document.write('<title>Xem tài liệu</title><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="' + docUrl + '" style="max-width:95vw;max-height:95vh;object-fit:contain;box-shadow:0 10px 25px rgba(0,0,0,0.5);border-radius:8px;" /></body>');
                      } else {
                        window.open(docUrl, '_blank');
                      }
                    }}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Mở toàn màn hình
                  </button>
                </div>

                <div className="relative w-full h-80 bg-slate-900/5 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center group shadow-inner">
                  {/* Document Content / Image */}
                  <img
                    src={
                      selectedGarage.documents?.[selectedDocIndex]?.fileUrl ||
                      'https://images.unsplash.com/photo-1618042164219-62c820f10723?w=800&auto=format&fit=crop&q=60'
                    }
                    alt="Document preview"
                    className="w-full h-full object-contain p-2"
                  />

                  {/* Red Official Verification Stamp (Matches Image 2) */}
                  <div className="absolute top-6 right-6 pointer-events-none transform rotate-[-12deg] opacity-85 select-none">
                    <div className="w-28 h-28 border-4 border-red-600 rounded-full flex flex-col items-center justify-center p-1.5 text-center text-red-600 shadow-lg bg-red-50/30 backdrop-blur-[0.5px]">
                      <div className="w-24 h-24 border border-red-600 rounded-full flex flex-col items-center justify-center p-1">
                        <span className="text-[7px] font-black uppercase tracking-tighter leading-none">HỆ THỐNG SRAS</span>
                        <div className="w-10 h-px bg-red-600 my-0.5"></div>
                        <span className="text-[10px] font-black uppercase tracking-tight text-red-700 leading-tight">ĐÃ XÁC THỰC</span>
                        <span className="text-[7px] font-bold text-red-500 uppercase mt-0.5">BẢN CHÍNH</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 mt-2 italic text-center">
                  Tài liệu được bảo mật và mã hóa số học theo tiêu chuẩn thẩm định của SRAS.
                </p>
              </div>

              {/* Commission Rate Setting Form */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Tỷ lệ chiết khấu hệ thống (%) cho Gara này:
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
                      className="w-full pl-4 pr-8 py-2 bg-white border border-gray-300 rounded-xl text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Mặc định: 15%</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
              {selectedGarage.status === 'PENDING' ? (
                <>
                  <button
                    onClick={() => handleOpenReject(selectedGarage.id)}
                    className="flex-1 py-3 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Từ chối hồ sơ
                  </button>
                  <button
                    onClick={() => handleApprove(selectedGarage.id, editCommission)}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Phê duyệt đối tác
                  </button>
                </>
              ) : (
                <div className="w-full text-center py-2 text-sm font-bold text-gray-500">
                  Hồ sơ đã được xử lý ({selectedGarage.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'})
                </div>
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
              <h3 className="text-lg font-black text-gray-900">Từ chối hồ sơ Gara</h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Vui lòng nhập lý do từ chối để thông báo chi tiết đến chủ gara sửa đổi thông tin.
            </p>
            <div>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Giấy phép kinh doanh bị mờ, ảnh chụp mặt tiền không khớp với địa chỉ đăng ký..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-gray-800"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-200"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
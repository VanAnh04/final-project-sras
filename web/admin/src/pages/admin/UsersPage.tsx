import { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Lock, 
  ChevronDown, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Unlock,
  X,
  CheckCircle2,
  Search,
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  Shield,
  CreditCard,
  BadgeCheck,
  XCircle,
  History,
  Radio
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export type UserRoleEnum = 'CUSTOMER' | 'GARAGE_OWNER' | 'GARAGE_STAFF' | 'ADMIN';
export type UserStatusEnum = 'ACTIVE' | 'LOCKED';

interface UserItem {
  id: string;
  name: string;
  phone: string;
  joinDate: string;
  status: UserStatusEnum;
  rawId?: number | string;
  latestActivity?: string;
  latestActivityAt?: string;
}

interface UserDetailData {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  role: UserRoleEnum;
  status: UserStatusEnum;
  debtAmount?: number;
  isBlockedByDebt?: boolean;
  isPhoneVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AuditLogEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  beforeValue?: string;
  afterValue?: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [userDetailData, setUserDetailData] = useState<UserDetailData | null>(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditLogsList, setAuditLogsList] = useState<AuditLogEntry[]>([]);
  const [auditTargetUser, setAuditTargetUser] = useState<UserItem | null>(null);

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<UserItem | null>(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoadingApi(true);
      const params: any = {
        page: currentPage - 1,
        size: 10,
      };
      if (filterStatus !== 'ALL') {
        params.status = filterStatus;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res: any = await axiosClient.get('/users', { params });
      const apiData = res?.data || res;

      if (apiData?.content && Array.isArray(apiData.content)) {
        const mapped: UserItem[] = apiData.content.map((item: any) => ({
          id: `USR-${item.id}`,
          name: item.fullName || 'Chưa cập nhật',
          phone: item.phone || 'N/A',
          joinDate: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'N/A',
          status: item.status || 'ACTIVE',
          rawId: item.id,
          latestActivity: item.latestActivity,
          latestActivityAt: item.latestActivityAt,
        }));
        setUsers(mapped);
        setTotalElements(apiData.totalElements || mapped.length);
        setTotalPages(apiData.totalPages || 1);
      } else if (Array.isArray(apiData)) {
        const mapped: UserItem[] = apiData.map((item: any) => ({
          id: `USR-${item.id}`,
          name: item.fullName || 'Chưa cập nhật',
          phone: item.phone || 'N/A',
          joinDate: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'N/A',
          status: item.status || 'ACTIVE',
          rawId: item.id,
          latestActivity: item.latestActivity,
          latestActivityAt: item.latestActivityAt,
        }));
        setUsers(mapped);
        setTotalElements(mapped.length);
        setTotalPages(1);
      } else {
        setUsers([]);
        setTotalElements(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching users from backend API:', error);
      setUsers([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setIsLoadingApi(false);
    }
  }, [currentPage, filterStatus, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const getWsUrl = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      return `${protocol}//${host}:8080/ws/users`;
    };

    const connect = () => {
      try {
        ws = new WebSocket(getWsUrl());

        ws.onopen = () => {
          if (isMounted) setIsWsConnected(true);
        };

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data?.event === 'USERS_UPDATED') {
              fetchUsers();
              showToast('Cập nhật dữ liệu từ máy chủ (WebSocket)');
            }
          } catch (e) {
            // silent parse ignore
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsWsConnected(false);
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          if (isMounted) {
            setIsWsConnected(false);
          }
        };
      } catch (err) {
        if (isMounted) {
          setIsWsConnected(false);
          reconnectTimer = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [fetchUsers]);

  const getRoleBadge = (role?: UserRoleEnum) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Quản trị viên', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'GARAGE_OWNER':
        return { label: 'Chủ Gara', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'GARAGE_STAFF':
        return { label: 'Nhân viên Gara', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'CUSTOMER':
      default:
        return { label: 'Khách hàng', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
  };

  const getStatusBadge = (status?: UserStatusEnum) => {
    switch (status) {
      case 'LOCKED':
        return { label: 'Đã khóa', bg: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' };
      case 'ACTIVE':
      default:
        return { label: 'Hoạt động', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    }
  };

  const handleOpenDetailModal = async (userItem: UserItem) => {
    setActiveMenuId(null);
    setTargetUser(userItem);
    setUserDetailData(null);
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    try {
      const rawId = userItem.rawId || userItem.id.replace('USR-', '');
      const res: any = await axiosClient.get(`/users/${rawId}`);
      const detailData = res?.data || res;
      setUserDetailData(detailData);
    } catch (err) {
      console.error('Lỗi lấy thông tin chi tiết người dùng:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleOpenAuditLogsModal = async (userItem: UserItem) => {
    setActiveMenuId(null);
    setAuditTargetUser(userItem);
    setAuditLogsList([]);
    setIsAuditModalOpen(true);
    setIsAuditLoading(true);
    try {
      const rawId = userItem.rawId || userItem.id.replace('USR-', '');
      const res: any = await axiosClient.get(`/users/${rawId}/audit-logs`);
      const apiData = res?.data || res;
      if (Array.isArray(apiData)) {
        setAuditLogsList(apiData);
      } else {
        setAuditLogsList([]);
      }
    } catch (err) {
      console.error('Lỗi lấy nhật ký hoạt động người dùng:', err);
      setAuditLogsList([]);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesStatus = filterStatus === 'ALL' || u.status === filterStatus;
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const isAllSelected = filteredUsers.length > 0 && selectedIds.length === filteredUsers.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map((u) => u.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleLockStatus = async (userItem: UserItem) => {
    const newStatus = userItem.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    try {
      const rawId = userItem.rawId || userItem.id.replace('USR-', '');
      await axiosClient.patch(`/users/${rawId}/status`, null, {
        params: { status: newStatus }
      });
      fetchUsers();
    } catch (err) {
      console.error('Error updating user status on backend API:', err);
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userItem.id ? { ...u, status: newStatus } : u))
    );
    showToast(
      newStatus === 'LOCKED'
        ? `Đã khóa tài khoản ${userItem.name} (${userItem.id})`
        : `Đã mở khóa tài khoản ${userItem.name} (${userItem.id})`
    );
    setIsLockModalOpen(false);
    setTargetUser(null);
  };

  const handleBatchLock = () => {
    if (selectedIds.length === 0) return;
    setUsers((prev) =>
      prev.map((u) => (selectedIds.includes(u.id) ? { ...u, status: 'LOCKED' } : u))
    );
    showToast(`Đã khóa ${selectedIds.length} tài khoản người dùng được chọn`);
    setSelectedIds([]);
    setIsLockModalOpen(false);
  };

  const handleSendWarningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (targetUser) {
        const targetId = Number(targetUser.rawId || targetUser.id.replace('USR-', ''));
        await axiosClient.post('/users/warn', {
          userId: targetId,
          title: 'Cảnh báo hệ thống',
          content: warningMessage,
        });
        showToast(`Đã gửi cảnh báo đến tài khoản ${targetUser.name}`);
      } else if (selectedIds.length > 0) {
        const rawIds = selectedIds.map((id) => Number(id.replace('USR-', '')));
        await axiosClient.post('/users/warn', {
          userIds: rawIds,
          title: 'Cảnh báo hệ thống',
          content: warningMessage,
        });
        showToast(`Đã gửi cảnh báo đến ${selectedIds.length} người dùng được chọn`);
      } else {
        await axiosClient.post('/users/warn', {
          title: 'Cảnh báo hệ thống',
          content: warningMessage,
        });
        showToast('Đã gửi thông báo cảnh báo đến tất cả người dùng');
      }
    } catch (error) {
      console.error('Lỗi gửi cảnh báo:', error);
      showToast('Có lỗi xảy ra khi gửi cảnh báo');
    } finally {
      setIsWarningModalOpen(false);
      setWarningMessage('');
      setTargetUser(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 space-y-6 font-sans">
      {toastMessage && (
        <div className="fixed top-24 right-8 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-800 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Fixed Page Title & Top Actions Header */}
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Người dùng</h1>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              isWsConnected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <Radio className={`w-3.5 h-3.5 ${isWsConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
              <span>{isWsConnected ? 'Live Sync active' : 'Reconnecting...'}</span>
            </div>
          </div>
          <p className="text-base font-medium text-gray-500 mt-1.5">
            Quản lý tài khoản, trạng thái và thông tin khách hàng (Tự động cập nhật thời gian thực qua WebSocket).
          </p>
        </div>

        <div className="flex items-center gap-3.5">
          <button
            onClick={() => {
              setTargetUser(null);
              setIsWarningModalOpen(true);
            }}
            className="bg-white border border-orange-500/30 text-orange-600 hover:bg-orange-50 px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-orange-500" strokeWidth={2.2} />
            Cảnh báo
          </button>
          <button
            onClick={() => {
              setTargetUser(null);
              setIsLockModalOpen(true);
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5 shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Lock className="w-4 h-4" strokeWidth={2.2} />
            Khóa tài khoản
          </button>
        </div>
      </div>

      {/* Main Container Card: Fixed Filter Bar + Fixed Table Header + Scrollable User List (tbody) + Fixed Footer */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-200/80 shadow-xs w-full overflow-hidden">
        
        {/* Fixed Filter Controls Bar */}
        <div className="flex-none px-7 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/40 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">LỌC THEO:</span>
            
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="bg-white border border-gray-200 hover:border-gray-300 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 flex items-center gap-2.5 shadow-2xs transition-all cursor-pointer"
              >
                <span>
                  {filterStatus === 'ALL' && 'Tất cả trạng thái'}
                  {filterStatus === 'ACTIVE' && 'Đang hoạt động'}
                  {filterStatus === 'LOCKED' && 'Đã khóa'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFilterOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in duration-150">
                  <button
                    onClick={() => {
                      setFilterStatus('ALL');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${filterStatus === 'ALL' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Tất cả trạng thái
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('ACTIVE');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${filterStatus === 'ACTIVE' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Hoạt động
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('LOCKED');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${filterStatus === 'LOCKED' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Đã khóa
                  </button>
                </div>
              )}
            </div>

            <div className="relative ml-2">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm tên, ID, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 w-56 shadow-2xs"
              />
            </div>
          </div>

          <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
            {isLoadingApi && <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />}
            <span>
              Hiển thị <span className="font-semibold text-gray-900">{filteredUsers.length > 0 ? `1–${filteredUsers.length}` : '0'}</span> của <span className="font-semibold text-gray-900">{totalElements.toLocaleString()}</span>
            </span>
          </div>
        </div>

        {/* Scrollable Table Area: Fixed Sticky Column Headers (thead) + Vertical Scrollable Rows (tbody) */}
        <div className="flex-1 overflow-y-auto min-h-0 relative w-full">
          <table className="w-full text-left border-collapse">
            {/* Sticky Fixed Table Header */}
            <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-xs shadow-2xs border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 w-14 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-orange-600 rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Họ và Tên</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Số điện thoại</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày tham gia</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Nhật ký hoạt động</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right pr-8">Thao tác</th>
              </tr>
            </thead>

            {/* Scrollable User Rows List */}
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                    {isLoadingApi ? 'Đang nạp dữ liệu từ máy chủ...' : 'Không tìm thấy người dùng nào trong cơ sở dữ liệu.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userItem, index) => {
                  const isSelected = selectedIds.includes(userItem.id);
                  const isNearBottom = index >= filteredUsers.length - 2;

                  return (
                    <tr
                      key={userItem.id}
                      className={`hover:bg-orange-50/20 transition-colors ${isSelected ? 'bg-orange-50/30' : ''}`}
                    >
                      <td className="py-5 px-6 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(userItem.id)}
                          className="w-4 h-4 accent-orange-600 rounded border-gray-300 cursor-pointer"
                        />
                      </td>

                      <td className="py-5 px-6 text-sm font-medium text-gray-500 font-mono">
                        {userItem.id}
                      </td>

                      <td className="py-5 px-6 text-base font-bold text-gray-900">
                        {userItem.name}
                      </td>

                      <td className="py-5 px-6 text-sm font-medium text-gray-600">
                        {userItem.phone}
                      </td>

                      <td className="py-5 px-6 text-sm font-medium text-gray-500">
                        {userItem.joinDate}
                      </td>

                      <td className="py-5 px-6">
                        <button
                          onClick={() => handleOpenAuditLogsModal(userItem)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 border border-gray-200/80 transition-all cursor-pointer group shadow-2xs"
                          title="Bấm để xem toàn bộ danh sách nhật ký từ mới tới cũ"
                        >
                          <History className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform shrink-0" />
                          {userItem.latestActivity ? (
                            <div className="flex flex-col text-left leading-tight">
                              <span className="font-semibold text-gray-900 group-hover:text-orange-600">
                                {userItem.latestActivity}
                              </span>
                              {userItem.latestActivityAt && (
                                <span className="text-[10px] text-gray-400 font-normal">
                                  {new Date(userItem.latestActivityAt).toLocaleString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 font-normal">Chưa có nhật ký</span>
                          )}
                        </button>
                      </td>

                      <td className="py-5 px-6">
                        {userItem.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Đã khóa
                          </span>
                        )}
                      </td>

                      <td className="py-5 px-6 text-right pr-8 relative">
                        <button
                          onClick={() =>
                            setActiveMenuId(activeMenuId === userItem.id ? null : userItem.id)
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {activeMenuId === userItem.id && (
                          <div
                            className={`absolute right-8 ${
                              isNearBottom ? 'bottom-12' : 'top-12'
                            } w-52 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in duration-150 text-left`}
                          >
                            <button
                              onClick={() => handleOpenDetailModal(userItem)}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                              Xem chi tiết
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                setTargetUser(userItem);
                                setIsWarningModalOpen(true);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 flex items-center gap-2.5 cursor-pointer"
                            >
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                              Gửi cảnh báo
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                setTargetUser(userItem);
                                setIsLockModalOpen(true);
                              }}
                              className={`w-full px-4 py-2.5 text-xs font-semibold flex items-center gap-2.5 cursor-pointer ${
                                userItem.status === 'ACTIVE'
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {userItem.status === 'ACTIVE' ? (
                                <>
                                  <Lock className="w-4 h-4 text-red-500" />
                                  Khóa tài khoản
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4 text-emerald-500" />
                                  Mở khóa tài khoản
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Fixed Footer Pagination */}
        <div className="flex-none px-7 py-4 border-t border-gray-100 flex items-center justify-end gap-2.5 bg-gray-50/40 rounded-b-2xl">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.max(1, Math.min(3, totalPages)) }).map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'border border-gray-200 text-gray-700 hover:bg-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isWarningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5 text-orange-600 font-bold text-lg">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <span>Gửi cảnh báo người dùng</span>
              </div>
              <button
                onClick={() => setIsWarningModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendWarningSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Đối tượng nhận cảnh báo:
                </label>
                <div className="text-sm font-semibold text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                  {targetUser
                    ? `${targetUser.name} (${targetUser.id})`
                    : selectedIds.length > 0
                    ? `${selectedIds.length} người dùng đã chọn`
                    : 'Tất cả người dùng cần cảnh báo'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Nội dung cảnh báo:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Nhập lý do gửi cảnh báo hoặc yêu cầu tuân thủ quy định..."
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWarningModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-xs cursor-pointer"
                >
                  Gửi cảnh báo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5 text-gray-900 font-bold text-lg">
                <Lock className="w-5 h-5 text-orange-600" />
                <span>Xác nhận thao tác tài khoản</span>
              </div>
              <button
                onClick={() => setIsLockModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              {targetUser ? (
                <>
                  Bạn có chắc chắn muốn{' '}
                  <strong className="text-gray-900">
                    {targetUser.status === 'ACTIVE' ? 'khóa' : 'mở khóa'}
                  </strong>{' '}
                  tài khoản của người dùng{' '}
                  <strong className="text-gray-900">{targetUser.name}</strong> ({targetUser.id}) không?
                </>
              ) : selectedIds.length > 0 ? (
                <>
                  Bạn có chắc chắn muốn <strong className="text-gray-900">khóa {selectedIds.length} tài khoản</strong>{' '}
                  người dùng đã chọn không?
                </>
              ) : (
                'Vui lòng chọn người dùng trong danh sách hoặc bấm thao tác trên từng dòng để khóa.'
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLockModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              {targetUser ? (
                <button
                  type="button"
                  onClick={() => handleToggleLockStatus(targetUser)}
                  className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-xs cursor-pointer ${
                    targetUser.status === 'ACTIVE' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {targetUser.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={handleBatchLock}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold shadow-xs cursor-pointer"
                >
                  Xác nhận khóa
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Chi tiết tài khoản người dùng</h3>
                  <p className="text-xs font-medium text-gray-500">Thông tin cá nhân, phân quyền và dữ liệu hệ thống</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                <span className="text-sm font-medium">Đang tải thông tin người dùng từ máy chủ...</span>
              </div>
            ) : userDetailData ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 bg-gradient-to-br from-gray-50 to-orange-50/30 rounded-2xl border border-gray-100">
                  {userDetailData.avatarUrl ? (
                    <img
                      src={userDetailData.avatarUrl}
                      alt={userDetailData.fullName}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center text-2xl font-black shadow-md border-2 border-white">
                      {userDetailData.fullName ? userDetailData.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                      <div>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tight">
                          {userDetailData.fullName || 'Chưa cập nhật tên'}
                        </h4>
                        <span className="text-xs font-mono font-bold text-gray-400 tracking-wider">
                          USR-{userDetailData.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 justify-center sm:justify-end">
                        {(() => {
                          const badge = getRoleBadge(userDetailData.role);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                              <Shield className="w-3.5 h-3.5" />
                              {badge.label} ({userDetailData.role})
                            </span>
                          );
                        })()}

                        {(() => {
                          const badge = getStatusBadge(userDetailData.status);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                              {badge.label} ({userDetailData.status})
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
                      <User className="w-4 h-4 text-orange-500" />
                      <span>Thông tin liên hệ</span>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" /> Số điện thoại:
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                          <span>{userDetailData.phone || 'Chưa có'}</span>
                          {userDetailData.isPhoneVerified ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-200/60">
                              <BadgeCheck className="w-3 h-3 text-emerald-500" /> Đã xác minh
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-200/60">
                              Chưa xác minh
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" /> Email:
                        </span>
                        <span className="font-semibold text-gray-900">{userDetailData.email || 'Chưa cập nhật'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>Thời gian & Đăng nhập</span>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" /> Ngày đăng ký:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {userDetailData.createdAt ? new Date(userDetailData.createdAt).toLocaleString('vi-VN') : 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" /> Đăng nhập cuối:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {userDetailData.lastLoginAt ? new Date(userDetailData.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-3 md:col-span-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
                      <CreditCard className="w-4 h-4 text-orange-500" />
                      <span>Tài chính & Trạng thái nợ</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-gray-500 font-medium">Số dư nợ hiện tại:</span>
                        <span className="text-base font-extrabold text-orange-600">
                          {(userDetailData.debtAmount ?? 0).toLocaleString('vi-VN')} ₫
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-gray-500 font-medium">Khóa do công nợ:</span>
                        {userDetailData.isBlockedByDebt ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200">
                            <XCircle className="w-4 h-4" /> Bị khóa nợ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4" /> Bình thường
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        setTargetUser({
                          id: `USR-${userDetailData.id}`,
                          name: userDetailData.fullName,
                          phone: userDetailData.phone,
                          joinDate: userDetailData.createdAt || '',
                          status: userDetailData.status,
                          rawId: userDetailData.id,
                        });
                        setIsWarningModalOpen(true);
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm font-semibold border border-orange-200/60 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Gửi cảnh báo
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        setTargetUser({
                          id: `USR-${userDetailData.id}`,
                          name: userDetailData.fullName,
                          phone: userDetailData.phone,
                          joinDate: userDetailData.createdAt || '',
                          status: userDetailData.status,
                          rawId: userDetailData.id,
                        });
                        setIsLockModalOpen(true);
                      }}
                      className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        userDetailData.status === 'ACTIVE'
                          ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/60'
                      }`}
                    >
                      {userDetailData.status === 'ACTIVE' ? (
                        <>
                          <Lock className="w-4 h-4 text-red-500" /> Khóa tài khoản
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 text-emerald-500" /> Mở khóa tài khoản
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm">
                Không thể lấy dữ liệu người dùng từ máy chủ.
              </div>
            )}
          </div>
        </div>
      )}

      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Nhật ký hoạt động</h3>
                  <p className="text-xs font-medium text-gray-500">
                    Lịch sử thao tác & sự kiện của tài khoản {auditTargetUser?.name} ({auditTargetUser?.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4">
              {isAuditLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
                  <span className="text-sm font-medium">Đang tải lịch sử hoạt động...</span>
                </div>
              ) : auditLogsList.length === 0 ? (
                <div className="py-14 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
                  <History className="w-10 h-10 text-gray-200" />
                  <span>Chưa có nhật ký hoạt động nào được ghi nhận cho tài khoản này.</span>
                </div>
              ) : (
                <div className="relative border-l-2 border-orange-100 ml-4 space-y-6 py-2">
                  {auditLogsList.map((log) => (
                    <div key={log.id} className="relative pl-6 group">
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-orange-600 border-4 border-white shadow-xs"></div>

                      <div className="bg-gray-50/70 group-hover:bg-orange-50/40 p-4 rounded-2xl border border-gray-100 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-700 tracking-wider font-mono">
                            {log.action}
                          </span>
                          <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : 'N/A'}
                          </span>
                        </div>

                        {log.action === 'WARN_USER' && (
                          <div className="text-xs font-semibold text-gray-800 pt-1">
                            Nội dung cảnh báo: <span className="text-orange-700 italic">"{log.afterValue}"</span>
                          </div>
                        )}

                        {log.action === 'UPDATE_STATUS' && (
                          <div className="text-xs font-semibold text-gray-800 pt-1">
                            Thay đổi trạng thái: <span className="text-gray-500">{log.beforeValue || 'ACTIVE'}</span> &rarr; <span className="text-orange-600">{log.afterValue}</span>
                          </div>
                        )}

                        {log.action !== 'WARN_USER' && log.action !== 'UPDATE_STATUS' && log.afterValue && (
                          <div className="text-xs text-gray-700 pt-1">
                            Chi tiết: {log.afterValue}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 flex-none">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

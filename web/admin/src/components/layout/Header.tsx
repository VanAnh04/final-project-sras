import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  HelpCircle, 
  Store, 
  AlertTriangle, 
  CheckCheck, 
  Clock, 
  ChevronRight, 
  Inbox, 
  ExternalLink 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';

interface AdminNotificationItem {
  id: string;
  rawId?: number;
  type: 'GARAGE' | 'COMPLAINT' | 'SYSTEM';
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  link: string;
  badgeText: string;
}

export default function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'GARAGE' | 'COMPLAINT'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [notifRes, garageRes, complaintRes]: any = await Promise.allSettled([
        axiosClient.get('/notifications/recent'),
        axiosClient.get('/admin/garages', { params: { status: 'PENDING', size: 10 } }),
        axiosClient.get('/complaints/admin', { params: { status: 'OPEN', size: 10 } }),
      ]);

      const items: AdminNotificationItem[] = [];

      // 1. Pending Garage registrations
      if (garageRes.status === 'fulfilled' && garageRes.value?.data?.content) {
        garageRes.value.data.content.forEach((g: any) => {
          items.push({
            id: `garage-${g.id}`,
            type: 'GARAGE',
            title: `Yêu cầu mở Gara mới: ${g.name}`,
            body: `Chủ gara: ${g.ownerName || g.ownerPhone || 'Đối tác'} • ${g.address || 'Hồ sơ đang chờ phê duyệt'}`,
            createdAt: g.createdAt,
            isRead: false,
            link: '/admin/garages?tab=PENDING',
            badgeText: 'Chờ duyệt Gara',
          });
        });
      }

      // 2. Open Complaints
      if (complaintRes.status === 'fulfilled' && complaintRes.value?.data?.content) {
        complaintRes.value.data.content.forEach((c: any) => {
          items.push({
            id: `complaint-${c.id}`,
            type: 'COMPLAINT',
            title: `Khiếu nại #${c.id}: ${c.createdByName || 'Khách hàng'}`,
            body: c.content || 'Yêu cầu xử lý khiếu nại về đơn cứu hộ / dịch vụ',
            createdAt: c.createdAt,
            isRead: false,
            link: '/admin/complaints?status=OPEN',
            badgeText: 'Khiếu nại cần xử lý',
          });
        });
      }

      // 3. User / System notifications
      if (notifRes.status === 'fulfilled' && Array.isArray(notifRes.value?.data)) {
        notifRes.value.data.forEach((n: any) => {
          let link = '/admin-dashboard';
          let type: 'GARAGE' | 'COMPLAINT' | 'SYSTEM' = 'SYSTEM';
          let badgeText = 'Hệ thống';

          if (n.refType === 'GARAGE') {
            link = '/admin/garages?tab=PENDING';
            type = 'GARAGE';
            badgeText = 'Gara đối tác';
          } else if (n.refType === 'COMPLAINT') {
            link = '/admin/complaints';
            type = 'COMPLAINT';
            badgeText = 'Khiếu nại';
          } else if (n.refType === 'WITHDRAWAL') {
            link = '/admin/finance';
            badgeText = 'Rút tiền';
          }

          const isDuplicate = items.some(
            (it) =>
              (type === 'GARAGE' && it.id === `garage-${n.refId}`) ||
              (type === 'COMPLAINT' && it.id === `complaint-${n.refId}`)
          );

          if (!isDuplicate) {
            items.push({
              id: `notif-${n.id}`,
              rawId: n.id,
              type,
              title: n.title,
              body: n.body,
              createdAt: n.createdAt,
              isRead: Boolean(n.isRead),
              link,
              badgeText,
            });
          }
        });
      }

      // Sort by newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(items);
    } catch (err) {
      console.warn('Lỗi tải thông báo admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchAllNotifications]);

  const unreadCount = notifications.filter((i) => !i.isRead).length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'GARAGE') return item.type === 'GARAGE';
    if (activeTab === 'COMPLAINT') return item.type === 'COMPLAINT';
    return true;
  });

  const handleItemClick = async (item: AdminNotificationItem) => {
    if (item.rawId && !item.isRead) {
      try {
        await axiosClient.put(`/notifications/${item.rawId}/read`);
      } catch (e) {
        // ignore
      }
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    setIsNotifOpen(false);
    navigate(item.link);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axiosClient.put('/notifications/read-all');
    } catch (e) {
      // ignore
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return new Date(isoString).toLocaleDateString('vi-VN');
  };

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
      {/* Left Greeting & Date (No black SRAS Admin title, No user search box) */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 font-medium">
          <Clock className="w-4 h-4 text-orange-500" />
          <span>
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Header Right Actions */}
      <div className="flex items-center gap-4">
        <button
          className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          title="Trợ giúp & Hướng dẫn"
        >
          <HelpCircle className="w-5 h-5" strokeWidth={1.8} />
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className={`p-2.5 rounded-full transition-all relative ${
              isNotifOpen
                ? 'bg-orange-50 text-orange-600 ring-2 ring-orange-500/20'
                : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
            }`}
            title="Thông báo hệ thống"
          >
            <Bell className="w-5 h-5" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-3 w-96 sm:w-[430px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Dropdown Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">Thông báo hệ thống</h3>
                  {unreadCount > 0 && (
                    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-bold">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Đã đọc tất cả
                  </button>
                )}
              </div>

              {/* Tabs Filter */}
              <div className="flex border-b border-gray-100 bg-white px-3 pt-2 gap-1 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`pb-2.5 px-3 border-b-2 transition-all ${
                    activeTab === 'ALL'
                      ? 'border-orange-500 text-orange-600 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Tất cả ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('GARAGE')}
                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'GARAGE'
                      ? 'border-orange-500 text-orange-600 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  Đăng ký Gara ({notifications.filter((i) => i.type === 'GARAGE').length})
                </button>
                <button
                  onClick={() => setActiveTab('COMPLAINT')}
                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'COMPLAINT'
                      ? 'border-orange-500 text-orange-600 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Khiếu nại ({notifications.filter((i) => i.type === 'COMPLAINT').length})
                </button>
              </div>

              {/* Notifications List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
                {filteredNotifications.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Chưa có thông báo nào</p>
                    <p className="text-xs text-gray-400 mt-1">Các yêu cầu từ khách hàng & khiếu nại sẽ hiển thị tại đây</p>
                  </div>
                ) : (
                  filteredNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-4 flex gap-3.5 hover:bg-orange-50/40 cursor-pointer transition-colors group relative ${
                        !item.isRead ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      {/* Status indicator dot */}
                      {!item.isRead && (
                        <div className="absolute top-4 right-4 w-2 h-2 bg-orange-500 rounded-full"></div>
                      )}

                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {item.type === 'GARAGE' ? (
                          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                            <Store className="w-4 h-4" />
                          </div>
                        ) : item.type === 'COMPLAINT' ? (
                          <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Bell className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.type === 'GARAGE'
                                ? 'bg-orange-100 text-orange-700'
                                : item.type === 'COMPLAINT'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {item.badgeText}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.body}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0 self-center text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="p-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    setIsNotifOpen(false);
                    navigate('/admin/garages?tab=PENDING');
                  }}
                  className="font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Store className="w-3.5 h-3.5" />
                  Xử lý Gara
                </button>
                <div className="h-3 w-px bg-gray-200"></div>
                <button
                  onClick={() => {
                    setIsNotifOpen(false);
                    navigate('/admin/complaints?status=OPEN');
                  }}
                  className="font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Xử lý Khiếu nại
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 mx-1"></div>

        {/* User profile avatar */}
        <div className="flex items-center">
          <img
            src={
              resolveFileUrl(user?.avatarUrl) ||
              'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop'
            }
            alt="User avatar"
            className="w-9 h-9 rounded-full object-cover border border-gray-200"
          />
        </div>
      </div>
    </header>
  );
}

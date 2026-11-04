import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  HelpCircle, 
  Store, 
  AlertTriangle, 
  Star,
  CheckCheck, 
  Clock, 
  ChevronRight, 
  Inbox,
  Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axiosClient, { resolveFileUrl } from '../../api/axiosClient';

interface AdminNotificationItem {
  id: string;
  rawId?: number;
  type: 'GARAGE' | 'COMPLAINT' | 'RATING';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper quản lý danh sách ID đã đọc lưu ở local storage
  const getStoredReadIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem('sras_admin_read_notif_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  const saveStoredReadIds = (ids: Set<string>) => {
    try {
      localStorage.setItem('sras_admin_read_notif_ids', JSON.stringify(Array.from(ids)));
    } catch {
      // ignore
    }
  };

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
      const readSet = getStoredReadIds();

      const [notifRes, garageRes, complaintRes, ratingRes]: any = await Promise.allSettled([
        axiosClient.get('/notifications/recent'),
        axiosClient.get('/admin/garages', { params: { size: 20 } }),
        axiosClient.get('/complaints/admin', { params: { size: 20 } }),
        axiosClient.get('/ratings/admin', { params: { size: 20 } }),
      ]);

      const items: AdminNotificationItem[] = [];

      // 1. Phê duyệt Gara (Gara đối tác mới & chờ duyệt)
      if (garageRes.status === 'fulfilled' && garageRes.value?.data?.content) {
        garageRes.value.data.content.forEach((g: any) => {
          const itemId = `garage-${g.id}`;
          const isPending = g.status === 'PENDING';
          const isRead = readSet.has(itemId) || !isPending;
          items.push({
            id: itemId,
            type: 'GARAGE',
            title: isPending ? `Yêu cầu mở Gara mới: ${g.name}` : `Gara đối tác: ${g.name} (${g.status === 'APPROVED' ? 'Đã duyệt' : g.status})`,
            body: `Chủ gara: ${g.ownerName || g.ownerPhone || 'Đối tác'} • ${g.address || 'Hồ sơ đối tác'}`,
            createdAt: g.createdAt,
            isRead,
            link: `/admin/garages?tab=${isPending ? 'PENDING' : 'ALL'}`,
            badgeText: isPending ? 'Phê duyệt Gara' : 'Gara đối tác',
          });
        });
      }

      // 2. Khiếu nại từ khách hàng
      if (complaintRes.status === 'fulfilled' && complaintRes.value?.data?.content) {
        complaintRes.value.data.content.forEach((c: any) => {
          const itemId = `complaint-${c.id}`;
          const isOpen = c.status === 'OPEN' || c.status === 'IN_REVIEW';
          const isRead = readSet.has(itemId) || !isOpen;
          items.push({
            id: itemId,
            type: 'COMPLAINT',
            title: `Khiếu nại #${c.id}: ${c.createdByName || 'Khách hàng'}`,
            body: c.content || 'Yêu cầu xử lý khiếu nại về đơn cứu hộ / dịch vụ',
            createdAt: c.createdAt,
            isRead,
            link: `/admin/complaints${isOpen ? '?status=OPEN' : ''}`,
            badgeText: 'Khiếu nại',
          });
        });
      }

      // 3. Đánh giá từ khách hàng
      if (ratingRes.status === 'fulfilled' && ratingRes.value?.data?.content) {
        ratingRes.value.data.content.forEach((r: any) => {
          const itemId = `rating-${r.id}`;
          const isRead = readSet.has(itemId);
          items.push({
            id: itemId,
            type: 'RATING',
            title: `Đánh giá ${r.stars || 5} sao • ${r.raterName || 'Khách hàng'}`,
            badgeText: `Đánh giá ${r.stars || 5}★`,
            body: `"${r.comment || 'Đánh giá dịch vụ cứu hộ'}" • Gara: ${r.garageName || 'Đối tác'}`,
            createdAt: r.createdAt,
            isRead,
            link: '/admin/ratings',
            
          });
        });
      }

      // 4. Thông báo từ hệ thống (CHỈ LẤY ĐĂNG KÝ GARA, KHIẾU NẠI VÀ ĐÁNH GIÁ)
      if (notifRes.status === 'fulfilled' && Array.isArray(notifRes.value?.data)) {
        notifRes.value.data.forEach((n: any) => {
          let link = '';
          let type: 'GARAGE' | 'COMPLAINT' | 'RATING' | null = null;
          let badgeText = '';

          if (n.refType === 'GARAGE') {
            link = '/admin/garages?tab=PENDING';
            type = 'GARAGE';
            badgeText = 'Phê duyệt Gara';
          } else if (n.refType === 'COMPLAINT') {
            link = '/admin/complaints?status=OPEN';
            type = 'COMPLAINT';
            badgeText = 'Khiếu nại';
          } else if (n.refType === 'RATING') {
            link = '/admin/ratings';
            type = 'RATING';
            badgeText = 'Đánh giá';
          }

          if (type && link) {
            const isDuplicate = items.some(
              (it) =>
                (type === 'GARAGE' && it.id === `garage-${n.refId}`) ||
                (type === 'COMPLAINT' && it.id === `complaint-${n.refId}`) ||
                (type === 'RATING' && it.id === `rating-${n.refId}`)
            );

            if (!isDuplicate) {
              const itemId = `notif-${n.id}`;
              items.push({
                id: itemId,
                rawId: n.id,
                type,
                title: n.title,
                body: n.body,
                createdAt: n.createdAt,
                isRead: Boolean(n.isRead) || readSet.has(itemId),
                link,
                badgeText,
              });
            }
          }
        });
      }

      // Sắp xếp mới nhất lên đầu
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

  const handleItemClick = async (item: AdminNotificationItem) => {
    if (item.rawId && !item.isRead) {
      try {
        await axiosClient.put(`/notifications/${item.rawId}/read`);
      } catch (e) {
        // ignore
      }
    }

    const readSet = getStoredReadIds();
    readSet.add(item.id);
    saveStoredReadIds(readSet);

    // Đánh dấu đã đọc nhưng VẪN GIỮ TRONG DANH SÁCH (chuyển sang không in đậm)
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    setIsNotifOpen(false);
    navigate(item.link);
  };

  // Nút "Đánh dấu đã đọc" trực tiếp trên từng thông báo
  const handleMarkItemAsRead = async (e: React.MouseEvent, item: AdminNotificationItem) => {
    e.stopPropagation();

    if (item.rawId && !item.isRead) {
      try {
        await axiosClient.put(`/notifications/${item.rawId}/read`);
      } catch (err) {
        // ignore
      }
    }

    const readSet = getStoredReadIds();
    readSet.add(item.id);
    saveStoredReadIds(readSet);

    // Cập nhật trạng thái thành đã đọc, không làm biến mất
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axiosClient.put('/notifications/read-all');
    } catch (e) {
      // ignore
    }

    const readSet = getStoredReadIds();
    notifications.forEach((n) => readSet.add(n.id));
    saveStoredReadIds(readSet);

    // Cập nhật tất cả thành đã đọc, giữ nguyên danh sách
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
      {/* Left Date Display */}
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
            <div className="absolute right-0 top-full mt-3 w-96 sm:w-[440px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Dropdown Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
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

              {/* Single Category Header: Tất cả (không chia từng loại) */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-orange-600 border-b-2 border-orange-500 pb-1">
                    Tất cả ({notifications.length})
                  </span>
                  <span className="text-[11px] text-gray-400 pb-1 font-medium">
                    (Khiếu nại, đánh giá & phê duyệt Gara)
                  </span>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Chưa có thông báo nào</p>
                    <p className="text-xs text-gray-400 mt-1">Các yêu cầu đăng ký Gara, khiếu nại & đánh giá sẽ hiển thị tại đây</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-4 flex gap-3.5 cursor-pointer transition-colors group relative ${
                        !item.isRead 
                          ? 'bg-orange-50/25 hover:bg-orange-50/50' 
                          : 'bg-white hover:bg-gray-50/80'
                      }`}
                    >
                      {/* Status indicator dot */}
                      {!item.isRead && (
                        <div className="absolute top-4 right-4 w-2 h-2 bg-orange-500 rounded-full"></div>
                      )}

                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {item.type === 'GARAGE' ? (
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100/80 text-blue-600 flex items-center justify-center">
                            <Store className="w-4 h-4" />
                          </div>
                        ) : item.type === 'COMPLAINT' ? (
                          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100/80 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-300 text-orange-600 flex items-center justify-center">
                            <Star className="w-4 h-4 stroke-[2.2] fill-orange-500 text-orange-600" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              item.type === 'GARAGE'
                                ? 'bg-blue-50 text-blue-700 border-blue-200/70'
                                : item.type === 'COMPLAINT'
                                ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                                : 'bg-orange-100 text-orange-800 border-orange-300'
                            }`}
                          >
                            {item.badgeText}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>

                        {/* Title: In đậm khi chưa đọc, không in đậm khi đã đọc */}
                        <h4 className={`text-xs transition-colors line-clamp-1 ${
                          !item.isRead 
                            ? 'font-bold text-gray-900 group-hover:text-orange-600' 
                            : 'font-normal text-gray-600 group-hover:text-gray-900'
                        }`}>
                          {item.title}
                        </h4>

                        <p className={`text-xs line-clamp-2 mt-0.5 leading-relaxed ${
                          !item.isRead ? 'text-gray-600 font-medium' : 'text-gray-400'
                        }`}>
                          {item.body}
                        </p>

                        {/* Bottom action bar inside item */}
                        {!item.isRead && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleMarkItemAsRead(e, item)}
                              className="text-[10.5px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 transition-colors py-0.5 px-1 rounded hover:bg-orange-100/50"
                              title="Đánh dấu thông báo này là đã đọc"
                            >
                              <Check className="w-3 h-3 text-orange-600" />
                              <span>Đánh dấu đã đọc</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0 self-center text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))
                )}
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

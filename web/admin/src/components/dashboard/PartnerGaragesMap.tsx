import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, 
  ChevronRight, 
  Maximize2, 
  X, 
  RefreshCw, 
  Navigation, 
  AlertCircle
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

// Goong Map configuration
const GOONG_MAPTILES_KEY = import.meta.env.VITE_GOONG_MAPTILES_KEY || 'tLGn6mdYdxZ2fDhZnsm8Dbhf7iSW3zPnHU4fStP0';
const DEFAULT_CENTER: [number, number] = [108.2022, 16.0544]; // Đà Nẵng / Miền Trung

export interface DashboardGarageItem {
  id: number;
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isOnline: boolean;
  capability?: string;
  avgRating?: number;
  ratingCount?: number;
  ownerName?: string;
  ownerPhone?: string;
}

export interface ProvinceGroup {
  id: string;
  name: string;
  centerLng: number;
  centerLat: number;
  totalGarages: number;
  onlineGarages: number;
  garages: DashboardGarageItem[];
}

// Phân tích và gán Gara về Tỉnh/Thành phố chuẩn
function detectProvince(garage: DashboardGarageItem): { name: string; defaultLng: number; defaultLat: number } {
  const addr = (garage.address || '').toLowerCase();
  
  if (
    addr.includes('đà nẵng') || addr.includes('da nang') || 
    addr.includes('hải châu') || addr.includes('sơn trà') || 
    addr.includes('ngũ hành sơn') || addr.includes('cẩm lệ') || 
    addr.includes('liên chiểu') || addr.includes('thanh khê') || 
    addr.includes('hòa vang') || addr.includes('hòa cường')
  ) {
    return { name: 'Đà Nẵng', defaultLng: 108.2068, defaultLat: 16.0471 };
  }
  if (
    addr.includes('quảng nam') || addr.includes('quang nam') || 
    addr.includes('hội an') || addr.includes('hoi an') || 
    addr.includes('tam kỳ') || addr.includes('điện bàn') || 
    addr.includes('duy xuyên') || addr.includes('minh an') ||
    addr.includes('cẩm châu') || addr.includes('cẩm an') || addr.includes('cẩm thanh')
  ) {
    return { name: 'Quảng Nam', defaultLng: 108.3300, defaultLat: 15.8800 };
  }
  if (
    addr.includes('hồ chí minh') || addr.includes('tp.hcm') || addr.includes('tphcm') || 
    addr.includes('sài gòn') || addr.includes('sai gon') || addr.includes('thủ đức') || 
    addr.includes('bình thạnh') || addr.includes('gò vấp') || addr.includes('tân bình') ||
    addr.includes('tân phú') || addr.includes('phú nhuận') || addr.includes('quận ')
  ) {
    return { name: 'TP. Hồ Chí Minh', defaultLng: 106.6601, defaultLat: 10.7626 };
  }
  if (
    addr.includes('hà nội') || addr.includes('ha noi') || 
    addr.includes('ba đình') || addr.includes('hoàn kiếm') || 
    addr.includes('cầu giấy') || addr.includes('đống đa') || 
    addr.includes('hai bà trưng') || addr.includes('thanh xuân')
  ) {
    return { name: 'Hà Nội', defaultLng: 105.8342, defaultLat: 21.0278 };
  }
  if (addr.includes('huế') || addr.includes('hue') || addr.includes('thừa thiên')) {
    return { name: 'Thừa Thiên Huế', defaultLng: 107.5909, defaultLat: 16.4637 };
  }
  if (addr.includes('khánh hòa') || addr.includes('khanh hoa') || addr.includes('nha trang')) {
    return { name: 'Khánh Hòa', defaultLng: 109.1967, defaultLat: 12.2388 };
  }
  if (addr.includes('bình dương') || addr.includes('binh duong') || addr.includes('thủ dầu một')) {
    return { name: 'Bình Dương', defaultLng: 106.6667, defaultLat: 11.1667 };
  }
  if (addr.includes('đồng nai') || addr.includes('dong nai') || addr.includes('biên hòa')) {
    return { name: 'Đồng Nai', defaultLng: 106.8333, defaultLat: 10.9574 };
  }
  if (addr.includes('cần thơ') || addr.includes('can tho')) {
    return { name: 'Cần Thơ', defaultLng: 105.7844, defaultLat: 10.0452 };
  }
  if (addr.includes('hải phòng') || addr.includes('hai phong')) {
    return { name: 'Hải Phòng', defaultLng: 106.6881, defaultLat: 20.8449 };
  }
  if (addr.includes('lâm đồng') || addr.includes('lam dong') || addr.includes('đà lạt')) {
    return { name: 'Lâm Đồng', defaultLng: 108.4583, defaultLat: 11.9404 };
  }
  
  // Phỏng đoán toạ độ GPS nếu địa chỉ không chứa tên tỉnh
  const lat = garage.lat;
  const lng = garage.lng;
  if (lat >= 15.9 && lat <= 16.3 && lng >= 108.0 && lng <= 108.5) {
    return { name: 'Đà Nẵng', defaultLng: 108.2068, defaultLat: 16.0471 };
  }
  if (lat >= 15.3 && lat < 15.9 && lng >= 108.1 && lng <= 108.6) {
    return { name: 'Quảng Nam', defaultLng: 108.3300, defaultLat: 15.8800 };
  }
  if (lat >= 10.2 && lat <= 11.2 && lng >= 106.3 && lng <= 107.2) {
    return { name: 'TP. Hồ Chí Minh', defaultLng: 106.6601, defaultLat: 10.7626 };
  }
  if (lat >= 20.4 && lat <= 21.6 && lng >= 105.2 && lng <= 106.4) {
    return { name: 'Hà Nội', defaultLng: 105.8342, defaultLat: 21.0278 };
  }

  // Fallback mặc định theo toạ độ gara
  return { name: 'Khu vực khác', defaultLng: lng, defaultLat: lat };
}

export default function PartnerGaragesMap() {
  const navigate = useNavigate();

  // Inline preview map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activePopupRef = useRef<any>(null);

  // Modal map refs
  const modalMapContainerRef = useRef<HTMLDivElement>(null);
  const modalMapInstanceRef = useRef<any>(null);
  const modalMarkersRef = useRef<any[]>([]);
  const modalPopupRef = useRef<any>(null);

  const [garages, setGarages] = useState<DashboardGarageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ONLINE'>('ALL');
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // 1. Tải danh sách Gara đã đăng ký từ backend
  const fetchGarages = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await axiosClient.get('/admin/garages', { params: { size: 100 } });
      const rawList = res?.data?.content || [];
      
      const validGarages: DashboardGarageItem[] = [];
      rawList.forEach((g: any) => {
        let lat = Number(g.lat);
        let lng = Number(g.lng);

        if (isNaN(lat) || isNaN(lng)) return;

        // Tự động đảo lại nếu DB lưu nhầm vị trí lat/lng
        if (lat >= 102 && lat <= 110 && lng >= 8 && lng <= 24) {
          const temp = lat;
          lat = lng;
          lng = temp;
        }

        if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
          validGarages.push({
            ...g,
            lat,
            lng,
          });
        }
      });

      setGarages(validGarages);
    } catch (err: any) {
      console.warn('Lỗi tải danh sách gara cho bản đồ:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  // Garages theo bộ lọc
  const displayedGarages = useMemo(() => {
    if (filterMode === 'ONLINE') {
      return garages.filter(g => g.isOnline === true);
    }
    return garages;
  }, [garages, filterMode]);

  const onlineCount = useMemo(() => {
    return garages.filter(g => g.isOnline === true).length;
  }, [garages]);

  // Gom nhóm Gara theo tỉnh/thành phố cho bản đồ thu nhỏ trên Dashboard
  const provinceGroups = useMemo<ProvinceGroup[]>(() => {
    const map = new Map<string, ProvinceGroup>();

    displayedGarages.forEach((garage) => {
      const { name, defaultLng, defaultLat } = detectProvince(garage);
      if (!map.has(name)) {
        map.set(name, {
          id: name,
          name,
          centerLng: defaultLng,
          centerLat: defaultLat,
          totalGarages: 0,
          onlineGarages: 0,
          garages: [],
        });
      }
      const group = map.get(name)!;
      group.totalGarages += 1;
      if (garage.isOnline) {
        group.onlineGarages += 1;
      }
      group.garages.push(garage);
    });

    return Array.from(map.values());
  }, [displayedGarages]);

  // Helper tạo DOM Marker ghim chính xác toạ độ
  const createMarkerElement = useCallback((garage: DashboardGarageItem) => {
    const isOnline = garage.isOnline === true;
    const isPending = garage.status === 'PENDING';
    const shortName = garage.name.length > 20 ? garage.name.substring(0, 19) + '…' : garage.name;
    const rating = garage.avgRating ? Number(garage.avgRating).toFixed(1) : null;

    const el = document.createElement('div');
    el.className = 'garage-pin-marker';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.cursor = 'pointer';
    el.style.userSelect = 'none';
    el.style.lineHeight = 'normal';
    el.style.zIndex = isOnline ? '30' : '10';

    el.innerHTML = `
      <div style="
        background: ${isOnline ? '#fffaf5' : '#ffffff'};
        border: 1.5px solid ${isOnline ? '#ea580c' : isPending ? '#f59e0b' : '#cbd5e1'};
        border-radius: 9999px;
        padding: 4px 10px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, ${isOnline ? '0.18' : '0.1'});
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${isOnline ? '#10b981' : isPending ? '#f59e0b' : '#94a3b8'};
          box-shadow: ${isOnline ? '0 0 8px #10b981' : 'none'};
          flex-shrink: 0;
        "></span>
        <span style="
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          font-family: inherit;
        ">${shortName}</span>
        ${
          rating ? `
            <span style="
              font-size: 10px;
              font-weight: 700;
              color: #ea580c;
              background: #fff7ed;
              padding: 1px 4px;
              border-radius: 4px;
              margin-left: 2px;
            ">★ ${rating}</span>
          ` : ''
        }
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid ${isOnline ? '#ea580c' : isPending ? '#f59e0b' : '#cbd5e1'};
        margin-top: -1px;
      "></div>
    `;

    return el;
  }, []);

  // Helper tạo nội dung Popup chi tiết Gara
  const createPopupContent = useCallback((garage: DashboardGarageItem) => {
    const isOnline = garage.isOnline === true;
    const isPending = garage.status === 'PENDING';
    const rating = garage.avgRating ? Number(garage.avgRating).toFixed(1) : null;

    const statusLabel = isOnline 
      ? '<span style="color:#10b981; font-weight:700;">🟢 Đang Online</span>' 
      : '<span style="color:#64748b; font-weight:600;">⚪ Đang Nghỉ</span>';
    
    const reviewBadge = isPending
      ? '<span style="background:#fef3c7; color:#b45309; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700;">Chờ duyệt</span>'
      : '<span style="background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700;">Đã xác thực</span>';

    return `
      <div style="padding: 12px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 210px; max-width: 270px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.3;">${garage.name}</h4>
          ${reviewBadge}
        </div>
        
        <div style="font-size: 11px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
          ${statusLabel}
          ${rating ? `<span style="color:#f59e0b; font-weight:700;">★ ${rating} (${garage.ratingCount || 0})</span>` : ''}
        </div>

        <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0; line-height: 1.4;">
          📍 ${garage.address || 'Chưa cập nhật địa chỉ'}
        </p>

        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
          📞 <strong>${garage.phone || garage.ownerPhone || 'Chưa có SĐT'}</strong>
          ${garage.ownerName ? ` • ${garage.ownerName}` : ''}
        </div>

        <button 
          id="btn-manage-garage-${garage.id}" 
          style="
            width: 100%;
            background: #ea580c;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 6px 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            box-shadow: 0 2px 6px rgba(234, 88, 12, 0.3);
          "
        >
          Xem chi tiết đối tác →
        </button>
      </div>
    `;
  }, []);

  // Helper tạo Marker hiển thị Tỉnh/Thành phố (dành riêng cho bản đồ thu nhỏ trên Dashboard)
  const createProvinceClusterMarkerElement = useCallback((group: ProvinceGroup) => {
    const el = document.createElement('div');
    el.className = 'province-cluster-marker';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.cursor = 'pointer';
    el.style.userSelect = 'none';
    el.style.lineHeight = 'normal';
    el.style.zIndex = '25';

    el.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <!-- Vòng tỏa nhiệt bao quanh tỉnh/thành phố -->
        <div style="
          position: absolute;
          width: 58px;
          height: 58px;
          border-radius: 9999px;
          background: rgba(234, 88, 12, 0.16);
          border: 1.5px dashed rgba(234, 88, 12, 0.45);
          pointer-events: none;
        "></div>

        <!-- Pill chính: Tên Tỉnh + Số Gara -->
        <div style="
          position: relative;
          background: #ffffff;
          border: 2px solid #ea580c;
          border-radius: 9999px;
          padding: 5px 12px;
          box-shadow: 0 4px 16px rgba(234, 88, 12, 0.25);
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          z-index: 10;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <span style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${group.onlineGarages > 0 ? '#10b981' : '#94a3b8'};
            box-shadow: ${group.onlineGarages > 0 ? '0 0 8px #10b981' : 'none'};
            flex-shrink: 0;
          "></span>
          <span style="
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
            font-family: inherit;
          ">${group.name}</span>
          <span style="
            font-size: 11px;
            font-weight: 800;
            color: #ffffff;
            background: #ea580c;
            padding: 2px 7px;
            border-radius: 9999px;
            margin-left: 2px;
          ">${group.totalGarages} gara</span>
        </div>
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 7px solid #ea580c;
        margin-top: -1px;
        z-index: 10;
      "></div>
    `;

    return el;
  }, []);

  // Helper tạo Popup chi tiết khi bấm vào cụm Tỉnh/Thành phố ở bản đồ thu nhỏ
  const createProvinceClusterPopupContent = useCallback((group: ProvinceGroup) => {
    const listHtml = group.garages
      .slice(0, 4)
      .map(
        g => `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; padding: 4px 0; border-bottom: 1px dashed #f1f5f9;">
          <span style="font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">${g.name}</span>
          <span style="font-size: 10px; font-weight: 700; color: ${g.isOnline ? '#10b981' : '#64748b'}; flex-shrink: 0;">
            ${g.isOnline ? '🟢 Online' : '⚪ Nghỉ'}
          </span>
        </div>
      `
      )
      .join('');

    const moreText = group.garages.length > 4 
      ? `<div style="font-size: 10px; color: #64748b; margin-top: 5px; text-align: center;">+ ${group.garages.length - 4} đối tác khác tại khu vực này</div>`
      : '';

    return `
      <div style="padding: 12px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 230px; max-width: 280px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">📍</span>
            <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0;">Khu vực ${group.name}</h4>
          </div>
          <span style="background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 800;">
            ${group.totalGarages} Gara
          </span>
        </div>

        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
          <span>🟢 <strong>${group.onlineGarages}</strong> online</span>
          <span>⚪ <strong>${group.totalGarages - group.onlineGarages}</strong> đang nghỉ</span>
        </div>

        <div style="margin-bottom: 10px; background: #f8fafc; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
          ${listHtml}
          ${moreText}
        </div>

        <button 
          id="btn-expand-from-cluster-${group.id}" 
          style="
            width: 100%;
            background: #ea580c;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 7px 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            box-shadow: 0 2px 6px rgba(234, 88, 12, 0.3);
          "
        >
          Phóng to xem vị trí từng gara ↗
        </button>
      </div>
    `;
  }, []);

  // Fit bounds helper đồng bộ cho cả 2 bản đồ (luôn resize trước khi fitBounds)
  const fitBoundsForMap = useCallback((map: any, items: DashboardGarageItem[], topPadding = 75) => {
    const goongjs = (window as any).goongjs;
    if (!goongjs || !map || items.length === 0) return;

    // Luôn resize map trước khi tính toán viewport để tránh lệch toạ độ
    map.resize();

    if (items.length === 1) {
      map.flyTo({
        center: [items[0].lng, items[0].lat],
        zoom: 14.5,
        essential: true,
      });
      return;
    }

    const bounds = new goongjs.LngLatBounds();
    items.forEach(g => {
      bounds.extend([g.lng, g.lat]);
    });

    map.fitBounds(bounds, {
      padding: { top: topPadding, bottom: 40, left: 40, right: 40 },
      maxZoom: 15,
      duration: 500,
    });
  }, []);

  // 2. Khởi tạo Inline Goong Map trên Dashboard
  useEffect(() => {
    let checkInterval: any = null;

    const initMap = () => {
      const goongjs = (window as any).goongjs;
      if (!goongjs || !mapContainerRef.current || mapInstanceRef.current) return;

      try {
        goongjs.accessToken = GOONG_MAPTILES_KEY;

        const map = new goongjs.Map({
          container: mapContainerRef.current,
          style: 'https://tiles.goong.io/assets/goong_map_web.json',
          center: DEFAULT_CENTER,
          zoom: 12.5,
          minZoom: 5,
          maxZoom: 18,
          attributionControl: false,
        });

        map.addControl(new goongjs.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

        map.on('load', () => {
          mapInstanceRef.current = map;
          setIsMapReady(true);
          
          // Đảm bảo canvas map khớp 100% với kích thước thật của container
          map.resize();
          setTimeout(() => map.resize(), 100);
          setTimeout(() => map.resize(), 300);
          setTimeout(() => map.resize(), 600);
          setTimeout(() => map.resize(), 1200);
        });

        map.on('error', (e: any) => {
          console.warn('Goong Map error:', e);
        });
      } catch (err: any) {
        console.error('Lỗi khởi tạo Goong Map:', err);
        setMapError('Không thể khởi tạo bản đồ Goong Map: ' + (err?.message || 'Lỗi không xác định'));
      }
    };

    if ((window as any).goongjs) {
      initMap();
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).goongjs) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Tự động điều chỉnh kích thước Canvas bằng ResizeObserver tránh lệch toạ độ
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // 3. Render Marker trên Inline Map (Gom nhóm theo Tỉnh/Thành phố ở chế độ thu nhỏ)
  useEffect(() => {
    const goongjs = (window as any).goongjs;
    const map = mapInstanceRef.current;
    if (!goongjs || !map || !isMapReady) return;

    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Resize map trước khi render marker để tính toán đúng pixel
    map.resize();

    provinceGroups.forEach(group => {
      const el = createProvinceClusterMarkerElement(group);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activePopupRef.current) activePopupRef.current.remove();

        const popup = new goongjs.Popup({ offset: 25, closeButton: true, closeOnClick: false })
          .setLngLat([group.centerLng, group.centerLat])
          .setHTML(createProvinceClusterPopupContent(group))
          .addTo(map);

        activePopupRef.current = popup;

        setTimeout(() => {
          const btn = document.getElementById(`btn-expand-from-cluster-${group.id}`);
          if (btn) {
            btn.onclick = () => {
              if (activePopupRef.current) activePopupRef.current.remove();
              setIsExpanded(true);
            };
          }
        }, 50);

        map.easeTo({
          center: [group.centerLng, group.centerLat],
          zoom: Math.max(map.getZoom(), 11.2),
          duration: 400,
        });
      });

      const marker = new goongjs.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([group.centerLng, group.centerLat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (provinceGroups.length > 0) {
      setTimeout(() => {
        map.resize();
        if (provinceGroups.length === 1) {
          map.flyTo({
            center: [provinceGroups[0].centerLng, provinceGroups[0].centerLat],
            zoom: 11.2,
            essential: true,
          });
        } else {
          const bounds = new goongjs.LngLatBounds();
          provinceGroups.forEach(p => {
            bounds.extend([p.centerLng, p.centerLat]);
          });
          map.fitBounds(bounds, {
            padding: { top: 75, bottom: 40, left: 60, right: 60 },
            maxZoom: 12,
            duration: 500,
          });
        }
      }, 150);
      setTimeout(() => {
        map.resize();
      }, 400);
    }
  }, [provinceGroups, isMapReady, createProvinceClusterMarkerElement, createProvinceClusterPopupContent]);

  // 4. Quản lý Modal Popup Phóng To (Độc lập, chuẩn kích thước)
  useEffect(() => {
    const goongjs = (window as any).goongjs;
    if (!isExpanded || !goongjs) return;

    let modalMap: any = null;
    let ro: ResizeObserver | null = null;
    const timer = setTimeout(() => {
      if (!modalMapContainerRef.current) return;

      try {
        goongjs.accessToken = GOONG_MAPTILES_KEY;

        modalMap = new goongjs.Map({
          container: modalMapContainerRef.current,
          style: 'https://tiles.goong.io/assets/goong_map_web.json',
          center: DEFAULT_CENTER,
          zoom: 12.5,
          minZoom: 5,
          maxZoom: 18,
          attributionControl: false,
        });

        modalMap.addControl(new goongjs.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

        modalMap.on('load', () => {
          modalMapInstanceRef.current = modalMap;
          modalMap.resize();
          setTimeout(() => modalMap && modalMap.resize(), 100);
          setTimeout(() => modalMap && modalMap.resize(), 300);
          setTimeout(() => modalMap && modalMap.resize(), 600);

          ro = new ResizeObserver(() => {
            if (modalMapInstanceRef.current) {
              modalMapInstanceRef.current.resize();
            }
          });
          if (modalMapContainerRef.current) {
            ro.observe(modalMapContainerRef.current);
          }

          // Render markers trên modal
          modalMarkersRef.current.forEach(m => m.remove());
          modalMarkersRef.current = [];

          displayedGarages.forEach(garage => {
            const el = createMarkerElement(garage);

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              if (modalPopupRef.current) modalPopupRef.current.remove();

              const popup = new goongjs.Popup({ offset: 25, closeButton: true, closeOnClick: false })
                .setLngLat([garage.lng, garage.lat])
                .setHTML(createPopupContent(garage))
                .addTo(modalMap);

              modalPopupRef.current = popup;

              setTimeout(() => {
                const btn = document.getElementById(`btn-manage-garage-${garage.id}`);
                if (btn) {
                  btn.onclick = () => {
                    navigate(`/admin/garages?tab=ALL&search=${encodeURIComponent(garage.name)}`);
                  };
                }
              }, 50);

              modalMap.easeTo({
                center: [garage.lng, garage.lat],
                zoom: Math.max(modalMap.getZoom(), 13.5),
                duration: 400,
              });
            });

            const marker = new goongjs.Marker({ element: el, anchor: 'bottom' })
              .setLngLat([garage.lng, garage.lat])
              .addTo(modalMap);

            modalMarkersRef.current.push(marker);
          });

          // Căn giữa toàn bộ đối tác trên màn hình lớn
          fitBoundsForMap(modalMap, displayedGarages, 80);
          setTimeout(() => {
            modalMap && modalMap.resize();
          }, 350);
        });
      } catch (e) {
        console.error('Lỗi khởi tạo modal map:', e);
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      if (modalPopupRef.current) {
        modalPopupRef.current.remove();
        modalPopupRef.current = null;
      }
      modalMarkersRef.current.forEach(m => m.remove());
      modalMarkersRef.current = [];
      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.remove();
        modalMapInstanceRef.current = null;
      }
    };
  }, [isExpanded, displayedGarages, fitBoundsForMap, createMarkerElement, createPopupContent, navigate]);

  return (
    <>
      {/* ── Khung Bản đồ Dashboard (Inline Preview: Cố định h-[400px], phủ 100% diện tích) ── */}
      <div className="h-[400px] rounded-2xl relative bg-white shadow-sm border border-gray-100 overflow-hidden">
        {/* Map Canvas Inline - Đặt absolute inset-0 để luôn chiếm đúng 100% width/height */}
        <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

        {/* Top Header Bar nổi lên trên map */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none gap-2">
          {/* Title & Stats */}
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-gray-100/90 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-gray-900">Bản đồ Đối tác Gara</h4>
              <p className="text-[11px] text-gray-500 font-medium">
                <strong className="text-green-600">{onlineCount}</strong> online •{' '}
                <strong className="text-gray-700">{garages.length}</strong> đối tác •{' '}
                <strong className="text-orange-600">{provinceGroups.length}</strong> khu vực
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            {/* Filter Pill */}
            <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-gray-100/90 flex items-center text-xs">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  filterMode === 'ALL' 
                    ? 'bg-orange-500 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Tất cả ({garages.length})
              </button>
              <button
                onClick={() => setFilterMode('ONLINE')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                  filterMode === 'ONLINE' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${filterMode === 'ONLINE' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                Online ({onlineCount})
              </button>
            </div>

            {/* Fit Bounds */}
            <button
              onClick={() => {
                if (!mapInstanceRef.current || provinceGroups.length === 0) return;
                const map = mapInstanceRef.current;
                map.resize();
                const goongjs = (window as any).goongjs;
                if (!goongjs) return;
                if (provinceGroups.length === 1) {
                  map.flyTo({
                    center: [provinceGroups[0].centerLng, provinceGroups[0].centerLat],
                    zoom: 11.2,
                    essential: true,
                  });
                } else {
                  const bounds = new goongjs.LngLatBounds();
                  provinceGroups.forEach(p => bounds.extend([p.centerLng, p.centerLat]));
                  map.fitBounds(bounds, {
                    padding: { top: 75, bottom: 40, left: 60, right: 60 },
                    maxZoom: 12,
                    duration: 500,
                  });
                }
              }}
              title="Bao quát toàn bộ khu vực"
              className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-gray-100 flex items-center justify-center text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>

            {/* Refresh */}
            <button
              onClick={fetchGarages}
              disabled={loading}
              title="Tải lại danh sách gara"
              className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-gray-100 flex items-center justify-center text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            </button>

            {/* Nút phóng to mở Popup bự */}
            <button
              onClick={() => setIsExpanded(true)}
              title="Phóng to bản đồ bự"
              className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-gray-100 flex items-center justify-center text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all active:scale-95"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && !isMapReady && (
          <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
            <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
            <p className="text-xs font-semibold text-gray-600">Đang tải bản đồ đối tác...</p>
          </div>
        )}

        {/* Map error notice */}
        {mapError && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-4 text-center z-10">
            <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
            <p className="text-xs font-bold text-gray-800">{mapError}</p>
          </div>
        )}
      </div>

      {/* ── MODAL POPUP PHÓNG TO BỰ (Full viewport Modal) ── */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsExpanded(false)}
        >
          <div 
            className="bg-white w-full max-w-6xl h-[88vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-white border-b border-gray-100 flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Bản đồ Đối tác Gara Hệ thống</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    <strong className="text-green-600">{onlineCount}</strong> gara online •{' '}
                    <strong className="text-gray-700">{garages.length}</strong> đối tác toàn hệ thống
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-2">
                {/* Filter Pill */}
                <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs">
                  <button
                    onClick={() => setFilterMode('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                      filterMode === 'ALL' 
                        ? 'bg-orange-500 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Tất cả ({garages.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('ONLINE')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                      filterMode === 'ONLINE' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${filterMode === 'ONLINE' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                    Online ({onlineCount})
                  </button>
                </div>

                {/* Fit Bounds */}
                <button
                  onClick={() => modalMapInstanceRef.current && fitBoundsForMap(modalMapInstanceRef.current, displayedGarages, 80)}
                  title="Bao quát toàn bộ các trạm"
                  className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-orange-50 hover:text-orange-600 text-gray-600 flex items-center justify-center border border-gray-200 transition-all"
                >
                  <Navigation className="w-4 h-4" />
                </button>

                {/* Quản lý đối tác Gara */}
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    navigate('/admin/garages');
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>Quản lý đối tác Gara</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Nút X Đóng Modal */}
                <button
                  onClick={() => setIsExpanded(false)}
                  title="Đóng bản đồ phóng to"
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold transition-all ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Map Canvas (Chiếm trọn 100% không gian) */}
            <div className="relative w-full flex-1 min-h-0 bg-slate-100 overflow-hidden">
              <div ref={modalMapContainerRef} className="absolute inset-0 w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

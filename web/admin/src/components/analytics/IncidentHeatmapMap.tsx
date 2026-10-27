import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPin, 
  Layers, 
  Maximize2, 
  Car, 
  Bike, 
  Clock, 
  Info,
  ShieldAlert,
  Flame,
  Navigation
} from 'lucide-react';
import type { IncidentMapPoint } from '../../types/analytics';

interface Props {
  mapPoints: IncidentMapPoint[];
}

type SeverityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

const GOONG_MAPTILES_KEY = import.meta.env.VITE_GOONG_MAPTILES_KEY || 'tLGn6mdYdxZ2fDhZnsm8Dbhf7iSW3zPnHU4fStP0';

export const IncidentHeatmapMap = ({ mapPoints }: Props) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [selectedPoint, setSelectedPoint] = useState<IncidentMapPoint | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Lọc toạ độ chuẩn (ưu tiên toạ độ lãnh thổ Việt Nam)
  const validPoints = useMemo(() => {
    return mapPoints.filter(p => {
      if (!p.lat || !p.lng) return false;
      return p.lat >= 8 && p.lat <= 24 && p.lng >= 102 && p.lng <= 110;
    });
  }, [mapPoints]);

  // Đếm theo mức độ
  const highCount = validPoints.filter(p => p.severity === 'HIGH').length;
  const mediumCount = validPoints.filter(p => p.severity === 'MEDIUM').length;
  const lowCount = validPoints.filter(p => p.severity === 'LOW').length;

  const filteredPoints = useMemo(() => {
    return validPoints.filter(p => {
      if (severityFilter === 'ALL') return true;
      return p.severity === severityFilter;
    });
  }, [validPoints, severityFilter]);

  // Thống kê theo khu vực quận/huyện
  const regionalStats = useMemo(() => {
    const map = new Map<string, { high: number; medium: number; low: number; total: number; lat: number; lng: number }>();
    validPoints.forEach(p => {
      let region = 'Đà Nẵng';
      const addr = p.address || '';
      if (addr.includes('Ngũ Hành Sơn') || addr.includes('FPT')) region = 'Ngũ Hành Sơn';
      else if (addr.includes('Hải Châu')) region = 'Hải Châu';
      else if (addr.includes('Cẩm Lệ') || addr.includes('Hòa Xuân')) region = 'Cẩm Lệ';
      else if (addr.includes('Sơn Trà')) region = 'Sơn Trà';
      else if (addr.includes('Liên Chiểu')) region = 'Liên Chiểu';
      else if (addr.includes('Điện Bàn') || addr.includes('Điện Ngọc')) region = 'Điện Bàn';

      const curr = map.get(region) || { high: 0, medium: 0, low: 0, total: 0, lat: p.lat, lng: p.lng };
      curr.total++;
      if (p.severity === 'HIGH') curr.high++;
      else if (p.severity === 'MEDIUM') curr.medium++;
      else curr.low++;
      map.set(region, curr);
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [validPoints]);

  // Khởi tạo Goong Map
  useEffect(() => {
    let checkInterval: any = null;

    const startInit = () => {
      const goongjs = (window as any).goongjs;
      if (!goongjs || !mapContainerRef.current || mapInstanceRef.current) return;

      try {
        goongjs.accessToken = GOONG_MAPTILES_KEY;

        // Tâm mặc định: Khu vực trung tâm Đà Nẵng
        const defaultCenter: [number, number] = [108.2350, 16.0200];

        const map = new goongjs.Map({
          container: mapContainerRef.current,
          style: 'https://tiles.goong.io/assets/goong_map_web.json',
          center: defaultCenter,
          zoom: 12.5,
          minZoom: 10,
          maxZoom: 18,
          attributionControl: false,
        });

        map.addControl(new goongjs.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

        map.on('load', () => {
          mapInstanceRef.current = map;
          setIsMapReady(true);
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.resize();
            }
          }, 250);
        });

        map.on('error', (e: any) => {
          console.warn('Goong Map error:', e);
        });
      } catch (err: any) {
        console.error('Lỗi khởi tạo Goong Map:', err);
        setMapError('Lỗi khởi tạo Goong Map: ' + (err?.message || 'Không xác định'));
      }
    };

    if ((window as any).goongjs) {
      startInit();
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).goongjs) {
          clearInterval(checkInterval);
          startInit();
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

  // Vẽ các Marker và Vùng nhiệt Mức độ Nghiêm trọng theo Khu vực
  useEffect(() => {
    const goongjs = (window as any).goongjs;
    const map = mapInstanceRef.current;
    if (!goongjs || !map || !isMapReady) return;

    // Xóa marker cũ
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = new goongjs.LngLatBounds();
    let validCount = 0;

    filteredPoints.forEach(point => {
      if (!point.lat || !point.lng) return;

      // Xác định màu sắc theo mức độ
      let pinColor = '#10b981'; // Xanh lá
      let haloColor = 'rgba(16, 185, 129, 0.22)';
      let borderColor = 'rgba(16, 185, 129, 0.6)';
      let haloSize = 70; // đường kính vùng khu vực (px)

      if (point.severity === 'HIGH') {
        pinColor = '#ef4444'; // Đỏ
        haloColor = 'rgba(239, 68, 68, 0.28)';
        borderColor = 'rgba(239, 68, 68, 0.75)';
        haloSize = 100;
      } else if (point.severity === 'MEDIUM') {
        pinColor = '#f97316'; // Cam
        haloColor = 'rgba(249, 115, 22, 0.24)';
        borderColor = 'rgba(249, 115, 22, 0.65)';
        haloSize = 85;
      }

      // Tạo DOM Marker kết hợp: VÙNG NHIỆT KHU VỰC + PIN CỨU HỘ
      const el = document.createElement('div');
      el.style.width = `${haloSize}px`;
      el.style.height = `${haloSize}px`;
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.style.position = 'relative';

      el.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
          ${showZones ? `
            <!-- Vùng tỏa nhiệt phát quang theo khu vực -->
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background-color: ${haloColor}; border: 1.5px dashed ${borderColor}; pointer-events: none;"></div>
            ${point.severity === 'HIGH' ? `
              <div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background-color: ${haloColor}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
            ` : ''}
          ` : ''}
          
          <!-- Pin cắm trung tâm tâm điểm sự cố -->
          <div style="position: relative; width: 30px; height: 30px; border-radius: 9999px; background-color: ${pinColor}; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; z-index: 10;">
            <span style="font-size: 13px; font-weight: 900; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">!</span>
          </div>
        </div>
      `;

      // Popup thông tin chi tiết
      const popup = new goongjs.Popup({ offset: [0, -18], closeButton: false })
        .setHTML(`
          <div style="padding: 8px 12px; font-family: sans-serif; font-size: 12px; line-height: 1.4; border-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background-color: ${pinColor};"></span>
              <strong style="color: #111827; font-size: 13px;">#${point.code}</strong>
            </div>
            <div style="color: ${pinColor}; font-weight: 700; margin-top: 3px;">${point.issueName} (${point.severityLabel})</div>
            <div style="color: #6b7280; font-size: 11px; margin-top: 3px; max-width: 210px; line-height: 1.3;">
              ${point.address}
            </div>
          </div>
        `);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPoint(point);
      });

      // Gắn marker vào bản đồ (căn tâm)
      const marker = new goongjs.Marker(el)
        .setLngLat([point.lng, point.lat])
        .setPopup(popup)
        .addTo(map);

      bounds.extend([point.lng, point.lat]);
      validCount++;
      markersRef.current.push(marker);
    });

    // Auto fit bounds với minZoom an toàn (không bao giờ zoom out ra khỏi Đà Nẵng)
    if (validCount > 0 && mapInstanceRef.current) {
      try {
        map.fitBounds(bounds, { 
          padding: 70, 
          maxZoom: 15,
          duration: 500 
        });
      } catch (err) {
        console.warn('fitBounds error:', err);
      }
    }
  }, [filteredPoints, isMapReady, showZones]);

  // Căn giữa toàn bộ điểm cứu hộ
  const fitAllBounds = () => {
    const goongjs = (window as any).goongjs;
    const map = mapInstanceRef.current;
    if (!goongjs || !map || markersRef.current.length === 0) return;

    const bounds = new goongjs.LngLatBounds();
    filteredPoints.forEach(p => {
      bounds.extend([p.lng, p.lat]);
    });

    map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 });
  };

  // Bay đến một quận/huyện cụ thể
  const flyToRegion = (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: [lng, lat],
      zoom: 14.5,
      essential: true
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* 1. Header & Bộ lọc mức độ */}
      <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">Bản đồ Sự cố & Mật độ Khu vực</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                Goong Maps
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Trực quan hóa vị trí cứu hộ theo tọa độ GPS và phân cấp mức độ nghiêm trọng
            </p>
          </div>
        </div>

        {/* Bộ lọc mức độ & Công cụ */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle bật/tắt Vùng nhiệt khu vực */}
          <button
            onClick={() => setShowZones(!showZones)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              showZones 
                ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs' 
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
            title="Bật/Tắt quầng sáng vùng mức độ nghiêm trọng khu vực"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Vùng khu vực: {showZones ? 'BẬT' : 'TẮT'}
          </button>

          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              severityFilter === 'ALL'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả ({validPoints.length})
          </button>

          <button
            onClick={() => setSeverityFilter('HIGH')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              severityFilter === 'HIGH'
                ? 'bg-red-500 text-white shadow-xs'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            🔴 Nghiêm trọng ({highCount})
          </button>

          <button
            onClick={() => setSeverityFilter('MEDIUM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              severityFilter === 'MEDIUM'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
            }`}
          >
            🟠 Trung bình ({mediumCount})
          </button>

          <button
            onClick={() => setSeverityFilter('LOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              severityFilter === 'LOW'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            🟢 Nhẹ ({lowCount})
          </button>

          <button
            onClick={fitAllBounds}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors ml-1"
            title="Căn giữa toàn bộ điểm sự cố"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Map Canvas & Overlay Details */}
      <div className="relative w-full h-[580px] bg-gray-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Thông báo lỗi nếu có */}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 z-20 p-4">
            <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-lg max-w-md text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <Info className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-gray-900">Không thể tải bản đồ Goong Map</p>
              <p className="text-xs text-gray-500">{mapError}</p>
            </div>
          </div>
        )}

        {/* Floating Card: Mật độ theo Địa bàn / Quận Huyện (Góc trên trái) */}
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-200 shadow-md text-xs space-y-2 pointer-events-auto max-w-[240px]">
          <div className="font-bold text-gray-800 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-orange-600" />
            Mật độ theo địa bàn
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {regionalStats.map(reg => (
              <button
                key={reg.name}
                onClick={() => flyToRegion(reg.lat, reg.lng)}
                className="w-full text-left p-1.5 rounded-lg hover:bg-orange-50 flex items-center justify-between transition-colors border border-transparent hover:border-orange-200"
              >
                <span className="font-semibold text-gray-700">{reg.name}</span>
                <div className="flex items-center gap-1 font-bold text-[10px]">
                  {reg.high > 0 && <span className="text-red-600 bg-red-50 px-1 rounded">🔴 {reg.high}</span>}
                  {reg.medium > 0 && <span className="text-orange-600 bg-orange-50 px-1 rounded">🟠 {reg.medium}</span>}
                  {reg.low > 0 && <span className="text-emerald-600 bg-emerald-50 px-1 rounded">🟢 {reg.low}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Legend Overlay góc trái dưới */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-gray-200 shadow-md text-xs space-y-2 pointer-events-auto">
          <div className="font-bold text-gray-800 flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            Mức độ nghiêm trọng theo khu vực
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-4 h-4 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            </span>
            <span className="font-semibold text-red-700">Khu vực Cao (Tai nạn, Động cơ, Cẩu kéo)</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-4 h-4 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            </span>
            <span className="font-semibold text-orange-700">Khu vực Trung bình (Thủng lốp, Ắc quy, Quá nhiệt)</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-700">Khu vực Nhẹ (Hết xăng, Sửa tại chỗ nhanh)</span>
          </div>
        </div>

        {/* Selected Incident Drawer / Popup góc phải */}
        {selectedPoint && (
          <div className="absolute top-4 right-4 z-10 w-80 bg-white/98 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl space-y-3 pointer-events-auto transition-all animate-in fade-in slide-in-from-right-4">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${
                  selectedPoint.severity === 'HIGH'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : selectedPoint.severity === 'MEDIUM'
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>
                  <ShieldAlert className="w-3 h-3" />
                  {selectedPoint.severityLabel}
                </span>
                <h4 className="text-sm font-extrabold text-gray-900 mt-1">
                  Đơn: #{selectedPoint.code}
                </h4>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-lg">
                {selectedPoint.vehicleType === 'CAR' ? (
                  <Car className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <Bike className="w-4 h-4 text-orange-600 flex-shrink-0" />
                )}
                <div>
                  <span className="font-bold">{selectedPoint.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'}</span>
                  <span className="text-gray-400 mx-1">•</span>
                  <span className="font-semibold text-gray-900">{selectedPoint.issueName}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{selectedPoint.address}</span>
              </div>

              <div className="flex items-center justify-between text-gray-500 pt-1 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedPoint.createdAtText}
                </span>
                <span className="font-bold text-gray-700">
                  {selectedPoint.quoteType === 'TOW' ? 'Kéo xe' : 'Sửa tại chỗ'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Message nếu không có điểm nào */}
        {filteredPoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-xs z-10 pointer-events-none">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-md text-xs text-gray-500 flex items-center gap-2 pointer-events-auto">
              <Info className="w-4 h-4 text-orange-500" />
              Không có sự cố nào thuộc mức độ này trong khoảng thời gian đã chọn.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

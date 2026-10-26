import { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Layers, 
  Maximize2, 
  Car, 
  Bike, 
  Clock, 
  Info,
  ShieldAlert
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
  const [mapError, setMapError] = useState<string | null>(null);

  // Đếm theo mức độ
  const highCount = mapPoints.filter(p => p.severity === 'HIGH').length;
  const mediumCount = mapPoints.filter(p => p.severity === 'MEDIUM').length;
  const lowCount = mapPoints.filter(p => p.severity === 'LOW').length;

  const filteredPoints = mapPoints.filter(p => {
    if (!p.lat || !p.lng) return false;
    // Kiểm tra toạ độ hợp lệ lãnh thổ Việt Nam
    if (p.lat < 8 || p.lat > 24 || p.lng < 102 || p.lng > 110) return false;
    if (severityFilter === 'ALL') return true;
    return p.severity === severityFilter;
  });

  // Khởi tạo Goong Map
  useEffect(() => {
    let checkInterval: any = null;

    const startInit = () => {
      const goongjs = (window as any).goongjs;
      if (!goongjs || !mapContainerRef.current || mapInstanceRef.current) return;

      try {
        goongjs.accessToken = GOONG_MAPTILES_KEY;

        // Tâm khởi tạo: lấy từ điểm sự cố đầu tiên hoặc trung tâm Đà Nẵng
        const validFirstPoint = mapPoints.find(p => p.lat && p.lng && p.lat >= 8 && p.lat <= 24);
        const defaultCenter: [number, number] = validFirstPoint 
          ? [validFirstPoint.lng, validFirstPoint.lat] 
          : [108.2605, 15.9750]; // FPT City / Đà Nẵng

        const map = new goongjs.Map({
          container: mapContainerRef.current,
          style: 'https://tiles.goong.io/assets/goong_map_web.json',
          center: defaultCenter,
          zoom: 14,
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
          }, 300);
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

  // Vẽ marker theo danh sách filteredPoints khi Goong Map sẵn sàng
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

      // Xác định màu sắc
      let pinColor = '#10b981'; // Xanh lá
      let pulseColor = 'rgba(16, 185, 129, 0.4)';
      let isHigh = false;

      if (point.severity === 'HIGH') {
        pinColor = '#ef4444'; // Đỏ
        pulseColor = 'rgba(239, 68, 68, 0.5)';
        isHigh = true;
      } else if (point.severity === 'MEDIUM') {
        pinColor = '#f97316'; // Cam
        pulseColor = 'rgba(249, 115, 22, 0.4)';
      }

      // 1. Tạo wrapper ngoài cùng cho Marker (tuyệt đối KHÔNG gán class Tailwind transform)
      const el = document.createElement('div');
      el.style.width = '36px';
      el.style.height = '44px';
      el.style.cursor = 'pointer';
      el.style.position = 'relative';

      // 2. Nội dung bên trong pin marker có mũi nhọn chỉ chuẩn xác vào tâm toạ độ (anchor: bottom)
      el.innerHTML = `
        <div style="position: relative; width: 36px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;">
          ${isHigh ? `
            <div style="position: absolute; top: 0px; width: 34px; height: 34px; border-radius: 9999px; background-color: ${pulseColor}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          ` : ''}
          <div style="position: relative; width: 32px; height: 32px; border-radius: 9999px; background-color: ${pinColor}; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; z-index: 2;">
            <span style="font-size: 13px; font-weight: 900; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">!</span>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${pinColor}; margin-top: -2px; z-index: 1;"></div>
          <div style="width: 10px; height: 3px; background-color: rgba(0,0,0,0.25); border-radius: 9999px; margin-top: 1px;"></div>
        </div>
      `;

      // Tạo Popup nhỏ hiển thị khi click
      const popup = new goongjs.Popup({ offset: [0, -38], closeButton: false })
        .setHTML(`
          <div style="padding: 6px 10px; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <div style="font-weight: 800; color: #111827;">#${point.code}</div>
            <div style="color: ${pinColor}; font-weight: 700; font-size: 11px;">${point.issueName}</div>
            <div style="color: #6b7280; font-size: 11px; margin-top: 2px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${point.address}
            </div>
          </div>
        `);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPoint(point);
      });

      // Gán anchor: 'bottom' để mũi nhọn của marker cắm đúng vào toạ độ GPS
      const marker = new goongjs.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([point.lng, point.lat])
        .setPopup(popup)
        .addTo(map);

      bounds.extend([point.lng, point.lat]);
      validCount++;
      markersRef.current.push(marker);
    });

    // Auto zoom fit bounds nếu có điểm
    if (validCount > 0 && mapInstanceRef.current) {
      try {
        map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 60, right: 60 }, maxZoom: 15, duration: 600 });
      } catch (err) {
        console.warn('fitBounds error:', err);
      }
    }
  }, [filteredPoints, isMapReady]);

  // Căn giữa toàn bộ điểm cứu hộ
  const fitAllBounds = () => {
    const goongjs = (window as any).goongjs;
    const map = mapInstanceRef.current;
    if (!goongjs || !map || markersRef.current.length === 0) return;

    const bounds = new goongjs.LngLatBounds();
    let validCount = 0;
    filteredPoints.forEach(p => {
      if (p.lat && p.lng) {
        bounds.extend([p.lng, p.lat]);
        validCount++;
      }
    });

    if (validCount > 0) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* 1. Header & Bộ lọc mức độ */}
      <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

        {/* Bộ lọc mức độ */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              severityFilter === 'ALL'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả ({mapPoints.length})
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
      <div className="relative w-full h-[540px] bg-gray-100">
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

        {/* Legend Overlay góc trái dưới */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-gray-200 shadow-md text-xs space-y-2 pointer-events-auto">
          <div className="font-bold text-gray-800 flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            Mức độ nghiêm trọng theo khu vực
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span>Cao (Tai nạn, Động cơ, Cẩu kéo)</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Trung bình (Thủng lốp, Ắc quy, Quá nhiệt)</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Nhẹ (Hết xăng, Sửa tại chỗ nhanh)</span>
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

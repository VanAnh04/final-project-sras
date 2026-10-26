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

export const IncidentHeatmapMap = ({ mapPoints }: Props) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [selectedPoint, setSelectedPoint] = useState<IncidentMapPoint | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  // Đếm theo mức độ
  const highCount = mapPoints.filter(p => p.severity === 'HIGH').length;
  const mediumCount = mapPoints.filter(p => p.severity === 'MEDIUM').length;
  const lowCount = mapPoints.filter(p => p.severity === 'LOW').length;

  const filteredPoints = mapPoints.filter(p => {
    if (severityFilter === 'ALL') return true;
    return p.severity === severityFilter;
  });

  // Tải Leaflet CDN an toàn
  useEffect(() => {
    // 1. Load CSS
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // 2. Load JS
    const scriptId = 'leaflet-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.body.appendChild(script);
    } else if ((window as any).L) {
      initMap();
    }

    function initMap() {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current || mapInstanceRef.current) return;

      // Tâm mặc định: TP.HCM (10.7769, 106.7009) hoặc điểm đầu tiên
      const defaultCenter: [number, number] = mapPoints.length > 0 && mapPoints[0].lat && mapPoints[0].lng
        ? [mapPoints[0].lat, mapPoints[0].lng]
        : [10.7769, 106.7009];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      setIsMapReady(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Vẽ marker theo danh sách filteredPoints
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map || !isMapReady) return;

    // Xóa marker cũ
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    filteredPoints.forEach(point => {
      if (!point.lat || !point.lng) return;

      // Xác định màu sắc theo mức độ
      let color = '#10b981'; // LOW: xanh lá
      let pulseClass = '';
      if (point.severity === 'HIGH') {
        color = '#ef4444'; // HIGH: đỏ
        pulseClass = 'animate-ping opacity-75';
      } else if (point.severity === 'MEDIUM') {
        color = '#f97316'; // MEDIUM: cam
      }

      // Tạo icon HTML đẹp mắt
      const customIcon = L.divIcon({
        className: 'custom-incident-marker',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background-color: ${color};" class="${pulseClass}"></div>
            <div style="position: relative; width: 22px; height: 22px; border-radius: 9999px; background-color: ${color}; border: 2.5px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
              <span style="font-size: 10px; font-weight: bold;">!</span>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([point.lat, point.lng], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setSelectedPoint(point);
      });

      bounds.extend([point.lat, point.lng]);
      markersRef.current.push(marker);
    });

    // Auto zoom fit bounds nếu có điểm
    if (markersRef.current.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 0.5 });
    }
  }, [filteredPoints, isMapReady]);

  const fitAllBounds = () => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map || markersRef.current.length === 0) return;

    const bounds = L.latLngBounds([]);
    filteredPoints.forEach(p => {
      if (p.lat && p.lng) bounds.extend([p.lat, p.lng]);
    });
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
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
            <h3 className="font-bold text-gray-900 text-base">Bản đồ Sự cố & Mật độ Khu vực</h3>
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
      <div className="relative w-full h-[520px] bg-gray-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Legend Overlay góc trái dưới */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-gray-200 shadow-md text-xs space-y-1.5 pointer-events-auto">
          <div className="font-bold text-gray-800 flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-gray-500" />
            Mức độ nghiêm trọng
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Cao (Tai nạn, Động cơ, Cẩu kéo)</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Trung bình (Thủng lốp, Ắc quy, Nóng máy)</span>
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
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-xs z-10">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-md text-xs text-gray-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-500" />
              Không có sự cố nào thuộc mức độ này trong khoảng thời gian đã chọn.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

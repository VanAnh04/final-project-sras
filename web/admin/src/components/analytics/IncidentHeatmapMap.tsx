import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  MapPin, 
  Maximize2, 
  Car, 
  Bike, 
  Clock, 
  Info,
  ShieldAlert,
  Navigation,
  Grid3x3,
  AlertTriangle
} from 'lucide-react';
import type { IncidentMapPoint } from '../../types/analytics';

interface Props {
  mapPoints: IncidentMapPoint[];
}

type SeverityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

const GOONG_MAPTILES_KEY = import.meta.env.VITE_GOONG_MAPTILES_KEY || 'tLGn6mdYdxZ2fDhZnsm8Dbhf7iSW3zPnHU4fStP0';

// ==================== LƯỚI Ô KHU VỰC SỰ CỐ ====================
// Chia bản đồ thành lưới ô cố định (không phụ thuộc dữ liệu) để ô không xê dịch khi số liệu thay đổi
const ZONE_CELL_SIZE_KM = 2;

// Phép chiếu phẳng cục bộ quanh Đà Nẵng, đủ chính xác cho ô cỡ vài km
const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LNG = 111.32 * Math.cos((16.03 * Math.PI) / 180);

// Dưới 5 vụ: không tô; 5–9: vàng; 10–15: cam; trên 15: đỏ
type ZoneLevel = 'RED' | 'ORANGE' | 'YELLOW';

const ZONE_LEVEL_MIN: Record<ZoneLevel, number> = {
  YELLOW: 5,
  ORANGE: 10,
  RED: 16
};

const ZONE_LEVEL_STYLES: Record<ZoneLevel, {
  color: string;
  badgeTextColor: string;
  label: string;
  legend: string;
  chipClass: string;
  textClass: string;
}> = {
  RED: {
    color: '#dc2626',
    badgeTextColor: '#ffffff',
    label: 'Khu vực rất hay xảy ra sự cố',
    legend: `Trên ${ZONE_LEVEL_MIN.RED - 1} vụ - rất hay xảy ra sự cố`,
    chipClass: 'bg-red-50 text-red-600 border-red-200',
    textClass: 'text-red-600'
  },
  ORANGE: {
    color: '#ea580c',
    badgeTextColor: '#ffffff',
    label: 'Khu vực thường xảy ra sự cố',
    legend: `${ZONE_LEVEL_MIN.ORANGE}–${ZONE_LEVEL_MIN.RED - 1} vụ - thường xảy ra sự cố`,
    chipClass: 'bg-orange-50 text-orange-600 border-orange-200',
    textClass: 'text-orange-600'
  },
  YELLOW: {
    color: '#eab308',
    badgeTextColor: '#422006',
    label: 'Khu vực cần chú ý',
    legend: `${ZONE_LEVEL_MIN.YELLOW}–${ZONE_LEVEL_MIN.ORANGE - 1} vụ - cần chú ý`,
    chipClass: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    textClass: 'text-yellow-600'
  }
};

function getZoneLevel(incidentCount: number): ZoneLevel | null {
  if (incidentCount >= ZONE_LEVEL_MIN.RED) return 'RED';
  if (incidentCount >= ZONE_LEVEL_MIN.ORANGE) return 'ORANGE';
  if (incidentCount >= ZONE_LEVEL_MIN.YELLOW) return 'YELLOW';
  return null;
}

export interface HotspotZone {
  id: string;
  label: string;
  incidentCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  incidents: IncidentMapPoint[];
  mainIssues: string[];
  level: ZoneLevel;
  color: string;
  polygon: [number, number][]; // vòng khép kín [lng, lat]
  bounds: [[number, number], [number, number]]; // [tây-nam, đông-bắc]
  center: [number, number];
}

// Tên gọi ô: phường/xã xuất hiện nhiều nhất trong địa chỉ các đơn, không có thì dùng toạ độ tâm ô
// Địa chỉ Goong dạng "số nhà đường, phường, quận, thành phố": lấy phần đứng ngay trước tên thành phố
// (quận cũ hoặc phường mới sau sáp nhập) làm tên địa bàn
function getAddressArea(address: string): string | null {
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  while (parts.length && /^(việt nam|vietnam)$/i.test(parts[parts.length - 1])) parts.pop();
  if (parts.length && /đà nẵng|quảng nam|^(thành phố|tỉnh|tp\.?)\s/i.test(parts[parts.length - 1])) parts.pop();
  // Chỉ còn 1 phần thì đó là tên đường, không phải địa bàn
  return parts.length >= 2 ? parts[parts.length - 1] : null;
}

// Tên gọi ô: địa bàn xuất hiện nhiều nhất trong địa chỉ các đơn, không có thì dùng toạ độ tâm ô
function getZoneLabel(incidents: IncidentMapPoint[], center: [number, number]): string {
  const areaCount = new Map<string, number>();
  incidents.forEach(p => {
    const area = getAddressArea(p.address || '');
    if (area) areaCount.set(area, (areaCount.get(area) || 0) + 1);
  });
  const top = Array.from(areaCount.entries()).sort((a, b) => b[1] - a[1])[0];
  return top ? `Khu vực ${top[0]}` : `Khu vực quanh ${center[1].toFixed(3)}, ${center[0].toFixed(3)}`;
}

export const IncidentHeatmapMap = ({ mapPoints }: Props) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const zoneMarkersRef = useRef<any[]>([]);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [selectedPoint, setSelectedPoint] = useState<IncidentMapPoint | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [showHotspotZones, setShowHotspotZones] = useState<boolean>(true);
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

  // Gom các đơn cứu hộ (theo bộ lọc mức độ) vào lưới ô vuông và đánh giá mức độ hay xảy ra sự cố của từng ô
  const hotspotZones = useMemo<HotspotZone[]>(() => {
    const cells = new Map<string, { x: number; y: number; incidents: IncidentMapPoint[] }>();
    filteredPoints.forEach(p => {
      const x = Math.floor((p.lng * KM_PER_DEG_LNG) / ZONE_CELL_SIZE_KM);
      const y = Math.floor((p.lat * KM_PER_DEG_LAT) / ZONE_CELL_SIZE_KM);
      const key = `${x}:${y}`;
      const cell = cells.get(key) || { x, y, incidents: [] };
      cell.incidents.push(p);
      cells.set(key, cell);
    });

    const result: HotspotZone[] = [];

    cells.forEach(({ x, y, incidents }, key) => {
      // Ô chưa đủ ngưỡng số vụ thì không tô
      const level = getZoneLevel(incidents.length);
      if (!level) return;

      const west = (x * ZONE_CELL_SIZE_KM) / KM_PER_DEG_LNG;
      const east = ((x + 1) * ZONE_CELL_SIZE_KM) / KM_PER_DEG_LNG;
      const south = (y * ZONE_CELL_SIZE_KM) / KM_PER_DEG_LAT;
      const north = ((y + 1) * ZONE_CELL_SIZE_KM) / KM_PER_DEG_LAT;
      const center: [number, number] = [(west + east) / 2, (south + north) / 2];

      // Thống kê các lỗi thường gặp trong ô
      const issueCountMap = new Map<string, number>();
      incidents.forEach(p => {
        const name = p.issueName || 'Sự cố khác';
        issueCountMap.set(name, (issueCountMap.get(name) || 0) + 1);
      });
      const topIssues = Array.from(issueCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count})`);

      result.push({
        id: key,
        label: getZoneLabel(incidents, center),
        incidentCount: incidents.length,
        highCount: incidents.filter(p => p.severity === 'HIGH').length,
        mediumCount: incidents.filter(p => p.severity === 'MEDIUM').length,
        lowCount: incidents.filter(p => p.severity === 'LOW').length,
        incidents,
        mainIssues: topIssues,
        level,
        color: ZONE_LEVEL_STYLES[level].color,
        polygon: [[west, south], [east, south], [east, north], [west, north], [west, south]],
        bounds: [[west, south], [east, north]],
        center
      });
    });

    // Ưu tiên ô có nhiều sự cố nhất lên đầu
    result.sort((a, b) => b.incidentCount - a.incidentCount || b.highCount - a.highCount);

    // Nhiều ô cùng địa bàn thì đánh số để phân biệt trong danh sách
    const labelTotal = new Map<string, number>();
    result.forEach(z => labelTotal.set(z.label, (labelTotal.get(z.label) || 0) + 1));
    const labelSeen = new Map<string, number>();
    result.forEach(z => {
      if ((labelTotal.get(z.label) || 0) < 2) return;
      const n = (labelSeen.get(z.label) || 0) + 1;
      labelSeen.set(z.label, n);
      z.label = `${z.label} (${n})`;
    });

    return result;
  }, [filteredPoints]);

  // Lấy ô đang chọn từ danh sách hiện tại để panel tự cập nhật (hoặc đóng) khi đổi bộ lọc
  const selectedZone = useMemo(
    () => hotspotZones.find(z => z.id === selectedZoneId) ?? null,
    [hotspotZones, selectedZoneId]
  );

  // Handler click trên layer chỉ đăng ký một lần, nên đọc danh sách ô mới nhất qua ref
  const hotspotZonesRef = useRef<HotspotZone[]>([]);
  useEffect(() => {
    hotspotZonesRef.current = hotspotZones;
  }, [hotspotZones]);

  // Khởi tạo Goong Map
  useEffect(() => {
    let checkInterval: any = null;
    // Giữ map cục bộ để cleanup huỷ được cả khi map chưa 'load' xong. Nếu không, StrictMode
    // (mount -> unmount -> mount) sẽ để lại map cũ và tạo map thứ 2 chồng lên cùng khung:
    // ô/marker có thể bị vẽ lên map nằm dưới, không nhìn thấy.
    let createdMap: { remove: () => void } | null = null;
    let disposed = false;

    const startInit = () => {
      const goongjs = (window as any).goongjs;
      if (disposed || !goongjs || !mapContainerRef.current || createdMap) return;

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
        createdMap = map;

        map.addControl(new goongjs.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

        map.on('load', () => {
          if (disposed) return;
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
      disposed = true;
      if (checkInterval) clearInterval(checkInterval);
      zoneMarkersRef.current.forEach(m => m.remove());
      zoneMarkersRef.current = [];
      createdMap?.remove();
      createdMap = null;
      mapInstanceRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  // Khung nhìn bao trọn các ô được tô; chưa có ô nào thì bao các điểm sự cố
  const fitToData = useCallback((duration: number) => {
    const goongjs = (window as any).goongjs;
    const map = mapInstanceRef.current;
    if (!goongjs || !map) return;

    const bounds = new goongjs.LngLatBounds();
    let count = 0;
    if (hotspotZones.length > 0) {
      hotspotZones.forEach(z => {
        bounds.extend(z.bounds[0]);
        bounds.extend(z.bounds[1]);
        count++;
      });
    } else {
      filteredPoints.forEach(p => {
        bounds.extend([p.lng, p.lat]);
        count++;
      });
    }
    if (count === 0) return;

    try {
      map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration });
    } catch (err) {
      console.warn('fitBounds error:', err);
    }
  }, [hotspotZones, filteredPoints]);

  // Tự căn khung khi dữ liệu hoặc bộ lọc thay đổi
  useEffect(() => {
    if (isMapReady) fitToData(500);
  }, [fitToData, isMapReady]);

  // Tô các ô khu vực hay xảy ra sự cố từ dữ liệu cứu hộ
  useEffect(() => {
    const goongjs = (window as any).goongjs;
    const map = mapInstanceRef.current;
    if (!goongjs || !map || !isMapReady) return;

    // Xóa các badge số vụ cũ
    zoneMarkersRef.current.forEach(m => m.remove());
    zoneMarkersRef.current = [];

    const sourceId = 'hotspot-zones-source';
    const fillLayerId = 'hotspot-zones-fill';
    const outlineLayerId = 'hotspot-zones-outline';

    const geojsonData = {
      type: 'FeatureCollection',
      features: hotspotZones.map(z => ({
        type: 'Feature',
        properties: {
          id: z.id,
          incidentCount: z.incidentCount,
          level: z.level,
          color: z.color
        },
        geometry: {
          type: 'Polygon',
          coordinates: [z.polygon]
        }
      }))
    };

    const existingSource = map.getSource(sourceId);
    if (existingSource) {
      existingSource.setData(geojsonData);
    } else {
      try {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData
        });

        // Vẽ ô dưới lớp nhãn của bản đồ để tên đường, địa danh vẫn đọc được
        const firstSymbolLayerId = map.getStyle()?.layers?.find((l: { id: string; type: string }) => l.type === 'symbol')?.id;

        // 1. Nền ô tô màu theo mức độ
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': ['coalesce', ['get', 'color'], '#dc2626'],
            'fill-opacity': 0.35
          }
        }, firstSymbolLayerId);

        // 2. Viền ô
        map.addLayer({
          id: outlineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#dc2626'],
            'line-width': 1.5,
            'line-opacity': 0.9
          }
        }, firstSymbolLayerId);

        // Tương tác hover và click trên ô
        map.on('mouseenter', fillLayerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', fillLayerId, () => {
          map.getCanvas().style.cursor = '';
        });

        map.on('click', fillLayerId, (e: any) => {
          const zoneId = e.features?.[0]?.properties?.id;
          const zone = hotspotZonesRef.current.find(z => z.id === zoneId);
          if (zone) {
            setSelectedZoneId(zone.id);
            setSelectedPoint(null);
          }
        });
      } catch (err) {
        console.warn('Lỗi vẽ layer ô khu vực sự cố:', err);
      }
    }

    // Toggle hiển thị theo state showHotspotZones
    const visibility = showHotspotZones ? 'visible' : 'none';
    if (map.getLayer(fillLayerId)) map.setLayoutProperty(fillLayerId, 'visibility', visibility);
    if (map.getLayer(outlineLayerId)) map.setLayoutProperty(outlineLayerId, 'visibility', visibility);

    // Gắn badge số vụ tại tâm từng ô
    if (showHotspotZones && hotspotZones.length > 0) {
      hotspotZones.forEach(zone => {
        const badgeEl = document.createElement('div');
        badgeEl.style.cursor = 'pointer';
        // Luôn nằm trên pin của từng đơn (pin dùng z-index 10)
        badgeEl.style.zIndex = '20';
        badgeEl.title = `${zone.label}: ${zone.incidentCount} sự cố`;
        badgeEl.innerHTML = `
          <div style="display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 22px; padding: 0 6px; background: ${zone.color}; color: ${ZONE_LEVEL_STYLES[zone.level].badgeTextColor}; border-radius: 9999px; font-weight: 800; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; box-shadow: 0 3px 10px rgba(0,0,0,0.3); border: 2px solid white; white-space: nowrap; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            ${zone.incidentCount}
          </div>
        `;

        badgeEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedZoneId(zone.id);
          setSelectedPoint(null);
          map.fitBounds(zone.bounds, { padding: 40, duration: 600 });
        });

        const marker = new goongjs.Marker(badgeEl)
          .setLngLat(zone.center)
          .addTo(map);

        zoneMarkersRef.current.push(marker);
      });
    }
  }, [hotspotZones, isMapReady, showHotspotZones]);

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
          {/* Toggle bật/tắt Ô khu vực sự cố */}
          <button
            onClick={() => setShowHotspotZones(!showHotspotZones)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              showHotspotZones
                ? 'bg-red-50 text-red-700 border-red-300 shadow-xs'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
            title="Bật/Tắt các ô khu vực hay xảy ra sự cố từ dữ liệu cứu hộ"
          >
            <Grid3x3 className="w-3.5 h-3.5 text-red-600" />
            Ô khu vực sự cố: {showHotspotZones ? `BẬT (${hotspotZones.length})` : 'TẮT'}
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
            title="Chỉ tính vụ nghiêm trọng: Tai nạn, Động cơ, Cẩu kéo"
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
            title="Chỉ tính vụ trung bình: Thủng lốp, Ắc quy, Quá nhiệt"
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
            title="Chỉ tính vụ nhẹ: Hết xăng, Sửa tại chỗ nhanh"
          >
            🟢 Nhẹ ({lowCount})
          </button>

          <button
            onClick={() => fitToData(600)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors ml-1"
            title="Căn giữa toàn bộ khu vực sự cố"
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

        {/* Floating Card: Mật độ theo Địa bàn / Quận Huyện & Tuyến đường (Góc trên trái) */}
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-200 shadow-md text-xs space-y-2.5 pointer-events-auto max-w-[250px]">
          <div>
            <div className="font-bold text-gray-800 flex items-center gap-1.5 mb-1.5">
              <Navigation className="w-3.5 h-3.5 text-orange-600" />
              Mật độ theo địa bàn
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
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

          {/* Danh sách các ô khu vực hay xảy ra sự cố */}
          {hotspotZones.length > 0 && showHotspotZones && (
            <div className="pt-2 border-t border-gray-100 space-y-1.5">
              <div className="font-bold text-gray-800 flex items-center gap-1.5 text-[11px]">
                <Grid3x3 className="w-3.5 h-3.5 text-red-600" />
                Khu vực hay xảy ra sự cố
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {hotspotZones.map(zone => (
                  <button
                    key={zone.id}
                    onClick={() => {
                      setSelectedZoneId(zone.id);
                      setSelectedPoint(null);
                      mapInstanceRef.current?.fitBounds(zone.bounds, { padding: 40, duration: 600 });
                    }}
                    className="w-full text-left p-1.5 rounded-lg hover:bg-red-50 flex items-center justify-between transition-colors border border-transparent hover:border-red-200 group"
                  >
                    <div className="truncate max-w-[155px]">
                      <span className="font-bold text-gray-800 block truncate group-hover:text-red-700 text-[11px]" title={zone.label}>
                        {zone.label}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${ZONE_LEVEL_STYLES[zone.level].chipClass}`}>
                      {zone.incidentCount} vụ
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Legend Overlay góc trái dưới */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-gray-200 shadow-md text-xs space-y-2 pointer-events-auto">
          {/* Chú thích ô khu vực sự cố */}
          <div className="space-y-1.5">
            <div className="font-bold text-gray-800 flex items-center gap-1.5">
              <Grid3x3 className="w-3.5 h-3.5 text-red-600" />
              Ô khu vực sự cố (~{ZONE_CELL_SIZE_KM} km × {ZONE_CELL_SIZE_KM} km)
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-4 h-4 rounded-sm bg-red-600/35 border-[1.5px] border-red-600"></span>
              <span className="font-semibold text-red-700 text-[11px]">{ZONE_LEVEL_STYLES.RED.legend}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-4 h-4 rounded-sm bg-orange-600/35 border-[1.5px] border-orange-600"></span>
              <span className="font-semibold text-orange-700 text-[11px]">{ZONE_LEVEL_STYLES.ORANGE.legend}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-4 h-4 rounded-sm bg-yellow-500/35 border-[1.5px] border-yellow-500"></span>
              <span className="font-semibold text-yellow-700 text-[11px]">{ZONE_LEVEL_STYLES.YELLOW.legend}</span>
            </div>
            <div className="text-[10px] text-gray-400 italic">
              Dưới {ZONE_LEVEL_MIN.YELLOW} vụ không tô màu
            </div>
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

        {/* Selected Zone Drawer / Popup góc phải */}
        {selectedZone && (
          <div className="absolute top-4 right-4 z-10 w-84 bg-white/98 backdrop-blur-md p-4 rounded-2xl border border-red-200 shadow-xl space-y-3 pointer-events-auto transition-all animate-in fade-in slide-in-from-right-4">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${ZONE_LEVEL_STYLES[selectedZone.level].chipClass}`}>
                  <AlertTriangle className="w-3 h-3" />
                  {ZONE_LEVEL_STYLES[selectedZone.level].label}
                </span>
                <h4 className="text-sm font-extrabold text-gray-900 mt-1">
                  {selectedZone.label}
                </h4>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Ô ~{ZONE_CELL_SIZE_KM} km × {ZONE_CELL_SIZE_KM} km, tâm {selectedZone.center[1].toFixed(4)}, {selectedZone.center[0].toFixed(4)}
                </p>
              </div>
              <button
                onClick={() => setSelectedZoneId(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Tổng sự cố</span>
                  <span className={`text-base font-black ${ZONE_LEVEL_STYLES[selectedZone.level].textClass}`}>{selectedZone.incidentCount} vụ</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Nghiêm trọng</span>
                  <span className="text-base font-black text-red-600">{selectedZone.highCount} vụ</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-600 block mb-1">Các lỗi thường gặp trong khu vực:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedZone.mainIssues.map((issue, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      {issue}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-600 block mb-1">Các đơn cứu hộ ghi nhận trong khu vực:</span>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {selectedZone.incidents.map(inc => (
                    <button
                      key={inc.id}
                      onClick={() => setSelectedPoint(inc)}
                      className="w-full text-left p-2 rounded-lg bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-colors flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-gray-900 block">#{inc.code}</span>
                        <span className="text-gray-500 text-[10px] truncate max-w-[150px] block">{inc.issueName}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${inc.severity === 'HIGH' ? 'text-red-600' : 'text-orange-600'}`}>
                        {inc.severityLabel.replace('Mức độ ', '')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2 bg-orange-50/70 rounded-xl border border-orange-200/80 text-[11px] text-orange-900 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-orange-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Khuyến nghị:</strong> Khu vực này tập trung nhiều sự cố cứu hộ, hệ thống khuyến nghị các Gara đối tác lân cận bố trí xe và KTV túc trực.
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

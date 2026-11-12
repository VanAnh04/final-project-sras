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
  Navigation,
  Route,
  AlertTriangle
} from 'lucide-react';
import type { IncidentMapPoint } from '../../types/analytics';

interface Props {
  mapPoints: IncidentMapPoint[];
}

type SeverityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

const GOONG_MAPTILES_KEY = import.meta.env.VITE_GOONG_MAPTILES_KEY || 'tLGn6mdYdxZ2fDhZnsm8Dbhf7iSW3zPnHU4fStP0';

// ==================== ĐỊNH NGHĨA CÁC TUYẾN ĐƯỜNG HUYẾT MẠCH KHU VỰC ĐÀ NẴNG ====================
interface RoadCorridorDef {
  id: string;
  name: string;
  shortName: string;
  keywords: string[];
  coordinates: [number, number][]; // [lng, lat]
}

const MASTER_ROAD_CORRIDORS: RoadCorridorDef[] = [
  {
    id: 'tran-dai-nghia',
    name: 'Tuyến Trần Đại Nghĩa - Nam Kỳ Khởi Nghĩa (Ngũ Hành Sơn)',
    shortName: 'Đường Trần Đại Nghĩa',
    keywords: ['trần đại nghĩa', 'fpt', 'làng đại học', 'hòa quý', 'hòa hải', 'ngũ hành sơn', 'đại nghĩa'],
    coordinates: [
      [108.2485, 16.0120],
      [108.2515, 16.0020],
      [108.2540, 15.9920],
      [108.2562, 15.9840],
      [108.2588, 15.9750],
      [108.2615, 15.9680],
      [108.2635, 15.9610]
    ]
  },
  {
    id: 'vo-nguyen-giap',
    name: 'Tuyến Ven biển Võ Nguyên Giáp - Trường Sa (Mỹ Khê - Non Nước)',
    shortName: 'Đường Võ Nguyên Giáp - Trường Sa',
    keywords: ['võ nguyên giáp', 'trường sa', 'lạc long quân', 'mỹ khê', 'non nước', 'resort'],
    coordinates: [
      [108.2465, 16.0590],
      [108.2480, 16.0420],
      [108.2510, 16.0250],
      [108.2560, 15.9980],
      [108.2620, 15.9720],
      [108.2690, 15.9450],
      [108.2780, 15.9200]
    ]
  },
  {
    id: 'le-van-hien',
    name: 'Tuyến Lê Văn Hiến (Ngũ Hành Sơn)',
    shortName: 'Đường Lê Văn Hiến',
    keywords: ['lê văn hiến', 'khuê mỹ', 'bệnh viện phụ sản nhi', 'tiên sơn'],
    coordinates: [
      [108.2385, 16.0350],
      [108.2435, 16.0210],
      [108.2480, 16.0080],
      [108.2515, 16.0010]
    ]
  },
  {
    id: 'nguyen-van-linh',
    name: 'Tuyến Nguyễn Văn Linh - Cầu Rồng - Võ Văn Kiệt',
    shortName: 'Đường Nguyễn Văn Linh - Cầu Rồng',
    keywords: ['nguyễn văn linh', 'cầu rồng', 'võ văn kiệt', 'hải châu', 'sân bay', 'sơn trà'],
    coordinates: [
      [108.2040, 16.0610],
      [108.2140, 16.0605],
      [108.2220, 16.0608],
      [108.2285, 16.0610],
      [108.2370, 16.0618],
      [108.2440, 16.0620]
    ]
  },
  {
    id: 'ql1a-truong-chinh',
    name: 'Trục Quốc Lộ 1A - Trường Chinh (Cẩm Lệ - Hòa Vang)',
    shortName: 'Quốc Lộ 1A - Trường Chinh',
    keywords: ['quốc lộ 1', 'ql1', 'trường chinh', 'hòa phước', 'hòa vang', 'cẩm lệ', 'điện bàn'],
    coordinates: [
      [108.1820, 16.0650],
      [108.1880, 16.0420],
      [108.1940, 16.0180],
      [108.2010, 15.9900],
      [108.2060, 15.9600],
      [108.2120, 15.9300]
    ]
  },
  {
    id: 'nam-ky-khoi-nghia',
    name: 'Trục Nam Kỳ Khởi Nghĩa (Hòa Quý)',
    shortName: 'Đường Nam Kỳ Khởi Nghĩa',
    keywords: ['nam kỳ khởi nghĩa', 'mai đăng chơn'],
    coordinates: [
      [108.2150, 15.9810],
      [108.2350, 15.9815],
      [108.2500, 15.9820],
      [108.2615, 15.9825]
    ]
  },
  {
    id: 'dien-bien-phu',
    name: 'Trục Điện Biên Phủ - Tôn Đức Thắng (Liên Chiểu)',
    shortName: 'Đường Điện Biên Phủ - Tôn Đức Thắng',
    keywords: ['điện biên phủ', 'tôn đức thắng', 'ngã ba huế', 'liên chiểu'],
    coordinates: [
      [108.1960, 16.0640],
      [108.1820, 16.0660],
      [108.1650, 16.0740],
      [108.1520, 16.0820]
    ]
  },
  {
    id: '2-thang-9',
    name: 'Trục 2 Tháng 9 - Cách Mạng Tháng 8',
    shortName: 'Đường 2/9 - CMT8',
    keywords: ['2 tháng 9', 'cách mạng tháng 8', 'cmt8'],
    coordinates: [
      [108.2230, 16.0580],
      [108.2240, 16.0450],
      [108.2235, 16.0320],
      [108.2180, 16.0150],
      [108.2100, 16.0020]
    ]
  }
];

export interface HotspotCorridor {
  id: string;
  name: string;
  shortName: string;
  incidentCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  incidents: IncidentMapPoint[];
  mainIssues: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  color: string;
  glowColor: string;
  coordinates: [number, number][];
  midpoint: [number, number];
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function minDistanceToPolyline(lat: number, lng: number, polyline: [number, number][]): number {
  let minD = Infinity;
  for (let i = 0; i < polyline.length; i++) {
    const [pLng, pLat] = polyline[i];
    const d = calculateDistanceKm(lat, lng, pLat, pLng);
    if (d < minD) minD = d;
  }
  return minD;
}

export const IncidentHeatmapMap = ({ mapPoints }: Props) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const roadMarkersRef = useRef<any[]>([]);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [selectedPoint, setSelectedPoint] = useState<IncidentMapPoint | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<HotspotCorridor | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showHotspotRoads, setShowHotspotRoads] = useState<boolean>(true);
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

  // Phân tích và phát hiện các đoạn đường hay xảy ra sự cố từ dữ liệu cứu hộ
  const hotspotCorridors = useMemo<HotspotCorridor[]>(() => {
    if (validPoints.length === 0) return [];

    const corridorMap = new Map<string, {
      def: RoadCorridorDef;
      incidents: IncidentMapPoint[];
    }>();

    // Khởi tạo map cho các tuyến chính
    MASTER_ROAD_CORRIDORS.forEach(cor => {
      corridorMap.set(cor.id, { def: cor, incidents: [] });
    });

    const unmatchedPoints: IncidentMapPoint[] = [];

    // 1. Phân bổ các điểm sự cố vào các tuyến đường chính
    validPoints.forEach(point => {
      const addrLower = (point.address || '').toLowerCase();
      let matchedId: string | null = null;

      // Ưu tiên so khớp theo từ khóa tên đường trong địa chỉ
      for (const cor of MASTER_ROAD_CORRIDORS) {
        if (cor.keywords.some(k => addrLower.includes(k))) {
          matchedId = cor.id;
          break;
        }
      }

      // Nếu địa chỉ không ghi rõ tên đường, tính khoảng cách hình học tới tim đường
      if (!matchedId) {
        let bestDist = 1.2; // Bán kính 1.2km xung quanh tim đường
        for (const cor of MASTER_ROAD_CORRIDORS) {
          const d = minDistanceToPolyline(point.lat, point.lng, cor.coordinates);
          if (d < bestDist) {
            bestDist = d;
            matchedId = cor.id;
          }
        }
      }

      if (matchedId && corridorMap.has(matchedId)) {
        corridorMap.get(matchedId)!.incidents.push(point);
      } else {
        unmatchedPoints.push(point);
      }
    });

    const result: HotspotCorridor[] = [];

    // Xử lý các tuyến đường chính có phát sinh sự cố
    corridorMap.forEach(({ def, incidents }) => {
      if (incidents.length === 0) return;

      const high = incidents.filter(p => p.severity === 'HIGH').length;
      const medium = incidents.filter(p => p.severity === 'MEDIUM').length;
      const low = incidents.filter(p => p.severity === 'LOW').length;

      // Tuyến có sự cố nghiêm trọng -> Đỏ; nếu trung bình/nhẹ -> Cam
      const severity: 'HIGH' | 'MEDIUM' | 'LOW' = high > 0 ? 'HIGH' : medium > 0 ? 'MEDIUM' : 'LOW';
      const color = severity === 'HIGH' ? '#dc2626' : '#ea580c';
      const glowColor = severity === 'HIGH' ? 'rgba(239, 68, 68, 0.55)' : 'rgba(249, 115, 22, 0.55)';

      // Thống kê các lỗi thường gặp trên tuyến
      const issueCountMap = new Map<string, number>();
      incidents.forEach(p => {
        const name = p.issueName || 'Sự cố khác';
        issueCountMap.set(name, (issueCountMap.get(name) || 0) + 1);
      });
      const topIssues = Array.from(issueCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count})`);

      const midIdx = Math.floor(def.coordinates.length / 2);
      const midpoint = def.coordinates[midIdx] || def.coordinates[0];

      result.push({
        id: def.id,
        name: def.name,
        shortName: def.shortName,
        incidentCount: incidents.length,
        highCount: high,
        mediumCount: medium,
        lowCount: low,
        incidents,
        mainIssues: topIssues,
        severity,
        color,
        glowColor,
        coordinates: def.coordinates,
        midpoint
      });
    });

    // 2. Nhóm các điểm sự cố chưa khớp nếu nằm gần nhau (Spatial clustering fallback)
    if (unmatchedPoints.length >= 2) {
      const sorted = [...unmatchedPoints].sort((a, b) => a.lat - b.lat || a.lng - b.lng);
      const coords: [number, number][] = sorted.map(p => [p.lng, p.lat]);
      const high = sorted.filter(p => p.severity === 'HIGH').length;
      const medium = sorted.filter(p => p.severity === 'MEDIUM').length;
      const low = sorted.filter(p => p.severity === 'LOW').length;
      const severity: 'HIGH' | 'MEDIUM' | 'LOW' = high > 0 ? 'HIGH' : medium > 0 ? 'MEDIUM' : 'LOW';

      result.push({
        id: 'cluster-unmatched',
        name: 'Đoạn đường liên kết các điểm sự cố lân cận',
        shortName: 'Đoạn đường sự cố cục bộ',
        incidentCount: sorted.length,
        highCount: high,
        mediumCount: medium,
        lowCount: low,
        incidents: sorted,
        mainIssues: ['Đa dạng sự cố cứu hộ'],
        severity,
        color: severity === 'HIGH' ? '#dc2626' : '#ea580c',
        glowColor: severity === 'HIGH' ? 'rgba(239, 68, 68, 0.55)' : 'rgba(249, 115, 22, 0.55)',
        coordinates: coords,
        midpoint: coords[Math.floor(coords.length / 2)]
      });
    }

    // Ưu tiên đoạn đường có nhiều sự cố nhất lên đầu
    return result.sort((a, b) => b.incidentCount - a.incidentCount || b.highCount - a.highCount);
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
        roadMarkersRef.current.forEach(m => m.remove());
        roadMarkersRef.current = [];
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
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

  // Vẽ và in đậm các đoạn đường hay xảy ra sự cố từ dữ liệu cứu hộ
  useEffect(() => {
    const goongjs = (window as any).goongjs;
    const map = mapInstanceRef.current;
    if (!goongjs || !map || !isMapReady) return;

    // Xóa các badge marker đoạn đường cũ
    roadMarkersRef.current.forEach(m => m.remove());
    roadMarkersRef.current = [];

    const sourceId = 'hotspot-corridors-source';
    const glowLayerId = 'hotspot-corridors-glow';
    const coreLayerId = 'hotspot-corridors-core';
    const dashLayerId = 'hotspot-corridors-dash';

    const geojsonData = {
      type: 'FeatureCollection',
      features: hotspotCorridors.map(c => ({
        type: 'Feature',
        properties: {
          id: c.id,
          name: c.name,
          shortName: c.shortName,
          incidentCount: c.incidentCount,
          highCount: c.highCount,
          mediumCount: c.mediumCount,
          severity: c.severity,
          color: c.color,
          glowColor: c.glowColor
        },
        geometry: {
          type: 'LineString',
          coordinates: c.coordinates
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

        // 1. Lớp viền phát quang (Glow Halo) in đậm
        map.addLayer({
          id: glowLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': ['coalesce', ['get', 'glowColor'], 'rgba(239, 68, 68, 0.5)'],
            'line-width': 16,
            'line-opacity': 0.75,
            'line-blur': 4
          }
        });

        // 2. Lớp tim đường in đậm (Core Line)
        map.addLayer({
          id: coreLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#dc2626'],
            'line-width': 6,
            'line-opacity': 0.95
          }
        });

        // 3. Lớp nét đứt cảnh báo màu trắng
        map.addLayer({
          id: dashLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-dasharray': [2, 3],
            'line-opacity': 0.85
          }
        });

        // Tương tác hover và click trên đoạn đường
        map.on('mouseenter', coreLayerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', coreLayerId, () => {
          map.getCanvas().style.cursor = '';
        });

        map.on('click', coreLayerId, (e: any) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const corId = feat.properties?.id;
          const cor = hotspotCorridors.find(c => c.id === corId);
          if (cor) {
            setSelectedCorridor(cor);
            setSelectedPoint(null);
          }
        });
      } catch (err) {
        console.warn('Lỗi vẽ layer đoạn đường sự cố:', err);
      }
    }

    // Toggle hiển thị theo state showHotspotRoads
    const visibility = showHotspotRoads ? 'visible' : 'none';
    if (map.getLayer(glowLayerId)) map.setLayoutProperty(glowLayerId, 'visibility', visibility);
    if (map.getLayer(coreLayerId)) map.setLayoutProperty(coreLayerId, 'visibility', visibility);
    if (map.getLayer(dashLayerId)) map.setLayoutProperty(dashLayerId, 'visibility', visibility);

    // Gắn nhãn Badge tại tâm của từng đoạn đường sự cố
    if (showHotspotRoads && hotspotCorridors.length > 0) {
      hotspotCorridors.forEach(cor => {
        const badgeEl = document.createElement('div');
        badgeEl.style.cursor = 'pointer';
        badgeEl.innerHTML = `
          <div style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: ${cor.color}; color: white; border-radius: 9999px; font-weight: 800; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: 2px solid white; white-space: nowrap; transform: translateY(-50%); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-50%) scale(1.08)'" onmouseout="this.style.transform='translateY(-50%) scale(1)'">
            <span style="font-size: 12px;">⚠️</span>
            <span>${cor.shortName}: ${cor.incidentCount} sự cố</span>
          </div>
        `;

        badgeEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedCorridor(cor);
          setSelectedPoint(null);
          map.flyTo({
            center: cor.midpoint,
            zoom: 14.5,
            essential: true
          });
        });

        const marker = new goongjs.Marker(badgeEl)
          .setLngLat(cor.midpoint)
          .addTo(map);

        roadMarkersRef.current.push(marker);
      });
    }
  }, [hotspotCorridors, isMapReady, showHotspotRoads]);

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

          {/* Toggle bật/tắt Đoạn đường sự cố in đậm */}
          <button
            onClick={() => setShowHotspotRoads(!showHotspotRoads)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              showHotspotRoads 
                ? 'bg-red-50 text-red-700 border-red-300 shadow-xs' 
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
            title="Bật/Tắt in đậm các đoạn đường hay xảy ra sự cố từ dữ liệu cứu hộ"
          >
            <Route className="w-3.5 h-3.5 text-red-600" />
            Đoạn đường sự cố: {showHotspotRoads ? `BẬT (${hotspotCorridors.length})` : 'TẮT'}
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

          {/* Danh sách các đoạn đường sự cố in đậm */}
          {hotspotCorridors.length > 0 && showHotspotRoads && (
            <div className="pt-2 border-t border-gray-100 space-y-1.5">
              <div className="font-bold text-gray-800 flex items-center gap-1.5 text-[11px]">
                <Route className="w-3.5 h-3.5 text-red-600" />
                Đoạn đường hay xảy ra sự cố
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {hotspotCorridors.map(cor => (
                  <button
                    key={cor.id}
                    onClick={() => {
                      setSelectedCorridor(cor);
                      setSelectedPoint(null);
                      mapInstanceRef.current?.flyTo({
                        center: cor.midpoint,
                        zoom: 14.5,
                        essential: true
                      });
                    }}
                    className="w-full text-left p-1.5 rounded-lg hover:bg-red-50 flex items-center justify-between transition-colors border border-transparent hover:border-red-200 group"
                  >
                    <div className="truncate max-w-[155px]">
                      <span className="font-bold text-gray-800 block truncate group-hover:text-red-700 text-[11px]" title={cor.name}>
                        {cor.shortName}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${
                      cor.severity === 'HIGH'
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-orange-50 text-orange-600 border-orange-200'
                    }`}>
                      {cor.incidentCount} vụ
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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

          {/* Chú thích đoạn đường in đậm */}
          <div className="pt-2 border-t border-gray-100 space-y-1.5">
            <div className="font-bold text-gray-800 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-red-600" />
              Đoạn đường sự cố (In đậm)
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-6 h-2 rounded-full bg-red-600 border border-red-300 shadow-[0_0_6px_rgba(239,68,68,0.7)]"></span>
              <span className="font-semibold text-red-700 text-[11px]">Tuyến rủi ro cao (có sự cố nghiêm trọng)</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-6 h-2 rounded-full bg-orange-500 border border-orange-300 shadow-[0_0_6px_rgba(249,115,22,0.7)]"></span>
              <span className="font-semibold text-orange-700 text-[11px]">Tuyến mật độ sự cố trung bình</span>
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

        {/* Selected Road Corridor Drawer / Popup góc phải */}
        {selectedCorridor && (
          <div className="absolute top-4 right-4 z-10 w-84 bg-white/98 backdrop-blur-md p-4 rounded-2xl border border-red-200 shadow-xl space-y-3 pointer-events-auto transition-all animate-in fade-in slide-in-from-right-4">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${
                  selectedCorridor.severity === 'HIGH'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-orange-50 text-orange-600 border border-orange-200'
                }`}>
                  <AlertTriangle className="w-3 h-3" />
                  {selectedCorridor.severity === 'HIGH' ? 'Đoạn đường rủi ro cao' : 'Đoạn đường mật độ sự cố vừa'}
                </span>
                <h4 className="text-sm font-extrabold text-gray-900 mt-1">
                  {selectedCorridor.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedCorridor(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Tổng sự cố</span>
                  <span className="text-base font-black text-red-600">{selectedCorridor.incidentCount} vụ</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Nghiêm trọng</span>
                  <span className="text-base font-black text-red-600">{selectedCorridor.highCount} vụ</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-600 block mb-1">Các lỗi thường gặp trên đoạn:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedCorridor.mainIssues.map((issue, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      {issue}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-600 block mb-1">Các đơn cứu hộ ghi nhận trên tuyến:</span>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {selectedCorridor.incidents.map(inc => (
                    <button
                      key={inc.id}
                      onClick={() => {
                        setSelectedPoint(inc);
                        mapInstanceRef.current?.flyTo({ center: [inc.lng, inc.lat], zoom: 15.5, essential: true });
                      }}
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
                  <strong>Khuyến nghị:</strong> Tuyến này tập trung nhiều sự cố cứu hộ, hệ thống khuyến nghị các Gara đối tác lân cận bố trí xe và KTV túc trực.
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

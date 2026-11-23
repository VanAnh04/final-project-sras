import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapPin,
  Layers,
  Maximize2,
  Minimize2,
  Car,
  Bike,
  Clock,
  Info,
  ShieldAlert,
  Flame,
  Navigation,
  Route,
  AlertTriangle,
} from 'lucide-react';
import type { IncidentMapPoint } from '../../types/analytics';

interface Props {
  mapPoints: IncidentMapPoint[];
}

type SeverityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Google Maps Tile Layers (chuẩn hệ quy chiếu Google Maps WGS84 / Web Mercator)
const GOOGLE_ROADMAP_TILES = 'https://mt{s}.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}';
const GOOGLE_HYBRID_TILES = 'https://mt{s}.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}';
const DEFAULT_DANANG_CENTER: [number, number] = [16.005, 108.245];
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || '8f1VAgmuzADQcrpLGdxpWlFwAkO8ETyZQN6jzWWD';

/** Giải mã chuỗi Encoded Polyline (Google/Goong/OSRM) sang mảng tọa độ [lat, lng] */
function decodeRoadPolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/** Lấy tọa độ bám sát tim đường thực tế trên Google Maps qua OSRM / Goong Directions */
async function fetchSnappedRoadCoords(waypoints: [number, number][]): Promise<[number, number][] | null> {
  if (waypoints.length < 2) return null;

  // 1. Ưu tiên OSRM multi-waypoint driving route để bám khớp 100% qua tất cả các điểm neo trên đường
  try {
    const coordStr = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const json = await res.json();
      const coords = json?.routes?.[0]?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        return coords.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
      }
    }
  } catch {
    // Chuyển sang Goong Directions nếu OSRM bận
  }

  // 2. Fallback qua Goong Directions API từ điểm đầu tới điểm cuối
  try {
    const start = waypoints[0];
    const end = waypoints[waypoints.length - 1];
    const url = `https://rsapi.goong.io/Direction?origin=${start[0]},${start[1]}&destination=${end[0]},${end[1]}&vehicle=car&api_key=${GOONG_API_KEY}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const encoded = json?.routes?.[0]?.overview_polyline?.points;
      if (encoded) {
        const decoded = decodeRoadPolyline(encoded);
        if (decoded.length >= 2) return decoded;
      }
    }
  } catch {
    // Giữ tọa độ chuẩn mặc định
  }

  return null;
}

// ==================== ĐỊNH NGHĨA CÁC TUYẾN ĐƯỜNG HUYẾT MẠCH CHUẨN TỌA ĐỘ GOOGLE MAPS ====================
// Lưu ý: coordinates lưu theo chuẩn [lat, lng] bám đúng tim đường vàng trên Google Maps
interface RoadCorridorDef {
  id: string;
  name: string;
  shortName: string;
  keywords: string[];
  coordinates: [number, number][]; // [lat, lng]
}

const MASTER_ROAD_CORRIDORS: RoadCorridorDef[] = [
  {
    id: 'tran-dai-nghia',
    name: 'Tuyến Trần Đại Nghĩa - ĐT607 (Ngũ Hành Sơn - FPT City - Điện Ngọc)',
    shortName: 'Đường Trần Đại Nghĩa',
    keywords: [
      'trần đại nghĩa',
      'fpt',
      'làng đại học',
      'hòa quý',
      'hòa hải',
      'ngũ hành sơn',
      'đại nghĩa',
      'điện ngọc',
      'phạm như xương',
      'dt607',
      'đt607',
    ],
    // Tọa độ chuẩn dọc theo tim đường vàng ĐT607 / Trần Đại Nghĩa trên Google Maps
    coordinates: [
      [16.00295, 108.25905], // Đầu đường Trần Đại Nghĩa (giao Lê Văn Hiến - Non Nước)
      [15.99620, 108.26035], // Đoạn qua Phú Mỹ An
      [15.98825, 108.26180], // Giao lộ Mai Đăng Chơn - Trần Đại Nghĩa
      [15.98350, 108.26212], // Đoạn phía bắc KĐT FPT City
      [15.97865, 108.26228], // Ngã tư Nam Kỳ Khởi Nghĩa - Trần Đại Nghĩa
      [15.97210, 108.26155], // Đoạn qua CĐ Việt Hàn / FPT
      [15.96480, 108.26045], // Đoạn qua Làng Đại học / Điện Ngọc
      [15.95680, 108.25915], // Đoạn về Điện Bàn
    ],
  },
  {
    id: 'nam-ky-khoi-nghia',
    name: 'Trục Nam Kỳ Khởi Nghĩa (Chợ Khái Tây - Hòa Quý - FPT City)',
    shortName: 'Đường Nam Kỳ Khởi Nghĩa',
    keywords: ['nam kỳ khởi nghĩa', 'mai đăng chơn', 'nguyễn thức tự', 'nguyễn tạo', 'khái tây'],
    // Tọa độ chuẩn dọc theo tim đường vàng Nam Kỳ Khởi Nghĩa trên Google Maps
    coordinates: [
      [15.97485, 108.24620], // Cầu Khuê Đông / Võ Chí Công nối sang Nam Kỳ Khởi Nghĩa
      [15.97695, 108.25120], // Đoạn qua Chợ Khái Tây
      [15.97835, 108.25540], // Đoạn qua Làng Đại học Đà Nẵng
      [15.97855, 108.25890], // Đoạn gần giao lộ Trần Đại Nghĩa
      [15.97865, 108.26228], // Ngã tư giao Trần Đại Nghĩa (ĐT607)
      [15.97880, 108.26650], // Đoạn đi vào KĐT FPT City
    ],
  },
  {
    id: 'vo-nguyen-giap',
    name: 'Tuyến Ven biển Võ Nguyên Giáp - Trường Sa (Mỹ Khê - Non Nước)',
    shortName: 'Đường Võ Nguyên Giáp - Trường Sa',
    keywords: ['võ nguyên giáp', 'trường sa', 'lạc long quân', 'mỹ khê', 'non nước', 'resort'],
    coordinates: [
      [16.05900, 108.24680],
      [16.04200, 108.24850],
      [16.02500, 108.25210],
      [15.99950, 108.26360],
      [15.97650, 108.27350],
      [15.95500, 108.28380],
    ],
  },
  {
    id: 'le-van-hien',
    name: 'Tuyến Lê Văn Hiến (Ngũ Hành Sơn)',
    shortName: 'Đường Lê Văn Hiến',
    keywords: ['lê văn hiến', 'khuê mỹ', 'bệnh viện phụ sản nhi', 'tiên sơn'],
    coordinates: [
      [16.03480, 108.23920],
      [16.02150, 108.24650],
      [16.01050, 108.25480],
      [16.00295, 108.25905],
    ],
  },
  {
    id: 'nguyen-van-linh',
    name: 'Tuyến Nguyễn Văn Linh - Cầu Rồng - Võ Văn Kiệt',
    shortName: 'Đường Nguyễn Văn Linh - Cầu Rồng',
    keywords: ['nguyễn văn linh', 'cầu rồng', 'võ văn kiệt', 'hải châu', 'sân bay', 'sơn trà'],
    coordinates: [
      [16.05990, 108.20980],
      [16.06040, 108.21850],
      [16.06090, 108.22750],
      [16.06160, 108.23650],
      [16.06210, 108.24520],
    ],
  },
  {
    id: 'ql1a-truong-chinh',
    name: 'Trục Quốc Lộ 1A - Trường Chinh (Cẩm Lệ - Hòa Phước - Điện Bàn)',
    shortName: 'Quốc Lộ 1A - Trường Chinh',
    keywords: ['quốc lộ 1', 'ql1', 'trường chinh', 'hòa phước', 'hòa vang', 'cẩm lệ', 'điện bàn', 'hòa xuân'],
    coordinates: [
      [16.05450, 108.18350],
      [16.03150, 108.19450],
      [16.00900, 108.20280],
      [15.98450, 108.21350],
      [15.95950, 108.22380],
    ],
  },
  {
    id: 'dien-bien-phu',
    name: 'Trục Điện Biên Phủ - Tôn Đức Thắng (Liên Chiểu)',
    shortName: 'Đường Điện Biên Phủ - Tôn Đức Thắng',
    keywords: ['điện biên phủ', 'tôn đức thắng', 'ngã ba huế', 'liên chiểu'],
    coordinates: [
      [16.06590, 108.19350],
      [16.06650, 108.17950],
      [16.07450, 108.16350],
      [16.08250, 108.15100],
    ],
  },
  {
    id: '2-thang-9',
    name: 'Trục 2 Tháng 9 - Cách Mạng Tháng 8',
    shortName: 'Đường 2/9 - CMT8',
    keywords: ['2 tháng 9', 'cách mạng tháng 8', 'cmt8'],
    coordinates: [
      [16.05800, 108.22320],
      [16.04350, 108.22410],
      [16.02850, 108.22150],
      [16.01350, 108.21250],
    ],
  },
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
  coordinates: [number, number][]; // [lat, lng]
  midpoint: [number, number]; // [lat, lng]
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
    const [pLat, pLng] = polyline[i];
    const d = calculateDistanceKm(lat, lng, pLat, pLng);
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * Chọn tọa độ đặt nhãn tên đường sao cho:
 * 1. Nằm đúng trên tim đường của tuyến đó
 * 2. Cách xa các ghim sự cố và các nhãn tên đường khác để không bị đè chồng lên nhau
 */
function pickNonOverlappingBadgePoint(
  coords: [number, number][],
  incidentPts: [number, number][],
  usedBadges: [number, number][]
): [number, number] {
  if (coords.length === 0) return DEFAULT_DANANG_CENTER;
  if (coords.length <= 2) return coords[0];

  // Duyệt các điểm ứng viên nằm trong khoảng 18% -> 82% chiều dài tuyến đường
  const startIdx = Math.max(1, Math.floor(coords.length * 0.18));
  const endIdx = Math.min(coords.length - 1, Math.ceil(coords.length * 0.82));

  let bestPt = coords[Math.floor(coords.length / 2)];
  let bestScore = -Infinity;

  for (let i = startIdx; i < endIdx; i++) {
    const [lat, lng] = coords[i];

    // Khoảng cách nhỏ nhất tới các nhãn đường đã đặt trước đó (ưu tiên tránh trùng nhãn đường gấp 3 lần)
    let minBadgeDist = 999;
    for (const [bLat, bLng] of usedBadges) {
      const d = calculateDistanceKm(lat, lng, bLat, bLng);
      if (d < minBadgeDist) minBadgeDist = d;
    }

    // Khoảng cách nhỏ nhất tới các ghim sự cố
    let minPinDist = 999;
    for (const [pLat, pLng] of incidentPts) {
      const d = calculateDistanceKm(lat, lng, pLat, pLng);
      if (d < minPinDist) minPinDist = d;
    }

    const score = Math.min(minBadgeDist, 1.5) * 3 + Math.min(minPinDist, 0.8);
    if (score > bestScore) {
      bestScore = score;
      bestPt = coords[i];
    }
  }

  return bestPt;
}

export const IncidentHeatmapMap = ({ mapPoints }: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerGroupRef = useRef<any>(null);
  const roadsLayerGroupRef = useRef<any>(null);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [selectedPoint, setSelectedPoint] = useState<IncidentMapPoint | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<HotspotCorridor | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showHotspotRoads, setShowHotspotRoads] = useState<boolean>(true);
  const [mapLayerType, setMapLayerType] = useState<'ROADMAP' | 'HYBRID'>('ROADMAP');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Cache tọa độ đường bộ thực tế (đã snap theo khúc cua đường trên Google Maps) cho từng tuyến
  const [snappedCorridorPaths, setSnappedCorridorPaths] = useState<Record<string, [number, number][]>>({});
  const snappingIdsRef = useRef<Set<string>>(new Set());

  // Lọc toạ độ chuẩn trong lãnh thổ Việt Nam
  const validPoints = useMemo(() => {
    return (mapPoints || []).filter(p => {
      if (p.lat === null || p.lat === undefined || p.lng === null || p.lng === undefined) return false;
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      return !isNaN(lat) && !isNaN(lng) && lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;
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
    const map = new Map<
      string,
      { high: number; medium: number; low: number; total: number; latSum: number; lngSum: number }
    >();
    validPoints.forEach(p => {
      let region = 'Đà Nẵng';
      const addr = p.address || '';
      if (addr.includes('Ngũ Hành Sơn') || addr.includes('FPT') || addr.includes('Hòa Hải') || addr.includes('Hòa Quý')) {
        region = 'Ngũ Hành Sơn';
      } else if (addr.includes('Hải Châu')) {
        region = 'Hải Châu';
      } else if (addr.includes('Cẩm Lệ') || addr.includes('Hòa Xuân')) {
        region = 'Cẩm Lệ';
      } else if (addr.includes('Sơn Trà')) {
        region = 'Sơn Trà';
      } else if (addr.includes('Liên Chiểu')) {
        region = 'Liên Chiểu';
      } else if (addr.includes('Điện Bàn') || addr.includes('Điện Ngọc')) {
        region = 'Điện Bàn';
      } else if (addr.includes('Hội An')) {
        region = 'Hội An';
      }

      const curr = map.get(region) || { high: 0, medium: 0, low: 0, total: 0, latSum: 0, lngSum: 0 };
      curr.total++;
      curr.latSum += Number(p.lat);
      curr.lngSum += Number(p.lng);
      if (p.severity === 'HIGH') curr.high++;
      else if (p.severity === 'MEDIUM') curr.medium++;
      else curr.low++;
      map.set(region, curr);
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      high: data.high,
      medium: data.medium,
      low: data.low,
      total: data.total,
      lat: data.latSum / data.total,
      lng: data.lngSum / data.total,
    }));
  }, [validPoints]);

  // Phân tích và phát hiện các đoạn đường hay xảy ra sự cố từ dữ liệu cứu hộ
  const hotspotCorridors = useMemo<HotspotCorridor[]>(() => {
    if (validPoints.length === 0) return [];

    const corridorMap = new Map<
      string,
      {
        def: RoadCorridorDef;
        incidents: IncidentMapPoint[];
      }
    >();

    MASTER_ROAD_CORRIDORS.forEach(cor => {
      corridorMap.set(cor.id, { def: cor, incidents: [] });
    });

    const unmatchedPoints: IncidentMapPoint[] = [];

    validPoints.forEach(point => {
      const addrLower = (point.address || '').toLowerCase();
      let matchedId: string | null = null;

      for (const cor of MASTER_ROAD_CORRIDORS) {
        if (cor.keywords.some(k => addrLower.includes(k))) {
          matchedId = cor.id;
          break;
        }
      }

      if (!matchedId) {
        let bestDist = 1.5; // Bán kính 1.5km xung quanh tim đường
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

    corridorMap.forEach(({ def, incidents }) => {
      if (incidents.length === 0) return;

      const high = incidents.filter(p => p.severity === 'HIGH').length;
      const medium = incidents.filter(p => p.severity === 'MEDIUM').length;
      const low = incidents.filter(p => p.severity === 'LOW').length;

      const severity: 'HIGH' | 'MEDIUM' | 'LOW' = high > 0 ? 'HIGH' : medium > 0 ? 'MEDIUM' : 'LOW';
      const color = severity === 'HIGH' ? '#dc2626' : '#ea580c';
      const glowColor = severity === 'HIGH' ? '#ef4444' : '#f97316';

      const issueCountMap = new Map<string, number>();
      incidents.forEach(p => {
        const name = p.issueName || 'Sự cố khác';
        issueCountMap.set(name, (issueCountMap.get(name) || 0) + 1);
      });
      const topIssues = Array.from(issueCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count})`);

      const roadCoords = snappedCorridorPaths[def.id] || def.coordinates;
      const midIdx = Math.floor(roadCoords.length / 2);
      const midpoint = roadCoords[midIdx] || roadCoords[0];

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
        coordinates: roadCoords,
        midpoint,
      });
    });

    if (unmatchedPoints.length >= 2) {
      const sorted = [...unmatchedPoints].sort((a, b) => a.lat - b.lat || a.lng - b.lng);
      const rawCoords: [number, number][] = sorted.map(p => [Number(p.lat), Number(p.lng)]);
      const roadCoords = snappedCorridorPaths['cluster-unmatched'] || rawCoords;
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
        glowColor: severity === 'HIGH' ? '#ef4444' : '#f97316',
        coordinates: roadCoords,
        midpoint: roadCoords[Math.floor(roadCoords.length / 2)],
      });
    }

    return result.sort((a, b) => b.incidentCount - a.incidentCount || b.highCount - a.highCount);
  }, [validPoints, snappedCorridorPaths]);

  // Tự động lấy hình học khúc cua đường bộ thật (OSRM / Goong Directions) cho từng tuyến đường sự cố
  useEffect(() => {
    hotspotCorridors.forEach(cor => {
      if (snappedCorridorPaths[cor.id] || snappingIdsRef.current.has(cor.id)) return;
      const def = MASTER_ROAD_CORRIDORS.find(d => d.id === cor.id);
      const baseWaypoints = def ? def.coordinates : cor.coordinates;
      if (!baseWaypoints || baseWaypoints.length < 2) return;

      snappingIdsRef.current.add(cor.id);
      fetchSnappedRoadCoords(baseWaypoints)
        .then(snapped => {
          if (snapped && snapped.length >= 2) {
            setSnappedCorridorPaths(prev => ({ ...prev, [cor.id]: snapped }));
          }
        })
        .finally(() => {
          snappingIdsRef.current.delete(cor.id);
        });
    });
  }, [hotspotCorridors, snappedCorridorPaths]);

  // Bật / tắt chế độ phóng to toàn màn hình
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!isFullscreen) {
        setIsFullscreen(true);
        if (wrapperRef.current && wrapperRef.current.requestFullscreen && !document.fullscreenElement) {
          await wrapperRef.current.requestFullscreen().catch(() => {});
        }
      } else {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
      }
    } catch {
      setIsFullscreen(prev => !prev);
    } finally {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 60);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 220);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 60);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 220);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 60);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Khởi tạo Bản đồ Google Maps trên nền tảng Leaflet
  useEffect(() => {
    let checkInterval: any = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const map = L.map(mapContainerRef.current, {
          center: DEFAULT_DANANG_CENTER,
          zoom: 13,
          minZoom: 5,
          maxZoom: 20,
          zoomControl: false,
          attributionControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const tileUrl = mapLayerType === 'HYBRID' ? GOOGLE_HYBRID_TILES : GOOGLE_ROADMAP_TILES;
        const tileLayer = L.tileLayer(tileUrl, {
          subdomains: ['0', '1', '2', '3'],
          maxZoom: 20,
        }).addTo(map);

        const roadsLayerGroup = L.layerGroup().addTo(map);
        const markersLayerGroup = L.layerGroup().addTo(map);

        tileLayerRef.current = tileLayer;
        roadsLayerGroupRef.current = roadsLayerGroup;
        markersLayerGroupRef.current = markersLayerGroup;
        mapInstanceRef.current = map;
        setIsMapReady(true);

        setTimeout(() => map.invalidateSize(), 100);
        setTimeout(() => map.invalidateSize(), 300);
      } catch (err: any) {
        console.error('Lỗi khởi tạo Google Maps:', err);
        setMapError('Không thể khởi tạo bản đồ Google Maps: ' + (err?.message || 'Không xác định'));
      }
    };

    if ((window as any).L) {
      initMap();
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).L) {
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

  // Cập nhật lớp bản đồ (Giao thông / Vệ tinh)
  useEffect(() => {
    const tileUrl = mapLayerType === 'HYBRID' ? GOOGLE_HYBRID_TILES : GOOGLE_ROADMAP_TILES;
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(tileUrl);
    }
  }, [mapLayerType]);

  // Tự động đồng bộ kích thước container bằng ResizeObserver
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Căn toàn bộ điểm sự cố vào khung nhìn
  const fitAllBounds = useCallback(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    map.invalidateSize();
    const pts: [number, number][] = filteredPoints.map(p => [Number(p.lat), Number(p.lng)]);
    if (pts.length === 0) return;

    if (pts.length === 1) {
      map.setView(pts[0], 15, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds, {
      paddingTopLeft: [270, 50],
      paddingBottomRight: [60, 50],
      maxZoom: 15,
      animate: true,
    });
  }, [filteredPoints]);

  // Vẽ các Marker Sự cố và Vùng nhiệt Mức độ Nghiêm trọng trên Google Maps
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerGroupRef.current;
    if (!L || !map || !layerGroup || !isMapReady) return;

    layerGroup.clearLayers();

    filteredPoints.forEach(point => {
      const lat = Number(point.lat);
      const lng = Number(point.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      let pinColor = '#10b981'; // Xanh lá (Nhẹ)
      let haloColor = 'rgba(16, 185, 129, 0.22)';
      let borderColor = 'rgba(16, 185, 129, 0.65)';
      let haloSize = 68;

      if (point.severity === 'HIGH') {
        pinColor = '#ef4444'; // Đỏ (Nghiêm trọng)
        haloColor = 'rgba(239, 68, 68, 0.28)';
        borderColor = 'rgba(239, 68, 68, 0.8)';
        haloSize = 98;
      } else if (point.severity === 'MEDIUM') {
        pinColor = '#f97316'; // Cam (Trung bình)
        haloColor = 'rgba(249, 115, 22, 0.24)';
        borderColor = 'rgba(249, 115, 22, 0.7)';
        haloSize = 82;
      }

      const html = `
        <div style="
          position: absolute;
          left: 0;
          top: 0;
          width: ${haloSize}px;
          height: ${haloSize}px;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          pointer-events: auto;
        ">
          ${
            showZones
              ? `<div style="
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  border-radius: 9999px;
                  background-color: ${haloColor};
                  border: 1.5px dashed ${borderColor};
                  pointer-events: none;
                "></div>
                ${
                  point.severity === 'HIGH'
                    ? `<div style="
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        border-radius: 9999px;
                        background-color: ${haloColor};
                        animation: srasPulseGlow 2s infinite;
                        pointer-events: none;
                      "></div>`
                    : ''
                }`
              : ''
          }
          <div style="
            position: relative;
            width: 30px;
            height: 30px;
            border-radius: 9999px;
            background-color: ${pinColor};
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.38);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            z-index: 10;
          ">
            <span style="font-size: 14px; font-weight: 900; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">!</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-incident-heatmap-pin',
        html,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(layerGroup);

      marker.bindPopup(
        `<div style="padding: 10px 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; line-height: 1.4; min-width: 200px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 9px; height: 9px; border-radius: 9999px; background-color: ${pinColor};"></span>
              <strong style="color: #111827; font-size: 13px;">#${point.code}</strong>
            </div>
            <span style="font-size: 10px; font-weight: 800; color: ${pinColor}; background: #f8fafc; padding: 2px 6px; border-radius: 6px; border: 1px solid #e2e8f0;">
              ${point.severityLabel}
            </span>
          </div>
          <div style="color: ${pinColor}; font-weight: 800; margin-top: 5px;">${point.issueName}</div>
          <div style="color: #4b5563; font-size: 11px; margin-top: 3px; line-height: 1.35;">
            📍 ${point.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </div>
          <div style="color: #9ca3af; font-size: 10.5px; margin-top: 4px;">
            🕒 ${point.createdAtText || ''} • ${point.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'}
          </div>
        </div>`
      );

      marker.on('click', () => {
        setSelectedPoint(point);
        setSelectedCorridor(null);
      });
    });

    if (filteredPoints.length > 0) {
      fitAllBounds();
    }
  }, [filteredPoints, isMapReady, showZones, fitAllBounds]);

  // Vẽ và in đậm các đoạn đường hay xảy ra sự cố bám đúng tim đường trên Google Maps
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    const roadsGroup = roadsLayerGroupRef.current;
    if (!L || !map || !roadsGroup || !isMapReady) return;

    roadsGroup.clearLayers();

    if (!showHotspotRoads || hotspotCorridors.length === 0) return;

    const incidentPts: [number, number][] = filteredPoints.map(p => [Number(p.lat), Number(p.lng)]);
    const usedBadgePositions: [number, number][] = [];

    hotspotCorridors.forEach(cor => {
      // 1. Lớp viền phát quang (Glow Halo) dọc theo tim đường
      const glowLine = L.polyline(cor.coordinates, {
        color: cor.glowColor,
        weight: 16,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(roadsGroup);

      // 2. Lớp tim đường in đậm (Core Line)
      const coreLine = L.polyline(cor.coordinates, {
        color: cor.color,
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(roadsGroup);

      // 3. Lớp nét đứt cảnh báo màu trắng bên trên
      L.polyline(cor.coordinates, {
        color: '#ffffff',
        weight: 2,
        dashArray: '6, 8',
        opacity: 0.9,
        className: 'sras-animated-route',
      }).addTo(roadsGroup);

      const handleSelectCorridor = () => {
        setSelectedCorridor(cor);
        setSelectedPoint(null);
        const bounds = L.latLngBounds(cor.coordinates);
        map.fitBounds(bounds, {
          paddingTopLeft: [260, 80],
          paddingBottomRight: [340, 80],
          maxZoom: 15,
          animate: true,
        });
      };

      glowLine.on('click', handleSelectCorridor);
      coreLine.on('click', handleSelectCorridor);

      // 4. Chọn vị trí đặt nhãn tên đường trên tuyến sao cho không đè lên ghim sự cố và không trùng nhãn đường khác
      const badgePos = pickNonOverlappingBadgePoint(cor.coordinates, incidentPts, usedBadgePositions);
      usedBadgePositions.push(badgePos);

      const badgeHtml = `
        <div style="
          position: absolute;
          left: 0;
          top: 0;
          transform: translate(-50%, -100%);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: ${cor.color};
          color: #ffffff;
          border-radius: 9999px;
          font-weight: 800;
          font-size: 11px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          border: 2px solid #ffffff;
          white-space: nowrap;
          cursor: pointer;
          pointer-events: auto;
        ">
          <span style="font-size: 12px;">⚠️</span>
          <span>${cor.shortName}: ${cor.incidentCount} sự cố</span>
        </div>
      `;

      const badgeIcon = L.divIcon({
        className: 'custom-hotspot-road-badge',
        html: badgeHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const badgeMarker = L.marker(badgePos, { icon: badgeIcon }).addTo(roadsGroup);
      badgeMarker.on('click', handleSelectCorridor);
    });
  }, [hotspotCorridors, filteredPoints, isMapReady, showHotspotRoads]);

  // Bay đến một quận/huyện cụ thể
  const flyToRegion = (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([lat, lng], 14, { animate: true });
  };

  return (
    <div
      ref={wrapperRef}
      className={`bg-white shadow-sm overflow-hidden flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none border-0'
          : 'rounded-2xl border border-gray-100'
      }`}
    >
      {/* 1. Header & Bộ lọc mức độ */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">Bản đồ Sự cố & Mật độ Khu vực</h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                Google Maps
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Trực quan hóa vị trí cứu hộ theo tọa độ GPS và phân cấp mức độ nghiêm trọng
            </p>
          </div>
        </div>

        {/* Bộ lọc mức độ & Công cụ (căn phải gọn trên 1 hàng, nút phóng to nằm ở ngoài cùng góc phải) */}
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* Toggle bật/tắt Vùng nhiệt khu vực */}
          <button
            onClick={() => setShowZones(!showZones)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              showZones
                ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
            title="Bật/Tắt quầng sáng vùng mức độ nghiêm trọng khu vực"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Vùng khu vực: {showZones ? 'BẬT' : 'TẮT'}</span>
          </button>

          {/* Toggle bật/tắt Đoạn đường sự cố in đậm */}
          <button
            onClick={() => setShowHotspotRoads(!showHotspotRoads)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              showHotspotRoads
                ? 'bg-red-50 text-red-700 border-red-300 shadow-xs'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
            title="Bật/Tắt in đậm các đoạn đường hay xảy ra sự cố từ dữ liệu cứu hộ"
          >
            <Route className="w-3.5 h-3.5 text-red-600" />
            <span>Đoạn đường sự cố: {showHotspotRoads ? `BẬT (${hotspotCorridors.length})` : 'TẮT'}</span>
          </button>

          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              severityFilter === 'ALL'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả ({validPoints.length})
          </button>

          <button
            onClick={() => setSeverityFilter('HIGH')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              severityFilter === 'HIGH'
                ? 'bg-red-500 text-white shadow-xs'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>Nghiêm trọng ({highCount})</span>
          </button>

          <button
            onClick={() => setSeverityFilter('MEDIUM')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              severityFilter === 'MEDIUM'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
            }`}
          >
            🟠 Trung bình ({mediumCount})
          </button>

          <button
            onClick={() => setSeverityFilter('LOW')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              severityFilter === 'LOW'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            🟢 Nhẹ ({lowCount})
          </button>

          {/* Đổi lớp bản đồ Vệ tinh / Giao thông */}
          <button
            onClick={() => setMapLayerType(prev => (prev === 'ROADMAP' ? 'HYBRID' : 'ROADMAP'))}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              mapLayerType === 'HYBRID'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
            title="Chuyển đổi lớp bản đồ Vệ tinh / Giao thông"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mapLayerType === 'ROADMAP' ? 'Vệ tinh' : 'Bản đồ'}</span>
          </button>

          <button
            onClick={fitAllBounds}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
            title="Căn giữa toàn bộ điểm sự cố"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
              isFullscreen
                ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700'
                : 'bg-white text-gray-700 border-gray-200 hover:text-orange-600 hover:bg-orange-50'
            }`}
            title={isFullscreen ? 'Thu nhỏ màn hình (ESC)' : 'Phóng to toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Map Canvas & Overlay Details */}
      <div className={`relative w-full ${isFullscreen ? 'flex-1 min-h-0' : 'h-[580px]'} bg-gray-100`}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Nút Phóng to / Toàn màn hình nổi ở GÓC TRÊN PHẢI của bản đồ */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Thu nhỏ màn hình (ESC)' : 'Phóng to bản đồ toàn màn hình'}
          className="absolute top-3 right-3 z-20 bg-white/95 hover:bg-white text-gray-800 hover:text-orange-600 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-gray-200/90 flex items-center gap-1.5 text-xs font-extrabold transition-all cursor-pointer pointer-events-auto"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4 text-orange-600" />
              <span>Thoát toàn màn hình</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 text-orange-600" />
              <span>Phóng to</span>
            </>
          )}
        </button>

        {/* Thông báo lỗi nếu có */}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 z-20 p-4">
            <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-lg max-w-md text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <Info className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-gray-900">Không thể tải bản đồ Google Maps</p>
              <p className="text-xs text-gray-500">{mapError}</p>
            </div>
          </div>
        )}

        {/* Floating Card: Mật độ theo Địa bàn / Quận Huyện & Tuyến đường (Góc trên trái) */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-200 shadow-md text-xs space-y-2.5 pointer-events-auto max-w-[260px]">
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
                  className="w-full text-left p-1.5 rounded-lg hover:bg-orange-50 flex items-center justify-between transition-colors border border-transparent hover:border-orange-200 cursor-pointer"
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
                      const L = (window as any).L;
                      if (L && mapInstanceRef.current) {
                        const bounds = L.latLngBounds(cor.coordinates);
                        mapInstanceRef.current.fitBounds(bounds, {
                          paddingTopLeft: [260, 80],
                          paddingBottomRight: [340, 80],
                          maxZoom: 15,
                          animate: true,
                        });
                      }
                    }}
                    className="w-full text-left p-1.5 rounded-lg hover:bg-red-50 flex items-center justify-between transition-colors border border-transparent hover:border-red-200 group cursor-pointer"
                  >
                    <div className="truncate max-w-[160px]">
                      <span
                        className="font-bold text-gray-800 block truncate group-hover:text-red-700 text-[11px]"
                        title={cor.name}
                      >
                        {cor.shortName}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${
                        cor.severity === 'HIGH'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-orange-50 text-orange-600 border-orange-200'
                      }`}
                    >
                      {cor.incidentCount} vụ
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Legend Overlay góc trái dưới */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-gray-200 shadow-md text-xs space-y-2 pointer-events-auto">
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

        {/* Selected Incident Drawer / Popup góc phải (đặt dưới nút Phóng to top-14 right-3) */}
        {selectedPoint && (
          <div className="absolute top-14 right-3 z-20 w-80 bg-white/98 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl space-y-3 pointer-events-auto transition-all animate-in fade-in slide-in-from-right-4">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${
                    selectedPoint.severity === 'HIGH'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : selectedPoint.severity === 'MEDIUM'
                      ? 'bg-orange-50 text-orange-600 border border-orange-200'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  {selectedPoint.severityLabel}
                </span>
                <h4 className="text-sm font-extrabold text-gray-900 mt-1">Đơn: #{selectedPoint.code}</h4>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-lg">
                {selectedPoint.vehicleType === 'CAR' ? (
                  <Car className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <Bike className="w-4 h-4 text-orange-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold">{selectedPoint.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'}</span>
                  <span className="text-gray-400 mx-1">•</span>
                  <span className="font-semibold text-gray-900">{selectedPoint.issueName}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
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

        {/* Selected Road Corridor Drawer / Popup góc phải (đặt dưới nút Phóng to top-14 right-3) */}
        {selectedCorridor && (
          <div className="absolute top-14 right-3 z-20 w-84 bg-white/98 backdrop-blur-md p-4 rounded-2xl border border-red-200 shadow-xl space-y-3 pointer-events-auto transition-all animate-in fade-in slide-in-from-right-4">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${
                    selectedCorridor.severity === 'HIGH'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-orange-50 text-orange-600 border border-orange-200'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {selectedCorridor.severity === 'HIGH' ? 'Đoạn đường rủi ro cao' : 'Đoạn đường mật độ sự cố vừa'}
                </span>
                <h4 className="text-sm font-extrabold text-gray-900 mt-1">{selectedCorridor.name}</h4>
              </div>
              <button
                onClick={() => setSelectedCorridor(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
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
                        mapInstanceRef.current?.setView([Number(inc.lat), Number(inc.lng)], 16, { animate: true });
                      }}
                      className="w-full text-left p-2 rounded-lg bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-colors flex items-center justify-between text-[11px] cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-gray-900 block">#{inc.code}</span>
                        <span className="text-gray-500 text-[10px] truncate max-w-[150px] block">{inc.issueName}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          inc.severity === 'HIGH' ? 'text-red-600' : 'text-orange-600'
                        }`}
                      >
                        {inc.severityLabel.replace('Mức độ ', '')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2 bg-orange-50/70 rounded-xl border border-orange-200/80 text-[11px] text-orange-900 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Khuyến nghị:</strong> Tuyến này tập trung nhiều sự cố cứu hộ, hệ thống khuyến nghị các Gara đối
                  tác lân cận bố trí xe và KTV túc trực.
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

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  Navigation,
  AlertCircle,
  Layers,
  Radio,
  Wrench,
  AlertTriangle,
  Car,
  Bike,
  Clock,
  MapPin,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

// Tọa độ mặc định: Trung tâm Đà Nẵng [lat, lng]
const DEFAULT_CENTER_LAT_LNG: [number, number] = [16.0471, 108.2068];

// Google Maps Tile Layers (chuẩn hệ quy chiếu Google Maps WGS84 / Web Mercator)
const GOOGLE_ROADMAP_TILES = 'https://mt{s}.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}';
const GOOGLE_HYBRID_TILES = 'https://mt{s}.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}';

// Goong Directions API Key (giống bên App Nhân viên để lấy lộ trình đường bộ thực tế)
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || '8f1VAgmuzADQcrpLGdxpWlFwAkO8ETyZQN6jzWWD';

export interface RoadRouteInfo {
  /** Mảng tọa độ [lat, lng] dọc theo các tuyến đường bộ thực tế */
  coords: [number, number][];
  distanceKm: number;
  durationMin: number;
}

/** Giải mã chuỗi Google/Goong Encoded Polyline sang mảng [lat, lng] cho Leaflet */
function decodeRoadPolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b;
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

/** Lấy lộ trình dự đoán đường bộ thực tế (ưu tiên Goong Directions API như App Nhân viên, dự phòng OSRM Road Routing) */
async function fetchRoadRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  vehicle: 'car' | 'bike' = 'car'
): Promise<RoadRouteInfo | null> {
  // 1. Gọi Goong Direction API giống hệt App Mobile Nhân viên
  try {
    const params = new URLSearchParams({
      api_key: GOONG_API_KEY,
      origin: `${fromLat},${fromLng}`,
      destination: `${toLat},${toLng}`,
      vehicle,
    });
    const res = await fetch(`https://rsapi.goong.io/Direction?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      const encoded = route?.overview_polyline?.points;
      const leg = route?.legs?.[0];
      if (encoded) {
        const coords = decodeRoadPolyline(encoded);
        if (coords.length >= 2) {
          return {
            coords,
            distanceKm: leg?.distance?.value ? Math.round((leg.distance.value / 1000) * 100) / 100 : 0,
            durationMin: leg?.duration?.value ? Math.max(1, Math.round(leg.duration.value / 60)) : 1,
          };
        }
      }
    }
  } catch {
    // Chuyển sang OSRM nếu Goong hết quota hoặc lỗi mạng
  }

  // 2. Dự phòng OSRM Road Routing (bám sát mặt đường thực tế)
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=polyline`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route?.geometry) {
        const coords = decodeRoadPolyline(route.geometry);
        if (coords.length >= 2) {
          return {
            coords,
            distanceKm: route.distance ? Math.round((route.distance / 1000) * 100) / 100 : 0,
            durationMin: route.duration ? Math.max(1, Math.round(route.duration / 60)) : 1,
          };
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

export interface LiveGarageItem {
  id: number;
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  isOnline: boolean;
  capability?: string;
  avgRating?: number;
  ratingCount?: number;
  ownerName?: string;
  ownerPhone?: string;
  totalStaff: number;
  freeStaff: number;
  busyStaff: number;
  activeOrdersCount: number;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface LiveIncidentItem {
  id: number;
  code: string;
  status: string;
  vehicleType: string;
  issueType?: string;
  symptom: string;
  quoteType?: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  customerLat?: number | null;
  customerLng?: number | null;
  meetLat?: number | null;
  meetLng?: number | null;
  enRouteLat?: number | null;
  enRouteLng?: number | null;
  rescuerLat?: number | null;
  rescuerLng?: number | null;
  rescuerLocationAt?: string | null;
  rescuerLocationAgeSec?: number | null;
  remainingDistanceKm?: number | null;
  dispatchDistanceKm?: number | null;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerLicensePlate?: string;
  garageId?: number | null;
  garageName?: string | null;
  garagePhone?: string | null;
  garageLat?: number | null;
  garageLng?: number | null;
  staffId?: number | null;
  staffName?: string | null;
  staffPhone?: string | null;
  staffCode?: string | null;
  rescueVehiclePlate?: string | null;
  rescueVehicleKind?: string | null;
  createdAt?: string;
  enRouteAt?: string | null;
  arrivedAt?: string | null;
  breadcrumbs?: TrackPoint[];
}

export interface LiveSummaryStats {
  totalGarages: number;
  onlineGarages: number;
  offlineGarages: number;
  activeIncidentsCount: number;
  searchingIncidentsCount: number;
  enRouteIncidentsCount: number;
  onsiteIncidentsCount: number;
  activeRescuersCount: number;
}

interface PartnerGaragesMapProps {
  /** Chế độ toàn trang (/admin/live-map) hoặc nhúng trên Bảng điều khiển */
  fullPage?: boolean;
}

// Hàm tính khoảng cách Haversine (km) giữa 2 tọa độ GPS
function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(r * c * 100) / 100;
}

// Kiểm tra và chuẩn hóa tọa độ nếu bị lệch ra biển Đông khu vực Đà Nẵng - Quảng Nam
function sanitizeLandCoordinate(lat: number, lng: number, address: string): { lat: number; lng: number } {
  const addr = (address || '').toLowerCase();
  if (lat >= 15.95 && lat <= 16.09 && lng > 108.265) {
    return { lat: 16.0471, lng: 108.2068 };
  }
  if (lat >= 15.70 && lat < 15.95 && lng > 108.365) {
    if (addr.includes('hội an') || addr.includes('hoi an')) {
      return { lat: 15.8801, lng: 108.3280 };
    }
    if (addr.includes('điện bàn') || addr.includes('dien ban')) {
      return { lat: 15.8915, lng: 108.2485 };
    }
    return { lat: 15.8801, lng: 108.3280 };
  }
  return { lat, lng };
}

function getStatusMeta(status: string): { label: string; badgeBg: string; badgeText: string; dotColor: string } {
  switch (status) {
    case 'SEARCHING':
    case 'PENDING_GARAGE':
      return {
        label: 'Đang tìm Gara',
        badgeBg: '#fef2f2',
        badgeText: '#dc2626',
        dotColor: '#ef4444',
      };
    case 'ACCEPTED':
      return {
        label: 'Gara đã nhận - Chờ gán thợ',
        badgeBg: '#fff7ed',
        badgeText: '#ea580c',
        dotColor: '#f97316',
      };
    case 'ASSIGNED':
      return {
        label: 'Đã gán thợ - Chuẩn bị đi',
        badgeBg: '#eff6ff',
        badgeText: '#2563eb',
        dotColor: '#3b82f6',
      };
    case 'EN_ROUTE':
      return {
        label: 'Nhân viên đang di chuyển tới đơn',
        badgeBg: '#eff6ff',
        badgeText: '#1d4ed8',
        dotColor: '#2563eb',
      };
    case 'ARRIVED':
      return {
        label: 'Nhân viên đã tới hiện trường',
        badgeBg: '#f0fdf4',
        badgeText: '#15803d',
        dotColor: '#16a34a',
      };
    case 'DIAGNOSED':
      return {
        label: 'Đang chờ khách duyệt báo giá',
        badgeBg: '#fefce8',
        badgeText: '#a16207',
        dotColor: '#eab308',
      };
    case 'REPAIRING_ONSITE':
      return {
        label: 'Đang sửa chữa tại hiện trường',
        badgeBg: '#f0fdf4',
        badgeText: '#15803d',
        dotColor: '#10b981',
      };
    case 'TOWING':
    case 'TOW_TO_GARAGE':
      return {
        label: 'Đang kéo xe về Gara',
        badgeBg: '#faf5ff',
        badgeText: '#7e22ce',
        dotColor: '#9333ea',
      };
    case 'AWAITING_PAYMENT':
      return {
        label: 'Chờ thanh toán',
        badgeBg: '#ecfdf5',
        badgeText: '#047857',
        dotColor: '#10b981',
      };
    default:
      return {
        label: status,
        badgeBg: '#f1f5f9',
        badgeText: '#475569',
        dotColor: '#64748b',
      };
  }
}

function formatAgeSec(ageSec?: number | null): string {
  if (ageSec === null || ageSec === undefined) return 'Chưa có tín hiệu GPS mới';
  if (ageSec < 15) return 'Vừa cập nhật tức thì';
  if (ageSec < 60) return `${ageSec} giây trước`;
  const mins = Math.floor(ageSec / 60);
  if (mins < 60) return `${mins} phút trước`;
  return `${Math.floor(mins / 60)} giờ trước`;
}

export default function PartnerGaragesMap({ fullPage = false }: PartnerGaragesMapProps) {
  const navigate = useNavigate();

  // Map refs (Leaflet + Google Maps Tile Layer)
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const hasInitialFitRef = useRef<boolean>(false);

  // Modal map refs
  const modalMapContainerRef = useRef<HTMLDivElement>(null);
  const modalMapInstanceRef = useRef<any>(null);
  const modalTileLayerRef = useRef<any>(null);
  const modalLayerGroupRef = useRef<any>(null);

  const [garages, setGarages] = useState<LiveGarageItem[]>([]);
  const [incidents, setIncidents] = useState<LiveIncidentItem[]>([]);
  const [summary, setSummary] = useState<LiveSummaryStats>({
    totalGarages: 0,
    onlineGarages: 0,
    offlineGarages: 0,
    activeIncidentsCount: 0,
    searchingIncidentsCount: 0,
    enRouteIncidentsCount: 0,
    onsiteIncidentsCount: 0,
    activeRescuersCount: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [filterLayer, setFilterLayer] = useState<'ALL' | 'INCIDENTS' | 'GARAGES_ONLINE' | 'GARAGES_OFFLINE'>('ALL');
  const [mapLayerType, setMapLayerType] = useState<'ROADMAP' | 'HYBRID'>('ROADMAP');
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [roadRoutes, setRoadRoutes] = useState<Record<number, RoadRouteInfo>>({});
  const routeCacheRef = useRef<Map<number, { key: string; info: RoadRouteInfo }>>(new Map());
  const fetchingRoutesRef = useRef<Set<number>>(new Set());
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Bật / tắt chế độ phóng to toàn màn hình (Full Screen API + Full Viewport fallback)
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

  // Đồng bộ trạng thái khi người dùng bấm phím ESC thoát Fullscreen của trình duyệt
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      } else {
        setIsFullscreen(true);
      }
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

  const isFetchingRef = useRef<boolean>(false);

  // 1. Đồng bộ dữ liệu thời gian thực từ Backend (/api/admin/live-map/overview) + fallback (/admin/garages + /admin/technicians)
  const fetchLiveOverview = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (!isSilent) setLoading(true);
      const res: any = await axiosClient.get('/admin/live-map/overview');
      const data = res?.data;

      if (data) {
        const cleanedGarages: LiveGarageItem[] = [];
        (data.garages || []).forEach((g: any) => {
          let lat = Number(g.lat);
          let lng = Number(g.lng);
          if (isNaN(lat) || isNaN(lng)) return;
          if (lat >= 102 && lat <= 110 && lng >= 8 && lng <= 24) {
            const tmp = lat;
            lat = lng;
            lng = tmp;
          }
          if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
            const cleaned = sanitizeLandCoordinate(lat, lng, g.address || '');
            cleanedGarages.push({
              ...g,
              lat: cleaned.lat,
              lng: cleaned.lng,
              isOnline: Boolean(g.isOnline),
              totalStaff: g.totalStaff ?? 0,
              freeStaff: g.freeStaff ?? 0,
              busyStaff: g.busyStaff ?? 0,
              activeOrdersCount: g.activeOrdersCount ?? 0,
            });
          }
        });

        const cleanedIncidents: LiveIncidentItem[] = [];
        (data.activeIncidents || []).forEach((inc: any) => {
          let pLat = Number(inc.pickupLat);
          let pLng = Number(inc.pickupLng);
          if (isNaN(pLat) || isNaN(pLng)) return;
          if (pLat >= 102 && pLat <= 110 && pLng >= 8 && pLng <= 24) {
            const tmp = pLat;
            pLat = pLng;
            pLng = tmp;
          }
          cleanedIncidents.push({
            ...inc,
            pickupLat: pLat,
            pickupLng: pLng,
          });
        });

        setGarages(cleanedGarages);
        setIncidents(cleanedIncidents);
        if (data.summary) {
          setSummary(data.summary);
        } else {
          const onlineCnt = cleanedGarages.filter(g => g.isOnline).length;
          setSummary({
            totalGarages: cleanedGarages.length,
            onlineGarages: onlineCnt,
            offlineGarages: cleanedGarages.length - onlineCnt,
            activeIncidentsCount: cleanedIncidents.length,
            searchingIncidentsCount: cleanedIncidents.filter(i => i.status === 'SEARCHING' || i.status === 'PENDING_GARAGE').length,
            enRouteIncidentsCount: cleanedIncidents.filter(i => i.status === 'ACCEPTED' || i.status === 'ASSIGNED' || i.status === 'EN_ROUTE').length,
            onsiteIncidentsCount: cleanedIncidents.filter(i => !['SEARCHING', 'PENDING_GARAGE', 'ACCEPTED', 'ASSIGNED', 'EN_ROUTE'].includes(i.status)).length,
            activeRescuersCount: cleanedIncidents.filter(i => i.rescuerLat && i.rescuerLng).length,
          });
        }
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        return;
      }
    } catch {
      // Fallback sang /admin/garages + /admin/technicians + /admin/analytics/incidents nếu backend chưa restart với endpoint mới
      try {
        const [fallbackRes, techRes, incRes]: any = await Promise.all([
          axiosClient.get('/admin/garages', { params: { size: 100 } }),
          axiosClient.get('/admin/technicians', { params: { size: 200 } }).catch(() => null),
          axiosClient.get('/admin/analytics/incidents', { params: { range: '7_DAYS' } }).catch(() => null),
        ]);
        const rawList = fallbackRes?.data?.content || [];
        const techList: any[] = techRes?.data?.content || techRes?.content || (Array.isArray(techRes?.data) ? techRes.data : []);
        const mapPoints: any[] = incRes?.data?.mapPoints || incRes?.mapPoints || [];

        // Gom nhóm số lượng thợ rảnh / bận và danh sách thợ đang bận theo từng Gara
        const staffStatsByGarage = new Map<number, { total: number; free: number; busy: number; busyTechs: any[] }>();
        const allBusyTechs: any[] = [];
        techList.forEach((t: any) => {
          const gId = Number(t.garageId);
          if (!gId) return;
          const curr = staffStatsByGarage.get(gId) || { total: 0, free: 0, busy: 0, busyTechs: [] };
          curr.total += 1;
          if (t.status === 'FREE') {
            curr.free += 1;
          } else {
            curr.busy += 1;
            curr.busyTechs.push(t);
            allBusyTechs.push(t);
          }
          staffStatsByGarage.set(gId, curr);
        });

        const validGarages: LiveGarageItem[] = [];
        rawList.forEach((g: any) => {
          let lat = Number(g.lat);
          let lng = Number(g.lng);
          if (isNaN(lat) || isNaN(lng)) return;
          if (lat >= 102 && lat <= 110 && lng >= 8 && lng <= 24) {
            const temp = lat;
            lat = lng;
            lng = temp;
          }
          if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
            const cleaned = sanitizeLandCoordinate(lat, lng, g.address || '');
            const st = staffStatsByGarage.get(Number(g.id)) || { total: 0, free: 0, busy: 0, busyTechs: [] };
            validGarages.push({
              ...g,
              lat: cleaned.lat,
              lng: cleaned.lng,
              isOnline: Boolean(g.isOnline),
              totalStaff: st.total,
              freeStaff: st.free,
              busyStaff: st.busy,
              activeOrdersCount: st.busy,
            });
          }
        });

        // Lọc toàn bộ các đơn cứu hộ đang phát sinh (kể cả đơn mới tạo SEARCHING / PENDING_GARAGE chưa nhận/chưa gán và đơn đang xử lý)
        const FINISHED_STATUSES = ['PAID', 'RATED', 'CANCELLED', 'DECLINED', 'NO_GARAGE_FOUND'];
        const activePoints = mapPoints.filter((p: any) => p && !FINISHED_STATUSES.includes(String(p.status || '').toUpperCase()));

        const fallbackIncidents: LiveIncidentItem[] = [];
        let busyTechIdx = 0;

        activePoints.forEach((pt: any) => {
          let pLat = Number(pt.lat);
          let pLng = Number(pt.lng);
          if (isNaN(pLat) || isNaN(pLng)) return;
          if (pLat >= 102 && pLat <= 110 && pLng >= 8 && pLng <= 24) {
            const tmp = pLat;
            pLat = pLng;
            pLng = tmp;
          }
          const st = String(pt.status || 'SEARCHING').toUpperCase();
          const isSearchingOrPending = st === 'SEARCHING' || st === 'PENDING_GARAGE' || st === 'DRAFT';

          // Tìm Gara gần vị trí đơn nhất hoặc Gara có thợ đang thực hiện đơn
          let matchedTech: any = null;
          let matchedGarage: LiveGarageItem | null = null;

          if (!isSearchingOrPending && busyTechIdx < allBusyTechs.length) {
            matchedTech = allBusyTechs[busyTechIdx++];
            matchedGarage = validGarages.find(g => Number(g.id) === Number(matchedTech.garageId)) || null;
          }

          if (!matchedGarage && validGarages.length > 0) {
            // Tìm Gara online gần vị trí đơn nhất để vẽ tia điều phối
            let minDist = Infinity;
            validGarages.forEach(g => {
              if (!g.isOnline) return;
              const d = calcDistanceKm(pLat, pLng, g.lat, g.lng);
              if (d < minDist) {
                minDist = d;
                matchedGarage = g;
              }
            });
          }

          // Ưu tiên lấy trực tiếp tọa độ GPS thực tế của nhân viên từ Database (pt.rescuerLat, pt.rescuerLng) nếu có
          const dbRescuerLat = pt.rescuerLat != null ? Number(pt.rescuerLat) : null;
          const dbRescuerLng = pt.rescuerLng != null ? Number(pt.rescuerLng) : null;
          const gLat = pt.garageLat != null ? Number(pt.garageLat) : (matchedGarage ? matchedGarage.lat : null);
          const gLng = pt.garageLng != null ? Number(pt.garageLng) : (matchedGarage ? matchedGarage.lng : null);

          const liveRescuerLat = dbRescuerLat && !isNaN(dbRescuerLat) ? dbRescuerLat : (!isSearchingOrPending ? gLat : null);
          const liveRescuerLng = dbRescuerLng && !isNaN(dbRescuerLng) ? dbRescuerLng : (!isSearchingOrPending ? gLng : null);
          const remDist =
            liveRescuerLat !== null && liveRescuerLng !== null
              ? calcDistanceKm(liveRescuerLat, liveRescuerLng, pLat, pLng)
              : null;

          fallbackIncidents.push({
            id: Number(pt.id),
            code: pt.code || `RQ${pt.id}`,
            status: st,
            vehicleType: pt.vehicleType || 'CAR',
            issueType: pt.issueCode,
            symptom: pt.issueName || 'Yêu cầu cứu hộ phương tiện',
            quoteType: pt.quoteType || 'ONSITE',
            pickupLat: pLat,
            pickupLng: pLng,
            pickupAddress: pt.address || 'Vị trí khách gặp sự cố',
            rescuerLat: liveRescuerLat,
            rescuerLng: liveRescuerLng,
            rescuerLocationAgeSec: pt.rescuerLocationAgeSec != null ? Number(pt.rescuerLocationAgeSec) : (liveRescuerLat ? 1 : null),
            remainingDistanceKm: remDist,
            garageId: pt.garageId != null ? Number(pt.garageId) : (matchedGarage ? matchedGarage.id : null),
            garageName: pt.garageName || (matchedGarage ? matchedGarage.name : null),
            garagePhone: matchedGarage ? matchedGarage.phone : null,
            garageLat: gLat,
            garageLng: gLng,
            staffId: pt.staffId != null ? Number(pt.staffId) : (matchedTech ? matchedTech.id : null),
            staffName: pt.staffName || (matchedTech ? matchedTech.fullName : (!isSearchingOrPending ? 'Kỹ thuật viên cứu hộ' : null)),
            staffPhone: pt.staffPhone || (matchedTech ? matchedTech.phone : null),
            staffCode: matchedTech ? matchedTech.staffCode : null,
            rescueVehiclePlate: pt.rescueVehiclePlate || null,
            createdAt: pt.createdAtText,
          });
        });

        setGarages(validGarages);
        setIncidents(fallbackIncidents);
        const onlineCnt = validGarages.filter(g => g.isOnline).length;
        const totalBusy = validGarages.reduce((acc, g) => acc + g.busyStaff, 0);
        setSummary({
          totalGarages: validGarages.length,
          onlineGarages: onlineCnt,
          offlineGarages: validGarages.length - onlineCnt,
          activeIncidentsCount: fallbackIncidents.length,
          searchingIncidentsCount: fallbackIncidents.filter(i => i.status === 'SEARCHING' || i.status === 'PENDING_GARAGE').length,
          enRouteIncidentsCount: fallbackIncidents.filter(i => i.status === 'ACCEPTED' || i.status === 'ASSIGNED' || i.status === 'EN_ROUTE').length,
          onsiteIncidentsCount: fallbackIncidents.filter(i => !['SEARCHING', 'PENDING_GARAGE', 'ACCEPTED', 'ASSIGNED', 'EN_ROUTE'].includes(i.status)).length,
          activeRescuersCount: Math.max(totalBusy, fallbackIncidents.filter(i => i.rescuerLat && i.rescuerLng).length),
        });
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } catch (e) {
        console.warn('Lỗi đồng bộ bản đồ thời gian thực:', e);
      }
    } finally {
      isFetchingRef.current = false;
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Tự động poll dữ liệu thời gian thực mỗi 0.1 giây (100ms, có khóa chống chồng request)
  useEffect(() => {
    fetchLiveOverview(false);
    const interval = setInterval(() => {
      fetchLiveOverview(true);
    }, 100);
    return () => clearInterval(interval);
  }, [fetchLiveOverview]);

  // Đơn đang được chọn để theo dõi riêng biệt (nếu có)
  const activeSelectedIncident = useMemo(() => {
    if (selectedIncidentId === null) return null;
    return incidents.find(i => i.id === selectedIncidentId) || null;
  }, [incidents, selectedIncidentId]);

  // Nếu đơn đang chọn đã hoàn thành / biến mất khỏi danh sách active thì tự động bỏ chọn
  useEffect(() => {
    if (selectedIncidentId !== null && !incidents.some(i => i.id === selectedIncidentId)) {
      setSelectedIncidentId(null);
    }
  }, [incidents, selectedIncidentId]);

  // Lọc Gara và Sự cố theo bộ lọc đang chọn (Khi chọn 1 đơn cụ thể: ẩn toàn bộ các đơn và gara khác, chỉ giữ đúng đơn đó và gara phụ trách đơn đó)
  const displayedGarages = useMemo(() => {
    if (activeSelectedIncident) {
      if (activeSelectedIncident.garageId) {
        return garages.filter(g => Number(g.id) === Number(activeSelectedIncident.garageId));
      }
      return [];
    }
    if (filterLayer === 'INCIDENTS') return [];
    if (filterLayer === 'GARAGES_ONLINE') return garages.filter(g => g.isOnline);
    if (filterLayer === 'GARAGES_OFFLINE') return garages.filter(g => !g.isOnline);
    return garages;
  }, [garages, filterLayer, activeSelectedIncident]);

  const displayedIncidents = useMemo(() => {
    if (activeSelectedIncident) {
      return [activeSelectedIncident];
    }
    if (filterLayer === 'GARAGES_ONLINE' || filterLayer === 'GARAGES_OFFLINE') return [];
    return incidents;
  }, [incidents, filterLayer, activeSelectedIncident]);

  // Tự động tính toán dự đoán lộ trình đường bộ thực tế (Goong Directions / OSRM) cho từng đơn giống bên App Nhân viên
  useEffect(() => {
    incidents.forEach(inc => {
      const startLat = inc.rescuerLat ?? inc.garageLat;
      const startLng = inc.rescuerLng ?? inc.garageLng;
      const targetLat = inc.meetLat ?? inc.pickupLat;
      const targetLng = inc.meetLng ?? inc.pickupLng;

      if (!startLat || !startLng || !targetLat || !targetLng) return;

      // Làm tròn 4 chữ số thập phân (~11m) để cache, tự động tính lại lộ trình đường bộ khi nhân viên di chuyển mỗi ~11m
      const routeKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${targetLat.toFixed(4)},${targetLng.toFixed(4)}`;
      const cached = routeCacheRef.current.get(inc.id);
      if (cached && cached.key === routeKey) return;
      if (fetchingRoutesRef.current.has(inc.id)) return;

      fetchingRoutesRef.current.add(inc.id);
      const vehicle: 'car' | 'bike' = inc.vehicleType === 'MOTORBIKE' ? 'bike' : 'car';

      fetchRoadRoute(startLat, startLng, targetLat, targetLng, vehicle)
        .then(info => {
          if (info && info.coords.length >= 2) {
            routeCacheRef.current.set(inc.id, { key: routeKey, info });
            setRoadRoutes(prev => ({ ...prev, [inc.id]: info }));
          }
        })
        .finally(() => {
          fetchingRoutesRef.current.delete(inc.id);
        });
    });
  }, [incidents]);

  // HTML cho Marker Gara:
  // - Gara ĐANG HOẠT ĐỘNG (isOnline = true): Sáng rực, có vòng tỏa nhiệt Pulse Glow xanh lá + cam
  // - Gara KHÔNG HOẠT ĐỘNG (isOnline = false): Màu xám tối (dimmed), không phát sáng
  const buildGaragePinHtml = useCallback((garage: LiveGarageItem) => {
    const isOnline = garage.isOnline === true;
    const shortName = garage.name.length > 20 ? garage.name.substring(0, 19) + '…' : garage.name;
    const rating = garage.avgRating ? Number(garage.avgRating).toFixed(1) : null;

    if (isOnline) {
      return `
        <div style="
          position: absolute;
          left: 0;
          top: 0;
          transform: translate(-50%, -100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          user-select: none;
          pointer-events: auto;
          z-index: 35;
        ">
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <!-- Vòng phát sáng (Sáng rực cho Gara đang hoạt động) -->
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              padding: 10px 16px;
              border-radius: 9999px;
              background: rgba(16, 185, 129, 0.28);
              box-shadow: 0 0 18px rgba(16, 185, 129, 0.65);
              animation: srasPulseGlow 2s infinite;
              pointer-events: none;
            "></div>

            <div style="
              position: relative;
              background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
              border: 2px solid #10b981;
              border-radius: 9999px;
              padding: 4px 11px;
              box-shadow: 0 4px 16px rgba(16, 185, 129, 0.38), 0 0 10px rgba(16, 185, 129, 0.25);
              display: flex;
              align-items: center;
              gap: 6px;
              white-space: nowrap;
            ">
              <span style="
                width: 9px;
                height: 9px;
                border-radius: 50%;
                background: #10b981;
                box-shadow: 0 0 10px #10b981, 0 0 4px #059669;
                flex-shrink: 0;
              "></span>
              <span style="
                font-size: 11px;
                font-weight: 800;
                color: #064e3b;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              ">${shortName}</span>
              ${
                garage.activeOrdersCount > 0
                  ? `<span style="
                      font-size: 10px;
                      font-weight: 800;
                      color: #ffffff;
                      background: #ea580c;
                      padding: 1px 6px;
                      border-radius: 9999px;
                    ">${garage.activeOrdersCount} đơn</span>`
                  : rating
                  ? `<span style="
                      font-size: 10px;
                      font-weight: 800;
                      color: #ea580c;
                      background: #fff7ed;
                      padding: 1px 4px;
                      border-radius: 4px;
                    ">★ ${rating}</span>`
                  : ''
              }
            </div>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid #10b981;
            margin-top: -1px;
          "></div>
          <div style="
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #10b981;
            border: 1.5px solid #ffffff;
            box-shadow: 0 0 8px #10b981;
            margin-top: -1px;
          "></div>
        </div>
      `;
    }

    // Gara KHÔNG hoạt động (Offline / Đang nghỉ): Hiển thị tối/mờ
    return `
      <div style="
        position: absolute;
        left: 0;
        top: 0;
        transform: translate(-50%, -100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        user-select: none;
        pointer-events: auto;
        opacity: 0.72;
        z-index: 15;
      ">
        <div style="
          background: #f1f5f9;
          border: 1.5px dashed #94a3b8;
          border-radius: 9999px;
          padding: 3.5px 9px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        ">
          <span style="
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #94a3b8;
            flex-shrink: 0;
          "></span>
          <span style="
            font-size: 10.5px;
            font-weight: 700;
            color: #64748b;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">${shortName} (Nghỉ)</span>
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid #94a3b8;
          margin-top: -1px;
        "></div>
      </div>
    `;
  }, []);

  // HTML cho Marker Vị trí Đơn cứu hộ (Sự cố của Khách hàng)
  const buildIncidentPinHtml = useCallback((inc: LiveIncidentItem) => {
    const isSearching = inc.status === 'SEARCHING' || inc.status === 'PENDING_GARAGE';
    const isEnRoute = inc.status === 'ACCEPTED' || inc.status === 'ASSIGNED' || inc.status === 'EN_ROUTE';
    const mainColor = isSearching ? '#dc2626' : isEnRoute ? '#ea580c' : '#16a34a';
    const pulseBg = isSearching
      ? 'rgba(220, 38, 38, 0.35)'
      : isEnRoute
      ? 'rgba(234, 88, 12, 0.3)'
      : 'rgba(22, 163, 74, 0.28)';
    const vehicleIcon = inc.vehicleType === 'CAR' ? '🚗' : '🏍️';

    return `
      <div style="
        position: absolute;
        left: 0;
        top: 0;
        transform: translate(-50%, -100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        user-select: none;
        pointer-events: auto;
        z-index: 50;
      ">
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 9999px;
            background: ${pulseBg};
            animation: srasPulseGlow 1.5s infinite;
            pointer-events: none;
          "></div>
          <div style="
            position: relative;
            background: ${mainColor};
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 9999px;
            padding: 4px 10px;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.32);
            display: flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
          ">
            <span style="font-size: 12px;">🚨</span>
            <span style="
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 0.2px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">Đơn #${inc.code}</span>
            <span style="
              font-size: 10px;
              background: rgba(255,255,255,0.22);
              padding: 1px 5px;
              border-radius: 9999px;
              font-weight: 800;
            ">${vehicleIcon}</span>
          </div>
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 7px solid ${mainColor};
          margin-top: -1px;
        "></div>
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${mainColor};
          border: 2px solid #ffffff;
          box-shadow: 0 0 10px ${mainColor};
          margin-top: -1px;
        "></div>
      </div>
    `;
  }, []);

  // HTML cho Marker Nhân viên cứu hộ đang thực hiện đơn (Real-time GPS Rescuer Marker)
  const buildRescuerPinHtml = useCallback(
    (inc: LiveIncidentItem) => {
      const staffName = inc.staffName || 'Kỹ thuật viên';
      const shortStaff = staffName.length > 16 ? staffName.substring(0, 15) + '…' : staffName;
      const roadInfo = roadRoutes[inc.id];
      const distVal = roadInfo?.distanceKm ?? inc.remainingDistanceKm;
      const distText =
        distVal !== null && distVal !== undefined
          ? `${distVal} km${roadInfo?.durationMin ? ` (${roadInfo.durationMin}p)` : ''}`
          : '';

    return `
      <div style="
        position: absolute;
        left: 0;
        top: 0;
        transform: translate(-50%, -100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        user-select: none;
        pointer-events: auto;
        z-index: 60;
      ">
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 9999px;
            background: rgba(37, 99, 235, 0.32);
            animation: srasPulseGlow 1.6s infinite;
            pointer-events: none;
          "></div>
          <div style="
            position: relative;
            background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 9999px;
            padding: 4px 10px;
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.45);
            display: flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
          ">
            <span style="font-size: 12px;">🛠️</span>
            <span style="
              font-size: 11px;
              font-weight: 800;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">${shortStaff}</span>
            ${
              distText
                ? `<span style="
                    font-size: 10px;
                    font-weight: 800;
                    background: #ffffff;
                    color: #1d4ed8;
                    padding: 1px 5px;
                    border-radius: 9999px;
                  ">→ ${distText}</span>`
                : ''
            }
          </div>
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 7px solid #2563eb;
          margin-top: -1px;
        "></div>
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2563eb;
          border: 2px solid #ffffff;
          box-shadow: 0 0 8px #2563eb;
          margin-top: -1px;
        "></div>
      </div>
    `;
    },
    [roadRoutes]
  );

  // Nội dung Popup chi tiết Gara
  const createGaragePopupContent = useCallback((garage: LiveGarageItem, prefix = 'inline') => {
    const isOnline = garage.isOnline === true;
    const rating = garage.avgRating ? Number(garage.avgRating).toFixed(1) : null;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${garage.lat},${garage.lng}`;

    const statusLabel = isOnline
      ? '<span style="color:#10b981; font-weight:800;">🟢 ĐANG HOẠT ĐỘNG (SÁNG)</span>'
      : '<span style="color:#64748b; font-weight:700;">⚪ KHÔNG HOẠT ĐỘNG (NGHỈ)</span>';

    return `
      <div style="padding: 12px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 240px; max-width: 290px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.3;">${garage.name}</h4>
          ${rating ? `<span style="color:#ea580c; background:#fff7ed; padding:2px 6px; border-radius:6px; font-size:10px; font-weight:800;">★ ${rating}</span>` : ''}
        </div>
        
        <div style="font-size: 11px; margin-bottom: 8px;">
          ${statusLabel}
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #f8fafc; padding: 7px 8px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px; text-align: center;">
          <div>
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">NHÂN VIÊN RẢNH</div>
            <div style="font-size: 12px; font-weight: 900; color: #10b981;">${garage.freeStaff}/${garage.totalStaff}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">ĐANG ĐI ĐƠN</div>
            <div style="font-size: 12px; font-weight: 900; color: #2563eb;">${garage.busyStaff}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">ĐƠN HIỆN TẠI</div>
            <div style="font-size: 12px; font-weight: 900; color: #ea580c;">${garage.activeOrdersCount}</div>
          </div>
        </div>

        <p style="font-size: 11px; color: #475569; margin: 0 0 5px 0; line-height: 1.4;">
          📍 ${garage.address || 'Chưa cập nhật địa chỉ'}
        </p>

        <div style="font-size: 11px; color: #64748b; margin-bottom: 10px;">
          📞 <strong>${garage.phone || garage.ownerPhone || 'Chưa có SĐT'}</strong>
          ${garage.ownerName ? ` • ${garage.ownerName}` : ''}
        </div>

        <div style="display: flex; gap: 6px;">
          <button 
            id="btn-manage-garage-${prefix}-${garage.id}" 
            style="
              flex: 1;
              background: #ea580c;
              color: #ffffff;
              font-size: 11px;
              font-weight: 700;
              padding: 6px 10px;
              border: none;
              border-radius: 8px;
              cursor: pointer;
            "
          >
            Chi tiết Gara →
          </button>
          <a
            href="${googleMapsUrl}"
            target="_blank"
            rel="noreferrer"
            style="
              background: #eff6ff;
              color: #2563eb;
              border: 1px solid #bfdbfe;
              font-size: 11px;
              font-weight: 700;
              padding: 6px 8px;
              border-radius: 8px;
              text-decoration: none;
            "
          >
            Google Map ↗
          </a>
        </div>
      </div>
    `;
  }, []);

  // Nội dung Popup chi tiết Đơn cứu hộ & Vị trí nhân viên
  const createIncidentPopupContent = useCallback((inc: LiveIncidentItem) => {
    const meta = getStatusMeta(inc.status);
    const ageLabel = formatAgeSec(inc.rescuerLocationAgeSec);

    return `
      <div style="padding: 12px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 255px; max-width: 310px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <span style="font-size: 13px; font-weight: 900; color: #0f172a;">🚨 Đơn cứu hộ #${inc.code}</span>
          <span style="background: ${meta.badgeBg}; color: ${meta.badgeText}; padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 800;">
            ${meta.label}
          </span>
        </div>

        <div style="font-size: 11px; color: #334155; margin-bottom: 6px; background: #fff7ed; padding: 6px 8px; border-radius: 8px; border: 1px solid #ffedd5;">
          <div><strong>Sự cố:</strong> ${inc.symptom || inc.issueType || 'Cứu hộ phương tiện'}</div>
          <div><strong>Khách hàng:</strong> ${inc.customerName || 'Khách'} • 📞 ${inc.customerPhone || 'N/A'}</div>
          ${inc.customerLicensePlate ? `<div><strong>Biển số khách:</strong> ${inc.customerLicensePlate}</div>` : ''}
        </div>

        <p style="font-size: 11px; color: #475569; margin: 0 0 8px 0; line-height: 1.35;">
          📍 <strong>Vị trí đơn:</strong> ${inc.pickupAddress || `${inc.pickupLat.toFixed(4)}, ${inc.pickupLng.toFixed(4)}`}
        </p>

        ${
          inc.staffName
            ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 7px 9px; font-size: 11px; color: #1e3a8a; space-y: 3px;">
                <div style="font-weight: 800; color: #1d4ed8; margin-bottom: 3px;">
                  🛠️ Nhân viên thực hiện: ${inc.staffName}
                </div>
                <div>📞 SĐT thợ: <strong>${inc.staffPhone || 'N/A'}</strong> ${inc.rescueVehiclePlate ? `• Xe: <strong>${inc.rescueVehiclePlate}</strong>` : ''}</div>
                <div>🏢 Gara: <strong>${inc.garageName || 'N/A'}</strong></div>
                ${
                  inc.remainingDistanceKm !== null && inc.remainingDistanceKm !== undefined
                    ? `<div style="margin-top: 4px; font-weight: 800; color: #dc2626;">
                        📏 Khoảng cách tới vị trí đơn: ${inc.remainingDistanceKm} km
                      </div>`
                    : ''
                }
                <div style="font-size: 10px; color: #3b82f6; margin-top: 2px;">
                  📡 GPS nhân viên (` + '`rescue_requests.rescuer_lat/lng`' + `): ${ageLabel}
                </div>
              </div>`
            : `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 6px 8px; font-size: 11px; color: #b91c1c; font-weight: 700;">
                ⏳ Đang điều phối tìm Gara và gán Kỹ thuật viên...
              </div>`
        }
      </div>
    `;
  }, []);

  // Helper căn chỉnh khung nhìn bao quát toàn bộ Gara & Đơn sự cố
  const fitAllMapPoints = useCallback(
    (map: any) => {
      const L = (window as any).L;
      if (!L || !map) return;

      map.invalidateSize();
      const pts: [number, number][] = [];

      displayedGarages.forEach(g => pts.push([g.lat, g.lng]));
      displayedIncidents.forEach(inc => {
        pts.push([inc.pickupLat, inc.pickupLng]);
        if (inc.rescuerLat && inc.rescuerLng) {
          pts.push([inc.rescuerLat, inc.rescuerLng]);
        }
      });

      if (pts.length === 0) return;
      if (pts.length === 1) {
        map.setView(pts[0], 14, { animate: true });
        return;
      }

      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, {
        paddingTopLeft: [50, 75],
        paddingBottomRight: [50, 45],
        maxZoom: 14,
        animate: true,
      });
    },
    [displayedGarages, displayedIncidents]
  );

  // Bay cận cảnh tới 1 Đơn cứu hộ (bấm lần 1 để chỉ hiển thị riêng đơn đó, bấm lại lần 2 để hiện lại tất cả)
  const focusOnIncident = useCallback(
    (inc: LiveIncidentItem, targetMap?: any) => {
      const L = (window as any).L;
      const map = targetMap || mapInstanceRef.current;
      if (!L || !map) return;

      if (selectedIncidentId === inc.id) {
        setSelectedIncidentId(null);
        return;
      }

      setSelectedIncidentId(inc.id);
      map.invalidateSize();

      const startLat = inc.rescuerLat ?? inc.garageLat;
      const startLng = inc.rescuerLng ?? inc.garageLng;
      const roadInfo = roadRoutes[inc.id];

      if (roadInfo && roadInfo.coords && roadInfo.coords.length >= 2) {
        const bounds = L.latLngBounds([
          ...roadInfo.coords,
          [inc.pickupLat, inc.pickupLng],
          ...(startLat && startLng ? [[startLat, startLng]] : []),
        ]);
        map.fitBounds(bounds, {
          paddingTopLeft: [70, 90],
          paddingBottomRight: [70, 70],
          maxZoom: 16,
          animate: true,
        });
      } else if (startLat && startLng) {
        const bounds = L.latLngBounds([
          [inc.pickupLat, inc.pickupLng],
          [startLat, startLng],
        ]);
        map.fitBounds(bounds, {
          paddingTopLeft: [80, 100],
          paddingBottomRight: [80, 80],
          maxZoom: 16,
          animate: true,
        });
      } else {
        map.setView([inc.pickupLat, inc.pickupLng], 15, { animate: true });
      }
    },
    [selectedIncidentId, roadRoutes]
  );

  // 2. Khởi tạo Inline Map
  useEffect(() => {
    let checkInterval: any = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const map = L.map(mapContainerRef.current, {
          center: DEFAULT_CENTER_LAT_LNG,
          zoom: 12,
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

        const layerGroup = L.layerGroup().addTo(map);

        tileLayerRef.current = tileLayer;
        layerGroupRef.current = layerGroup;
        mapInstanceRef.current = map;
        setIsMapReady(true);

        setTimeout(() => map.invalidateSize(), 100);
        setTimeout(() => map.invalidateSize(), 350);
      } catch (err: any) {
        console.error('Lỗi khởi tạo Google Maps:', err);
        setMapError('Không thể khởi tạo bản đồ Google Maps: ' + (err?.message || 'Lỗi không xác định'));
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

  // Cập nhật lớp bản đồ (Roadmap / Vệ tinh)
  useEffect(() => {
    const tileUrl = mapLayerType === 'HYBRID' ? GOOGLE_HYBRID_TILES : GOOGLE_ROADMAP_TILES;
    if (tileLayerRef.current) tileLayerRef.current.setUrl(tileUrl);
    if (modalTileLayerRef.current) modalTileLayerRef.current.setUrl(tileUrl);
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

  // Hàm vẽ toàn bộ Gara (Sáng/Tối) + Đơn cứu hộ + Nhân viên + Đường nối trên 1 LayerGroup
  const renderLiveLayers = useCallback(
    (map: any, layerGroup: any, prefix: string) => {
      const L = (window as any).L;
      if (!L || !map || !layerGroup) return;

      layerGroup.clearLayers();

      // A. Vẽ tất cả Gara (Online phát sáng, Offline xám mờ)
      displayedGarages.forEach(garage => {
        const icon = L.divIcon({
          className: 'custom-live-garage-pin',
          html: buildGaragePinHtml(garage),
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          popupAnchor: [0, -34],
        });

        const marker = L.marker([garage.lat, garage.lng], { icon }).addTo(layerGroup);
        marker.bindPopup(createGaragePopupContent(garage, prefix), {
          maxWidth: 300,
          minWidth: 240,
        });

        marker.on('popupopen', () => {
          setTimeout(() => {
            const btn = document.getElementById(`btn-manage-garage-${prefix}-${garage.id}`);
            if (btn) {
              btn.onclick = () => {
                navigate(`/admin/garages?tab=ALL&search=${encodeURIComponent(garage.name)}`);
              };
            }
          }, 50);
        });
      });

      // B. Vẽ các Đơn cứu hộ đang diễn ra + Vị trí Nhân viên + Đường nối hành trình
      displayedIncidents.forEach(inc => {
        const targetLat = inc.meetLat ?? inc.pickupLat;
        const targetLng = inc.meetLng ?? inc.pickupLng;
        const isSearchingOrPending =
          inc.status === 'SEARCHING' || inc.status === 'PENDING_GARAGE' || inc.status === 'DRAFT';

        // 1. Nếu có lịch sử đường đi (breadcrumbs từ bảng location_tracks), vẽ vết đường đã đi
        if (inc.breadcrumbs && inc.breadcrumbs.length >= 2) {
          const trailCoords = inc.breadcrumbs.map(b => [b.lat, b.lng]);
          L.polyline(trailCoords, {
            color: '#60a5fa',
            weight: 4,
            opacity: 0.75,
          }).addTo(layerGroup);
        } else if (inc.garageLat && inc.garageLng && inc.rescuerLat && inc.rescuerLng) {
          // Đường mảnh nối từ Gara xuất phát tới vị trí hiện tại của Nhân viên
          L.polyline(
            [
              [inc.garageLat, inc.garageLng],
              [inc.rescuerLat, inc.rescuerLng],
            ],
            {
              color: '#94a3b8',
              weight: 2.5,
              dashArray: '4, 6',
              opacity: 0.7,
            }
          ).addTo(layerGroup);
        }

        // 2. Đường dự đoán lộ trình đường bộ tới vị trí đơn (giống bên App Nhân viên):
        // Ưu tiên vẽ theo tọa độ khúc cua đường bộ thực tế (roadRoutes[inc.id].coords từ Goong Directions / OSRM),
        // trong lúc đang tải API đường bộ (<0.2s đầu) mới vẽ tạm đường nối.
        const startLat = inc.rescuerLat ?? inc.garageLat;
        const startLng = inc.rescuerLng ?? inc.garageLng;

        if (startLat && startLng) {
          const routeColor = isSearchingOrPending ? '#f97316' : '#2563eb';
          const roadInfo = roadRoutes[inc.id];
          let pathCoords: [number, number][] = [
            [startLat, startLng],
            [targetLat, targetLng],
          ];

          if (roadInfo && roadInfo.coords && roadInfo.coords.length >= 2) {
            // Tìm điểm trên lộ trình đường bộ gần vị trí hiện tại của nhân viên nhất để cắt bỏ đoạn đường đã đi qua
            let closestIdx = 0;
            let minDistSq = Infinity;
            for (let idx = 0; idx < roadInfo.coords.length; idx++) {
              const [pLat, pLng] = roadInfo.coords[idx];
              const dSq = (pLat - startLat) * (pLat - startLat) + (pLng - startLng) * (pLng - startLng);
              if (dSq < minDistSq) {
                minDistSq = dSq;
                closestIdx = idx;
              }
            }
            const remainingWaypoints = roadInfo.coords.slice(closestIdx + 1, -1);
            pathCoords = [[startLat, startLng], ...remainingWaypoints, [targetLat, targetLng]];
          }

          // Lớp viền phát sáng (Halo) dọc theo tuyến đường bộ
          L.polyline(pathCoords, {
            color: routeColor,
            weight: 9,
            opacity: 0.25,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(layerGroup);

          // Lớp lõi đường bộ đậm rõ nét như bản đồ dẫn đường của nhân viên
          L.polyline(pathCoords, {
            color: routeColor,
            weight: 4.5,
            opacity: 0.92,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(layerGroup);

          // Lớp mũi tên / vạch điều hướng chuyển động bên trên lộ trình
          L.polyline(pathCoords, {
            color: '#ffffff',
            weight: 2,
            dashArray: '8, 10',
            opacity: 0.85,
            className: 'sras-animated-route',
          }).addTo(layerGroup);
        }

        // 2.5. Marker Nhân viên cứu hộ (nếu đã có nhân viên hoặc đang di chuyển)
        if (inc.rescuerLat && inc.rescuerLng && !isSearchingOrPending) {
          const rescuerIcon = L.divIcon({
            className: 'custom-live-rescuer-pin',
            html: buildRescuerPinHtml(inc),
            iconSize: [0, 0],
            iconAnchor: [0, 0],
            popupAnchor: [0, -34],
          });

          const rescuerMarker = L.marker([inc.rescuerLat, inc.rescuerLng], {
            icon: rescuerIcon,
          }).addTo(layerGroup);

          rescuerMarker.bindPopup(createIncidentPopupContent(inc), {
            maxWidth: 320,
            minWidth: 255,
          });
        }

        // 3. Marker Vị trí Đơn cứu hộ (Khách hàng)
        const incidentIcon = L.divIcon({
          className: 'custom-live-incident-pin',
          html: buildIncidentPinHtml(inc),
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          popupAnchor: [0, -36],
        });

        const incidentMarker = L.marker([targetLat, targetLng], {
          icon: incidentIcon,
        }).addTo(layerGroup);

        incidentMarker.bindPopup(createIncidentPopupContent(inc), {
          maxWidth: 320,
          minWidth: 255,
        });
      });
    },
    [
      displayedGarages,
      displayedIncidents,
      roadRoutes,
      buildGaragePinHtml,
      buildIncidentPinHtml,
      buildRescuerPinHtml,
      createGaragePopupContent,
      createIncidentPopupContent,
      navigate,
    ]
  );

  // 3. Cập nhật các Marker trên Inline Map mỗi khi dữ liệu thời gian thực thay đổi
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !layerGroupRef.current) return;

    renderLiveLayers(mapInstanceRef.current, layerGroupRef.current, 'inline');

    if (!hasInitialFitRef.current && (displayedGarages.length > 0 || displayedIncidents.length > 0)) {
      hasInitialFitRef.current = true;
      fitAllMapPoints(mapInstanceRef.current);
    }
  }, [isMapReady, displayedGarages, displayedIncidents, renderLiveLayers, fitAllMapPoints]);

  // 4. Quản lý Modal Popup Phóng To
  useEffect(() => {
    const L = (window as any).L;
    if (!isExpanded || !L) return;

    let modalMap: any = null;
    let ro: ResizeObserver | null = null;

    const timer = setTimeout(() => {
      if (!modalMapContainerRef.current) return;

      try {
        modalMap = L.map(modalMapContainerRef.current, {
          center: DEFAULT_CENTER_LAT_LNG,
          zoom: 12,
          minZoom: 5,
          maxZoom: 20,
          zoomControl: false,
          attributionControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(modalMap);

        const tileUrl = mapLayerType === 'HYBRID' ? GOOGLE_HYBRID_TILES : GOOGLE_ROADMAP_TILES;
        const tileLayer = L.tileLayer(tileUrl, {
          subdomains: ['0', '1', '2', '3'],
          maxZoom: 20,
        }).addTo(modalMap);

        const modalLayerGroup = L.layerGroup().addTo(modalMap);

        modalTileLayerRef.current = tileLayer;
        modalLayerGroupRef.current = modalLayerGroup;
        modalMapInstanceRef.current = modalMap;

        ro = new ResizeObserver(() => {
          if (modalMapInstanceRef.current) {
            modalMapInstanceRef.current.invalidateSize();
          }
        });
        ro.observe(modalMapContainerRef.current);

        renderLiveLayers(modalMap, modalLayerGroup, 'modal');
        fitAllMapPoints(modalMap);
      } catch (e) {
        console.error('Lỗi khởi tạo modal Google Maps:', e);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.remove();
        modalMapInstanceRef.current = null;
      }
    };
  }, [isExpanded]);

  // Đồng bộ lại các marker trên Modal khi dữ liệu poll 5s thay đổi
  useEffect(() => {
    if (!isExpanded || !modalMapInstanceRef.current || !modalLayerGroupRef.current) return;
    renderLiveLayers(modalMapInstanceRef.current, modalLayerGroupRef.current, 'modal');
  }, [isExpanded, displayedGarages, displayedIncidents, renderLiveLayers]);

  const mapHeightClass = isFullscreen
    ? 'flex-1 min-h-0'
    : fullPage
    ? 'h-[calc(100vh-230px)] min-h-[560px]'
    : 'h-[540px]';

  return (
    <>
      <div
        ref={wrapperRef}
        className={`bg-white shadow-sm overflow-hidden flex flex-col w-full transition-all ${
          isFullscreen
            ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none border-0'
            : 'rounded-2xl border border-gray-100'
        }`}
      >
        {/* ── Thanh điều khiển & Chỉ số trực tuyến (Top Live Command Bar) ── */}
        <div className="px-5 py-3.5 border-b border-gray-100 bg-white flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Tiêu đề & Trạng thái Live */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center relative shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-gray-900">
                  Bản đồ Sự cố & Điều hành Thời gian thực
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 uppercase tracking-wider">
                  LIVE GPS • 0.1s
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                  Google Maps
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Gara đang hoạt động phát sáng • Vị trí nhân viên cập nhật liên tục từ bảng{' '}
                <code className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">
                  rescue_requests
                </code>{' '}
                &{' '}
                <code className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">
                  location_tracks
                </code>
                {lastSyncTime && <span className="text-gray-400 ml-1.5">• Đồng bộ lúc {lastSyncTime}</span>}
              </p>
            </div>
          </div>

          {/* Bộ lọc lớp hiển thị & Công cụ bản đồ */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Tabs */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs flex-wrap gap-1">
              <button
                onClick={() => {
                  setSelectedIncidentId(null);
                  setFilterLayer('ALL');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  filterLayer === 'ALL' && !activeSelectedIncident
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => {
                  setSelectedIncidentId(null);
                  setFilterLayer('INCIDENTS');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                  filterLayer === 'INCIDENTS' && !activeSelectedIncident
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${filterLayer === 'INCIDENTS' && !activeSelectedIncident ? 'bg-white' : 'bg-red-500 animate-ping'}`}></span>
                Đơn & Nhân viên ({summary.activeIncidentsCount})
              </button>
              <button
                onClick={() => {
                  setSelectedIncidentId(null);
                  setFilterLayer('GARAGES_ONLINE');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                  filterLayer === 'GARAGES_ONLINE' && !activeSelectedIncident
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${filterLayer === 'GARAGES_ONLINE' && !activeSelectedIncident ? 'bg-white' : 'bg-emerald-500'}`}></span>
                Gara Sáng ({summary.onlineGarages})
              </button>
              <button
                onClick={() => {
                  setSelectedIncidentId(null);
                  setFilterLayer('GARAGES_OFFLINE');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                  filterLayer === 'GARAGES_OFFLINE' && !activeSelectedIncident
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                Gara Nghỉ ({summary.offlineGarages})
              </button>
            </div>

            {/* Đổi lớp bản đồ Vệ tinh / Giao thông */}
            <button
              onClick={() => setMapLayerType(prev => (prev === 'ROADMAP' ? 'HYBRID' : 'ROADMAP'))}
              title={mapLayerType === 'ROADMAP' ? 'Chuyển sang ảnh vệ tinh Google' : 'Chuyển sang bản đồ chuẩn Google'}
              className={`px-2.5 h-8 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                mapLayerType === 'HYBRID'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{mapLayerType === 'ROADMAP' ? 'Vệ tinh' : 'Bản đồ'}</span>
            </button>

            {/* Căn toàn cảnh */}
            <button
              onClick={() => fitAllMapPoints(mapInstanceRef.current)}
              title="Bao quát toàn bộ Gara & Đơn sự cố"
              className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>

            {/* Làm mới ngay */}
            <button
              onClick={() => fetchLiveOverview(false)}
              disabled={loading}
              title="Đồng bộ GPS ngay lập tức"
              className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            </button>

            {/* Nút Phóng to / Thu nhỏ toàn màn hình */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Thu nhỏ màn hình (ESC)' : 'Phóng to toàn màn hình'}
              className={`px-2.5 h-8 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isFullscreen
                  ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50'
              }`}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Thu nhỏ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Phóng to</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Khung Chính: Bản đồ Google Maps (Trái) + Bảng Giám sát Đơn & Nhân viên Thời gian thực (Phải) ── */}
        <div className={`w-full ${mapHeightClass} flex flex-col lg:flex-row relative`}>
          {/* Bản đồ Google Maps */}
          <div className="relative flex-1 h-full min-h-[380px]">
            <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

            {/* Nút Phóng to / Thu nhỏ nổi trực tiếp ở góc trên bên phải bản đồ */}
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
                  <span>Toàn màn hình</span>
                </>
              )}
            </button>

            {/* Banner thông báo khi đang lọc xem riêng 1 đơn */}
            {activeSelectedIncident && (
              <div className="absolute top-3 left-3 z-20 bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg border border-slate-700 flex items-center gap-3 pointer-events-auto">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
                  <span>
                    Đang chỉ hiển thị đơn <strong className="text-amber-300">#{activeSelectedIncident.code}</strong>
                    {activeSelectedIncident.staffName ? ` • Thợ: ${activeSelectedIncident.staffName}` : ''}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedIncidentId(null);
                    setTimeout(() => fitAllMapPoints(mapInstanceRef.current), 50);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hiện lại tất cả</span>
                </button>
              </div>
            )}

            {/* Chú thích trực quan (Legend) ở góc trái dưới bản đồ */}
            <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-md border border-gray-200/90 flex flex-wrap items-center gap-4 text-[11px] font-bold text-gray-700 pointer-events-auto">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] inline-block"></span>
                <span>Gara đang hoạt động (Sáng)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-400 border border-dashed border-slate-500 inline-block"></span>
                <span className="text-gray-500">Gara không hoạt động (Nghỉ)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse inline-block"></span>
                <span className="text-red-600">Vị trí đơn cứu hộ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_8px_#2563eb] inline-block"></span>
                <span className="text-blue-700">Vị trí nhân viên (Real-time GPS)</span>
              </div>
            </div>

            {/* Loading overlay */}
            {loading && !isMapReady && (
              <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
                <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                <p className="text-xs font-semibold text-gray-600">Đang kết nối bản đồ điều hành thời gian thực...</p>
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

          {/* Cột Phải: Danh sách Đơn cứu hộ & Vị trí nhân viên đang thực hiện */}
          <div className="w-full lg:w-96 bg-slate-50/70 border-t lg:border-t-0 lg:border-l border-gray-100 h-full flex flex-col">
            {/* 4 ô chỉ số nhanh */}
            <div className="p-3 bg-white border-b border-gray-100 grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Gara Sáng</div>
                <div className="text-base font-black text-emerald-600">{summary.onlineGarages}</div>
              </div>
              <div className="p-2 rounded-xl bg-gray-100/80 border border-gray-200/70">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Gara Nghỉ</div>
                <div className="text-base font-black text-gray-600">{summary.offlineGarages}</div>
              </div>
              <div className="p-2 rounded-xl bg-red-50/70 border border-red-100">
                <div className="text-[10px] font-bold text-red-700 uppercase">Đơn Active</div>
                <div className="text-base font-black text-red-600">{summary.activeIncidentsCount}</div>
              </div>
              <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-bold text-blue-700 uppercase">Thợ Đi Đơn</div>
                <div className="text-base font-black text-blue-600">{summary.activeRescuersCount}</div>
              </div>
            </div>

            {/* Danh sách cuộn: Các đơn cứu hộ đang hoạt động & Gara */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Phần 1: Các ca cứu hộ & vị trí nhân viên thời gian thực */}
              <div>
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    Đơn cứu hộ & Tiến độ nhân viên ({incidents.length})
                  </span>
                  {activeSelectedIncident ? (
                    <button
                      onClick={() => {
                        setSelectedIncidentId(null);
                        setTimeout(() => fitAllMapPoints(mapInstanceRef.current), 50);
                      }}
                      className="text-[10.5px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      Hiện tất cả ({incidents.length})
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-600">Tự động 0.1s</span>
                  )}
                </div>

                {incidents.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-200 p-4 text-center space-y-1">
                    <p className="text-xs font-bold text-gray-600">Hiện không có đơn cứu hộ nào đang diễn ra</p>
                    <p className="text-[11px] text-gray-400">
                      Khi khách đặt cứu hộ và Gara gán nhân viên, tọa độ nhân viên và lộ trình tới vị trí đơn sẽ hiển thị trực tiếp tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incidents.map(inc => {
                      const meta = getStatusMeta(inc.status);
                      const isSelected = selectedIncidentId === inc.id;
                      return (
                        <div
                          key={inc.id}
                          onClick={() => focusOnIncident(inc)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer bg-white space-y-2 ${
                            isSelected
                              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                              : 'border-gray-200/80 hover:border-blue-300 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-gray-900">#{inc.code}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 flex items-center gap-1">
                                {inc.vehicleType === 'CAR' ? (
                                  <Car className="w-3 h-3 text-blue-600" />
                                ) : (
                                  <Bike className="w-3 h-3 text-orange-600" />
                                )}
                                {inc.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'}
                              </span>
                            </div>
                            <span
                              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: meta.badgeBg, color: meta.badgeText }}
                            >
                              {meta.label}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                            {inc.symptom || inc.issueType || 'Yêu cầu cứu hộ khẩn cấp'}
                          </p>

                          <div className="text-[11px] text-gray-500 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">
                              {inc.pickupAddress || `${inc.pickupLat.toFixed(4)}, ${inc.pickupLng.toFixed(4)}`}
                            </span>
                          </div>

                          {/* Thông tin Nhân viên đang di chuyển tới đơn */}
                          {inc.staffName ? (
                            <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-blue-900 flex items-center gap-1">
                                  <Wrench className="w-3 h-3 text-blue-600" />
                                  {inc.staffName}
                                </span>
                                {(() => {
                                  const rInfo = roadRoutes[inc.id];
                                  const dKm = rInfo?.distanceKm ?? inc.remainingDistanceKm;
                                  if (dKm === null || dKm === undefined) return null;
                                  return (
                                    <span className="font-black text-red-600 bg-white px-1.5 py-0.5 rounded border border-red-200 text-[10px]">
                                      Lộ trình {dKm} km {rInfo?.durationMin ? `(~${rInfo.durationMin} phút)` : ''}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-blue-700">
                                <span>🏢 {inc.garageName || 'Gara đối tác'}</span>
                                {inc.rescueVehiclePlate && <span className="font-bold">Xe: {inc.rescueVehiclePlate}</span>}
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5 border-t border-blue-100/80">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-blue-500" />
                                  {formatAgeSec(inc.rescuerLocationAgeSec)}
                                </span>
                                {inc.rescuerLat && inc.rescuerLng && (
                                  <span className="font-mono text-[9.5px] text-blue-600">
                                    {inc.rescuerLat.toFixed(4)}, {inc.rescuerLng.toFixed(4)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/70 text-[10.5px] text-amber-800 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                              Đang tìm Gara & chờ phân công kỹ thuật viên
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Phần 2: Danh sách Gara Đang Hoạt Động (Sáng) & Không Hoạt Động */}
              <div className="pt-2 border-t border-gray-200/70">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                    Trạng thái Gara trên bản đồ ({garages.length})
                  </span>
                </div>

                <div className="space-y-1.5">
                  {garages.map(g => (
                    <div
                      key={g.id}
                      onClick={() => {
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.setView([g.lat, g.lng], 15, { animate: true });
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        g.isOnline
                          ? 'bg-white border-emerald-200 hover:border-emerald-400 shadow-2xs'
                          : 'bg-gray-100/70 border-gray-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              g.isOnline
                                ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                                : 'bg-gray-400'
                            }`}
                          ></span>
                          <span className="text-xs font-bold text-gray-900 truncate">{g.name}</span>
                        </div>
                        <p className="text-[10.5px] text-gray-500 truncate mt-0.5 pl-4">{g.address}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full block ${
                            g.isOnline
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {g.isOnline ? 'Đang sáng' : 'Đang nghỉ'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold mt-0.5 block">
                          <UserCheck className="w-2.5 h-2.5 inline mr-0.5 text-emerald-600" />
                          {g.freeStaff}/{g.totalStaff} thợ rảnh
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL POPUP PHÓNG TO BỰ (Full viewport Google Maps Modal) ── */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-white border-b border-gray-100 flex items-center justify-between z-20 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-gray-900">
                      Trung tâm Giám sát Bản đồ Sự cố Thời gian thực
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                      LIVE GPS
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    <strong className="text-emerald-600">{summary.onlineGarages}</strong> gara sáng •{' '}
                    <strong className="text-gray-600">{summary.offlineGarages}</strong> gara nghỉ •{' '}
                    <strong className="text-red-600">{summary.activeIncidentsCount}</strong> đơn đang cứu hộ •{' '}
                    <strong className="text-blue-600">{summary.activeRescuersCount}</strong> nhân viên đang di chuyển
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMapLayerType(prev => (prev === 'ROADMAP' ? 'HYBRID' : 'ROADMAP'))}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                    mapLayerType === 'HYBRID'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{mapLayerType === 'ROADMAP' ? 'Xem Vệ tinh' : 'Xem Bản đồ'}</span>
                </button>

                <button
                  onClick={() => modalMapInstanceRef.current && fitAllMapPoints(modalMapInstanceRef.current)}
                  title="Bao quát toàn bộ"
                  className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-orange-50 hover:text-orange-600 text-gray-600 flex items-center justify-center border border-gray-200 transition-all"
                >
                  <Navigation className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setIsExpanded(false);
                    navigate('/admin/live-map');
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>Mở trang Điều hành chuyên biệt</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsExpanded(false)}
                  title="Đóng"
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold transition-all ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Map Canvas */}
            <div className="relative w-full flex-1 min-h-0 bg-slate-100 overflow-hidden flex">
              <div className="relative flex-1 h-full">
                <div ref={modalMapContainerRef} className="absolute inset-0 w-full h-full" />
              </div>

              <div className="w-88 bg-white border-l border-gray-100 h-full overflow-y-auto p-3.5 hidden lg:flex flex-col gap-3">
                <div className="text-xs font-extrabold text-gray-800 px-1">
                  Đơn đang thực hiện ({incidents.length})
                </div>
                {incidents.map(inc => {
                  const meta = getStatusMeta(inc.status);
                  return (
                    <div
                      key={inc.id}
                      onClick={() => focusOnIncident(inc, modalMapInstanceRef.current)}
                      className="p-3 rounded-xl border border-gray-200 hover:border-blue-400 cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900">#{inc.code}</span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: meta.badgeBg, color: meta.badgeText }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 font-semibold">{inc.symptom}</p>
                      {inc.staffName && (
                        <div className="text-[11px] text-blue-700 font-bold">
                          🛠️ {inc.staffName} {inc.remainingDistanceKm != null ? `• Cách đơn ${inc.remainingDistanceKm} km` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="text-xs font-extrabold text-gray-800 px-1 pt-2 border-t border-gray-100">
                  Danh sách Gara ({garages.length})
                </div>
                {garages.map(g => (
                  <div
                    key={g.id}
                    onClick={() => {
                      if (modalMapInstanceRef.current) {
                        modalMapInstanceRef.current.setView([g.lat, g.lng], 16, { animate: true });
                      }
                    }}
                    className="p-2.5 rounded-xl border border-gray-100 hover:border-emerald-300 cursor-pointer flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate">{g.name}</div>
                      <div className="text-[10px] text-gray-500 truncate">{g.address}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        g.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {g.isOnline ? '🟢 Sáng' : '⚪ Nghỉ'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

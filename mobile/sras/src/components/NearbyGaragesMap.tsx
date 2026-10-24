import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Dimensions,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Phone,
  ArrowRight,
  Star,
  Clock,
  Navigation,
  AlertCircle,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react-native';
import { GOONG_MAPTILES_KEY } from '../config/goong';
import { garageApi, NearbyGarageDto } from '../api/garageApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default fallback to Da Nang / Vietnam central
const DEFAULT_COORDS = { lat: 16.0544, lng: 108.2022 };

interface FilterOption {
  key: string;
  label: string;
  radiusKm: number;
}

const FILTERS: FilterOption[] = [
  { key: '5KM', label: 'Bán kính 5km', radiusKm: 5 },
  { key: '20KM', label: 'Bán kính 20km', radiusKm: 20 },
  { key: '50KM', label: 'Bán kính 50km', radiusKm: 50 },
  { key: 'ALL', label: 'Toàn khu vực (100km)', radiusKm: 100 },
];

function buildGoongMapHtml(
  userLat: number,
  userLng: number,
  garages: NearbyGarageDto[],
  activeId?: number | null,
  isExpanded: boolean = false
) {
  const garagesJson = JSON.stringify(garages || []);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    
    /* Center user marker */
    .user-marker-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
    }
    .user-pulse-wrap {
      position: relative;
      width: 46px;
      height: 46px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-pulse-wave {
      position: absolute;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: rgba(249, 115, 22, 0.35);
      animation: pulseRadar 2.2s infinite ease-out;
    }
    .user-dot {
      width: 32px;
      height: 32px;
      border-radius: 16px;
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      border: 2.5px solid #ffffff;
      box-shadow: 0 3px 12px rgba(234, 88, 12, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .user-car-svg {
      width: 17px;
      height: 17px;
      fill: #ffffff;
    }
    .user-badge {
      margin-top: -3px;
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      white-space: nowrap;
      border: 1px solid rgba(255,255,255,0.25);
      z-index: 3;
    }
    @keyframes pulseRadar {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(1.7); opacity: 0; }
    }

    /* Online Garage Markers */
    .garage-pin-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .garage-pin-wrap:active, .garage-pin-wrap.active {
      transform: scale(1.15);
      z-index: 99;
    }
    .garage-pill {
      background: #ffffff;
      border: 1.5px solid #fed7aa;
      border-radius: 20px;
      padding: 5px 10px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }
    .garage-pin-wrap.active .garage-pill {
      border-color: #ea580c;
      background: #fff7ed;
      box-shadow: 0 4px 18px rgba(234, 88, 12, 0.45);
    }
    .online-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
      flex-shrink: 0;
    }
    .garage-name-text {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .garage-dist-text {
      font-size: 10.5px;
      font-weight: 700;
      color: #ea580c;
    }
    .garage-caret {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #fed7aa;
      margin-top: -1px;
    }
    .garage-pin-wrap.active .garage-caret {
      border-top-color: #ea580c;
    }

    /* Popup Styling */
    .goongmaps-popup {
      z-index: 100;
    }
    .goongmaps-popup-content {
      border-radius: 14px;
      padding: 10px 14px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.22);
      border: 1px solid #fed7aa;
      background: #ffffff;
    }
    .popup-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .popup-meta {
      font-size: 11px;
      color: #ea580c;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .popup-addr {
      font-size: 10.5px;
      color: #64748b;
      line-height: 14px;
      max-width: 190px;
    }

    /* Floating map control buttons */
    .map-ctrl-box {
      position: absolute;
      bottom: ${isExpanded ? '110px' : '10px'};
      left: 12px;
      display: flex;
      flex-direction: ${isExpanded ? 'column' : 'row'};
      gap: 8px;
      z-index: 10;
    }
    .map-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: 1px solid #e2e8f0;
      outline: none;
    }
    .map-btn:active {
      background: #f1f5f9;
      transform: scale(0.94);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="map-ctrl-box">
    <button class="map-btn" id="btnRecenter" title="Về vị trí của tôi">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="22" y1="12" x2="18" y2="12"></line>
        <line x1="6" y1="12" x2="2" y2="12"></line>
        <line x1="12" y1="6" x2="12" y2="2"></line>
        <line x1="12" y1="22" x2="12" y2="18"></line>
      </svg>
    </button>
    <button class="map-btn" id="btnFit" title="Xem tất cả trạm">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
      </svg>
    </button>
    ${
      isExpanded
        ? `<button class="map-btn" id="btnZoomIn" title="Phóng to">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
               <line x1="12" y1="5" x2="12" y2="19"></line>
               <line x1="5" y1="12" x2="19" y2="12"></line>
             </svg>
           </button>
           <button class="map-btn" id="btnZoomOut" title="Thu nhỏ">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
               <line x1="5" y1="12" x2="19" y2="12"></line>
             </svg>
           </button>`
        : ''
    }
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    var userLat = ${userLat};
    var userLng = ${userLng};
    var initialGarages = ${garagesJson};
    var currentActiveId = ${activeId || 'null'};
    var garageMarkers = [];
    var userMarker = null;
    var activePopup = null;

    function post(obj) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    }

    if (typeof goongjs === 'undefined') {
      post({ type: 'maperror', message: 'Goong map script not loaded' });
    } else {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var map = new goongjs.Map({
        container: 'map',
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [userLng, userLat],
        zoom: 13.5,
        attributionControl: false
      });
      window.__map = map;

      function renderUserMarker(lat, lng) {
        if (userMarker) userMarker.remove();
        var wrap = document.createElement('div');
        wrap.className = 'user-marker-wrap';
        wrap.innerHTML = '<div class="user-pulse-wrap">' +
          '<div class="user-pulse-wave"></div>' +
          '<div class="user-dot">' +
            '<svg class="user-car-svg" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>' +
          '</div>' +
        '</div>' +
        '<div class="user-badge">Bạn ở đây</div>';
        
        userMarker = new goongjs.Marker({ element: wrap, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map);
      }

      function showGaragePopup(g) {
        if (activePopup) activePopup.remove();
        var distText = (g.distanceKm != null) ? (Number(g.distanceKm).toFixed(1) + ' km') : 'Gần bạn';
        var addrText = g.address ? ('<div class="popup-addr">' + g.address + '</div>') : '';
        activePopup = new goongjs.Popup({ offset: 28, closeButton: false })
          .setLngLat([g.lng, g.lat])
          .setHTML(
            '<div>' +
              '<div class="popup-title">' + g.name + '</div>' +
              '<div class="popup-meta">🟢 Đang online • ' + distText + '</div>' +
              addrText +
            '</div>'
          )
          .addTo(map);
      }

      function renderGarages(list, activeId) {
        if (activePopup) { activePopup.remove(); activePopup = null; }
        garageMarkers.forEach(function(m) { m.remove(); });
        garageMarkers = [];

        list.forEach(function(g) {
          if (g.lat == null || g.lng == null) return;
          var el = document.createElement('div');
          var isActive = (activeId === g.id);
          el.className = 'garage-pin-wrap' + (isActive ? ' active' : '');
          var distText = (g.distanceKm != null) ? (Number(g.distanceKm).toFixed(1) + 'km') : '';
          var shortName = g.name.length > 15 ? (g.name.substring(0, 14) + '…') : g.name;

          el.innerHTML = '<div class="garage-pill">' +
            '<span class="online-indicator"></span>' +
            '<span class="garage-name-text">' + shortName + '</span>' +
            '<span class="garage-dist-text">(' + distText + ')</span>' +
          '</div>' +
          '<div class="garage-caret"></div>';

          el.onclick = function(e) {
            e.stopPropagation();
            post({ type: 'SELECT_GARAGE', id: g.id });
            highlightMarker(g.id);
            showGaragePopup(g);
            map.easeTo({ center: [g.lng, g.lat], zoom: Math.max(map.getZoom(), 14), duration: 500 });
          };

          var marker = new goongjs.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([g.lng, g.lat])
            .addTo(map);

          marker._garage = g;
          marker._wrap = el;
          garageMarkers.push(marker);

          if (isActive) {
            showGaragePopup(g);
          }
        });
      }

      function highlightMarker(id, shouldFly) {
        var foundGarage = null;
        garageMarkers.forEach(function(m) {
          if (m._wrap && m._garage) {
            if (m._garage.id === id) {
              m._wrap.classList.add('active');
              foundGarage = m._garage;
            } else {
              m._wrap.classList.remove('active');
            }
          }
        });

        if (foundGarage) {
          showGaragePopup(foundGarage);
          if (shouldFly) {
            map.flyTo({ center: [foundGarage.lng, foundGarage.lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
          }
        }
      }

      function fitAll() {
        var pts = [[userLng, userLat]];
        garageMarkers.forEach(function(m) {
          var ll = m.getLngLat();
          if (ll && ll.lng != null && ll.lat != null) {
            pts.push([ll.lng, ll.lat]);
          }
        });

        if (pts.length <= 1) {
          map.flyTo({ center: [userLng, userLat], zoom: 13.5, essential: true });
          return;
        }

        var bounds = new goongjs.LngLatBounds(pts[0], pts[0]);
        for (var i = 1; i < pts.length; i++) {
          bounds.extend(pts[i]);
        }
        map.fitBounds(bounds, { padding: ${isExpanded ? 65 : 45}, maxZoom: 15, duration: 600 });
      }

      map.on('load', function() {
        renderUserMarker(userLat, userLng);
        renderGarages(initialGarages, currentActiveId);
        setTimeout(function() {
          map.resize();
          fitAll();
          post({ type: 'MAP_READY' });
        }, 300);
      });

      document.getElementById('btnRecenter').onclick = function() {
        map.flyTo({ center: [userLng, userLat], zoom: 14.5, essential: true });
        post({ type: 'RECENTER_CLICKED' });
      };

      document.getElementById('btnFit').onclick = function() {
        fitAll();
      };

      var btnZIn = document.getElementById('btnZoomIn');
      if (btnZIn) {
        btnZIn.onclick = function() { map.zoomIn(); };
      }
      var btnZOut = document.getElementById('btnZoomOut');
      if (btnZOut) {
        btnZOut.onclick = function() { map.zoomOut(); };
      }

      window.updateData = function(uLat, uLng, garages, activeId) {
        userLat = uLat;
        userLng = uLng;
        renderUserMarker(userLat, userLng);
        renderGarages(garages, activeId);
        setTimeout(function() { fitAll(); }, 250);
      };

      window.recenter = function(la, ln) {
        userLat = la;
        userLng = ln;
        renderUserMarker(la, ln);
        map.flyTo({ center: [ln, la], zoom: 14.5, essential: true });
      };

      window.selectGarage = function(id, shouldFly) {
        highlightMarker(id, shouldFly);
      };

      window.fitAll = fitAll;
    }
  </script>
</body>
</html>`;
}

export default function NearbyGaragesMap() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const fullWebRef = useRef<WebView>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>(DEFAULT_COORDS);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>(FILTERS[0]);
  const [garages, setGarages] = useState<NearbyGarageDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGarageId, setSelectedGarageId] = useState<number | null>(null);

  // Fullscreen interactive map modal
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Calculate safe top padding so notch / camera cutout NEVER blocks the header
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44);

  // 1. Get GPS coordinates on mount
  useEffect(() => {
    let isMounted = true;

    async function initLocation() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        let granted = status === 'granted';
        if (!granted) {
          const req = await Location.requestForegroundPermissionsAsync();
          granted = req.status === 'granted';
        }

        if (granted) {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (isMounted && pos?.coords) {
            setCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          }
        }
      } catch (e) {
        // Fallback to default
      }
    }

    initLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch nearby garages when coords or filter changes
  useEffect(() => {
    let isMounted = true;

    async function fetchGarages() {
      try {
        setLoading(true);
        const data = await garageApi.listNearby(coords.lat, coords.lng, undefined, selectedFilter.radiusKm);

        if (isMounted) {
          setGarages(data);
          if (data.length > 0) {
            setSelectedGarageId(data[0].id);
          } else {
            setSelectedGarageId(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setGarages([]);
          setSelectedGarageId(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchGarages();
    return () => {
      isMounted = false;
    };
  }, [coords.lat, coords.lng, selectedFilter.key]);

  // Update inline WebView map when data changes
  useEffect(() => {
    if (webRef.current) {
      const script = `
        if (window.updateData) {
          window.updateData(${coords.lat}, ${coords.lng}, ${JSON.stringify(garages)}, ${selectedGarageId || 'null'});
        }
        true;
      `;
      webRef.current.injectJavaScript(script);
    }
  }, [garages, coords.lat, coords.lng, selectedGarageId]);

  // Update fullscreen WebView map when data changes or modal opens
  useEffect(() => {
    if (isExpanded && fullWebRef.current) {
      const script = `
        if (window.updateData) {
          window.updateData(${coords.lat}, ${coords.lng}, ${JSON.stringify(garages)}, ${selectedGarageId || 'null'});
        }
        true;
      `;
      fullWebRef.current.injectJavaScript(script);
    }
  }, [isExpanded, garages, coords.lat, coords.lng, selectedGarageId]);

  const activeGarage = useMemo(() => {
    return garages.find((g) => g.id === selectedGarageId) || (garages.length > 0 ? garages[0] : null);
  }, [garages, selectedGarageId]);

  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_GARAGE' && data.id) {
        setSelectedGarageId(data.id);
      } else if (data.type === 'MAP_READY') {
        const script = `
          if (window.updateData) {
            window.updateData(${coords.lat}, ${coords.lng}, ${JSON.stringify(garages)}, ${selectedGarageId || 'null'});
          }
          true;
        `;
        webRef.current?.injectJavaScript(script);
        fullWebRef.current?.injectJavaScript(script);
      }
    } catch (e) {}
  };

  const handleSelectGarage = (id: number) => {
    setSelectedGarageId(id);
    const script = `window.selectGarage && window.selectGarage(${id}, true); true;`;
    webRef.current?.injectJavaScript(script);
    fullWebRef.current?.injectJavaScript(script);
  };

  const handleBookWithGarage = (garage: NearbyGarageDto) => {
    if (isExpanded) setIsExpanded(false);
    router.push({
      pathname: '/customer/rescue-emergency',
      params: {
        lat: coords.lat.toFixed(6),
        lng: coords.lng.toFixed(6),
        mode: 'EMERGENCY',
      },
    } as any);
  };

  const inlineMapHtml = useMemo(() => {
    return buildGoongMapHtml(coords.lat, coords.lng, garages, selectedGarageId, false);
  }, [coords.lat, coords.lng, garages, selectedGarageId]);

  const fullscreenMapHtml = useMemo(() => {
    return buildGoongMapHtml(coords.lat, coords.lng, garages, selectedGarageId, true);
  }, [coords.lat, coords.lng, garages, selectedGarageId]);

  return (
    <View style={styles.cardContainer}>
      {/* ── HEADER ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>Bản Đồ Gara Quanh Tôi</Text>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.subtitleText}>Tìm kiếm đội cứu hộ lưu động & xưởng sửa chữa gần nhất</Text>
        </View>

        <View style={styles.headerRightCol}>
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeCount}>{garages.length} Trạm</Text>
            <Text style={styles.badgeLabel}>gần bạn</Text>
          </View>
        </View>
      </View>

      {/* ── FILTER CHIPS (5km, 20km, 50km, Toàn khu vực) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterScrollView}
      >
        {FILTERS.map((f) => {
          const isActive = selectedFilter.key === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── INTERACTIVE MAP WIDGET ── */}
      <View style={styles.mapFrame}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: inlineMapHtml }}
          style={styles.webView}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          onMessage={onWebViewMessage}
        />

        {/* Nút phóng to toàn màn hình */}
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.85}
        >
          <Maximize2 size={15} color="#ea580c" strokeWidth={2.4} />
          <Text style={styles.expandButtonText}>Phóng to</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#ea580c" />
            <Text style={styles.loadingOverlayText}>Đang quét trạm cứu hộ...</Text>
          </View>
        )}
      </View>

      {/* ── SELECTED / NEAREST GARAGE INFO CARD ── */}
      {activeGarage ? (
        <View style={styles.garageDetailCard}>
          <View style={styles.garageInfoTop}>
            <View style={styles.garageNameCol}>
              <View style={styles.garageNameRow}>
                <Text style={styles.garageName} numberOfLines={1}>
                  {activeGarage.name}
                </Text>
                <View style={styles.onlineStatusPill}>
                  <View style={styles.statusDotGreen} />
                  <Text style={styles.statusTextGreen}>Online</Text>
                </View>
              </View>

              <Text style={styles.garageAddress} numberOfLines={1}>
                {activeGarage.address || 'Đang cập nhật địa chỉ'}
              </Text>

              <View style={styles.garageMetaRow}>
                <View style={styles.metaItem}>
                  <Navigation size={13} color="#ea580c" strokeWidth={2.4} />
                  <Text style={styles.metaDistance}>
                    {activeGarage.distanceKm != null ? `${activeGarage.distanceKm.toFixed(1)} km` : 'Gần bạn'}
                  </Text>
                </View>

                <View style={styles.metaDivider} />

                <View style={styles.metaItem}>
                  <Clock size={13} color="#64748b" strokeWidth={2.2} />
                  <Text style={styles.metaEta}>~{activeGarage.estimatedEtaMin || 15} phút</Text>
                </View>

                {activeGarage.avgRating ? (
                  <>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Star size={13} color="#f59e0b" fill="#f59e0b" strokeWidth={2} />
                      <Text style={styles.metaRating}>{activeGarage.avgRating}</Text>
                      {activeGarage.ratingCount ? (
                        <Text style={styles.metaReviewCount}>({activeGarage.ratingCount})</Text>
                      ) : null}
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.garageActionRow}>
            {activeGarage.phone ? (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${activeGarage.phone}`).catch(() => {})}
                activeOpacity={0.8}
              >
                <Phone size={15} color="#0f172a" strokeWidth={2.4} />
                <Text style={styles.callBtnText}>Gọi trạm</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => handleBookWithGarage(activeGarage)}
              activeOpacity={0.85}
            >
              <Text style={styles.bookBtnText}>Đặt cứu hộ tại đây</Text>
              <ArrowRight size={15} color="#ffffff" strokeWidth={2.6} />
            </TouchableOpacity>
          </View>
        </View>
      ) : !loading ? (
        <View style={styles.emptyContainer}>
          <AlertCircle size={20} color="#f97316" strokeWidth={2.2} />
          <Text style={styles.emptyTitle}>Chưa có trạm cứu hộ online trong {selectedFilter.radiusKm}km</Text>
          <TouchableOpacity
            style={styles.expandRadiusBtn}
            onPress={() => {
              const larger = FILTERS.find((f) => f.radiusKm > selectedFilter.radiusKm) || FILTERS[1];
              setSelectedFilter(larger);
            }}
          >
            <Text style={styles.expandRadiusBtnText}>Mở rộng tìm kiếm</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── FULLSCREEN MAP MODAL (PHÓNG TO XEM CHI TIẾT) ── */}
      <Modal visible={isExpanded} animationType="slide" onRequestClose={() => setIsExpanded(false)}>
        <View style={[styles.fullscreenRoot, { paddingTop: safeTopPadding }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

          {/* Fullscreen Header (Đã đẩy xuống tránh tai thỏ) */}
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity
              style={styles.fullscreenBackBtn}
              onPress={() => setIsExpanded(false)}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Minimize2 size={18} color="#ea580c" strokeWidth={2.4} />
              <Text style={styles.fullscreenBackText}>Thu nhỏ</Text>
            </TouchableOpacity>

            <View style={styles.fullscreenTitleCol}>
              <Text style={styles.fullscreenTitle}>Bản Đồ Gara Trực Tuyến</Text>
              <Text style={styles.fullscreenSubTitle}>
                {garages.length} trạm online ({selectedFilter.label})
              </Text>
            </View>

            <TouchableOpacity
              style={styles.fullscreenCloseIcon}
              onPress={() => setIsExpanded(false)}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color="#0f172a" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Fullscreen Filters */}
          <View style={styles.fullscreenFilterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {FILTERS.map((f) => {
                const isActive = selectedFilter.key === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setSelectedFilter(f)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Fullscreen WebView Map */}
          <View style={styles.fullscreenMapWrap}>
            <WebView
              ref={fullWebRef}
              originWhitelist={['*']}
              source={{ html: fullscreenMapHtml }}
              style={styles.webView}
              javaScriptEnabled
              domStorageEnabled
              onMessage={onWebViewMessage}
            />

            {loading && (
              <View style={styles.fullscreenLoadingBox}>
                <ActivityIndicator size="small" color="#ea580c" />
                <Text style={styles.loadingOverlayText}>Đang cập nhật trạm cứu hộ...</Text>
              </View>
            )}

            {/* Bottom Floating Carousel of Garages */}
            {garages.length > 0 && (
              <View style={styles.fullscreenBottomSheet}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.fullscreenGarageScroll}
                >
                  {garages.map((g) => {
                    const isSelected = g.id === activeGarage?.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.fullscreenGarageCard, isSelected && styles.fullscreenGarageCardActive]}
                        onPress={() => handleSelectGarage(g.id)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.fullscreenCardTop}>
                          <Text style={styles.fullscreenCardName} numberOfLines={1}>
                            {g.name}
                          </Text>
                          <View style={styles.onlineStatusPill}>
                            <View style={styles.statusDotGreen} />
                            <Text style={styles.statusTextGreen}>Online</Text>
                          </View>
                        </View>

                        <Text style={styles.fullscreenCardAddr} numberOfLines={1}>
                          {g.address || 'Đang cập nhật địa chỉ'}
                        </Text>

                        <View style={styles.fullscreenCardMeta}>
                          <View style={styles.metaItem}>
                            <Navigation size={12} color="#ea580c" strokeWidth={2.4} />
                            <Text style={styles.metaDistance}>
                              {g.distanceKm != null ? `${g.distanceKm.toFixed(1)} km` : 'Gần bạn'}
                            </Text>
                          </View>
                          <View style={styles.metaDivider} />
                          <View style={styles.metaItem}>
                            <Clock size={12} color="#64748b" strokeWidth={2} />
                            <Text style={styles.metaEta}>~{g.estimatedEtaMin || 15} phút</Text>
                          </View>
                          {g.avgRating ? (
                            <>
                              <View style={styles.metaDivider} />
                              <View style={styles.metaItem}>
                                <Star size={12} color="#f59e0b" fill="#f59e0b" strokeWidth={2} />
                                <Text style={styles.metaRating}>{g.avgRating}</Text>
                              </View>
                            </>
                          ) : null}
                        </View>

                        <View style={styles.fullscreenCardActions}>
                          {g.phone ? (
                            <TouchableOpacity
                              style={styles.fullscreenCallBtn}
                              onPress={() => Linking.openURL(`tel:${g.phone}`).catch(() => {})}
                            >
                              <Phone size={13} color="#0f172a" strokeWidth={2.4} />
                              <Text style={styles.fullscreenCallBtnText}>Gọi</Text>
                            </TouchableOpacity>
                          ) : null}

                          <TouchableOpacity
                            style={styles.fullscreenBookBtn}
                            onPress={() => handleBookWithGarage(g)}
                          >
                            <Text style={styles.fullscreenBookBtnText}>Đặt cứu hộ</Text>
                            <ArrowRight size={13} color="#ffffff" strokeWidth={2.6} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    marginVertical: 10,
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  headerRightCol: {
    alignItems: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f97316',
  },
  subtitleText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 16,
  },
  badgeWrap: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeCount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },

  /* Filters */
  filterScrollView: {
    marginBottom: 12,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },

  /* Map Frame */
  mapFrame: {
    height: 290,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  webView: {
    flex: 1,
  },
  expandButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  expandButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingOverlayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
  },

  /* Selected Garage Card */
  garageDetailCard: {
    marginTop: 12,
    padding: 13,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  garageInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  garageNameCol: {
    flex: 1,
  },
  garageNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  garageName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  onlineStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  garageAddress: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 3,
  },
  garageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDistance: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 7,
  },
  metaEta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  metaRating: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  metaReviewCount: {
    fontSize: 11,
    color: '#94a3b8',
  },

  /* Action Buttons */
  garageActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  bookBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: '#ea580c',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  bookBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Empty State */
  emptyContainer: {
    marginTop: 10,
    padding: 14,
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  emptyTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#9a3412',
    marginTop: 4,
    textAlign: 'center',
  },
  expandRadiusBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#ea580c',
    borderRadius: 10,
  },
  expandRadiusBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* ── FULLSCREEN MODAL STYLES ── */
  fullscreenRoot: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  fullscreenBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  fullscreenBackText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  fullscreenTitleCol: {
    alignItems: 'center',
  },
  fullscreenTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  fullscreenSubTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  fullscreenCloseIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fullscreenFilterBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  fullscreenMapWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e2e8f0',
  },
  fullscreenLoadingBox: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  fullscreenBottomSheet: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
  },
  fullscreenGarageScroll: {
    paddingHorizontal: 14,
    gap: 12,
  },
  fullscreenGarageCard: {
    width: SCREEN_WIDTH * 0.76,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
  },
  fullscreenGarageCardActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fffaf5',
  },
  fullscreenCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  fullscreenCardName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  fullscreenCardAddr: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },
  fullscreenCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  fullscreenCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  fullscreenCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  fullscreenCallBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  fullscreenBookBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#ea580c',
    borderRadius: 9,
  },
  fullscreenBookBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});

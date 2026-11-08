import { GOONG_MAPTILES_KEY } from '../config/goong';

interface FitPadding {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface MapPerson {
  lat: number;
  lng: number;
  /** Vị trí đã lâu không cập nhật, icon mờ đi để không bị coi là vị trí hiện tại. */
  stale?: boolean;
}

/** Lệnh JS đặt hoặc gỡ icon hình người, tiêm vào WebView của buildNavMapHtml. */
export function setPersonJs(person: MapPerson | null) {
  const args = person ? `${person.lat}, ${person.lng}, ${!!person.stale}` : 'null';
  return `window.setPerson && window.setPerson(${args}); true;`;
}

interface NavMapOptions {
  /** 'follow': camera bám sau xe (nhân viên lái xe). 'watch': camera giữ khung phần tuyến còn lại (khách theo dõi). */
  camera?: 'follow' | 'watch';
  destinationColor?: string;
  fitPadding?: FitPadding;
}

/**
 * Bản đồ dẫn đường Goong trong WebView.
 * - window.setDestination / setMe / setRoute: dùng ở chế độ xem toàn tuyến.
 * - window.navFrame: mỗi lần có vị trí mới, mũi tên chạy dọc theo tuyến tới đó thay vì nhảy,
 *   camera chạy theo và phần đường đã đi được cắt bớt.
 * - window.setNavMode / setFollow: đổi chế độ camera. Người dùng kéo bản đồ thì báo 'follow' về RN.
 * - window.setPerson: icon hình người tại vị trí khách đang chia sẻ, xem setPersonJs.
 */
export function buildNavMapHtml(lat: number, lng: number, options: NavMapOptions = {}) {
  const { camera = 'follow', destinationColor = '#ef4444', fitPadding = { top: 80, left: 50, right: 50, bottom: 80 } } = options;
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #e5e7eb; }
    .puck { width: 54px; height: 54px; filter: drop-shadow(0 2px 5px rgba(15, 23, 42, 0.35)); }
    .street-tag {
      position: absolute;
      top: 0;
      transform: translateY(-50%);
      max-width: 170px;
      padding: 7px 12px;
      border-radius: 8px;
      background: #1d6fe0;
      color: #ffffff;
      font: 700 15px/1.2 -apple-system, Roboto, sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.3);
    }
    .street-tag.left { right: 12px; }
    .street-tag.right { left: 12px; }
    .person { width: 40px; height: 40px; filter: drop-shadow(0 2px 4px rgba(15, 23, 42, 0.35)); }
    .person.stale { opacity: 0.5; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var FRAME_MODE = '${camera}';
    var __s = { dest: null, me: null, person: null, route: null, cum: null, total: 0, ready: false, autoFit: true,
                mode: FRAME_MODE === 'watch' ? 'watch' : 'overview', following: true, frame: null };
    window.setDestination = function(la, ln){ __s.dest = [ln, la]; window.__apply && window.__apply(); };
    window.setMe = function(la, ln){ __s.me = [ln, la]; window.__apply && window.__apply(); };
    window.setRoute = function(coords, cum){
      var ok = Array.isArray(coords) && coords.length >= 2 && Array.isArray(cum);
      __s.route = ok ? coords : null;
      __s.cum = ok ? cum : null;
      __s.total = ok ? cum[cum.length - 1] : 0;
      window.__onRoute && window.__onRoute();
      window.__apply && window.__apply();
    };
    window.navFrame = function(f){ __s.frame = f; window.__onFrame && window.__onFrame(f); };
    window.setNavMode = function(m){ __s.mode = m; window.__onMode && window.__onMode(m); };
    window.setFollow = function(v){ __s.following = v; window.__onFollow && window.__onFollow(); };
    window.setPerson = function(la, ln, stale){
      __s.person = la == null ? null : { at:[ln, la], stale:!!stale };
      window.__onPerson && window.__onPerson();
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <script>
    if (typeof goongjs !== 'undefined') {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      var FOLLOW_ZOOM = 17, FOLLOW_PITCH = 40, CAMERA_EASE_MS = 700;
      // Mũi tên nằm thấp hơn tâm bản đồ theo tỉ lệ này của chiều cao, để thấy đường phía trước.
      var PUCK_DROP = 0.3;
      var TRIM_INTERVAL_MS = 250, BEARING_TAU_MS = 350, BEARING_LOOKAHEAD_M = 20;
      // Vị trí qua server tới thưa hơn GPS của máy nhiều, nên một chặng animation phải kéo dài tương ứng.
      var MAX_FRAME_MS = FRAME_MODE === 'watch' ? 12000 : 2500, MIN_FRAME_MS = 400;
      // Kéo chặng dài hơn khoảng cách giữa các điểm một chút để xe không đứng lại chờ điểm kế tiếp.
      var FRAME_STRETCH = 1.1;
      var map = new goongjs.Map({ container:'map', style:'https://tiles.goong.io/assets/goong_map_web.json', center:[${lng}, ${lat}], zoom:15 });
      var destMarker = null, puck = null, streetTag = null, streetTagEl = null, personMarker = null, personEl = null;
      var pose = null, anim = null, targetBearing = 0, lastFrameAt = 0, lastFrameGap = 0, lastTrimAt = 0, lastTickAt = 0;
      var cameraEaseUntil = 0, rafId = 0;

      function post(msg){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }

      function ensureRoute(){
        if (map.getSource('route')) return;
        map.addSource('route', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates: [] } } });
        var layout = { 'line-cap':'round', 'line-join':'round' };
        map.addLayer({ id:'route-casing', type:'line', source:'route', layout:layout,
          paint:{ 'line-color':'#1557c0', 'line-width':['interpolate',['linear'],['zoom'],12,6,16,11,18,17] } });
        map.addLayer({ id:'route-line', type:'line', source:'route', layout:layout,
          paint:{ 'line-color':'#3b8bf5', 'line-width':['interpolate',['linear'],['zoom'],12,3.5,16,7,18,12] } });
      }
      function drawRoute(coords){
        if (map.getSource('route')) map.getSource('route').setData({ type:'Feature', geometry:{ type:'LineString', coordinates: coords || [] } });
      }

      function createPuck(lngLat){
        var el = document.createElement('div');
        el.className = 'puck';
        el.innerHTML = '<svg width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r="25" fill="#ffffff" fill-opacity="0.94"/>'
          + '<path d="M27 8 L41.5 42 L27 34.5 L12.5 42 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="2" stroke-linejoin="round"/></svg>';
        return new goongjs.Marker({ element:el, rotationAlignment:'map', pitchAlignment:'viewport' }).setLngLat(lngLat).addTo(map);
      }
      function placePuck(lng, la, b){
        if (!puck) puck = createPuck([lng, la]); else puck.setLngLat([lng, la]);
        puck.setRotation(b);
      }

      function drawPerson(){
        var p = __s.person;
        if (!p){
          if (personMarker){ personMarker.remove(); personMarker = null; }
          return;
        }
        if (!personMarker){
          personEl = document.createElement('div');
          personEl.className = 'person';
          personEl.innerHTML = '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#16a34a" stroke="#ffffff" stroke-width="3"/>'
            + '<circle cx="20" cy="14" r="4.5" fill="#ffffff"/><path d="M11.5 29c0-5.2 3.8-8.5 8.5-8.5s8.5 3.3 8.5 8.5z" fill="#ffffff"/></svg>';
          personMarker = new goongjs.Marker({ element:personEl }).setLngLat(p.at).addTo(map);
        } else {
          personMarker.setLngLat(p.at);
        }
        personEl.classList.toggle('stale', p.stale);
      }

      function rad(d){ return d * Math.PI / 180; }
      function vertexIndex(s){
        var lo = 0, hi = __s.cum.length - 1;
        while (hi - lo > 1){ var mid = (lo + hi) >> 1; if (__s.cum[mid] <= s) lo = mid; else hi = mid; }
        return lo;
      }
      function pointAt(s){
        var r = __s.route;
        if (s <= 0) return r[0];
        if (s >= __s.total) return r[r.length - 1];
        var i = vertexIndex(s), span = __s.cum[i + 1] - __s.cum[i], t = span > 0 ? (s - __s.cum[i]) / span : 0;
        return [r[i][0] + (r[i + 1][0] - r[i][0]) * t, r[i][1] + (r[i + 1][1] - r[i][1]) * t];
      }
      function bearingOf(a, b){
        var dLng = rad(b[0] - a[0]);
        var y = Math.sin(dLng) * Math.cos(rad(b[1]));
        var x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(dLng);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      }
      function routeBearing(s){
        var end = Math.min(s + BEARING_LOOKAHEAD_M, __s.total);
        var from = end - s < 1 ? Math.max(0, end - BEARING_LOOKAHEAD_M) : s;
        return bearingOf(pointAt(from), pointAt(end));
      }
      function angleDelta(from, to){ return ((to - from + 540) % 360) - 180; }

      // Tâm camera đặt phía trước xe theo hướng đi, nên mũi tên hiện ở phần dưới màn hình.
      function cameraCenter(){
        var h = map.getContainer().clientHeight;
        var metersPerPx = 40075016.686 * Math.cos(rad(pose.lat)) / Math.pow(2, FOLLOW_ZOOM + 9);
        var aheadM = h * PUCK_DROP * metersPerPx / Math.cos(rad(FOLLOW_PITCH));
        return [
          pose.lng + aheadM * Math.sin(rad(pose.b)) / (111320 * Math.cos(rad(pose.lat))),
          pose.lat + aheadM * Math.cos(rad(pose.b)) / 111320
        ];
      }
      function easeToFollow(){
        cameraEaseUntil = performance.now() + CAMERA_EASE_MS;
        map.easeTo({ center:cameraCenter(), zoom:FOLLOW_ZOOM, pitch:FOLLOW_PITCH, bearing:pose.b, duration:CAMERA_EASE_MS });
      }

      function trimRoute(){
        if (!__s.route) return;
        if (pose.s == null){ drawRoute(__s.route); return; }
        drawRoute([[pose.lng, pose.lat]].concat(__s.route.slice(vertexIndex(pose.s) + 1)));
      }

      function setStreetTag(next){
        if (!next){ if (streetTag){ streetTag.remove(); streetTag = null; } return; }
        if (!streetTag){
          var holder = document.createElement('div');
          streetTagEl = document.createElement('div');
          streetTagEl.className = 'street-tag left';
          holder.appendChild(streetTagEl);
          streetTag = new goongjs.Marker({ element:holder }).setLngLat([next.lng, next.lat]).addTo(map);
        } else {
          streetTag.setLngLat([next.lng, next.lat]);
        }
        streetTagEl.textContent = next.street;
        placeStreetTag();
      }
      // Nhãn nằm về phía có nhiều chỗ hơn, không bị cắt khi điểm rẽ sát mép màn hình.
      function placeStreetTag(){
        if (!streetTag) return;
        var side = map.project(streetTag.getLngLat()).x < map.getContainer().clientWidth / 2 ? 'right' : 'left';
        streetTagEl.className = 'street-tag ' + side;
      }

      function kick(){ if (!rafId) rafId = requestAnimationFrame(tick); }

      function tick(){
        rafId = 0;
        var now = performance.now(), moving = false, dt = Math.min(now - lastTickAt, 100);
        lastTickAt = now;
        if (anim){
          var t = Math.min(1, (now - anim.start) / anim.dur);
          if (anim.s1 != null && anim.s0 != null){
            var s = anim.s0 + (anim.s1 - anim.s0) * t, p = pointAt(s);
            pose.s = s; pose.lng = p[0]; pose.lat = p[1];
          } else {
            pose.lng = anim.lng0 + (anim.lng1 - anim.lng0) * t;
            pose.lat = anim.lat0 + (anim.lat1 - anim.lat0) * t;
            // GPS mới có thể tới trước khi chặng này chạy xong, nên phải có s ngay để chặng sau bám tuyến.
            if (anim.s1 != null) pose.s = anim.s1;
          }
          if (t >= 1){ pose.s = anim.s1; anim = null; }
          moving = true;
        }
        if (pose.s != null && __s.route) targetBearing = routeBearing(pose.s);
        var diff = angleDelta(pose.b, targetBearing);
        if (Math.abs(diff) > 0.1){
          pose.b = (pose.b + diff * (1 - Math.exp(-dt / BEARING_TAU_MS)) + 360) % 360;
          moving = true;
        }
        placePuck(pose.lng, pose.lat, pose.b);
        if (__s.mode === 'follow' && __s.following && now >= cameraEaseUntil){
          map.jumpTo({ center:cameraCenter(), bearing:pose.b, pitch:FOLLOW_PITCH, zoom:FOLLOW_ZOOM });
        }
        if (__s.mode !== 'overview' && now - lastTrimAt >= TRIM_INTERVAL_MS){ lastTrimAt = now; trimRoute(); placeStreetTag(); }
        if (moving || now < cameraEaseUntil) kick();
      }

      window.__onRoute = function(){
        // Tuyến mới có thang quãng đường khác, nên chặng đang chạy dở chuyển sang nội suy thẳng.
        if (!pose) return;
        pose.s = null;
        if (anim){ anim.s0 = null; anim.s1 = null; }
      };
      window.__onFrame = function(f){
        if (!__s.ready) return;
        var now = performance.now(), entering = __s.mode !== FRAME_MODE || !pose, gap = lastFrameAt ? now - lastFrameAt : 0;
        // Lấy khoảng cách lớn hơn trong hai lần gần nhất: nhịp đẩy và nhịp poll lệch nhau nên điểm tới không đều.
        var dur = Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, Math.max(gap, lastFrameGap) * FRAME_STRETCH));
        lastFrameGap = gap;
        lastFrameAt = now;
        lastTickAt = now;
        __s.mode = FRAME_MODE;
        if (!pose) pose = { lng:f.lng, lat:f.lat, s:f.onRoute ? f.s : null, b:f.b };
        targetBearing = f.b;
        var s1 = f.onRoute && __s.route ? f.s : null;
        anim = { start:now, dur:dur, s0:pose.s, s1:s1, lng0:pose.lng, lat0:pose.lat, lng1:f.lng, lat1:f.lat };
        if (s1 == null) pose.s = null;
        if (FRAME_MODE === 'follow'){
          setStreetTag(f.next);
          if (entering && __s.following) easeToFollow();
        } else if (__s.autoFit){
          fit({ duration:dur, easing:function(t){ return t; } });
        }
        kick();
      };
      window.__onMode = function(m){
        if (m !== 'overview') return;
        setStreetTag(null);
        cameraEaseUntil = 0;
        __s.autoFit = true;
        if (!__s.following){ __s.following = true; post({ type:'follow', value:true }); }
        window.__apply();
      };
      window.__onFollow = function(){ if (__s.following && pose && __s.mode === 'follow'){ easeToFollow(); kick(); } };
      window.__onPerson = function(){
        if (!__s.ready) return;
        var toggled = !personMarker !== !__s.person;
        drawPerson();
        // Chỉ chỉnh khung khi icon vừa hiện hoặc vừa mất, khách nhúc nhích không làm camera giật.
        if (toggled && __s.mode !== 'follow' && __s.autoFit) fit();
      };

      // Phần tuyến chưa đi. Lấy theo đích của chặng đang chạy, vì camera cũng chạy tới đó.
      function routeAhead(){
        var s = anim && anim.s1 != null ? anim.s1 : (pose ? pose.s : null);
        return s == null ? __s.route.slice() : __s.route.slice(vertexIndex(s) + 1);
      }
      function fit(animation){
        var pts = [];
        if (__s.route) pts = __s.mode === 'watch' ? routeAhead() : __s.route.slice();
        if (__s.dest) pts.push(__s.dest);
        if (__s.me) pts.push(__s.me);
        if (__s.person) pts.push(__s.person.at);
        if (__s.mode === 'watch' && pose) pts.push(anim ? [anim.lng1, anim.lat1] : [pose.lng, pose.lat]);
        if (pts.length === 0) return;
        if (pts.length === 1){ map.easeTo({ center:pts[0], zoom:15, pitch:0, bearing:0 }); return; }
        var b = new goongjs.LngLatBounds(pts[0], pts[0]);
        for (var i = 1; i < pts.length; i++) b.extend(pts[i]);
        map.fitBounds(b, Object.assign({ padding:${JSON.stringify(fitPadding)}, maxZoom:16, duration:600, pitch:0, bearing:0 }, animation));
      }
      window.__apply = function(){
        if (!__s.ready) return;
        if (__s.dest){
          if (!destMarker) destMarker = new goongjs.Marker({ color:'${destinationColor}' }).setLngLat(__s.dest).addTo(map);
          else destMarker.setLngLat(__s.dest);
        }
        if (__s.mode !== 'overview'){
          if (pose && __s.route) trimRoute(); else drawRoute(__s.route);
          if (__s.mode === 'watch' && __s.autoFit) fit();
          return;
        }
        if (__s.me){
          var b = __s.route ? bearingOf(__s.route[0], __s.route[1]) : (pose ? pose.b : 0);
          pose = { lng:__s.me[0], lat:__s.me[1], s:null, b:b };
          anim = null;
          placePuck(pose.lng, pose.lat, pose.b);
        }
        drawRoute(__s.route);
        if (__s.autoFit) fit();
      };

      // Chỉ thao tác của người dùng mới có originalEvent; camera tự chạy thì không.
      function onUserGesture(e){
        if (!e.originalEvent) return;
        __s.autoFit = false;
        if (__s.mode === 'follow' && __s.following){ __s.following = false; post({ type:'follow', value:false }); }
      }
      ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'].forEach(function(name){ map.on(name, onUserGesture); });

      map.on('load', function(){
        __s.ready = true;
        ensureRoute();
        drawPerson();
        window.__apply();
        if (__s.frame) window.__onFrame(__s.frame);
        setTimeout(function(){ map.resize(); }, 300);
      });
    }
  </script>
</body>
</html>`;
}

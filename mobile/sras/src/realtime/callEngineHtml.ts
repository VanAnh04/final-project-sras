/**
 * Trang HTML chạy WebRTC bên trong WebView ẩn của CallEngine.
 *
 * Giao thức với React Native:
 *  - RN → trang: `window.__callEngine.handle(cmd)` với cmd = start | remoteOffer | remoteAnswer | mute | stop.
 *  - Trang → RN: `window.ReactNativeWebView.postMessage(JSON)` với evt = loaded | ready | offer | answer |
 *    state | ice | error (xem callManager.ts).
 *
 * Không gửi ICE candidate rời từng cái: chờ gom đủ (tối đa 2.5s) rồi gửi một lần cùng SDP, nên mỗi cuộc gọi
 * chỉ cần đúng 2 lần POST /signal.
 *
 * ⚠️ Cả trang nằm trong template string: JS bên dưới KHÔNG được dùng `${...}` hay dấu backtick.
 */
export const CALL_ENGINE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body>
<audio id="remote" autoplay playsinline></audio>
<video id="remoteVideo" autoplay playsinline style="display:none"></video>
<script>
var pc = null,
  localStream = null,
  started = false,
  stopped = false;

function post(m) {
  window.ReactNativeWebView.postMessage(JSON.stringify(m));
}

function errMsg(e) {
  return String((e && e.message) || e);
}

// Chờ gom đủ ICE candidate (hoặc hết ms) để SDP gửi đi đã chứa sẵn candidate.
function waitIce(ms) {
  return new Promise(function (res) {
    if (!pc || pc.iceGatheringState === 'complete') return res();
    var done = false;
    function fin() {
      if (!done) {
        done = true;
        if (pc) pc.removeEventListener('icegatheringstatechange', on);
        res();
      }
    }
    function on() {
      if (pc && pc.iceGatheringState === 'complete') fin();
    }
    pc.addEventListener('icegatheringstatechange', on);
    setTimeout(fin, ms);
  });
}

async function start(c) {
  if (started) return;
  started = true;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
  } catch (e) {
    post({
      evt: 'error',
      code: e && e.name === 'NotAllowedError' ? 'MIC_DENIED' : 'MIC_ERROR',
      message: errMsg(e)
    });
    return;
  }
  // Người dùng đã cúp máy trong lúc chờ xin micro → nhả micro ngay.
  if (stopped) {
    localStream.getTracks().forEach(function (t) { t.stop(); });
    localStream = null;
    return;
  }

  pc = new RTCPeerConnection({ iceServers: c.iceServers || [] });
  localStream.getTracks().forEach(function (t) { pc.addTrack(t, localStream); });
  pc.ontrack = function (ev) {
    var stream = (ev.streams && ev.streams[0]) || new MediaStream([ev.track]);
    var a = document.getElementById('remote');
    if (a) {
      a.srcObject = stream;
      var pa = a.play();
      if (pa && pa.catch) pa.catch(function () {});
    }
    var v = document.getElementById('remoteVideo');
    if (v) {
      v.srcObject = stream;
      var pv = v.play();
      if (pv && pv.catch) pv.catch(function () {});
    }
  };
  pc.onconnectionstatechange = function () {
    post({ evt: 'state', state: pc.connectionState });
  };
  pc.oniceconnectionstatechange = function () {
    post({ evt: 'ice', state: pc.iceConnectionState });
  };
  post({ evt: 'ready' });

  if (c.role === 'caller') {
    await pc.setLocalDescription(await pc.createOffer());
    await waitIce(2500);
    post({ evt: 'offer', sdp: pc.localDescription.sdp });
  }
}

async function remoteOffer(sdp) {
  await pc.setRemoteDescription({ type: 'offer', sdp: sdp });
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIce(2500);
  post({ evt: 'answer', sdp: pc.localDescription.sdp });
}

async function remoteAnswer(sdp) {
  await pc.setRemoteDescription({ type: 'answer', sdp: sdp });
}

function stop() {
  stopped = true;
  try { if (pc) pc.close(); } catch (e) {}
  pc = null;
  if (localStream) localStream.getTracks().forEach(function (t) { t.stop(); });
  localStream = null;
  var a = document.getElementById('remote');
  if (a) a.srcObject = null;
  var v = document.getElementById('remoteVideo');
  if (v) v.srcObject = null;
}

window.__callEngine = {
  handle: function (c) {
    var p;
    if (c.cmd === 'start') p = start(c);
    else if (c.cmd === 'remoteOffer') p = remoteOffer(c.sdp);
    else if (c.cmd === 'remoteAnswer') p = remoteAnswer(c.sdp);
    else if (c.cmd === 'mute') {
      if (localStream) localStream.getAudioTracks().forEach(function (t) { t.enabled = !c.muted; });
    } else if (c.cmd === 'stop') stop();
    if (p && p.catch) p.catch(function (e) {
      post({ evt: 'error', code: 'ENGINE', message: errMsg(e) });
    });
  }
};

if (!window.RTCPeerConnection || !navigator.mediaDevices)
  post({ evt: 'error', code: 'NO_WEBRTC', message: 'Thiết bị không hỗ trợ gọi thoại' });
else post({ evt: 'loaded' });
</script>
</body>
</html>`;

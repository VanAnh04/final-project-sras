import { useSyncExternalStore } from 'react';
import { Alert, AppState, Linking, Vibration } from 'react-native';
import {
  createAudioPlayer,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { callApi, type CallDto, type IceServerDto, type SignalType } from '../api/callApi';
import type { ChatPeer } from '../api/chatApi';
import type { CallStatus } from '../models/enums';
import { formatDuration } from '../utils/call';
import { chatSocket, type CallSocketEvent } from './chatSocket';

/**
 * Bộ điều khiển cuộc gọi thoại — singleton, state ở cấp module (cùng kiểu với chatSocket).
 *
 * Báo hiệu: gửi lên server bằng REST (callApi), nhận sự kiện `CALL_*` qua chatSocket. Âm thanh WebRTC chạy
 * trong WebView ẩn (CallEngine ↔ callEngineHtml.ts) nói chuyện với manager bằng lệnh/sự kiện đơn giản.
 * UI (CallOverlay) chỉ đọc `useCallState()` và gọi các hàm công khai của `callManager`.
 *
 * Luật nghiệp vụ & bảng chuyển trạng thái: docs/business-rules.md §10.
 */

// ─────────────────────────── Kiểu dữ liệu ───────────────────────────

export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active' | 'ended';

export interface CallUiState {
  phase: CallPhase;
  callId: number | null;
  direction: 'out' | 'in' | null;
  rescueRequestId: number | null;
  rescueCode: string | null;
  peerRole: ChatPeer | null;
  peerName: string;
  peerAvatarUrl: string | null;
  muted: boolean;
  minimized: boolean;
  reconnecting: boolean;
  /** Date.now() lúc kết nối xong — UI tự tính đồng hồ. */
  connectedAt: number | null;
  /** Câu hiển thị ở pha `ended`. */
  endText: string | null;
  engineMounted: boolean;
}

export interface StartCallParams {
  rescueRequestId: number;
  peer: ChatPeer;
  peerName: string;
  peerAvatarUrl?: string | null;
}

type EngineRole = 'caller' | 'callee';

type EngineCommand =
  | { cmd: 'start'; role: EngineRole; iceServers: RtcIceServer[] }
  | { cmd: 'remoteOffer'; sdp: string }
  | { cmd: 'remoteAnswer'; sdp: string }
  | { cmd: 'mute'; muted: boolean }
  | { cmd: 'stop' };

interface RtcIceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

interface EngineMessage {
  evt: string;
  sdp?: string;
  state?: string;
  code?: string;
  message?: string;
}

// ─────────────────────────── Hằng số ───────────────────────────

/** Quá hạn này mà chưa kết nối xong âm thanh thì tự kết thúc. */
const CONNECT_TIMEOUT_MS = 20_000;
/** Đang nói mà rớt kết nối quá hạn này (không tự nối lại được) thì tự kết thúc. */
const RECONNECT_TIMEOUT_MS = 10_000;
/** Thời gian giữ màn "đã kết thúc" trước khi đóng. */
const ENDED_VISIBLE_MS = 1_500;
/** Chờ socket mở trước khi bắt đầu / nghe máy. */
const SOCKET_WAIT_MS = 3_000;
/** Cấu hình STUN/TURN chứa credential ngắn hạn nên không cache quá lâu. */
const ICE_CACHE_MS = 30 * 60 * 1000;
const KEEP_AWAKE_TAG = 'call';

const FALLBACK_ICE: RtcIceServer[] = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun.cloudflare.com:3478',
    ],
  },
];

const RINGTONE = require('../../assets/sounds/ringtone.wav');
const RINGBACK = require('../../assets/sounds/ringback.wav');

const IDLE_STATE: CallUiState = {
  phase: 'idle',
  callId: null,
  direction: null,
  rescueRequestId: null,
  rescueCode: null,
  peerRole: null,
  peerName: '',
  peerAvatarUrl: null,
  muted: false,
  minimized: false,
  reconnecting: false,
  connectedAt: null,
  endText: null,
  engineMounted: false,
};

// ─────────────────────────── State ───────────────────────────

/** Bất biến: mỗi lần đổi phải tạo object mới, vì useSyncExternalStore so sánh tham chiếu. */
let state: CallUiState = IDLE_STATE;
const listeners = new Set<() => void>();

const setState = (patch: Partial<CallUiState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

const resetToIdle = () => {
  state = { ...IDLE_STATE };
  listeners.forEach((l) => l());
};

// Biến nội bộ — không đưa ra UI.
let myUserId: number | null = null;
let teardownInit: (() => void) | null = null;
let inject: ((cmd: EngineCommand) => void) | null = null;
let role: EngineRole | null = null;
let engineLoaded = false;
let engineReady = false;
let engineStartSent = false;
/** OFFER / ANSWER đến trước khi engine sẵn sàng. */
let pendingRemote: { type: SignalType; sdp: string } | null = null;
/** Người nhận: máy NÀY đã bấm nghe (khác với máy khác của cùng tài khoản). */
let acceptedHere = false;
/** Người nhận: đang trong lúc gọi API accept (OFFER có thể đến trước phản hồi REST). */
let accepting = false;
/** Người gọi: đang trong lúc xin quyền / chờ socket / gọi API start. */
let starting = false;
/** Đang chờ phản hồi API end (chống bấm kết thúc hai lần). */
let ending = false;
/** Sự kiện CALL_* đến trong lúc `starting` (có thể đến trước phản hồi REST). */
let earlyEvents: CallSocketEvent[] = [];
let iceCache: { servers: RtcIceServer[]; at: number } | null = null;
let connectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let endedTimer: ReturnType<typeof setTimeout> | null = null;
let ringPlayer: AudioPlayer | null = null;
let backPlayer: AudioPlayer | null = null;
let soundGen = 0;
/** Cuộc gọi đã xử lý xong ở máy này — bỏ qua nếu sự kiện/đồng bộ muộn đưa nó trở lại. */
const handledCalls = new Set<number>();

const markHandled = (id: number) => {
  handledCalls.add(id);
  if (handledCalls.size > 30) {
    const oldest = handledCalls.values().next().value;
    if (oldest !== undefined) handledCalls.delete(oldest);
  }
};

const apiMessage = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Cuộc gọi `id` còn đang diễn ra ở máy này (chưa kết thúc / chưa đóng). */
const isLive = (id: number): boolean =>
  state.callId === id &&
  (state.phase === 'outgoing' ||
    state.phase === 'incoming' ||
    state.phase === 'connecting' ||
    state.phase === 'active');

// ─────────────────────────── Timer ───────────────────────────

const clearConnectTimer = () => {
  if (connectTimer) {
    clearTimeout(connectTimer);
    connectTimer = null;
  }
};

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const clearEndedTimer = () => {
  if (endedTimer) {
    clearTimeout(endedTimer);
    endedTimer = null;
  }
};

// ─────────────────────────── Âm thanh (chuông / tiếng chờ) ───────────────────────────

/** Cấu hình audio session để gọi thoại hai chiều (cho phép micro và phát qua loa trong chế độ im lặng). */
const setupCallAudioMode = async () => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    if (__DEV__) console.log('[call] setupCallAudioMode OK (allowsRecording: true)');
  } catch (e) {
    if (__DEV__) console.warn('[call] setupCallAudioMode error:', e);
  }
};

/** Đưa audio session về trạng thái bình thường sau khi cuộc gọi kết thúc. */
const resetAudioMode = async () => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      allowsRecording: false,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
  } catch {}
};

/** Dừng và giải phóng mọi player + rung. Phải xong TRƯỚC khi mount engine để không giành audio session với WebView. */
const stopSounds = () => {
  soundGen += 1;
  for (const p of [ringPlayer, backPlayer]) {
    try {
      p?.pause();
      p?.remove();
    } catch {}
  }
  ringPlayer = null;
  backPlayer = null;
  Vibration.cancel();
};

/** Tạo player khi cần (lazy), bật lặp. */
const playLoop = async (source: number, kind: 'ring' | 'back') => {
  const gen = ++soundGen;
  try {
    await setAudioModeAsync({
      // Theo công tắc im lặng của máy: máy đang im lặng thì chỉ rung.
      playsInSilentMode: false,
      interruptionMode: 'duckOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    if (gen !== soundGen) return; // đã bị dừng trong lúc cấu hình
    const player = createAudioPlayer(source);
    player.loop = true;
    player.play();
    if (kind === 'ring') ringPlayer = player;
    else backPlayer = player;
  } catch {}
};

const keepAwake = () => {
  activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
};

// ─────────────────────────── Quyền micro & socket ───────────────────────────

const ensureMicPermission = async (): Promise<boolean> => {
  try {
    let perm = await getRecordingPermissionsAsync();
    if (perm.granted) return true;
    if (!perm.canAskAgain) return false;
    perm = await requestRecordingPermissionsAsync();
    return perm.granted;
  } catch {
    return false;
  }
};

const alertMicDenied = () =>
  Alert.alert('Cần quyền micro', 'Cần quyền micro để gọi. Vào Cài đặt để cấp quyền.', [
    { text: 'Để sau', style: 'cancel' },
    {
      text: 'Mở Cài đặt',
      onPress: () => {
        Linking.openSettings().catch(() => {});
      },
    },
  ]);

/** Chờ chatSocket mở (nối lại ngay nếu đang chờ backoff). */
const ensureSocket = (timeoutMs: number): Promise<boolean> =>
  new Promise((resolve) => {
    if (chatSocket.isConnected()) {
      resolve(true);
      return;
    }
    if (myUserId != null) chatSocket.connect(myUserId);

    let done = false;
    let unsubscribe: (() => void) | null = null;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsubscribe?.();
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    // onStatus gọi handler ngay lập tức — có thể kết thúc trước khi `unsubscribe` được gán.
    const off = chatSocket.onStatus((connected) => {
      if (connected) finish(true);
    });
    if (done) off();
    else unsubscribe = off;
  });

const waitForUserId = async (timeoutMs: number): Promise<number | null> => {
  const t0 = Date.now();
  while (myUserId == null && Date.now() - t0 < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
  }
  return myUserId;
};

// ─────────────────────────── ICE (STUN/TURN) ───────────────────────────

/** Bỏ các trường null — RTCPeerConnection không nhận `username: null`. */
const cleanIce = (servers: IceServerDto[]): RtcIceServer[] =>
  servers
    .filter((s) => Array.isArray(s.urls) && s.urls.length > 0)
    .map((s) => {
      const out: RtcIceServer = { urls: s.urls };
      if (s.username) out.username = s.username;
      if (s.credential) out.credential = s.credential;
      return out;
    });

const getIceServers = async (): Promise<RtcIceServer[]> => {
  if (iceCache && Date.now() - iceCache.at < ICE_CACHE_MS) return iceCache.servers;
  try {
    const servers = cleanIce(await callApi.getIceServers());
    iceCache = { servers: servers.length ? servers : FALLBACK_ICE, at: Date.now() };
  } catch {
    // Lấy cấu hình lỗi → vẫn thử gọi bằng STUN công cộng (không cache để lần sau thử lại).
    return iceCache?.servers ?? FALLBACK_ICE;
  }
  return iceCache.servers;
};

// ─────────────────────────── Engine (WebView) ───────────────────────────

/** Gửi `start` cho engine khi đã đủ: engine mount + trang đã tải + đã biết vai. */
const maybeStartEngine = () => {
  if (engineStartSent || !engineLoaded || !inject || !state.engineMounted || !role) return;
  engineStartSent = true;
  const id = state.callId;
  const startRole = role;
  getIceServers().then((iceServers) => {
    if (id == null || !isLive(id) || !inject) return;
    inject({ cmd: 'start', role: startRole, iceServers });
  });
};

const flushPendingRemote = () => {
  if (!pendingRemote || !engineReady || !inject) return;
  const { type, sdp } = pendingRemote;
  pendingRemote = null;
  inject(type === 'OFFER' ? { cmd: 'remoteOffer', sdp } : { cmd: 'remoteAnswer', sdp });
};

const deliverRemote = (type: SignalType, sdp: string) => {
  pendingRemote = { type, sdp };
  flushPendingRemote();
};

const startConnectTimer = () => {
  clearConnectTimer();
  connectTimer = setTimeout(() => {
    connectTimer = null;
    if (state.phase === 'connecting') failCall();
  }, CONNECT_TIMEOUT_MS);
};

// ─────────────────────────── Kết thúc cuộc gọi ───────────────────────────

const endTextFor = (status: CallStatus, direction: 'out' | 'in', durationSec?: number | null): string => {
  switch (status) {
    case 'ENDED':
      return durationSec != null ? `Cuộc gọi kết thúc · ${formatDuration(durationSec)}` : 'Cuộc gọi kết thúc';
    case 'REJECTED':
      return direction === 'out' ? 'Người nhận đã từ chối' : 'Đã từ chối';
    case 'CANCELLED':
      return direction === 'out' ? 'Đã hủy cuộc gọi' : 'Cuộc gọi nhỡ';
    case 'MISSED':
      return direction === 'out' ? 'Không trả lời' : 'Cuộc gọi nhỡ';
    case 'FAILED':
      return 'Mất kết nối';
    default:
      return 'Cuộc gọi kết thúc';
  }
};

/**
 * Giải phóng mọi tài nguyên của cuộc gọi hiện tại: âm thanh, engine, timer, màn hình sáng. KHÔNG đổi phase.
 * App đang ở nền thì đóng socket (AuthContext đã giữ socket mở chỉ vì cuộc gọi).
 */
const releaseCall = () => {
  stopSounds();
  void resetAudioMode();
  inject?.({ cmd: 'stop' });
  clearConnectTimer();
  clearReconnectTimer();
  pendingRemote = null;
  acceptedHere = false;
  accepting = false;
  ending = false;
  role = null;
  engineLoaded = false;
  engineReady = false;
  engineStartSent = false;
  deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  if (AppState.currentState === 'background') chatSocket.disconnect();
};

/** Dọn dẹp rồi hiện màn "đã kết thúc" ~1.5s, sau đó về idle. */
const showEnded = (status: CallStatus, durationSec?: number | null, overrideText?: string) => {
  if (state.callId != null) markHandled(state.callId);
  const direction = state.direction ?? 'out';
  releaseCall();
  clearEndedTimer();
  setState({
    phase: 'ended',
    engineMounted: false,
    minimized: false,
    reconnecting: false,
    endText: overrideText ?? endTextFor(status, direction, durationSec),
  });
  endedTimer = setTimeout(() => {
    endedTimer = null;
    resetToIdle();
  }, ENDED_VISIBLE_MS);
};

/** Mất kết nối / lỗi không cứu được: báo server FAILED rồi kết thúc. */
function failCall(overrideText?: string) {
  const id = state.callId;
  if (__DEV__) console.warn('[call] failCall called:', overrideText, 'callId:', id, 'phase:', state.phase);
  if (id == null || !isLive(id)) return;
  callApi.end(id, true).catch(() => {});
  showEnded('FAILED', null, overrideText);
}

const localDurationSec = (): number | null =>
  state.connectedAt != null ? Math.max(0, Math.round((Date.now() - state.connectedAt) / 1000)) : null;

// ─────────────────────────── Vào các pha ───────────────────────────

const resetCallFlags = () => {
  pendingRemote = null;
  acceptedHere = false;
  accepting = false;
  ending = false;
  role = null;
  engineLoaded = false;
  engineReady = false;
  engineStartSent = false;
  clearConnectTimer();
  clearReconnectTimer();
  clearEndedTimer();
};

const enterIncoming = (call: CallDto) => {
  resetCallFlags();
  role = 'callee';
  state = { ...IDLE_STATE };
  setState({
    phase: 'incoming',
    callId: call.id,
    direction: 'in',
    rescueRequestId: call.rescueRequestId,
    rescueCode: call.rescueCode ?? null,
    peerRole: call.callerRole,
    peerName: call.callerName || 'Người gọi',
    peerAvatarUrl: call.callerAvatarUrl ?? null,
  });
  playLoop(RINGTONE, 'ring');
  Vibration.vibrate([0, 800, 1200], true);
  keepAwake();
  void getIceServers(); // nạp sẵn để lúc nghe máy không phải chờ
};

const enterOutgoing = (call: CallDto, params: StartCallParams) => {
  resetCallFlags();
  role = 'caller';
  state = { ...IDLE_STATE };
  setState({
    phase: 'outgoing',
    callId: call.id,
    direction: 'out',
    rescueRequestId: call.rescueRequestId,
    rescueCode: call.rescueCode ?? null,
    peerRole: call.calleeRole,
    peerName: call.calleeName || params.peerName,
    peerAvatarUrl: call.calleeAvatarUrl ?? params.peerAvatarUrl ?? null,
  });
  playLoop(RINGBACK, 'back');
  keepAwake();
  void getIceServers();
};

/** Người gọi: người nhận đã nghe máy → dựng engine để tạo OFFER. */
const onAcceptedAsCaller = () => {
  if (__DEV__) console.log('[call] onAcceptedAsCaller -> mounting engine & setting audio mode');
  stopSounds(); // tắt tiếng chờ và nhả audio session trước khi mount engine
  void setupCallAudioMode();
  setState({ phase: 'connecting', engineMounted: true });
  startConnectTimer();
  maybeStartEngine();
};

// ─────────────────────────── Trạng thái kết nối của engine ───────────────────────────

const onConnected = () => {
  if (__DEV__) console.log('[call] onConnected! WebRTC P2P audio established');
  if (state.phase === 'connecting') {
    clearConnectTimer();
    setState({ phase: 'active', connectedAt: Date.now(), reconnecting: false });
  } else if (state.phase === 'active' && state.reconnecting) {
    clearReconnectTimer();
    setState({ reconnecting: false });
  }
};

const onDisconnected = () => {
  if (__DEV__) console.warn('[call] onDisconnected, attempting reconnect...');
  if (state.phase !== 'active' || state.reconnecting) return;
  setState({ reconnecting: true });
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (state.phase === 'active' && state.reconnecting) failCall();
  }, RECONNECT_TIMEOUT_MS);
};

const onConnectionFailed = () => {
  if (__DEV__) console.warn('[call] onConnectionFailed in phase:', state.phase);
  if (state.phase === 'active' || state.phase === 'connecting') failCall();
};

const handleEngineError = (code?: string, message?: string) => {
  const id = state.callId;
  if (id == null || !isLive(id)) return;
  switch (code) {
    case 'MIC_DENIED':
      failCall('Không dùng được micro');
      alertMicDenied();
      break;
    case 'MIC_ERROR':
      failCall('Không dùng được micro');
      Alert.alert(
        'Không dùng được micro',
        'Không mở được micro. Hãy kiểm tra xem ứng dụng khác có đang dùng micro không rồi thử lại.',
      );
      break;
    case 'NO_WEBRTC':
      failCall('Không hỗ trợ gọi thoại');
      Alert.alert(
        'Không gọi được',
        'Thiết bị không hỗ trợ gọi thoại trong ứng dụng. Bạn có thể dùng nút "Gọi" thông thường.',
      );
      break;
    default:
      // ENGINE: lỗi bất ngờ khi thương lượng — không cứu được nên kết thúc thay vì để treo.
      if (__DEV__) console.warn('[call] Lỗi engine:', code, message);
      failCall();
  }
};

const sendSignal = (type: SignalType, sdp: string) => {
  const id = state.callId;
  if (__DEV__) console.log('[call] sendSignal:', type, 'for callId:', id);
  if (id == null || !isLive(id)) return;
  callApi.signal(id, type, sdp).catch((e) => {
    if (__DEV__) console.warn('[call] sendSignal error:', e);
    if (isLive(id)) failCall();
  });
};

// ─────────────────────────── Sự kiện CALL_* từ server ───────────────────────────

const handleCallEvent = (ev: CallSocketEvent) => {
  // Người gọi: sự kiện có thể đến trước cả phản hồi REST của /calls → giữ lại, phát lại sau.
  if (starting && state.phase === 'idle') {
    earlyEvents.push(ev);
    return;
  }

  switch (ev.event) {
    case 'CALL_INCOMING': {
      const call = ev.call;
      if (myUserId != null && call.calleeId !== myUserId) return;
      if (handledCalls.has(call.id)) return;
      // Đang hiện màn "đã kết thúc" của cuộc trước → đóng ngay để nhận cuộc mới.
      if (state.phase === 'ended') {
        clearEndedTimer();
        resetToIdle();
      }
      if (state.phase !== 'idle') return; // đang bận
      enterIncoming(call);
      return;
    }

    case 'CALL_ACCEPTED': {
      if (ev.callId !== state.callId) return;
      if (state.phase === 'outgoing') {
        onAcceptedAsCaller();
      } else if (state.phase === 'incoming' && !acceptedHere && !accepting) {
        // Máy khác của cùng tài khoản đã nghe → tắt chuông ở máy này.
        markHandled(ev.callId);
        releaseCall();
        resetToIdle();
      }
      return;
    }

    case 'CALL_SIGNAL': {
      if (ev.callId !== state.callId) return;
      const toCallee = ev.type === 'OFFER' && state.direction === 'in' && (acceptedHere || accepting);
      const toCaller =
        ev.type === 'ANSWER' && state.direction === 'out' && (state.phase === 'connecting' || state.phase === 'active');
      if (toCallee || toCaller) deliverRemote(ev.type, ev.sdp);
      return;
    }

    case 'CALL_ENDED': {
      if (ev.callId !== state.callId) return;
      if (state.phase === 'idle' || state.phase === 'ended') return;
      showEnded(ev.status, ev.durationSec);
      return;
    }
  }
};

/**
 * So trạng thái server với máy mỗi khi socket mở lại (rớt mạng, app về foreground, mở app từ push):
 * có thể đã lỡ sự kiện CALL_* trong lúc mất kết nối.
 */
const syncActive = async () => {
  if (myUserId == null) return;
  const phaseBefore = state.phase;
  const callIdBefore = state.callId;

  let active: CallDto | null;
  try {
    active = await callApi.getActive();
  } catch {
    return;
  }
  // Trong lúc chờ phản hồi, máy đã chuyển cuộc gọi / pha khác → kết quả đã cũ.
  if (state.phase !== phaseBefore || state.callId !== callIdBefore) return;
  // Đang trong lúc bắt đầu / nghe máy: REST của chính ta sẽ cập nhật state.
  if (starting || accepting) return;

  if (active) {
    if (state.phase === 'idle') {
      if (handledCalls.has(active.id)) return;
      if (active.status === 'RINGING' && active.calleeId === myUserId) {
        enterIncoming(active);
      } else if (active.status === 'ONGOING') {
        // Server vẫn tính đang nói nhưng máy không còn engine (vd. app bị tắt giữa cuộc gọi) → đóng.
        markHandled(active.id);
        callApi.end(active.id, true).catch(() => {});
      }
      return;
    }
    if (state.callId === active.id) {
      if (state.phase === 'outgoing' && active.status === 'ONGOING') onAcceptedAsCaller();
      else if (state.phase === 'incoming' && active.status === 'ONGOING' && !acceptedHere) {
        markHandled(active.id);
        releaseCall();
        resetToIdle();
      }
    }
    return;
  }

  // Server không còn cuộc gọi nào → cuộc gọi của máy đã kết thúc trong lúc mất kết nối.
  if (state.phase === 'idle' || state.phase === 'ended' || callIdBefore == null) return;
  const id = callIdBefore;
  if (state.phase === 'incoming') {
    markHandled(id);
    releaseCall();
    resetToIdle();
    return;
  }
  try {
    const final = await callApi.get(id);
    if (isLive(id)) showEnded(final.status, final.durationSec);
  } catch {
    if (isLive(id)) {
      markHandled(id);
      releaseCall();
      resetToIdle();
    }
  }
};

// ─────────────────────────── API công khai ───────────────────────────

export const callManager = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getState(): CallUiState {
    return state;
  },

  /** Đăng ký nhận sự kiện cuộc gọi cho người dùng đang đăng nhập. Trả về hàm huỷ. */
  init(userId: number): () => void {
    teardownInit?.(); // luôn chỉ giữ một đăng ký, kể cả khi init bị gọi chồng nhau
    myUserId = userId;
    const offCall = chatSocket.onCallEvent(handleCallEvent);
    // onStatus gọi ngay với trạng thái hiện tại; mỗi lần socket mở lại thì đồng bộ với server.
    const offStatus = chatSocket.onStatus((connected) => {
      if (connected) void syncActive();
    });
    const teardown = () => {
      offCall();
      offStatus();
      if (myUserId === userId) myUserId = null;
      if (teardownInit === teardown) teardownInit = null;
    };
    teardownInit = teardown;
    return teardown;
  },

  /** Bắt đầu gọi cho `peer` trong đơn. Lỗi nào cũng báo bằng Alert (tiếng Việt). */
  async startCall(params: StartCallParams): Promise<void> {
    if (__DEV__) console.log('[call] startCall called with params:', params);
    if (state.phase !== 'idle' || starting) {
      Alert.alert('Bạn đang trong một cuộc gọi');
      return;
    }
    starting = true;
    earlyEvents = [];
    try {
      if (!(await ensureMicPermission())) {
        alertMicDenied();
        return;
      }
      if (!(await ensureSocket(SOCKET_WAIT_MS))) {
        Alert.alert('Mất kết nối máy chủ, vui lòng thử lại');
        return;
      }
      let call: CallDto;
      try {
        call = await callApi.start(params.rescueRequestId, params.peer);
        if (__DEV__) console.log('[call] callApi.start success, callId:', call.id);
      } catch (e) {
        if (__DEV__) console.warn('[call] callApi.start failed:', e);
        Alert.alert('Không gọi được', apiMessage(e, 'Vui lòng thử lại.'));
        return;
      }
      enterOutgoing(call, params);
    } finally {
      starting = false;
      // Phát lại sự kiện đến sớm: khớp cuộc gọi vừa tạo thì xử lý, còn lại (vd. cuộc gọi đến) cũng xử lý bình thường.
      const early = earlyEvents;
      earlyEvents = [];
      early.forEach(handleCallEvent);
    }
  },

  /** Người nhận bấm nghe. */
  async accept(): Promise<void> {
    if (state.phase !== 'incoming' || state.callId == null || accepting) return;
    const id = state.callId;
    accepting = true;
    stopSounds(); // tắt chuông + rung trước khi hỏi quyền / mount engine
    try {
      if (!(await ensureMicPermission())) {
        callApi.reject(id).catch(() => {});
        if (isLive(id)) {
          markHandled(id);
          releaseCall();
          resetToIdle();
        }
        alertMicDenied();
        return;
      }
      if (!(await ensureSocket(SOCKET_WAIT_MS))) {
        callApi.reject(id).catch(() => {});
        if (isLive(id)) {
          markHandled(id);
          releaseCall();
          resetToIdle();
        }
        Alert.alert('Mất kết nối máy chủ, vui lòng thử lại');
        return;
      }
      // Người gọi có thể đã cúp trong lúc chờ → CALL_ENDED đã đưa máy sang pha khác.
      if (!isLive(id) || state.phase !== 'incoming') return;

      try {
        await callApi.accept(id);
      } catch (e) {
        if (isLive(id) && state.phase === 'incoming') {
          markHandled(id);
          releaseCall();
          resetToIdle();
          Alert.alert('Không nghe máy được', apiMessage(e, 'Vui lòng thử lại.'));
        }
        return;
      }
      if (!isLive(id)) return;

      acceptedHere = true;
      role = 'callee';
      void setupCallAudioMode();
      setState({ phase: 'connecting', engineMounted: true });
      startConnectTimer();
      maybeStartEngine();
    } finally {
      accepting = false;
    }
  },

  /** Người nhận từ chối. */
  async reject(): Promise<void> {
    if (state.phase !== 'incoming' || state.callId == null) return;
    const id = state.callId;
    markHandled(id);
    releaseCall();
    resetToIdle();
    try {
      await callApi.reject(id);
    } catch {}
  },

  /** Cúp máy ở mọi pha (đang đổ chuông thì là từ chối / hủy). */
  async hangup(): Promise<void> {
    const id = state.callId;
    if (id == null || state.phase === 'idle' || state.phase === 'ended') return;
    if (state.phase === 'incoming') {
      await callManager.reject();
      return;
    }
    if (ending) return;
    ending = true;
    const wasOutgoing = state.phase === 'outgoing';
    inject?.({ cmd: 'stop' }); // nhả micro ngay, không chờ server

    let res: CallDto | null = null;
    try {
      res = await callApi.end(id);
    } catch {}
    ending = false;
    if (!isLive(id)) return; // CALL_ENDED đã đến trước phản hồi REST
    showEnded(res?.status ?? (wasOutgoing ? 'CANCELLED' : 'ENDED'), res?.durationSec ?? localDurationSec());
  },

  toggleMute() {
    if (state.phase === 'idle' || state.phase === 'ended') return;
    const muted = !state.muted;
    setState({ muted });
    inject?.({ cmd: 'mute', muted });
  },

  setMinimized(minimized: boolean) {
    if (state.phase === 'idle') return;
    setState({ minimized });
  },

  /** Mở màn đổ chuông từ push "Cuộc gọi đến". true = cuộc gọi còn đổ chuông và đã hiện UI. */
  async openFromPush(callId: number): Promise<boolean> {
    if (!Number.isFinite(callId)) return false;
    if (state.callId === callId && isLive(callId)) return true;
    if (state.phase !== 'idle') return false;

    let call: CallDto;
    try {
      call = await callApi.get(callId);
    } catch {
      return false;
    }
    const me = await waitForUserId(3000);
    if (call.status !== 'RINGING' || me == null || call.calleeId !== me) return false;
    if (state.phase !== 'idle') return state.callId === callId;
    enterIncoming(call);
    return true;
  },

  /** Đang có cuộc gọi (đổ chuông / nói) — AuthContext dùng để giữ socket khi app xuống nền. */
  hasActiveCall(): boolean {
    return state.phase !== 'idle' && state.phase !== 'ended';
  },

  /** Đăng xuất: kết thúc cuộc gọi đang có (khi token còn hiệu lực) rồi dọn sạch. */
  async reset(): Promise<void> {
    const id = state.callId;
    const phase = state.phase;
    if (id != null && (phase === 'incoming' || phase === 'outgoing' || phase === 'connecting' || phase === 'active')) {
      inject?.({ cmd: 'stop' });
      const request = phase === 'incoming' ? callApi.reject(id) : callApi.end(id);
      await Promise.race([request.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2500))]);
    }
    clearEndedTimer();
    releaseCall();
    iceCache = null;
    earlyEvents = [];
    starting = false;
    resetToIdle();
  },

  // ── Chỉ CallEngine dùng ──

  attachEngine(fn: (cmd: EngineCommand) => void) {
    inject = fn;
    maybeStartEngine();
  },

  detachEngine() {
    inject = null;
    engineLoaded = false;
    engineReady = false;
    engineStartSent = false;
  },

  onEngineMessage(raw: string) {
    let msg: EngineMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg.evt !== 'string') return;
    if (__DEV__) console.log('[call] onEngineMessage:', msg.evt, msg.state || msg.code || '');
    if (!state.engineMounted) return; // tin muộn của engine đã gỡ

    switch (msg.evt) {
      case 'loaded':
        engineLoaded = true;
        maybeStartEngine();
        break;
      case 'ready':
        engineReady = true;
        if (state.muted) inject?.({ cmd: 'mute', muted: true });
        flushPendingRemote();
        break;
      case 'offer':
        if (msg.sdp) sendSignal('OFFER', msg.sdp);
        break;
      case 'answer':
        if (msg.sdp) sendSignal('ANSWER', msg.sdp);
        break;
      case 'state':
        if (msg.state === 'connected') onConnected();
        else if (msg.state === 'disconnected') onDisconnected();
        else if (msg.state === 'failed') onConnectionFailed();
        break;
      case 'ice':
        // iOS cũ không có connectionState → dùng iceConnectionState làm dự phòng.
        if (msg.state === 'connected' || msg.state === 'completed') onConnected();
        else if (msg.state === 'disconnected') onDisconnected();
        else if (msg.state === 'failed') onConnectionFailed();
        break;
      case 'error':
        handleEngineError(msg.code, msg.message);
        break;
    }
  },
};

/** Đọc state cuộc gọi trong component. */
export function useCallState(): CallUiState {
  return useSyncExternalStore(callManager.subscribe, callManager.getState, callManager.getState);
}

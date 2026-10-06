import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Phone,
  Send,
  Camera,
  Plus,
  CheckCheck,
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { chatApi, ChatMessageDto, ChatPeer } from '../api/chatApi';
import { rescueApi, RescueRequestDto } from '../api/rescueApi';
import { chatSocket } from '../realtime/chatSocket';
import { resolveFileUrl } from '../api/axiosClient';

const POLL_MS = 3000;

/** Gộp danh sách tin nhắn theo id (khử trùng), sắp xếp cũ → mới. */
const mergeMessages = (prev: ChatMessageDto[], incoming: ChatMessageDto[]): ChatMessageDto[] => {
  const map = new Map<number, ChatMessageDto>();
  for (const m of prev) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return Array.from(map.values()).sort((a, b) => {
    const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return t !== 0 ? t : a.id - b.id;
  });
};

/** Định dạng giờ tin nhắn (vd: 14:20). */
const formatMsgTime = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

/** Kiểm tra cùng ngày. */
const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/** Tiêu đề ngày hiển thị phân đoạn. */
const formatDateDivider = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  if (isSameDay(d, now)) return 'Hôm nay';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Hôm qua';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    requestId?: string;
    peer?: string;
    peerName?: string;
    peerPhone?: string;
    peerRole?: string;
    peerAvatar?: string;
  }>();

  const requestId = params.requestId ? Number(params.requestId) : NaN;
  const peer = (params.peer || '').toUpperCase() as ChatPeer;
  const peerName = params.peerName || 'Người dùng';
  const peerPhone = params.peerPhone;
  const rawRole = params.peerRole || 'Đội cứu hộ';

  const hasThread = Number.isFinite(requestId) && (peer === 'CUSTOMER' || peer === 'GARAGE' || peer === 'STAFF');

  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [rescueReq, setRescueReq] = useState<RescueRequestDto | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connected, setConnected] = useState(false);

  // Gợi ý tin nhắn nhanh phù hợp theo ngữ cảnh role
  const quickReplies = useMemo(() => {
    if (user?.role === 'GARAGE_STAFF') {
      return [
        'Chào bạn, tôi đã nhận được thông tin.',
        'Tôi đang trên đường tới, khoảng 15 phút nữa sẽ có mặt.',
        'Bạn vui lòng bật đèn khẩn cấp giúp tôi nhé.',
        'Tôi đã đến nơi, bạn đang đứng ở vị trí nào?',
      ];
    }
    if (user?.role === 'GARAGE_OWNER') {
      return [
        'Gara đã tiếp nhận yêu cầu của bạn.',
        'Chúng tôi đang phân công nhân viên cứu hộ tới hỗ trợ ngay.',
        'Bạn giữ máy để nhân viên liên hệ nhé.',
      ];
    }
    // Customer
    return [
      'Chào bạn, xe tôi đang gặp sự cố, bạn qua kiểm tra giúp được không?',
      'Tôi đang ở đây, bạn tới nhanh nhé!',
      'Bạn còn bao xa nữa?',
      'Tôi đang gửi vị trí và ảnh chụp sự cố.',
    ];
  }, [user?.role]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  // Lấy chi tiết đơn để hiển thị subtitle (loại xe • biển số hoặc vai trò)
  useEffect(() => {
    if (!Number.isFinite(requestId)) return;
    let alive = true;
    (async () => {
      try {
        const req = await rescueApi.getOne(requestId);
        if (alive) setRescueReq(req);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [requestId]);

  // Nạp lịch sử chat + đăng ký realtime
  useEffect(() => {
    if (!hasThread) return;
    let alive = true;

    (async () => {
      try {
        const history = await chatApi.getThread(requestId, peer);
        if (!alive) return;
        setMessages(history);
        scrollToEnd();
      } catch {
        // giữ mảng rỗng
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const unsub = chatSocket.subscribe(requestId, peer, (msg) => {
      setMessages((prev) => mergeMessages(prev, [msg]));
      scrollToEnd();
    });
    const unsubStatus = chatSocket.onStatus((c) => alive && setConnected(c));

    return () => {
      alive = false;
      unsub();
      unsubStatus();
    };
  }, [hasThread, requestId, peer, scrollToEnd]);

  // Fallback polling khi WebSocket chưa kết nối
  useEffect(() => {
    if (!hasThread || connected) return;
    let alive = true;
    const timer = setInterval(async () => {
      try {
        const history = await chatApi.getThread(requestId, peer);
        if (alive) setMessages((prev) => mergeMessages(prev, history));
      } catch {}
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [hasThread, connected, requestId, peer]);

  const doSend = useCallback(
    async (payload: { content?: string; imageUrl?: string }) => {
      if (sending) return;
      setSending(true);
      try {
        const saved = await chatApi.send(requestId, { peer, ...payload });
        setMessages((prev) => mergeMessages(prev, [saved]));
        scrollToEnd();
      } catch (e: any) {
        Alert.alert('Không gửi được', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
      } finally {
        setSending(false);
      }
    },
    [sending, requestId, peer, scrollToEnd],
  );

  const sendText = (content?: string) => {
    const body = (content ?? text).trim();
    if (!body) return;
    setText('');
    doSend({ content: body });
  };

  const pickImage = async (useCamera = false) => {
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Cần quyền chụp ảnh', 'Vui lòng cấp quyền camera để chụp ảnh gửi tin nhắn.');
          return;
        }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (res.canceled || !res.assets?.[0]?.uri) return;
        setUploading(true);
        const url = await chatApi.uploadImage(res.assets[0].uri);
        await doSend({ imageUrl: url, content: text.trim() || undefined });
        setText('');
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Cần quyền truy cập ảnh', 'Vui lòng cấp quyền thư viện để gửi ảnh.');
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
        if (res.canceled || !res.assets?.[0]?.uri) return;
        setUploading(true);
        const url = await chatApi.uploadImage(res.assets[0].uri);
        await doSend({ imageUrl: url, content: text.trim() || undefined });
        setText('');
      }
    } catch (e: any) {
      Alert.alert('Không gửi được ảnh', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const onPlusPress = () => {
    Alert.alert('Đính kèm', 'Chọn phương thức gửi hình ảnh:', [
      { text: 'Chụp ảnh mới', onPress: () => pickImage(true) },
      { text: 'Chọn từ thư viện', onPress: () => pickImage(false) },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  const myId = user?.id;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      if (user?.role === 'CUSTOMER') {
        router.replace('/customer/messages');
      } else if (user?.role === 'GARAGE_STAFF') {
        router.replace('/garage-staff/messages');
      } else if (user?.role === 'GARAGE_OWNER') {
        router.replace('/garage-owner/messages');
      } else {
        router.replace('/');
      }
    }
  };

  // Subtitle hiển thị đẹp dưới tên (vd: VinFast VF8 • 29A-888.88 hoặc Khách cần cứu hộ)
  const headerSubtitle = useMemo(() => {
    if (rescueReq?.rescueVehicle?.licensePlate && rescueReq?.rescueVehicle?.vehicleKind) {
      return `${rescueReq.rescueVehicle.vehicleKind} • ${rescueReq.rescueVehicle.licensePlate}`;
    }
    if (rescueReq?.rescueVehicle?.licensePlate) {
      return `Xe cứu hộ • ${rescueReq.rescueVehicle.licensePlate}`;
    }
    return rawRole;
  }, [rescueReq, rawRole]);

  if (!hasThread) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.peerName}>Tin nhắn</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.emptyHint}>Không mở được cuộc trò chuyện này.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header thanh lịch, chuẩn mẫu */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.iconBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </TouchableOpacity>

        {/* Avatar kèm chấm xanh Online */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{peerName.trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>

        {/* Tên & Subtitle màu cam */}
        <View style={styles.peerInfoCol}>
          <Text style={styles.peerName} numberOfLines={1}>{peerName}</Text>
          <Text style={styles.peerSubtitle} numberOfLines={1}>{headerSubtitle}</Text>
        </View>

        {/* Nút gọi cam nổi bật */}
        {!!peerPhone && (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => Linking.openURL(`tel:${peerPhone}`)}
            activeOpacity={0.85}
          >
            <Phone size={19} color="#ffffff" strokeWidth={2.4} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
        >
          {/* Badge ngày hôm nay */}
          <View style={styles.dateDividerWrap}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>
                {messages.length > 0 ? formatDateDivider(messages[0].createdAt) : 'Hôm nay'}
              </Text>
            </View>
          </View>

          {loading && <ActivityIndicator color="#ea580c" style={{ marginTop: 20 }} />}

          {!loading && messages.length === 0 && (
            <Text style={styles.emptyHint}>Bắt đầu trò chuyện với {peerName}.</Text>
          )}

          {messages.map((m, index) => {
            const mine = myId != null && m.senderId === myId;
            const img = resolveFileUrl(m.imageUrl);
            const timeStr = formatMsgTime(m.createdAt);

            // Kiểm tra phân cách ngày giữa các tin nhắn
            const prev = messages[index - 1];
            const showDateDivider =
              index > 0 &&
              !isSameDay(new Date(m.createdAt), new Date(prev.createdAt));

            return (
              <View key={m.id}>
                {showDateDivider && (
                  <View style={styles.dateDividerWrap}>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>{formatDateDivider(m.createdAt)}</Text>
                    </View>
                  </View>
                )}

                {mine ? (
                  // Tin nhắn của TÔI (Màu cam)
                  <View style={styles.mineRow}>
                    <View style={styles.bubbleMine}>
                      {!!img && (
                        <Image source={{ uri: img }} style={styles.bubbleImage} resizeMode="cover" />
                      )}
                      {!!m.content && (
                        <Text style={[styles.bubbleText, styles.bubbleTextMine, !!img && styles.captionMine]}>
                          {m.content}
                        </Text>
                      )}
                    </View>
                    <View style={styles.metaMineRow}>
                      <Text style={styles.timeText}>{timeStr}</Text>
                      <CheckCheck size={14} color="#ea580c" strokeWidth={2.4} />
                    </View>
                  </View>
                ) : (
                  // Tin nhắn của ĐỐI PHƯƠNG (Màu xám nhạt)
                  <View style={styles.theirsRow}>
                    <View style={styles.bubbleTheirs}>
                      {!!img && (
                        <Image source={{ uri: img }} style={styles.bubbleImage} resizeMode="cover" />
                      )}
                      {!!m.content && (
                        <Text style={[styles.bubbleText, styles.bubbleTextTheirs, !!img && styles.captionTheirs]}>
                          {m.content}
                        </Text>
                      )}
                    </View>
                    <View style={styles.metaTheirsRow}>
                      <Text style={styles.timeText}>{timeStr}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Thanh gợi ý tin nhắn nhanh dạng Pill ngang gọn gàng */}
        {quickReplies.length > 0 && (
          <View style={styles.quickBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickScrollContent}
            >
              {quickReplies.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.quickPill}
                  onPress={() => sendText(q)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickPillText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Thanh nhập tin nhắn chuẩn mẫu */}
        <View style={styles.inputContainer}>
          {/* Nút đính kèm Plus */}
          <TouchableOpacity
            style={styles.plusBtn}
            onPress={onPlusPress}
            activeOpacity={0.8}
            disabled={uploading || sending}
          >
            <Plus size={20} color="#64748b" strokeWidth={2.4} />
          </TouchableOpacity>

          {/* Khung nhập text kèm camera icon */}
          <View style={styles.inputPill}>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#94a3b8"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={styles.cameraIconBtn}
              onPress={() => pickImage(false)}
              disabled={uploading || sending}
              activeOpacity={0.7}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#ea580c" />
              ) : (
                <Camera size={20} color="#64748b" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Nút gửi cam tròn */}
          <TouchableOpacity
            style={[styles.sendCircleBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => sendText()}
            disabled={!text.trim() || sending}
            activeOpacity={0.85}
          >
            <Send size={18} color="#ffffff" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // ── Header ──
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  peerInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  peerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  peerSubtitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ea580c',
    marginTop: 2,
  },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  // ── Messages List ──
  msgList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyHint: {
    fontSize: 13.5,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 30,
  },

  dateDividerWrap: {
    alignItems: 'center',
    marginVertical: 14,
  },
  dateBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },

  // ── My Message (Orange) ──
  mineRow: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    marginBottom: 12,
  },
  bubbleMine: {
    backgroundColor: '#ea580c',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleTextMine: {
    color: '#ffffff',
  },
  metaMineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
    marginRight: 4,
  },

  // ── Their Message (Gray) ──
  theirsRow: {
    alignSelf: 'flex-start',
    maxWidth: '82%',
    marginBottom: 12,
  },
  bubbleTheirs: {
    backgroundColor: '#eef2f6',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleTextTheirs: {
    color: '#1e293b',
  },
  metaTheirsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 4,
  },

  bubbleText: {
    fontSize: 14.5,
    lineHeight: 22,
  },
  bubbleImage: {
    width: 230,
    height: 160,
    borderRadius: 12,
    marginBottom: 6,
  },
  captionTheirs: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 4,
  },
  captionMine: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#ffedd5',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },

  // ── Quick Replies ──
  quickBar: {
    maxHeight: 46,
    marginBottom: 8,
  },
  quickScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  quickPill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickPillText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
  },

  // ── Bottom Input Bar ──
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 42,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0f172a',
    maxHeight: 90,
    paddingTop: 0,
    paddingBottom: 0,
  },
  cameraIconBtn: {
    padding: 4,
    marginLeft: 6,
  },
  sendCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});

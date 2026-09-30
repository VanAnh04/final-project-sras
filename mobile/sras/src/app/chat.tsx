import { useCallback, useEffect, useRef, useState } from 'react';
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
import { ChevronLeft, Phone, Send, ImagePlus } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { chatApi, ChatMessageDto, ChatPeer } from '../api/chatApi';
import { chatSocket } from '../realtime/chatSocket';
import { resolveFileUrl } from '../api/axiosClient';

const QUICK_REPLIES = ['Tôi đang ở đây, bạn tới nhanh nhé!', 'Bạn còn bao xa nữa?', 'Xe của tôi màu đỏ trước cửa hàng.'];
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

/**
 * Màn chat 1-1 DÙNG CHUNG cho mọi role (khách / chủ gara / nhân viên). Đặt ở root (ngoài nhóm
 * tab của khách) để chủ gara & nhân viên mở chat không bị kéo vào giao diện tab của khách.
 * Tham số: requestId, peer (CUSTOMER/GARAGE/STAFF), peerName, peerPhone, peerRole (nhãn hiển thị).
 */
export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    requestId?: string;
    peer?: string;
    peerName?: string;
    peerPhone?: string;
    peerRole?: string;
  }>();

  const requestId = params.requestId ? Number(params.requestId) : NaN;
  const peer = (params.peer || '').toUpperCase() as ChatPeer;
  const peerName = params.peerName || 'Người dùng';
  const peerPhone = params.peerPhone;
  const peerRole = params.peerRole || 'Đội cứu hộ';

  const hasThread = Number.isFinite(requestId) && (peer === 'CUSTOMER' || peer === 'GARAGE' || peer === 'STAFF');

  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connected, setConnected] = useState(false);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  // Nạp lịch sử + đăng ký realtime.
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
        // giữ trống, người dùng vẫn nhắn được
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

  // Fallback polling khi socket chưa kết nối.
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

  const pickAndSendImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Cần quyền truy cập ảnh', 'Vui lòng cấp quyền để gửi ảnh.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      setUploading(true);
      const url = await chatApi.uploadImage(res.assets[0].uri);
      await doSend({ imageUrl: url });
    } catch (e: any) {
      Alert.alert('Không gửi được ảnh', e?.response?.data?.message || e?.message || 'Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const myId = user?.id;

  if (!hasThread) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft size={22} color="#0f172a" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.peerName}>Tin nhắn</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={styles.emptyHint}>Không mở được cuộc trò chuyện này.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header chat */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color="#0f172a" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{peerName.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.peerName} numberOfLines={1}>{peerName}</Text>
          <Text style={styles.peerRole}>{peerRole}</Text>
        </View>
        {!!peerPhone && (
          <TouchableOpacity style={styles.callIcon} onPress={() => Linking.openURL(`tel:${peerPhone}`)} activeOpacity={0.8}>
            <Phone size={18} color="#ea580c" strokeWidth={2.4} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.msgList} showsVerticalScrollIndicator={false}>
          {loading && <ActivityIndicator color="#ea580c" style={{ marginTop: 16 }} />}
          {!loading && messages.length === 0 && (
            <Text style={styles.emptyHint}>Bắt đầu trò chuyện với {peerName}.</Text>
          )}
          {messages.map((m) => {
            const mine = myId != null && m.senderId === myId;
            const img = resolveFileUrl(m.imageUrl);
            if (mine) {
              return (
                <View key={m.id} style={[styles.bubble, styles.bubbleMine]}>
                  {!!img && <Image source={{ uri: img }} style={styles.bubbleImage} resizeMode="cover" />}
                  {!!m.content && <Text style={[styles.bubbleText, { color: '#ffffff' }]}>{m.content}</Text>}
                </View>
              );
            }
            const avatar = resolveFileUrl(m.senderAvatarUrl);
            return (
              <View key={m.id} style={styles.rowTheirs}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.msgAvatar} />
                ) : (
                  <View style={styles.msgAvatarFallback}>
                    <Text style={styles.msgAvatarText}>{(m.senderName || '?').trim().charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.theirsCol}>
                  <Text style={styles.senderNameLabel} numberOfLines={1}>{m.senderName}</Text>
                  <View style={[styles.bubble, styles.bubbleTheirs]}>
                    {!!img && <Image source={{ uri: img }} style={styles.bubbleImage} resizeMode="cover" />}
                    {!!m.content && <Text style={styles.bubbleText}>{m.content}</Text>}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Câu trả lời nhanh */}
        {messages.length === 0 && !loading && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {QUICK_REPLIES.map((q) => (
              <TouchableOpacity key={q} style={styles.quickChip} onPress={() => sendText(q)} activeOpacity={0.8}>
                <Text style={styles.quickText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickAndSendImage} disabled={uploading || sending} activeOpacity={0.8}>
            {uploading ? <ActivityIndicator size="small" color="#ea580c" /> : <ImagePlus size={22} color="#ea580c" strokeWidth={2.2} />}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#94a3b8"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnOff]}
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
  container: { flex: 1, backgroundColor: '#f8fafc' },

  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  iconBtn: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  peerName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  peerRole: { fontSize: 12, color: '#64748b', marginTop: 1 },
  callIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff7ed',
    borderWidth: 1, borderColor: '#ffedd5', alignItems: 'center', justifyContent: 'center',
  },

  msgList: { padding: 16, gap: 8, flexGrow: 1 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 20 },
  bubble: { maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMine: { alignSelf: 'flex-end', maxWidth: '78%', backgroundColor: '#ea580c', borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
  bubbleImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 4 },

  rowTheirs: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, alignSelf: 'flex-start', maxWidth: '85%' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e2e8f0' },
  msgAvatarFallback: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  theirsCol: { flexShrink: 1 },
  senderNameLabel: { fontSize: 11.5, color: '#64748b', fontWeight: '700', marginBottom: 3, marginLeft: 2 },

  quickRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  quickChip: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  quickText: { fontSize: 12.5, color: '#334155', fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  attachBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff7ed',
    borderWidth: 1, borderColor: '#ffedd5', alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 14, color: '#0f172a', maxHeight: 110,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#cbd5e1' },
});

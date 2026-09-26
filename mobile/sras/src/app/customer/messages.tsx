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
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect, usePathname } from 'expo-router';
import { MessageCircle, ChevronLeft, Phone, Send, ChevronRight, Clock, MessageSquare } from 'lucide-react-native';
import axiosClient, { getWsUrl } from '../../api/axiosClient';

type ChatMsg = { id: string | number; text: string; mine: boolean; createdAt?: string; time?: string };

type ConversationItem = {
  id: number;
  requestId: number;
  requestCode: string;
  peerName: string;
  peerPhone: string;
  peerRole: string;
  peerAvatar?: string;
  lastMessage: string;
  lastMessageTime?: string;
  status: string;
  vehicleInfo?: string;
  unreadCount?: number;
  isUnread?: boolean;
};

const QUICK_REPLIES = ['Tôi đang ở đây, bạn tới nhanh nhé!', 'Bạn còn bao xa nữa?', 'Xe của tôi màu đỏ trước cửa hàng.'];

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function formatChatTimestamp(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';

  const now = new Date();

  // Giờ:Phút (HH:mm)
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // Reset về đầu ngày để so sánh khoảng cách số ngày
  const dZero = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((nowZero.getTime() - dZero.getTime()) / (1000 * 3600 * 24));

  // 1. Hôm nay
  if (diffDays === 0) {
    return `${timeStr}, Hôm nay`;
  }

  // 2. Hôm qua
  if (diffDays === 1) {
    return `${timeStr}, Hôm qua`;
  }

  // 3. Trong tuần này (diffDays < 7 và thuộc tuần hiện tại)
  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const startOfWeek = new Date(nowZero);
  startOfWeek.setDate(nowZero.getDate() - (currentDayOfWeek - 1));

  if (dZero >= startOfWeek && diffDays < 7) {
    const daysName = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = daysName[d.getDay()];
    return `${timeStr}, ${dayName}`;
  }

  // 4. Khác tuần nhưng cùng năm
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  if (d.getFullYear() === now.getFullYear()) {
    return `${timeStr}, ${day}/${month}`;
  }

  // 5. Khác năm
  const year = d.getFullYear();
  return `${timeStr}, ${day}/${month}/${year}`;
}

export default function MessagesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ requestId?: string; peerName?: string; peerPhone?: string; peerRole?: string; peerAvatar?: string }>();

  // Selected active chat target
  const [selectedConvo, setSelectedConvo] = useState<ConversationItem | null>(null);
  const selectedConvoRef = useRef<ConversationItem | null>(null);

  // Unread status and unread count per conversation
  const [unreadMap, setUnreadMap] = useState<Record<number, boolean>>({});
  const [unreadCountMap, setUnreadCountMap] = useState<Record<number, number>>({});

  // Conversations list
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Chat detail messages
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    selectedConvoRef.current = selectedConvo;
  }, [selectedConvo]);

  // Tải danh sách cuộc hội thoại đã khởi tạo từ DB
  const loadConversations = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoadingList(true);
      }
      const res: any = await axiosClient.get('/rescue-requests/conversations');
      const list: any[] = res?.data || res || [];
      if (Array.isArray(list)) {
        setConversations(list);
        const uMap: Record<number, boolean> = {};
        const cMap: Record<number, number> = {};
        list.forEach((item: any) => {
          const id = item.requestId || item.id;
          if (id) {
            uMap[id] = Boolean(item.isUnread);
            cMap[id] = item.unreadCount || (item.isUnread ? 1 : 0);
          }
        });
        setUnreadMap((prev) => ({ ...prev, ...uMap }));
        setUnreadCountMap((prev) => ({ ...prev, ...cMap }));
      }
    } catch (e) {
      console.log('Error loading conversations list:', e);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, []);

  // Tải tin nhắn của cuộc hội thoại đang chọn
  const loadMessages = useCallback(async (reqId: number | string) => {
    try {
      setLoadingChat(true);
      const endpoint = reqId ? `/rescue-requests/${reqId}/messages` : '/rescue-requests/active/messages';
      const res: any = await axiosClient.get(endpoint);
      const apiList: any[] = res?.data || res || [];
      if (Array.isArray(apiList)) {
        const mapped: ChatMsg[] = apiList.map((m: any) => ({
          id: m.id,
          text: m.content,
          mine: Boolean(m.isMine),
          createdAt: m.createdAt,
        }));
        setMessages(mapped);
      }
    } catch (e) {
      console.log('Error loading chat messages:', e);
    } finally {
      setLoadingChat(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, []);

  // Lắng nghe realtime tin nhắn mới qua WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const url = getWsUrl('/ws/chat');
      ws = new WebSocket(url);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'CHAT_MESSAGE') {
            const currentReqId = selectedConvoRef.current?.requestId;
            if (currentReqId && Number(currentReqId) === Number(data.requestId)) {
              const isStaffOrOwner = pathname.includes('/garage-staff') || pathname.includes('/garage-owner');
              const isSenderCustomer = data.senderRole === 'CUSTOMER' || data.role === 'USER';
              const isMine = isStaffOrOwner ? !isSenderCustomer : isSenderCustomer;

              const msgItem: ChatMsg = {
                id: data.messageId,
                text: data.content,
                mine: isMine,
                createdAt: data.createdAt || new Date().toISOString(),
              };

              setMessages((prev) => {
                const existingIndex = prev.findIndex((m) => String(m.id) === String(data.messageId));
                if (existingIndex !== -1) {
                  const updated = [...prev];
                  updated[existingIndex] = msgItem;
                  return updated;
                }
                return [...prev, msgItem];
              });
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

              // Đang xem cuộc hội thoại này -> Reset số tin chưa đọc về 0
              setUnreadMap((prev) => ({ ...prev, [Number(data.requestId)]: false }));
              setUnreadCountMap((prev) => ({ ...prev, [Number(data.requestId)]: 0 }));
            } else if (data.requestId) {
              // Tin nhắn tới cuộc hội thoại chưa mở -> Tăng số tin chưa đọc và đánh dấu chưa đọc
              setUnreadMap((prev) => ({ ...prev, [Number(data.requestId)]: true }));
              setUnreadCountMap((prev) => ({
                ...prev,
                [Number(data.requestId)]: (prev[Number(data.requestId)] || 0) + 1,
              }));
            }
            loadConversations();
          }
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      console.log('Error initializing websocket in MessagesScreen:', e);
    }
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [loadConversations, pathname]);

  useFocusEffect(
    useCallback(() => {
      // Nếu được điều hướng từ nút "Nhắn tin" với params cụ thể
      if (params.peerName) {
        const convo: ConversationItem = {
          id: Number(params.requestId || 0),
          requestId: Number(params.requestId || 0),
          requestCode: 'REQ-ACTIVE',
          peerName: params.peerName,
          peerPhone: params.peerPhone || '',
          peerRole: params.peerRole || 'Đội cứu hộ',
          peerAvatar: params.peerAvatar,
          lastMessage: '',
          status: 'ACTIVE',
        };
        setSelectedConvo(convo);
        if (params.requestId) {
          setUnreadMap((prev) => ({ ...prev, [Number(params.requestId)]: false }));
          setUnreadCountMap((prev) => ({ ...prev, [Number(params.requestId)]: 0 }));
          loadMessages(params.requestId);
        }
      } else {
        // Tự bấm tab "Tin nhắn" -> Hiện danh sách các cuộc hội thoại đã khởi tạo
        setSelectedConvo(null);
        loadConversations(conversations.length === 0);
      }
    }, [params.requestId, params.peerName, params.peerPhone, params.peerRole, params.peerAvatar, loadMessages, loadConversations])
  );

  const openChatDetail = (convo: ConversationItem) => {
    setSelectedConvo(convo);
    const targetId = convo.requestId || convo.id;
    setUnreadMap((prev) => ({ ...prev, [targetId]: false }));
    setUnreadCountMap((prev) => ({ ...prev, [targetId]: 0 }));
    setConversations((prev) =>
      prev.map((c) => (Number(c.requestId || c.id) === Number(targetId) ? { ...c, isUnread: false, unreadCount: 0 } : c))
    );
    loadMessages(convo.requestId);
  };

  const send = async (content?: string) => {
    const body = (content ?? text).trim();
    if (!body || sending || !selectedConvo) return;
    try {
      setSending(true);
      const targetId = selectedConvo.requestId || '0';
      const res: any = await axiosClient.post(`/rescue-requests/${targetId}/messages`, { content: body });
      const newMsg = res?.data || res;
      if (newMsg) {
        const msgId = newMsg.id || Date.now();
        const msgItem: ChatMsg = {
          id: msgId,
          text: newMsg.content || body,
          mine: true,
          createdAt: newMsg.createdAt || new Date().toISOString(),
        };
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => String(m.id) === String(msgId));
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = msgItem;
            return updated;
          }
          return [...prev, msgItem];
        });

        // Cập nhật ngay preview tin nhắn ngoài danh sách thành "Bạn: <nội dung>"
        setConversations((prev) =>
          prev.map((c) =>
            Number(c.requestId) === Number(targetId)
              ? { ...c, lastMessage: `Bạn: ${newMsg.content || body}`, lastMessageTime: new Date().toISOString() }
              : c
          )
        );
      }
      setText('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      console.log('Error sending message:', e);
    } finally {
      setSending(false);
    }
  };

  // ── MÀN HÌNH 1: DANH SÁCH CUỘC HỘI THOẠI ĐÃ KHỞI TẠO (Tab Tin Nhắn) ────────
  if (!selectedConvo) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tin nhắn</Text>
          <Text style={styles.headerSub}>Các cuộc hội thoại cứu hộ đã khởi tạo</Text>
        </View>

        {loadingList ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color="#ea580c" />
            <Text style={styles.loadingText}>Đang tải cuộc hội thoại...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <MessageCircle size={32} color="#ea580c" strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có cuộc hội thoại nào</Text>
            <Text style={styles.emptySub}>
              Khi có đơn cứu hộ phát sinh, cuộc hội thoại trực tiếp giữa bạn và đối phương sẽ xuất hiện tại đây.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.convoListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadConversations(); }} tintColor="#ea580c" />
            }
          >
            {conversations.map((item) => {
              const itemReqId = item.requestId || item.id;
              const mapCount = unreadCountMap[itemReqId];
              const count = mapCount !== undefined ? mapCount : (item.unreadCount || 0);
              const mapUnread = unreadMap[itemReqId];
              const isUnread = count > 0 || (mapUnread !== undefined ? mapUnread : Boolean(item.isUnread));

              return (
                <TouchableOpacity
                  key={item.id || item.requestId}
                  style={styles.convoCard}
                  onPress={() => openChatDetail(item)}
                  activeOpacity={0.8}
                >
                  {item.peerAvatar ? (
                    <Image source={{ uri: item.peerAvatar }} style={styles.convoAvatarImage} />
                  ) : (
                    <View style={styles.convoAvatar}>
                      <Text style={styles.convoAvatarText}>
                        {(item.peerName || 'C').trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.convoInfo}>
                    <Text style={[styles.convoPeerName, isUnread && styles.boldText]} numberOfLines={1}>{item.peerName}</Text>
                    <View style={styles.convoSubRow}>
                      <Text style={isUnread ? styles.convoLastMsgBold : styles.convoLastMsgRead} numberOfLines={1}>
                        {item.lastMessage || 'Chưa có tin nhắn'}
                      </Text>
                      {!!item.lastMessageTime && (
                        <Text style={isUnread ? styles.convoTimeInlineBold : styles.convoTimeInlineRead}> · {timeAgo(item.lastMessageTime)}</Text>
                      )}
                    </View>
                    <Text style={styles.convoCode}>#{item.requestCode} • {item.peerRole}</Text>
                  </View>

                  {/* Badge số lượng tin nhắn chưa đọc hoặc chấm tròn xanh Messenger */}
                  {count > 0 ? (
                    <View style={styles.convoUnreadBadge}>
                      <Text style={styles.convoUnreadBadgeText}>{count > 99 ? '99+' : count}</Text>
                    </View>
                  ) : isUnread ? (
                    <View style={styles.messengerDot} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ── MÀN HÌNH 2: CHI TIẾT ĐOẠN HỘI THOẠI ────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header chat */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setSelectedConvo(null)} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.5} />
        </TouchableOpacity>
        {selectedConvo.peerAvatar ? (
          <Image source={{ uri: selectedConvo.peerAvatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(selectedConvo.peerName || 'C').trim().charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.peerName} numberOfLines={1}>{selectedConvo.peerName}</Text>
          <Text style={styles.peerRole}>{selectedConvo.peerRole} • #{selectedConvo.requestCode}</Text>
        </View>
        {!!selectedConvo.peerPhone && (
          <TouchableOpacity style={styles.callIcon} onPress={() => Linking.openURL(`tel:${selectedConvo.peerPhone}`)} activeOpacity={0.8}>
            <Phone size={18} color="#ea580c" strokeWidth={2.4} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loadingChat ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color="#ea580c" />
            <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
          </View>
        ) : (
          <ScrollView ref={scrollRef} contentContainerStyle={styles.msgList} showsVerticalScrollIndicator={false}>
            {messages.length === 0 && (
              <View style={styles.emptyBox}>
                <MessageCircle size={32} color="#94a3b8" />
                <Text style={styles.emptyHint}>Chưa có tin nhắn nào. Bắt đầu trò chuyện!</Text>
              </View>
            )}
            {messages.map((m, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null;

              let showTimestampDivider = false;
              if (index === 0) {
                showTimestampDivider = true;
              } else if (prevMsg && m.createdAt && prevMsg.createdAt) {
                const t1 = new Date(prevMsg.createdAt).getTime();
                const t2 = new Date(m.createdAt).getTime();
                const diffMins = (t2 - t1) / (1000 * 60);
                if (diffMins >= 20 || isNaN(diffMins)) {
                  showTimestampDivider = true;
                }
              }

              const timestampLabel = formatChatTimestamp(m.createdAt);

              return (
                <View key={m.id || index}>
                  {showTimestampDivider && !!timestampLabel && (
                    <View style={styles.timeDividerWrap}>
                      <View style={styles.timeDividerBadge}>
                        <Text style={styles.timeDividerText}>{timestampLabel}</Text>
                      </View>
                    </View>
                  )}
                  <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, m.mine && { color: '#ffffff' }]}>{m.text}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Câu trả lời nhanh */}
        {messages.length === 0 && !loadingChat && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {QUICK_REPLIES.map((q) => (
              <TouchableOpacity key={q} style={styles.quickChip} onPress={() => send(q)} activeOpacity={0.8}>
                <Text style={styles.quickText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputBar}>
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
            onPress={() => send()}
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12.5, color: '#64748b', marginTop: 2 },

  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, fontSize: 12.5, color: '#64748b' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff7ed',
    borderWidth: 1, borderColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13.5, color: '#64748b', textAlign: 'center', lineHeight: 20, marginTop: 8 },

  convoListContent: { padding: 16, gap: 12 },
  convoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12,
  },
  convoAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#ea580c',
    alignItems: 'center', justifyContent: 'center',
  },
  convoAvatarImage: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9',
  },
  convoAvatarText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  convoInfo: { flex: 1 },
  convoPeerName: { fontSize: 15, fontWeight: '600', color: '#334155' },
  boldText: { fontWeight: '800', color: '#0f172a' },
  convoSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  convoLastMsgBold: { fontSize: 13, fontWeight: '700', color: '#0f172a', maxWidth: '70%' },
  convoLastMsgRead: { fontSize: 13, fontWeight: '400', color: '#64748b', maxWidth: '70%' },
  convoTimeInlineBold: { fontSize: 12, fontWeight: '700', color: '#475569' },
  convoTimeInlineRead: { fontSize: 12, fontWeight: '400', color: '#94a3b8' },
  convoCode: { fontSize: 11.5, color: '#ea580c', fontWeight: '700', marginTop: 2 },
  messengerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563eb', marginLeft: 8 },
  convoUnreadBadge: {
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 8,
  },
  convoUnreadBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  iconBtn: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9' },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  peerName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  peerRole: { fontSize: 12, color: '#64748b', marginTop: 1 },
  callIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff7ed',
    borderWidth: 1, borderColor: '#ffedd5', alignItems: 'center', justifyContent: 'center',
  },

  msgList: { padding: 16, gap: 8, flexGrow: 1 },
  timeDividerWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  timeDividerBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  timeDividerText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 40, gap: 8 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#ea580c', borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: '#0f172a', lineHeight: 20 },

  quickRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  quickChip: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  quickText: { fontSize: 12.5, color: '#334155', fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  input: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 14, color: '#0f172a', maxHeight: 110,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#cbd5e1' },
});

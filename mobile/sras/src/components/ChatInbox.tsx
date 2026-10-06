import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { chatApi, ChatPeer, ConversationDto } from '../api/chatApi';
import { chatSocket } from '../realtime/chatSocket';
import { resolveFileUrl } from '../api/axiosClient';

const ROLE_LABEL: Record<ChatPeer, string> = {
  CUSTOMER: 'Khách hàng',
  GARAGE: 'Chủ gara',
  STAFF: 'Nhân viên cứu hộ',
};

/** Preview tin nhắn mới nhất trong danh sách. */
const previewOf = (c: ConversationDto): string => {
  const body = c.lastContent?.trim() || (c.lastImageUrl ? '📷 Hình ảnh' : '');
  if (!body) return 'Bắt đầu trò chuyện';
  return c.lastFromMe ? `Bạn: ${body}` : body;
};

/** Giờ/ngày gọn cho danh sách hội thoại. */
const fmtTime = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const p = (n: number) => String(n).padStart(2, '0');
  return sameDay ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getDate())}/${p(d.getMonth() + 1)}`;
};

/**
 * Hộp thư dùng chung: liệt kê các hội thoại của người dùng hiện tại (mọi role) và mở màn chat
 * dùng chung {@code /chat} khi bấm vào. Tự làm mới mỗi lần màn được focus hoặc có tin nhắn mới.
 */
export default function ChatInbox() {
  const router = useRouter();
  const [items, setItems] = useState<ConversationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await chatApi.getConversations();
      setItems(data);
    } catch {
      // giữ danh sách cũ khi lỗi mạng tạm thời
    } finally {
      setLoading(false);
    }
  }, []);

  // Khử trùng danh sách: cùng 1 người (peerId hoặc peerPhone) chỉ hiển thị 1 cuộc trò chuyện duy nhất
  const deduplicatedItems = useMemo(() => {
    const map = new Map<number | string, ConversationDto>();
    for (const c of items) {
      const key = c.peerId ? `id:${c.peerId}` : c.peerPhone ? `phone:${c.peerPhone}` : `${c.rescueRequestId}:${c.peerName}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, c);
      } else {
        const existingTime = existing.lastAt ? new Date(existing.lastAt).getTime() : 0;
        const curTime = c.lastAt ? new Date(c.lastAt).getTime() : 0;
        if (curTime > existingTime) {
          map.set(key, c);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const tA = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tB = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return tB - tA;
    });
  }, [items]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        await load();
        if (!alive) return;
      })();
      return () => {
        alive = false;
      };
    }, [load]),
  );

  useEffect(() => {
    const unsub = chatSocket.onAnyMessage(() => {
      load();
    });
    return unsub;
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openChat = (c: ConversationDto) =>
    router.push({
      pathname: '/chat',
      params: {
        requestId: String(c.rescueRequestId),
        peer: c.peerRole,
        peerName: c.peerName,
        peerPhone: c.peerPhone || '',
        peerRole: ROLE_LABEL[c.peerRole] || 'Đội cứu hộ',
      },
    } as any);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#ea580c" />
        </View>
      ) : deduplicatedItems.length === 0 ? (
        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <MessageCircle size={30} color="#ea580c" strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>Chưa có tin nhắn</Text>
          <Text style={styles.subtitle}>
            Khi có đơn cứu hộ, bạn có thể nhắn tin trực tiếp với các bên liên quan tại đây.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {deduplicatedItems.map((c) => {
            const avatar = resolveFileUrl(c.peerAvatarUrl);
            return (
              <TouchableOpacity
                key={c.peerId ? `peer-${c.peerId}` : `${c.rescueRequestId}:${c.peerName}`}
                style={styles.row}
                onPress={() => openChat(c)}
                activeOpacity={0.75}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{(c.peerName || '?').trim().charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name} numberOfLines={1}>{c.peerName}</Text>
                    <Text style={styles.time}>{fmtTime(c.lastAt)}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={styles.preview} numberOfLines={1}>{previewOf(c)}</Text>
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {ROLE_LABEL[c.peerRole] || 'Đội cứu hộ'}
                    {c.rescueCode ? ` · #${c.rescueCode}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff7ed',
    borderWidth: 1, borderColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13.5, color: '#64748b', textAlign: 'center', lineHeight: 20, marginTop: 8 },

  list: { paddingVertical: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e2e8f0' },
  avatarFallback: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flex: 1, fontSize: 15.5, fontWeight: '800', color: '#0f172a' },
  time: { fontSize: 11.5, color: '#94a3b8', fontWeight: '600', marginLeft: 8 },
  rowBottom: { marginTop: 2 },
  preview: { fontSize: 13.5, color: '#475569' },
  meta: { fontSize: 11.5, color: '#94a3b8', fontWeight: '600', marginTop: 3 },
});

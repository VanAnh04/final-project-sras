import { useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageCircle, ChevronLeft, Phone, Send } from 'lucide-react-native';

type ChatMsg = { id: string; text: string; mine: boolean };

const QUICK_REPLIES = ['Tôi đang ở đây, bạn tới nhanh nhé!', 'Bạn còn bao xa nữa?', 'Xe của tôi màu đỏ trước cửa hàng.'];

export default function MessagesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ peerName?: string; peerPhone?: string; peerRole?: string }>();
  const peerName = params.peerName;
  const peerPhone = params.peerPhone;
  const peerRole = params.peerRole || 'Đội cứu hộ';

  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');

  const send = (content?: string) => {
    const body = (content ?? text).trim();
    if (!body) return;
    const mine: ChatMsg = { id: `${Date.now()}`, text: body, mine: true };
    setMessages((prev) => [...prev, mine]);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    // Phản hồi tự động demo (chưa có hạ tầng chat thật).
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-r`, text: 'Đã nhận, tôi đang trên đường tới bạn nhé!', mine: false },
      ]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }, 1200);
  };

  // Không có người liên hệ → màn giới thiệu (mở từ tab).
  if (!peerName) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tin nhắn</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <MessageCircle size={30} color="#ea580c" strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>Tin nhắn & Hỗ trợ</Text>
          <Text style={styles.subtitle}>
            Khi có đơn cứu hộ, bạn có thể nhắn tin trực tiếp với nhân viên từ màn theo dõi.
          </Text>
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
          <Text style={styles.demoNote}>Tin nhắn demo — chưa lưu trên máy chủ.</Text>
          {messages.length === 0 && (
            <Text style={styles.emptyHint}>Bắt đầu trò chuyện với {peerName}.</Text>
          )}
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.bubbleText, m.mine && { color: '#ffffff' }]}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Câu trả lời nhanh */}
        {messages.length === 0 && (
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
          <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnOff]} onPress={() => send()} disabled={!text.trim()} activeOpacity={0.85}>
            <Send size={18} color="#ffffff" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff7ed',
    borderWidth: 1, borderColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13.5, color: '#64748b', textAlign: 'center', lineHeight: 20, marginTop: 8 },

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
  demoNote: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 8 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 20 },
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

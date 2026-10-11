import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MessageCircle, Search, X, Wrench, Shield, User as UserIcon, Users } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { chatApi, ChatPeer, ConversationDto, ChatContactDto } from '../api/chatApi';
import { chatSocket } from '../realtime/chatSocket';
import { resolveFileUrl } from '../api/axiosClient';

const ROLE_LABEL: Record<ChatPeer, string> = {
  CUSTOMER: 'Khách hàng',
  GARAGE: 'Chủ gara',
  STAFF: 'Nhân viên cứu hộ',
};

const ROLE_SHORT_BADGE: Record<ChatPeer, { label: string; bg: string; text: string }> = {
  GARAGE: { label: 'CHỦ GARA', bg: '#f3e8ff', text: '#7e22ce' },
  STAFF: { label: 'THỢ CỨU HỘ', bg: '#ffedd5', text: '#ea580c' },
  CUSTOMER: { label: 'KHÁCH HÀNG', bg: '#e0f2fe', text: '#0284c7' },
};

/** Preview tin nhắn mới nhất trong danh sách. */
const previewOf = (c: ConversationDto): string => {
  const body = c.lastContent?.trim() || (c.lastImageUrl ? '📷 Hình ảnh' : '');
  if (!body) return c.isOnline ? '🟢 Đang hoạt động' : 'Bắt đầu trò chuyện';
  return c.lastFromMe ? `Bạn: ${body}` : body;
};

/** Giờ/ngày gọn cho danh sách hội thoại. */
const fmtTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const p = (n: number) => String(n).padStart(2, '0');
  return sameDay ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getDate())}/${p(d.getMonth() + 1)}`;
};

export default function ChatInbox() {
  const router = useRouter();
  const { user } = useAuth();

  const isCustomer = user?.role === 'CUSTOMER';
  const isGarageOwner = user?.role === 'GARAGE_OWNER';
  const isGarageStaff = user?.role === 'GARAGE_STAFF';

  const [items, setItems] = useState<ConversationDto[]>([]);
  const [contacts, setContacts] = useState<ChatContactDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const [convoData, contactData] = await Promise.all([
        chatApi.getConversations().catch(() => []),
        chatApi.getSuggestedContacts().catch(() => []),
      ]);
      setItems(convoData);
      setContacts(contactData);
    } catch {
      // Giữ danh sách cũ khi lỗi mạng tạm thời
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Toàn bộ nhân viên của gara dành cho Chủ gara (dùng cho popup & tìm kiếm)
  const garageStaffList = useMemo(() => {
    return contacts.filter((c) => c.role === 'STAFF');
  }, [contacts]);

  // 2. Thông tin Chủ gara dành cho Nhân viên
  const garageOwnerContact = useMemo(() => {
    return contacts.find((c) => c.role === 'GARAGE');
  }, [contacts]);

  // 3. Khử trùng danh sách hội thoại và lọc chặt chẽ theo yêu cầu:
  // - Khách hàng: CHỈ list những người TỪNG nhắn tin
  // - Nhân viên: CHỈ list những khách hàng TỪNG nhắn tin VÀ Chủ gara
  // - Chủ gara: CHỈ list những người TỪNG nhắn tin (kèm popup riêng để nhắn cho nhân viên)
  const deduplicatedItems = useMemo(() => {
    const map = new Map<number | string, ConversationDto>();

    for (const c of items) {
      // Khách hàng: TUYỆT ĐỐI không chat với khách hàng khác, chỉ hiện những ai từng nhắn tin (GARA, STAFF)
      if (isCustomer && c.peerRole === 'CUSTOMER') continue;

      // Chủ gara: Không hiển thị chủ gara khác
      if (isGarageOwner && c.peerRole === 'GARAGE') continue;

      // Nhân viên: "chỉ list những khách hàng từng nhắn tin và chủ gara"
      if (isGarageStaff && c.peerRole !== 'CUSTOMER' && c.peerRole !== 'GARAGE') continue;

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

    const list = Array.from(map.values()).sort((a, b) => {
      const tA = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tB = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return tB - tA;
    });

    // Đối với Nhân viên: Luôn luôn có Chủ gara để tiện liên hệ trao đổi
    if (isGarageStaff && garageOwnerContact) {
      const hasOwner = list.some((c) => c.peerRole === 'GARAGE' || c.peerId === garageOwnerContact.userId);
      if (!hasOwner) {
        const ownerItem: ConversationDto = {
          rescueRequestId: garageOwnerContact.rescueRequestId || 0,
          rescueCode: garageOwnerContact.rescueCode,
          peerId: garageOwnerContact.userId,
          peerRole: 'GARAGE',
          peerName: garageOwnerContact.name,
          peerPhone: garageOwnerContact.phone,
          peerAvatarUrl: garageOwnerContact.avatarUrl,
          isOnline: garageOwnerContact.isOnline,
          onlineStatusText: garageOwnerContact.onlineStatusText,
          lastContent: 'Bắt đầu trò chuyện với chủ gara',
          lastAt: undefined,
          lastFromMe: false,
        };
        list.unshift(ownerItem);
      }
    }

    return list;
  }, [items, isCustomer, isGarageOwner, isGarageStaff, garageOwnerContact]);

  // Lọc chỉ những đối tượng liên quan cho hàng ngang hiển thị trực tuyến
  const relevantContacts = useMemo<ChatContactDto[]>(() => {
    // Khách hàng: CHỈ list những người TỪNG nhắn tin
    if (isCustomer) {
      return deduplicatedItems.map((c) => ({
        userId: Number(c.peerId) || 0,
        name: c.peerName,
        phone: c.peerPhone,
        avatarUrl: c.peerAvatarUrl,
        role: c.peerRole,
        roleLabel: ROLE_LABEL[c.peerRole],
        garageName: null,
        isOnline: Boolean(c.isOnline),
        onlineStatusText: c.onlineStatusText,
        rescueRequestId: c.rescueRequestId,
        rescueCode: c.rescueCode,
      }));
    }

    // Nhân viên: CHỈ list những khách hàng TỪNG nhắn tin VÀ chủ gara
    if (isGarageStaff) {
      const res: ChatContactDto[] = [];
      if (garageOwnerContact) {
        res.push(garageOwnerContact);
      }
      for (const c of deduplicatedItems) {
        if (c.peerRole === 'CUSTOMER') {
          res.push({
            userId: Number(c.peerId) || 0,
            name: c.peerName,
            phone: c.peerPhone,
            avatarUrl: c.peerAvatarUrl,
            role: 'CUSTOMER',
            roleLabel: 'Khách hàng',
            garageName: null,
            isOnline: Boolean(c.isOnline),
            onlineStatusText: c.onlineStatusText,
            rescueRequestId: c.rescueRequestId,
            rescueCode: c.rescueCode,
          });
        }
      }
      return res;
    }

    // Chủ gara: CHỈ list những người TỪNG nhắn tin
    if (isGarageOwner) {
      return deduplicatedItems.map((c) => ({
        userId: Number(c.peerId) || 0,
        name: c.peerName,
        phone: c.peerPhone,
        avatarUrl: c.peerAvatarUrl,
        role: c.peerRole,
        roleLabel: ROLE_LABEL[c.peerRole],
        garageName: null,
        isOnline: Boolean(c.isOnline),
        onlineStatusText: c.onlineStatusText,
        rescueRequestId: c.rescueRequestId,
        rescueCode: c.rescueCode,
      }));
    }

    return [];
  }, [deduplicatedItems, isCustomer, isGarageStaff, isGarageOwner, garageOwnerContact]);

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

  // Mở màn chat từ conversation
  const openChatFromConvo = (c: ConversationDto) => {
    router.push({
      pathname: '/chat',
      params: {
        requestId: String(c.rescueRequestId),
        peer: c.peerRole,
        peerName: c.peerName,
        peerPhone: c.peerPhone || '',
        peerRole: ROLE_LABEL[c.peerRole] || 'Đội cứu hộ',
        peerAvatar: c.peerAvatarUrl || '',
        peerIsOnline: String(Boolean(c.isOnline)),
        onlineStatusText: c.onlineStatusText || (c.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'),
      },
    } as any);
  };

  // Mở màn chat từ gợi ý contact
  const openChatFromContact = (cnt: ChatContactDto) => {
    const existing = deduplicatedItems.find((c) => c.peerId === cnt.userId);
    const reqId = cnt.rescueRequestId || existing?.rescueRequestId || 0;

    router.push({
      pathname: '/chat',
      params: {
        requestId: String(reqId),
        peer: cnt.role,
        peerName: cnt.name,
        peerPhone: cnt.phone || '',
        peerRole: cnt.roleLabel || ROLE_LABEL[cnt.role],
        peerAvatar: cnt.avatarUrl || '',
        peerIsOnline: String(Boolean(cnt.isOnline)),
        onlineStatusText: cnt.onlineStatusText || (cnt.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'),
      },
    } as any);
  };

  // Lọc danh sách hội thoại theo ô tìm kiếm
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return deduplicatedItems;
    const q = searchQuery.toLowerCase().trim();
    return deduplicatedItems.filter((c) => {
      const matchName = (c.peerName || '').toLowerCase().includes(q);
      const matchPhone = (c.peerPhone || '').toLowerCase().includes(q);
      const matchCode = (c.rescueCode || '').toLowerCase().includes(q);
      const matchRole = (ROLE_LABEL[c.peerRole] || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchCode || matchRole;
    });
  }, [deduplicatedItems, searchQuery]);

  // Lọc danh sách contacts gợi ý theo ô tìm kiếm
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return relevantContacts;
    const q = searchQuery.toLowerCase().trim();
    return relevantContacts.filter((cnt) => {
      const matchName = (cnt.name || '').toLowerCase().includes(q);
      const matchPhone = (cnt.phone || '').toLowerCase().includes(q);
      const matchRole = (cnt.roleLabel || '').toLowerCase().includes(q);
      const matchGarage = (cnt.garageName || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchRole || matchGarage;
    });
  }, [relevantContacts, searchQuery]);

  // Lọc danh sách nhân viên trong modal của Chủ gara
  const filteredStaffInModal = useMemo(() => {
    if (!staffSearchQuery.trim()) return garageStaffList;
    const q = staffSearchQuery.toLowerCase().trim();
    return garageStaffList.filter((s) => {
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchPhone = (s.phone || '').toLowerCase().includes(q);
      const matchStatus = (s.onlineStatusText || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchStatus;
    });
  }, [garageStaffList, staffSearchQuery]);

  // Tiêu đề phần gợi ý theo vai trò
  const suggestedTitle = useMemo(() => {
    if (isCustomer) return 'ĐÃ TỪNG NHẮN TIN';
    if (isGarageOwner) return 'NGƯỜI LIÊN HỆ GẦN ĐÂY';
    return 'CHỦ GARA & KHÁCH HÀNG';
  }, [isCustomer, isGarageOwner]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header phong cách Messenger */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Đoạn chat</Text>
          <View style={styles.badgeOnlineWrap}>
            <View style={styles.onlinePulseDot} />
            <Text style={styles.badgeOnlineText}>
              {relevantContacts.filter((c) => c.isOnline).length} trực tuyến
            </Text>
          </View>
        </View>

        {/* Thanh tìm kiếm người liên hệ */}
        <View style={styles.searchBar}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isCustomer
                ? 'Tìm kiếm chủ gara, thợ cứu hộ phụ trách...'
                : isGarageOwner
                ? 'Tìm trong danh sách cuộc trò chuyện...'
                : 'Tìm kiếm chủ gara, khách hàng...'
            }
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Nút mở Popup nhân viên cho Chủ gara để dễ kiếm nhắn tin */}
        {isGarageOwner && (
          <TouchableOpacity
            style={styles.staffPickerRow}
            onPress={() => setShowStaffModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.staffPickerLeft}>
              <View style={styles.staffPickerIconWrap}>
                <Users size={18} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.staffPickerTitle}>Nhân viên cứu hộ của gara</Text>
                <Text style={styles.staffPickerSubtitle}>
                  {garageStaffList.length} nhân viên • {garageStaffList.filter((s) => s.isOnline).length} đang trực sẵn sàng
                </Text>
              </View>
            </View>
            <View style={styles.staffPickerActionBadge}>
              <Text style={styles.staffPickerActionText}>Nhắn tin</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#ea580c" size="large" />
          <Text style={{ marginTop: 10, fontSize: 13, color: '#64748b' }}>Đang tải tin nhắn & người liên hệ...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {/* ══════════════════════════════════════════════════════════════════════════ */}
          {/* HÀNG GỢI Ý LIÊN HỆ NGANG - STORIES / ACTIVE NOW (GIỐNG MESSENGER) */}
          {/* ══════════════════════════════════════════════════════════════════════════ */}
          {filteredContacts.length > 0 && (
            <View style={styles.storiesSection}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{suggestedTitle}</Text>
                <Text style={styles.sectionSubtitle}>Chạm để nhắn tin</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesList}
              >
                {filteredContacts.map((cnt) => {
                  const avatar = resolveFileUrl(cnt.avatarUrl);
                  const shortBadge = ROLE_SHORT_BADGE[cnt.role] || ROLE_SHORT_BADGE.CUSTOMER;
                  const firstWord = (cnt.name || 'Người dùng').trim().split(' ').slice(-1)[0];

                  return (
                    <TouchableOpacity
                      key={`contact-${cnt.userId}`}
                      style={styles.storyItem}
                      onPress={() => openChatFromContact(cnt)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.storyAvatarWrap}>
                        {avatar ? (
                          <Image source={{ uri: avatar }} style={styles.storyAvatar} />
                        ) : (
                          <View
                            style={[
                              styles.storyAvatarFallback,
                              { backgroundColor: cnt.role === 'GARAGE' ? '#7e22ce' : cnt.role === 'STAFF' ? '#ea580c' : '#0284c7' },
                            ]}
                          >
                            <Text style={styles.storyAvatarFallbackText}>
                              {(cnt.name || '?').trim().charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        {/* Chấm tròn trạng thái Online/Offline */}
                        <View
                          style={[
                            styles.onlineDotIndicator,
                            { backgroundColor: cnt.isOnline ? '#22c55e' : '#94a3b8' },
                          ]}
                        />
                      </View>

                      {/* Tên rút gọn */}
                      <Text style={styles.storyName} numberOfLines={1}>
                        {firstWord}
                      </Text>

                      {/* Badge vai trò mini */}
                      <View style={[styles.storyRoleTag, { backgroundColor: shortBadge.bg }]}>
                        <Text style={[styles.storyRoleTagText, { color: shortBadge.text }]} numberOfLines={1}>
                          {cnt.role === 'GARAGE' ? 'GARA' : cnt.role === 'STAFF' ? 'THỢ' : 'KHÁCH'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════ */}
          {/* DANH SÁCH CUỘC TRÒ CHUYỆN (CONVERSATIONS) */}
          {/* ══════════════════════════════════════════════════════════════════════════ */}
          <View style={styles.convoSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>
                {searchQuery.trim() ? `KẾT QUẢ TÌM KIẾM (${filteredConversations.length})` : 'HỘI THOẠI GẦN ĐÂY'}
              </Text>
            </View>

            {filteredConversations.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <MessageCircle size={28} color="#ea580c" />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery.trim() ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có cuộc trò chuyện nào'}
                </Text>
                <Text style={styles.emptySub}>
                  {searchQuery.trim()
                    ? 'Hãy thử tìm bằng từ khoá khác hoặc chạm vào người liên hệ phía trên.'
                    : isCustomer
                    ? 'Khi có đơn cứu hộ, bạn có thể nhắn tin trực tiếp với chủ gara hoặc thợ tại đây.'
                    : 'Chạm vào danh sách nhân viên hoặc khách hàng ở trên để bắt đầu nhắn tin trao đổi.'}
                </Text>
              </View>
            ) : (
              filteredConversations.map((c) => {
                const avatar = resolveFileUrl(c.peerAvatarUrl);
                const roleBadge = ROLE_SHORT_BADGE[c.peerRole] || ROLE_SHORT_BADGE.CUSTOMER;

                return (
                  <TouchableOpacity
                    key={c.peerId ? `peer-${c.peerId}` : `${c.rescueRequestId}:${c.peerName}`}
                    style={styles.convoRow}
                    onPress={() => openChatFromConvo(c)}
                    activeOpacity={0.75}
                  >
                    {/* Avatar kèm chấm Online */}
                    <View style={styles.convoAvatarWrap}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.convoAvatar} />
                      ) : (
                        <View
                          style={[
                            styles.convoAvatarFallback,
                            { backgroundColor: c.peerRole === 'GARAGE' ? '#7e22ce' : c.peerRole === 'STAFF' ? '#ea580c' : '#0284c7' },
                          ]}
                        >
                          <Text style={styles.convoAvatarText}>
                            {(c.peerName || '?').trim().charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {/* Chấm tròn trạng thái Online/Offline */}
                      <View
                        style={[
                          styles.convoOnlineDot,
                          { backgroundColor: c.isOnline ? '#22c55e' : '#94a3b8' },
                        ]}
                      />
                    </View>

                    {/* Nội dung tin nhắn */}
                    <View style={styles.convoBody}>
                      <View style={styles.convoTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 6 }}>
                          <Text style={styles.convoName} numberOfLines={1}>
                            {c.peerName}
                          </Text>
                          <View style={[styles.convoRoleBadge, { backgroundColor: roleBadge.bg }]}>
                            <Text style={[styles.convoRoleText, { color: roleBadge.text }]}>
                              {ROLE_LABEL[c.peerRole]}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.convoTime}>{fmtTime(c.lastAt)}</Text>
                      </View>

                      <View style={styles.convoBottom}>
                        <Text style={styles.convoPreview} numberOfLines={1}>
                          {previewOf(c)}
                        </Text>
                      </View>

                      {/* Footer thông tin đơn cứu hộ & trạng thái */}
                      <View style={styles.convoMetaRow}>
                        <Text style={styles.convoStatusText}>
                          {c.isOnline ? '🟢 Đang hoạt động' : '⚪ Ngoại tuyến'}
                        </Text>
                        {c.rescueCode ? (
                          <Text style={styles.convoOrderCode}> · #{c.rescueCode}</Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL POPUP DANH SÁCH NHÂN VIÊN CHO CHỦ GARA ĐỂ DỄ KIẾM NHẮN TIN */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showStaffModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStaffModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowStaffModal(false)}
          />
          <View style={styles.modalSheet}>
            {/* Thanh kéo nhỏ phía trên sheet */}
            <View style={styles.modalDragHandle} />

            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={styles.modalIconWrap}>
                  <Users size={20} color="#ea580c" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Nhân viên cứu hộ</Text>
                  <Text style={styles.modalSub}>Chọn nhân viên để nhắn tin</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowStaffModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Thanh tìm kiếm trong modal */}
            <View style={styles.modalSearchBar}>
              <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Tìm nhân viên theo tên hoặc số điện thoại..."
                placeholderTextColor="#94a3b8"
                value={staffSearchQuery}
                onChangeText={setStaffSearchQuery}
                returnKeyType="search"
              />
              {staffSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setStaffSearchQuery('')}>
                  <X size={15} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Danh sách nhân viên */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalStaffList}
            >
              {filteredStaffInModal.length === 0 ? (
                <View style={styles.modalEmptyBox}>
                  <Users size={40} color="#cbd5e1" />
                  <Text style={styles.modalEmptyTitle}>
                    {staffSearchQuery ? 'Không tìm thấy nhân viên' : 'Chưa có nhân viên nào trong gara'}
                  </Text>
                  <Text style={styles.modalEmptySub}>
                    {staffSearchQuery
                      ? 'Thử tìm với tên hoặc số điện thoại khác.'
                      : 'Hãy thêm nhân viên vào gara tại mục Quản lý nhân viên.'}
                  </Text>
                </View>
              ) : (
                filteredStaffInModal.map((staff) => {
                  const avatar = resolveFileUrl(staff.avatarUrl);
                  return (
                    <TouchableOpacity
                      key={`modal-staff-${staff.userId}`}
                      style={styles.staffCard}
                      onPress={() => {
                        setShowStaffModal(false);
                        openChatFromContact(staff);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.staffAvatarWrap}>
                        {avatar ? (
                          <Image source={{ uri: avatar }} style={styles.staffAvatar} />
                        ) : (
                          <View style={styles.staffAvatarFallback}>
                            <Text style={styles.staffAvatarFallbackText}>
                              {(staff.name || '?').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.staffOnlineDot,
                            { backgroundColor: staff.isOnline ? '#22c55e' : '#94a3b8' },
                          ]}
                        />
                      </View>

                      <View style={styles.staffInfo}>
                        <View style={styles.staffNameRow}>
                          <Text style={styles.staffName} numberOfLines={1}>{staff.name}</Text>
                          <View
                            style={[
                              styles.staffStatusTag,
                              {
                                backgroundColor: staff.isOnline
                                  ? staff.onlineStatusText?.includes('bận')
                                    ? '#fef3c7'
                                    : '#dcfce7'
                                  : '#f1f5f9',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.staffStatusTagText,
                                {
                                  color: staff.isOnline
                                    ? staff.onlineStatusText?.includes('bận')
                                    ? '#b45309'
                                    : '#15803d'
                                    : '#64748b',
                                },
                              ]}
                            >
                              {staff.onlineStatusText || (staff.isOnline ? 'Sẵn sàng' : 'Ngoại tuyến')}
                            </Text>
                          </View>
                        </View>
                        {staff.phone && (
                          <Text style={styles.staffPhone}>{staff.phone}</Text>
                        )}
                      </View>

                      <View style={styles.staffChatAction}>
                        <MessageCircle size={18} color="#ea580c" />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  badgeOnlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  onlinePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  badgeOnlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },

  // Thanh tìm kiếm
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 0,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stories / Suggested Carousel
  storiesSection: {
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  storiesList: {
    paddingHorizontal: 12,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
  },
  storyAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#EA580C',
    padding: 2,
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  storyAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  onlineDotIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  storyName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
    textAlign: 'center',
  },
  storyRoleTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginTop: 3,
  },
  storyRoleTagText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // Danh sách hội thoại
  convoSection: {
    paddingTop: 12,
  },
  convoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  convoAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    position: 'relative',
  },
  convoAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  convoAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convoAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  convoOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  convoBody: {
    flex: 1,
    marginLeft: 12,
  },
  convoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convoName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  convoRoleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  convoRoleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  convoTime: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  convoBottom: {
    marginTop: 3,
  },
  convoPreview: {
    fontSize: 13.5,
    color: '#475569',
  },
  convoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  convoStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  convoOrderCode: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },

  // Nút mở Popup nhân viên cho Chủ gara
  staffPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
  },
  staffPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffPickerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  staffPickerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9A3412',
  },
  staffPickerSubtitle: {
    fontSize: 12,
    color: '#C2410C',
    marginTop: 2,
    fontWeight: '500',
  },
  staffPickerActionBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  staffPickerActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Modal Popup nhân viên
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  modalDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  modalStaffList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  modalEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  modalEmptySub: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  staffAvatarWrap: {
    position: 'relative',
  },
  staffAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E2E8F0',
  },
  staffAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarFallbackText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  staffOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  staffInfo: {
    flex: 1,
    marginLeft: 12,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  staffStatusTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  staffStatusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  staffPhone: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
  },
  staffChatAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

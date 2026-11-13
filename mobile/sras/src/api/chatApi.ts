import axiosClient from './axiosClient';
import { rescueApi } from './rescueApi';

/** Role của đối phương trong một đơn cứu hộ. */
export type ChatPeer = 'CUSTOMER' | 'GARAGE' | 'STAFF';

export interface ChatMessageDto {
  id: number;
  rescueRequestId: number;
  senderId: number;
  senderRole: ChatPeer;
  senderName: string;
  senderAvatarUrl?: string | null;
  recipientId: number;
  recipientRole: ChatPeer;
  content?: string | null;
  imageUrl?: string | null;
  createdAt: string;
}

export interface SendMessagePayload {
  peer: ChatPeer;
  content?: string;
  imageUrl?: string;
}

/** Một dòng trong hộp thư: hội thoại với một đối phương trong phạm vi một đơn. */
export interface ConversationDto {
  rescueRequestId: number;
  rescueCode?: string | null;
  rescueStatus?: string | null;
  peerId: number;
  peerRole: ChatPeer;
  peerName: string;
  peerAvatarUrl?: string | null;
  peerPhone?: string | null;
  lastContent?: string | null;
  lastImageUrl?: string | null;
  lastAt?: string | null;
  lastFromMe: boolean;
  isOnline?: boolean;
  onlineStatusText?: string;
}

/** Thông tin liên hệ gợi ý: Chủ gara, Nhân viên, Khách hàng kèm trạng thái online/offline */
export interface ChatContactDto {
  userId: number;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: ChatPeer;
  roleLabel: string;
  garageName?: string | null;
  isOnline?: boolean;
  onlineStatusText?: string;
  rescueRequestId?: number | null;
  rescueCode?: string | null;
}

export const chatApi = {
  // axiosClient interceptor trả về body (ApiResponse), nên res.data là payload bên trong.
  send: async (rescueId: number, payload: SendMessagePayload): Promise<ChatMessageDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${rescueId}/messages`, payload);
    return res.data;
  },

  getThread: async (rescueId: number, peer: ChatPeer): Promise<ChatMessageDto[]> => {
    const res: any = await axiosClient.get(`/rescue-requests/${rescueId}/messages`, {
      params: { peer },
    });
    return res.data ?? [];
  },

  /** Hộp thư của người dùng hiện tại (mới → cũ). */
  getConversations: async (): Promise<ConversationDto[]> => {
    const res: any = await axiosClient.get('/rescue-requests/conversations');
    return res.data ?? [];
  },

  /** Danh sách liên hệ gợi ý (Chủ gara, Nhân viên, Khách hàng) kèm trạng thái online/offline. */
  getSuggestedContacts: async (): Promise<ChatContactDto[]> => {
    const res: any = await axiosClient.get('/rescue-requests/chat-contacts');
    return res.data ?? [];
  },

  /** Tái dùng hạ tầng upload ảnh sẵn có (POST /upload → URL tương đối). */
  uploadImage: (uri: string): Promise<string> => rescueApi.uploadPhoto(uri),
};

import axiosClient from './axiosClient';
import type { ChatPeer } from './chatApi';
import type { CallStatus } from '../models/enums';

/** Loại tín hiệu WebRTC chuyển tiếp qua server. */
export type SignalType = 'OFFER' | 'ANSWER';

/** Một cuộc gọi thoại (khớp CallResponse ở backend). */
export interface CallDto {
  id: number;
  rescueRequestId: number;
  rescueCode?: string | null;
  status: CallStatus;
  callerId: number;
  callerRole: ChatPeer;
  callerName?: string | null;
  callerAvatarUrl?: string | null;
  calleeId: number;
  calleeRole: ChatPeer;
  calleeName?: string | null;
  calleeAvatarUrl?: string | null;
  createdAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSec?: number | null;
  /** Chỉ có ở phản hồi lúc bắt đầu gọi. */
  calleeOnline?: boolean | null;
}

/** Máy chủ STUN/TURN — đúng cấu trúc RTCIceServer; trường null phải bỏ đi trước khi đưa cho RTCPeerConnection. */
export interface IceServerDto {
  urls: string[];
  username?: string | null;
  credential?: string | null;
}

export const callApi = {
  // axiosClient interceptor trả về body (ApiResponse), nên res.data là payload bên trong.

  /** Bắt đầu gọi cho `peer` (role của người nhận trong đơn). */
  start: async (rescueRequestId: number, peer: ChatPeer): Promise<CallDto> => {
    const res: any = await axiosClient.post('/calls', { rescueRequestId, peer });
    return res.data;
  },

  accept: async (id: number): Promise<CallDto> => {
    const res: any = await axiosClient.post(`/calls/${id}/accept`);
    return res.data;
  },

  reject: async (id: number): Promise<CallDto> => {
    const res: any = await axiosClient.post(`/calls/${id}/reject`);
    return res.data;
  },

  /** `failed = true`: tự kết thúc vì mất kết nối / lỗi micro → server ghi nhận FAILED. */
  end: async (id: number, failed = false): Promise<CallDto> => {
    const res: any = await axiosClient.post(`/calls/${id}/end`, { failed });
    return res.data;
  },

  signal: async (id: number, type: SignalType, sdp: string): Promise<void> => {
    await axiosClient.post(`/calls/${id}/signal`, { type, sdp });
  },

  /** Cuộc gọi đang đổ chuông / đang diễn ra của tôi; null nếu không có. */
  getActive: async (): Promise<CallDto | null> => {
    const res: any = await axiosClient.get('/calls/active');
    return res.data ?? null;
  },

  get: async (id: number): Promise<CallDto> => {
    const res: any = await axiosClient.get(`/calls/${id}`);
    return res.data;
  },

  getIceServers: async (): Promise<IceServerDto[]> => {
    const res: any = await axiosClient.get('/calls/ice-servers');
    return res.data ?? [];
  },
};

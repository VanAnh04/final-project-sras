import { Platform } from 'react-native';
import axiosClient from './axiosClient';

export type VehicleType = 'CAR' | 'MOTORBIKE';
export type RescueStatus =
  | 'DRAFT'
  | 'SEARCHING'
  | 'PENDING_GARAGE'
  | 'NO_GARAGE_FOUND'
  | 'ACCEPTED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'DIAGNOSED'
  | 'REPAIRING_ONSITE'
  | 'TOW_TO_GARAGE'
  | 'TOWING'
  | 'DECLINED'
  | 'COMPLETED'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'RATED'
  | 'CANCELLED';

export interface CreateRescuePayload {
  vehicleType: VehicleType;
  symptom: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  locationNote?: string;
  /** Loại sự cố có cấu trúc (không nén vào symptom). */
  issueType?: string;
  /** SĐT liên hệ cho ca này (mặc định = SĐT tài khoản). */
  contactPhone?: string;
  customerVehicleId?: number;
  photoUrls?: string[];
  paymentMethod?: 'CASH' | 'BANK_TRANSFER';
}

export interface RescueRequestDto {
  id: number;
  code: string;
  status: RescueStatus;
  vehicleType: VehicleType;
  symptom: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  locationNote?: string;
  rescueFee?: number;
  totalAmount?: number;
  dispatchDistanceKm?: number;
  customer?: { id: number; name: string; phone: string } | null;
  createdAt?: string;
  enRouteAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  rescuerLat?: number | null;
  rescuerLng?: number | null;
  rescuerLocationAt?: string | null;
  garage?: {
    id: number;
    name: string;
    phone: string;
    address?: string;
    /** Điểm trung bình thật (1–5); null nếu chưa có đánh giá. */
    avgRating?: number | null;
    /** Số lượt đánh giá thật. */
    ratingCount?: number | null;
    lat?: number;
    lng?: number;
  } | null;
  staff?: {
    id: number;
    name: string;
    phone: string;
    /** Điểm trung bình thật (1–5); null nếu chưa có đánh giá. */
    rating?: number | null;
    /** Số lượt đánh giá thật. */
    ratingCount?: number | null;
  } | null;
  rescueVehicle?: { id: number; licensePlate: string; vehicleKind?: string } | null;
  photos?: string[];
  paymentMethod?: 'CASH' | 'BANK_TRANSFER';
  cashConfirmedByCustomer?: boolean;
  inspectionFee?: number;
  repairFee?: number;
  towingFee?: number;
  serviceFee?: number;
  minPayableAmount?: number;
  repairItems?: Array<{ id: number; name: string; price: number; quantity?: number; amount?: number; done?: boolean }>;
  quoteStatus?: 'PENDING' | 'ACCEPTED' | 'APPROVED' | 'DECLINED';
  quoteType?: 'ONSITE' | 'TOW' | string;
  towingReason?: string;
  isTowing?: boolean;
  quoteNote?: string;
  cancelReason?: string;
  customerVehicle?: {
    id?: number;
    licensePlate?: string;
    brand?: string;
    model?: string;
    color?: string;
    vehicleType?: string;
  } | null;
}

// axiosClient interceptor trả về body (ApiResponse), nên res.data là payload bên trong.
const uploadPhoto = async (uri: string): Promise<string> => {
  const form = new FormData();
  const name = uri.split('/').pop()?.split('?')[0] || `photo_${Date.now()}.jpg`;
  const ext = /\.(\w+)$/.exec(name)?.[1]?.toLowerCase();
  const type = ext ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'image/jpeg';

  if (Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('data:')) {
    const response = await fetch(uri);
    const blob = await response.blob();
    form.append('file', blob, name);
  } else {
    form.append('file', { uri, name, type } as any);
  }

  const res: any = await axiosClient.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (res?.data?.url || res?.url || '') as string;
};

const deletePhoto = async (url: string): Promise<void> => {
  if (!url) return;
  try {
    await axiosClient.delete('/upload', { params: { url } });
  } catch (err) {
    console.warn('Lỗi khi xóa file tạm / rollback:', err);
  }
};

export const rescueApi = {
  uploadPhoto,
  deletePhoto,

  create: async (payload: CreateRescuePayload): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post('/rescue-requests', payload);
    return res.data;
  },

  getStatus: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.get(`/rescue-requests/${id}`);
    return (res?.data ?? res) as RescueRequestDto;
  },

  getOne: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.get(`/rescue-requests/${id}`);
    return (res?.data ?? res) as RescueRequestDto;
  },

  mine: async (): Promise<RescueRequestDto[]> => {
    const res: any = await axiosClient.get('/rescue-requests/mine');
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : [];
  },

  // Nhân viên/gara đẩy vị trí xe cứu hộ theo thời gian thực.
  updateLocation: async (id: number, lat: number, lng: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/location`, { lat, lng });
    return res.data;
  },

  // Khách huỷ yêu cầu (khi còn SEARCHING / PENDING_GARAGE / ACCEPTED).
  cancel: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/cancel`);
    return res.data;
  },

  // Nhân viên: đơn đang được gán cho mình (null nếu không có).
  staffActive: async (): Promise<RescueRequestDto | null> => {
    const res: any = await axiosClient.get('/rescue-requests/staff/active');
    return res?.data ?? res ?? null;
  },

  // Đẩy trạng thái tuần tự: EN_ROUTE / ARRIVED / COMPLETED.
  advance: async (id: number, status: RescueStatus): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/status`, { status });
    return (res?.data ?? res) as RescueRequestDto;
  },

  // Khách thanh toán chuyển khoản (mock trừ ngân hàng) → PAID.
  payTransfer: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/pay`);
    return (res?.data ?? res) as RescueRequestDto;
  },

  // Nhân viên/gara xác nhận đã nhận tiền mặt → PAID.
  confirmCash: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/confirm-cash`);
    return (res?.data ?? res) as RescueRequestDto;
  },

  // Khách hàng xác nhận chọn thanh toán bằng tiền mặt trực tiếp cho thợ.
  selectCash: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/select-cash`);
    return (res?.data ?? res) as RescueRequestDto;
  },

  // Thợ gửi báo giá + ảnh minh chứng chẩn đoán
  submitQuote: async (id: number, payload: {
    photoUrls?: string[];
    photoUrl?: string;
    repairItems?: any[];
    inspectionFee?: number;
    rescueFee?: number;
    towingFee?: number;
    repairFee?: number;
    quoteType?: 'ONSITE' | 'TOW' | string;
    isTowing?: boolean;
    towingReason?: string;
  }): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/quote`, payload);
    return (res?.data ?? res) as RescueRequestDto;
  },

  // Khách hàng đồng ý duyệt báo giá → REPAIRING_ONSITE
  acceptQuote: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/accept-quote`);
    return (res?.data ?? res) as RescueRequestDto;
  },

  // Khách hàng từ chối sửa chữa → chuyển sang thanh toán phí kiểm tra xe
  declineQuote: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/decline-quote`);
    return (res?.data ?? res) as RescueRequestDto;
  },

  // Thợ bổ sung hạng mục sửa chữa phát sinh
  addRepairItem: async (id: number, payload: {
    name: string;
    price: number;
    quantity?: number;
    serviceId?: number;
    note?: string;
  }): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/add-item`, payload);
    return (res?.data ?? res) as RescueRequestDto;
  },
};


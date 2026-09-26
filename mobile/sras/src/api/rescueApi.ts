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
    avgRating?: number;
    lat?: number;
    lng?: number;
  } | null;
  staff?: { id: number; name: string; phone: string } | null;
  rescueVehicle?: { id: number; licensePlate: string; vehicleKind?: string } | null;
  photos?: string[];
}

// axiosClient interceptor trả về body (ApiResponse), nên res.data là payload bên trong.
const uploadPhoto = async (uri: string): Promise<string> => {
  const form = new FormData();
  const name = uri.split('/').pop() || `rescue_${Date.now()}.jpg`;
  const ext = /\.(\w+)$/.exec(name)?.[1]?.toLowerCase();
  const type = ext ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'image/jpeg';
  form.append('file', { uri, name, type } as any);
  const res: any = await axiosClient.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url as string;
};

export const rescueApi = {
  uploadPhoto,

  create: async (payload: CreateRescuePayload): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post('/rescue-requests', payload);
    return res.data;
  },

  getStatus: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.get(`/rescue-requests/${id}`);
    return res.data;
  },

  mine: async (): Promise<RescueRequestDto[]> => {
    const res: any = await axiosClient.get('/rescue-requests/mine');
    return res.data;
  },

  // Nhân viên/gara đẩy vị trí xe cứu hộ theo thời gian thực.
  updateLocation: async (id: number, lat: number, lng: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/location`, { lat, lng });
    return res.data;
  },
};

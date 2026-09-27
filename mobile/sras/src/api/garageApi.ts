import axiosClient from './axiosClient';
import { RescueRequestDto, RescueStatus } from './rescueApi';

export interface GarageStaffDto {
  id: number;
  name: string;
  phone: string;
  avatarUrl?: string | null;
  status?: string;
  /** Điểm trung bình thật (1–5); null nếu chưa có lượt đánh giá nào. */
  rating?: number | null;
  /** Số lượt đánh giá thật. */
  ratingCount?: number | null;
}

export interface RescueVehicleDto {
  id: number;
  licensePlate: string;
  vehicleKind?: string;
  imageUrl?: string | null;
  status?: string;
}

export interface CreateStaffPayload {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  avatarUrl?: string;
}

// axiosClient interceptor trả về body (ApiResponse) → res.data là payload.
export const garageApi = {
  // Đơn cứu hộ
  listOffers: async (): Promise<RescueRequestDto[]> => {
    const res: any = await axiosClient.get('/rescue-requests/garage/offers');
    return res.data;
  },
  listActive: async (): Promise<RescueRequestDto[]> => {
    const res: any = await axiosClient.get('/rescue-requests/garage/active');
    return res.data;
  },
  accept: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/accept`);
    return res.data;
  },
  decline: async (id: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/decline`);
    return res.data;
  },
  assignStaff: async (id: number, staffId: number, rescueVehicleId: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/assign-staff`, { staffId, rescueVehicleId });
    return res.data;
  },
  advance: async (id: number, status: RescueStatus): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/status`, { status });
    return res.data;
  },
  // Đẩy vị trí xe cứu hộ (gara/nhân viên) để khách theo dõi real-time.
  pushLocation: async (id: number, lat: number, lng: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.post(`/rescue-requests/${id}/location`, { lat, lng });
    return res.data;
  },

  // Cấu hình gara
  getMyGarage: async (): Promise<any> => {
    const res: any = await axiosClient.get('/garages/me');
    return res.data;
  },
  setAutoAccept: async (autoAccept: boolean): Promise<any> => {
    const res: any = await axiosClient.put('/garages/me/auto-accept', { autoAccept });
    return res.data;
  },

  // Nhân viên
  listStaff: async (): Promise<GarageStaffDto[]> => {
    const res: any = await axiosClient.get('/garages/me/staff');
    return res.data;
  },
  createStaff: async (payload: CreateStaffPayload): Promise<GarageStaffDto> => {
    const res: any = await axiosClient.post('/garages/me/staff', payload);
    return res.data;
  },

  // Xe cứu hộ
  listVehicles: async (): Promise<RescueVehicleDto[]> => {
    const res: any = await axiosClient.get('/garages/me/rescue-vehicles');
    return res.data;
  },
  createVehicle: async (licensePlate: string, vehicleKind: string, imageUrl?: string): Promise<RescueVehicleDto> => {
    const res: any = await axiosClient.post('/garages/me/rescue-vehicles', { licensePlate, vehicleKind, imageUrl });
    return res.data;
  },
};

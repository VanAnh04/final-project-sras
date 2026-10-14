import axiosClient from './axiosClient';
import { RescueRequestDto, RescueStatus, VehicleType } from './rescueApi';

export interface NearbyGarageDto {
  id: number;
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  capability: 'MOTORBIKE' | 'CAR' | 'BOTH';
  isOnline: boolean;
  autoAccept: boolean;
  avgRating?: number | null;
  ratingCount?: number;
  distanceKm: number;
  estimatedEtaMin: number;
  estimatedRescueFee?: number;
  /** true = có nhân viên + xe rảnh phù hợp ngay lúc này. */
  available: boolean;
}

export interface GarageStaffDto {
  id: number;
  fullName: string;
  name?: string;
  phone: string;
  avatarUrl?: string | null;
  staffCode?: string | null;
  status?: string;
  isActive?: boolean;
  activeJobsCount?: number;
  todayCompletedJobs?: number;
  /** Điểm trung bình thật (1–5); null nếu chưa có lượt đánh giá nào. */
  rating?: number | null;
  /** Số lượt đánh giá thật. */
  ratingCount?: number | null;
  /** Mật khẩu khởi tạo ngẫu nhiên trả về khi vừa tạo tài khoản thợ mới. */
  tempPassword?: string;
}

export interface RescueVehicleDto {
  id: number;
  licensePlate: string;
  vehicleKind?: string;
  imageUrl?: string | null;
  status?: string;
  isActive?: boolean;
}

export interface CreateStaffPayload {
  fullName: string;
  phone: string;
  staffCode?: string;
  email?: string;
  password?: string;
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
  listHistory: async (): Promise<RescueRequestDto[]> => {
    const res: any = await axiosClient.get('/rescue-requests/garage/history');
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
  /** Bật/tắt trạng thái nhận đơn của gara (dùng cả khi đăng xuất để tự tắt kết nối). */
  setOnline: async (isOnline: boolean): Promise<any> => {
    const res: any = await axiosClient.put('/garages/me/status', { isOnline });
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
  deleteVehicle: async (id: number): Promise<void> => {
    await axiosClient.delete(`/garages/me/rescue-vehicles/${id}`);
  },
  // Dịch vụ của hệ thống và Gara
  listCategories: async (): Promise<any[]> => {
    const res: any = await axiosClient.get('/service-categories');
    return res.data || [];
  },
  listServices: async (categoryId?: number): Promise<any[]> => {
    const res: any = await axiosClient.get('/services', { params: categoryId ? { categoryId } : {} });
    return res.data || [];
  },
  listGarageServices: async (): Promise<any[]> => {
    const res: any = await axiosClient.get('/garages/me/services');
    return res.data || [];
  },

  // Gara lân cận (cho màn "chọn gara trước")
  listNearby: async (
    lat: number,
    lng: number,
    vehicleType: VehicleType,
    radiusKm: number = 20
  ): Promise<NearbyGarageDto[]> => {
    const res: any = await axiosClient.get('/garages/nearby', {
      params: { lat, lng, vehicleType, radiusKm },
    });
    return res.data || [];
  },
};

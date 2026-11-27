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
  /** READY: Sẵn sàng, NO_STAFF: Hết thợ, NO_VEHICLE: Hết xe cứu hộ, LOW_BALANCE: Số dư ví không đủ, OFFLINE: Đóng cửa */
  availabilityStatus?: "READY" | "NO_STAFF" | "NO_VEHICLE" | "LOW_BALANCE" | "OFFLINE";
  /** Số xe cứu hộ rảnh sẵn sàng phục vụ */
  activeRescueVehicleCount?: number;
  /** Danh sách badge: "FASTEST", "TOP_RATED", "BEST_PRICE", "VERIFIED", "READY_NOW" */
  badges?: string[];
  /** Ảnh đại diện / mặt tiền xưởng */
  coverImageUrl?: string | null;
  /** Các dịch vụ thế mạnh */
  specialties?: string[];
  /** Tổng số đơn đã thực hiện */
  totalOrders?: number;
  /** Điểm số đề xuất hệ thống [0, 100] */
  score?: number;
}

export interface GarageServiceItemDto {
  id?: number;
  serviceId: number;
  serviceCode?: string;
  serviceName: string;
  categoryId?: number;
  categoryName?: string;
  categoryVehicleType?: string;
  feeType?: string;
  unit?: string;
  minPrice?: number;
  maxPrice?: number;
  price?: number;
  isActive?: boolean;
  nightSurgeEnabled?: boolean;
  nightSurgePercent?: number;
  holidaySurgeEnabled?: boolean;
  holidaySurgePercent?: number;
  isConfigured?: boolean;
  itemType?: 'LABOR' | 'PART' | string;
  unitLabel?: string;
  inventoryItemId?: number | null;
  onHandQty?: number | null;
  reservedQty?: number | null;
  availableQty?: number | null;
  minStockQty?: number | null;
  lowStock?: boolean;
  outOfStock?: boolean;
}

export interface GarageRatingDto {
  id: number;
  requestId: number;
  requestCode?: string;
  raterName?: string;
  stars: number;
  comment?: string;
  staffName?: string;
  staffStars?: number;
  staffComment?: string;
  createdAt?: string;
}

export interface GaragePublicProfileDto {
  id: number;
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  capability: 'MOTORBIKE' | 'CAR' | 'BOTH';
  isOnline: boolean;
  autoAccept: boolean;
  available: boolean;
  /** READY: Sẵn sàng, NO_STAFF: Hết thợ, NO_VEHICLE: Hết xe cứu hộ, LOW_BALANCE: Số dư ví không đủ, OFFLINE: Đóng cửa */
  availabilityStatus?: "READY" | "NO_STAFF" | "NO_VEHICLE" | "LOW_BALANCE" | "OFFLINE";
  avgRating?: number | null;
  ratingCount?: number;
  totalOrders?: number;
  cancelRate?: number;
  memberSince?: string;
  isVerified?: boolean;
  distanceKm?: number;
  estimatedEtaMin?: number;
  estimatedRescueFee?: number;
  /** Điểm số đề xuất hệ thống [0, 100] */
  score?: number;
  badges?: string[];
  specialties?: string[];
  coverImageUrl?: string | null;
  photos?: string[];
  activeStaffCount?: number;
  totalStaffCount?: number;
  activeRescueVehicleCount?: number;
  rescueVehicleCount?: number;
  services?: GarageServiceItemDto[];
}

export interface GarageDashboardDto {
  garageName: string;
  isOnline: boolean;
  autoAccept: boolean;
  todayRevenue: number;
  revenueGrowthPercent: number;
  availableStaffCount: number;
  busyStaffCount: number;
  activeOrderCount: number;
  completedOrderCount: number;
  creditBalance: number;
  cashBalance: number;
  isWalletEligible: boolean;
  onlineStaffLocations?: any[];
  pendingOrders?: any[];
  recentServices?: any[];
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
  invitationStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  isNewUser?: boolean;
  unsettledCash?: number;
  unsettledCashOrdersCount?: number;
  garageName?: string;
  garageAddress?: string;
  garagePhone?: string;
}

export interface RescueVehicleDto {
  id: number;
  licensePlate: string;
  vehicleKind?: string;
  imageUrl?: string | null;
  status?: string;
  isActive?: boolean;
  aiVerificationStatus?: 'VERIFIED' | 'WARNING' | 'REJECTED' | 'UNVERIFIED';
  aiDetectedPlate?: string;
  aiConfidenceScore?: number;
  aiNotes?: string;
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
  getDashboard: async (): Promise<GarageDashboardDto> => {
    const res: any = await axiosClient.get('/garages/me/dashboard');
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
  getPendingStaffInvitation: async (): Promise<GarageStaffDto | null> => {
    const res: any = await axiosClient.get('/garages/staff-invitation/pending');
    return res.data;
  },
  acceptStaffInvitation: async (staffId: number, payload?: { newPassword?: string }): Promise<void> => {
    await axiosClient.post(`/garages/staff-invitation/${staffId}/accept`, payload || {});
  },
  rejectStaffInvitation: async (staffId: number): Promise<void> => {
    await axiosClient.post(`/garages/staff-invitation/${staffId}/reject`);
  },
  // Quyết toán tiền mặt thợ nộp cho chủ gara
  getUnsettledCashOrders: async (staffId: number): Promise<any[]> => {
    const res: any = await axiosClient.get(`/garages/me/staff/${staffId}/unsettled-cash-orders`);
    return res.data || [];
  },
  settleStaffCash: async (staffId: number, orderIds?: number[]): Promise<any> => {
    const res: any = await axiosClient.post(`/garages/me/staff/${staffId}/settle-cash`, orderIds && orderIds.length > 0 ? { orderIds } : {});
    return res.data;
  },

  // Xe cứu hộ
  listVehicles: async (): Promise<RescueVehicleDto[]> => {
    const res: any = await axiosClient.get('/garages/me/rescue-vehicles');
    return res.data;
  },
  createVehicle: async (licensePlate: string, vehicleKind: string, imageUrl?: string): Promise<RescueVehicleDto> => {
    const res: any = await axiosClient.post(
      '/garages/me/rescue-vehicles',
      { licensePlate, vehicleKind, imageUrl },
      { timeout: 45000 }
    );
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
    vehicleType?: VehicleType,
    radiusKm: number = 20
  ): Promise<NearbyGarageDto[]> => {
    const params: any = { lat, lng, radiusKm };
    if (vehicleType) params.vehicleType = vehicleType;
    const res: any = await axiosClient.get('/garages/nearby', { params });
    return res.data || [];
  },

  // Hồ sơ công khai Gara
  getPublicProfile: async (
    garageId: number,
    lat?: number,
    lng?: number,
    vehicleType?: VehicleType
  ): Promise<GaragePublicProfileDto> => {
    const params: any = {};
    if (lat != null && !Number.isNaN(lat)) params.lat = lat;
    if (lng != null && !Number.isNaN(lng)) params.lng = lng;
    if (vehicleType) params.vehicleType = vehicleType;
    const res: any = await axiosClient.get(`/garages/${garageId}/profile`, { params });
    return res.data;
  },

  // Bảng giá dịch vụ công khai
  getPublicServices: async (garageId: number): Promise<GarageServiceItemDto[]> => {
    const res: any = await axiosClient.get(`/garages/${garageId}/services`);
    return res.data || [];
  },

  // Quản lý Kho Phụ tùng & Vật tư Gara
  getMyInventory: async (): Promise<any> => {
    const res: any = await axiosClient.get('/garages/me/inventory');
    return res?.data || res;
  },
  createInventoryItem: async (payload: any): Promise<any> => {
    const res: any = await axiosClient.post('/garages/me/inventory/items', payload);
    return res?.data || res;
  },
  updateInventoryItem: async (itemId: number, payload: any): Promise<any> => {
    const res: any = await axiosClient.put(`/garages/me/inventory/items/${itemId}`, payload);
    return res?.data || res;
  },
  adjustInventoryStock: async (
    itemId: number,
    payload: {
      txType: 'INBOUND' | 'ADJUSTMENT' | 'DAMAGED';
      quantity: number;
      unitCost?: number;
      sellingPrice?: number;
      minStockQty?: number;
      supplierName?: string;
      note?: string;
    }
  ): Promise<any> => {
    const res: any = await axiosClient.post(`/garages/me/inventory/items/${itemId}/adjust`, payload);
    return res?.data || res;
  },
  syncInventoryCatalog: async (): Promise<any> => {
    const res: any = await axiosClient.post('/garages/me/inventory/sync-catalog');
    return res?.data || res;
  },

  // Đánh giá của Gara (lấy đánh giá thật từ hệ thống)
  getGarageRatings: async (
    garageId: number,
    page: number = 0,
    size: number = 50
  ): Promise<{ content: GarageRatingDto[]; totalElements: number; totalPages: number }> => {
    try {
      const res: any = await axiosClient.get(`/ratings/garage/${garageId}`, { params: { page, size } });
      const raw = res?.data !== undefined ? res.data : res;

      if (Array.isArray(raw)) {
        return { content: raw, totalElements: raw.length, totalPages: 1 };
      }
      if (raw && Array.isArray(raw.content)) {
        return {
          content: raw.content,
          totalElements: raw.totalElements ?? raw.content.length,
          totalPages: raw.totalPages ?? 1,
        };
      }
      if (raw && Array.isArray(raw.data?.content)) {
        return {
          content: raw.data.content,
          totalElements: raw.data.totalElements ?? raw.data.content.length,
          totalPages: raw.data.totalPages ?? 1,
        };
      }
      return { content: [], totalElements: 0, totalPages: 0 };
    } catch (e) {
      console.warn('Lỗi getGarageRatings:', e);
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  },
};

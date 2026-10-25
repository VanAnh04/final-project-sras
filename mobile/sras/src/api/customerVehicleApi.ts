import axiosClient from './axiosClient';

export interface CustomerVehicleDto {
  id: number;
  vehicleType: 'CAR' | 'MOTORBIKE';
  brand?: string;
  model?: string;
  licensePlate?: string;
  color?: string;
  year?: number;
  /** Ảnh xe thật do khách upload; null nếu chưa có. */
  photoUrl?: string | null;
  isDefault?: boolean;
}

export interface CreateCustomerVehicleDto {
  vehicleType: 'CAR' | 'MOTORBIKE';
  brand: string;
  model?: string;
  licensePlate?: string;
  color?: string;
  year?: number;
  photoUrl?: string | null;
  isDefault?: boolean;
}

export const customerVehicleApi = {
  // axiosClient interceptor trả về body (ApiResponse) → res.data là payload.
  mine: async (): Promise<CustomerVehicleDto[]> => {
    const res: any = await axiosClient.get('/customer-vehicles');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  },

  create: async (data: CreateCustomerVehicleDto): Promise<CustomerVehicleDto> => {
    const res: any = await axiosClient.post('/customer-vehicles', data);
    return res?.data ?? res;
  },

  update: async (id: number, data: Partial<CreateCustomerVehicleDto>): Promise<CustomerVehicleDto> => {
    const res: any = await axiosClient.put(`/customer-vehicles/${id}`, data);
    return res?.data ?? res;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/customer-vehicles/${id}`);
  },
};

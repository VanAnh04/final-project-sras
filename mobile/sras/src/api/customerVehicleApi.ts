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

export const customerVehicleApi = {
  // axiosClient interceptor trả về body (ApiResponse) → res.data là payload.
  mine: async (): Promise<CustomerVehicleDto[]> => {
    const res: any = await axiosClient.get('/customer-vehicles');
    return res.data;
  },
};

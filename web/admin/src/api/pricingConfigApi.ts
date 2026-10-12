import axiosClient from './axiosClient';

export interface RescuePricingConfig {
  id: number;
  vehicleType: 'MOTORBIKE' | 'CAR';
  feePerKmDay: number;
  feePerKmNight: number;
  minFee: number;
  freeKm: number;
  nightStartHour: number;
  nightStartMinute?: number;
  nightEndHour: number;
  nightEndMinute?: number;
  holidaySurgeEnabled?: boolean;
  holidaySurchargePct: number;
  displayNote?: string;
  updatedByUserId?: number;
  updatedAt?: string;
}

export interface RescuePricingConfigRequest {
  vehicleType: 'MOTORBIKE' | 'CAR';
  feePerKmDay: number;
  feePerKmNight: number;
  minFee: number;
  freeKm: number;
  nightStartHour: number;
  nightStartMinute?: number;
  nightEndHour: number;
  nightEndMinute?: number;
  holidaySurgeEnabled?: boolean;
  holidaySurchargePct: number;
  displayNote?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const pricingConfigApi = {
  getAllConfigs: async (): Promise<ApiResponse<RescuePricingConfig[]>> => {
    return (await axiosClient.get('/admin/pricing-config')) as unknown as ApiResponse<RescuePricingConfig[]>;
  },

  getConfig: async (vehicleType: 'MOTORBIKE' | 'CAR'): Promise<ApiResponse<RescuePricingConfig>> => {
    return (await axiosClient.get(`/admin/pricing-config/${vehicleType}`)) as unknown as ApiResponse<RescuePricingConfig>;
  },

  updateConfig: async (
    vehicleType: 'MOTORBIKE' | 'CAR',
    data: RescuePricingConfigRequest
  ): Promise<ApiResponse<RescuePricingConfig>> => {
    return (await axiosClient.put(`/admin/pricing-config/${vehicleType}`, data)) as unknown as ApiResponse<RescuePricingConfig>;
  },

  previewCalculation: async (
    vehicleType: 'MOTORBIKE' | 'CAR',
    distanceKm: number,
    hour?: number
  ): Promise<ApiResponse<{ vehicleType: string; distanceKm: number; hour: number; calculatedFee: number }>> => {
    const params = new URLSearchParams({
      vehicleType,
      distanceKm: distanceKm.toString(),
    });
    if (hour !== undefined) {
      params.append('hour', hour.toString());
    }
    return (await axiosClient.get(`/admin/pricing-config/preview/calculate?${params.toString()}`)) as unknown as ApiResponse<{
      vehicleType: string;
      distanceKm: number;
      hour: number;
      calculatedFee: number;
    }>;
  },
};

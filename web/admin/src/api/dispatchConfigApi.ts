import axiosClient from './axiosClient';
import type { ApiResponse } from './pricingConfigApi';

export interface DispatchConfig {
  id?: number;
  weightDistance: number;
  weightWorkload: number;
  weightRating: number;
  weightResponseRate: number;
  penaltyPerOrder: number;
  isActive?: boolean;
  updatedAt?: string;
  updatedByUserId?: number;
}

export interface UpdateDispatchConfigRequest {
  weightDistance: number;
  weightWorkload: number;
  weightRating: number;
  weightResponseRate: number;
  penaltyPerOrder: number;
}

export const dispatchConfigApi = {
  getConfig: async (): Promise<ApiResponse<DispatchConfig>> => {
    return (await axiosClient.get('/admin/dispatch-config')) as unknown as ApiResponse<DispatchConfig>;
  },
  updateConfig: async (data: UpdateDispatchConfigRequest): Promise<ApiResponse<DispatchConfig>> => {
    return (await axiosClient.put('/admin/dispatch-config', data)) as unknown as ApiResponse<DispatchConfig>;
  },
};

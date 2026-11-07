import axiosClient from './axiosClient';

export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
export type ComplaintTargetType = 'GARAGE' | 'CUSTOMER' | 'PLATFORM';

export interface ComplaintDto {
  id: number;
  requestId: number | null;
  requestCode: string | null;
  createdByUserId: number;
  createdByUserName: string | null;
  createdByUserPhone: string | null;
  targetType: ComplaintTargetType;
  content: string;
  attachmentUrl: string | null;
  status: ComplaintStatus;
  resolution: string | null;
  handledByUserId: number | null;
  handledByUserName: string | null;
  garageId: number | null;
  garageName: string | null;
  createdAt: string;
  updatedAt: string | null;
  suggestedCompensationAmount?: number | null;
  approvedCompensationAmount?: number | null;
  customerCounterExplanation?: string | null;
  customerCounterAttachmentUrl?: string | null;
  customerCounteredAt?: string | null;
  arrivedAt?: string | null;
  bomReportedAt?: string | null;
  bomWaitingMinutes?: number | null;

  // Thông tin mở rộng phục vụ Giám sát & Đối soát Admin
  customerName?: string | null;
  customerPhone?: string | null;
  garagePhone?: string | null;
  garageAddress?: string | null;
  garageOwnerName?: string | null;
  garageOwnerPhone?: string | null;
  garageLat?: number | null;
  garageLng?: number | null;

  staffId?: number | null;
  staffName?: string | null;
  staffPhone?: string | null;
  rescueVehiclePlate?: string | null;

  orderStatus?: string | null;
  orderTotalAmount?: number | null;
  orderRescueFee?: number | null;
  orderTowingFee?: number | null;
  vehicleType?: string | null;
  customerVehiclePlate?: string | null;
  customerVehicleModel?: string | null;
  symptom?: string | null;
  pickupAddress?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;

  enRouteAt?: string | null;
  enRouteLat?: number | null;
  enRouteLng?: number | null;
  rescuerLat?: number | null;
  rescuerLng?: number | null;
  completedAt?: string | null;
  cancelReason?: string | null;
  cancelledBy?: string | null;
}

export interface ComplaintFilterParams {
  status?: ComplaintStatus | '';
  targetType?: ComplaintTargetType | '';
  page?: number;
  size?: number;
}

const unwrap = (res: any) => {
  if (res?.data !== undefined) return res.data;
  return res;
};

export const complaintApi = {
  getAdminComplaints: async (params?: ComplaintFilterParams) => {
    const cleanParams: any = { ...params };
    if (!cleanParams.status) delete cleanParams.status;
    if (!cleanParams.targetType) delete cleanParams.targetType;
    const res: any = await axiosClient.get('/complaints/admin', { params: cleanParams });
    return unwrap(res);
  },

  getComplaintDetail: async (id: number): Promise<ComplaintDto> => {
    const res: any = await axiosClient.get(`/complaints/admin/${id}`);
    return unwrap(res);
  },

  resolveComplaint: async (
    id: number,
    data: {
      status: ComplaintStatus;
      resolution?: string;
      approvedCompensationAmount?: number;
      penaltyAmount?: number;
    }
  ): Promise<ComplaintDto> => {
    const res: any = await axiosClient.put(`/complaints/admin/${id}/resolve`, data);
    return unwrap(res);
  },
};

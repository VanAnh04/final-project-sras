import axiosClient from './axiosClient';

export type ComplaintTargetType = 'GARAGE' | 'CUSTOMER' | 'PLATFORM';
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';

export interface CreateComplaintPayload {
  requestId?: number;
  targetType: ComplaintTargetType;
  content: string;
  attachmentUrl?: string;
}

export interface ComplaintDto {
  id: number;
  requestId?: number;
  requestCode?: string;
  createdByUserId: number;
  createdByUserName?: string;
  createdByUserPhone?: string;
  targetType: ComplaintTargetType;
  content: string;
  attachmentUrl?: string;
  status: ComplaintStatus;
  resolution?: string;
  handledByUserId?: number;
  handledByUserName?: string;
  garageId?: number;
  garageName?: string;
  createdAt: string;
  updatedAt?: string;
}

const unwrap = (res: any) => {
  if (res?.data !== undefined) return res.data;
  return res;
};

export const complaintApi = {
  create: async (payload: CreateComplaintPayload): Promise<ComplaintDto> => {
    const res: any = await axiosClient.post('/complaints', payload);
    return unwrap(res);
  },
  getMyComplaints: async (): Promise<ComplaintDto[]> => {
    const res: any = await axiosClient.get('/complaints/my');
    const data = unwrap(res);
    return Array.isArray(data) ? data : (data?.content || []);
  },
  getByGarage: async (garageId: number): Promise<ComplaintDto[]> => {
    const res: any = await axiosClient.get(`/complaints/garage/${garageId}`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : (data?.content || []);
  },
  getByRequest: async (requestId: number): Promise<ComplaintDto | null> => {
    const res: any = await axiosClient.get(`/complaints/request/${requestId}`);
    return unwrap(res) || null;
  },
};


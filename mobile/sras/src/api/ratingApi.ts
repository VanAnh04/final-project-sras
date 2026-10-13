import axiosClient from './axiosClient';

export interface RatingDto {
  id: number;
  requestId: number;
  requestCode?: string;
  direction: 'CUSTOMER_TO_GARAGE' | 'GARAGE_TO_CUSTOMER';
  raterUserId: number;
  raterName?: string;
  raterPhone?: string;
  stars: number;
  comment?: string;
  garageId?: number;
  garageName?: string;
  staffId?: number;
  staffName?: string;
  staffCode?: string;
  staffStars?: number;
  staffComment?: string;
  createdAt: string;
}

export interface CreateRatingPayload {
  requestId: number;
  stars: number;
  comment?: string;
  staffStars?: number;
  staffComment?: string;
}

const unwrap = (res: any) => {
  if (res?.data !== undefined) return res.data;
  return res;
};

export const ratingApi = {
  create: async (payload: CreateRatingPayload): Promise<RatingDto> => {
    const res: any = await axiosClient.post('/ratings', payload);
    return unwrap(res);
  },
  getByGarage: async (garageId: number, page = 0, size = 10) => {
    const res: any = await axiosClient.get(`/ratings/garage/${garageId}`, { params: { page, size } });
    return unwrap(res);
  },
  getByGarageList: async (garageId: number): Promise<RatingDto[]> => {
    const res: any = await axiosClient.get(`/ratings/garage/${garageId}/all`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : (data?.content || []);
  },
  getByRequest: async (requestId: number): Promise<RatingDto | null> => {
    const res: any = await axiosClient.get(`/ratings/request/${requestId}`);
    return unwrap(res) || null;
  },
  getByStaff: async (staffId: number): Promise<RatingDto[]> => {
    const res: any = await axiosClient.get(`/ratings/staff/${staffId}`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : (data?.content || []);
  },
  getGarageStaffRatings: async (garageId: number): Promise<RatingDto[]> => {
    const res: any = await axiosClient.get(`/ratings/garage/${garageId}/staff-ratings`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : (data?.content || []);
  },
};

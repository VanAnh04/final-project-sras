import axiosClient from './axiosClient';

export interface RatingDto {
  id: number;
  requestId: number | null;
  requestCode: string | null;
  direction: string;
  raterUserId: number | null;
  raterName: string | null;
  raterPhone: string | null;
  stars: number;
  comment: string | null;
  garageId: number | null;
  garageName: string | null;
  staffId: number | null;
  staffName: string | null;
  staffCode: string | null;
  staffStars: number | null;
  staffComment: string | null;
  createdAt: string;
}

export interface AdminRatingStatsDto {
  totalRatings: number;
  avgStars: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
}

export interface RatingFilterParams {
  garageId?: number | '';
  staffId?: number | '';
  stars?: number | '';
  keyword?: string;
  page?: number;
  size?: number;
}

const unwrap = (res: any) => {
  if (res?.data !== undefined) return res.data;
  return res;
};

export const ratingApi = {
  getAdminRatings: async (params?: RatingFilterParams) => {
    const cleanParams: any = { ...params };
    if (!cleanParams.garageId) delete cleanParams.garageId;
    if (!cleanParams.staffId) delete cleanParams.staffId;
    if (!cleanParams.stars) delete cleanParams.stars;
    if (!cleanParams.keyword?.trim()) delete cleanParams.keyword;
    const res: any = await axiosClient.get('/ratings/admin', { params: cleanParams });
    return unwrap(res);
  },

  getAdminStats: async (): Promise<AdminRatingStatsDto> => {
    const res: any = await axiosClient.get('/ratings/admin/stats');
    return unwrap(res);
  },

  deleteRating: async (id: number): Promise<void> => {
    await axiosClient.delete(`/ratings/admin/${id}`);
  },
};

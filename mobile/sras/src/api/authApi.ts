import axiosClient from './axiosClient';

export interface UpdateProfilePayload {
  userId?: number;
  fullName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
}

export const authApi = {
  // Gửi mã OTP về email
  sendEmailOtp: async (email: string) => {
    const response = await axiosClient.post('/auth/email/send-otp', { email });
    return response.data;
  },

  // Xác thực mã OTP email
  verifyEmailOtp: async (email: string, otp: string) => {
    const response = await axiosClient.post('/auth/email/verify-otp', { email, otp });
    return response.data;
  },

  // Cập nhật thông tin hồ sơ
  updateProfile: async (payload: UpdateProfilePayload) => {
    const response = await axiosClient.post('/auth/update-profile', payload);
    return response.data;
  },
};

import axiosClient from './axiosClient';

export interface UpdateProfilePayload {
  userId?: number;
  fullName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
}

/** Kết quả đổi token Clerk (khớp `ClerkExchangeResponse` của backend). */
export interface ClerkExchangeResult {
  /** true → tài khoản đã có, đăng nhập luôn bằng `auth`. */
  exists: boolean;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  /** Chỉ có khi exists=false: vé đăng ký 15′ cho bước SĐT + OTP. */
  registrationToken?: string | null;
  auth?: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: number;
      fullName: string;
      phone: string;
      email: string;
      avatarUrl: string;
      role: string;
      isPhoneVerified: boolean;
    };
  } | null;
}

export const authApi = {
  // Đăng nhập Apple qua Clerk: đổi session token Clerk lấy JWT hệ thống (user mới nhận registrationToken)
  appleExchange: async (clerkToken: string): Promise<ClerkExchangeResult> => {
    const response = await axiosClient.post('/auth/clerk/apple/exchange', { clerkToken });
    return response.data;
  },

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

  // Đổi mật khẩu tài khoản
  changePassword: async (payload: { currentPassword?: string; newPassword: string }) => {
    const response = await axiosClient.post('/auth/change-password', payload);
    return response.data;
  },

  // Xóa tài khoản vĩnh viễn
  deleteAccount: async () => {
    const response = await axiosClient.delete('/auth/delete-account');
    return response.data;
  },
};

import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import { useSSO, useAuth as useClerkAuth } from '@clerk/expo';
import { authApi } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';

/**
 * Đăng nhập Apple qua Clerk (OAuth trên trình duyệt → chạy được cả iOS, Android và Expo Go).
 * Cùng kiểu token-exchange với Google nhưng gọi endpoint riêng `/auth/clerk/apple/exchange`;
 * khách mới đi tiếp màn `google-phone` (SĐT + OTP) với `provider: 'apple'`.
 */
export function useAppleSignIn(onError: (message: string) => void) {
  const router = useRouter();
  const { login } = useAuth();
  const { startSSOFlow } = useSSO();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const signInWithApple = useCallback(async () => {
    try {
      onError('');
      setIsAppleLoading(true);

      // Session Clerk cũ còn trong tokenCache sẽ làm startSSOFlow báo "You're already signed in" → luôn thoát trước
      await clerkSignOut().catch(() => { });

      // 1. Clerk lo toàn bộ OAuth với Apple (mở trình duyệt → Apple → quay lại app)
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_apple',
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      // Người dùng huỷ, hoặc cần bước bổ sung → không có session
      if (!createdSessionId || !setActive) {
        return;
      }

      // 2. Kích hoạt session Clerk rồi lấy session token gửi cho backend
      await setActive({ session: createdSessionId });
      const clerkToken = await getToken();
      if (!clerkToken) {
        throw new Error('Không lấy được phiên đăng nhập Apple.');
      }

      // 3. Đổi Clerk token lấy JWT của hệ thống (backend tự lấy email từ Clerk, không tin client)
      const result = await authApi.appleExchange(clerkToken);

      if (result.exists && result.auth) {
        await login(result.auth.accessToken, result.auth.refreshToken, result.auth.user);
        const role = result.auth.user?.role?.toUpperCase();
        if (role === 'GARAGE_OWNER') {
          router.replace('/garage-owner');
        } else if (role === 'GARAGE_STAFF') {
          router.replace('/garage-staff/home');
        } else {
          router.replace('/customer');
        }
      } else {
        // Khách mới → bổ sung số điện thoại + OTP (dùng chung màn với Google)
        router.push({
          pathname: '/auth/google-phone',
          params: {
            registrationToken: result.registrationToken || '',
            email: result.email,
            fullName: result.fullName,
            avatarUrl: result.avatarUrl || '',
            provider: 'apple',
          },
        });
      }
    } catch (error: any) {
      onError(
        error.response?.data?.message || error.message || 'Đăng nhập Apple thất bại. Vui lòng thử lại.',
      );
    } finally {
      // App chỉ mượn Clerk để xác thực Apple → xong (kể cả lỗi) thì thoát Clerk, dùng JWT riêng
      await clerkSignOut().catch(() => { });
      setIsAppleLoading(false);
    }
  }, [onError, startSSOFlow, getToken, clerkSignOut, login, router]);

  return { signInWithApple, isAppleLoading };
}

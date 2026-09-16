import { useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { jwtDecode } from 'jwt-decode';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

interface UseGoogleAuthOptions {
  onSuccess: (userInfo: GoogleUserInfo) => Promise<void> | void;
  onError?: (errorMessage: string) => void;
}

const DEFAULT_WEB_CLIENT_ID = '229938293794-pi05pu3fjodkh73rplnh7s2fq0naq61s.apps.googleusercontent.com';
const PROXY_REDIRECT_URI = 'https://auth.expo.io/@diemvi/customer';

export function useGoogleAuth({ onSuccess, onError }: UseGoogleAuthOptions) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || DEFAULT_WEB_CLIENT_ID;

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: webClientId,
    webClientId: webClientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: PROXY_REDIRECT_URI,
  });

  const fetchUserInfo = async (token: string): Promise<GoogleUserInfo | null> => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Google API status: ${res.status}`);
      }

      const info = await res.json();
      return {
        email: info.email,
        name: info.name || info.given_name || 'Người dùng Google',
        picture: info.picture,
        sub: info.sub,
      };
    } catch (e: any) {
      return null;
    }
  };

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const authentication = response.authentication;
      const params = (response as any).params || {};
      const accessToken = authentication?.accessToken || params.access_token;
      const idToken = authentication?.idToken || params.id_token;

      (async () => {
        try {
          setIsGoogleLoading(true);

          let userInfo: GoogleUserInfo | null = null;

          // 1. Thử decode idToken trực tiếp
          if (idToken) {
            try {
              const decoded: any = jwtDecode(idToken);
              if (decoded?.email) {
                userInfo = {
                  email: decoded.email,
                  name: decoded.name || decoded.given_name || 'Người dùng Google',
                  picture: decoded.picture,
                  sub: decoded.sub,
                };
              }
            } catch (jwtErr) {
              // ignore
            }
          }

          // 2. Nếu chưa lấy được từ idToken, gọi Google userinfo bằng accessToken
          if (!userInfo && accessToken) {
            userInfo = await fetchUserInfo(accessToken);
          }

          if (userInfo && userInfo.email) {
            await onSuccess(userInfo);
          } else {
            throw new Error('Không thể lấy thông tin email từ tài khoản Google.');
          }
        } catch (err: any) {
          onError?.(err.message || 'Xác thực Google thất bại.');
        } finally {
          setIsGoogleLoading(false);
        }
      })();
    } else if (response.type === 'error') {
      const msg =
        (response.error as any)?.message ||
        response.error?.code ||
        'Đăng nhập Google thất bại hoặc bị từ chối ủy quyền.';
      onError?.(msg);
      setIsGoogleLoading(false);
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      setIsGoogleLoading(false);
    }
  }, [response]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setIsGoogleLoading(true);
      if (!request) {
        throw new Error('Hệ thống Google Auth đang khởi tạo, vui lòng thử lại sau vài giây.');
      }
      const result = await promptAsync();
      if (result.type !== 'success') {
        setIsGoogleLoading(false);
        if (result.type === 'error') {
          onError?.('Không thể mở trang xác thực Google.');
        }
      }
    } catch (err: any) {
      console.error('📱 [Google Prompt Exception]:', err);
      onError?.(err.message || 'Không thể kết nối tới Google.');
      setIsGoogleLoading(false);
    }
  }, [request, promptAsync, onError]);

  return {
    signInWithGoogle,
    isGoogleLoading,
    isReady: !!request,
  };
}

import { useState, useCallback, useEffect, useRef } from 'react';

// Declaration for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: any) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

interface UseGoogleAuthProps {
  onSuccess: (userInfo: GoogleUserInfo) => Promise<void> | void;
  onError?: (errorMessage: string) => void;
}

export function useGoogleAuth({ onSuccess, onError }: UseGoogleAuthProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const tokenClientRef = useRef<GoogleTokenClient | null>(null);

  // Keep latest callbacks in refs to prevent infinite effect triggers
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '297939129935-g5pkfgoakfk38ashb3e6dehkaqsijeh4.apps.googleusercontent.com';

  useEffect(() => {
    const initClient = () => {
      if (window.google?.accounts?.oauth2) {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'openid email profile',
            callback: async (tokenResponse: GoogleTokenResponse) => {
              if (tokenResponse.error) {
                console.error('Google OAuth Error:', tokenResponse);
                setIsGoogleLoading(false);
                onErrorRef.current?.(tokenResponse.error_description || 'Đăng nhập Google thất bại');
                return;
              }

              try {
                // Fetch user info from Google
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: {
                    Authorization: `Bearer ${tokenResponse.access_token}`,
                  },
                });

                if (!res.ok) {
                  throw new Error(`Google API returned status ${res.status}`);
                }

                const userInfo: GoogleUserInfo = await res.json();
                console.log('🌐 [Google Auth Web] User info fetched:', userInfo.email);
                await onSuccessRef.current(userInfo);
              } catch (err: any) {
                console.error('Error fetching Google userinfo:', err);
                onErrorRef.current?.(err.message || 'Không thể lấy thông tin tài khoản Google');
              } finally {
                setIsGoogleLoading(false);
              }
            },
            error_callback: (err: any) => {
              console.error('Google Token Client Error:', err);
              setIsGoogleLoading(false);
              onErrorRef.current?.('Đăng nhập Google bị hủy hoặc gặp lỗi');
            },
          });
          tokenClientRef.current = client;
        } catch (error) {
          console.error('Failed to initialize Google token client:', error);
        }
      }
    };

    if (window.google?.accounts?.oauth2) {
      initClient();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(interval);
          initClient();
        }
      }, 300);

      return () => clearInterval(interval);
    }
  }, [clientId]);

  const signInWithGoogle = useCallback(() => {
    if (!tokenClientRef.current) {
      if (!window.google?.accounts?.oauth2) {
        onErrorRef.current?.('Thư viện Google Sign-In đang tải, vui lòng thử lại sau 2 giây.');
      } else {
        onErrorRef.current?.('Chưa khởi tạo được Google Client. Vui lòng tải lại trang.');
      }
      return;
    }

    setIsGoogleLoading(true);
    tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
  }, []);

  return {
    signInWithGoogle,
    isGoogleLoading,
  };
}

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleAuth, type GoogleUserInfo } from '../hooks/useGoogleAuth';
import { Eye, EyeOff, Shield, Cloud, User, Lock, LogIn, Loader2 } from 'lucide-react';

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: true,
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleGoogleSuccess = useCallback(async (googleUser: GoogleUserInfo) => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const response: any = await axiosClient.post('/auth/google/check', {
        email: googleUser.email.trim().toLowerCase(),
        fullName: googleUser.name || 'Người dùng Google',
        avatarUrl: googleUser.picture || '',
      });

      const result = response?.data || response;

      if (result.exists && result.auth) {
        const authData = result.auth;
        if (!authData?.accessToken) {
          throw new Error('Không nhận được dữ liệu xác thực (thiếu accessToken)');
        }

        login(authData.accessToken, authData.refreshToken, authData.user, true);

        const role = authData.user?.role?.toUpperCase();
        if (role === 'GARAGE_OWNER') {
          navigate('/garage-dashboard');
        } else {
          navigate('/admin-dashboard');
        }
      } else {
        setErrorMsg(
          `Tài khoản Google (${googleUser.email}) chưa được đăng ký trong hệ thống. Vui lòng liên hệ Quản trị viên để được cấp tài khoản.`
        );
      }
    } catch (error: any) {
      console.error('Web Google login error:', error);
      setErrorMsg(
        error.response?.data?.message ||
        error.message ||
        'Đăng nhập Google thất bại. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [login, navigate]);

  const { signInWithGoogle, isGoogleLoading } = useGoogleAuth({
    onSuccess: handleGoogleSuccess,
    onError: useCallback((err: string) => setErrorMsg(err), []),
  });

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const inputVal = (data.identifier || data.phone || '').trim();
      const isEmail = inputVal.includes('@');
      const isRemember = data.rememberMe !== undefined ? Boolean(data.rememberMe) : true;
      const payload = isEmail
        ? { email: inputVal, password: data.password, rememberMe: isRemember }
        : { phone: inputVal, password: data.password, rememberMe: isRemember };

      const response: any = await axiosClient.post('/auth/login', payload);

      // axiosClient interceptor unwraps to ApiResponse: { success, message, data: { accessToken, refreshToken, user } }
      const authData = response?.data || response;
      if (!authData?.accessToken) {
        throw new Error('Không nhận được dữ liệu xác thực (thiếu accessToken)');
      }

      login(authData.accessToken, authData.refreshToken, authData.user, isRemember);

      const role = authData.user?.role?.toUpperCase();
      if (role === 'GARAGE_OWNER') {
        navigate('/garage-dashboard');
      } else {
        navigate('/admin-dashboard');
      }
    } catch (error: any) {
      console.error('Web login error:', error);
      setErrorMsg(
        error.response?.data?.message ||
        error.message ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f8f9fb] font-sans">
      {/* Left side - Background Image */}
      <div className="hidden lg:flex lg:w-[50%] relative overflow-hidden bg-black">
        {/* Background Image with warm overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/avata.jpg')" }}
        />
        {/* Orange/Warm overlay to enhance the sunset tone */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 via-orange-800/30 to-black/60 mix-blend-overlay" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center h-full p-16 xl:p-24 text-white">
          <div className="max-w-xl">
            {/* Logo area */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 17H22L20 11H4L2 17H5L6 21H18L19 17Z" stroke="#E65100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 11V7C6 5.89543 6.89543 5 8 5H16C17.1046 5 18 5.89543 18 7V11" stroke="#E65100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8" cy="17" r="1" fill="#E65100" />
                  <circle cx="16" cy="17" r="1" fill="#E65100" />
                  <path d="M12 11V14" stroke="#E65100" strokeWidth="2" strokeLinecap="round" />
                  <path d="M10 14H14" stroke="#E65100" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">SRAS AdminSystem</h1>
                <p className="text-sm text-gray-200">Smart Rescue Assistance System</p>
              </div>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Quản trị hệ thống cứu<br />hộ thông minh
            </h2>
            <p className="text-gray-200 text-lg leading-relaxed mb-16">
              Giải pháp quản lý và điều phối cứu hộ giao thông hiện đại, tối ưu hóa quy trình và nâng cao hiệu quả phản ứng nhanh.
            </p>

            <div className="flex gap-12">
              <div>
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <Cloud className="w-5 h-5 text-white" /> Tốc độ
                </div>
                <div className="text-sm text-gray-300">Phản hồi sự cố trong tích tắc</div>
              </div>
              <div>
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <Shield className="w-5 h-5 text-white" /> Bảo mật
                </div>
                <div className="text-sm text-gray-300">An toàn dữ liệu tuyệt đối</div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-12 left-16 xl:left-24">
            <p className="text-xs text-gray-400">SRAS Management System.</p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-[50%] flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-[580px] bg-white rounded-3xl shadow-[0_16px_50px_rgba(0,0,0,0.07)] border border-gray-100 p-8 sm:p-14 pb-12">
          <div className="text-center mb-9">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Chào mừng trở lại</h2>
            <p className="text-base sm:text-lg text-gray-500">Đăng nhập vào bảng điều khiển Quản trị viên</p>
          </div>

          <div className="flex gap-4 mb-9">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={isLoading || isGoogleLoading}
              className="flex-1 flex items-center justify-center gap-3 border border-gray-200 bg-white rounded-2xl py-3.5 sm:py-4 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-base font-semibold text-gray-700 shadow-sm active:scale-[0.98]"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                  <span className="text-gray-500">Đang kết nối...</span>
                </>
              ) : (
                <>
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                  Google
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isLoading || isGoogleLoading}
              className="flex-1 flex items-center justify-center gap-3 border border-gray-200 bg-white rounded-2xl py-3.5 sm:py-4 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-base font-semibold text-gray-700 shadow-sm opacity-60 cursor-not-allowed"
              title="Tính năng đăng nhập Facebook sắp ra mắt"
            >
              <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-6 h-6" alt="Facebook" />
              Facebook
            </button>
          </div>

          <div className="relative mb-9">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-5 bg-white text-gray-400 font-medium uppercase tracking-wider">Hoặc sử dụng tài khoản</span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm sm:text-base rounded-xl text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2.5">Số điện thoại hoặc Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-6 h-6" />
                </div>
                <input
                  type="text"
                  placeholder="Nhập email hoặc SĐT"
                  className="w-full pl-11 pr-4 py-3 bg-[#f9fafc] border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm placeholder:text-gray-400 text-gray-900"
                  {...register('identifier', { required: 'Vui lòng nhập số điện thoại hoặc email' })}
                />
              </div>
              {errors.identifier && <p className="text-red-500 text-xs mt-1 font-medium">{errors.identifier.message as string}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-sm sm:text-base font-semibold text-gray-700">Mật khẩu</label>
                <a href="#" className="text-sm sm:text-base font-semibold text-orange-600 hover:text-orange-700 transition-colors">Quên mật khẩu?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-6 h-6" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-13 sm:pl-14 pr-13 py-4 bg-[#f9fafc] border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-base sm:text-lg placeholder:text-gray-400 text-gray-900"
                  {...register('password', { required: 'Vui lòng nhập mật khẩu' })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 sm:pr-5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1.5 font-medium">{errors.password.message as string}</p>}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label htmlFor="remember" className="flex items-center gap-3 cursor-pointer select-none py-1">
                <input
                  id="remember"
                  type="checkbox"
                  defaultChecked={true}
                  className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                  {...register('rememberMe')}
                />
                <span className="text-sm sm:text-base font-medium text-gray-700 hover:text-gray-900 transition-colors">
                  Ghi nhớ đăng nhập
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-orange-600 border-2 border-orange-600 font-bold py-4 px-6 rounded-2xl hover:bg-orange-50 transition-colors flex justify-center items-center gap-2.5 mt-5 text-lg disabled:opacity-70 disabled:cursor-not-allowed shadow-sm active:scale-[0.99]"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin" />
              ) : (
                <>
                  Đăng nhập
                  <LogIn className="w-6 h-6" />
                </>
              )}
            </button>
          </form>
          <div className="mt-9 flex justify-center gap-8 text-xs sm:text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-gray-600 transition-colors">Chính sách bảo mật</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Điều khoản sử dụng</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Trợ giúp</a>
          </div>
        </div>
      </div>
    </div>
  );
}

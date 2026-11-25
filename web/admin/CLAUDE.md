# Web admin rules — React / Vite

Áp dụng cho `web/admin/`. Rules chung ở [../../CLAUDE.md](../../CLAUDE.md).

- Stack: **React 19 + Vite 8 + Tailwind CSS 4 + TypeScript**, `react-router-dom` 7, `recharts`,
  `axios`, `react-hook-form`, icon `lucide-react`. Bản đồ dùng goong-js (`VITE_GOONG_MAPTILES_KEY`).
- Chạy: `npm run dev` (http://localhost:5173) · kiểm tra: `npm run build` (gồm `tsc -b`) và `npm run lint`.
- Chỉ phục vụ vai trò **`ADMIN`**; backend chặn `/api/admin/**` bằng `hasRole('ADMIN')`.
- Đăng nhập: Google Identity Services (`useGoogleAuth`) → `POST /api/auth/google/check`. ⚠️ Backend chưa kiểm ID
  token Google — khi sửa luồng đăng nhập phải gửi ID token lên thay vì chỉ email (xem
  [docs/progress.md §1](../../docs/progress.md)).

## Cấu trúc

```
src/App.tsx                    khai báo route (ProtectedRoute / PublicRoute)
src/pages/Login.tsx            đăng nhập (Google)
src/pages/admin/*Page.tsx      Dashboard, Garages, Technicians, Finance, Services, Reports, Complaints,
                               Ratings, Users, SystemSettings
src/components/layout/         DashboardLayout, Sidebar, Header (thông báo)
src/components/dashboard/      IncidentDrawer, PartnerGaragesMap
src/components/analytics/      thẻ KPI, biểu đồ, bản đồ điểm nóng, thẻ nhận định AI của trang Báo cáo
src/api/                       axiosClient + module theo domain (analyticsApi, complaintApi, dispatchConfigApi,
                               pricingConfigApi, ratingApi)
src/contexts/AuthContext.tsx
src/models/                    kiểu dữ liệu mirror entity backend
src/types/                     kiểu riêng của web (vd. analytics.ts)
```

## Quy ước

- **Trang mới**: tạo `src/pages/admin/XxxPage.tsx`, khai báo route trong `App.tsx` bọc
  `<ProtectedRoute><DashboardLayout>…</DashboardLayout></ProtectedRoute>`, thêm mục vào `Sidebar.tsx`.
- **Gọi API** qua `axiosClient` (`src/api/axiosClient.ts`) — đã gắn access token trong bộ nhớ và tự
  refresh khi 401. Gom các call của một domain vào `src/api/<domain>Api.ts`, không gọi axios rời rạc
  trong component. (Nhiều trang cũ vẫn gọi `axiosClient` trực tiếp — code mới không làm theo, sửa trang nào thì
  chuyển dần sang `src/api/`.)
- Base URL lấy từ `VITE_API_BASE_URL`; ảnh/file từ backend hiển thị qua `resolveFileUrl(...)`.
- Response theo khuôn `ApiResponse<T>` (`{ success, message, data }`); trang có phân trang nhận
  `Page<T>` của Spring (`content`, `totalElements`, `totalPages`, `number`, `size`).
- Thống kê (`/api/admin/analytics/**`) nhận `range` (mặc định `7_DAYS`) hoặc `from`/`to`; bản `ai-insights` có cache
  15′ phía backend — chỉ gửi `forceRefresh=true` khi người dùng bấm làm mới.
- Style bằng **Tailwind utility class**, tông chủ đạo cam (`orange-500`) + nền `gray-50`, thẻ
  `bg-white rounded-2xl border border-gray-100 shadow-sm`. Không thêm thư viện UI khác khi chưa thống nhất.
- Biểu đồ dùng `recharts`.
- Text giao diện bằng **tiếng Việt**; tiền định dạng VNĐ (`toLocaleString('vi-VN')`).
- Model trong `src/models/` phải khớp DTO backend; đổi DTO → sửa model.
- Biến `.env` có tiền tố `VITE_` là public (bundle vào client) — không đặt secret.

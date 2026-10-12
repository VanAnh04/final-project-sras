# Web admin rules — React / Vite

Áp dụng cho `web/admin/`. Rules chung ở [../../CLAUDE.md](../../CLAUDE.md).

- Stack: **React 19 + Vite 8 + Tailwind CSS 4 + TypeScript**, `react-router-dom` 7, `recharts`,
  `axios`, `react-hook-form`, icon `lucide-react`.
- Chạy: `npm run dev` (http://localhost:5173) · kiểm tra: `npm run build` (gồm `tsc -b`) và `npm run lint`.
- Chỉ phục vụ vai trò **`ADMIN`**; backend chặn `/api/admin/**` bằng `hasRole('ADMIN')`.

## Cấu trúc

```
src/App.tsx                 khai báo route (ProtectedRoute / PublicRoute)
src/pages/Login.tsx         đăng nhập (Google)
src/pages/admin/*Page.tsx   từng trang quản trị
src/components/layout/      DashboardLayout, Sidebar, Header
src/components/dashboard/   component riêng của dashboard (IncidentDrawer...)
src/api/                    axiosClient + module API theo domain (vd. pricingConfigApi.ts)
src/contexts/AuthContext.tsx
src/models/                 kiểu dữ liệu mirror entity backend
```

## Quy ước

- **Trang mới**: tạo `src/pages/admin/XxxPage.tsx`, khai báo route trong `App.tsx` bọc
  `<ProtectedRoute><DashboardLayout>…</DashboardLayout></ProtectedRoute>`, thêm mục vào `Sidebar.tsx`.
  Trang chưa làm dùng `PlaceholderPage` có sẵn.
- **Gọi API** qua `axiosClient` (`src/api/axiosClient.ts`) — đã gắn access token trong bộ nhớ và tự
  refresh khi 401. Gom các call của một domain vào `src/api/<domain>Api.ts`, không gọi axios rời rạc
  trong component.
- Base URL lấy từ `VITE_API_BASE_URL`; ảnh/file từ backend hiển thị qua `resolveFileUrl(...)`.
- Response theo khuôn `ApiResponse<T>` (`{ success, message, data }`); trang có phân trang nhận
  `Page<T>` của Spring (`content`, `totalElements`, `totalPages`, `number`, `size`).
- Style bằng **Tailwind utility class**, tông chủ đạo cam (`orange-500`) + nền `gray-50`, thẻ
  `bg-white rounded-2xl border border-gray-100 shadow-sm`. Không thêm thư viện UI khác khi chưa thống nhất.
- Biểu đồ dùng `recharts`.
- Text giao diện bằng **tiếng Việt**; tiền định dạng VNĐ (`toLocaleString('vi-VN')`).
- Model trong `src/models/` phải khớp DTO backend; đổi DTO → sửa model.
- Biến `.env` có tiền tố `VITE_` là public (bundle vào client) — không đặt secret.

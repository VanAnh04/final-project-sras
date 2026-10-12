# SRAS Web Admin

Trang quản trị hệ thống SRAS dành cho vai trò **ADMIN**: quản lý người dùng, duyệt gara, kỹ thuật
viên, danh mục dịch vụ và cấu hình giá cứu hộ.

## Công nghệ

React 19 · Vite 8 · TypeScript · Tailwind CSS 4 · react-router-dom 7 · axios · recharts ·
react-hook-form · lucide-react

## Cài đặt & chạy

```bash
npm install
cp .env.example .env      # rồi chỉnh giá trị
npm run dev               # http://localhost:5173
```

| Biến | Ví dụ | Ý nghĩa |
|------|-------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | URL backend |
| `VITE_GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google OAuth client (đăng nhập admin) |

Backend phải đang chạy (xem [../../backend/README.md](../../backend/README.md)).

## Scripts

| Lệnh | Tác dụng |
|------|----------|
| `npm run dev` | Chạy dev server (HMR) |
| `npm run build` | Kiểm tra kiểu (`tsc -b`) + build production vào `dist/` |
| `npm run preview` | Xem thử bản build |
| `npm run lint` | ESLint |

## Các trang

| Route | Trang | Trạng thái |
|-------|-------|-----------|
| `/login` | Đăng nhập | ✅ |
| `/admin-dashboard` | Tổng quan | ✅ |
| `/admin/users` | Người dùng | ✅ |
| `/admin/garages` | Gara (duyệt hồ sơ) | ✅ |
| `/admin/technicians` | Kỹ thuật viên | ✅ |
| `/admin/services` | Danh mục & dịch vụ | ✅ |
| `/admin/settings` | Cài đặt hệ thống (giá cứu hộ) | ✅ |
| `/admin/finance`, `/admin/reports`, `/admin/complaints` | Tài chính, Báo cáo, Khiếu nại | 🚧 placeholder |

## Cấu trúc

```
src/
  App.tsx              route + ProtectedRoute/PublicRoute
  pages/               Login + pages/admin/*
  components/layout/   DashboardLayout, Sidebar, Header
  api/                 axiosClient (JWT + tự refresh) + API theo domain
  contexts/            AuthContext
  models/              kiểu dữ liệu khớp entity backend
```

Quy ước code: [CLAUDE.md](CLAUDE.md) · API backend: [../../docs/api.md](../../docs/api.md)

import { resolveFileUrl } from '../api/axiosClient';

/**
 * Tạo URL ảnh đại diện mặc định theo tên người dùng sử dụng dịch vụ ui-avatars.com
 * với tông màu cam cứu hộ SRAS (#ea580c) và chữ trắng in đậm rõ nét.
 */
export function getDefaultAvatar(name?: string | null, size: number = 256): string {
  const cleanName = (name || '').trim() || 'User';
  const encoded = encodeURIComponent(cleanName);
  return `https://ui-avatars.com/api/?name=${encoded}&background=ea580c&color=fff&size=${size}&bold=true`;
}

/**
 * Trả về URI ảnh đại diện đầy đủ:
 * - Nếu người dùng có avatarUrl -> giải quyết thành URL hợp lệ.
 * - Nếu chưa có avatarUrl -> tự động sinh avatar theo tên người dùng.
 */
export function resolveUserAvatar(avatarUrl?: string | null, name?: string | null, size: number = 256): string {
  if (avatarUrl && avatarUrl.trim()) {
    const resolved = resolveFileUrl(avatarUrl.trim());
    if (resolved) return resolved;
  }
  return getDefaultAvatar(name, size);
}

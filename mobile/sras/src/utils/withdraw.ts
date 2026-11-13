// Tiện ích cho luồng rút tiền. Tránh String.normalize / Intl: Hermes hỗ trợ không chắc chắn.

const VN_MARKS: [RegExp, string][] = [
  [/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a'],
  [/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A'],
  [/[èéẹẻẽêềếệểễ]/g, 'e'],
  [/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E'],
  [/[ìíịỉĩ]/g, 'i'],
  [/[ÌÍỊỈĨ]/g, 'I'],
  [/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o'],
  [/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O'],
  [/[ùúụủũưừứựửữ]/g, 'u'],
  [/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U'],
  [/[ỳýỵỷỹ]/g, 'y'],
  [/[ỲÝỴỶỸ]/g, 'Y'],
  [/đ/g, 'd'],
  [/Đ/g, 'D'],
  // Dấu dạng tổ hợp (một số bàn phím gõ dấu rời sau chữ cái).
  [/[̀-ͯ]/g, ''],
];

/** Bỏ dấu tiếng Việt bằng bảng thay tường minh (không viết hoa). */
export function stripVietnamese(s: string): string {
  let out = s;
  for (const [re, ch] of VN_MARKS) out = out.replace(re, ch);
  return out;
}

/**
 * Tên chủ tài khoản như in trên thẻ: bỏ dấu, viết hoa, gộp khoảng trắng.
 * Chỉ để hiển thị khi gõ — server chuẩn hoá lần cuối.
 */
export function normalizeHolderName(s: string): string {
  return stripVietnamese(s).toUpperCase().replace(/\s+/g, ' ').replace(/^\s+/, '');
}

export const HOLDER_PATTERN = /^[A-Z][A-Z ]{1,99}$/;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** dd/MM HH:mm theo giờ máy. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Che số điện thoại, chỉ để lại 3 số cuối. */
export function maskPhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 3) return 'số điện thoại của bạn';
  return `••• ••• ${digits.slice(-3)}`;
}

/**
 * Phân loại lỗi OTP theo message server (ActionOtpService.message):
 * wrong = sai mã, còn nhập lại được; renew = mã đã bị đốt / hết hạn, phải xin mã mới.
 */
export function otpErrorKind(message: string): 'wrong' | 'renew' | 'other' {
  if (message.includes('yêu cầu mã mới')) return 'renew';
  if (message.includes('không đúng')) return 'wrong';
  return 'other';
}

/** "Vui lòng đợi N giây…" khi xin mã quá sớm ⇒ N, để đồng bộ đếm ngược với server. */
export function parseCooldownSeconds(message: string): number | null {
  const m = /đợi\s+(\d+)\s+giây/i.exec(message);
  return m ? Number(m[1]) : null;
}

/** Chữ viết tắt cho avatar ngân hàng (banks.json không có logo). */
export function bankInitials(shortName?: string | null): string {
  const s = (shortName || '').replace(/[^A-Za-z0-9]/g, '');
  return (s.slice(0, 3) || '?').toUpperCase();
}

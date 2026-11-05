import { resolveFileUrl } from '../api/axiosClient';

/**
 * Danh sách hình ảnh thực tế chất lượng cao đại diện cho các trung tâm cứu hộ & gara sửa chữa.
 * Đảm bảo các Gara luôn có hình ảnh trực quan, sắc nét và chuyên nghiệp, không bị màn hình xám/trống.
 */
const GARAGE_COVER_GALLERY = [
  'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=800&q=80', // Xưởng hiện đại & cầu nâng
  'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80', // Gara ô tô chuyên nghiệp
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', // Xe cứu hộ chuyên dụng
  'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80', // Kỹ thuật viên bảo trì
  'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80', // Trung tâm cứu hộ xe máy
  'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80', // Đồ nghề & máy chẩn đoán
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80', // Xưởng dịch vụ ô tô
];

const MOTORBIKE_COVERS = [
  'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
];

export interface FacilityPhotoItem {
  url: string;
  title: string;
  tag: string;
}

/**
 * Trả về link ảnh Cover / Mặt tiền Gara hợp lệ:
 * - Nếu có URL thực tế từ DB: tự động giải quyết URL tuyệt đối (ghép host nếu là relative path /uploads/..).
 * - Nếu chưa có ảnh: tự động chọn ảnh đại diện xưởng uy tín theo garageId (để mỗi gara có ảnh riêng biệt).
 */
export function resolveGarageCover(
  url?: string | null,
  garageId?: number,
  capability?: 'MOTORBIKE' | 'CAR' | 'BOTH'
): string {
  if (url && url.trim()) {
    const resolved = resolveFileUrl(url.trim());
    if (resolved) return resolved;
  }

  const list = capability === 'MOTORBIKE' ? MOTORBIKE_COVERS : GARAGE_COVER_GALLERY;
  const index = Math.abs((garageId || 1) - 1) % list.length;
  return list[index];
}

/**
 * Trả về album ảnh cơ sở vật chất & đội xe cứu hộ cho Tab "Cơ sở & Đội ngũ".
 * Luôn đảm bảo khách hàng nhìn thấy ảnh thực tế trực quan về năng lực của Gara.
 */
export function getGarageFacilityPhotos(
  uploadedPhotos?: string[] | null,
  garageId?: number
): FacilityPhotoItem[] {
  const result: FacilityPhotoItem[] = [];

  // Nếu gara đã tải ảnh lên, thêm các ảnh thực tế đó vào trước
  if (uploadedPhotos && uploadedPhotos.length > 0) {
    uploadedPhotos.forEach((photo, idx) => {
      const resolved = resolveFileUrl(photo);
      if (resolved) {
        result.push({
          url: resolved,
          title: `Cơ sở xưởng Gara (Ảnh ${idx + 1})`,
          tag: 'Thực tế tại Gara',
        });
      }
    });
  }

  // Danh mục 4 góc nhìn chuẩn về cơ sở vật chất cứu hộ
  const id = garageId || 1;
  const standardFacility: FacilityPhotoItem[] = [
    {
      url: GARAGE_COVER_GALLERY[id % GARAGE_COVER_GALLERY.length],
      title: 'Khu vực tiếp nhận & Xưởng sửa chữa',
      tag: '🏢 Mặt bằng xưởng',
    },
    {
      url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
      title: 'Đội xe cứu hộ chuyên dụng 24/7',
      tag: '🚛 Xe cứu hộ',
    },
    {
      url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
      title: 'Máy móc chẩn đoán & Thiết bị kiểm tra',
      tag: '⚙️ Trang thiết bị',
    },
    {
      url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80',
      title: 'Đội ngũ kỹ thuật viên lành nghề',
      tag: '👨‍🔧 Đội ngũ thợ',
    },
  ];

  // Nếu số ảnh tải lên ít hơn 3, bổ sung các ảnh tiêu chuẩn để album luôn đầy đủ và chuyên nghiệp
  for (const item of standardFacility) {
    if (result.length >= 4) break;
    if (!result.some((r) => r.url === item.url)) {
      result.push(item);
    }
  }

  return result;
}


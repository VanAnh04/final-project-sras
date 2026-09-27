-- Seed 2 xe test cho tài khoản vovansonha2019@gmail.com (dùng để thử màn "Nhận diện xe").
-- An toàn chạy lại nhiều lần: bỏ qua nếu biển số đã tồn tại cho khách này.
-- id khách được resolve từ email, KHÔNG hardcode.

-- 1) Ô tô — CÓ ảnh (test hiển thị ảnh dạng option chọn được)
INSERT INTO customer_vehicles
  (customer_id, vehicle_type, brand, model, license_plate, color, year, photo_url, is_default, is_deleted, created_at, updated_at)
SELECT u.id, 'CAR', 'Toyota', 'Vios', '51A-123.45', 'Trắng', 2020,
       'https://picsum.photos/seed/sras-car-vios/400/300', TRUE, FALSE, now(), now()
FROM users u
WHERE u.email = 'vovansonha2019@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM customer_vehicles cv
    WHERE cv.customer_id = u.id AND cv.license_plate = '51A-123.45'
  );

-- 2) Xe máy — KHÔNG ảnh (test fallback icon + biển số)
INSERT INTO customer_vehicles
  (customer_id, vehicle_type, brand, model, license_plate, color, year, photo_url, is_default, is_deleted, created_at, updated_at)
SELECT u.id, 'MOTORBIKE', 'Honda', 'Wave Alpha', '59P1-234.56', 'Đen', 2019,
       NULL, FALSE, FALSE, now(), now()
FROM users u
WHERE u.email = 'vovansonha2019@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM customer_vehicles cv
    WHERE cv.customer_id = u.id AND cv.license_plate = '59P1-234.56'
  );

-- Kiểm tra kết quả
SELECT cv.id, cv.vehicle_type, cv.brand, cv.model, cv.license_plate, cv.color, cv.photo_url, cv.is_default
FROM customer_vehicles cv
JOIN users u ON u.id = cv.customer_id
WHERE u.email = 'vovansonha2019@gmail.com' AND cv.is_deleted = FALSE;

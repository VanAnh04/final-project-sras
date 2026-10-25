-- =====================================================================
-- DỮ LIỆU CƠ SỞ TRI THỨC CHẨN ĐOÁN SỰ CỐ XE DÀNH CHO SUPABASE (POSTGRESQL)
-- Tổng số bản ghi thực tế: 230
-- =====================================================================


CREATE TABLE IF NOT EXISTS vehicle_fault_knowledge (
    id VARCHAR(100) PRIMARY KEY,
    vehicle_type VARCHAR(20) NOT NULL,
    category VARCHAR(255),
    symptom TEXT NOT NULL,
    diagnosed_issue TEXT NOT NULL,
    suggested_issue_type VARCHAR(50) NOT NULL,
    suggested_service VARCHAR(255),
    severity VARCHAR(20) NOT NULL,
    emergency_advice TEXT,
    troubleshooting_steps JSONB,
    source VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vfk_vehicle_type ON vehicle_fault_knowledge(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vfk_issue_type ON vehicle_fault_knowledge(suggested_issue_type);

INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOVSC_50', 'CAR', 'Sổ tay (OTOXANG) - Trang 50', 'Đèn báo VSC', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Đèn cảnh báo hệ', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Đèn cảnh báo hệ", "thống trợ lực lái", "Đèn cảnh báo"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 50)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOSCNCNHBO_50', 'CAR', 'Sổ tay (OTOXANG) - Trang 50', 'Đèn báo sự cố Đèn cảnh báo', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: áp suất lốp', 'FLAT_TIRE', 'Thay lốp dự phòng / Vá lốp ô tô lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["áp suất lốp", "Đèn cảnh báo áp", "suất dầu động cơ"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 50)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOCHA_50', 'CAR', 'Sổ tay (OTOXANG) - Trang 50', 'Đèn báo chưa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: hạ phanh tay', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["hạ phanh tay", "• Trạng thái bình thường: Khi xe đang chạy: tất cả các đèn màu đỏ và màu vàng đều tắt", "• Nếu một trong các đèn này không tắt sau khi nổ máy hoặc bật sáng khi đang lái xe, hãy liên hệ với Đại lý Toyota", "để kiểm tra ngay lập tức"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 50)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_RINGNBOPHANH_50', 'CAR', 'Sổ tay (OTOXANG) - Trang 50', '• Riêng đèn báo phanh tay sẽ tắt khi nhả phanh tay', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: A. Khi đèn cảnh báo sáng hoặc chuông cảnh báo kêu', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["A. Khi đèn cảnh báo sáng hoặc chuông cảnh báo kêu", "Phần 6: Các tình huống khẩn cấp"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 50)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_4EBSNHPNHYNK_68', 'CAR', 'Sổ tay (OTOXANG) - Trang 68', '4. EBS Nhấp nháy đèn khi phanh khẩn cấp Đèn báo khẩn cấp -', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: 5. HAC Giữ phanh trong vòng 2 giây khi khởihành ngang dốc Tác động phanh đồng thời lên cả 4 bánh xe -', 'FLAT_TIRE', 'Thay lốp dự phòng / Vá lốp ô tô lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["5. HAC Giữ phanh trong vòng 2 giây khi khởihành ngang dốc Tác động phanh đồng thời lên cả 4 bánh xe -", "6. DAC Tự động phanh khi xuống dốc Tác động phanh riêng rẽ lên 4 bánh xe Có Dừng xe, gài 2 cầu, nhấn phím", "7. VSC Tự động phanh khi phát hiện trượtngang Giảm công suất động cơ + Tác động phanh riêng rẽ lên 4 bánh xe Có Giữ phím trong 3s đểtắt, nhấn phím để bật", "8. TRC Tự động phanh và giảm công suấtđộng cơ Giảm công suất động cơ + Tác động phanh đồng thời lên 2 bánh xe dẫn động Có Nhấn phím để tắt / bật"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 68)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NHNTHYBNHYBT_8', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 8', 'nhìn thấy bạn, hãy bật đèn báo trước khi rẽ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: hoặc chuyển làn đường để cho người khác', 'ACCIDENT', 'Cứu hộ kéo xe về gara đối tác', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["hoặc chuyển làn đường để cho người khác", "chú ý đến bạn và sử dụng còi khi cần thiết.", "Không chạy xe vượt quá khả năng của bạn và", "điều kiện cho phép. Tâm trạng mệt mỏi và mất"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 8)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CAOCTHGYQUNH_14', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 14', 'cao có thể gây quá nhiệt hệ thống phanh,', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: làm giảm hiệu quả phanh. Sử dụng', 'FLAT_TIRE', 'Vá lốp xe máy lưu động (vá dùi hoặc vá nấm)', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["làm giảm hiệu quả phanh. Sử dụng", "phanh động cơ cùng với sử dụng các", "phanh ngắt quãng để giảm tốc độ.", "● Để phanh đạt hiệu quả tối ưu, hãy sử dụng"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 14)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUCMTNBONOKH_28', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 28', 'Nếu có một đèn báo nào không sáng trên màn hình theo đúng chức năng, hãy mang', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: xe đến cửa hàng Honda ủy nhiệm để kiểm tra.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["xe đến cửa hàng Honda ủy nhiệm để kiểm tra."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 28)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOR_28', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 28', 'Đèn báo rẽ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Nếu đèn này sáng khi động cơ đang hoạt động: (9 9 )T.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Nếu đèn này sáng khi động cơ đang hoạt động: (9 9 )T.", "Đèn sáng trong giây lát khi vặn khóa điện sang", "vị trí  (On)."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 28)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOCHCHIUXA_28', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 28', 'Đèn báo chế độ chiếu xa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Nếu đèn này sáng trong khi', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Nếu đèn này sáng trong khi", "lái xe: (9 8 )T.", "Đèn sáng khi hộp số ở vị trí số N."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 28)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_DCHLMMTNBOLI_28', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 28', 'dịch làm mátĐèn báo lỗi hệ thống PGM-FI', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: (Phun xăng điện tử) (MIL)', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["(Phun xăng điện tử) (MIL)"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 28)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHA_29', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 29', 'Đèn báo hệ thống khóa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: ● Đèn sáng khi quá trình xác nhận giữa xe', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["● Đèn sáng khi quá trình xác nhận giữa xe", "và thiết bị điều khiển FOB được hoàn", "tất, sau đó có thể vận hành khóa điện.", "● Đèn tắt khi vặn khóa điện sang vị trí  (On)."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 29)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHINBOHTHNGK_29', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 29', 'Khi đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: nhấp nháy: (1 0 2 )T.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["nhấp nháy: (1 0 2 )T.", "● Đèn tắt khi tốc độ đạt khoảng 10 km/h", "Nếu đèn này sáng trong khi lái xe:", "● Đèn sáng khi vặn khóa điện sang vị"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 29)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOABSHTHNGC_29', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 29', 'Đèn báo ABS (Hệ thống chống bó', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: cứng phanh) FS150FA', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["cứng phanh) FS150FA"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 29)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_INCMNBOHTHNG_38', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 38', 'điện được mở, đèn báo hệ thống khóa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: THÔNG MINH và vòng tròn ổ khóa điện', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["THÔNG MINH và vòng tròn ổ khóa điện", "sẽ sáng. Lúc này, còi báo kêu 2 lần.", "u Có thể tắt âm thanh của còi báo.", "!c Vặn khóa điện sang vị trí  (On) trong khi"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 38)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_38', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 38', 'đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: u Nếu không vặn khóa điện sang vị trí', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["u Nếu không vặn khóa điện sang vị trí", "(On) trong vòng 20 giây sau khi nhấn"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 38)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHAINNBOHTHN_38', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 38', 'khóa điện, đèn báo hệ thống khóa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: THÔNG MINH và vòng tròn ổ khóa điện', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["THÔNG MINH và vòng tròn ổ khóa điện"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 38)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_STTNBORNHYMT_38', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 38', 'sẽ tắt, đèn báo rẽ nháy một lần, sau đó', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa điện sẽ bị khóa.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa điện sẽ bị khóa.", "Khi hệ thống khóa THÔNG MINH không", "hoạt động đúng cách (1 0 2 )", "Nếu ai đó cố mở khóa điện khi không có"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 38)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNG_38', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 38', 'Đèn báo hệ thống', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa THÔNG MINH', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa THÔNG MINH", "Thiết bị điều"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 38)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CMBORNGNBOHT_39', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 39', '!c Đảm bảo rằng đèn báo hệ thống khóa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: THÔNG MINH và vòng tròn ổ khóa điện đã', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["THÔNG MINH và vòng tròn ổ khóa điện đã"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 39)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TTNBORNHPNHY_39', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 39', 'tắt, đèn báo rẽ nhấp nháy và còi báo kêu', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: 1 lần. Tín hiệu này cho biết khóa điện đã', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["1 lần. Tín hiệu này cho biết khóa điện đã", "u Có thể tắt âm thanh của còi báo.", "Khi hệ thống khóa THÔNG MINH không", "hoạt động đúng cách (1 0 2 )"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 39)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_VNGMTGIYNBOR_42', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 42', 'vòng một giây, đèn báo rẽ sẽ nhấp nháy', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và còi báo kêu 1 lần. Sau 2,5 giây, còi báo', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và còi báo kêu 1 lần. Sau 2,5 giây, còi báo", "kêu thêm 1 lần nữa. Hệ thống báo động", "chống trộm được kích hoạt."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 42)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CNBONGNHPNHY_42', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 42', '!c Đèn báo động nhấp nháy trong khi hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống báo động chống trộm được kích', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống báo động chống trộm được kích", "Nút báo động/", "xác định vị trí xe"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 42)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBOHTHNGKHA_44', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 44', 'u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và vòng tròn ổ khóa điện sẽ nhấp nháy.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và vòng tròn ổ khóa điện sẽ nhấp nháy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 44)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_DNHNKHAINMTL_44', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 44', '!d Nhấn khóa điện một lần khi đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn ổ", "khóa điện đang nhấp nháy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 44)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UKHINKHAINNB_44', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 44', 'u Khi ấn khóa điện, đèn báo hệ thống', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa THÔNG MINH và vòng tròn ổ", "khóa điện sẽ tắt và còi báo sẽ kêu. Khi"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 44)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOVVNGTRNKH_44', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 44', 'đèn báo và vòng tròn ổ khóa điện sáng', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: trở lại, hãy thực hiện bước tiếp theo.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["trở lại, hãy thực hiện bước tiếp theo.", "u Khi ấn nút báo động/xác định vị trí xe,", "đèn LED trên thiết bị điều khiển FOB sẽ", "sáng. Đảm bảo đèn LED đã tắt trước"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 44)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_PHTNBOHTHNGK_45', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 45', 'phút, đèn báo hệ thống khóa THÔNG', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: MINH và vòng tròn ổ khóa điện sẽ nhấp', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["MINH và vòng tròn ổ khóa điện sẽ nhấp", "nháy 3 lần, sau đó còi báo kêu và chế", "độ này sẽ bị hủy. Quay lại bước !b và", "thực hiện lại quy trình."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 45)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_45', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 45', 'Đèn báo hệ thống khóa THÔNG MINH và', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: vòng tròn ổ khóa điện sẽ sáng khi đang cài', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["vòng tròn ổ khóa điện sẽ sáng khi đang cài", "!g Ấn và giữ khóa điện trong hơn 2 giây. Mức", "độ nhạy được cài đặt.", "u Đèn bá o h ệ thống khóa THÔNG MINH"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 45)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TRXETRONGVNG_45', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 45', 'trí xe trong vòng 10 giây, đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn", "ổ khóa điện sẽ nhấp nháy 3 lần, sau đó", "còi báo sẽ kêu và mức độ nhạy được", "# Nếu hệ thống báo động chống trộm"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 45)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_THBNHIN76TRN_45', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 45', 'thì bình điện ((7 6 ) ) trên xe đã hết điện', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: hoặc hệ thống gặp sự cố. Hãy tháo bình', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["hoặc hệ thống gặp sự cố. Hãy tháo bình", "điện và liên hệ với cửa hàng Honda ủy", "● Còi báo động không kêu.", "● Còi báo động kêu nhưng nhỏ dần."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 45)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBOHTHNGKHA_47', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 47', 'u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và vòng tròn ổ khóa điện sẽ nhấp nháy.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và vòng tròn ổ khóa điện sẽ nhấp nháy.", "Nút báo động/", "xác định vị trí xe", "Vòng tròn ổ khóa điện"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 47)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_DNHNKHAINMTL_48', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 48', '!d Nhấn khóa điện một lần khi đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn ổ", "khóa điện đang nhấp nháy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 48)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBOHTHNGKHA_48', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 48', 'u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và vòng tròn ổ khóa điện sẽ sáng và còi', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và vòng tròn ổ khóa điện sẽ sáng và còi", "báo sẽ kêu.", "!e Lặp lại thao tác sau 3 lần:", "Ấn nút báo động/xác định vị trí xe trên thiết"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 48)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UKHINKHAINNB_48', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 48', 'u Khi ấn khóa điện, đèn báo hệ thống', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa THÔNG MINH và vòng tròn ổ", "khóa điện sẽ tắt và còi báo sẽ kêu. Khi"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 48)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOVVNGTRNKH_48', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 48', 'đèn báo và vòng tròn ổ khóa điện sáng', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: trở lại, hãy thực hiện bước tiếp theo.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["trở lại, hãy thực hiện bước tiếp theo.", "u Khi ấn nút báo động/xác định vị trí xe,", "đèn LED trên thiết bị điều khiển FOB sẽ", "sáng. Đảm bảo đèn LED đã tắt trước"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 48)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TNBOHTHNGKHA_48', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 48', 'út, đèn báo hệ thống khóa THÔNG', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: MINH và vòng tròn ổ khóa điện sẽ nhấp', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["MINH và vòng tròn ổ khóa điện sẽ nhấp", "nháy 3 lần, sau đó còi báo kêu và chế", "độ này sẽ bị hủy. Quay lại bước !b và", "thực hiện lại quy trình."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 48)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBOHTHNGKHA_49', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 49', 'u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và vòng tròn ổ khóa điện sẽ tắt và còi', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và vòng tròn ổ khóa điện sẽ tắt và còi", "báo kêu 1 lần.", "u Nếu không ấn nút báo động/xác định vị"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 49)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TRXETRONGVNG_49', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 49', 'trí xe trong vòng 10 giây, đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn", "ổ khóa điện sẽ nhấp nháy 3 lần, sau đó", "còi báo sẽ kêu và mức âm lượng còi", "báo được cài đặt."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 49)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_DNHNKHAINMTL_50', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 50', '!d Nhấn khóa điện một lần khi đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn ổ", "khóa điện đang nhấp nháy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 50)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBOHTHNGKHA_50', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 50', 'u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và vòng tròn ổ khóa điện sẽ sáng và còi', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và vòng tròn ổ khóa điện sẽ sáng và còi", "báo sẽ kêu.", "!e Lặp lại thao tác sau 3 lần:", "Ấn nút báo động/xác định vị trí xe trên thiết"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 50)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UKHINKHAINNB_50', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 50', 'u Khi ấn khóa điện, đèn báo hệ thống', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa THÔNG MINH và vòng tròn ổ", "khóa điện sẽ tắt và còi báo sẽ kêu. Khi"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 50)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOVVNGTRNKH_50', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 50', 'đèn báo và vòng tròn ổ khóa điện sáng', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: trở lại, hãy thực hiện bước tiếp theo.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["trở lại, hãy thực hiện bước tiếp theo.", "u Khi ấn nút báo động/xác định vị trí xe,", "đèn LED trên thiết bị điều khiển FOB sẽ", "sáng. Đảm bảo đèn LED đã tắt trước"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 50)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TNBOHTHNGKHA_50', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 50', 'út, đèn báo hệ thống khóa THÔNG', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: MINH và vòng tròn ổ khóa điện sẽ nhấp', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["MINH và vòng tròn ổ khóa điện sẽ nhấp", "nháy 3 lần, sau đó còi báo kêu và chế", "độ này sẽ bị hủy. Quay lại bước !b và", "thực hiện lại quy trình."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 50)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_50', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 50', 'Đèn báo hệ thống khóa THÔNG MINH và', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: vòng tròn ổ khóa điện sẽ sáng khi đang cài', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["vòng tròn ổ khóa điện sẽ sáng khi đang cài"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 50)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBOHTHNGKHA_51', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 51', 'u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và vòng tròn ổ khóa điện sẽ tắt và còi', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và vòng tròn ổ khóa điện sẽ tắt và còi", "báo kêu 1 lần.", "u Nếu không ấn nút báo động/xác định vị"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 51)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TRXETRONGVNG_51', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 51', 'trí xe trong vòng 10 giây, đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn", "ổ khóa điện sẽ nhấp nháy 3 lần, sau đó", "còi báo sẽ kêu và kiểu âm thanh còi báo", "được cài đặt."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 51)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNGCKHNGKHI_52', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 52', '● Nếu động cơ không khởi động trong vòng 5 giây, vặn', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa điện sang vị trí  (Off) và đợi 10 giây rồi mới khởi', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa điện sang vị trí  (Off) và đợi 10 giây rồi mới khởi", "động lại động cơ để phục hồi điện áp bình điện.", "● Để xe nổ cầm chừng quá lâu hoặc vặn ga liên tục có thể", "làm hỏng động cơ và hệ thống xả."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 52)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_BCHUYNSVVTRS_53', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 53', '!b Chuyển số về vị trí số N (đèn báo  sáng).', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: !c Nhả tay ga hoàn toàn.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["!c Nhả tay ga hoàn toàn.", "Ấn công tắc khởi động.", "!d Nếu bạn không thể khởi động động cơ,", "hãy mở nhẹ tay ga (khoảng 3 mm , không"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 53)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNGCKHNGKHI_53', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 53', 'Nếu động cơ không khởi động:', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: a Mở hết tay ga và ấn công tắc khởi động', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["a Mở hết tay ga và ấn công tắc khởi động", "khoảng 5 giây.", "b Lặp lại quy trình khởi động như bình", "c Mở ga nhẹ nhàng nếu tốc độ cầm chừng"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 53)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_DNUNGCKHNGKH_53', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 53', 'd Nếu động cơ không khởi động, đợi 10', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: giây, rồi thực hiện lại các bước a & b.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["giây, rồi thực hiện lại các bước a & b."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 53)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NVCIKIMTRANN_67', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 67', '● Đèn và còi – Kiểm tra đèn, đèn báo và còi', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: xem có hoạt động đúng chức năng không', 'FLAT_TIRE', 'Vá lốp xe máy lưu động (vá dùi hoặc vá nấm)', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["xem có hoạt động đúng chức năng không", "● Ly hợp/côn - Kiểm tra hoạt động của ly hợp/", "Điều chỉnh hành trình tự do nếu cần 2 T. 90", "● Bánh xe và lốp xe – Kiểm tra tình trạng, áp"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 67)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHNNGCHNGNMN_75', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 75', 'khả năng chống ăn mòn và quá nhiệt rất hiệu', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Nên kiểm tra và thay thế dung dịch làm mát', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Nên kiểm tra và thay thế dung dịch làm mát", "đúng theo lịch bảo dưỡng. 2 T. 60", "Bạn nên thực hiện việc bảo dưỡng thường", "xuyên hơn khi thường lái xe dưới trời mưa,"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 75)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNBOHTHNGKH_97', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 97', 'Nếu đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: nhấp nháy 5 lần khi vặn khóa điện sang vị', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["nhấp nháy 5 lần khi vặn khóa điện sang vị", "trí  (On), hoặc phạm vi hoạt động không ổn", "định, hãy thay thế pin càng sớm càng tốt.", "Chúng tôi khuyến cáo bạn nên mang đến"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 97)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_QUNHITNBOQUN_100', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 100', 'Quá nhiệt (Đèn báo quá nhiệt dung dịch', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: làm mát sáng).......................................... T. 98', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["làm mát sáng).......................................... T. 98", "Các đèn cảnh báo sáng hoặc nhấp nháy.. T. 99"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 100)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOLIHTHNGPG_100', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 100', 'Đèn báo lỗi hệ thống PGM-FI', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: (Phun xăng điện tử) (MIL) ...........................T. 99', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["(Phun xăng điện tử) (MIL) ...........................T. 99"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 100)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOABS_100', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 100', 'Đèn báo ABS', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: (Hệ thống chống bó cứng phanh) ............T. 99', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["(Hệ thống chống bó cứng phanh) ............T. 99"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 100)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_100', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 100', 'Đèn báo hệ thống khóa THÔNG MINH . T. 100', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Các đèn cảnh báo khác.......................... T. 101', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Các đèn cảnh báo khác.......................... T. 101", "Báo lỗi đồng hồ báo xăng........................... T. 101", "Khi hệ thống khóa THÔNG MINH Honda", "không hoạt động đúng cách ................T. 102"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 100)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NGCKHNGKHING_101', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 101', 'Động cơ không khởi động', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Mô tơ đề hoạt động nhưng', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Mô tơ đề hoạt động nhưng"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 101)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KIMTRAXEMNBO_101', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 101', '● Kiểm tra xem đèn báo lỗi phun xăng điện', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: tử PGM-FI (MIL) có sáng không.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["tử PGM-FI (MIL) có sáng không.", "uNếu đèn này sáng, hãy liên hệ với", "cửa hàng Honda ủy nhiệm càng sớm", "Mô tơ đề không hoạt động"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 101)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOQUNHITDUN_102', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 102', '● Đèn báo quá nhiệt dung dịch làm mát', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: ● Tăng tốc chậm.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["● Tăng tốc chậm.", "Nếu hiện tượng này xảy ra, hãy đưa xe vào", "lề đường và thực hiện quy trình sau.", "Để xe nổ cầm chừng trong thời gian dài có"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 102)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_THLMCHONBOQU_102', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 102', 'thể làm cho đèn báo quá nhiệt dung dịch', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: làm mát sáng.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["làm mát sáng.", "1. Tắt máy bằng khóa điện, sau đó vặn", "khóa điện sang vị trí  (On).", "2. Hãy đảm bảo quạt két tản nhiệt đang"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 102)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CTHCSCKHNGKH_102', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 102', 'Có thể đã có sự cố. Không khởi động', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: động cơ. Hãy mang xe đến cửa hàng', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["động cơ. Hãy mang xe đến cửa hàng", "Honda ủy nhiệm.", "Để động cơ nguội với khóa điện ở vị trí", "3. Sau khi động cơ nguội, hãy kiểm tra ống"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 102)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHNGKHINGNGC_102', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 102', 'Không khởi động động cơ. Hãy mang xe', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: đến cửa hàng Honda ủy nhiệm.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["đến cửa hàng Honda ủy nhiệm.", "4. Kiểm tra mức dung dịch làm mát trong", "bình dự trữ. 2 T. 83", "u Đổ thêm dung dịch làm mát nếu cần."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 102)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NHINCNQUANST_102', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 102', 'nhiên cần quan sát kỹ đèn báo quá nhiệt', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: dung dịch làm mát.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["dung dịch làm mát."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 102)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TIPTCLIXEKHI_102', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 102', 'Tiếp tục lái xe khi động cơ bị quá nhiệt có thể gây hư hỏng', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: nghiêm trọng cho động cơ.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["nghiêm trọng cho động cơ.", "Nếu quạt không hoạt động:", "Nếu quạt hoạt động:", "Nếu có rò rỉ:"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 102)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOLIHTHNGPG_103', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 103', 'Đèn báo lỗi hệ thống PGM-FI', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: (Phun xăng điện tử) (MIL)', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["(Phun xăng điện tử) (MIL)", "Nếu đèn này sáng trong khi lái xe, có thể hệ", "thống PGM-FI bị trục trặc. Hãy giảm tốc độ", "và mang xe đến cửa hàng Honda ủy nhiệm"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 103)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOABSHTHNGC_103', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 103', 'Đèn báo ABS (Hệ thống chống', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: bó cứng phanh)', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["bó cứng phanh)"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 103)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNBOCMTTRON_103', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 103', 'Nếu đèn báo có một trong những tình trạng', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: sau, có thể hệ thống ABS bị trục trặc. Hãy', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["sau, có thể hệ thống ABS bị trục trặc. Hãy", "giảm tốc độ và mang xe đến cửa hàng", "Honda ủy nhiệm để kiểm tra càng sớm"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 103)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOSNGHOCBTU_103', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 103', '● Đèn báo sáng hoặc bắt đầu nhấp nháy', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khi đang lái xe.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khi đang lái xe."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 103)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNBOABSVNSN_103', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 103', 'Nếu đèn báo ABS vẫn sáng, phanh sẽ tiếp', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: tục hoạt động như một hệ thống thông', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["tục hoạt động như một hệ thống thông", "thường nhưng không có tính năng chống", "bó cứng phanh."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 103)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOABSCTHNHP_103', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 103', 'Đèn báo ABS có thể nhấp nháy nếu bạn', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: quay bánh sau khi bánh sau được nâng lên', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["quay bánh sau khi bánh sau được nâng lên", "khỏi mặt đất. Trong trường hợp này, vặn", "khóa điện sang vị trí  (Off), r ồi vặn lại về vị"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 103)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TRONNBOABSST_103', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 103', 'trí  (On). Đèn báo ABS sẽ tắt sau khi tốc độ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: 30 km/h (19 mph).', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["30 km/h (19 mph)."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 103)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CCNCNHBOSNGH_104', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 104', 'Các đèn cảnh báo sáng hoặc nhấp nháy u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: 100 Tìm kiếm hư hỏng', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["100 Tìm kiếm hư hỏng"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHINBOHTHNGK_104', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 104', '# Khi đèn báo hệ thống khóa THÔNG', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: MINH nhấp nháy 5 lầ n', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["MINH nhấp nháy 5 lầ n", "Thay pin thiết bị điều khiển FOB 2 T. 93"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_104', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 104', 'Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: nhấp nháy khi kết nối giữa xe và thiết bị', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["nhấp nháy khi kết nối giữa xe và thiết bị", "điều khiển FOB bị dừng sau khi vặn khóa", "điện sang vị trí  (On).", "Hiện tượng này có thể xảy ra bởi những"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_HOCLOCKTRONG_104', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 104', 'hoặc  (Lock) trong khi đèn báo hệ thống', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa THÔNG MINH đang nhấp nháy, vòng', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa THÔNG MINH đang nhấp nháy, vòng"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TRNKHAINVNBO_104', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 104', 'tròn ổ khóa điện và đèn báo hệ thống khóa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: THÔNG MINH sẽ nhấp nháy nhanh hơn và', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["THÔNG MINH sẽ nhấp nháy nhanh hơn và", "còi báo sẽ kêu trong khoảng 20 giây rồi tự", "động tắt, và sau đó khóa điện được  khóa"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBORNHPNHYK_104', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 104', 'u Đèn báo rẽ nhấp nháy khi bắt đầu và kết', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thúc chức năng này.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thúc chức năng này.", "Để dừng quá trình nhấp nháy, hãy nhấn và", "giữ khóa điện trong hơn 2 giây. Sau khi đã", "dừng nhấp nháy, khóa điện được khóa lại."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUHTHNGNHINL_105', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 105', 'Nếu hệ thống nhiên liệu bị lỗi, các đèn báo', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: xăng sẽ hiển thị trên màn hình như hình', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["xăng sẽ hiển thị trên màn hình như hình", "Nếu hiện tượng này xảy ra, hãy mang đến", "cửa hàng Honda ủy nhiệm càng sớm càng"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 105)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UVNGTRNKHAIN_110', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 110', 'u Vòng tròn ổ khóa điện và đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH sẽ nhấp', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH sẽ nhấp", "3. Ấn khóa điện trong khi vòng tròn ổ khóa"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 110)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_INVNBOHTHNGK_110', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 110', 'điện và đèn báo hệ thống khóa THÔNG', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: MINH đang nhấp nháy.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["MINH đang nhấp nháy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 110)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TRNKHAINVNBO_112', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 112', 'tròn ổ khóa điện và đèn báo hệ thống khóa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: THÔNG MINH sẽ nhấp nháy khoảng 1 giây', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["THÔNG MINH sẽ nhấp nháy khoảng 1 giây", "và sau đó tắt.", "Không mở được khóa điện.", "Hãy thực hiện lại quy trình “Mở khóa điện"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 112)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_THNGLP_113', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 113', 'Thủng lốp', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Vá lốp bị thủng hoặc tháo bánh xe đòi hỏi', 'FLAT_TIRE', 'Vá lốp xe máy lưu động (vá dùi hoặc vá nấm)', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Vá lốp bị thủng hoặc tháo bánh xe đòi hỏi", "phải có dụng cụ đặc biệt và tay nghề về kỹ", "thuật. Chúng tôi khuyến cáo bạn hãy để", "cửa hàng Honda ủy nhiệm thực hiện công"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 113)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CHOTVCTHGYQU_114', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 114', 'cho ô tô vì có thể gây quá nhiệt bình điện và', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: làm hỏng bình điện. Nếu bình điện không', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["làm hỏng bình điện. Nếu bình điện không", "phục hồi sau khi sạc, hãy liên hệ với cửa", "hàng Honda ủy nhiệm.", "Cháy bóng đèn"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 114)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CCNBO24_135', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 135', 'Các đèn báo............................................... 24', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Các đèn cảnh báo sáng hoặc nhấp nháy... 99', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Các đèn cảnh báo sáng hoặc nhấp nháy... 99", "Cải tạo xe................................................... 13", "Cảnh báo khi lái xe....................................... 9", "Cảnh báo về an toàn .................................... 8"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 135)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOABS_135', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 135', 'Đèn báo ABS', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: (Hệ thống chống bó cứng phanh)............. 25', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["(Hệ thống chống bó cứng phanh)............. 25"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 135)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_135', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 135', 'Đèn báo hệ thống khóa THÔNG MINH...... 25', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Đè n báo l ỗi hệ thống PGM-FI', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Đè n báo l ỗi hệ thống PGM-FI", "(Phun xăng điện tử) (MIL)................... 24, 99"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 135)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOVTRS19_135', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 135', 'Đèn báo vị trí số ......................................... 19', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Đổ xăng ...................................................... 51', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Đổ xăng ...................................................... 51"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 135)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_QUNHIT98_136', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 136', 'Quá nhiệt................................................. 98', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Số máy.................................................. 125', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Số máy.................................................. 125", "Động cơ bị ngộp xăng ................................ 48", "Đồng hồ báo giờ......................................... 19", "Đồng hồ báo xăng ...................................... 19"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 136)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_THNGLP109_136', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 136', 'Thủng lốp...............................................109', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Áp suất lốp...............................................72', 'FLAT_TIRE', 'Vá lốp xe máy lưu động (vá dùi hoặc vá nấm)', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Áp suất lốp...............................................72", "Hành trình tự do ......................................91", "Móc giữ mũ bảo hiểm .................................56", "Môi trường ................................................124"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 136)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_QUNHIT98_137', 'MOTORBIKE', 'Sổ tay (TAYCON) - Trang 137', 'Quá nhiệt.................................................... 98', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Rửa xe ..................................................... 119', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Rửa xe ..................................................... 119", "Sang số...................................................... 50", "Số khung, số máy .................................... 125", "Tay ga ........................................................ 92"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 137)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_THGYQUNHITHT_15', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 15', 'thể gây quá nhiệt hệ thống phanh, làm', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: giảm hiệu quả của phanh.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["giảm hiệu quả của phanh.", "● Để phanh đạt hiệu quả tối ưu, hãy sử dụng", "đồng thời cả phanh trước và phanh sau.", "# Hệ thống chống bó cứng phanh (ABS) trên"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 15)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CCNBO_30', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 30', 'Các đèn báo', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Nếu đèn này sáng trong khi lái xe: (R102)', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Nếu đèn này sáng trong khi lái xe: (R102)"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 30)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUCMTNBONOKH_30', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 30', 'Nếu có một đèn báo nào không hiển thị đúng chức năng, hãy mang xe đến Cửa hàng', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Honda ủy nhiệm để kiểm tra.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Honda ủy nhiệm để kiểm tra.", "Hệ thống ngắt động cơ", "tạm thời: (R52)", "Sáng trong giây lát khi vặn núm"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 30)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOCHCHIUXA_30', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 30', 'Đèn báo chế độ chiếu xa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Sáng khi vặn núm khóa điện sang vị trí  (On).', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Sáng khi vặn núm khóa điện sang vị trí  (On).", "Tắt khi xe đạt tốc độ khoảng 10 km/h (6 mph).", "Nếu đèn này sáng trong khi lái xe: (R103)"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 30)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBORPHI_31', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 31', 'Đèn báo rẽ phải', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Sáng khi hoàn tất xác nhận giữa xe và thiết bị điều khiển', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Sáng khi hoàn tất xác nhận giữa xe và thiết bị điều khiển", "FOB, khi đó có thể vận hành khóa điện. Tắt khi vặn núm", "khóa điện sang vị trí  (On) ."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 31)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHINBOHTHNGK_31', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 31', 'Khi đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: nhấp nháy: (R104)', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["nhấp nháy: (R104)"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 31)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_31', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 31', 'Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Nếu đèn sáng khi động cơ đang', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Nếu đèn sáng khi động cơ đang", "hoạt động: (R103)", "Sáng trong giây lát khi vặn núm khóa điện", "sang vị trí  (On)."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 31)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBONG_31', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 31', 'Đèn báo động', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Hệ thống báo động', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Hệ thống báo động", "chống trộm: (R40)"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 31)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_INCMNBOHTHNG_40', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 40', 'điện được mở, đèn báo hệ thống khóa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: THÔNG MINH và vòng tròn ổ khóa điện', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["THÔNG MINH và vòng tròn ổ khóa điện", "sáng. Còi báo cũng kêu 2 lần tại thời", "u Có thể tắt âm thanh còi báo. (R38)", "!c Vặn núm khóa điện sang vị trí  (On) trong khi"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 40)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_40', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 40', 'đèn báo hệ thống khóa THÔNG MINH sáng.', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: u Nếu không vặn núm khóa điện sang vị trí', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["u Nếu không vặn núm khóa điện sang vị trí", "(On) trong vòng 20 giây sau khi nhấn núm"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 40)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHAINNBOHTHN_40', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 40', 'khóa điện, đèn báo hệ thống khóa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: THÔNG MINH và vòng tròn ổ khóa điện', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["THÔNG MINH và vòng tròn ổ khóa điện"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 40)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_STTNBORNHY1L_40', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 40', 'sẽ tắt, đèn báo rẽ nháy 1 lần và sau đó', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa điện sẽ bị khóa.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa điện sẽ bị khóa.", "Khi hệ thống khóa THÔNG MINH không", "hoạt động đúng cách (R110)", "Nếu ai đó cố mở khóa điện khi không có"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 40)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CMBONBOHTHNG_41', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 41', 'c Đảm bảo đèn báo hệ thống khóa THÔNG', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: MINH và vòng tròn ổ khóa điện đã tắt và', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["MINH và vòng tròn ổ khóa điện đã tắt và"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 41)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBORNHPNHYMT_41', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 41', 'đèn báo rẽ nhấp nháy một lần. Tín hiệu', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: này cho biết khóa điện đã được khóa.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["này cho biết khóa điện đã được khóa.", "Còi báo cũng kêu 1 lần tại thời điểm này.", "u Có thể tắt âm thanh còi báo. (R38)", "Khi hệ thống khóa THÔNG MINH không"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 41)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_VNGMTGIYNBOR_44', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 44', 'vòng một giây, đèn báo rẽ nhấp nháy và', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: còi báo kêu 1 lần. Sau 2,5 giây, còi báo', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["còi báo kêu 1 lần. Sau 2,5 giây, còi báo", "kêu một lần. Hệ thống báo động chống", "trộm được kích hoạt."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 44)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBONGSNHPNHY_44', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 44', 'Đèn báo động sẽ nhấp nháy trong suốt', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thời gian hệ thống báo động được kích', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thời gian hệ thống báo động được kích", "Nút báo động/"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 44)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBOHTHNGKHA_46', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 46', 'u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và vòng tròn ổ khóa điện nhấp nháy.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và vòng tròn ổ khóa điện nhấp nháy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 46)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_DNNMKHAIN1LN_46', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 46', '!d Ấn núm khóa điện 1 lần khi đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn ổ", "khóa điện đang nhấp nháy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 46)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UKHINNMKHAIN_47', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 47', 'u Khi ấn núm khóa điện, đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn", "ổ khóa điện sẽ tắt và còi báo kêu. Khi"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 47)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_47', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 47', 'đèn báo hệ thống khóa thông minh và', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: vòng tròn ổ khóa điện sáng lại, thực', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["vòng tròn ổ khóa điện sáng lại, thực", "hiện bước tiếp theo.", "u Khi ấn nút báo động/xác định vị trí xe,", "đèn LED trên thiết bị điều khiển FOB sẽ"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 47)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TRXETRONG10G_47', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 47', 'trí xe trong 10 giây, đèn báo hệ thống', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa THÔNG MINH và vòng tròn ổ", "khóa điện nhấp nháy 3 lần, sau đó còi", "báo kêu và mức độ nhạy được thiết lập."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 47)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_DNNMKHAIN1LN_51', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 51', '!d Ấn núm khóa điện 1 lần khi đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn ổ", "khóa điện đang nhấp nháy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 51)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UKHINNMKHAIN_51', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 51', 'u Khi ấn núm khóa điện, đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn", "ổ khóa điện sẽ tắt và còi báo kêu. Khi"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 51)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_51', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 51', 'đèn báo hệ thống khóa thông minh và', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: vòng tròn ổ khóa điện sáng lại, thực', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["vòng tròn ổ khóa điện sáng lại, thực", "hiện bước tiếp theo.", "u Khi ấn nút báo động/xác định vị trí xe,", "đèn LED trên thiết bị điều khiển FOB sẽ"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 51)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_MTTRONG3MCML_51', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 51', 'một trong 3 mức âm lượng. Đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn ổ", "khóa điện sẽ sáng trong khi đang cài đặt."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 51)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBOHTHNGKHA_52', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 52', 'u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và vòng tròn ổ khóa điện tắt và còi báo', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và vòng tròn ổ khóa điện tắt và còi báo", "kêu một lần.", "u Khi không ấn nút báo động/xác định vị"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 52)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TRXETRONG10G_52', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 52', 'trí xe trong 10 giây, đèn báo hệ thống', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa THÔNG MINH và vòng tròn ổ", "khóa điện nhấp nháy 3 lần, sau đó còi", "báo kêu và mức âm lượng được thiết", "# Thay đổi kiểu âm còi báo xác định vị trí xe"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 52)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_DNNMKHAIN1LN_53', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 53', '!d Ấn núm khóa điện 1 lần khi đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn ổ", "khóa điện đang nhấp nháy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 53)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBOHTHNGKHA_53', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 53', 'u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và vòng tròn ổ khóa điện sáng và còi', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và vòng tròn ổ khóa điện sáng và còi", "!e Lặp lại bước sau đây 3 lần:", "Ấn nút báo động/xác định vị trí xe trên thiết", "bị điều khiển FOB 3 lần và núm khóa điện"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 53)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UKHINNMKHAIN_53', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 53', 'u Khi ấn núm khóa điện, đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn", "ổ khóa điện sẽ tắt và còi báo kêu. Khi"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 53)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_53', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 53', 'đèn báo hệ thống khóa thông minh và', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: vòng tròn ổ khóa điện sáng lại, thực', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["vòng tròn ổ khóa điện sáng lại, thực", "hiện bước tiếp theo.", "u Khi ấn nút báo động/xác định vị trí xe,", "đèn LED trên thiết bị điều khiển FOB sẽ"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 53)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_MTTRONG3KIUM_53', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 53', 'một trong 3 kiểu âm còi báo. Đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH và vòng tròn ổ", "khóa điện sẽ sáng trong khi đang cài đặt."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 53)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNBOHTHNGKHA_54', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 54', 'u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: và vòng tròn ổ khóa điện tắt và còi báo', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["và vòng tròn ổ khóa điện tắt và còi báo", "kêu một lần.", "u Khi không ấn nút báo động/xác định vị"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 54)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TRXETRONG10G_54', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 54', 'trí xe trong 10 giây, đèn báo hệ thống', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: khóa THÔNG MINH và vòng tròn ổ', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["khóa THÔNG MINH và vòng tròn ổ", "khóa điện nhấp nháy 3 lần, sau đó còi", "báo kêu và kiểu âm thanh được thiết", "# Chế độ im lặng tạm thời"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 54)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NGCNGNGHOTNG_57', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 57', 'Động cơ ngừng hoạt động và đèn báo ngắt', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: động cơ tạm thời chuyển từ sáng sang', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["động cơ tạm thời chuyển từ sáng sang", "nhấp nháy sau khi đóng tay ga hoàn toàn", "và xe dừng lại.", "u Khi động cơ dừng bởi hệ thống ngắt động"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 57)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_SBHYNGCSKHNG_57', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 57', 'sẽ bị hủy. Động cơ sẽ không khởi động lại', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: được ngay cả khi đã vặn tay ga.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["được ngay cả khi đã vặn tay ga.", "Cảnh báo an toàn đối với hệ thống ngắt", "động cơ tạm thời"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 57)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHNGRIKHIXEK_57', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 57', 'Không rời khỏi xe khi đèn báo ngắt động cơ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: tạm thời đang nhấp nháy. Khi rời khỏi xe,', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["tạm thời đang nhấp nháy. Khi rời khỏi xe,", "luôn nhớ vặn núm khóa điện sang vị trí", "u Động cơ có thể khởi động đột ngột nếu vặn", "# Không thể dừng động cơ bằng hệ"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 57)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBONGTNGCTMT_57', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 57', 'Đèn báo ngắt động cơ tạm thời', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Động cơ dừng quá lâu bằng hệ thống ngắt', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Động cơ dừng quá lâu bằng hệ thống ngắt", "động cơ tạm thời có thể gây tiêu hao điện áp"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 57)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KIMTRANBONGT_58', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 58', 'Kiểm tra đèn báo ngắt động cơ tạm thời có', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: nhấp nháy không, sau đó vặn ga.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["nhấp nháy không, sau đó vặn ga."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 58)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UNUNBOKHNGNH_58', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 58', 'u Nếu đèn báo không nháy, không thể khởi', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: động lại động cơ bằng hệ thống ngắt động', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["động lại động cơ bằng hệ thống ngắt động", "cơ tạm thời ngay cả khi vặn tay ga.", "u Khi động cơ dừng lại bằng hệ thống ngắt", "động cơ tạm thời, nếu gạt chân chống"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 58)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NGHINGXUNGNB_58', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 58', 'nghiêng xuống, đèn báo ngắt động cơ tạm', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thời đang nháy sẽ tắt hoặc ngừng nháy và', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thời đang nháy sẽ tắt hoặc ngừng nháy và", "chuyển sang chế độ sáng liên tục, khi đó", "không thể khởi động được động cơ ngay", "cả khi đã vặn tay ga."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 58)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NGCKHNGKHING_58', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 58', '# Động cơ không khởi động ngay cả khi', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: vặn tay ga: (R109)', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["vặn tay ga: (R109)", "Hãy liên hệ với cửa hàng Honda ủy nhiệm", "để kiểm tra bình điện theo đúng lịch bảo", "# Lịch Bảo Dưỡng: (R70)"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 58)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNGCKHNGKHI_59', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 59', '● Nếu động cơ không khởi động trong vòng 5', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: giây, hãy vặn núm khóa điện sang vị trí', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["giây, hãy vặn núm khóa điện sang vị trí", "(Off) và đợi 10 giây trước khi khởi động lại", "động cơ để phục hồi điện áp bình điện.", "●Đ ể xe nổ cầm chừng quá lâu hoặc vặn ga liên"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 59)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNGCKHNGKHI_61', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 61', 'Nếu động cơ không khởi động:', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: a Dựng xe bằng chân chống đứng và cài', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["a Dựng xe bằng chân chống đứng và cài", "khóa phanh sau.", "b Vặn hết ga và ấn nút đề khoảng 5 giây.", "c Lặp lại quy trình khởi động như bình"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 61)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_ENUNGCKHNGKH_61', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 61', 'e Nếu động cơ không khởi động, đợi 10 giây', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: trước khi thử lại các bước b & c.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["trước khi thử lại các bước b & c."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 61)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NVCIKIMTRANN_77', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 77', '● Đèn và còi - Kiểm tra đèn, đèn báo và còi', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: xem có hoạt động đúng chức năng không.', 'FLAT_TIRE', 'Vá lốp xe máy lưu động (vá dùi hoặc vá nấm)', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["xem có hoạt động đúng chức năng không.", "● Hệ thống tắt máy bằng chân chống nghiêng", "- Kiểm tra xem có hoạt động đúng chức", "năng không 2 T. 96"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 77)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_MNVQUNHIT_82', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 82', 'mòn và quá nhiệt.', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Nên thực hiện kiểm tra và thay thế dung dịch', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Nên thực hiện kiểm tra và thay thế dung dịch", "làm mát theo đúng Lịch Bảo Dưỡng. 2 T. 70", "Dầu phanh có thể phá hủy các bề mặt sơn và", "Lau sạch chỗ dầu phanh tràn ngay lập tức và"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 82)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNBOHTHNGKH_102', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 102', 'Nếu đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: nhấp nháy 5 lần khi vặn núm khóa điện', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["nhấp nháy 5 lần khi vặn núm khóa điện", "sang vị trí  (On), ho ặc phạm vi hoạt động", "không ổn định, hãy thay thế pin ngay khi có", "Hãy mang xe đến Cửa hàng Honda ủy"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 102)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_QUNHITNGCNBO_104', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 104', 'Quá nhiệt động cơ (Đèn báo quá nhiệt dung', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: dịch làm mát sáng) ............................... T. 102', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["dịch làm mát sáng) ............................... T. 102", "Các đèn cảnh báo sáng hoặc nhấp nháy. T. 103"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOLIPGMFIPH_104', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 104', 'Đèn báo lỗi PGM-FI (Phun xăng điện tử) (MIL)', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: .............................................................T. 103', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '[".............................................................T. 103"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOABSHTHNGC_104', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 104', 'Đèn báo ABS (Hệ thống chống bó cứng', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: phanh) ................................................. T. 103', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["phanh) ................................................. T. 103"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBONGTNGCTMT_104', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 104', 'Đèn báo ngắt động cơ tạm thời không sáng...', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: .............................................................T. 107', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '[".............................................................T. 107", "Không thể dừng động cơ bằng hệ thống ngắt"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NGCTMTHITRON_104', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 104', 'động cơ tạm thời trong khi đèn báo ngắt động', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: cơ tạm thời sáng ................................. T. 108', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["cơ tạm thời sáng ................................. T. 108"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NGCKHNGKHING_104', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 104', 'Động cơ không khởi động ngay cả khi vặn tay', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: ga.........................................................T. 109', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["ga.........................................................T. 109", "Khi hệ thống khóa THÔNG MINH không hoạt", "động đúng cách.....................................T. 110", "Mở yên xe trong trường hợp khẩn cấp.T. 112"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_THNGLPT117_104', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 104', 'Thủng lốp.................................................T. 117', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Trục trặc về điện .....................................T. 118', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Trục trặc về điện .....................................T. 118", "Bình điện hỏng ......................................T. 118", "Cháy bóng đèn ......................................T. 118", "Cháy cầu chì..........................................T. 122"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 104)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NGCKHNGKHING_105', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 105', 'Động cơ không khởi động', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Mô tơ đề hoạt động nhưng', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Mô tơ đề hoạt động nhưng"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 105)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KIMTRAXEMNBO_105', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 105', '● Kiểm tra xem đèn báo lỗi phun xăng điện', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: tử PGM-FI (MIL) có sáng không.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["tử PGM-FI (MIL) có sáng không.", "uNếu đèn này sáng, hãy liên hệ với", "Cửa hàng Honda ủy nhiệm càng sớm", "Mô tơ đề không hoạt động"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 105)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOQUNHITDUN_106', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 106', '● Đèn báo quá nhiệt dung dịch làm mát', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: ● Tăng tốc chậm.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["● Tăng tốc chậm.", "Nếu có hiện tượng trên, hãy đưa xe vào lề", "đường và thực hiện quy trình sau.", "Để động cơ nổ cầm chừng quá lâu có thể"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 106)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_LMCHONBOQUNH_106', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 106', 'làm cho đèn báo quá nhiệt dung dịch làm', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: 1. Tắt động cơ bằng khóa điện.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["1. Tắt động cơ bằng khóa điện.", "2. Để động cơ nguội với núm khóa điện ở", "vị trí  (Off).", "3. Sau khi động cơ nguội, hãy kiểm tra két"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 106)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHNGKHINGNGC_106', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 106', 'Không khởi động động cơ. Hãy mang xe', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: đến Cửa hàng Honda ủy nhiệm.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["đến Cửa hàng Honda ủy nhiệm.", "4. Kiểm tra mức dung dịch làm mát trong", "bình dự trữ. 2 T. 88", "uBổ sung thêm dung dịch làm mát nếu"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 106)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_PHILUNTHEODI_106', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 106', 'phải luôn theo dõi đèn báo quá nhiệt', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: dung dịch làm mát.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["dung dịch làm mát."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 106)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TIPTCLIXEKHI_106', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 106', 'Tiếp tục lái xe khi động cơ bị quá nhiệt có thể', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: gây hư hỏng nghiêm trọng cho động cơ.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["gây hư hỏng nghiêm trọng cho động cơ.", "Nếu có rò rỉ:"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 106)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOLIPGMFIPH_107', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 107', 'Đèn báo lỗi PGM-FI (Phun xăng', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: điện tử) (MIL)', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["điện tử) (MIL)", "Nếu đèn này sáng khi đang lái xe, có thể hệ", "thống PGM-FI bị trục trặc nghiêm trọng.", "Hãy giảm tốc độ và mang xe đến Cửa hàng"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 107)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOABSHTHNGC_107', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 107', 'Đèn báo ABS (Hệ thống chống', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: bó cứng phanh)', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["bó cứng phanh)"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 107)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNBOCDUHIUS_107', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 107', 'Nếu đèn báo có dấu hiệu sau đây, có thể', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: ABS bị trục trặc nghiêm trọng. Hãy giảm tốc', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["ABS bị trục trặc nghiêm trọng. Hãy giảm tốc", "độ và mang xe đến Cửa hàng Honda ủy", "nhiệm để kiểm tra càng sớm càng tốt."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 107)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOKHNGSNGKH_107', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 107', '● Đèn báo không sáng khi núm khóa điện', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: được vặn sang vị trí  (On).', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["được vặn sang vị trí  (On)."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 107)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOKHNGTTKHI_107', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 107', '● Đèn báo không tắt khi xe đạt tốc độ trên', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: 10 km/giờ (6 mph).', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["10 km/giờ (6 mph)."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 107)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CCNCNHBOSNGH_108', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 108', 'Các đèn cảnh báo sáng hoặc nhấp nháy u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: 104 Tìm kiếm hư hỏng', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["104 Tìm kiếm hư hỏng"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 108)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNBOABSSNGP_108', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 108', 'Nếu đèn báo ABS sáng, phanh sẽ vẫn hoạt', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: động bình thường nhưng không có chức', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["động bình thường nhưng không có chức", "năng chống bó cứng phanh."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 108)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOABSCTHNHP_108', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 108', 'Đèn báo ABS có thể nhấp nháy nếu bạn', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: quay bánh sau khi nâng xe lên khỏi mặt đất.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["quay bánh sau khi nâng xe lên khỏi mặt đất.", "Trong trường hợp này, vặn núm khóa điện", "sang vị trí  (Off), và sau đó sang vị trí"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 108)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_ONNBOABSSTTS_108', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 108', '(On). Đèn báo ABS sẽ tắt sau khi đạt tốc độ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: 30 km/giờ (19 mph).', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["30 km/giờ (19 mph)."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 108)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHINBOHTHNGK_108', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 108', '# Khi đèn báo h ệ thống khóa THÔNG', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: MINH nháy 5 l ần', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["MINH nháy 5 l ần", "Thay pin thiết bị điều khiển FOB 2 T. 98"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 108)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_108', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 108', 'Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: nháy khi kết nối giữa xe và thiết bị điều', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["nháy khi kết nối giữa xe và thiết bị điều", "khiển FOB bị dừng sau khi vặn núm khóa", "điện sang vị trí  (On).", "Có thể là do nguyên nhân sau:"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 108)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CCNCNHBOSNGH_109', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 109', 'Các đèn cảnh báo sáng hoặc nhấp nháy u Đèn báo hệ thống khóa THÔNG MINH', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Tìm kiếm hư hỏng', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Tìm kiếm hư hỏng", "Tuy nhiên, các nguyên nhân này sẽ không", "ảnh hưởng đến hoạt động của xe cho đến", "khi khóa điện khóa lại."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 109)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_RVNBOHTHNGKH_109', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 109', 'rẽ, và đèn báo hệ thống khóa THÔNG', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: MINH sẽ sáng, còi báo kêu khoảng 20 giây', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["MINH sẽ sáng, còi báo kêu khoảng 20 giây", "sau đó tự động tắt, khóa điện sẽ được", "Còi báo cũng kêu tại thời điểm này.", "Ngoài ra, để tắt đèn nháy, hãy ấn và giữ"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 109)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHINBONGTNGC_111', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 111', 'Khi đèn báo ngắt động cơ tạm thời không', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: sáng, thao tác như sau.', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["sáng, thao tác như sau.", "Ấn công tắc ngắt động cơ tạm thời sang vị", "trí  (Idling Stop).", "Làm ấm động cơ."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 111)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHINBOLIPHUN_111', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 111', 'Khi đèn báo lỗi phun xăng điện tử PGM-FI', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: (MIL) sáng, hệ thống ngắt động cơ tạm thời', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["(MIL) sáng, hệ thống ngắt động cơ tạm thời", "không hoạt động để bảo vệ động cơ. Hãy", "liên hệ với Cửa hàng Honda ủy nhiệm.", "Chạy xe một lúc, sau đó tắt máy và khởi"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 111)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNBOLIPGMFI_111', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 111', 'Nếu đèn báo lỗi PGM-FI (MIL) sáng:', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Nếu điện áp bình điện yếu:', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Nếu điện áp bình điện yếu:"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 111)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHIHTHNGNGTN_113', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 113', 'Khi hệ thống ngắt động cơ tạm thời không hoạt động đúng cách u Động cơ không khởi động ngay cả khi vặn tay ga', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Tìm kiếm hư hỏng', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Tìm kiếm hư hỏng"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 113)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NGCKHNGKHING_113', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 113', 'Động cơ không khởi động', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: ngay cả khi vặn tay ga', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["ngay cả khi vặn tay ga"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 113)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NGHINGNBONGT_113', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 113', 'nghiêng, đèn báo ngắt động cơ tạm thời', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: đang nháy sẽ tắt hoặc ngừng nháy và sáng', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["đang nháy sẽ tắt hoặc ngừng nháy và sáng", "liên tục, sau đó hệ thống ngắt động cơ tạm", "thời sẽ bị hủy. Ấn nút đề để khởi động lại", "động cơ, tham khảo quy trình khởi động"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 113)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NUNBONGTNGCT_113', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 113', 'Nếu đèn báo ngắt động cơ tạm thời nhấp', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: nháy (công tắc ngắt động cơ tạm thời ở vị', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["nháy (công tắc ngắt động cơ tạm thời ở vị", "trí  (Idling Stop)), tuy nhiên động cơ"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 113)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_KHNGKHINGNGA_113', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 113', 'không khởi động ngay cả khi vặn ga, hãy', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thực hiện như sau.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thực hiện như sau.", "Kiểm tra bình điện và các cực bình điện.", "Nếu bình điện yếu, liên hệ với Cửa hàng", "Honda ủy nhiệm."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 113)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_UVNGTRNKHAIN_118', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 118', 'u Vòng tròn ổ khóa điện và đèn báo hệ', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: thống khóa THÔNG MINH nhấp nháy.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["thống khóa THÔNG MINH nhấp nháy.", "2. Kiểm tra mã ID trên thẻ ID.", "3. Ấn núm khóa điện khi vòng tròn ổ khóa"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 118)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_INVNBOHTHNGK_118', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 118', 'điện và đèn báo hệ thống khóa THÔNG', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: MINH nhấp nháy.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["MINH nhấp nháy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 118)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_TRNKHAINVNBO_120', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 120', 'tròn ổ khóa điện và đèn báo hệ thống khóa', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: THÔNG MINH sẽ nháy mỗi giây 1 lần và', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["THÔNG MINH sẽ nháy mỗi giây 1 lần và", "sau đó tắt.", "Khóa điện không mở.", "Thực hiện lại quy trình “Mở khóa điện trong"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 120)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOHTHNGKHAT_120', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 120', 'đèn báo hệ thống khóa THÔNG MINH tắt.', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Thực hiện lại quy trình “Mở khóa điện trong', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Thực hiện lại quy trình “Mở khóa điện trong", "trường hợp khẩn cấp”. 2 T. 114", "Nhập mã ID không thành công Hủy nhập mã ID"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 120)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_THNGLP_121', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 121', 'Thủng lốp', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Để vá lốp bị thủng hoặc tháo bánh xe, bạn', 'FLAT_TIRE', 'Vá lốp xe máy lưu động (vá dùi hoặc vá nấm)', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Để vá lốp bị thủng hoặc tháo bánh xe, bạn", "phải có dụng cụ đặc biệt và tay nghề về kỹ", "thuật. Chúng tôi khuyến cáo bạn nên để", "Cửa hàng Honda ủy nhiệm thực hiện công"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 121)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CHOTVCTHGYQU_122', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 122', 'cho ô tô vì có thể gây quá nhiệt bình điện và', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: làm hỏng bình điện. Nếu bình điện không', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["làm hỏng bình điện. Nếu bình điện không", "phục hồi sau khi sạc, hãy liên hệ với Cửa", "hàng Honda ủy nhiệm.", "Cháy bóng đèn"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 122)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBORPHATRC11_145', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 145', 'Đèn báo rẽ phía trước........................... 119', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Các công tắc............................................. 28', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Các công tắc............................................. 28"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 145)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_CCNBO26_145', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 145', 'Các đèn báo.............................................. 26', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Cải tạo xe .................................................. 15', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Cải tạo xe .................................................. 15", "Cảnh báo khi lái xe................................... 11", "Cầu chì ..............................................76, 122", "Chân chống nghiêng................................96"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 145)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOABSHTHNGC_145', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 145', 'Đèn báo ABS (Hệ thống chống bó cứng', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: phanh) ......................................................26', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["phanh) ......................................................26"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 145)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOLIPGMFIPH_146', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 146', 'Đèn báo lỗi PGM-FI (Phun xăng điện tử)', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: (MIL)..................................................27, 103', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["(MIL)..................................................27, 103"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 146)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_NBOTHAYDU22_146', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 146', 'Đèn báo THAY DẦU..................................22', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Đèn cảnh báo sáng.................................103', 'OTHER', 'Tư vấn và kiểm tra sự cố lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Đèn cảnh báo sáng.................................103", "Đèn hộp đựng đồ......................................67", "Điều chỉnh đồng hồ điện tử.....................25", "Đổ xăng .....................................................60"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 146)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_QUNHITNGC102_146', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 146', 'Quá nhiệt động cơ.................................102', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Số máy ..................................................135', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Số máy ..................................................135", "Đồng hồ báo giờ.......................................21", "Đồng hồ đo hành trình...........................128", "Đồng hồ đo quãng đường .....................128"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 146)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_THNGLP117_147', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 147', 'Thủng lốp .............................................. 117', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Móc giữ mũ bảo hiểm.............................. 64', 'FLAT_TIRE', 'Vá lốp xe máy lưu động (vá dùi hoặc vá nấm)', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Móc giữ mũ bảo hiểm.............................. 64", "Môi trường.............................................. 134", "Nhãn hình ảnh ............................................ 6", "Dung tích bình xăng ................................ 60"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 147)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_QUNHIT102_147', 'MOTORBIKE', 'Sổ tay (XEGA) - Trang 147', 'Quá nhiệt.................................................102', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: Rửa xe .....................................................129', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'NGUY_HIEM', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["Rửa xe .....................................................129", "Số khung, số máy...................................135", "Tay ga ........................................................97", "Tấm ngăn hộp đựng đồ ...........................66"]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 147)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('HD_THDNNQUNHITC_34', 'CAR', 'Sổ tay (XEOTODIEN) - Trang 34', 'thể dẫn đến quá nhiệt cho các thành phần điện áp cao hoặc gây ra hư hỏng nặng hơn. Các bánh', 'Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: xe nên được chèn để ngăn chặn chuyển động.', 'FLAT_TIRE', 'Thay lốp dự phòng / Vá lốp ô tô lưu động', 'CANH_BAO', 'Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.', '["xe nên được chèn để ngăn chặn chuyển động.", "Phiên bản BASE Phiên bản PLUS", "Pin Lithium-ion có thể tự bốc cháy. Pin có thể cháy trở lại sau khi đám cháy đã", "được dập tắt. Điều này có thể xảy ra vài giờ sau một sự kiện gây ra hư hỏng."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xeotodien.pdf (Trang 34)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_01', 'CAR', '64 Ký hiệu đèn táp-lô (Đỏ - Nguy hiểm)', 'Đèn cảnh báo số 1: Đèn cảnh báo phanh tay / Mất dầu phanh (Đèn màu RED)', 'Chưa hạ hết phanh tay hoặc mức dầu phanh trong bình chứa xuống dưới mức MIN, má phanh mòn quá giới hạn.', 'ENGINE_FAILURE', 'Cứu hộ kiểm tra hệ thống phanh hoặc xe kéo sàn trượt về gara', 'NGUY_HIEM', 'Kiểm tra hạ phanh tay. Nếu hạ rồi mà đèn vẫn sáng thì TUYỆT ĐỐI KHÔNG lái tiếp vì có nguy cơ mất phanh hoàn toàn.', '["Kiểm tra cần phanh tay đã hạ sát nấc dưới cùng chưa", "Mở nắp capo kiểm tra mức dầu phanh trong bình chứa", "Đạp chân phanh xem có bị hẫng hoặc lún sâu bất thường không"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_02', 'CAR', '64 Ký hiệu đèn táp-lô (Đỏ - Nguy hiểm)', 'Đèn cảnh báo số 2: Đèn cảnh báo nhiệt độ nước làm mát động cơ (Đèn màu RED)', 'Động cơ bị quá nhiệt (nhiệt độ nước làm mát vượt quá 100-115 độ C) do cạn nước, rò rỉ két nước hoặc hỏng quạt tản nhiệt.', 'ENGINE_FAILURE', 'Cứu hộ tiếp nước làm mát / Kéo xe về gara kiểm tra két nước', 'NGUY_HIEM', 'Tấp xe vào lề đường, tắt máy ngay lập tức. TUYỆT ĐỐI KHÔNG mở nắp két nước khi máy đang nóng vì nước sôi sẽ phun trào gây bỏng nặng.', '["Tắt máy, mở nắp capo cho khoang động cơ thoát nhiệt", "Chờ ít nhất 20-30 phút cho máy nguội hẳn", "Quan sát dưới gầm xem có bị chảy nước làm mát màu xanh/đỏ không"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_03', 'CAR', '64 Ký hiệu đèn táp-lô (Đỏ - Nguy hiểm)', 'Đèn cảnh báo số 3: Đèn cảnh báo áp suất dầu nhớt động cơ (Hình bình dầu đỏ) (Đèn màu RED)', 'Áp suất dầu bôi trơn tụt xuống mức nguy hiểm do thiếu nhớt, tắc lọc nhớt hoặc hỏng bơm nhớt, nguy cơ bó kẹt pít-tông lột dớn máy.', 'ENGINE_FAILURE', 'Cứu hộ châm nhớt khẩn cấp hoặc kéo xe về gara hạ máy', 'NGUY_HIEM', 'DỪNG XE VÀ TẮT MÁY NGAY. Tiếp tục nổ máy chỉ trong 1-2 phút sẽ làm phá hủy hoàn toàn động cơ, chi phí đại tu hàng chục triệu đồng.', '["Dừng xe nơi bằng phẳng an toàn, tắt máy", "Rút que thăm nhớt, lau sạch rồi cắm vào kiểm tra lại mức nhớt", "Nếu que thăm nhớt khô hoặc dưới vạch L/MIN: Không được nổ máy"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_04', 'CAR', '64 Ký hiệu đèn táp-lô (Đỏ - Nguy hiểm)', 'Đèn cảnh báo số 4: Đèn cảnh báo hệ thống trợ lực lái (EPS / Vô lăng đỏ) (Đèn màu RED)', 'Lỗi mô-tơ trợ lực lái điện hoặc đứt dây curoa trợ lực dầu, khiến vô-lăng nặng cứng ngắc khó xoay chuyển.', 'ENGINE_FAILURE', 'Cứu hộ xe kéo sàn trượt về gara sửa chữa thước lái', 'NGUY_HIEM', 'Vô-lăng sẽ rất nặng và khó đánh lái khi vào cua, cần giảm tốc độ tối đa và tấp xe an toàn.', '["Thử tắt máy khởi động lại xe xem hệ thống điện tử có tự reset không", "Kiểm tra mức dầu trợ lực lái nếu là trợ lực thủy lực", "Không cố lái xe ở tốc độ cao khi vô-lăng mất trợ lực"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_05', 'CAR', '64 Ký hiệu đèn táp-lô (Đỏ - Nguy hiểm)', 'Đèn cảnh báo số 5: Đèn cảnh báo túi khí (Airbag) (Đèn màu RED)', 'Hệ thống túi khí hoặc cảm biến va chạm bị lỗi, túi khí có thể không bung khi xảy ra tai nạn hoặc tự bung bất ngờ.', 'ACCIDENT', 'Kiểm tra hệ thống điện túi khí tại gara', 'CANH_BAO', 'Xe vẫn di chuyển được nhưng hệ thống bảo vệ thụ động bị vô hiệu hóa, cần lái xe thận trọng.', '["Kiểm tra giắc cắm dưới ghế lái và ghế phụ có bị lỏng không", "Đưa xe đến gara kiểm tra xóa lỗi cảm biến túi khí"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_06', 'CAR', '64 Ký hiệu đèn táp-lô (Đỏ - Nguy hiểm)', 'Đèn cảnh báo số 6: Đèn cảnh báo bình ắc quy / Hệ thống nạp điện (Hình ắc quy đỏ) (Đèn màu RED)', 'Máy phát điện (Alternator) bị hỏng, đứt dây curoa tổng hoặc ắc quy bị hư không nạp được điện. Xe sẽ sớm chết máy khi bình cạn kiệt.', 'DEAD_BATTERY', 'Cứu hộ kích bình ắc quy / Thay mới ắc quy ô tô tận nơi', 'CANH_BAO', 'Tắt ngay điều hòa, màn hình giải trí, đèn chiếu sáng không cần thiết để tiết kiệm điện bình chạy đến gara gần nhất.', '["Mở nắp capo kiểm tra dây curoa máy phát điện có bị đứt hoặc chùng không", "Kiểm tra bu lông 2 cọc bình ắc quy xem có bị lỏng hoặc rỉ sét không", "Yêu cầu cứu hộ đo điện áp máy phát (chuẩn từ 13.8V - 14.4V khi nổ máy)"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_07', 'CAR', '64 Ký hiệu đèn táp-lô (Đỏ - Nguy hiểm)', 'Đèn cảnh báo số 7: Đèn cảnh báo chưa thắt dây an toàn (Đèn màu RED)', 'Người ngồi hàng ghế trước hoặc ghế sau chưa cài chốt dây an toàn.', 'OTHER', 'Tư vấn lái xe an toàn', 'NHE', 'Cài chặt chốt dây an toàn trước khi khởi hành.', '["Kiểm tra cài chốt dây an toàn cho tất cả hành khách"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_08', 'CAR', '64 Ký hiệu đèn táp-lô (Đỏ - Nguy hiểm)', 'Đèn cảnh báo số 8: Đèn cảnh báo cửa xe chưa đóng chặt / Cốp xe mở (Đèn màu RED)', 'Có ít nhất một cửa hông hoặc cửa cốp sau chưa đóng khít.', 'OTHER', 'Tư vấn an toàn', 'CANH_BAO', 'Dừng xe kiểm tra đóng lại tất cả các cửa tránh cửa bung ra khi chạy tốc độ cao.', '["Mở và đóng mạnh dứt khoát lại 4 cánh cửa và cửa cốp sau"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_09', 'CAR', '64 Ký hiệu đèn táp-lô (Đỏ - Nguy hiểm)', 'Đèn cảnh báo số 9: Đèn cảnh báo nắp capo mở (Đèn màu RED)', 'Khóa ngàm nắp capo khoang máy chưa được đóng sập hoàn toàn.', 'OTHER', 'Tư vấn an toàn', 'CANH_BAO', 'Dừng xe đóng chốt nắp capo ngay, tránh gió bạt nắp capo đập vỡ kính lái.', '["Mở nắp capo lên rồi thả rơi tự do ở độ cao 20-30cm để sập ngàm an toàn"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_10', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 10: Đèn cảnh báo áp suất lốp (TPMS - Hình lốp xe có dấu chấm than) (Đèn màu YELLOW)', 'Áp suất của ít nhất một bánh xe bị tụt dưới 25% tiêu chuẩn do cán đinh, xì van hoặc rách lốp.', 'FLAT_TIRE', 'Vá lốp ô tô lưu động / Thay bánh dự phòng tận nơi', 'CANH_BAO', 'Giảm tốc độ, tránh phanh gấp hoặc đánh lái mạnh. Tấp xe vào lề kiểm tra lốp bị xẹp.', '["Đi vòng quanh xe quan sát 4 bánh xem lốp nào bị non hơi sát vành", "Không rút đinh ra nếu chưa có đồ nghề vá dùi hoặc bơm mini", "Gọi dịch vụ vá lốp lưu động hoặc kích xe thay lốp dự phòng"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_11', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 11: Đèn cảnh báo lỗi động cơ (Check Engine / Đèn cá vàng) (Đèn màu YELLOW)', 'Hệ thống điều khiển động cơ phát hiện sự cố ở cảm biến oxy, cảm biến lưu lượng gió, van khí xả hoặc bỏ lửa bu-gi.', 'ENGINE_FAILURE', 'Cứu hộ đọc lỗi xóa lỗi OBD-II / Kiểm tra động cơ', 'CANH_BAO', 'Nếu đèn sáng liên tục: Xe vẫn chạy được, lái xe chậm đến gara. Nếu đèn NHẤP NHÁY liên tục: Bỏ máy nghiêm trọng, phải dừng xe ngay.', '["Kiểm tra nắp bình xăng đã vặn chặt kêu ''cạch'' chưa", "Lắng nghe tiếng máy nổ xem có bị rung giật hoặc khói đen ở ống xả không", "Dùng máy chẩn đoán OBD-II đọc mã lỗi (DTC) lưu trong ECU"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_12', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 12: Đèn báo hệ thống chống bó cứng phanh (ABS) (Đèn màu YELLOW)', 'Hệ thống phanh ABS bị lỗi cảm biến tốc độ bánh xe hoặc bộ chấp hành van thủy lực.', 'ENGINE_FAILURE', 'Kiểm tra cảm biến ABS và hệ thống phanh tại gara', 'CANH_BAO', 'Hệ thống phanh cơ bản vẫn hoạt động nhưng tính năng chống trượt bó cứng bánh khi phanh gấp bị mất, tránh phanh gấp trên đường trơn.', '["Lái xe giữ khoảng cách an toàn gấp đôi bình thường", "Tránh phanh đột ngột trên đường trơn ướt", "Đưa xe đi vệ sinh giắc cắm cảm biến ABS ở các moay-ơ bánh"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_13', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 13: Đèn báo hệ thống cân bằng điện tử (ESP / ESC / VSC) (Đèn màu YELLOW)', 'Hệ thống cân bằng điện tử đang kích hoạt can thiệp chống lật xe (nếu nhấp nháy), hoặc bị lỗi tắt tính năng (nếu sáng liên tục).', 'ENGINE_FAILURE', 'Kiểm tra cảm biến góc lái và cân bằng điện tử tại gara', 'CANH_BAO', 'Giảm tốc độ khi ôm cua hoặc đi trên đường ướt, trơn trượt.', '["Kiểm tra xem nút tắt ESP/TCS có bị bấm nhầm không", "Giảm tốc độ vào cua khi xe mất tính năng cân bằng điện tử"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_14', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 14: Đèn báo mòn má phanh (Brake Pad Monitor) (Đèn màu YELLOW)', 'Má phanh trước hoặc sau đã bị mòn đến ngưỡng tiếp xúc cảm biến báo mòn.', 'ENGINE_FAILURE', 'Thay má phanh ô tô tại gara', 'CANH_BAO', 'Cần lên lịch thay má phanh mới sớm để tránh làm xước hỏng đĩa phanh.', '["Hạn chế rà phanh liên tục khi xuống dốc", "Đến gara thay bộ má phanh gốm/kim loại mới"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_15', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 15: Đèn báo cạn nhiên liệu (Hình cây xăng vàng) (Đèn màu YELLOW)', 'Lượng xăng/dầu trong bình chỉ còn khoảng 10-15% (chạy được khoảng 30-50 km).', 'OUT_OF_FUEL', 'Cứu hộ tiếp xăng/dầu khẩn cấp lưu động', 'CANH_BAO', 'Tìm ngay trạm xăng gần nhất. Không để xe chạy kiệt xăng vì sẽ làm cháy bơm xăng chìm.', '["Tắt điều hòa và các thiết bị điện phụ tải", "Duy trì tốc độ đều 50-60km/h để tiết kiệm nhiên liệu tối đa đến cây xăng"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_16', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 16: Đèn báo nước lọt vào lọc nhiên liệu (Xe máy dầu Diesel) (Đèn màu YELLOW)', 'Cốc lọc dầu diesel có nhiều nước ngưng tụ, cần xả nước đáy lọc ngay để tránh làm hỏng kim phun điện tử Common Rail.', 'ENGINE_FAILURE', 'Cứu hộ xả đáy cốc lọc dầu / Thay lọc nhiên liệu', 'CANH_BAO', 'Dừng xe xả nước ở cốc lọc dầu dưới khoang máy, không cố chạy tiếp vì kim phun dầu rất đắt tiền.', '["Mở nắp capo tìm cốc lọc nhiên liệu diesel", "Vặn van xả dưới đáy cốc lọc để nước chảy ra hết đến khi thấy dầu diesel"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_17', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 17: Đèn báo bộ lọc hạt khí thải hạt diesel (DPF) (Đèn màu YELLOW)', 'Bộ lọc muội than khí thải động cơ diesel bị nghẹt do chạy quãng đường ngắn trong phố nhiều.', 'ENGINE_FAILURE', 'Vệ sinh bộ lọc DPF hoặc tái sinh muội than tại gara', 'CANH_BAO', 'Chạy xe đều trên đường trường ở vòng tua 2000-2500 rpm trong 20-30 phút để động cơ tự kích hoạt chu trình tái sinh DPF.', '["Chạy xe ra đường cao tốc với tốc độ trên 60km/h trong 20 phút", "Nếu đèn không tắt, mang xe đến gara cắm máy tái sinh cưỡng bức"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_18', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 18: Đèn báo sấy bugi sấy (Glow Plug - Xe máy dầu) (Đèn màu YELLOW)', 'Hệ thống sấy nóng buồng đốt đang làm việc (chờ đèn tắt rồi mới đề máy), hoặc bị lỗi rơ-le sấy.', 'ENGINE_FAILURE', 'Kiểm tra bugi sấy động cơ diesel', 'CANH_BAO', 'Bật khóa ON chờ đèn xoắn ốc này tắt hẳn rồi mới vặn chìa đề nổ máy.', '["Chờ 3-5 giây cho bugi nung đỏ buồng đốt", "Đề máy sau khi đèn tắt hoàn toàn"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_19', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 19: Đèn cảnh báo lỗi hộp số tự động (Hình bánh răng vàng) (Đèn màu YELLOW)', 'Hộp số tự động (AT / CVT / DCT) bị quá nhiệt, thiếu dầu hộp số hoặc lỗi cụm điều khiển van thủy lực.', 'ENGINE_FAILURE', 'Cứu hộ kéo xe số tự động bằng xe sàn trượt về gara', 'NGUY_HIEM', 'Tấp xe vào lề dừng xe để nguội hộp số. TUYỆT ĐỐI KHÔNG kéo lê xe số tự động trên đường mà phải gọi xe cứu hộ sàn trượt chở trọn vẹn cả xe.', '["Về số P, kéo phanh tay, để xe nổ garanti 10-15 phút giải nhiệt", "Nếu vào số bị giật cục hoặc không chuyển số: Gọi ngay xe cứu hộ sàn"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_20', 'CAR', '64 Ký hiệu đèn táp-lô (Vàng - Cảnh báo)', 'Đèn cảnh báo số 20: Đèn báo nước rửa kính cạn (Washer Fluid Low) (Đèn màu YELLOW)', 'Bình chứa nước rửa kính chắn gió đã gần hết nước.', 'OTHER', 'Châm thêm nước rửa kính', 'NHE', 'Mở nắp capo châm thêm nước rửa kính chuyên dụng hoặc nước tinh khiết.', '["Mở nắp bình có biểu tượng phun nước rửa kính màu xanh", "Châm đầy nước rửa kính"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_21', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo bật phanh tay điện tử (EPB))', 'Đèn táp-lô số 21: Đèn báo bật phanh tay điện tử (EPB) (Màu YELLOW)', 'Phanh tay điện tử đang khóa hoặc bị kẹt ngàm mô-tơ', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 21: Đèn báo bật phanh tay điện tử (EPB)", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_22', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo chế độ hỗ trợ đổ đèo dốc (HDC))', 'Đèn táp-lô số 22: Đèn báo chế độ hỗ trợ đổ đèo dốc (HDC) (Màu GREEN)', 'Tính năng phanh tự động ghìm tốc độ khi xuống dốc đang bật', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'NHE', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 22: Đèn báo chế độ hỗ trợ đổ đèo dốc (HDC)", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_23', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo chế độ lái tiết kiệm nhiên liệu ECO)', 'Đèn táp-lô số 23: Đèn báo chế độ lái tiết kiệm nhiên liệu ECO (Màu GREEN)', 'Động cơ đang vận hành ở dải tua máy tiết kiệm nhiên liệu', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'NHE', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 23: Đèn báo chế độ lái tiết kiệm nhiên liệu ECO", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_24', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo ga tự động Cruise Control)', 'Đèn táp-lô số 24: Đèn báo ga tự động Cruise Control (Màu GREEN)', 'Hệ thống kiểm soát hành trình tự động giữ tốc độ đang kích hoạt', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'NHE', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 24: Đèn báo ga tự động Cruise Control", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_25', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo hệ thống phanh khẩn cấp tự động (AEB))', 'Đèn táp-lô số 25: Đèn báo hệ thống phanh khẩn cấp tự động (AEB) (Màu YELLOW)', 'Radar hoặc camera kính lái bị bẩn, tính năng tự phanh tạm dừng', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 25: Đèn báo hệ thống phanh khẩn cấp tự động (AEB)", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_26', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo chệch làn đường (LDW / LKA))', 'Đèn táp-lô số 26: Đèn báo chệch làn đường (LDW / LKA) (Màu YELLOW)', 'Xe đang lấn làn hoặc vạch kẻ đường bị mờ camera không nhận diện được', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 26: Đèn báo chệch làn đường (LDW / LKA)", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_27', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo giám sát điểm mù (BSM))', 'Đèn táp-lô số 27: Đèn báo giám sát điểm mù (BSM) (Màu YELLOW)', 'Có phương tiện đang đi trong vùng điểm mù của gương chiếu hậu', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 27: Đèn báo giám sát điểm mù (BSM)", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_28', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo lỗi đèn chiếu sáng ngoài)', 'Đèn táp-lô số 28: Đèn báo lỗi đèn chiếu sáng ngoài (Màu YELLOW)', 'Có bóng đèn pha, cốt hoặc đèn hậu bị cháy bóng đứt tim', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 28: Đèn báo lỗi đèn chiếu sáng ngoài", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_29', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo bật đèn sương mù trước)', 'Đèn táp-lô số 29: Đèn báo bật đèn sương mù trước (Màu GREEN)', 'Đèn phá sương mù gầm đang bật', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'NHE', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 29: Đèn báo bật đèn sương mù trước", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_30', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo bật đèn sương mù sau)', 'Đèn táp-lô số 30: Đèn báo bật đèn sương mù sau (Màu YELLOW)', 'Đèn sương mù đỏ phía sau đang bật', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 30: Đèn báo bật đèn sương mù sau", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_31', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo chế độ đèn pha chiếu xa (High Beam))', 'Đèn táp-lô số 31: Đèn báo chế độ đèn pha chiếu xa (High Beam) (Màu BLUE)', 'Đèn pha chiếu xa đang bật, cần hạ cốt khi có xe ngược chiều', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'NHE', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 31: Đèn báo chế độ đèn pha chiếu xa (High Beam)", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_32', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo lỗi giảm xóc bóng hơi / Treo khí nén)', 'Đèn táp-lô số 32: Đèn báo lỗi giảm xóc bóng hơi / Treo khí nén (Màu YELLOW)', 'Bóng hơi bị xì hoặc máy nén khí treo gầm bị quá nhiệt', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 32: Đèn báo lỗi giảm xóc bóng hơi / Treo khí nén", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_33', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo khóa vi sai 4WD / Khóa cầu)', 'Đèn táp-lô số 33: Đèn báo khóa vi sai 4WD / Khóa cầu (Màu YELLOW)', 'Chế độ gài cầu cứng 4x4 đang kích hoạt', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 33: Đèn báo khóa vi sai 4WD / Khóa cầu", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_34', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo chìa khóa thông minh Smartkey xa xe)', 'Đèn táp-lô số 34: Đèn báo chìa khóa thông minh Smartkey xa xe (Màu YELLOW)', 'Chìa khóa remote không nằm trong vùng nhận diện của xe', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 34: Đèn báo chìa khóa thông minh Smartkey xa xe", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_35', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo pin chìa khóa Smartkey yếu)', 'Đèn táp-lô số 35: Đèn báo pin chìa khóa Smartkey yếu (Màu YELLOW)', 'Pin cúc áo CR2032 trong chìa khóa ô tô sắp cạn', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 35: Đèn báo pin chìa khóa Smartkey yếu", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_36', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn cảnh báo khoảng cách xe phía trước quá gần)', 'Đèn táp-lô số 36: Đèn cảnh báo khoảng cách xe phía trước quá gần (Màu RED)', 'Khoảng cách với xe trước nguy hiểm, nguy cơ va chạm', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 36: Đèn cảnh báo khoảng cách xe phía trước quá gần", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_37', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo tuyết / Nhiệt độ ngoài trời đóng băng)', 'Đèn táp-lô số 37: Đèn báo tuyết / Nhiệt độ ngoài trời đóng băng (Màu YELLOW)', 'Nhiệt độ ngoài trời dưới 4 độ C, mặt đường có nguy cơ đóng băng trơn trượt', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 37: Đèn báo tuyết / Nhiệt độ ngoài trời đóng băng", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_38', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo nước ngưng tụ trong bình nhiên liệu)', 'Đèn táp-lô số 38: Đèn báo nước ngưng tụ trong bình nhiên liệu (Màu YELLOW)', 'Có lẫn nước trong hệ thống cấp nhiên liệu', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 38: Đèn báo nước ngưng tụ trong bình nhiên liệu", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_39', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo nắp bình xăng chưa vặn chặt)', 'Đèn táp-lô số 39: Đèn báo nắp bình xăng chưa vặn chặt (Màu YELLOW)', 'Nắp xăng bị hở làm thất thoát hơi xăng gây sáng đèn Check Engine', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 39: Đèn báo nắp bình xăng chưa vặn chặt", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('DASH_LIGHT_40', 'CAR', '64 Ký hiệu đèn táp-lô (Đèn báo khóa cột lái)', 'Đèn táp-lô số 40: Đèn báo khóa cột lái (Màu YELLOW)', 'Cột lái bị khóa cơ khí khi tắt máy rút chìa', 'OTHER', 'Kiểm tra hệ thống điện táp-lô ô tô', 'CANH_BAO', 'Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.', '["Kiểm tra ý nghĩa đèn số 40: Đèn báo khóa cột lái", "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng", "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
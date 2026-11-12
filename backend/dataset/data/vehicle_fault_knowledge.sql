-- =====================================================================
-- DỮ LIỆU CƠ SỞ TRI THỨC CHẨN ĐOÁN SỰ CỐ XE DÀNH CHO SUPABASE (POSTGRESQL)
-- Tổng số bản ghi thực tế: 87
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
VALUES ('HD_TAYCON_STARTER_CRANKS_NO_START_97', 'MOTORBIKE', 'Sổ tay Xe Tay Côn - Động cơ & Khởi động', 'Mô tơ đề hoạt động quay tốt nhưng động cơ không nổ máy', 'Hệ thống nhiên liệu cạn xăng, ngộp xăng, bugi mất tia lửa điện hoặc lỗi hệ thống phun xăng điện tử PGM-FI.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/đánh lửa và tiếp nhiên liệu', 'CANH_BAO', 'Không bấm giữ nút đề liên tục quá 5 giây để tránh làm cạn kiệt bình ắc quy và cháy mô tơ đề. Đợi 10 giây giữa các lần khởi động.', '["Kiểm tra mức xăng trong bình, tiếp thêm nhiên liệu nếu bình cạn.", "Đảm bảo quy trình khởi động đúng chuẩn: trả về số N (hoặc bóp hết tay côn) và gạt chân chống nghiêng lên.", "Quan sát đèn báo lỗi PGM-FI (MIL) trên bảng đồng hồ. Nếu đèn sáng hoặc nhấp nháy, hệ thống phun xăng điện tử đang gặp lỗi.", "Tháo chụp bugi kiểm tra xem có bị lỏng, ẩm ướt hoặc đứt dây cao áp không."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 97)')
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
VALUES ('HD_TAYCON_STARTER_NO_CRANK_SILENT_97', 'MOTORBIKE', 'Sổ tay Xe Tay Côn - Động cơ & Khởi động', 'Bấm nút đề nhưng mô tơ đề hoàn toàn không hoạt động, xe im lìm', 'Mất nguồn cấp cho mạch khởi động do đứt cầu chì, bình điện ắc quy bị yếu/hỏng, hoặc cọc bình bị lỏng, rỉ sét.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Kiểm tra công tắc ngắt động cơ màu đỏ (nếu có) xem đã bật về vị trí RUN chưa. Kiểm tra công tắc chân chống nghiêng.', '["Kiểm tra công tắc chân chống nghiêng: Gạt chân chống lên hết cỡ.", "Kiểm tra cọc bình ắc quy: Mở nắp bình điện kiểm tra ốc siết cọc âm (-) và cực dương (+) xem có lỏng hoặc bám muối rỉ sét không.", "Kiểm tra hộp cầu chì: Kiểm tra cầu chì khởi động và cầu chì chính (15A/20A) xem có bị đứt dây chì bên trong không.", "Nếu bấm còi kêu rất nhỏ hoặc đèn đồng hồ bị sụp tối khi ấn đề, ắc quy đã cạn điện cần sạc hoặc kích bình."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 97)')
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
VALUES ('HD_TAYCON_OVERHEAT_COOLANT_WARNING_98', 'MOTORBIKE', 'Sổ tay Xe Tay Côn - Hệ thống làm mát', 'Đèn báo quá nhiệt dung dịch làm mát sáng đỏ, xe tăng tốc chậm, máy nóng ran', 'Động cơ bị quá nhiệt do thiếu dung dịch làm mát, rò rỉ két nước tản nhiệt hoặc quạt gió két nước không hoạt động.', 'ENGINE_FAILURE', 'Cứu hộ làm mát / Bổ sung nước làm mát động cơ', 'NGUY_HIEM', 'Dừng xe vào lề đường ngay lập tức, tắt máy để động cơ nguội tự nhiên. TUYỆT ĐỐI KHÔNG mở nắp két nước khi máy còn nóng vì áp suất nước sôi có thể phun trào gây bỏng nặng!', '["Tắt máy bằng khóa điện, sau đó vặn khóa điện sang ON để kiểm tra quạt két nước tản nhiệt có quay không.", "Nếu quạt không quay, có thể quạt hỏng hoặc đứt cầu chì quạt tản nhiệt, không được nổ máy tiếp.", "Chờ động cơ nguội hoàn toàn (khoảng 15-20 phút), kiểm tra đường ống và bề mặt két nước xem có rò rỉ dung dịch làm mát không.", "Kiểm tra mức dung dịch làm mát trong bình dự trữ (nằm giữa vạch UPPER và LOWER). Đổ thêm dung dịch làm mát chuyên dụng nếu cạn.", "Nếu rò rỉ két nước hoặc đèn vẫn sáng đỏ sau khi châm nước, hãy liên hệ cứu hộ kéo xe, không cố chạy tiếp tránh bó piston vỡ lốc máy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 98)')
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
VALUES ('HD_TAYCON_PGMFI_MIL_LIGHT_99', 'MOTORBIKE', 'Sổ tay Xe Tay Côn - Đèn cảnh báo & Điện tử', 'Đèn báo lỗi hệ thống phun xăng điện tử PGM-FI (đèn MIL màu vàng) sáng hoặc nhấp nháy khi đang lái xe', 'Hệ thống phun xăng điện tử PGM-FI hoặc một trong các cảm biến điều khiển động cơ (cảm biến oxy, TPS, EOT, CKP) gặp trục trặc.', 'ENGINE_FAILURE', 'Đọc mã lỗi PGM-FI / Sửa chữa hệ thống phun xăng điện tử', 'CANH_BAO', 'Giảm tốc độ xe ngay, chạy đều ga và tránh tải nặng. Tìm điểm dừng an toàn hoặc đưa xe đến cửa hàng dịch vụ kiểm tra càng sớm càng tốt.', '["Giảm tốc độ, quan sát đèn MIL xem sáng liên tục hay nhấp nháy mã lỗi (đếm số lần nháy dài và nháy ngắn để xác định mã lỗi).", "Đỗ xe an toàn, tắt khóa điện và đợi 1-2 phút rồi bật lại để xem đèn có tự tắt không (lỗi tạm thời).", "Nếu xe bị hụt ga, giật cục hoặc chết máy khi đèn sáng, không cố chạy đường dài vì có thể làm hỏng bộ chuyển đổi xúc tác khí thải.", "Đưa xe đến đại lý hoặc gọi thợ có máy đọc lỗi Fi để cắm cổng DLC chẩn đoán chính xác mã lỗi PGM-FI."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 99)')
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
VALUES ('HD_TAYCON_ABS_WARNING_LIGHT_99', 'MOTORBIKE', 'Sổ tay Xe Tay Côn - Hệ thống phanh & ABS', 'Đèn báo hệ thống chống bó cứng phanh ABS sáng liên tục hoặc nhấp nháy khi xe chạy trên 10 km/h', 'Hệ thống phanh ABS gặp lỗi, đĩa đọc xung ABS bị cong vênh, cảm biến tốc độ bánh xe bị bẩn hoặc mất tín hiệu.', 'OTHER', 'Kiểm tra cảm biến và hệ thống phanh ABS', 'CANH_BAO', 'Hệ thống phanh cơ khí thông thường vẫn hoạt động nhưng tính năng chống bó cứng ABS bị ngắt. Cần điều khiển xe thận trọng, tránh phanh gấp trên đường trơn trượt.', '["Kiểm tra cảm biến tốc độ ở đĩa phanh bánh trước/sau: làm sạch đất cát, bùn bẩn bám trên mắt đọc cảm biến.", "Kiểm tra đĩa xung đọc phanh ABS (vành răng nhỏ) xem có bị dị vật kẹt, méo mó hoặc cong vênh không.", "Tắt khóa điện OFF rồi bật lại ON, chạy xe với tốc độ trên 30 km/h để hệ thống tự hiệu chuẩn lại cảm biến.", "Nếu đèn ABS vẫn không tắt, mang xe đến trung tâm bảo dưỡng để kiểm tra mô-đun điều khiển phanh ABS."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 99)')
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
VALUES ('HD_TAYCON_SMARTKEY_BATTERY_LOW_93', 'MOTORBIKE', 'Sổ tay Xe Tay Côn - Khóa thông minh Smart Key', 'Đèn báo hệ thống khóa thông minh Smart Key nhấp nháy 5 lần khi bật khóa điện', 'Pin điều khiển thông minh FOB (loại pin cúc áo CR2032) sắp cạn năng lượng, phạm vi bắt sóng bị giảm sút.', 'DEAD_BATTERY', 'Thay pin chìa khóa thông minh Smart Key CR2032 tận nơi', 'CANH_BAO', 'Thay pin FOB càng sớm càng tốt để tránh tình trạng khóa xe bị kẹt không khởi động được giữa đường khi pin cạn hoàn toàn.', '["Chuẩn bị 01 viên pin CR2032 chính hãng mới và tua vít đầu dẹt (bọc vải bảo vệ đầu tua vít để không làm xước vỏ).", "Lách tua vít vào rãnh khe của remote FOB để tách hai nửa nắp trên và nắp dưới.", "Tháo pin cũ và lắp pin mới vào: Đảm bảo mặt có dấu cực âm (-) hướng lên trên.", "Lắp chặt hai nửa nắp FOB khớp khít mép cao su chống nước.", "Nhấn nút tìm xe trên FOB để kiểm tra đèn LED phản hồi xác nhận hoạt động bình thường."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 93)')
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
VALUES ('HD_TAYCON_SMARTKEY_NO_CONNECTION_102', 'MOTORBIKE', 'Sổ tay Xe Tay Côn - Khóa thông minh Smart Key', 'Xe không nhận tín hiệu Smart Key, không thể ấn mở núm khóa điện để khởi động', 'FOB bị tắt nguồn, pin FOB cạn kiệt, bình ắc quy xe bị hết điện, hoặc bị nhiễu sóng điện từ cực mạnh gần tháp truyền hình.', 'DEAD_BATTERY', 'Cứu hộ kích bình / Mở khóa xe máy khẩn cấp', 'CANH_BAO', 'Dùng tính năng mở khóa khẩn cấp bằng mã ID (gồm 9 chữ số trên thẻ nhựa đi kèm xe) nếu chìa khóa bị rơi hoặc hết pin.', '["Kiểm tra đèn LED trên remote FOB: Nhấn giữ nút khóa/nguồn trên FOB trong 2 giây xem đèn chuyển từ Đỏ sang Xanh chưa (Đỏ = Tắt, Xanh = Bật).", "Đưa FOB đến sát cạnh cụm ổ khóa trên xe để giảm thiểu ảnh hưởng của vùng nhiễu sóng.", "Kiểm tra bình ắc quy của xe: Nếu ấn núm khóa mà vòng đèn LED ổ khóa không sáng và không kêu tít, ắc quy xe có thể đã hết sạch điện.", "Trường hợp khẩn cấp: Dùng mã thẻ ID 9 số để mở khóa điện bằng cách nhấn giữ núm khóa 4 giây và nhập số lần bấm tương ứng từng chữ số."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 102)')
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
VALUES ('HD_TAYCON_FLAT_TIRE_109', 'MOTORBIKE', 'Sổ tay Xe Tay Côn - Lốp & Bánh xe', 'Lốp xe bị thủng, xẹp hơi, cán đinh, tay lái bị rung lắc hoặc đảo khi di chuyển', 'Lốp xe không săm (tubeless) bị dị vật đâm thủng hoặc hở chân van hơi, áp suất lốp bị sụt giảm đột ngột.', 'FLAT_TIRE', 'Vá lốp xe máy lưu động (vá dùi khẩn cấp hoặc vá nấm)', 'CANH_BAO', 'Giữ chặt tay lái, nhả ga từ từ, rà nhẹ đồng thời cả hai phanh trước và sau để giảm tốc độ. Tấp vào lề đường an toàn. TUYỆT ĐỐI KHÔNG rút đinh ra nếu chưa có sẵn dụng cụ vá lốp vì lốp sẽ xì hết hơi ngay lập tức!', '["Dựng xe bằng chân chống đứng trên mặt đất bằng phẳng, kiểm tra toàn bộ bề mặt lốp để xác định vị trí đinh hoặc vết thủng.", "Nếu đinh vẫn còn găm chặt và lốp còn hơi, bạn có thể chạy chậm với tốc độ dưới 30 km/h đến tiệm sửa xe gần nhất.", "Nếu lốp đã xẹp hoàn toàn: Sử dụng bộ vá dùi cao su khẩn cấp để bịt lỗ thủng rồi dùng bơm mini bơm lên áp suất chuẩn (trước 2.0 kg/cm2, sau 2.25 kg/cm2).", "Gọi dịch vụ vá xe lưu động để vá nấm từ bên trong nhằm bảo vệ kết cấu bố lốp lâu dài."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 109)')
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
VALUES ('HD_TAYCON_BLOWN_FUSE_111', 'MOTORBIKE', 'Sổ tay Xe Tay Côn - Hệ thống điện', 'Toàn bộ hệ thống điện bị mất đột ngột, xe không bật được khóa điện, không có đèn còi', 'Đứt cầu chì chính (Main Fuse 20A/30A) hoặc cầu chì phụ do đoản mạch, chập dây điện hoặc quá tải thiết bị điện gắn thêm.', 'ENGINE_FAILURE', 'Cứu hộ điện xe máy / Thay cầu chì và xử lý chập mạch', 'CANH_BAO', 'Luôn thay thế bằng cầu chì có cùng chỉ số Ampe quy định. Không dùng dây đồng hoặc giấy bạc thay thế vì sẽ gây cháy xe!', '["Tắt khóa điện về vị trí OFF và tháo yên xe (hoặc ốp hông) để tiếp cận hộp cầu chì.", "Dùng kẹp rút cầu chì trong hộp phụ tùng để rút cầu chì chính và các cầu chì phụ ra kiểm tra.", "Quan sát sợi kim loại bên trong cầu chì: nếu bị đứt hoặc cháy đen, cầu chì đã hỏng.", "Lấy cầu chì dự phòng (spare fuse) có cùng chỉ số Ampe (ví dụ 10A, 15A, 20A) trong nắp hộp cầu chì để thay vào.", "Bật khóa điện kiểm tra lại. Nếu cầu chì mới vừa thay lại bị đứt ngay lập tức, hệ thống điện đang bị chập mass nghiêm trọng, cần thợ chuyên nghiệp xử lý."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 111)')
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
VALUES ('HD_TAYCON_ENGINE_HESITATION_UNSTABLE_113', 'MOTORBIKE', 'Sổ tay Xe Tay Côn - Động cơ & Nhiên liệu', 'Động cơ vận hành không ổn định, hụt ga, giật cục khi tăng tốc hoặc chạy chậm', 'Lọc gió bị nghẹt quá nhiều bụi bẩn, bugi mòn khoảng cách đánh lửa, kim phun PGM-FI bị tắc cặn, hoặc xăng bị lẫn nước/tạp chất.', 'ENGINE_FAILURE', 'Bảo dưỡng hệ thống đánh lửa / Vệ sinh kim phun họng xăng', 'CANH_BAO', 'Tránh vít ga đột ngột để không làm chết máy giữa dòng xe cộ. Chạy đều ga ở tốc độ vừa phải.', '["Kiểm tra nắp bình xăng và xả đáy lọc xăng nếu nghi ngờ vừa đổ phải xăng kém chất lượng hoặc xăng nhiễm nước mưa.", "Kiểm tra khoảng hở đánh lửa bugi (tiêu chuẩn: 0.8 - 0.9 mm) và làm sạch muội than bám ở đầu điện cực bugi.", "Kiểm tra tấm lọc gió: nếu bám dày bụi bẩn và dầu nhớt, cần vệ sinh hoặc thay tấm lọc gió mới.", "Nếu xe vẫn bị hụt ga, cần đưa đến cơ sở sửa chữa để súc rửa kim phun xăng điện tử và kiểm tra áp suất bơm xăng."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 113)')
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
VALUES ('HD_XEGA_STARTER_CRANKS_NO_START_101', 'MOTORBIKE', 'Sổ tay Xe Tay Ga - Động cơ & Khởi động', 'Mô tơ đề quay nhưng máy không nổ, xe tay ga không thể khởi động', 'Hết xăng, nghẹt kim phun PGM-FI, bugi bị ướt xăng hoặc chân chống nghiêng chưa gạt lên hoàn toàn.', 'ENGINE_FAILURE', 'Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara', 'CANH_BAO', 'Đảm bảo đã bóp chặt tay phanh trái (phanh sau) trước khi ấn nút đề. Xe tay ga có công tắc ngắt an toàn tại tay phanh.', '["Gạt chân chống nghiêng lên hết hành trình (xe tay ga Honda tự động ngắt đánh lửa khi hạ chân chống nghiêng).", "Bóp chặt tay phanh (phanh sau hoặc phanh trước) và ấn nút khởi động.", "Kiểm tra mức nhiên liệu trên đồng hồ xăng.", "Nếu xe để lâu không đi bị ngộp xăng: Mở hết tay ga, ấn nút khởi động trong 5 giây, sau đó đóng ga và khởi động lại bình thường."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 101)')
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
VALUES ('HD_XEGA_STARTER_SILENT_NO_CRANK_101', 'MOTORBIKE', 'Sổ tay Xe Tay Ga - Động cơ & Khởi động', 'Ấn nút đề không có tiếng động cơ quay, xe tay ga im lìm hoàn toàn', 'Bình ắc quy hết điện, hỏng công tắc phanh tay, đứt cầu chì chính hoặc hỏng nút bấm đề.', 'DEAD_BATTERY', 'Kích bình ắc quy / Thay ắc quy xe máy tận nơi', 'CANH_BAO', 'Kiểm tra xem đèn hậu/đèn phanh có sáng lên khi bóp tay phanh không. Nếu không sáng, công tắc phanh bị hỏng khiến xe không nhận lệnh đề.', '["Thử bóp mạnh tay phanh bên kia (đổi từ phanh trái sang phanh phải) rồi ấn nút đề.", "Kiểm tra còi và đèn xi nhan: Nếu còi không kêu hoặc kêu yếu ớt, bình ắc quy đã cạn kiệt điện năng.", "Mở nắp mặt nạ trước kiểm tra cọc bình ắc quy có bị tuột lỏng hoặc rỉ sét không.", "Kiểm tra cầu chì chính trong hộp cầu chì dưới sàn để chân hoặc phía trước đầu xe."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 101)')
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
VALUES ('HD_XEGA_COOLANT_OVERHEAT_102', 'MOTORBIKE', 'Sổ tay Xe Tay Ga - Hệ thống làm mát', 'Đèn báo quá nhiệt dung dịch làm mát sáng đỏ trên mặt đồng hồ xe tay ga', 'Nhiệt độ nước làm mát động cơ vượt ngưỡng an toàn do thiếu dung dịch làm mát, két tản nhiệt bị bám đầy bùn đất hoặc quạt két nước hỏng.', 'ENGINE_FAILURE', 'Bổ sung nước làm mát / Vệ sinh két tản nhiệt xe tay ga', 'NGUY_HIEM', 'Dừng xe ngay, tắt khóa điện. Không để xe nổ cầm chừng vì xe tay ga làm mát bằng két nước đặt bên hông cần gió lưu thông.', '["Tấp xe vào chỗ râm mát, tắt máy để nguội động cơ ít nhất 20 phút.", "Kiểm tra khe lấy gió két tản nhiệt bên hông xe xem có bị túi nilon, rác hoặc bùn đất bám kín cánh tản nhiệt không.", "Kiểm tra mức dung dịch làm mát trong bình phụ (nằm dưới sàn để chân hoặc trong cốp xe).", "Nếu cạn, mở nắp bình dự trữ và châm thêm nước làm mát chuyên dụng (hoặc nước cất khẩn cấp).", "Nếu sau khi châm nước và để nguội mà đèn vẫn sáng đỏ khi chạy, hãy dừng xe gọi cứu hộ ngay."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 102)')
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
VALUES ('HD_XEGA_IDLING_STOP_NOT_WORKING_107', 'MOTORBIKE', 'Sổ tay Xe Tay Ga - Hệ thống Idling Stop', 'Hệ thống Idling Stop (ngắt động cơ tạm thời) không tự tắt máy khi dừng đèn đỏ', 'Bình ắc quy yếu điện áp, nhiệt độ động cơ chưa đủ nóng, xe chưa từng chạy quá 10 km/h, hoặc công tắc Idling Stop đang tắt.', 'DEAD_BATTERY', 'Kiểm tra điện áp bình ắc quy xe tay ga', 'CANH_BAO', 'Hệ thống tự động vô hiệu hóa tính năng Idling Stop để bảo vệ bình ắc quy không bị kiệt điện khi dừng đỗ liên tục.', '["Kiểm tra công tắc Idling Stop bên tay lái phải: Đảm bảo công tắc gạt về vị trí ''Idling Stop'' (không phải ''Idling'').", "Xe cần phải chạy ít nhất 1 lần vượt quá 10 km/h sau khi khởi động để kích hoạt hệ thống.", "Động cơ cần hoạt động từ 5-10 phút để đạt nhiệt độ nước làm mát trên 60°C thì Idling Stop mới bắt đầu hoạt động.", "Nếu đã thỏa mãn các điều kiện trên mà Idling Stop vẫn không hoạt động, điện áp bình ắc quy đang dưới 12.4V (ắc quy chai yếu, cần sạc hoặc thay thế)."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 107)')
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
VALUES ('HD_XEGA_CVT_BELT_BROKEN_120', 'MOTORBIKE', 'Sổ tay Xe Tay Ga - Hệ thống truyền động CVT', 'Xe tay ga nổ máy vặn ga tiếng động cơ gầm rú to nhưng bánh sau không quay, xe không di chuyển', 'Dây đai truyền động (dây curoa CVT) bị đứt hoặc tuột, bi nồi và búa ba càng côn sau bị kẹt vỡ.', 'ENGINE_FAILURE', 'Cứu hộ thay dây curoa xe tay ga lưu động / Kéo xe về gara', 'NGUY_HIEM', 'Tắt máy ngay lập tức. Không tiếp tục vặn ga vì các sợi bố dây curoa đứt có thể quấn chặt vào trục khuỷu hoặc làm vỡ lốc nồi nhôm.', '["Tắt động cơ, dựng chân chống đứng và thử quay bánh sau bằng tay xem có bị kẹt cứng không.", "Lắng nghe xem có tiếng lạo xạo hoặc tiếng kim loại cọ xát trong lốc nồi bên trái không.", "Sự cố đứt dây curoa không thể tự khắc phục tại chỗ nếu không có dụng cụ mở nồi chuyên dụng và dây curoa thay thế.", "Liên hệ dịch vụ cứu hộ xe máy lưu động SRAS để thợ mang theo dây curoa đúng thông số đến thay thế tận nơi hoặc chở xe về gara."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 120)')
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
VALUES ('HD_XEGA_EMERGENCY_SEAT_OPEN_112', 'MOTORBIKE', 'Sổ tay Xe Tay Ga - Khóa thông minh Smart Key', 'Mất chìa Smart Key hoặc xe hết sạch ắc quy không thể ấn nút mở cốp yên xe', 'Khóa điện tử không có nguồn điện để kích hoạt rơ-le mở cốp yên xe, cần sử dụng cơ cấu mở khóa khẩn cấp.', 'OTHER', 'Hỗ trợ mở khóa yên xe và kích bình khẩn cấp', 'CANH_BAO', 'Sử dụng thanh chìa khóa nhựa từ khẩn cấp (đi kèm theo xe lúc mua) để mở cơ khí.', '["Tìm nắp đậy khẩn cấp cạnh núm khóa Smart Key (hoặc gần nắp bình xăng tùy dòng xe).", "Dùng đầu ngón tay hoặc tua vít nhỏ cạy nắp đậy nhựa ra ngoài.", "Tra thanh chìa nhựa khẩn cấp vào ổ khóa cơ bên trong sao cho khớp các rãnh từ tính.", "Gạt thanh chìa xuống dưới (hoặc xoay theo chiều kim đồng hồ) cho đến khi nghe tiếng ''cạch'' của ngàm khóa yên nhả ra.", "Nâng yên xe lên để tiếp cận bình ắc quy kiểm tra và thay thế pin/ắc quy."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 112)')
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
VALUES ('HD_XESO_CHAIN_SLIPPED_OR_BROKEN_95', 'MOTORBIKE', 'Sổ tay Xe Số - Hệ thống truyền xích', 'Xe số bị tuột xích, đứt sên hoặc xích kêu lạch cạch dữ dội va đập vào hộp xích', 'Xích tải (sên xe) bị chùng quá mức, nhông sên dĩa bị mòn nhọn răng hoặc mắt xích bị khô rỉ sét đứt chốt.', 'ENGINE_FAILURE', 'Cắt mắt xích / Tăng sên / Thay nhông sên dĩa xe số lưu động', 'NGUY_HIEM', 'Bóp phanh dừng xe từ từ vào lề. TUYỆT ĐỐI KHÔNG cố vào số vít ga vì xích tuột có thể bị quấn chặt vào may-ơ bánh sau làm khóa cứng bánh gây té ngã!', '["Dựng chân chống đứng, mở nắp kiểm tra xích trên hộp xích (carte).", "Kiểm tra độ chùng xích: Độ chùng tiêu chuẩn là 20 - 30 mm. Nếu xích chạm sát vào hộp xích dưới là xích quá chùng.", "Nếu xích chỉ bị tuột khỏi dĩa: Nới lỏng ốc trục bánh sau, dùng tua vít lách xích vào răng dĩa và xoay bánh để đưa xích vào lại.", "Siết ốc tăng sên ở hai bên gắp sau đều nhau để xích có độ căng vừa phải và bánh xe cân thẳng hàng.", "Nếu xích bị đứt mắt sên: Cần thợ cứu hộ mang theo mắt xích nối (khóa xích) hoặc kìm cắt sên để khắc phục tại chỗ."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xeso.pdf (Trang 95)')
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
VALUES ('HD_XESO_WATER_IN_ENGINE_HYDROSTATIC_105', 'MOTORBIKE', 'Sổ tay Xe Số - Động cơ & Ngập nước', 'Xe số chạy qua vùng nước ngập bị chết máy đột ngột, pô xe sặc nước', 'Nước tràn vào ống xả (ống pô), cổ hút gió hoặc lọc gió làm ướt bugi và nước lọt vào buồng đốt động cơ.', 'ENGINE_FAILURE', 'Cứu hộ xe ngập nước / Xả nước buồng đốt và thay nhớt máy', 'NGUY_HIEM', 'TUYỆT ĐỐI KHÔNG CỐ ĐỀ NỔ HOẶC ĐẠP MÁY LẠI NGAY! Nước trong buồng đốt không chịu nén, cố khởi động sẽ làm cong dên, gãy tay biên và vỡ lốc máy.', '["Dắt xe ra khỏi khu vực ngập nước lên chỗ khô ráo và tắt ngay khóa điện.", "Dựng chân chống đứng, nâng đầu xe cao lên để dốc nước chảy ngược ra khỏi ống pô.", "Tháo chụp bugi và dùng tuýp mở bugi tháo bugi ra ngoài. Lau khô sạch đầu bugi.", "Khi bugi đã tháo: Vặn tay ga hết cỡ và dùng cần đạp máy đạp liên tục 15-20 lần để tống toàn bộ nước đọng trong buồng đốt ra ngoài qua lỗ bugi.", "Rút que thăm nhớt kiểm tra: Nếu nhớt máy có màu cà phê sữa hoặc đục trắng, nước đã trộn vào cacte nhớt, tuyệt đối không nổ máy mà phải thay nhớt mới ngay."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - xeso.pdf (Trang 105)')
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
VALUES ('TOYOTA_OIL_PRESSURE_WARNING_LIGHT_50', 'CAR', 'Sổ tay Ô tô Xăng - Đèn cảnh báo táp-lô', 'Đèn cảnh báo áp suất dầu động cơ (hình bình dầu màu đỏ) sáng trên bảng đồng hồ ô tô', 'Áp suất dầu bôi trơn động cơ xuống mức cực kỳ nguy hiểm do thiếu hụt dầu nhớt nghiêm trọng, rò rỉ cacte đáy nhớt hoặc hỏng bơm dầu.', 'ENGINE_FAILURE', 'Cứu hộ kiểm tra dầu máy / Châm nhớt động cơ ô tô lưu động', 'NGUY_HIEM', 'DỪNG XE NGAY LẬP TỨC tại vị trí an toàn và TẮT MÁY! Tiếp tục lái xe khi đèn áp suất dầu sáng sẽ làm cháy bạc biên, lột dên và phá hủy hoàn toàn động cơ trong vòng vài phút.', '["Tấp xe an toàn vào lề đường, kéo phanh tay và tắt động cơ.", "Chờ khoảng 5-10 phút để dầu nhớt chảy hồi về đáy cacte.", "Mở nắp ca-pô, rút que thăm dầu động cơ ra, dùng khăn sạch lau khô rồi cắm ngập lại hết cỡ và rút ra kiểm tra.", "Quan sát vạch dầu trên que thăm: Mức dầu phải nằm giữa hai vạch Low (L) và Full (F). Nếu dưới vạch Low, xe đang cạn kiệt dầu nhớt.", "Kiểm tra dưới gầm xe xem có vết dầu loang lớn rỉ ra từ cacte hoặc lọc dầu không.", "Nếu mức dầu quá thấp, bổ sung ngay dầu động cơ đúng phẩm cấp (0W-20, 5W-30...). Nếu châm dầu mà đèn vẫn sáng, không được nổ máy, gọi xe cứu hộ sàn trượt ngay."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 50)')
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
VALUES ('TOYOTA_BRAKE_SYSTEM_WARNING_LIGHT_50', 'CAR', 'Sổ tay Ô tô Xăng - Đèn cảnh báo táp-lô', 'Đèn cảnh báo hệ thống phanh (hình dấu chấm than trong vòng tròn (!) màu đỏ) sáng khi xe đang chạy', 'Mức dầu phanh trong bình chứa xuống thấp do rò rỉ đường ống dầu phanh, mòn má phanh nghiêm trọng, hoặc quên hạ phanh tay.', 'OTHER', 'Kiểm tra hệ thống phanh / Bổ sung dầu phanh DOT3/DOT4', 'NGUY_HIEM', 'Kiểm tra cần phanh tay trước tiên. Nếu phanh tay đã hạ hết mà đèn vẫn sáng đỏ, hiệu quả phanh có thể bị suy giảm nghiêm trọng hoặc mất phanh bất ngờ!', '["Kiểm tra và hạ hết phanh tay (hoặc phanh đỗ điện tử).", "Nếu đèn vẫn sáng: Giảm tốc độ từ từ, thử đạp chân phanh xem bàn đạp có bị hẫng, mềm sâu hoặc chạm sàn không.", "Tấp xe vào lề đường, mở nắp ca-pô kiểm tra bình dầu phanh (nằm góc trên bên tài xế).", "Kiểm tra xem mức dầu phanh có nằm dưới vạch MIN không. Nếu thiếu dầu phanh, tuyệt đối không tiếp tục lưu thông trên đường dốc hay tốc độ cao.", "Gọi cứu hộ kiểm tra đường ống phanh có bị nứt vỡ hoặc rò rỉ cup-pen phanh tại các bánh xe không."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 50)')
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
VALUES ('TOYOTA_BATTERY_CHARGE_WARNING_LIGHT_50', 'CAR', 'Sổ tay Ô tô Xăng - Đèn cảnh báo táp-lô', 'Đèn cảnh báo hệ thống sạc bình ắc quy (hình bình ắc quy màu đỏ) sáng khi xe đang nổ máy', 'Hệ thống phát điện của ô tô bị lỗi do hỏng máy phát (alternator), đứt dây curoa dẫn động máy phát, hoặc cọc bình ắc quy bị lỏng.', 'DEAD_BATTERY', 'Cứu hộ máy phát điện / Kích bình ắc quy ô tô', 'CANH_BAO', 'Xe đang chạy hoàn toàn bằng năng lượng còn lại trong bình ắc quy. Xe sẽ chết máy đột ngột khi ắc quy cạn kiệt (sau khoảng 15-30 phút).', '["Tắt ngay toàn bộ thiết bị điện tiêu thụ lớn không cần thiết: Tắt máy lạnh điều hòa (A/C), tắt màn hình giải trí, sưởi kính, đèn gầm.", "Chạy xe ngay đến gara sửa chữa gần nhất trước khi bình ắc quy hết sạch điện.", "Đỗ xe kiểm tra dây curoa tổng khoang máy xem có bị đứt, chùng hoặc tuột khỏi puly máy phát không.", "Nếu xe đã chết máy giữa đường, gọi dịch vụ cứu hộ thay thế bình hoặc máy phát."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 50)')
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
VALUES ('TOYOTA_FLAT_TIRE_SPARE_REPLACEMENT_51', 'CAR', 'Sổ tay Ô tô Xăng - Sự cố lốp xe', 'Xe ô tô bị thủng lốp, dính đinh, xịt hơi hoặc nổ lốp trên đường', 'Lốp xe ô tô mất áp suất khí nén do cán đinh, rách thành lốp hoặc hở chân van hơi.', 'FLAT_TIRE', 'Thay lốp dự phòng ô tô lưu động / Vá lốp ô tô tận nơi', 'CANH_BAO', 'Bật đèn cảnh báo nguy hiểm (Hazard), tấp xe vào làn khẩn cấp hoặc nơi bằng phẳng, kéo phanh tay, cài số P (số tự động) hoặc số 1/R (số sàn). Đặt tam giác cảnh báo cách đuôi xe 50-100m.', '["Chặn bánh xe đối diện đường chéo bằng cục chèn bánh hoặc gạch đá để chống trôi xe.", "Lấy lốp dự phòng, con đội kích và cần tháo ốc bánh xe dưới khoang hành lý cốp sau.", "Nới lỏng các đai ốc bánh xe khoảng 1/2 vòng theo thứ tự đối xứng hình sao (CHƯA nâng kích).", "Đặt con đội kích vào đúng ĐIỂM KÊ KÍCH dập nổi dưới lườn xe (phía sau bánh trước hoặc phía trước bánh sau).", "Nâng kích lên cho bánh xe hổng cách mặt đất khoảng 3-5 cm. Tháo rời các đai ốc và tháo lốp xịt ra.", "Lắp lốp dự phòng vào, siết nhẹ các ốc bằng tay, hạ kích xuống đất rồi mới siết chặt cứng các ốc theo hình chữ X/ngôi sao.", "Cất lốp thủng và đồ nghề vào cốp xe. Kiểm tra áp suất lốp dự phòng sớm nhất có thể."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 51-64)')
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
VALUES ('TOYOTA_JUMP_START_DEAD_BATTERY_60', 'CAR', 'Sổ tay Ô tô Xăng - Hệ thống khởi động', 'Xe ô tô không đề được, xoay chìa khóa hoặc bấm nút Start có tiếng tạch tạch rồi tắt lịm', 'Bình ắc quy 12V của ô tô bị cạn điện (do quên tắt đèn pha qua đêm, bình quá niên hạn sử dụng hoặc xe để lâu ngày không nổ máy).', 'DEAD_BATTERY', 'Cứu hộ kích bình ắc quy ô tô 12V lưu động / Thay ắc quy ô tô tận nơi', 'CANH_BAO', 'Tuân thủ nghiêm ngặt quy trình đấu nối dây câu bình: ĐỎ vào DƯƠNG, ĐEN vào MASS. Đấu nhầm cực sẽ gây nổ bình và cháy hộp đen điều khiển ECU xe!', '["Đưa xe hỗ trợ đến gần xe hết bình sao cho dây câu chạm tới hai khoang máy (hai xe không chạm vào nhau). Tắt máy cả hai xe.", "Bước 1 (Dây ĐỎ): Kẹp một đầu dây ĐỎ vào cọc DƯƠNG (+) của bình ắc quy xe bị hết điện.", "Bước 2 (Dây ĐỎ): Kẹp đầu dây ĐỎ còn lại vào cọc DƯƠNG (+) của bình ắc quy xe cứu hộ.", "Bước 3 (Dây ĐEN): Kẹp một đầu dây ĐEN vào cọc ÂM (-) của bình ắc quy xe cứu hộ.", "Bước 4 (Dây ĐEN): Kẹp đầu dây ĐEN còn lại vào một khối kim loại không sơn trên lốc máy xe hết bình (KHÔNG kẹp trực tiếp vào cọc âm xe hết bình để tránh tia lửa điện).", "Nổ máy xe cứu hộ và đạp nhẹ chân ga khoảng 2000 vòng/phút trong 3-5 phút để nạp điện.", "Khởi động xe bị chết máy. Sau khi máy nổ, tháo dây câu theo THỨ TỰ NGƯỢC LẠI (Đen mass -> Đen âm -> Đỏ dương cứu hộ -> Đỏ dương xe hết)."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 60)')
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
VALUES ('VINFAST_VF7_EV_EMERGENCY_MANUAL_TAILGATE_23', 'CAR', 'Sổ tay Xe Ô Tô Điện - Cứu hộ khẩn cấp', 'Xe ô tô điện hết sạch điện ắc quy 12V, màn hình tắt tối đen, cửa hậu và cốp xe không thể mở bằng điện', 'Ắc quy điện áp thấp 12V bị kiệt hoàn toàn khiến hệ thống khóa cửa điện tử và mô-tơ mở cốp sau không hoạt động.', 'DEAD_BATTERY', 'Kích bình ắc quy 12V xe điện / Mở cốp xe điện khẩn cấp', 'CANH_BAO', 'Xe ô tô điện luôn có cơ chế nhả chốt cơ khí khẩn cấp từ bên trong khoang hành lý.', '["Gập hàng ghế sau xuống để tiếp cận từ khoang cabin vào phía sau cốp xe.", "Tìm nắp che cơ cấu nhả an toàn ở mép phía dưới của cửa cốp sau.", "Dùng tay cạy mở nắp che bảo vệ hình chữ nhật nhỏ.", "Dùng ngón tay hoặc tua vít ấn gạt cần gạt cơ khí xuống phía dưới để nhả ngàm khóa cửa cốp.", "Đẩy cửa cốp sau ra ngoài bằng tay để mở cốp lấy đồ đạc hoặc dụng cụ kích bình 12V dưới nắp ca-pô."]'::jsonb, 'Sách Hướng Dẫn Cứu Hộ Khẩn Cấp VinFast VF 7 EV (Trang 23)')
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
VALUES ('VINFAST_EV_HIGH_VOLTAGE_SAFETY_DISCONNECT_29', 'CAR', 'Sổ tay Xe Ô Tô Điện - An toàn điện cao áp', 'Xe ô tô điện gặp tai nạn, ngập nước hoặc cần cứu hộ kỹ thuật trên đường', 'Hệ thống điện cao áp (High Voltage 400V) trên xe điện tiềm ẩn nguy cơ phóng điện và giật điện cực kỳ nguy hiểm nếu không được cách ly đúng quy trình.', 'ACCIDENT', 'Cứu hộ xe điện chuyên dụng / Ngắt nguồn cao áp 400V', 'NGUY_HIEM', 'TUYỆT ĐỐI KHÔNG CHẠM VÀO, CẮT HOẶC KÉO CÁC DÂY CÁP MÀU CAM! Toàn bộ dây cáp điện cao áp trên xe điện đều có lớp bọc nhận diện màu cam.', '["Luôn mặc trang bị bảo hộ cách điện chuyên dụng (PPE) khi tiếp cận xe điện bị biến dạng.", "Tìm vòng cắt khẩn cấp (Emergency Cut Loop) có nhãn màu vàng trong khoang trước dưới nắp ca-pô.", "Dùng kìm cách điện cắt đứt bộ dây tại nhãn màu vàng để ngắt nguồn điều khiển 12V cấp cho rơ-le pin cao áp.", "Sau khi cắt vòng khẩn cấp, hệ thống điện cao áp 400V sẽ bị ngắt hoàn toàn khỏi các mô-tơ và thiết bị trên xe.", "Khi nâng xe, TUYỆT ĐỐI KHÔNG kê kích vào tấm sàn chứa pin cao áp dưới gầm xe để tránh làm thủng cell pin gây cháy nổ."]'::jsonb, 'Sách Hướng Dẫn Cứu Hộ Khẩn Cấp VinFast VF 7 EV (Trang 24, 29)')
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
VALUES ('VINFAST_EV_BATTERY_FIRE_RESPONSE_31', 'CAR', 'Sổ tay Xe Ô Tô Điện - Phòng cháy chữa cháy', 'Pin cao áp xe ô tô điện bốc khói, phát tiếng xì lớn hoặc bốc cháy dưới gầm xe', 'Hiện tượng thoát nhiệt (Thermal Runaway) của các cell pin Lithium-ion do va đập gầm làm móp cell pin hoặc chập mạch bên trong khối pin.', 'ACCIDENT', 'Cứu hỏa khẩn cấp / Cách ly phương tiện xe điện', 'NGUY_HIEM', 'SƠ TÁN NGAY LẬP TỨC toàn bộ người ra xa xe tối thiểu 30-50m. Khói pin Li-ion có chứa khí độc (HF, CO, CO2). Gọi ngay 114!', '["Sơ tán tất cả hành khách ra khỏi xe và giữ khoảng cách an toàn, tránh hít phải khói độc.", "Cần một lượng nước CỰC KỲ LỚN (hàng nghìn lít nước) để làm mát liên tục khối pin và dập tắt phản ứng thoát nhiệt.", "Bình chữa cháy mini trên xe chỉ có tác dụng dập đám cháy nội thất phụ trợ, không thể dập tắt phản ứng cháy bên trong khối pin.", "CẢNH BÁO BỐC CHÁY LẠI: Pin xe điện có thể bốc cháy trở lại sau nhiều giờ kể cả khi lửa đã tắt. Phải cách ly xe ngoài trời cách xa các tòa nhà và xe khác ít nhất 15m trong 48 giờ."]'::jsonb, 'Sách Hướng Dẫn Cứu Hộ Khẩn Cấp VinFast VF 7 EV (Trang 31)')
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
VALUES ('VINFAST_EV_SUBMERSION_FLOOD_SAFETY_32', 'CAR', 'Sổ tay Xe Ô Tô Điện - Ngập nước', 'Xe ô tô điện / xe máy điện bị ngập trong nước lũ hoặc mắc kẹt tại vùng ngập sâu', 'Xe ngập nước gây nguy cơ rò rỉ điện hoặc hư hại các cảm biến, hộp điều khiển MCU và cổng sạc.', 'ACCIDENT', 'Cứu hộ cẩu kéo xe ngập nước / Trục vớt xe điện', 'NGUY_HIEM', 'Xe điện thông thường đạt chuẩn chống nước IP67/IP68 không truyền điện giật ra toàn bộ vũng nước, nhưng nếu xe bị đâm va thủng vỏ pin trước khi chìm, nguy cơ giật điện sẽ tăng cao.', '["Tắt xe ngay lập tức nếu còn ngồi trong xe, tháo dây an toàn và mở cửa thoát ra ngoài vùng ngập an toàn.", "Kéo xe ra khỏi nước bằng xe kéo cứu hộ chuyên dụng có tời kéo sàn trượt.", "Sau khi xe lên bờ khô ráo, lập tức ngắt cọc âm bình ắc quy 12V hoặc cắt vòng cắt khẩn cấp của xe điện.", "TUYỆT ĐỐI KHÔNG cắm sạc hoặc cố bật nguồn xe cho đến khi được kỹ thuật viên chuyên trách kiểm tra sấy khô toàn bộ hệ thống giắc nối cao áp."]'::jsonb, 'Sách Hướng Dẫn Cứu Hộ Khẩn Cấp VinFast VF 7 EV (Trang 32)')
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
VALUES ('VINFAST_EBIKE_THROTTLE_BRAKE_CUTOFF_ERROR_25', 'MOTORBIKE', 'Sổ tay Xe Máy Điện - Hệ thống truyền động điện', 'Xe máy điện bật khóa màn hình vẫn sáng nhưng vặn ga xe không chạy, bánh xe không quay', 'Công tắc ngắt phanh điện bị kẹt (xe hiểu nhầm đang bóp phanh nên tự ngắt điện mô-tơ), lỗi tay ga điện tử hoặc rơ-le bảo vệ pin LFP ngắt xả.', 'ENGINE_FAILURE', 'Cứu hộ sửa xe máy điện lưu động / Thay tay ga, công tắc phanh', 'CANH_BAO', 'Kiểm tra xem tay phanh có bị kẹt không hồi hết ra không. Xe máy điện có công tắc ngắt động cơ tích hợp ngay trong cùm phanh.', '["Dùng tay đẩy mạnh cả hai tay phanh (trái và phải) về phía trước để đảm bảo công tắc ngắt điện ở tay phanh đã nhả hoàn toàn.", "Kiểm tra chân chống nghiêng: Gạt chân chống nghiêng lên hoàn toàn (xe máy điện có cảm biến chân chống ngắt ga).", "Quan sát biểu tượng chữ ''READY'' hoặc đèn báo lỗi trên mặt đồng hồ: Nếu chữ READY không sáng, xe chưa sẵn sàng nhận lệnh ga.", "Tắt chìa khóa xe, mở yên xe tắt át-tô-mát (aptomat) tổng của pin trong 30 giây rồi bật lại để khởi động lại bộ điều khiển MCU.", "Nếu pin bị tụt áp dưới mức bảo vệ hoặc cắm sạc báo lỗi đèn đỏ, cần thợ cứu hộ kích pin phục hồi."]'::jsonb, 'Sách Hướng Dẫn Sử Dụng Xe Máy Điện VinFast (Trang 25)')
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
VALUES ('MOTO_STATOR_CHARGING', 'MOTORBIKE', 'Hệ thống sạc & Mâm lửa xe máy', 'Vừa thay bình ắc quy mới chạy được 2-3 ngày lại cạn kiệt điện dắt bộ; đèn pha xe lúc sáng chói lúc tối mờ theo tay ga, bấm còi yếu ớt, xe chết máy giữa đường', 'Cháy cuộn điện mâm lửa (Stator coil) hoặc hỏng cục sạc chỉnh lưu (Rectifier/Regulator), dẫn đến ắc quy không được nạp điện khi động cơ nổ', 'DEAD_BATTERY', 'Cứu hộ kích bình nổ tạm thời & Thay sạc / Quấn mâm lửa phát điện', 'CANH_BAO', 'Không nên cố thay thêm bình mới vì sẽ tiếp tục bị rút cạn điện phá hỏng bình. Cần đo điện áp sạc tại 2 cọc bình khi vặn ga (chuẩn từ 13.5V - 14.5V).', '["Dùng đồng hồ VOM đo điện áp 2 cọc ắc quy khi xe nổ máy: nếu không tăng lên trên 13V khi kéo ga thì hệ thống sạc đã hỏng.", "Rút giắc mâm lửa đo điện trở 3 pha cuộn phát điện (nếu có pha thông mạch ra mát hoặc đứt là cuộn lửa đã cháy).", "Kiểm tra cục sạc xem có bị nóng ran bất thường hoặc phù nứt vỏ nhựa không.", "Cứu hộ tạm thời kích nổ để chạy về tiệm sửa xe hoặc gọi thợ mang sạc/cuộn điện đến thay thế."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('MOTO_BRAKE_CALIPER_DRAG', 'MOTORBIKE', 'Hệ thống Phanh đĩa xe máy', 'Bánh xe quay rất nặng, dắt xe không nổi, đĩa phanh nóng rực bốc khói hoặc kêu két két liên tục khi chạy, bóp phanh trước hoặc sau bị sượng cứng', 'Kẹt piston heo dầu phanh đĩa (Brake Caliper Drag) do đất cát bám bẩn làm kẹt phốt cao su chắn bụi, rỉ sét piston hoặc nghẹt lỗ hồi dầu ở tay thắng trên', 'OTHER', 'Cứu hộ xả kẹt phanh đĩa / Vệ sinh bảo dưỡng heo dầu lưu động', 'NGUY_HIEM', 'DỪNG XE NGAY LẬP TỨC. Tuyệt đối không cố chạy vì đĩa phanh nóng đỏ có thể làm sôi dầu phanh gây mất phanh hoàn toàn, nổ lốp hoặc cong vênh đĩa phanh.', '["Dựng chân chống đứng, dùng tay lắc nhẹ heo dầu xem có trượt nhẹ trên 2 ắc trượt không.", "Dùng cờ-lê 8 hoặc 10 nới lỏng ốc xả gió dầu phanh trên heo dầu một chút để xả bớt áp lực dầu đang bó cứng piston (nhớ lau sạch dầu phanh tránh rớt vào sơn xe).", "Dùng tuốc-nơ-vít dẹp cạy nhẹ má phanh lùi về để bánh xe quay tự do.", "Gọi cứu hộ tháo heo dầu vệ sinh piston, đánh bóng rỉ sét và thay phốt cao su cup-pen mới."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('MOTO_CLUTCH_SLIPPAGE', 'MOTORBIKE', 'Bộ ly hợp / Bộ nồi xe số & xe côn tay', 'Vào số nhả côn vít ga máy rú to gầm rú nhưng xe tăng tốc rất chậm, chở 2 người hoặc lên dốc xe bị ì không bò lên nổi, có mùi khét lẹt quanh lốc máy', 'Cháy lá bố nồi / Trượt côn (Clutch Slippage) do mòn hết mặt ma sát lá bố, chai lá thép hoặc lò xo ép côn bị nhão, chỉnh dây côn quá căng không có độ rơ', 'ENGINE_FAILURE', 'Thay lá bố nồi / Canh chỉnh côn xe máy lưu động', 'CANH_BAO', 'Hạn chế ép số cao vượt dốc gắt. Với xe côn tay, kiểm tra ngay ốc chỉnh dây côn xem có độ rơ tự do ở tay côn khoảng 2 - 3mm hay không.', '["Kiểm tra độ rơ dây côn: nếu tay côn căng cứng không có khoảng rơ tự do, nhả ốc tăng côn cho trùng bớt lại.", "Với xe số tự động (Wave, Sirius), nới ốc khóa 14 ở lốc nồi bên phải, dùng tuốc-nơ-vít vặn ốc côn vào chạm nhẹ rồi nhả ra 1/8 - 1/4 vòng, siết chặt ốc khóa lại.", "Nếu chỉnh độ rơ mà xe vẫn bị trượt máy gầm không chạy, lá bố đã cháy rụi cần gọi thợ cứu hộ thay trọn bộ lá bố nồi mới."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('MOTO_STEERING_HEAD_BEARING', 'MOTORBIKE', 'Hệ thống Lái & Giảm xóc xe máy', 'Tay lái bị sượng cứng, liệng xe khó giữ thăng bằng, khi đi qua ổ gà phát ra tiếng kêu cụp cụp rất to ở cụm đầu xe, xì dầu phuộc trước bám đen ty phuộc', 'Bể bi chén cổ / Sượng cổ phốt (Steering Head Bearing) hoặc xì dầu rách phốt phuộc nhún trước, ty phuộc bị trầy xước mất áp lực dầu giảm chấn', 'OTHER', 'Thay chén cổ bi đũa / Phục hồi thay phốt dầu phuộc trước', 'CANH_BAO', 'Giảm tốc độ, tránh vào cua gấp vì cổ xe sượng cứng rất dễ khiến xe bị quẫy đuôi hoặc trượt ngã mất lái.', '["Dựng chống đứng xe, nhờ người đè đuôi xe xuống để bánh trước hổng khỏi mặt đất.", "Dùng tay xoay ghi-đông nhẹ nhàng qua lại hai bên: nếu có nấc khựng ở vị trí chính giữa hoặc sượng lạo xạo là bi chén cổ đã lún nứt.", "Lấy hai tay nắm vào đuôi phuộc trước giật mạnh tới lui: nếu có độ rơ lỏng thì ốc cổ phốt đã lỏng hoặc chén cổ đã mòn hết.", "Kiểm tra ty phuộc trước: nếu thấy dầu thủy lực xì ướt bám đất cát đen nhèm thì cần thay phốt dầu và châm lại dầu phuộc."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('MOTO_CABLE_SNAP', 'MOTORBIKE', 'Dây điều khiển (Dây côn / Dây ga xe máy)', 'Bóp tay côn nhẹ bẫng xe giật bắn tắt máy không ngắt số được; hoặc vặn tay ga bị tuột lỏng máy giữ nguyên garanti xe không tăng ga được', 'Đứt dây côn tay hoặc đứt dây ga (Cable Snap) do sợi cáp thép bị tưa rỉ sét lâu ngày bên trong vỏ ruột gà', 'OTHER', 'Cứu hộ thay dây côn / dây ga xe máy tận nơi', 'CANH_BAO', 'Nếu đứt dây côn khi đang chạy: đạp nhẹ số về N (Mo) hoặc giữ vững phanh giảm tốc tấp vào lề an toàn. Tuyệt đối không vừa chạy vừa đạp số sống nếu không có kinh nghiệm vì dễ vỡ bánh răng hộp số.', '["Kiểm tra đầu dây cáp tại cùm tay côn hoặc cùm tay ga trên ghi-đông xem cùi chì có bị tuột khỏi rãnh hay đứt hẳn lõi cáp.", "Xử lý khẩn cấp khi đứt dây ga: có thể vặn ốc garanti (ốc gió/xăng) trên bộ chế hòa khí lên cao hơn một chút để xe tự bò chậm về tiệm sửa gần nhất.", "Xử lý khi đứt dây côn: đẩy xe cho có trớn rồi vào số 1 hoặc số 2 để xe lăn bánh, khi dừng đèn đỏ gảy số về N trước khi dừng hẳn.", "Gọi cứu hộ thay ruột cáp hoặc thay dây côn/dây ga mới chính hãng."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('MOTO_CONTAMINATED_GASOLINE', 'MOTORBIKE', 'Hệ thống Nhiên liệu Xăng xe máy', 'Vừa rời cây xăng đi được 200-500m thì xe bị hụt hơi, giật cục rồi tắt ngúm, không thể đề nổ lại, tháo bugi thấy ướt nhẹp', 'Đổ nhầm xăng nhiễm nước / Xăng kém chất lượng lẫn tạp chất, nước lắng đọng dưới đáy bình xăng đi vào kim phun FI hoặc chén xăng bộ chế hòa khí làm mất khả năng đánh lửa', 'ENGINE_FAILURE', 'Cứu hộ súc rửa bình xăng / Vệ sinh kim phun bugi lưu động', 'KHAN_CAP', 'Dừng đề nổ liên tục để tránh làm kiệt bình ắc quy và cháy củ đề. Cần xả sạch toàn bộ lượng xăng pha nước ra ngoài trước khi đổ xăng mới.', '["Với xe số bình xăng con: dùng tuốc-nơ-vít nới ốc xả xăng cặn dưới đáy chén xăng (bình xăng con) cho xăng và nước chảy hết ra ngoài qua ống xả thừa.", "Với xe ga phun xăng điện tử Fi: cần rút ống dẫn xăng từ bơm xăng ra, bật khóa điện cho bơm đẩy lượng xăng đọng trong đường ống ra chai nhựa kiểm tra (nếu thấy tách lớp nước thì bình xăng đã nhiễm nước nặng).", "Hút sạch xăng trong bình, súc khô bình xăng và đổ xăng A95 chuẩn từ cây xăng uy tín.", "Tháo bugi ra lau khô đầu điện cực muội ướt, đạp/đề xả buồng đốt vài lần rồi lắp lại nổ máy."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('MOTO_VESPA_CAM_CHAIN_LOW_OIL', 'MOTORBIKE', 'Động cơ & Dầu nhớt xe tay ga cao cấp (Vespa / Piaggio / SH)', 'Xe kêu lạch cạch rè rè ở đầu quy-lát, tiếng xích cam kêu gõ kim loại rất to, đèn báo áp suất nhớt (hình bình dầu màu đỏ) nháy đỏ khi máy nóng', 'Hụt cạn dầu nhớt bôi trơn động cơ, tăng cam tự động bị kẹt hoặc chùng xích cam quá mức do xe ăn nhớt, rò rỉ phốt nhớt lốc máy', 'ENGINE_FAILURE', 'Châm thêm nhớt khẩn cấp / Cứu hộ kiểm tra tăng cam xích cam', 'NGUY_HIEM', 'TẮT MÁY NGAY. Chạy xe trong tình trạng cạn nhớt sẽ gây lột dên, bó kẹt piston xi-lanh và phá hủy toàn bộ đầu bò quy-lát, chi phí đại tu máy rất tốn kém.', '["Dựng chống đứng xe trên nền phẳng, tắt máy đợi 3 - 5 phút cho nhớt hồi về đáy các-te.", "Rút que thăm nhớt ra lau sạch bằng khăn giấy, cắm lại không vặn ren rồi rút ra kiểm tra: nếu que thăm khô cong không có giọt nhớt nào thì xe đã cạn nhớt.", "Châm ngay từ 0.8L - 1L dầu nhớt xe máy 4 thì đúng phẩm cấp vào động cơ.", "Khởi động lại và lắng nghe tiếng máy: nếu êm trở lại thì tiếp tục di chuyển; nếu vẫn gõ cọc cọc lớn thì xích cam/cò mổ đã hỏng, cần gọi xe cứu hộ chở về xưởng."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('CAR_AC_FAILURE', 'CAR', 'Hệ thống Điều hòa không khí ô tô (A/C)', 'Điều hòa ô tô chỉ thổi ra gió nóng hoặc lúc mát lúc không; bật nút A/C máy gầm và có tiếng rít lớn từ khoang động cơ, kính xe bị hấp hơi mờ mịt', 'Sự cố hệ thống điều hòa ô tô: Rò rỉ xì gas lạnh, hỏng lốc nén điều hòa (A/C Compressor), chết ly hợp từ đầu lốc nén hoặc lọc gió điều hòa bị tắc nghẹt bùn bụi', 'OTHER', 'Kiểm tra đo áp suất gas lạnh / Vệ sinh nạp gas điều hòa ô tô', 'CANH_BAO', 'Hạ hé 4 cửa kính xuống 2-3 cm để lưu thông không khí trong khoang xe tránh ngột ngạt. Bật chế độ lấy gió ngoài và tắt nút A/C để tránh quá tải động cơ.', '["Kiểm tra nút A/C trên bảng điều khiển đã bật sáng chưa và chỉnh mức nhiệt độ lạnh nhất (Lo).", "Mở nắp capo quan sát mặt hít đầu lốc lạnh: khi bật A/C mặt hít có hít quay cùng puly không (nếu không quay là đứt cuộn từ hoặc hết sạch gas rơ-le áp suất ngắt bảo vệ).", "Rút lọc gió điều hòa trong hộc để găng tay ghế phụ ra kiểm tra xem có bị bụi bẩn đóng kín không.", "Đưa xe đến gara chuyên điện lạnh ô tô kiểm tra đồng hồ đo áp suất cao áp / hạ áp và nạp gas R134a hoặc R1234yf."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('CAR_STEERING_WOBBLE_ALIGNMENT', 'CAR', 'Hệ thống Lái & Thước lái ô tô', 'Vô lăng rung bần bật khi xe chạy tốc độ 80 - 100 km/h trên cao tốc; hoặc buông lỏng tay lái xe tự động nhao lái lệch hẳn sang một bên, lốp xe mòn vẹt một mép', 'Mất cân bằng động bánh xe (rơi chì cân mâm), lốp bị chửa/méo hoặc sai lệch góc đặt bánh xe / góc chụm độ chụm (Wheel Alignment & Camber/Toe)', 'OTHER', 'Cân bằng động bánh xe / Cân chỉnh thước lái góc đặt bánh xe', 'CANH_BAO', 'Giảm tốc độ dưới 70 km/h để vô lăng hết rung lắc. Giữ vững hai tay trên vô lăng khi chạy trên đường cao tốc.', '["Quan sát bề mặt lốp xe trước xem có bị phồng (chửa lốp), dính đinh to hay bị méo mâm do sụp ổ gà không.", "Kiểm tra áp suất lốp cả 4 bánh đã đều nhau theo bảng thông số trên cột chữ B cửa lái chưa.", "Nếu xe nhao lái sang phải/trái liên tục, đưa xe lên máy căn chỉnh góc lái 3D (Hunter) để chỉnh lại độ chụm rotuyn lái.", "Nếu xe chỉ rung vô lăng ở dải tốc độ nhất định (80-100km/h), tiến hành tháo 2 bánh trước bấm chì cân bằng động lại mâm lốp."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('CAR_EPB_STUCK', 'CAR', 'Hệ thống Phanh tay điện tử (EPB)', 'Bấm nút nhả phanh tay điện tử (P) nhưng phanh sau không nhả, màn hình taplo báo lỗi Parking Brake Malfunction / Chữ P vàng nhấp nháy, xe không lăn bánh được', 'Kẹt mô-tơ phanh tay điện tử (Electronic Parking Brake - EPB) do kẹt ngàm cơ khí, đứt dây giắc điện mô-tơ sau ngập nước hoặc bình ắc quy bị sụt áp dưới 11.5V', 'OTHER', 'Cứu hộ mở khóa phanh tay điện tử khẩn cấp / Xóa lỗi EPB', 'CANH_BAO', 'Tuyệt đối không cố đạp ga lết bánh xe vì sẽ làm cháy bố phanh, mòn vẹt lốp và vỡ bánh răng mô-tơ phanh điện tử.', '["Kiểm tra ắc quy: thử tắt máy, bấm nổ máy lại và đạp mạnh chân phanh rồi nhấn giữ nút gạt phanh tay xuống 5 giây.", "Thử tháo cọc âm (-) bình ắc quy trong 3 phút rồi lắp lại để reset ECU điều khiển phanh tay.", "Mở cốp sau tìm dây cáp nhả phanh tay khẩn cấp cơ khí (trên một số dòng xe châu Âu/Mỹ) hoặc dùng lục giác tháo mô-tơ vặn lùi ty phanh bằng tay.", "Nếu không tự xử lý được, gọi cứu hộ mang máy chẩn đoán OBD-II kích hoạt lệnh Service Mode / Brake Pad Replacement Mode để ép mô-tơ nhả phanh."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('CAR_MISFUELING_EMERGENCY', 'CAR', 'Sự cố Nhiên liệu Khẩn cấp (Đổ nhầm nhiên liệu)', 'Nhân viên cây xăng bơm nhầm Xăng vào xe Máy Dầu Diesel (Ranger, Everest, SantaFe, Fortuner, Tucson Diesel) hoặc bơm Dầu vào xe máy Xăng', 'Đổ nhầm nhiên liệu (Misfueling) cực kỳ nguy cấp. Xăng làm mất tính bôi trơn trong dầu Diesel gây xước mòn phá hủy bơm cao áp và kim phun Common Rail áp suất hàng ngàn bar', 'OTHER', 'Cứu hộ xe cẩu kéo / Hút cạn bình súc rửa toàn bộ hệ thống nhiên liệu', 'KHAN_CAP', 'TUYỆT ĐỐI KHÔNG ĐƯỢC BẬT CHÌA KHÓA VÀ KHÔNG ĐỀ NỔ ĐỘNG CƠ! Bật chìa khóa sẽ làm bơm tiếp vận đẩy nhiên liệu bẩn vào dàn kim phun đắt đỏ hàng trăm triệu đồng.', '["Yêu cầu nhân viên cây xăng ký biên bản xác nhận sự cố đổ nhầm nhiên liệu.", "Giữ nguyên xe ở vị trí tắt máy hoàn toàn, chuyển cần số về N để đẩy xe gọn vào lề cây xăng.", "Gọi ngay xe cứu hộ sàn trượt chở xe về gara uy tín hoặc đại lý chính hãng.", "Quy trình tại gara: Hạ bình nhiên liệu hoặc cắm máy hút cạn 100% nhiên liệu nhầm, thay mới toàn bộ lọc nhiên liệu, súc rửa đường ống và đổ đầy nhiên liệu chuẩn trước khi khởi động lại."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('CAR_SMARTKEY_NOT_DETECTED', 'CAR', 'Hệ thống Khóa thông minh (Smart Key ô tô)', 'Bấm nút mở cửa trên tay nắm không phản hồi, vào xe bấm nút Start/Stop màn hình hiện cảnh báo Key Not Detected / No Key Found xe không chịu khởi động', 'Chìa khóa thông minh Smart Key bị hết pin (pin CR2032/CR2025 cạn), chìa bị rơi vào nước ẩm mạch hoặc xe đang đỗ ở khu vực bị nhiễu sóng từ trường cao tần', 'OTHER', 'Hướng dẫn khởi động khẩn cấp / Thay pin remote Smart Key tận nơi', 'CHU_Y', 'Bình tĩnh, xe luôn có cơ chế nổ máy cơ học/chạm từ khẩn cấp dù remote hết sạch pin hoàn toàn.', '["Rút chìa khóa cơ dự phòng giấu bên trong remote Smart Key để cắm mở cửa xe lái.", "Tìm vị trí cảm ứng khẩn cấp (Backup Slot): Lấy chính đầu remote Smart Key (nơi có logo xe) dí sát trực tiếp và ấn ngập vào nút đề Start/Stop Engine trong khi đạp phanh.", "Với xe Ford/Mazda/Hyundai: một số xe có khe cắm chìa khóa trong hộc tỳ tay trung tâm hoặc dưới bảng điều khiển, cắm chìa vào khe đó rồi ấn Start/Stop.", "Sau khi xe nổ máy, ghé tiệm tạp hóa mua pin cúc áo đúng mã (thường là Maxell/Panasonic CR2032) thay vào remote."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('CAR_SERPENTINE_BELT_SNAP', 'CAR', 'Dây curoa tổng khoang động cơ (Serpentine Belt)', 'Xe đang chạy nghe tiếng ''bạch bạch'' quất mạnh trong khoang máy, vô lăng lái bỗng nặng trịch như khúc gỗ, đèn báo bình ắc quy màu đỏ sáng lên, điều hòa mất lạnh hoàn toàn', 'Đứt hoặc tuột dây curoa tổng khoang máy (Serpentine Accessory Belt) làm dừng đồng loạt puly máy phát điện, bơm trợ lực lái thủy lực, lốc điều hòa và bơm nước làm mát', 'ENGINE_FAILURE', 'Cứu hộ thay dây curoa tổng / Cẩu xe ô tô về xưởng', 'NGUY_HIEM', 'TẤP XE VÀO LỀ VÀ TẮT MÁY NGAY! Đứt curoa tổng khiến bơm nước làm mát ngừng quay, động cơ sẽ bị sôi nước quá nhiệt phá hủy ron quy-lát trong vòng 3 - 5 phút.', '["Gạt xi-nhan, dùng hai tay ghì chặt vô lăng (lúc này rất nặng vì mất trợ lực) đưa xe vào lề an toàn.", "Mở nắp capo quan sát rãnh puly phía trước động cơ: kiểm tra dây cao su curoa có bị đứt văng ra ngoài hoặc quấn vào cánh quạt không.", "Kiểm tra các puly tăng đưa, puly tỳ curoa xem có bị kẹt cứng bạc đạn không.", "Gọi cứu hộ kéo xe về xưởng thay dây curoa mới và kiểm tra bạc đạn tăng tỳ."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('CAR_RADIATOR_FAN_FAILURE', 'CAR', 'Hệ thống Làm mát & Quạt két nước ô tô', 'Chạy trên cao tốc thì nhiệt độ bình thường, nhưng hễ vào nội thành kẹt xe hoặc dừng đèn đỏ là kim nhiệt độ vọt lên mức đỏ High, nước mát sôi ùng ục trào ra bình phụ', 'Hỏng mô-tơ quạt két nước làm mát (Radiator Cooling Fan), cháy rơ-le / đứt cầu chì quạt tản nhiệt hoặc hỏng trở quạt làm quạt không quay ở tốc độ thấp', 'ENGINE_FAILURE', 'Cứu hộ kiểm tra điện quạt làm mát / Sửa chữa hệ thống giải nhiệt', 'KHAN_CAP', 'TẮT MÁY NGAY. Khi kim nhiệt chạm vạch đỏ, nếu cố chạy máy sẽ bị cong vênh nắp máy và thổi ron quy-lát. TUYỆT ĐỐI KHÔNG MỞ NẮP KÉT NƯỚC KHI ĐANG NÓNG vì nước sôi sẽ bắn gây bỏng nặng!', '["Bật sưởi tối đa (Heat + quạt gió cực đại) để phụ tản nhiệt cho động cơ trong lúc tìm chỗ đậu an toàn.", "Tắt máy, mở nắp capo quan sát quạt két nước: khi máy đang nóng quạt có quay tít không (nếu đứng im là quạt đã chết điện hoặc cháy chổi than).", "Mở hộp cầu chì khoang máy, kiểm tra cầu chì ký hiệu RAD FAN hoặc FAN RELAY xem có bị đứt cháy cầu chì không.", "Chờ máy nguội hẳn (ít nhất 30 phút), kiểm tra bổ sung nước làm mát vào bình nước phụ rồi gọi cứu hộ hỗ trợ."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('CAR_CLUTCH_SLAVE_CYLINDER', 'CAR', 'Bộ ly hợp xe số sàn ô tô (Heo côn / Xylanh côn)', 'Đạp chân côn bị lún sát sàn không nảy lên, chân côn nhẹ hẫng không thể vào số 1 hay số lùi để di chuyển xe, có vệt dầu phanh rỉ dưới gầm hộp số', 'Hỏng xylanh côn (heo côn cái hoặc heo côn con - Clutch Slave/Master Cylinder), rách cup-pen cao su làm xì dầu thủy lực mất áp suất cắt ly hợp', 'ENGINE_FAILURE', 'Cứu hộ xả gió dầu côn / Thay thế heo côn ô tô số sàn', 'CANH_BAO', 'Không cố dùng sức giật gãy cần số. Nếu đang trên đường, bật đèn khẩn cấp hazard và tấp xe vào lề.', '["Dùng mũi giày móc bàn đạp côn nảy lên lại và thử nhồi bàn đạp côn liên tục 10-15 lần xem có hồi lại áp lực tạm thời không.", "Mở nắp bình dầu phanh/dầu côn trong khoang máy kiểm tra mực dầu có bị tụt cạn dưới mức MIN không.", "Cách khởi động xe khẩn cấp số sàn: tắt máy, gài sẵn số 2, đề nổ máy (xe sẽ hơi giật chồm lên) rồi mớm ga chạy thẳng về gara gần nhất.", "Gọi thợ cứu hộ thay cup-pen heo côn hoặc thay cụm xylanh ly hợp mới và xả e dầu côn."]'::jsonb, 'Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam')
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
VALUES ('MB_BATTERY_01', 'MOTORBIKE', 'Ắc quy & Điện khởi động', 'Bật khóa Smartkey/chìa cơ đèn taplo mờ hoặc không sáng, bấm còi kêu lí nhí hoặc không kêu, bấm đề chỉ nghe tiếng tạch tạch nhỏ dưới gầm cốp rồi lịm hẳn', 'Ắc quy bị cạn kiệt điện năng (dưới 10.5V) hoặc hỏng bình, cọc bình bị lỏng/oxy hóa', 'DEAD_BATTERY', 'Cứu hộ kích bình ắc quy hoặc thay mới ắc quy xe máy tận nơi', 'CANH_BAO', 'Tắt khóa điện ngay, không cố bấm nút đề liên tục nhiều lần vì sẽ làm cháy rơ-le đề hoặc hỏng củ đề.', '["Dựng chân chống đứng, kiểm tra chìa khóa đã vặn đúng nấc ON và gạt chân chống nghiêng lên", "Nếu xe có cần đạp khởi động (xe số/xe ga đời cũ): Bật khóa ON và dùng cần đạp dứt khoát 3-5 lần để nổ máy tạm thời", "Mở nắp cốp kiểm tra 2 cọc bình ắc quy xem có bị lỏng bu lông hoặc bám muối xanh/trắng không", "Gọi đội cứu hộ lưu động mang bộ kích ắc quy 12V hoặc thay bình GS/Globe mới tận nơi"]'::jsonb, 'Sổ tay kỹ thuật bảo dưỡng Honda & Yamaha Việt Nam')
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
VALUES ('MB_BATTERY_02', 'MOTORBIKE', 'Ắc quy & Khóa Smartkey', 'Xe dùng khóa Smartkey (SH, Vision, Lead, AirBlade) đến gần xe ấn núm khóa không có tín hiệu, đèn ổ khóa không sáng, xe không nhận remote', 'Remote Smartkey hết pin CR2032 hoặc bình ắc quy xe bị kiệt do quên vặn núm về OFF', 'DEAD_BATTERY', 'Thay pin Smartkey hoặc kích bình ắc quy xe máy lưu động', 'NHE', 'Thử bấm nút hình chìa khóa trên remote xem đèn LED trên remote sáng đỏ hay xanh.', '["Bấm giữ nút chìa khóa trên remote 2 giây đến khi đèn chuyển từ Đỏ sang Xanh để mở khóa remote", "Nếu đèn remote không sáng hoặc nhấp nháy yếu: Remote đã hết pin CR2032, cần thay pin mới", "Nếu remote vẫn sáng xanh mà ổ khóa xe không kêu bíp: Bình ắc quy trên xe đã cạn kiệt do để qua đêm, cần kích bình"]'::jsonb, 'Kinh nghiệm cứu hộ xe máy Smartkey thực tế')
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
VALUES ('MB_TIRE_01', 'MOTORBIKE', 'Lốp & Bánh xe', 'Bánh sau hoặc bánh trước bị xẹp lép, dắt xe rất nặng, đuôi xe đảo lắc lư khi di chuyển, phát hiện đinh hoặc vít găm trên mặt lốp', 'Thủng lốp xe máy không săm (Tubeless) do cán đinh hoặc rách mặt lốp', 'FLAT_TIRE', 'Vá lốp xe máy lưu động (vá dùi khẩn cấp hoặc vá nấm cao cấp)', 'CANH_BAO', 'TUYỆT ĐỐI KHÔNG tiếp tục nổ máy chạy xe khi lốp bị xẹp vì sẽ làm gãy vành đúc (mâm), nát tanh lốp và rách toạc lốp không thể vá lại.', '["Dừng xe sát lề đường bên phải an toàn, dựng chân chống giữa", "Xoay bánh xe kiểm tra vị trí đinh cắm. KHÔNG tự ý rút đinh ra nếu chưa có đồ nghề vá vì sẽ xì hết hơi ngay lập tức", "Yêu cầu thợ cứu hộ đến vá dùi tận nơi để đi tạm hoặc vá nấm mặt trong"]'::jsonb, 'Quy chuẩn an toàn lốp xe máy Michelin & Chengshin')
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
VALUES ('MB_TIRE_02', 'MOTORBIKE', 'Lốp & Bánh xe', 'Lốp xe bơm căng nhưng sau 1-2 ngày lại bị non hơi từ từ, không thấy đinh cắm trên mặt lốp', 'Xì chân van cao su, hở mép vành mâm xe do rỉ sét hoặc lốp bị dính gai nhỏ/đinh mạt', 'FLAT_TIRE', 'Kiểm tra hở mép vành, thay van cao su mới hoặc vá ép', 'NHE', 'Dùng nước xà phòng bôi vào đầu van và mép vành để xác định chính xác vị trí xì bọt khí.', '["Bôi nước xà phòng quanh đầu kim van xem có sủi bọt không", "Bôi xà phòng dọc theo mép tiếp xúc giữa lốp và vành mâm", "Nếu xì mép vành: Cần thợ đánh bóng làm sạch rỉ sét mép mâm và quét keo làm kín"]'::jsonb, 'Kỹ thuật sửa chữa lốp không săm 2banh.vn')
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
VALUES ('MB_ENGINE_01', 'MOTORBIKE', 'Truyền động dây curoa xe ga', 'Xe ga (Lead, Vision, AirBlade, SH, Grande) đang chạy bỗng nghe tiếng bụp lớn ở lốc máy bên trái, sau đó vặn ga động cơ vẫn gầm rú nhưng bánh sau không quay, xe đứng im', 'Đứt dây curoa truyền động nồi xe ga', 'ENGINE_FAILURE', 'Cứu hộ thay dây curoa Bando/Gates chính hãng tận nơi hoặc kéo xe về gara', 'NGUY_HIEM', 'Thả hết tay ga, bóp phanh đều 2 bên và tấp xe an toàn vào lề. Tắt máy ngay, không tiếp tục nẹt pô rồ ga vì mảnh dây curoa đứt có thể cuốn kẹt quạt nồi gây vỡ lốc máy.', '["Tấp xe vào lề đường, dựng chân chống giữa", "Kiểm tra lốc nồi bên trái: vặn ga máy gầm mà bánh sau không quay là 100% đứt curoa", "Gọi cứu hộ mang theo dây curoa đúng thông số dòng xe và súng siết bu-lông để thay thế tại chỗ"]'::jsonb, 'Cẩm nang bảo dưỡng hệ thống truyền động CVT xe ga Honda')
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
VALUES ('MB_ENGINE_02', 'MOTORBIKE', 'Động cơ xe ga', 'Xe ga bị rung bần bật phần đầu và tay lái khi bắt đầu vặn ga khởi hành ở tốc độ 10-25 km/h, xe chạy có tiếng kêu rít hoặc lạch cạch ở cụm nồi sau', 'Côn sau bị bẩn, trượt bố ba càng vào chuông nồi do bụi mạt kim loại hoặc chai bề mặt ma sát', 'ENGINE_FAILURE', 'Vệ sinh nồi xe ga, chà nhám bố ba càng hoặc thay chuông nồi mới', 'NHE', 'Xe vẫn có thể chạy tạm ở tốc độ vừa phải, nhưng nên sớm vệ sinh nồi để tránh làm cháy chuông và chai cứng bố côn.', '["Khi khởi hành không nên thốc ga đột ngột mà kéo ga đều đặn", "Đến gara tháo lốc nồi thổi sạch bụi bẩn, vệ sinh chuông và bố ba càng", "Kiểm tra 3 viên cao su giảm chấn và bi nồi xem có bị mòn méo không"]'::jsonb, 'Hỏi đáp kinh nghiệm xe máy 2banh.vn')
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
VALUES ('MB_ENGINE_03', 'MOTORBIKE', 'Ngập nước & Thủy kích', 'Xe chạy qua đoạn đường ngập nước sâu rồi bị chết máy đột ngột, nước tràn vào ống pô và hộp lọc gió', 'Xe máy bị ngập nước chết bugi, nước tràn vào buồng đốt qua lọc gió/ống xả', 'ENGINE_FAILURE', 'Cứu hộ thổi nước buồng đốt, vệ sinh bugi, thay nhớt máy chống lột dên', 'NGUY_HIEM', 'TUYỆT ĐỐI KHÔNG BẤM ĐỀ LẠI khi xe vừa chết máy trong vũng nước ngập! Bấm đề sẽ khiến nước trong xi lanh bị ép nén làm cong gãy tay biên (thủy kích) phá hỏng toàn bộ động cơ.', '["Dắt xe qua khỏi đoạn ngập nước lên chỗ khô ráo, dựng chân chống giữa", "Dốc ngược đầu xe hoặc dựng nghiêng để nước trong ống xả chảy hết ra ngoài", "Tháo lọc gió kiểm tra xem có ướt sũng nước không", "Tháo bugi kiểm tra và thổi sạch nước, đạp mồi vài lần để đẩy hết nước trong buồng đốt ra ngoài trước khi nổ máy lại", "BẮT BUỘC thay nhớt máy ngay vì nước tràn vào nhớt sẽ chuyển sang màu cà phê sữa làm hỏng động cơ"]'::jsonb, 'Kỹ thuật cứu hộ xe máy ngập nước Otofun')
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
VALUES ('MB_ENGINE_04', 'MOTORBIKE', 'Hệ thống làm mát', 'Xe chạy một lúc máy rất nóng, mùi khét bốc lên, đèn báo nhiệt độ nước làm mát (hình nhiệt kế đỏ) bật sáng trên táp-lô, xe bị ì máy', 'Hết nước làm mát, két nước bị rò rỉ hoặc hỏng cánh quạt bơm nước', 'ENGINE_FAILURE', 'Châm nước làm mát khẩn cấp, kiểm tra rò rỉ két nước tản nhiệt', 'NGUY_HIEM', 'DỪNG XE NGAY LẬP TỨC và tắt máy! Không được mở nắp két nước khi máy đang sôi vì nước nóng áp suất cao sẽ phụt ra gây bỏng nặng.', '["Tấp xe vào bóng râm, tắt máy để động cơ nguội tự nhiên tối thiểu 20-30 phút", "Kiểm tra bình nước phụ dưới gầm/cốp xe xem mực nước có nằm dưới vạch LOWER không", "Quan sát dưới gầm máy xem có vệt nước xanh/đỏ rò rỉ nhỏ giọt không", "Châm thêm nước làm mát chuyên dụng (nếu khẩn cấp có thể dùng nước suối tinh khiết châm tạm) để đi đến gara gần nhất"]'::jsonb, 'Cẩm nang bảo dưỡng hệ thống làm mát động cơ Honda')
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
VALUES ('MB_FI_CODE_07', 'MOTORBIKE', 'Hệ thống điện tử PGM-FI', 'Đèn báo lỗi động cơ FI (vàng) nháy 7 lần ngắn, xe khó khởi động khi trời lạnh hoặc máy yếu khi tăng tốc', 'Lỗi cảm biến nhiệt độ động cơ / nước làm mát (ECT/EOT) hoặc lỏng giắc cắm', 'ENGINE_FAILURE', 'Cứu hộ kiểm tra giắc cảm biến nhiệt độ hoặc đọc lỗi bằng máy chẩn đoán', 'CANH_BAO', 'Xe vẫn chạy được tạm thời nhưng ECM sẽ chuyển sang chế độ dự phòng, xe sẽ tốn xăng hơn bình thường.', '["Đếm số lần đèn vàng nháy: 7 nháy ngắn = Lỗi cảm biến ECT/EOT", "Kiểm tra giắc cắm cảm biến gắn trên lốc xi lanh xem có bị đứt dây do chuột cắn không", "Cần máy quét mã lỗi để xóa lỗi sau khi cắm lại giắc"]'::jsonb, 'Bảng mã lỗi chuẩn PGM-FI Honda Việt Nam')
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
VALUES ('MB_FI_CODE_12', 'MOTORBIKE', 'Hệ thống điện tử PGM-FI', 'Đèn FI nháy 12 lần (1 nháy dài 1.3s và 2 nháy ngắn), xe không nổ máy được, bấm đề máy quay nhưng không có xăng phun vào buồng đốt', 'Hỏng kim phun xăng (Injector) hoặc đứt mạch dây điện cấp nguồn cho kim phun', 'ENGINE_FAILURE', 'Cứu hộ đo điện trở kim phun, nối dây hoặc thay kim phun tận nơi', 'NGUY_HIEM', 'Không cố bấm đề liên tục vì không có xăng phun vào buồng đốt, chỉ làm kiệt bình ắc quy.', '["Đếm nhịp đèn: 1 dài + 2 ngắn = Mã lỗi 12 (Kim phun)", "Tháo cốp kiểm tra giắc cắm kim phun nằm trên cổ hút", "Chuột cắn đứt dây kim phun là nguyên nhân phổ biến nhất tại Việt Nam"]'::jsonb, 'Bảng mã lỗi chuẩn PGM-FI Honda Việt Nam')
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
VALUES ('MB_FI_CODE_21', 'MOTORBIKE', 'Hệ thống điện tử PGM-FI', 'Đèn FI nháy 21 lần (2 nháy dài và 1 nháy ngắn), pô xe xả khói đen, có mùi xăng sống nồng nặc, xe chạy bị hụt hơi', 'Lỗi cảm biến Oxy (O2 Sensor) gắn trên cổ pô ống xả', 'ENGINE_FAILURE', 'Vệ sinh muội than cảm biến oxy hoặc thay mới cảm biến', 'CANH_BAO', 'Xe vẫn chạy được về gara nhưng hao xăng nghiêm trọng và dễ đóng muội làm hỏng bugi.', '["Quan sát vị trí cổ pô xe máy xem dây cảm biến oxy có bị cọ quẹt đứt vào lốc máy không", "Vệ sinh đầu cảm biến bám đầy muội than đen", "Đến gara đo điện áp xuất của cảm biến bằng đồng hồ VOM"]'::jsonb, 'Bảng mã lỗi chuẩn PGM-FI Honda Việt Nam')
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
VALUES ('MB_FUEL_01', 'MOTORBIKE', 'Nhiên liệu & Bơm xăng', 'Kim xăng chỉ vạch đỏ E, xe đang chạy bỗng hụt hơi giật cục 2-3 nhịp rồi tắt ngúm, bật khóa nghe tiếng bơm xăng ro ro yếu ớt', 'Hết cạn xăng trong bình hoặc cháy bơm xăng do để cạn xăng nhiều lần', 'OUT_OF_FUEL', 'Giao xăng RON 95 tận nơi khẩn cấp 2-3 lít', 'NHE', 'Mở nắp bình xăng lắc nhẹ xe xem còn xăng dưới đáy không. Không bấm đề liên tục khi hết xăng vì bơm xăng FI dùng chính xăng để làm mát, để cạn chạy không tải sẽ bị cháy mô tơ bơm.', '["Mở nắp bình kiểm tra trực tiếp mức xăng thực tế", "Đặt dịch vụ cứu hộ giao xăng khẩn cấp 2-3 lít", "Sau khi đổ xăng, bật khóa điện chờ 5 giây để bơm xăng nén đủ áp suất rồi mới bấm đề khởi động"]'::jsonb, 'Kinh nghiệm cứu hộ nhiên liệu lưu động SRAS')
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
VALUES ('CAR_BATTERY_01', 'CAR', 'Ắc quy khởi động ô tô', 'Bấm nút Start/Stop hoặc vặn chìa khóa: Đèn taplo nhấp nháy liên hồi, củ đề kêu tạch tạch tạch liên tục nhưng máy không quay nổi, màn hình trung tâm reset', 'Ắc quy ô tô 12V bị sụt áp dưới 10.5V, chai cực chì hoặc quên tắt đèn pha/đèn trần qua đêm', 'DEAD_BATTERY', 'Cứu hộ câu bình/kích nổ ắc quy ô tô hoặc thay bình GS/Varta/Atlas lưu động', 'CANH_BAO', 'Không cố bấm nút Start/Stop liên tục vì điện áp sụt đột ngột có thể làm lỗi các hộp điều khiển ECU/BCM trên xe.', '["Cần số phải đưa về vị trí P (hoặc N) và đạp hết bàn đạp phanh", "Mở nắp capo kiểm tra 2 cực âm dương bình ắc quy xem có bị lỏng bu-lông kẹp cọc không", "Nếu có xe khác hỗ trợ: Dùng dây câu bình đúng quy tắc (Dương (+) nối Dương trước, Âm (-) nối Âm/mát sườn xe)", "Hoặc gọi xe cứu hộ SRAS có máy kích bình Booster 12V/24V chuyên dụng đến kích nổ trong 15 phút"]'::jsonb, 'Cẩm nang hướng dẫn sử dụng Toyota & Hyundai Việt Nam')
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
VALUES ('CAR_BATTERY_02', 'CAR', 'Máy phát điện (Alternator)', 'Đang chạy trên đường thấy đèn cảnh báo hình bình ắc quy màu đỏ bật sáng trên tap-lô, các thiết bị điện (máy lạnh, màn hình, đèn pha) yếu dần rồi xe lịm máy', 'Hỏng máy phát điện (Alternator), đứt dây curoa tổng hoặc hỏng bộ tiết chế điện áp (IC)', 'DEAD_BATTERY', 'Cẩu kéo xe ô tô bằng sàn trượt về garage sửa chữa', 'NGUY_HIEM', 'Đèn bình ắc quy sáng khi xe ĐANG CHẠY KHÔNG PHẢI do hỏng bình mà do MÁY PHÁT ĐIỆN KHÔNG NẠP. Xe đang chạy bằng năng lượng còn lại trong bình, sẽ chết máy chỉ sau 5-15 phút. Hãy tấp xe vào lề ngay khi còn phanh và trợ lực lái!', '["Tấp xe ngay vào làn dừng khẩn cấp hoặc lề đường bên phải", "Tắt ngay điều hòa A/C, màn hình giải trí, đèn gầm để tiết kiệm điện duy trì trợ lực lái", "Mở nắp capo kiểm tra xem dây curoa tổng dẫn động máy phát có bị đứt hay tuột không", "Trường hợp này kích bình cũng không chạy được lâu, bắt buộc phải gọi xe cứu hộ kéo về gara"]'::jsonb, 'Tài liệu đào tạo kỹ thuật viên đại lý Toyota')
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
VALUES ('CAR_TIRE_01', 'CAR', 'Lốp & Cảm biến áp suất lốp', 'Đèn cảnh báo áp suất lốp (TPMS) hình móng ngựa chấm than bật sáng, vô lăng bị nhao lệch về một bên, xe chạy có tiếng ồn rào rào bất thường dưới gầm', 'Thủng lốp ô tô, cán đinh xì hơi nhanh hoặc rách lốp mép hông', 'FLAT_TIRE', 'Cứu hộ thay bánh sơ cua ô tô hoặc vá lốp nấm lưu động', 'NGUY_HIEM', 'GIỮ CHẶT VÔ LĂNG, KHÔNG PHANH GẤP! Nhả chân ga từ từ, bật đèn cảnh báo nguy hiểm Hazard và tấp xe vào nơi an toàn. Chạy xe xẹp lốp tốc độ cao sẽ phá nát la-zăng và mất lái lật xe.', '["Đỗ xe trên nền đường phẳng cứng, kéo phanh tay, về số P", "Bật đèn Hazard và đặt biển cảnh báo tam giác phản quang cách đuôi xe 50-100m", "Nếu có bánh sơ cua và kích gầm: Tiến hành kê kích thay bánh phụ", "Nếu không có lốp phụ hoặc ốc tắc-kê bị siết quá chặt bằng súng hơi: Gọi cứu hộ SRAS có máy nén khí và đồ nghề chuyên dụng"]'::jsonb, 'Quy trình an toàn cứu hộ lốp cao tốc Cục Đường bộ Việt Nam')
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
VALUES ('CAR_OBD2_P0300', 'CAR', 'Mã lỗi OBD-II Động cơ', 'Đèn Check Engine (hình động cơ cá vàng) nhấp nháy liên tục, xe bị rung bần bật khi đạp ga, máy nổ lụp bụp, tăng tốc rất yếu và có mùi xăng nồng', 'Mã lỗi P0300 (Random Misfire) - Động cơ bị bỏ máy ngẫu nhiên do chết mobin đánh lửa hoặc hỏng bugi', 'ENGINE_FAILURE', 'Cứu hộ đọc lỗi ECU bằng máy OBD-II, thay mobin/bugi ô tô lưu động', 'NGUY_HIEM', 'Đèn Check Engine NHẤP NHÁY là cảnh báo nguy hiểm cấp 1. Xăng không cháy được sẽ xả thẳng vào bầu lọc khí thải làm cháy bộ xúc tác khí xả (Catalytic Converter) tốn hàng chục triệu sửa chữa.', '["Giảm tốc độ, tránh ép ga mạnh, tấp xe vào lề đường kiểm tra", "Dùng máy quét OBD-II đọc mã lỗi xem bỏ máy số mấy (P0301 = máy 1, P0302 = máy 2...)", "Kiểm tra tẩu bugi và mobin của máy tương ứng xem có bị chập cháy hoặc nứt vỏ cách điện không"]'::jsonb, 'Chuẩn mã lỗi quốc tế SAE OBD-II & Diễn đàn Kỹ thuật Oto-Hui')
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
VALUES ('CAR_OBD2_P0115', 'CAR', 'Mã lỗi OBD-II Làm mát', 'Kim đồng hồ nhiệt độ nước làm mát vọt lên sát chữ H (Hot), đèn Check Engine sáng mã P0115, khói hơi nước bốc lên nghi ngút từ nắp capo', 'Mã lỗi P0115 - Quá nhiệt động cơ (Overheating) do vỡ đường ống nước làm mát, kẹt van hằng nhiệt hoặc hỏng quạt két nước', 'ENGINE_FAILURE', 'Cứu hộ khắc phục rò rỉ két nước hoặc kéo xe sàn trượt về gara', 'NGUY_HIEM', 'TẮT MÁY NGAY LẬP TỨC! Động cơ quá nhiệt kéo dài sẽ làm cong vênh mặt máy (mặt quy-lát), thổi gioăng nắp máy, chi phí đại tu máy rất tốn kém.', '["Tấp xe vào lề an toàn, kéo chốt mở hé nắp capo cho hơi nóng thoát ra", "TUYỆT ĐỐI KHÔNG mở nắp két nước khi máy còn đang nóng rẫy", "Quan sát bên dưới gầm xem nước làm mát có đang chảy ào ào ra đất không", "Sau khi máy nguội hẳn (40 phút), kiểm tra quạt tản nhiệt xem có quay khi bật máy không"]'::jsonb, 'Chuẩn mã lỗi quốc tế SAE OBD-II & Sổ tay Toyota Vios')
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
VALUES ('CAR_TOWING_01', 'CAR', 'Cứu hộ vận chuyển', 'Xe ô tô số tự động (AT / CVT / DCT) hoặc xe điện EV (VinFast VF8, VF9) bị chết máy hoàn toàn giữa đường, không vào được số N', 'Xe mất điện toàn phần hoặc kẹt cần số điện tử, cần cẩu kéo an toàn', 'ENGINE_FAILURE', 'Cứu hộ cẩu kéo bằng XE SÀN TRƯỢT chuyên dụng (Flatbed Tow Truck)', 'NGUY_HIEM', 'TUYỆT ĐỐI KHÔNG dùng xe khác để kéo lết xe số tự động hay xe điện 4 bánh trên đường vì sẽ phá nát hộp số tự động hoặc làm cháy mô-tơ điện của xe. BẮT BUỘC dùng xe sàn trượt cẩu toàn bộ 4 bánh lên sàn.', '["Bật đèn khẩn cấp Hazard, đặt cảnh báo an toàn phía sau xe", "Tìm nút mở khóa cần số khẩn cấp (Shift Lock) để đưa cần số về N nếu có thể", "Nếu xe 4 bánh dẫn động toàn thời gian (AWD / 4WD) hoặc xe điện: Chỉ đặt xe cứu hộ sàn trượt chuyên dụng"]'::jsonb, 'Quy chuẩn cứu hộ kỹ thuật ô tô hiệp hội Cứu hộ Giao thông VN')
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
VALUES ('DASH_LIGHT_01', 'CAR', 'Đèn cảnh báo táp-lô (#01 - RED)', 'Đèn táp-lô số 1 sáng: Đèn cảnh báo phanh tay / Mất dầu phanh', 'Chưa hạ hết phanh tay hoặc mức dầu phanh trong bình chứa xuống dưới mức MIN, má phanh mòn quá giới hạn.', 'ENGINE_FAILURE', 'Cứu hộ kiểm tra hệ thống phanh hoặc xe kéo sàn trượt về gara', 'NGUY_HIEM', 'Kiểm tra hạ phanh tay. Nếu hạ rồi mà đèn vẫn sáng thì TUYỆT ĐỐI KHÔNG lái tiếp vì có nguy cơ mất phanh hoàn toàn.', '["Kiểm tra cần phanh tay đã hạ sát nấc dưới cùng chưa", "Mở nắp capo kiểm tra mức dầu phanh trong bình chứa", "Đạp chân phanh xem có bị hẫng hoặc lún sâu bất thường không"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_02', 'CAR', 'Đèn cảnh báo táp-lô (#02 - RED)', 'Đèn táp-lô số 2 sáng: Đèn cảnh báo nhiệt độ nước làm mát động cơ', 'Động cơ bị quá nhiệt (nhiệt độ nước làm mát vượt quá 100-115 độ C) do cạn nước, rò rỉ két nước hoặc hỏng quạt tản nhiệt.', 'ENGINE_FAILURE', 'Cứu hộ tiếp nước làm mát / Kéo xe về gara kiểm tra két nước', 'NGUY_HIEM', 'Tấp xe vào lề đường, tắt máy ngay lập tức. TUYỆT ĐỐI KHÔNG mở nắp két nước khi máy đang nóng vì nước sôi sẽ phun trào gây bỏng nặng.', '["Tắt máy, mở nắp capo cho khoang động cơ thoát nhiệt", "Chờ ít nhất 20-30 phút cho máy nguội hẳn", "Quan sát dưới gầm xem có bị chảy nước làm mát màu xanh/đỏ không"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_03', 'CAR', 'Đèn cảnh báo táp-lô (#03 - RED)', 'Đèn táp-lô số 3 sáng: Đèn cảnh báo áp suất dầu nhớt động cơ (Hình bình dầu đỏ)', 'Áp suất dầu bôi trơn tụt xuống mức nguy hiểm do thiếu nhớt, tắc lọc nhớt hoặc hỏng bơm nhớt, nguy cơ bó kẹt pít-tông lột dớn máy.', 'ENGINE_FAILURE', 'Cứu hộ châm nhớt khẩn cấp hoặc kéo xe về gara hạ máy', 'NGUY_HIEM', 'DỪNG XE VÀ TẮT MÁY NGAY. Tiếp tục nổ máy chỉ trong 1-2 phút sẽ làm phá hủy hoàn toàn động cơ, chi phí đại tu hàng chục triệu đồng.', '["Dừng xe nơi bằng phẳng an toàn, tắt máy", "Rút que thăm nhớt, lau sạch rồi cắm vào kiểm tra lại mức nhớt", "Nếu que thăm nhớt khô hoặc dưới vạch L/MIN: Không được nổ máy"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_04', 'CAR', 'Đèn cảnh báo táp-lô (#04 - RED)', 'Đèn táp-lô số 4 sáng: Đèn cảnh báo hệ thống trợ lực lái (EPS / Vô lăng đỏ)', 'Lỗi mô-tơ trợ lực lái điện hoặc đứt dây curoa trợ lực dầu, khiến vô-lăng nặng cứng ngắc khó xoay chuyển.', 'ENGINE_FAILURE', 'Cứu hộ xe kéo sàn trượt về gara sửa chữa thước lái', 'NGUY_HIEM', 'Vô-lăng sẽ rất nặng và khó đánh lái khi vào cua, cần giảm tốc độ tối đa và tấp xe an toàn.', '["Thử tắt máy khởi động lại xe xem hệ thống điện tử có tự reset không", "Kiểm tra mức dầu trợ lực lái nếu là trợ lực thủy lực", "Không cố lái xe ở tốc độ cao khi vô-lăng mất trợ lực"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_05', 'CAR', 'Đèn cảnh báo táp-lô (#05 - RED)', 'Đèn táp-lô số 5 sáng: Đèn cảnh báo túi khí (Airbag)', 'Hệ thống túi khí hoặc cảm biến va chạm bị lỗi, túi khí có thể không bung khi xảy ra tai nạn hoặc tự bung bất ngờ.', 'ACCIDENT', 'Kiểm tra hệ thống điện túi khí tại gara', 'CANH_BAO', 'Xe vẫn di chuyển được nhưng hệ thống bảo vệ thụ động bị vô hiệu hóa, cần lái xe thận trọng.', '["Kiểm tra giắc cắm dưới ghế lái và ghế phụ có bị lỏng không", "Đưa xe đến gara kiểm tra xóa lỗi cảm biến túi khí"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_06', 'CAR', 'Đèn cảnh báo táp-lô (#06 - RED)', 'Đèn táp-lô số 6 sáng: Đèn cảnh báo bình ắc quy / Hệ thống nạp điện (Hình ắc quy đỏ)', 'Máy phát điện (Alternator) bị hỏng, đứt dây curoa tổng hoặc ắc quy bị hư không nạp được điện. Xe sẽ sớm chết máy khi bình cạn kiệt.', 'DEAD_BATTERY', 'Cứu hộ kích bình ắc quy / Thay mới ắc quy ô tô tận nơi', 'CANH_BAO', 'Tắt ngay điều hòa, màn hình giải trí, đèn chiếu sáng không cần thiết để tiết kiệm điện bình chạy đến gara gần nhất.', '["Mở nắp capo kiểm tra dây curoa máy phát điện có bị đứt hoặc chùng không", "Kiểm tra bu lông 2 cọc bình ắc quy xem có bị lỏng hoặc rỉ sét không", "Yêu cầu cứu hộ đo điện áp máy phát (chuẩn từ 13.8V - 14.4V khi nổ máy)"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_07', 'CAR', 'Đèn cảnh báo táp-lô (#07 - RED)', 'Đèn táp-lô số 7 sáng: Đèn cảnh báo chưa thắt dây an toàn', 'Người ngồi hàng ghế trước hoặc ghế sau chưa cài chốt dây an toàn.', 'OTHER', 'Tư vấn lái xe an toàn', 'NHE', 'Cài chặt chốt dây an toàn trước khi khởi hành.', '["Kiểm tra cài chốt dây an toàn cho tất cả hành khách"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_08', 'CAR', 'Đèn cảnh báo táp-lô (#08 - RED)', 'Đèn táp-lô số 8 sáng: Đèn cảnh báo cửa xe chưa đóng chặt / Cốp xe mở', 'Có ít nhất một cửa hông hoặc cửa cốp sau chưa đóng khít.', 'OTHER', 'Tư vấn an toàn', 'CANH_BAO', 'Dừng xe kiểm tra đóng lại tất cả các cửa tránh cửa bung ra khi chạy tốc độ cao.', '["Mở và đóng mạnh dứt khoát lại 4 cánh cửa và cửa cốp sau"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_09', 'CAR', 'Đèn cảnh báo táp-lô (#09 - RED)', 'Đèn táp-lô số 9 sáng: Đèn cảnh báo nắp capo mở', 'Khóa ngàm nắp capo khoang máy chưa được đóng sập hoàn toàn.', 'OTHER', 'Tư vấn an toàn', 'CANH_BAO', 'Dừng xe đóng chốt nắp capo ngay, tránh gió bạt nắp capo đập vỡ kính lái.', '["Mở nắp capo lên rồi thả rơi tự do ở độ cao 20-30cm để sập ngàm an toàn"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_10', 'CAR', 'Đèn cảnh báo táp-lô (#10 - YELLOW)', 'Đèn táp-lô số 10 sáng: Đèn cảnh báo áp suất lốp (TPMS - Hình lốp xe có dấu chấm than)', 'Áp suất của ít nhất một bánh xe bị tụt dưới 25% tiêu chuẩn do cán đinh, xì van hoặc rách lốp.', 'FLAT_TIRE', 'Vá lốp ô tô lưu động / Thay bánh dự phòng tận nơi', 'CANH_BAO', 'Giảm tốc độ, tránh phanh gấp hoặc đánh lái mạnh. Tấp xe vào lề kiểm tra lốp bị xẹp.', '["Đi vòng quanh xe quan sát 4 bánh xem lốp nào bị non hơi sát vành", "Không rút đinh ra nếu chưa có đồ nghề vá dùi hoặc bơm mini", "Gọi dịch vụ vá lốp lưu động hoặc kích xe thay lốp dự phòng"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_11', 'CAR', 'Đèn cảnh báo táp-lô (#11 - YELLOW)', 'Đèn táp-lô số 11 sáng: Đèn cảnh báo lỗi động cơ (Check Engine / Đèn cá vàng)', 'Hệ thống điều khiển động cơ phát hiện sự cố ở cảm biến oxy, cảm biến lưu lượng gió, van khí xả hoặc bỏ lửa bu-gi.', 'ENGINE_FAILURE', 'Cứu hộ đọc lỗi xóa lỗi OBD-II / Kiểm tra động cơ', 'CANH_BAO', 'Nếu đèn sáng liên tục: Xe vẫn chạy được, lái xe chậm đến gara. Nếu đèn NHẤP NHÁY liên tục: Bỏ máy nghiêm trọng, phải dừng xe ngay.', '["Kiểm tra nắp bình xăng đã vặn chặt kêu ''cạch'' chưa", "Lắng nghe tiếng máy nổ xem có bị rung giật hoặc khói đen ở ống xả không", "Dùng máy chẩn đoán OBD-II đọc mã lỗi (DTC) lưu trong ECU"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_12', 'CAR', 'Đèn cảnh báo táp-lô (#12 - YELLOW)', 'Đèn táp-lô số 12 sáng: Đèn báo hệ thống chống bó cứng phanh (ABS)', 'Hệ thống phanh ABS bị lỗi cảm biến tốc độ bánh xe hoặc bộ chấp hành van thủy lực.', 'ENGINE_FAILURE', 'Kiểm tra cảm biến ABS và hệ thống phanh tại gara', 'CANH_BAO', 'Hệ thống phanh cơ bản vẫn hoạt động nhưng tính năng chống trượt bó cứng bánh khi phanh gấp bị mất, tránh phanh gấp trên đường trơn.', '["Lái xe giữ khoảng cách an toàn gấp đôi bình thường", "Tránh phanh đột ngột trên đường trơn ướt", "Đưa xe đi vệ sinh giắc cắm cảm biến ABS ở các moay-ơ bánh"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_13', 'CAR', 'Đèn cảnh báo táp-lô (#13 - YELLOW)', 'Đèn táp-lô số 13 sáng: Đèn báo hệ thống cân bằng điện tử (ESP / ESC / VSC)', 'Hệ thống cân bằng điện tử đang kích hoạt can thiệp chống lật xe (nếu nhấp nháy), hoặc bị lỗi tắt tính năng (nếu sáng liên tục).', 'ENGINE_FAILURE', 'Kiểm tra cảm biến góc lái và cân bằng điện tử tại gara', 'CANH_BAO', 'Giảm tốc độ khi ôm cua hoặc đi trên đường ướt, trơn trượt.', '["Kiểm tra xem nút tắt ESP/TCS có bị bấm nhầm không", "Giảm tốc độ vào cua khi xe mất tính năng cân bằng điện tử"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_14', 'CAR', 'Đèn cảnh báo táp-lô (#14 - YELLOW)', 'Đèn táp-lô số 14 sáng: Đèn báo mòn má phanh (Brake Pad Monitor)', 'Má phanh trước hoặc sau đã bị mòn đến ngưỡng tiếp xúc cảm biến báo mòn.', 'ENGINE_FAILURE', 'Thay má phanh ô tô tại gara', 'CANH_BAO', 'Cần lên lịch thay má phanh mới sớm để tránh làm xước hỏng đĩa phanh.', '["Hạn chế rà phanh liên tục khi xuống dốc", "Đến gara thay bộ má phanh gốm/kim loại mới"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_15', 'CAR', 'Đèn cảnh báo táp-lô (#15 - YELLOW)', 'Đèn táp-lô số 15 sáng: Đèn báo cạn nhiên liệu (Hình cây xăng vàng)', 'Lượng xăng/dầu trong bình chỉ còn khoảng 10-15% (chạy được khoảng 30-50 km).', 'OUT_OF_FUEL', 'Cứu hộ tiếp xăng/dầu khẩn cấp lưu động', 'CANH_BAO', 'Tìm ngay trạm xăng gần nhất. Không để xe chạy kiệt xăng vì sẽ làm cháy bơm xăng chìm.', '["Tắt điều hòa và các thiết bị điện phụ tải", "Duy trì tốc độ đều 50-60km/h để tiết kiệm nhiên liệu tối đa đến cây xăng"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_16', 'CAR', 'Đèn cảnh báo táp-lô (#16 - YELLOW)', 'Đèn táp-lô số 16 sáng: Đèn báo nước lọt vào lọc nhiên liệu (Xe máy dầu Diesel)', 'Cốc lọc dầu diesel có nhiều nước ngưng tụ, cần xả nước đáy lọc ngay để tránh làm hỏng kim phun điện tử Common Rail.', 'ENGINE_FAILURE', 'Cứu hộ xả đáy cốc lọc dầu / Thay lọc nhiên liệu', 'CANH_BAO', 'Dừng xe xả nước ở cốc lọc dầu dưới khoang máy, không cố chạy tiếp vì kim phun dầu rất đắt tiền.', '["Mở nắp capo tìm cốc lọc nhiên liệu diesel", "Vặn van xả dưới đáy cốc lọc để nước chảy ra hết đến khi thấy dầu diesel"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_17', 'CAR', 'Đèn cảnh báo táp-lô (#17 - YELLOW)', 'Đèn táp-lô số 17 sáng: Đèn báo bộ lọc hạt khí thải hạt diesel (DPF)', 'Bộ lọc muội than khí thải động cơ diesel bị nghẹt do chạy quãng đường ngắn trong phố nhiều.', 'ENGINE_FAILURE', 'Vệ sinh bộ lọc DPF hoặc tái sinh muội than tại gara', 'CANH_BAO', 'Chạy xe đều trên đường trường ở vòng tua 2000-2500 rpm trong 20-30 phút để động cơ tự kích hoạt chu trình tái sinh DPF.', '["Chạy xe ra đường cao tốc với tốc độ trên 60km/h trong 20 phút", "Nếu đèn không tắt, mang xe đến gara cắm máy tái sinh cưỡng bức"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_18', 'CAR', 'Đèn cảnh báo táp-lô (#18 - YELLOW)', 'Đèn táp-lô số 18 sáng: Đèn báo sấy bugi sấy (Glow Plug - Xe máy dầu)', 'Hệ thống sấy nóng buồng đốt đang làm việc (chờ đèn tắt rồi mới đề máy), hoặc bị lỗi rơ-le sấy.', 'ENGINE_FAILURE', 'Kiểm tra bugi sấy động cơ diesel', 'CANH_BAO', 'Bật khóa ON chờ đèn xoắn ốc này tắt hẳn rồi mới vặn chìa đề nổ máy.', '["Chờ 3-5 giây cho bugi nung đỏ buồng đốt", "Đề máy sau khi đèn tắt hoàn toàn"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_19', 'CAR', 'Đèn cảnh báo táp-lô (#19 - YELLOW)', 'Đèn táp-lô số 19 sáng: Đèn cảnh báo lỗi hộp số tự động (Hình bánh răng vàng)', 'Hộp số tự động (AT / CVT / DCT) bị quá nhiệt, thiếu dầu hộp số hoặc lỗi cụm điều khiển van thủy lực.', 'ENGINE_FAILURE', 'Cứu hộ kéo xe số tự động bằng xe sàn trượt về gara', 'NGUY_HIEM', 'Tấp xe vào lề dừng xe để nguội hộp số. TUYỆT ĐỐI KHÔNG kéo lê xe số tự động trên đường mà phải gọi xe cứu hộ sàn trượt chở trọn vẹn cả xe.', '["Về số P, kéo phanh tay, để xe nổ garanti 10-15 phút giải nhiệt", "Nếu vào số bị giật cục hoặc không chuyển số: Gọi ngay xe cứu hộ sàn"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('DASH_LIGHT_20', 'CAR', 'Đèn cảnh báo táp-lô (#20 - YELLOW)', 'Đèn táp-lô số 20 sáng: Đèn báo nước rửa kính cạn (Washer Fluid Low)', 'Bình chứa nước rửa kính chắn gió đã gần hết nước.', 'OTHER', 'Châm thêm nước rửa kính', 'NHE', 'Mở nắp capo châm thêm nước rửa kính chuyên dụng hoặc nước tinh khiết.', '["Mở nắp bình có biểu tượng phun nước rửa kính màu xanh", "Châm đầy nước rửa kính"]'::jsonb, 'Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)')
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
VALUES ('CAR_OBD_P0101', 'CAR', 'Mã lỗi OBD-II Khí nạp (MAF)', 'Xe ô tô tăng tốc bị hụt hơi, xe chạy ì, tốn xăng bất thường, đèn Check Engine báo mã P0101', 'Lỗi cảm biến lưu lượng khí nạp (MAF Sensor Range/Performance) bị bẩn, bám bụi dầu hoặc đứt dây tín hiệu', 'ENGINE_FAILURE', 'Vệ sinh cảm biến MAF / Kiểm tra đường ống nạp khí ô tô', 'CANH_BAO', 'Tránh đạp thốc ga. Vệ sinh cảm biến khí nạp bằng dung dịch xịt MAF chuyên dụng, không dùng RP7.', '["Kiểm tra ống cổ hút gió cao su xem có bị nứt, rách làm lọt gió không qua cảm biến không.", "Tháo giắc cắm cảm biến MAF kiểm tra chân cắm có bị ẩm ướt rỉ sét không.", "Dùng bình xịt vệ sinh MAF Cleaner xịt nhẹ vào dây nhiệt cảm biến, để khô tự nhiên rồi lắp lại.", "Xóa mã lỗi bằng máy chẩn đoán và chạy thử xe."]'::jsonb, 'Chuẩn mã lỗi quốc tế OBD-II DTC (P0101)')
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
VALUES ('CAR_OBD_P0171', 'CAR', 'Mã lỗi OBD-II Nhiên liệu', 'Đèn Check Engine sáng mã P0171 (System Too Lean Bank 1), động cơ nổ không đều ở chế độ không tải, đạp ga bị khựng', 'Hệ thống nhiên liệu bị nghèo xăng (quá nhiều không khí hoặc quá ít xăng) do hở ống hút chân không, tụt áp bơm xăng hoặc tắc lọc xăng', 'ENGINE_FAILURE', 'Đo áp suất bơm xăng / Kiểm tra rò rỉ đường ống chân không', 'CANH_BAO', 'Xe chạy nghèo xăng trong thời gian dài sẽ làm nhiệt độ buồng đốt tăng cao gây cháy xupap và nứt bugi.', '["Lắng nghe khoang máy xem có tiếng rít xì gió ở các ống cao su hút chân không quanh cổ hút không.", "Kiểm tra nắp châm dầu động cơ và que thăm nhớt đã đóng chặt kín chưa.", "Kiểm tra áp suất bơm nhiên liệu tại giàn phun xăng (áp suất chuẩn thường từ 3.0 - 3.8 bar).", "Thay thế lọc xăng định kỳ nếu đã chạy trên 40.000 km."]'::jsonb, 'Chuẩn mã lỗi quốc tế OBD-II DTC (P0171)')
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
VALUES ('CAR_OBD_P0420', 'CAR', 'Mã lỗi OBD-II Khí thải (Catalytic)', 'Đèn Check Engine sáng báo mã P0420, xe có mùi khí xả hôi chua hoặc máy bị nghẽn ga ở tốc độ cao', 'Hiệu suất bộ chuyển đổi xúc tác khí xả (Catalytic Converter) dưới ngưỡng cho phép do bầu lọc bị vỡ tổ ong, đóng muội hoặc hỏng cảm biến Oxy số 2', 'ENGINE_FAILURE', 'Kiểm tra cảm biến Oxy sau / Vệ sinh hoặc thay bầu xúc tác khí thải', 'CANH_BAO', 'Xe vẫn có thể lưu thông bình thường nhưng sẽ không đạt tiêu chuẩn đăng kiểm khí thải và máy có thể bị nóng.', '["Đọc đồ thị điện áp cảm biến Oxy số 2 (Downstream O2 Sensor): nếu dao động liên tục giống cảm biến số 1, bầu xúc tác đã mất tác dụng.", "Kiểm tra cảm biến Oxy sau bầu xúc tác xem có bị đứt dây hoặc bám muội chì không.", "Gõ nhẹ vào bầu xúc tác: nếu có tiếng lạo xạo bên trong, tổ ong ceramic đã bị vỡ cần thay mới.", "Dùng dung dịch chuyên dụng xúc rửa bầu Catalytic."]'::jsonb, 'Chuẩn mã lỗi quốc tế OBD-II DTC (P0420)')
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
VALUES ('CAR_OBD_P0505', 'CAR', 'Mã lỗi OBD-II Cầm chừng (Idle Control)', 'Vòng tua máy ô tô bị trồi sụt thất thường (òa ga lên 1500-2000 vòng/phút hoặc tụt xuống 400 vòng chết máy khi dừng đèn đỏ), đèn Check Engine sáng mã P0505', 'Lỗi van điều khiển tốc độ không tải (IACV) hoặc bướm ga điện tử bị đóng cặn bẩn dầu nhớt nghẹt khe hở', 'ENGINE_FAILURE', 'Vệ sinh họng hút bướm ga và cài đặt lại vị trí không tải (Throttle Relearn)', 'CANH_BAO', 'Cẩn thận khi dừng đèn đỏ tránh bị chết máy bất ngờ làm mất trợ lực phanh chân không.', '["Tháo cổ hút gió kiểm tra họng bướm ga: viền bướm ga thường bị muội carbon đen đóng dày gây kẹt góc mở.", "Dùng bình xịt vệ sinh chế hòa khí/bướm ga và khăn mềm lau sạch muội carbon.", "Sau khi vệ sinh, cần dùng máy chẩn đoán thực hiện quy trình học lại góc mở bướm ga (Throttle Adaptation/Idle Learn).", "Kiểm tra van điều khiển không tải IACV và gioăng cao su cổ hút."]'::jsonb, 'Chuẩn mã lỗi quốc tế OBD-II DTC (P0505)')
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
VALUES ('CAR_OBD_P0700', 'CAR', 'Mã lỗi OBD-II Hộp số tự động', 'Xe ô tô bị giật mạnh khi chuyển số D hoặc R, xe không chịu nhảy số cao, vòng tua máy gầm rú lớn, đèn Check Engine sáng mã P0700', 'Lỗi hệ thống điều khiển hộp số tự động (TCM Malfunction), hỏng van điện từ solenoild chuyển số hoặc thiếu dầu hộp số tự động (ATF)', 'ENGINE_FAILURE', 'Cứu hộ kéo xe số tự động / Kiểm tra hộp số tự động chuyên sâu', 'NGUY_HIEM', 'Hộp số đang kích hoạt chế độ an toàn (Limp Mode - khóa ở số 3 để bảo vệ). TUYỆT ĐỐI KHÔNG kéo xe ô tô số tự động bằng dây kéo vì sẽ làm cháy hộp số, bắt buộc dùng xe cứu hộ sàn trượt!', '["Tấp xe vào lề đường, kiểm tra que thăm dầu hộp số tự động (ATF) xem mức dầu và màu sắc dầu (dầu chuẩn có màu đỏ trong, nếu màu đen hoặc có mùi khét là cháy bố nồi hộp số).", "Quét sâu vào hộp điều khiển hộp số (TCM) để đọc mã lỗi con (ví dụ P0730, P0750 van solenoid).", "Gọi cứu hộ cẩu xe sàn trượt đưa xe về xưởng chuyên về hộp số tự động."]'::jsonb, 'Chuẩn mã lỗi quốc tế OBD-II DTC (P0700)')
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
VALUES ('CAR_OBD_P0128', 'CAR', 'Mã lỗi OBD-II Làm mát', 'Đồng hồ nhiệt độ nước làm mát lên rất chậm hoặc không đạt mức giữa, điều hòa sưởi không ấm, xe tốn xăng, đèn Check Engine sáng P0128', 'Van hằng nhiệt bị kẹt ở trạng thái MỞ LIÊN TỤC (Coolant Thermostat Stuck Open), nước làm mát liên tục chảy qua két tản nhiệt khiến động cơ không đạt nhiệt độ vận hành tối ưu', 'ENGINE_FAILURE', 'Thay van hằng nhiệt động cơ ô tô mới', 'CANH_BAO', 'Xe vẫn chạy được bình thường nhưng động cơ chạy ở trạng thái lạnh sẽ phun nhiều xăng hơn, gây hao xăng và nhanh bẩn bugi.', '["Sờ vào ống nước trên và ống nước dưới của két tản nhiệt lúc mới nổ máy 2-3 phút: nếu cả hai ống cùng ấm lên cùng lúc, van hằng nhiệt đã bị kẹt mở.", "Tháo cụm van hằng nhiệt kiểm tra lò xo và gioăng làm kín.", "Thay van hằng nhiệt mới đúng thông số nhiệt độ mở (thường 82°C hoặc 88°C).", "Xả e (bleeding) bọt khí hệ thống nước làm mát sau khi thay thế."]'::jsonb, 'Chuẩn mã lỗi quốc tế OBD-II DTC (P0128)')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();
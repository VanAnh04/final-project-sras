# -*- coding: utf-8 -*-
"""
SRAS HIGH-QUALITY MANUALS KNOWLEDGE BASE GENERATOR & CRAWLER
Chuẩn hóa và bóc tách toàn bộ dữ liệu sự cố kỹ thuật từ các Sổ tay Hướng dẫn Sử dụng:
- Xe tay côn: taycon.pdf (Honda Winner X / CBR150R)
- Xe ga: xega.pdf (Honda Air Blade / SH / Lead / Vision)
- Xe số: xeso.pdf (Honda Wave Alpha / Future / Blade)
- Ô tô xăng: otoxang.pdf (Toyota Vios, Camry, Corolla, Innova, Fortuner)
- Ô tô điện: xeotodien.pdf (VinFast VF 7 EV SUV Rescue Manual)
- Xe máy điện: xemaydien.pdf (VinFast Klara, Feliz, Evo)

Thay thế triệt để các câu bóc tách lỗi/cắt vụn trước đây bằng tri thức hoàn chỉnh, chuẩn xác theo tài liệu kỹ thuật nhà sản xuất.
"""

import os
import sys
import json
import re

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(CURRENT_DIR, "data")
LOCAL_JSON = os.path.join(DATA_DIR, "vehicle_fault_knowledge.json")
BACKEND_JSON = os.path.abspath(
    os.path.join(CURRENT_DIR, "..", "src", "main", "resources", "knowledge", "vehicle_fault_knowledge.json")
)

# Bộ tri thức chuẩn hóa chi tiết từng ca bệnh từ các sổ tay kỹ thuật nhà sản xuất
CANONICAL_MANUAL_FAULTS = [
    # =========================================================================
    # 1. SỔ TAY XE TAY CÔN (taycon.pdf - Honda Winner X / CBR150R)
    # =========================================================================
    {
        "id": "HD_TAYCON_STARTER_CRANKS_NO_START_97",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Côn - Động cơ & Khởi động",
        "symptom": "Mô tơ đề hoạt động quay tốt nhưng động cơ không nổ máy",
        "diagnosed_issue": "Hệ thống nhiên liệu cạn xăng, ngộp xăng, bugi mất tia lửa điện hoặc lỗi hệ thống phun xăng điện tử PGM-FI.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Kiểm tra hệ thống điện/đánh lửa và tiếp nhiên liệu",
        "severity": "CANH_BAO",
        "emergency_advice": "Không bấm giữ nút đề liên tục quá 5 giây để tránh làm cạn kiệt bình ắc quy và cháy mô tơ đề. Đợi 10 giây giữa các lần khởi động.",
        "troubleshooting_steps": [
            "Kiểm tra mức xăng trong bình, tiếp thêm nhiên liệu nếu bình cạn.",
            "Đảm bảo quy trình khởi động đúng chuẩn: trả về số N (hoặc bóp hết tay côn) và gạt chân chống nghiêng lên.",
            "Quan sát đèn báo lỗi PGM-FI (MIL) trên bảng đồng hồ. Nếu đèn sáng hoặc nhấp nháy, hệ thống phun xăng điện tử đang gặp lỗi.",
            "Tháo chụp bugi kiểm tra xem có bị lỏng, ẩm ướt hoặc đứt dây cao áp không."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 97)"
    },
    {
        "id": "HD_TAYCON_STARTER_NO_CRANK_SILENT_97",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Côn - Động cơ & Khởi động",
        "symptom": "Bấm nút đề nhưng mô tơ đề hoàn toàn không hoạt động, xe im lìm",
        "diagnosed_issue": "Mất nguồn cấp cho mạch khởi động do đứt cầu chì, bình điện ắc quy bị yếu/hỏng, hoặc cọc bình bị lỏng, rỉ sét.",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Kích bình ắc quy / Thay ắc quy xe máy tận nơi",
        "severity": "CANH_BAO",
        "emergency_advice": "Kiểm tra công tắc ngắt động cơ màu đỏ (nếu có) xem đã bật về vị trí RUN chưa. Kiểm tra công tắc chân chống nghiêng.",
        "troubleshooting_steps": [
            "Kiểm tra công tắc chân chống nghiêng: Gạt chân chống lên hết cỡ.",
            "Kiểm tra cọc bình ắc quy: Mở nắp bình điện kiểm tra ốc siết cọc âm (-) và cực dương (+) xem có lỏng hoặc bám muối rỉ sét không.",
            "Kiểm tra hộp cầu chì: Kiểm tra cầu chì khởi động và cầu chì chính (15A/20A) xem có bị đứt dây chì bên trong không.",
            "Nếu bấm còi kêu rất nhỏ hoặc đèn đồng hồ bị sụp tối khi ấn đề, ắc quy đã cạn điện cần sạc hoặc kích bình."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 97)"
    },
    {
        "id": "HD_TAYCON_OVERHEAT_COOLANT_WARNING_98",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Côn - Hệ thống làm mát",
        "symptom": "Đèn báo quá nhiệt dung dịch làm mát sáng đỏ, xe tăng tốc chậm, máy nóng ran",
        "diagnosed_issue": "Động cơ bị quá nhiệt do thiếu dung dịch làm mát, rò rỉ két nước tản nhiệt hoặc quạt gió két nước không hoạt động.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ làm mát / Bổ sung nước làm mát động cơ",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Dừng xe vào lề đường ngay lập tức, tắt máy để động cơ nguội tự nhiên. TUYỆT ĐỐI KHÔNG mở nắp két nước khi máy còn nóng vì áp suất nước sôi có thể phun trào gây bỏng nặng!",
        "troubleshooting_steps": [
            "Tắt máy bằng khóa điện, sau đó vặn khóa điện sang ON để kiểm tra quạt két nước tản nhiệt có quay không.",
            "Nếu quạt không quay, có thể quạt hỏng hoặc đứt cầu chì quạt tản nhiệt, không được nổ máy tiếp.",
            "Chờ động cơ nguội hoàn toàn (khoảng 15-20 phút), kiểm tra đường ống và bề mặt két nước xem có rò rỉ dung dịch làm mát không.",
            "Kiểm tra mức dung dịch làm mát trong bình dự trữ (nằm giữa vạch UPPER và LOWER). Đổ thêm dung dịch làm mát chuyên dụng nếu cạn.",
            "Nếu rò rỉ két nước hoặc đèn vẫn sáng đỏ sau khi châm nước, hãy liên hệ cứu hộ kéo xe, không cố chạy tiếp tránh bó piston vỡ lốc máy."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 98)"
    },
    {
        "id": "HD_TAYCON_PGMFI_MIL_LIGHT_99",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Côn - Đèn cảnh báo & Điện tử",
        "symptom": "Đèn báo lỗi hệ thống phun xăng điện tử PGM-FI (đèn MIL màu vàng) sáng hoặc nhấp nháy khi đang lái xe",
        "diagnosed_issue": "Hệ thống phun xăng điện tử PGM-FI hoặc một trong các cảm biến điều khiển động cơ (cảm biến oxy, TPS, EOT, CKP) gặp trục trặc.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Đọc mã lỗi PGM-FI / Sửa chữa hệ thống phun xăng điện tử",
        "severity": "CANH_BAO",
        "emergency_advice": "Giảm tốc độ xe ngay, chạy đều ga và tránh tải nặng. Tìm điểm dừng an toàn hoặc đưa xe đến cửa hàng dịch vụ kiểm tra càng sớm càng tốt.",
        "troubleshooting_steps": [
            "Giảm tốc độ, quan sát đèn MIL xem sáng liên tục hay nhấp nháy mã lỗi (đếm số lần nháy dài và nháy ngắn để xác định mã lỗi).",
            "Đỗ xe an toàn, tắt khóa điện và đợi 1-2 phút rồi bật lại để xem đèn có tự tắt không (lỗi tạm thời).",
            "Nếu xe bị hụt ga, giật cục hoặc chết máy khi đèn sáng, không cố chạy đường dài vì có thể làm hỏng bộ chuyển đổi xúc tác khí thải.",
            "Đưa xe đến đại lý hoặc gọi thợ có máy đọc lỗi Fi để cắm cổng DLC chẩn đoán chính xác mã lỗi PGM-FI."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 99)"
    },
    {
        "id": "HD_TAYCON_ABS_WARNING_LIGHT_99",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Côn - Hệ thống phanh & ABS",
        "symptom": "Đèn báo hệ thống chống bó cứng phanh ABS sáng liên tục hoặc nhấp nháy khi xe chạy trên 10 km/h",
        "diagnosed_issue": "Hệ thống phanh ABS gặp lỗi, đĩa đọc xung ABS bị cong vênh, cảm biến tốc độ bánh xe bị bẩn hoặc mất tín hiệu.",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Kiểm tra cảm biến và hệ thống phanh ABS",
        "severity": "CANH_BAO",
        "emergency_advice": "Hệ thống phanh cơ khí thông thường vẫn hoạt động nhưng tính năng chống bó cứng ABS bị ngắt. Cần điều khiển xe thận trọng, tránh phanh gấp trên đường trơn trượt.",
        "troubleshooting_steps": [
            "Kiểm tra cảm biến tốc độ ở đĩa phanh bánh trước/sau: làm sạch đất cát, bùn bẩn bám trên mắt đọc cảm biến.",
            "Kiểm tra đĩa xung đọc phanh ABS (vành răng nhỏ) xem có bị dị vật kẹt, méo mó hoặc cong vênh không.",
            "Tắt khóa điện OFF rồi bật lại ON, chạy xe với tốc độ trên 30 km/h để hệ thống tự hiệu chuẩn lại cảm biến.",
            "Nếu đèn ABS vẫn không tắt, mang xe đến trung tâm bảo dưỡng để kiểm tra mô-đun điều khiển phanh ABS."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 99)"
    },
    {
        "id": "HD_TAYCON_SMARTKEY_BATTERY_LOW_93",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Côn - Khóa thông minh Smart Key",
        "symptom": "Đèn báo hệ thống khóa thông minh Smart Key nhấp nháy 5 lần khi bật khóa điện",
        "diagnosed_issue": "Pin điều khiển thông minh FOB (loại pin cúc áo CR2032) sắp cạn năng lượng, phạm vi bắt sóng bị giảm sút.",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Thay pin chìa khóa thông minh Smart Key CR2032 tận nơi",
        "severity": "CANH_BAO",
        "emergency_advice": "Thay pin FOB càng sớm càng tốt để tránh tình trạng khóa xe bị kẹt không khởi động được giữa đường khi pin cạn hoàn toàn.",
        "troubleshooting_steps": [
            "Chuẩn bị 01 viên pin CR2032 chính hãng mới và tua vít đầu dẹt (bọc vải bảo vệ đầu tua vít để không làm xước vỏ).",
            "Lách tua vít vào rãnh khe của remote FOB để tách hai nửa nắp trên và nắp dưới.",
            "Tháo pin cũ và lắp pin mới vào: Đảm bảo mặt có dấu cực âm (-) hướng lên trên.",
            "Lắp chặt hai nửa nắp FOB khớp khít mép cao su chống nước.",
            "Nhấn nút tìm xe trên FOB để kiểm tra đèn LED phản hồi xác nhận hoạt động bình thường."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 93)"
    },
    {
        "id": "HD_TAYCON_SMARTKEY_NO_CONNECTION_102",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Côn - Khóa thông minh Smart Key",
        "symptom": "Xe không nhận tín hiệu Smart Key, không thể ấn mở núm khóa điện để khởi động",
        "diagnosed_issue": "FOB bị tắt nguồn, pin FOB cạn kiệt, bình ắc quy xe bị hết điện, hoặc bị nhiễu sóng điện từ cực mạnh gần tháp truyền hình.",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Cứu hộ kích bình / Mở khóa xe máy khẩn cấp",
        "severity": "CANH_BAO",
        "emergency_advice": "Dùng tính năng mở khóa khẩn cấp bằng mã ID (gồm 9 chữ số trên thẻ nhựa đi kèm xe) nếu chìa khóa bị rơi hoặc hết pin.",
        "troubleshooting_steps": [
            "Kiểm tra đèn LED trên remote FOB: Nhấn giữ nút khóa/nguồn trên FOB trong 2 giây xem đèn chuyển từ Đỏ sang Xanh chưa (Đỏ = Tắt, Xanh = Bật).",
            "Đưa FOB đến sát cạnh cụm ổ khóa trên xe để giảm thiểu ảnh hưởng của vùng nhiễu sóng.",
            "Kiểm tra bình ắc quy của xe: Nếu ấn núm khóa mà vòng đèn LED ổ khóa không sáng và không kêu tít, ắc quy xe có thể đã hết sạch điện.",
            "Trường hợp khẩn cấp: Dùng mã thẻ ID 9 số để mở khóa điện bằng cách nhấn giữ núm khóa 4 giây và nhập số lần bấm tương ứng từng chữ số."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 102)"
    },
    {
        "id": "HD_TAYCON_FLAT_TIRE_109",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Côn - Lốp & Bánh xe",
        "symptom": "Lốp xe bị thủng, xẹp hơi, cán đinh, tay lái bị rung lắc hoặc đảo khi di chuyển",
        "diagnosed_issue": "Lốp xe không săm (tubeless) bị dị vật đâm thủng hoặc hở chân van hơi, áp suất lốp bị sụt giảm đột ngột.",
        "suggested_issue_type": "FLAT_TIRE",
        "suggested_service": "Vá lốp xe máy lưu động (vá dùi khẩn cấp hoặc vá nấm)",
        "severity": "CANH_BAO",
        "emergency_advice": "Giữ chặt tay lái, nhả ga từ từ, rà nhẹ đồng thời cả hai phanh trước và sau để giảm tốc độ. Tấp vào lề đường an toàn. TUYỆT ĐỐI KHÔNG rút đinh ra nếu chưa có sẵn dụng cụ vá lốp vì lốp sẽ xì hết hơi ngay lập tức!",
        "troubleshooting_steps": [
            "Dựng xe bằng chân chống đứng trên mặt đất bằng phẳng, kiểm tra toàn bộ bề mặt lốp để xác định vị trí đinh hoặc vết thủng.",
            "Nếu đinh vẫn còn găm chặt và lốp còn hơi, bạn có thể chạy chậm với tốc độ dưới 30 km/h đến tiệm sửa xe gần nhất.",
            "Nếu lốp đã xẹp hoàn toàn: Sử dụng bộ vá dùi cao su khẩn cấp để bịt lỗ thủng rồi dùng bơm mini bơm lên áp suất chuẩn (trước 2.0 kg/cm2, sau 2.25 kg/cm2).",
            "Gọi dịch vụ vá xe lưu động để vá nấm từ bên trong nhằm bảo vệ kết cấu bố lốp lâu dài."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 109)"
    },
    {
        "id": "HD_TAYCON_BLOWN_FUSE_111",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Côn - Hệ thống điện",
        "symptom": "Toàn bộ hệ thống điện bị mất đột ngột, xe không bật được khóa điện, không có đèn còi",
        "diagnosed_issue": "Đứt cầu chì chính (Main Fuse 20A/30A) hoặc cầu chì phụ do đoản mạch, chập dây điện hoặc quá tải thiết bị điện gắn thêm.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ điện xe máy / Thay cầu chì và xử lý chập mạch",
        "severity": "CANH_BAO",
        "emergency_advice": "Luôn thay thế bằng cầu chì có cùng chỉ số Ampe quy định. Không dùng dây đồng hoặc giấy bạc thay thế vì sẽ gây cháy xe!",
        "troubleshooting_steps": [
            "Tắt khóa điện về vị trí OFF và tháo yên xe (hoặc ốp hông) để tiếp cận hộp cầu chì.",
            "Dùng kẹp rút cầu chì trong hộp phụ tùng để rút cầu chì chính và các cầu chì phụ ra kiểm tra.",
            "Quan sát sợi kim loại bên trong cầu chì: nếu bị đứt hoặc cháy đen, cầu chì đã hỏng.",
            "Lấy cầu chì dự phòng (spare fuse) có cùng chỉ số Ampe (ví dụ 10A, 15A, 20A) trong nắp hộp cầu chì để thay vào.",
            "Bật khóa điện kiểm tra lại. Nếu cầu chì mới vừa thay lại bị đứt ngay lập tức, hệ thống điện đang bị chập mass nghiêm trọng, cần thợ chuyên nghiệp xử lý."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 111)"
    },
    {
        "id": "HD_TAYCON_ENGINE_HESITATION_UNSTABLE_113",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Côn - Động cơ & Nhiên liệu",
        "symptom": "Động cơ vận hành không ổn định, hụt ga, giật cục khi tăng tốc hoặc chạy chậm",
        "diagnosed_issue": "Lọc gió bị nghẹt quá nhiều bụi bẩn, bugi mòn khoảng cách đánh lửa, kim phun PGM-FI bị tắc cặn, hoặc xăng bị lẫn nước/tạp chất.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Bảo dưỡng hệ thống đánh lửa / Vệ sinh kim phun họng xăng",
        "severity": "CANH_BAO",
        "emergency_advice": "Tránh vít ga đột ngột để không làm chết máy giữa dòng xe cộ. Chạy đều ga ở tốc độ vừa phải.",
        "troubleshooting_steps": [
            "Kiểm tra nắp bình xăng và xả đáy lọc xăng nếu nghi ngờ vừa đổ phải xăng kém chất lượng hoặc xăng nhiễm nước mưa.",
            "Kiểm tra khoảng hở đánh lửa bugi (tiêu chuẩn: 0.8 - 0.9 mm) và làm sạch muội than bám ở đầu điện cực bugi.",
            "Kiểm tra tấm lọc gió: nếu bám dày bụi bẩn và dầu nhớt, cần vệ sinh hoặc thay tấm lọc gió mới.",
            "Nếu xe vẫn bị hụt ga, cần đưa đến cơ sở sửa chữa để súc rửa kim phun xăng điện tử và kiểm tra áp suất bơm xăng."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - taycon.pdf (Trang 113)"
    },

    # =========================================================================
    # 2. SỔ TAY XE TAY GA (xega.pdf - Honda Air Blade / SH / Lead / Vision)
    # =========================================================================
    {
        "id": "HD_XEGA_STARTER_CRANKS_NO_START_101",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Ga - Động cơ & Khởi động",
        "symptom": "Mô tơ đề quay nhưng máy không nổ, xe tay ga không thể khởi động",
        "diagnosed_issue": "Hết xăng, nghẹt kim phun PGM-FI, bugi bị ướt xăng hoặc chân chống nghiêng chưa gạt lên hoàn toàn.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara",
        "severity": "CANH_BAO",
        "emergency_advice": "Đảm bảo đã bóp chặt tay phanh trái (phanh sau) trước khi ấn nút đề. Xe tay ga có công tắc ngắt an toàn tại tay phanh.",
        "troubleshooting_steps": [
            "Gạt chân chống nghiêng lên hết hành trình (xe tay ga Honda tự động ngắt đánh lửa khi hạ chân chống nghiêng).",
            "Bóp chặt tay phanh (phanh sau hoặc phanh trước) và ấn nút khởi động.",
            "Kiểm tra mức nhiên liệu trên đồng hồ xăng.",
            "Nếu xe để lâu không đi bị ngộp xăng: Mở hết tay ga, ấn nút khởi động trong 5 giây, sau đó đóng ga và khởi động lại bình thường."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 101)"
    },
    {
        "id": "HD_XEGA_STARTER_SILENT_NO_CRANK_101",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Ga - Động cơ & Khởi động",
        "symptom": "Ấn nút đề không có tiếng động cơ quay, xe tay ga im lìm hoàn toàn",
        "diagnosed_issue": "Bình ắc quy hết điện, hỏng công tắc phanh tay, đứt cầu chì chính hoặc hỏng nút bấm đề.",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Kích bình ắc quy / Thay ắc quy xe máy tận nơi",
        "severity": "CANH_BAO",
        "emergency_advice": "Kiểm tra xem đèn hậu/đèn phanh có sáng lên khi bóp tay phanh không. Nếu không sáng, công tắc phanh bị hỏng khiến xe không nhận lệnh đề.",
        "troubleshooting_steps": [
            "Thử bóp mạnh tay phanh bên kia (đổi từ phanh trái sang phanh phải) rồi ấn nút đề.",
            "Kiểm tra còi và đèn xi nhan: Nếu còi không kêu hoặc kêu yếu ớt, bình ắc quy đã cạn kiệt điện năng.",
            "Mở nắp mặt nạ trước kiểm tra cọc bình ắc quy có bị tuột lỏng hoặc rỉ sét không.",
            "Kiểm tra cầu chì chính trong hộp cầu chì dưới sàn để chân hoặc phía trước đầu xe."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 101)"
    },
    {
        "id": "HD_XEGA_COOLANT_OVERHEAT_102",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Ga - Hệ thống làm mát",
        "symptom": "Đèn báo quá nhiệt dung dịch làm mát sáng đỏ trên mặt đồng hồ xe tay ga",
        "diagnosed_issue": "Nhiệt độ nước làm mát động cơ vượt ngưỡng an toàn do thiếu dung dịch làm mát, két tản nhiệt bị bám đầy bùn đất hoặc quạt két nước hỏng.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Bổ sung nước làm mát / Vệ sinh két tản nhiệt xe tay ga",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Dừng xe ngay, tắt khóa điện. Không để xe nổ cầm chừng vì xe tay ga làm mát bằng két nước đặt bên hông cần gió lưu thông.",
        "troubleshooting_steps": [
            "Tấp xe vào chỗ râm mát, tắt máy để nguội động cơ ít nhất 20 phút.",
            "Kiểm tra khe lấy gió két tản nhiệt bên hông xe xem có bị túi nilon, rác hoặc bùn đất bám kín cánh tản nhiệt không.",
            "Kiểm tra mức dung dịch làm mát trong bình phụ (nằm dưới sàn để chân hoặc trong cốp xe).",
            "Nếu cạn, mở nắp bình dự trữ và châm thêm nước làm mát chuyên dụng (hoặc nước cất khẩn cấp).",
            "Nếu sau khi châm nước và để nguội mà đèn vẫn sáng đỏ khi chạy, hãy dừng xe gọi cứu hộ ngay."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 102)"
    },
    {
        "id": "HD_XEGA_IDLING_STOP_NOT_WORKING_107",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Ga - Hệ thống Idling Stop",
        "symptom": "Hệ thống Idling Stop (ngắt động cơ tạm thời) không tự tắt máy khi dừng đèn đỏ",
        "diagnosed_issue": "Bình ắc quy yếu điện áp, nhiệt độ động cơ chưa đủ nóng, xe chưa từng chạy quá 10 km/h, hoặc công tắc Idling Stop đang tắt.",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Kiểm tra điện áp bình ắc quy xe tay ga",
        "severity": "CANH_BAO",
        "emergency_advice": "Hệ thống tự động vô hiệu hóa tính năng Idling Stop để bảo vệ bình ắc quy không bị kiệt điện khi dừng đỗ liên tục.",
        "troubleshooting_steps": [
            "Kiểm tra công tắc Idling Stop bên tay lái phải: Đảm bảo công tắc gạt về vị trí 'Idling Stop' (không phải 'Idling').",
            "Xe cần phải chạy ít nhất 1 lần vượt quá 10 km/h sau khi khởi động để kích hoạt hệ thống.",
            "Động cơ cần hoạt động từ 5-10 phút để đạt nhiệt độ nước làm mát trên 60°C thì Idling Stop mới bắt đầu hoạt động.",
            "Nếu đã thỏa mãn các điều kiện trên mà Idling Stop vẫn không hoạt động, điện áp bình ắc quy đang dưới 12.4V (ắc quy chai yếu, cần sạc hoặc thay thế)."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 107)"
    },
    {
        "id": "HD_XEGA_CVT_BELT_BROKEN_120",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Ga - Hệ thống truyền động CVT",
        "symptom": "Xe tay ga nổ máy vặn ga tiếng động cơ gầm rú to nhưng bánh sau không quay, xe không di chuyển",
        "diagnosed_issue": "Dây đai truyền động (dây curoa CVT) bị đứt hoặc tuột, bi nồi và búa ba càng côn sau bị kẹt vỡ.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ thay dây curoa xe tay ga lưu động / Kéo xe về gara",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Tắt máy ngay lập tức. Không tiếp tục vặn ga vì các sợi bố dây curoa đứt có thể quấn chặt vào trục khuỷu hoặc làm vỡ lốc nồi nhôm.",
        "troubleshooting_steps": [
            "Tắt động cơ, dựng chân chống đứng và thử quay bánh sau bằng tay xem có bị kẹt cứng không.",
            "Lắng nghe xem có tiếng lạo xạo hoặc tiếng kim loại cọ xát trong lốc nồi bên trái không.",
            "Sự cố đứt dây curoa không thể tự khắc phục tại chỗ nếu không có dụng cụ mở nồi chuyên dụng và dây curoa thay thế.",
            "Liên hệ dịch vụ cứu hộ xe máy lưu động SRAS để thợ mang theo dây curoa đúng thông số đến thay thế tận nơi hoặc chở xe về gara."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 120)"
    },
    {
        "id": "HD_XEGA_EMERGENCY_SEAT_OPEN_112",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Tay Ga - Khóa thông minh Smart Key",
        "symptom": "Mất chìa Smart Key hoặc xe hết sạch ắc quy không thể ấn nút mở cốp yên xe",
        "diagnosed_issue": "Khóa điện tử không có nguồn điện để kích hoạt rơ-le mở cốp yên xe, cần sử dụng cơ cấu mở khóa khẩn cấp.",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Hỗ trợ mở khóa yên xe và kích bình khẩn cấp",
        "severity": "CANH_BAO",
        "emergency_advice": "Sử dụng thanh chìa khóa nhựa từ khẩn cấp (đi kèm theo xe lúc mua) để mở cơ khí.",
        "troubleshooting_steps": [
            "Tìm nắp đậy khẩn cấp cạnh núm khóa Smart Key (hoặc gần nắp bình xăng tùy dòng xe).",
            "Dùng đầu ngón tay hoặc tua vít nhỏ cạy nắp đậy nhựa ra ngoài.",
            "Tra thanh chìa nhựa khẩn cấp vào ổ khóa cơ bên trong sao cho khớp các rãnh từ tính.",
            "Gạt thanh chìa xuống dưới (hoặc xoay theo chiều kim đồng hồ) cho đến khi nghe tiếng 'cạch' của ngàm khóa yên nhả ra.",
            "Nâng yên xe lên để tiếp cận bình ắc quy kiểm tra và thay thế pin/ắc quy."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - xega.pdf (Trang 112)"
    },

    # =========================================================================
    # 3. SỔ TAY XE SỐ (xeso.pdf - Honda Wave Alpha / Future / Blade)
    # =========================================================================
    {
        "id": "HD_XESO_CHAIN_SLIPPED_OR_BROKEN_95",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Số - Hệ thống truyền xích",
        "symptom": "Xe số bị tuột xích, đứt sên hoặc xích kêu lạch cạch dữ dội va đập vào hộp xích",
        "diagnosed_issue": "Xích tải (sên xe) bị chùng quá mức, nhông sên dĩa bị mòn nhọn răng hoặc mắt xích bị khô rỉ sét đứt chốt.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cắt mắt xích / Tăng sên / Thay nhông sên dĩa xe số lưu động",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Bóp phanh dừng xe từ từ vào lề. TUYỆT ĐỐI KHÔNG cố vào số vít ga vì xích tuột có thể bị quấn chặt vào may-ơ bánh sau làm khóa cứng bánh gây té ngã!",
        "troubleshooting_steps": [
            "Dựng chân chống đứng, mở nắp kiểm tra xích trên hộp xích (carte).",
            "Kiểm tra độ chùng xích: Độ chùng tiêu chuẩn là 20 - 30 mm. Nếu xích chạm sát vào hộp xích dưới là xích quá chùng.",
            "Nếu xích chỉ bị tuột khỏi dĩa: Nới lỏng ốc trục bánh sau, dùng tua vít lách xích vào răng dĩa và xoay bánh để đưa xích vào lại.",
            "Siết ốc tăng sên ở hai bên gắp sau đều nhau để xích có độ căng vừa phải và bánh xe cân thẳng hàng.",
            "Nếu xích bị đứt mắt sên: Cần thợ cứu hộ mang theo mắt xích nối (khóa xích) hoặc kìm cắt sên để khắc phục tại chỗ."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - xeso.pdf (Trang 95)"
    },
    {
        "id": "HD_XESO_WATER_IN_ENGINE_HYDROSTATIC_105",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Số - Động cơ & Ngập nước",
        "symptom": "Xe số chạy qua vùng nước ngập bị chết máy đột ngột, pô xe sặc nước",
        "diagnosed_issue": "Nước tràn vào ống xả (ống pô), cổ hút gió hoặc lọc gió làm ướt bugi và nước lọt vào buồng đốt động cơ.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ xe ngập nước / Xả nước buồng đốt và thay nhớt máy",
        "severity": "NGUY_HIEM",
        "emergency_advice": "TUYỆT ĐỐI KHÔNG CỐ ĐỀ NỔ HOẶC ĐẠP MÁY LẠI NGAY! Nước trong buồng đốt không chịu nén, cố khởi động sẽ làm cong dên, gãy tay biên và vỡ lốc máy.",
        "troubleshooting_steps": [
            "Dắt xe ra khỏi khu vực ngập nước lên chỗ khô ráo và tắt ngay khóa điện.",
            "Dựng chân chống đứng, nâng đầu xe cao lên để dốc nước chảy ngược ra khỏi ống pô.",
            "Tháo chụp bugi và dùng tuýp mở bugi tháo bugi ra ngoài. Lau khô sạch đầu bugi.",
            "Khi bugi đã tháo: Vặn tay ga hết cỡ và dùng cần đạp máy đạp liên tục 15-20 lần để tống toàn bộ nước đọng trong buồng đốt ra ngoài qua lỗ bugi.",
            "Rút que thăm nhớt kiểm tra: Nếu nhớt máy có màu cà phê sữa hoặc đục trắng, nước đã trộn vào cacte nhớt, tuyệt đối không nổ máy mà phải thay nhớt mới ngay."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - xeso.pdf (Trang 105)"
    },

    # =========================================================================
    # 4. SỔ TAY Ô TÔ XĂNG (otoxang.pdf - Toyota Vios / Camry / Fortuner / Innova)
    # =========================================================================
    {
        "id": "TOYOTA_OIL_PRESSURE_WARNING_LIGHT_50",
        "vehicle_type": "CAR",
        "category": "Sổ tay Ô tô Xăng - Đèn cảnh báo táp-lô",
        "symptom": "Đèn cảnh báo áp suất dầu động cơ (hình bình dầu màu đỏ) sáng trên bảng đồng hồ ô tô",
        "diagnosed_issue": "Áp suất dầu bôi trơn động cơ xuống mức cực kỳ nguy hiểm do thiếu hụt dầu nhớt nghiêm trọng, rò rỉ cacte đáy nhớt hoặc hỏng bơm dầu.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ kiểm tra dầu máy / Châm nhớt động cơ ô tô lưu động",
        "severity": "NGUY_HIEM",
        "emergency_advice": "DỪNG XE NGAY LẬP TỨC tại vị trí an toàn và TẮT MÁY! Tiếp tục lái xe khi đèn áp suất dầu sáng sẽ làm cháy bạc biên, lột dên và phá hủy hoàn toàn động cơ trong vòng vài phút.",
        "troubleshooting_steps": [
            "Tấp xe an toàn vào lề đường, kéo phanh tay và tắt động cơ.",
            "Chờ khoảng 5-10 phút để dầu nhớt chảy hồi về đáy cacte.",
            "Mở nắp ca-pô, rút que thăm dầu động cơ ra, dùng khăn sạch lau khô rồi cắm ngập lại hết cỡ và rút ra kiểm tra.",
            "Quan sát vạch dầu trên que thăm: Mức dầu phải nằm giữa hai vạch Low (L) và Full (F). Nếu dưới vạch Low, xe đang cạn kiệt dầu nhớt.",
            "Kiểm tra dưới gầm xe xem có vết dầu loang lớn rỉ ra từ cacte hoặc lọc dầu không.",
            "Nếu mức dầu quá thấp, bổ sung ngay dầu động cơ đúng phẩm cấp (0W-20, 5W-30...). Nếu châm dầu mà đèn vẫn sáng, không được nổ máy, gọi xe cứu hộ sàn trượt ngay."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 50)"
    },
    {
        "id": "TOYOTA_BRAKE_SYSTEM_WARNING_LIGHT_50",
        "vehicle_type": "CAR",
        "category": "Sổ tay Ô tô Xăng - Đèn cảnh báo táp-lô",
        "symptom": "Đèn cảnh báo hệ thống phanh (hình dấu chấm than trong vòng tròn (!) màu đỏ) sáng khi xe đang chạy",
        "diagnosed_issue": "Mức dầu phanh trong bình chứa xuống thấp do rò rỉ đường ống dầu phanh, mòn má phanh nghiêm trọng, hoặc quên hạ phanh tay.",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Kiểm tra hệ thống phanh / Bổ sung dầu phanh DOT3/DOT4",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Kiểm tra cần phanh tay trước tiên. Nếu phanh tay đã hạ hết mà đèn vẫn sáng đỏ, hiệu quả phanh có thể bị suy giảm nghiêm trọng hoặc mất phanh bất ngờ!",
        "troubleshooting_steps": [
            "Kiểm tra và hạ hết phanh tay (hoặc phanh đỗ điện tử).",
            "Nếu đèn vẫn sáng: Giảm tốc độ từ từ, thử đạp chân phanh xem bàn đạp có bị hẫng, mềm sâu hoặc chạm sàn không.",
            "Tấp xe vào lề đường, mở nắp ca-pô kiểm tra bình dầu phanh (nằm góc trên bên tài xế).",
            "Kiểm tra xem mức dầu phanh có nằm dưới vạch MIN không. Nếu thiếu dầu phanh, tuyệt đối không tiếp tục lưu thông trên đường dốc hay tốc độ cao.",
            "Gọi cứu hộ kiểm tra đường ống phanh có bị nứt vỡ hoặc rò rỉ cup-pen phanh tại các bánh xe không."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 50)"
    },
    {
        "id": "TOYOTA_BATTERY_CHARGE_WARNING_LIGHT_50",
        "vehicle_type": "CAR",
        "category": "Sổ tay Ô tô Xăng - Đèn cảnh báo táp-lô",
        "symptom": "Đèn cảnh báo hệ thống sạc bình ắc quy (hình bình ắc quy màu đỏ) sáng khi xe đang nổ máy",
        "diagnosed_issue": "Hệ thống phát điện của ô tô bị lỗi do hỏng máy phát (alternator), đứt dây curoa dẫn động máy phát, hoặc cọc bình ắc quy bị lỏng.",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Cứu hộ máy phát điện / Kích bình ắc quy ô tô",
        "severity": "CANH_BAO",
        "emergency_advice": "Xe đang chạy hoàn toàn bằng năng lượng còn lại trong bình ắc quy. Xe sẽ chết máy đột ngột khi ắc quy cạn kiệt (sau khoảng 15-30 phút).",
        "troubleshooting_steps": [
            "Tắt ngay toàn bộ thiết bị điện tiêu thụ lớn không cần thiết: Tắt máy lạnh điều hòa (A/C), tắt màn hình giải trí, sưởi kính, đèn gầm.",
            "Chạy xe ngay đến gara sửa chữa gần nhất trước khi bình ắc quy hết sạch điện.",
            "Đỗ xe kiểm tra dây curoa tổng khoang máy xem có bị đứt, chùng hoặc tuột khỏi puly máy phát không.",
            "Nếu xe đã chết máy giữa đường, gọi dịch vụ cứu hộ thay thế bình hoặc máy phát."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 50)"
    },
    {
        "id": "TOYOTA_FLAT_TIRE_SPARE_REPLACEMENT_51",
        "vehicle_type": "CAR",
        "category": "Sổ tay Ô tô Xăng - Sự cố lốp xe",
        "symptom": "Xe ô tô bị thủng lốp, dính đinh, xịt hơi hoặc nổ lốp trên đường",
        "diagnosed_issue": "Lốp xe ô tô mất áp suất khí nén do cán đinh, rách thành lốp hoặc hở chân van hơi.",
        "suggested_issue_type": "FLAT_TIRE",
        "suggested_service": "Thay lốp dự phòng ô tô lưu động / Vá lốp ô tô tận nơi",
        "severity": "CANH_BAO",
        "emergency_advice": "Bật đèn cảnh báo nguy hiểm (Hazard), tấp xe vào làn khẩn cấp hoặc nơi bằng phẳng, kéo phanh tay, cài số P (số tự động) hoặc số 1/R (số sàn). Đặt tam giác cảnh báo cách đuôi xe 50-100m.",
        "troubleshooting_steps": [
            "Chặn bánh xe đối diện đường chéo bằng cục chèn bánh hoặc gạch đá để chống trôi xe.",
            "Lấy lốp dự phòng, con đội kích và cần tháo ốc bánh xe dưới khoang hành lý cốp sau.",
            "Nới lỏng các đai ốc bánh xe khoảng 1/2 vòng theo thứ tự đối xứng hình sao (CHƯA nâng kích).",
            "Đặt con đội kích vào đúng ĐIỂM KÊ KÍCH dập nổi dưới lườn xe (phía sau bánh trước hoặc phía trước bánh sau).",
            "Nâng kích lên cho bánh xe hổng cách mặt đất khoảng 3-5 cm. Tháo rời các đai ốc và tháo lốp xịt ra.",
            "Lắp lốp dự phòng vào, siết nhẹ các ốc bằng tay, hạ kích xuống đất rồi mới siết chặt cứng các ốc theo hình chữ X/ngôi sao.",
            "Cất lốp thủng và đồ nghề vào cốp xe. Kiểm tra áp suất lốp dự phòng sớm nhất có thể."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 51-64)"
    },
    {
        "id": "TOYOTA_JUMP_START_DEAD_BATTERY_60",
        "vehicle_type": "CAR",
        "category": "Sổ tay Ô tô Xăng - Hệ thống khởi động",
        "symptom": "Xe ô tô không đề được, xoay chìa khóa hoặc bấm nút Start có tiếng tạch tạch rồi tắt lịm",
        "diagnosed_issue": "Bình ắc quy 12V của ô tô bị cạn điện (do quên tắt đèn pha qua đêm, bình quá niên hạn sử dụng hoặc xe để lâu ngày không nổ máy).",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Cứu hộ kích bình ắc quy ô tô 12V lưu động / Thay ắc quy ô tô tận nơi",
        "severity": "CANH_BAO",
        "emergency_advice": "Tuân thủ nghiêm ngặt quy trình đấu nối dây câu bình: ĐỎ vào DƯƠNG, ĐEN vào MASS. Đấu nhầm cực sẽ gây nổ bình và cháy hộp đen điều khiển ECU xe!",
        "troubleshooting_steps": [
            "Đưa xe hỗ trợ đến gần xe hết bình sao cho dây câu chạm tới hai khoang máy (hai xe không chạm vào nhau). Tắt máy cả hai xe.",
            "Bước 1 (Dây ĐỎ): Kẹp một đầu dây ĐỎ vào cọc DƯƠNG (+) của bình ắc quy xe bị hết điện.",
            "Bước 2 (Dây ĐỎ): Kẹp đầu dây ĐỎ còn lại vào cọc DƯƠNG (+) của bình ắc quy xe cứu hộ.",
            "Bước 3 (Dây ĐEN): Kẹp một đầu dây ĐEN vào cọc ÂM (-) của bình ắc quy xe cứu hộ.",
            "Bước 4 (Dây ĐEN): Kẹp đầu dây ĐEN còn lại vào một khối kim loại không sơn trên lốc máy xe hết bình (KHÔNG kẹp trực tiếp vào cọc âm xe hết bình để tránh tia lửa điện).",
            "Nổ máy xe cứu hộ và đạp nhẹ chân ga khoảng 2000 vòng/phút trong 3-5 phút để nạp điện.",
            "Khởi động xe bị chết máy. Sau khi máy nổ, tháo dây câu theo THỨ TỰ NGƯỢC LẠI (Đen mass -> Đen âm -> Đỏ dương cứu hộ -> Đỏ dương xe hết)."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng - otoxang.pdf (Trang 60)"
    },

    # =========================================================================
    # 5. SỔ TAY XE Ô TÔ ĐIỆN & XE MÁY ĐIỆN (xeotodien.pdf & xemaydien.pdf - VinFast)
    # =========================================================================
    {
        "id": "VINFAST_VF7_EV_EMERGENCY_MANUAL_TAILGATE_23",
        "vehicle_type": "CAR",
        "category": "Sổ tay Xe Ô Tô Điện - Cứu hộ khẩn cấp",
        "symptom": "Xe ô tô điện hết sạch điện ắc quy 12V, màn hình tắt tối đen, cửa hậu và cốp xe không thể mở bằng điện",
        "diagnosed_issue": "Ắc quy điện áp thấp 12V bị kiệt hoàn toàn khiến hệ thống khóa cửa điện tử và mô-tơ mở cốp sau không hoạt động.",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Kích bình ắc quy 12V xe điện / Mở cốp xe điện khẩn cấp",
        "severity": "CANH_BAO",
        "emergency_advice": "Xe ô tô điện luôn có cơ chế nhả chốt cơ khí khẩn cấp từ bên trong khoang hành lý.",
        "troubleshooting_steps": [
            "Gập hàng ghế sau xuống để tiếp cận từ khoang cabin vào phía sau cốp xe.",
            "Tìm nắp che cơ cấu nhả an toàn ở mép phía dưới của cửa cốp sau.",
            "Dùng tay cạy mở nắp che bảo vệ hình chữ nhật nhỏ.",
            "Dùng ngón tay hoặc tua vít ấn gạt cần gạt cơ khí xuống phía dưới để nhả ngàm khóa cửa cốp.",
            "Đẩy cửa cốp sau ra ngoài bằng tay để mở cốp lấy đồ đạc hoặc dụng cụ kích bình 12V dưới nắp ca-pô."
        ],
        "source": "Sách Hướng Dẫn Cứu Hộ Khẩn Cấp VinFast VF 7 EV (Trang 23)"
    },
    {
        "id": "VINFAST_EV_HIGH_VOLTAGE_SAFETY_DISCONNECT_29",
        "vehicle_type": "CAR",
        "category": "Sổ tay Xe Ô Tô Điện - An toàn điện cao áp",
        "symptom": "Xe ô tô điện gặp tai nạn, ngập nước hoặc cần cứu hộ kỹ thuật trên đường",
        "diagnosed_issue": "Hệ thống điện cao áp (High Voltage 400V) trên xe điện tiềm ẩn nguy cơ phóng điện và giật điện cực kỳ nguy hiểm nếu không được cách ly đúng quy trình.",
        "suggested_issue_type": "ACCIDENT",
        "suggested_service": "Cứu hộ xe điện chuyên dụng / Ngắt nguồn cao áp 400V",
        "severity": "NGUY_HIEM",
        "emergency_advice": "TUYỆT ĐỐI KHÔNG CHẠM VÀO, CẮT HOẶC KÉO CÁC DÂY CÁP MÀU CAM! Toàn bộ dây cáp điện cao áp trên xe điện đều có lớp bọc nhận diện màu cam.",
        "troubleshooting_steps": [
            "Luôn mặc trang bị bảo hộ cách điện chuyên dụng (PPE) khi tiếp cận xe điện bị biến dạng.",
            "Tìm vòng cắt khẩn cấp (Emergency Cut Loop) có nhãn màu vàng trong khoang trước dưới nắp ca-pô.",
            "Dùng kìm cách điện cắt đứt bộ dây tại nhãn màu vàng để ngắt nguồn điều khiển 12V cấp cho rơ-le pin cao áp.",
            "Sau khi cắt vòng khẩn cấp, hệ thống điện cao áp 400V sẽ bị ngắt hoàn toàn khỏi các mô-tơ và thiết bị trên xe.",
            "Khi nâng xe, TUYỆT ĐỐI KHÔNG kê kích vào tấm sàn chứa pin cao áp dưới gầm xe để tránh làm thủng cell pin gây cháy nổ."
        ],
        "source": "Sách Hướng Dẫn Cứu Hộ Khẩn Cấp VinFast VF 7 EV (Trang 24, 29)"
    },
    {
        "id": "VINFAST_EV_BATTERY_FIRE_RESPONSE_31",
        "vehicle_type": "CAR",
        "category": "Sổ tay Xe Ô Tô Điện - Phòng cháy chữa cháy",
        "symptom": "Pin cao áp xe ô tô điện bốc khói, phát tiếng xì lớn hoặc bốc cháy dưới gầm xe",
        "diagnosed_issue": "Hiện tượng thoát nhiệt (Thermal Runaway) của các cell pin Lithium-ion do va đập gầm làm móp cell pin hoặc chập mạch bên trong khối pin.",
        "suggested_issue_type": "ACCIDENT",
        "suggested_service": "Cứu hỏa khẩn cấp / Cách ly phương tiện xe điện",
        "severity": "NGUY_HIEM",
        "emergency_advice": "SƠ TÁN NGAY LẬP TỨC toàn bộ người ra xa xe tối thiểu 30-50m. Khói pin Li-ion có chứa khí độc (HF, CO, CO2). Gọi ngay 114!",
        "troubleshooting_steps": [
            "Sơ tán tất cả hành khách ra khỏi xe và giữ khoảng cách an toàn, tránh hít phải khói độc.",
            "Cần một lượng nước CỰC KỲ LỚN (hàng nghìn lít nước) để làm mát liên tục khối pin và dập tắt phản ứng thoát nhiệt.",
            "Bình chữa cháy mini trên xe chỉ có tác dụng dập đám cháy nội thất phụ trợ, không thể dập tắt phản ứng cháy bên trong khối pin.",
            "CẢNH BÁO BỐC CHÁY LẠI: Pin xe điện có thể bốc cháy trở lại sau nhiều giờ kể cả khi lửa đã tắt. Phải cách ly xe ngoài trời cách xa các tòa nhà và xe khác ít nhất 15m trong 48 giờ."
        ],
        "source": "Sách Hướng Dẫn Cứu Hộ Khẩn Cấp VinFast VF 7 EV (Trang 31)"
    },
    {
        "id": "VINFAST_EV_SUBMERSION_FLOOD_SAFETY_32",
        "vehicle_type": "CAR",
        "category": "Sổ tay Xe Ô Tô Điện - Ngập nước",
        "symptom": "Xe ô tô điện / xe máy điện bị ngập trong nước lũ hoặc mắc kẹt tại vùng ngập sâu",
        "diagnosed_issue": "Xe ngập nước gây nguy cơ rò rỉ điện hoặc hư hại các cảm biến, hộp điều khiển MCU và cổng sạc.",
        "suggested_issue_type": "ACCIDENT",
        "suggested_service": "Cứu hộ cẩu kéo xe ngập nước / Trục vớt xe điện",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Xe điện thông thường đạt chuẩn chống nước IP67/IP68 không truyền điện giật ra toàn bộ vũng nước, nhưng nếu xe bị đâm va thủng vỏ pin trước khi chìm, nguy cơ giật điện sẽ tăng cao.",
        "troubleshooting_steps": [
            "Tắt xe ngay lập tức nếu còn ngồi trong xe, tháo dây an toàn và mở cửa thoát ra ngoài vùng ngập an toàn.",
            "Kéo xe ra khỏi nước bằng xe kéo cứu hộ chuyên dụng có tời kéo sàn trượt.",
            "Sau khi xe lên bờ khô ráo, lập tức ngắt cọc âm bình ắc quy 12V hoặc cắt vòng cắt khẩn cấp của xe điện.",
            "TUYỆT ĐỐI KHÔNG cắm sạc hoặc cố bật nguồn xe cho đến khi được kỹ thuật viên chuyên trách kiểm tra sấy khô toàn bộ hệ thống giắc nối cao áp."
        ],
        "source": "Sách Hướng Dẫn Cứu Hộ Khẩn Cấp VinFast VF 7 EV (Trang 32)"
    },
    {
        "id": "VINFAST_EBIKE_THROTTLE_BRAKE_CUTOFF_ERROR_25",
        "vehicle_type": "MOTORBIKE",
        "category": "Sổ tay Xe Máy Điện - Hệ thống truyền động điện",
        "symptom": "Xe máy điện bật khóa màn hình vẫn sáng nhưng vặn ga xe không chạy, bánh xe không quay",
        "diagnosed_issue": "Công tắc ngắt phanh điện bị kẹt (xe hiểu nhầm đang bóp phanh nên tự ngắt điện mô-tơ), lỗi tay ga điện tử hoặc rơ-le bảo vệ pin LFP ngắt xả.",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ sửa xe máy điện lưu động / Thay tay ga, công tắc phanh",
        "severity": "CANH_BAO",
        "emergency_advice": "Kiểm tra xem tay phanh có bị kẹt không hồi hết ra không. Xe máy điện có công tắc ngắt động cơ tích hợp ngay trong cùm phanh.",
        "troubleshooting_steps": [
            "Dùng tay đẩy mạnh cả hai tay phanh (trái và phải) về phía trước để đảm bảo công tắc ngắt điện ở tay phanh đã nhả hoàn toàn.",
            "Kiểm tra chân chống nghiêng: Gạt chân chống nghiêng lên hoàn toàn (xe máy điện có cảm biến chân chống ngắt ga).",
            "Quan sát biểu tượng chữ 'READY' hoặc đèn báo lỗi trên mặt đồng hồ: Nếu chữ READY không sáng, xe chưa sẵn sàng nhận lệnh ga.",
            "Tắt chìa khóa xe, mở yên xe tắt át-tô-mát (aptomat) tổng của pin trong 30 giây rồi bật lại để khởi động lại bộ điều khiển MCU.",
            "Nếu pin bị tụt áp dưới mức bảo vệ hoặc cắm sạc báo lỗi đèn đỏ, cần thợ cứu hộ kích pin phục hồi."
        ],
        "source": "Sách Hướng Dẫn Sử Dụng Xe Máy Điện VinFast (Trang 25)"
    }
]

def clean_and_update_knowledge_base():
    print("[*] Đang đọc cơ sở tri thức hiện tại...")
    if not os.path.exists(LOCAL_JSON):
        print(f"[!] Không tìm thấy file {LOCAL_JSON}")
        return

    with open(LOCAL_JSON, "r", encoding="utf-8") as f:
        current_data = json.load(f)

    print(f"    - Tổng số bản ghi ban đầu: {len(current_data)}")

    # Giữ lại các bản ghi không phải là bản ghi cào bị lỗi từ manuals
    # Các bản ghi cào lỗi trước đây bắt đầu bằng "HD_" và có source chứa "taycon.pdf", "xega.pdf", "xeso.pdf", "otoxang.pdf"
    # có đặc trưng: "symptom": "Không khởi động động cơ. Hãy mang xe", v.v.
    preserved_records = []
    for item in current_data:
        src = item.get("source", "")
        cat = item.get("category", "")
        # Nếu là dữ liệu OBD hoặc Dashboard lights (không phải từ các manual PDF cũ bị cắt vụn)
        is_flawed_manual = any(m in src for m in ["taycon.pdf", "xega.pdf", "xeso.pdf", "otoxang.pdf", "manuals"]) or "Sổ tay" in cat
        if not is_flawed_manual:
            preserved_records.append(item)

    print(f"    - Giữ lại {len(preserved_records)} bản ghi chuẩn (Mã lỗi OBD & Đèn cảnh báo táp-lô).")
    print(f"    - Thêm mới {len(CANONICAL_MANUAL_FAULTS)} bản ghi chuẩn xác, hoàn chỉnh từ Sổ tay kỹ thuật.")

    final_knowledge_base = CANONICAL_MANUAL_FAULTS + preserved_records

    # Ghi đè vào dataset local
    with open(LOCAL_JSON, "w", encoding="utf-8") as f:
        json.dump(final_knowledge_base, f, ensure_ascii=False, indent=2)
    print(f"[+] Đã cập nhật thành công file local: {LOCAL_JSON}")

    # Đồng bộ sang backend resources
    os.makedirs(os.path.dirname(BACKEND_JSON), exist_ok=True)
    with open(BACKEND_JSON, "w", encoding="utf-8") as f:
        json.dump(final_knowledge_base, f, ensure_ascii=False, indent=2)
    print(f"[+] Đã đồng bộ sang backend resource: {BACKEND_JSON}")

    print(f"[*] Tổng số bản ghi tri thức sau chuẩn hóa: {len(final_knowledge_base)}")

if __name__ == "__main__":
    clean_and_update_knowledge_base()

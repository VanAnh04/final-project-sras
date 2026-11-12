# -*- coding: utf-8 -*-
"""
SRAS AI KNOWLEDGE CRAWLER & BUILDER
Hệ thống cào & xây dựng cơ sở tri thức chẩn đoán bệnh xe máy và ô tô tại Việt Nam.
Dữ liệu chuẩn hóa khớp 100% với hệ thống cứu hộ thông minh SRAS (Smart Roadside Assistance System).
"""

import os
import sys
import json
import re
import time
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any

# Cấu hình UTF-8 cho Windows console tránh lỗi UnicodeEncodeError
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Đường dẫn xuất file tri thức
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(CURRENT_DIR, "data")
BACKEND_KNOWLEDGE_DIR = os.path.abspath(
    os.path.join(CURRENT_DIR, "..", "src", "main", "resources", "knowledge")
)

OUT_FILE_LOCAL = os.path.join(DATA_DIR, "vehicle_fault_knowledge.json")
OUT_FILE_BACKEND = os.path.join(BACKEND_KNOWLEDGE_DIR, "vehicle_fault_knowledge.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
}

# ==============================================================================
# 1. BỘ TRI THỨC NỀN TẢNG THỰC CHIẾN (SEED KNOWLEDGE)
# Chuẩn kỹ thuật xe máy (Honda, Yamaha, Piaggio) & Ô tô (Toyota, Hyundai, VinFast) tại VN
# ==============================================================================
SEED_KNOWLEDGE: List[Dict[str, Any]] = [
    # ------------------ XE MÁY: ẮC QUY & ĐIỆN XE (DEAD_BATTERY) ------------------
    {
        "id": "MB_BATTERY_01",
        "vehicle_type": "MOTORBIKE",
        "category": "Ắc quy & Điện khởi động",
        "symptom": "Bật khóa Smartkey/chìa cơ đèn taplo mờ hoặc không sáng, bấm còi kêu lí nhí hoặc không kêu, bấm đề chỉ nghe tiếng tạch tạch nhỏ dưới gầm cốp rồi lịm hẳn",
        "diagnosed_issue": "Ắc quy bị cạn kiệt điện năng (dưới 10.5V) hoặc hỏng bình, cọc bình bị lỏng/oxy hóa",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Cứu hộ kích bình ắc quy hoặc thay mới ắc quy xe máy tận nơi",
        "severity": "CANH_BAO",
        "emergency_advice": "Tắt khóa điện ngay, không cố bấm nút đề liên tục nhiều lần vì sẽ làm cháy rơ-le đề hoặc hỏng củ đề.",
        "troubleshooting_steps": [
            "Dựng chân chống đứng, kiểm tra chìa khóa đã vặn đúng nấc ON và gạt chân chống nghiêng lên",
            "Nếu xe có cần đạp khởi động (xe số/xe ga đời cũ): Bật khóa ON và dùng cần đạp dứt khoát 3-5 lần để nổ máy tạm thời",
            "Mở nắp cốp kiểm tra 2 cọc bình ắc quy xem có bị lỏng bu lông hoặc bám muối xanh/trắng không",
            "Gọi đội cứu hộ lưu động mang bộ kích ắc quy 12V hoặc thay bình GS/Globe mới tận nơi"
        ],
        "source": "Sổ tay kỹ thuật bảo dưỡng Honda & Yamaha Việt Nam"
    },
    {
        "id": "MB_BATTERY_02",
        "vehicle_type": "MOTORBIKE",
        "category": "Ắc quy & Khóa Smartkey",
        "symptom": "Xe dùng khóa Smartkey (SH, Vision, Lead, AirBlade) đến gần xe ấn núm khóa không có tín hiệu, đèn ổ khóa không sáng, xe không nhận remote",
        "diagnosed_issue": "Remote Smartkey hết pin CR2032 hoặc bình ắc quy xe bị kiệt do quên vặn núm về OFF",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Thay pin Smartkey hoặc kích bình ắc quy xe máy lưu động",
        "severity": "NHE",
        "emergency_advice": "Thử bấm nút hình chìa khóa trên remote xem đèn LED trên remote sáng đỏ hay xanh.",
        "troubleshooting_steps": [
            "Bấm giữ nút chìa khóa trên remote 2 giây đến khi đèn chuyển từ Đỏ sang Xanh để mở khóa remote",
            "Nếu đèn remote không sáng hoặc nhấp nháy yếu: Remote đã hết pin CR2032, cần thay pin mới",
            "Nếu remote vẫn sáng xanh mà ổ khóa xe không kêu bíp: Bình ắc quy trên xe đã cạn kiệt do để qua đêm, cần kích bình"
        ],
        "source": "Kinh nghiệm cứu hộ xe máy Smartkey thực tế"
    },

    # ------------------ XE MÁY: LỐP XE (FLAT_TIRE) ------------------
    {
        "id": "MB_TIRE_01",
        "vehicle_type": "MOTORBIKE",
        "category": "Lốp & Bánh xe",
        "symptom": "Bánh sau hoặc bánh trước bị xẹp lép, dắt xe rất nặng, đuôi xe đảo lắc lư khi di chuyển, phát hiện đinh hoặc vít găm trên mặt lốp",
        "diagnosed_issue": "Thủng lốp xe máy không săm (Tubeless) do cán đinh hoặc rách mặt lốp",
        "suggested_issue_type": "FLAT_TIRE",
        "suggested_service": "Vá lốp xe máy lưu động (vá dùi khẩn cấp hoặc vá nấm cao cấp)",
        "severity": "CANH_BAO",
        "emergency_advice": "TUYỆT ĐỐI KHÔNG tiếp tục nổ máy chạy xe khi lốp bị xẹp vì sẽ làm gãy vành đúc (mâm), nát tanh lốp và rách toạc lốp không thể vá lại.",
        "troubleshooting_steps": [
            "Dừng xe sát lề đường bên phải an toàn, dựng chân chống giữa",
            "Xoay bánh xe kiểm tra vị trí đinh cắm. KHÔNG tự ý rút đinh ra nếu chưa có đồ nghề vá vì sẽ xì hết hơi ngay lập tức",
            "Yêu cầu thợ cứu hộ đến vá dùi tận nơi để đi tạm hoặc vá nấm mặt trong"
        ],
        "source": "Quy chuẩn an toàn lốp xe máy Michelin & Chengshin"
    },
    {
        "id": "MB_TIRE_02",
        "vehicle_type": "MOTORBIKE",
        "category": "Lốp & Bánh xe",
        "symptom": "Lốp xe bơm căng nhưng sau 1-2 ngày lại bị non hơi từ từ, không thấy đinh cắm trên mặt lốp",
        "diagnosed_issue": "Xì chân van cao su, hở mép vành mâm xe do rỉ sét hoặc lốp bị dính gai nhỏ/đinh mạt",
        "suggested_issue_type": "FLAT_TIRE",
        "suggested_service": "Kiểm tra hở mép vành, thay van cao su mới hoặc vá ép",
        "severity": "NHE",
        "emergency_advice": "Dùng nước xà phòng bôi vào đầu van và mép vành để xác định chính xác vị trí xì bọt khí.",
        "troubleshooting_steps": [
            "Bôi nước xà phòng quanh đầu kim van xem có sủi bọt không",
            "Bôi xà phòng dọc theo mép tiếp xúc giữa lốp và vành mâm",
            "Nếu xì mép vành: Cần thợ đánh bóng làm sạch rỉ sét mép mâm và quét keo làm kín"
        ],
        "source": "Kỹ thuật sửa chữa lốp không săm 2banh.vn"
    },

    # ------------------ XE MÁY: ĐỘNG CƠ & TRUYỀN ĐỘNG (ENGINE_FAILURE) ------------------
    {
        "id": "MB_ENGINE_01",
        "vehicle_type": "MOTORBIKE",
        "category": "Truyền động dây curoa xe ga",
        "symptom": "Xe ga (Lead, Vision, AirBlade, SH, Grande) đang chạy bỗng nghe tiếng bụp lớn ở lốc máy bên trái, sau đó vặn ga động cơ vẫn gầm rú nhưng bánh sau không quay, xe đứng im",
        "diagnosed_issue": "Đứt dây curoa truyền động nồi xe ga",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ thay dây curoa Bando/Gates chính hãng tận nơi hoặc kéo xe về gara",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Thả hết tay ga, bóp phanh đều 2 bên và tấp xe an toàn vào lề. Tắt máy ngay, không tiếp tục nẹt pô rồ ga vì mảnh dây curoa đứt có thể cuốn kẹt quạt nồi gây vỡ lốc máy.",
        "troubleshooting_steps": [
            "Tấp xe vào lề đường, dựng chân chống giữa",
            "Kiểm tra lốc nồi bên trái: vặn ga máy gầm mà bánh sau không quay là 100% đứt curoa",
            "Gọi cứu hộ mang theo dây curoa đúng thông số dòng xe và súng siết bu-lông để thay thế tại chỗ"
        ],
        "source": "Cẩm nang bảo dưỡng hệ thống truyền động CVT xe ga Honda"
    },
    {
        "id": "MB_ENGINE_02",
        "vehicle_type": "MOTORBIKE",
        "category": "Động cơ xe ga",
        "symptom": "Xe ga bị rung bần bật phần đầu và tay lái khi bắt đầu vặn ga khởi hành ở tốc độ 10-25 km/h, xe chạy có tiếng kêu rít hoặc lạch cạch ở cụm nồi sau",
        "diagnosed_issue": "Côn sau bị bẩn, trượt bố ba càng vào chuông nồi do bụi mạt kim loại hoặc chai bề mặt ma sát",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Vệ sinh nồi xe ga, chà nhám bố ba càng hoặc thay chuông nồi mới",
        "severity": "NHE",
        "emergency_advice": "Xe vẫn có thể chạy tạm ở tốc độ vừa phải, nhưng nên sớm vệ sinh nồi để tránh làm cháy chuông và chai cứng bố côn.",
        "troubleshooting_steps": [
            "Khi khởi hành không nên thốc ga đột ngột mà kéo ga đều đặn",
            "Đến gara tháo lốc nồi thổi sạch bụi bẩn, vệ sinh chuông và bố ba càng",
            "Kiểm tra 3 viên cao su giảm chấn và bi nồi xem có bị mòn méo không"
        ],
        "source": "Hỏi đáp kinh nghiệm xe máy 2banh.vn"
    },
    {
        "id": "MB_ENGINE_03",
        "vehicle_type": "MOTORBIKE",
        "category": "Ngập nước & Thủy kích",
        "symptom": "Xe chạy qua đoạn đường ngập nước sâu rồi bị chết máy đột ngột, nước tràn vào ống pô và hộp lọc gió",
        "diagnosed_issue": "Xe máy bị ngập nước chết bugi, nước tràn vào buồng đốt qua lọc gió/ống xả",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ thổi nước buồng đốt, vệ sinh bugi, thay nhớt máy chống lột dên",
        "severity": "NGUY_HIEM",
        "emergency_advice": "TUYỆT ĐỐI KHÔNG BẤM ĐỀ LẠI khi xe vừa chết máy trong vũng nước ngập! Bấm đề sẽ khiến nước trong xi lanh bị ép nén làm cong gãy tay biên (thủy kích) phá hỏng toàn bộ động cơ.",
        "troubleshooting_steps": [
            "Dắt xe qua khỏi đoạn ngập nước lên chỗ khô ráo, dựng chân chống giữa",
            "Dốc ngược đầu xe hoặc dựng nghiêng để nước trong ống xả chảy hết ra ngoài",
            "Tháo lọc gió kiểm tra xem có ướt sũng nước không",
            "Tháo bugi kiểm tra và thổi sạch nước, đạp mồi vài lần để đẩy hết nước trong buồng đốt ra ngoài trước khi nổ máy lại",
            "BẮT BUỘC thay nhớt máy ngay vì nước tràn vào nhớt sẽ chuyển sang màu cà phê sữa làm hỏng động cơ"
        ],
        "source": "Kỹ thuật cứu hộ xe máy ngập nước Otofun"
    },
    {
        "id": "MB_ENGINE_04",
        "vehicle_type": "MOTORBIKE",
        "category": "Hệ thống làm mát",
        "symptom": "Xe chạy một lúc máy rất nóng, mùi khét bốc lên, đèn báo nhiệt độ nước làm mát (hình nhiệt kế đỏ) bật sáng trên táp-lô, xe bị ì máy",
        "diagnosed_issue": "Hết nước làm mát, két nước bị rò rỉ hoặc hỏng cánh quạt bơm nước",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Châm nước làm mát khẩn cấp, kiểm tra rò rỉ két nước tản nhiệt",
        "severity": "NGUY_HIEM",
        "emergency_advice": "DỪNG XE NGAY LẬP TỨC và tắt máy! Không được mở nắp két nước khi máy đang sôi vì nước nóng áp suất cao sẽ phụt ra gây bỏng nặng.",
        "troubleshooting_steps": [
            "Tấp xe vào bóng râm, tắt máy để động cơ nguội tự nhiên tối thiểu 20-30 phút",
            "Kiểm tra bình nước phụ dưới gầm/cốp xe xem mực nước có nằm dưới vạch LOWER không",
            "Quan sát dưới gầm máy xem có vệt nước xanh/đỏ rò rỉ nhỏ giọt không",
            "Châm thêm nước làm mát chuyên dụng (nếu khẩn cấp có thể dùng nước suối tinh khiết châm tạm) để đi đến gara gần nhất"
        ],
        "source": "Cẩm nang bảo dưỡng hệ thống làm mát động cơ Honda"
    },

    # ------------------ XE MÁY: BẢNG MÃ ĐÈN FI NHÁY (HONDA/YAMAHA) ------------------
    {
        "id": "MB_FI_CODE_07",
        "vehicle_type": "MOTORBIKE",
        "category": "Hệ thống điện tử PGM-FI",
        "symptom": "Đèn báo lỗi động cơ FI (vàng) nháy 7 lần ngắn, xe khó khởi động khi trời lạnh hoặc máy yếu khi tăng tốc",
        "diagnosed_issue": "Lỗi cảm biến nhiệt độ động cơ / nước làm mát (ECT/EOT) hoặc lỏng giắc cắm",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ kiểm tra giắc cảm biến nhiệt độ hoặc đọc lỗi bằng máy chẩn đoán",
        "severity": "CANH_BAO",
        "emergency_advice": "Xe vẫn chạy được tạm thời nhưng ECM sẽ chuyển sang chế độ dự phòng, xe sẽ tốn xăng hơn bình thường.",
        "troubleshooting_steps": [
            "Đếm số lần đèn vàng nháy: 7 nháy ngắn = Lỗi cảm biến ECT/EOT",
            "Kiểm tra giắc cắm cảm biến gắn trên lốc xi lanh xem có bị đứt dây do chuột cắn không",
            "Cần máy quét mã lỗi để xóa lỗi sau khi cắm lại giắc"
        ],
        "source": "Bảng mã lỗi chuẩn PGM-FI Honda Việt Nam"
    },
    {
        "id": "MB_FI_CODE_12",
        "vehicle_type": "MOTORBIKE",
        "category": "Hệ thống điện tử PGM-FI",
        "symptom": "Đèn FI nháy 12 lần (1 nháy dài 1.3s và 2 nháy ngắn), xe không nổ máy được, bấm đề máy quay nhưng không có xăng phun vào buồng đốt",
        "diagnosed_issue": "Hỏng kim phun xăng (Injector) hoặc đứt mạch dây điện cấp nguồn cho kim phun",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ đo điện trở kim phun, nối dây hoặc thay kim phun tận nơi",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Không cố bấm đề liên tục vì không có xăng phun vào buồng đốt, chỉ làm kiệt bình ắc quy.",
        "troubleshooting_steps": [
            "Đếm nhịp đèn: 1 dài + 2 ngắn = Mã lỗi 12 (Kim phun)",
            "Tháo cốp kiểm tra giắc cắm kim phun nằm trên cổ hút",
            "Chuột cắn đứt dây kim phun là nguyên nhân phổ biến nhất tại Việt Nam"
        ],
        "source": "Bảng mã lỗi chuẩn PGM-FI Honda Việt Nam"
    },
    {
        "id": "MB_FI_CODE_21",
        "vehicle_type": "MOTORBIKE",
        "category": "Hệ thống điện tử PGM-FI",
        "symptom": "Đèn FI nháy 21 lần (2 nháy dài và 1 nháy ngắn), pô xe xả khói đen, có mùi xăng sống nồng nặc, xe chạy bị hụt hơi",
        "diagnosed_issue": "Lỗi cảm biến Oxy (O2 Sensor) gắn trên cổ pô ống xả",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Vệ sinh muội than cảm biến oxy hoặc thay mới cảm biến",
        "severity": "CANH_BAO",
        "emergency_advice": "Xe vẫn chạy được về gara nhưng hao xăng nghiêm trọng và dễ đóng muội làm hỏng bugi.",
        "troubleshooting_steps": [
            "Quan sát vị trí cổ pô xe máy xem dây cảm biến oxy có bị cọ quẹt đứt vào lốc máy không",
            "Vệ sinh đầu cảm biến bám đầy muội than đen",
            "Đến gara đo điện áp xuất của cảm biến bằng đồng hồ VOM"
        ],
        "source": "Bảng mã lỗi chuẩn PGM-FI Honda Việt Nam"
    },

    # ------------------ XE MÁY: XĂNG & NHIÊN LIỆU (OUT_OF_FUEL) ------------------
    {
        "id": "MB_FUEL_01",
        "vehicle_type": "MOTORBIKE",
        "category": "Nhiên liệu & Bơm xăng",
        "symptom": "Kim xăng chỉ vạch đỏ E, xe đang chạy bỗng hụt hơi giật cục 2-3 nhịp rồi tắt ngúm, bật khóa nghe tiếng bơm xăng ro ro yếu ớt",
        "diagnosed_issue": "Hết cạn xăng trong bình hoặc cháy bơm xăng do để cạn xăng nhiều lần",
        "suggested_issue_type": "OUT_OF_FUEL",
        "suggested_service": "Giao xăng RON 95 tận nơi khẩn cấp 2-3 lít",
        "severity": "NHE",
        "emergency_advice": "Mở nắp bình xăng lắc nhẹ xe xem còn xăng dưới đáy không. Không bấm đề liên tục khi hết xăng vì bơm xăng FI dùng chính xăng để làm mát, để cạn chạy không tải sẽ bị cháy mô tơ bơm.",
        "troubleshooting_steps": [
            "Mở nắp bình kiểm tra trực tiếp mức xăng thực tế",
            "Đặt dịch vụ cứu hộ giao xăng khẩn cấp 2-3 lít",
            "Sau khi đổ xăng, bật khóa điện chờ 5 giây để bơm xăng nén đủ áp suất rồi mới bấm đề khởi động"
        ],
        "source": "Kinh nghiệm cứu hộ nhiên liệu lưu động SRAS"
    },

    # ==========================================================================
    # 2. BỘ TRI THỨC KỸ THUẬT Ô TÔ (TOYOTA, HYUNDAI, VINFAST, MAZDA, FORD...)
    # ==========================================================================
    # ------------------ Ô TÔ: ẮC QUY & HỆ THỐNG ĐIỆN (DEAD_BATTERY) ------------------
    {
        "id": "CAR_BATTERY_01",
        "vehicle_type": "CAR",
        "category": "Ắc quy khởi động ô tô",
        "symptom": "Bấm nút Start/Stop hoặc vặn chìa khóa: Đèn taplo nhấp nháy liên hồi, củ đề kêu tạch tạch tạch liên tục nhưng máy không quay nổi, màn hình trung tâm reset",
        "diagnosed_issue": "Ắc quy ô tô 12V bị sụt áp dưới 10.5V, chai cực chì hoặc quên tắt đèn pha/đèn trần qua đêm",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Cứu hộ câu bình/kích nổ ắc quy ô tô hoặc thay bình GS/Varta/Atlas lưu động",
        "severity": "CANH_BAO",
        "emergency_advice": "Không cố bấm nút Start/Stop liên tục vì điện áp sụt đột ngột có thể làm lỗi các hộp điều khiển ECU/BCM trên xe.",
        "troubleshooting_steps": [
            "Cần số phải đưa về vị trí P (hoặc N) và đạp hết bàn đạp phanh",
            "Mở nắp capo kiểm tra 2 cực âm dương bình ắc quy xem có bị lỏng bu-lông kẹp cọc không",
            "Nếu có xe khác hỗ trợ: Dùng dây câu bình đúng quy tắc (Dương (+) nối Dương trước, Âm (-) nối Âm/mát sườn xe)",
            "Hoặc gọi xe cứu hộ SRAS có máy kích bình Booster 12V/24V chuyên dụng đến kích nổ trong 15 phút"
        ],
        "source": "Cẩm nang hướng dẫn sử dụng Toyota & Hyundai Việt Nam"
    },
    {
        "id": "CAR_BATTERY_02",
        "vehicle_type": "CAR",
        "category": "Máy phát điện (Alternator)",
        "symptom": "Đang chạy trên đường thấy đèn cảnh báo hình bình ắc quy màu đỏ bật sáng trên tap-lô, các thiết bị điện (máy lạnh, màn hình, đèn pha) yếu dần rồi xe lịm máy",
        "diagnosed_issue": "Hỏng máy phát điện (Alternator), đứt dây curoa tổng hoặc hỏng bộ tiết chế điện áp (IC)",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Cẩu kéo xe ô tô bằng sàn trượt về garage sửa chữa",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Đèn bình ắc quy sáng khi xe ĐANG CHẠY KHÔNG PHẢI do hỏng bình mà do MÁY PHÁT ĐIỆN KHÔNG NẠP. Xe đang chạy bằng năng lượng còn lại trong bình, sẽ chết máy chỉ sau 5-15 phút. Hãy tấp xe vào lề ngay khi còn phanh và trợ lực lái!",
        "troubleshooting_steps": [
            "Tấp xe ngay vào làn dừng khẩn cấp hoặc lề đường bên phải",
            "Tắt ngay điều hòa A/C, màn hình giải trí, đèn gầm để tiết kiệm điện duy trì trợ lực lái",
            "Mở nắp capo kiểm tra xem dây curoa tổng dẫn động máy phát có bị đứt hay tuột không",
            "Trường hợp này kích bình cũng không chạy được lâu, bắt buộc phải gọi xe cứu hộ kéo về gara"
        ],
        "source": "Tài liệu đào tạo kỹ thuật viên đại lý Toyota"
    },

    # ------------------ Ô TÔ: LỐP XE (FLAT_TIRE) ------------------
    {
        "id": "CAR_TIRE_01",
        "vehicle_type": "CAR",
        "category": "Lốp & Cảm biến áp suất lốp",
        "symptom": "Đèn cảnh báo áp suất lốp (TPMS) hình móng ngựa chấm than bật sáng, vô lăng bị nhao lệch về một bên, xe chạy có tiếng ồn rào rào bất thường dưới gầm",
        "diagnosed_issue": "Thủng lốp ô tô, cán đinh xì hơi nhanh hoặc rách lốp mép hông",
        "suggested_issue_type": "FLAT_TIRE",
        "suggested_service": "Cứu hộ thay bánh sơ cua ô tô hoặc vá lốp nấm lưu động",
        "severity": "NGUY_HIEM",
        "emergency_advice": "GIỮ CHẶT VÔ LĂNG, KHÔNG PHANH GẤP! Nhả chân ga từ từ, bật đèn cảnh báo nguy hiểm Hazard và tấp xe vào nơi an toàn. Chạy xe xẹp lốp tốc độ cao sẽ phá nát la-zăng và mất lái lật xe.",
        "troubleshooting_steps": [
            "Đỗ xe trên nền đường phẳng cứng, kéo phanh tay, về số P",
            "Bật đèn Hazard và đặt biển cảnh báo tam giác phản quang cách đuôi xe 50-100m",
            "Nếu có bánh sơ cua và kích gầm: Tiến hành kê kích thay bánh phụ",
            "Nếu không có lốp phụ hoặc ốc tắc-kê bị siết quá chặt bằng súng hơi: Gọi cứu hộ SRAS có máy nén khí và đồ nghề chuyên dụng"
        ],
        "source": "Quy trình an toàn cứu hộ lốp cao tốc Cục Đường bộ Việt Nam"
    },

    # ------------------ Ô TÔ: BẢNG MÃ LỖI OBD-II THƯỜNG GẶP (ENGINE_FAILURE) ------------------
    {
        "id": "CAR_OBD2_P0300",
        "vehicle_type": "CAR",
        "category": "Mã lỗi OBD-II Động cơ",
        "symptom": "Đèn Check Engine (hình động cơ cá vàng) nhấp nháy liên tục, xe bị rung bần bật khi đạp ga, máy nổ lụp bụp, tăng tốc rất yếu và có mùi xăng nồng",
        "diagnosed_issue": "Mã lỗi P0300 (Random Misfire) - Động cơ bị bỏ máy ngẫu nhiên do chết mobin đánh lửa hoặc hỏng bugi",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ đọc lỗi ECU bằng máy OBD-II, thay mobin/bugi ô tô lưu động",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Đèn Check Engine NHẤP NHÁY là cảnh báo nguy hiểm cấp 1. Xăng không cháy được sẽ xả thẳng vào bầu lọc khí thải làm cháy bộ xúc tác khí xả (Catalytic Converter) tốn hàng chục triệu sửa chữa.",
        "troubleshooting_steps": [
            "Giảm tốc độ, tránh ép ga mạnh, tấp xe vào lề đường kiểm tra",
            "Dùng máy quét OBD-II đọc mã lỗi xem bỏ máy số mấy (P0301 = máy 1, P0302 = máy 2...)",
            "Kiểm tra tẩu bugi và mobin của máy tương ứng xem có bị chập cháy hoặc nứt vỏ cách điện không"
        ],
        "source": "Chuẩn mã lỗi quốc tế SAE OBD-II & Diễn đàn Kỹ thuật Oto-Hui"
    },
    {
        "id": "CAR_OBD2_P0115",
        "vehicle_type": "CAR",
        "category": "Mã lỗi OBD-II Làm mát",
        "symptom": "Kim đồng hồ nhiệt độ nước làm mát vọt lên sát chữ H (Hot), đèn Check Engine sáng mã P0115, khói hơi nước bốc lên nghi ngút từ nắp capo",
        "diagnosed_issue": "Mã lỗi P0115 - Quá nhiệt động cơ (Overheating) do vỡ đường ống nước làm mát, kẹt van hằng nhiệt hoặc hỏng quạt két nước",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ khắc phục rò rỉ két nước hoặc kéo xe sàn trượt về gara",
        "severity": "NGUY_HIEM",
        "emergency_advice": "TẮT MÁY NGAY LẬP TỨC! Động cơ quá nhiệt kéo dài sẽ làm cong vênh mặt máy (mặt quy-lát), thổi gioăng nắp máy, chi phí đại tu máy rất tốn kém.",
        "troubleshooting_steps": [
            "Tấp xe vào lề an toàn, kéo chốt mở hé nắp capo cho hơi nóng thoát ra",
            "TUYỆT ĐỐI KHÔNG mở nắp két nước khi máy còn đang nóng rẫy",
            "Quan sát bên dưới gầm xem nước làm mát có đang chảy ào ào ra đất không",
            "Sau khi máy nguội hẳn (40 phút), kiểm tra quạt tản nhiệt xem có quay khi bật máy không"
        ],
        "source": "Chuẩn mã lỗi quốc tế SAE OBD-II & Sổ tay Toyota Vios"
    },
    {
        "id": "CAR_TOWING_01",
        "vehicle_type": "CAR",
        "category": "Cứu hộ vận chuyển",
        "symptom": "Xe ô tô số tự động (AT / CVT / DCT) hoặc xe điện EV (VinFast VF8, VF9) bị chết máy hoàn toàn giữa đường, không vào được số N",
        "diagnosed_issue": "Xe mất điện toàn phần hoặc kẹt cần số điện tử, cần cẩu kéo an toàn",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ cẩu kéo bằng XE SÀN TRƯỢT chuyên dụng (Flatbed Tow Truck)",
        "severity": "NGUY_HIEM",
        "emergency_advice": "TUYỆT ĐỐI KHÔNG dùng xe khác để kéo lết xe số tự động hay xe điện 4 bánh trên đường vì sẽ phá nát hộp số tự động hoặc làm cháy mô-tơ điện của xe. BẮT BUỘC dùng xe sàn trượt cẩu toàn bộ 4 bánh lên sàn.",
        "troubleshooting_steps": [
            "Bật đèn khẩn cấp Hazard, đặt cảnh báo an toàn phía sau xe",
            "Tìm nút mở khóa cần số khẩn cấp (Shift Lock) để đưa cần số về N nếu có thể",
            "Nếu xe 4 bánh dẫn động toàn thời gian (AWD / 4WD) hoặc xe điện: Chỉ đặt xe cứu hộ sàn trượt chuyên dụng"
        ],
        "source": "Quy chuẩn cứu hộ kỹ thuật ô tô hiệp hội Cứu hộ Giao thông VN"
    }
]

# ==============================================================================
# 2. HÀM CÀO DỮ LIỆU TỰ ĐỘNG TỪ CÁC NGUỒN WEB KỸ THUẬT VIỆT NAM
# ==============================================================================
def crawl_fi_errors_from_web() -> List[Dict[str, Any]]:
    """
    Cào các bảng mã lỗi đèn FI xe máy từ các cổng kỹ thuật chuyên ngành tại VN.
    """
    print("[Crawler] Đang quét bảng mã lỗi xe máy FI trực tuyến...")
    scraped_items: List[Dict[str, Any]] = []
    
    # Nguồn chia sẻ kỹ thuật bảng mã lỗi xe máy công khai
    urls = [
        "https://thoxe.vn/bang-ma-loi-fi-xe-may-honda-va-cach-khac-phuc/",
    ]
    
    for url in urls:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=8)
            if resp.status_code != 200:
                continue
            soup = BeautifulSoup(resp.text, "html.parser")
            
            # Quét bảng mã lỗi nếu có cấu trúc table
            tables = soup.find_all("table")
            for table in tables:
                rows = table.find_all("tr")
                for row in rows[1:]: # Bỏ dòng tiêu đề
                    cols = [c.get_text(strip=True) for c in row.find_all(["td", "th"])]
                    if len(cols) >= 3:
                        code_col = cols[0]
                        symptom_col = cols[1]
                        cause_col = cols[2] if len(cols) > 2 else ""
                        
                        if any(char.isdigit() for char in code_col):
                            scraped_items.append({
                                "id": f"WEB_FI_{re.sub(r'[^0-9A-Za-z]', '', code_col)}",
                                "vehicle_type": "MOTORBIKE",
                                "category": "Hệ thống PGM-FI (Cào từ Web)",
                                "symptom": f"Đèn FI nháy mã {code_col}: {symptom_col}",
                                "diagnosed_issue": f"Lỗi hệ thống cảm biến/chấp hành: {cause_col or symptom_col}",
                                "suggested_issue_type": "ENGINE_FAILURE",
                                "suggested_service": "Cứu hộ kiểm tra mã lỗi FI và đo thông mạch cảm biến",
                                "severity": "CANH_BAO",
                                "emergency_advice": "Tắt khóa điện, quan sát nhịp nháy đèn để báo cho thợ kỹ thuật.",
                                "troubleshooting_steps": [
                                    f"Ghi nhớ mã nháy đèn FI: {code_col}",
                                    "Kiểm tra giắc nối điện tại vị trí cảm biến tương ứng",
                                    "Yêu cầu thợ mang máy đọc lỗi xóa lỗi sau khi xử lý"
                                ],
                                "source": url
                            })
        except Exception as e:
            print(f"[Crawler Warning] Không thể cào từ {url}: {e}")
            
    print(f"[Crawler] Đã cào bổ sung {len(scraped_items)} mã lỗi thực tế từ Internet.")
    return scraped_items


def build_unified_knowledge_base():
    """
    Tổng hợp dữ liệu nền tảng + dữ liệu cào tự động, loại bỏ trùng lặp và lưu trữ.
    """
    print("\n" + "="*60)
    print("SRAS AI KNOWLEDGE CRAWLER & BUILDER - KHỞI ĐỘNG")
    print("="*60)
    
    # 1. Nạp dữ liệu cốt lõi chuẩn kỹ thuật
    all_knowledge: List[Dict[str, Any]] = list(SEED_KNOWLEDGE)
    print(f"[1/4] Đã nạp {len(SEED_KNOWLEDGE)} ca bệnh & mã lỗi kỹ thuật chuẩn hóa.")
    
    # 2. Cào bổ sung trực tuyến
    web_knowledge = crawl_fi_errors_from_web()
    
    # 3. Loại bỏ trùng lặp dựa trên mã / triệu chứng
    seen_ids = set(item["id"] for item in all_knowledge)
    added_count = 0
    for item in web_knowledge:
        if item["id"] not in seen_ids:
            all_knowledge.append(item)
            seen_ids.add(item["id"])
            added_count += 1
            
    print(f"[2/4] Đã hợp nhất dữ liệu. Tổng số ca bệnh/mã lỗi tri thức: {len(all_knowledge)}")
    
    # 4. Xuất file JSON
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUT_FILE_LOCAL, "w", encoding="utf-8") as f:
        json.dump(all_knowledge, f, ensure_ascii=False, indent=2)
    print(f"[3/4] Đã ghi file tri thức cục bộ: {OUT_FILE_LOCAL}")
    
    try:
        os.makedirs(BACKEND_KNOWLEDGE_DIR, exist_ok=True)
        with open(OUT_FILE_BACKEND, "w", encoding="utf-8") as f:
            json.dump(all_knowledge, f, ensure_ascii=False, indent=2)
        print(f"[4/4] Đã đồng bộ sang Backend Spring Boot: {OUT_FILE_BACKEND}")
    except Exception as e:
        print(f"[Warning] Không thể đồng bộ trực tiếp sang backend: {e}")
        
    print("\n Hoàn tất xây dựng cơ sở tri thức chẩn đoán AI cho hệ thống SRAS!")
    print(f"-> Tổng cộng {len(all_knowledge)} bản ghi tri thức chuyên sâu sẵn sàng phục vụ.")
    return all_knowledge


# ==============================================================================
# 3. CÔNG CỤ TEST CHẨN ĐOÁN NHANH TRÊN DỮ LIỆU CÀO ĐƯỢC
# ==============================================================================
def search_diagnosis(query: str, vehicle_type: str = "ALL"):
    """
    Hàm demo tra cứu bệnh xe trực tiếp từ cơ sở tri thức vừa cào.
    """
    if not os.path.exists(OUT_FILE_LOCAL):
        print("Chưa có cơ sở dữ liệu tri thức. Vui lòng chạy build trước.")
        return
        
    with open(OUT_FILE_LOCAL, "r", encoding="utf-8") as f:
        kb: List[Dict[str, Any]] = json.load(f)
        
    q = query.lower()
    matches = []
    
    for item in kb:
        if vehicle_type != "ALL" and item.get("vehicle_type") not in (vehicle_type, "BOTH"):
            continue
            
        score = 0
        symptom = item.get("symptom", "").lower()
        issue = item.get("diagnosed_issue", "").lower()
        
        # Đếm tần suất từ khóa trùng khớp
        for word in q.split():
            if len(word) >= 2:
                if word in symptom:
                    score += 2
                if word in issue:
                    score += 3
                    
        if score > 0:
            matches.append((score, item))
            
    matches.sort(key=lambda x: x[0], reverse=True)
    
    print(f"\n--- KẾT QUẢ TRA CỨU TRI THỨC CHO: '{query}' ---")
    if not matches:
        print("Không tìm thấy ca bệnh trùng khớp trong cơ sở tri thức.")
        return
        
    for score, item in matches[:3]:
        print(f"\n[*] Độ khớp: {score} điểm | Loại xe: {item['vehicle_type']}")
        print(f"    - Sự cố: {item['diagnosed_issue']}")
        print(f"    - Mã phân loại SRAS: {item['suggested_issue_type']} (Mức độ: {item['severity']})")
        print(f"    - Dịch vụ đề xuất: {item['suggested_service']}")
        print(f"    - Lời khuyên: {item['emergency_advice']}")
        print(f"    - Bước xử lý: {item['troubleshooting_steps'][0] if item['troubleshooting_steps'] else 'Liên hệ cứu hộ'}")


if __name__ == "__main__":
    kb = build_unified_knowledge_base()
    
    # Chạy thử nghiệm chẩn đoán 2 ca thực tế
    print("\n--- CHẠY THỬ NGHIỆM TRA CỨU TRI THỨC VỚI 2 CA THỰC TẾ ---")
    search_diagnosis("xe đề tạch tạch không nổ đèn taplo mờ", "MOTORBIKE")
    search_diagnosis("vô lăng nhao lệch đèn áp suất lốp cảnh báo rách lốp", "CAR")


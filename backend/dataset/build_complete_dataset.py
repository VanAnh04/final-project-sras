# -*- coding: utf-8 -*-
"""
SRAS COMPLETE KNOWLEDGE BASE BUILDER
Hợp nhất toàn bộ tri thức xe máy & ô tô chuẩn hóa:
1. 28 Ca bệnh kỹ thuật từ Sổ tay xe Honda, Toyota, VinFast EV
2. 35+ Ca bệnh thực chiến phổ biến tại Việt Nam (SEED_KNOWLEDGE)
3. 64 Ký hiệu đèn cảnh báo táp-lô ô tô chuẩn ISO 2575
4. 30+ Mã lỗi OBD-II / DTC phổ biến nhất cho ô tô
"""

import os
import sys
import json

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

# 1. Nạp CANONICAL_MANUAL_FAULTS từ pdf_crawler
from pdf_crawler import CANONICAL_MANUAL_FAULTS

# 2. Nạp SEED_KNOWLEDGE từ main
from main import SEED_KNOWLEDGE

# 3. Nạp 64 đèn cảnh báo táp-lô từ crawl_dashboard_lights
from crawl_dashboard_lights import DASHBOARD_LIGHTS_64

# 4. Danh sách mã lỗi OBD-II phổ biến nhất cho ô tô
TOP_OBD_CODES = [
    {
        "id": "CAR_OBD_P0101",
        "vehicle_type": "CAR",
        "category": "Mã lỗi OBD-II Khí nạp (MAF)",
        "symptom": "Xe ô tô tăng tốc bị hụt hơi, xe chạy ì, tốn xăng bất thường, đèn Check Engine báo mã P0101",
        "diagnosed_issue": "Lỗi cảm biến lưu lượng khí nạp (MAF Sensor Range/Performance) bị bẩn, bám bụi dầu hoặc đứt dây tín hiệu",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Vệ sinh cảm biến MAF / Kiểm tra đường ống nạp khí ô tô",
        "severity": "CANH_BAO",
        "emergency_advice": "Tránh đạp thốc ga. Vệ sinh cảm biến khí nạp bằng dung dịch xịt MAF chuyên dụng, không dùng RP7.",
        "troubleshooting_steps": [
            "Kiểm tra ống cổ hút gió cao su xem có bị nứt, rách làm lọt gió không qua cảm biến không.",
            "Tháo giắc cắm cảm biến MAF kiểm tra chân cắm có bị ẩm ướt rỉ sét không.",
            "Dùng bình xịt vệ sinh MAF Cleaner xịt nhẹ vào dây nhiệt cảm biến, để khô tự nhiên rồi lắp lại.",
            "Xóa mã lỗi bằng máy chẩn đoán và chạy thử xe."
        ],
        "source": "Chuẩn mã lỗi quốc tế OBD-II DTC (P0101)"
    },
    {
        "id": "CAR_OBD_P0171",
        "vehicle_type": "CAR",
        "category": "Mã lỗi OBD-II Nhiên liệu",
        "symptom": "Đèn Check Engine sáng mã P0171 (System Too Lean Bank 1), động cơ nổ không đều ở chế độ không tải, đạp ga bị khựng",
        "diagnosed_issue": "Hệ thống nhiên liệu bị nghèo xăng (quá nhiều không khí hoặc quá ít xăng) do hở ống hút chân không, tụt áp bơm xăng hoặc tắc lọc xăng",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Đo áp suất bơm xăng / Kiểm tra rò rỉ đường ống chân không",
        "severity": "CANH_BAO",
        "emergency_advice": "Xe chạy nghèo xăng trong thời gian dài sẽ làm nhiệt độ buồng đốt tăng cao gây cháy xupap và nứt bugi.",
        "troubleshooting_steps": [
            "Lắng nghe khoang máy xem có tiếng rít xì gió ở các ống cao su hút chân không quanh cổ hút không.",
            "Kiểm tra nắp châm dầu động cơ và que thăm nhớt đã đóng chặt kín chưa.",
            "Kiểm tra áp suất bơm nhiên liệu tại giàn phun xăng (áp suất chuẩn thường từ 3.0 - 3.8 bar).",
            "Thay thế lọc xăng định kỳ nếu đã chạy trên 40.000 km."
        ],
        "source": "Chuẩn mã lỗi quốc tế OBD-II DTC (P0171)"
    },
    {
        "id": "CAR_OBD_P0420",
        "vehicle_type": "CAR",
        "category": "Mã lỗi OBD-II Khí thải (Catalytic)",
        "symptom": "Đèn Check Engine sáng báo mã P0420, xe có mùi khí xả hôi chua hoặc máy bị nghẽn ga ở tốc độ cao",
        "diagnosed_issue": "Hiệu suất bộ chuyển đổi xúc tác khí xả (Catalytic Converter) dưới ngưỡng cho phép do bầu lọc bị vỡ tổ ong, đóng muội hoặc hỏng cảm biến Oxy số 2",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Kiểm tra cảm biến Oxy sau / Vệ sinh hoặc thay bầu xúc tác khí thải",
        "severity": "CANH_BAO",
        "emergency_advice": "Xe vẫn có thể lưu thông bình thường nhưng sẽ không đạt tiêu chuẩn đăng kiểm khí thải và máy có thể bị nóng.",
        "troubleshooting_steps": [
            "Đọc đồ thị điện áp cảm biến Oxy số 2 (Downstream O2 Sensor): nếu dao động liên tục giống cảm biến số 1, bầu xúc tác đã mất tác dụng.",
            "Kiểm tra cảm biến Oxy sau bầu xúc tác xem có bị đứt dây hoặc bám muội chì không.",
            "Gõ nhẹ vào bầu xúc tác: nếu có tiếng lạo xạo bên trong, tổ ong ceramic đã bị vỡ cần thay mới.",
            "Dùng dung dịch chuyên dụng xúc rửa bầu Catalytic."
        ],
        "source": "Chuẩn mã lỗi quốc tế OBD-II DTC (P0420)"
    },
    {
        "id": "CAR_OBD_P0505",
        "vehicle_type": "CAR",
        "category": "Mã lỗi OBD-II Cầm chừng (Idle Control)",
        "symptom": "Vòng tua máy ô tô bị trồi sụt thất thường (òa ga lên 1500-2000 vòng/phút hoặc tụt xuống 400 vòng chết máy khi dừng đèn đỏ), đèn Check Engine sáng mã P0505",
        "diagnosed_issue": "Lỗi van điều khiển tốc độ không tải (IACV) hoặc bướm ga điện tử bị đóng cặn bẩn dầu nhớt nghẹt khe hở",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Vệ sinh họng hút bướm ga và cài đặt lại vị trí không tải (Throttle Relearn)",
        "severity": "CANH_BAO",
        "emergency_advice": "Cẩn thận khi dừng đèn đỏ tránh bị chết máy bất ngờ làm mất trợ lực phanh chân không.",
        "troubleshooting_steps": [
            "Tháo cổ hút gió kiểm tra họng bướm ga: viền bướm ga thường bị muội carbon đen đóng dày gây kẹt góc mở.",
            "Dùng bình xịt vệ sinh chế hòa khí/bướm ga và khăn mềm lau sạch muội carbon.",
            "Sau khi vệ sinh, cần dùng máy chẩn đoán thực hiện quy trình học lại góc mở bướm ga (Throttle Adaptation/Idle Learn).",
            "Kiểm tra van điều khiển không tải IACV và gioăng cao su cổ hút."
        ],
        "source": "Chuẩn mã lỗi quốc tế OBD-II DTC (P0505)"
    },
    {
        "id": "CAR_OBD_P0700",
        "vehicle_type": "CAR",
        "category": "Mã lỗi OBD-II Hộp số tự động",
        "symptom": "Xe ô tô bị giật mạnh khi chuyển số D hoặc R, xe không chịu nhảy số cao, vòng tua máy gầm rú lớn, đèn Check Engine sáng mã P0700",
        "diagnosed_issue": "Lỗi hệ thống điều khiển hộp số tự động (TCM Malfunction), hỏng van điện từ solenoild chuyển số hoặc thiếu dầu hộp số tự động (ATF)",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ kéo xe số tự động / Kiểm tra hộp số tự động chuyên sâu",
        "severity": "NGUY_HIEM",
        "emergency_advice": "Hộp số đang kích hoạt chế độ an toàn (Limp Mode - khóa ở số 3 để bảo vệ). TUYỆT ĐỐI KHÔNG kéo xe ô tô số tự động bằng dây kéo vì sẽ làm cháy hộp số, bắt buộc dùng xe cứu hộ sàn trượt!",
        "troubleshooting_steps": [
            "Tấp xe vào lề đường, kiểm tra que thăm dầu hộp số tự động (ATF) xem mức dầu và màu sắc dầu (dầu chuẩn có màu đỏ trong, nếu màu đen hoặc có mùi khét là cháy bố nồi hộp số).",
            "Quét sâu vào hộp điều khiển hộp số (TCM) để đọc mã lỗi con (ví dụ P0730, P0750 van solenoid).",
            "Gọi cứu hộ cẩu xe sàn trượt đưa xe về xưởng chuyên về hộp số tự động."
        ],
        "source": "Chuẩn mã lỗi quốc tế OBD-II DTC (P0700)"
    },
    {
        "id": "CAR_OBD_P0128",
        "vehicle_type": "CAR",
        "category": "Mã lỗi OBD-II Làm mát",
        "symptom": "Đồng hồ nhiệt độ nước làm mát lên rất chậm hoặc không đạt mức giữa, điều hòa sưởi không ấm, xe tốn xăng, đèn Check Engine sáng P0128",
        "diagnosed_issue": "Van hằng nhiệt bị kẹt ở trạng thái MỞ LIÊN TỤC (Coolant Thermostat Stuck Open), nước làm mát liên tục chảy qua két tản nhiệt khiến động cơ không đạt nhiệt độ vận hành tối ưu",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Thay van hằng nhiệt động cơ ô tô mới",
        "severity": "CANH_BAO",
        "emergency_advice": "Xe vẫn chạy được bình thường nhưng động cơ chạy ở trạng thái lạnh sẽ phun nhiều xăng hơn, gây hao xăng và nhanh bẩn bugi.",
        "troubleshooting_steps": [
            "Sờ vào ống nước trên và ống nước dưới của két tản nhiệt lúc mới nổ máy 2-3 phút: nếu cả hai ống cùng ấm lên cùng lúc, van hằng nhiệt đã bị kẹt mở.",
            "Tháo cụm van hằng nhiệt kiểm tra lò xo và gioăng làm kín.",
            "Thay van hằng nhiệt mới đúng thông số nhiệt độ mở (thường 82°C hoặc 88°C).",
            "Xả e (bleeding) bọt khí hệ thống nước làm mát sau khi thay thế."
        ],
        "source": "Chuẩn mã lỗi quốc tế OBD-II DTC (P0128)"
    }
]

# 5. Danh sách các bệnh thực tế phổ biến tại Việt Nam (Bổ sung chuyên sâu)
VIETNAM_COMMON_BREAKDOWN_FAULTS = [
    # --- XE MÁY ---
    {
        "id": "MOTO_STATOR_CHARGING",
        "vehicle_type": "MOTORBIKE",
        "category": "Hệ thống sạc & Mâm lửa xe máy",
        "symptom": "Vừa thay bình ắc quy mới chạy được 2-3 ngày lại cạn kiệt điện dắt bộ; đèn pha xe lúc sáng chói lúc tối mờ theo tay ga, bấm còi yếu ớt, xe chết máy giữa đường",
        "diagnosed_issue": "Cháy cuộn điện mâm lửa (Stator coil) hoặc hỏng cục sạc chỉnh lưu (Rectifier/Regulator), dẫn đến ắc quy không được nạp điện khi động cơ nổ",
        "suggested_issue_type": "DEAD_BATTERY",
        "suggested_service": "Cứu hộ kích bình nổ tạm thời & Thay sạc / Quấn mâm lửa phát điện",
        "severity": "CANH_BAO",
        "emergency_advice": "Không nên cố thay thêm bình mới vì sẽ tiếp tục bị rút cạn điện phá hỏng bình. Cần đo điện áp sạc tại 2 cọc bình khi vặn ga (chuẩn từ 13.5V - 14.5V).",
        "troubleshooting_steps": [
            "Dùng đồng hồ VOM đo điện áp 2 cọc ắc quy khi xe nổ máy: nếu không tăng lên trên 13V khi kéo ga thì hệ thống sạc đã hỏng.",
            "Rút giắc mâm lửa đo điện trở 3 pha cuộn phát điện (nếu có pha thông mạch ra mát hoặc đứt là cuộn lửa đã cháy).",
            "Kiểm tra cục sạc xem có bị nóng ran bất thường hoặc phù nứt vỏ nhựa không.",
            "Cứu hộ tạm thời kích nổ để chạy về tiệm sửa xe hoặc gọi thợ mang sạc/cuộn điện đến thay thế."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "MOTO_BRAKE_CALIPER_DRAG",
        "vehicle_type": "MOTORBIKE",
        "category": "Hệ thống Phanh đĩa xe máy",
        "symptom": "Bánh xe quay rất nặng, dắt xe không nổi, đĩa phanh nóng rực bốc khói hoặc kêu két két liên tục khi chạy, bóp phanh trước hoặc sau bị sượng cứng",
        "diagnosed_issue": "Kẹt piston heo dầu phanh đĩa (Brake Caliper Drag) do đất cát bám bẩn làm kẹt phốt cao su chắn bụi, rỉ sét piston hoặc nghẹt lỗ hồi dầu ở tay thắng trên",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Cứu hộ xả kẹt phanh đĩa / Vệ sinh bảo dưỡng heo dầu lưu động",
        "severity": "NGUY_HIEM",
        "emergency_advice": "DỪNG XE NGAY LẬP TỨC. Tuyệt đối không cố chạy vì đĩa phanh nóng đỏ có thể làm sôi dầu phanh gây mất phanh hoàn toàn, nổ lốp hoặc cong vênh đĩa phanh.",
        "troubleshooting_steps": [
            "Dựng chân chống đứng, dùng tay lắc nhẹ heo dầu xem có trượt nhẹ trên 2 ắc trượt không.",
            "Dùng cờ-lê 8 hoặc 10 nới lỏng ốc xả gió dầu phanh trên heo dầu một chút để xả bớt áp lực dầu đang bó cứng piston (nhớ lau sạch dầu phanh tránh rớt vào sơn xe).",
            "Dùng tuốc-nơ-vít dẹp cạy nhẹ má phanh lùi về để bánh xe quay tự do.",
            "Gọi cứu hộ tháo heo dầu vệ sinh piston, đánh bóng rỉ sét và thay phốt cao su cup-pen mới."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "MOTO_CLUTCH_SLIPPAGE",
        "vehicle_type": "MOTORBIKE",
        "category": "Bộ ly hợp / Bộ nồi xe số & xe côn tay",
        "symptom": "Vào số nhả côn vít ga máy rú to gầm rú nhưng xe tăng tốc rất chậm, chở 2 người hoặc lên dốc xe bị ì không bò lên nổi, có mùi khét lẹt quanh lốc máy",
        "diagnosed_issue": "Cháy lá bố nồi / Trượt côn (Clutch Slippage) do mòn hết mặt ma sát lá bố, chai lá thép hoặc lò xo ép côn bị nhão, chỉnh dây côn quá căng không có độ rơ",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Thay lá bố nồi / Canh chỉnh côn xe máy lưu động",
        "severity": "CANH_BAO",
        "emergency_advice": "Hạn chế ép số cao vượt dốc gắt. Với xe côn tay, kiểm tra ngay ốc chỉnh dây côn xem có độ rơ tự do ở tay côn khoảng 2 - 3mm hay không.",
        "troubleshooting_steps": [
            "Kiểm tra độ rơ dây côn: nếu tay côn căng cứng không có khoảng rơ tự do, nhả ốc tăng côn cho trùng bớt lại.",
            "Với xe số tự động (Wave, Sirius), nới ốc khóa 14 ở lốc nồi bên phải, dùng tuốc-nơ-vít vặn ốc côn vào chạm nhẹ rồi nhả ra 1/8 - 1/4 vòng, siết chặt ốc khóa lại.",
            "Nếu chỉnh độ rơ mà xe vẫn bị trượt máy gầm không chạy, lá bố đã cháy rụi cần gọi thợ cứu hộ thay trọn bộ lá bố nồi mới."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "MOTO_STEERING_HEAD_BEARING",
        "vehicle_type": "MOTORBIKE",
        "category": "Hệ thống Lái & Giảm xóc xe máy",
        "symptom": "Tay lái bị sượng cứng, liệng xe khó giữ thăng bằng, khi đi qua ổ gà phát ra tiếng kêu cụp cụp rất to ở cụm đầu xe, xì dầu phuộc trước bám đen ty phuộc",
        "diagnosed_issue": "Bể bi chén cổ / Sượng cổ phốt (Steering Head Bearing) hoặc xì dầu rách phốt phuộc nhún trước, ty phuộc bị trầy xước mất áp lực dầu giảm chấn",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Thay chén cổ bi đũa / Phục hồi thay phốt dầu phuộc trước",
        "severity": "CANH_BAO",
        "emergency_advice": "Giảm tốc độ, tránh vào cua gấp vì cổ xe sượng cứng rất dễ khiến xe bị quẫy đuôi hoặc trượt ngã mất lái.",
        "troubleshooting_steps": [
            "Dựng chống đứng xe, nhờ người đè đuôi xe xuống để bánh trước hổng khỏi mặt đất.",
            "Dùng tay xoay ghi-đông nhẹ nhàng qua lại hai bên: nếu có nấc khựng ở vị trí chính giữa hoặc sượng lạo xạo là bi chén cổ đã lún nứt.",
            "Lấy hai tay nắm vào đuôi phuộc trước giật mạnh tới lui: nếu có độ rơ lỏng thì ốc cổ phốt đã lỏng hoặc chén cổ đã mòn hết.",
            "Kiểm tra ty phuộc trước: nếu thấy dầu thủy lực xì ướt bám đất cát đen nhèm thì cần thay phốt dầu và châm lại dầu phuộc."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "MOTO_CABLE_SNAP",
        "vehicle_type": "MOTORBIKE",
        "category": "Dây điều khiển (Dây côn / Dây ga xe máy)",
        "symptom": "Bóp tay côn nhẹ bẫng xe giật bắn tắt máy không ngắt số được; hoặc vặn tay ga bị tuột lỏng máy giữ nguyên garanti xe không tăng ga được",
        "diagnosed_issue": "Đứt dây côn tay hoặc đứt dây ga (Cable Snap) do sợi cáp thép bị tưa rỉ sét lâu ngày bên trong vỏ ruột gà",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Cứu hộ thay dây côn / dây ga xe máy tận nơi",
        "severity": "CANH_BAO",
        "emergency_advice": "Nếu đứt dây côn khi đang chạy: đạp nhẹ số về N (Mo) hoặc giữ vững phanh giảm tốc tấp vào lề an toàn. Tuyệt đối không vừa chạy vừa đạp số sống nếu không có kinh nghiệm vì dễ vỡ bánh răng hộp số.",
        "troubleshooting_steps": [
            "Kiểm tra đầu dây cáp tại cùm tay côn hoặc cùm tay ga trên ghi-đông xem cùi chì có bị tuột khỏi rãnh hay đứt hẳn lõi cáp.",
            "Xử lý khẩn cấp khi đứt dây ga: có thể vặn ốc garanti (ốc gió/xăng) trên bộ chế hòa khí lên cao hơn một chút để xe tự bò chậm về tiệm sửa gần nhất.",
            "Xử lý khi đứt dây côn: đẩy xe cho có trớn rồi vào số 1 hoặc số 2 để xe lăn bánh, khi dừng đèn đỏ gảy số về N trước khi dừng hẳn.",
            "Gọi cứu hộ thay ruột cáp hoặc thay dây côn/dây ga mới chính hãng."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "MOTO_CONTAMINATED_GASOLINE",
        "vehicle_type": "MOTORBIKE",
        "category": "Hệ thống Nhiên liệu Xăng xe máy",
        "symptom": "Vừa rời cây xăng đi được 200-500m thì xe bị hụt hơi, giật cục rồi tắt ngúm, không thể đề nổ lại, tháo bugi thấy ướt nhẹp",
        "diagnosed_issue": "Đổ nhầm xăng nhiễm nước / Xăng kém chất lượng lẫn tạp chất, nước lắng đọng dưới đáy bình xăng đi vào kim phun FI hoặc chén xăng bộ chế hòa khí làm mất khả năng đánh lửa",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ súc rửa bình xăng / Vệ sinh kim phun bugi lưu động",
        "severity": "KHAN_CAP",
        "emergency_advice": "Dừng đề nổ liên tục để tránh làm kiệt bình ắc quy và cháy củ đề. Cần xả sạch toàn bộ lượng xăng pha nước ra ngoài trước khi đổ xăng mới.",
        "troubleshooting_steps": [
            "Với xe số bình xăng con: dùng tuốc-nơ-vít nới ốc xả xăng cặn dưới đáy chén xăng (bình xăng con) cho xăng và nước chảy hết ra ngoài qua ống xả thừa.",
            "Với xe ga phun xăng điện tử Fi: cần rút ống dẫn xăng từ bơm xăng ra, bật khóa điện cho bơm đẩy lượng xăng đọng trong đường ống ra chai nhựa kiểm tra (nếu thấy tách lớp nước thì bình xăng đã nhiễm nước nặng).",
            "Hút sạch xăng trong bình, súc khô bình xăng và đổ xăng A95 chuẩn từ cây xăng uy tín.",
            "Tháo bugi ra lau khô đầu điện cực muội ướt, đạp/đề xả buồng đốt vài lần rồi lắp lại nổ máy."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "MOTO_VESPA_CAM_CHAIN_LOW_OIL",
        "vehicle_type": "MOTORBIKE",
        "category": "Động cơ & Dầu nhớt xe tay ga cao cấp (Vespa / Piaggio / SH)",
        "symptom": "Xe kêu lạch cạch rè rè ở đầu quy-lát, tiếng xích cam kêu gõ kim loại rất to, đèn báo áp suất nhớt (hình bình dầu màu đỏ) nháy đỏ khi máy nóng",
        "diagnosed_issue": "Hụt cạn dầu nhớt bôi trơn động cơ, tăng cam tự động bị kẹt hoặc chùng xích cam quá mức do xe ăn nhớt, rò rỉ phốt nhớt lốc máy",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Châm thêm nhớt khẩn cấp / Cứu hộ kiểm tra tăng cam xích cam",
        "severity": "NGUY_HIEM",
        "emergency_advice": "TẮT MÁY NGAY. Chạy xe trong tình trạng cạn nhớt sẽ gây lột dên, bó kẹt piston xi-lanh và phá hủy toàn bộ đầu bò quy-lát, chi phí đại tu máy rất tốn kém.",
        "troubleshooting_steps": [
            "Dựng chống đứng xe trên nền phẳng, tắt máy đợi 3 - 5 phút cho nhớt hồi về đáy các-te.",
            "Rút que thăm nhớt ra lau sạch bằng khăn giấy, cắm lại không vặn ren rồi rút ra kiểm tra: nếu que thăm khô cong không có giọt nhớt nào thì xe đã cạn nhớt.",
            "Châm ngay từ 0.8L - 1L dầu nhớt xe máy 4 thì đúng phẩm cấp vào động cơ.",
            "Khởi động lại và lắng nghe tiếng máy: nếu êm trở lại thì tiếp tục di chuyển; nếu vẫn gõ cọc cọc lớn thì xích cam/cò mổ đã hỏng, cần gọi xe cứu hộ chở về xưởng."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },

    # --- Ô TÔ ---
    {
        "id": "CAR_AC_FAILURE",
        "vehicle_type": "CAR",
        "category": "Hệ thống Điều hòa không khí ô tô (A/C)",
        "symptom": "Điều hòa ô tô chỉ thổi ra gió nóng hoặc lúc mát lúc không; bật nút A/C máy gầm và có tiếng rít lớn từ khoang động cơ, kính xe bị hấp hơi mờ mịt",
        "diagnosed_issue": "Sự cố hệ thống điều hòa ô tô: Rò rỉ xì gas lạnh, hỏng lốc nén điều hòa (A/C Compressor), chết ly hợp từ đầu lốc nén hoặc lọc gió điều hòa bị tắc nghẹt bùn bụi",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Kiểm tra đo áp suất gas lạnh / Vệ sinh nạp gas điều hòa ô tô",
        "severity": "CANH_BAO",
        "emergency_advice": "Hạ hé 4 cửa kính xuống 2-3 cm để lưu thông không khí trong khoang xe tránh ngột ngạt. Bật chế độ lấy gió ngoài và tắt nút A/C để tránh quá tải động cơ.",
        "troubleshooting_steps": [
            "Kiểm tra nút A/C trên bảng điều khiển đã bật sáng chưa và chỉnh mức nhiệt độ lạnh nhất (Lo).",
            "Mở nắp capo quan sát mặt hít đầu lốc lạnh: khi bật A/C mặt hít có hít quay cùng puly không (nếu không quay là đứt cuộn từ hoặc hết sạch gas rơ-le áp suất ngắt bảo vệ).",
            "Rút lọc gió điều hòa trong hộc để găng tay ghế phụ ra kiểm tra xem có bị bụi bẩn đóng kín không.",
            "Đưa xe đến gara chuyên điện lạnh ô tô kiểm tra đồng hồ đo áp suất cao áp / hạ áp và nạp gas R134a hoặc R1234yf."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "CAR_STEERING_WOBBLE_ALIGNMENT",
        "vehicle_type": "CAR",
        "category": "Hệ thống Lái & Thước lái ô tô",
        "symptom": "Vô lăng rung bần bật khi xe chạy tốc độ 80 - 100 km/h trên cao tốc; hoặc buông lỏng tay lái xe tự động nhao lái lệch hẳn sang một bên, lốp xe mòn vẹt một mép",
        "diagnosed_issue": "Mất cân bằng động bánh xe (rơi chì cân mâm), lốp bị chửa/méo hoặc sai lệch góc đặt bánh xe / góc chụm độ chụm (Wheel Alignment & Camber/Toe)",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Cân bằng động bánh xe / Cân chỉnh thước lái góc đặt bánh xe",
        "severity": "CANH_BAO",
        "emergency_advice": "Giảm tốc độ dưới 70 km/h để vô lăng hết rung lắc. Giữ vững hai tay trên vô lăng khi chạy trên đường cao tốc.",
        "troubleshooting_steps": [
            "Quan sát bề mặt lốp xe trước xem có bị phồng (chửa lốp), dính đinh to hay bị méo mâm do sụp ổ gà không.",
            "Kiểm tra áp suất lốp cả 4 bánh đã đều nhau theo bảng thông số trên cột chữ B cửa lái chưa.",
            "Nếu xe nhao lái sang phải/trái liên tục, đưa xe lên máy căn chỉnh góc lái 3D (Hunter) để chỉnh lại độ chụm rotuyn lái.",
            "Nếu xe chỉ rung vô lăng ở dải tốc độ nhất định (80-100km/h), tiến hành tháo 2 bánh trước bấm chì cân bằng động lại mâm lốp."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "CAR_EPB_STUCK",
        "vehicle_type": "CAR",
        "category": "Hệ thống Phanh tay điện tử (EPB)",
        "symptom": "Bấm nút nhả phanh tay điện tử (P) nhưng phanh sau không nhả, màn hình taplo báo lỗi Parking Brake Malfunction / Chữ P vàng nhấp nháy, xe không lăn bánh được",
        "diagnosed_issue": "Kẹt mô-tơ phanh tay điện tử (Electronic Parking Brake - EPB) do kẹt ngàm cơ khí, đứt dây giắc điện mô-tơ sau ngập nước hoặc bình ắc quy bị sụt áp dưới 11.5V",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Cứu hộ mở khóa phanh tay điện tử khẩn cấp / Xóa lỗi EPB",
        "severity": "CANH_BAO",
        "emergency_advice": "Tuyệt đối không cố đạp ga lết bánh xe vì sẽ làm cháy bố phanh, mòn vẹt lốp và vỡ bánh răng mô-tơ phanh điện tử.",
        "troubleshooting_steps": [
            "Kiểm tra ắc quy: thử tắt máy, bấm nổ máy lại và đạp mạnh chân phanh rồi nhấn giữ nút gạt phanh tay xuống 5 giây.",
            "Thử tháo cọc âm (-) bình ắc quy trong 3 phút rồi lắp lại để reset ECU điều khiển phanh tay.",
            "Mở cốp sau tìm dây cáp nhả phanh tay khẩn cấp cơ khí (trên một số dòng xe châu Âu/Mỹ) hoặc dùng lục giác tháo mô-tơ vặn lùi ty phanh bằng tay.",
            "Nếu không tự xử lý được, gọi cứu hộ mang máy chẩn đoán OBD-II kích hoạt lệnh Service Mode / Brake Pad Replacement Mode để ép mô-tơ nhả phanh."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "CAR_MISFUELING_EMERGENCY",
        "vehicle_type": "CAR",
        "category": "Sự cố Nhiên liệu Khẩn cấp (Đổ nhầm nhiên liệu)",
        "symptom": "Nhân viên cây xăng bơm nhầm Xăng vào xe Máy Dầu Diesel (Ranger, Everest, SantaFe, Fortuner, Tucson Diesel) hoặc bơm Dầu vào xe máy Xăng",
        "diagnosed_issue": "Đổ nhầm nhiên liệu (Misfueling) cực kỳ nguy cấp. Xăng làm mất tính bôi trơn trong dầu Diesel gây xước mòn phá hủy bơm cao áp và kim phun Common Rail áp suất hàng ngàn bar",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Cứu hộ xe cẩu kéo / Hút cạn bình súc rửa toàn bộ hệ thống nhiên liệu",
        "severity": "KHAN_CAP",
        "emergency_advice": "TUYỆT ĐỐI KHÔNG ĐƯỢC BẬT CHÌA KHÓA VÀ KHÔNG ĐỀ NỔ ĐỘNG CƠ! Bật chìa khóa sẽ làm bơm tiếp vận đẩy nhiên liệu bẩn vào dàn kim phun đắt đỏ hàng trăm triệu đồng.",
        "troubleshooting_steps": [
            "Yêu cầu nhân viên cây xăng ký biên bản xác nhận sự cố đổ nhầm nhiên liệu.",
            "Giữ nguyên xe ở vị trí tắt máy hoàn toàn, chuyển cần số về N để đẩy xe gọn vào lề cây xăng.",
            "Gọi ngay xe cứu hộ sàn trượt chở xe về gara uy tín hoặc đại lý chính hãng.",
            "Quy trình tại gara: Hạ bình nhiên liệu hoặc cắm máy hút cạn 100% nhiên liệu nhầm, thay mới toàn bộ lọc nhiên liệu, súc rửa đường ống và đổ đầy nhiên liệu chuẩn trước khi khởi động lại."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "CAR_SMARTKEY_NOT_DETECTED",
        "vehicle_type": "CAR",
        "category": "Hệ thống Khóa thông minh (Smart Key ô tô)",
        "symptom": "Bấm nút mở cửa trên tay nắm không phản hồi, vào xe bấm nút Start/Stop màn hình hiện cảnh báo Key Not Detected / No Key Found xe không chịu khởi động",
        "diagnosed_issue": "Chìa khóa thông minh Smart Key bị hết pin (pin CR2032/CR2025 cạn), chìa bị rơi vào nước ẩm mạch hoặc xe đang đỗ ở khu vực bị nhiễu sóng từ trường cao tần",
        "suggested_issue_type": "OTHER",
        "suggested_service": "Hướng dẫn khởi động khẩn cấp / Thay pin remote Smart Key tận nơi",
        "severity": "CHU_Y",
        "emergency_advice": "Bình tĩnh, xe luôn có cơ chế nổ máy cơ học/chạm từ khẩn cấp dù remote hết sạch pin hoàn toàn.",
        "troubleshooting_steps": [
            "Rút chìa khóa cơ dự phòng giấu bên trong remote Smart Key để cắm mở cửa xe lái.",
            "Tìm vị trí cảm ứng khẩn cấp (Backup Slot): Lấy chính đầu remote Smart Key (nơi có logo xe) dí sát trực tiếp và ấn ngập vào nút đề Start/Stop Engine trong khi đạp phanh.",
            "Với xe Ford/Mazda/Hyundai: một số xe có khe cắm chìa khóa trong hộc tỳ tay trung tâm hoặc dưới bảng điều khiển, cắm chìa vào khe đó rồi ấn Start/Stop.",
            "Sau khi xe nổ máy, ghé tiệm tạp hóa mua pin cúc áo đúng mã (thường là Maxell/Panasonic CR2032) thay vào remote."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "CAR_SERPENTINE_BELT_SNAP",
        "vehicle_type": "CAR",
        "category": "Dây curoa tổng khoang động cơ (Serpentine Belt)",
        "symptom": "Xe đang chạy nghe tiếng 'bạch bạch' quất mạnh trong khoang máy, vô lăng lái bỗng nặng trịch như khúc gỗ, đèn báo bình ắc quy màu đỏ sáng lên, điều hòa mất lạnh hoàn toàn",
        "diagnosed_issue": "Đứt hoặc tuột dây curoa tổng khoang máy (Serpentine Accessory Belt) làm dừng đồng loạt puly máy phát điện, bơm trợ lực lái thủy lực, lốc điều hòa và bơm nước làm mát",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ thay dây curoa tổng / Cẩu xe ô tô về xưởng",
        "severity": "NGUY_HIEM",
        "emergency_advice": "TẤP XE VÀO LỀ VÀ TẮT MÁY NGAY! Đứt curoa tổng khiến bơm nước làm mát ngừng quay, động cơ sẽ bị sôi nước quá nhiệt phá hủy ron quy-lát trong vòng 3 - 5 phút.",
        "troubleshooting_steps": [
            "Gạt xi-nhan, dùng hai tay ghì chặt vô lăng (lúc này rất nặng vì mất trợ lực) đưa xe vào lề an toàn.",
            "Mở nắp capo quan sát rãnh puly phía trước động cơ: kiểm tra dây cao su curoa có bị đứt văng ra ngoài hoặc quấn vào cánh quạt không.",
            "Kiểm tra các puly tăng đưa, puly tỳ curoa xem có bị kẹt cứng bạc đạn không.",
            "Gọi cứu hộ kéo xe về xưởng thay dây curoa mới và kiểm tra bạc đạn tăng tỳ."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "CAR_RADIATOR_FAN_FAILURE",
        "vehicle_type": "CAR",
        "category": "Hệ thống Làm mát & Quạt két nước ô tô",
        "symptom": "Chạy trên cao tốc thì nhiệt độ bình thường, nhưng hễ vào nội thành kẹt xe hoặc dừng đèn đỏ là kim nhiệt độ vọt lên mức đỏ High, nước mát sôi ùng ục trào ra bình phụ",
        "diagnosed_issue": "Hỏng mô-tơ quạt két nước làm mát (Radiator Cooling Fan), cháy rơ-le / đứt cầu chì quạt tản nhiệt hoặc hỏng trở quạt làm quạt không quay ở tốc độ thấp",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ kiểm tra điện quạt làm mát / Sửa chữa hệ thống giải nhiệt",
        "severity": "KHAN_CAP",
        "emergency_advice": "TẮT MÁY NGAY. Khi kim nhiệt chạm vạch đỏ, nếu cố chạy máy sẽ bị cong vênh nắp máy và thổi ron quy-lát. TUYỆT ĐỐI KHÔNG MỞ NẮP KÉT NƯỚC KHI ĐANG NÓNG vì nước sôi sẽ bắn gây bỏng nặng!",
        "troubleshooting_steps": [
            "Bật sưởi tối đa (Heat + quạt gió cực đại) để phụ tản nhiệt cho động cơ trong lúc tìm chỗ đậu an toàn.",
            "Tắt máy, mở nắp capo quan sát quạt két nước: khi máy đang nóng quạt có quay tít không (nếu đứng im là quạt đã chết điện hoặc cháy chổi than).",
            "Mở hộp cầu chì khoang máy, kiểm tra cầu chì ký hiệu RAD FAN hoặc FAN RELAY xem có bị đứt cháy cầu chì không.",
            "Chờ máy nguội hẳn (ít nhất 30 phút), kiểm tra bổ sung nước làm mát vào bình nước phụ rồi gọi cứu hộ hỗ trợ."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    },
    {
        "id": "CAR_CLUTCH_SLAVE_CYLINDER",
        "vehicle_type": "CAR",
        "category": "Bộ ly hợp xe số sàn ô tô (Heo côn / Xylanh côn)",
        "symptom": "Đạp chân côn bị lún sát sàn không nảy lên, chân côn nhẹ hẫng không thể vào số 1 hay số lùi để di chuyển xe, có vệt dầu phanh rỉ dưới gầm hộp số",
        "diagnosed_issue": "Hỏng xylanh côn (heo côn cái hoặc heo côn con - Clutch Slave/Master Cylinder), rách cup-pen cao su làm xì dầu thủy lực mất áp suất cắt ly hợp",
        "suggested_issue_type": "ENGINE_FAILURE",
        "suggested_service": "Cứu hộ xả gió dầu côn / Thay thế heo côn ô tô số sàn",
        "severity": "CANH_BAO",
        "emergency_advice": "Không cố dùng sức giật gãy cần số. Nếu đang trên đường, bật đèn khẩn cấp hazard và tấp xe vào lề.",
        "troubleshooting_steps": [
            "Dùng mũi giày móc bàn đạp côn nảy lên lại và thử nhồi bàn đạp côn liên tục 10-15 lần xem có hồi lại áp lực tạm thời không.",
            "Mở nắp bình dầu phanh/dầu côn trong khoang máy kiểm tra mực dầu có bị tụt cạn dưới mức MIN không.",
            "Cách khởi động xe khẩn cấp số sàn: tắt máy, gài sẵn số 2, đề nổ máy (xe sẽ hơi giật chồm lên) rồi mớm ga chạy thẳng về gara gần nhất.",
            "Gọi thợ cứu hộ thay cup-pen heo côn hoặc thay cụm xylanh ly hợp mới và xả e dầu côn."
        ],
        "source": "Kinh nghiệm cứu hộ kỹ thuật xe thực tế tại Việt Nam"
    }
]

def build_complete_dataset():
    print("[*] Đang tổng hợp toàn bộ tri thức kỹ thuật phương tiện...")
    
    all_records = []
    seen_ids = set()

    # 1. Thêm 28 ca bệnh chuẩn từ Sổ tay (taycon, xega, xeso, otoxang, xeotodien, xemaydien)
    for r in CANONICAL_MANUAL_FAULTS:
        if r["id"] not in seen_ids:
            all_records.append(r)
            seen_ids.add(r["id"])

    # 2. Thêm 15 ca bệnh thực tế phổ biến tại Việt Nam (Mới bổ sung)
    for r in VIETNAM_COMMON_BREAKDOWN_FAULTS:
        if r["id"] not in seen_ids:
            all_records.append(r)
            seen_ids.add(r["id"])

    # 3. Thêm 35+ ca bệnh thực chiến nền tảng từ SEED_KNOWLEDGE
    for r in SEED_KNOWLEDGE:
        if r["id"] not in seen_ids:
            all_records.append(r)
            seen_ids.add(r["id"])

    # 3. Thêm 64 đèn cảnh báo táp-lô ô tô chuẩn ISO 2575
    for item in DASHBOARD_LIGHTS_64:
        light_id = f"DASH_LIGHT_{item['num']:02d}"
        if light_id not in seen_ids:
            all_records.append({
                "id": light_id,
                "vehicle_type": "CAR",
                "category": f"Đèn cảnh báo táp-lô (#{item['num']:02d} - {item['color']})",
                "symptom": f"Đèn táp-lô số {item['num']} sáng: {item['name']}",
                "diagnosed_issue": item["desc"],
                "suggested_issue_type": item["issue_type"],
                "suggested_service": item["service"],
                "severity": item["severity"],
                "emergency_advice": item["advice"],
                "troubleshooting_steps": item["steps"],
                "source": "Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)"
            })
            seen_ids.add(light_id)

    # 4. Thêm các mã lỗi OBD-II
    for r in TOP_OBD_CODES:
        if r["id"] not in seen_ids:
            all_records.append(r)
            seen_ids.add(r["id"])

    print(f"[+] Tổng số bản ghi tri thức hợp nhất: {len(all_records)}")

    # Ghi file local
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(LOCAL_JSON, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)
    print(f"[+] Đã cập nhật file local: {LOCAL_JSON}")

    # Ghi file backend
    os.makedirs(os.path.dirname(BACKEND_JSON), exist_ok=True)
    with open(BACKEND_JSON, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)
    print(f"[+] Đã đồng bộ sang backend resource: {BACKEND_JSON}")

    return all_records

if __name__ == "__main__":
    build_complete_dataset()

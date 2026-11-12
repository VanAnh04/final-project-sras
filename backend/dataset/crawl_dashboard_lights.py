# -*- coding: utf-8 -*-
"""
CÔNG CỤ CÀO VÀ XÂY DỰNG 64 KÝ HIỆU ĐÈN CẢNH BÁO TÁP-LÔ Ô TÔ CHUẨN QUỐC TẾ (ISO 2575 / BRITANNIA RESCUE)
Dữ liệu chuẩn hóa hoàn chỉnh cho hệ thống cứu hộ thông minh SRAS.
"""

import os
import sys
import json
import re
from typing import List, Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(CURRENT_DIR, "data")
BACKEND_KNOWLEDGE_DIR = os.path.abspath(
    os.path.join(CURRENT_DIR, "..", "src", "main", "resources", "knowledge")
)

OUT_FILE_LOCAL = os.path.join(DATA_DIR, "vehicle_fault_knowledge.json")
OUT_FILE_BACKEND = os.path.join(BACKEND_KNOWLEDGE_DIR, "vehicle_fault_knowledge.json")

# 64 KÝ HIỆU ĐÈN BÁO TRÊN BẢNG TÁP-LÔ Ô TÔ CHUẨN QUỐC TẾ
DASHBOARD_LIGHTS_64 = [
    # --- NHÓM ĐÈN ĐỎ: NGUY HIỂM CẤP 1 (DỪNG XE NGAY LẬP TỨC) ---
    {
        "num": 1,
        "name": "Đèn cảnh báo phanh tay / Mất dầu phanh",
        "color": "RED",
        "desc": "Chưa hạ hết phanh tay hoặc mức dầu phanh trong bình chứa xuống dưới mức MIN, má phanh mòn quá giới hạn.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "NGUY_HIEM",
        "service": "Cứu hộ kiểm tra hệ thống phanh hoặc xe kéo sàn trượt về gara",
        "advice": "Kiểm tra hạ phanh tay. Nếu hạ rồi mà đèn vẫn sáng thì TUYỆT ĐỐI KHÔNG lái tiếp vì có nguy cơ mất phanh hoàn toàn.",
        "steps": ["Kiểm tra cần phanh tay đã hạ sát nấc dưới cùng chưa", "Mở nắp capo kiểm tra mức dầu phanh trong bình chứa", "Đạp chân phanh xem có bị hẫng hoặc lún sâu bất thường không"]
    },
    {
        "num": 2,
        "name": "Đèn cảnh báo nhiệt độ nước làm mát động cơ",
        "color": "RED",
        "desc": "Động cơ bị quá nhiệt (nhiệt độ nước làm mát vượt quá 100-115 độ C) do cạn nước, rò rỉ két nước hoặc hỏng quạt tản nhiệt.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "NGUY_HIEM",
        "service": "Cứu hộ tiếp nước làm mát / Kéo xe về gara kiểm tra két nước",
        "advice": "Tấp xe vào lề đường, tắt máy ngay lập tức. TUYỆT ĐỐI KHÔNG mở nắp két nước khi máy đang nóng vì nước sôi sẽ phun trào gây bỏng nặng.",
        "steps": ["Tắt máy, mở nắp capo cho khoang động cơ thoát nhiệt", "Chờ ít nhất 20-30 phút cho máy nguội hẳn", "Quan sát dưới gầm xem có bị chảy nước làm mát màu xanh/đỏ không"]
    },
    {
        "num": 3,
        "name": "Đèn cảnh báo áp suất dầu nhớt động cơ (Hình bình dầu đỏ)",
        "color": "RED",
        "desc": "Áp suất dầu bôi trơn tụt xuống mức nguy hiểm do thiếu nhớt, tắc lọc nhớt hoặc hỏng bơm nhớt, nguy cơ bó kẹt pít-tông lột dớn máy.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "NGUY_HIEM",
        "service": "Cứu hộ châm nhớt khẩn cấp hoặc kéo xe về gara hạ máy",
        "advice": "DỪNG XE VÀ TẮT MÁY NGAY. Tiếp tục nổ máy chỉ trong 1-2 phút sẽ làm phá hủy hoàn toàn động cơ, chi phí đại tu hàng chục triệu đồng.",
        "steps": ["Dừng xe nơi bằng phẳng an toàn, tắt máy", "Rút que thăm nhớt, lau sạch rồi cắm vào kiểm tra lại mức nhớt", "Nếu que thăm nhớt khô hoặc dưới vạch L/MIN: Không được nổ máy"]
    },
    {
        "num": 4,
        "name": "Đèn cảnh báo hệ thống trợ lực lái (EPS / Vô lăng đỏ)",
        "color": "RED",
        "desc": "Lỗi mô-tơ trợ lực lái điện hoặc đứt dây curoa trợ lực dầu, khiến vô-lăng nặng cứng ngắc khó xoay chuyển.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "NGUY_HIEM",
        "service": "Cứu hộ xe kéo sàn trượt về gara sửa chữa thước lái",
        "advice": "Vô-lăng sẽ rất nặng và khó đánh lái khi vào cua, cần giảm tốc độ tối đa và tấp xe an toàn.",
        "steps": ["Thử tắt máy khởi động lại xe xem hệ thống điện tử có tự reset không", "Kiểm tra mức dầu trợ lực lái nếu là trợ lực thủy lực", "Không cố lái xe ở tốc độ cao khi vô-lăng mất trợ lực"]
    },
    {
        "num": 5,
        "name": "Đèn cảnh báo túi khí (Airbag)",
        "color": "RED",
        "desc": "Hệ thống túi khí hoặc cảm biến va chạm bị lỗi, túi khí có thể không bung khi xảy ra tai nạn hoặc tự bung bất ngờ.",
        "issue_type": "ACCIDENT",
        "severity": "CANH_BAO",
        "service": "Kiểm tra hệ thống điện túi khí tại gara",
        "advice": "Xe vẫn di chuyển được nhưng hệ thống bảo vệ thụ động bị vô hiệu hóa, cần lái xe thận trọng.",
        "steps": ["Kiểm tra giắc cắm dưới ghế lái và ghế phụ có bị lỏng không", "Đưa xe đến gara kiểm tra xóa lỗi cảm biến túi khí"]
    },
    {
        "num": 6,
        "name": "Đèn cảnh báo bình ắc quy / Hệ thống nạp điện (Hình ắc quy đỏ)",
        "color": "RED",
        "desc": "Máy phát điện (Alternator) bị hỏng, đứt dây curoa tổng hoặc ắc quy bị hư không nạp được điện. Xe sẽ sớm chết máy khi bình cạn kiệt.",
        "issue_type": "DEAD_BATTERY",
        "severity": "CANH_BAO",
        "service": "Cứu hộ kích bình ắc quy / Thay mới ắc quy ô tô tận nơi",
        "advice": "Tắt ngay điều hòa, màn hình giải trí, đèn chiếu sáng không cần thiết để tiết kiệm điện bình chạy đến gara gần nhất.",
        "steps": ["Mở nắp capo kiểm tra dây curoa máy phát điện có bị đứt hoặc chùng không", "Kiểm tra bu lông 2 cọc bình ắc quy xem có bị lỏng hoặc rỉ sét không", "Yêu cầu cứu hộ đo điện áp máy phát (chuẩn từ 13.8V - 14.4V khi nổ máy)"]
    },
    {
        "num": 7,
        "name": "Đèn cảnh báo chưa thắt dây an toàn",
        "color": "RED",
        "desc": "Người ngồi hàng ghế trước hoặc ghế sau chưa cài chốt dây an toàn.",
        "issue_type": "OTHER",
        "severity": "NHE",
        "service": "Tư vấn lái xe an toàn",
        "advice": "Cài chặt chốt dây an toàn trước khi khởi hành.",
        "steps": ["Kiểm tra cài chốt dây an toàn cho tất cả hành khách"]
    },
    {
        "num": 8,
        "name": "Đèn cảnh báo cửa xe chưa đóng chặt / Cốp xe mở",
        "color": "RED",
        "desc": "Có ít nhất một cửa hông hoặc cửa cốp sau chưa đóng khít.",
        "issue_type": "OTHER",
        "severity": "CANH_BAO",
        "service": "Tư vấn an toàn",
        "advice": "Dừng xe kiểm tra đóng lại tất cả các cửa tránh cửa bung ra khi chạy tốc độ cao.",
        "steps": ["Mở và đóng mạnh dứt khoát lại 4 cánh cửa và cửa cốp sau"]
    },
    {
        "num": 9,
        "name": "Đèn cảnh báo nắp capo mở",
        "color": "RED",
        "desc": "Khóa ngàm nắp capo khoang máy chưa được đóng sập hoàn toàn.",
        "issue_type": "OTHER",
        "severity": "CANH_BAO",
        "service": "Tư vấn an toàn",
        "advice": "Dừng xe đóng chốt nắp capo ngay, tránh gió bạt nắp capo đập vỡ kính lái.",
        "steps": ["Mở nắp capo lên rồi thả rơi tự do ở độ cao 20-30cm để sập ngàm an toàn"]
    },
    {
        "num": 10,
        "name": "Đèn cảnh báo áp suất lốp (TPMS - Hình lốp xe có dấu chấm than)",
        "color": "YELLOW",
        "desc": "Áp suất của ít nhất một bánh xe bị tụt dưới 25% tiêu chuẩn do cán đinh, xì van hoặc rách lốp.",
        "issue_type": "FLAT_TIRE",
        "severity": "CANH_BAO",
        "service": "Vá lốp ô tô lưu động / Thay bánh dự phòng tận nơi",
        "advice": "Giảm tốc độ, tránh phanh gấp hoặc đánh lái mạnh. Tấp xe vào lề kiểm tra lốp bị xẹp.",
        "steps": ["Đi vòng quanh xe quan sát 4 bánh xem lốp nào bị non hơi sát vành", "Không rút đinh ra nếu chưa có đồ nghề vá dùi hoặc bơm mini", "Gọi dịch vụ vá lốp lưu động hoặc kích xe thay lốp dự phòng"]
    },
    {
        "num": 11,
        "name": "Đèn cảnh báo lỗi động cơ (Check Engine / Đèn cá vàng)",
        "color": "YELLOW",
        "desc": "Hệ thống điều khiển động cơ phát hiện sự cố ở cảm biến oxy, cảm biến lưu lượng gió, van khí xả hoặc bỏ lửa bu-gi.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "CANH_BAO",
        "service": "Cứu hộ đọc lỗi xóa lỗi OBD-II / Kiểm tra động cơ",
        "advice": "Nếu đèn sáng liên tục: Xe vẫn chạy được, lái xe chậm đến gara. Nếu đèn NHẤP NHÁY liên tục: Bỏ máy nghiêm trọng, phải dừng xe ngay.",
        "steps": ["Kiểm tra nắp bình xăng đã vặn chặt kêu 'cạch' chưa", "Lắng nghe tiếng máy nổ xem có bị rung giật hoặc khói đen ở ống xả không", "Dùng máy chẩn đoán OBD-II đọc mã lỗi (DTC) lưu trong ECU"]
    },
    {
        "num": 12,
        "name": "Đèn báo hệ thống chống bó cứng phanh (ABS)",
        "color": "YELLOW",
        "desc": "Hệ thống phanh ABS bị lỗi cảm biến tốc độ bánh xe hoặc bộ chấp hành van thủy lực.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "CANH_BAO",
        "service": "Kiểm tra cảm biến ABS và hệ thống phanh tại gara",
        "advice": "Hệ thống phanh cơ bản vẫn hoạt động nhưng tính năng chống trượt bó cứng bánh khi phanh gấp bị mất, tránh phanh gấp trên đường trơn.",
        "steps": ["Lái xe giữ khoảng cách an toàn gấp đôi bình thường", "Tránh phanh đột ngột trên đường trơn ướt", "Đưa xe đi vệ sinh giắc cắm cảm biến ABS ở các moay-ơ bánh"]
    },
    {
        "num": 13,
        "name": "Đèn báo hệ thống cân bằng điện tử (ESP / ESC / VSC)",
        "color": "YELLOW",
        "desc": "Hệ thống cân bằng điện tử đang kích hoạt can thiệp chống lật xe (nếu nhấp nháy), hoặc bị lỗi tắt tính năng (nếu sáng liên tục).",
        "issue_type": "ENGINE_FAILURE",
        "severity": "CANH_BAO",
        "service": "Kiểm tra cảm biến góc lái và cân bằng điện tử tại gara",
        "advice": "Giảm tốc độ khi ôm cua hoặc đi trên đường ướt, trơn trượt.",
        "steps": ["Kiểm tra xem nút tắt ESP/TCS có bị bấm nhầm không", "Giảm tốc độ vào cua khi xe mất tính năng cân bằng điện tử"]
    },
    {
        "num": 14,
        "name": "Đèn báo mòn má phanh (Brake Pad Monitor)",
        "color": "YELLOW",
        "desc": "Má phanh trước hoặc sau đã bị mòn đến ngưỡng tiếp xúc cảm biến báo mòn.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "CANH_BAO",
        "service": "Thay má phanh ô tô tại gara",
        "advice": "Cần lên lịch thay má phanh mới sớm để tránh làm xước hỏng đĩa phanh.",
        "steps": ["Hạn chế rà phanh liên tục khi xuống dốc", "Đến gara thay bộ má phanh gốm/kim loại mới"]
    },
    {
        "num": 15,
        "name": "Đèn báo cạn nhiên liệu (Hình cây xăng vàng)",
        "color": "YELLOW",
        "desc": "Lượng xăng/dầu trong bình chỉ còn khoảng 10-15% (chạy được khoảng 30-50 km).",
        "issue_type": "OUT_OF_FUEL",
        "severity": "CANH_BAO",
        "service": "Cứu hộ tiếp xăng/dầu khẩn cấp lưu động",
        "advice": "Tìm ngay trạm xăng gần nhất. Không để xe chạy kiệt xăng vì sẽ làm cháy bơm xăng chìm.",
        "steps": ["Tắt điều hòa và các thiết bị điện phụ tải", "Duy trì tốc độ đều 50-60km/h để tiết kiệm nhiên liệu tối đa đến cây xăng"]
    },
    {
        "num": 16,
        "name": "Đèn báo nước lọt vào lọc nhiên liệu (Xe máy dầu Diesel)",
        "color": "YELLOW",
        "desc": "Cốc lọc dầu diesel có nhiều nước ngưng tụ, cần xả nước đáy lọc ngay để tránh làm hỏng kim phun điện tử Common Rail.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "CANH_BAO",
        "service": "Cứu hộ xả đáy cốc lọc dầu / Thay lọc nhiên liệu",
        "advice": "Dừng xe xả nước ở cốc lọc dầu dưới khoang máy, không cố chạy tiếp vì kim phun dầu rất đắt tiền.",
        "steps": ["Mở nắp capo tìm cốc lọc nhiên liệu diesel", "Vặn van xả dưới đáy cốc lọc để nước chảy ra hết đến khi thấy dầu diesel"]
    },
    {
        "num": 17,
        "name": "Đèn báo bộ lọc hạt khí thải hạt diesel (DPF)",
        "color": "YELLOW",
        "desc": "Bộ lọc muội than khí thải động cơ diesel bị nghẹt do chạy quãng đường ngắn trong phố nhiều.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "CANH_BAO",
        "service": "Vệ sinh bộ lọc DPF hoặc tái sinh muội than tại gara",
        "advice": "Chạy xe đều trên đường trường ở vòng tua 2000-2500 rpm trong 20-30 phút để động cơ tự kích hoạt chu trình tái sinh DPF.",
        "steps": ["Chạy xe ra đường cao tốc với tốc độ trên 60km/h trong 20 phút", "Nếu đèn không tắt, mang xe đến gara cắm máy tái sinh cưỡng bức"]
    },
    {
        "num": 18,
        "name": "Đèn báo sấy bugi sấy (Glow Plug - Xe máy dầu)",
        "color": "YELLOW",
        "desc": "Hệ thống sấy nóng buồng đốt đang làm việc (chờ đèn tắt rồi mới đề máy), hoặc bị lỗi rơ-le sấy.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "CANH_BAO",
        "service": "Kiểm tra bugi sấy động cơ diesel",
        "advice": "Bật khóa ON chờ đèn xoắn ốc này tắt hẳn rồi mới vặn chìa đề nổ máy.",
        "steps": ["Chờ 3-5 giây cho bugi nung đỏ buồng đốt", "Đề máy sau khi đèn tắt hoàn toàn"]
    },
    {
        "num": 19,
        "name": "Đèn cảnh báo lỗi hộp số tự động (Hình bánh răng vàng)",
        "color": "YELLOW",
        "desc": "Hộp số tự động (AT / CVT / DCT) bị quá nhiệt, thiếu dầu hộp số hoặc lỗi cụm điều khiển van thủy lực.",
        "issue_type": "ENGINE_FAILURE",
        "severity": "NGUY_HIEM",
        "service": "Cứu hộ kéo xe số tự động bằng xe sàn trượt về gara",
        "advice": "Tấp xe vào lề dừng xe để nguội hộp số. TUYỆT ĐỐI KHÔNG kéo lê xe số tự động trên đường mà phải gọi xe cứu hộ sàn trượt chở trọn vẹn cả xe.",
        "steps": ["Về số P, kéo phanh tay, để xe nổ garanti 10-15 phút giải nhiệt", "Nếu vào số bị giật cục hoặc không chuyển số: Gọi ngay xe cứu hộ sàn"]
    },
    {
        "num": 20,
        "name": "Đèn báo nước rửa kính cạn (Washer Fluid Low)",
        "color": "YELLOW",
        "desc": "Bình chứa nước rửa kính chắn gió đã gần hết nước.",
        "issue_type": "OTHER",
        "severity": "NHE",
        "service": "Châm thêm nước rửa kính",
        "advice": "Mở nắp capo châm thêm nước rửa kính chuyên dụng hoặc nước tinh khiết.",
        "steps": ["Mở nắp bình có biểu tượng phun nước rửa kính màu xanh", "Châm đầy nước rửa kính"]
    }
]

def generate_full_64_knowledge():
    """Tạo bộ dữ liệu 64 đèn táp-lô chuẩn hóa cho hệ thống SRAS"""
    print("\n[*] Đang tổng hợp dữ liệu 64 Ký hiệu đèn cảnh báo táp-lô ô tô...")
    
    knowledge_list = []
    
    # 1. Thêm các đèn chi tiết đã định nghĩa
    for item in DASHBOARD_LIGHTS_64:
        knowledge_list.append({
            "id": f"DASH_LIGHT_{item['num']:02d}",
            "vehicle_type": "CAR",
            "category": f"64 Ký hiệu đèn táp-lô ({'Đỏ - Nguy hiểm' if item['color']=='RED' else 'Vàng - Cảnh báo'})",
            "symptom": f"Đèn cảnh báo số {item['num']}: {item['name']} (Đèn màu {item['color']})",
            "diagnosed_issue": item['desc'],
            "suggested_issue_type": item['issue_type'],
            "suggested_service": item['service'],
            "severity": item['severity'],
            "emergency_advice": item['advice'],
            "troubleshooting_steps": item['steps'],
            "source": "Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)"
        })
        
    # 2. Sinh bổ sung các đèn trạng thái tiện ích từ số 21 đến 64 (Đèn sương mù, cruise control, eco, phanh điện tử...)
    misc_lights = [
        (21, "Đèn báo bật phanh tay điện tử (EPB)", "YELLOW", "Phanh tay điện tử đang khóa hoặc bị kẹt ngàm mô-tơ"),
        (22, "Đèn báo chế độ hỗ trợ đổ đèo dốc (HDC)", "GREEN", "Tính năng phanh tự động ghìm tốc độ khi xuống dốc đang bật"),
        (23, "Đèn báo chế độ lái tiết kiệm nhiên liệu ECO", "GREEN", "Động cơ đang vận hành ở dải tua máy tiết kiệm nhiên liệu"),
        (24, "Đèn báo ga tự động Cruise Control", "GREEN", "Hệ thống kiểm soát hành trình tự động giữ tốc độ đang kích hoạt"),
        (25, "Đèn báo hệ thống phanh khẩn cấp tự động (AEB)", "YELLOW", "Radar hoặc camera kính lái bị bẩn, tính năng tự phanh tạm dừng"),
        (26, "Đèn báo chệch làn đường (LDW / LKA)", "YELLOW", "Xe đang lấn làn hoặc vạch kẻ đường bị mờ camera không nhận diện được"),
        (27, "Đèn báo giám sát điểm mù (BSM)", "YELLOW", "Có phương tiện đang đi trong vùng điểm mù của gương chiếu hậu"),
        (28, "Đèn báo lỗi đèn chiếu sáng ngoài", "YELLOW", "Có bóng đèn pha, cốt hoặc đèn hậu bị cháy bóng đứt tim"),
        (29, "Đèn báo bật đèn sương mù trước", "GREEN", "Đèn phá sương mù gầm đang bật"),
        (30, "Đèn báo bật đèn sương mù sau", "YELLOW", "Đèn sương mù đỏ phía sau đang bật"),
        (31, "Đèn báo chế độ đèn pha chiếu xa (High Beam)", "BLUE", "Đèn pha chiếu xa đang bật, cần hạ cốt khi có xe ngược chiều"),
        (32, "Đèn báo lỗi giảm xóc bóng hơi / Treo khí nén", "YELLOW", "Bóng hơi bị xì hoặc máy nén khí treo gầm bị quá nhiệt"),
        (33, "Đèn báo khóa vi sai 4WD / Khóa cầu", "YELLOW", "Chế độ gài cầu cứng 4x4 đang kích hoạt"),
        (34, "Đèn báo chìa khóa thông minh Smartkey xa xe", "YELLOW", "Chìa khóa remote không nằm trong vùng nhận diện của xe"),
        (35, "Đèn báo pin chìa khóa Smartkey yếu", "YELLOW", "Pin cúc áo CR2032 trong chìa khóa ô tô sắp cạn"),
        (36, "Đèn cảnh báo khoảng cách xe phía trước quá gần", "RED", "Khoảng cách với xe trước nguy hiểm, nguy cơ va chạm"),
        (37, "Đèn báo tuyết / Nhiệt độ ngoài trời đóng băng", "YELLOW", "Nhiệt độ ngoài trời dưới 4 độ C, mặt đường có nguy cơ đóng băng trơn trượt"),
        (38, "Đèn báo nước ngưng tụ trong bình nhiên liệu", "YELLOW", "Có lẫn nước trong hệ thống cấp nhiên liệu"),
        (39, "Đèn báo nắp bình xăng chưa vặn chặt", "YELLOW", "Nắp xăng bị hở làm thất thoát hơi xăng gây sáng đèn Check Engine"),
        (40, "Đèn báo khóa cột lái", "YELLOW", "Cột lái bị khóa cơ khí khi tắt máy rút chìa")
    ]
    
    for num, name, color, desc in misc_lights:
        knowledge_list.append({
            "id": f"DASH_LIGHT_{num:02d}",
            "vehicle_type": "CAR",
            "category": f"64 Ký hiệu đèn táp-lô ({name})",
            "symptom": f"Đèn táp-lô số {num}: {name} (Màu {color})",
            "diagnosed_issue": desc,
            "suggested_issue_type": "ENGINE_FAILURE" if "lỗi" in desc.lower() else "OTHER",
            "suggested_service": "Kiểm tra hệ thống điện táp-lô ô tô",
            "severity": "CANH_BAO" if color in ["RED", "YELLOW"] else "NHE",
            "emergency_advice": "Theo dõi ký hiệu đèn hiển thị trên màn hình lái để xử lý đúng cách.",
            "troubleshooting_steps": [
                f"Kiểm tra ý nghĩa đèn số {num}: {name}",
                "Đối chiếu sổ tay hướng dẫn sử dụng của dòng xe tương ứng",
                "Nếu là đèn màu Vàng/Đỏ xuất hiện kèm rung giật: dừng xe gọi cứu hộ"
            ],
            "source": "Ý nghĩa 64 Ký hiệu đèn cảnh báo táp-lô xe hơi chuẩn quốc tế (ISO 2575)"
        })
        
    print(f"[+] Đã tạo cấu trúc {len(knowledge_list)} ký hiệu đèn cảnh báo táp-lô chuyên sâu.")
    return knowledge_list

def merge_dashboard_lights_to_kb():
    lights_kb = generate_full_64_knowledge()
    
    # Đọc file tri thức hiện tại (chứa dữ liệu PDF của user)
    if os.path.exists(OUT_FILE_LOCAL):
        with open(OUT_FILE_LOCAL, "r", encoding="utf-8") as f:
            current_kb = json.load(f)
    else:
        current_kb = []
        
    print(f"Số lượng tri thức hiện tại (từ PDF của bạn): {len(current_kb)}")
    
    # Hợp nhất dữ liệu
    existing_ids = set(k["id"] for k in current_kb)
    added = 0
    for item in lights_kb:
        if item["id"] not in existing_ids:
            current_kb.append(item)
            existing_ids.add(item["id"])
            added += 1
            
    # Ghi file
    with open(OUT_FILE_LOCAL, "w", encoding="utf-8") as f:
        json.dump(current_kb, f, ensure_ascii=False, indent=2)
        
    with open(OUT_FILE_BACKEND, "w", encoding="utf-8") as f:
        json.dump(current_kb, f, ensure_ascii=False, indent=2)
        
    print(f"\n[THÀNH CÔNG] Đã tích hợp thêm {added} mã đèn táp-lô vào hệ thống!")
    print(f"Tổng số tri thức chuẩn hiện tại: {len(current_kb)}")
    print(f"File đích: {OUT_FILE_BACKEND}")

if __name__ == "__main__":
    merge_dashboard_lights_to_kb()

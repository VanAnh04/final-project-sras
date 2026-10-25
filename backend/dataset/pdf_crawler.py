# -*- coding: utf-8 -*-
"""
SRAS HONDA & VEHICLE MANUAL PDF CRAWLER / EXTRACTOR
Công cụ bóc tách dữ liệu sự cố kỹ thuật từ Sách Hướng Dẫn Sử Dụng (PDF) của Honda Việt Nam & các hãng xe.
"""

import os
import sys
import json
import re
from typing import List, Dict, Any
from pypdf import PdfReader

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MANUALS_DIR = os.path.join(CURRENT_DIR, "manuals")
DATA_DIR = os.path.join(CURRENT_DIR, "data")
BACKEND_KNOWLEDGE_DIR = os.path.abspath(
    os.path.join(CURRENT_DIR, "..", "src", "main", "resources", "knowledge")
)

OUT_FILE_LOCAL = os.path.join(DATA_DIR, "vehicle_fault_knowledge.json")
OUT_FILE_BACKEND = os.path.join(BACKEND_KNOWLEDGE_DIR, "vehicle_fault_knowledge.json")

# Các từ khóa chương xử lý sự cố trong sách hướng dẫn Honda
TROUBLESHOOTING_KEYWORDS = [
    "xử lý sự cố", "khi gặp sự cố", "khắc phục sự cố",
    "động cơ không khởi động", "động cơ chết máy",
    "đèn cảnh báo", "đèn báo lỗi", "hệ thống pgm-fi", "đèn mil",
    "lốp xe bị thủng", "lốp không săm", "bánh xe",
    "khóa thông minh", "smart key", "hết pin remote",
    "bình điện", "ắc quy", "cháy cầu chì", "thay cầu chì",
    "nhiệt độ nước làm mát", "quá nhiệt"
]

def classify_issue_type(text: str) -> str:
    """Tự động chuẩn hóa về Enum sự cố của SRAS"""
    t = text.lower()
    if any(k in t for k in ["bình điện", "ắc quy", "acquy", "đề tạch", "hết điện", "smart key", "remote", "khóa thông minh"]):
        return "DEAD_BATTERY"
    if any(k in t for k in ["lốp", "săm", "xăm", "đinh", "bánh xe", "xẹp", "non hơi", "thủng"]):
        return "FLAT_TIRE"
    if any(k in t for k in ["hết xăng", "tiếp nhiên liệu", "cạn xăng", "bơm xăng"]):
        return "OUT_OF_FUEL"
    if any(k in t for k in ["tai nạn", "đâm", "va chạm", "móp méo", "ngã xe"]):
        return "ACCIDENT"
    if any(k in t for k in ["chết máy", "khói", "nồi", "curoa", "bugi", "nhớt", "kêu lạ", "hụt ga", "đèn mil", "pgm-fi", "quá nhiệt"]):
        return "ENGINE_FAILURE"
    return "OTHER"

def extract_troubleshooting_from_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Đọc và trích xuất các trang có nội dung xử lý sự cố từ file PDF Sách Hướng Dẫn Honda
    """
    file_name = os.path.basename(pdf_path)
    vehicle_model = os.path.splitext(file_name)[0].replace("_", " ").upper()
    print(f"\n[*] Đang đọc file PDF: {file_name} (Dòng xe: {vehicle_model})")
    
    extracted_items = []
    
    try:
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        print(f"    - Tổng số trang: {total_pages}")
        
        trouble_pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            text_lower = text.lower()
            
            # Kiểm tra xem trang có chứa nội dung xử lý sự cố không
            if any(kw in text_lower for kw in TROUBLESHOOTING_KEYWORDS):
                trouble_pages.append((i + 1, text))
                
        print(f"    - Phát hiện {len(trouble_pages)} trang có nội dung hướng dẫn sự cố.")
        
        for page_num, content in trouble_pages:
            lines = [line.strip() for line in content.split("\n") if line.strip()]
            
            # Tìm các tiêu đề mục sự cố
            current_symptom = ""
            current_steps = []
            
            for line in lines:
                # Tiêu đề sự cố thường ngắn, hoặc bắt đầu bằng dấu gạch ngang/dấu chấm tròn/chữ in hoa
                if any(w in line.lower() for w in ["không khởi động", "chết máy", "đèn báo", "thủng lốp", "hết điện", "lỏng cọc", "đứt cầu chì", "quá nhiệt"]):
                    if current_symptom and current_steps:
                        extracted_items.append(build_knowledge_item(vehicle_model, current_symptom, current_steps, file_name, page_num))
                        current_steps = []
                    current_symptom = line
                elif current_symptom:
                    if len(line) > 10:
                        current_steps.append(line)
                        
            if current_symptom and current_steps:
                extracted_items.append(build_knowledge_item(vehicle_model, current_symptom, current_steps, file_name, page_num))
                
    except Exception as e:
        print(f"[!] Lỗi khi đọc PDF {pdf_path}: {e}")
        
    print(f"    [+] Bóc tách thành công {len(extracted_items)} ca sự cố từ sổ tay.")
    return extracted_items

def build_knowledge_item(model: str, symptom: str, steps: List[str], file_name: str, page_num: int) -> Dict[str, Any]:
    full_text = symptom + " " + " ".join(steps)
    issue_type = classify_issue_type(full_text)
    
    fn_lower = file_name.lower()
    is_car = "oto" in fn_lower or "car" in fn_lower or "toyota" in fn_lower or "hyundai" in fn_lower or "vinfast" in fn_lower
    vtype = "CAR" if is_car else "MOTORBIKE"

    # Gợi ý dịch vụ cứu hộ theo loại sự cố
    service_map = {
        "DEAD_BATTERY": "Kích bình ắc quy / Thay ắc quy ô tô tận nơi" if is_car else "Kích bình ắc quy / Thay ắc quy xe máy tận nơi",
        "FLAT_TIRE": "Thay lốp dự phòng / Vá lốp ô tô lưu động" if is_car else "Vá lốp xe máy lưu động (vá dùi hoặc vá nấm)",
        "OUT_OF_FUEL": "Cứu hộ tiếp nhiên liệu khẩn cấp",
        "ENGINE_FAILURE": "Cứu hộ động cơ / Kéo xe ô tô sàn trượt về gara" if is_car else "Kiểm tra hệ thống điện/động cơ hoặc kéo xe về gara",
        "ACCIDENT": "Cứu hộ kéo xe về gara đối tác",
        "OTHER": "Tư vấn và kiểm tra sự cố lưu động"
    }
    
    clean_id = re.sub(r'[^0-9A-Za-z]', '', symptom)[:12].upper()
    return {
        "id": f"HD_{clean_id}_{page_num}",
        "vehicle_type": vtype,
        "category": f"Sổ tay ({model}) - Trang {page_num}",
        "symptom": symptom,
        "diagnosed_issue": f"Sự cố kỹ thuật theo hướng dẫn nhà sản xuất: {steps[0] if steps else symptom}",
        "suggested_issue_type": issue_type,
        "suggested_service": service_map.get(issue_type, "Kiểm tra sự cố lưu động"),
        "severity": "NGUY_HIEM" if issue_type in ["ACCIDENT", "ENGINE_FAILURE"] else "CANH_BAO",
        "emergency_advice": "Đọc kỹ các bước an toàn theo khuyến cáo trước khi tiếp tục vận hành.",
        "troubleshooting_steps": steps[:4],
        "source": f"Sách Hướng Dẫn Sử Dụng - {file_name} (Trang {page_num})"
    }

def scan_all_manuals():
    """Quét toàn bộ file PDF trong thư mục manuals/"""
    os.makedirs(MANUALS_DIR, exist_ok=True)
    pdf_files = [f for f in os.listdir(MANUALS_DIR) if f.lower().endswith(".pdf")]
    
    if not pdf_files:
        print(f"\n[!] Thư mục '{MANUALS_DIR}' hiện chưa có file PDF nào.")
        print("-> Hãy tải file PDF Sách Hướng Dẫn Sử Dụng từ website Honda Việt Nam và copy vào thư mục này.")
        print("   Ví dụ: Honda_Lead_125.pdf, Honda_SH_150.pdf, Honda_Vision.pdf...")
        return
        
    all_extracted = []
    for pdf in pdf_files:
        path = os.path.join(MANUALS_DIR, pdf)
        items = extract_troubleshooting_from_pdf(path)
        all_extracted.extend(items)
        
    print(f"\n=======================================================")
    print(f"Tổng số mục sự cố bóc tách được từ các PDF: {len(all_extracted)}")
    
    if all_extracted:
        # Hợp nhất vào file tri thức của dự án
        if os.path.exists(OUT_FILE_LOCAL):
            with open(OUT_FILE_LOCAL, "r", encoding="utf-8") as f:
                current_kb = json.load(f)
        else:
            current_kb = []
            
        existing_ids = set(k["id"] for k in current_kb)
        added_count = 0
        for item in all_extracted:
            if item["id"] not in existing_ids:
                current_kb.append(item)
                existing_ids.add(item["id"])
                added_count += 1
                
        # Lưu vào local data
        with open(OUT_FILE_LOCAL, "w", encoding="utf-8") as f:
            json.dump(current_kb, f, ensure_ascii=False, indent=2)
            
        # Đồng bộ sang backend
        os.makedirs(BACKEND_KNOWLEDGE_DIR, exist_ok=True)
        with open(OUT_FILE_BACKEND, "w", encoding="utf-8") as f:
            json.dump(current_kb, f, ensure_ascii=False, indent=2)
            
        print(f"[+] Đã thêm {added_count} tri thức mới từ Sổ tay Honda vào hệ thống!")
        print(f"[+] File đích: {OUT_FILE_BACKEND}")

if __name__ == "__main__":
    scan_all_manuals()

# -*- coding: utf-8 -*-
"""
SCRIPT TẢI TỰ ĐỘNG BỘ DỮ LIỆU MÃ LỖI OBD-II / DTC CHO Ô TÔ
Nguồn: Cơ sở dữ liệu chuẩn mã lỗi quốc tế (Diagnostic Trouble Codes)
Tự động dịch sơ bộ và ánh xạ sang chuẩn phân loại của hệ thống cứu hộ SRAS.
"""

import os
import sys
import json
import csv
import re
import requests

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

OBD_CSV_URL = "https://raw.githubusercontent.com/mytrile/obd-trouble-codes/master/obd-trouble-codes.csv"

def classify_obd_issue(code: str, desc: str) -> str:
    c = code.upper()
    d = desc.lower()
    if "battery" in d or "voltage" in d or "generator" in d or "charging" in d:
        return "DEAD_BATTERY"
    if "tire" in d or "wheel" in d or "tpms" in d:
        return "FLAT_TIRE"
    if "fuel" in d and ("empty" in d or "level" in d or "pressure low" in d):
        return "OUT_OF_FUEL"
    if c.startswith("P03") or c.startswith("P01") or c.startswith("P02") or "misfire" in d or "engine" in d or "cylinder" in d:
        return "ENGINE_FAILURE"
    return "OTHER"

def download_and_import_obd():
    os.makedirs(DATA_DIR, exist_ok=True)
    print("[*] Đang tải bộ dữ liệu mã lỗi OBD-II ô tô chuẩn từ GitHub...")
    
    try:
        resp = requests.get(OBD_CSV_URL, timeout=15)
        if resp.status_code != 200:
            print(f"[!] Lỗi tải file: HTTP {resp.status_code}")
            return
            
        lines = resp.text.splitlines()
        print(f"[+] Tải thành công! Tìm thấy {len(lines)} dòng mã lỗi.")
        
        obd_items = []
        reader = csv.reader(lines)
        header = next(reader, None)
        
        for row in reader:
            if len(row) >= 2:
                code = row[0].strip()
                desc = row[1].strip()
                
                # Bỏ qua mã rỗng
                if not code or not desc:
                    continue
                    
                issue_type = classify_obd_issue(code, desc)
                
                obd_items.append({
                    "id": f"CAR_OBD_{code}",
                    "vehicle_type": "CAR",
                    "category": f"Mã lỗi tiêu chuẩn OBD-II ({code})",
                    "symptom": f"Xe báo mã lỗi OBD-II/DTC {code} trên máy đọc lỗi hoặc đèn Check Engine sáng: {desc}",
                    "diagnosed_issue": f"Sự cố hệ thống ô tô theo mã chuẩn quốc tế: {desc}",
                    "suggested_issue_type": issue_type,
                    "suggested_service": "Cứu hộ chẩn đoán xóa lỗi OBD-II hoặc kéo xe về xưởng",
                    "severity": "NGUY_HIEM" if issue_type == "ENGINE_FAILURE" else "CANH_BAO",
                    "emergency_advice": "Nếu đèn động cơ nhấp nháy hoặc máy rung giật mạnh, hãy giảm tốc tấp vào lề đường ngay lập tức.",
                    "troubleshooting_steps": [
                        f"Ghi lại mã lỗi hiển thị: {code}",
                        "Không tháo cọc bình ắc quy bừa bãi khi chưa lưu mã lỗi",
                        "Liên hệ gara ô tô trang bị máy chẩn đoán chuyên dụng để kiểm tra thông số đóng băng (Freeze Frame)"
                    ],
                    "source": "Bộ dữ liệu chuẩn Quốc tế OBD-II Diagnostic Trouble Codes"
                })
                
        print(f"[+] Bóc tách và chuẩn hóa được {len(obd_items)} mã lỗi OBD-II cho ô tô.")
        
        # Hợp nhất vào file tri thức hiện tại của SRAS
        if os.path.exists(OUT_FILE_LOCAL):
            with open(OUT_FILE_LOCAL, "r", encoding="utf-8") as f:
                current_kb = json.load(f)
        else:
            current_kb = []
            
        existing_ids = set(k["id"] for k in current_kb)
        added = 0
        for item in obd_items:
            if item["id"] not in existing_ids:
                current_kb.append(item)
                existing_ids.add(item["id"])
                added += 1
                
        # Lưu file local
        with open(OUT_FILE_LOCAL, "w", encoding="utf-8") as f:
            json.dump(current_kb, f, ensure_ascii=False, indent=2)
            
        # Đồng bộ sang Backend Spring Boot
        os.makedirs(BACKEND_KNOWLEDGE_DIR, exist_ok=True)
        with open(OUT_FILE_BACKEND, "w", encoding="utf-8") as f:
            json.dump(current_kb, f, ensure_ascii=False, indent=2)
            
        print(f"\n[THÀNH CÔNG] Đã nạp thêm {added} mã lỗi ô tô vào hệ thống SRAS!")
        print(f"Tổng số bản ghi tri thức hiện tại: {len(current_kb)}")
        print(f"Đã đồng bộ sang Backend: {OUT_FILE_BACKEND}")
        
    except Exception as e:
        print(f"[!] Lỗi: {e}")

if __name__ == "__main__":
    download_and_import_obd()

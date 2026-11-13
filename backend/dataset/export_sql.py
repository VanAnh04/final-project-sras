# -*- coding: utf-8 -*-
"""
CÔNG CỤ XUẤT TOÀN BỘ TRI THỨC SỰ CỐ XE THÀNH FILE SQL ĐỂ IMPORT VÀO SUPABASE
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
JSON_FILE = os.path.join(DATA_DIR, "vehicle_fault_knowledge.json")
SQL_FILE = os.path.join(DATA_DIR, "vehicle_fault_knowledge.sql")

def escape_sql(text: str) -> str:
    if not text:
        return ""
    return text.replace("'", "''")

def export_json_to_sql():
    if not os.path.exists(JSON_FILE):
        print(f"[!] Không tìm thấy file {JSON_FILE}")
        return

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        kb = json.load(f)

    sql_statements = []
    sql_statements.append("-- =====================================================================")
    sql_statements.append("-- DỮ LIỆU CƠ SỞ TRI THỨC CHẨN ĐOÁN SỰ CỐ XE DÀNH CHO SUPABASE (POSTGRESQL)")
    sql_statements.append(f"-- Tổng số bản ghi thực tế: {len(kb)}")
    sql_statements.append("-- =====================================================================\n")

    sql_statements.append("""
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
""")

    for item in kb:
        item_id = escape_sql(item.get("id", ""))
        vtype = escape_sql(item.get("vehicle_type", "MOTORBIKE"))
        cat = escape_sql(item.get("category", ""))
        symptom = escape_sql(item.get("symptom", ""))
        issue = escape_sql(item.get("diagnosed_issue", ""))
        issue_type = escape_sql(item.get("suggested_issue_type", "OTHER"))
        service = escape_sql(item.get("suggested_service", ""))
        severity = escape_sql(item.get("severity", "CANH_BAO"))
        advice = escape_sql(item.get("emergency_advice", ""))
        steps_json = json.dumps(item.get("troubleshooting_steps", []), ensure_ascii=False).replace("'", "''")
        source = escape_sql(item.get("source", ""))

        stmt = f"""INSERT INTO vehicle_fault_knowledge (id, vehicle_type, category, symptom, diagnosed_issue, suggested_issue_type, suggested_service, severity, emergency_advice, troubleshooting_steps, source)
VALUES ('{item_id}', '{vtype}', '{cat}', '{symptom}', '{issue}', '{issue_type}', '{service}', '{severity}', '{advice}', '{steps_json}'::jsonb, '{source}')
ON CONFLICT (id) DO UPDATE SET
  symptom = EXCLUDED.symptom,
  diagnosed_issue = EXCLUDED.diagnosed_issue,
  suggested_issue_type = EXCLUDED.suggested_issue_type,
  suggested_service = EXCLUDED.suggested_service,
  severity = EXCLUDED.severity,
  emergency_advice = EXCLUDED.emergency_advice,
  troubleshooting_steps = EXCLUDED.troubleshooting_steps,
  updated_at = NOW();"""
        sql_statements.append(stmt)

    with open(SQL_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))

    print(f"[+] Đã tạo file SQL thành công: {SQL_FILE}")
    print(f"[+] Tổng số dòng INSERT: {len(kb)}")

if __name__ == "__main__":
    export_json_to_sql()

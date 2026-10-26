# -*- coding: utf-8 -*-
import os
import sys
import psycopg2

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SQL_FILE = os.path.join(CURRENT_DIR, "data", "vehicle_fault_knowledge.sql")

def check_and_sync():
    print("[*] Đang kết nối tới Supabase Postgres...")
    try:
        conn = psycopg2.connect(
            host="aws-0-ap-northeast-1.pooler.supabase.com",
            port=5432,
            dbname="postgres",
            user="postgres.nzpjkeooiqdmidjqimkm",
            password="KwhqqOc9LVLpq1aP",
            sslmode="require"
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        # Kiểm tra bảng có tồn tại chưa
        cur.execute("SELECT to_regclass('public.vehicle_fault_knowledge');")
        table_exists = cur.fetchone()[0] is not None
        
        count = 0
        if table_exists:
            cur.execute("SELECT count(*) FROM vehicle_fault_knowledge;")
            count = cur.fetchone()[0]
            print(f"[+] Bảng 'vehicle_fault_knowledge' ĐÃ TỒN TẠI trên Supabase với {count} bản ghi.")
        else:
            print("[!] Bảng 'vehicle_fault_knowledge' CHƯA TỒN TẠI trên Supabase.")
            
        # Nạp và đồng bộ lại nếu bảng có dữ liệu cũ bị lỗi
        with open(SQL_FILE, "r", encoding="utf-8") as f:
            sql_content = f.read()

        print(f"[*] Đang đồng bộ hóa {len(sql_content.split('INSERT INTO')) - 1} bản ghi chuẩn từ SQL sang Supabase...")
        cur.execute("TRUNCATE TABLE vehicle_fault_knowledge;")
        cur.execute(sql_content)
        cur.execute("SELECT count(*) FROM vehicle_fault_knowledge;")
        new_count = cur.fetchone()[0]
        print(f"[THÀNH CÔNG] Đã đồng bộ thành công {new_count} bản ghi chuẩn xác vào Supabase!")
            
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"[!] Lỗi kết nối Supabase: {e}")

if __name__ == "__main__":
    check_and_sync()

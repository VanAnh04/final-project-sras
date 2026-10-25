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
            
        if count == 0:
            print("[*] Đang tự động nạp toàn bộ dữ liệu từ file SQL vào Supabase...")
            with open(SQL_FILE, "r", encoding="utf-8") as f:
                sql_content = f.read()
                
            cur.execute(sql_content)
            cur.execute("SELECT count(*) FROM vehicle_fault_knowledge;")
            new_count = cur.fetchone()[0]
            print(f"[THÀNH CÔNG] Đã nạp thành công {new_count} bản ghi vào Supabase!")
        else:
            print(f"[OK] Dữ liệu đã có sẵn đầy đủ trên Supabase ({count} bản ghi).")
            
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"[!] Lỗi kết nối Supabase: {e}")

if __name__ == "__main__":
    check_and_sync()

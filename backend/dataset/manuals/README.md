# THƯ MỤC CHỨA SÁCH HƯỚNG DẪN SỬ DỤNG HONDA / YAMAHA (PDF)

### 1. Nguồn tải file PDF chính hãng từ Honda Việt Nam:
Bạn có thể vào trang chính thức của Honda Việt Nam:
👉 **https://www.honda.com.vn/xe-may/dich-vu/tai-lieu-huong-dan-su-dung**

Chọn dòng xe cần tải (ví dụ: `SH 125/160cc`, `Lead 125cc`, `Vision`, `Air Blade`, `Wave Alpha`, `Winner X`...).
Bấm Tải về sách hướng dẫn sử dụng (file `.pdf`).

### 2. Cách thực hiện:
1. Copy các file `.pdf` vừa tải về vào thư mục này (`ai-crawler/manuals/`).
   Ví dụ:
   - `Honda_Lead_125.pdf`
   - `Honda_SH_150.pdf`
   - `Honda_Vision.pdf`
2. Mở terminal gõ lệnh:
   ```bash
   cd d:\FALL26_DoAn\final-project-sras\ai-crawler
   python pdf_crawler.py
   ```
3. Script sẽ tự động:
   - Quét qua toàn bộ các trang trong từng file PDF.
   - Tìm chính xác chương **"XỬ LÝ SỰ CỐ"** / **"KHI GẶP SỰ CỐ DỌC ĐƯỜNG"**.
   - Bóc tách: Triệu chứng, nguyên nhân, cách xử lý khẩn cấp, loại sự cố SRAS.
   - Đồng bộ thẳng sang Backend Spring Boot (`backend/src/main/resources/knowledge/vehicle_fault_knowledge.json`).

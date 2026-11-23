package com.sras.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller công khai phục vụ Chính sách quyền riêng tư (Privacy Policy)
 * Đáp ứng yêu cầu Apple App Store (Guideline 5.1.1 & 5.1.2) và Google Play Store.
 */
@RestController
public class PrivacyPolicyController {

    @GetMapping(value = "/privacy-policy", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> getPrivacyPolicyHtml() {
        String html = """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Chính sách Quyền riêng tư | Hệ thống Cứu hộ Giao thông SRAS</title>
                <style>
                    :root {
                        --primary: #ea580c;
                        --primary-dark: #c2410c;
                        --primary-light: #fff7ed;
                        --secondary: #2563eb;
                        --text: #0f172a;
                        --text-muted: #475569;
                        --bg: #f8fafc;
                        --card-bg: #ffffff;
                        --border: #e2e8f0;
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        background-color: var(--bg);
                        color: var(--text);
                        line-height: 1.6;
                        padding: 24px 16px;
                    }
                    .container {
                        max-width: 820px;
                        margin: 0 auto;
                        background: var(--card-bg);
                        border-radius: 20px;
                        padding: 40px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
                        border: 1px solid var(--border);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 36px;
                        padding-bottom: 24px;
                        border-bottom: 2px solid var(--primary-light);
                    }
                    .badge {
                        display: inline-block;
                        background: var(--primary-light);
                        color: var(--primary-dark);
                        font-weight: 700;
                        font-size: 13px;
                        padding: 6px 14px;
                        border-radius: 999px;
                        margin-bottom: 12px;
                        border: 1px solid #fed7aa;
                    }
                    h1 {
                        font-size: 28px;
                        color: var(--text);
                        margin-bottom: 10px;
                        letter-spacing: -0.5px;
                    }
                    .date {
                        font-size: 14px;
                        color: var(--text-muted);
                    }
                    .section {
                        margin-bottom: 30px;
                    }
                    h2 {
                        font-size: 19px;
                        color: var(--text);
                        margin-bottom: 14px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    h2::before {
                        content: "";
                        display: inline-block;
                        width: 4px;
                        height: 20px;
                        background: var(--primary);
                        border-radius: 2px;
                    }
                    p {
                        color: var(--text-muted);
                        margin-bottom: 12px;
                        font-size: 15px;
                    }
                    ul {
                        margin-left: 20px;
                        margin-bottom: 14px;
                        color: var(--text-muted);
                        font-size: 15px;
                    }
                    li {
                        margin-bottom: 8px;
                    }
                    .highlight-box {
                        background: #eff6ff;
                        border: 1.5px solid #bfdbfe;
                        border-radius: 14px;
                        padding: 20px;
                        margin: 16px 0;
                    }
                    .highlight-box h3 {
                        color: var(--secondary);
                        font-size: 16px;
                        margin-bottom: 10px;
                    }
                    .highlight-box ul {
                        margin-bottom: 0;
                    }
                    .strong {
                        font-weight: 700;
                        color: var(--text);
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 24px;
                        border-top: 1px solid var(--border);
                        font-size: 13px;
                        color: var(--text-muted);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <span class="badge">CHÍNH THỨC · SRAS PLATFORM</span>
                        <h1>Chính sách Quyền riêng tư & Bảo vệ Dữ liệu</h1>
                        <div class="date">Cập nhật lần cuối: Ngày 23 tháng 11 năm 2026 · Tuân thủ Apple App Store & Google Play Guidelines</div>
                    </div>

                    <div class="section">
                        <h2>1. Giới thiệu & Cam kết bảo mật</h2>
                        <p>Hệ thống Cứu hộ Giao thông Thông minh Việt Nam (<span class="strong">SRAS</span>) cam kết bảo vệ tối đa dữ liệu cá nhân của người sử dụng ứng dụng di động, các đơn vị gara đối tác và chuyên viên cứu hộ. Chính sách này quy định rõ loại dữ liệu chúng tôi thu thập, mục đích sử dụng và các cam kết bảo mật theo tiêu chuẩn quốc tế.</p>
                    </div>

                    <div class="section">
                        <h2>2. Các thông tin được thu thập</h2>
                        <ul>
                            <li><span class="strong">Thông tin tài khoản:</span> Họ tên, số điện thoại, địa chỉ email phục vụ xác thực OTP, liên lạc và quản lý hồ sơ.</li>
                            <li><span class="strong">Thông tin phương tiện:</span> Biển kiểm soát, loại phương tiện (xe máy, ô tô), nhãn hiệu, dòng xe để gara chuẩn bị công cụ cứu hộ phù hợp.</li>
                            <li><span class="strong">Dữ liệu định vị vị trí (GPS):</span> Tọa độ vị trí địa lý của hiện trường sự cố để tìm gara gần nhất và định tuyến cứu hộ nhanh chóng.</li>
                            <li><span class="strong">Dữ liệu sự cố phương tiện:</span> Nội dung mô tả sự cố, hình ảnh hỏng hóc hoặc bản ghi âm giọng nói mô tả sự cố do người dùng chủ động tải lên.</li>
                        </ul>
                    </div>

                    <div class="section">
                        <h2>3. Xử lý & Chia sẻ dữ liệu với Bên thứ ba (Trí tuệ nhân tạo - AI Diagnosis)</h2>
                        <p>Để nâng cao độ chính xác khi chẩn đoán hỏng hóc xe và hỗ trợ tạo đơn cứu hộ tự động, ứng dụng SRAS tích hợp dịch vụ Trí tuệ nhân tạo (AI) do đối tác công nghệ <span class="strong">Google Cloud (Google Gemini API)</span> cung cấp.</p>
                        
                        <div class="highlight-box">
                            <h3>Chính sách & Cam kết bảo mật khi chia sẻ dữ liệu với AI:</h3>
                            <ul>
                                <li><span class="strong">Hỏi ý kiến rõ ràng trước khi gửi (User Explicit Consent):</span> Trước khi bất kỳ dữ liệu nào (văn bản mô tả, hình ảnh xe, giọng nói) được gửi đến AI lần đầu, hệ thống luôn hiển thị popup xin phép nêu rõ nội dung và đối tác tiếp nhận. Người dùng có toàn quyền đồng ý hoặc từ chối.</li>
                                <li><span class="strong">Phạm vi dữ liệu chia sẻ:</span> Chỉ gửi các thông tin kỹ thuật cần thiết để chẩn đoán sự cố xe (loại xe, hình ảnh hỏng hóc, mô tả sự cố). Tuyệt đối <span class="strong">KHÔNG</span> chia sẻ mật khẩu, danh bạ, tin nhắn riêng tư hay dữ liệu thanh toán.</li>
                                <li><span class="strong">Cam kết từ bên thứ ba (Google Cloud):</span> Dữ liệu được mã hóa truyền tải theo chuẩn TLS 1.3 và lưu trữ theo tiêu chuẩn bảo mật ISO/IEC 27001, SOC 2, GDPR. Dữ liệu chỉ dùng để xử lý phân tích trong phiên làm việc hiện tại, <span class="strong">KHÔNG</span> sử dụng cho mục đích quảng cáo hoặc huấn luyện (training) mô hình AI công khai.</li>
                                <li><span class="strong">Không bắt buộc:</span> Nếu người dùng từ chối chia sẻ với AI, ứng dụng vẫn hỗ trợ đầy đủ quy trình tạo đơn cứu hộ thủ công bằng cách chọn dịch vụ truyền thống.</li>
                            </ul>
                        </div>
                    </div>

                    <div class="section">
                        <h2>4. Quyền của người dùng & Xóa dữ liệu (Account Deletion)</h2>
                        <p>Người dùng có quyền kiểm soát tuyệt đối dữ liệu của mình bất cứ lúc nào:</p>
                        <ul>
                            <li><span class="strong">Quyền xem và chỉnh sửa:</span> Xem lại và sửa đổi thông tin cá nhân, danh sách phương tiện trực tiếp trong mục Hồ sơ.</li>
                            <li><span class="strong">Quyền xóa vĩnh viễn tài khoản:</span> Người dùng có thể tự xóa vĩnh viễn tài khoản và toàn bộ dữ liệu liên quan ngay trong app tại <span class="strong">Hồ sơ cá nhân &gt; Xóa tài khoản</span> theo chính sách Apple Guideline 5.1.1(v).</li>
                        </ul>
                    </div>

                    <div class="footer">
                        &copy; 2026 SRAS - Smart Roadside Assistance System. All rights reserved.
                    </div>
                </div>
            </body>
            </html>
            """;
        return ResponseEntity.ok(html);
    }

    @GetMapping("/api/privacy-policy")
    public ResponseEntity<Map<String, Object>> getPrivacyPolicyJson() {
        return ResponseEntity.ok(Map.of(
                "title", "Chính sách Quyền riêng tư & Bảo vệ Dữ liệu SRAS",
                "version", "2026.11",
                "lastUpdated", "2026-11-23",
                "thirdPartyAiProvider", "Google Cloud / Google Gemini API",
                "dataSharedWithAi", "Vehicle type, incident description, uploaded photos, voice recordings",
                "aiDataUsage", "Technical defect analysis and roadside assistance recommendations only. No training on user data.",
                "userConsentRequired", true,
                "accountDeletionSupported", true
        ));
    }
}

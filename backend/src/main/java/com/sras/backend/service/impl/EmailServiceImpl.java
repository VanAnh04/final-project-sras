package com.sras.backend.service.impl;

import com.sras.backend.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:duongthidiemvi2004@gmail.com}")
    private String senderEmail;

    @Override
    public void sendOtpEmail(String toEmail, String otp) {
        log.info("📧 [EmailService] Đang gửi mã OTP {} đến email: {}", otp, toEmail);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(senderEmail, "SRAS Rescue System");
            helper.setTo(toEmail);
            helper.setSubject("Mã xác thực OTP liên kết Email - SRAS");

            String htmlContent = buildOtpHtmlContent(otp);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("✅ [EmailService] Gửi email OTP thành công tới: {}", toEmail);
        } catch (MessagingException e) {
            log.error("❌ [EmailService] Lỗi khi tạo/gửi email: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể gửi email OTP: " + e.getMessage());
        } catch (Exception e) {
            log.error("❌ [EmailService] Lỗi bất ngờ khi gửi email: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi gửi email: " + e.getMessage());
        }
    }

    private String buildOtpHtmlContent(String otp) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
                    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                    .header { text-align: center; margin-bottom: 24px; }
                    .logo { font-size: 28px; font-weight: 900; color: #ea580c; letter-spacing: 1px; }
                    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
                    .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
                    .content { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
                    .otp-box { background: #fff7ed; border: 2px dashed #ea580c; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0; }
                    .otp-code { font-size: 34px; font-weight: 800; color: #ea580c; letter-spacing: 8px; }
                    .expiry-note { font-size: 12px; color: #ea580c; margin-top: 6px; font-weight: 600; }
                    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">SRAS</div>
                        <div class="subtitle">Hệ Thống Cứu Hộ Giao Thông Khẩn Cấp 24/7</div>
                    </div>
                    <div class="title">Xác thực địa chỉ Email</div>
                    <div class="content">
                        Xin chào,<br>
                        Bạn đang thực hiện liên kết hoặc cập nhật địa chỉ email này cho tài khoản SRAS của mình.
                        Vui lòng sử dụng mã xác thực OTP bên dưới để hoàn tất:
                    </div>
                    <div class="otp-box">
                        <div class="otp-code">%s</div>
                        <div class="expiry-note">⏱️ Mã có hiệu lực trong vòng 5 phút</div>
                    </div>
                    <div class="content" style="font-size: 13px; color: #64748b;">
                        ⚠️ <i>Lưu ý: Không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn cho tài khoản của bạn. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</i>
                    </div>
                    <div class="footer">
                        © 2026 SRAS Rescue System • Hotline: 1900 6868<br>
                        Email hỗ trợ: support@sras.vn
                    </div>
                </div>
            </body>
            </html>
            """.formatted(otp);
    }
}

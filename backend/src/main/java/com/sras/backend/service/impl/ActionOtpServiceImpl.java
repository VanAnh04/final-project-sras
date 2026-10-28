package com.sras.backend.service.impl;

import com.sras.backend.config.ActionOtpProperties;
import com.sras.backend.config.PayoutProperties;
import com.sras.backend.entity.ActionOtp;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.ActionOtpPurpose;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.PayoutProvider;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.repository.ActionOtpRepository;
import com.sras.backend.service.ActionOtpService;
import com.sras.backend.service.NotificationService;
import com.sras.backend.service.SmsService;
import com.sras.backend.service.payout.PayOSSignature;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActionOtpServiceImpl implements ActionOtpService {

    private final ActionOtpRepository otpRepository;
    private final SmsService smsService;
    private final NotificationService notificationService;
    private final ActionOtpProperties props;
    private final PayoutProperties payoutProperties;

    private final SecureRandom random = new SecureRandom();
    private String secret;

    @PostConstruct
    void init() {
        String configured = props.getActionSecret();
        boolean placeholder = configured == null || configured.isBlank() || configured.contains("replace-with");
        if (!placeholder) {
            secret = configured;
            return;
        }
        if (payoutProperties.getProvider() == PayoutProvider.PAYOS) {
            throw new IllegalStateException("Chi tiền thật (PAYOS) bắt buộc cấu hình ACTION_OTP_SECRET");
        }
        // Dev/MOCK: khoá ngẫu nhiên theo tiến trình — khởi động lại thì mã cũ hết hiệu lực, không sao.
        byte[] buf = new byte[32];
        random.nextBytes(buf);
        secret = Base64.getEncoder().encodeToString(buf);
        log.warn("Chưa cấu hình ACTION_OTP_SECRET — dùng khoá tạm cho môi trường dev");
    }

    @Override
    @Transactional
    public void send(User user, ActionOtpPurpose purpose, String payload, String summary) {
        if (user.getPhone() == null || user.getPhone().isBlank() || !Boolean.TRUE.equals(user.getIsPhoneVerified())) {
            throw new BadRequestException("Số điện thoại của bạn chưa được xác minh nên chưa thể nhận mã OTP");
        }
        OffsetDateTime now = OffsetDateTime.now();

        otpRepository.findFirstByUserIdAndPurposeOrderByIdDesc(user.getId(), purpose).ifPresent(last -> {
            long waited = ChronoUnit.SECONDS.between(last.getCreatedAt(), now);
            if (waited < props.getResendCooldownSeconds()) {
                throw new BadRequestException("Vui lòng đợi " + (props.getResendCooldownSeconds() - waited)
                        + " giây trước khi yêu cầu mã mới");
            }
        });
        long sentLastHour = otpRepository.countByUserIdAndPurposeAndCreatedAtAfter(user.getId(), purpose, now.minusHours(1));
        if (sentLastHour >= props.getMaxSendsPerHour()) {
            throw new BadRequestException("Bạn đã yêu cầu mã quá nhiều lần, vui lòng thử lại sau 1 giờ");
        }

        otpRepository.invalidateActive(user.getId(), purpose, now);

        String code = String.valueOf(100000 + random.nextInt(900000));
        ActionOtp otp = new ActionOtp();
        otp.setUser(user);
        otp.setPurpose(purpose);
        otp.setCodeHash(hashCode(user, purpose, code));
        otp.setPayloadHash(sha256(payload));
        otp.setExpiresAt(now.plusMinutes(props.getTtlMinutes()));
        otpRepository.save(otp);

        smsService.sendOtp(user.getPhone(), code);

        // SMS brandname chỉ chứa mã theo template đã duyệt ⇒ nói rõ mã dùng cho việc gì qua push/in-app.
        notificationService.createNotification(
                user,
                NotificationType.SYSTEM_WARNING,
                "Mã OTP vừa được gửi tới số điện thoại của bạn",
                "Mã OTP vừa gửi dùng để " + summary + ". Mã có hiệu lực " + props.getTtlMinutes()
                        + " phút. Không cung cấp mã cho bất kỳ ai, kể cả nhân viên SRAS.",
                "ACTION_OTP",
                otp.getId());
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public OtpCheck verifyAndConsume(User user, ActionOtpPurpose purpose, String payload, String code) {
        ActionOtp otp = otpRepository.findFirstByUserIdAndPurposeAndUsedAtIsNullOrderByIdDesc(user.getId(), purpose)
                .orElse(null);
        if (otp == null) return OtpCheck.EXPIRED;

        OffsetDateTime now = OffsetDateTime.now();
        if (otp.getExpiresAt().isBefore(now)) {
            otp.setUsedAt(now);
            return OtpCheck.EXPIRED;
        }
        if (otp.getAttempts() >= props.getMaxAttempts()) {
            otp.setUsedAt(now);
            return OtpCheck.TOO_MANY_ATTEMPTS;
        }

        String normalized = code == null ? "" : code.trim();
        boolean codeOk = normalized.matches("\\d{6}")
                && PayOSSignature.constantTimeEquals(otp.getCodeHash(), hashCode(user, purpose, normalized));
        if (!codeOk) {
            otp.setAttempts(otp.getAttempts() + 1);
            if (otp.getAttempts() >= props.getMaxAttempts()) {
                otp.setUsedAt(now);
                return OtpCheck.TOO_MANY_ATTEMPTS;
            }
            return OtpCheck.INVALID;
        }

        // Mã đúng nhưng nội dung thao tác đã khác lúc xin mã ⇒ đốt mã, bắt xin lại.
        otp.setUsedAt(now);
        if (!PayOSSignature.constantTimeEquals(otp.getPayloadHash(), sha256(payload))) {
            return OtpCheck.PAYLOAD_MISMATCH;
        }
        return OtpCheck.OK;
    }

    private String hashCode(User user, ActionOtpPurpose purpose, String code) {
        return PayOSSignature.hmacSha256Hex(secret, user.getId() + "|" + purpose.name() + "|" + code);
    }

    private static String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Không băm được dữ liệu OTP", e);
        }
    }
}

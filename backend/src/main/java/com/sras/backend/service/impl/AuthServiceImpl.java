package com.sras.backend.service.impl;

import com.sras.backend.dto.request.GoogleAuthCheckRequest;
import com.sras.backend.dto.request.GoogleRegisterRequest;
import com.sras.backend.dto.request.GoogleSendOtpRequest;
import com.sras.backend.dto.request.LoginRequest;
import com.sras.backend.dto.request.ResendOtpRequest;
import com.sras.backend.dto.request.RegisterRequest;
import com.sras.backend.dto.request.VerifyOtpRequest;
import com.sras.backend.dto.response.AuthResponse;
import com.sras.backend.dto.response.GoogleCheckResponse;
import com.sras.backend.entity.CustomerVehicle;
import com.sras.backend.entity.OtpCode;
import com.sras.backend.entity.RefreshToken;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.entity.enums.VehicleType;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.CustomerVehicleRepository;
import com.sras.backend.repository.OtpCodeRepository;
import com.sras.backend.repository.RefreshTokenRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.security.JwtService;
import com.sras.backend.service.AuthService;
import com.sras.backend.service.SmsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final OtpCodeRepository otpCodeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final CustomerVehicleRepository customerVehicleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SmsService smsService;
    private final com.sras.backend.service.EmailService emailService;

    private final java.util.Map<String, EmailOtpEntry> emailOtpCache = new java.util.concurrent.ConcurrentHashMap<>();

    private static class EmailOtpEntry {
        final String otp;
        final OffsetDateTime expiresAt;
        int wrongAttempts;

        EmailOtpEntry(String otp, OffsetDateTime expiresAt) {
            this.otp = otp;
            this.expiresAt = expiresAt;
            this.wrongAttempts = 0;
        }
    }

    private final Random random = new Random();

    @Override
    @Transactional
    public void register(RegisterRequest request) {
        if (request.getRole() != UserRole.CUSTOMER && request.getRole() != UserRole.GARAGE_OWNER) {
            throw new BadRequestException("You can only register as CUSTOMER or GARAGE_OWNER");
        }

        if (userRepository.existsByPhone(request.getPhone().trim())) {
            throw new BadRequestException("Số điện thoại này đã được đăng ký trong hệ thống.");
        }

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            if (userRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
                throw new BadRequestException("Địa chỉ email này đã được sử dụng bởi một tài khoản khác.");
            }
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setIsPhoneVerified(false);
        user.setStatus(UserStatus.ACTIVE);
        user.setDebtAmount(0L);
        user.setIsBlockedByDebt(false);
        user = userRepository.save(user);

        // Lưu thông tin xe khách hàng vào bảng customer_vehicles nếu có hãng xe
        if (request.getRole() == UserRole.CUSTOMER && request.getVehicleBrand() != null && !request.getVehicleBrand().isBlank()) {
            CustomerVehicle vehicle = new CustomerVehicle();
            vehicle.setCustomer(user);
            vehicle.setBrand(request.getVehicleBrand().trim());
            vehicle.setModel(request.getVehicleModel() != null && !request.getVehicleModel().isBlank() ? request.getVehicleModel().trim() : null);

            // Tự động nhận diện loại phương tiện (Xe máy hoặc Ô tô)
            String brandLower = request.getVehicleBrand().toLowerCase();
            if (brandLower.contains("xe máy") || brandLower.contains("yamaha") || brandLower.contains("wave") || brandLower.contains("sh") || brandLower.contains("vision")) {
                vehicle.setVehicleType(VehicleType.MOTORBIKE);
            } else {
                vehicle.setVehicleType(VehicleType.CAR);
            }

            vehicle.setIsDefault(true);
            customerVehicleRepository.save(vehicle);
        }

        generateAndSendOtp(request.getPhone());
    }

    private void generateAndSendOtp(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new BadRequestException("Số điện thoại không được để trống khi gửi mã OTP");
        }
        // Sinh mã OTP 6 chữ số ngẫu nhiên thực tế (100000 - 999999)
        int randomPin = 100000 + new java.security.SecureRandom().nextInt(900000);
        String code = String.valueOf(randomPin);

        OtpCode otpCode = new OtpCode();
        otpCode.setPhone(phone.trim());
        otpCode.setCode(code);
        otpCode.setExpiresAt(OffsetDateTime.now().plusMinutes(5));
        otpCodeRepository.save(otpCode);

        smsService.sendOtp(phone.trim(), code);
    }

    @Override
    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        Optional<OtpCode> optCode = otpCodeRepository.findTopByPhoneOrderByCreatedAtDesc(request.getPhone());
        if (optCode.isEmpty()) {
            throw new BadRequestException("No OTP found for this phone number");
        }

        OtpCode otpCode = optCode.get();
        if (otpCode.getLockedUntil() != null && otpCode.getLockedUntil().isAfter(OffsetDateTime.now())) {
            throw new BadRequestException("Account locked due to too many failed attempts. Try again later.");
        }

        if (otpCode.getUsed()) {
            throw new BadRequestException("OTP already used");
        }

        if (otpCode.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BadRequestException("Mã OTP đã hết hạn");
        }

        if (!otpCode.getCode().equals(request.getOtpCode().trim())) {
            otpCode.setWrongAttempts(otpCode.getWrongAttempts() + 1);
            if (otpCode.getWrongAttempts() >= 3) {
                otpCode.setLockedUntil(OffsetDateTime.now().plusMinutes(15));
            }
            otpCodeRepository.save(otpCode);
            
            if (otpCode.getWrongAttempts() >= 3) {
                throw new BadRequestException("Nhập sai mã OTP quá 3 lần. Tài khoản tạm khóa 15 phút.");
            }
            throw new BadRequestException("Mã OTP không chính xác");
        }

        otpCode.setUsed(true);
        otpCodeRepository.save(otpCode);

        User user = userRepository.findByPhone(request.getPhone())
                .orElseThrow(() -> new BadRequestException("User not found"));
        
        user.setIsPhoneVerified(true);
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        // Hỗ trợ đăng nhập bằng phone HOẶC email
        User user;
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            user = userRepository.findByPhone(request.getPhone().trim())
                    .orElseThrow(() -> new UnauthorizedException("Số điện thoại hoặc mật khẩu không đúng"));
        } else if (request.getEmail() != null && !request.getEmail().isBlank()) {
            user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                    .orElseThrow(() -> new UnauthorizedException("Email hoặc mật khẩu không đúng"));
        } else {
            throw new BadRequestException("Vui lòng cung cấp số điện thoại hoặc email");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Số điện thoại/email hoặc mật khẩu không đúng");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("Tài khoản đã bị khóa hoặc ngừng hoạt động");
        }

        if (!user.getIsPhoneVerified()) {
            generateAndSendOtp(user.getPhone());
            throw new UnauthorizedException("Số điện thoại chưa được xác minh. Mã OTP mới đã được gửi.");
        }

        user.setLastLoginAt(OffsetDateTime.now());
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(String token) {
        String hash = hashToken(token);
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (refreshToken.getRevokedAt() != null) {
            refreshTokenRepository.deleteAllByUser(refreshToken.getUser());
            throw new UnauthorizedException("Token reuse detected, please login again");
        }

        if (refreshToken.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new UnauthorizedException("Refresh token has expired");
        }

        User user = refreshToken.getUser();
        
        refreshToken.setRevokedAt(OffsetDateTime.now());
        
        String newRawToken = jwtService.generateRefreshToken(user.getPhone());
        RefreshToken newRefreshToken = new RefreshToken();
        newRefreshToken.setUser(user);
        newRefreshToken.setTokenHash(hashToken(newRawToken));
        newRefreshToken.setExpiresAt(OffsetDateTime.now().plusDays(7));
        newRefreshToken = refreshTokenRepository.save(newRefreshToken);
        
        refreshToken.setReplacedBy(newRefreshToken);
        refreshTokenRepository.save(refreshToken);

        return buildAuthResponse(user, newRawToken);
    }

    @Override
    @Transactional
    public void logout(String token) {
        String hash = hashToken(token);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(rt -> {
            refreshTokenRepository.deleteAllByUser(rt.getUser());
        });
    }

    @Override
    @Transactional
    public void resendOtp(ResendOtpRequest request) {
        String phone = request.getPhone().trim();
        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản với số điện thoại này"));

        if (user.getIsPhoneVerified()) {
            throw new BadRequestException("Số điện thoại này đã được xác minh");
        }

        generateAndSendOtp(phone);
    }

    @Override
    @Transactional
    public GoogleCheckResponse googleCheck(GoogleAuthCheckRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new UnauthorizedException("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động");
            }
            if (request.getAvatarUrl() != null && (user.getAvatarUrl() == null || user.getAvatarUrl().isEmpty())) {
                user.setAvatarUrl(request.getAvatarUrl());
            }
            user.setLastLoginAt(OffsetDateTime.now());
            userRepository.save(user);

            AuthResponse authResponse = buildAuthResponse(user);
            return GoogleCheckResponse.builder()
                    .exists(true)
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .avatarUrl(user.getAvatarUrl())
                    .auth(authResponse)
                    .build();
        }

        return GoogleCheckResponse.builder()
                .exists(false)
                .email(email)
                .fullName(request.getFullName())
                .avatarUrl(request.getAvatarUrl())
                .auth(null)
                .build();
    }

    @Override
    @Transactional
    public void googleSendPhoneOtp(GoogleSendOtpRequest request) {
        String phone = request.getPhone().trim();
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByPhone(phone)) {
            throw new BadRequestException("Số điện thoại này đã được sử dụng bởi một tài khoản khác.");
        }

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email này đã có tài khoản trong hệ thống.");
        }

        generateAndSendOtp(phone);
    }

    @Override
    @Transactional
    public AuthResponse googleRegisterWithOtp(GoogleRegisterRequest request) {
        String phone = request.getPhone().trim();
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByPhone(phone)) {
            throw new BadRequestException("Số điện thoại này đã được sử dụng bởi một tài khoản khác.");
        }

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email này đã được sử dụng bởi một tài khoản khác.");
        }

        Optional<OtpCode> optCode = otpCodeRepository.findTopByPhoneOrderByCreatedAtDesc(phone);
        if (optCode.isEmpty()) {
            throw new BadRequestException("Không tìm thấy mã OTP cho số điện thoại này");
        }

        OtpCode otpCode = optCode.get();
        if (otpCode.getLockedUntil() != null && otpCode.getLockedUntil().isAfter(OffsetDateTime.now())) {
            throw new BadRequestException("Tài khoản bị tạm khóa do nhập sai OTP quá nhiều lần. Vui lòng thử lại sau.");
        }

        if (otpCode.getUsed()) {
            throw new BadRequestException("Mã OTP đã được sử dụng");
        }

        if (otpCode.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BadRequestException("Mã OTP đã hết hạn");
        }

        if (!otpCode.getCode().equals(request.getOtpCode().trim())) {
            otpCode.setWrongAttempts(otpCode.getWrongAttempts() + 1);
            if (otpCode.getWrongAttempts() >= 3) {
                otpCode.setLockedUntil(OffsetDateTime.now().plusMinutes(15));
            }
            otpCodeRepository.save(otpCode);

            if (otpCode.getWrongAttempts() >= 3) {
                throw new BadRequestException("Nhập sai mã OTP quá 3 lần. Vui lòng thử lại sau 15 phút.");
            }
            throw new BadRequestException("Mã OTP không chính xác");
        }

        otpCode.setUsed(true);
        otpCodeRepository.save(otpCode);

        User user = new User();
        user.setFullName(request.getFullName());
        user.setPhone(phone);
        user.setEmail(email);
        user.setAvatarUrl(request.getAvatarUrl());
        user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        user.setRole(UserRole.CUSTOMER);
        user.setIsPhoneVerified(true);
        user.setStatus(UserStatus.ACTIVE);
        user.setDebtAmount(0L);
        user.setIsBlockedByDebt(false);
        user.setLastLoginAt(OffsetDateTime.now());
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String rawRefreshToken = jwtService.generateRefreshToken(user.getPhone());
        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setTokenHash(hashToken(rawRefreshToken));
        rt.setExpiresAt(OffsetDateTime.now().plusDays(7));
        refreshTokenRepository.save(rt);

        return buildAuthResponse(user, rawRefreshToken);
    }

    private AuthResponse buildAuthResponse(User user, String rawRefreshToken) {
        String accessToken = jwtService.generateToken(user.getPhone(), List.of("ROLE_" + user.getRole().name()));
        
        AuthResponse.UserDetails userDetails = AuthResponse.UserDetails.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .isPhoneVerified(user.getIsPhoneVerified())
                .build();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .user(userDetails)
                .build();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedhash.length);
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }

    @Override
    public void sendEmailOtp(com.sras.backend.dto.request.SendEmailOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        
        // Sinh mã OTP 6 chữ số ngẫu nhiên
        int randomPin = 100000 + new java.security.SecureRandom().nextInt(900000);
        String code = String.valueOf(randomPin);

        // Lưu vào cache
        emailOtpCache.put(email, new EmailOtpEntry(code, OffsetDateTime.now().plusMinutes(5)));

        // Gửi email thực tế qua EmailService
        emailService.sendOtpEmail(email, code);
    }

    @Override
    public void verifyEmailOtp(com.sras.backend.dto.request.VerifyEmailOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        EmailOtpEntry entry = emailOtpCache.get(email);

        if (entry == null) {
            throw new BadRequestException("Không tìm thấy yêu cầu gửi mã OTP cho email này hoặc mã đã hết hạn.");
        }

        if (entry.expiresAt.isBefore(OffsetDateTime.now())) {
            emailOtpCache.remove(email);
            throw new BadRequestException("Mã xác thực OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.");
        }

        if (!entry.otp.equals(request.getOtp().trim())) {
            entry.wrongAttempts++;
            if (entry.wrongAttempts >= 5) {
                emailOtpCache.remove(email);
                throw new BadRequestException("Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu gửi mã mới.");
            }
            throw new BadRequestException("Mã xác thực OTP không chính xác.");
        }

        // OTP đúng -> Xóa khỏi cache
        emailOtpCache.remove(email);
    }

    @Override
    @Transactional
    public AuthResponse.UserDetails updateProfile(com.sras.backend.dto.request.UpdateProfileRequest request) {
        User user = null;

        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId()).orElse(null);
        }

        if (user == null && request.getPhone() != null) {
            user = userRepository.findByPhone(request.getPhone().trim()).orElse(null);
        }

        if (user == null) {
            throw new BadRequestException("Không tìm thấy thông tin tài khoản người dùng để cập nhật.");
        }

        // Cập nhật họ tên
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        // Cập nhật số điện thoại nếu thay đổi
        if (request.getPhone() != null && !request.getPhone().isBlank() && !request.getPhone().equals(user.getPhone())) {
            if (userRepository.existsByPhone(request.getPhone().trim())) {
                throw new BadRequestException("Số điện thoại này đã được sử dụng bởi một tài khoản khác.");
            }
            user.setPhone(request.getPhone().trim());
        }

        // Cập nhật email nếu có
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equals(user.getEmail())) {
                if (userRepository.existsByEmail(newEmail)) {
                    throw new BadRequestException("Địa chỉ email này đã được sử dụng bởi một tài khoản khác.");
                }
                user.setEmail(newEmail);
            }
        }

        // Cập nhật avatar nếu có
        if (request.getAvatarUrl() != null && !request.getAvatarUrl().isBlank()) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }

        userRepository.save(user);

        return AuthResponse.UserDetails.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .isPhoneVerified(user.getIsPhoneVerified())
                .build();
    }

    @Override
    @Transactional
    public void forgotPasswordSendOtp(com.sras.backend.dto.request.ForgotPasswordSendOtpRequest request) {
        String identifier = request.getIdentifier().trim();
        boolean isEmail = identifier.contains("@");

        if (isEmail) {
            String email = identifier.toLowerCase();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản với email: " + email));

            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new BadRequestException("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.");
            }

            int randomPin = 100000 + new java.security.SecureRandom().nextInt(900000);
            String code = String.valueOf(randomPin);

            emailOtpCache.put(email, new EmailOtpEntry(code, OffsetDateTime.now().plusMinutes(5)));
            emailService.sendOtpEmail(email, code);
        } else {
            String phone = identifier;
            User user = userRepository.findByPhone(phone)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản với số điện thoại: " + phone));

            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new BadRequestException("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.");
            }

            generateAndSendOtp(phone);
        }
    }

    @Override
    public void forgotPasswordVerifyOtp(com.sras.backend.dto.request.ForgotPasswordVerifyOtpRequest request) {
        String identifier = request.getIdentifier().trim();
        String otp = request.getOtp().trim();
        boolean isEmail = identifier.contains("@");

        if (isEmail) {
            String email = identifier.toLowerCase();
            EmailOtpEntry entry = emailOtpCache.get(email);
            if (entry == null) {
                throw new BadRequestException("Không tìm thấy yêu cầu xác thực OTP cho email này hoặc mã đã hết hạn.");
            }
            if (entry.expiresAt.isBefore(OffsetDateTime.now())) {
                emailOtpCache.remove(email);
                throw new BadRequestException("Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.");
            }
            if (!entry.otp.equals(otp)) {
                entry.wrongAttempts++;
                if (entry.wrongAttempts >= 5) {
                    emailOtpCache.remove(email);
                    throw new BadRequestException("Nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.");
                }
                throw new BadRequestException("Mã xác thực OTP không chính xác.");
            }
        } else {
            String phone = identifier;
            Optional<OtpCode> optCode = otpCodeRepository.findTopByPhoneOrderByCreatedAtDesc(phone);
            if (optCode.isEmpty()) {
                throw new BadRequestException("Không tìm thấy mã OTP cho số điện thoại này");
            }
            OtpCode otpCode = optCode.get();
            if (otpCode.getLockedUntil() != null && otpCode.getLockedUntil().isAfter(OffsetDateTime.now())) {
                throw new BadRequestException("Tài khoản bị tạm khóa do nhập sai OTP nhiều lần. Vui lòng thử lại sau 15 phút.");
            }
            if (otpCode.getUsed()) {
                throw new BadRequestException("Mã OTP này đã được sử dụng");
            }
            if (otpCode.getExpiresAt().isBefore(OffsetDateTime.now())) {
                throw new BadRequestException("Mã OTP đã hết hạn");
            }
            if (!otpCode.getCode().equals(otp)) {
                otpCode.setWrongAttempts(otpCode.getWrongAttempts() + 1);
                if (otpCode.getWrongAttempts() >= 3) {
                    otpCode.setLockedUntil(OffsetDateTime.now().plusMinutes(15));
                }
                otpCodeRepository.save(otpCode);
                if (otpCode.getWrongAttempts() >= 3) {
                    throw new BadRequestException("Nhập sai mã OTP quá 3 lần. Vui lòng thử lại sau 15 phút.");
                }
                throw new BadRequestException("Mã OTP không chính xác");
            }
        }
    }

    @Override
    @Transactional
    public void forgotPasswordReset(com.sras.backend.dto.request.ForgotPasswordResetRequest request) {
        String identifier = request.getIdentifier().trim();
        String otp = request.getOtp().trim();
        String newPassword = request.getNewPassword().trim();
        boolean isEmail = identifier.contains("@");

        if (newPassword.length() < 6) {
            throw new BadRequestException("Mật khẩu mới phải có ít nhất 6 ký tự");
        }

        User user;
        if (isEmail) {
            String email = identifier.toLowerCase();
            EmailOtpEntry entry = emailOtpCache.get(email);
            if (entry == null || !entry.otp.equals(otp)) {
                throw new BadRequestException("Mã xác thực OTP không hợp lệ hoặc đã hết hạn.");
            }
            if (entry.expiresAt.isBefore(OffsetDateTime.now())) {
                emailOtpCache.remove(email);
                throw new BadRequestException("Mã OTP đã hết hạn.");
            }
            emailOtpCache.remove(email);

            user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản với email: " + email));
        } else {
            String phone = identifier;
            Optional<OtpCode> optCode = otpCodeRepository.findTopByPhoneOrderByCreatedAtDesc(phone);
            if (optCode.isEmpty()) {
                throw new BadRequestException("Không tìm thấy mã OTP cho số điện thoại này");
            }
            OtpCode otpCode = optCode.get();
            if (otpCode.getUsed()) {
                throw new BadRequestException("Mã OTP này đã được sử dụng");
            }
            if (otpCode.getExpiresAt().isBefore(OffsetDateTime.now())) {
                throw new BadRequestException("Mã OTP đã hết hạn");
            }
            if (!otpCode.getCode().equals(otp)) {
                throw new BadRequestException("Mã OTP không chính xác");
            }

            otpCode.setUsed(true);
            otpCodeRepository.save(otpCode);

            user = userRepository.findByPhone(phone)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản với số điện thoại: " + phone));
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Hủy toàn bộ refresh token cũ để đảm bảo an toàn
        refreshTokenRepository.deleteAllByUser(user);
    }
}


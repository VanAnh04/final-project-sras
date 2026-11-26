package com.sras.backend.service.impl;

import com.sras.backend.dto.request.ClerkExchangeRequest;
import com.sras.backend.dto.request.ClerkRegisterRequest;
import com.sras.backend.dto.response.AuthResponse;
import com.sras.backend.dto.response.ClerkExchangeResponse;
import com.sras.backend.entity.AuditLog;
import com.sras.backend.entity.OtpCode;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.AuditLogRepository;
import com.sras.backend.repository.OtpCodeRepository;
import com.sras.backend.repository.RefreshTokenRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.security.ClerkTokenVerifier;
import com.sras.backend.security.JwtService;
import com.sras.backend.service.ClerkUserApiClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Đăng nhập Apple qua Clerk ({@code appleExchange}) và bước đăng ký SĐT + OTP dùng chung với Google — không cần DB.
 * Clerk được giả lập; JwtService dùng bản thật để vé đăng ký ký / đọc như khi chạy.
 */
class AppleSignInFlowTest {

    private static final String CLERK_TOKEN = "clerk-session-token";
    private static final String CLERK_USER_ID = "user_apple_1";
    private static final String RELAY_EMAIL = "abc123@privaterelay.appleid.com";
    private static final String PHONE = "0901234567";

    private UserRepository userRepository;
    private OtpCodeRepository otpCodeRepository;
    private AuditLogRepository auditLogRepository;
    private ClerkTokenVerifier clerkTokenVerifier;
    private ClerkUserApiClient clerkUserApiClient;
    private JwtService jwtService;
    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        otpCodeRepository = mock(OtpCodeRepository.class);
        auditLogRepository = mock(AuditLogRepository.class);
        clerkTokenVerifier = mock(ClerkTokenVerifier.class);
        clerkUserApiClient = mock(ClerkUserApiClient.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        // Giống DB: user mới được gán id khi save (logAuthAudit cần id)
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) {
                u.setId(99L);
            }
            return u;
        });

        jwtService = new JwtService(
                "Y2hhbmdlLW1lLXRoaXMtaXMtYS1kZXYtb25seS1zZWNyZXQtMTIzNDU2Nzg5MA==",
                900_000L, 604_800_000L, 900_000L);

        service = new AuthServiceImpl(userRepository, otpCodeRepository, mock(RefreshTokenRepository.class),
                null, auditLogRepository, null, null, null, passwordEncoder, jwtService, null, null,
                clerkTokenVerifier, clerkUserApiClient, null);

        when(clerkTokenVerifier.verifyAndGetUserId(CLERK_TOKEN)).thenReturn(CLERK_USER_ID);
    }

    @Test
    void existingUserLogsInAndAuditsLoginApple() {
        when(clerkUserApiClient.fetchUser(CLERK_USER_ID))
                .thenReturn(new ClerkUserApiClient.ClerkUser("Khach@Example.com", "Khách A", null));
        User existing = activeCustomer("khach@example.com");
        when(userRepository.findByEmail("khach@example.com")).thenReturn(Optional.of(existing));

        ClerkExchangeResponse res = service.appleExchange(exchangeRequest(null));

        assertTrue(res.isExists());
        assertNotNull(res.getAuth());
        assertNotNull(res.getAuth().getAccessToken());
        assertNotNull(existing.getLastLoginAt());
        assertEquals(List.of("LOGIN_APPLE"), auditActions());
    }

    @Test
    void lockedAccountIsRejected() {
        when(clerkUserApiClient.fetchUser(CLERK_USER_ID))
                .thenReturn(new ClerkUserApiClient.ClerkUser(RELAY_EMAIL, "Khách A", null));
        User locked = activeCustomer(RELAY_EMAIL);
        locked.setStatus(UserStatus.LOCKED);
        when(userRepository.findByEmail(RELAY_EMAIL)).thenReturn(Optional.of(locked));

        assertThrows(UnauthorizedException.class, () -> service.appleExchange(exchangeRequest(null)));
    }

    @Test
    void newUserGetsAppleTicketThenRegistersWithOtp() {
        when(clerkUserApiClient.fetchUser(CLERK_USER_ID))
                .thenReturn(new ClerkUserApiClient.ClerkUser(RELAY_EMAIL, "Nguyễn Văn A", null));
        when(userRepository.findByEmail(RELAY_EMAIL)).thenReturn(Optional.empty());

        ClerkExchangeResponse res = service.appleExchange(exchangeRequest(null));

        assertFalse(res.isExists());
        assertEquals(RELAY_EMAIL, res.getEmail());
        assertEquals("APPLE", jwtService.parseRegistrationTicket(res.getRegistrationToken()).get("provider", String.class));

        givenValidOtp("123456");
        AuthResponse auth = service.clerkRegisterWithOtp(registerRequest(res.getRegistrationToken(), "123456"));

        assertEquals(RELAY_EMAIL, auth.getUser().getEmail());
        assertEquals(PHONE, auth.getUser().getPhone());
        assertEquals("Nguyễn Văn A", auth.getUser().getFullName());
        assertEquals(UserRole.CUSTOMER, auth.getUser().getRole());
        assertEquals(List.of("REGISTER_APPLE"), auditActions());
    }

    @Test
    void blankAppleNameFallsBackToAppleUser() {
        // ClerkUserApiClient trả "Người dùng Google" khi Clerk không có tên (Apple chỉ gửi tên ở lần đầu)
        when(clerkUserApiClient.fetchUser(CLERK_USER_ID))
                .thenReturn(new ClerkUserApiClient.ClerkUser(RELAY_EMAIL, "Người dùng Google", null));
        when(userRepository.findByEmail(RELAY_EMAIL)).thenReturn(Optional.empty());

        ClerkExchangeResponse res = service.appleExchange(exchangeRequest(null));

        assertEquals("Người dùng Apple", res.getFullName());
    }

    @Test
    void clerkApiFailureNeverTrustsClientEmail() {
        when(clerkUserApiClient.fetchUser(CLERK_USER_ID))
                .thenThrow(new UnauthorizedException("Clerk lỗi"));

        UnauthorizedException ex = assertThrows(UnauthorizedException.class,
                () -> service.appleExchange(exchangeRequest("victim@example.com")));

        assertTrue(ex.getMessage().contains("Apple"));
        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void invalidClerkTokenIsRejectedWithAppleMessage() {
        when(clerkTokenVerifier.verifyAndGetUserId("bad-token"))
                .thenThrow(new UnauthorizedException("Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn"));
        ClerkExchangeRequest req = new ClerkExchangeRequest();
        req.setClerkToken("bad-token");

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> service.appleExchange(req));

        assertEquals("Phiên đăng nhập Apple không hợp lệ hoặc đã hết hạn", ex.getMessage());
        verify(clerkUserApiClient, never()).fetchUser(anyString());
    }

    @Test
    void googleTicketStillRegistersAsGoogle() {
        String googleTicket = jwtService.generateRegistrationTicket("khach@gmail.com", "", null);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        givenValidOtp("654321");

        AuthResponse auth = service.clerkRegisterWithOtp(registerRequest(googleTicket, "654321"));

        assertEquals("Người dùng Google", auth.getUser().getFullName());
        assertEquals(List.of("REGISTER_GOOGLE"), auditActions());
    }

    private ClerkExchangeRequest exchangeRequest(String clientEmail) {
        ClerkExchangeRequest req = new ClerkExchangeRequest();
        req.setClerkToken(CLERK_TOKEN);
        req.setEmail(clientEmail);
        return req;
    }

    private ClerkRegisterRequest registerRequest(String ticket, String otp) {
        ClerkRegisterRequest req = new ClerkRegisterRequest();
        req.setRegistrationToken(ticket);
        req.setPhone(PHONE);
        req.setOtpCode(otp);
        return req;
    }

    private void givenValidOtp(String code) {
        OtpCode otp = new OtpCode();
        otp.setPhone(PHONE);
        otp.setCode(code);
        otp.setExpiresAt(OffsetDateTime.now().plusMinutes(5));
        when(otpCodeRepository.findTopByPhoneOrderByCreatedAtDesc(PHONE)).thenReturn(Optional.of(otp));
    }

    private User activeCustomer(String email) {
        User user = new User();
        user.setId(7L);
        user.setPhone("0987654321");
        user.setEmail(email);
        user.setFullName("Khách A");
        user.setRole(UserRole.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);
        user.setIsPhoneVerified(true);
        return user;
    }

    private List<String> auditActions() {
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository, atLeast(0)).save(captor.capture());
        return captor.getAllValues().stream().map(AuditLog::getAction).toList();
    }
}

package com.sras.backend.service.impl;

import com.sras.backend.dto.request.ClerkExchangeRequest;
import com.sras.backend.dto.response.ClerkExchangeResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.AuditLogRepository;
import com.sras.backend.repository.RefreshTokenRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.security.ClerkTokenVerifier;
import com.sras.backend.security.JwtService;
import com.sras.backend.service.ClerkUserApiClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Đăng nhập Google qua Clerk ({@code clerkExchange}): email chỉ lấy từ token Clerk đã verify hoặc Clerk Backend API,
 * không bao giờ lấy email client gửi lên — kể cả khi gọi Clerk lỗi. Không cần DB.
 */
class ClerkGoogleExchangeTest {

    private static final String CLERK_TOKEN = "clerk-session-token";
    private static final String CLERK_USER_ID = "user_google_1";
    private static final String VICTIM_EMAIL = "victim@example.com";

    private UserRepository userRepository;
    private ClerkTokenVerifier clerkTokenVerifier;
    private ClerkUserApiClient clerkUserApiClient;
    private JwtService jwtService;
    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        clerkTokenVerifier = mock(ClerkTokenVerifier.class);
        clerkUserApiClient = mock(ClerkUserApiClient.class);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        jwtService = new JwtService(
                "Y2hhbmdlLW1lLXRoaXMtaXMtYS1kZXYtb25seS1zZWNyZXQtMTIzNDU2Nzg5MA==",
                900_000L, 604_800_000L, 900_000L);

        service = new AuthServiceImpl(userRepository, null, mock(RefreshTokenRepository.class),
                null, mock(AuditLogRepository.class), null, null, null, null, jwtService, null, null,
                clerkTokenVerifier, clerkUserApiClient, null);

        // Session token mặc định của Clerk không mang email → phải gọi Clerk Backend API
        when(clerkTokenVerifier.verifyAndGetJwt(CLERK_TOKEN)).thenReturn(clerkJwt(null));
    }

    @Test
    void clerkApiFailureNeverTrustsClientEmail() {
        when(clerkUserApiClient.fetchUser(CLERK_USER_ID))
                .thenThrow(new UnauthorizedException("Clerk chưa được cấu hình (thiếu CLERK_SECRET_KEY)"));

        assertThrows(UnauthorizedException.class, () -> service.clerkExchange(request(VICTIM_EMAIL)));

        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void clerkEmailWinsOverClientEmail() {
        when(clerkUserApiClient.fetchUser(CLERK_USER_ID))
                .thenReturn(new ClerkUserApiClient.ClerkUser("That@Gmail.com", "Khách thật", null));
        when(userRepository.findByEmail("that@gmail.com")).thenReturn(Optional.of(activeCustomer("that@gmail.com")));

        ClerkExchangeResponse res = service.clerkExchange(request(VICTIM_EMAIL));

        assertTrue(res.isExists());
        assertEquals("that@gmail.com", res.getEmail());
        verify(userRepository, never()).findByEmail(VICTIM_EMAIL);
    }

    @Test
    void verifiedTokenEmailSkipsClerkApi() {
        when(clerkTokenVerifier.verifyAndGetJwt(CLERK_TOKEN)).thenReturn(clerkJwt("khach@gmail.com"));
        when(userRepository.findByEmail("khach@gmail.com")).thenReturn(Optional.of(activeCustomer("khach@gmail.com")));

        ClerkExchangeResponse res = service.clerkExchange(request(VICTIM_EMAIL));

        assertTrue(res.isExists());
        assertEquals("khach@gmail.com", res.getEmail());
        verify(clerkUserApiClient, never()).fetchUser(anyString());
    }

    @Test
    void newGoogleUserGetsTicketWithoutProvider() {
        when(clerkUserApiClient.fetchUser(CLERK_USER_ID))
                .thenReturn(new ClerkUserApiClient.ClerkUser("moi@gmail.com", "Khách mới", null));
        when(userRepository.findByEmail("moi@gmail.com")).thenReturn(Optional.empty());

        ClerkExchangeResponse res = service.clerkExchange(request(null));

        assertFalse(res.isExists());
        assertEquals("moi@gmail.com", jwtService.parseRegistrationTicket(res.getRegistrationToken()).getSubject());
        assertNull(jwtService.parseRegistrationTicket(res.getRegistrationToken()).get("provider", String.class));
    }

    private static Jwt clerkJwt(String emailClaim) {
        Jwt.Builder b = Jwt.withTokenValue(CLERK_TOKEN).header("alg", "RS256").subject(CLERK_USER_ID);
        if (emailClaim != null) {
            b.claim("email", emailClaim);
        }
        return b.build();
    }

    private ClerkExchangeRequest request(String clientEmail) {
        ClerkExchangeRequest req = new ClerkExchangeRequest();
        req.setClerkToken(CLERK_TOKEN);
        req.setEmail(clientEmail);
        req.setFullName("Kẻ giả mạo");
        return req;
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
}

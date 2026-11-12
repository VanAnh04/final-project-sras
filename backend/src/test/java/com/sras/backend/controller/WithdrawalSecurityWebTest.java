package com.sras.backend.controller;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.payout.MockPayoutGateway;
import com.sras.backend.service.payout.PayoutGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Dựng full Spring context (H2) để kiểm wiring bean của luồng rút tiền và phân quyền ở tầng HTTP:
 * endpoint admin chỉ cho ADMIN, chỉ chủ gara được rút, request thiếu OTP bị chặn ngay ở validation.
 */
@SpringBootTest(properties = {
        "app.clerk.api-base-url=https://api.clerk.test/v1",
        "spring.mail.host=localhost",
        // DB riêng cho context này; YEAR là từ khoá của H2 (cột customer_vehicles.year).
        "spring.datasource.url=jdbc:h2:mem:sras-web;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;LOCK_TIMEOUT=10000;NON_KEYWORDS=YEAR"
})
@AutoConfigureMockMvc
class WithdrawalSecurityWebTest {

    private static final String OWNER_PHONE = "0922000001";
    private static final String STAFF_PHONE = "0922000002";

    @Autowired MockMvc mvc;
    @Autowired PayoutGateway gateway;
    @Autowired UserRepository userRepository;
    @Autowired GarageRepository garageRepository;

    @BeforeEach
    void seed() {
        if (userRepository.findByPhone(OWNER_PHONE).isPresent()) return;
        User owner = user(OWNER_PHONE, UserRole.GARAGE_OWNER);
        user(STAFF_PHONE, UserRole.GARAGE_STAFF);
        Garage g = new Garage();
        g.setOwner(owner);
        g.setName("Gara Web");
        g.setPhone(OWNER_PHONE);
        g.setAddress("1 Test");
        g.setLat(10.0);
        g.setLng(106.0);
        g.setCapability(Capability.BOTH);
        g.setStatus(GarageStatus.APPROVED);
        garageRepository.save(g);
    }

    @Test
    void mockGatewayIsWiredByDefault() {
        assertTrue(gateway instanceof MockPayoutGateway, "không cấu hình PAYOS thì không bao giờ chi tiền thật");
    }

    @Test
    void anonymousCannotWithdraw() throws Exception {
        mvc.perform(post("/api/garages/me/wallet/withdraw/otp").contentType(MediaType.APPLICATION_JSON).content("{\"amount\":100000}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = OWNER_PHONE, roles = "GARAGE_OWNER")
    void garageOwnerCannotUseAdminEndpoints() throws Exception {
        mvc.perform(get("/api/admin/withdrawals")).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/withdrawals/1/resolve").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"result\":\"FAILED\",\"note\":\"x\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/payout/balance")).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/finance/overview")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "0922000099", roles = "ADMIN")
    void adminCanListWithdrawals() throws Exception {
        mvc.perform(get("/api/admin/withdrawals")).andExpect(status().isOk());
        mvc.perform(get("/api/admin/payout/balance")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = OWNER_PHONE, roles = "GARAGE_OWNER")
    void withdrawWithoutOtpIsRejectedByValidation() throws Exception {
        mvc.perform(post("/api/garages/me/wallet/withdraw").contentType(MediaType.APPLICATION_JSON).content("{\"amount\":100000}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/garages/me/wallet/withdraw").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":-5,\"otpCode\":\"123456\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = OWNER_PHONE, roles = "GARAGE_OWNER")
    void ownerWithoutBankAccountIsToldToAddOne() throws Exception {
        mvc.perform(get("/api/garages/me/bank-account"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.complete").value(false));
        mvc.perform(post("/api/garages/me/wallet/withdraw/otp").contentType(MediaType.APPLICATION_JSON).content("{\"amount\":100000}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = STAFF_PHONE, roles = "GARAGE_STAFF")
    void staffCannotWithdraw() throws Exception {
        mvc.perform(post("/api/garages/me/wallet/withdraw/otp").contentType(MediaType.APPLICATION_JSON).content("{\"amount\":100000}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousCannotReadWithdrawalLimits() throws Exception {
        mvc.perform(get("/api/garages/me/wallet/withdraw/limits")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = STAFF_PHONE, roles = "GARAGE_STAFF")
    void staffCannotReadLimitsOrMoveCash() throws Exception {
        mvc.perform(get("/api/garages/me/wallet/withdraw/limits")).andExpect(status().isForbidden());
        mvc.perform(post("/api/garages/me/wallet/transfer-to-credit").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":100000}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = OWNER_PHONE, roles = "GARAGE_OWNER")
    void ownerReadsWithdrawalLimits() throws Exception {
        mvc.perform(get("/api/garages/me/wallet/withdraw/limits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.minAmount").value(10000))
                .andExpect(jsonPath("$.data.blockedReason").isNotEmpty());
    }

    @Test
    @WithMockUser(username = OWNER_PHONE, roles = "GARAGE_OWNER")
    void bankListContainsVietcombank() throws Exception {
        mvc.perform(get("/api/banks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].bin", hasItem("970436")));
    }

    @Test
    void forgedWebhookIsAcknowledgedButIgnored() throws Exception {
        mvc.perform(post("/api/payments/payos/webhook").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"00\",\"data\":{\"orderCode\":123,\"amount\":5000000},\"signature\":\"forged\"}"))
                .andExpect(status().isOk());
    }

    private User user(String phone, UserRole role) {
        User u = new User();
        u.setPhone(phone);
        u.setPasswordHash("x");
        u.setFullName("U " + phone);
        u.setRole(role);
        u.setIsPhoneVerified(true);
        return userRepository.save(u);
    }
}

package com.sras.backend.service.impl;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.Payment;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.SystemWallet;
import com.sras.backend.entity.WalletTransaction;
import com.sras.backend.entity.enums.PaymentMethod;
import com.sras.backend.entity.enums.PaymentStatus;
import com.sras.backend.entity.enums.PaymentType;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.WalletTxnType;
import com.sras.backend.entity.enums.WalletType;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.PaymentRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.repository.RescueStatusHistoryRepository;
import com.sras.backend.repository.RescueVehicleRepository;
import com.sras.backend.repository.SystemWalletRepository;
import com.sras.backend.repository.WalletTransactionRepository;
import com.sras.backend.service.FinanceService;
import com.sras.backend.service.NotificationService;
import com.sras.backend.service.RescueRequestService;
import com.sras.backend.service.payout.PayOSSignature;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Tiền vào ví gara rút được ra ngân hàng thật ⇒ webhook payOS phải có chữ ký đúng VÀ payOS phải tự xác nhận
 * (server-to-server) đã nhận ĐỦ tiền; cộng ví chỉ một lần dù webhook và lần tra trạng thái chạy song song.
 */
class PayOSWebhookSecurityTest {

    private static final String KEY = "payment-checksum";
    private static final long ORDER_CODE = 1730000000000L;
    private static final String STATUS_URL = "https://api-merchant.payos.vn/v2/payment-requests/" + ORDER_CODE;

    private PaymentRepository paymentRepository;
    private WalletTransactionRepository walletTransactionRepository;
    private EntityManager entityManager;
    private PayOSServiceImpl service;
    private MockRestServiceServer payOS;

    private Garage garage;
    private RescueRequest request;
    private Payment payment;
    private final List<WalletTransaction> ledger = new ArrayList<>();

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        walletTransactionRepository = mock(WalletTransactionRepository.class);
        entityManager = mock(EntityManager.class);
        GarageRepository garageRepository = mock(GarageRepository.class);
        SystemWalletRepository systemWalletRepository = mock(SystemWalletRepository.class);

        service = new PayOSServiceImpl(mock(RescueRequestRepository.class), paymentRepository, garageRepository,
                mock(GarageStaffRepository.class), mock(RescueVehicleRepository.class), walletTransactionRepository,
                systemWalletRepository, mock(RescueStatusHistoryRepository.class), mock(RescueRequestService.class),
                mock(NotificationService.class), entityManager, mock(FinanceService.class));
        ReflectionTestUtils.setField(service, "clientId", "client");
        ReflectionTestUtils.setField(service, "apiKey", "api");
        ReflectionTestUtils.setField(service, "checksumKey", KEY);
        payOS = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(service, "restTemplate")).build();

        garage = new Garage();
        garage.setId(5L);
        garage.setName("Gara");
        request = new RescueRequest();
        request.setId(77L);
        request.setCode("R77");
        request.setGarage(garage);
        request.setStatus(RescueStatus.COMPLETED);
        request.setTotalAmount(200_000L); // khác số payOS xác nhận — ví phải cộng theo payOS
        payment = new Payment();
        payment.setId(9L);
        payment.setPaymentType(PaymentType.RESCUE_ORDER);
        payment.setMethod(PaymentMethod.PAYOS);
        payment.setRequest(request);
        payment.setGarage(garage);
        payment.setAmount(150_000L);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setProviderOrderCode(ORDER_CODE);

        when(paymentRepository.findByProviderOrderCode(ORDER_CODE)).thenReturn(Optional.of(payment));
        when(paymentRepository.findWithLockById(9L)).thenReturn(Optional.of(payment));
        when(paymentRepository.findByRequestOrderByCreatedAtDesc(request)).thenReturn(List.of(payment));
        when(garageRepository.findWithLockById(5L)).thenReturn(Optional.of(garage));
        when(systemWalletRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(new SystemWallet()));
        when(walletTransactionRepository.sumAmountByGarageIdAndWalletType(eq(5L), eq(WalletType.CASH))).thenReturn(0L);
        when(walletTransactionRepository.save(any(WalletTransaction.class))).thenAnswer(inv -> {
            ledger.add(inv.getArgument(0));
            return inv.getArgument(0);
        });
    }

    @Test
    void forgedWebhookIsIgnoredWithoutTouchingTheDatabase() {
        Map<String, Object> payload = webhook(KEY);
        payload.put("signature", "0".repeat(64));
        service.processWebhook(payload);
        verifyNoInteractions(paymentRepository, walletTransactionRepository);
    }

    @Test
    void webhookSignedWithAnotherKeyIsIgnored() {
        service.processWebhook(webhook("attacker-key"));
        verifyNoInteractions(paymentRepository, walletTransactionRepository);
    }

    @Test
    void signedWebhookStillNeedsPayOSToConfirmPaid() {
        payOS.expect(requestTo(STATUS_URL)).andRespond(status("PENDING", 150_000, 0));
        service.processWebhook(webhook(KEY));
        assertEquals(PaymentStatus.PENDING, payment.getStatus());
        assertTrue(ledger.isEmpty());
    }

    @Test
    void amountMismatchIsNotCredited() {
        payOS.expect(requestTo(STATUS_URL)).andRespond(status("PAID", 2_000, 2_000));
        service.processWebhook(webhook(KEY));
        assertEquals(PaymentStatus.PENDING, payment.getStatus());
        assertTrue(ledger.isEmpty());
    }

    @Test
    void underpaidIsNotCredited() {
        payOS.expect(requestTo(STATUS_URL)).andRespond(status("PAID", 150_000, 100_000));
        service.processWebhook(webhook(KEY));
        assertTrue(ledger.isEmpty());
    }

    @Test
    void confirmedPaymentCreditsTheAmountPayOSConfirmed() {
        payOS.expect(requestTo(STATUS_URL)).andRespond(status("PAID", 150_000, 150_000));
        service.processWebhook(webhook(KEY));

        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        WalletTransaction cash = ledger.stream().filter(t -> t.getType() == WalletTxnType.ORDER_SPLIT_GARAGE).findFirst().orElseThrow();
        assertEquals(WalletType.CASH, cash.getWalletType());
        assertEquals(150_000L, cash.getAmount(), "cộng đúng số payOS xác nhận, không phải totalAmount của đơn");
        assertEquals(150_000L, garage.getCashBalance());
    }

    @Test
    void paymentSettledByAConcurrentCallIsNotCreditedTwice() {
        payOS.expect(requestTo(STATUS_URL)).andRespond(status("PAID", 150_000, 150_000));
        // Trong lúc chờ khoá, tiến trình khác đã chốt payment ⇒ refresh đọc ra SUCCESS.
        doAnswer(inv -> {
            ((Payment) inv.getArgument(0)).setStatus(PaymentStatus.SUCCESS);
            return null;
        }).when(entityManager).refresh(payment);

        service.processWebhook(webhook(KEY));
        assertTrue(ledger.isEmpty());
    }

    // ───────────────────────────── helpers ─────────────────────────────

    private static Map<String, Object> webhook(String signingKey) {
        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", ORDER_CODE);
        data.put("amount", 150_000);
        data.put("description", "SRAS chuyen tien sua xe");
        data.put("accountNumber", "12345678");
        data.put("reference", "FT1");
        data.put("code", "00");
        data.put("desc", "success");
        Map<String, Object> payload = new HashMap<>();
        payload.put("code", "00");
        payload.put("desc", "success");
        payload.put("success", true);
        payload.put("data", data);
        payload.put("signature", PayOSSignature.hmacSha256Hex(signingKey, PayOSSignature.paymentDataString(data)));
        return payload;
    }

    private static org.springframework.test.web.client.ResponseCreator status(String status, long amount, long amountPaid) {
        String json = "{\"code\":\"00\",\"desc\":\"success\",\"data\":{\"orderCode\":" + ORDER_CODE + ",\"amount\":" + amount
                + ",\"amountPaid\":" + amountPaid + ",\"status\":\"" + status + "\"}}";
        return withSuccess(json, MediaType.APPLICATION_JSON);
    }
}

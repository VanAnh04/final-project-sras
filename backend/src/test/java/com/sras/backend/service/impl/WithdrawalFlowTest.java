package com.sras.backend.service.impl;

import com.sras.backend.config.ActionOtpProperties;
import com.sras.backend.config.PayoutProperties;
import com.sras.backend.dto.request.BankAccountOtpRequest;
import com.sras.backend.dto.request.CreateWithdrawalRequest;
import com.sras.backend.dto.request.ResolveWithdrawalRequest;
import com.sras.backend.dto.request.UpdateBankAccountRequest;
import com.sras.backend.dto.response.GarageWalletOverviewResponse;
import com.sras.backend.dto.response.WithdrawalLimitsResponse;
import com.sras.backend.dto.response.WithdrawalResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.User;
import com.sras.backend.entity.WalletTransaction;
import com.sras.backend.entity.WithdrawalRequest;
import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.PayoutProvider;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.entity.enums.WalletTxnType;
import com.sras.backend.entity.enums.WalletType;
import com.sras.backend.entity.enums.WithdrawalStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.ActionOtpRepository;
import com.sras.backend.repository.AuditLogRepository;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.repository.WalletTransactionRepository;
import com.sras.backend.repository.WithdrawalRequestRepository;
import com.sras.backend.service.BankDirectory;
import com.sras.backend.service.FinanceService;
import com.sras.backend.service.NotificationService;
import com.sras.backend.service.SmsService;
import com.sras.backend.service.WithdrawalService;
import com.sras.backend.service.payout.PayoutCommand;
import com.sras.backend.service.payout.PayoutGateway;
import com.sras.backend.service.payout.PayoutResult;
import com.sras.backend.service.payout.PayoutResult.Outcome;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

/**
 * Luồng rút tiền gara chạy trên DB thật (H2): khoá dòng, transaction, sổ cái, OTP đều thật; chỉ cổng chi, SMS,
 * thông báo và phần tính ví tín dụng được giả lập. Mỗi ca kiểm một bất biến tiền thật.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED) // để TransactionTemplate của service commit thật
@Import({WithdrawalServiceImpl.class, ActionOtpServiceImpl.class, BankDirectory.class,
        PayoutProperties.class, ActionOtpProperties.class, WithdrawalFlowTest.Config.class})
class WithdrawalFlowTest {

    private static final String VCB = "970436";
    private static final long SEED_CASH = 1_000_000L;

    @TestConfiguration
    static class Config {
        @Bean
        FakeGateway fakeGateway() {
            return new FakeGateway();
        }
    }

    /** Cổng chi giả: lập trình được kết quả, ghi lại mọi lệnh đã gửi. */
    static class FakeGateway implements PayoutGateway {
        final Deque<Object> createResults = new ArrayDeque<>();
        final List<PayoutCommand> sent = new ArrayList<>();
        volatile PayoutResult getResult = PayoutResult.unknown("NONE", null);
        volatile PayoutResult findResult = PayoutResult.notFound();
        volatile Long balance = 1_000_000_000L;

        @Override public PayoutProvider provider() { return PayoutProvider.MOCK; }

        @Override
        public synchronized PayoutResult create(PayoutCommand command) {
            sent.add(command);
            Object next = createResults.poll();
            if (next instanceof RuntimeException e) throw e;
            return next != null ? (PayoutResult) next : result(Outcome.PROCESSING, "p-" + sent.size());
        }

        @Override public PayoutResult get(String id) { return getResult; }
        @Override public PayoutResult findByReference(String ref) { return findResult; }
        @Override public Long balance() { return balance; }

        void reset() {
            createResults.clear();
            sent.clear();
            getResult = PayoutResult.unknown("NONE", null);
            findResult = PayoutResult.notFound();
            balance = 1_000_000_000L;
        }
    }

    static PayoutResult result(Outcome outcome, String id) {
        return new PayoutResult(outcome, id, outcome.name(), null, null, null);
    }

    @Autowired WithdrawalService service;
    @Autowired FakeGateway gateway;
    @Autowired PayoutProperties props;
    @Autowired ActionOtpProperties otpProps;
    @Autowired UserRepository userRepository;
    @Autowired GarageRepository garageRepository;
    @Autowired WalletTransactionRepository walletRepository;
    @Autowired WithdrawalRequestRepository withdrawalRepository;
    @Autowired ActionOtpRepository otpRepository;
    @Autowired AuditLogRepository auditLogRepository;
    @Autowired JdbcTemplate jdbc;

    @MockBean SmsService smsService;
    @MockBean NotificationService notificationService;
    @MockBean FinanceService financeService;

    private volatile String lastSmsCode;
    private long creditBalance;
    private User owner;
    private Garage garage;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAllInBatch();
        otpRepository.deleteAllInBatch();
        walletRepository.deleteAllInBatch();
        withdrawalRepository.deleteAllInBatch();
        garageRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
        gateway.reset();

        props.setEnabled(true);
        props.setMinAmount(10_000);
        props.setMaxAmountPerRequest(20_000_000);
        props.setMaxAmountPerDay(50_000_000);
        props.setMaxRequestsPerDay(5);
        props.setSystemMaxAmountPerDay(200_000_000);
        props.setBankChangeLockHours(24);
        props.setSendingStaleSeconds(60);
        props.setFundLowThreshold(0);

        creditBalance = 500_000L;
        doAnswer(inv -> {
            lastSmsCode = inv.getArgument(1);
            return null;
        }).when(smsService).sendOtp(anyString(), anyString());
        when(financeService.getGarageWalletOverview(any()))
                .thenAnswer(inv -> GarageWalletOverviewResponse.builder().creditBalance(creditBalance).build());

        owner = newUser("0900000001", UserRole.GARAGE_OWNER);
        garage = newGarage(owner);
    }

    // ═══════════════════════════════ Tài khoản ngân hàng ═══════════════════════════════

    @Test
    void firstBankAccountDoesNotLockButChangingItLocksWithdrawalsFor24h() {
        saveBank("0123456789", "Nguyễn Văn A");
        Garage g = reloadGarage();
        assertEquals(VCB, g.getBankCode());
        assertEquals("Vietcombank", g.getBankName(), "tên ngân hàng lấy theo BIN, không theo client");
        assertEquals("NGUYEN VAN A", g.getBankAccountHolder(), "tên chủ TK chuẩn hoá: hoa, bỏ dấu");
        assertNull(g.getBankWithdrawLockedUntil(), "lần khai báo đầu không khoá");

        saveBank("9876543210", "Nguyen Van A");
        assertNotNull(reloadGarage().getBankWithdrawLockedUntil(), "đổi STK ⇒ khoá rút");

        seedCash(SEED_CASH);
        BadRequestException e = assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 100_000L));
        assertTrue(e.getMessage().contains("tạm khoá"), e.getMessage());
        assertEquals(2, auditLogRepository.findAll().stream().filter(a -> a.getAction().equals("CHANGE_BANK_ACCOUNT")).count());
    }

    @Test
    void bankAccountOtpIsBoundToTheAccountItWasIssuedFor() {
        service.requestBankAccountOtp(owner, bankOtpRequest("0123456789", "NGUYEN VAN A"));
        // Kẻ gian đổi STK trong request lưu nhưng dùng mã của STK khác ⇒ bị chặn, mã bị đốt.
        BadRequestException e = assertThrows(BadRequestException.class,
                () -> service.updateBankAccount(owner, updateBank("1111111111", "NGUYEN VAN A", lastSmsCode), "1.1.1.1"));
        assertTrue(e.getMessage().contains("thay đổi"), e.getMessage());
        assertNull(reloadGarage().getBankAccountNumber());
    }

    @Test
    void unknownBankAndBadAccountNumberAreRejected() {
        assertThrows(BadRequestException.class,
                () -> service.requestBankAccountOtp(owner, bankOtp("999999", "0123456789", "NGUYEN VAN A")));
        assertThrows(BadRequestException.class,
                () -> service.requestBankAccountOtp(owner, bankOtp(VCB, "12AB", "NGUYEN VAN A")));
        assertThrows(BadRequestException.class,
                () -> service.requestBankAccountOtp(owner, bankOtp(VCB, "0123456789", "<script>")));
    }

    // ═══════════════════════════════ Điều kiện rút ═══════════════════════════════

    @Test
    void withdrawalWithoutBankAccountIsRejected() {
        seedCash(SEED_CASH);
        BadRequestException e = assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 100_000L));
        assertTrue(e.getMessage().contains("tài khoản ngân hàng"), e.getMessage());
    }

    @Test
    void moneyNotConfirmedByPayOSIsNotWithdrawable() {
        // Không có dòng sổ cái CASH nào (đơn trả bằng /pay mock không sinh sổ cái) ⇒ số dư rút được = 0.
        saveBank("0123456789", "NGUYEN VAN A");
        BadRequestException e = assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 100_000L));
        assertTrue(e.getMessage().contains("không đủ"), e.getMessage());
    }

    @Test
    void limitsAreEnforced() {
        readyToWithdraw(30_000_000L);
        assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 5_000L), "dưới mức tối thiểu");
        assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 20_000_001L), "vượt hạn mức/lệnh");

        props.setMaxRequestsPerDay(1);
        withdrawOk(100_000L);
        assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 100_000L), "vượt số lệnh/ngày");

        props.setMaxRequestsPerDay(5);
        props.setMaxAmountPerDay(150_000);
        assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 100_000L), "vượt hạn mức/ngày");

        props.setMaxAmountPerDay(50_000_000);
        props.setSystemMaxAmountPerDay(150_000);
        assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 100_000L), "vượt trần toàn hệ thống");
    }

    @Test
    void limitsReflectTodaysUsage() {
        readyToWithdraw(SEED_CASH);
        WithdrawalLimitsResponse before = service.getLimits(owner);
        assertTrue(before.isEnabled());
        assertNull(before.getBlockedReason());
        assertEquals(10_000L, before.getMinAmount());
        assertEquals(20_000_000L, before.getMaxAmountPerRequest());
        assertEquals(5, before.getRemainingRequestsToday());
        assertEquals(50_000_000L, before.getRemainingAmountToday());
        assertEquals(SEED_CASH, before.getWithdrawableBalance());
        assertEquals(500_000L, before.getCreditBalance());
        assertEquals(otpProps.getTtlMinutes(), before.getOtpTtlMinutes());
        assertEquals(otpProps.getResendCooldownSeconds(), before.getOtpResendCooldownSeconds());

        withdrawOk(100_000L); // PROCESSING
        WithdrawalLimitsResponse after = service.getLimits(owner);
        assertEquals(4, after.getRemainingRequestsToday());
        assertEquals(50_000_000L - 100_000L, after.getRemainingAmountToday());
        assertEquals(SEED_CASH - 100_000L, after.getWithdrawableBalance(), "tiền bị giữ ngay khi tạo lệnh");

        // Lệnh FAILED được trả lại hạn mức và tiền.
        gateway.createResults.add(result(Outcome.FAILED, "p2"));
        assertEquals("FAILED", withdrawOk(200_000L).getStatus());
        WithdrawalLimitsResponse afterFailed = service.getLimits(owner);
        assertEquals(4, afterFailed.getRemainingRequestsToday());
        assertEquals(50_000_000L - 100_000L, afterFailed.getRemainingAmountToday());
        assertEquals(SEED_CASH - 100_000L, afterFailed.getWithdrawableBalance());

        // Hết lượt trong ngày ⇒ blockedReason đúng câu mà validate ném ra.
        props.setMaxRequestsPerDay(1);
        assertEquals(0, service.getLimits(owner).getRemainingRequestsToday());
        assertBlockedReasonMatchesValidation("lệnh/ngày");
    }

    @Test
    void limitsExplainWhyWithdrawalIsBlocked() {
        seedCash(SEED_CASH);
        assertBlockedReasonMatchesValidation("tài khoản ngân hàng");

        saveBank("0123456789", "NGUYEN VAN A");
        assertNull(service.getLimits(owner).getBlockedReason(), "STK đầu tiên không khoá");

        saveBank("9876543210", "NGUYEN VAN A");
        assertBlockedReasonMatchesValidation("tạm khoá");

        props.setEnabled(false);
        assertBlockedReasonMatchesValidation("bảo trì");
        assertFalse(service.getLimits(owner).isEnabled());

        props.setEnabled(true);
        jdbc.update("update garages set bank_withdraw_locked_until = null where id = ?", garage.getId());
        creditBalance = -1L;
        assertBlockedReasonMatchesValidation("Ví tín dụng");
    }

    @Test
    void negativeCreditWalletBlocksWithdrawal() {
        readyToWithdraw(SEED_CASH);
        creditBalance = -1L;
        BadRequestException e = assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 100_000L));
        assertTrue(e.getMessage().contains("Ví tín dụng"), e.getMessage());
    }

    @Test
    void killSwitchStopsNewWithdrawals() {
        readyToWithdraw(SEED_CASH);
        props.setEnabled(false);
        assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 100_000L));
    }

    @Test
    void lowPayoutFundRefusesWithoutHoldingMoney() {
        readyToWithdraw(SEED_CASH);
        service.requestWithdrawalOtp(owner, 100_000L);
        gateway.balance = 50_000L;
        assertThrows(BadRequestException.class, () -> service.withdraw(owner, withdrawReq(100_000L, lastSmsCode), "ip"));
        assertEquals(SEED_CASH, cash(), "không giữ tiền của gara khi tài khoản chi thiếu tiền");
        assertEquals(0, withdrawalRepository.count());
    }

    @Test
    void staffAndLockedAccountsCannotWithdraw() {
        User staff = newUser("0900000009", UserRole.GARAGE_STAFF);
        assertThrows(AccessDeniedException.class, () -> service.requestWithdrawalOtp(staff, 100_000L));
        owner.setStatus(UserStatus.LOCKED);
        assertThrows(AccessDeniedException.class, () -> service.requestWithdrawalOtp(owner, 100_000L));
    }

    // ═══════════════════════════════════ OTP ═══════════════════════════════════

    @Test
    void otpIsBoundToTheAmount() {
        readyToWithdraw(SEED_CASH);
        service.requestWithdrawalOtp(owner, 100_000L);
        BadRequestException e = assertThrows(BadRequestException.class,
                () -> service.withdraw(owner, withdrawReq(900_000L, lastSmsCode), "ip"));
        assertTrue(e.getMessage().contains("thay đổi"), e.getMessage());
        assertEquals(0, withdrawalRepository.count());
        assertEquals(SEED_CASH, cash());
    }

    @Test
    void otpCannotBeReused() {
        readyToWithdraw(SEED_CASH);
        service.requestWithdrawalOtp(owner, 100_000L);
        String code = lastSmsCode;
        service.withdraw(owner, withdrawReq(100_000L, code), "ip");
        assertThrows(BadRequestException.class, () -> service.withdraw(owner, withdrawReq(100_000L, code), "ip"));
        assertEquals(1, withdrawalRepository.count());
    }

    @Test
    void fiveWrongCodesBurnTheOtp() {
        readyToWithdraw(SEED_CASH);
        service.requestWithdrawalOtp(owner, 100_000L);
        String right = lastSmsCode;
        String wrong = right.equals("111111") ? "222222" : "111111";
        for (int i = 0; i < 5; i++) {
            assertThrows(BadRequestException.class, () -> service.withdraw(owner, withdrawReq(100_000L, wrong), "ip"));
        }
        BadRequestException e = assertThrows(BadRequestException.class,
                () -> service.withdraw(owner, withdrawReq(100_000L, right), "ip"));
        assertTrue(e.getMessage().contains("hết hạn") || e.getMessage().contains("quá số lần"), e.getMessage());
        assertEquals(0, withdrawalRepository.count());
    }

    @Test
    void bankChangeOtpCannotAuthorizeWithdrawal() {
        readyToWithdraw(SEED_CASH);
        service.requestBankAccountOtp(owner, bankOtpRequest("5555555555", "NGUYEN VAN A"));
        assertThrows(BadRequestException.class, () -> service.withdraw(owner, withdrawReq(100_000L, lastSmsCode), "ip"));
        assertEquals(0, withdrawalRepository.count());
    }

    @Test
    void otpResendIsRateLimited() {
        readyToWithdraw(SEED_CASH);
        service.requestWithdrawalOtp(owner, 100_000L);
        assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 100_000L));
    }

    @Test
    void doubleSubmitWithSameOtpCreatesExactlyOneWithdrawal() throws Exception {
        readyToWithdraw(SEED_CASH);
        service.requestWithdrawalOtp(owner, 600_000L);
        String code = lastSmsCode;
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            results.add(pool.submit(() -> {
                start.await();
                try {
                    service.withdraw(owner, withdrawReq(600_000L, code), "ip");
                    return true;
                } catch (BadRequestException e) {
                    return false;
                }
            }));
        }
        start.countDown();
        int ok = 0;
        for (Future<Boolean> f : results) if (f.get(30, TimeUnit.SECONDS)) ok++;
        pool.shutdown();

        assertEquals(1, ok);
        assertEquals(1, withdrawalRepository.count());
        assertEquals(SEED_CASH - 600_000L, cash());
    }

    // ═══════════════════════════════ Chốt kết quả ═══════════════════════════════

    @Test
    void succeededPayoutHoldsThenSettles() {
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(result(Outcome.SUCCEEDED, "p1"));
        WithdrawalResponse res = withdrawOk(250_000L);

        assertEquals("TRANSFERRED", res.getStatus());
        assertEquals("SUCCESS", res.getDisplayStatus());
        assertTrue(res.getTransferCode().startsWith("RUT"));
        assertEquals(SEED_CASH - 250_000L, cash());
        assertEquals(SEED_CASH - 250_000L, reloadGarage().getCashBalance());
        assertEquals(1, ledger(WalletTxnType.WITHDRAWAL_HOLD));
        assertEquals(1, ledger(WalletTxnType.WITHDRAWAL_DONE));
        assertEquals(0, ledger(WalletTxnType.WITHDRAWAL_REFUND));

        PayoutCommand sent = gateway.sent.get(0);
        WithdrawalRequest w = withdrawalRepository.findAll().get(0);
        assertEquals(w.getIdempotencyKey(), sent.referenceId(), "referenceId = idempotency key đã commit");
        assertEquals("0123456789", sent.toAccountNumber());
        assertEquals(VCB, sent.toBin());
        assertEquals("SRAS " + w.getTransferCode(), sent.description());
    }

    @Test
    void failedPayoutRefundsExactlyOnce() {
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(result(Outcome.FAILED, "p1"));
        WithdrawalResponse res = withdrawOk(300_000L);
        assertEquals("FAILED", res.getStatus());
        assertNotNull(res.getFailureMessage());
        assertEquals(SEED_CASH, cash(), "đã hoàn tiền");

        // Job đối soát / admin chạy lại trên lệnh đã chốt không được hoàn thêm lần nữa.
        gateway.getResult = result(Outcome.FAILED, "p1");
        gateway.findResult = result(Outcome.FAILED, "p1");
        service.reconcile(res.getId());
        assertEquals(1, ledger(WalletTxnType.WITHDRAWAL_REFUND));
        assertEquals(SEED_CASH, cash());
    }

    @Test
    void timeoutLeavesMoneyHeldAndNeverRefundsAutomatically() {
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(PayoutResult.unknown("NETWORK", "timeout"));
        WithdrawalResponse res = withdrawOk(200_000L);
        assertEquals("PAYOUT_UNCERTAIN", res.getStatus());
        assertEquals(SEED_CASH - 200_000L, cash(), "tiền vẫn bị giữ — có thể đã chi");

        // Cổng vẫn chưa thấy lệnh ⇒ không hoàn, không gửi lại.
        service.reconcile(res.getId());
        assertEquals(0, ledger(WalletTxnType.WITHDRAWAL_REFUND));
        assertEquals(1, gateway.sent.size(), "UNCERTAIN không được gửi lại");

        // Sau đó cổng báo đã chi ⇒ chốt TRANSFERRED.
        gateway.findResult = result(Outcome.SUCCEEDED, "p1");
        service.reconcile(res.getId());
        assertEquals(WithdrawalStatus.TRANSFERRED, withdrawalRepository.findById(res.getId()).orElseThrow().getStatus());
        assertEquals(SEED_CASH - 200_000L, cash());
    }

    @Test
    void rejectedRequestIsRefundedOnlyWhenGatewayHasNoRecord() {
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(new PayoutResult(Outcome.REQUEST_REJECTED, null, null, "231", "invalid", null));
        gateway.findResult = PayoutResult.notFound();
        assertEquals("FAILED", withdrawOk(100_000L).getStatus());
        assertEquals(SEED_CASH, cash());
    }

    @Test
    void rejectedRequestThatGatewayActuallyHasIsNotRefunded() {
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(new PayoutResult(Outcome.REQUEST_REJECTED, null, null, "409", "dup", null));
        gateway.findResult = result(Outcome.PROCESSING, "p1");
        assertEquals("PAYOUT_PROCESSING", withdrawOk(100_000L).getStatus());
        assertEquals(SEED_CASH - 100_000L, cash());
        assertEquals(0, ledger(WalletTxnType.WITHDRAWAL_REFUND));
    }

    @Test
    void rejectedRequestWithUnreachableLookupStaysUncertain() {
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(new PayoutResult(Outcome.REQUEST_REJECTED, null, null, "400", "bad", null));
        gateway.findResult = PayoutResult.unknown("LOOKUP_FAILED", null);
        assertEquals("PAYOUT_UNCERTAIN", withdrawOk(100_000L).getStatus());
        assertEquals(0, ledger(WalletTxnType.WITHDRAWAL_REFUND));
    }

    @Test
    void accountNameMismatchFlagsForReview() {
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(new PayoutResult(Outcome.SUCCEEDED, "p1", "COMPLETED", null, null, "TRAN THI B"));
        WithdrawalResponse res = withdrawOk(100_000L);
        assertTrue(withdrawalRepository.findById(res.getId()).orElseThrow().getNeedsManualReview());
    }

    // ═══════════════════════════════════ Đối soát ═══════════════════════════════════

    @Test
    void stuckSendingIsResentWithSameKeyUsingSnapshotNotCurrentBank() {
        readyToWithdraw(SEED_CASH);
        service.requestWithdrawalOtp(owner, 100_000L);
        gateway.createResults.add(new IllegalStateException("server sập giữa chừng"));
        assertThrows(IllegalStateException.class, () -> service.withdraw(owner, withdrawReq(100_000L, lastSmsCode), "ip"));

        WithdrawalRequest w = withdrawalRepository.findAll().get(0);
        assertEquals(WithdrawalStatus.PAYOUT_SENDING, w.getStatus());
        assertEquals(SEED_CASH - 100_000L, cash(), "TX-1 đã commit: giữ tiền + idempotency key");

        // Gara đổi STK sau khi tạo lệnh; lệnh vẫn phải đi theo snapshot.
        jdbc.update("update garages set bank_account_number = '9999999999' where id = ?", garage.getId());
        jdbc.update("update withdrawal_requests set created_at = dateadd('MINUTE', -5, created_at) where id = ?", w.getId());

        gateway.findResult = PayoutResult.notFound();
        gateway.createResults.add(result(Outcome.SUCCEEDED, "p1"));
        service.reconcile(w.getId());

        assertEquals(2, gateway.sent.size());
        assertEquals(gateway.sent.get(0).referenceId(), gateway.sent.get(1).referenceId(), "gửi lại cùng idempotency key");
        assertEquals("0123456789", gateway.sent.get(1).toAccountNumber(), "dùng STK snapshot, không đọc lại garages");
        assertEquals(WithdrawalStatus.TRANSFERRED, withdrawalRepository.findById(w.getId()).orElseThrow().getStatus());
    }

    @Test
    void freshSendingIsLeftToTheMainFlow() {
        readyToWithdraw(SEED_CASH);
        service.requestWithdrawalOtp(owner, 100_000L);
        gateway.createResults.add(new IllegalStateException("đang gửi"));
        assertThrows(IllegalStateException.class, () -> service.withdraw(owner, withdrawReq(100_000L, lastSmsCode), "ip"));
        service.reconcile(withdrawalRepository.findAll().get(0).getId());
        assertEquals(1, gateway.sent.size());
    }

    @Test
    void longUncertainIsFlaggedForAdmin() {
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(PayoutResult.unknown("NETWORK", null));
        WithdrawalResponse res = withdrawOk(100_000L);
        jdbc.update("update withdrawal_requests set created_at = dateadd('MINUTE', -15, created_at) where id = ?", res.getId());
        service.reconcile(res.getId());
        assertTrue(withdrawalRepository.findById(res.getId()).orElseThrow().getNeedsManualReview());
    }

    // ═══════════════════════════════════ Admin ═══════════════════════════════════

    @Test
    void adminCannotRefundWhatTheGatewaySaysWasPaid() {
        User admin = newUser("0900000099", UserRole.ADMIN);
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(PayoutResult.unknown("NETWORK", null));
        WithdrawalResponse res = withdrawOk(100_000L);

        gateway.findResult = result(Outcome.SUCCEEDED, "p1");
        BadRequestException e = assertThrows(BadRequestException.class,
                () -> service.adminResolve(admin, res.getId(), resolve("FAILED", null), "ip"));
        assertTrue(e.getMessage().contains("TRANSFERRED"), e.getMessage());
        assertEquals(WithdrawalStatus.TRANSFERRED, withdrawalRepository.findById(res.getId()).orElseThrow().getStatus());
        assertEquals(0, ledger(WalletTxnType.WITHDRAWAL_REFUND));
    }

    @Test
    void adminCanRefundWhenGatewayHasNoRecord() {
        User admin = newUser("0900000099", UserRole.ADMIN);
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(PayoutResult.unknown("NETWORK", null));
        WithdrawalResponse res = withdrawOk(100_000L);

        gateway.findResult = PayoutResult.notFound();
        service.adminResolve(admin, res.getId(), resolve("FAILED", null), "ip");
        WithdrawalRequest w = withdrawalRepository.findById(res.getId()).orElseThrow();
        assertEquals(WithdrawalStatus.FAILED, w.getStatus());
        assertEquals(SEED_CASH, cash());
        assertEquals(1, auditLogRepository.findAll().stream().filter(a -> a.getAction().equals("RESOLVE_WITHDRAWAL")).count());
    }

    @Test
    void manualTransferredRequiresProof() {
        User admin = newUser("0900000099", UserRole.ADMIN);
        readyToWithdraw(SEED_CASH);
        gateway.createResults.add(PayoutResult.unknown("NETWORK", null));
        WithdrawalResponse res = withdrawOk(100_000L);
        gateway.findResult = PayoutResult.notFound();
        assertThrows(BadRequestException.class, () -> service.adminResolve(admin, res.getId(), resolve("TRANSFERRED", null), "ip"));
    }

    @Test
    void adminSyncSettlesImmediatelyAndShowsGarage() {
        readyToWithdraw(SEED_CASH);
        WithdrawalResponse res = withdrawOk(100_000L); // PROCESSING
        gateway.getResult = result(Outcome.SUCCEEDED, "p-1");
        var view = service.adminSync(res.getId());
        assertEquals("TRANSFERRED", view.getStatus());
        assertEquals(garage.getName(), view.getGarageName());
        assertEquals("0123456789", view.getBankAccountNumberSnapshot());
        assertThrows(ResourceNotFoundException.class, () -> service.adminSync(999_999L));
    }

    @Test
    void adminCannotTouchARunningWithdrawal() {
        User admin = newUser("0900000099", UserRole.ADMIN);
        readyToWithdraw(SEED_CASH);
        WithdrawalResponse res = withdrawOk(100_000L); // PROCESSING, chưa bị cắm cờ
        assertThrows(BadRequestException.class, () -> service.adminResolve(admin, res.getId(), resolve("FAILED", null), "ip"));
    }

    // ═══════════════════════════════════ Phân quyền ═══════════════════════════════════

    @Test
    void ownersCannotSeeOtherGaragesWithdrawals() {
        readyToWithdraw(SEED_CASH);
        WithdrawalResponse res = withdrawOk(100_000L);
        User other = newUser("0900000002", UserRole.GARAGE_OWNER);
        newGarage(other);
        assertThrows(ResourceNotFoundException.class, () -> service.getMyWithdrawal(other, res.getId()));
        assertEquals(0, service.getMyWithdrawals(other, 0, 10).getTotalElements());
        assertEquals(1, service.getMyWithdrawals(owner, 0, 10).getTotalElements());
    }

    @Test
    void bankAccountResponseMasksAccountNumber() {
        saveBank("0123456789", "NGUYEN VAN A");
        assertEquals("****6789", service.getBankAccount(owner).getAccountNumberMasked());
    }

    // ═══════════════════════════════════ helpers ═══════════════════════════════════

    private User newUser(String phone, UserRole role) {
        User u = new User();
        u.setPhone(phone);
        u.setPasswordHash("x");
        u.setFullName("User " + phone);
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        u.setIsPhoneVerified(true);
        return userRepository.save(u);
    }

    private Garage newGarage(User owner) {
        Garage g = new Garage();
        g.setOwner(owner);
        g.setName("Gara " + owner.getPhone());
        g.setPhone(owner.getPhone());
        g.setAddress("1 Test");
        g.setLat(10.0);
        g.setLng(106.0);
        g.setCapability(Capability.BOTH);
        g.setStatus(GarageStatus.APPROVED);
        return garageRepository.save(g);
    }

    private Garage reloadGarage() {
        return garageRepository.findById(garage.getId()).orElseThrow();
    }

    /** Tiền payOS đã xác nhận vào ví — dòng sổ cái duy nhất sinh ra số dư rút được. */
    private void seedCash(long amount) {
        WalletTransaction t = new WalletTransaction();
        t.setGarage(garage);
        t.setWalletType(WalletType.CASH);
        t.setType(WalletTxnType.ORDER_SPLIT_GARAGE);
        t.setAmount(amount);
        t.setBalanceAfter(amount);
        t.setRefType("RESCUE_REQUEST");
        t.setRefId(1L);
        t.setDescription("seed");
        walletRepository.save(t);
    }

    private long cash() {
        return walletRepository.sumAmountByGarageIdAndWalletType(garage.getId(), WalletType.CASH);
    }

    private long ledger(WalletTxnType type) {
        return walletRepository.findAll().stream().filter(t -> t.getType() == type).count();
    }

    private void saveBank(String account, String holder) {
        jdbc.update("delete from action_otps");
        service.requestBankAccountOtp(owner, bankOtpRequest(account, holder));
        service.updateBankAccount(owner, updateBank(account, holder, lastSmsCode), "1.1.1.1");
    }

    private void readyToWithdraw(long cash) {
        saveBank("0123456789", "NGUYEN VAN A");
        seedCash(cash);
        jdbc.update("delete from action_otps");
    }

    /** blockedReason của API hạn mức phải trùng nguyên văn lỗi mà requestWithdrawalOtp ném ra. */
    private void assertBlockedReasonMatchesValidation(String fragment) {
        jdbc.update("delete from action_otps");
        BadRequestException e = assertThrows(BadRequestException.class, () -> service.requestWithdrawalOtp(owner, 100_000L));
        assertTrue(e.getMessage().contains(fragment), e.getMessage());
        assertEquals(e.getMessage(), service.getLimits(owner).getBlockedReason());
    }

    /** Xin OTP rồi rút (bỏ qua giãn cách gửi lại giữa các lần trong cùng test). */
    private WithdrawalResponse withdrawOk(long amount) {
        jdbc.update("delete from action_otps");
        service.requestWithdrawalOtp(owner, amount);
        return service.withdraw(owner, withdrawReq(amount, lastSmsCode), "ip");
    }

    private static BankAccountOtpRequest bankOtpRequest(String account, String holder) {
        return bankOtp(VCB, account, holder);
    }

    private static BankAccountOtpRequest bankOtp(String bin, String account, String holder) {
        BankAccountOtpRequest r = new BankAccountOtpRequest();
        r.setBankCode(bin);
        r.setBankAccountNumber(account);
        r.setBankAccountHolder(holder);
        return r;
    }

    private static UpdateBankAccountRequest updateBank(String account, String holder, String otp) {
        UpdateBankAccountRequest r = new UpdateBankAccountRequest();
        r.setBankCode(VCB);
        r.setBankAccountNumber(account);
        r.setBankAccountHolder(holder);
        r.setOtpCode(otp);
        return r;
    }

    private static CreateWithdrawalRequest withdrawReq(long amount, String otp) {
        CreateWithdrawalRequest r = new CreateWithdrawalRequest();
        r.setAmount(amount);
        r.setOtpCode(otp);
        return r;
    }

    private static ResolveWithdrawalRequest resolve(String result, String proof) {
        ResolveWithdrawalRequest r = new ResolveWithdrawalRequest();
        r.setResult(result);
        r.setNote("đã đối soát với payOS");
        r.setProofUrl(proof);
        return r;
    }
}

package com.sras.backend.service.impl;

import com.sras.backend.config.ActionOtpProperties;
import com.sras.backend.config.PayoutProperties;
import com.sras.backend.dto.request.BankAccountOtpRequest;
import com.sras.backend.dto.request.CreateWithdrawalRequest;
import com.sras.backend.dto.request.ResolveWithdrawalRequest;
import com.sras.backend.dto.request.UpdateBankAccountRequest;
import com.sras.backend.dto.response.AdminWithdrawalResponse;
import com.sras.backend.dto.response.BankAccountResponse;
import com.sras.backend.dto.response.WithdrawalLimitsResponse;
import com.sras.backend.dto.response.WithdrawalResponse;
import com.sras.backend.entity.AuditLog;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.User;
import com.sras.backend.entity.WalletTransaction;
import com.sras.backend.entity.WithdrawalRequest;
import com.sras.backend.entity.enums.ActionOtpPurpose;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.PayoutMode;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.entity.enums.WalletTxnType;
import com.sras.backend.entity.enums.WalletType;
import com.sras.backend.entity.enums.WithdrawalStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.AuditLogRepository;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.repository.WalletTransactionRepository;
import com.sras.backend.repository.WithdrawalRequestRepository;
import com.sras.backend.service.ActionOtpService;
import com.sras.backend.service.ActionOtpService.OtpCheck;
import com.sras.backend.service.BankDirectory;
import com.sras.backend.service.FinanceService;
import com.sras.backend.service.NotificationService;
import com.sras.backend.service.WithdrawalService;
import com.sras.backend.service.payout.PayoutCommand;
import com.sras.backend.service.payout.PayoutGateway;
import com.sras.backend.service.payout.PayoutResult;
import com.sras.backend.service.payout.PayoutResult.Outcome;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;

/**
 * Rút tiền gara về ngân hàng — TIỀN THẬT, Napas không đảo lệnh được. Các bất biến (database.dbml, withdrawal_requests):
 * <ol>
 *   <li>Idempotency key được COMMIT (TX-1, cùng lúc giữ tiền) TRƯỚC khi gọi cổng.</li>
 *   <li>Lệnh gửi cổng chỉ dựng từ cột snapshot — cấm đọc lại {@code garages}.</li>
 *   <li>Kết quả "chưa rõ" (timeout, 5xx…) KHÔNG sinh dòng ví; chỉ kết quả chắc chắn mới hoàn tiền / chốt.</li>
 *   <li>Mọi thay đổi ví CASH đi qua khoá dòng gara; mọi thay đổi trạng thái lệnh đi qua khoá dòng lệnh.</li>
 * </ol>
 * Số dư rút được = tổng sổ cái CASH — chỉ tiền payOS đã xác nhận mới vào được đây.
 *
 * <p>Class KHÔNG gắn {@code @Transactional}: lời gọi cổng chi phải nằm ngoài transaction, nên ranh giới
 * transaction được vạch tay bằng {@link TransactionTemplate}.
 */
@Slf4j
@Service
public class WithdrawalServiceImpl implements WithdrawalService {

    static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VN_TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private static final Set<WithdrawalStatus> TERMINAL =
            EnumSet.of(WithdrawalStatus.TRANSFERRED, WithdrawalStatus.FAILED, WithdrawalStatus.REJECTED);
    /** Lệnh đã thất bại / bị từ chối không tính vào hạn mức ngày. */
    private static final Set<WithdrawalStatus> NOT_COUNTED = EnumSet.of(WithdrawalStatus.FAILED, WithdrawalStatus.REJECTED);
    private static final List<WithdrawalStatus> IN_FLIGHT = List.of(
            WithdrawalStatus.PAYOUT_SENDING, WithdrawalStatus.PAYOUT_PROCESSING, WithdrawalStatus.PAYOUT_UNCERTAIN);

    private static final Pattern BIN = Pattern.compile("^[0-9]{6}$");
    private static final Pattern ACCOUNT_NUMBER = Pattern.compile("^[0-9]{6,19}$");
    private static final Pattern HOLDER = Pattern.compile("^[A-Z][A-Z ]{1,99}$");
    private static final String REF_TYPE = "WITHDRAWAL";

    private final GarageRepository garageRepository;
    private final WithdrawalRequestRepository withdrawalRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ActionOtpService otpService;
    private final FinanceService financeService;
    private final PayoutGateway gateway;
    private final BankDirectory bankDirectory;
    private final PayoutProperties props;
    private final ActionOtpProperties otpProps;
    private final TransactionTemplate tx;

    private final SecureRandom random = new SecureRandom();
    private final AtomicReference<Instant> lastFundLowAlert = new AtomicReference<>(Instant.EPOCH);

    public WithdrawalServiceImpl(GarageRepository garageRepository,
                                 WithdrawalRequestRepository withdrawalRepository,
                                 WalletTransactionRepository walletTransactionRepository,
                                 AuditLogRepository auditLogRepository,
                                 UserRepository userRepository,
                                 NotificationService notificationService,
                                 ActionOtpService otpService,
                                 FinanceService financeService,
                                 PayoutGateway gateway,
                                 BankDirectory bankDirectory,
                                 PayoutProperties props,
                                 ActionOtpProperties otpProps,
                                 PlatformTransactionManager transactionManager) {
        this.garageRepository = garageRepository;
        this.withdrawalRepository = withdrawalRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.otpService = otpService;
        this.financeService = financeService;
        this.gateway = gateway;
        this.bankDirectory = bankDirectory;
        this.props = props;
        this.otpProps = otpProps;
        this.tx = new TransactionTemplate(transactionManager);
    }

    // ═══════════════════════════════ Tài khoản nhận tiền ═══════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public BankAccountResponse getBankAccount(User owner) {
        return toBankResponse(requireOwnedGarage(owner));
    }

    @Override
    public void requestBankAccountOtp(User owner, BankAccountOtpRequest request) {
        Garage garage = requireOwnedGarage(owner);
        BankInput in = normalizeBank(request.getBankCode(), request.getBankAccountNumber(), request.getBankAccountHolder());
        otpService.send(owner, ActionOtpPurpose.BANK_ACCOUNT_CHANGE, bankPayload(garage.getId(), in),
                "ĐỔI tài khoản nhận tiền sang " + in.bankName() + " " + mask(in.accountNumber()) + " (" + in.holder() + ")");
    }

    @Override
    public BankAccountResponse updateBankAccount(User owner, UpdateBankAccountRequest request, String ipAddress) {
        assertOwnerActive(owner);
        BankInput in = normalizeBank(request.getBankCode(), request.getBankAccountNumber(), request.getBankAccountHolder());
        OtpCheck[] otpFailure = new OtpCheck[1];

        BankAccountResponse response = tx.execute(status -> {
            Garage garage = garageRepository.findWithLockByOwner(owner)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gara của bạn"));
            OtpCheck check = otpService.verifyAndConsume(owner, ActionOtpPurpose.BANK_ACCOUNT_CHANGE,
                    bankPayload(garage.getId(), in), request.getOtpCode());
            if (check != OtpCheck.OK) {
                otpFailure[0] = check;
                return null; // commit để lưu số lần nhập sai
            }

            boolean hadBank = hasCompleteBank(garage);
            boolean changed = !in.bin().equals(garage.getBankCode())
                    || !in.accountNumber().equals(garage.getBankAccountNumber())
                    || !in.holder().equals(garage.getBankAccountHolder());
            if (changed) {
                String before = describeBank(garage);
                garage.setBankCode(in.bin());
                garage.setBankName(in.bankName());
                garage.setBankAccountNumber(in.accountNumber());
                garage.setBankAccountHolder(in.holder());
                if (hadBank) {
                    garage.setBankWithdrawLockedUntil(OffsetDateTime.now().plusHours(props.getBankChangeLockHours()));
                }
                garageRepository.save(garage);
                audit(owner, "CHANGE_BANK_ACCOUNT", "garages", garage.getId(), before, describeBank(garage), ipAddress);

                String lockNote = garage.getBankWithdrawLockedUntil() != null && hadBank
                        ? " Để bảo vệ bạn, chức năng rút tiền tạm khoá đến " + formatVnTime(garage.getBankWithdrawLockedUntil()) + "."
                        : "";
                notificationService.createNotification(owner, NotificationType.SYSTEM_WARNING,
                        "Tài khoản nhận tiền đã được cập nhật",
                        "Tài khoản nhận tiền của gara đã đổi sang " + in.bankName() + " " + mask(in.accountNumber())
                                + " (" + in.holder() + ")." + lockNote
                                + " Nếu không phải bạn thực hiện, hãy đổi mật khẩu và liên hệ SRAS ngay.",
                        "GARAGE", garage.getId());
            }
            return toBankResponse(garage);
        });
        if (otpFailure[0] != null) throw new BadRequestException(ActionOtpService.message(otpFailure[0]));
        return response;
    }

    // ═══════════════════════════════════ Rút tiền ═══════════════════════════════════

    @Override
    public WithdrawalLimitsResponse getLimits(User owner) {
        Garage garage = requireOwnedGarage(owner);
        TodayUsage usage = todayUsage(garage.getId(), startOfTodayVn());
        long remainingRequests = Math.max(0, props.getMaxRequestsPerDay() - usage.count());
        Long credit = financeService.getGarageWalletOverview(owner).getCreditBalance();

        // Cùng thứ tự với validateWithdrawal, chỉ lấy các điều kiện không phụ thuộc số tiền.
        String blocked = blockBeforeAmount(garage);
        if (blocked == null && remainingRequests == 0) blocked = requestsPerDayMessage(usage.count());
        if (blocked == null) blocked = creditBlock(credit);

        return WithdrawalLimitsResponse.builder()
                .enabled(props.isEnabled())
                .blockedReason(blocked)
                .minAmount(props.getMinAmount())
                .maxAmountPerRequest(props.getMaxAmountPerRequest())
                .maxAmountPerDay(props.getMaxAmountPerDay())
                .maxRequestsPerDay(props.getMaxRequestsPerDay())
                .remainingAmountToday(Math.max(0, props.getMaxAmountPerDay() - usage.sum()))
                .remainingRequestsToday(remainingRequests)
                .withdrawableBalance(ledgerCash(garage.getId()))
                .creditBalance(credit)
                .otpTtlMinutes(otpProps.getTtlMinutes())
                .otpResendCooldownSeconds(otpProps.getResendCooldownSeconds())
                .build();
    }

    @Override
    public void requestWithdrawalOtp(User owner, Long amount) {
        Garage garage = requireOwnedGarage(owner);
        validateWithdrawal(owner, garage, amount);
        otpService.send(owner, ActionOtpPurpose.WITHDRAWAL, withdrawalPayload(garage, amount),
                "RÚT " + formatVnd(amount) + " về " + garage.getBankName() + " " + mask(garage.getBankAccountNumber()));
    }

    @Override
    public WithdrawalResponse withdraw(User owner, CreateWithdrawalRequest request, String ipAddress) {
        assertOwnerActive(owner);
        long amount = request.getAmount();

        // (0) Tài khoản chi của nền tảng phải đủ tiền — thiếu thì từ chối luôn, KHÔNG giữ tiền của gara.
        Long fund = gateway.balance();
        if (fund != null && fund < amount) {
            alertFundLow(fund);
            throw new BadRequestException("Hệ thống chi trả đang tạm gián đoạn, vui lòng thử lại sau ít phút");
        }
        if (fund != null && fund - amount < props.getFundLowThreshold()) {
            alertFundLow(fund - amount);
        }

        // (1) TX-1: khoá gara → kiểm tra lại toàn bộ → tiêu OTP → tạo lệnh + giữ tiền + COMMIT idempotency key.
        OtpCheck[] otpFailure = new OtpCheck[1];
        Created created = tx.execute(status -> {
            Garage garage = garageRepository.findWithLockByOwner(owner)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gara của bạn"));
            validateWithdrawal(owner, garage, amount);

            // Payload dựng từ STK HIỆN TẠI: vừa đổi STK thì OTP cũ tự mất hiệu lực.
            OtpCheck check = otpService.verifyAndConsume(owner, ActionOtpPurpose.WITHDRAWAL,
                    withdrawalPayload(garage, amount), request.getOtpCode());
            if (check != OtpCheck.OK) {
                otpFailure[0] = check;
                return null;
            }

            WithdrawalRequest w = new WithdrawalRequest();
            w.setGarage(garage);
            w.setAmount(amount);
            w.setStatus(WithdrawalStatus.PAYOUT_SENDING);
            w.setPayoutMode(PayoutMode.AUTO);
            w.setPayoutProvider(gateway.provider());
            w.setIdempotencyKey(java.util.UUID.randomUUID().toString());
            w.setTransferCode(placeholderTransferCode());
            w.setBankBinSnapshot(garage.getBankCode());
            w.setBankAccountNumberSnapshot(garage.getBankAccountNumber());
            w.setBankAccountHolderSnapshot(garage.getBankAccountHolder());
            w.setBankSnapshot(describeBank(garage));
            withdrawalRepository.saveAndFlush(w);
            w.setTransferCode("RUT" + w.getId());

            long cash = ledgerCash(garage.getId());
            long after = cash - amount;
            writeLedger(garage, WalletTxnType.WITHDRAWAL_HOLD, -amount, after, w.getId(), owner,
                    "Rút " + formatVnd(amount) + " về " + garage.getBankName() + " " + mask(garage.getBankAccountNumber())
                            + " (" + w.getTransferCode() + ")");
            garage.setCashBalance(after);
            garageRepository.save(garage);

            audit(owner, "CREATE_WITHDRAWAL", "withdrawal_requests", w.getId(), null,
                    w.getTransferCode() + " · " + amount + " · " + w.getBankSnapshot(), ipAddress);
            return new Created(w.getId(), commandOf(w));
        });
        if (otpFailure[0] != null) throw new BadRequestException(ActionOtpService.message(otpFailure[0]));

        log.info("Tạo lệnh rút id={} ref={} amount={} → gửi cổng {}", created.id(), created.command().referenceId(),
                amount, gateway.provider());

        // (2) Gọi cổng NGOÀI transaction. (3) Chốt kết quả trong TX-2.
        PayoutResult result = confirmRejection(gateway.create(created.command()), created.command().referenceId());
        applyResult(created.id(), result);

        return tx.execute(status -> toResponse(withdrawalRepository.findById(created.id()).orElseThrow()));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WithdrawalResponse> getMyWithdrawals(User owner, int page, int size) {
        Garage garage = requireOwnedGarage(owner);
        return withdrawalRepository
                .findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(garage, PageRequest.of(Math.max(page, 0), clampSize(size)))
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public WithdrawalResponse getMyWithdrawal(User owner, Long withdrawalId) {
        Garage garage = requireOwnedGarage(owner);
        // Lệnh của gara khác ⇒ 404, không tiết lộ là lệnh có tồn tại.
        return withdrawalRepository.findByIdAndGarageAndIsDeletedFalse(withdrawalId, garage)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lệnh rút tiền"));
    }

    // ═══════════════════════════════════ Đối soát ═══════════════════════════════════

    @Override
    public List<Long> findIdsToReconcile() {
        return withdrawalRepository.findIdsByPayoutModeAndStatusIn(PayoutMode.AUTO, IN_FLIGHT);
    }

    @Override
    public void reconcile(Long withdrawalId) {
        Snapshot s = tx.execute(status -> withdrawalRepository.findById(withdrawalId).map(Snapshot::of).orElse(null));
        if (s == null || TERMINAL.contains(s.status())) return;

        OffsetDateTime now = OffsetDateTime.now();
        PayoutResult result;
        switch (s.status()) {
            case PAYOUT_SENDING -> {
                // Lệnh còn mới: luồng chính có thể vẫn đang chờ cổng trả lời.
                if (s.createdAt().isAfter(now.minusSeconds(props.getSendingStaleSeconds()))) return;
                PayoutResult found = gateway.findByReference(s.command().referenceId());
                if (found.outcome() == Outcome.NOT_FOUND) {
                    // Server sập trước/trong lúc gửi: gửi lại với ĐÚNG idempotency key cũ — cổng không chi 2 lần.
                    log.warn("Lệnh rút id={} kẹt PAYOUT_SENDING và cổng chưa có — gửi lại với cùng idempotency key", withdrawalId);
                    found = confirmRejection(gateway.create(s.command()), s.command().referenceId());
                }
                result = found;
            }
            case PAYOUT_PROCESSING -> {
                result = s.providerPayoutId() != null
                        ? gateway.get(s.providerPayoutId())
                        : gateway.findByReference(s.command().referenceId());
                if (result.outcome() == Outcome.NOT_FOUND) result = PayoutResult.unknown("NOT_FOUND", null);
            }
            case PAYOUT_UNCERTAIN -> {
                // Không gửi lại: timeout có thể là tiền đã đi. Chỉ tra cứu; vẫn không thấy thì chờ / cắm cờ cho admin.
                result = gateway.findByReference(s.command().referenceId());
                if (result.outcome() == Outcome.NOT_FOUND) result = null;
            }
            default -> {
                return;
            }
        }

        PayoutResult finalResult = result;
        tx.executeWithoutResult(status -> {
            WithdrawalRequest w = withdrawalRepository.findWithLockById(withdrawalId).orElseThrow();
            if (TERMINAL.contains(w.getStatus()) && finalResult == null) return;
            w.setPayoutAttemptCount((short) Math.min(Short.MAX_VALUE, w.getPayoutAttemptCount() + 1));
            if (finalResult != null) applyLocked(w, finalResult);
            flagIfStuck(w);
        });
    }

    // ═══════════════════════════════════ Admin ═══════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public Page<AdminWithdrawalResponse> adminList(WithdrawalStatus status, Boolean needsReview, int page, int size) {
        return withdrawalRepository.searchForAdmin(status, needsReview, PageRequest.of(Math.max(page, 0), clampSize(size)))
                .map(this::toAdminResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminWithdrawalResponse adminGet(Long withdrawalId) {
        return withdrawalRepository.findById(withdrawalId).map(this::toAdminResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lệnh rút tiền"));
    }

    @Override
    public AdminWithdrawalResponse adminSync(Long withdrawalId) {
        adminView(withdrawalId); // 404 nếu không có
        reconcile(withdrawalId);
        return adminView(withdrawalId);
    }

    /** Đọc lệnh cho admin trong transaction riêng — gọi nội bộ không đi qua proxy @Transactional. */
    private AdminWithdrawalResponse adminView(Long withdrawalId) {
        return tx.execute(status -> withdrawalRepository.findById(withdrawalId).map(this::toAdminResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lệnh rút tiền")));
    }

    @Override
    public AdminWithdrawalResponse adminResolve(User admin, Long withdrawalId, ResolveWithdrawalRequest request, String ipAddress) {
        Snapshot s = tx.execute(status -> withdrawalRepository.findById(withdrawalId).map(Snapshot::of).orElse(null));
        if (s == null) throw new ResourceNotFoundException("Không tìm thấy lệnh rút tiền");
        String choice = request.getResult();

        if ("ACKNOWLEDGE".equals(choice)) {
            if (!TERMINAL.contains(s.status()) || !s.needsManualReview()) {
                throw new BadRequestException("Chỉ xác nhận đã kiểm tra được với lệnh đã chốt và đang bị cắm cờ");
            }
            tx.executeWithoutResult(status -> {
                WithdrawalRequest w = withdrawalRepository.findWithLockById(withdrawalId).orElseThrow();
                markReviewed(w, admin, request);
                audit(admin, "RESOLVE_WITHDRAWAL", "withdrawal_requests", w.getId(), w.getStatus().name(),
                        "ACKNOWLEDGE · " + request.getNote(), ipAddress);
            });
            return adminView(withdrawalId);
        }

        if (TERMINAL.contains(s.status())) {
            throw new BadRequestException("Lệnh đã chốt " + s.status() + ", không thể đổi kết quả");
        }
        if (s.status() != WithdrawalStatus.PAYOUT_UNCERTAIN && !s.needsManualReview()) {
            throw new BadRequestException("Lệnh vẫn đang được hệ thống tự đối soát, chưa cần xử lý tay");
        }

        // Luôn hỏi lại cổng trước — không bao giờ để admin hoàn tiền một lệnh mà tiền thực ra đã đi.
        PayoutResult fresh = s.providerPayoutId() != null
                ? gateway.get(s.providerPayoutId())
                : gateway.findByReference(s.command().referenceId());

        switch (fresh.outcome()) {
            case SUCCEEDED, FAILED -> {
                applyResult(withdrawalId, fresh);
                String actual = fresh.outcome() == Outcome.SUCCEEDED ? "TRANSFERRED" : "FAILED";
                tx.executeWithoutResult(status -> {
                    WithdrawalRequest w = withdrawalRepository.findWithLockById(withdrawalId).orElseThrow();
                    markReviewed(w, admin, request);
                    audit(admin, "RESOLVE_WITHDRAWAL", "withdrawal_requests", w.getId(), s.status().name(),
                            actual + " (theo cổng chi) · " + request.getNote(), ipAddress);
                });
                if (!actual.equals(choice)) {
                    throw new BadRequestException("Cổng chi báo lệnh này " + actual + " — hệ thống đã áp kết quả của cổng, "
                            + "không áp lựa chọn " + choice);
                }
                return adminView(withdrawalId);
            }
            case PROCESSING -> throw new BadRequestException("Cổng chi báo lệnh vẫn đang xử lý, vui lòng chờ thêm");
            case REVERSED -> throw new BadRequestException("Cổng chi báo lệnh bị đảo (REVERSED) — cần đối soát với payOS trước khi xử lý");
            case NOT_FOUND -> {
                // Cổng KHÔNG có lệnh (đã kiểm chữ ký response) ⇒ admin mới được tự chọn.
                if ("TRANSFERRED".equals(choice) && (request.getProofUrl() == null || request.getProofUrl().isBlank())) {
                    throw new BadRequestException("Đánh dấu đã chuyển thủ công bắt buộc kèm ảnh biên lai");
                }
                tx.executeWithoutResult(status -> {
                    WithdrawalRequest w = withdrawalRepository.findWithLockById(withdrawalId).orElseThrow();
                    if (TERMINAL.contains(w.getStatus())) {
                        throw new BadRequestException("Lệnh vừa được chốt bởi tiến trình khác, vui lòng tải lại");
                    }
                    if ("TRANSFERRED".equals(choice)) {
                        w.setTransferProofUrl(request.getProofUrl().trim());
                        markTransferred(w, null);
                    } else {
                        markFailed(w, "MANUAL_RESOLVE");
                    }
                    markReviewed(w, admin, request);
                    audit(admin, "RESOLVE_WITHDRAWAL", "withdrawal_requests", w.getId(), s.status().name(),
                            choice + " (thủ công, cổng không có lệnh) · " + request.getNote(), ipAddress);
                });
                return adminView(withdrawalId);
            }
            default -> throw new BadRequestException("Không tra được trạng thái từ cổng chi, vui lòng thử lại sau");
        }
    }

    @Override
    public Long payoutBalance() {
        return gateway.balance();
    }

    // ═══════════════════════════════ Chốt kết quả ═══════════════════════════════

    /**
     * Cổng từ chối request ⇒ CHƯA được kết luận "chưa chi": tra lại theo referenceId (response có chữ ký).
     * Không thấy ⇒ thất bại thật; tra không được ⇒ chưa rõ.
     */
    private PayoutResult confirmRejection(PayoutResult result, String referenceId) {
        if (result.outcome() != Outcome.REQUEST_REJECTED) return result;
        PayoutResult lookup = gateway.findByReference(referenceId);
        return switch (lookup.outcome()) {
            case NOT_FOUND -> new PayoutResult(Outcome.FAILED, null, "REQUEST_REJECTED",
                    result.errorCode(), result.errorMessage(), null);
            case UNKNOWN, REQUEST_REJECTED -> PayoutResult.unknown(result.errorCode(), result.errorMessage());
            default -> lookup;
        };
    }

    private void applyResult(Long withdrawalId, PayoutResult result) {
        tx.executeWithoutResult(status -> {
            WithdrawalRequest w = withdrawalRepository.findWithLockById(withdrawalId).orElseThrow();
            applyLocked(w, result);
        });
    }

    /** Gọi khi đã giữ khoá dòng lệnh. Lệnh đã chốt thì không đụng tới tiền nữa (chống hoàn 2 lần). */
    private void applyLocked(WithdrawalRequest w, PayoutResult r) {
        if (r.providerPayoutId() != null && w.getProviderPayoutId() == null) {
            w.setProviderPayoutId(truncate(r.providerPayoutId(), 64));
        }
        if (r.errorCode() != null) w.setPayoutErrorCode(truncate(r.errorCode(), 50));
        if (r.errorMessage() != null) w.setPayoutErrorMessage(truncate(r.errorMessage(), 500));
        if (w.getPayoutSentAt() == null) w.setPayoutSentAt(OffsetDateTime.now());

        if (TERMINAL.contains(w.getStatus())) {
            if (w.getStatus() == WithdrawalStatus.TRANSFERRED && r.outcome() == Outcome.REVERSED) {
                flagForReview(w, "Lệnh đã chi bị ngân hàng đảo (REVERSED) — cần đối soát với payOS");
            }
            return;
        }

        switch (r.outcome()) {
            case SUCCEEDED -> markTransferred(w, r.toAccountName());
            case FAILED -> markFailed(w, r.errorCode());
            case PROCESSING -> w.setStatus(WithdrawalStatus.PAYOUT_PROCESSING);
            case REVERSED -> flagForReview(w, "Cổng báo lệnh bị đảo (REVERSED) trước khi hệ thống chốt");
            case UNKNOWN -> {
                if (w.getStatus() == WithdrawalStatus.PAYOUT_SENDING) w.setStatus(WithdrawalStatus.PAYOUT_UNCERTAIN);
            }
            default -> {
                // NOT_FOUND / REQUEST_REJECTED đã được quy đổi ở nơi gọi.
            }
        }
    }

    private void markTransferred(WithdrawalRequest w, String toAccountName) {
        w.setStatus(WithdrawalStatus.TRANSFERRED);
        w.setPayoutSettledAt(OffsetDateTime.now());
        Garage garage = w.getGarage();
        writeLedger(garage, WalletTxnType.WITHDRAWAL_DONE, 0L, ledgerCash(garage.getId()), w.getId(), null,
                "Đã chuyển " + formatVnd(w.getAmount()) + " về ngân hàng (" + w.getTransferCode() + ")");

        if (toAccountName != null && w.getBankAccountHolderSnapshot() != null
                && !normalizeName(toAccountName).equals(normalizeName(w.getBankAccountHolderSnapshot()))) {
            flagForReview(w, "Tên chủ TK ngân hàng trả về khác tên gara khai báo");
        }
        notifyOwner(garage, NotificationType.WITHDRAWAL_TRANSFERRED, "Rút tiền thành công",
                "Đã chuyển " + formatVnd(w.getAmount()) + " về " + w.getBankSnapshot() + " (" + w.getTransferCode() + ").",
                w.getId());
    }

    private void markFailed(WithdrawalRequest w, String errorCode) {
        Garage garage = garageRepository.findWithLockById(w.getGarage().getId()).orElseThrow();
        long after = ledgerCash(garage.getId()) + w.getAmount();
        w.setStatus(WithdrawalStatus.FAILED);
        w.setPayoutSettledAt(OffsetDateTime.now());
        writeLedger(garage, WalletTxnType.WITHDRAWAL_REFUND, w.getAmount(), after, w.getId(), null,
                "Hoàn " + formatVnd(w.getAmount()) + " do lệnh rút " + w.getTransferCode() + " không thành công");
        garage.setCashBalance(after);
        garageRepository.save(garage);
        log.warn("Lệnh rút id={} thất bại (code={}) — đã hoàn {} vào ví tiền mặt", w.getId(), errorCode, w.getAmount());
        notifyOwner(garage, NotificationType.WITHDRAWAL_FAILED, "Rút tiền không thành công",
                "Lệnh rút " + w.getTransferCode() + " không thành công. " + formatVnd(w.getAmount())
                        + " đã được hoàn vào ví tiền mặt. Vui lòng kiểm tra lại tài khoản nhận tiền.",
                w.getId());
    }

    private void flagIfStuck(WithdrawalRequest w) {
        if (TERMINAL.contains(w.getStatus()) || Boolean.TRUE.equals(w.getNeedsManualReview())) return;
        long ageMinutes = ChronoUnit.MINUTES.between(w.getCreatedAt(), OffsetDateTime.now());
        if (w.getStatus() == WithdrawalStatus.PAYOUT_UNCERTAIN && ageMinutes >= props.getUncertainReviewAfterMinutes()) {
            flagForReview(w, "Không xác định được kết quả chi sau " + ageMinutes + " phút");
        } else if (ageMinutes >= props.getManualReviewAfterMinutes()) {
            flagForReview(w, "Lệnh chưa có kết quả sau " + ageMinutes + " phút (" + w.getStatus() + ")");
        }
    }

    private void flagForReview(WithdrawalRequest w, String reason) {
        if (Boolean.TRUE.equals(w.getNeedsManualReview())) return;
        w.setNeedsManualReview(true);
        log.warn("Lệnh rút id={} cần admin kiểm tra: {}", w.getId(), reason);
        for (User admin : userRepository.findByRole(UserRole.ADMIN)) {
            notificationService.createNotification(admin, NotificationType.SYSTEM_WARNING,
                    "Lệnh rút tiền cần kiểm tra", w.getTransferCode() + " · " + formatVnd(w.getAmount()) + ": " + reason,
                    REF_TYPE, w.getId());
        }
    }

    private void markReviewed(WithdrawalRequest w, User admin, ResolveWithdrawalRequest request) {
        w.setNeedsManualReview(false);
        w.setReviewedByUser(admin);
        w.setReviewedAt(OffsetDateTime.now());
        w.setRejectReason(truncate(request.getNote().trim(), 500));
    }

    // ═══════════════════════════════ Kiểm tra ═══════════════════════════════

    /** Toàn bộ điều kiện rút — chạy lúc xin OTP và chạy LẠI dưới khoá dòng gara lúc tạo lệnh. */
    private void validateWithdrawal(User owner, Garage garage, Long amount) {
        String blocked = blockBeforeAmount(garage);
        if (blocked != null) throw new BadRequestException(blocked);
        if (amount == null || amount < props.getMinAmount()) {
            throw new BadRequestException("Số tiền rút tối thiểu là " + formatVnd(props.getMinAmount()));
        }
        if (amount > props.getMaxAmountPerRequest()) {
            throw new BadRequestException("Mỗi lệnh rút tối đa " + formatVnd(props.getMaxAmountPerRequest()));
        }

        OffsetDateTime dayStart = startOfTodayVn();
        TodayUsage usage = todayUsage(garage.getId(), dayStart);
        if (usage.count() >= props.getMaxRequestsPerDay()) {
            throw new BadRequestException(requestsPerDayMessage(usage.count()));
        }
        if (usage.sum() + amount > props.getMaxAmountPerDay()) {
            throw new BadRequestException("Vượt hạn mức rút trong ngày. Hôm nay bạn còn rút được tối đa "
                    + formatVnd(Math.max(0, props.getMaxAmountPerDay() - usage.sum())));
        }
        long systemToday = withdrawalRepository.sumAmountSince(dayStart, NOT_COUNTED);
        if (systemToday + amount > props.getSystemMaxAmountPerDay()) {
            log.error("Chạm trần chi toàn hệ thống trong ngày: đã chi {} + yêu cầu {} > {}", systemToday, amount,
                    props.getSystemMaxAmountPerDay());
            throw new BadRequestException("Hệ thống chi trả đã đạt hạn mức trong ngày, vui lòng thử lại vào ngày mai");
        }

        long cash = ledgerCash(garage.getId());
        if (cash < amount) {
            throw new BadRequestException("Số dư có thể rút (" + formatVnd(cash) + ") không đủ để rút " + formatVnd(amount));
        }
        String creditBlocked = creditBlock(financeService.getGarageWalletOverview(owner).getCreditBalance());
        if (creditBlocked != null) throw new BadRequestException(creditBlocked);
    }

    /** 4 điều kiện chặn đầu tiên, không phụ thuộc số tiền: bật/tắt, gara APPROVED, đủ STK, khoá sau đổi STK. */
    private String blockBeforeAmount(Garage garage) {
        if (!props.isEnabled()) {
            return "Chức năng rút tiền đang tạm dừng để bảo trì, vui lòng thử lại sau";
        }
        if (garage.getStatus() != GarageStatus.APPROVED || Boolean.TRUE.equals(garage.getIsDeleted())) {
            return "Gara chưa được duyệt hoặc đang bị tạm ngưng nên chưa thể rút tiền";
        }
        if (!hasCompleteBank(garage)) {
            return "Vui lòng khai báo tài khoản ngân hàng nhận tiền trước khi rút";
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (garage.getBankWithdrawLockedUntil() != null && now.isBefore(garage.getBankWithdrawLockedUntil())) {
            return "Tài khoản nhận tiền vừa được thay đổi. Để bảo vệ bạn, chức năng rút tiền tạm khoá đến "
                    + formatVnTime(garage.getBankWithdrawLockedUntil());
        }
        return null;
    }

    /** Số lệnh và tổng tiền đã rút hôm nay (giờ VN), không tính lệnh FAILED / REJECTED. */
    private record TodayUsage(long count, long sum) {}

    private TodayUsage todayUsage(Long garageId, OffsetDateTime dayStart) {
        long count = withdrawalRepository.countByGarageSince(garageId, dayStart, NOT_COUNTED);
        long sum = withdrawalRepository.sumAmountByGarageSince(garageId, dayStart, NOT_COUNTED);
        return new TodayUsage(count, sum);
    }

    private static OffsetDateTime startOfTodayVn() {
        return LocalDate.now(VN_ZONE).atStartOfDay(VN_ZONE).toOffsetDateTime();
    }

    private String requestsPerDayMessage(long countToday) {
        return "Bạn đã rút " + countToday + " lần hôm nay, đạt giới hạn " + props.getMaxRequestsPerDay() + " lệnh/ngày";
    }

    /** Ví tín dụng âm (nợ hoa hồng) ⇒ chưa được rút. */
    private static String creditBlock(Long credit) {
        if (credit != null && credit < 0) {
            return "Ví tín dụng đang âm " + formatVnd(-credit)
                    + " (nợ hoa hồng). Vui lòng chuyển tiền sang ví tín dụng trước khi rút";
        }
        return null;
    }

    private Garage requireOwnedGarage(User owner) {
        assertOwnerActive(owner);
        return garageRepository.findByOwner(owner)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gara của bạn"));
    }

    private static void assertOwnerActive(User owner) {
        if (owner == null || owner.getRole() != UserRole.GARAGE_OWNER) {
            throw new AccessDeniedException("Chỉ chủ gara mới được thực hiện thao tác này");
        }
        if (owner.getStatus() != UserStatus.ACTIVE) {
            throw new AccessDeniedException("Tài khoản của bạn đang bị khoá");
        }
    }

    private record BankInput(String bin, String bankName, String accountNumber, String holder) {}

    private BankInput normalizeBank(String bankCode, String accountNumber, String holder) {
        String bin = bankCode == null ? "" : bankCode.trim();
        if (!BIN.matcher(bin).matches()) throw new BadRequestException("Mã ngân hàng không hợp lệ");
        BankDirectory.Bank bank = bankDirectory.findByBin(bin)
                .orElseThrow(() -> new BadRequestException("Ngân hàng không nằm trong danh sách hỗ trợ"));
        String acc = accountNumber == null ? "" : accountNumber.replaceAll("[\\s.-]", "");
        if (!ACCOUNT_NUMBER.matcher(acc).matches()) {
            throw new BadRequestException("Số tài khoản chỉ gồm chữ số, dài từ 6 đến 19 số");
        }
        String name = normalizeName(holder);
        if (!HOLDER.matcher(name).matches()) {
            throw new BadRequestException("Tên chủ tài khoản chỉ gồm chữ cái không dấu, đúng như trên thẻ ngân hàng");
        }
        return new BankInput(bin, bank.shortName(), acc, name);
    }

    /** Viết hoa, bỏ dấu tiếng Việt, gộp khoảng trắng — giống cách ngân hàng in tên chủ thẻ. */
    static String normalizeName(String raw) {
        if (raw == null) return "";
        String s = raw.replace('đ', 'd').replace('Đ', 'D');
        s = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return s.toUpperCase().replaceAll("\\s+", " ").trim();
    }

    // ═══════════════════════════════ Tiện ích ═══════════════════════════════

    private record Created(Long id, PayoutCommand command) {}

    /** Bản đọc của một lệnh để gọi cổng ngoài transaction. */
    private record Snapshot(Long id, WithdrawalStatus status, OffsetDateTime createdAt, String providerPayoutId,
                            boolean needsManualReview, PayoutCommand command) {
        static Snapshot of(WithdrawalRequest w) {
            return new Snapshot(w.getId(), w.getStatus(), w.getCreatedAt(), w.getProviderPayoutId(),
                    Boolean.TRUE.equals(w.getNeedsManualReview()), commandOf(w));
        }
    }

    /** Lệnh gửi cổng — CHỈ từ cột snapshot. */
    private static PayoutCommand commandOf(WithdrawalRequest w) {
        return new PayoutCommand(w.getIdempotencyKey(), w.getAmount(), "SRAS " + w.getTransferCode(),
                w.getBankBinSnapshot(), w.getBankAccountNumberSnapshot());
    }

    private long ledgerCash(Long garageId) {
        Long sum = walletTransactionRepository.sumAmountByGarageIdAndWalletType(garageId, WalletType.CASH);
        return sum != null ? sum : 0L;
    }

    private void writeLedger(Garage garage, WalletTxnType type, long amount, long balanceAfter, Long withdrawalId,
                             User actor, String description) {
        WalletTransaction t = new WalletTransaction();
        t.setGarage(garage);
        t.setWalletType(WalletType.CASH);
        t.setType(type);
        t.setAmount(amount);
        t.setBalanceAfter(balanceAfter);
        t.setRefType(REF_TYPE);
        t.setRefId(withdrawalId);
        t.setDescription(truncate(description, 255));
        t.setCreatedByUser(actor);
        walletTransactionRepository.save(t);
    }

    private void audit(User actor, String action, String entityType, Long entityId, String before, String after, String ip) {
        AuditLog entry = new AuditLog();
        entry.setActorUser(actor);
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setBeforeValue(before);
        entry.setAfterValue(after);
        entry.setIpAddress(truncate(ip, 45));
        auditLogRepository.save(entry);
    }

    private void notifyOwner(Garage garage, NotificationType type, String title, String body, Long withdrawalId) {
        User owner = garage.getOwner();
        if (owner != null) notificationService.createNotification(owner, type, title, body, REF_TYPE, withdrawalId);
    }

    /** Cảnh báo admin số dư tài khoản chi thấp — tối đa 1 lần/giờ. */
    private void alertFundLow(long balance) {
        Instant now = Instant.now();
        Instant last = lastFundLowAlert.get();
        if (now.isBefore(last.plus(1, ChronoUnit.HOURS)) || !lastFundLowAlert.compareAndSet(last, now)) return;
        log.error("Số dư tài khoản chi payOS thấp: {}", balance);
        for (User admin : userRepository.findByRole(UserRole.ADMIN)) {
            notificationService.createNotification(admin, NotificationType.PAYOUT_FUND_LOW,
                    "Số dư tài khoản chi sắp hết",
                    "Tài khoản chi payOS còn khoảng " + formatVnd(balance) + ". Vui lòng nạp thêm để gara rút tiền không bị gián đoạn.",
                    "PAYOUT", null);
        }
    }

    private static boolean hasCompleteBank(Garage g) {
        return notBlank(g.getBankCode()) && notBlank(g.getBankAccountNumber()) && notBlank(g.getBankAccountHolder());
    }

    private String describeBank(Garage g) {
        if (!hasCompleteBank(g)) return null;
        String bankName = notBlank(g.getBankName()) ? g.getBankName()
                : bankDirectory.findByBin(g.getBankCode()).map(BankDirectory.Bank::shortName).orElse(g.getBankCode());
        return bankName + " · " + mask(g.getBankAccountNumber()) + " · " + g.getBankAccountHolder();
    }

    private BankAccountResponse toBankResponse(Garage g) {
        return BankAccountResponse.builder()
                .bankCode(g.getBankCode())
                .bankName(g.getBankName())
                .accountNumberMasked(g.getBankAccountNumber() != null ? mask(g.getBankAccountNumber()) : null)
                .bankAccountHolder(g.getBankAccountHolder())
                .complete(hasCompleteBank(g))
                .withdrawLockedUntil(g.getBankWithdrawLockedUntil() != null
                        && g.getBankWithdrawLockedUntil().isAfter(OffsetDateTime.now()) ? g.getBankWithdrawLockedUntil() : null)
                .build();
    }

    private WithdrawalResponse toResponse(WithdrawalRequest w) {
        String display = switch (w.getStatus()) {
            case TRANSFERRED -> "SUCCESS";
            case FAILED, REJECTED -> "FAILED";
            default -> "PROCESSING";
        };
        String failure = w.getStatus() == WithdrawalStatus.FAILED
                ? "Ngân hàng không nhận lệnh chuyển. Tiền đã được hoàn vào ví tiền mặt, vui lòng kiểm tra lại tài khoản nhận tiền."
                : null;
        return WithdrawalResponse.builder()
                .id(w.getId())
                .transferCode(w.getTransferCode())
                .amount(w.getAmount())
                .status(w.getStatus().name())
                .displayStatus(display)
                .bankSnapshot(w.getBankSnapshot())
                .createdAt(w.getCreatedAt())
                .payoutSettledAt(w.getPayoutSettledAt())
                .failureMessage(failure)
                .build();
    }

    private AdminWithdrawalResponse toAdminResponse(WithdrawalRequest w) {
        Garage g = w.getGarage();
        return AdminWithdrawalResponse.builder()
                .id(w.getId())
                .transferCode(w.getTransferCode())
                .garageId(g != null ? g.getId() : null)
                .garageName(g != null ? g.getName() : null)
                .amount(w.getAmount())
                .status(w.getStatus().name())
                .payoutMode(w.getPayoutMode() != null ? w.getPayoutMode().name() : null)
                .payoutProvider(w.getPayoutProvider() != null ? w.getPayoutProvider().name() : null)
                .providerPayoutId(w.getProviderPayoutId())
                .idempotencyKey(w.getIdempotencyKey())
                .bankSnapshot(w.getBankSnapshot())
                .bankBinSnapshot(w.getBankBinSnapshot())
                .bankAccountNumberSnapshot(w.getBankAccountNumberSnapshot())
                .bankAccountHolderSnapshot(w.getBankAccountHolderSnapshot())
                .payoutAttemptCount(w.getPayoutAttemptCount())
                .payoutErrorCode(w.getPayoutErrorCode())
                .payoutErrorMessage(w.getPayoutErrorMessage())
                .needsManualReview(w.getNeedsManualReview())
                .reviewedByName(w.getReviewedByUser() != null ? w.getReviewedByUser().getFullName() : null)
                .reviewedAt(w.getReviewedAt())
                .reviewNote(w.getRejectReason())
                .transferProofUrl(w.getTransferProofUrl())
                .createdAt(w.getCreatedAt())
                .payoutSentAt(w.getPayoutSentAt())
                .payoutSettledAt(w.getPayoutSettledAt())
                .build();
    }

    private static String bankPayload(Long garageId, BankInput in) {
        return "BANK|" + garageId + "|" + in.bin() + "|" + in.accountNumber() + "|" + in.holder();
    }

    private static String withdrawalPayload(Garage g, Long amount) {
        return "WITHDRAWAL|" + g.getId() + "|" + amount + "|" + g.getBankCode() + "|" + g.getBankAccountNumber()
                + "|" + g.getBankAccountHolder();
    }

    /** Mã tạm duy nhất — cột NOT NULL UNIQUE, được thay bằng {@code RUT<id>} ngay trong cùng transaction. */
    private String placeholderTransferCode() {
        return "TMP" + Long.toString(Math.abs(random.nextLong()), 36);
    }

    static String mask(String accountNumber) {
        if (accountNumber == null || accountNumber.length() <= 4) return "****";
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }

    private static String formatVnd(long amount) {
        return String.format("%,dđ", amount).replace(',', '.');
    }

    private static String formatVnTime(OffsetDateTime t) {
        return t.atZoneSameInstant(VN_ZONE).format(VN_TIME);
    }

    private static int clampSize(int size) {
        return Math.min(Math.max(size, 1), 50);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}

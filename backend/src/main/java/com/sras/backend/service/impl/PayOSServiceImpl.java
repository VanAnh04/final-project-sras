package com.sras.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.dto.response.CreatePayOSPaymentResponse;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.dto.response.StaffWalletResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.Payment;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueStatusHistory;
import com.sras.backend.entity.SystemWallet;
import com.sras.backend.entity.User;
import com.sras.backend.entity.WalletTransaction;
import com.sras.backend.entity.enums.ActorType;
import com.sras.backend.entity.enums.PaymentMethod;
import com.sras.backend.entity.enums.PaymentStatus;
import com.sras.backend.entity.enums.PaymentType;
import com.sras.backend.entity.enums.RequestPaymentMethod;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.WalletTxnType;
import com.sras.backend.entity.enums.WalletType;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.PaymentRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.repository.RescueStatusHistoryRepository;
import com.sras.backend.repository.RescueVehicleRepository;
import com.sras.backend.repository.SystemWalletRepository;
import com.sras.backend.repository.WalletTransactionRepository;
import com.sras.backend.dto.response.GarageWalletOverviewResponse;
import com.sras.backend.service.FinanceService;
import com.sras.backend.service.NotificationService;
import com.sras.backend.service.PayOSService;
import com.sras.backend.service.RescueRequestService;
import org.springframework.context.annotation.Lazy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayOSServiceImpl implements PayOSService {

    @Value("${app.payos.client-id}")
    private String clientId;

    @Value("${app.payos.api-key}")
    private String apiKey;

    @Value("${app.payos.checksum-key}")
    private String checksumKey;

    private static final String PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";

    private final RescueRequestRepository rescueRequestRepository;
    private final PaymentRepository paymentRepository;
    private final GarageRepository garageRepository;
    private final GarageStaffRepository garageStaffRepository;
    private final RescueVehicleRepository rescueVehicleRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final SystemWalletRepository systemWalletRepository;
    private final RescueStatusHistoryRepository statusHistoryRepository;
    private final RescueRequestService rescueRequestService;
    private final NotificationService notificationService;
    @Lazy
    private final FinanceService financeService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    @Transactional
    public CreatePayOSPaymentResponse createPaymentLink(User currentUser, Long requestId) {
        RescueRequest req = rescueRequestRepository.findByIdAndIsDeletedFalse(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ"));

        boolean isCustomer = req.getCustomer() != null && req.getCustomer().getId().equals(currentUser.getId());
        boolean isStaff = req.getStaff() != null && req.getStaff().getUser() != null && req.getStaff().getUser().getId().equals(currentUser.getId());
        boolean isGarageOwner = req.getGarage() != null && req.getGarage().getOwner() != null && req.getGarage().getOwner().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() != null && currentUser.getRole().name().equals("ADMIN");

        if (!isCustomer && !isStaff && !isGarageOwner && !isAdmin) {
            throw new UnauthorizedException("Bạn không có quyền lấy thông tin thanh toán cho đơn này");
        }

        if (req.getStatus() == RescueStatus.CANCELLED || req.getStatus() == RescueStatus.DECLINED || req.getStatus() == RescueStatus.PAID) {
            throw new BadRequestException("Đơn không ở trạng thái cần thanh toán");
        }

        boolean isDeclinedQuote = req.getQuoteStatus() != null && "DECLINED".equalsIgnoreCase(req.getQuoteStatus());
        long totalAmount = isDeclinedQuote
                ? (req.getRescueFee() != null ? req.getRescueFee() : 100000L)
                : (req.getTotalAmount() != null && req.getTotalAmount() > 0
                    ? req.getTotalAmount()
                    : ((req.getRescueFee() != null ? req.getRescueFee() : 100000L)
                    + (req.getTowingFee() != null ? req.getTowingFee() : 0L)
                    + (req.getServiceFee() != null ? req.getServiceFee() : 0L)));

        // Kiểm tra xem đã có giao dịch PayOS PENDING gần nhất chưa
        Payment existingPayment = paymentRepository.findFirstByRequestAndStatusOrderByCreatedAtDesc(req, PaymentStatus.PENDING)
                .orElse(null);
        if (existingPayment != null && existingPayment.getProviderOrderCode() != null) {
            boolean alreadyPaid = queryPayOSAndFulfillIfPaid(existingPayment, req);
            if (alreadyPaid || req.getStatus() == RescueStatus.PAID) {
                throw new BadRequestException("Đơn cứu hộ đã hoàn tất thanh toán trước đó");
            }
        }

        // Sinh orderCode duy nhất (chữ số nguyên dương <= 9007199254740991)
        long orderCode = System.currentTimeMillis();

        // Mô tả chuyển khoản (tối đa 25 ký tự không dấu cho PayOS)
        String description = "SRAS chuyen tien sua xe";

        String returnUrl = "https://sras.vn/payment/success?orderCode=" + orderCode;
        String cancelUrl = "https://sras.vn/payment/cancel?orderCode=" + orderCode;

        // Tạo chuỗi ký HMAC SHA-256 theo tài liệu PayOS:
        // amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}
        String dataToSign = "amount=" + totalAmount
                + "&cancelUrl=" + cancelUrl
                + "&description=" + description
                + "&orderCode=" + orderCode
                + "&returnUrl=" + returnUrl;

        String signature = hmacSha256(checksumKey, dataToSign);

        Map<String, Object> body = Map.of(
                "orderCode", orderCode,
                "amount", totalAmount,
                "description", description,
                "cancelUrl", cancelUrl,
                "returnUrl", returnUrl,
                "signature", signature
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-client-id", clientId);
        headers.set("x-api-key", apiKey);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            log.info("Gửi yêu cầu tạo PayOS payment link cho orderCode={}, amount={}", orderCode, totalAmount);
            ResponseEntity<String> response = restTemplate.postForEntity(PAYOS_API_URL, requestEntity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());

            String code = root.path("code").asText();
            if (!"00".equals(code)) {
                String desc = root.path("desc").asText("Lỗi tạo link thanh toán PayOS");
                log.error("PayOS API error: {}", desc);
                throw new BadRequestException("PayOS: " + desc);
            }

            JsonNode dataNode = root.path("data");
            String checkoutUrl = dataNode.path("checkoutUrl").asText();
            String qrCode = dataNode.path("qrCode").asText();
            String paymentLinkId = dataNode.path("paymentLinkId").asText();
            String accountNumber = dataNode.path("accountNumber").asText();
            String accountName = dataNode.path("accountName").asText();
            String bin = dataNode.path("bin").asText();

            // Lưu bản ghi Payment
            Payment payment = new Payment();
            payment.setPaymentType(PaymentType.RESCUE_ORDER);
            payment.setRequest(req);
            payment.setGarage(req.getGarage());
            payment.setPaidByUser(req.getCustomer() != null ? req.getCustomer() : currentUser);
            payment.setAmount(totalAmount);
            payment.setMethod(PaymentMethod.PAYOS);
            payment.setStatus(PaymentStatus.PENDING);
            payment.setProviderOrderCode(orderCode);
            payment.setProviderTxnId(paymentLinkId);
            paymentRepository.save(payment);

            req.setPaymentMethod(RequestPaymentMethod.BANK_TRANSFER);
            rescueRequestRepository.save(req);

            String payOSDescription = dataNode.hasNonNull("description")
                    ? dataNode.path("description").asText()
                    : description;

            return CreatePayOSPaymentResponse.builder()
                    .checkoutUrl(checkoutUrl)
                    .qrCode(qrCode)
                    .orderCode(orderCode)
                    .paymentLinkId(paymentLinkId)
                    .amount(totalAmount)
                    .description(payOSDescription)
                    .accountNumber(accountNumber)
                    .accountName(accountName)
                    .bin(bin)
                    .build();

        } catch (Exception e) {
            log.error("Lỗi khi kết nối PayOS: {}", e.getMessage(), e);
            throw new BadRequestException("Không thể tạo giao dịch PayOS: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public RescueRequestResponse checkPaymentStatus(User user, Long orderCode) {
        Payment payment = paymentRepository.findByProviderOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch PayOS orderCode=" + orderCode));

        RescueRequest req = payment.getRequest();
        if (req == null) {
            throw new BadRequestException("Giao dịch không gắn với đơn cứu hộ");
        }

        // Nếu đã thanh toán rồi thì trả về kết quả ngay
        if (payment.getStatus() == PaymentStatus.SUCCESS || req.getStatus() == RescueStatus.PAID) {
            return rescueRequestService.getRequest(user, req.getId());
        }

        // 1. Gọi PayOS kiểm tra orderCode hiện tại
        boolean isPaid = queryPayOSAndFulfillIfPaid(payment, req);

        // 2. Nếu orderCode này chưa PAID, kiểm tra các giao dịch PENDING khác của cùng đơn (trường hợp khách tạo nhiều link hoặc chuyển theo QR trước đó)
        if (!isPaid && req.getStatus() != RescueStatus.PAID) {
            List<Payment> allPayments = paymentRepository.findByRequestOrderByCreatedAtDesc(req);
            for (Payment p : allPayments) {
                if (p.getStatus() == PaymentStatus.PENDING && !p.getId().equals(payment.getId())) {
                    if (queryPayOSAndFulfillIfPaid(p, req)) {
                        break;
                    }
                }
            }
        }

        return rescueRequestService.getRequest(user, req.getId());
    }

    private boolean queryPayOSAndFulfillIfPaid(Payment payment, RescueRequest req) {
        if (payment == null || payment.getProviderOrderCode() == null) {
            return false;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SRAS-Backend/1.0");
            headers.set("x-client-id", clientId);
            headers.set("x-api-key", apiKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            String url = PAYOS_API_URL + "/" + payment.getProviderOrderCode();
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());

            String code = root.path("code").asText();
            if ("00".equals(code)) {
                JsonNode dataNode = root.path("data");
                String status = dataNode.path("status").asText();
                log.info("PayOS orderCode={} status={}", payment.getProviderOrderCode(), status);

                if ("PAID".equalsIgnoreCase(status)) {
                    fulfillPaymentSuccess(payment, req, "PayOS Query Status");
                    return true;
                }
            }
        } catch (Exception e) {
            log.warn("Kiểm tra trạng thái PayOS orderCode={} thất bại: {}", payment.getProviderOrderCode(), e.getMessage());
        }
        return false;
    }

    @Override
    @Transactional
    public void processWebhook(Map<String, Object> webhookData) {
        log.info("Nhận PayOS Webhook: {}", webhookData);
        try {
            Object dataObj = webhookData.get("data");
            if (dataObj == null) return;

            JsonNode dataNode = objectMapper.valueToTree(dataObj);
            long orderCode = dataNode.path("orderCode").asLong();
            if (orderCode <= 0) return;

            Payment payment = paymentRepository.findByProviderOrderCode(orderCode).orElse(null);
            if (payment == null) {
                log.warn("Webhook PayOS không tìm thấy payment với orderCode={}", orderCode);
                return;
            }

            if (payment.getStatus() == PaymentStatus.SUCCESS) {
                log.info("Payment orderCode={} đã được xử lý trước đó", orderCode);
                return;
            }

            // Trường hợp 1: Nạp tiền vào ví thợ cứu hộ (WALLET_TOPUP)
            if (payment.getPaymentType() == PaymentType.WALLET_TOPUP && payment.getStaff() != null) {
                fulfillStaffTopupSuccess(payment, "PayOS Webhook Callback");
                return;
            }

            // Trường hợp 2: Nạp tiền vào ví ký quỹ Gara (WALLET_TOPUP)
            if (payment.getPaymentType() == PaymentType.WALLET_TOPUP && payment.getGarage() != null && payment.getStaff() == null) {
                fulfillGarageTopupSuccess(payment, "PayOS Webhook Callback");
                return;
            }

            // Trường hợp 3: Khách hàng thanh toán đơn cứu hộ (RESCUE_ORDER)
            RescueRequest req = payment.getRequest();
            if (req == null) return;

            fulfillPaymentSuccess(payment, req, "PayOS Webhook Callback");

        } catch (Exception e) {
            log.error("Lỗi xử lý Webhook PayOS: {}", e.getMessage(), e);
        }
    }

    /**
     * Hoàn tất thanh toán đơn cứu hộ qua PayOS:
     * Cập nhật đơn PAID, giải phóng thợ & xe.
     * Tự động phân chia doanh thu theo tỷ lệ trong 1 Database Transaction:
     * - System: 10% tổng đơn (hoặc theo hợp đồng gara)
     * - Employee: 80% phí di chuyển + 10% phí sửa chữa
     * - Garage Admin: phần còn lại = totalAmount - systemShare - employeeShare
     */
    private void fulfillPaymentSuccess(Payment payment, RescueRequest req, String source) {
        OffsetDateTime now = OffsetDateTime.now();

        // 1. Cập nhật Payment
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(now);
        paymentRepository.save(payment);

        // Huỷ các giao dịch PENDING còn lại của cùng đơn này để tránh trùng lặp
        List<Payment> allReqPayments = paymentRepository.findByRequestOrderByCreatedAtDesc(req);
        for (Payment otherP : allReqPayments) {
            if (!otherP.getId().equals(payment.getId()) && otherP.getStatus() == PaymentStatus.PENDING) {
                otherP.setStatus(PaymentStatus.CANCELLED);
                paymentRepository.save(otherP);
            }
        }

        // 2. Cập nhật RescueRequest sang PAID
        RescueStatus from = req.getStatus();
        req.setStatus(RescueStatus.PAID);
        req.setPaymentMethod(RequestPaymentMethod.BANK_TRANSFER);
        if (req.getCompletedAt() == null) {
            req.setCompletedAt(now);
        }

        // 3. Giải phóng nhân viên và xe cứu hộ
        if (req.getStaff() != null) {
            req.getStaff().setStatus(WorkStatus.FREE);
            garageStaffRepository.save(req.getStaff());
        }
        if (req.getRescueVehicle() != null) {
            req.getRescueVehicle().setStatus(WorkStatus.FREE);
            rescueVehicleRepository.save(req.getRescueVehicle());
        }

        // 4. PHÂN CHIA DOANH THU ĐƠN HÀNG QUA CỔNG CHUYỂN KHOẢN (PAYOS)
        Garage garage = req.getGarage();
        long totalAmount = req.getTotalAmount() != null && req.getTotalAmount() > 0
                ? req.getTotalAmount()
                : (payment.getAmount() != null ? payment.getAmount() : 0L);

        // Tỷ lệ chiết khấu hệ thống lấy theo từng Gara
        double rawRate = 15.0;
        if (req.getCommissionRate() != null && req.getCommissionRate().doubleValue() > 0) {
            rawRate = req.getCommissionRate().doubleValue();
        } else if (garage != null && garage.getCommissionRate() != null && garage.getCommissionRate().doubleValue() > 0) {
            rawRate = garage.getCommissionRate().doubleValue();
        }
        double systemRate = rawRate <= 1.0 ? rawRate : rawRate / 100.0;
        long systemShare = req.getCommissionAmount() != null && req.getCommissionAmount() > 0
                ? req.getCommissionAmount()
                : Math.round(totalAmount * systemRate);
        long garageShare = totalAmount - systemShare; // CHUYỂN TOÀN BỘ PHẦN CÒN LẠI CHO GARA!

        req.setCommissionRate(BigDecimal.valueOf(systemRate));
        req.setCommissionAmount(systemShare);
        rescueRequestRepository.save(req);

        // A. CỘNG VÀO VÍ HỆ THỐNG (System Wallet)
        SystemWallet sysWallet = systemWalletRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> {
                    SystemWallet sw = new SystemWallet();
                    sw.setBalance(0L);
                    sw.setTotalCommissionCollected(0L);
                    return systemWalletRepository.save(sw);
                });
        sysWallet.setBalance(sysWallet.getBalance() + systemShare);
        sysWallet.setTotalCommissionCollected(sysWallet.getTotalCommissionCollected() + systemShare);
        systemWalletRepository.save(sysWallet);

        WalletTransaction sysTxn = new WalletTransaction();
        sysTxn.setGarage(garage);
        sysTxn.setWalletType(WalletType.SYSTEM);
        sysTxn.setType(WalletTxnType.ORDER_SPLIT_SYSTEM);
        sysTxn.setAmount(systemShare);
        sysTxn.setBalanceAfter(sysWallet.getBalance());
        sysTxn.setRefType("RESCUE_REQUEST");
        sysTxn.setRefId(req.getId());
        sysTxn.setDescription("Hệ thống nhận " + Math.round(systemRate * 100) + "% chiết khấu đơn #" + req.getCode() + " qua PayOS");
        walletTransactionRepository.save(sysTxn);

        // B. CỘNG TOÀN BỘ TIỀN KHÁCH THANH TOÁN VÀO VÍ TIỀN MẶT CỦA GARA (DEC-25: tất tiền là cộng vào ví tiền mặt)
        if (garage != null) {
            long currentCash = garage.getCashBalance() != null ? garage.getCashBalance() : 0L;
            long newCash = currentCash + totalAmount;
            garage.setCashBalance(newCash);

            // C. TRỪ HOA HỒNG CHIẾT KHẤU TỪ VÍ TÍN DỤNG CỦA GARA (DEC-25: còn trừ là trừ ví tín dụng)
            long currentCredit = garage.getCreditBalance() != null ? garage.getCreditBalance() : 500000L;
            long newCredit = currentCredit - systemShare;
            garage.setCreditBalance(newCredit);
            garageRepository.save(garage);

            WalletTransaction garageCashTxn = new WalletTransaction();
            garageCashTxn.setGarage(garage);
            garageCashTxn.setWalletType(WalletType.CASH);
            garageCashTxn.setType(WalletTxnType.ORDER_SPLIT_GARAGE);
            garageCashTxn.setAmount(totalAmount);
            garageCashTxn.setBalanceAfter(newCash);
            garageCashTxn.setRefType("RESCUE_REQUEST");
            garageCashTxn.setRefId(req.getId());
            garageCashTxn.setDescription("Cộng toàn bộ tiền khách thanh toán qua PayOS (" + formatVnd(totalAmount) + ") vào ví tiền mặt đơn #" + req.getCode());
            walletTransactionRepository.save(garageCashTxn);

            WalletTransaction garageCreditTxn = new WalletTransaction();
            garageCreditTxn.setGarage(garage);
            garageCreditTxn.setWalletType(WalletType.CREDIT);
            garageCreditTxn.setType(WalletTxnType.COMMISSION_DEBIT);
            garageCreditTxn.setAmount(-systemShare);
            garageCreditTxn.setBalanceAfter(newCredit);
            garageCreditTxn.setRefType("RESCUE_REQUEST");
            garageCreditTxn.setRefId(req.getId());
            garageCreditTxn.setDescription("Trừ " + Math.round(systemRate * 100) + "% chiết khấu hoa hồng đơn #" + req.getCode() + " từ ví tín dụng");
            walletTransactionRepository.save(garageCreditTxn);
        }

        // 5. Ghi lịch sử chuyển trạng thái
        RescueStatusHistory history = new RescueStatusHistory();
        history.setRequest(req);
        history.setFromStatus(from);
        history.setToStatus(RescueStatus.PAID);
        history.setChangedByUser(payment.getPaidByUser());
        history.setActorType(ActorType.CUSTOMER);
        history.setNote("Thanh toán thành công qua PayOS (" + source + ")");
        statusHistoryRepository.save(history);

        // 6. Gửi thông báo đến gara và nhân viên
        if (req.getStaff() != null && req.getStaff().getUser() != null) {
            notificationService.createNotification(
                    req.getStaff().getUser(),
                    com.sras.backend.entity.enums.NotificationType.REPAIR_DONE,
                    "Khách đã thanh toán!",
                    "Khách đã thanh toán PayOS thành công cho đơn cứu hộ #" + req.getCode() + ".",
                    "RESCUE_REQUEST",
                    req.getId()
            );
        }
    }

    /**
     * Hoàn tất nạp tiền vào ví nhân viên (Staff Topup).
     */
    public void fulfillStaffTopupSuccess(Payment payment, String source) {
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(OffsetDateTime.now());
        paymentRepository.save(payment);

        GarageStaff staff = payment.getStaff();
        if (staff == null) return;

        long amount = payment.getAmount() != null ? payment.getAmount() : 0L;
        long currentBal = staff.getWalletBalance() != null ? staff.getWalletBalance() : 0L;
        long newBal = currentBal + amount;
        staff.setWalletBalance(newBal);
        garageStaffRepository.save(staff);

        WalletTransaction txn = new WalletTransaction();
        txn.setStaff(staff);
        txn.setGarage(staff.getGarage());
        txn.setWalletType(WalletType.EMPLOYEE);
        txn.setType(WalletTxnType.TOPUP);
        txn.setAmount(amount);
        txn.setBalanceAfter(newBal);
        txn.setRefType("WALLET_TOPUP");
        txn.setRefId(payment.getId());
        txn.setDescription("Nạp tiền vào ví thợ cứu hộ qua PayOS (" + source + ")");
        walletTransactionRepository.save(txn);

        if (staff.getUser() != null) {
            notificationService.createNotification(
                    staff.getUser(),
                    com.sras.backend.entity.enums.NotificationType.PAYMENT_SUCCESS,
                    "Nạp tiền ví thành công!",
                    "Bạn đã nạp thành công " + formatVnd(amount) + " vào ví thợ. Số dư mới: " + formatVnd(newBal) + ".",
                    "WALLET",
                    staff.getId()
            );
        }
    }

    @Override
    @Transactional
    public CreatePayOSPaymentResponse createStaffTopupLink(User staffUser, Long amount) {
        if (amount == null || amount < 10000L) {
            throw new BadRequestException("Số tiền nạp tối thiểu là 10.000đ");
        }

        GarageStaff staff = garageStaffRepository.findByUserAndIsDeletedFalse(staffUser)
                .orElseThrow(() -> new BadRequestException("Bạn không phải là nhân viên gara hoặc chưa được kích hoạt"));

        long orderCode = System.currentTimeMillis();
        String description = "SRAS Nap vi nhan vien";
        String returnUrl = "https://sras.vn/wallet/topup/success?orderCode=" + orderCode;
        String cancelUrl = "https://sras.vn/wallet/topup/cancel?orderCode=" + orderCode;

        String dataToSign = "amount=" + amount
                + "&cancelUrl=" + cancelUrl
                + "&description=" + description
                + "&orderCode=" + orderCode
                + "&returnUrl=" + returnUrl;

        String signature = hmacSha256(checksumKey, dataToSign);

        Map<String, Object> body = Map.of(
                "orderCode", orderCode,
                "amount", amount,
                "description", description,
                "cancelUrl", cancelUrl,
                "returnUrl", returnUrl,
                "signature", signature
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-client-id", clientId);
        headers.set("x-api-key", apiKey);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            log.info("Tạo PayOS topup link cho staffId={}, amount={}, orderCode={}", staff.getId(), amount, orderCode);
            ResponseEntity<String> response = restTemplate.postForEntity(PAYOS_API_URL, requestEntity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());

            String code = root.path("code").asText();
            if (!"00".equals(code)) {
                String desc = root.path("desc").asText("Lỗi tạo link nạp tiền PayOS");
                throw new BadRequestException("PayOS: " + desc);
            }

            JsonNode dataNode = root.path("data");
            String checkoutUrl = dataNode.path("checkoutUrl").asText();
            String qrCode = dataNode.path("qrCode").asText();
            String paymentLinkId = dataNode.path("paymentLinkId").asText();
            String accountNumber = dataNode.path("accountNumber").asText();
            String accountName = dataNode.path("accountName").asText();
            String bin = dataNode.path("bin").asText();

            Payment payment = new Payment();
            payment.setPaymentType(PaymentType.WALLET_TOPUP);
            payment.setStaff(staff);
            payment.setGarage(staff.getGarage());
            payment.setPaidByUser(staffUser);
            payment.setAmount(amount);
            payment.setMethod(PaymentMethod.PAYOS);
            payment.setStatus(PaymentStatus.PENDING);
            payment.setProviderOrderCode(orderCode);
            payment.setProviderTxnId(paymentLinkId);
            paymentRepository.save(payment);

            return CreatePayOSPaymentResponse.builder()
                    .checkoutUrl(checkoutUrl)
                    .qrCode(qrCode)
                    .orderCode(orderCode)
                    .paymentLinkId(paymentLinkId)
                    .amount(amount)
                    .description(dataNode.hasNonNull("description") ? dataNode.path("description").asText() : description)
                    .accountNumber(accountNumber)
                    .accountName(accountName)
                    .bin(bin)
                    .build();
        } catch (Exception e) {
            log.error("Lỗi khi kết nối PayOS topup: {}", e.getMessage(), e);
            throw new BadRequestException("Không thể tạo giao dịch PayOS nạp tiền: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public StaffWalletResponse checkStaffTopupStatus(User staffUser, Long orderCode) {
        Payment payment = paymentRepository.findByProviderOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch PayOS orderCode=" + orderCode));

        GarageStaff staff = payment.getStaff();
        if (staff == null) {
            throw new BadRequestException("Giao dịch không thuộc về nhân viên");
        }

        if (payment.getStatus() != PaymentStatus.SUCCESS) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set("x-client-id", clientId);
                headers.set("x-api-key", apiKey);
                HttpEntity<Void> entity = new HttpEntity<>(headers);

                String url = PAYOS_API_URL + "/" + orderCode;
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                JsonNode root = objectMapper.readTree(response.getBody());

                String code = root.path("code").asText();
                if ("00".equals(code)) {
                    JsonNode dataNode = root.path("data");
                    String status = dataNode.path("status").asText();
                    if ("PAID".equalsIgnoreCase(status)) {
                        fulfillStaffTopupSuccess(payment, "PayOS Query Status");
                    }
                }
            } catch (Exception e) {
                log.warn("Kiểm tra trạng thái PayOS topup orderCode={} thất bại: {}", orderCode, e.getMessage());
            }
        }

        // Lấy lại staff mới nhất sau cập nhật
        staff = garageStaffRepository.findById(staff.getId()).orElse(staff);
        List<WalletTransaction> txns = walletTransactionRepository.findByStaffOrderByCreatedAtDesc(staff);
        List<com.sras.backend.dto.response.WalletTransactionResponse> txnResponses = txns.stream()
                .map(t -> com.sras.backend.dto.response.WalletTransactionResponse.builder()
                        .id(t.getId())
                        .walletType(t.getWalletType() != null ? t.getWalletType().name() : null)
                        .type(t.getType() != null ? t.getType().name() : null)
                        .amount(t.getAmount())
                        .balanceAfter(t.getBalanceAfter())
                        .description(t.getDescription())
                        .refType(t.getRefType())
                        .refId(t.getRefId())
                        .createdAt(t.getCreatedAt())
                        .build())
                .toList();

        return StaffWalletResponse.builder()
                .staffId(staff.getId())
                .walletBalance(staff.getWalletBalance() != null ? staff.getWalletBalance() : 0L)
                .staffName(staff.getUser() != null ? staff.getUser().getFullName() : null)
                .staffCode(staff.getStaffCode())
                .garageId(staff.getGarage() != null ? staff.getGarage().getId() : null)
                .garageName(staff.getGarage() != null ? staff.getGarage().getName() : null)
                .transactions(txnResponses)
                .build();
    }

    /**
     * Hoàn tất nạp tiền vào ví ký quỹ Gara (Garage Topup).
     */
    public void fulfillGarageTopupSuccess(Payment payment, String source) {
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return;
        }
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(OffsetDateTime.now());
        paymentRepository.save(payment);

        Garage garage = payment.getGarage();
        if (garage == null) return;

        long amount = payment.getAmount() != null ? payment.getAmount() : 0L;
        long currentCredit = garage.getCreditBalance() != null ? garage.getCreditBalance() : 500000L;
        long newCredit = currentCredit + amount;
        garage.setCreditBalance(newCredit);
        garageRepository.save(garage);

        WalletTransaction txn = new WalletTransaction();
        txn.setGarage(garage);
        txn.setWalletType(WalletType.CREDIT);
        txn.setType(WalletTxnType.TOPUP);
        txn.setAmount(amount);
        txn.setBalanceAfter(newCredit);
        txn.setRefType("WALLET_TOPUP");
        txn.setRefId(payment.getId());
        txn.setDescription("Nạp tiền vào ví tín dụng Gara qua PayOS (" + source + ")");
        txn.setCreatedByUser(payment.getPaidByUser());
        walletTransactionRepository.save(txn);

        if (garage.getOwner() != null) {
            notificationService.createNotification(
                    garage.getOwner(),
                    com.sras.backend.entity.enums.NotificationType.PAYMENT_SUCCESS,
                    "Nạp tiền ví Gara thành công!",
                    "Gara " + garage.getName() + " đã nạp thành công " + formatVnd(amount) + " vào ví tín dụng. Số dư mới: " + formatVnd(newCredit) + ".",
                    "WALLET",
                    garage.getId()
            );
        }
    }

    @Override
    @Transactional
    public CreatePayOSPaymentResponse createGarageTopupLink(User garageUser, Long amount) {
        if (amount == null || amount < 10000L) {
            throw new BadRequestException("Số tiền nạp tối thiểu là 10.000đ");
        }

        Garage garage = garageRepository.findByOwner(garageUser)
                .orElseThrow(() -> new BadRequestException("Bạn không phải là chủ gara hoặc gara chưa được kích hoạt"));

        long orderCode = System.currentTimeMillis();
        String description = "SRAS Nap vi Gara " + garage.getId();
        if (description.length() > 25) {
            description = description.substring(0, 25);
        }
        String returnUrl = "https://sras.vn/garage/wallet/topup/success?orderCode=" + orderCode;
        String cancelUrl = "https://sras.vn/garage/wallet/topup/cancel?orderCode=" + orderCode;

        String dataToSign = "amount=" + amount
                + "&cancelUrl=" + cancelUrl
                + "&description=" + description
                + "&orderCode=" + orderCode
                + "&returnUrl=" + returnUrl;

        String signature = hmacSha256(checksumKey, dataToSign);

        Map<String, Object> body = Map.of(
                "orderCode", orderCode,
                "amount", amount,
                "description", description,
                "cancelUrl", cancelUrl,
                "returnUrl", returnUrl,
                "signature", signature
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-client-id", clientId);
        headers.set("x-api-key", apiKey);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            log.info("Tạo PayOS garage topup link cho garageId={}, amount={}, orderCode={}", garage.getId(), amount, orderCode);
            ResponseEntity<String> response = restTemplate.postForEntity(PAYOS_API_URL, requestEntity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());

            String code = root.path("code").asText();
            if (!"00".equals(code)) {
                String desc = root.path("desc").asText("Lỗi tạo link nạp tiền PayOS");
                throw new BadRequestException("PayOS: " + desc);
            }

            JsonNode dataNode = root.path("data");
            String checkoutUrl = dataNode.path("checkoutUrl").asText();
            String qrCode = dataNode.path("qrCode").asText();
            String paymentLinkId = dataNode.path("paymentLinkId").asText();
            String accountNumber = dataNode.path("accountNumber").asText();
            String accountName = dataNode.path("accountName").asText();
            String bin = dataNode.path("bin").asText();

            Payment payment = new Payment();
            payment.setPaymentType(PaymentType.WALLET_TOPUP);
            payment.setGarage(garage);
            payment.setPaidByUser(garageUser);
            payment.setAmount(amount);
            payment.setMethod(PaymentMethod.PAYOS);
            payment.setStatus(PaymentStatus.PENDING);
            payment.setProviderOrderCode(orderCode);
            payment.setProviderTxnId(paymentLinkId);
            paymentRepository.save(payment);

            return CreatePayOSPaymentResponse.builder()
                    .checkoutUrl(checkoutUrl)
                    .qrCode(qrCode)
                    .orderCode(orderCode)
                    .paymentLinkId(paymentLinkId)
                    .amount(amount)
                    .description(dataNode.hasNonNull("description") ? dataNode.path("description").asText() : description)
                    .accountNumber(accountNumber)
                    .accountName(accountName)
                    .bin(bin)
                    .build();
        } catch (Exception e) {
            log.error("Lỗi khi kết nối PayOS garage topup: {}", e.getMessage(), e);
            throw new BadRequestException("Không thể tạo giao dịch PayOS nạp tiền: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public GarageWalletOverviewResponse checkGarageTopupStatus(User garageUser, Long orderCode) {
        Payment payment = paymentRepository.findByProviderOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch PayOS orderCode=" + orderCode));

        Garage garage = payment.getGarage();
        if (garage == null) {
            throw new BadRequestException("Giao dịch không thuộc về gara");
        }

        if (payment.getStatus() != PaymentStatus.SUCCESS) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set("x-client-id", clientId);
                headers.set("x-api-key", apiKey);
                HttpEntity<Void> entity = new HttpEntity<>(headers);

                String url = PAYOS_API_URL + "/" + orderCode;
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                JsonNode root = objectMapper.readTree(response.getBody());

                String code = root.path("code").asText();
                if ("00".equals(code)) {
                    JsonNode dataNode = root.path("data");
                    String status = dataNode.path("status").asText();
                    if ("PAID".equalsIgnoreCase(status)) {
                        fulfillGarageTopupSuccess(payment, "PayOS Query Status");
                    }
                }
            } catch (Exception e) {
                log.warn("Kiểm tra trạng thái PayOS garage topup orderCode={} thất bại: {}", orderCode, e.getMessage());
            }
        }

        return financeService.getGarageWalletOverview(garageUser);
    }

    private String formatVnd(long amount) {
        return String.format("%,dđ", amount).replace(',', '.');
    }

    private String hmacSha256(String key, String data) {
        try {
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secretKey);
            byte[] hash = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo chữ ký HMAC SHA-256: " + e.getMessage(), e);
        }
    }
}

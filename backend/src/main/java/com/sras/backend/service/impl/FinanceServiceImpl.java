package com.sras.backend.service.impl;

import com.sras.backend.dto.response.AdminFinanceOverviewResponse;
import com.sras.backend.dto.response.CustomerWalletOverviewResponse;
import com.sras.backend.dto.response.GarageWalletOverviewResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.SystemWallet;
import com.sras.backend.entity.User;
import com.sras.backend.entity.WalletTransaction;
import com.sras.backend.entity.WithdrawalRequest;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.RequestPaymentMethod;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.entity.enums.WalletType;
import com.sras.backend.entity.enums.WalletTxnType;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.repository.SystemWalletRepository;
import com.sras.backend.repository.WalletTransactionRepository;
import com.sras.backend.repository.WithdrawalRequestRepository;
import com.sras.backend.service.FinanceService;
import com.sras.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinanceServiceImpl implements FinanceService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final SystemWalletRepository systemWalletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final RescueRequestRepository rescueRequestRepository;
    private final GarageRepository garageRepository;
    private final NotificationService notificationService;
    private final WithdrawalRequestRepository withdrawalRequestRepository;

    @Override
    @Transactional(readOnly = true)
    public AdminFinanceOverviewResponse getAdminFinanceOverview() {
        SystemWallet sysWallet = systemWalletRepository.findFirstByOrderByIdAsc()
                .orElse(null);

        long systemBalance = sysWallet != null && sysWallet.getBalance() != null ? sysWallet.getBalance() : 0L;

        // Lấy tất cả đơn cứu hộ từ database sắp xếp mới nhất trước
        List<RescueRequest> allRequests = rescueRequestRepository.findAllForAdminFinanceEager();

        long pendingCount = 0;
        long pendingAmount = 0;
        long successfulAmount = 0;
        long calculatedTotalCommission = 0;
        long totalCompensation = 0;

        List<AdminFinanceOverviewResponse.CommissionTransactionResponse> list = new ArrayList<>();

        for (RescueRequest req : allRequests) {
            if (Boolean.TRUE.equals(req.getIsDeleted())) continue;

            Garage garage = req.getGarage();
            String garageName = garage != null && garage.getName() != null ? garage.getName() : "Garage Đối Tác";
            String garageAvatar = (garage != null && garage.getOwner() != null) ? garage.getOwner().getAvatarUrl() : null;
            String techName = req.getStaff() != null && req.getStaff().getUser() != null ? req.getStaff().getUser().getFullName() : "KTV Đối tác";
            String techPhone = req.getStaff() != null && req.getStaff().getUser() != null ? req.getStaff().getUser().getPhone() : "0905123456";
            String custName = req.getCustomer() != null ? req.getCustomer().getFullName() : "Khách hàng SRAS";
            String custPhone = req.getContactPhone() != null ? req.getContactPhone() : (req.getCustomer() != null ? req.getCustomer().getPhone() : "0912345678");
            String pickupAddr = req.getPickupAddress() != null ? req.getPickupAddress() : "Đà Nẵng / Quảng Nam";

            if (Boolean.TRUE.equals(req.getDepositRequired())) {
                long depAmount = req.getDepositAmount() != null && req.getDepositAmount() > 0 ? req.getDepositAmount() : 50000L;
                String depStatus = req.getDepositStatus();

                // 1. Dòng Sàn thu cọc tạm giữ khi khách nộp cọc thành công
                if ("PAID".equals(depStatus) || "TRANSFERRED_TO_GARAGE".equals(depStatus) || "REFUNDED_TO_WALLET".equals(depStatus)) {
                    String holdStatus = "PAID".equals(depStatus) ? "Sàn tạm giữ cọc" : "Đã thu cọc tạm giữ";
                    list.add(AdminFinanceOverviewResponse.CommissionTransactionResponse.builder()
                            .id(req.getId() * 10000L + 1)
                            .orderCode("#DEP-" + (req.getCode() != null ? req.getCode() : req.getId()))
                            .serviceTitle("Tạm giữ tiền cọc chống bom đơn #" + (req.getCode() != null ? req.getCode() : req.getId()))
                            .garageName(garageName)
                            .garageAvatar(garageAvatar)
                            .grossAmount(depAmount)
                            .commissionAmount(depAmount)
                            .compensationAmount(0L)
                            .compensationStatus(null)
                            .commissionRate(0.0)
                            .txnType("DEPOSIT_HOLD")
                            .createdAtText(formatRelativeTime(req.getDepositPaidAt() != null ? req.getDepositPaidAt() : req.getCreatedAt()))
                            .createdAt(req.getDepositPaidAt() != null ? req.getDepositPaidAt().toString() : (req.getCreatedAt() != null ? req.getCreatedAt().toString() : null))
                            .status(holdStatus)
                            .technicianName(techName)
                            .technicianPhone(techPhone)
                            .customerName(custName)
                            .customerPhone(custPhone)
                            .pickupAddress(pickupAddr)
                            .paymentMethod("PAYOS")
                            .rescueFee(depAmount)
                            .towingFee(0L)
                            .serviceFee(0L)
                            .employeeShare(0L)
                            .garageShare(0L)
                            .travelFee(depAmount)
                            .repairFee(0L)
                            .quoteStatus(req.getQuoteStatus())
                            .customerIpAddress(req.getCustomerIpAddress())
                            .deviceId(req.getCustomerIpAddress())
                            .depositRequired(true)
                            .depositAmount(depAmount)
                            .depositStatus(depStatus)
                            .build());
                }

                // 2. Dòng Sàn giải ngân tiền cọc trả về cho Gara khi đơn hoàn tất
                if ("TRANSFERRED_TO_GARAGE".equals(depStatus)) {
                    list.add(AdminFinanceOverviewResponse.CommissionTransactionResponse.builder()
                            .id(req.getId() * 10000L + 2)
                            .orderCode("#REL-" + (req.getCode() != null ? req.getCode() : req.getId()))
                            .serviceTitle("Giải ngân tiền cọc đơn #" + (req.getCode() != null ? req.getCode() : req.getId()) + " trả về cho Gara")
                            .garageName(garageName)
                            .garageAvatar(garageAvatar)
                            .grossAmount(depAmount)
                            .commissionAmount(-depAmount)
                            .compensationAmount(0L)
                            .compensationStatus(null)
                            .commissionRate(0.0)
                            .txnType("DEPOSIT_RELEASE")
                            .createdAtText(formatRelativeTime(req.getCompletedAt() != null ? req.getCompletedAt() : req.getUpdatedAt()))
                            .createdAt(req.getCompletedAt() != null ? req.getCompletedAt().toString() : (req.getUpdatedAt() != null ? req.getUpdatedAt().toString() : null))
                            .status("Đã giải ngân cho Gara")
                            .technicianName(techName)
                            .technicianPhone(techPhone)
                            .customerName(custName)
                            .customerPhone(custPhone)
                            .pickupAddress(pickupAddr)
                            .paymentMethod("VÍ TỔNG HỆ THỐNG")
                            .rescueFee(depAmount)
                            .towingFee(0L)
                            .serviceFee(0L)
                            .employeeShare(0L)
                            .garageShare(depAmount)
                            .travelFee(depAmount)
                            .repairFee(0L)
                            .quoteStatus(req.getQuoteStatus())
                            .customerIpAddress(req.getCustomerIpAddress())
                            .deviceId(req.getCustomerIpAddress())
                            .depositRequired(true)
                            .depositAmount(depAmount)
                            .depositStatus(depStatus)
                            .build());
                } else if ("REFUNDED_TO_WALLET".equals(depStatus)) {
                    list.add(AdminFinanceOverviewResponse.CommissionTransactionResponse.builder()
                            .id(req.getId() * 10000L + 3)
                            .orderCode("#REF-" + (req.getCode() != null ? req.getCode() : req.getId()))
                            .serviceTitle("Hoàn trả tiền cọc đơn #" + (req.getCode() != null ? req.getCode() : req.getId()) + " vào ví khách")
                            .garageName(garageName)
                            .garageAvatar(garageAvatar)
                            .grossAmount(depAmount)
                            .commissionAmount(-depAmount)
                            .compensationAmount(0L)
                            .compensationStatus(null)
                            .commissionRate(0.0)
                            .txnType("DEPOSIT_RELEASE")
                            .createdAtText(formatRelativeTime(req.getUpdatedAt() != null ? req.getUpdatedAt() : req.getCreatedAt()))
                            .createdAt(req.getUpdatedAt() != null ? req.getUpdatedAt().toString() : (req.getCreatedAt() != null ? req.getCreatedAt().toString() : null))
                            .status("Đã hoàn tiền cọc")
                            .technicianName(techName)
                            .technicianPhone(techPhone)
                            .customerName(custName)
                            .customerPhone(custPhone)
                            .pickupAddress(pickupAddr)
                            .paymentMethod("VÍ TỔNG HỆ THỐNG")
                            .rescueFee(depAmount)
                            .towingFee(0L)
                            .serviceFee(0L)
                            .employeeShare(0L)
                            .garageShare(0L)
                            .travelFee(depAmount)
                            .repairFee(0L)
                            .quoteStatus(req.getQuoteStatus())
                            .customerIpAddress(req.getCustomerIpAddress())
                            .deviceId(req.getCustomerIpAddress())
                            .depositRequired(true)
                            .depositAmount(depAmount)
                            .depositStatus(depStatus)
                            .build());
                }
            }

            boolean isCompensated = req.getGasCompensationAmount() != null
                    && req.getGasCompensationAmount() > 0
                    && ("AUTO_CREDITED".equalsIgnoreCase(req.getGasCompensationStatus()) || "APPROVED".equalsIgnoreCase(req.getGasCompensationStatus()));

            if (isCompensated) {
                long compAmount = req.getGasCompensationAmount();
                totalCompensation += compAmount;
                calculatedTotalCommission -= compAmount;

                long origFee = req.getRescueFee() != null && req.getRescueFee() > 0 ? req.getRescueFee()
                        : (req.getTotalAmount() != null && req.getTotalAmount() > 0 ? req.getTotalAmount() : 50000L);
                String compTitle = "APPROVED".equalsIgnoreCase(req.getGasCompensationStatus())
                        ? "Bồi hoàn xăng xe (Bom đơn)"
                        : "Bồi hoàn xăng xe (Khách huỷ giữa đường)";

                list.add(AdminFinanceOverviewResponse.CommissionTransactionResponse.builder()
                        .id(req.getId())
                        .orderCode("#BK-" + (req.getCode() != null ? req.getCode() : req.getId()))
                        .serviceTitle(compTitle + " @ " + garageName)
                        .garageName(garageName)
                        .garageAvatar(garageAvatar)
                        .grossAmount(origFee)
                        .commissionAmount(-compAmount)
                        .compensationAmount(compAmount)
                        .compensationStatus(req.getGasCompensationStatus())
                        .txnType("COMPENSATION")
                        .commissionRate(30.0)
                        .createdAtText(formatRelativeTime(req.getUpdatedAt() != null ? req.getUpdatedAt() : req.getCreatedAt()))
                        .createdAt(req.getUpdatedAt() != null ? req.getUpdatedAt().toString() : (req.getCreatedAt() != null ? req.getCreatedAt().toString() : null))
                        .status("Đã bồi hoàn xăng xe")
                        .technicianName(techName)
                        .technicianPhone(techPhone)
                        .customerName(custName)
                        .customerPhone(custPhone)
                        .pickupAddress(pickupAddr)
                        .paymentMethod("VÍ TỔNG HỆ THỐNG")
                        .rescueFee(origFee)
                        .towingFee(0L)
                        .serviceFee(0L)
                        .employeeShare(0L)
                        .garageShare(compAmount)
                        .travelFee(origFee)
                        .repairFee(0L)
                        .quoteStatus(req.getQuoteStatus())
                        .build());
                continue;
            }

            boolean isDeclined = "DECLINED".equalsIgnoreCase(req.getQuoteStatus()) || req.getStatus() == RescueStatus.DECLINED;

            long gross;
            if (isDeclined) {
                // Khách từ chối: Không sửa chữa, không kéo xe về garage.
                // Chỉ tính phí kiểm tra xe / di chuyển đến hiện trường (rescueFee hoặc 100k).
                gross = req.getRescueFee() != null && req.getRescueFee() > 0 ? req.getRescueFee() : 100000L;
            } else {
                gross = req.getTotalAmount() != null && req.getTotalAmount() > 0 ? req.getTotalAmount() : (req.getRescueFee() != null ? req.getRescueFee() : 0L);
            }
            if (gross <= 0L) continue;

            // Lấy chiết khấu chuẩn từ đơn hoặc từ garage
            double rawRate = 15.0; // Mặc định 15%
            if (req.getCommissionRate() != null && req.getCommissionRate().doubleValue() > 0) {
                rawRate = req.getCommissionRate().doubleValue();
            } else if (garage != null && garage.getCommissionRate() != null && garage.getCommissionRate().doubleValue() > 0) {
                rawRate = garage.getCommissionRate().doubleValue();
            }

            // CHUẨN HÓA: Nếu lưu dạng thập phân <= 1.0 (vd 0.155 hoặc 0.15) -> % là rawRate * 100 (15.5% hoặc 15%)
            // Nếu lưu dạng % > 1.0 (vd 15.0 hoặc 15.5) -> % là rawRate
            double percentRate;
            double rateRatio;
            if (rawRate <= 1.0) {
                rateRatio = rawRate;
                percentRate = rawRate * 100.0;
            } else {
                percentRate = rawRate;
                rateRatio = rawRate / 100.0;
            }
            percentRate = Math.round(percentRate * 10.0) / 10.0;

            // Tính hoa hồng hệ thống nhận từ đơn:
            // Khi từ chối: Chỉ tính chiết khấu trên phí kiểm tra xe thực thu (gross), không tính trên phí kéo xe hay sửa chữa
            long comm;
            if (isDeclined) {
                comm = Math.round(gross * rateRatio);
            } else if (req.getCommissionAmount() != null && req.getCommissionAmount() > 0) {
                comm = req.getCommissionAmount();
            } else {
                comm = Math.round(gross * rateRatio);
            }

            // Bỏ các công thức chia tiền: Hệ thống nhận hoa hồng comm, Gara nhận toàn bộ phần còn lại garShare
            long garShare = gross - comm;
            long empShare = 0L;
            long travelFee = isDeclined ? gross : (req.getRescueFee() != null ? req.getRescueFee() : 0L);
            long repairFee = isDeclined ? 0L : Math.max(0L, gross - travelFee);

            boolean isSuccessful = req.getStatus() == RescueStatus.PAID || req.getStatus() == RescueStatus.RATED;
            boolean isPending = req.getStatus() == RescueStatus.AWAITING_PAYMENT || req.getStatus() == RescueStatus.COMPLETED;

            if (isSuccessful) {
                successfulAmount += gross;
                calculatedTotalCommission += comm;
            } else if (isPending) {
                pendingCount++;
                pendingAmount += gross;
            }

            // Chỉ đưa vào danh sách nếu đơn đã hoàn thành/thanh toán hoặc chờ thanh toán
            if (isSuccessful || isPending) {
                String title = (req.getSymptom() != null ? req.getSymptom() : "Cứu hộ xe máy / ô tô") + " @ " + garageName;
                String payMethod = req.getPaymentMethod() != null ? req.getPaymentMethod().name() : "PAYOS";
                long rFee = travelFee;
                long tFee = isDeclined ? 0L : (req.getTowingFee() != null ? req.getTowingFee() : 0L);
                long sFee = isDeclined ? 0L : (req.getServiceFee() != null ? req.getServiceFee() : repairFee);

                String statusText = isSuccessful ? "Đã thanh toán" : "Chờ thanh toán";
                OffsetDateTime commTime = req.getCompletedAt() != null
                        ? req.getCompletedAt()
                        : (req.getUpdatedAt() != null ? req.getUpdatedAt() : req.getCreatedAt());

                list.add(AdminFinanceOverviewResponse.CommissionTransactionResponse.builder()
                        .id(req.getId())
                        .orderCode("#BK-" + (req.getCode() != null ? req.getCode() : req.getId()))
                        .serviceTitle(title)
                        .garageName(garageName)
                        .garageAvatar(garageAvatar)
                        .grossAmount(gross)
                        .commissionAmount(comm)
                        .commissionRate(percentRate)
                        .txnType("COMMISSION")
                        .createdAtText(formatRelativeTime(commTime))
                        .createdAt(commTime != null ? commTime.toString() : null)
                        .status(statusText)
                        .technicianName(techName)
                        .technicianPhone(techPhone)
                        .customerName(custName)
                        .customerPhone(custPhone)
                        .pickupAddress(pickupAddr)
                        .paymentMethod(payMethod)
                        .rescueFee(rFee)
                        .towingFee(tFee)
                        .serviceFee(sFee)
                        .employeeShare(empShare)
                        .garageShare(garShare)
                        .travelFee(travelFee)
                        .repairFee(repairFee)
                        .quoteStatus(req.getQuoteStatus())
                        .customerIpAddress(req.getCustomerIpAddress())
                        .deviceId(req.getCustomerIpAddress())
                        .depositRequired(Boolean.TRUE.equals(req.getDepositRequired()))
                        .depositAmount(req.getDepositAmount())
                        .depositStatus(req.getDepositStatus())
                        .build());
            }
        }

        // Sắp xếp lịch sử tài chính Admin: Các giao dịch mới nhất luôn hiện trên đầu
        list.sort((a, b) -> {
            if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                int cmp = b.getCreatedAt().compareTo(a.getCreatedAt());
                if (cmp != 0) return cmp;
            }
            // Nếu cùng thời điểm (vd cùng lúc hoàn thành đơn), ưu tiên COMMISSION (+ chiết khấu) -> DEPOSIT_RELEASE (-50k giải ngân) -> DEPOSIT_HOLD (+50k cọc)
            int priorityA = "COMMISSION".equals(a.getTxnType()) ? 3 : ("DEPOSIT_RELEASE".equals(a.getTxnType()) ? 2 : 1);
            int priorityB = "COMMISSION".equals(b.getTxnType()) ? 3 : ("DEPOSIT_RELEASE".equals(b.getTxnType()) ? 2 : 1);
            if (priorityA != priorityB) {
                return Integer.compare(priorityB, priorityA);
            }
            return Long.compare(b.getId() != null ? b.getId() : 0L, a.getId() != null ? a.getId() : 0L);
        });

        // Lấy tổng hoa hồng thực tế cộng từ các đơn trong DB (counter trong system_wallet có thể bị lệch/cũ)
        long finalTotalCommission = calculatedTotalCommission;

        return AdminFinanceOverviewResponse.builder()
                .systemBalance(systemBalance)
                .totalCommission(finalTotalCommission)
                .totalCompensation(totalCompensation)
                .commissionRate(15)
                .pendingCount(pendingCount)
                .pendingAmount(pendingAmount)
                .successfulAmount(successfulAmount)
                .transactions(list)
                .build();
    }

    @Override
    @Transactional
    public GarageWalletOverviewResponse getGarageWalletOverview(User user) {
        Garage garage = garageRepository.findByOwner(user)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gara của bạn"));

        LocalDate todayVn = LocalDate.now(VN_ZONE);
        LocalDate startOfWeek = todayVn.with(DayOfWeek.MONDAY);
        LocalDate endOfWeek = todayVn.with(DayOfWeek.SUNDAY);
        int currentYear = todayVn.getYear();

        List<RescueRequest> garageRequests = garage != null
                ? rescueRequestRepository.findByGarageAndIsDeletedFalseOrderByCreatedAtDesc(garage)
                : List.of();

        List<WalletTransaction> walletTxns = walletTransactionRepository.findByGarageOrderByCreatedAtDesc(garage).stream()
                .filter(t -> t.getWalletType() != WalletType.SYSTEM)
                .collect(Collectors.toList());
        // Đơn chuyển khoản chỉ là tiền thật trong ví khi payOS đã xác nhận (có dòng sổ cái ORDER_SPLIT_GARAGE).
        // Đơn bị đặt PAID qua /pay mock không có dòng này ⇒ không hiện là tiền vào, không rút được.
        Set<Long> verifiedPaidRequestIds = walletTxns.stream()
                .filter(t -> t.getType() == WalletTxnType.ORDER_SPLIT_GARAGE && "RESCUE_REQUEST".equals(t.getRefType()))
                .map(WalletTransaction::getRefId)
                .collect(Collectors.toSet());
        Set<Long> withdrawalIds = walletTxns.stream()
                .filter(t -> "WITHDRAWAL".equals(t.getRefType()) && t.getRefId() != null)
                .map(WalletTransaction::getRefId)
                .collect(Collectors.toSet());
        Map<Long, WithdrawalRequest> withdrawals = withdrawalIds.isEmpty() ? Map.of()
                : withdrawalRequestRepository.findByIdIn(withdrawalIds).stream()
                        .collect(Collectors.toMap(WithdrawalRequest::getId, Function.identity()));

        long todayIncome = 0;
        long todayOrdersCount = 0;
        long pendingOrdersCount = 0;
        long sevenDaysTotal = 0;
        // Ví tiền mặt = tổng sổ cái CASH — nguồn sự thật duy nhất của số tiền rút được về ngân hàng.
        Long ledgerCash = walletTransactionRepository.sumAmountByGarageIdAndWalletType(garage.getId(), WalletType.CASH);
        long calculatedCashBalance = ledgerCash != null ? ledgerCash : 0L;
        long calculatedCreditBalance = 0L; // Số dư ví tín dụng ban đầu là 0 VNĐ (chưa nạp tiền)

        // Khởi tạo 7 ngày gần nhất (Tuần này từ T2 đến CN), 12 tháng năm nay, 3 năm gần nhất
        List<GarageWalletOverviewResponse.DailyRevenuePoint> chartPoints = init7DaysChart();
        List<GarageWalletOverviewResponse.DailyRevenuePoint> monthlyChart = initMonthlyChart();
        List<GarageWalletOverviewResponse.DailyRevenuePoint> yearlyChart = initYearlyChart();

        List<GarageWalletOverviewResponse.GarageOrderTransactionResponse> txns = new ArrayList<>();

        for (RescueRequest r : garageRequests) {
            if (Boolean.TRUE.equals(r.getIsDeleted())) continue;

            boolean isDeclinedQuote = "DECLINED".equalsIgnoreCase(r.getQuoteStatus()) || r.getStatus() == RescueStatus.DECLINED;

            long total = isDeclinedQuote
                    ? (r.getRescueFee() != null && r.getRescueFee() > 0 ? r.getRescueFee() : 100000L)
                    : (r.getTotalAmount() != null && r.getTotalAmount() > 0 ? r.getTotalAmount() : (r.getRescueFee() != null ? r.getRescueFee() : 0L));

            // Tỷ lệ chiết khấu chuẩn hóa: nếu <= 1.0 (0.155) -> 15.5%; nếu > 1.0 (15.5) -> chia 100
            double rawRate = 15.0;
            if (r.getCommissionRate() != null && r.getCommissionRate().doubleValue() > 0) {
                rawRate = r.getCommissionRate().doubleValue();
            } else if (garage != null && garage.getCommissionRate() != null && garage.getCommissionRate().doubleValue() > 0) {
                rawRate = garage.getCommissionRate().doubleValue();
            }
            double systemRate = rawRate <= 1.0 ? rawRate : rawRate / 100.0;
            long sysShare = isDeclinedQuote
                    ? Math.round(total * systemRate)
                    : (r.getCommissionAmount() != null && r.getCommissionAmount() > 0
                        ? r.getCommissionAmount()
                        : Math.round(total * systemRate));
            long garageShare = total - sysShare;

            boolean isFinished = (r.getStatus() == RescueStatus.PAID || r.getStatus() == RescueStatus.RATED);
            boolean isCash = r.getPaymentMethod() == RequestPaymentMethod.CASH;

            LocalDate orderDate = r.getCreatedAt() != null
                    ? r.getCreatedAt().atZoneSameInstant(VN_ZONE).toLocalDate()
                    : null;

            if (isFinished) {
                // Doanh thu ròng của gara hôm nay (theo múi giờ Việt Nam)
                if (orderDate != null && orderDate.isEqual(todayVn)) {
                    todayIncome += garageShare;
                    todayOrdersCount++;
                }

                // Doanh thu tuần này (từ Thứ 2 đến hôm nay)
                if (orderDate != null && !orderDate.isBefore(startOfWeek) && !orderDate.isAfter(todayVn)) {
                    sevenDaysTotal += garageShare;
                }

                // Phân bổ vào biểu đồ tuần này, tháng này, năm này
                distributeToChart(chartPoints, r.getCreatedAt(), garageShare, startOfWeek, endOfWeek);
                distributeToMonthlyChart(monthlyChart, r.getCreatedAt(), garageShare, currentYear);
                distributeToYearlyChart(yearlyChart, r.getCreatedAt(), garageShare);

                // Mọi khoản chiết khấu hoa hồng (-sysShare) đều TRỪ vào Ví tín dụng (DEC-25).
                // Ví tiền mặt KHÔNG tính từ đơn ở đây — đã lấy từ sổ cái CASH ở trên.
                calculatedCreditBalance -= sysShare;
            } else if (r.getStatus() != RescueStatus.CANCELLED && r.getStatus() != RescueStatus.DECLINED && r.getStatus() != RescueStatus.DRAFT) {
                pendingOrdersCount++;
            }

            // Danh sách lịch sử giao dịch ví của Gara (chỉ ghi nhận các đơn đã hoàn tất thanh toán)
            if (isFinished) {
                String techName = r.getStaff() != null && r.getStaff().getUser() != null
                        ? r.getStaff().getUser().getFullName()
                        : "KTV phụ trách";
                String techAvatar = r.getStaff() != null && r.getStaff().getUser() != null
                        ? r.getStaff().getUser().getAvatarUrl()
                        : null;

                OffsetDateTime vnCreatedAt = r.getCreatedAt() != null
                        ? r.getCreatedAt().atZoneSameInstant(VN_ZONE).toOffsetDateTime()
                        : null;
                OffsetDateTime finishTime = r.getCompletedAt() != null
                        ? r.getCompletedAt().atZoneSameInstant(VN_ZONE).toOffsetDateTime()
                        : (r.getUpdatedAt() != null ? r.getUpdatedAt().atZoneSameInstant(VN_ZONE).toOffsetDateTime() : vnCreatedAt);
                String finishTimeText = formatExecutedTime(r.getCompletedAt() != null ? r.getCompletedAt() : (r.getUpdatedAt() != null ? r.getUpdatedAt() : r.getCreatedAt()));

                boolean hasDeposit = Boolean.TRUE.equals(r.getDepositRequired())
                        && ("PAID".equals(r.getDepositStatus()) || "TRANSFERRED_TO_GARAGE".equals(r.getDepositStatus()));
                long depositAmt = hasDeposit ? (r.getDepositAmount() != null && r.getDepositAmount() > 0 ? r.getDepositAmount() : 50000L) : 0L;
                long clientPaidAmt = Math.max(0L, total - depositAmt);

                // 1. Nếu đơn có cọc -> Sàn giải ngân trả 50.000đ cọc vào Ví tiền mặt Gara (Thực hiện trước tiên)
                if (hasDeposit) {
                    String depositDescription = "Sàn chuyển trả " + formatVnd(depositAmt) + " tiền cọc tạm giữ của đơn #" + (r.getCode() != null ? r.getCode() : r.getId()) + " vào ví tiền mặt Gara";
                    txns.add(GarageWalletOverviewResponse.GarageOrderTransactionResponse.builder()
                            .id(r.getId() * 1000L + 1)
                            .orderCode("#DEP-" + (r.getCode() != null ? r.getCode() : r.getId()))
                            .technicianName("Hệ thống SRAS")
                            .technicianAvatar(null)
                            .executedAtText(finishTimeText)
                            .amount(depositAmt)
                            .status("COMPLETED")
                            .serviceTitle("Hoàn trả tiền cọc đơn #" + (r.getCode() != null ? r.getCode() : r.getId()))
                            .paymentMethod("INTERNAL_TRANSFER")
                            .totalOrderAmount(depositAmt)
                            .commissionAmount(0L)
                            .commissionRate(0.0)
                            .txnType("INCOME")
                            .walletType("CASH")
                            .description(depositDescription)
                            .createdAt(finishTime)
                            .build());
                }

                if (isCash) {
                    // Đơn tiền mặt: Gara thu trực tiếp tiền mặt từ khách (đã cấn trừ tiền cọc nếu có).
                    // Hệ thống trừ hoa hồng chiết khấu từ VÍ TÍN DỤNG (Thực hiện sau cùng -> Lên trên đầu trong lịch sử).
                    String description = "Gara thu trực tiếp tiền mặt " + formatVnd(clientPaidAmt)
                            + (hasDeposit ? " (sau khi trừ " + formatVnd(depositAmt) + " cọc)" : "")
                            + " · Trừ " + (Math.round(systemRate * 1000.0) / 10.0) + "% hoa hồng từ ví tín dụng";
                    txns.add(GarageWalletOverviewResponse.GarageOrderTransactionResponse.builder()
                            .id(r.getId() * 1000L + 3)
                            .orderCode("#GRG-" + (r.getCode() != null ? r.getCode() : r.getId()))
                            .technicianName(techName)
                            .technicianAvatar(techAvatar)
                            .executedAtText(finishTimeText)
                            .amount(-sysShare)
                            .status(r.getStatus() != null ? r.getStatus().name() : "COMPLETED")
                            .serviceTitle(r.getSymptom() != null ? r.getSymptom() : "Sửa chữa & Cứu hộ")
                            .paymentMethod("CASH")
                            .totalOrderAmount(total)
                            .commissionAmount(sysShare)
                            .commissionRate(Math.round(systemRate * 1000.0) / 10.0)
                            .txnType("DEDUCTION")
                            .walletType("CREDIT")
                            .description(description)
                            .createdAt(finishTime)
                            .build());
                } else {
                    // Đơn chuyển khoản qua cổng PayOS:
                    // 1. Cộng phần tiền khách chuyển khoản qua PayOS (+clientPaidAmt) vào VÍ TIỀN MẶT (Thực hiện ở giữa).
                    boolean unverifiedPaid = isFinished && !verifiedPaidRequestIds.contains(r.getId());
                    if (!unverifiedPaid) {
                        String cashDescription = "Cộng tiền khách thanh toán qua PayOS (" + formatVnd(clientPaidAmt) + ") vào ví tiền mặt";
                        txns.add(GarageWalletOverviewResponse.GarageOrderTransactionResponse.builder()
                                .id(r.getId() * 1000L + 2)
                                .orderCode("#GRG-" + (r.getCode() != null ? r.getCode() : r.getId()))
                                .technicianName(techName)
                                .technicianAvatar(techAvatar)
                                .executedAtText(finishTimeText)
                                .amount(clientPaidAmt)
                                .status(r.getStatus() != null ? r.getStatus().name() : "COMPLETED")
                                .serviceTitle(r.getSymptom() != null ? r.getSymptom() : "Sửa chữa & Cứu hộ")
                                .paymentMethod("BANK_TRANSFER")
                                .totalOrderAmount(clientPaidAmt)
                                .commissionAmount(0L)
                                .commissionRate(0.0)
                                .txnType("INCOME")
                                .walletType("CASH")
                                .description(cashDescription)
                                .createdAt(finishTime)
                                .build());
                    }

                    // 2. Trừ hoa hồng chiết khấu (-sysShare) từ VÍ TÍN DỤNG (Thực hiện sau cùng -> Lên trên đầu trong lịch sử).
                    String creditDescription = "Trừ " + (Math.round(systemRate * 1000.0) / 10.0) + "% hoa hồng hệ thống đơn #" + r.getCode() + " từ ví tín dụng";
                    txns.add(GarageWalletOverviewResponse.GarageOrderTransactionResponse.builder()
                            .id(r.getId() * 1000L + 3)
                            .orderCode("#COMM-" + (r.getCode() != null ? r.getCode() : r.getId()))
                            .technicianName("Hệ thống SRAS")
                            .technicianAvatar(null)
                            .executedAtText(finishTimeText)
                            .amount(-sysShare)
                            .status(r.getStatus() != null ? r.getStatus().name() : "COMPLETED")
                            .serviceTitle("Phí hoa hồng đơn #" + (r.getCode() != null ? r.getCode() : r.getId()))
                            .paymentMethod("BANK_TRANSFER")
                            .totalOrderAmount(total)
                            .commissionAmount(sysShare)
                            .commissionRate(Math.round(systemRate * 1000.0) / 10.0)
                            .txnType("DEDUCTION")
                            .walletType("CREDIT")
                            .description(creditDescription)
                            .createdAt(finishTime)
                            .build());
                }
            }
        }

        if (garage != null) {
            for (WalletTransaction wt : walletTxns) {
                OffsetDateTime vnCreatedAt = wt.getCreatedAt() != null
                        ? wt.getCreatedAt().atZoneSameInstant(VN_ZONE).toOffsetDateTime()
                        : null;

                if (wt.getType() == com.sras.backend.entity.enums.WalletTxnType.TOPUP) {
                    calculatedCreditBalance += wt.getAmount();
                    txns.add(GarageWalletOverviewResponse.GarageOrderTransactionResponse.builder()
                            .id(wt.getId())
                            .orderCode("#TOPUP-" + (wt.getRefId() != null ? wt.getRefId() : wt.getId()))
                            .technicianName("Chủ Gara")
                            .technicianAvatar(null)
                            .executedAtText(formatExecutedTime(wt.getCreatedAt()))
                            .amount(wt.getAmount())
                            .status("COMPLETED")
                            .serviceTitle(wt.getDescription() != null ? wt.getDescription() : "Nạp tiền vào ví tín dụng Gara")
                            .paymentMethod("INTERNAL_TRANSFER".equals(wt.getRefType()) ? "CASH" : "BANK_TRANSFER")
                            .totalOrderAmount(wt.getAmount())
                            .commissionAmount(0L)
                            .commissionRate(0.0)
                            .txnType("TOPUP")
                            .walletType("CREDIT")
                            .description(wt.getDescription() != null ? wt.getDescription() : "Nạp tiền vào ví tín dụng")
                            .createdAt(vnCreatedAt)
                            .build());
                } else if (wt.getWalletType() == WalletType.CASH && "WITHDRAWAL".equals(wt.getRefType())) {
                    // Dòng chốt WITHDRAWAL_DONE (0đ) chỉ để đối soát, không hiển thị.
                    if (wt.getType() == WalletTxnType.WITHDRAWAL_DONE) continue;
                    boolean refund = wt.getType() == WalletTxnType.WITHDRAWAL_REFUND;
                    WithdrawalRequest w = withdrawals.get(wt.getRefId());
                    String code = w != null ? w.getTransferCode() : "RUT" + wt.getRefId();
                    txns.add(GarageWalletOverviewResponse.GarageOrderTransactionResponse.builder()
                            .id(wt.getId())
                            .orderCode("#" + code)
                            .technicianName("Chủ Gara")
                            .technicianAvatar(null)
                            .executedAtText(formatExecutedTime(wt.getCreatedAt()))
                            .amount(wt.getAmount())
                            .status(refund ? "REFUNDED" : (w != null ? w.getStatus().name() : "PAYOUT_PROCESSING"))
                            .serviceTitle(refund ? "Hoàn tiền rút thất bại" : "Rút tiền về ngân hàng")
                            .paymentMethod("BANK_TRANSFER")
                            .totalOrderAmount(Math.abs(wt.getAmount()))
                            .commissionAmount(0L)
                            .commissionRate(0.0)
                            .txnType(refund ? "WITHDRAWAL_REFUND" : "WITHDRAWAL")
                            .walletType("CASH")
                            .description(wt.getDescription())
                            .createdAt(vnCreatedAt)
                            .build());
                } else if (wt.getType() == com.sras.backend.entity.enums.WalletTxnType.COMPENSATION && wt.getWalletType() == WalletType.CASH && !"RESCUE_DEPOSIT".equals(wt.getRefType()) && wt.getAmount() != null && wt.getAmount() > 0) {
                    // Khoản tiền bồi hoàn xăng xe cộng vào ví tiền mặt Gara do khách huỷ hoặc bom đơn
                    LocalDate wtDate = wt.getCreatedAt() != null
                            ? wt.getCreatedAt().atZoneSameInstant(VN_ZONE).toLocalDate()
                            : null;
                    if (wtDate != null && wtDate.isEqual(todayVn)) {
                        todayIncome += wt.getAmount();
                        todayOrdersCount++;
                    }
                    if (wtDate != null && !wtDate.isBefore(startOfWeek) && !wtDate.isAfter(todayVn)) {
                        sevenDaysTotal += wt.getAmount();
                    }
                    distributeToChart(chartPoints, wt.getCreatedAt(), wt.getAmount(), startOfWeek, endOfWeek);
                    distributeToMonthlyChart(monthlyChart, wt.getCreatedAt(), wt.getAmount(), currentYear);
                    distributeToYearlyChart(yearlyChart, wt.getCreatedAt(), wt.getAmount());

                    String desc = wt.getDescription() != null ? wt.getDescription() : "Hệ thống hỗ trợ chi phí xăng xe";

                    txns.add(GarageWalletOverviewResponse.GarageOrderTransactionResponse.builder()
                            .id(wt.getId())
                            .orderCode("#COMP-" + (wt.getRefId() != null ? wt.getRefId() : wt.getId()))
                            .technicianName("Hệ thống SRAS")
                            .technicianAvatar(null)
                            .executedAtText(formatExecutedTime(wt.getCreatedAt()))
                            .amount(wt.getAmount())
                            .status("COMPLETED")
                            .serviceTitle("Bồi hoàn xăng xe")
                            .paymentMethod("CASH")
                            .totalOrderAmount(wt.getAmount())
                            .commissionAmount(0L)
                            .commissionRate(0.0)
                            .txnType("COMPENSATION")
                            .walletType("CASH")
                            .description(desc)
                            .createdAt(vnCreatedAt)
                            .build());
                } else if (wt.getWalletType() == WalletType.CASH && wt.getAmount() != null && wt.getAmount() > 0 && !"RESCUE_REQUEST".equals(wt.getRefType()) && !"RESCUE_DEPOSIT".equals(wt.getRefType())) {
                    // Các khoản cộng tiền khác vào ví tiền mặt (ngoài các đơn cứu hộ đã tính)
                    if (wt.getAmount() != null && wt.getAmount() > 0) {
                        LocalDate wtDate = wt.getCreatedAt() != null
                                ? wt.getCreatedAt().atZoneSameInstant(VN_ZONE).toLocalDate()
                                : null;
                        if (wtDate != null && wtDate.isEqual(todayVn)) {
                            todayIncome += wt.getAmount();
                        }
                        if (wtDate != null && !wtDate.isBefore(startOfWeek) && !wtDate.isAfter(todayVn)) {
                            sevenDaysTotal += wt.getAmount();
                        }
                        distributeToChart(chartPoints, wt.getCreatedAt(), wt.getAmount(), startOfWeek, endOfWeek);
                        distributeToMonthlyChart(monthlyChart, wt.getCreatedAt(), wt.getAmount(), currentYear);
                        distributeToYearlyChart(yearlyChart, wt.getCreatedAt(), wt.getAmount());
                    }

                    String desc = wt.getDescription() != null ? wt.getDescription() : "Cộng tiền vào ví tiền mặt";

                    txns.add(GarageWalletOverviewResponse.GarageOrderTransactionResponse.builder()
                            .id(wt.getId())
                            .orderCode("#INC-" + (wt.getRefId() != null ? wt.getRefId() : wt.getId()))
                            .technicianName("Hệ thống SRAS")
                            .technicianAvatar(null)
                            .executedAtText(formatExecutedTime(wt.getCreatedAt()))
                            .amount(wt.getAmount())
                            .status("COMPLETED")
                            .serviceTitle(wt.getDescription() != null ? wt.getDescription() : "Tiền vào ví tiền mặt")
                            .paymentMethod("CASH")
                            .totalOrderAmount(wt.getAmount())
                            .commissionAmount(0L)
                            .commissionRate(0.0)
                            .txnType("INCOME")
                            .walletType("CASH")
                            .description(desc)
                            .createdAt(vnCreatedAt)
                            .build());
                } else if (wt.getWalletType() == WalletType.CASH && wt.getAmount() != null && wt.getAmount() < 0) {
                    txns.add(GarageWalletOverviewResponse.GarageOrderTransactionResponse.builder()
                            .id(wt.getId())
                            .orderCode("#TRF-" + (wt.getRefId() != null ? wt.getRefId() : wt.getId()))
                            .technicianName("Chủ Gara")
                            .technicianAvatar(null)
                            .executedAtText(formatExecutedTime(wt.getCreatedAt()))
                            .amount(wt.getAmount())
                            .status("COMPLETED")
                            .serviceTitle(wt.getDescription() != null ? wt.getDescription() : "Chuyển tiền sang ví tín dụng")
                            .paymentMethod("CASH")
                            .totalOrderAmount(Math.abs(wt.getAmount()))
                            .commissionAmount(0L)
                            .commissionRate(0.0)
                            .txnType("DEDUCTION")
                            .walletType("CASH")
                            .description(wt.getDescription() != null ? wt.getDescription() : "Trừ tiền từ ví tiền mặt")
                            .createdAt(vnCreatedAt)
                            .build());
                }
            }
        }

        // Tự động cấn trừ nếu ví tín dụng bị âm (Hướng 2: chỉ cấn trừ khi ví tiền mặt có số dư > 0, không cho ví tiền mặt bị âm)
        if (calculatedCreditBalance < 0 && calculatedCashBalance > 0) {
            long debt = -calculatedCreditBalance;
            long autoOffset = Math.min(debt, calculatedCashBalance);
            calculatedCashBalance -= autoOffset;
            calculatedCreditBalance += autoOffset;

            OffsetDateTime nowVn = OffsetDateTime.now(VN_ZONE);
            txns.add(GarageWalletOverviewResponse.GarageOrderTransactionResponse.builder()
                    .id(System.currentTimeMillis())
                    .orderCode("#OFFSET-AUTO")
                    .technicianName("Hệ thống SRAS")
                    .technicianAvatar(null)
                    .executedAtText(formatExecutedTime(nowVn))
                    .amount(-autoOffset)
                    .status("COMPLETED")
                    .serviceTitle("Khấu trừ nợ ví tín dụng vào ví tiền mặt")
                    .paymentMethod("INTERNAL_TRANSFER")
                    .totalOrderAmount(autoOffset)
                    .commissionAmount(0L)
                    .commissionRate(0.0)
                    .txnType("DEDUCTION")
                    .walletType("CASH")
                    .description("Tự động trừ " + formatVnd(autoOffset) + " từ ví tiền mặt để bù số âm ví tín dụng")
                    .createdAt(nowVn)
                    .build());
        }

        // Sắp xếp lịch sử nhận tiền theo thời gian mới nhất trước (kết hợp ID)
        txns.sort((a, b) -> {
            if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                int cmp = b.getCreatedAt().compareTo(a.getCreatedAt());
                if (cmp != 0) return cmp;
            }
            // Trình tự nghiệp vụ khi đơn hoàn tất:
            // 1. +50k cọc (làm trước) -> 2. +PayOS (ở giữa) -> 3. -chiết khấu (làm sau cùng)
            // Lịch sử hiển thị mới nhất trên đầu: -chiết khấu -> +PayOS -> +50k cọc
            int priorityA = ("CREDIT".equals(a.getWalletType()) && a.getAmount() != null && a.getAmount() < 0) ? 3
                    : (("CASH".equals(a.getWalletType()) && a.getOrderCode() != null && !a.getOrderCode().startsWith("#DEP")) ? 2 : 1);
            int priorityB = ("CREDIT".equals(b.getWalletType()) && b.getAmount() != null && b.getAmount() < 0) ? 3
                    : (("CASH".equals(b.getWalletType()) && b.getOrderCode() != null && !b.getOrderCode().startsWith("#DEP")) ? 2 : 1);
            if (priorityA != priorityB) {
                return Integer.compare(priorityB, priorityA);
            }
            if (a.getId() != null && b.getId() != null) {
                return b.getId().compareTo(a.getId());
            }
            return 0;
        });

        // Đồng bộ số dư ví nếu cần
        if (garage != null) {
            if (garage.getCashBalance() == null || !garage.getCashBalance().equals(calculatedCashBalance)) {
                garage.setCashBalance(calculatedCashBalance);
            }
            if (garage.getCreditBalance() == null || !garage.getCreditBalance().equals(calculatedCreditBalance)) {
                garage.setCreditBalance(calculatedCreditBalance);
            }
            garageRepository.save(garage);
        }

        return GarageWalletOverviewResponse.builder()
                .cashBalance(calculatedCashBalance)
                .creditBalance(calculatedCreditBalance)
                .todayIncome(todayIncome)
                .todayOrdersCount(todayOrdersCount)
                .pendingOrdersCount(pendingOrdersCount)
                .sevenDaysTotal(sevenDaysTotal)
                .sevenDaysChart(chartPoints)
                .monthlyChart(monthlyChart)
                .yearlyChart(yearlyChart)
                .transactions(txns)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerWalletOverviewResponse getCustomerWalletOverview(User user) {
        if (user == null) {
            return CustomerWalletOverviewResponse.builder()
                    .balance(0L)
                    .totalSpent(0L)
                    .completedOrdersCount(0L)
                    .transactions(List.of())
                    .build();
        }

        List<RescueRequest> customerReqs = rescueRequestRepository.findCustomerRequestsEager(user);

        long totalSpent = 0;
        long completedCount = 0;
        List<CustomerWalletOverviewResponse.CustomerSpendingTransactionResponse> list = new ArrayList<>();

        for (RescueRequest r : customerReqs) {
            long amt = r.getTotalAmount() != null && r.getTotalAmount() > 0 ? r.getTotalAmount() : (r.getRescueFee() != null ? r.getRescueFee() : 0L);
            boolean isFinished = (r.getStatus() == RescueStatus.PAID || r.getStatus() == RescueStatus.RATED);
            if (isFinished) {
                totalSpent += amt;
                completedCount++;

                String gName = r.getGarage() != null && r.getGarage().getName() != null ? r.getGarage().getName() : "Garage Cứu Hộ SRAS";
                String orderCode = r.getCode() != null ? (r.getCode().startsWith("#") ? r.getCode() : "#" + r.getCode()) : "#REQ-" + r.getId();
                list.add(CustomerWalletOverviewResponse.CustomerSpendingTransactionResponse.builder()
                        .id(r.getId())
                        .orderCode(orderCode)
                        .serviceTitle(r.getSymptom() != null ? r.getSymptom() : "Cứu hộ khẩn cấp")
                        .garageName(gName)
                        .amount(amt)
                        .paymentMethod(r.getPaymentMethod() != null ? r.getPaymentMethod().name() : "BANK_TRANSFER")
                        .createdAtText(formatRelativeTime(r.getCreatedAt()))
                        .status(r.getStatus() != null ? r.getStatus().name() : "PAID")
                        .build());
            }
        }

        long savedDepositBalance = user.getDepositBalance() != null ? user.getDepositBalance() : 0L;
        return CustomerWalletOverviewResponse.builder()
                .balance(savedDepositBalance)
                .totalSpent(totalSpent)
                .completedOrdersCount(completedCount)
                .transactions(list)
                .build();
    }

    private String formatRelativeTime(OffsetDateTime time) {
        if (time == null) return "Vừa xong";
        long minutes = ChronoUnit.MINUTES.between(time, OffsetDateTime.now());
        if (minutes < 1) return "Vừa xong";
        if (minutes < 60) return minutes + " phút trước";
        long hours = ChronoUnit.HOURS.between(time, OffsetDateTime.now());
        if (hours < 24) return hours + " giờ trước";
        long days = ChronoUnit.DAYS.between(time, OffsetDateTime.now());
        return days + " ngày trước";
    }

    private String formatExecutedTime(OffsetDateTime time) {
        if (time == null) return "Vừa xong";
        ZonedDateTime vnTime = time.atZoneSameInstant(VN_ZONE);
        LocalDate todayVn = LocalDate.now(VN_ZONE);
        if (vnTime.toLocalDate().isEqual(todayVn)) {
            return String.format("Hôm nay, %02d:%02d", vnTime.getHour(), vnTime.getMinute());
        }
        return String.format("%02d/%02d, %02d:%02d", vnTime.getDayOfMonth(), vnTime.getMonthValue(), vnTime.getHour(), vnTime.getMinute());
    }

    private List<GarageWalletOverviewResponse.DailyRevenuePoint> init7DaysChart() {
        List<GarageWalletOverviewResponse.DailyRevenuePoint> list = new ArrayList<>();
        LocalDate todayVn = LocalDate.now(VN_ZONE);
        DayOfWeek todayDow = todayVn.getDayOfWeek();

        String[] dows = {"Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"};
        for (int i = 1; i <= 7; i++) {
            boolean isToday = (todayDow.getValue() == i);
            String label = isToday ? "H.nay" : dows[i - 1];
            list.add(GarageWalletOverviewResponse.DailyRevenuePoint.builder()
                    .dayLabel(label)
                    .amount(0L)
                    .isToday(isToday)
                    .build());
        }
        return list;
    }

    private void distributeToChart(List<GarageWalletOverviewResponse.DailyRevenuePoint> chart, OffsetDateTime dt, long amount, LocalDate startOfWeek, LocalDate endOfWeek) {
        if (dt == null) return;
        LocalDate orderDate = dt.atZoneSameInstant(VN_ZONE).toLocalDate();
        // Chỉ nhận các đơn trong TUẦN NÀY (từ Thứ 2 đến Chủ nhật của tuần này)
        if (orderDate.isBefore(startOfWeek) || orderDate.isAfter(endOfWeek)) {
            return;
        }
        int dow = orderDate.getDayOfWeek().getValue(); // 1 = Monday, 7 = Sunday
        if (dow >= 1 && dow <= chart.size()) {
            GarageWalletOverviewResponse.DailyRevenuePoint pt = chart.get(dow - 1);
            pt.setAmount(pt.getAmount() + amount);
        }
    }

    private List<GarageWalletOverviewResponse.DailyRevenuePoint> initMonthlyChart() {
        List<GarageWalletOverviewResponse.DailyRevenuePoint> list = new ArrayList<>();
        int currentMonth = LocalDate.now(VN_ZONE).getMonthValue();
        for (int m = 1; m <= 12; m++) {
            boolean isCur = (m == currentMonth);
            list.add(GarageWalletOverviewResponse.DailyRevenuePoint.builder()
                    .dayLabel("T." + m)
                    .amount(0L)
                    .isToday(isCur)
                    .build());
        }
        return list;
    }

    private List<GarageWalletOverviewResponse.DailyRevenuePoint> initYearlyChart() {
        List<GarageWalletOverviewResponse.DailyRevenuePoint> list = new ArrayList<>();
        int curYear = LocalDate.now(VN_ZONE).getYear();
        for (int y = curYear - 2; y <= curYear; y++) {
            boolean isCur = (y == curYear);
            list.add(GarageWalletOverviewResponse.DailyRevenuePoint.builder()
                    .dayLabel(String.valueOf(y))
                    .amount(0L)
                    .isToday(isCur)
                    .build());
        }
        return list;
    }

    private void distributeToMonthlyChart(List<GarageWalletOverviewResponse.DailyRevenuePoint> chart, OffsetDateTime dt, long amount, int currentYear) {
        if (dt == null) return;
        LocalDate orderDate = dt.atZoneSameInstant(VN_ZONE).toLocalDate();
        // Chỉ nhận các đơn trong NĂM NAY
        if (orderDate.getYear() != currentYear) {
            return;
        }
        int month = orderDate.getMonthValue();
        if (month >= 1 && month <= chart.size()) {
            GarageWalletOverviewResponse.DailyRevenuePoint pt = chart.get(month - 1);
            pt.setAmount(pt.getAmount() + amount);
        }
    }

    private void distributeToYearlyChart(List<GarageWalletOverviewResponse.DailyRevenuePoint> chart, OffsetDateTime dt, long amount) {
        if (dt == null) return;
        LocalDate orderDate = dt.atZoneSameInstant(VN_ZONE).toLocalDate();
        int year = orderDate.getYear();
        for (GarageWalletOverviewResponse.DailyRevenuePoint pt : chart) {
            if (pt.getDayLabel().equals(String.valueOf(year))) {
                pt.setAmount(pt.getAmount() + amount);
                break;
            }
        }
    }

    @Override
    @Transactional
    public GarageWalletOverviewResponse transferCashToCredit(User user, Long amount) {
        // Giống WithdrawalServiceImpl.assertOwnerActive: chủ gara bị khoá mà JWT còn hạn cũng không được chuyển.
        if (user == null || user.getRole() != UserRole.GARAGE_OWNER) {
            throw new AccessDeniedException("Chỉ chủ gara mới được thực hiện thao tác này");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AccessDeniedException("Tài khoản của bạn đang bị khoá");
        }
        if (amount == null || amount <= 0) {
            throw new BadRequestException("Số tiền chuyển phải lớn hơn 0");
        }
        if (amount < 10000) {
            throw new BadRequestException("Số tiền nạp tối thiểu là 10.000đ");
        }

        // Khoá dòng gara: mọi thay đổi ví tiền mặt (rút tiền, cộng tiền payOS, chuyển ví) đi qua cùng một khoá.
        Garage garage = garageRepository.findWithLockByOwner(user)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin Gara của bạn"));

        // Lấy thông tin số dư tính toán hiện tại (ví tiền mặt = tổng sổ cái CASH)
        GarageWalletOverviewResponse currentOverview = getGarageWalletOverview(user);
        long currentCash = currentOverview.getCashBalance() != null ? currentOverview.getCashBalance() : 0L;
        long currentCredit = currentOverview.getCreditBalance() != null ? currentOverview.getCreditBalance() : 0L;

        if (currentCash < amount) {
            throw new BadRequestException("Số dư ví tiền mặt (" + formatVnd(currentCash) + ") không đủ để nạp " + formatVnd(amount) + " vào ví tín dụng");
        }

        long newCash = currentCash - amount;
        long newCredit = currentCredit + amount;

        garage.setCashBalance(newCash);
        garage.setCreditBalance(newCredit);
        garageRepository.save(garage);

        long refId = System.currentTimeMillis();

        // 1. Giao dịch trừ ví tiền mặt
        WalletTransaction cashTxn = new WalletTransaction();
        cashTxn.setGarage(garage);
        cashTxn.setWalletType(WalletType.CASH);
        cashTxn.setType(WalletTxnType.ADJUSTMENT);
        cashTxn.setAmount(-amount);
        cashTxn.setBalanceAfter(newCash);
        cashTxn.setRefType("INTERNAL_TRANSFER");
        cashTxn.setRefId(refId);
        cashTxn.setDescription("Chuyển " + formatVnd(amount) + " từ ví tiền mặt sang ví tín dụng");
        cashTxn.setCreatedByUser(user);
        walletTransactionRepository.save(cashTxn);

        // 2. Giao dịch cộng ví tín dụng
        WalletTransaction creditTxn = new WalletTransaction();
        creditTxn.setGarage(garage);
        creditTxn.setWalletType(WalletType.CREDIT);
        creditTxn.setType(WalletTxnType.TOPUP);
        creditTxn.setAmount(amount);
        creditTxn.setBalanceAfter(newCredit);
        creditTxn.setRefType("INTERNAL_TRANSFER");
        creditTxn.setRefId(refId);
        creditTxn.setDescription("Nạp " + formatVnd(amount) + " vào ví tín dụng từ ví tiền mặt");
        creditTxn.setCreatedByUser(user);
        walletTransactionRepository.save(creditTxn);

        // 3. Gửi thông báo
        if (notificationService != null) {
            notificationService.createNotification(
                    user,
                    com.sras.backend.entity.enums.NotificationType.WALLET_TOPUP,
                    "Nạp ví tín dụng thành công",
                    "Bạn đã chuyển thành công " + formatVnd(amount) + " từ ví tiền mặt sang ví tín dụng.",
                    "WALLET",
                    garage.getId()
            );
        }

        return getGarageWalletOverview(user);
    }

    private String formatVnd(long amount) {
        return String.format("%,dđ", amount).replace(',', '.');
    }
}

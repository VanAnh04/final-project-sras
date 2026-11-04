package com.sras.backend.service.impl;

import com.sras.backend.dto.response.GarageWalletOverviewResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.WalletTransaction;
import com.sras.backend.entity.WithdrawalRequest;
import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.PayoutMode;
import com.sras.backend.entity.enums.RequestPaymentMethod;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.entity.enums.VehicleType;
import com.sras.backend.entity.enums.WalletTxnType;
import com.sras.backend.entity.enums.WalletType;
import com.sras.backend.entity.enums.WithdrawalStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.repository.WalletTransactionRepository;
import com.sras.backend.repository.WithdrawalRequestRepository;
import com.sras.backend.service.FinanceService;
import com.sras.backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Ví tiền mặt (số tiền rút được) = tổng sổ cái CASH. Đơn bị đặt PAID mà payOS không xác nhận (vd. /pay mock)
 * không được tính — đây là lỗ hổng cho phép rút tiền khống trước khi sửa.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import(FinanceServiceImpl.class)
class GarageWalletLedgerTest {

    @Autowired FinanceService financeService;
    @Autowired UserRepository userRepository;
    @Autowired GarageRepository garageRepository;
    @Autowired RescueRequestRepository rescueRequestRepository;
    @Autowired WalletTransactionRepository walletRepository;
    @Autowired WithdrawalRequestRepository withdrawalRepository;
    @MockBean NotificationService notificationService;

    private User owner;
    private Garage garage;

    @BeforeEach
    void setUp() {
        walletRepository.deleteAllInBatch();
        withdrawalRepository.deleteAllInBatch();
        rescueRequestRepository.deleteAllInBatch();
        garageRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();

        owner = user("0911000001", UserRole.GARAGE_OWNER);
        garage = new Garage();
        garage.setOwner(owner);
        garage.setName("Gara");
        garage.setPhone("0911000001");
        garage.setAddress("1 Test");
        garage.setLat(10.0);
        garage.setLng(106.0);
        garage.setCapability(Capability.BOTH);
        garage.setStatus(GarageStatus.APPROVED);
        garage = garageRepository.save(garage);
    }

    @Test
    void mockPaidTransferOrderIsNotCountedAsWithdrawableCash() {
        User customer = user("0911000002", UserRole.CUSTOMER);
        RescueRequest r = new RescueRequest();
        r.setCode("RQ-MOCK");
        r.setCustomer(customer);
        r.setGarage(garage);
        r.setVehicleType(VehicleType.CAR);
        r.setSymptom("Hỏng máy");
        r.setPickupLat(10.0);
        r.setPickupLng(106.0);
        r.setPaymentMethod(RequestPaymentMethod.BANK_TRANSFER);
        r.setStatus(RescueStatus.PAID); // PAID nhưng không có dòng sổ cái ⇒ chưa có đồng nào thật về
        r.setTotalAmount(5_000_000L);
        rescueRequestRepository.save(r);

        GarageWalletOverviewResponse overview = financeService.getGarageWalletOverview(owner);
        assertEquals(0L, overview.getCashBalance());
        assertFalse(overview.getTransactions().stream().anyMatch(t -> "INCOME".equals(t.getTxnType())),
                "không hiện là tiền vào ví khi payOS chưa xác nhận");
        assertThrows(BadRequestException.class, () -> financeService.transferCashToCredit(owner, 100_000L),
                "cũng không chuyển được tiền khống sang ví tín dụng");
    }

    @Test
    void cashBalanceIsTheLedgerSumAndWithdrawalRowsAreLabelled() {
        cash(WalletTxnType.ORDER_SPLIT_GARAGE, 500_000L, "RESCUE_REQUEST", 1L);
        WithdrawalRequest w = withdrawal(100_000L, WithdrawalStatus.TRANSFERRED);
        cash(WalletTxnType.WITHDRAWAL_HOLD, -100_000L, "WITHDRAWAL", w.getId());
        cash(WalletTxnType.WITHDRAWAL_DONE, 0L, "WITHDRAWAL", w.getId());
        WithdrawalRequest failed = withdrawal(50_000L, WithdrawalStatus.FAILED);
        cash(WalletTxnType.WITHDRAWAL_HOLD, -50_000L, "WITHDRAWAL", failed.getId());
        cash(WalletTxnType.WITHDRAWAL_REFUND, 50_000L, "WITHDRAWAL", failed.getId());

        GarageWalletOverviewResponse overview = financeService.getGarageWalletOverview(owner);
        assertEquals(400_000L, overview.getCashBalance(), "500k − 100k (đã chi) − 50k + 50k (hoàn)");
        assertEquals(400_000L, garageRepository.findById(garage.getId()).orElseThrow().getCashBalance());

        assertTrue(overview.getTransactions().stream().anyMatch(t ->
                ("#" + w.getTransferCode()).equals(t.getOrderCode()) && "TRANSFERRED".equals(t.getStatus())
                        && "WITHDRAWAL".equals(t.getTxnType())));
        assertTrue(overview.getTransactions().stream().anyMatch(t -> "WITHDRAWAL_REFUND".equals(t.getTxnType())));
        assertEquals(3, overview.getTransactions().stream().filter(t -> "CASH".equals(t.getWalletType())).count(),
                "2 dòng giữ tiền + 1 dòng hoàn; dòng chốt 0đ không hiện");
    }

    @Test
    void lockedOwnerOrStaffCannotMoveCashToCredit() {
        cash(WalletTxnType.ORDER_SPLIT_GARAGE, 500_000L, "RESCUE_REQUEST", 1L);

        // JWT còn hạn nhưng tài khoản đã bị khoá ⇒ không được chuyển.
        owner.setStatus(UserStatus.LOCKED);
        assertThrows(AccessDeniedException.class, () -> financeService.transferCashToCredit(owner, 100_000L));

        User staff = user("0911000004", UserRole.GARAGE_STAFF);
        assertThrows(AccessDeniedException.class, () -> financeService.transferCashToCredit(staff, 100_000L));

        owner.setStatus(UserStatus.ACTIVE);
        assertEquals(500_000L, financeService.getGarageWalletOverview(owner).getCashBalance(), "số dư không đổi");
    }

    @Test
    void userWithoutGarageCannotSeeAnyWallet() {
        User stranger = user("0911000003", UserRole.CUSTOMER);
        assertThrows(ResourceNotFoundException.class, () -> financeService.getGarageWalletOverview(stranger));
    }

    private User user(String phone, UserRole role) {
        User u = new User();
        u.setPhone(phone);
        u.setPasswordHash("x");
        u.setFullName("U " + phone);
        u.setRole(role);
        return userRepository.save(u);
    }

    private void cash(WalletTxnType type, long amount, String refType, Long refId) {
        WalletTransaction t = new WalletTransaction();
        t.setGarage(garage);
        t.setWalletType(WalletType.CASH);
        t.setType(type);
        t.setAmount(amount);
        t.setBalanceAfter(0L);
        t.setRefType(refType);
        t.setRefId(refId);
        t.setDescription(type.name());
        walletRepository.save(t);
    }

    private WithdrawalRequest withdrawal(long amount, WithdrawalStatus status) {
        WithdrawalRequest w = new WithdrawalRequest();
        w.setGarage(garage);
        w.setAmount(amount);
        w.setStatus(status);
        w.setPayoutMode(PayoutMode.AUTO);
        w.setIdempotencyKey(UUID.randomUUID().toString());
        w.setTransferCode("T" + UUID.randomUUID().toString().substring(0, 8));
        w.setBankSnapshot("Vietcombank · ****6789 · A");
        w.setBankBinSnapshot("970436");
        w.setBankAccountNumberSnapshot("0123456789");
        w = withdrawalRepository.save(w);
        w.setTransferCode("RUT" + w.getId());
        return withdrawalRepository.save(w);
    }
}

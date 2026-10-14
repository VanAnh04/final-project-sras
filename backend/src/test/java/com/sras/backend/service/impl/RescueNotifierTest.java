package com.sras.backend.service.impl;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Thông báo duyệt báo giá / hoàn thành / báo giá mới, gồm luồng kéo xe về gara (TOWING, TOW_TO_GARAGE).
 * NotificationService được giả lập nên không cần DB.
 */
class RescueNotifierTest {

    private static final long REQUEST_ID = 100L;

    private NotificationService notificationService;
    private RescueNotifier notifier;

    private User customer;
    private User owner;
    private User staffUser;
    private RescueRequest request;

    @BeforeEach
    void setUp() {
        notificationService = mock(NotificationService.class);
        notifier = new RescueNotifier(notificationService);

        customer = user(1L, "Khách A");
        owner = user(2L, "Chủ gara B");
        staffUser = user(3L, "Nhân viên C");

        Garage garage = new Garage();
        garage.setId(10L);
        garage.setOwner(owner);

        GarageStaff staff = new GarageStaff();
        staff.setId(20L);
        staff.setGarage(garage);
        staff.setUser(staffUser);

        request = new RescueRequest();
        request.setId(REQUEST_ID);
        request.setCode("RQ1");
        request.setCustomer(customer);
        request.setGarage(garage);
        request.setStaff(staff);
        request.setTotalAmount(1_250_000L);
    }

    // ─────────────────────────── Khách duyệt báo giá ───────────────────────────

    /** acceptQuote (→ REPAIRING_ONSITE / TOWING) hay advance của khách (→ TOW_TO_GARAGE) đều phải báo gara. */
    @ParameterizedTest
    @EnumSource(value = RescueStatus.class, names = {"REPAIRING_ONSITE", "TOWING", "TOW_TO_GARAGE"})
    void customerApprovingQuoteNotifiesOwnerAndStaff(RescueStatus target) {
        notifier.statusAdvanced(request, customer, target);

        verify(notificationService).createNotification(
                eq(owner), eq(NotificationType.QUOTE_RESPONDED), anyString(), anyString(), eq("RESCUE_REQUEST"), eq(REQUEST_ID));
        verify(notificationService).createNotification(
                eq(staffUser), eq(NotificationType.QUOTE_RESPONDED), anyString(), anyString(), eq("RESCUE_REQUEST"), eq(REQUEST_ID));
        verify(notificationService, never()).createNotification(eq(customer), any(), any(), any(), any(), any());
    }

    /** Gara tự chuyển sang các trạng thái này (không phải khách duyệt) thì không được báo "Khách đã duyệt". */
    @ParameterizedTest
    @EnumSource(value = RescueStatus.class, names = {"REPAIRING_ONSITE", "TOWING", "TOW_TO_GARAGE"})
    void garageSideAdvancingDoesNotReportQuoteApproval(RescueStatus target) {
        notifier.statusAdvanced(request, staffUser, target);

        verifyNoInteractions(notificationService);
    }

    @Test
    void towApprovalTellsStaffToTowTheCar() {
        notifier.statusAdvanced(request, customer, RescueStatus.TOW_TO_GARAGE);

        assertTrue(bodySentTo(staffUser, NotificationType.QUOTE_RESPONDED).contains("kéo xe về gara"));
    }

    @Test
    void onsiteApprovalTellsStaffToStartRepair() {
        notifier.statusAdvanced(request, customer, RescueStatus.REPAIRING_ONSITE);

        assertTrue(bodySentTo(staffUser, NotificationType.QUOTE_RESPONDED).contains("Bắt đầu sửa chữa"));
    }

    // ─────────────────────────── Hoàn thành & báo giá mới ───────────────────────────

    @Test
    void completedTowOrderTellsCustomerToPickUpTheCar() {
        request.setQuoteType("TOW");
        notifier.statusAdvanced(request, staffUser, RescueStatus.COMPLETED);

        assertTrue(bodySentTo(customer, NotificationType.REPAIR_DONE).contains("đến gara nhận xe"));
    }

    @Test
    void completedOnsiteOrderDoesNotMentionPickup() {
        request.setQuoteType("ONSITE");
        notifier.statusAdvanced(request, staffUser, RescueStatus.COMPLETED);

        assertFalse(bodySentTo(customer, NotificationType.REPAIR_DONE).contains("nhận xe"));
    }

    @Test
    void towQuoteIsLabelledInNewQuoteNotification() {
        request.setQuoteType("TOW");
        notifier.quoteSubmitted(request, staffUser);

        assertTrue(bodySentTo(customer, NotificationType.NEW_QUOTE).contains("kéo xe về gara"));
    }

    @Test
    void onsiteQuoteIsNotLabelledAsTow() {
        request.setQuoteType("ONSITE");
        notifier.quoteSubmitted(request, staffUser);

        assertFalse(bodySentTo(customer, NotificationType.NEW_QUOTE).contains("kéo xe"));
    }

    // ─────────────────────────── Helpers ───────────────────────────

    /** Nội dung thông báo đã gửi cho {@code recipient} với loại {@code type} (fail nếu không có đúng 1 lần). */
    private String bodySentTo(User recipient, NotificationType type) {
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(notificationService).createNotification(
                eq(recipient), eq(type), anyString(), body.capture(), anyString(), anyLong());
        return body.getValue();
    }

    private static User user(long id, String fullName) {
        User u = new User();
        u.setId(id);
        u.setFullName(fullName);
        return u;
    }
}

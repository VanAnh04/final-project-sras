package com.sras.backend.service.impl;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.RequestPaymentMethod;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.VehicleType;
import com.sras.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Locale;

/**
 * Thông báo (lưu {@code notifications} + push) cho các mốc của luồng cứu hộ. Gom toàn bộ câu chữ
 * ở một chỗ; danh mục đầy đủ xem docs/business-rules.md (mục Thông báo).
 *
 * <p>Quy tắc chung: không gửi cho chính người thực hiện hành động ({@code actor}). Được gọi bên trong
 * transaction của {@link RescueRequestServiceImpl}; push chỉ thực sự gửi sau khi commit.
 */
@Component
@RequiredArgsConstructor
public class RescueNotifier {

    static final String REF_TYPE = "RESCUE_REQUEST";

    private final NotificationService notificationService;

    // ─────────────────────────── Điều phối ───────────────────────────

    /**
     * B1 — hệ thống gửi lời mời đơn cho gara (gara chưa bật tự động nhận). Không ghi hạn nhận đơn:
     * backend chưa có job hết hạn lời mời ({@code expiresAt} chỉ được lưu).
     */
    public void offerSent(RescueRequest req, Garage garage, BigDecimal distanceKm) {
        String distance = distanceKm != null ? distanceKm.stripTrailingZeros().toPlainString() + " km" : "gần";
        notify(garage.getOwner(), null, req, NotificationType.NEW_ORDER,
                "Có yêu cầu cứu hộ mới",
                vehicleLabel(req) + " cách gara " + distance + " — " + address(req)
                        + ". Mở ứng dụng để xem và nhận đơn.");
    }

    /** A1 (+ B2 khi tự động nhận) — gara đã nhận đơn. */
    public void garageAccepted(RescueRequest req, User actor, boolean autoAccepted) {
        Garage garage = req.getGarage();
        notify(req.getCustomer(), actor, req, NotificationType.ORDER_ACCEPTED,
                "Gara đã nhận yêu cầu",
                garage.getName() + " đã nhận yêu cầu cứu hộ " + req.getCode() + " và đang sắp xếp nhân viên.");
        if (autoAccepted) {
            notify(garage.getOwner(), actor, req, NotificationType.ORDER_ACCEPTED,
                    "Đã tự động nhận đơn",
                    "Đơn " + req.getCode() + " đã được tự động nhận. Hãy gán nhân viên và xe cứu hộ.");
        }
    }

    /** A2 — hết gara trong bán kính tối đa. */
    public void noGarageFound(RescueRequest req, User actor) {
        notify(req.getCustomer(), actor, req, NotificationType.NO_GARAGE_FOUND,
                "Chưa tìm được gara",
                "Hiện không có gara phù hợp quanh vị trí của bạn cho yêu cầu " + req.getCode()
                        + ". Vui lòng thử lại sau.");
    }

    /** B3 — khách hủy đơn: báo cho các chủ gara đang giữ lời mời hoặc đã nhận đơn. */
    public void cancelledByCustomer(RescueRequest req, User customer, Collection<User> garageOwners) {
        for (User owner : garageOwners) {
            notify(owner, customer, req, NotificationType.ORDER_CANCELLED,
                    "Khách đã hủy yêu cầu",
                    "Yêu cầu " + req.getCode() + " đã bị khách hủy.");
        }
    }

    // ─────────────────────────── Thực hiện ───────────────────────────

    /** A3 + C1 — chủ gara gán nhân viên và xe. */
    public void staffAssigned(RescueRequest req, User actor) {
        User staffUser = staffUser(req);
        String plate = req.getRescueVehicle() != null ? req.getRescueVehicle().getLicensePlate() : null;
        notify(req.getCustomer(), actor, req, NotificationType.STAFF_ASSIGNED,
                "Đã có nhân viên cứu hộ",
                staffName(req) + (plate != null ? " · xe " + plate : "")
                        + " sẽ hỗ trợ bạn cho đơn " + req.getCode() + ".");

        User customer = req.getCustomer();
        String phone = req.getContactPhone() != null ? req.getContactPhone() : customer.getPhone();
        notify(staffUser, actor, req, NotificationType.TASK_ASSIGNED,
                "Bạn có nhiệm vụ cứu hộ mới",
                vehicleLabel(req) + " tại " + address(req) + ". Khách " + customer.getFullName()
                        + (phone != null ? " · " + phone : "") + ". Bấm để xem và xuất phát.");
    }

    /** A6 — nhân viên gửi (hoặc gửi lại) báo giá. */
    public void quoteSubmitted(RescueRequest req, User actor) {
        // Báo giá kéo xe về gara phải nói rõ để khách cân nhắc trước khi duyệt.
        String towNote = isTowQuote(req) ? " (đề xuất kéo xe về gara sửa chữa)" : "";
        notify(req.getCustomer(), actor, req, NotificationType.NEW_QUOTE,
                "Có báo giá sửa chữa",
                "Tổng chi phí dự kiến " + vnd(req.getTotalAmount()) + " cho đơn " + req.getCode() + towNote
                        + ". Vui lòng xem và duyệt báo giá.");
    }

    /** A4, A5, A7, B4, B5, C2 — các bước trong {@code advanceStatus}. */
    public void statusAdvanced(RescueRequest req, User actor, RescueStatus target) {
        switch (target) {
            case EN_ROUTE -> notify(req.getCustomer(), actor, req, NotificationType.STAFF_EN_ROUTE,
                    "Nhân viên đang trên đường tới",
                    staffName(req) + " đã xuất phát. Mở ứng dụng để theo dõi vị trí xe cứu hộ.");
            case ARRIVED -> notify(req.getCustomer(), actor, req, NotificationType.STAFF_ARRIVED,
                    "Nhân viên đã đến nơi",
                    staffName(req) + " đã tới vị trí của bạn và bắt đầu kiểm tra xe.");
            case REPAIRING_ONSITE, TOWING, TOW_TO_GARAGE -> {
                // Chỉ khi khách duyệt báo giá (acceptQuote, hoặc advance do khách bấm) — gara tự chuyển trạng thái thì bỏ qua.
                if (!isCustomer(req, actor)) return;
                String amount = vnd(req.getTotalAmount());
                String nextStep = target == RescueStatus.REPAIRING_ONSITE ? "Bắt đầu sửa chữa." : "Hãy kéo xe về gara.";
                notify(ownerOf(req), actor, req, NotificationType.QUOTE_RESPONDED,
                        "Khách đã duyệt báo giá",
                        "Khách đồng ý báo giá " + amount + " cho đơn " + req.getCode() + ".");
                notify(staffUser(req), actor, req, NotificationType.QUOTE_RESPONDED,
                        "Khách đã duyệt báo giá",
                        "Khách đồng ý báo giá " + amount + " cho đơn " + req.getCode() + ". " + nextStep);
            }
            case COMPLETED -> {
                String amount = vnd(req.getTotalAmount());
                String payHint = req.getPaymentMethod() == RequestPaymentMethod.BANK_TRANSFER
                        ? "Vui lòng thanh toán trong ứng dụng."
                        : "Vui lòng thanh toán tiền mặt cho nhân viên.";
                // Xe được kéo về gara sửa: khách cần biết đến gara nhận xe.
                String pickupHint = isTowQuote(req) ? " Mời bạn đến gara nhận xe." : "";
                notify(req.getCustomer(), actor, req, NotificationType.REPAIR_DONE,
                        "Đã hoàn thành cứu hộ",
                        "Đơn " + req.getCode() + " đã hoàn thành, tổng " + amount + "." + pickupHint + " " + payHint);
                notify(ownerOf(req), actor, req, NotificationType.REPAIR_DONE,
                        "Đơn đã hoàn thành",
                        staffName(req) + " đã hoàn thành đơn " + req.getCode()
                                + ", chờ khách thanh toán " + amount + ".");
            }
            default -> {
                // Các bước khác (DIAGNOSED qua advance…) không phát thông báo.
            }
        }
    }

    // ─────────────────────────── Thanh toán ───────────────────────────

    /** B6 + C3 — khách thanh toán chuyển khoản. */
    public void paidByTransfer(RescueRequest req, User customer) {
        String amount = vnd(req.getTotalAmount());
        notify(ownerOf(req), customer, req, NotificationType.PAYMENT_RECEIVED,
                "Khách đã thanh toán",
                "Đơn " + req.getCode() + " đã được thanh toán chuyển khoản " + amount + ".");
        notify(staffUser(req), customer, req, NotificationType.PAYMENT_RECEIVED,
                "Khách đã thanh toán",
                "Đơn " + req.getCode() + " đã thanh toán chuyển khoản " + amount + ". Bạn có thể nhận đơn mới.");
    }

    /** A8 + B7 (nhân viên thu) / C4 (chủ gara thu) — xác nhận thu tiền mặt. */
    public void cashConfirmed(RescueRequest req, User actor) {
        String amount = vnd(req.getTotalAmount());
        notify(req.getCustomer(), actor, req, NotificationType.PAYMENT_RECEIVED,
                "Thanh toán thành công",
                "Gara đã xác nhận nhận " + amount + " tiền mặt cho đơn " + req.getCode()
                        + ". Cảm ơn bạn đã dùng SRAS!");
        // Người bấm có thể là nhân viên khác cùng gara, không nhất thiết là nhân viên được gán.
        String collector = actor.getFullName() != null ? actor.getFullName() : staffName(req);
        notify(ownerOf(req), actor, req, NotificationType.PAYMENT_RECEIVED,
                "Nhân viên đã thu tiền mặt",
                collector + " đã thu " + amount + " tiền mặt cho đơn " + req.getCode() + ".");
        notify(staffUser(req), actor, req, NotificationType.PAYMENT_RECEIVED,
                "Đơn đã thanh toán",
                "Gara đã xác nhận thu " + amount + " tiền mặt cho đơn " + req.getCode() + ".");
    }

    // ─────────────────────────── Helpers ───────────────────────────

    private void notify(User recipient, User actor, RescueRequest req, NotificationType type, String title, String body) {
        if (recipient == null) return;
        if (actor != null && actor.getId().equals(recipient.getId())) return; // không báo cho chính mình
        notificationService.createNotification(recipient, type, title, truncate(body, 500), REF_TYPE, req.getId());
    }

    private static boolean isCustomer(RescueRequest req, User actor) {
        return actor != null && req.getCustomer() != null && req.getCustomer().getId().equals(actor.getId());
    }

    /** Báo giá kéo xe về gara (khác sửa tại chỗ). */
    private static boolean isTowQuote(RescueRequest req) {
        return "TOW".equalsIgnoreCase(req.getQuoteType());
    }

    private static User ownerOf(RescueRequest req) {
        return req.getGarage() != null ? req.getGarage().getOwner() : null;
    }

    private static User staffUser(RescueRequest req) {
        return req.getStaff() != null ? req.getStaff().getUser() : null;
    }

    private static String staffName(RescueRequest req) {
        User u = staffUser(req);
        return u != null && u.getFullName() != null ? u.getFullName() : "Nhân viên cứu hộ";
    }

    private static String vehicleLabel(RescueRequest req) {
        return req.getVehicleType() == VehicleType.MOTORBIKE ? "Xe máy" : "Ô tô";
    }

    private static String address(RescueRequest req) {
        return req.getPickupAddress() != null && !req.getPickupAddress().isBlank()
                ? req.getPickupAddress() : "vị trí của khách";
    }

    /** 1250000 → "1.250.000đ". */
    private static String vnd(Long amount) {
        long v = amount != null ? amount : 0L;
        return String.format(Locale.US, "%,d", v).replace(',', '.') + "đ";
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}

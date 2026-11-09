package com.sras.backend.service;

import com.sras.backend.dto.request.AssignStaffRequest;
import com.sras.backend.dto.request.CreateRescueRequestRequest;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.RescueStatus;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

public interface RescueRequestService {

    /** Khách gửi yêu cầu → tạo request + điều phối tới các gara gần nhất (kèm IP client). */
    RescueRequestResponse createRequest(User customer, CreateRescueRequestRequest request, HttpServletRequest httpRequest);

    default RescueRequestResponse createRequest(User customer, CreateRescueRequestRequest request) {
        return createRequest(customer, request, null);
    }

    /** Poll trạng thái (khách/gara/nhân viên liên quan). */
    RescueRequestResponse getRequest(User user, Long id);

    /** Lịch sử yêu cầu của khách (tab Hoạt động). */
    List<RescueRequestResponse> listMyRequests(User customer);

    /** Các lời mời đang chờ gara nhận. */
    List<RescueRequestResponse> listGarageOffers(User garageOwner);

    /** Đơn gara đang xử lý (ACCEPTED / ASSIGNED / EN_ROUTE / ARRIVED / TOWING / AWAITING_PAYMENT). */
    List<RescueRequestResponse> listGarageActive(User garageOwner);

    /** Lịch sử các đơn đã xử lý (COMPLETED / PAID / RATED / CANCELLED / DECLINED) của gara. */
    List<RescueRequestResponse> listGarageHistory(User garageOwner);

    /** Đơn đang được gán cho nhân viên đăng nhập (ASSIGNED / EN_ROUTE / ARRIVED); null nếu không có. */
    RescueRequestResponse getStaffActive(User staff);

    /** Lịch sử các đơn đã hoàn thành (PAID / COMPLETED) của nhân viên đăng nhập. */
    List<RescueRequestResponse> listStaffHistory(User staff);

    /** Khách huỷ yêu cầu khi còn ở SEARCHING / PENDING_GARAGE / ACCEPTED → CANCELLED. */
    RescueRequestResponse cancelByCustomer(User customer, Long requestId);

    /** Thợ cứu hộ hoặc Chủ gara báo khách bom đơn (yêu cầu chờ >= 10 phút tại hiện trường). */
    RescueRequestResponse reportBomDon(User actor, Long requestId, com.sras.backend.dto.request.ReportBomDonRequest req);

    /** Khách hàng gửi giải trình phản hồi lại cáo buộc bom đơn. */
    RescueRequestResponse customerCounterBom(User customer, Long requestId, com.sras.backend.dto.request.CustomerCounterBomRequest req);

    /** Gara đồng ý nhận yêu cầu. */
    RescueRequestResponse garageAccept(User garageOwner, Long requestId);

    /** Gara từ chối lời mời → đơn chuyển sang DECLINED. */
    RescueRequestResponse garageDecline(User garageOwner, Long requestId);

    /** Gara gán nhân viên + xe cứu hộ. */
    RescueRequestResponse assignStaff(User garageOwner, Long requestId, AssignStaffRequest request);

    /** Đẩy trạng thái tuần tự: ASSIGNED → EN_ROUTE → ARRIVED → COMPLETED. */
    RescueRequestResponse advanceStatus(User actor, Long requestId, RescueStatus target);

    /** Nhân viên/gara đẩy vị trí xe cứu hộ theo thời gian thực. */
    RescueRequestResponse updateRescuerLocation(User actor, Long requestId, double lat, double lng);

    /** Khách thanh toán chuyển khoản (mock: trừ ngân hàng kết nối) → PAID. */
    RescueRequestResponse payByTransfer(User customer, Long requestId);

    /** Nhân viên/gara xác nhận đã nhận tiền mặt → PAID. */
    RescueRequestResponse confirmCashPaid(User actor, Long requestId);

    /** Khách hàng xác nhận chọn thanh toán bằng tiền mặt trực tiếp. */
    RescueRequestResponse confirmCashChoiceByCustomer(User customer, Long requestId);

    /** Thợ gửi báo giá + ảnh minh chứng hiện trường. */
    RescueRequestResponse submitQuote(User actor, Long requestId, java.util.Map<String, Object> body);

    /** Khách hàng đồng ý duyệt báo giá → REPAIRING_ONSITE. */
    RescueRequestResponse acceptQuote(User customer, Long requestId);

    /** Khách hàng từ chối sửa chữa → chuyển sang thanh toán phí kiểm tra xe (AWAITING_PAYMENT, serviceFee=0). */
    RescueRequestResponse declineQuote(User customer, Long requestId);

    /** Thêm hạng mục sửa chữa phát sinh khi đang sửa xe tại garage hoặc tại chỗ. */
    RescueRequestResponse addRepairItem(User actor, Long requestId, com.sras.backend.dto.request.AddRepairItemRequest request);

    /** Kiểm tra xem khách hàng hoặc thiết bị máy có thuộc diện bắt buộc đặt cọc 50k chống boom đơn hay không. */
    com.sras.backend.dto.response.CheckDepositStatusResponse checkDepositRequirement(User customer, String deviceId, HttpServletRequest httpRequest);

    /** Khách hàng xác nhận đã hoàn tất nộp tiền cọc 50.000đ → kích hoạt tìm gara điều phối. */
    RescueRequestResponse confirmDepositPayment(User customer, Long requestId);

    /** Kết chuyển 50.000đ tiền cọc từ Ví tổng Hệ Thống (Sàn) sang Ví tiền mặt của Gara khi hoàn tất đơn. */
    void transferDepositToGarageIfApplicable(com.sras.backend.entity.RescueRequest req);
}

package com.sras.backend.service;

import com.sras.backend.dto.request.AssignStaffRequest;
import com.sras.backend.dto.request.CreateRescueRequestRequest;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.RescueStatus;

import java.util.List;

public interface RescueRequestService {

    /** Khách gửi yêu cầu → tạo request + điều phối tới các gara gần nhất. */
    RescueRequestResponse createRequest(User customer, CreateRescueRequestRequest request);

    /** Poll trạng thái (khách/gara/nhân viên liên quan). */
    RescueRequestResponse getRequest(User user, Long id);

    /** Lịch sử yêu cầu của khách (tab Hoạt động). */
    List<RescueRequestResponse> listMyRequests(User customer);

    /** Các lời mời đang chờ gara nhận. */
    List<RescueRequestResponse> listGarageOffers(User garageOwner);

    /** Đơn gara đang xử lý (ACCEPTED / ASSIGNED / EN_ROUTE / ARRIVED). */
    List<RescueRequestResponse> listGarageActive(User garageOwner);

    /** Đơn đang được gán cho nhân viên đăng nhập (ASSIGNED / EN_ROUTE / ARRIVED); null nếu không có. */
    RescueRequestResponse getStaffActive(User staff);

    /** Lịch sử các đơn đã hoàn thành (PAID / COMPLETED) của nhân viên đăng nhập. */
    List<RescueRequestResponse> listStaffHistory(User staff);

    /** Khách huỷ yêu cầu khi còn ở SEARCHING / PENDING_GARAGE / ACCEPTED → CANCELLED. */
    RescueRequestResponse cancelByCustomer(User customer, Long requestId);

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
    /** Nhân viên/gara xác nhận đã nhận tiền mặt → PAID. */
    RescueRequestResponse confirmCashPaid(User actor, Long requestId);

    /** Thợ gửi báo giá + ảnh minh chứng hiện trường. */
    RescueRequestResponse submitQuote(User actor, Long requestId, java.util.Map<String, Object> body);
}

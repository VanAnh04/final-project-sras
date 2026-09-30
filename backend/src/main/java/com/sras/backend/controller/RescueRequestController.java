package com.sras.backend.controller;

import com.sras.backend.dto.request.AssignStaffRequest;
import com.sras.backend.dto.request.CreateRescueRequestRequest;
import com.sras.backend.dto.request.UpdateRescuerLocationRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.RescueRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rescue-requests")
@RequiredArgsConstructor
public class RescueRequestController {

    private final RescueRequestService rescueRequestService;
    private final UserRepository userRepository;

    /** Khách gửi yêu cầu cứu hộ. */
    @PostMapping
    public ResponseEntity<ApiResponse<RescueRequestResponse>> create(
            Authentication authentication,
            @Valid @RequestBody CreateRescueRequestRequest request) {
        User user = getCurrentUser(authentication);
        RescueRequestResponse res = rescueRequestService.createRequest(user, request);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi yêu cầu cứu hộ", res));
    }

    /** Poll trạng thái một yêu cầu (màn theo dõi). */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> getOne(
            Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(rescueRequestService.getRequest(user, id)));
    }

    /** Lịch sử yêu cầu của khách (tab Hoạt động). */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<RescueRequestResponse>>> mine(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(rescueRequestService.listMyRequests(user)));
    }

    /** Danh sách lời mời đang chờ gara nhận. */
    @GetMapping("/garage/offers")
    public ResponseEntity<ApiResponse<List<RescueRequestResponse>>> garageOffers(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(rescueRequestService.listGarageOffers(user)));
    }

    /** Đơn gara đang xử lý. */
    @GetMapping("/garage/active")
    public ResponseEntity<ApiResponse<List<RescueRequestResponse>>> garageActive(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(rescueRequestService.listGarageActive(user)));
    }

    /** Đơn đang gán cho nhân viên đăng nhập (null nếu không có). */
    @GetMapping("/staff/active")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> staffActive(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(rescueRequestService.getStaffActive(user)));
    }

    /** Lịch sử đơn đã hoàn thành của nhân viên đăng nhập. */
    @GetMapping("/staff/history")
    public ResponseEntity<ApiResponse<List<RescueRequestResponse>>> staffHistory(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(rescueRequestService.listStaffHistory(user)));
    }

    /** Khách huỷ yêu cầu (khi còn SEARCHING / PENDING_GARAGE / ACCEPTED). */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> cancel(
            Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã huỷ yêu cầu", rescueRequestService.cancelByCustomer(user, id)));
    }

    /** Gara đồng ý nhận. */
    @PostMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> accept(
            Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã nhận yêu cầu", rescueRequestService.garageAccept(user, id)));
    }

    /** Gara từ chối lời mời → đơn chuyển sang "đã từ chối". */
    @PostMapping("/{id}/decline")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> decline(
            Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối yêu cầu", rescueRequestService.garageDecline(user, id)));
    }

    /** Gara gán nhân viên + xe cứu hộ. */
    @PostMapping("/{id}/assign-staff")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> assignStaff(
            Authentication authentication, @PathVariable Long id,
            @Valid @RequestBody AssignStaffRequest request) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã gán nhân viên", rescueRequestService.assignStaff(user, id, request)));
    }

    /** Nhân viên/gara đẩy vị trí xe cứu hộ theo thời gian thực. */
    @PostMapping("/{id}/location")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> updateLocation(
            Authentication authentication, @PathVariable Long id,
            @Valid @RequestBody UpdateRescuerLocationRequest request) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                rescueRequestService.updateRescuerLocation(user, id, request.getLat(), request.getLng())));
    }

    /** Khách thanh toán chuyển khoản (mock trừ ngân hàng kết nối) → PAID. */
    @PostMapping("/{id}/pay")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> pay(
            Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã thanh toán", rescueRequestService.payByTransfer(user, id)));
    }

    /** Nhân viên/gara xác nhận đã nhận tiền mặt → PAID. */
    @PostMapping("/{id}/confirm-cash")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> confirmCash(
            Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận thu tiền mặt", rescueRequestService.confirmCashPaid(user, id)));
    }

    /** Đẩy trạng thái: EN_ROUTE / ARRIVED / COMPLETED. */
    @PostMapping("/{id}/status")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> advance(
            Authentication authentication, @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        User user = getCurrentUser(authentication);
        String raw = body.get("status");
        if (raw == null) {
            throw new BadRequestException("Thiếu trạng thái mục tiêu");
        }
        RescueStatus target;
        try {
            target = RescueStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + raw);
        }
        return ResponseEntity.ok(ApiResponse.success(rescueRequestService.advanceStatus(user, id, target)));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}

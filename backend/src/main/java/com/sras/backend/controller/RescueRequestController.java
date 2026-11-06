package com.sras.backend.controller;

import com.sras.backend.dto.request.AssignStaffRequest;
import com.sras.backend.dto.request.CreateRescueRequestRequest;
import com.sras.backend.dto.request.SendMessageRequest;
import com.sras.backend.dto.request.UpdateRescuerLocationRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.ChatMessageResponse;
import com.sras.backend.dto.response.ConversationResponse;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.ChatService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rescue-requests")
@RequiredArgsConstructor
public class RescueRequestController {

    private final RescueRequestService rescueRequestService;
    private final ChatService chatService;
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

    /** Lịch sử các đơn đã xử lý của gara (hoàn thành, đã thanh toán, huỷ, từ chối). */
    @GetMapping("/garage/history")
    public ResponseEntity<ApiResponse<List<RescueRequestResponse>>> garageHistory(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(rescueRequestService.listGarageHistory(user)));
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

    /** Thợ hoặc Gara báo khách bom đơn (chờ >= 10 phút tại hiện trường). */
    @PostMapping("/{id}/report-bom")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> reportBom(
            Authentication authentication,
            @PathVariable Long id,
            @jakarta.validation.Valid @RequestBody com.sras.backend.dto.request.ReportBomDonRequest req) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận báo bom đơn", rescueRequestService.reportBomDon(user, id, req)));
    }

    /** Khách hàng gửi phản hồi giải trình lại cáo buộc bom đơn. */
    @PostMapping("/{id}/counter-bom")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> counterBom(
            Authentication authentication,
            @PathVariable Long id,
            @jakarta.validation.Valid @RequestBody com.sras.backend.dto.request.CustomerCounterBomRequest req) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi phản hồi giải trình thành công", rescueRequestService.customerCounterBom(user, id, req)));
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

    /** Khách hàng xác nhận chọn thanh toán bằng tiền mặt trực tiếp cho nhân viên. */
    @PostMapping("/{id}/select-cash")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> selectCash(
            Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận thanh toán tiền mặt", rescueRequestService.confirmCashChoiceByCustomer(user, id)));
    }

    /** Khách hàng đồng ý duyệt báo giá → bắt đầu sửa chữa tại chỗ. */
    @PostMapping("/{id}/accept-quote")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> acceptQuote(
            Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã đồng ý báo giá", rescueRequestService.acceptQuote(user, id)));
    }

    /** Khách hàng từ chối sửa chữa → chuyển sang thanh toán phí kiểm tra xe. */
    @PostMapping("/{id}/decline-quote")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> declineQuote(
            Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối sửa chữa", rescueRequestService.declineQuote(user, id)));
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

    /** Thợ gửi báo giá + ảnh minh chứng hiện trường tới khách. */
    @PostMapping("/{id}/quote")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> submitQuote(
            Authentication authentication, @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi báo giá tới khách hàng",
                rescueRequestService.submitQuote(user, id, body != null ? body : Map.of())));
    }

    /** Thợ bổ sung hạng mục sửa chữa phát sinh (tại garage hoặc tại chỗ). */
    @PostMapping("/{id}/add-item")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> addRepairItem(
            Authentication authentication, @PathVariable Long id,
            @Valid @RequestBody com.sras.backend.dto.request.AddRepairItemRequest request) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã thêm hạng mục sửa chữa phát sinh",
                rescueRequestService.addRepairItem(user, id, request)));
    }

    // ─────────────────────────── Chat 1-1 theo đơn ───────────────────────────

    /** Hộp thư: danh sách hội thoại của người dùng hiện tại (mỗi đơn × đối phương một dòng). */
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationResponse>>> conversations(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(chatService.listConversations(user)));
    }

    /** Danh sách gợi ý liên hệ: Chủ gara, Nhân viên cứu hộ, Khách hàng kèm trạng thái Online/Offline. */
    @GetMapping("/chat-contacts")
    public ResponseEntity<ApiResponse<List<com.sras.backend.dto.response.ChatContactResponse>>> suggestedContacts(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(chatService.getSuggestedContacts(user)));
    }

    /** Gửi tin nhắn tới đối phương (peer = CUSTOMER / GARAGE / STAFF). */
    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
            Authentication authentication, @PathVariable Long id,
            @Valid @RequestBody SendMessageRequest request) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(chatService.sendMessage(user, id, request)));
    }

    /** Lịch sử tin nhắn giữa người dùng hiện tại và đối phương (peer = CUSTOMER / GARAGE / STAFF). */
    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(
            Authentication authentication, @PathVariable Long id,
            @RequestParam String peer) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(chatService.getThread(user, id, peer)));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}

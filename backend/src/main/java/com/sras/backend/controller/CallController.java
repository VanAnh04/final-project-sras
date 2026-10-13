package com.sras.backend.controller;

import com.sras.backend.dto.request.CallSignalRequest;
import com.sras.backend.dto.request.EndCallRequest;
import com.sras.backend.dto.request.StartCallRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.CallResponse;
import com.sras.backend.dto.response.IceServerResponse;
import com.sras.backend.entity.User;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.CallService;
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

/**
 * Gọi thoại trong app. Client gửi báo hiệu bằng các endpoint này; server đẩy sự kiện {@code CALL_*}
 * xuống qua WebSocket {@code /ws/chat}. Tất cả đều cần đăng nhập.
 */
@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;
    private final UserRepository userRepository;

    /** Bắt đầu gọi cho đối phương trong đơn (peer = CUSTOMER / GARAGE / STAFF). */
    @PostMapping
    public ResponseEntity<ApiResponse<CallResponse>> start(
            Authentication authentication, @Valid @RequestBody StartCallRequest request) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(callService.start(user, request)));
    }

    /** Người nhận nghe máy. */
    @PostMapping("/{id:\\d+}/accept")
    public ResponseEntity<ApiResponse<CallResponse>> accept(Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(callService.accept(user, id)));
    }

    /** Người nhận từ chối. */
    @PostMapping("/{id:\\d+}/reject")
    public ResponseEntity<ApiResponse<CallResponse>> reject(Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(callService.reject(user, id)));
    }

    /** Một trong hai bên kết thúc (hoặc người gọi hủy khi đang đổ chuông). Body có thể bỏ trống. */
    @PostMapping("/{id:\\d+}/end")
    public ResponseEntity<ApiResponse<CallResponse>> end(
            Authentication authentication, @PathVariable Long id,
            @RequestBody(required = false) EndCallRequest body) {
        User user = getCurrentUser(authentication);
        boolean failed = body != null && Boolean.TRUE.equals(body.getFailed());
        return ResponseEntity.ok(ApiResponse.success(callService.end(user, id, failed)));
    }

    /** Chuyển tiếp OFFER / ANSWER cho bên còn lại. */
    @PostMapping("/{id:\\d+}/signal")
    public ResponseEntity<ApiResponse<Void>> signal(
            Authentication authentication, @PathVariable Long id,
            @Valid @RequestBody CallSignalRequest request) {
        User user = getCurrentUser(authentication);
        callService.signal(user, id, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /** Cuộc gọi đang đổ chuông / đang diễn ra của người dùng (data = null nếu không có). */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<CallResponse>> active(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(callService.getActive(user)));
    }

    /** Cấu hình STUN/TURN cho RTCPeerConnection. */
    @GetMapping("/ice-servers")
    public ResponseEntity<ApiResponse<List<IceServerResponse>>> iceServers(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(callService.iceServers(user)));
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<CallResponse>> getOne(Authentication authentication, @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(callService.get(user, id)));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}

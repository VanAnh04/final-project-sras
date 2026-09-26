package com.sras.backend.controller;

import com.sras.backend.dto.request.ChatMessageRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.ChatMessageResponse;
import com.sras.backend.dto.response.ConversationResponse;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.entity.User;
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

@RestController
@RequestMapping("/api/rescue-requests")
@RequiredArgsConstructor
public class RescueRequestController {

    private final RescueRequestService rescueRequestService;
    private final UserRepository userRepository;

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<RescueRequestResponse>>> getMyRescueRequests(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        List<RescueRequestResponse> responses = rescueRequestService.getMyRescueRequests(currentUser);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn cứu hộ cá nhân thành công", responses));
    }

    @GetMapping("/assigned")
    public ResponseEntity<ApiResponse<List<RescueRequestResponse>>> getAssignedRescueRequests(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        List<RescueRequestResponse> responses = rescueRequestService.getAssignedRescueRequests(currentUser);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn cứu hộ được phân công thành công", responses));
    }

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationResponse>>> getConversations(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        List<ConversationResponse> conversations = rescueRequestService.getConversations(currentUser);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cuộc hội thoại thành công", conversations));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> getRescueRequestById(
            Authentication authentication,
            @PathVariable Long id) {
        User currentUser = getCurrentUser(authentication);
        RescueRequestResponse response = rescueRequestService.getRescueRequestById(id, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết đơn cứu hộ thành công", response));
    }

    @GetMapping("/active/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getActiveRescueRequestMessages(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        List<ChatMessageResponse> messages = rescueRequestService.getRescueRequestMessages(null, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tin nhắn đơn đang xử lý thành công", messages));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getRescueRequestMessages(
            Authentication authentication,
            @PathVariable Long id) {
        User currentUser = getCurrentUser(authentication);
        List<ChatMessageResponse> messages = rescueRequestService.getRescueRequestMessages(id, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tin nhắn đơn cứu hộ thành công", messages));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendRescueRequestMessage(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody ChatMessageRequest request) {
        User currentUser = getCurrentUser(authentication);
        ChatMessageResponse response = rescueRequestService.sendRescueRequestMessage(id, request.getContent(), currentUser);
        return ResponseEntity.ok(ApiResponse.success("Gửi tin nhắn thành công", response));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}

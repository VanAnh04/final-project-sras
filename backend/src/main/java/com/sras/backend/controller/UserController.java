package com.sras.backend.controller;

import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.AuditLogResponse;
import com.sras.backend.dto.response.UserResponse;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import com.sras.backend.dto.request.UserWarningRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAllUsers(
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase("ASC")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<UserResponse> users = userService.getUsersFiltered(status, role, search, pageable);

        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách người dùng thành công", users));
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getSimpleUserList() {
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tất cả người dùng thành công", users));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Long id) {
        UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable Long id,
            @RequestParam UserStatus status
    ) {
        UserResponse updatedUser = userService.updateUserStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái người dùng thành công", updatedUser));
    }

    @PostMapping("/warn")
    public ResponseEntity<ApiResponse<Void>> sendUserWarning(@RequestBody UserWarningRequest request) {
        userService.sendUserWarning(request);
        return ResponseEntity.ok(ApiResponse.success("Gửi cảnh báo người dùng thành công", null));
    }

    @GetMapping("/{id}/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getUserAuditLogs(@PathVariable Long id) {
        List<AuditLogResponse> logs = userService.getUserAuditLogs(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy nhật ký hoạt động người dùng thành công", logs));
    }
}

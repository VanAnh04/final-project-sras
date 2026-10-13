package com.sras.backend.controller;

import com.sras.backend.dto.request.CreateComplaintRequest;
import com.sras.backend.dto.request.ResolveComplaintRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.ComplaintResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.ComplaintStatus;
import com.sras.backend.entity.enums.ComplaintTargetType;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.ComplaintService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser(String principal) {
        return userRepository.findByPhone(principal)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplaintResponse>> createComplaint(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody CreateComplaintRequest request) {
        User user = getAuthenticatedUser(principal);
        ComplaintResponse response = complaintService.createComplaint(user, request);
        return ResponseEntity.ok(ApiResponse.success("Gửi khiếu nại thành công", response));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> getMyComplaints(
            @AuthenticationPrincipal String principal) {
        User user = getAuthenticatedUser(principal);
        List<ComplaintResponse> list = complaintService.getMyComplaints(user);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/garage/{garageId}")
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> getGarageComplaints(
            @PathVariable Long garageId) {
        List<ComplaintResponse> list = complaintService.getComplaintsByGarage(garageId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/request/{requestId}")
    public ResponseEntity<ApiResponse<ComplaintResponse>> getComplaintByRequest(
            @PathVariable Long requestId) {
        ComplaintResponse response = complaintService.getComplaintByRequest(requestId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }


    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ComplaintResponse>>> getAdminComplaints(
            @RequestParam(value = "status", required = false) ComplaintStatus status,
            @RequestParam(value = "targetType", required = false) ComplaintTargetType targetType,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        Page<ComplaintResponse> result = complaintService.getAdminComplaints(status, targetType, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ComplaintResponse>> getComplaintDetail(
            @PathVariable Long id) {
        ComplaintResponse response = complaintService.getComplaintDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/admin/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ComplaintResponse>> resolveComplaint(
            @AuthenticationPrincipal String principal,
            @PathVariable Long id,
            @Valid @RequestBody ResolveComplaintRequest request) {
        User adminUser = getAuthenticatedUser(principal);
        ComplaintResponse response = complaintService.resolveComplaint(adminUser, id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật xử lý khiếu nại thành công", response));
    }
}

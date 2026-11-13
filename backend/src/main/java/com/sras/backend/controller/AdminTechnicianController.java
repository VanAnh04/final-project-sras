package com.sras.backend.controller;

import com.sras.backend.dto.request.AddGarageStaffRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.GarageStaffResponse;
import com.sras.backend.entity.enums.WorkStatus;
import com.sras.backend.service.GarageStaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/technicians")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminTechnicianController {

    private final GarageStaffService garageStaffService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<GarageStaffResponse>>> getTechnicians(
            @RequestParam(required = false) Long garageId,
            @RequestParam(required = false) WorkStatus status,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<GarageStaffResponse> result = garageStaffService.getStaffForAdmin(garageId, status, isActive, keyword, pageRequest);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách kỹ thuật viên thành công", result));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getStats() {
        Map<String, Long> stats = garageStaffService.getStaffStatsForAdmin();
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê kỹ thuật viên thành công", stats));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GarageStaffResponse>> getTechnicianById(@PathVariable Long id) {
        GarageStaffResponse response = garageStaffService.getStaffDetailForAdmin(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết kỹ thuật viên thành công", response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<GarageStaffResponse>> addTechnician(
            @RequestParam Long garageId,
            @Valid @RequestBody AddGarageStaffRequest request) {
        GarageStaffResponse response = garageStaffService.addStaffForAdmin(garageId, request);
        return ResponseEntity.ok(ApiResponse.success("Thêm kỹ thuật viên thành công", response));
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<ApiResponse<GarageStaffResponse>> toggleActive(@PathVariable Long id) {
        GarageStaffResponse response = garageStaffService.toggleStaffActiveForAdmin(id);
        String msg = Boolean.TRUE.equals(response.getIsActive())
                ? "Đã kích hoạt kỹ thuật viên hoạt động"
                : "Đã tạm dừng hoạt động kỹ thuật viên";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PatchMapping("/{id}/reassign")
    public ResponseEntity<ApiResponse<GarageStaffResponse>> reassignGarage(
            @PathVariable Long id,
            @RequestBody Map<String, Long> payload) {
        Long newGarageId = payload.get("garageId");
        if (newGarageId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Vui lòng chọn Gara mới"));
        }
        GarageStaffResponse response = garageStaffService.reassignGarageForAdmin(id, newGarageId);
        return ResponseEntity.ok(ApiResponse.success("Điều chuyển Gara cho kỹ thuật viên thành công", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> removeTechnician(@PathVariable Long id) {
        garageStaffService.removeStaffForAdmin(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa kỹ thuật viên khỏi Gara thành công", null));
    }
}

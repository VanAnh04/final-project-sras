package com.sras.backend.controller;

import com.sras.backend.dto.request.GarageReviewRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.GarageResponse;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.service.GarageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/garages")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminGarageController {

    private final GarageService garageService;
    private final GarageRepository garageRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<GarageResponse>>> getGarages(
            @RequestParam(required = false) GarageStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<GarageResponse> result = garageService.getGarages(status, keyword, pageRequest);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách Gara thành công", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GarageResponse>> getGarageById(@PathVariable Long id) {
        GarageResponse response = garageService.getGarageById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết Gara thành công", response));
    }

    @PutMapping("/{id}/review")
    public ResponseEntity<ApiResponse<GarageResponse>> reviewGarage(
            @PathVariable Long id,
            @Valid @RequestBody GarageReviewRequest request) {
        GarageResponse response = garageService.reviewGarage(id, request);
        String msg = request.getStatus() == GarageStatus.APPROVED 
                ? "Đã phê duyệt Gara thành công" 
                : (request.getStatus() == GarageStatus.REJECTED ? "Đã từ chối hồ sơ Gara" : "Đã cập nhật trạng thái Gara");
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getGarageStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("PENDING", garageRepository.countByStatus(GarageStatus.PENDING));
        stats.put("APPROVED", garageRepository.countByStatus(GarageStatus.APPROVED));
        stats.put("SUSPENDED", garageRepository.countByStatus(GarageStatus.SUSPENDED));
        stats.put("REJECTED", garageRepository.countByStatus(GarageStatus.REJECTED));
        stats.put("TOTAL", garageRepository.count());
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê thành công", stats));
    }
}
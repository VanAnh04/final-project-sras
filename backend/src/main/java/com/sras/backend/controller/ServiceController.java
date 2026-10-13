package com.sras.backend.controller;

import com.sras.backend.dto.request.ServiceRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.ServiceImportResponse;
import com.sras.backend.dto.response.ServiceResponse;
import com.sras.backend.service.ServiceExcelService;
import com.sras.backend.service.ServiceManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceController {

    private final ServiceManagementService serviceManagementService;
    private final ServiceExcelService serviceExcelService;

    @GetMapping("/import-template")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        byte[] excelBytes = serviceExcelService.generateTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"mau_nhap_dich_vu_sras.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportServices(
            @RequestParam(required = false) Long categoryId
    ) {
        byte[] excelBytes = serviceExcelService.exportServicesToExcel(categoryId);
        String timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "danh_sach_menu_dich_vu_" + timestamp + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @PostMapping("/import")
    public ResponseEntity<ApiResponse<ServiceImportResponse>> importServices(
            @RequestParam("file") MultipartFile file
    ) {
        ServiceImportResponse response = serviceExcelService.importServicesFromExcel(file);
        String message = String.format("Nhập dữ liệu hoàn tất! Thành công: %d/%d dòng. Bị lỗi hoặc trùng: %d dòng.",
                response.getSuccessCount(), response.getTotalRows(), response.getFailureCount());
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ServiceResponse>>> getAllServices(
            @RequestParam(required = false) Long categoryId
    ) {
        List<ServiceResponse> services = serviceManagementService.getAllServices(categoryId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách dịch vụ và khung giá thành công", services));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceResponse>> getServiceById(@PathVariable Long id) {
        ServiceResponse service = serviceManagementService.getServiceById(id);
        return ResponseEntity.ok(ApiResponse.success(service));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ServiceResponse>> createService(@RequestBody ServiceRequest request) {
        ServiceResponse created = serviceManagementService.createService(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo dịch vụ và khung giá thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceResponse>> updateService(
            @PathVariable Long id,
            @RequestBody ServiceRequest request
    ) {
        ServiceResponse updated = serviceManagementService.updateService(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật dịch vụ và khung giá thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteService(@PathVariable Long id) {
        serviceManagementService.deleteService(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa dịch vụ thành công", null));
    }
}

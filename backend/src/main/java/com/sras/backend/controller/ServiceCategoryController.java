package com.sras.backend.controller;

import com.sras.backend.dto.request.ServiceCategoryRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.ServiceCategoryResponse;
import com.sras.backend.service.ServiceCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/service-categories")
@RequiredArgsConstructor
public class ServiceCategoryController {

    private final ServiceCategoryService serviceCategoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ServiceCategoryResponse>>> getAllCategories() {
        List<ServiceCategoryResponse> list = serviceCategoryService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách danh mục dịch vụ thành công", list));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ServiceCategoryResponse>> createCategory(@RequestBody ServiceCategoryRequest request) {
        ServiceCategoryResponse created = serviceCategoryService.createCategory(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo danh mục dịch vụ thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceCategoryResponse>> updateCategory(
            @PathVariable Long id,
            @RequestBody ServiceCategoryRequest request
    ) {
        ServiceCategoryResponse updated = serviceCategoryService.updateCategory(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật danh mục dịch vụ thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        serviceCategoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa danh mục dịch vụ thành công", null));
    }
}

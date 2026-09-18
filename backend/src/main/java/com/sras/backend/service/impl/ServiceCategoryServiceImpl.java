package com.sras.backend.service.impl;

import com.sras.backend.dto.request.ServiceCategoryRequest;
import com.sras.backend.dto.response.ServiceCategoryResponse;
import com.sras.backend.entity.ServiceCategory;
import com.sras.backend.entity.enums.Capability;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.ServiceCategoryRepository;
import com.sras.backend.service.ServiceCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceCategoryServiceImpl implements ServiceCategoryService {

    private final ServiceCategoryRepository serviceCategoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ServiceCategoryResponse> getAllCategories() {
        return serviceCategoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(ServiceCategoryResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public ServiceCategoryResponse createCategory(ServiceCategoryRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Tên danh mục không được để trống");
        }
        if (request.getCode() == null || request.getCode().isBlank()) {
            throw new IllegalArgumentException("Mã danh mục không được để trống");
        }
        if (serviceCategoryRepository.existsByCode(request.getCode().trim().toUpperCase())) {
            throw new IllegalArgumentException("Mã danh mục đã tồn tại: " + request.getCode());
        }

        ServiceCategory category = new ServiceCategory();
        category.setName(request.getName().trim());
        category.setCode(request.getCode().trim().toUpperCase());
        category.setVehicleType(request.getVehicleType() != null ? request.getVehicleType() : Capability.BOTH);
        category.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);
        category.setIsActive(true);

        ServiceCategory saved = serviceCategoryRepository.save(category);
        return ServiceCategoryResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public ServiceCategoryResponse updateCategory(Long id, ServiceCategoryRequest request) {
        ServiceCategory category = serviceCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));

        if (request.getName() != null && !request.getName().isBlank()) {
            category.setName(request.getName().trim());
        }
        if (request.getVehicleType() != null) {
            category.setVehicleType(request.getVehicleType());
        }
        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder());
        }

        ServiceCategory saved = serviceCategoryRepository.save(category);
        return ServiceCategoryResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        ServiceCategory category = serviceCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
        serviceCategoryRepository.delete(category);
    }
}

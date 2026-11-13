package com.sras.backend.service;

import com.sras.backend.dto.request.ServiceCategoryRequest;
import com.sras.backend.dto.response.ServiceCategoryResponse;

import java.util.List;

public interface ServiceCategoryService {
    List<ServiceCategoryResponse> getAllCategories();
    ServiceCategoryResponse createCategory(ServiceCategoryRequest request);
    ServiceCategoryResponse updateCategory(Long id, ServiceCategoryRequest request);
    void deleteCategory(Long id);
}

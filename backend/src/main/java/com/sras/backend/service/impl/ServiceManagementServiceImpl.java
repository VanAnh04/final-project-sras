package com.sras.backend.service.impl;

import com.sras.backend.dto.request.ServiceRequest;
import com.sras.backend.dto.response.ServiceResponse;
import com.sras.backend.entity.Service;
import com.sras.backend.entity.ServiceCategory;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.ServiceCategoryRepository;
import com.sras.backend.repository.ServiceRepository;
import com.sras.backend.service.ServiceManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ServiceManagementServiceImpl implements ServiceManagementService {

    private final ServiceRepository serviceRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ServiceResponse> getAllServices(Long categoryId) {
        List<Service> services;
        if (categoryId != null) {
            services = serviceRepository.findByCategoryId(categoryId);
        } else {
            services = serviceRepository.findAll();
        }
        return services.stream().map(ServiceResponse::fromEntity).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ServiceResponse getServiceById(Long id) {
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với ID: " + id));
        return ServiceResponse.fromEntity(service);
    }

    @Override
    @Transactional
    public ServiceResponse createService(ServiceRequest request) {
        validateServiceRequest(request, true);

        ServiceCategory category = serviceCategoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + request.getCategoryId()));

        Service service = new Service();
        service.setCategory(category);
        service.setName(request.getName().trim());
        service.setCode(request.getCode().trim().toUpperCase());
        service.setFeeType(request.getFeeType());
        service.setMinPrice(request.getMinPrice());
        service.setMaxPrice(request.getMaxPrice());
        service.setUnit(request.getUnit());
        service.setIsActive(true);

        Service saved = serviceRepository.save(service);
        return ServiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public ServiceResponse updateService(Long id, ServiceRequest request) {
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với ID: " + id));

        validateServiceRequest(request, false);

        if (request.getCategoryId() != null) {
            ServiceCategory category = serviceCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + request.getCategoryId()));
            service.setCategory(category);
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            service.setName(request.getName().trim());
        }

        if (request.getFeeType() != null) {
            service.setFeeType(request.getFeeType());
        }

        if (request.getUnit() != null) {
            service.setUnit(request.getUnit());
        }

        if (request.getMinPrice() != null) {
            service.setMinPrice(request.getMinPrice());
        }

        if (request.getMaxPrice() != null) {
            service.setMaxPrice(request.getMaxPrice());
        }

        if (service.getMinPrice() != null && service.getMaxPrice() != null && service.getMinPrice() > service.getMaxPrice()) {
            throw new IllegalArgumentException("Giá tối thiểu (" + service.getMinPrice() + " ₫) không được lớn hơn giá tối đa (" + service.getMaxPrice() + " ₫)");
        }

        Service saved = serviceRepository.save(service);
        return ServiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public void deleteService(Long id) {
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với ID: " + id));
        serviceRepository.delete(service);
    }

    private void validateServiceRequest(ServiceRequest request, boolean isCreate) {
        if (isCreate) {
            if (request.getCategoryId() == null) {
                throw new IllegalArgumentException("Danh mục dịch vụ không được để trống");
            }
            if (request.getName() == null || request.getName().isBlank()) {
                throw new IllegalArgumentException("Tên dịch vụ không được để trống");
            }
            if (request.getCode() == null || request.getCode().isBlank()) {
                throw new IllegalArgumentException("Mã dịch vụ không được để trống");
            }
            if (serviceRepository.existsByCode(request.getCode().trim().toUpperCase())) {
                throw new IllegalArgumentException("Mã dịch vụ đã tồn tại trong hệ thống: " + request.getCode());
            }
            if (request.getFeeType() == null) {
                throw new IllegalArgumentException("Loại phí dịch vụ (FeeType) không được để trống");
            }
            if (request.getUnit() == null) {
                throw new IllegalArgumentException("Đơn vị tính (ServiceUnit) không được để trống");
            }
        }

        if (request.getMinPrice() != null && request.getMinPrice() < 0) {
            throw new IllegalArgumentException("Giá tối thiểu không được âm");
        }

        if (request.getMaxPrice() != null && request.getMaxPrice() < 0) {
            throw new IllegalArgumentException("Giá tối đa không được âm");
        }

        if (request.getMinPrice() != null && request.getMaxPrice() != null && request.getMinPrice() > request.getMaxPrice()) {
            throw new IllegalArgumentException("Giá tối thiểu (" + request.getMinPrice() + " ₫) không được lớn hơn giá tối đa (" + request.getMaxPrice() + " ₫)");
        }
    }
}

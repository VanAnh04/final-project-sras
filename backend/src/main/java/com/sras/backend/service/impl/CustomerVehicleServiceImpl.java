package com.sras.backend.service.impl;

import com.sras.backend.dto.request.CreateCustomerVehicleRequest;
import com.sras.backend.dto.response.CustomerVehicleResponse;
import com.sras.backend.entity.CustomerVehicle;
import com.sras.backend.entity.User;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.CustomerVehicleRepository;
import com.sras.backend.service.CustomerVehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerVehicleServiceImpl implements CustomerVehicleService {

    private final CustomerVehicleRepository customerVehicleRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CustomerVehicleResponse> listMine(User customer) {
        return customerVehicleRepository.findByCustomerAndIsDeletedFalse(customer)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public CustomerVehicleResponse create(User customer, CreateCustomerVehicleRequest request) {
        List<CustomerVehicle> existingVehicles = customerVehicleRepository.findByCustomerAndIsDeletedFalse(customer);
        boolean isDefault = Boolean.TRUE.equals(request.getIsDefault()) || existingVehicles.isEmpty();

        if (isDefault) {
            for (CustomerVehicle v : existingVehicles) {
                if (Boolean.TRUE.equals(v.getIsDefault())) {
                    v.setIsDefault(false);
                    customerVehicleRepository.save(v);
                }
            }
        }

        CustomerVehicle v = new CustomerVehicle();
        v.setCustomer(customer);
        v.setVehicleType(request.getVehicleType());
        v.setBrand(request.getBrand().trim());
        v.setModel(request.getModel() != null && !request.getModel().isBlank() ? request.getModel().trim() : null);
        v.setLicensePlate(request.getLicensePlate() != null && !request.getLicensePlate().isBlank() ? request.getLicensePlate().trim().toUpperCase() : null);
        v.setColor(request.getColor() != null && !request.getColor().isBlank() ? request.getColor().trim() : null);
        v.setYear(request.getYear());
        v.setPhotoUrl(request.getPhotoUrl() != null && !request.getPhotoUrl().isBlank() ? request.getPhotoUrl().trim() : null);
        v.setIsDefault(isDefault);

        CustomerVehicle saved = customerVehicleRepository.save(v);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public CustomerVehicleResponse update(User customer, Long id, CreateCustomerVehicleRequest request) {
        CustomerVehicle vehicle = customerVehicleRepository.findByIdAndCustomerAndIsDeletedFalse(id, customer)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phương tiện hoặc bạn không có quyền sửa"));

        if (Boolean.TRUE.equals(request.getIsDefault())) {
            List<CustomerVehicle> existingVehicles = customerVehicleRepository.findByCustomerAndIsDeletedFalse(customer);
            for (CustomerVehicle v : existingVehicles) {
                if (!v.getId().equals(id) && Boolean.TRUE.equals(v.getIsDefault())) {
                    v.setIsDefault(false);
                    customerVehicleRepository.save(v);
                }
            }
            vehicle.setIsDefault(true);
        } else if (request.getIsDefault() != null) {
            vehicle.setIsDefault(request.getIsDefault());
        }

        if (request.getVehicleType() != null) {
            vehicle.setVehicleType(request.getVehicleType());
        }
        if (request.getBrand() != null && !request.getBrand().isBlank()) {
            vehicle.setBrand(request.getBrand().trim());
        }
        if (request.getModel() != null) {
            vehicle.setModel(request.getModel().isBlank() ? null : request.getModel().trim());
        }
        if (request.getLicensePlate() != null) {
            vehicle.setLicensePlate(request.getLicensePlate().isBlank() ? null : request.getLicensePlate().trim().toUpperCase());
        }
        if (request.getColor() != null) {
            vehicle.setColor(request.getColor().isBlank() ? null : request.getColor().trim());
        }
        if (request.getYear() != null) {
            vehicle.setYear(request.getYear());
        }
        if (request.getPhotoUrl() != null) {
            vehicle.setPhotoUrl(request.getPhotoUrl().isBlank() ? null : request.getPhotoUrl().trim());
        }

        CustomerVehicle saved = customerVehicleRepository.save(vehicle);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(User customer, Long id) {
        CustomerVehicle vehicle = customerVehicleRepository.findByIdAndCustomerAndIsDeletedFalse(id, customer)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phương tiện hoặc bạn không có quyền xóa"));

        vehicle.setIsDeleted(true);
        customerVehicleRepository.save(vehicle);
    }

    private CustomerVehicleResponse toResponse(CustomerVehicle v) {
        return CustomerVehicleResponse.builder()
                .id(v.getId())
                .vehicleType(v.getVehicleType() != null ? v.getVehicleType().name() : null)
                .brand(v.getBrand())
                .model(v.getModel())
                .licensePlate(v.getLicensePlate())
                .color(v.getColor())
                .year(v.getYear())
                .photoUrl(v.getPhotoUrl())
                .isDefault(v.getIsDefault())
                .build();
    }
}

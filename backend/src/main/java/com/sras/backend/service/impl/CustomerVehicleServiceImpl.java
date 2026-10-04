package com.sras.backend.service.impl;

import com.sras.backend.dto.response.CustomerVehicleResponse;
import com.sras.backend.entity.CustomerVehicle;
import com.sras.backend.entity.User;
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

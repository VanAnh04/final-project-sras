package com.sras.backend.service;

import com.sras.backend.dto.request.ServiceRequest;
import com.sras.backend.dto.response.ServiceResponse;

import java.util.List;

public interface ServiceManagementService {
    List<ServiceResponse> getAllServices(Long categoryId);
    ServiceResponse getServiceById(Long id);
    ServiceResponse createService(ServiceRequest request);
    ServiceResponse updateService(Long id, ServiceRequest request);
    void deleteService(Long id);
}

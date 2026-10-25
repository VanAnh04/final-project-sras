package com.sras.backend.service;

import com.sras.backend.dto.request.CreateCustomerVehicleRequest;
import com.sras.backend.dto.response.CustomerVehicleResponse;
import com.sras.backend.entity.User;

import java.util.List;

public interface CustomerVehicleService {

    /** Danh sách xe đã lưu của khách (chưa xoá). */
    List<CustomerVehicleResponse> listMine(User customer);

    /** Thêm mới xe vào gara cá nhân của khách. */
    CustomerVehicleResponse create(User customer, CreateCustomerVehicleRequest request);

    /** Cập nhật thông tin xe đã lưu. */
    CustomerVehicleResponse update(User customer, Long id, CreateCustomerVehicleRequest request);

    /** Xóa mềm xe khỏi danh sách của khách. */
    void delete(User customer, Long id);
}

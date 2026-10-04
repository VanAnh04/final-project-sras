package com.sras.backend.service;

import com.sras.backend.dto.response.CustomerVehicleResponse;
import com.sras.backend.entity.User;

import java.util.List;

public interface CustomerVehicleService {

    /** Danh sách xe đã lưu của khách (chưa xoá). */
    List<CustomerVehicleResponse> listMine(User customer);
}

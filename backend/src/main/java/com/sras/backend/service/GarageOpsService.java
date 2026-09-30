package com.sras.backend.service;

import com.sras.backend.dto.request.CreateRescueVehicleRequest;
import com.sras.backend.dto.response.GarageStaffResponse;
import com.sras.backend.dto.response.RescueVehicleResponse;
import com.sras.backend.entity.User;

import java.util.List;

/** Quản lý xe cứu hộ và vận hành của gara. */
public interface GarageOpsService {

    List<GarageStaffResponse> listStaff(User owner);

    List<RescueVehicleResponse> listVehicles(User owner);

    RescueVehicleResponse createVehicle(User owner, CreateRescueVehicleRequest request);
}

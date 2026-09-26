package com.sras.backend.service;

import com.sras.backend.dto.request.CreateGarageStaffRequest;
import com.sras.backend.dto.request.CreateRescueVehicleRequest;
import com.sras.backend.dto.response.GarageStaffResponse;
import com.sras.backend.dto.response.RescueVehicleResponse;
import com.sras.backend.entity.User;

import java.util.List;

/** Quản lý nhân viên + xe cứu hộ của gara (phục vụ điều phối). */
public interface GarageOpsService {

    List<GarageStaffResponse> listStaff(User owner);

    GarageStaffResponse createStaff(User owner, CreateGarageStaffRequest request);

    List<RescueVehicleResponse> listVehicles(User owner);

    RescueVehicleResponse createVehicle(User owner, CreateRescueVehicleRequest request);
}

package com.sras.backend.service;

import com.sras.backend.dto.request.RegisterDeviceTokenRequest;
import com.sras.backend.entity.User;

public interface DeviceTokenService {
    void register(User user, RegisterDeviceTokenRequest req);
    void unregister(User user, String token);
    /** Vô hiệu token khi Expo báo thiết bị không còn nhận push (gỡ app / thu hồi quyền). */
    void deactivate(String token);
}

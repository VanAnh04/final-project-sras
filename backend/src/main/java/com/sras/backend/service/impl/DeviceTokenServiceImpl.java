package com.sras.backend.service.impl;

import com.sras.backend.dto.request.RegisterDeviceTokenRequest;
import com.sras.backend.entity.DeviceToken;
import com.sras.backend.entity.User;
import com.sras.backend.repository.DeviceTokenRepository;
import com.sras.backend.service.DeviceTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceTokenServiceImpl implements DeviceTokenService {

    private final DeviceTokenRepository deviceTokenRepository;

    @Override
    @Transactional
    public void register(User user, RegisterDeviceTokenRequest req) {
        String token = req.getToken().trim();
        // Token là duy nhất theo máy: máy đổi tài khoản thì chuyển token sang user mới,
        // để người dùng cũ không còn nhận push trên máy này.
        DeviceToken dt = deviceTokenRepository.findByFcmToken(token).orElseGet(DeviceToken::new);
        dt.setUser(user);
        dt.setFcmToken(token);
        dt.setPlatform(req.getPlatform());
        dt.setLastUsedAt(OffsetDateTime.now());
        dt.setIsDeleted(false);
        deviceTokenRepository.save(dt);
        log.info("Device token registered for user {} ({})", user.getId(), req.getPlatform());
    }

    @Override
    @Transactional
    public void unregister(User user, String token) {
        if (token == null || token.isBlank()) return;
        deviceTokenRepository.findByFcmToken(token.trim()).ifPresent(dt -> {
            if (dt.getUser().getId().equals(user.getId())) {
                dt.setIsDeleted(true);
                deviceTokenRepository.save(dt);
            }
        });
    }

    @Override
    @Transactional
    public void deactivate(String token) {
        deviceTokenRepository.findByFcmToken(token).ifPresent(dt -> {
            dt.setIsDeleted(true);
            deviceTokenRepository.save(dt);
        });
    }
}

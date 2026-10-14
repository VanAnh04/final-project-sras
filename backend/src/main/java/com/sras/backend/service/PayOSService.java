package com.sras.backend.service;

import com.sras.backend.dto.response.CreatePayOSPaymentResponse;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.dto.response.StaffWalletResponse;
import com.sras.backend.entity.User;

import java.util.Map;

public interface PayOSService {
    CreatePayOSPaymentResponse createPaymentLink(User customer, Long requestId);

    RescueRequestResponse checkPaymentStatus(User user, Long orderCode);

    void processWebhook(Map<String, Object> webhookData);

    CreatePayOSPaymentResponse createStaffTopupLink(User staffUser, Long amount);

    StaffWalletResponse checkStaffTopupStatus(User staffUser, Long orderCode);
}

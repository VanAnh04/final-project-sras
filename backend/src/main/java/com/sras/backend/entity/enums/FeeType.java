package com.sras.backend.entity.enums;

/**
 * Fee bucket on {@code services.fee_type}: ① rescue, ② towing, ③ service.
 * Commission applies only to ① and ② (DEC-11).
 */
public enum FeeType {
    RESCUE_FEE,
    TOWING_FEE,
    SERVICE_FEE
}

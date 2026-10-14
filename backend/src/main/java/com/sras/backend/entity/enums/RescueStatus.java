package com.sras.backend.entity.enums;

/**
 * The 17-value lifecycle of a rescue request ({@code rescue_requests.status}).
 * State machine: ARCHITECTURE.md §6.
 */
public enum RescueStatus {
    DRAFT,
    SEARCHING,
    PENDING_GARAGE,
    NO_GARAGE_FOUND,
    ACCEPTED,
    ASSIGNED,
    EN_ROUTE,
    ARRIVED,
    DIAGNOSED,
    REPAIRING_ONSITE,
    TOWING,
    TOW_TO_GARAGE,
    DECLINED,
    COMPLETED,
    AWAITING_PAYMENT,
    PAID,
    RATED,
    CANCELLED
}

package com.sras.backend.entity.enums;

/** Dispatch offer lifecycle on {@code dispatch_offers.status}. */
public enum OfferStatus {
    PENDING,
    SENT,
    ACCEPTED,
    REJECTED,
    TIMEOUT,
    SKIPPED
}

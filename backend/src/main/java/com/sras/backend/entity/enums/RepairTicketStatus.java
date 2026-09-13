package com.sras.backend.entity.enums;

/** The 7-value lifecycle of a workshop repair ticket ({@code repair_tickets.status}). */
public enum RepairTicketStatus {
    RECEIVED,
    INSPECTING,
    QUOTED,
    REPAIRING,
    QUOTE_REJECTED,
    DONE,
    DELIVERED
}

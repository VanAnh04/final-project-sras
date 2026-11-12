package com.sras.backend.service.payout;

/**
 * Lệnh chi gửi cổng. Dựng HOÀN TOÀN từ các cột snapshot của {@code withdrawal_requests} — cấm đọc lại bảng
 * {@code garages}: gara đổi STK giữa chừng thì tiền đi tới người khác, Napas không đảo lệnh được.
 */
public record PayoutCommand(String referenceId, long amount, String description, String toBin, String toAccountNumber) {
}

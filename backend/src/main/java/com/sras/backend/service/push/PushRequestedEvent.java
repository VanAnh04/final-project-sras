package com.sras.backend.service.push;

import java.util.Map;

/**
 * Yêu cầu gửi push cho 1 người dùng. Chỉ chứa giá trị nguyên thủy (không giữ entity) vì được
 * xử lý ở thread khác sau khi transaction commit.
 *
 * @param notificationId id dòng {@code notifications} tương ứng; null nếu push không lưu thông báo (chat, cuộc gọi)
 * @param data           payload điều hướng gửi kèm cho app (type, refType, refId...)
 * @param ttlSeconds     thời gian Expo giữ push chờ giao (giây); null = mặc định của Expo
 */
public record PushRequestedEvent(Long userId, Long notificationId, String title, String body,
                                 Map<String, Object> data, Integer ttlSeconds) {
}

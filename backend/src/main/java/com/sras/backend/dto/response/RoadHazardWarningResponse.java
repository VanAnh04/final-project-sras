package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoadHazardWarningResponse {
    /** true nếu phát hiện đoạn đường này khách từng gặp sự cố >= 2 lần */
    private boolean hasWarning;

    /** Tên con đường hoặc khu vực */
    private String roadName;

    /** Số lần xe đã từng gặp sự cố tại đây (chỉ cảnh báo khi >= 2) */
    private int incidentCount;

    /** Danh sách tóm tắt các lần sự cố trước đó */
    private List<PastIncidentSummary> pastIncidents;

    /** Thông điệp cảnh báo chủ động từ AI */
    private String aiWarningMessage;

    /** Lời khuyên phòng ngừa an toàn tức thì */
    private List<String> safetyRecommendations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PastIncidentSummary {
        private String date;
        private String issueType;
        private String issueTypeName;
        private String vehicleName;
        private String symptom;
    }
}


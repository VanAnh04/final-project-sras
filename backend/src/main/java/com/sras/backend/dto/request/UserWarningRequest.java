package com.sras.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UserWarningRequest {
    private Long userId;
    private List<Long> userIds;
    private String title;
    private String content;
}

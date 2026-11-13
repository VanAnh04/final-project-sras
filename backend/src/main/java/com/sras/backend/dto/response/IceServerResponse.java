package com.sras.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Một máy chủ STUN/TURN — đúng cấu trúc {@code RTCIceServer} của WebRTC. STUN không cần
 * {@code username}/{@code credential} nên các trường null được bỏ khỏi JSON.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class IceServerResponse {

    private List<String> urls;
    private String username;
    private String credential;
}

package com.sras.backend.service;

import com.sras.backend.dto.request.CallSignalRequest;
import com.sras.backend.dto.request.StartCallRequest;
import com.sras.backend.dto.response.CallResponse;
import com.sras.backend.dto.response.IceServerResponse;
import com.sras.backend.entity.User;

import java.util.List;

/**
 * Gọi thoại trong app giữa hai người cùng tham gia một đơn cứu hộ. Server chỉ làm báo hiệu (signaling):
 * quản lý vòng đời cuộc gọi và chuyển tiếp SDP; âm thanh đi thẳng P2P giữa hai máy (WebRTC).
 */
public interface CallService {

    CallResponse start(User caller, StartCallRequest req);

    CallResponse accept(User user, Long callId);

    CallResponse reject(User user, Long callId);

    /** {@code failed = true}: client tự kết thúc vì mất kết nối / lỗi micro → ghi nhận FAILED. */
    CallResponse end(User user, Long callId, boolean failed);

    /** Chuyển tiếp OFFER / ANSWER cho bên còn lại. */
    void signal(User user, Long callId, CallSignalRequest req);

    /** Cuộc gọi đang RINGING / ONGOING của người dùng; null nếu không có. */
    CallResponse getActive(User user);

    CallResponse get(User user, Long callId);

    /** Cấu hình STUN/TURN cho {@code RTCPeerConnection}; TURN dùng credential ngắn hạn riêng cho người dùng. */
    List<IceServerResponse> iceServers(User user);

    // ── Chỉ CallSweeper gọi ──

    /** RINGING → MISSED (đổ chuông quá hạn). */
    void expireRinging(Long callId);

    /** ONGOING → FAILED (một bên mất kết nối quá hạn). */
    void failOngoing(Long callId);

    /** Server vừa khởi động: mọi cuộc gọi RINGING / ONGOING còn sót (từ lần chạy trước) → FAILED. */
    void failAllActiveOnStartup();
}

package com.sras.backend.service.impl;

import com.sras.backend.dto.response.IceServerResponse;
import com.sras.backend.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Cấu hình STUN/TURN backend cấp cho client — không cần DB hay Spring context. */
class CallServiceIceServersTest {

    private CallServiceImpl service;
    private User user;

    @BeforeEach
    void setUp() {
        // iceServers() không dùng repository / websocket / push nên các phụ thuộc có thể để null.
        service = new CallServiceImpl(null, null, null, null, null);
        ReflectionTestUtils.setField(service, "stunUrls", "stun:stun.l.google.com:19302");
        ReflectionTestUtils.setField(service, "turnUrls", "");
        ReflectionTestUtils.setField(service, "turnUsername", "");
        ReflectionTestUtils.setField(service, "turnCredential", "");
        ReflectionTestUtils.setField(service, "turnSecret", "");
        ReflectionTestUtils.setField(service, "turnTtlSeconds", 3600L);
        user = new User();
        user.setId(42L);
    }

    @Test
    void stunOnlyWhenNoTurnConfigured() {
        List<IceServerResponse> servers = service.iceServers(user);

        assertEquals(1, servers.size());
        assertEquals(List.of("stun:stun.l.google.com:19302"), servers.get(0).getUrls());
        assertNull(servers.get(0).getUsername());
        assertNull(servers.get(0).getCredential());
    }

    @Test
    void emptyWhenNothingConfigured() {
        ReflectionTestUtils.setField(service, "stunUrls", "  ");
        assertTrue(service.iceServers(user).isEmpty());
    }

    @Test
    void urlListsAreSplitAndTrimmed() {
        ReflectionTestUtils.setField(service, "stunUrls", "stun:a:3478 , stun:b:3478,, ");
        ReflectionTestUtils.setField(service, "turnUrls", " turn:t:3478?transport=udp , turns:t:443?transport=tcp ");
        ReflectionTestUtils.setField(service, "turnUsername", "u");
        ReflectionTestUtils.setField(service, "turnCredential", "c");

        List<IceServerResponse> servers = service.iceServers(user);

        assertEquals(List.of("stun:a:3478", "stun:b:3478"), servers.get(0).getUrls());
        assertEquals(List.of("turn:t:3478?transport=udp", "turns:t:443?transport=tcp"), servers.get(1).getUrls());
    }

    @Test
    void turnWithSecretGetsShortLivedHmacCredential() throws Exception {
        ReflectionTestUtils.setField(service, "turnUrls", "turn:t:3478");
        ReflectionTestUtils.setField(service, "turnSecret", "bi-mat-dung-chung-voi-coturn");

        long before = Instant.now().getEpochSecond();
        IceServerResponse turn = service.iceServers(user).get(1);
        long after = Instant.now().getEpochSecond();

        String[] parts = turn.getUsername().split(":");
        assertEquals(2, parts.length);
        assertEquals("42", parts[1], "username kết thúc bằng userId");
        long expiresAt = Long.parseLong(parts[0]);
        assertTrue(expiresAt >= before + 3600 && expiresAt <= after + 3600, "hạn = bây giờ + ttl");

        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec("bi-mat-dung-chung-voi-coturn".getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
        String expected = Base64.getEncoder().encodeToString(mac.doFinal(turn.getUsername().getBytes(StandardCharsets.UTF_8)));
        assertEquals(expected, turn.getCredential());
    }

    @Test
    void turnWithoutSecretUsesStaticCredential() {
        ReflectionTestUtils.setField(service, "turnUrls", "turn:t:3478");
        ReflectionTestUtils.setField(service, "turnUsername", "tai-khoan");
        ReflectionTestUtils.setField(service, "turnCredential", "mat-khau");

        IceServerResponse turn = service.iceServers(user).get(1);

        assertEquals("tai-khoan", turn.getUsername());
        assertEquals("mat-khau", turn.getCredential());
    }

    @Test
    void secretTakesPrecedenceOverStaticCredential() {
        ReflectionTestUtils.setField(service, "turnUrls", "turn:t:3478");
        ReflectionTestUtils.setField(service, "turnSecret", "s");
        ReflectionTestUtils.setField(service, "turnUsername", "tai-khoan");
        ReflectionTestUtils.setField(service, "turnCredential", "mat-khau");

        IceServerResponse turn = service.iceServers(user).get(1);

        assertTrue(turn.getUsername().endsWith(":42"));
    }
}

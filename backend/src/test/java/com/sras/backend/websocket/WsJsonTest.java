package com.sras.backend.websocket;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WsJsonTest {

    @Test
    void strEscapesQuoteBackslashAndLineBreaks() {
        // SDP của WebRTC có \r\n — phải escape đúng để client JSON.parse ra nguyên văn.
        assertEquals("\"a\\\"b\\\\c\\r\\n\\t\"", WsJson.str("a\"b\\c\r\n\t"));
    }

    @Test
    void strEscapesOtherControlCharactersAsUnicode() {
        assertEquals("\"\\u0001\"", WsJson.str("\u0001"));
    }

    @Test
    void strKeepsVietnameseText() {
        assertEquals("\"Cuộc gọi đến từ Trần Văn Khách\"", WsJson.str("Cuộc gọi đến từ Trần Văn Khách"));
    }

    @Test
    void nullBecomesJsonNull() {
        assertEquals("null", WsJson.str(null));
        assertEquals("null", WsJson.num(null));
        assertEquals("null", WsJson.bool(null));
    }

    @Test
    void numAndBool() {
        assertEquals("55", WsJson.num(55L));
        assertEquals("83", WsJson.num(83));
        assertEquals("true", WsJson.bool(true));
        assertEquals("false", WsJson.bool(false));
    }
}

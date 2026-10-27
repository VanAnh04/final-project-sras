package com.sras.backend.service.payout;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Hai kiểu ký của payOS: webhook thanh toán (không URL-encode) và payout (URL-encode, sắp key đệ quy).
 * Ký sai là tiền vào giả được chấp nhận, hoặc lệnh chi thật bị cổng từ chối — nên kiểm từng quy tắc.
 */
class PayOSSignatureTest {

    private static final String KEY = "checksum-key-test";

    // ───────────────────────────── Webhook thanh toán ─────────────────────────────

    @Test
    void paymentStringSortsKeysAndBlanksNullLikeValues() {
        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", 123);
        data.put("amount", 3000);
        data.put("description", "SRAS chuyen tien");
        data.put("counterAccountName", null);
        data.put("virtualAccountName", "null");
        data.put("reference", "undefined");

        assertEquals("amount=3000&counterAccountName=&description=SRAS chuyen tien&orderCode=123&reference=&virtualAccountName=",
                PayOSSignature.paymentDataString(data));
    }

    @Test
    void paymentStringSerializesArraysAsJsonWithSortedKeys() {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("quantity", 1);
        item.put("name", "A");
        Map<String, Object> data = new HashMap<>();
        data.put("items", List.of(item));

        assertEquals("items=[{\"name\":\"A\",\"quantity\":1}]", PayOSSignature.paymentDataString(data));
    }

    @Test
    void validWebhookSignatureIsAccepted() {
        Map<String, Object> payload = signedWebhook(webhookData(), KEY);
        assertTrue(PayOSSignature.verifyPaymentWebhook(payload, KEY));
    }

    @Test
    void tamperedWebhookIsRejected() {
        Map<String, Object> payload = signedWebhook(webhookData(), KEY);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) payload.get("data");
        data.put("amount", 999_999_999);
        assertFalse(PayOSSignature.verifyPaymentWebhook(payload, KEY));
    }

    @Test
    void webhookWithoutSignatureOrKeyIsRejected() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("data", webhookData());
        assertFalse(PayOSSignature.verifyPaymentWebhook(payload, KEY), "thiếu signature");

        Map<String, Object> signed = signedWebhook(webhookData(), KEY);
        assertFalse(PayOSSignature.verifyPaymentWebhook(signed, ""), "checksum key trống thì không tin webhook nào");
        assertFalse(PayOSSignature.verifyPaymentWebhook(signed, "other-key"), "ký bằng key khác");
    }

    // ───────────────────────────────── Payout ─────────────────────────────────

    @Test
    void payoutStringUrlEncodesWithPercent20() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("referenceId", "ref-1");
        body.put("amount", 10000L);
        body.put("description", "SRAS RUT1");
        body.put("toBin", "970436");
        body.put("toAccountNumber", "0123456789");

        assertEquals("amount=10000&description=SRAS%20RUT1&referenceId=ref-1&toAccountNumber=0123456789&toBin=970436",
                PayOSSignature.payoutDataString(body));
    }

    @Test
    void payoutStringSortsNestedObjectsAndEncodesJson() {
        Map<String, Object> tx = new LinkedHashMap<>();
        tx.put("state", "SUCCEEDED");
        tx.put("amount", 10000);
        List<Object> txs = new ArrayList<>();
        txs.add(tx);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("transactions", txs);
        data.put("id", "p1");
        data.put("category", null);

        // JSON {"amount":10000,"state":"SUCCEEDED"} được sắp key rồi URL-encode toàn bộ.
        assertEquals("category=&id=p1&transactions=%5B%7B%22amount%22%3A10000%2C%22state%22%3A%22SUCCEEDED%22%7D%5D",
                PayOSSignature.payoutDataString(data));
    }

    @Test
    void payoutSignatureMatchesHmacOfCanonicalString() {
        Map<String, Object> body = Map.of("amount", 10000L, "referenceId", "ref-1");
        String expected = PayOSSignature.hmacSha256Hex(KEY, "amount=10000&referenceId=ref-1");
        assertEquals(expected, PayOSSignature.signPayout(body, KEY));
        assertTrue(PayOSSignature.verifyPayout(body, expected, KEY));
        assertTrue(PayOSSignature.verifyPayout(body, expected.toUpperCase(), KEY), "hex không phân biệt hoa thường");
        assertFalse(PayOSSignature.verifyPayout(Map.of("amount", 10001L, "referenceId", "ref-1"), expected, KEY));
        assertFalse(PayOSSignature.verifyPayout(body, null, KEY));
    }

    @Test
    void paymentAndPayoutSchemesAreNotInterchangeable() {
        Map<String, Object> data = Map.of("description", "SRAS RUT1");
        assertNotEquals(PayOSSignature.paymentDataString(data), PayOSSignature.payoutDataString(data));
    }

    @Test
    void hmacIsLowercaseHexOf32Bytes() {
        String sig = PayOSSignature.hmacSha256Hex(KEY, "abc");
        assertEquals(64, sig.length());
        assertEquals(sig.toLowerCase(), sig);
    }

    static Map<String, Object> webhookData() {
        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", 1730000000000L);
        data.put("amount", 150000);
        data.put("description", "SRAS chuyen tien sua xe");
        data.put("accountNumber", "12345678");
        data.put("reference", "FT123");
        data.put("transactionDateTime", "2026-10-27 10:00:00");
        data.put("currency", "VND");
        data.put("paymentLinkId", "plink");
        data.put("code", "00");
        data.put("desc", "success");
        data.put("counterAccountBankId", "");
        data.put("counterAccountName", null);
        return data;
    }

    static Map<String, Object> signedWebhook(Map<String, Object> data, String key) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("code", "00");
        payload.put("desc", "success");
        payload.put("success", true);
        payload.put("data", data);
        payload.put("signature", PayOSSignature.hmacSha256Hex(key, PayOSSignature.paymentDataString(data)));
        return payload;
    }
}

package com.sras.backend.service.payout;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.config.PayoutProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Kênh chi payOS: request phải ký đúng + mang idempotency key; mọi phản hồi mơ hồ (timeout, 5xx, sai chữ ký,
 * sai key) đều phải ra UNKNOWN — tuyệt đối không ra FAILED, vì FAILED là hoàn tiền mà tiền có thể đã đi.
 */
class PayOSPayoutGatewayTest {

    private static final String CHECKSUM = "payout-checksum";
    private static final String BASE = "https://api-merchant.payos.vn";

    private final ObjectMapper mapper = new ObjectMapper();
    private PayoutProperties props;
    private MockRestServiceServer server;
    private PayOSPayoutGateway gateway;

    @BeforeEach
    void setUp() {
        props = new PayoutProperties();
        props.getPayos().setClientId("client-1");
        props.getPayos().setApiKey("api-1");
        props.getPayos().setChecksumKey(CHECKSUM);
        RestTemplate rt = new RestTemplate();
        server = MockRestServiceServer.bindTo(rt).build();
        gateway = new PayOSPayoutGateway(props, rt);
    }

    private static PayoutCommand command() {
        return new PayoutCommand("ref-123", 150_000L, "SRAS RUT7", "970436", "0123456789");
    }

    @Test
    void createSignsBodyAndSendsIdempotencyKey() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("referenceId", "ref-123");
        body.put("amount", 150_000L);
        body.put("description", "SRAS RUT7");
        body.put("toBin", "970436");
        body.put("toAccountNumber", "0123456789");
        String expectedSig = PayOSSignature.signPayout(body, CHECKSUM);

        server.expect(requestTo(BASE + "/v1/payouts"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("x-client-id", "client-1"))
                .andExpect(header("x-api-key", "api-1"))
                .andExpect(header("x-idempotency-key", "ref-123"))
                .andExpect(header("x-signature", expectedSig))
                .andExpect(jsonPath("$.toAccountNumber").value("0123456789"))
                .andExpect(jsonPath("$.amount").value(150000))
                .andRespond(signed(payout("p1", "PROCESSING", "PROCESSING", null)));

        PayoutResult r = gateway.create(command());
        assertEquals(PayoutResult.Outcome.PROCESSING, r.outcome());
        assertEquals("p1", r.providerPayoutId());
        server.verify();
    }

    @Test
    void succeededTransactionMapsToSucceededWithAccountName() throws Exception {
        server.expect(requestTo(BASE + "/v1/payouts/p1"))
                .andRespond(signed(payout("p1", "COMPLETED", "SUCCEEDED", "NGUYEN VAN A")));
        PayoutResult r = gateway.get("p1");
        assertEquals(PayoutResult.Outcome.SUCCEEDED, r.outcome());
        assertEquals("NGUYEN VAN A", r.toAccountName());
    }

    @Test
    void failedOrRejectedMapsToFailed() throws Exception {
        server.expect(requestTo(BASE + "/v1/payouts/p1")).andRespond(signed(payout("p1", "PROCESSING", "FAILED", null)));
        assertEquals(PayoutResult.Outcome.FAILED, gateway.get("p1").outcome());
        server.reset();
        server.expect(requestTo(BASE + "/v1/payouts/p1")).andRespond(signed(payout("p1", "REJECTED", "", null)));
        assertEquals(PayoutResult.Outcome.FAILED, gateway.get("p1").outcome());
    }

    @Test
    void reversedIsNeverTreatedAsSuccessOrFailure() throws Exception {
        server.expect(requestTo(BASE + "/v1/payouts/p1")).andRespond(signed(payout("p1", "COMPLETED", "REVERSED", null)));
        assertEquals(PayoutResult.Outcome.REVERSED, gateway.get("p1").outcome());
    }

    @Test
    void wrongResponseSignatureIsUnknown() throws Exception {
        String json = mapper.writeValueAsString(Map.of("code", "00", "desc", "ok", "data", payout("p1", "COMPLETED", "SUCCEEDED", null)));
        HttpHeaders h = new HttpHeaders();
        h.set("x-signature", "deadbeef");
        server.expect(requestTo(BASE + "/v1/payouts/p1"))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON).headers(h));
        assertEquals(PayoutResult.Outcome.UNKNOWN, gateway.get("p1").outcome());
    }

    @Test
    void missingResponseSignatureIsUnknown() throws Exception {
        String json = mapper.writeValueAsString(Map.of("code", "00", "desc", "ok", "data", payout("p1", "COMPLETED", "SUCCEEDED", null)));
        server.expect(requestTo(BASE + "/v1/payouts/p1")).andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
        assertEquals(PayoutResult.Outcome.UNKNOWN, gateway.get("p1").outcome());
    }

    @Test
    void timeoutOnCreateIsUnknownNotFailed() {
        server.expect(requestTo(BASE + "/v1/payouts")).andRespond(withException(new SocketTimeoutException("read timed out")));
        assertEquals(PayoutResult.Outcome.UNKNOWN, gateway.create(command()).outcome());
    }

    @Test
    void serverErrorOnCreateIsUnknown() {
        server.expect(requestTo(BASE + "/v1/payouts")).andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        assertEquals(PayoutResult.Outcome.UNKNOWN, gateway.create(command()).outcome());
    }

    @Test
    void authErrorsAreUnknownBecauseTheyProveNothing() {
        for (HttpStatus status : List.of(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.CONFLICT, HttpStatus.TOO_MANY_REQUESTS)) {
            server.reset();
            server.expect(requestTo(BASE + "/v1/payouts")).andRespond(withStatus(status));
            assertEquals(PayoutResult.Outcome.UNKNOWN, gateway.create(command()).outcome(), "HTTP " + status);
        }
    }

    @Test
    void businessRejectionNeedsConfirmation() {
        server.expect(requestTo(BASE + "/v1/payouts"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"231\",\"desc\":\"Tài khoản nhận không hợp lệ\"}"));
        PayoutResult r = gateway.create(command());
        assertEquals(PayoutResult.Outcome.REQUEST_REJECTED, r.outcome());
        assertEquals("231", r.errorCode());
    }

    @Test
    void emptySignedListMeansNotFound() throws Exception {
        server.expect(requestTo(BASE + "/v1/payouts?referenceId=ref-123&limit=10"))
                .andRespond(signed(Map.of("payouts", List.of(), "pagination", Map.of("total", 0))));
        assertEquals(PayoutResult.Outcome.NOT_FOUND, gateway.findByReference("ref-123").outcome());
    }

    @Test
    void unsignedEmptyListIsUnknownNotNotFound() throws Exception {
        String json = mapper.writeValueAsString(Map.of("code", "00", "desc", "ok", "data", Map.of("payouts", List.of())));
        server.expect(requestTo(BASE + "/v1/payouts?referenceId=ref-123&limit=10"))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
        assertEquals(PayoutResult.Outcome.UNKNOWN, gateway.findByReference("ref-123").outcome(),
                "danh sách rỗng không có chữ ký không được dùng làm căn cứ hoàn tiền");
    }

    @Test
    void findByReferenceReturnsMatchingPayout() throws Exception {
        Map<String, Object> p = payout("p9", "COMPLETED", "SUCCEEDED", null);
        p.put("referenceId", "ref-123");
        server.expect(requestTo(BASE + "/v1/payouts?referenceId=ref-123&limit=10"))
                .andRespond(signed(Map.of("payouts", List.of(p))));
        PayoutResult r = gateway.findByReference("ref-123");
        assertEquals(PayoutResult.Outcome.SUCCEEDED, r.outcome());
        assertEquals("p9", r.providerPayoutId());
    }

    @Test
    void balanceParsesStringAmount() throws Exception {
        server.expect(requestTo(BASE + "/v1/payouts-account/balance"))
                .andRespond(signed(Map.of("accountNumber", "1", "accountName", "SRAS", "currency", "VND", "balance", "2500000")));
        assertEquals(2_500_000L, gateway.balance());
    }

    @Test
    void balanceErrorIsNull() {
        server.expect(requestTo(BASE + "/v1/payouts-account/balance")).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        assertNull(gateway.balance());
    }

    @Test
    void refusesToStartWithPlaceholderKeys() {
        props.getPayos().setChecksumKey("replace-with-payout-checksum-key");
        assertThrows(IllegalStateException.class, () -> gateway.checkConfig());
        props.getPayos().setChecksumKey(CHECKSUM);
        props.getPayos().setClientId("00000000-0000-0000-0000-000000000000");
        assertThrows(IllegalStateException.class, () -> gateway.checkConfig());
        assertTrue(PayOSPayoutGateway.isPlaceholder(""));
    }

    // ───────────────────────────── helpers ─────────────────────────────

    private Map<String, Object> payout(String id, String approval, String txState, String toAccountName) {
        Map<String, Object> tx = new LinkedHashMap<>();
        tx.put("id", "t1");
        tx.put("referenceId", "ref-123");
        tx.put("amount", 150000);
        tx.put("toBin", "970436");
        tx.put("toAccountNumber", "0123456789");
        tx.put("toAccountName", toAccountName);
        tx.put("state", txState);
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("id", id);
        p.put("referenceId", "ref-123");
        p.put("approvalState", approval);
        p.put("transactions", List.of(tx));
        p.put("createdAt", "2026-10-27T10:00:00+07:00");
        return p;
    }

    /** Response kèm header x-signature ký trên {@code data} đúng như cổng thật. */
    private org.springframework.test.web.client.ResponseCreator signed(Map<String, Object> data) throws IOException {
        String json = mapper.writeValueAsString(Map.of("code", "00", "desc", "success", "data", data));
        @SuppressWarnings("unchecked")
        Map<String, Object> parsed = (Map<String, Object>) mapper.readValue(json, Map.class).get("data");
        HttpHeaders h = new HttpHeaders();
        h.set("x-signature", PayOSSignature.signPayout(parsed, CHECKSUM));
        return withSuccess(json, MediaType.APPLICATION_JSON).headers(h);
    }
}

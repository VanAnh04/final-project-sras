package com.sras.backend.service.payout;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.config.PayoutProperties;
import com.sras.backend.entity.enums.PayoutProvider;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Kênh chi payOS ({@code /v1/payouts}). Chỉ bật khi {@code app.payout.provider=PAYOS} — TIỀN THẬT, không có sandbox.
 *
 * <p>Nguyên tắc: (1) idempotency key = referenceId do ta sinh và đã COMMIT; (2) mọi lỗi mạng / 5xx / sai chữ ký
 * response ⇒ {@link PayoutResult.Outcome#UNKNOWN}, không bao giờ ⇒ FAILED; (3) không log key, header, STK đầy đủ.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.payout.provider", havingValue = "PAYOS")
public class PayOSPayoutGateway implements PayoutGateway {

    static final String BASE_URL = "https://api-merchant.payos.vn";

    /** 4xx mà KHÔNG chứng minh được cổng chưa nhận lệnh (sai key, bị chặn IP, quá tải, trùng idempotency). */
    private static final Set<Integer> AMBIGUOUS_CLIENT_ERRORS = Set.of(401, 403, 408, 409, 429);
    private static final Set<String> FAILED_TX_STATES = Set.of("FAILED", "CANCELLED");
    private static final Set<String> FAILED_APPROVAL_STATES = Set.of("REJECTED", "CANCELLED", "FAILED");

    private final PayoutProperties props;
    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    public PayOSPayoutGateway(PayoutProperties props) {
        this(props, buildRestTemplate(props));
    }

    PayOSPayoutGateway(PayoutProperties props, RestTemplate restTemplate) {
        this.props = props;
        this.restTemplate = restTemplate;
    }

    private static RestTemplate buildRestTemplate(PayoutProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(props.getPayos().getConnectTimeoutMs());
        factory.setReadTimeout(props.getPayos().getReadTimeoutMs());
        return new RestTemplate(factory);
    }

    /** Thiếu key kênh chi mà vẫn bật PAYOS ⇒ không cho khởi động, thay vì chạy rồi lỗi lúc gara rút tiền. */
    @PostConstruct
    void checkConfig() {
        PayoutProperties.PayOS p = props.getPayos();
        if (isPlaceholder(p.getClientId()) || isPlaceholder(p.getApiKey()) || isPlaceholder(p.getChecksumKey())) {
            throw new IllegalStateException("app.payout.provider=PAYOS nhưng PAYOS_PAYOUT_CLIENT_ID / PAYOS_PAYOUT_API_KEY / "
                    + "PAYOS_PAYOUT_CHECKSUM_KEY còn trống hoặc vẫn là giá trị mẫu của .env.example");
        }
        if (!p.isVerifyResponseSignature()) {
            log.warn("Đang TẮT kiểm chữ ký response kênh chi payOS (app.payout.payos.verify-response-signature=false)");
        }
        log.info("Kênh chi payOS đã bật — lệnh rút sẽ chuyển TIỀN THẬT");
    }

    @Override
    public PayoutProvider provider() {
        return PayoutProvider.PAYOS;
    }

    @Override
    public PayoutResult create(PayoutCommand cmd) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("referenceId", cmd.referenceId());
        body.put("amount", cmd.amount());
        body.put("description", cmd.description());
        body.put("toBin", cmd.toBin());
        body.put("toAccountNumber", cmd.toAccountNumber());

        HttpHeaders headers = authHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-idempotency-key", cmd.referenceId());
        headers.set("x-signature", PayOSSignature.signPayout(body, props.getPayos().getChecksumKey()));

        try {
            ResponseEntity<String> res = restTemplate.exchange(
                    BASE_URL + "/v1/payouts", HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            return parseSinglePayout(res, true);
        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            String[] err = errorOf(e.getResponseBodyAsString());
            if (AMBIGUOUS_CLIENT_ERRORS.contains(status)) {
                log.error("Kênh chi payOS trả HTTP {} cho ref={} (code={}) — chưa rõ kết quả", status, cmd.referenceId(), err[0]);
                return PayoutResult.unknown("HTTP_" + status, err[1]);
            }
            log.warn("Kênh chi payOS từ chối lệnh ref={} HTTP {} code={}", cmd.referenceId(), status, err[0]);
            return new PayoutResult(PayoutResult.Outcome.REQUEST_REJECTED, null, null,
                    err[0] != null ? err[0] : "HTTP_" + status, err[1], null);
        } catch (HttpServerErrorException e) {
            log.error("Kênh chi payOS lỗi HTTP {} cho ref={} — chưa rõ kết quả", e.getStatusCode().value(), cmd.referenceId());
            return PayoutResult.unknown("HTTP_" + e.getStatusCode().value(), null);
        } catch (ResourceAccessException e) {
            log.error("Gọi kênh chi payOS timeout / lỗi mạng cho ref={} — chưa rõ kết quả", cmd.referenceId());
            return PayoutResult.unknown("NETWORK", e.getClass().getSimpleName());
        } catch (Exception e) {
            log.error("Lỗi không xác định khi gọi kênh chi payOS cho ref={}: {}", cmd.referenceId(), e.getClass().getSimpleName());
            return PayoutResult.unknown("UNEXPECTED", e.getClass().getSimpleName());
        }
    }

    @Override
    public PayoutResult get(String providerPayoutId) {
        try {
            URI url = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                    .pathSegment("v1", "payouts", providerPayoutId)
                    .build()
                    .encode()
                    .toUri();
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(authHeaders()), String.class);
            return parseSinglePayout(res, false);
        } catch (Exception e) {
            log.warn("Tra lệnh chi payOS id={} lỗi: {}", providerPayoutId, e.getClass().getSimpleName());
            return PayoutResult.unknown("LOOKUP_FAILED", e.getClass().getSimpleName());
        }
    }

    @Override
    public PayoutResult findByReference(String referenceId) {
        try {
            URI url = UriComponentsBuilder.fromHttpUrl(BASE_URL + "/v1/payouts")
                    .queryParam("referenceId", referenceId)
                    .queryParam("limit", 10)
                    .build()
                    .encode()
                    .toUri();
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(authHeaders()), String.class);
            JsonNode data = verifiedData(res);
            if (data == null) return PayoutResult.unknown("BAD_RESPONSE", null);
            for (JsonNode payout : data.path("payouts")) {
                if (referenceId.equals(payout.path("referenceId").asText())) {
                    return mapPayout(payout);
                }
            }
            // Chữ ký response hợp lệ + danh sách rỗng ⇒ chắc chắn cổng không có lệnh này.
            return PayoutResult.notFound();
        } catch (Exception e) {
            log.warn("Tra lệnh chi payOS theo ref={} lỗi: {}", referenceId, e.getClass().getSimpleName());
            return PayoutResult.unknown("LOOKUP_FAILED", e.getClass().getSimpleName());
        }
    }

    @Override
    public Long balance() {
        try {
            ResponseEntity<String> res = restTemplate.exchange(
                    BASE_URL + "/v1/payouts-account/balance", HttpMethod.GET, new HttpEntity<>(authHeaders()), String.class);
            JsonNode data = verifiedData(res);
            if (data == null || data.path("balance").isMissingNode()) return null;
            return new BigDecimal(data.path("balance").asText()).longValue();
        } catch (Exception e) {
            log.warn("Không lấy được số dư tài khoản chi payOS: {}", e.getClass().getSimpleName());
            return null;
        }
    }

    // ───────────────────────────── helpers ─────────────────────────────

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-client-id", props.getPayos().getClientId());
        headers.set("x-api-key", props.getPayos().getApiKey());
        return headers;
    }

    /**
     * @param businessErrorIsRejection true khi đang TẠO lệnh: code ≠ "00" nghĩa là cổng từ chối nhận lệnh.
     *                                 Khi TRA CỨU thì code ≠ "00" chỉ là "chưa biết".
     */
    private PayoutResult parseSinglePayout(ResponseEntity<String> res, boolean businessErrorIsRejection) throws Exception {
        JsonNode root = mapper.readTree(res.getBody());
        String code = root.path("code").asText();
        if (!"00".equals(code)) {
            String desc = root.path("desc").asText(null);
            return businessErrorIsRejection
                    ? new PayoutResult(PayoutResult.Outcome.REQUEST_REJECTED, null, null, code, desc, null)
                    : PayoutResult.unknown(code, desc);
        }
        JsonNode data = verifiedData(res, root);
        if (data == null) return PayoutResult.unknown("BAD_RESPONSE_SIGNATURE", null);
        return mapPayout(data);
    }

    private JsonNode verifiedData(ResponseEntity<String> res) throws Exception {
        JsonNode root = mapper.readTree(res.getBody());
        if (!"00".equals(root.path("code").asText())) return null;
        return verifiedData(res, root);
    }

    /** {@code data} nếu chữ ký header {@code x-signature} khớp (hoặc đã tắt kiểm), ngược lại null. */
    @SuppressWarnings("unchecked")
    private JsonNode verifiedData(ResponseEntity<String> res, JsonNode root) {
        JsonNode data = root.path("data");
        if (!data.isObject()) return null;
        if (!props.getPayos().isVerifyResponseSignature()) return data;
        String signature = res.getHeaders().getFirst("x-signature");
        Map<String, Object> dataMap = mapper.convertValue(data, Map.class);
        if (!PayOSSignature.verifyPayout(dataMap, signature, props.getPayos().getChecksumKey())) {
            log.error("Chữ ký response kênh chi payOS KHÔNG khớp — bỏ qua dữ liệu (coi như chưa rõ kết quả)");
            return null;
        }
        return data;
    }

    PayoutResult mapPayout(JsonNode payout) {
        String id = textOrNull(payout.path("id"));
        String approval = payout.path("approvalState").asText("");
        JsonNode tx = firstTransaction(payout.path("transactions"));
        String txState = tx != null ? tx.path("state").asText("") : "";

        PayoutResult.Outcome outcome;
        if ("SUCCEEDED".equals(txState)) {
            outcome = PayoutResult.Outcome.SUCCEEDED;
        } else if ("REVERSED".equals(txState)) {
            outcome = PayoutResult.Outcome.REVERSED;
        } else if (FAILED_TX_STATES.contains(txState) || FAILED_APPROVAL_STATES.contains(approval)) {
            outcome = PayoutResult.Outcome.FAILED;
        } else if ("COMPLETED".equals(approval) && txState.isEmpty()) {
            outcome = PayoutResult.Outcome.SUCCEEDED;
        } else {
            outcome = PayoutResult.Outcome.PROCESSING;
        }
        return new PayoutResult(outcome, id, approval + "/" + txState,
                tx != null ? textOrNull(tx.path("errorCode")) : null,
                tx != null ? textOrNull(tx.path("errorMessage")) : null,
                tx != null ? textOrNull(tx.path("toAccountName")) : null);
    }

    /** {@code transactions} có thể là mảng hoặc object đánh số — lệnh đơn chỉ có một giao dịch. */
    private static JsonNode firstTransaction(JsonNode txs) {
        if (txs.isArray() && !txs.isEmpty()) return txs.get(0);
        if (txs.isObject() && txs.elements().hasNext()) return txs.elements().next();
        return null;
    }

    private String[] errorOf(String body) {
        try {
            JsonNode root = mapper.readTree(body);
            return new String[]{textOrNull(root.path("code")), textOrNull(root.path("desc"))};
        } catch (Exception e) {
            return new String[]{null, null};
        }
    }

    private static String textOrNull(JsonNode node) {
        return node == null || node.isMissingNode() || node.isNull() ? null : node.asText();
    }

    /** Trống hoặc còn là giá trị mẫu copy từ .env.example. */
    static boolean isPlaceholder(String s) {
        return s == null || s.isBlank() || s.contains("replace-with") || s.matches("[0-]+");
    }
}

package com.sras.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.entity.enums.VehicleType;
import com.sras.backend.service.RoutingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@Slf4j
public class GoongRoutingServiceImpl implements RoutingService {

    private static final String GOONG_DIRECTION_URL = "https://rsapi.goong.io/Direction";
    private static final double ROAD_FACTOR_FALLBACK = 1.30; // Hệ số bù đường bộ khi API gặp sự cố

    @Value("${goong.api-key:8f1VAgmuzADQcrpLGdxpWlFwAkO8ETyZQN6jzWWD}")
    private String goongApiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GoongRoutingServiceImpl(ObjectMapper objectMapper) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3500); // 3.5s timeout
        factory.setReadTimeout(3500);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = objectMapper;
    }

    @Override
    public double calculateRoadDistanceKm(double originLat, double originLng, double destLat, double destLng, VehicleType vehicleType) {
        String vehicle = (vehicleType == VehicleType.CAR) ? "car" : "bike";

        if (goongApiKey != null && !goongApiKey.isBlank()) {
            try {
                String uri = UriComponentsBuilder.fromHttpUrl(GOONG_DIRECTION_URL)
                        .queryParam("origin", originLat + "," + originLng)
                        .queryParam("destination", destLat + "," + destLng)
                        .queryParam("vehicle", vehicle)
                        .queryParam("api_key", goongApiKey.trim())
                        .toUriString();

                String jsonResp = restTemplate.getForObject(uri, String.class);
                if (jsonResp != null) {
                    JsonNode root = objectMapper.readTree(jsonResp);
                    JsonNode routes = root.path("routes");
                    if (routes.isArray() && !routes.isEmpty()) {
                        JsonNode legs = routes.get(0).path("legs");
                        if (legs.isArray() && !legs.isEmpty()) {
                            JsonNode distanceNode = legs.get(0).path("distance").path("value");
                            if (!distanceNode.isMissingNode() && distanceNode.isNumber()) {
                                double meters = distanceNode.asDouble();
                                double km = meters / 1000.0;
                                double rounded = round2(km);
                                log.info("Goong road distance calculated: {} km (vehicle={})", rounded, vehicle);
                                return rounded;
                            }
                        }
                    }
                }
                log.warn("Goong API returned unexpected structure, falling back to Haversine with road factor");
            } catch (Exception e) {
                log.warn("Failed to call Goong Direction API ({}): {}, falling back to Haversine", e.getClass().getSimpleName(), e.getMessage());
            }
        } else {
            log.warn("Goong API key is missing, using Haversine with road factor fallback");
        }

        // Fallback: Haversine distance * 1.30
        double straightLine = haversineKm(originLat, originLng, destLat, destLng);
        double fallbackKm = round2(straightLine * ROAD_FACTOR_FALLBACK);
        log.info("Fallback road distance: {} km (straight-line: {} km)", fallbackKm, round2(straightLine));
        return fallbackKm;
    }

    private double round2(double val) {
        return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 6371.0 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

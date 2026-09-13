package com.sras.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Public endpoint to confirm the API is up. Useful as a smoke test after deployment.
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/ping")
    public Map<String, Object> ping() {
        return Map.of(
                "service", "sras-backend",
                "status", "UP",
                "timestamp", Instant.now().toString());
    }
}

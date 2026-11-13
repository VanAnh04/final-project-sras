package com.sras.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Bật {@code @Async} (gửi push không chặn request, thread pool mặc định của Spring Boot) và
 * {@code @Scheduled} (CallSweeper quét cuộc gọi quá hạn).
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {
}

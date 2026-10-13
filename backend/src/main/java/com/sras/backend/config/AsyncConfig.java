package com.sras.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Bật {@code @Async} — dùng cho gửi push để không chặn request (thread pool mặc định của Spring Boot). */
@Configuration
@EnableAsync
public class AsyncConfig {
}

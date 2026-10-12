package com.sras.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Cấu hình WebMvc. Ảnh và file hiện tại đã được chuyển đổi hoàn toàn sang lưu trữ
 * trong cơ sở dữ liệu (PostgreSQL bytea), phục vụ qua FileDisplayController và FileUploadController.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
}
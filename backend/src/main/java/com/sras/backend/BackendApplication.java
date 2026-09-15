package com.sras.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner databaseInit(JdbcTemplate jdbcTemplate) {
		return args -> {
			try {
				jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;");
				System.out.println("✅ [Database Migration] Đã nâng cấp cột users.avatar_url sang kiểu TEXT thành công!");
			} catch (Exception e) {
				System.out.println("⚠️ [Database Migration Warning] " + e.getMessage());
			}
		};
	}

}

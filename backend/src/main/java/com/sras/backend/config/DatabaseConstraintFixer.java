package com.sras.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseConstraintFixer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
        } catch (Exception e) {
            log.warn("Could not drop notifications_type_check constraint: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE garage_documents ALTER COLUMN file_url TYPE TEXT");
            jdbcTemplate.execute("ALTER TABLE garage_documents ALTER COLUMN note TYPE TEXT");
            log.info("Successfully updated garage_documents (file_url, note) column types to TEXT");
        } catch (Exception e) {
            log.warn("Could not alter garage_documents column types: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT");
        } catch (Exception e) {
            log.warn("Could not alter users avatar_url column type: {}", e.getMessage());
        }
    }
}

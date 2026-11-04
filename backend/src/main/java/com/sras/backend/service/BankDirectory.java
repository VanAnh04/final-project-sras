package com.sras.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Danh sách ngân hàng hợp lệ (BIN chuẩn VietQR) — chụp từ api.vietqr.io vào {@code resources/banks.json}.
 * Tên ngân hàng luôn lấy từ đây theo BIN, không tin tên do client gửi lên.
 */
@Component
public class BankDirectory {

    public record Bank(String bin, String code, String shortName, String name, boolean transferSupported) {}

    private final Map<String, Bank> byBin;

    public BankDirectory() {
        this(load());
    }

    public BankDirectory(List<Bank> banks) {
        Map<String, Bank> map = new LinkedHashMap<>();
        for (Bank b : banks) map.put(b.bin(), b);
        this.byBin = Collections.unmodifiableMap(map);
    }

    public List<Bank> all() {
        return List.copyOf(byBin.values());
    }

    public Optional<Bank> findByBin(String bin) {
        return bin == null ? Optional.empty() : Optional.ofNullable(byBin.get(bin.trim()));
    }

    private static List<Bank> load() {
        try (InputStream in = new ClassPathResource("banks.json").getInputStream()) {
            return new ObjectMapper().readValue(in, new TypeReference<List<Bank>>() {});
        } catch (IOException e) {
            throw new IllegalStateException("Không đọc được banks.json", e);
        }
    }
}

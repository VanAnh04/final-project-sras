package com.sras.backend.controller;

import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.service.BankDirectory;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Danh sách ngân hàng hợp lệ (BIN chuẩn VietQR) để gara chọn tài khoản nhận tiền. */
@RestController
@RequestMapping("/api/banks")
@RequiredArgsConstructor
public class BankController {

    private final BankDirectory bankDirectory;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BankDirectory.Bank>>> list() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách ngân hàng thành công", bankDirectory.all()));
    }
}

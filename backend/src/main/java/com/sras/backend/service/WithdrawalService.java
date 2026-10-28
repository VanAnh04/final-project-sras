package com.sras.backend.service;

import com.sras.backend.dto.request.BankAccountOtpRequest;
import com.sras.backend.dto.request.CreateWithdrawalRequest;
import com.sras.backend.dto.request.ResolveWithdrawalRequest;
import com.sras.backend.dto.request.UpdateBankAccountRequest;
import com.sras.backend.dto.response.AdminWithdrawalResponse;
import com.sras.backend.dto.response.BankAccountResponse;
import com.sras.backend.dto.response.WithdrawalResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.WithdrawalStatus;
import org.springframework.data.domain.Page;

import java.util.List;

/** Gara rút tiền từ ví tiền mặt về ngân hàng qua cổng chi hộ (AUTO, không qua admin duyệt). */
public interface WithdrawalService {

    // ── Tài khoản nhận tiền ──
    BankAccountResponse getBankAccount(User owner);

    void requestBankAccountOtp(User owner, BankAccountOtpRequest request);

    BankAccountResponse updateBankAccount(User owner, UpdateBankAccountRequest request, String ipAddress);

    // ── Rút tiền ──
    void requestWithdrawalOtp(User owner, Long amount);

    WithdrawalResponse withdraw(User owner, CreateWithdrawalRequest request, String ipAddress);

    Page<WithdrawalResponse> getMyWithdrawals(User owner, int page, int size);

    WithdrawalResponse getMyWithdrawal(User owner, Long withdrawalId);

    // ── Đối soát ──
    List<Long> findIdsToReconcile();

    void reconcile(Long withdrawalId);

    // ── Admin ──
    Page<AdminWithdrawalResponse> adminList(WithdrawalStatus status, Boolean needsReview, int page, int size);

    AdminWithdrawalResponse adminGet(Long withdrawalId);

    AdminWithdrawalResponse adminSync(Long withdrawalId);

    AdminWithdrawalResponse adminResolve(User admin, Long withdrawalId, ResolveWithdrawalRequest request, String ipAddress);

    Long payoutBalance();
}

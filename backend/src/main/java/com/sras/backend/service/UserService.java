package com.sras.backend.service;

import com.sras.backend.dto.response.UserResponse;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

import com.sras.backend.dto.request.UserWarningRequest;

import com.sras.backend.dto.response.AuditLogResponse;

public interface UserService {
    
    List<UserResponse> getAllUsers();

    Page<UserResponse> getUsersFiltered(
            UserStatus status, 
            UserRole role, 
            String search, 
            Pageable pageable
    );

    UserResponse getUserById(Long id);

    UserResponse updateUserStatus(Long id, UserStatus newStatus);

    void sendUserWarning(UserWarningRequest request);

    List<AuditLogResponse> getUserAuditLogs(Long id);
}

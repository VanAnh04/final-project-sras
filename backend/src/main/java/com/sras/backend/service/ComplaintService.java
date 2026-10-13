package com.sras.backend.service;

import com.sras.backend.dto.request.CreateComplaintRequest;
import com.sras.backend.dto.request.ResolveComplaintRequest;
import com.sras.backend.dto.response.ComplaintResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.ComplaintStatus;
import com.sras.backend.entity.enums.ComplaintTargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ComplaintService {

    ComplaintResponse createComplaint(User currentUser, CreateComplaintRequest request);

    List<ComplaintResponse> getMyComplaints(User currentUser);

    List<ComplaintResponse> getComplaintsByGarage(Long garageId);

    Page<ComplaintResponse> getAdminComplaints(ComplaintStatus status, ComplaintTargetType targetType, Pageable pageable);

    ComplaintResponse getComplaintDetail(Long id);

    ComplaintResponse getComplaintByRequest(Long requestId);

    ComplaintResponse resolveComplaint(User adminUser, Long id, ResolveComplaintRequest request);
}


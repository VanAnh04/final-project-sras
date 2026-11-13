package com.sras.backend.repository;

import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RescueStatusHistoryRepository extends JpaRepository<RescueStatusHistory, Long> {

    List<RescueStatusHistory> findByRequestOrderByIdAsc(RescueRequest request);
}

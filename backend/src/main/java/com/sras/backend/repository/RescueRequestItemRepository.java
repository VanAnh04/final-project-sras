package com.sras.backend.repository;

import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueRequestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RescueRequestItemRepository extends JpaRepository<RescueRequestItem, Long> {

    List<RescueRequestItem> findByRequestOrderByIdAsc(RescueRequest request);

    void deleteByRequest(RescueRequest request);
}

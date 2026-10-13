package com.sras.backend.repository;

import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.RescueRequestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface RescueRequestItemRepository extends JpaRepository<RescueRequestItem, Long> {

    List<RescueRequestItem> findByRequestOrderByIdAsc(RescueRequest request);

    @Query("SELECT i FROM RescueRequestItem i WHERE i.request.id IN :requestIds ORDER BY i.id ASC")
    List<RescueRequestItem> findByRequestIdIn(@Param("requestIds") Collection<Long> requestIds);

    void deleteByRequest(RescueRequest request);
}

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
    List<RescueRequestItem> findByRequestInOrderByIdAsc(List<RescueRequest> requests);

    @Query("SELECT i FROM RescueRequestItem i WHERE i.request.id IN :requestIds ORDER BY i.id ASC")
    List<RescueRequestItem> findByRequestIdIn(@Param("requestIds") Collection<Long> requestIds);

    @Query("SELECT i FROM RescueRequestItem i " +
           "JOIN FETCH i.request r " +
           "LEFT JOIN FETCH i.service s " +
           "LEFT JOIN FETCH i.inventoryItem gi " +
           "WHERE r.garage.id = :garageId AND r.isDeleted = false " +
           "ORDER BY i.id ASC")
    List<RescueRequestItem> findAllByGarageIdWithDetails(@Param("garageId") Long garageId);

    void deleteByRequest(RescueRequest request);
}

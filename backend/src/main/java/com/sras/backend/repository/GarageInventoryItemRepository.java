package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageInventoryItem;
import com.sras.backend.entity.Service;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface GarageInventoryItemRepository extends JpaRepository<GarageInventoryItem, Long> {

    @Query("""
            SELECT gi FROM GarageInventoryItem gi
            LEFT JOIN FETCH gi.garage g
            LEFT JOIN FETCH gi.service s
            WHERE gi.isDeleted = false
            ORDER BY g.id ASC, gi.name ASC
            """)
    List<GarageInventoryItem> findAllActiveWithGarageAndService();

    @Query("""
            SELECT gi FROM GarageInventoryItem gi
            LEFT JOIN FETCH gi.garage g
            LEFT JOIN FETCH gi.service s
            WHERE gi.garage.id = :garageId AND gi.isDeleted = false
            ORDER BY gi.name ASC
            """)
    List<GarageInventoryItem> findByGarageIdAndIsDeletedFalse(@Param("garageId") Long garageId);

    List<GarageInventoryItem> findByGarageAndIsDeletedFalseOrderByNameAsc(Garage garage);

    List<GarageInventoryItem> findByGarageIdInAndIsDeletedFalse(Collection<Long> garageIds);

    Optional<GarageInventoryItem> findByGarageAndServiceAndIsDeletedFalse(Garage garage, Service service);

    Optional<GarageInventoryItem> findByGarageIdAndServiceIdAndIsDeletedFalse(Long garageId, Long serviceId);

    Optional<GarageInventoryItem> findByGarageIdAndSkuCodeIgnoreCaseAndIsDeletedFalse(Long garageId, String skuCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT gi FROM GarageInventoryItem gi WHERE gi.id = :id AND gi.isDeleted = false")
    Optional<GarageInventoryItem> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT gi FROM GarageInventoryItem gi WHERE gi.garage.id = :garageId AND gi.service.id = :serviceId AND gi.isDeleted = false")
    Optional<GarageInventoryItem> findByGarageIdAndServiceIdForUpdate(
            @Param("garageId") Long garageId,
            @Param("serviceId") Long serviceId
    );
}

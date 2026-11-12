package com.sras.backend.repository;

import com.sras.backend.entity.Garage;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.GarageStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageRepository extends JpaRepository<Garage, Long> {

    Optional<Garage> findByOwner(User owner);

    Optional<Garage> findByOwnerId(Long ownerId);

    /** Khoá dòng gara trước khi đụng tới ví — mọi chỗ ghi sổ cái CASH đều phải đi qua khoá này. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from Garage g where g.owner = :owner")
    Optional<Garage> findWithLockByOwner(@Param("owner") User owner);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from Garage g where g.id = :id")
    Optional<Garage> findWithLockById(@Param("id") Long id);

    boolean existsByOwner(User owner);

    Page<Garage> findByStatus(GarageStatus status, Pageable pageable);

    /** Ứng viên điều phối: đã duyệt + đang trực. Lọc capability/bán kính ở tầng service. */
    List<Garage> findByStatusAndIsOnlineTrueAndIsDeletedFalse(GarageStatus status);

    List<Garage> findByStatusAndIsDeletedFalse(GarageStatus status);

    @Query("SELECT g FROM Garage g WHERE (:status IS NULL OR g.status = :status) " +
           "AND (LOWER(g.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(g.phone) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(g.address) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Garage> searchGaragesWithKeyword(@Param("status") GarageStatus status,
                                          @Param("keyword") String keyword,
                                          Pageable pageable);

    long countByStatus(GarageStatus status);
}

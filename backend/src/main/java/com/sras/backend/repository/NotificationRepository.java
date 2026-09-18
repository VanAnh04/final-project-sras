package com.sras.backend.repository;

import com.sras.backend.entity.Notification;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    
    List<Notification> findByUserAndType(User user, NotificationType type);

    Page<Notification> findByUser(User user, Pageable pageable);
}

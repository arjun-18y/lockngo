package com.lockngo.backend.repository;

import com.lockngo.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    boolean existsByBookingIdAndMessageContainingIgnoreCase(Long bookingId, String text);
}


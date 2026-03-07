package com.lockngo.backend.repository;

import com.lockngo.backend.entity.Booking;
import com.lockngo.backend.entity.enums.BookingStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserIdOrderByStartTimeDesc(Long userId);
    List<Booking> findByStatus(BookingStatus status);
    Optional<Booking> findFirstByUserIdAndStatus(Long userId, BookingStatus status);
    Optional<Booking> findByIdAndUserId(Long id, Long userId);
}

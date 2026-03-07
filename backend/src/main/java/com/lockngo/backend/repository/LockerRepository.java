package com.lockngo.backend.repository;

import com.lockngo.backend.entity.Locker;
import com.lockngo.backend.entity.enums.LockerSize;
import com.lockngo.backend.entity.enums.LockerStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LockerRepository extends JpaRepository<Locker, Long> {
    List<Locker> findByStatus(LockerStatus status);
    Optional<Locker> findFirstByLockerSizeAndStatus(LockerSize lockerSize, LockerStatus status);
}


package com.lockngo.backend.service;

import com.lockngo.backend.dto.locker.LockerResponse;
import com.lockngo.backend.entity.Locker;
import com.lockngo.backend.entity.enums.LockerStatus;
import com.lockngo.backend.exception.ResourceNotFoundException;
import com.lockngo.backend.repository.LockerRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LockerService {

    private final LockerRepository lockerRepository;

    public List<LockerResponse> getAvailableLockers() {
        return lockerRepository.findByStatus(LockerStatus.AVAILABLE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<LockerResponse> getAllLockers() {
        return lockerRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LockerResponse updateLockerStatus(Long lockerId, LockerStatus status) {
        Locker locker = lockerRepository.findById(lockerId)
                .orElseThrow(() -> new ResourceNotFoundException("Locker not found with id: " + lockerId));
        locker.setStatus(status);
        return toResponse(lockerRepository.save(locker));
    }

    private LockerResponse toResponse(Locker locker) {
        return new LockerResponse(locker.getId(), locker.getLockerSize(), locker.getStatus());
    }
}


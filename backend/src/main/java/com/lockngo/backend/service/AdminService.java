package com.lockngo.backend.service;

import com.lockngo.backend.dto.booking.BookingResponse;
import com.lockngo.backend.dto.locker.LockerResponse;
import com.lockngo.backend.entity.enums.LockerStatus;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final LockerService lockerService;
    private final BookingService bookingService;

    public List<LockerResponse> getAllLockers() {
        return lockerService.getAllLockers();
    }

    public LockerResponse updateLockerStatus(Long lockerId, LockerStatus status) {
        return lockerService.updateLockerStatus(lockerId, status);
    }

    public List<BookingResponse> getAllBookings() {
        return bookingService.getAllBookings();
    }
}


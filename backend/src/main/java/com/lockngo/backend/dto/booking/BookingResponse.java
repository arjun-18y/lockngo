package com.lockngo.backend.dto.booking;

import com.lockngo.backend.entity.enums.BookingStatus;
import com.lockngo.backend.entity.enums.LockerSize;
import java.time.LocalDateTime;

public record BookingResponse(
        Long id,
        Long userId,
        Long lockerId,
        LockerSize lockerSize,
        LocalDateTime startTime,
        LocalDateTime endTime,
        BookingStatus status,
        String generatedPin
) {
}


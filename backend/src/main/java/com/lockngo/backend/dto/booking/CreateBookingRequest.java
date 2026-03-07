package com.lockngo.backend.dto.booking;

import com.lockngo.backend.entity.enums.LockerSize;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateBookingRequest(
        @NotNull(message = "Locker size is required")
        LockerSize lockerSize,
        @NotNull(message = "Duration is required")
        @Min(value = 1, message = "Duration must be at least 1 hour")
        @Max(value = 72, message = "Duration must be at most 72 hours")
        Integer durationHours
) {
}


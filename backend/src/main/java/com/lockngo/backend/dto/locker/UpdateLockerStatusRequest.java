package com.lockngo.backend.dto.locker;

import com.lockngo.backend.entity.enums.LockerStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateLockerStatusRequest(
        @NotNull(message = "Locker status is required")
        LockerStatus status
) {
}


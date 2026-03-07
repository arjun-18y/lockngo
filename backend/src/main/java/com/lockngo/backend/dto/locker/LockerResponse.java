package com.lockngo.backend.dto.locker;

import com.lockngo.backend.entity.enums.LockerSize;
import com.lockngo.backend.entity.enums.LockerStatus;

public record LockerResponse(
        Long id,
        LockerSize lockerSize,
        LockerStatus status
) {
}


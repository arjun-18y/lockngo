package com.lockngo.backend.dto.auth;

import com.lockngo.backend.entity.enums.Role;

public record AuthResponse(
        Long userId,
        String name,
        String email,
        Role role,
        String token
) {
}


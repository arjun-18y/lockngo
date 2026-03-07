package com.lockngo.backend.controller;

import com.lockngo.backend.dto.booking.BookingResponse;
import com.lockngo.backend.dto.locker.LockerResponse;
import com.lockngo.backend.dto.locker.UpdateLockerStatusRequest;
import com.lockngo.backend.service.AdminService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/lockers")
    public ResponseEntity<List<LockerResponse>> getAllLockers() {
        return ResponseEntity.ok(adminService.getAllLockers());
    }

    @PutMapping("/lockers/{id}")
    public ResponseEntity<LockerResponse> updateLockerStatus(
            @PathVariable("id") Long lockerId,
            @Valid @RequestBody UpdateLockerStatusRequest request
    ) {
        return ResponseEntity.ok(adminService.updateLockerStatus(lockerId, request.status()));
    }

    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponse>> getAllBookings() {
        return ResponseEntity.ok(adminService.getAllBookings());
    }
}


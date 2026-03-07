package com.lockngo.backend.controller;

import com.lockngo.backend.dto.locker.LockerResponse;
import com.lockngo.backend.service.LockerService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lockers")
@RequiredArgsConstructor
public class LockerController {

    private final LockerService lockerService;

    @GetMapping("/available")
    public ResponseEntity<List<LockerResponse>> getAvailableLockers() {
        return ResponseEntity.ok(lockerService.getAvailableLockers());
    }
}


package com.lockngo.backend.controller;

import com.lockngo.backend.dto.email.BookingConfirmationEmailRequest;
import com.lockngo.backend.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
public class EmailController {

    private final EmailService emailService;

    @PostMapping("/booking-confirmation")
    public ResponseEntity<Void> sendBookingConfirmationEmail(@Valid @RequestBody BookingConfirmationEmailRequest request) {
        emailService.sendBookingConfirmation(request);
        return ResponseEntity.ok().build();
    }
}

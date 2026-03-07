package com.lockngo.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingSchedulerService {

    private final BookingService bookingService;

    @Scheduled(fixedDelay = 60000)
    public void monitorBookings() {
        bookingService.processBookingTimers();
        log.debug("Booking monitoring cycle completed");
    }
}


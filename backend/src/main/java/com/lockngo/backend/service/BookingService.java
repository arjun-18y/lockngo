package com.lockngo.backend.service;

import com.lockngo.backend.dto.booking.BookingResponse;
import com.lockngo.backend.dto.booking.CreateBookingRequest;
import com.lockngo.backend.entity.AccessLog;
import com.lockngo.backend.entity.Booking;
import com.lockngo.backend.entity.Locker;
import com.lockngo.backend.entity.User;
import com.lockngo.backend.entity.enums.AccessType;
import com.lockngo.backend.entity.enums.BookingStatus;
import com.lockngo.backend.entity.enums.LockerStatus;
import com.lockngo.backend.exception.BadRequestException;
import com.lockngo.backend.exception.ResourceNotFoundException;
import com.lockngo.backend.repository.AccessLogRepository;
import com.lockngo.backend.repository.BookingRepository;
import com.lockngo.backend.repository.LockerRepository;
import com.lockngo.backend.repository.UserRepository;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BookingService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int EXPIRY_WARNING_MINUTES = 15;

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final LockerRepository lockerRepository;
    private final AccessLogRepository accessLogRepository;
    private final NotificationService notificationService;

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request, String email) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        bookingRepository.findFirstByUserIdAndStatus(user.getId(), BookingStatus.ACTIVE)
                .ifPresent(existingActive -> {
                    if (existingActive.getEndTime().isAfter(LocalDateTime.now())) {
                        throw new BadRequestException("You already have an active booking");
                    }
                    expireBooking(existingActive);
                });

        Locker locker = lockerRepository.findFirstByLockerSizeAndStatus(request.lockerSize(), LockerStatus.AVAILABLE)
                .orElseThrow(() -> new BadRequestException("No available locker for selected size"));

        LocalDateTime startTime = LocalDateTime.now();
        LocalDateTime endTime = startTime.plusHours(request.durationHours());

        Booking booking = Booking.builder()
                .user(user)
                .locker(locker)
                .startTime(startTime)
                .endTime(endTime)
                .status(BookingStatus.ACTIVE)
                .generatedPin(generateSecurePin())
                .build();

        locker.setStatus(LockerStatus.OCCUPIED);
        lockerRepository.save(locker);
        Booking saved = bookingRepository.save(booking);

        notificationService.sendBookingConfirmation(saved);

        return toResponse(saved);
    }

    public List<BookingResponse> getMyBookings(String email) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return bookingRepository.findByUserIdOrderByStartTimeDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public BookingResponse completeBooking(Long bookingId, String email) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Booking booking = bookingRepository.findByIdAndUserId(bookingId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (booking.getStatus() != BookingStatus.ACTIVE) {
            throw new BadRequestException("Only active bookings can be completed");
        }

        booking.setStatus(BookingStatus.COMPLETED);
        booking.getLocker().setStatus(LockerStatus.AVAILABLE);
        lockerRepository.save(booking.getLocker());

        AccessLog accessLog = AccessLog.builder()
                .booking(booking)
                .accessTime(LocalDateTime.now())
                .accessType(AccessType.CLOSE)
                .build();
        accessLogRepository.save(accessLog);

        Booking saved = bookingRepository.save(booking);
        notificationService.sendCompletion(saved);
        return toResponse(saved);
    }

    @Transactional
    public void processBookingTimers() {
        List<Booking> activeBookings = bookingRepository.findByStatus(BookingStatus.ACTIVE);
        LocalDateTime now = LocalDateTime.now();

        for (Booking booking : activeBookings) {
            if (!booking.getEndTime().isAfter(now)) {
                expireBooking(booking);
                continue;
            }

            LocalDateTime warningThreshold = now.plusMinutes(EXPIRY_WARNING_MINUTES);
            if (!booking.getEndTime().isAfter(warningThreshold)) {
                notificationService.sendExpiryWarning(booking);
            }
        }
    }

    private void expireBooking(Booking booking) {
        booking.setStatus(BookingStatus.EXPIRED);
        Locker locker = booking.getLocker();
        locker.setStatus(LockerStatus.AVAILABLE);
        lockerRepository.save(locker);
        bookingRepository.save(booking);
        notificationService.sendExpired(booking);
        notificationService.sendCompletion(booking);
    }

    private String generateSecurePin() {
        int pin = 1000 + SECURE_RANDOM.nextInt(9000);
        return String.valueOf(pin);
    }

    private BookingResponse toResponse(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getUser().getId(),
                booking.getLocker().getId(),
                booking.getLocker().getLockerSize(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getStatus(),
                booking.getGeneratedPin()
        );
    }
}


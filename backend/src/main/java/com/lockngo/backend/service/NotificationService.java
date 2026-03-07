package com.lockngo.backend.service;

import com.lockngo.backend.entity.Booking;
import com.lockngo.backend.entity.Notification;
import com.lockngo.backend.entity.enums.NotificationStatus;
import com.lockngo.backend.repository.NotificationRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void sendBookingConfirmation(Booking booking) {
        createNotification(booking, "Booking confirmed. PIN: " + booking.getGeneratedPin());
    }

    public void sendExpiryWarning(Booking booking) {
        if (!notificationRepository.existsByBookingIdAndMessageContainingIgnoreCase(booking.getId(), "warning")) {
            createNotification(booking, "Warning: Your booking will expire soon.");
        }
    }

    public void sendExpired(Booking booking) {
        createNotification(booking, "Booking expired. Locker has been released.");
    }

    public void sendCompletion(Booking booking) {
        createNotification(booking, "Booking completed.");
    }

    private void createNotification(Booking booking, String message) {
        Notification notification = Notification.builder()
                .booking(booking)
                .message(message)
                .sentTime(LocalDateTime.now())
                .status(NotificationStatus.SENT)
                .build();
        notificationRepository.save(notification);
    }
}


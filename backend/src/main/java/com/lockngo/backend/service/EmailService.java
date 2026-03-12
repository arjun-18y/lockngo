package com.lockngo.backend.service;

import com.lockngo.backend.dto.email.BookingConfirmationEmailRequest;
import com.lockngo.backend.exception.BadRequestException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").withZone(ZoneId.of("Asia/Kolkata"));

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.mail.from:}")
    private String fromEmail;

    public void sendBookingConfirmation(BookingConfirmationEmailRequest request) {
        if (mailUsername == null || mailUsername.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            throw new BadRequestException(
                    "Email is not configured. Set MAIL_USERNAME and MAIL_APP_PASSWORD before sending."
            );
        }

        if (fromEmail == null || fromEmail.isBlank()) {
            throw new BadRequestException("Email is not configured. Set MAIL_FROM or MAIL_USERNAME.");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(request.to());
        message.setSubject("LockNGo Booking Confirmed (" + request.bookingId() + ")");
        message.setText(buildMessageBody(request));

        mailSender.send(message);
    }

    private String buildMessageBody(BookingConfirmationEmailRequest request) {
        String start = formatIsoTime(request.startTime());
        String end = formatIsoTime(request.endTime());

        return """
                Your Locker Booking Is Confirmed

                Thank you for booking with LockNGo.
                Booking ID: %s
                Station: %s%s
                Locker: #%s (%s)
                Duration: %s %s
                Start: %s
                End: %s
                Amount Paid: INR %.2f
                Locker PIN: %s

                If you did not make this booking, contact support immediately.
                """.formatted(
                request.bookingId(),
                request.stationName(),
                request.stationCity() == null || request.stationCity().isBlank() ? "" : ", " + request.stationCity(),
                request.lockerNumber(),
                request.lockerSize(),
                request.durationValue(),
                "hourly".equals(request.durationType()) ? "hour(s)" : "day(s)",
                start,
                end,
                request.amount(),
                request.pinCode()
        );
    }

    private String formatIsoTime(String isoDateTime) {
        try {
            return DATE_TIME_FORMATTER.format(Instant.parse(isoDateTime));
        } catch (Exception ex) {
            return isoDateTime;
        }
    }
}

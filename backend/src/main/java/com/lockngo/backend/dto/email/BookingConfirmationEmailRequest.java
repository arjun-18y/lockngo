package com.lockngo.backend.dto.email;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

public record BookingConfirmationEmailRequest(
        @NotBlank(message = "Recipient email is required")
        @Email(message = "Invalid recipient email format")
        String to,
        @NotBlank(message = "Booking ID is required")
        String bookingId,
        @NotBlank(message = "Station name is required")
        String stationName,
        String stationCity,
        @NotBlank(message = "Locker number is required")
        String lockerNumber,
        @NotBlank(message = "Locker size is required")
        String lockerSize,
        @NotBlank(message = "Start time is required")
        String startTime,
        @NotBlank(message = "End time is required")
        String endTime,
        @NotBlank(message = "Duration type is required")
        @Pattern(regexp = "hourly|daily", message = "Duration type must be hourly or daily")
        String durationType,
        @NotBlank(message = "Duration value is required")
        String durationValue,
        @NotNull(message = "Amount is required")
        @PositiveOrZero(message = "Amount must be positive or zero")
        Double amount,
        @NotBlank(message = "PIN code is required")
        String pinCode
) {
}

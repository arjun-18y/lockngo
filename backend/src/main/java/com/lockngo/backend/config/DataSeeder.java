package com.lockngo.backend.config;

import com.lockngo.backend.entity.Locker;
import com.lockngo.backend.entity.User;
import com.lockngo.backend.entity.enums.LockerSize;
import com.lockngo.backend.entity.enums.LockerStatus;
import com.lockngo.backend.entity.enums.Role;
import com.lockngo.backend.repository.LockerRepository;
import com.lockngo.backend.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final LockerRepository lockerRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedAdminUser();
        seedLockers();
    }

    private void seedAdminUser() {
        String adminEmail = "admin@lockngo.com";
        if (userRepository.existsByEmail(adminEmail)) {
            return;
        }

        User admin = User.builder()
                .name("System Admin")
                .email(adminEmail)
                .mobile("9999999999")
                .password(passwordEncoder.encode("Admin@123"))
                .role(Role.ADMIN)
                .build();
        userRepository.save(admin);
    }

    private void seedLockers() {
        if (lockerRepository.count() > 0) {
            return;
        }

        List<Locker> lockers = new ArrayList<>();
        lockers.addAll(buildLockers(LockerSize.SMALL, 10));
        lockers.addAll(buildLockers(LockerSize.MEDIUM, 8));
        lockers.addAll(buildLockers(LockerSize.LARGE, 6));
        lockerRepository.saveAll(lockers);
    }

    private List<Locker> buildLockers(LockerSize size, int count) {
        List<Locker> lockers = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            lockers.add(Locker.builder()
                    .lockerSize(size)
                    .status(LockerStatus.AVAILABLE)
                    .build());
        }
        return lockers;
    }
}


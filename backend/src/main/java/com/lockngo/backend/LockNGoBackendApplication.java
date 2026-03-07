package com.lockngo.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LockNGoBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(LockNGoBackendApplication.class, args);
    }
}


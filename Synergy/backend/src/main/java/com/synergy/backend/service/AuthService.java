
package com.synergy.backend.service;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.synergy.backend.entity.User;
import com.synergy.backend.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // REGISTER USER
    public User register(
            String fullName,
            String email,
            String password) {

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException(
                    "An account with this email already exists."
            );
        }

        User user = new User();

        user.setFullName(fullName);
        user.setEmail(email);

        // Hash password before saving
        user.setPasswordHash(
                passwordEncoder.encode(password)
        );

        return userRepository.save(user);
    }

    // LOGIN USER
    public User login(String email, String password) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid email or password."
                ));

        // Verify password
        if (!passwordEncoder.matches(
                password,
                user.getPasswordHash())) {

            throw new IllegalArgumentException(
                    "Invalid email or password."
            );
        }

        return user;
    }
}

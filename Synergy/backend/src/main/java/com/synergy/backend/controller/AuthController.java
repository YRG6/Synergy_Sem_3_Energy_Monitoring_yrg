
package com.synergy.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.synergy.backend.entity.User;
import com.synergy.backend.security.JwtService;
import com.synergy.backend.service.AuthService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(
            AuthService authService,
            JwtService jwtService) {

        this.authService = authService;
        this.jwtService = jwtService;
    }

    // Registration request
    public record RegisterRequest(
            @NotBlank @Size(max = 100) String fullName,
            @NotBlank @Email @Size(max = 150) String email,
            @NotBlank @Size(min = 8, max = 72) String password
    ) {}

    // Login request
    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    // Authentication response
    public record AuthResponse(
            Long id,
            String fullName,
            String email,
            String token,
            String message
    ) {}

    // REGISTER
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        User user = authService.register(
                request.fullName().trim(),
                request.email().trim().toLowerCase(),
                request.password()
        );

        String token = jwtService.generateToken(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                new AuthResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        token,
                        "Registration successful!"
                )
        );
    }

    // LOGIN
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        User user = authService.login(
                request.email().trim().toLowerCase(),
                request.password()
        );

        String token = jwtService.generateToken(user);

        return ResponseEntity.ok(
                new AuthResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        token,
                        "Login successful!"
                )
        );
    }

    // Handle authentication errors
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleAuthError(
            IllegalArgumentException exception) {

        return ResponseEntity.badRequest()
                .body(exception.getMessage());
    }
}

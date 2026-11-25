
package com.synergy.backend.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.synergy.backend.entity.Alert;
import com.synergy.backend.repository.AlertRepository;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertRepository alertRepository;

    public AlertController(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    // Get the logged-in user's email
    private String getLoggedInEmail() {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        return authentication.getName();
    }

    // Get all alerts for the logged-in user
    @GetMapping
    public List<AlertResponse> getAlerts() {

        return alertRepository
                .findAllByUser_EmailOrderByCreatedAtDesc(
                        getLoggedInEmail()
                )
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // Count unread alerts
    @GetMapping("/unread-count")
    public UnreadCountResponse getUnreadCount() {

        long count =
                alertRepository.countByUser_EmailAndIsReadFalse(
                        getLoggedInEmail()
                );

        return new UnreadCountResponse(count);
    }

    // Mark one alert as read
    @PatchMapping("/{id}/read")
    public AlertResponse markAsRead(@PathVariable Long id) {

        Alert alert = alertRepository
                .findByIdAndUser_Email(id, getLoggedInEmail())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Alert not found"
                        )
                );

        alert.setRead(true);

        Alert savedAlert = alertRepository.save(alert);

        return convertToResponse(savedAlert);
    }

    // Convert database alert to API response
    private AlertResponse convertToResponse(Alert alert) {

        return new AlertResponse(
                alert.getId(),
                alert.getTitle(),
                alert.getMessage(),
                alert.getAlertType(),
                alert.getSeverity(),
                alert.isRead(),
                alert.getCreatedAt()
        );
    }

    public record AlertResponse(
            Long id,
            String title,
            String message,
            String alertType,
            String severity,
            boolean isRead,
            LocalDateTime createdAt
    ) {}

    public record UnreadCountResponse(long count) {}
}


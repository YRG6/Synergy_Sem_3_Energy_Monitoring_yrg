
package com.synergy.backend.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.synergy.backend.entity.EnergyReading;
import com.synergy.backend.entity.User;
import com.synergy.backend.repository.EnergyReadingRepository;
import com.synergy.backend.repository.UserRepository;
import com.synergy.backend.service.AlertService;

@RestController
@RequestMapping("/api/energy")
public class EnergyReadingController {

    private final EnergyReadingRepository energyReadingRepository;
    private final UserRepository userRepository;
    private final AlertService alertService;

    public EnergyReadingController(
            EnergyReadingRepository energyReadingRepository,
            UserRepository userRepository,
            AlertService alertService) {

        this.energyReadingRepository = energyReadingRepository;
        this.userRepository = userRepository;
        this.alertService = alertService;
    }

    // Get the currently logged-in user.
    private User getLoggedInUser() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));
    }

    // Save a new energy reading and check alert thresholds.
    @PostMapping("/readings")
    @ResponseStatus(HttpStatus.CREATED)
    public EnergyReadingResponse addReading(
            @RequestBody EnergyReadingRequest request) {

        User user = getLoggedInUser();

        EnergyReading reading = new EnergyReading(
                request.voltage(),
                request.current(),
                request.power(),
                request.energy()
        );

        // Associate the reading with the logged-in user.
        reading.setUser(user);

        // Save the energy reading.
        EnergyReading savedReading =
                energyReadingRepository.save(reading);

        // Check thresholds and generate alerts if necessary.
        alertService.checkAndCreateAlerts(savedReading, user);

        return convertToResponse(savedReading);
    }

    // Retrieve only the logged-in user's readings.
    @GetMapping("/readings")
    public List<EnergyReadingResponse> getAllReadings() {

        User user = getLoggedInUser();

        return energyReadingRepository
                .findAllByUser_EmailOrderByRecordedAtDesc(user.getEmail())
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // Convert database entity into a safe API response.
    private EnergyReadingResponse convertToResponse(
            EnergyReading reading) {

        return new EnergyReadingResponse(
                reading.getId(),
                reading.getVoltage(),
                reading.getCurrent(),
                reading.getPower(),
                reading.getEnergy(),
                reading.getRecordedAt()
        );
    }

    // Data accepted when saving a reading.
    public record EnergyReadingRequest(
            Double voltage,
            Double current,
            Double power,
            Double energy
    ) {}

    // Data returned to the frontend.
    public record EnergyReadingResponse(
            Long id,
            Double voltage,
            Double current,
            Double power,
            Double energy,
            LocalDateTime recordedAt
    ) {}
}

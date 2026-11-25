
package com.synergy.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.synergy.backend.entity.Alert;
import com.synergy.backend.entity.EnergyReading;
import com.synergy.backend.entity.User;
import com.synergy.backend.repository.AlertRepository;

@Service
public class AlertService {

    private final AlertRepository alertRepository;

    @Value("${app.alert.power-limit:1000}")
    private double powerLimit;

    @Value("${app.alert.voltage-min:207}")
    private double minimumVoltage;

    @Value("${app.alert.voltage-max:253}")
    private double maximumVoltage;

    @Value("${app.alert.current-limit:5}")
    private double currentLimit;

    public AlertService(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    public void checkAndCreateAlerts(EnergyReading reading, User user) {

        String email = user.getEmail();

        // Check high power
        if (reading.getPower() > powerLimit) {
            createAlertIfNeeded(
                    email,
                    "POWER_HIGH",
                    "High Power Usage",
                    "Your power consumption is "
                            + reading.getPower()
                            + " W, which is above the limit of "
                            + powerLimit
                            + " W.",
                    "WARNING",
                    user
            );
        }

        // Check low voltage
        if (reading.getVoltage() < minimumVoltage) {
            createAlertIfNeeded(
                    email,
                    "VOLTAGE_LOW",
                    "Low Voltage Detected",
                    "Your voltage is "
                            + reading.getVoltage()
                            + " V. The minimum safe threshold is "
                            + minimumVoltage
                            + " V.",
                    "CRITICAL",
                    user
            );
        }

        // Check high voltage
        if (reading.getVoltage() > maximumVoltage) {
            createAlertIfNeeded(
                    email,
                    "VOLTAGE_HIGH",
                    "High Voltage Detected",
                    "Your voltage is "
                            + reading.getVoltage()
                            + " V. The maximum threshold is "
                            + maximumVoltage
                            + " V.",
                    "CRITICAL",
                    user
            );
        }

        // Check high current
        if (reading.getCurrent() > currentLimit) {
            createAlertIfNeeded(
                    email,
                    "CURRENT_HIGH",
                    "High Current Detected",
                    "Your current is "
                            + reading.getCurrent()
                            + " A, which is above the limit of "
                            + currentLimit
                            + " A.",
                    "WARNING",
                    user
            );
        }
    }

    private void createAlertIfNeeded(
            String email,
            String alertType,
            String title,
            String message,
            String severity,
            User user) {

        boolean alertAlreadyExists =
                alertRepository.existsByUser_EmailAndAlertTypeAndIsReadFalse(
                        email,
                        alertType
                );

        if (!alertAlreadyExists) {
            Alert alert = new Alert(
                    title,
                    message,
                    alertType,
                    severity,
                    user
            );

            alertRepository.save(alert);
        }
    }
}

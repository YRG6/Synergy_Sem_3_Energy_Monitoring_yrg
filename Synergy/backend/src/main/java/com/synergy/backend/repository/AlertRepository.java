package com.synergy.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.synergy.backend.entity.Alert;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findAllByUser_EmailOrderByCreatedAtDesc(String email);

    long countByUser_EmailAndIsReadFalse(String email);

    Optional<Alert> findByIdAndUser_Email(Long id, String email);

    boolean existsByUser_EmailAndAlertTypeAndIsReadFalse(
            String email,
            String alertType
    );
}
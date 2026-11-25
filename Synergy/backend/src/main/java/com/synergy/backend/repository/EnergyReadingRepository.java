
package com.synergy.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.synergy.backend.entity.EnergyReading;

@Repository
public interface EnergyReadingRepository
        extends JpaRepository<EnergyReading, Long> {

    // Retrieve readings belonging to one user.
    List<EnergyReading> findAllByUser_EmailOrderByRecordedAtDesc(
            String email
    );
}

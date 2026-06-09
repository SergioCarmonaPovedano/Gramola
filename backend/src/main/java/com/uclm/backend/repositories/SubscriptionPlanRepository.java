package com.uclm.backend.repositories;

import com.uclm.backend.entities.SubscriptionPlan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {

    Optional<SubscriptionPlan> findByNameIgnoreCase(String name);
}

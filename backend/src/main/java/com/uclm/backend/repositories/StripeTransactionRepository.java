package com.uclm.backend.repositories;

import com.uclm.backend.entities.StripeTransaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StripeTransactionRepository extends JpaRepository<StripeTransaction, String> {
}

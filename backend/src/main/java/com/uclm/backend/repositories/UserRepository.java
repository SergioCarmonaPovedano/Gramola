package com.uclm.backend.repositories;

import com.uclm.backend.entities.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByCreationTokenId(String creationTokenId);

    Optional<User> findByPasswordResetTokenId(String passwordResetTokenId);

    Optional<User> findByClientId(String clientId);
}


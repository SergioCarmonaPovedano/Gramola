package com.uclm.backend.repositories;

import com.uclm.backend.entities.Track;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrackRepository extends JpaRepository<Track, Long> {

    List<Track> findByBarEmailAndLibrarySongTrueOrderByIdAsc(String barEmail);

    List<Track> findByBarEmailAndQueuedTrueAndPlayedAtIsNullOrderByRequestedAtAsc(String barEmail);
}

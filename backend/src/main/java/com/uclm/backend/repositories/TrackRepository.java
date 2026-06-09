package com.uclm.backend.repositories;

import com.uclm.backend.entities.Track;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface TrackRepository extends JpaRepository<Track, Long> {

    List<Track> findByBarEmailAndLibrarySongTrueOrderByIdAsc(String barEmail);

    List<Track> findByBarEmailAndQueuedTrueAndPlayedAtIsNullOrderByRequestedAtAsc(String barEmail);

    @Modifying
@Query("UPDATE Track t SET t.queued = false WHERE t.barEmail = :barEmail AND t.queued = true AND t.playedAt IS NULL")
int clearPendingQueue(@Param("barEmail") String barEmail);
}

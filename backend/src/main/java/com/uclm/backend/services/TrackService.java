package com.uclm.backend.services;

import com.uclm.backend.entities.Track;
import com.uclm.backend.repositories.TrackRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TrackService {

    @Autowired
    private TrackRepository trackRepository;

    public Track addTrackToQueue(Track track) {
        prepareTrackBeforeSaving(track);

        return trackRepository.save(track);
    }

    public List<Track> getQueue(String barEmail) {
        validateBarEmail(barEmail);

        return trackRepository.findByBarEmailAndQueuedTrueAndPlayedAtIsNullOrderByRequestedAtAsc(barEmail);
    }

    public List<Track> getLibrary(String barEmail) {
        validateBarEmail(barEmail);

        return trackRepository.findByBarEmailAndLibrarySongTrueOrderByIdAsc(barEmail);
    }

    public Track markAsPlayed(Long id) {
        Track track = trackRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("La canción no existe."));

        track.setQueued(false);
        track.setPlayedAt(System.currentTimeMillis());

        return trackRepository.save(track);
    }

    private void prepareTrackBeforeSaving(Track track) {
        if (track.getRequestedAt() == null) {
            track.setRequestedAt(System.currentTimeMillis());
        }

        if (track.getLibrarySong() == null) {
            track.setLibrarySong(true);
        }

        if (track.getPaid() == null) {
            track.setPaid(false);
        }

        if (track.getQueued() == null) {
            track.setQueued(false);
        }

        if (track.getPlayedAt() == null) {
            track.setPlayedAt(null);
        }
    }

    private void validateBarEmail(String barEmail) {
        if (barEmail == null || barEmail.isBlank()) {
            throw new IllegalArgumentException("No se ha recibido el email del bar.");
        }
    }

    @Transactional
public int clearPendingQueue(String barEmail) {
    validateBarEmail(barEmail);

    return trackRepository.clearPendingQueue(barEmail);
}
}

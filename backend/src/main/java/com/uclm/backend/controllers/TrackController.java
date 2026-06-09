package com.uclm.backend.controllers;

import com.uclm.backend.entities.Track;
import com.uclm.backend.services.TrackService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tracks")
@CrossOrigin(origins = "*")
public class TrackController {

    @Autowired
    private TrackService trackService;

    @PostMapping("/add")
    public ResponseEntity<Track> addTrack(@RequestBody Track track) {
        Track savedTrack = trackService.addTrackToQueue(track);

        return ResponseEntity.status(201).body(savedTrack);
    }

    @GetMapping("/queue")
    public ResponseEntity<List<Track>> getQueue(@RequestParam String barEmail) {
        List<Track> queue = trackService.getQueue(barEmail);

        return ResponseEntity.ok(queue);
    }

    @GetMapping("/library")
    public ResponseEntity<List<Track>> getLibrary(@RequestParam String barEmail) {
        List<Track> library = trackService.getLibrary(barEmail);

        return ResponseEntity.ok(library);
    }

    @PutMapping("/played/{id}")
    public ResponseEntity<Track> markAsPlayed(@PathVariable Long id) {
        Track updatedTrack = trackService.markAsPlayed(id);

        return ResponseEntity.ok(updatedTrack);
    }
}

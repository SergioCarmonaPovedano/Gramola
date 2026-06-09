package com.uclm.backend.controllers;

import com.uclm.backend.entities.SpotiToken;
import com.uclm.backend.services.SpotiService;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/spoti")
@CrossOrigin(
        origins = { "http://localhost:4200", "http://127.0.0.1:4200" },
        allowCredentials = "true"
)
public class SpotiController {

    @Autowired
    private SpotiService spotiService;

    @GetMapping("/getAuthorizationToken")
public ResponseEntity<?> getAuthorizationToken(
        @RequestParam String code,
        @RequestParam String clientId,
        @RequestParam String email
) {
    try {
        SpotiToken token = spotiService.getAuthorizationToken(code, clientId, email);

        return ResponseEntity.ok(token);

    } catch (Exception e) {
        System.err.println("Error obteniendo token de Spotify: " + e.getMessage());

        return ResponseEntity
                .badRequest()
                .body(Map.of("message", e.getMessage()));
    }
}

    @GetMapping("/search")
    public ResponseEntity<?> searchTracks(
            @RequestParam String q,
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            String result = spotiService.searchTracks(q, authHeader);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            System.err.println("Error buscando canciones en Spotify: " + e.getMessage());

            return ResponseEntity
                    .status(500)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
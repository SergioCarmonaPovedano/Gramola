package com.uclm.backend.controllers;

import com.uclm.backend.services.PaymentService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @GetMapping("/trackPrice")
    public ResponseEntity<?> getTrackPrice(@RequestParam String barEmail) {
        try {
            Double trackPrice = paymentService.getTrackPrice(barEmail);

            return ResponseEntity.ok(trackPrice);

        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/trackPrice")
    public ResponseEntity<?> updateTrackPrice(@RequestBody Map<String, String> body) {
        try {
            String barEmail = body.get("barEmail");
            String trackPriceText = body.get("trackPrice");

            Double trackPrice = Double.parseDouble(trackPriceText);
            Double updatedPrice = paymentService.updateTrackPrice(barEmail, trackPrice);

            return ResponseEntity.ok(Map.of(
                    "trackPrice", updatedPrice,
                    "message", "Precio por canción actualizado correctamente."
            ));

        } catch (NumberFormatException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", "El precio debe ser un número válido."));

        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/prepay")
    public ResponseEntity<?> prepay(@RequestBody Map<String, String> body) {
        try {
            String plan = body.get("plan");

            return ResponseEntity.ok(paymentService.prepay(plan));

        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@RequestBody Map<String, String> body) {
        try {
            String transactionId = body.get("transactionId");
            String token = body.get("token");
            String plan = body.get("plan");

            paymentService.confirmPayment(transactionId, token, plan);

            return ResponseEntity.ok().build();

        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/prepayTrack")
    public ResponseEntity<?> prepayTrack(@RequestBody Map<String, String> body) {
        try {
            String barEmail = body.get("barEmail");

            return ResponseEntity.ok(paymentService.prepayTrack(barEmail));

        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/confirmTrack")
    public ResponseEntity<?> confirmTrack(@RequestBody Map<String, String> body) {
        try {
            String transactionId = body.get("transactionId");
            String barEmail = body.get("barEmail");

            paymentService.confirmTrackPayment(transactionId, barEmail);

            return ResponseEntity.ok().build();

        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }
}

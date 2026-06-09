package com.uclm.backend.controllers;

import com.uclm.backend.entities.User;
import com.uclm.backend.services.UserService;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            String bar = body.get("bar");
            String email = body.get("email");
            String pwd1 = body.get("pwd1");
            String pwd2 = body.get("pwd2");
            String clientId = body.get("clientId");
            String clientSecret = body.get("clientSecret");

            if (bar == null || bar.isBlank()
                    || email == null || email.isBlank()
                    || pwd1 == null || pwd1.isBlank()
                    || pwd2 == null || pwd2.isBlank()
                    || clientId == null || clientId.isBlank()
                    || clientSecret == null || clientSecret.isBlank()
                    || !pwd1.equals(pwd2)) {
                return ResponseEntity
                        .status(406)
                        .body(Map.of("message", "Los datos de registro no son válidos."));
            }

            userService.register(
                    bar.trim(),
                    email.trim(),
                    pwd1,
                    clientId.trim(),
                    clientSecret.trim()
            );

            return ResponseEntity.ok().build();

        } catch (IllegalStateException e) {
            return ResponseEntity
                    .status(409)
                    .body(Map.of("message", e.getMessage()));

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(406)
                    .body(Map.of("message", e.getMessage()));

        } catch (Exception e) {
            return ResponseEntity
                    .status(409)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/confirmToken/{email}")
    public void confirmToken(
            @PathVariable String email,
            @RequestParam String token,
            HttpServletResponse response
    ) throws IOException {
        userService.confirmToken(email, token);

        response.sendRedirect("http://127.0.0.1:4200/payment?token=" + token);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String pwd = body.get("pwd");

            User user = userService.login(email, pwd);

            Map<String, Object> response = Map.of(
                    "clientId", user.getClientId(),
                    "isOwner", user.isOwner()
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity
                    .status(401)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/validateOwnerPassword")
    public ResponseEntity<?> validateOwnerPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String password = body.get("password");

            userService.validateOwnerPassword(email, password);

            return ResponseEntity.ok(
                    Map.of("message", "Contraseña correcta.")
            );

        } catch (Exception e) {
            return ResponseEntity
                    .status(401)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/forgotPassword")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");

            userService.requestPasswordReset(email);

            return ResponseEntity.ok(
                    Map.of("message", "Correo de recuperación enviado.")
            );

        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/resetPassword")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        try {
            String token = body.get("token");
            String pwd1 = body.get("pwd1");
            String pwd2 = body.get("pwd2");

            userService.resetPassword(token, pwd1, pwd2);

            return ResponseEntity.ok(
                    Map.of("message", "Contraseña actualizada correctamente.")
            );

        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }
}

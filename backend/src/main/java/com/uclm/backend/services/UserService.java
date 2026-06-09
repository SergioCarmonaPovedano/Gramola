package com.uclm.backend.services;

import com.uclm.backend.entities.Token;
import com.uclm.backend.entities.User;
import com.uclm.backend.repositories.TokenRepository;
import com.uclm.backend.repositories.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private static final double INITIAL_TRACK_PRICE = 2.00;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TokenRepository tokenRepository;

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    public void register(String bar, String email, String pwd, String clientId, String clientSecret) {
        validateSpotifyCredentials(clientId, clientSecret, email);
        deletePreviousUserIfRegistrationCanBeRepeated(email);

        Token token = createToken();

        User newUser = new User();
        newUser.setEmail(email);
        newUser.setBar(bar);
        newUser.setPwd(pwd);
        newUser.setClientId(clientId);
        newUser.setClientSecret(clientSecret);
        newUser.setCreationTokenId(token.getId());
        newUser.setEmailConfirmed(false);
        newUser.setPaid(false);
        newUser.setActive(false);
        newUser.setOwner(true);
        newUser.setTrackPrice(INITIAL_TRACK_PRICE);

        userRepository.save(newUser);

        sendConfirmationEmail(newUser, token);
    }

    public void confirmToken(String email, String tokenId) {
        User user = userRepository.findById(email)
                .orElseThrow(() -> new IllegalArgumentException("El usuario no existe."));

        if (!tokenId.equals(user.getCreationTokenId())) {
            throw new IllegalArgumentException("El token no corresponde a este usuario.");
        }

        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new IllegalArgumentException("El token proporcionado no es válido o no existe."));

        if (token.getUseTime() != null) {
            throw new IllegalArgumentException("Este token ya ha sido utilizado.");
        }

        token.setUseTime(System.currentTimeMillis());
        tokenRepository.save(token);

        user.setEmailConfirmed(true);
        userRepository.save(user);
    }

    public User login(String email, String pwd) throws Exception {
        User user = userRepository.findById(email)
                .orElseThrow(() -> new Exception("El usuario no existe o el correo es incorrecto."));

        if (!user.getPwd().equals(pwd)) {
            throw new Exception("Contraseña incorrecta.");
        }

        if (!user.isEmailConfirmed()) {
            throw new Exception("Debes confirmar tu correo electrónico antes de iniciar sesión.");
        }

        if (!user.isPaid() || !user.isActive()) {
            throw new Exception("Debes completar el pago de la suscripción antes de iniciar sesión.");
        }

        if (user.getClientId() == null || user.getClientId().isBlank()) {
            throw new Exception("El bar no tiene configurado el Client ID de Spotify.");
        }

        if (user.getClientSecret() == null || user.getClientSecret().isBlank()) {
            throw new Exception("El bar no tiene configurado el Client Secret de Spotify.");
        }

        return user;
    }

     public User getUserForSpotifyAuthorization(String email, String clientId) {
    if (email == null || email.isBlank()) {
        throw new IllegalArgumentException("No se ha recibido el email del bar.");
    }

    if (clientId == null || clientId.isBlank()) {
        throw new IllegalArgumentException("No se ha recibido el Client ID de Spotify.");
    }

    User user = userRepository.findById(email.trim())
            .orElseThrow(() -> new IllegalArgumentException("No existe ningún bar con ese email."));

    if (!clientId.trim().equals(user.getClientId())) {
        throw new IllegalArgumentException("El Client ID recibido no corresponde al bar logueado.");
    }

    if (!user.isEmailConfirmed() || !user.isPaid() || !user.isActive()) {
        throw new IllegalArgumentException("La cuenta del bar no está activa.");
    }

    return user;
}

/**
 * Se mantiene por compatibilidad, pero no debe usarse en el flujo OAuth real.
 * Si varios bares comparten el mismo Client ID de testing, el Client ID por sí solo
 * ya no identifica de forma única a un bar.
 */
public User getUserByClientId(String clientId) {
    if (clientId == null || clientId.isBlank()) {
        throw new IllegalArgumentException("No se ha recibido el Client ID de Spotify.");
    }

    var users = userRepository.findByClientId(clientId.trim());

    if (users.isEmpty()) {
        throw new IllegalArgumentException("No existe ningún bar asociado a ese Client ID.");
    }

    if (users.size() > 1) {
        throw new IllegalArgumentException("Hay varios bares asociados a ese Client ID. Usa el email del bar para desambiguar.");
    }

    return users.get(0);
}

    public void validateOwnerPassword(String email, String password) throws Exception {
        if (email == null || email.isBlank()) {
            throw new Exception("No se ha recibido el email del bar.");
        }

        if (password == null || password.isBlank()) {
            throw new Exception("Debes introducir la contraseña del bar.");
        }

        User user = userRepository.findById(email)
                .orElseThrow(() -> new Exception("El bar no existe."));

        if (!user.getPwd().equals(password)) {
            throw new Exception("Contraseña incorrecta.");
        }

        if (!user.isEmailConfirmed() || !user.isPaid() || !user.isActive()) {
            throw new Exception("La cuenta del bar no está activa.");
        }
    }

    public void requestPasswordReset(String email) {
        User user = userRepository.findById(email)
                .orElseThrow(() -> new IllegalArgumentException("No existe ningún usuario con ese correo."));

        Token token = createToken();

        user.setPasswordResetTokenId(token.getId());
        userRepository.save(user);

        sendPasswordResetEmail(user, token);
    }

    public void resetPassword(String tokenId, String pwd1, String pwd2) {
        if (tokenId == null || tokenId.isBlank()) {
            throw new IllegalArgumentException("Token de recuperación no válido.");
        }

        if (pwd1 == null || pwd2 == null || !pwd1.equals(pwd2)) {
            throw new IllegalArgumentException("Las contraseñas no coinciden.");
        }

        User user = userRepository.findByPasswordResetTokenId(tokenId)
                .orElseThrow(() -> new IllegalArgumentException("Token de recuperación no encontrado."));

        Token token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new IllegalArgumentException("Token de recuperación no existe."));

        if (token.getUseTime() != null) {
            throw new IllegalArgumentException("Este token ya ha sido utilizado.");
        }

        token.setUseTime(System.currentTimeMillis());
        tokenRepository.save(token);

        user.setPwd(pwd1);
        user.setPasswordResetTokenId(null);
        userRepository.save(user);
    }

    private void validateSpotifyCredentials(String clientId, String clientSecret, String email) {
    if (clientId == null || clientId.isBlank()) {
        throw new IllegalArgumentException("Debes introducir el Client ID de Spotify.");
    }

    if (clientSecret == null || clientSecret.isBlank()) {
        throw new IllegalArgumentException("Debes introducir el Client Secret de Spotify.");
    }

    /*
     * En producción, lo normal sería que cada bar tuviera sus propias credenciales
     * de Spotify Developer. Para esta práctica/testing permitimos que varios bares
     * compartan el mismo clientId/clientSecret.
     *
     * La identidad real del bar dentro de Gramola sigue siendo su email, no el
     * clientId de Spotify. Por eso NO comprobamos unicidad del clientId aquí.
     */
}

    private void deletePreviousUserIfRegistrationCanBeRepeated(String email) {
        Optional<User> existingUserOpt = userRepository.findById(email);

        if (existingUserOpt.isEmpty()) {
            return;
        }

        User existingUser = existingUserOpt.get();

        boolean accountIsFullyActive =
                existingUser.isEmailConfirmed()
                        && existingUser.isPaid()
                        && existingUser.isActive();

        if (accountIsFullyActive) {
            throw new IllegalStateException("Este bar ya está registrado y activo.");
        }

        userRepository.delete(existingUser);
    }

    private Token createToken() {
        Token token = new Token();
        token.setId(UUID.randomUUID().toString().replace("-", ""));
        token.setCreationTime(System.currentTimeMillis());

        return tokenRepository.save(token);
    }

    private void sendConfirmationEmail(User user, Token token) {
        String confirmationUrl = "http://localhost:8080/users/confirmToken/"
                + user.getEmail()
                + "?token="
                + token.getId();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setTo(user.getEmail());
        message.setSubject("Bienvenido a La Gramola - Confirma tu cuenta de " + user.getBar());
        message.setText("¡Hola!\n\n"
                + "Gracias por registrar tu bar (" + user.getBar() + ") en La Gramola.\n\n"
                + "Para completar el registro y elegir tu plan de suscripción, haz clic en el siguiente enlace:\n\n"
                + confirmationUrl + "\n\n"
                + "Si no has solicitado este registro, puedes ignorar este correo.");

        mailSender.send(message);
    }

    private void sendPasswordResetEmail(User user, Token token) {
        String resetUrl = "http://127.0.0.1:4200/reset-password?token=" + token.getId();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setTo(user.getEmail());
        message.setSubject("Recuperación de contraseña - La Gramola");
        message.setText("Hola,\n\n"
                + "Has solicitado recuperar la contraseña de tu cuenta en La Gramola.\n\n"
                + "Haz clic en el siguiente enlace para crear una nueva contraseña:\n\n"
                + resetUrl + "\n\n"
                + "Si no has solicitado este cambio, puedes ignorar este correo.");

        mailSender.send(message);
    }
}

package com.uclm.backend.services;

import com.uclm.backend.entities.SpotiToken;
import com.uclm.backend.entities.User;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class SpotiService {

    private static final String TOKEN_URL = "https://accounts.spotify.com/api/token";
    private static final String SEARCH_URL = "https://api.spotify.com/v1/search";

    private final RestClient restClient = RestClient.create();

    @Autowired
    private UserService userService;

    @Value("${spotify.redirect-uri}")
    private String spotifyRedirectUri;

    public SpotiToken getAuthorizationToken(String code, String clientId, String email) {
    try {
        validateAuthorizationRequest(code, clientId, email);

        User user = userService.getUserForSpotifyAuthorization(email, clientId);

        String clientSecret = user.getClientSecret();

        if (clientSecret == null || clientSecret.isBlank()) {
            throw new RuntimeException("El bar no tiene configurado el Client Secret de Spotify.");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("grant_type", "authorization_code");
        form.add("redirect_uri", spotifyRedirectUri);

        String authorizationHeader = createBasicAuthHeader(clientId, clientSecret);

        SpotiToken token = restClient.post()
                .uri(TOKEN_URL)
                .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(SpotiToken.class);

        if (token == null || token.getAccessToken() == null) {
            throw new RuntimeException("Spotify no devolvió un access_token válido.");
        }

        return token;

    } catch (Exception e) {
        System.err.println("Error obteniendo token de Spotify: " + e.getMessage());
        throw new RuntimeException("Error obteniendo token de Spotify: " + e.getMessage());
    }
}

    public String searchTracks(String query, String authHeader) {
        try {
            if (authHeader == null || authHeader.isBlank()) {
                throw new RuntimeException("No se ha recibido cabecera Authorization.");
            }

            if (query == null || query.isBlank()) {
                throw new RuntimeException("La búsqueda no puede estar vacía.");
            }

            String encodedQuery = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8);
            String url = SEARCH_URL + "?q=" + encodedQuery + "&type=track&limit=10";

            return restClient.get()
                    .uri(url)
                    .header(HttpHeaders.AUTHORIZATION, authHeader)
                    .retrieve()
                    .body(String.class);

        } catch (Exception e) {
            System.err.println("Error buscando canciones en Spotify: " + e.getMessage());
            throw new RuntimeException("Error buscando canciones en Spotify: " + e.getMessage());
        }
    }

    private void validateAuthorizationRequest(String code, String clientId, String email) {
    if (code == null || code.isBlank()) {
        throw new RuntimeException("No se ha recibido el código de autorización de Spotify.");
    }

    if (clientId == null || clientId.isBlank()) {
        throw new RuntimeException("No se ha recibido el Client ID de Spotify.");
    }

    if (email == null || email.isBlank()) {
        throw new RuntimeException("No se ha recibido el email del bar.");
    }

    if (spotifyRedirectUri == null || spotifyRedirectUri.isBlank()) {
        throw new RuntimeException("spotify.redirect-uri no está configurado.");
    }
}

    private String createBasicAuthHeader(String clientId, String clientSecret) {
        String credentials = clientId.trim() + ":" + clientSecret.trim();

        String encodedCredentials = Base64.getEncoder()
                .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

        return "Basic " + encodedCredentials;
    }
}

package com.uclm.backend.entities; // Ajusta el paquete según tu proyecto

import com.fasterxml.jackson.annotation.JsonProperty;

public class SpotiToken {

    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("token_type")
    private String tokenType;

    @JsonProperty("expires_in")
    private int expiresIn;

    // Genera los Getters y Setters para estas variables
    public String getAccessToken() {
        return accessToken;
    }
    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }
    // ... haz lo mismo para tokenType y expiresIn
}
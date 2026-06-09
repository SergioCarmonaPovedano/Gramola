package com.uclm.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class User {

    @Id
    private String email;

    private String bar;

    private String pwd;

    @Column(name = "client_id")
    private String clientId;

    @Column(name = "client_secret")
    private String clientSecret;

    @Column(name = "creation_token_id")
    private String creationTokenId;

    @Column(name = "password_reset_token_id")
    private String passwordResetTokenId;

    @Column(name = "track_price")
    private Double trackPrice;

    @Column(name = "es_propietario")
    private boolean owner;

    @Column(name = "email_confirmed")
    private boolean emailConfirmed;

    @Column(name = "paid")
    private boolean paid;

    @Column(name = "active")
    private boolean active;

    @Column(name = "subscription_plan")
    private String subscriptionPlan;

    public User() {}

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getBar() {
        return bar;
    }
    
    public void setBar(String bar) {
        this.bar = bar;
    }

    public String getPwd() {
        return pwd;
    }
    
    public void setPwd(String pwd) {
        this.pwd = pwd;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getCreationTokenId() {
        return creationTokenId;
    }
    
    public void setCreationTokenId(String creationTokenId) {
        this.creationTokenId = creationTokenId;
    }

    public String getPasswordResetTokenId() {
        return passwordResetTokenId;
    }

    public void setPasswordResetTokenId(String passwordResetTokenId) {
        this.passwordResetTokenId = passwordResetTokenId;
    }

    public Double getTrackPrice() {
        return trackPrice;
    }
    
    public void setTrackPrice(Double trackPrice) {
        this.trackPrice = trackPrice;
    }

    public boolean isOwner() {
        return owner;
    }
    
    public void setOwner(boolean owner) {
        this.owner = owner;
    }

    public boolean isEmailConfirmed() {
        return emailConfirmed;
    }

    public void setEmailConfirmed(boolean emailConfirmed) {
        this.emailConfirmed = emailConfirmed;
    }

    public boolean isPaid() {
        return paid;
    }

    public void setPaid(boolean paid) {
        this.paid = paid;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getSubscriptionPlan() {
        return subscriptionPlan;
    }

    public void setSubscriptionPlan(String subscriptionPlan) {
        this.subscriptionPlan = subscriptionPlan;
    }
}
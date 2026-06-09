package com.uclm.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Track {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String spotifyId;
    private String spotifyUri;
    private String title;
    private String artist;

    @Column(name = "bar_email")
    private String barEmail;

    @Column(name = "amount_paid")
    private Double amountPaid;

    @Column(name = "paid")
    private Boolean paid;

    @Column(name = "queued")
    private Boolean queued;

    @Column(name = "library_song")
    private Boolean librarySong;

    @Column(name = "requested_at")
    private Long requestedAt;

    @Column(name = "played_at")
    private Long playedAt;

    public Track() {}

    public Track(
            String spotifyId,
            String spotifyUri,
            String title,
            String artist,
            String barEmail,
            Double amountPaid,
            Boolean paid,
            Boolean queued,
            Boolean librarySong,
            Long requestedAt,
            Long playedAt
    ) {
        this.spotifyId = spotifyId;
        this.spotifyUri = spotifyUri;
        this.title = title;
        this.artist = artist;
        this.barEmail = barEmail;
        this.amountPaid = amountPaid;
        this.paid = paid;
        this.queued = queued;
        this.librarySong = librarySong;
        this.requestedAt = requestedAt;
        this.playedAt = playedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSpotifyId() {
        return spotifyId;
    }

    public void setSpotifyId(String spotifyId) {
        this.spotifyId = spotifyId;
    }

    public String getSpotifyUri() {
        return spotifyUri;
    }

    public void setSpotifyUri(String spotifyUri) {
        this.spotifyUri = spotifyUri;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getArtist() {
        return artist;
    }

    public void setArtist(String artist) {
        this.artist = artist;
    }

    public String getBarEmail() {
        return barEmail;
    }

    public void setBarEmail(String barEmail) {
        this.barEmail = barEmail;
    }

    public Double getAmountPaid() {
        return amountPaid;
    }

    public void setAmountPaid(Double amountPaid) {
        this.amountPaid = amountPaid;
    }

    public Boolean getPaid() {
        return paid;
    }

    public void setPaid(Boolean paid) {
        this.paid = paid;
    }

    public Boolean getQueued() {
        return queued;
    }

    public void setQueued(Boolean queued) {
        this.queued = queued;
    }

    public Boolean getLibrarySong() {
        return librarySong;
    }

    public void setLibrarySong(Boolean librarySong) {
        this.librarySong = librarySong;
    }

    public Long getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(Long requestedAt) {
        this.requestedAt = requestedAt;
    }

    public Long getPlayedAt() {
        return playedAt;
    }

    public void setPlayedAt(Long playedAt) {
        this.playedAt = playedAt;
    }
}

package com.jry.backend.entities;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * A single-use, expiring token sent via email. Two purposes today:
 *   - {@link Type#SIGNUP} — confirms the user owns their signup email.
 *   - {@link Type#EMAIL_CHANGE} — confirms the user owns a NEW email they want to switch to;
 *     the new address is stored in {@code payload} until the token is consumed.
 *
 * Hibernate's ddl-auto=update will add the new `type` and `payload` columns on first
 * startup. Existing rows (from signup-only days) get NULL for type — see the null-safe
 * getter for how that's handled.
 */
@Entity
@Table(name = "verification_tokens")
public class VerificationToken {

    public enum Type {
        SIGNUP,
        EMAIL_CHANGE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The random token string that appears in the verification URL. */
    @Column(name = "token", nullable = false, unique = true, length = 64)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private ApplicationUser user;

    /** When this token stops being valid. */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Set true once a token has been used; we keep used rows briefly for audit before deletion. */
    @Column(name = "used", nullable = false)
    private boolean used = false;

    /**
     * What this token is for. New rows always set this; existing legacy rows from before
     * this column existed will have NULL — getType() treats NULL as SIGNUP (the only kind
     * that existed back then).
     */
    @Column(name = "token_type")
    @Enumerated(EnumType.STRING)
    private Type type;

    /**
     * Type-specific payload. For EMAIL_CHANGE this is the new email address; for SIGNUP
     * it's null. Kept as a generic String column so future token types can reuse it.
     */
    @Column(name = "payload", length = 320)
    private String payload;

    public VerificationToken() {}

    /** Convenience for SIGNUP tokens (no payload). */
    public VerificationToken(ApplicationUser user, Instant expiresAt) {
        this(user, expiresAt, Type.SIGNUP, null);
    }

    public VerificationToken(ApplicationUser user, Instant expiresAt, Type type, String payload) {
        // UUID without dashes -> 32 chars, plenty random, URL-safe.
        this.token = UUID.randomUUID().toString().replace("-", "");
        this.user = user;
        this.expiresAt = expiresAt;
        this.type = type;
        this.payload = payload;
    }

    public Long getId() { return id; }
    public String getToken() { return token; }
    public ApplicationUser getUser() { return user; }
    public Instant getExpiresAt() { return expiresAt; }
    public String getPayload() { return payload; }

    /** Null-safe: legacy rows (pre-type-column) are treated as SIGNUP. */
    public Type getType() {
        return type == null ? Type.SIGNUP : type;
    }

    public boolean isUsed() { return used; }
    public void markUsed() { this.used = true; }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}

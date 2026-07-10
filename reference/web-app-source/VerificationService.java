package com.jry.backend.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.jry.backend.entities.ApplicationUser;
import com.jry.backend.entities.UserRepository;
import com.jry.backend.entities.VerificationToken;
import com.jry.backend.entities.VerificationTokenRepository;

import jakarta.mail.MessagingException;

/**
 * Owns the email-verification lifecycle. Two distinct flows live here:
 *
 *  - SIGNUP verification: prove the user owns their signup email. Issued at signup,
 *    consumed when they click the link, flips {@code enabled = true}.
 *  - EMAIL_CHANGE verification: prove the user owns a NEW email they want to switch to.
 *    Issued from Settings → Save (when email changed), consumed when they click the link
 *    in the NEW inbox, swaps the user's email to the pending value.
 *
 * Result types are returned as a small enum rather than booleans, because verification
 * has several distinct failure modes ("expired" vs "not found" vs "already used") that
 * the UI shows different messages for.
 */
@Service
public class VerificationService {

    private static final Logger log = LoggerFactory.getLogger(VerificationService.class);

    public enum VerificationResult {
        SUCCESS,
        EMAIL_CHANGED,     // EMAIL_CHANGE token consumed successfully
        TOKEN_NOT_FOUND,
        TOKEN_EXPIRED,
        TOKEN_ALREADY_USED,
        ALREADY_VERIFIED,
        EMAIL_ALREADY_TAKEN // race condition: someone else claimed the address while we waited
    }

    private final VerificationTokenRepository tokenRepo;
    private final UserRepository userRepo;
    private final EmailService emailService;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.verification.token-validity-hours:24}")
    private int tokenValidityHours;

    public VerificationService(VerificationTokenRepository tokenRepo, UserRepository userRepo,
                               EmailService emailService) {
        this.tokenRepo = tokenRepo;
        this.userRepo = userRepo;
        this.emailService = emailService;
    }

    // ============================================================
    //  SIGNUP verification
    // ============================================================

    /**
     * Creates a SIGNUP verification token for the user, deletes any previous (now-stale)
     * tokens they had, and sends the verification email.
     */
    @Transactional
    public void issueAndSendToken(ApplicationUser user) throws MessagingException {
        // Any prior tokens for this user are obsolete — delete them so old links stop working.
        List<VerificationToken> existing = tokenRepo.findByUser(user);
        if (!existing.isEmpty()) {
            tokenRepo.deleteAll(existing);
        }

        Instant expiresAt = Instant.now().plus(tokenValidityHours, ChronoUnit.HOURS);
        VerificationToken token = tokenRepo.save(
                new VerificationToken(user, expiresAt, VerificationToken.Type.SIGNUP, null));

        String url = buildVerificationUrl(token.getToken());
        emailService.sendVerificationEmail(user.getEmail(), user.getDisplayName(), url);
        log.info("Signup verification email queued for {}", user.getEmail());
    }

    // ============================================================
    //  EMAIL_CHANGE verification
    // ============================================================

    /**
     * Issues an EMAIL_CHANGE token and sends the verification link to the NEW address.
     * The change does not take effect until {@link #verifyToken(String)} consumes the
     * token. Any prior EMAIL_CHANGE tokens for this user are invalidated (so requesting
     * a fresh change "cancels" earlier pending changes implicitly).
     */
    @Transactional
    public void issueAndSendEmailChangeToken(ApplicationUser user, String newEmail) throws MessagingException {
        // Invalidate any prior pending email-change tokens.
        List<VerificationToken> existing = tokenRepo.findByUser(user);
        for (VerificationToken t : existing) {
            if (t.getType() == VerificationToken.Type.EMAIL_CHANGE && !t.isUsed()) {
                tokenRepo.delete(t);
            }
        }

        Instant expiresAt = Instant.now().plus(tokenValidityHours, ChronoUnit.HOURS);
        VerificationToken token = tokenRepo.save(
                new VerificationToken(user, expiresAt, VerificationToken.Type.EMAIL_CHANGE, newEmail));

        String url = buildVerificationUrl(token.getToken());
        // Sent to the NEW address — the whole point is proving ownership of the new mailbox.
        emailService.sendVerificationEmail(newEmail, user.getDisplayName(), url);
        log.info("Email-change verification queued for user {} to new address {}",
                user.getEmail(), newEmail);
    }

    /** Returns the currently-pending email-change for a user (if any), so the Settings
     *  page can show the banner with the pending address and a cancel button. */
    public Optional<VerificationToken> findPendingEmailChange(ApplicationUser user) {
        return tokenRepo.findFirstByUserAndTypeAndUsedFalseOrderByIdDesc(
                user, VerificationToken.Type.EMAIL_CHANGE);
    }

    /** Cancels any pending email-change for a user (deletes the token). Used by the
     *  Settings page's "Cancel pending change" button. */
    @Transactional
    public void cancelPendingEmailChange(ApplicationUser user) {
        Optional<VerificationToken> pending = findPendingEmailChange(user);
        pending.ifPresent(tokenRepo::delete);
    }

    // ============================================================
    //  Token consumption (shared by both flows)
    // ============================================================

    /**
     * Looks up a token from a verification URL and routes to the right consumer
     * based on type (SIGNUP -> flip enabled; EMAIL_CHANGE -> swap email).
     */
    @Transactional
    public VerificationResult verifyToken(String tokenString) {
        Optional<VerificationToken> maybe = tokenRepo.findByToken(tokenString);
        if (maybe.isEmpty()) {
            return VerificationResult.TOKEN_NOT_FOUND;
        }
        VerificationToken token = maybe.get();

        if (token.isExpired()) {
            return VerificationResult.TOKEN_EXPIRED;
        }
        if (token.isUsed()) {
            return token.getType() == VerificationToken.Type.EMAIL_CHANGE
                    ? VerificationResult.TOKEN_ALREADY_USED
                    : (token.getUser().isEnabled()
                            ? VerificationResult.ALREADY_VERIFIED
                            : VerificationResult.TOKEN_ALREADY_USED);
        }

        return switch (token.getType()) {
            case SIGNUP -> consumeSignup(token);
            case EMAIL_CHANGE -> consumeEmailChange(token);
        };
    }

    private VerificationResult consumeSignup(VerificationToken token) {
        ApplicationUser user = token.getUser();
        user.setEnabled(true);
        token.markUsed();
        tokenRepo.save(token);
        log.info("User {} verified successfully (SIGNUP)", user.getEmail());
        return VerificationResult.SUCCESS;
    }

    private VerificationResult consumeEmailChange(VerificationToken token) {
        ApplicationUser user = token.getUser();
        String newEmail = token.getPayload();

        if (newEmail == null || newEmail.isBlank()) {
            // Defensive: shouldn't happen if tokens were created via issueAndSendEmailChangeToken.
            log.error("EMAIL_CHANGE token {} has no payload; ignoring", token.getId());
            return VerificationResult.TOKEN_NOT_FOUND;
        }

        // Race-condition check: did someone else claim this address between issue and click?
        Optional<ApplicationUser> conflict = userRepo.findByEmail(newEmail);
        if (conflict.isPresent() && !conflict.get().getId().equals(user.getId())) {
            // Someone else (or the user themself via another session) registered this address
            // in the meantime. Don't perform the swap — surface the conflict.
            token.markUsed(); // burn the token so it can't be retried
            tokenRepo.save(token);
            log.warn("EMAIL_CHANGE for user {} to {} aborted: address now belongs to another account",
                    user.getEmail(), newEmail);
            return VerificationResult.EMAIL_ALREADY_TAKEN;
        }

        String oldEmail = user.getEmail();
        user.setEmail(newEmail);
        userRepo.save(user);
        token.markUsed();
        tokenRepo.save(token);
        log.info("User email changed from {} to {}", oldEmail, newEmail);
        return VerificationResult.EMAIL_CHANGED;
    }

    private String buildVerificationUrl(String token) {
        String base = baseUrl == null ? "http://localhost:8080" : baseUrl.replaceAll("/+$", "");
        return base + "/verify?token=" + token;
    }
}

package com.jry.backend.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.jry.backend.entities.ApplicationUser;
import com.jry.backend.entities.UserRepository;

import jakarta.annotation.Nonnull;

@Service
public class UserService implements UserDetailsService {
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    // --- 1. NEW: Require email when creating an account ---
    public ApplicationUser createUser(String username, String email, String rawPassword, String timezone) {
        String hashedPassword = passwordEncoder.encode(rawPassword);
        ApplicationUser newUser = new ApplicationUser(username, hashedPassword);
        newUser.setEmail(email); // Set the email on the user entity
        // Brand-new users are NOT enabled until they verify their email. The Java-level
        // default on the entity is already false, but setting it here makes the intent
        // explicit at the call site.
        newUser.setEnabled(false);
        // Browser-detected timezone (may be null if detection failed; that's fine, the
        // user can set it in Settings and getZoneId() falls back to UTC meanwhile).
        if (timezone != null && !timezone.isBlank()) {
            newUser.setTimezone(timezone);
        }
        return userRepo.save(newUser);
    }

    // --- 2. NEW: Check if the email is already registered ---
    public boolean emailExists(String email) {
        return userRepo.findByEmail(email).isPresent();
    }

    /** Lookup helper used by the resend-verification flow on the login page. */
    public java.util.Optional<ApplicationUser> findByEmail(String email) {
        return userRepo.findByEmail(email);
    }

    // --- 3. THE MAGIC FIX: Spring Security searches by Email now ---
    @Override
    public @Nonnull UserDetails loadUserByUsername(@Nonnull String email) throws UsernameNotFoundException {
        // Even though the method is called "loadUserByUsername", Vaadin will pass the email 
        // from the login box into this variable. We just tell it to search the database by email!
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("No account found with email: " + email));
    }

    // ============================================================
    //  Settings updates (used by the Settings view)
    // ============================================================

    /** Updates the user's display name. */
    public void updateDisplayName(ApplicationUser user, String newDisplayName) {
        // The display name is the entity's `username` field; the login identity is the email,
        // so renaming the display name does NOT affect authentication.
        user.setDisplayName(newDisplayName);
        userRepo.save(user);
    }

    /** Updates the user's urgency threshold (hours). */
    public void updateUrgentThresholdHours(ApplicationUser user, int hours) {
        user.setUrgentThresholdHours(hours);
        userRepo.save(user);
    }

    /** Updates the user's timezone (IANA zone ID like "America/Vancouver"). */
    public void updateTimezone(ApplicationUser user, String timezone) {
        user.setTimezone(timezone);
        userRepo.save(user);
    }

    /**
     * Changes the user's password. Returns true on success; false if the supplied current
     * password doesn't match. The view shows a friendly error on false.
     */
    public boolean changePassword(ApplicationUser user, String currentPasswordPlain, String newPasswordPlain) {
        if (!passwordEncoder.matches(currentPasswordPlain, user.getPassword())) {
            return false;
        }
        user.setPassword(passwordEncoder.encode(newPasswordPlain));
        userRepo.save(user);
        return true;
    }
}
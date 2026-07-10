package com.jry.backend.entities;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {
    Optional<VerificationToken> findByToken(String token);
    List<VerificationToken> findByUser(ApplicationUser user);
    void deleteByUser(ApplicationUser user);

    /** Finds the most recent non-used token of a given type for a user (e.g. the active
     *  pending email-change token, so the Settings banner knows which address is pending). */
    Optional<VerificationToken> findFirstByUserAndTypeAndUsedFalseOrderByIdDesc(
            ApplicationUser user, VerificationToken.Type type);
}

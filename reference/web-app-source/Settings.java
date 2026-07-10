package com.jry.base.ui.views;

import java.util.Optional;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.jry.backend.entities.ApplicationUser;
import com.jry.backend.entities.UserRepository;
import com.jry.backend.entities.VerificationToken;
import com.jry.backend.service.UserService;
import com.jry.backend.service.VerificationService;
import com.jry.base.ui.components.ReauthDialog;
import com.jry.base.ui.components.ViewToolbar;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.formlayout.FormLayout;
import com.vaadin.flow.component.html.H3;
import com.vaadin.flow.component.html.Hr;
import com.vaadin.flow.component.html.Paragraph;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.notification.Notification;
import com.vaadin.flow.component.notification.NotificationVariant;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.textfield.EmailField;
import com.vaadin.flow.component.textfield.IntegerField;
import com.vaadin.flow.component.textfield.PasswordField;
import com.vaadin.flow.component.textfield.TextField;
import com.vaadin.flow.data.validator.EmailValidator;
import com.vaadin.flow.data.binder.ValidationResult;
import com.vaadin.flow.data.binder.ValueContext;
import com.vaadin.flow.router.Menu;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;
import com.vaadin.flow.spring.security.AuthenticationContext;

import jakarta.annotation.security.PermitAll;
import jakarta.mail.MessagingException;

/**
 * Per-user settings: display name, email (with verify-then-apply flow), urgency
 * threshold, change password.
 *
 * Save flow:
 *   - Non-sensitive changes (display name, urgency) apply immediately.
 *   - Sensitive changes (email, password) require re-entering the current password
 *     via {@link ReauthDialog} before applying.
 *   - Email changes don't take effect until the user clicks the link sent to the NEW
 *     address. Until then a pending-change banner shows on this page.
 */
@Route("settings")
@PageTitle("Settings")
@Menu(order = 2, title = "Settings", icon = "vaadin:cog")
@PermitAll
public class Settings extends VerticalLayout {

    private final transient UserService userService;
    private final transient UserRepository userRepo;
    private final transient VerificationService verificationService;
    private final transient PasswordEncoder passwordEncoder;
    private transient ApplicationUser currentUser;

    // Profile fields
    private final TextField displayNameField = new TextField("Display name");
    private final EmailField emailField = new EmailField("Email address");

    // Pending email-change banner (assembled in buildProfileSection, refreshed on demand)
    private final VerticalLayout pendingBanner = new VerticalLayout();

    // Urgency
    private final IntegerField urgentThresholdField = new IntegerField("Urgency threshold (hours)");

    // Timezone (searchable IANA picker)
    private final com.vaadin.flow.component.combobox.ComboBox<String> timezoneField =
            new com.vaadin.flow.component.combobox.ComboBox<>("Timezone");

    // Password change
    private final PasswordField newPasswordField = new PasswordField("New password");
    private final PasswordField confirmPasswordField = new PasswordField("Confirm new password");

    public Settings(UserService userService, UserRepository userRepo,
                    VerificationService verificationService, PasswordEncoder passwordEncoder,
                    AuthenticationContext authContext) {
        this.userService = userService;
        this.userRepo = userRepo;
        this.verificationService = verificationService;
        this.passwordEncoder = passwordEncoder;

        String userEmail = authContext.getAuthenticatedUser(UserDetails.class)
                .orElseThrow(() -> new IllegalStateException("No authenticated user in session"))
                .getUsername();
        this.currentUser = userRepo.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalStateException("No account found for email: " + userEmail));

        setSizeFull();
        setPadding(true);
        add(new ViewToolbar("Settings"));

        add(buildProfileSection());
        add(new Hr());
        add(buildUrgencySection());
        add(new Hr());
        add(buildPasswordSection());

        Button saveBtn = new Button("Save Changes", e -> saveAll());
        saveBtn.addThemeVariants(ButtonVariant.LUMO_PRIMARY);

        HorizontalLayout actions = new HorizontalLayout(saveBtn);
        actions.getStyle().set("margin-top", "24px");
        add(actions);

        prefillFields();
        refreshPendingBanner();
    }

    // ---- Section builders ---------------------------------------------------

    private VerticalLayout buildProfileSection() {
        H3 heading = new H3("Profile");
        heading.getStyle().set("margin-bottom", "4px");

        Paragraph blurb = new Paragraph(
                "Changing your email sends a verification link to the new address. "
                        + "Your account email won't change until you click that link.");
        blurb.getStyle().set("color", "var(--lumo-secondary-text-color)");
        blurb.getStyle().set("font-size", "13px");
        blurb.getStyle().set("margin-top", "0");

        displayNameField.setWidth("320px");
        emailField.setWidth("320px");

        pendingBanner.setPadding(false);
        pendingBanner.setSpacing(false);

        VerticalLayout section = new VerticalLayout(heading, blurb, pendingBanner, displayNameField, emailField);
        section.setPadding(false);
        section.setSpacing(false);
        return section;
    }

    private VerticalLayout buildUrgencySection() {
        H3 heading = new H3("Urgency");
        heading.getStyle().set("margin-bottom", "4px");

        Paragraph blurb = new Paragraph(
                "How many hours before a task's due date should it count as urgent? "
                        + "Default is 48 hours (2 days).");
        blurb.getStyle().set("color", "var(--lumo-secondary-text-color)");
        blurb.getStyle().set("font-size", "13px");
        blurb.getStyle().set("margin-top", "0");

        urgentThresholdField.setMin(1);
        urgentThresholdField.setMax(720); // a month
        urgentThresholdField.setStepButtonsVisible(true);
        urgentThresholdField.setWidth("220px");
        urgentThresholdField.setHelperText("Between 1 and 720 hours");

        // Timezone picker: searchable list of all IANA zones. Used for "now" comparisons
        // (urgency, past-due, today/tomorrow labels) and calendar display. Your task due
        // dates are wall-clock and don't shift when you change this — only "now" does.
        java.util.List<String> zones = new java.util.ArrayList<>(java.time.ZoneId.getAvailableZoneIds());
        java.util.Collections.sort(zones);
        timezoneField.setItems(zones);
        timezoneField.setWidth("320px");
        timezoneField.setHelperText("Used to decide what counts as 'now' for urgency and overdue");
        timezoneField.setClearButtonVisible(false);

        VerticalLayout section = new VerticalLayout(heading, blurb, urgentThresholdField, timezoneField);
        section.setPadding(false);
        section.setSpacing(false);
        return section;
    }

    private VerticalLayout buildPasswordSection() {
        H3 heading = new H3("Change password");
        heading.getStyle().set("margin-bottom", "4px");

        Paragraph blurb = new Paragraph(
                "Leave these blank if you don't want to change your password. "
                        + "You'll be asked to re-enter your current password to confirm.");
        blurb.getStyle().set("color", "var(--lumo-secondary-text-color)");
        blurb.getStyle().set("font-size", "13px");
        blurb.getStyle().set("margin-top", "0");

        newPasswordField.setWidthFull();
        confirmPasswordField.setWidthFull();

        FormLayout fl = new FormLayout(newPasswordField, confirmPasswordField);
        fl.setResponsiveSteps(new FormLayout.ResponsiveStep("0", 1));
        fl.setMaxWidth("420px");

        VerticalLayout section = new VerticalLayout(heading, blurb, fl);
        section.setPadding(false);
        section.setSpacing(false);
        return section;
    }

    // ---- State + behavior ---------------------------------------------------

    private void prefillFields() {
        displayNameField.setValue(currentUser.getDisplayName() == null ? "" : currentUser.getDisplayName());
        emailField.setValue(currentUser.getEmail() == null ? "" : currentUser.getEmail());
        urgentThresholdField.setValue(currentUser.getUrgentThresholdHours());
        // Prefill timezone; if unset, default the picker to the JVM/browser-ish guess so the
        // user sees a sensible starting value rather than blank.
        String tz = currentUser.getTimezone();
        timezoneField.setValue(tz != null && !tz.isBlank() ? tz : java.time.ZoneId.systemDefault().getId());
    }

    /** Rebuilds the pending-email-change banner. Hidden if no change is pending; otherwise
     *  shows the pending address and a Cancel button. */
    private void refreshPendingBanner() {
        pendingBanner.removeAll();
        Optional<VerificationToken> pending = verificationService.findPendingEmailChange(currentUser);
        if (pending.isEmpty()) {
            pendingBanner.setVisible(false);
            return;
        }
        pendingBanner.setVisible(true);

        String pendingAddr = pending.get().getPayload();
        Span msg = new Span("Pending change to " + pendingAddr
                + " — check that inbox for a verification link.");
        msg.getStyle().set("font-size", "13px");

        Button cancelBtn = new Button("Cancel pending change", e -> {
            verificationService.cancelPendingEmailChange(currentUser);
            Notification n = Notification.show("Pending email change cancelled.");
            n.addThemeVariants(NotificationVariant.LUMO_CONTRAST);
            n.setPosition(Notification.Position.TOP_CENTER);
            refreshPendingBanner();
        });
        cancelBtn.addThemeVariants(ButtonVariant.LUMO_TERTIARY, ButtonVariant.LUMO_SMALL);

        VerticalLayout box = new VerticalLayout(msg, cancelBtn);
        box.setPadding(false);
        box.setSpacing(false);
        box.getStyle().set("background-color", "#fff7ed"); // light amber
        box.getStyle().set("border", "1px solid #fdba74");
        box.getStyle().set("border-radius", "10px");
        box.getStyle().set("padding", "10px 12px");
        box.getStyle().set("margin-bottom", "12px");
        box.getStyle().set("max-width", "420px");

        pendingBanner.add(box);
    }

    private void saveAll() {
        // ---- 1. Classify changes ----
        String newName = displayNameField.getValue() == null ? "" : displayNameField.getValue().trim();
        boolean nameChanged = !newName.equals(currentUser.getDisplayName());
        if (newName.isEmpty()) {
            displayNameField.setInvalid(true);
            displayNameField.setErrorMessage("Display name cannot be empty");
            return;
        }

        Integer hours = urgentThresholdField.getValue();
        boolean hoursChanged = false;
        if (hours == null) {
            urgentThresholdField.setInvalid(true);
            urgentThresholdField.setErrorMessage("Required");
            return;
        }
        if (hours < 1 || hours > 720) {
            urgentThresholdField.setInvalid(true);
            urgentThresholdField.setErrorMessage("Must be between 1 and 720");
            return;
        }
        if (hours != currentUser.getUrgentThresholdHours()) {
            hoursChanged = true;
        }

        // Timezone (non-sensitive). ComboBox value is an IANA zone id from the list.
        String newTz = timezoneField.getValue();
        boolean tzChanged = newTz != null && !newTz.isBlank()
                && !newTz.equals(currentUser.getTimezone());

        String newEmail = emailField.getValue() == null ? "" : emailField.getValue().trim();
        boolean emailChanged = !newEmail.equalsIgnoreCase(currentUser.getEmail());
        if (emailChanged) {
            // Basic format validation
            ValidationResult vr = new EmailValidator("Please enter a valid email address")
                    .apply(newEmail, new ValueContext());
            if (vr.isError()) {
                emailField.setInvalid(true);
                emailField.setErrorMessage(vr.getErrorMessage());
                return;
            }
            // Already-registered guard (also re-checked at verify time as a race-condition catch)
            if (userService.emailExists(newEmail)) {
                emailField.setInvalid(true);
                emailField.setErrorMessage("This email is already registered");
                return;
            }
        }

        String newPassword = newPasswordField.getValue() == null ? "" : newPasswordField.getValue();
        String confirmPassword = confirmPasswordField.getValue() == null ? "" : confirmPasswordField.getValue();
        boolean passwordChanged = !newPassword.isEmpty() || !confirmPassword.isEmpty();
        if (passwordChanged) {
            if (newPassword.isEmpty() || confirmPassword.isEmpty()) {
                Notification.show("To change your password, fill in both password fields.")
                        .addThemeVariants(NotificationVariant.LUMO_ERROR);
                return;
            }
            if (!newPassword.equals(confirmPassword)) {
                confirmPasswordField.setInvalid(true);
                confirmPasswordField.setErrorMessage("New passwords don't match");
                return;
            }
            if (newPassword.length() < 8) {
                newPasswordField.setInvalid(true);
                newPasswordField.setErrorMessage("New password must be at least 8 characters");
                return;
            }
        }

        // ---- 2. Gate sensitive changes through re-auth ----
        boolean needsReauth = emailChanged || passwordChanged;
        if (needsReauth) {
            // Apply non-sensitive changes immediately (no point making the user re-auth for those),
            // then prompt for the password before doing the sensitive work.
            applyNonSensitiveChanges(nameChanged, newName, hoursChanged, hours, tzChanged, newTz);

            ReauthDialog dlg = new ReauthDialog(currentUser, passwordEncoder, () -> {
                // Re-auth succeeded; perform the sensitive operations.
                applySensitiveChanges(emailChanged, newEmail, passwordChanged, newPassword);
            });
            dlg.open();
            return;
        }

        // ---- 3. No sensitive changes — just apply and notify ----
        applyNonSensitiveChanges(nameChanged, newName, hoursChanged, hours, tzChanged, newTz);
        notifyOutcome(nameChanged || hoursChanged || tzChanged);
    }

    private void applyNonSensitiveChanges(boolean nameChanged, String newName,
                                          boolean hoursChanged, Integer hours,
                                          boolean tzChanged, String newTz) {
        if (nameChanged) {
            userService.updateDisplayName(currentUser, newName);
        }
        if (hoursChanged) {
            userService.updateUrgentThresholdHours(currentUser, hours);
        }
        if (tzChanged) {
            userService.updateTimezone(currentUser, newTz);
        }
        // Refresh the in-memory user so subsequent comparisons see the updated values.
        currentUser = userRepo.findByEmail(currentUser.getEmail()).orElse(currentUser);
    }

    private void applySensitiveChanges(boolean emailChanged, String newEmail,
                                       boolean passwordChanged, String newPassword) {
        if (passwordChanged) {
            // changePassword needs the current password as a second factor, but we just
            // verified it via the re-auth dialog. The userService's signature requires it,
            // so the cleanest path is to simply update the hash directly via the entity
            // setter we added earlier. We bypass changePassword() for this reason.
            currentUser.setPassword(passwordEncoder.encode(newPassword));
            userRepo.save(currentUser);
            newPasswordField.clear();
            confirmPasswordField.clear();
        }

        if (emailChanged) {
            try {
                verificationService.issueAndSendEmailChangeToken(currentUser, newEmail);
                Notification n = Notification.show(
                        "Verification link sent to " + newEmail
                                + ". Your email won't change until you click it.");
                n.addThemeVariants(NotificationVariant.LUMO_SUCCESS);
                n.setPosition(Notification.Position.TOP_CENTER);
                n.setDuration(6000);
                // Reset the email field to the CURRENT (unchanged) email to avoid the misleading
                // appearance that the change has already taken effect.
                emailField.setValue(currentUser.getEmail());
                refreshPendingBanner();
            } catch (MessagingException ex) {
                Notification n = Notification.show(
                        "Couldn't send the verification email right now. Try again in a few minutes.");
                n.addThemeVariants(NotificationVariant.LUMO_ERROR);
                n.setPosition(Notification.Position.TOP_CENTER);
            }
        } else if (passwordChanged) {
            // Password-only sensitive change: confirm immediately.
            Notification n = Notification.show("Password updated.");
            n.addThemeVariants(NotificationVariant.LUMO_SUCCESS);
            n.setPosition(Notification.Position.TOP_CENTER);
        }
    }

    private void notifyOutcome(boolean anythingChanged) {
        if (anythingChanged) {
            Notification n = Notification.show("Settings saved.");
            n.addThemeVariants(NotificationVariant.LUMO_SUCCESS);
            n.setPosition(Notification.Position.TOP_CENTER);
            n.setDuration(2500);
        } else {
            Notification.show("No changes to save.");
        }
    }
}

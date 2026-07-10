package com.jry.base.ui.views;

import com.jry.backend.dto.UserDTO;
import com.jry.backend.entities.ApplicationUser;
import com.jry.backend.service.UserService;
import com.jry.backend.service.VerificationService;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.formlayout.FormLayout;
import com.vaadin.flow.component.html.H1;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.notification.Notification;
import com.vaadin.flow.component.notification.NotificationVariant;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.textfield.EmailField;
import com.vaadin.flow.component.textfield.PasswordField;
import com.vaadin.flow.component.textfield.TextField;
import com.vaadin.flow.data.binder.BeanValidationBinder;
import com.vaadin.flow.data.validator.EmailValidator;
import com.vaadin.flow.data.value.ValueChangeMode;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;
import com.vaadin.flow.server.auth.AnonymousAllowed;

import jakarta.mail.MessagingException;

@Route("signup")
@PageTitle("Sign Up")
@AnonymousAllowed
public class Signup extends VerticalLayout {
    private final UserService userService;
    private final VerificationService verificationService;
    private final BeanValidationBinder<UserDTO> binder = new BeanValidationBinder<>(UserDTO.class);

    private final TextField username = new TextField("Display Name");
    private final EmailField email = new EmailField("Email Address"); 
    private final PasswordField password = new PasswordField("Password");
    private final PasswordField confirmPassword = new PasswordField("Confirm Password");

    // Resend button: hidden by default, made visible after a successful signup so the user
    // can request another verification email if the first didn't arrive (often spam).
    private final Button resendBtn = new Button("Resend verification email");

    // The user we just signed up. Used by the resend button to know whom to re-send to.
    // Reset to null each time someone returns to a fresh signup state.
    private transient ApplicationUser lastSignedUpUser;

    // Browser-detected IANA timezone (e.g. "America/Vancouver"), captured via JS when the
    // page loads. Stays null until the browser reports back; createUser handles null safely.
    private volatile String detectedTimezone;

    public Signup(UserService userService, VerificationService verificationService) {
        this.userService = userService;
        this.verificationService = verificationService;

        // --- 1. NEW HEADERS ---
        H1 title = new H1("Create an Account");
        title.getStyle().set("margin-top", "0");
        title.getStyle().set("margin-bottom", "8px");
        title.getStyle().set("font-size", "28px");

        Span subtitle = new Span("Join to start managing your tasks.");
        subtitle.getStyle().set("color", "var(--lumo-secondary-text-color)");
        subtitle.getStyle().set("margin-bottom", "24px");

        // Set inputs to trigger validation checks as you type
        username.setValueChangeMode(ValueChangeMode.LAZY);
        email.setValueChangeMode(ValueChangeMode.LAZY);
        password.setValueChangeMode(ValueChangeMode.LAZY);
        confirmPassword.setValueChangeMode(ValueChangeMode.LAZY);

        // Make fields span the full width of the card
        username.setWidthFull();
        email.setWidthFull();
        password.setWidthFull();
        confirmPassword.setWidthFull();

        Button submitBtn = new Button("Sign Up");
        submitBtn.addThemeVariants(ButtonVariant.LUMO_PRIMARY);
        submitBtn.setWidthFull(); // Make button full width

        Button loginLink = new Button("Already have an account? Log in", e ->
                getUI().ifPresent(ui -> ui.navigate("login"))
        );
        loginLink.addThemeVariants(ButtonVariant.LUMO_TERTIARY);
        loginLink.setWidthFull(); // Make link full width

        // Resend button: hidden until a successful signup, then revealed so the user can
        // request another verification email if the first one didn't arrive.
        resendBtn.addThemeVariants(ButtonVariant.LUMO_TERTIARY);
        resendBtn.setWidthFull();
        resendBtn.setVisible(false);
        resendBtn.addClickListener(e -> {
            if (lastSignedUpUser == null) {
                // Defensive: shouldn't happen because the button only appears after a
                // successful signup sets this field.
                return;
            }
            try {
                this.verificationService.issueAndSendToken(lastSignedUpUser);
                Notification n = Notification.show(
                        "Verification email resent to " + lastSignedUpUser.getEmail() + ".");
                n.addThemeVariants(NotificationVariant.LUMO_SUCCESS);
                n.setPosition(Notification.Position.TOP_CENTER);
                n.setDuration(5000);
            } catch (MessagingException ex) {
                Notification n = Notification.show(
                        "Couldn't resend the verification email right now. Try again in a few minutes.");
                n.addThemeVariants(NotificationVariant.LUMO_ERROR);
                n.setPosition(Notification.Position.TOP_CENTER);
                n.setDuration(5000);
            }
        });

        // --- 2. BINDER LOGIC (Untouched) ---
        binder.bindInstanceFields(this);
        
        binder.forField(email)
                .asRequired("Email is required")
                .withValidator(new EmailValidator("Please enter a valid email address")) // 2. Must look like an email
                .withValidator(e -> !this.userService.emailExists(e), "This email is already registered")
                .bind(UserDTO::getEmail, UserDTO::setEmail);

        binder.forField(confirmPassword)
                .withValidator(confirmPass -> confirmPass.equals(password.getValue()), "Passwords do not match");

        submitBtn.addClickListener(e -> {
            UserDTO dto = new UserDTO();
            if (binder.writeBeanIfValid(dto)) {
                // Create the user (NOT yet enabled), then send the verification email.
                ApplicationUser saved = this.userService.createUser(
                        dto.getUsername(), dto.getEmail(), dto.getPassword(), detectedTimezone);
                try {
                    this.verificationService.issueAndSendToken(saved);
                    // Remember whom we just signed up so the resend button knows who to re-send to.
                    this.lastSignedUpUser = saved;
                    resendBtn.setVisible(true);

                    Notification n = Notification.show(
                            "Account created! We've sent a verification link to " + dto.getEmail()
                                    + ". Check your inbox (and spam folder) to activate your account.");
                    n.addThemeVariants(NotificationVariant.LUMO_SUCCESS);
                    n.setPosition(Notification.Position.TOP_CENTER);
                    n.setDuration(8000);
                    // Clear the form so the user can't accidentally double-submit; stay on this page.
                    binder.readBean(new UserDTO());
                    username.clear();
                    email.clear();
                    password.clear();
                    confirmPassword.clear();
                } catch (MessagingException ex) {
                    // The user is created in the DB but we couldn't email them. Tell them
                    // they can use the "Resend verification" link on the login page once
                    // the email issue is resolved.
                    Notification n = Notification.show(
                            "Account created, but we couldn't send the verification email right now. "
                                    + "Try the 'Resend verification' link on the login page in a few minutes.");
                    n.addThemeVariants(NotificationVariant.LUMO_ERROR);
                    n.setPosition(Notification.Position.TOP_CENTER);
                    n.setDuration(8000);
                }
            } else {
                binder.validate();
            }
        });

        // --- 3. THE CARD LAYOUT ---
        FormLayout formLayout = new FormLayout();
        formLayout.add(username, email, password, confirmPassword);
        formLayout.setResponsiveSteps(new FormLayout.ResponsiveStep("0", 1));

        // Group everything into a styled "Card" container
        VerticalLayout card = new VerticalLayout(title, subtitle, formLayout, submitBtn, resendBtn, loginLink);
        card.setWidth("400px");
        card.setPadding(true);
        card.setAlignItems(Alignment.CENTER); // Center the text and buttons
        
        // The CSS that makes it look like a floating portal box
        card.getStyle().set("background-color", "#ffffff");
        card.getStyle().set("border", "1px solid #e5e7eb");
        card.getStyle().set("border-radius", "12px");
        card.getStyle().set("box-shadow", "0 10px 15px -3px rgba(0, 0, 0, 0.1)");

        // Center the entire card on the screen
        setSizeFull();
        setJustifyContentMode(JustifyContentMode.CENTER);
        setAlignItems(Alignment.CENTER);
        getStyle().set("background-color", "var(--lumo-contrast-5pct)"); // Very subtle grey background for the page
        
        add(card);
    }

    @Override
    protected void onAttach(com.vaadin.flow.component.AttachEvent attachEvent) {
        super.onAttach(attachEvent);
        // Ask the browser for its IANA timezone and send it back to the server, where we
        // stash it in detectedTimezone for use when the account is created. This runs once
        // when the page loads; by the time the user fills the form and clicks Sign Up, the
        // value is almost always already populated. If it somehow isn't, createUser handles
        // a null timezone gracefully (the user can set it later in Settings).
        getElement().executeJs(
                "return Intl.DateTimeFormat().resolvedOptions().timeZone;")
                .then(String.class, tz -> this.detectedTimezone = tz);
    }
}
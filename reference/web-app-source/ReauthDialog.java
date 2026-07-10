package com.jry.base.ui.components;

import java.util.function.Consumer;

import com.jry.backend.entities.ApplicationUser;
import com.vaadin.flow.component.ModalityMode;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.dialog.Dialog;
import com.vaadin.flow.component.html.Paragraph;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.textfield.PasswordField;

import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Modal "type your current password" dialog. Used by Settings before applying sensitive
 * changes (email or password). On success, runs the supplied {@code onConfirmed} runnable;
 * on cancel or wrong password, does nothing destructive.
 *
 * Validates the password locally via the injected {@link PasswordEncoder} comparing
 * against the user's stored hash — no extra DB hit, no Spring Security flow change.
 */
public class ReauthDialog extends Dialog {

    private final transient ApplicationUser user;
    private final transient PasswordEncoder passwordEncoder;
    private final transient Runnable onConfirmed;

    private final PasswordField passwordField = new PasswordField("Current password");

    public ReauthDialog(ApplicationUser user, PasswordEncoder passwordEncoder, Runnable onConfirmed) {
        this.user = user;
        this.passwordEncoder = passwordEncoder;
        this.onConfirmed = onConfirmed;

        setHeaderTitle("Confirm your identity");
        setWidth("420px");
        setModality(ModalityMode.STRICT);
        setDraggable(false);
        setResizable(false);
        setCloseOnEsc(true);
        setCloseOnOutsideClick(false);

        Paragraph blurb = new Paragraph(
                "For your security, please re-enter your current password to apply these changes.");
        blurb.getStyle().set("color", "var(--lumo-secondary-text-color)");
        blurb.getStyle().set("font-size", "14px");
        blurb.getStyle().set("margin-top", "0");

        passwordField.setWidthFull();
        passwordField.setAutofocus(true);

        VerticalLayout body = new VerticalLayout(blurb, passwordField);
        body.setPadding(false);
        body.setSpacing(false);
        add(body);

        Button confirmBtn = new Button("Confirm", e -> attemptConfirm());
        confirmBtn.addThemeVariants(ButtonVariant.LUMO_PRIMARY);
        // Enter key on the password field submits.
        passwordField.addKeyPressListener(e -> {
            if ("Enter".equals(e.getKey().getKeys().get(0))) {
                attemptConfirm();
            }
        });

        Button cancelBtn = new Button("Cancel", e -> close());
        cancelBtn.addThemeVariants(ButtonVariant.LUMO_TERTIARY);

        getFooter().add(cancelBtn, confirmBtn);
    }

    private void attemptConfirm() {
        String entered = passwordField.getValue();
        if (entered == null || entered.isEmpty()) {
            passwordField.setInvalid(true);
            passwordField.setErrorMessage("Required");
            return;
        }
        if (!passwordEncoder.matches(entered, user.getPassword())) {
            passwordField.setInvalid(true);
            passwordField.setErrorMessage("Incorrect password");
            passwordField.clear();
            return;
        }
        // Password matches — close the dialog and run the protected action.
        close();
        onConfirmed.run();
    }
}

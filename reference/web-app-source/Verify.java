package com.jry.base.ui.views;

import java.util.Map;

import com.jry.backend.service.VerificationService;
import com.jry.backend.service.VerificationService.VerificationResult;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.html.H1;
import com.vaadin.flow.component.html.Paragraph;
import com.vaadin.flow.component.icon.Icon;
import com.vaadin.flow.component.icon.VaadinIcon;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.router.BeforeEnterEvent;
import com.vaadin.flow.router.BeforeEnterObserver;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;
import com.vaadin.flow.server.auth.AnonymousAllowed;

/**
 * Public landing page for the email-verification link. Reads ?token=... from the URL,
 * asks the VerificationService to consume it, and shows a result card. From here the
 * user clicks through to log in.
 *
 * Anonymous (no auth required) — the whole point is that they verify before logging in.
 */
@Route("verify")
@PageTitle("Verify Email")
@AnonymousAllowed
public class Verify extends VerticalLayout implements BeforeEnterObserver {

    private final transient VerificationService verificationService;

    public Verify(VerificationService verificationService) {
        this.verificationService = verificationService;
        setSizeFull();
        setJustifyContentMode(JustifyContentMode.CENTER);
        setAlignItems(Alignment.CENTER);
        getStyle().set("background-color", "var(--lumo-contrast-5pct)");
    }

    @Override
    public void beforeEnter(BeforeEnterEvent event) {
        // Read ?token=... from the URL. (Query params come back as a multi-map of String -> List.)
        Map<String, java.util.List<String>> params = event.getLocation().getQueryParameters().getParameters();
        String token = params.getOrDefault("token", java.util.List.of()).stream().findFirst().orElse(null);

        removeAll();
        if (token == null || token.isBlank()) {
            renderResult(false, "Missing verification link",
                    "The verification URL is incomplete. Please use the link from your email exactly as sent.");
            return;
        }

        VerificationResult result = verificationService.verifyToken(token);
        switch (result) {
            case SUCCESS:
            case ALREADY_VERIFIED:
                renderResult(true, "Email verified",
                        "Your account is now active. You can log in and start using TaskApp.");
                break;
            case EMAIL_CHANGED:
                renderResult(true, "Email updated",
                        "Your email address has been changed. Use the new address the next time you log in.");
                break;
            case EMAIL_ALREADY_TAKEN:
                renderResult(false, "Address unavailable",
                        "Sorry — that email address has been registered by another account since you "
                                + "requested the change. Your account's email was not updated.");
                break;
            case TOKEN_EXPIRED:
                renderResult(false, "Link expired",
                        "This verification link has expired. Try logging in and clicking "
                                + "\"Resend verification email\" to get a new one.");
                break;
            case TOKEN_ALREADY_USED:
                renderResult(false, "Link already used",
                        "This verification link has already been used. If you haven't logged in yet, "
                                + "try the \"Resend verification email\" link on the login page.");
                break;
            case TOKEN_NOT_FOUND:
            default:
                renderResult(false, "Invalid link",
                        "We couldn't recognize that verification link. It may have been mistyped, "
                                + "or it's been invalidated by a newer one.");
                break;
        }
    }

    private void renderResult(boolean success, String title, String message) {
        VerticalLayout card = new VerticalLayout();
        card.setWidth("420px");
        card.setPadding(true);
        card.setAlignItems(Alignment.CENTER);
        card.getStyle().set("background-color", "#ffffff");
        card.getStyle().set("border", "1px solid #e5e7eb");
        card.getStyle().set("border-radius", "16px");
        card.getStyle().set("box-shadow", "0 10px 25px rgba(0,0,0,0.08)");

        Icon icon = success ? VaadinIcon.CHECK_CIRCLE.create() : VaadinIcon.WARNING.create();
        icon.setSize("48px");
        icon.setColor(success ? "#16a34a" : "#dc2626");

        H1 heading = new H1(title);
        heading.getStyle().set("font-size", "22px");
        heading.getStyle().set("margin", "8px 0 4px 0");

        Paragraph blurb = new Paragraph(message);
        blurb.getStyle().set("text-align", "center");
        blurb.getStyle().set("color", "var(--lumo-secondary-text-color)");

        Button toLogin = new Button("Go to login", e -> getUI().ifPresent(ui -> ui.navigate("login")));
        toLogin.addThemeVariants(ButtonVariant.LUMO_PRIMARY);
        toLogin.getStyle().set("margin-top", "16px");

        card.add(icon, heading, blurb, toLogin);
        add(card);
    }
}

package com.jry.base.ui.views;

import com.vaadin.flow.component.Html;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.checkbox.Checkbox;
import com.vaadin.flow.component.html.H1;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.textfield.EmailField;
import com.vaadin.flow.component.textfield.PasswordField;
import com.vaadin.flow.router.BeforeEnterEvent;
import com.vaadin.flow.router.BeforeEnterObserver;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;
import com.vaadin.flow.server.auth.AnonymousAllowed;

@Route("login")
@PageTitle("Login")
@AnonymousAllowed
public class Login extends VerticalLayout implements BeforeEnterObserver {

    // NEW: Custom error message for your custom form
    private final Span errorMessage = new Span("Invalid email or password.");

    public Login() {
        addClassName("login-view");
        setSizeFull();

        setJustifyContentMode(JustifyContentMode.CENTER);
        setAlignItems(Alignment.CENTER);

        H1 title = new H1("Log in");

        // NEW: Changed to EmailField
        EmailField email = new EmailField("Email address");
        email.setWidthFull();

        PasswordField password = new PasswordField("Password");
        password.setWidthFull();

        Checkbox rememberMe = new Checkbox("Remember me");

        // Set up the error message styling
        errorMessage.getStyle().set("color", "var(--lumo-error-color)");
        errorMessage.getStyle().set("font-size", "14px");
        errorMessage.getStyle().set("font-weight", "500");
        errorMessage.setVisible(false); // Hidden by default

        Button loginBtn = new Button("Log in");
        loginBtn.addThemeVariants(ButtonVariant.LUMO_PRIMARY);
        loginBtn.setWidthFull();

        Button signupBtn = new Button("Don't have an account? Sign up");
        signupBtn.addThemeVariants(ButtonVariant.LUMO_TERTIARY);
        signupBtn.addClickListener(e -> getUI().ifPresent(ui -> ui.navigate("signup")));

        // Added errorMessage to your layout
        VerticalLayout formLayout = new VerticalLayout(title, errorMessage, email, password, rememberMe, loginBtn);
        formLayout.setPadding(true);
        formLayout.setWidth("350px");
        formLayout.getStyle().set("border", "1px solid #e5e7eb");
        formLayout.getStyle().set("border-radius", "12px");
        formLayout.getStyle().set("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)");

        // Notice the name='username' stays the same so Spring Security can find it!
        String hiddenFormHtml = "<form id='login-form' method='post' action='login' style='display:none;'>" +
                "<input type='text' id='hidden-user' name='username'>" +
                "<input type='password' id='hidden-pass' name='password'>" +
                "<input type='checkbox' id='hidden-remember' name='remember-me'>" +
                "</form>";
        Html hiddenForm = new Html(hiddenFormHtml);

        loginBtn.addClickListener(e -> {
            getElement().executeJs(
                    "document.getElementById('hidden-user').value = $0;" +
                    "document.getElementById('hidden-pass').value = $1;" +
                    "document.getElementById('hidden-remember').checked = $2;" +
                    "document.getElementById('login-form').submit();",
                    email.getValue(), password.getValue(), rememberMe.getValue() // Pass email value here
            );
        });

        add(formLayout, signupBtn, hiddenForm);
    }

    @Override
    public void beforeEnter(BeforeEnterEvent beforeEnterEvent) {
        // If Spring Security rejects the login, it redirects here with ?error in the URL
        if(beforeEnterEvent.getLocation().getQueryParameters().getParameters().containsKey("error")) {
            errorMessage.setVisible(true); // Show your custom error text
        }
    }
}

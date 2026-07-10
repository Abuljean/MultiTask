package com.jry;

import com.vaadin.flow.theme.Theme;
import com.vaadin.flow.theme.aura.Aura;
import com.vaadin.flow.theme.lumo.Lumo;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import com.vaadin.flow.component.dependency.StyleSheet;
import com.vaadin.flow.component.page.AppShellConfigurator;
import com.vaadin.flow.server.PWA;

@SpringBootApplication
@Theme(themeClass = Lumo.class)
@StyleSheet(Aura.STYLESHEET)
@StyleSheet("styles.css") // Your custom styles
@PWA(
        name = "TaskApp",            // full name shown in install prompt / manifest
        shortName = "TaskApp",       // <= 12 chars, shown under the home-screen icon
        offlinePath = "offline.html" // static page shown when offline (Flow views can't run offline)
)
public class Application implements AppShellConfigurator {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

}

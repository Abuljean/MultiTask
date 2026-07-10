package com.jry.base.ui.views;

import com.jry.base.ui.components.ViewToolbar;
import com.vaadin.flow.component.html.Paragraph;
import com.vaadin.flow.component.icon.VaadinIcon;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;
import com.vaadin.flow.server.menu.MenuEntry;
import com.vaadin.flow.component.html.H3;

import jakarta.annotation.security.PermitAll;

import com.vaadin.flow.router.Menu;

@Route("calendar")
@PageTitle("Calendar")
@Menu(order = 1, title = "Calendar", icon = "vaadin:calendar")
@PermitAll
public class Calendar extends VerticalLayout {

    public Calendar() {
        setSizeFull();
        setPadding(true);

        add(new ViewToolbar("Calendar"));

        VerticalLayout placeholder = new VerticalLayout();
        placeholder.setAlignItems(Alignment.CENTER);
        placeholder.setJustifyContentMode(JustifyContentMode.CENTER);
        placeholder.setSizeFull();
        placeholder.getStyle().set("color", "#6b7280");

        var icon = VaadinIcon.CALENDAR_O.create();
        icon.setSize("64px");
        icon.setColor("#d1d5db");

        H3 heading = new H3("Calendar coming soon");
        heading.getStyle().set("margin-bottom", "4px");

        Paragraph blurb = new Paragraph(
                "This is where your tasks will show up on a monthly calendar. "
                        + "CSV import and a full month/week view are planned for a future update.");
        blurb.getStyle().set("max-width", "420px");
        blurb.getStyle().set("text-align", "center");

        placeholder.add(icon, heading, blurb);
        add(placeholder);
        expand(placeholder);
    }
}

package com.jry.base.ui.components;

import com.vaadin.flow.component.Component;
import com.vaadin.flow.component.Composite;
import com.vaadin.flow.component.UI;
import com.vaadin.flow.component.applayout.DrawerToggle;
import com.vaadin.flow.component.html.H1;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.orderedlayout.FlexComponent;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.theme.lumo.LumoUtility;
import org.jspecify.annotations.Nullable;

public final class ViewToolbar extends Composite<HorizontalLayout> {
    private H1 title;

    public ViewToolbar(@Nullable String viewTitle, Component... components) {
        var layout = getContent();
        layout.setPadding(true);
        layout.setWrap(true);
        layout.setWidthFull();
        layout.addClassName(LumoUtility.Border.BOTTOM);

        var drawerToggle = new DrawerToggle();
        drawerToggle.addClassNames(LumoUtility.Margin.NONE);

        title = new H1(viewTitle);
        title.addClassNames(LumoUtility.FontSize.XLARGE, LumoUtility.Margin.NONE, LumoUtility.FontWeight.LIGHT);

        //clock
        Span clock = new Span();
        clock.setId("real-time-clock"); // We need an ID so Javascript can find it
        clock.getStyle().set("margin-left", "16px"); // Space it out from the title
        clock.getStyle().set("font-size", "14px");
        clock.getStyle().set("color", "#6b7280");
        clock.getStyle().set("font-weight", "500");

        // Inject Javascript to update this specific span every 1000 milliseconds (1 second).
        // Shows date + time together, e.g. "May 26 · 11:43:42 PM".
        UI.getCurrent().getPage().executeJs(
                "setInterval(function() {" +
                        "  var clockElement = document.getElementById('real-time-clock');" +
                        "  if (clockElement) {" + // Make sure it exists before updating
                        "      var now = new Date();" +
                        "      var dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });" +
                        "      var timeStr = now.toLocaleTimeString('en-US');" +
                        "      clockElement.innerText = dateStr + ' \u00b7 ' + timeStr;" +
                        "  }" +
                        "}, 1000);"
        );


        var toggleAndTitle = new HorizontalLayout(drawerToggle, title, clock);
        toggleAndTitle.setDefaultVerticalComponentAlignment(FlexComponent.Alignment.CENTER);
        layout.add(toggleAndTitle);
        layout.setFlexGrow(1, toggleAndTitle);

        if (components.length > 0) {
            var actions = new HorizontalLayout(components);
            actions.setJustifyContentMode(FlexComponent.JustifyContentMode.BETWEEN);
            layout.add(actions);
        }
    }

    public static Component group(Component... components) {
        var group = new HorizontalLayout(components);
        group.setWrap(true);
        return group;
    }

    public void setTitle(String title) {
        if(title != null) this.title.setText(title);
    }
}

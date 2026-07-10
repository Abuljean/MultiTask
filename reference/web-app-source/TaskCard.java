package com.jry.base.ui.components;

import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.function.Consumer;

import com.jry.backend.entities.Task;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.html.H3;
import com.vaadin.flow.component.html.Paragraph;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.icon.Icon;
import com.vaadin.flow.component.icon.VaadinIcon;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;

public class TaskCard extends VerticalLayout {
    public static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("EEEE, MMM dd yyyy hh:mm a", Locale.US);

    private final Task task;
    private final Consumer<Task> onComplete;
    private final Consumer<Task> onDelete;
    private final int urgentThresholdHours;
    private final java.time.ZoneId userZone;

    public TaskCard(Task task, Consumer<Task> onComplete, Consumer<Task> onDelete,
                    int urgentThresholdHours, java.time.ZoneId userZone) {
        this.task = task;
        this.onComplete = onComplete;
        this.onDelete = onDelete;
        this.urgentThresholdHours = urgentThresholdHours;
        this.userZone = userZone;

        applyBaseStyling();

        VerticalLayout topContent = createTopContent();
        HorizontalLayout footer = createFooter();
        Button actionBtn = createFloatingActionBtn();

        add(actionBtn);
        add(topContent, footer);
        expand(topContent);
    }

    /** Small badge showing the priority label ("1st"/"2nd"/"3rd") in the tier's color.
     *  Placed at the left of the card's top header row, above the title. */
    private Span createPriorityBadge(int rank) {
        Span badge = new Span(com.jry.base.ui.components.Priorities.label(rank));
        badge.getStyle().set("padding", "2px 8px");
        badge.getStyle().set("border-radius", "10px");
        badge.getStyle().set("font-size", "11px");
        badge.getStyle().set("font-weight", "bold");
        badge.getStyle().set("border", "1px solid rgba(0, 0, 0, 0.12)");
        badge.getStyle().set("background-color", com.jry.base.ui.components.Priorities.backgroundColor(rank));
        badge.getStyle().set("color", com.jry.base.ui.components.Priorities.textColor(rank));
        badge.getStyle().set("white-space", "nowrap");
        return badge;
    }

    private void applyBaseStyling() {
        this.getStyle().set("position", "relative");
        addClassName("task-card");

        boolean isCompleted = task.isCompleted();
        boolean isPastDue = task.isPastDue(userZone);
        boolean isUrgent = task.isUrgent(urgentThresholdHours, userZone) && !isCompleted;

        String cardBackground = "#ffffff";
        if (isCompleted) {
            cardBackground = "#f0fdf4"; // Green
        } else if (isPastDue) {
            cardBackground = "#fef2f2"; // Red
        } else if (isUrgent) {
            cardBackground = "#fff7ed"; // Orange
        }

        //this is base styling that applies to all cards regardless of status, the background color is determined by the status logic above
        getStyle().set("border", "1px solid #dcdcdc");
        getStyle().set("border-radius", "12px");
        getStyle().set("padding", "14px"); 
        getStyle().set("background-color", cardBackground);
        getStyle().set("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)");
        getStyle().set("transition", "all 0.2s ease-in-out");

        getElement().addEventListener("mouseenter", e -> {
            getStyle().set("transform", "translateY(-4px)");
            getStyle().set("box-shadow", "0 10px 15px rgba(0, 0, 0, 0.1)");
        });

        getElement().addEventListener("mouseleave", e -> {
            getStyle().set("transform", "translateY(0)");
            getStyle().set("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)");
        });

        setWidthFull();
        setSpacing(false);
        this.setMinHeight("140px"); 
    }

    private VerticalLayout createTopContent() {
        // Top header row: priority badge on the LEFT (above the title), subject pill on the RIGHT.
        // Using BETWEEN keeps badge left + pill right; a spacer ensures the pill stays right
        // even when one of them is absent.
        HorizontalLayout header = new HorizontalLayout();
        header.setWidthFull();
        header.setJustifyContentMode(JustifyContentMode.BETWEEN);
        header.setAlignItems(com.vaadin.flow.component.orderedlayout.FlexComponent.Alignment.CENTER);
        header.setMinHeight("28px");

        // Left slot: priority badge if set, otherwise an empty span to hold the left position.
        if (task.getPriority() != null) {
            header.add(createPriorityBadge(task.getPriority()));
        } else {
            header.add(new Span()); // empty left placeholder so the pill stays right
        }

        if (task.getSubject() != null && !task.getSubject().isEmpty()) {
            Span subjectPill = new Span(task.getSubject());
            subjectPill.getStyle().set("padding", "4px 10px");
            subjectPill.getStyle().set("border-radius", "12px");
            subjectPill.getStyle().set("font-size", "12px");
            subjectPill.getStyle().set("font-weight", "bold");
            subjectPill.getStyle().set("border", "1px solid rgba(0, 0, 0, 0.15)");

            String bgColor = task.getSubjectColor() != null ? task.getSubjectColor() : "#f3f4f6";
            subjectPill.getStyle().set("background-color", bgColor);
            subjectPill.getStyle().set("color", getContrastTextColor(bgColor));

            header.add(subjectPill);
        }

        //text fields should be added after the header to ensure the pill is always at the top right corner
        VerticalLayout topContent = new VerticalLayout();
        topContent.setPadding(false);
        topContent.setSpacing(false);

        H3 title = new H3(task.getTitle());
        title.getStyle().set("margin-top", "4px");
        title.getStyle().set("margin-bottom", "4px");
        title.getStyle().set("padding-right", "50px");
        topContent.add(header, title);
        
        if (task.getDescription() != null && !task.getDescription().trim().isEmpty()) {
            Paragraph description = new Paragraph(task.getDescription());
            description.getStyle().set("color", "#666666");
            description.getStyle().set("margin-top", "0");
            description.getStyle().set("margin-bottom", "12px");
            description.getStyle().set("padding-right", "50px");
            topContent.add(description);
        }

        return topContent;
    }

    private HorizontalLayout createFooter() {
        String dateString = task.getDueDate() != null ? task.getDueDate().format(DATE_TIME_FORMATTER) : "No due date";
        Span date = new Span("Due: " + dateString);
        date.getStyle().set("font-size", "14px");
        date.getStyle().set("color", "#888888");

        HorizontalLayout rightBadges = new HorizontalLayout(createCategoryBadge(), createStatusBadge());
        rightBadges.setAlignItems(Alignment.CENTER);
        rightBadges.getStyle().set("gap", "8px");

        HorizontalLayout footer = new HorizontalLayout(date, rightBadges);
        footer.setWidthFull();
        footer.setAlignItems(Alignment.CENTER);
        footer.setJustifyContentMode(JustifyContentMode.BETWEEN);

        return footer;
    }

    private Button createFloatingActionBtn() {
        boolean isCompleted = task.isCompleted();
        Button actionBtn = new Button();
        Icon actionIcon;

        if (!isCompleted) {
            actionIcon = VaadinIcon.CHECK.create();
            actionIcon.setSize("24px");
            actionBtn.setIcon(actionIcon);
            actionBtn.getStyle().set("background-color", "#e5e7eb");
            actionIcon.setColor("#4b5563");
            actionBtn.getStyle().set("border", "1px solid #d1d5db");
            
            actionBtn.setTooltipText("Mark as Completed");

            actionBtn.getElement().addEventListener("mouseenter", e -> {
                actionBtn.getStyle().set("background-color", "#22c55e"); 
                actionIcon.setColor("#ffffff");
                actionBtn.getStyle().set("border-color", "#22c55e");
            });
            actionBtn.getElement().addEventListener("mouseleave", e -> {
                actionBtn.getStyle().set("background-color", "#e5e7eb");
                actionIcon.setColor("#4b5563");
                actionBtn.getStyle().set("border-color", "#d1d5db");
            });

            actionBtn.addClickListener(e -> onComplete.accept(task));
            actionBtn.getElement().addEventListener("click", ignore -> {}).stopPropagation();

        } else {
            actionIcon = VaadinIcon.TRASH.create();
            actionIcon.setSize("24px");
            actionBtn.setIcon(actionIcon);
            actionBtn.getStyle().set("background-color", "#e5e7eb");
            actionIcon.setColor("#4b5563");
            actionBtn.getStyle().set("border", "1px solid #d1d5db");
            
            actionBtn.setTooltipText("Permanently Delete Task");

            actionBtn.getElement().addEventListener("mouseenter", e -> {
                actionBtn.getStyle().set("background-color", "#ef4444"); 
                actionIcon.setColor("#ffffff");
                actionBtn.getStyle().set("border-color", "#ef4444");
            });
            actionBtn.getElement().addEventListener("mouseleave", e -> {
                actionBtn.getStyle().set("background-color", "#e5e7eb");
                actionIcon.setColor("#4b5563");
                actionBtn.getStyle().set("border-color", "#d1d5db");
            });

            actionBtn.addClickListener(e -> onDelete.accept(task));
            actionBtn.getElement().addEventListener("click", ignore -> {}).stopPropagation();
        }

        actionBtn.getStyle().set("cursor", "pointer");
        actionBtn.getStyle().set("padding", "12px");
        actionBtn.getStyle().set("border-radius", "8px");
        actionBtn.getStyle().set("position", "absolute");
        actionBtn.getStyle().set("right", "16px");
        actionBtn.getStyle().set("top", "47%");
        actionBtn.getStyle().set("transform", "translateY(-50%)");
        actionBtn.getStyle().set("z-index", "10");
        actionBtn.getStyle().set("transition", "all 0.2s ease");
        
        return actionBtn;
    }

    private Span createCategoryBadge() {
        Span categoryBadge = new Span(task.getCategory() != null ? task.getCategory() : "Personal");
        categoryBadge.getStyle().set("padding", "4px 10px");
        categoryBadge.getStyle().set("border-radius", "12px");
        categoryBadge.getStyle().set("font-size", "12px");
        categoryBadge.getStyle().set("font-weight", "bold");
        categoryBadge.getStyle().set("border", "1px solid rgba(0, 0, 0, 0.15)");

        String bgColor = task.getCategoryColor() != null ? task.getCategoryColor() : "#fef3c7";
        categoryBadge.getStyle().set("background-color", bgColor);
        categoryBadge.getStyle().set("color", getContrastTextColor(bgColor));
        return categoryBadge;
    }

    private Span createStatusBadge() {
        boolean isCompleted = task.isCompleted();
        boolean isPastDue = task.isPastDue(userZone);
        boolean isUrgent = task.isUrgent(urgentThresholdHours, userZone) && !isCompleted;

        Span statusBadge = new Span();
        statusBadge.getStyle().set("padding", "4px 10px");
        statusBadge.getStyle().set("border-radius", "12px");
        statusBadge.getStyle().set("font-size", "12px");
        statusBadge.getStyle().set("font-weight", "bold");
        statusBadge.getStyle().set("border", "1px solid rgba(0, 0, 0, 0.15)");

        if (isCompleted) {
            statusBadge.setText("Completed");
            statusBadge.getStyle().set("color", "#166534");
            statusBadge.getStyle().set("background-color", "#dcfce7");
        } else if (isPastDue) {
            statusBadge.setText("Overdue");
            statusBadge.getStyle().set("color", "#991b1b");
            statusBadge.getStyle().set("background-color", "#fecaca");
        } else if (isUrgent) {
            statusBadge.setText("Urgent");
            statusBadge.getStyle().set("color", "#9a3412");
            statusBadge.getStyle().set("background-color", "#ffedd5");
        } else {
            statusBadge.setText("Ongoing");
            statusBadge.getStyle().set("color", "#1e3a8a");
            statusBadge.getStyle().set("background-color", "#dbeafe");
        }
        return statusBadge;
    }

    private String getContrastTextColor(String hexColor) {
        if (hexColor == null || !hexColor.startsWith("#") || hexColor.length() != 7) return "#111827";
        try {
            int hex = Integer.parseInt(hexColor.substring(1), 16);
            
            // Extract R, G, and B using bit shifting
            int r = (hex & 0xFF0000) >> 16;
            int g = (hex & 0xFF00) >> 8;
            int b = (hex & 0xFF);
            
            double brightness = (r * 299 + g * 587 + b * 114) / 1000.0;
            return brightness < 128 ? "#ffffff" : "#111827";
        } catch (Exception e) { 
            return "#111827"; 
        }
    }
}
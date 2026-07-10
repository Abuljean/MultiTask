package com.jry.base.ui.views;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.security.core.userdetails.UserDetails;

import com.jry.backend.entities.ApplicationUser;
import com.jry.backend.entities.Task;
import com.jry.backend.entities.TaskRepository;
import com.jry.backend.entities.UserRepository;
import com.jry.base.ui.components.ViewToolbar;
import com.jry.base.ui.components.TaskDialog;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.details.Details;
import com.vaadin.flow.component.dialog.Dialog;
import com.vaadin.flow.component.html.H4;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.icon.VaadinIcon;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;
import com.vaadin.flow.router.Menu;
import com.vaadin.flow.spring.security.AuthenticationContext;

import jakarta.annotation.security.PermitAll;

import org.vaadin.stefan.fullcalendar.CalendarViewImpl;
import org.vaadin.stefan.fullcalendar.Entry;
import org.vaadin.stefan.fullcalendar.FullCalendar;
import org.vaadin.stefan.fullcalendar.dataprovider.EntryProvider;
import org.vaadin.stefan.fullcalendar.dataprovider.InMemoryEntryProvider;

/**
 * Monthly calendar view. Shows the logged-in user's dated tasks as colored entries.
 * Clicking a day opens a dialog listing that day's tasks (each navigates to its detail page).
 * Tasks with no due date are listed in a collapsible section below the calendar.
 *
 * Built against the FullCalendar for Flow add-on, v7.1.x (org.vaadin.stefan:fullcalendar2).
 */
@Route("calendar")
@PageTitle("Calendar")
@Menu(order = 1, title = "Calendar", icon = "vaadin:calendar")
@PermitAll
public class CalendarView extends VerticalLayout {

    private static final DateTimeFormatter DAY_HEADER_FORMAT =
            DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.US);
    private static final DateTimeFormatter TIME_FORMAT =
            DateTimeFormatter.ofPattern("h:mm a", Locale.US);

    private final transient List<Task> userTasks;
    private final FullCalendar calendar;
    private final transient TaskRepository taskRepo;
    private final transient ApplicationUser currentUser;

    public CalendarView(TaskRepository taskRepo, UserRepository userRepo, AuthenticationContext authContext) {
        this.taskRepo = taskRepo;
        String userEmail = authContext.getAuthenticatedUser(UserDetails.class)
                .orElseThrow(() -> new IllegalStateException("No authenticated user in session"))
                .getUsername();
        this.currentUser = userRepo.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalStateException("No account found for email: " + userEmail));
        this.userTasks = taskRepo.findByUser(currentUser);

        setSizeFull();
        setPadding(true);

        // --- Build the calendar (v7: direct constructor; builder is deprecated) ---
        calendar = new FullCalendar();
        calendar.changeView(CalendarViewImpl.DAY_GRID_MONTH);
        // Force US English so weekday headers read "Mon, Tue, Wed..." instead of the
        // locale default (which was resolving to Dutch: "Ma, Di, Wo...").
        // Uses the raw FullCalendar option key as a String to avoid depending on the
        // Option enum (whose exact location varies); "locale" is a stable FC option name.
        calendar.setOption("locale", "en");
        // Only render the weeks the month actually needs (no forced empty 6th row), so each
        // visible week row gets more vertical space and the cells look larger.
        calendar.setOption("fixedWeekCount", false);
        // We intentionally do NOT call setTimezone here, even though we now have a per-user
        // timezone available. The calendar's entries are all-day (date-only LocalDate)
        // entries, which are timezone-independent by nature — a task due "Jun 8" shows on
        // Jun 8 in any zone. setTimezone only affects timed entries and "today" highlighting,
        // and re-introducing it risks the date-shift bug we fixed earlier by switching to
        // LocalDate entries. Per the light-timezone design, the user's zone matters for "now"
        // comparisons (urgency/past-due, handled in Task/TaskCard), not for calendar display.
        // Fixed height tuned so the whole month fits on a typical screen without scrolling.
        // This is the easy knob: raise it for bigger cells, lower it if it overflows.
        calendar.setHeight("700px");
        calendar.setWidthFull();

        // Map each DATED task into a calendar Entry, then hand them all to the calendar
        // via an InMemoryEntryProvider (v7 has no calendar.addEntry(...) anymore).
        List<Entry> entries = new ArrayList<>();
        for (Task task : userTasks) {
            if (task.getDueDate() == null) {
                continue; // undated tasks handled separately below
            }
            entries.add(toEntry(task));
        }
        InMemoryEntryProvider<Entry> entryProvider = EntryProvider.inMemoryFrom(entries);
        calendar.setEntryProvider(entryProvider);

        // --- Navigation bar: Prev / Today / Next + month label ---
        Span monthLabel = new Span();
        monthLabel.getStyle().set("font-weight", "600");
        monthLabel.getStyle().set("font-size", "18px");
        monthLabel.getStyle().set("text-align", "center");
        monthLabel.getStyle().set("margin-left", "12px");

        Button prevBtn = new Button(VaadinIcon.ANGLE_LEFT.create(), e -> calendar.previous());
        Button todayBtn = new Button("Today", e -> calendar.today());
        Button nextBtn = new Button(VaadinIcon.ANGLE_RIGHT.create(), e -> calendar.next());
        prevBtn.addThemeVariants(ButtonVariant.LUMO_TERTIARY);
        nextBtn.addThemeVariants(ButtonVariant.LUMO_TERTIARY);
        todayBtn.addThemeVariants(ButtonVariant.LUMO_PRIMARY);

        // Right-side control cluster: Today + arrows grouped, then the month label.
        // (Arrows stay next to the month they change.)
        HorizontalLayout navBar = new HorizontalLayout(prevBtn, todayBtn, nextBtn, monthLabel);
        navBar.setAlignItems(Alignment.CENTER);
        navBar.getStyle().set("gap", "8px");
        // The toolbar places this group on the far right of the title row.
        ViewToolbar toolbar = new ViewToolbar("Calendar", navBar);

        // Keep the month label in sync with whatever month FC is currently displaying.
        calendar.addDatesRenderedListener(event -> {
            // The rendered interval start is the first visible day; nudge into the month
            // (month grids show trailing days of the prior month) to get the real label.
            LocalDate intervalStart = event.getIntervalStart();
            LocalDate labelDate = intervalStart.plusDays(7); // safely inside the displayed month
            monthLabel.setText(labelDate.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.US)));
        });

        // Clicking a day cell opens a dialog with that day's tasks.
        calendar.addTimeslotClickedListener(event -> {
            LocalDateTime clicked = event.getDateTime();
            if (clicked != null) {
                openDayDialog(clicked.toLocalDate());
            }
        });

        // Clicking an entry opens the edit dialog (HUD) right here, instead of navigating
        // away to the detail page.
        calendar.addEntryClickedListener(event -> {
            String taskId = event.getEntry().getCustomProperty("taskId");
            if (taskId != null) {
                taskRepo.findById(Long.valueOf(taskId)).ifPresent(task ->
                        TaskDialog.openForEdit(this.taskRepo, this.currentUser, task, this::refreshCalendar));
            }
        });

        add(toolbar, calendar);
        expand(calendar);

        // --- Undated tasks section ---
        add(buildNoDueDateSection());
    }

    /**
     * Re-reads this user's tasks and rebuilds the calendar entries in place (no page reload).
     * Called after the edit dialog saves or deletes a task.
     */
    private void refreshCalendar() {
        userTasks.clear();
        userTasks.addAll(taskRepo.findByUser(currentUser));

        List<Entry> entries = new ArrayList<>();
        for (Task task : userTasks) {
            if (task.getDueDate() != null) {
                entries.add(toEntry(task));
            }
        }
        calendar.setEntryProvider(EntryProvider.inMemoryFrom(entries));
        calendar.getEntryProvider().refreshAll();
    }

    /** Converts a dated Task into a FullCalendar Entry, colored by subject/category. */
    private Entry toEntry(Task task) {
        Entry entry = new Entry();
        entry.setTitle(task.getTitle());

        LocalDateTime due = task.getDueDate();
        if (due == null) {
            // Defensive: callers should only pass dated tasks, but guard anyway so this
            // method is safe on its own and IntelliJ knows `due` is non-null below.
            return entry;
        }
        // A due date is a deadline, not a timed event. Render it as an ALL-DAY entry.
        // IMPORTANT: set it with a LocalDate (date-only), NOT a LocalDateTime. In v7 the
        // LocalDateTime setters are treated as UTC and then shifted by the calendar's
        // timezone, which pushed entries to the wrong day. A LocalDate-based all-day entry
        // is bound to that single day and is not timezone-shifted.
        entry.setAllDay(true);
        entry.setStart(due.toLocalDate());
        entry.setEnd(due.toLocalDate());

        // Pick a color: prefer subject color, fall back to category color, then a default.
        String color = task.getSubjectColor();
        if (color == null || color.isEmpty()) {
            color = task.getCategoryColor();
        }
        if (color == null || color.isEmpty()) {
            color = "#3b82f6";
        }
        entry.setColor(color);

        // Stash the task id so the click listener can navigate to its detail page.
        if (task.getId() != null) {
            entry.setCustomProperty("taskId", String.valueOf(task.getId()));
        }
        return entry;
    }

    /** Opens a dialog listing all of the user's tasks due on the given date. */
    private void openDayDialog(LocalDate day) {
        List<Task> tasksThatDay = new ArrayList<>();
        for (Task task : userTasks) {
            if (task.getDueDate() != null && task.getDueDate().toLocalDate().equals(day)) {
                tasksThatDay.add(task);
            }
        }

        Dialog dialog = new Dialog();
        dialog.setHeaderTitle(day.format(DAY_HEADER_FORMAT));

        VerticalLayout content = new VerticalLayout();
        content.setPadding(false);
        content.setSpacing(true);

        if (tasksThatDay.isEmpty()) {
            content.add(new Span("No tasks due on this day."));
        } else {
            for (Task task : tasksThatDay) {
                content.add(buildDialogRow(task, dialog));
            }
        }

        Button closeBtn = new Button("Close", e -> dialog.close());
        closeBtn.addThemeVariants(ButtonVariant.LUMO_TERTIARY);
        dialog.getFooter().add(closeBtn);

        dialog.add(content);
        dialog.open();
    }

    /** A single clickable task row inside the day dialog. */
    private HorizontalLayout buildDialogRow(Task task, Dialog parentDialog) {
        Span dot = new Span();
        String color = task.getSubjectColor() != null && !task.getSubjectColor().isEmpty()
                ? task.getSubjectColor()
                : (task.getCategoryColor() != null ? task.getCategoryColor() : "#3b82f6");
        dot.getStyle().set("display", "inline-block");
        dot.getStyle().set("width", "10px");
        dot.getStyle().set("height", "10px");
        dot.getStyle().set("border-radius", "50%");
        dot.getStyle().set("background-color", color);

        String timeStr = task.getDueDate() != null ? task.getDueDate().format(TIME_FORMAT) : "";
        Span label = new Span(task.getTitle() + (timeStr.isEmpty() ? "" : "  ·  " + timeStr));
        if (task.isCompleted()) {
            label.getStyle().set("text-decoration", "line-through");
            label.getStyle().set("color", "#9ca3af");
        }

        HorizontalLayout row = new HorizontalLayout(dot, label);
        row.setAlignItems(Alignment.CENTER);
        row.getStyle().set("gap", "10px");
        row.getStyle().set("cursor", "pointer");
        row.getStyle().set("padding", "6px 8px");
        row.getStyle().set("border-radius", "8px");
        row.setWidthFull();

        row.getElement().addEventListener("mouseenter",
                e -> row.getStyle().set("background-color", "#f3f4f6"));
        row.getElement().addEventListener("mouseleave",
                e -> row.getStyle().set("background-color", "transparent"));

        row.addClickListener(e -> {
            parentDialog.close();
            TaskDialog.openForEdit(taskRepo, currentUser, task, this::refreshCalendar);
        });

        return row;
    }

    /** Collapsible section listing tasks that have no due date. */
    private Details buildNoDueDateSection() {
        List<Task> undated = new ArrayList<>();
        for (Task task : userTasks) {
            if (task.getDueDate() == null) {
                undated.add(task);
            }
        }

        VerticalLayout inner = new VerticalLayout();
        inner.setPadding(false);
        inner.setSpacing(false);

        if (undated.isEmpty()) {
            inner.add(new Span("All your tasks have a due date. 🎉"));
        } else {
            for (Task task : undated) {
                inner.add(buildUndatedRow(task));
            }
        }

        Span summary = new Span("No due date (" + undated.size() + ")");
        summary.getStyle().set("font-weight", "600");

        Details details = new Details(summary, inner);
        details.setOpened(false);
        details.setWidthFull();
        details.getStyle().set("margin-top", "16px");
        return details;
    }

    private HorizontalLayout buildUndatedRow(Task task) {
        Span label = new Span(task.getTitle());
        if (task.isCompleted()) {
            label.getStyle().set("text-decoration", "line-through");
            label.getStyle().set("color", "#9ca3af");
        }
        HorizontalLayout row = new HorizontalLayout(VaadinIcon.CIRCLE_THIN.create(), label);
        row.setAlignItems(Alignment.CENTER);
        row.getStyle().set("gap", "10px");
        row.getStyle().set("cursor", "pointer");
        row.getStyle().set("padding", "6px 8px");
        row.setWidthFull();
        row.addClickListener(e -> TaskDialog.openForEdit(taskRepo, currentUser, task, this::refreshCalendar));
        return row;
    }
}

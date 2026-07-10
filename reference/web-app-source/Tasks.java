package com.jry.base.ui.views;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.security.core.userdetails.UserDetails;

import com.jry.backend.entities.ApplicationUser;
import com.jry.backend.entities.Task;
import com.jry.backend.entities.TaskRepository;
import com.jry.backend.entities.UserRepository;
import com.jry.backend.service.UserService;
import com.jry.base.ui.components.TaskCardList;
import com.jry.base.ui.components.TaskDialog;
import com.jry.base.ui.components.ViewToolbar;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.icon.VaadinIcon;
import com.vaadin.flow.component.notification.Notification;
import com.vaadin.flow.component.notification.NotificationVariant;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.select.Select;
import com.vaadin.flow.component.textfield.TextField;
import com.vaadin.flow.data.value.ValueChangeMode;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;
import com.vaadin.flow.router.Menu;
import com.vaadin.flow.server.VaadinSession;
import com.vaadin.flow.spring.security.AuthenticationContext;

import jakarta.annotation.security.PermitAll;

@PermitAll
@Route("")
@PageTitle("My Tasks")
@Menu(order = 0, title = "My Tasks", icon = "vaadin:tasks")
public class Tasks extends VerticalLayout {

    private final TaskRepository taskRepo;
    private final transient UserService userService;
    private final ApplicationUser currentUser;
    private TaskCardList grid;

    // Banner offering to update the saved timezone when the browser reports a different one.
    // Hidden until onAttach detects a mismatch (and only once per session).
    private final VerticalLayout timezoneBanner = new VerticalLayout();

    // Filter selects are now fields so reloadTasks() can repopulate them when the
    // underlying tasks change (e.g. a new task introduces a brand-new category).
    private final Select<String> categoryFilter = new Select<>();
    private final Select<String> subjectFilter = new Select<>();

    public Tasks(TaskRepository taskRepo, UserRepository userRepo, UserService userService,
                 AuthenticationContext authContext) {
        this.taskRepo = taskRepo;
        this.userService = userService;

        // --- 1. GET THE LOGGED IN USER ---
        String userEmail = authContext.getAuthenticatedUser(UserDetails.class)
                .orElseThrow(() -> new IllegalStateException("No authenticated user in session"))
                .getUsername();
        this.currentUser = userRepo.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalStateException("No account found for email: " + userEmail));

        // --- 2. HEADER (via ViewToolbar, so it has the drawer toggle + consistent title
        //         font matching the other views, and the action button on the right).
        //         Sign Out lives in the drawer footer now, so it's no longer here. ---

        Button newTaskBtn = new Button("New Task", e ->
                TaskDialog.openForNew(taskRepo, currentUser, this::reloadTasks));
        newTaskBtn.addThemeVariants(ButtonVariant.LUMO_PRIMARY);

        ViewToolbar header = new ViewToolbar("Welcome, " + currentUser.getDisplayName(), newTaskBtn);

        // --- 3. FETCH DATA ---
        List<Task> allTasksInDatabase = taskRepo.findByUser(currentUser);

        // --- 4. BUILD THE GRID ---
        grid = new TaskCardList(allTasksInDatabase, currentUser.getUrgentThresholdHours(), currentUser.getZoneId());
        grid.setOnComplete(taskToComplete -> {
            taskToComplete.setCompleted(true);
            taskRepo.save(taskToComplete);
            reloadTasks();
            showTaskCompletedBanner();
        });
        grid.setOnDelete(taskToDelete -> {
            taskRepo.delete(taskToDelete);
            reloadTasks();
            showTaskDeletedBanner();
        });
        grid.setOnCardClick(task ->
                TaskDialog.openForEdit(taskRepo, currentUser, task, this::reloadTasks));

        // --- 5. BUILD THE TOOLBAR ---
        TextField searchField = new TextField();
        searchField.setPlaceholder("Search tasks...");
        searchField.setPrefixComponent(VaadinIcon.SEARCH.create());
        searchField.setClearButtonVisible(true);
        searchField.setValueChangeMode(ValueChangeMode.EAGER);

        // Filter selects start with "All ..." selected; their items are populated by the
        // shared helper below (which also drives reloadTasks() after edits).
        categoryFilter.setValue("All Categories");
        subjectFilter.setValue("All Subjects");
        repopulateFilters(allTasksInDatabase);

        Select<String> groupByFilter = new Select<>();
        groupByFilter.setItems("Group by Status", "Group by Date", "Group by Subject", "Group by Category", "Group by Priority");

        String savedGroupBy = (String) VaadinSession.getCurrent().getAttribute("savedGroupBy");
        if (savedGroupBy != null) {
            groupByFilter.setValue(savedGroupBy);
        } else {
            groupByFilter.setValue("Group by Status");
        }

        HorizontalLayout toolbar = new HorizontalLayout(searchField, groupByFilter, categoryFilter, subjectFilter);
        toolbar.setWidthFull();
        toolbar.getStyle().set("margin-top", "16px");
        toolbar.getStyle().set("margin-bottom", "16px");

        // --- 6. WIRE TOOLBAR TO GRID ---
        searchField.addValueChangeListener(e -> grid.filter(searchField.getValue(), categoryFilter.getValue(), subjectFilter.getValue(), groupByFilter.getValue()));
        categoryFilter.addValueChangeListener(e -> grid.filter(searchField.getValue(), categoryFilter.getValue(), subjectFilter.getValue(), groupByFilter.getValue()));
        subjectFilter.addValueChangeListener(e -> grid.filter(searchField.getValue(), categoryFilter.getValue(), subjectFilter.getValue(), groupByFilter.getValue()));

        groupByFilter.addValueChangeListener(e -> {
            VaadinSession.getCurrent().setAttribute("savedGroupBy", e.getValue());
            grid.filter(searchField.getValue(), categoryFilter.getValue(), subjectFilter.getValue(), groupByFilter.getValue());
        });

        grid.filter(searchField.getValue(), categoryFilter.getValue(), subjectFilter.getValue(), groupByFilter.getValue());

        // --- 7. FINAL ASSEMBLY ---
        setWidthFull();
        setHeightFull();
        getStyle().set("box-sizing", "border-box");
        setPadding(true);
        getStyle().set("padding-bottom", "48px");
        timezoneBanner.setPadding(false);
        timezoneBanner.setSpacing(false);
        timezoneBanner.setVisible(false);
        add(timezoneBanner, header, toolbar, grid);
    }

    @Override
    protected void onAttach(com.vaadin.flow.component.AttachEvent attachEvent) {
        super.onAttach(attachEvent);
        // Only check once per session — once shown or dismissed, don't nag on every navigation.
        Object handled = VaadinSession.getCurrent().getAttribute("tzBannerHandled");
        if (Boolean.TRUE.equals(handled)) {
            return;
        }
        // Read the browser's current zone (instant, local JS call) and compare to the stored one.
        getElement().executeJs("return Intl.DateTimeFormat().resolvedOptions().timeZone;")
                .then(String.class, browserZone -> {
                    String storedZone = currentUser.getTimezone();
                    if (browserZone != null && !browserZone.isBlank()
                            && storedZone != null && !storedZone.isBlank()
                            && !browserZone.equals(storedZone)) {
                        showTimezoneBanner(browserZone);
                    } else {
                        // No mismatch (or nothing to compare) — mark handled so we don't recheck.
                        VaadinSession.getCurrent().setAttribute("tzBannerHandled", Boolean.TRUE);
                    }
                });
    }

    /** Builds and shows the "your device timezone differs" banner with Update / Dismiss. */
    private void showTimezoneBanner(String browserZone) {
        timezoneBanner.removeAll();

        Span msg = new Span("Your device's timezone (" + browserZone + ") differs from your account setting ("
                + currentUser.getTimezone() + ").");
        msg.getStyle().set("font-size", "14px");

        Button updateBtn = new Button("Update to " + browserZone, e -> {
            userService.updateTimezone(currentUser, browserZone);
            VaadinSession.getCurrent().setAttribute("tzBannerHandled", Boolean.TRUE);
            timezoneBanner.setVisible(false);
            // Refresh the list so urgency/overdue immediately reflect the new zone.
            reloadTasks();
            Notification n = Notification.show("Timezone updated to " + browserZone + ".");
            n.addThemeVariants(NotificationVariant.LUMO_SUCCESS);
            n.setPosition(Notification.Position.TOP_CENTER);
        });
        updateBtn.addThemeVariants(ButtonVariant.LUMO_PRIMARY, ButtonVariant.LUMO_SMALL);

        Button dismissBtn = new Button("Keep current", e -> {
            VaadinSession.getCurrent().setAttribute("tzBannerHandled", Boolean.TRUE);
            timezoneBanner.setVisible(false);
        });
        dismissBtn.addThemeVariants(ButtonVariant.LUMO_TERTIARY, ButtonVariant.LUMO_SMALL);

        HorizontalLayout actions = new HorizontalLayout(updateBtn, dismissBtn);
        actions.setSpacing(true);

        VerticalLayout box = new VerticalLayout(msg, actions);
        box.setPadding(false);
        box.setSpacing(false);
        box.getStyle().set("background-color", "#eff6ff"); // light blue
        box.getStyle().set("border", "1px solid #93c5fd");
        box.getStyle().set("border-radius", "10px");
        box.getStyle().set("padding", "12px 14px");
        box.getStyle().set("margin-bottom", "12px");
        box.setWidthFull();

        timezoneBanner.add(box);
        timezoneBanner.setVisible(true);
    }

    /**
     * Rebuilds the category and subject filter dropdowns from the supplied task list.
     * "All Categories"/"All Subjects" are always first; "Uncategorized" is always present
     * in the category list as a stable landmark; remaining options are derived from the
     * actual tasks and sorted. Preserves the user's current selection if it still exists.
     */
    private void repopulateFilters(List<Task> tasks) {
        // --- Categories: always include "Uncategorized" as a stable option ---
        Set<String> categorySet = new LinkedHashSet<>();
        categorySet.add("Uncategorized");
        tasks.stream()
                .map(Task::getCategory)
                .map(c -> (c == null || c.isEmpty()) ? "Uncategorized" : c)
                .forEach(categorySet::add);
        List<String> sortedCategories = new ArrayList<>(categorySet);
        sortedCategories.sort(String::compareToIgnoreCase);

        List<String> categoryItems = new ArrayList<>();
        categoryItems.add("All Categories");
        categoryItems.addAll(sortedCategories);

        String currentCategory = categoryFilter.getValue();
        categoryFilter.setItems(categoryItems);
        // Preserve the user's selection if it's still valid; otherwise fall back to "All".
        categoryFilter.setValue(categoryItems.contains(currentCategory) ? currentCategory : "All Categories");

        // --- Subjects: data-driven only (no special always-present entry) ---
        List<String> subjectItems = new ArrayList<>();
        subjectItems.add("All Subjects");
        tasks.stream()
                .map(Task::getSubject)
                .filter(s -> s != null && !s.isEmpty())
                .distinct()
                .sorted()
                .forEach(subjectItems::add);

        String currentSubject = subjectFilter.getValue();
        subjectFilter.setItems(subjectItems);
        subjectFilter.setValue(subjectItems.contains(currentSubject) ? currentSubject : "All Subjects");
    }

    /** Re-reads this user's tasks from the DB and refreshes the card list AND the filter
     *  dropdowns, so newly created or edited categories/subjects show up immediately. */
    private void reloadTasks() {
        List<Task> latest = taskRepo.findByUser(currentUser);
        grid.refresh(latest);
        repopulateFilters(latest);
    }

    private void showTaskCompletedBanner() {
        Notification completeBanner = Notification.show("Task marked as completed! 🎉");
        completeBanner.addThemeVariants(NotificationVariant.LUMO_SUCCESS);
        completeBanner.setPosition(Notification.Position.TOP_CENTER);
        completeBanner.setDuration(3000);
    }

    private void showTaskDeletedBanner() {
        Notification deletedBanner = Notification.show("Task permanently deleted.");
        deletedBanner.addThemeVariants(NotificationVariant.LUMO_ERROR);
        deletedBanner.setPosition(Notification.Position.TOP_CENTER);
        deletedBanner.setDuration(3000);
    }
}

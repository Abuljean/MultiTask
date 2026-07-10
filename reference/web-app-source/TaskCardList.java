package com.jry.base.ui.components;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import com.jry.backend.entities.Task;
import com.vaadin.flow.component.details.Details;
import com.vaadin.flow.component.details.DetailsVariant;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;

public class TaskCardList extends VerticalLayout {
    private final List<Task> allTasks;
    private Consumer<Task> onDelete;
    private Consumer<Task> onComplete;
    private Consumer<Task> onCardClick;
    private final int urgentThresholdHours;
    private final java.time.ZoneId userZone;

    public TaskCardList(List<Task> allTasks, int urgentThresholdHours, java.time.ZoneId userZone) {
        this.allTasks = allTasks;
        this.urgentThresholdHours = urgentThresholdHours;
        this.userZone = userZone;
        setWidthFull();
        setPadding(false);
        setSpacing(true);
        // Default initial load
        updateList("", "All Categories", "All Subjects", "Group by Status");
    }

    public void setOnDelete(Consumer<Task> onDelete) {
        this.onDelete = onDelete;
    }

    public void setOnComplete(Consumer<Task> onComplete) {
        this.onComplete = onComplete;
    }

    /**
     * Optional: when set, clicking a card fires this callback (e.g. to open an edit dialog)
     * instead of navigating to the task's detail page. When not set, cards fall back to
     * navigating to "tasks/{id}".
     */
    public void setOnCardClick(Consumer<Task> onCardClick) {
        this.onCardClick = onCardClick;
    }


    public void refresh(List<Task> updatedTasks) {
        this.allTasks.clear();
        this.allTasks.addAll(updatedTasks);
        updateList("", "All Categories", "All Subjects", "Group by Status");
    }

    public void filter(String searchTerm, String category, String subject, String groupBy) {
        updateList(searchTerm, category, subject, groupBy);
    }

    private void updateList(String searchTerm, String category, String subject, String groupBy) {
        removeAll(); // Clear the view
        String lowerTerm = (searchTerm == null) ? "" : searchTerm.toLowerCase();

        //get all tasks that match the search/filters
        List<Task> filteredTasks = allTasks.stream()
                .filter(task -> {
                    boolean matchesText = true;
                    if (!lowerTerm.isEmpty()) {
                        boolean matchesTitle = task.getTitle() != null && task.getTitle().toLowerCase().contains(lowerTerm);
                        boolean matchesDesc = task.getDescription() != null && task.getDescription().toLowerCase().contains(lowerTerm);
                        matchesText = matchesTitle || matchesDesc;
                    }
                    boolean matchesCategory = true;
                    if (category != null && !category.equals("All Categories")) {
                        if (category.equals("Uncategorized")) {
                            matchesCategory = task.getCategory() == null ||
                                    task.getCategory().isEmpty() ||
                                    task.getCategory().equals("Uncategorized") ||
                                    task.getCategory().equals("Personal");
                        } else {
                            matchesCategory = task.getCategory() != null && task.getCategory().equals(category);
                        }
                    }
                    boolean matchesSubject = true;
                    if (subject != null && !subject.equals("All Subjects")) {
                        matchesSubject = task.getSubject() != null && task.getSubject().equals(subject);
                    }
                    return matchesText && matchesCategory && matchesSubject;
                })
                .collect(Collectors.toList());//keep because otherwise tolist is immutable

        // 2. SPLIT COMPLETED VS ACTIVE
        List<Task> completedTasks = new ArrayList<>();
        List<Task> activeTasks = new ArrayList<>();

        for (Task t : filteredTasks) {
            if (t.isCompleted()) {
                completedTasks.add(t);
            } else {
                activeTasks.add(t);
            }
        }

        // 3. SORT ACTIVE TASKS CHRONOLOGICALLY
        activeTasks.sort((t1, t2) -> {
            if (t1.getDueDate() == null && t2.getDueDate() == null) return 0;
            if (t1.getDueDate() == null) return 1;
            if (t2.getDueDate() == null) return -1;
            return t1.getDueDate().compareTo(t2.getDueDate());
        });

        // 4. ALWAYS RENDER COMPLETED TASKS AT THE ABSOLUTE TOP (COLLAPSED)
        if (!completedTasks.isEmpty()) {
            VerticalLayout completedLayout = createInnerLayout();
            // Sort completed tasks so the most recently completed are near the top
            for (Task task : completedTasks) {
                completedLayout.add(createTaskCard(task));
            }
            // FALSE means it will start collapsed!
            add(createDetailsBar("Completed", completedTasks.size(), "#166534", "#dcfce7", completedLayout, false));
        }

        // 5. RENDER THE REST OF THE GROUPS BASED ON USER CHOICE
        if (activeTasks.isEmpty()) {
            return; // If there are no active tasks, stop drawing.
        }

        if ("Group by Date".equals(groupBy)) {
            renderGroupByDate(activeTasks);
        } else if ("Group by Subject".equals(groupBy)) {
            renderGroupBySubject(activeTasks);
        } else if ("Group by Category".equals(groupBy)) {
            renderGroupByCategory(activeTasks);
        } else if ("Group by Priority".equals(groupBy)) {
            renderGroupByPriority(activeTasks);
        } else {
            renderGroupByStatus(activeTasks);
        }
    }

    // ==========================================
    // SORTING HELPERS
    // ==========================================
    // Urgency ordering: most overdue / soonest-due first; tasks with no due date last.
    private java.util.Comparator<Task> byUrgency() {
        return (a, b) -> {
            java.time.LocalDateTime da = a.getDueDate();
            java.time.LocalDateTime db = b.getDueDate();
            if (da == null && db == null) return 0;
            if (da == null) return 1;   // no due date sorts after dated tasks
            if (db == null) return -1;
            return da.compareTo(db);    // earlier due date = more urgent = first
        };
    }

    // Priority ordering: lower rank number first (1st before 2nd); no priority (null) last.
    private java.util.Comparator<Task> byPriority() {
        return (a, b) -> {
            Integer pa = a.getPriority();
            Integer pb = b.getPriority();
            if (pa == null && pb == null) return 0;
            if (pa == null) return 1;   // unprioritized sorts after prioritized
            if (pb == null) return -1;
            return Integer.compare(pa, pb);
        };
    }

    // Returns a sorted copy of the list (doesn't mutate the input).
    private List<Task> sortedBy(List<Task> tasks, java.util.Comparator<Task> cmp) {
        List<Task> copy = new ArrayList<>(tasks);
        copy.sort(cmp);
        return copy;
    }

    // ==========================================
    // VIEW 1: GROUP BY STATUS
    // ==========================================
    private void renderGroupByStatus(List<Task> activeTasks) {
        // Split into three buckets: Overdue (past due), Urgent (within threshold but not
        // past due), and Ongoing (everything else). Overdue and Urgent are separate groups
        // now (previously combined). Within each, sort by urgency first, then priority.
        List<Task> overdue = new ArrayList<>();
        List<Task> urgent = new ArrayList<>();
        List<Task> ongoing = new ArrayList<>();

        for (Task task : activeTasks) {
            if (task.isPastDue(userZone)) {
                overdue.add(task);
            } else if (task.isUrgent(urgentThresholdHours, userZone)) {
                urgent.add(task);
            } else {
                ongoing.add(task);
            }
        }

        java.util.Comparator<Task> within = byUrgency().thenComparing(byPriority());

        if (!overdue.isEmpty()) {
            VerticalLayout overdueLayout = createInnerLayout();
            for (Task t : sortedBy(overdue, within)) overdueLayout.add(createTaskCard(t));
            add(createDetailsBar("Overdue", overdue.size(), "#991b1b", "#fee2e2", overdueLayout, true));
        }
        if (!urgent.isEmpty()) {
            VerticalLayout urgentLayout = createInnerLayout();
            for (Task t : sortedBy(urgent, within)) urgentLayout.add(createTaskCard(t));
            add(createDetailsBar("Urgent", urgent.size(), "#9a3412", "#ffedd5", urgentLayout, true));
        }
        if (!ongoing.isEmpty()) {
            VerticalLayout ongoingLayout = createInnerLayout();
            for (Task t : sortedBy(ongoing, within)) ongoingLayout.add(createTaskCard(t));
            add(createDetailsBar("Ongoing", ongoing.size(), "#1e3a8a", "#dbeafe", ongoingLayout, true));
        }
    }

    // ==========================================
    // VIEW: GROUP BY PRIORITY
    // ==========================================
    private void renderGroupByPriority(List<Task> activeTasks) {
        // Bucket tasks by priority rank; null priorities go into "Unprioritized" (last).
        java.util.TreeMap<Integer, List<Task>> byRank = new java.util.TreeMap<>();
        List<Task> unprioritized = new ArrayList<>();

        for (Task task : activeTasks) {
            Integer rank = task.getPriority();
            if (rank == null) {
                unprioritized.add(task);
            } else {
                byRank.computeIfAbsent(rank, k -> new ArrayList<>()).add(task);
            }
        }

        // Each priority group, in ascending rank order (1st, 2nd, 3rd...), sorted within by urgency.
        for (java.util.Map.Entry<Integer, List<Task>> entry : byRank.entrySet()) {
            int rank = entry.getKey();
            List<Task> group = sortedBy(entry.getValue(), byUrgency());
            VerticalLayout layout = createInnerLayout();
            for (Task t : group) layout.add(createTaskCard(t));
            String label = com.jry.base.ui.components.Priorities.label(rank);
            add(createDetailsBar(label + " Priority", group.size(),
                    com.jry.base.ui.components.Priorities.textColor(rank),
                    com.jry.base.ui.components.Priorities.backgroundColor(rank),
                    layout, true));
        }

        // Unprioritized last, sorted by urgency.
        if (!unprioritized.isEmpty()) {
            VerticalLayout layout = createInnerLayout();
            for (Task t : sortedBy(unprioritized, byUrgency())) layout.add(createTaskCard(t));
            add(createDetailsBar("Unprioritized", unprioritized.size(), "#374151", "#e5e7eb", layout, true));
        }
    }

    // ==========================================
    // VIEW 2: GROUP BY DATE (Strict Timeline Fix)
    // ==========================================
    private void renderGroupByDate(List<Task> activeTasks) {
        Map<LocalDate, List<Task>> tasksByDate = new HashMap<>();
        List<Task> noDateTasks = new ArrayList<>();

        for (Task task : activeTasks) {
            if (task.getDueDate() != null) {
                LocalDate date = task.getDueDate().toLocalDate();
                tasksByDate.computeIfAbsent(date, k -> new ArrayList<>()).add(task);
            } else {
                noDateTasks.add(task);
            }
        }

        // Draw "No Due Date" first so it doesn't get buried
        if (!noDateTasks.isEmpty()) {
            VerticalLayout noDateLayout = createInnerLayout();
            for (Task task : sortedBy(noDateTasks, byPriority().thenComparing(byUrgency()))) {
                noDateLayout.add(createTaskCard(task));
            }
            add(createDetailsBar("No Due Date", noDateTasks.size(), "#4b5563", "#e5e7eb", noDateLayout, false));
        }

        // STRICT CHRONOLOGICAL SORTING FIX
        List<LocalDate> sortedDates = new ArrayList<>(tasksByDate.keySet());
        sortedDates.sort(Comparator.naturalOrder()); // Guarantees past -> present -> future

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEEE, MMM dd, yyyy");

        for (LocalDate date : sortedDates) {
            List<Task> tasksForDay = tasksByDate.get(date);

            // Within a day, sort by priority first, then time-of-day (urgency).
            tasksForDay = sortedBy(tasksForDay, byPriority().thenComparing(byUrgency()));

            VerticalLayout dayLayout = createInnerLayout();
            for (Task task : tasksForDay) {
                dayLayout.add(createTaskCard(task));
            }

            String dateLabel = date.format(formatter);
            if (date.equals(LocalDate.now(userZone))) dateLabel = "Today (" + dateLabel + ")";
            if (date.equals(LocalDate.now(userZone).plusDays(1))) dateLabel = "Tomorrow (" + dateLabel + ")";

            add(createDetailsBar(dateLabel, tasksForDay.size(), "#1f2937", "#f3f4f6", dayLayout, true));
        }
    }

    // ==========================================
    // VIEW 3: GROUP BY SUBJECT
    // ==========================================
    private void renderGroupBySubject(List<Task> activeTasks) {
        List<String> allKnownSubjects = allTasks.stream()
                .map(Task::getSubject)
                .filter(s -> s != null && !s.isEmpty())
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        for (String subject : allKnownSubjects) {
            List<Task> tasksForSubject = new ArrayList<>();
            for (Task task : activeTasks) {
                if (subject.equals(task.getSubject())) {
                    tasksForSubject.add(task);
                }
            }

            // Only draw the accordion if there are actually active tasks for it
            if (!tasksForSubject.isEmpty()) {
                VerticalLayout subjectLayout = createInnerLayout();
                for (Task task : sortedBy(tasksForSubject, byPriority().thenComparing(byUrgency()))) {
                    subjectLayout.add(createTaskCard(task));
                }

                String bgColor = "#f3f4f6";
                Optional<Task> firstTask = allTasks.stream().filter(t -> subject.equals(t.getSubject()) && t.getSubjectColor() != null).findFirst();
                if (firstTask.isPresent()) bgColor = firstTask.get().getSubjectColor();

                add(createDetailsBar(subject, tasksForSubject.size(), "#111827", bgColor, subjectLayout, true));
            }
        }

        List<Task> noSubjectTasks = activeTasks.stream().filter(t -> t.getSubject() == null || t.getSubject().isEmpty()).collect(Collectors.toList());
        if (!noSubjectTasks.isEmpty()) {
            VerticalLayout noSubLayout = createInnerLayout();
            for(Task t : sortedBy(noSubjectTasks, byPriority().thenComparing(byUrgency()))) noSubLayout.add(createTaskCard(t));
            add(createDetailsBar("No Subject", noSubjectTasks.size(), "#4b5563", "#e5e7eb", noSubLayout, true));
        }
    }

    // ==========================================
    // VIEW 4: GROUP BY CATEGORY
    // ==========================================
    private void renderGroupByCategory(List<Task> activeTasks) {
        // Distinct, sorted list of categories actually present on the user's tasks
        // (treating null/empty as "Uncategorized"). Only categories that have tasks are
        // rendered as accordions — empty categories are intentionally omitted (less clutter).
        List<String> allKnownCategories = allTasks.stream()
                .map(Task::getCategory)
                .map(c -> (c == null || c.isEmpty()) ? "Uncategorized" : c)
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        for (String category : allKnownCategories) {
            List<Task> tasksForCategory = new ArrayList<>();
            for (Task task : activeTasks) {
                String taskCategory = (task.getCategory() == null || task.getCategory().isEmpty())
                        ? "Uncategorized"
                        : task.getCategory();
                if (category.equals(taskCategory)) {
                    tasksForCategory.add(task);
                }
            }

            // Skip empty categories — only show ones with at least one active task.
            if (!tasksForCategory.isEmpty()) {
                VerticalLayout categoryLayout = createInnerLayout();
                for (Task task : sortedBy(tasksForCategory, byPriority().thenComparing(byUrgency()))) {
                    categoryLayout.add(createTaskCard(task));
                }

                String bgColor = "#fef3c7"; // default light yellow, matches Task's default category color
                Optional<Task> firstTask = allTasks.stream()
                        .filter(t -> {
                            String tc = (t.getCategory() == null || t.getCategory().isEmpty()) ? "Uncategorized" : t.getCategory();
                            return category.equals(tc) && t.getCategoryColor() != null;
                        })
                        .findFirst();
                if (firstTask.isPresent()) bgColor = firstTask.get().getCategoryColor();

                add(createDetailsBar(category, tasksForCategory.size(), "#111827", bgColor, categoryLayout, true));
            }
        }
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================
    private VerticalLayout createInnerLayout() {
        VerticalLayout layout = new VerticalLayout();
        layout.setPadding(false);
        layout.getStyle().set("margin-top", "16px");
        return layout;
    }

    private TaskCard createTaskCard(Task task) {
        TaskCard card = new TaskCard(task, this.onComplete, this.onDelete, this.urgentThresholdHours, this.userZone);
        card.getStyle().set("cursor", "pointer");
        card.addClickListener(click -> {
            if (onCardClick != null) {
                onCardClick.accept(task);
            } else {
                card.getUI().ifPresent(ui -> ui.navigate("tasks/" + task.getId()));
            }
        });
        return card;
    }

    private Details createDetailsBar(String title, int count, String textColor, String bgColor, VerticalLayout content, boolean startOpen) {
        Span summary = new Span(title + " (" + count + ")");
        summary.getStyle().set("font-weight", "bold");
        summary.getStyle().set("font-size", "14px");
        summary.getStyle().set("color", textColor);
        summary.getStyle().set("background-color", bgColor);
        summary.getStyle().set("padding", "6px 12px");
        summary.getStyle().set("border-radius", "8px");
        summary.getStyle().set("border", "1px solid rgba(0, 0, 0, 0.15)");

        Details details = new Details(summary, content);
        details.addThemeVariants(DetailsVariant.REVERSE);
        details.setOpened(startOpen);
        details.setWidthFull();
        details.getStyle().set("border-bottom", "1px solid #e5e7eb");
        details.getStyle().set("padding-bottom", "16px");
        return details;
    }
}
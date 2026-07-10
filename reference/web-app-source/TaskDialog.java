package com.jry.base.ui.components;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import com.jry.backend.entities.ApplicationUser;
import com.jry.backend.entities.Task;
import com.jry.backend.entities.TaskRepository;
import com.vaadin.flow.component.ModalityMode;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.confirmdialog.ConfirmDialog;
import com.vaadin.flow.component.dialog.Dialog;
import com.vaadin.flow.component.icon.VaadinIcon;
import com.vaadin.flow.component.notification.Notification;
import com.vaadin.flow.component.notification.NotificationVariant;

/**
 * A dialog ("HUD") wrapper around {@link TaskForm} for creating and editing tasks
 * without leaving the current page.
 * <p>
 * Use the static helpers {@link #openForNew} and {@link #openForEdit}. Both take the
 * task repository, the current user (for ownership + populating existing subject/category
 * dropdowns), and an {@code onChanged} callback that the caller uses to refresh its list.
 */
public class TaskDialog extends Dialog {

    private final TaskRepository taskRepo;
    private final ApplicationUser currentUser;
    private final Task task;
    private final boolean isNew;
    private final Runnable onChanged;

    private final TaskForm form = new TaskForm();

    private TaskDialog(TaskRepository taskRepo, ApplicationUser currentUser, Task task,
                       boolean isNew, Runnable onChanged) {
        this.taskRepo = taskRepo;
        this.currentUser = currentUser;
        this.task = task;
        this.isNew = isNew;
        this.onChanged = onChanged;

        setHeaderTitle(isNew ? "New Task" : "Edit Task");
        setWidth("860px"); // wider to fit category + subject + priority on one row
        // setModality(STRICT) is the non-deprecated equivalent of setModal(true).
        // (Confirmed from the decompiled Dialog source: setModal(true) just calls this.)
        setModality(ModalityMode.STRICT);
        setDraggable(true);
        setResizable(true);

        // Populate the form's subject/category dropdowns from the user's existing tasks,
        // mirroring what NewTask does so colors carry over.
        List<Task> userTasks = taskRepo.findByUser(currentUser);
        Map<String, String> existingSubjects = userTasks.stream()
                .filter(t -> t.getSubject() != null && !t.getSubject().isEmpty())
                .collect(Collectors.toMap(
                        Task::getSubject,
                        t -> t.getSubjectColor() != null ? t.getSubjectColor() : "#e5e7eb",
                        (c1, c2) -> c1));
        Map<String, String> existingCategories = userTasks.stream()
                .filter(t -> t.getCategory() != null && !t.getCategory().isEmpty())
                .collect(Collectors.toMap(
                        Task::getCategory,
                        t -> t.getCategoryColor() != null ? t.getCategoryColor() : "#fef3c7",
                        (c1, c2) -> c1));

        form.setExistingSubjects(existingSubjects);
        form.setExistingCategories(existingCategories);
        form.setTask(task);
        form.setEditable(true); // dialog always opens ready to edit

        form.addSaveListener(this::handleSave);
        form.addCancelListener(this::close);

        // Global subject/category deletion (same behavior as TaskDetails): when a subject
        // or category is deleted, clear it from all of the user's tasks.
        form.addDeleteSubjectListener(subjectToDelete -> {
            boolean changed = false;
            for (Task t : taskRepo.findByUser(currentUser)) {
                if (subjectToDelete.equals(t.getSubject())) {
                    t.setSubject(null);
                    taskRepo.save(t);
                    changed = true;
                }
            }
            if (changed && onChanged != null) {
                onChanged.run();
            }
        });

        // Wrap the form in a container with generous padding so the fields aren't jammed
        // against the dialog edges (reliable from Java, independent of overlay CSS).
        com.vaadin.flow.component.orderedlayout.VerticalLayout formWrapper =
                new com.vaadin.flow.component.orderedlayout.VerticalLayout(form);
        formWrapper.setPadding(false);
        formWrapper.setSpacing(false);
        formWrapper.getStyle().set("padding", "8px 16px 16px 16px");
        add(formWrapper);

        // Footer: a delete button on the left for existing tasks, nothing extra for new ones.
        // (Save/Cancel live inside TaskForm itself.)
        if (!isNew) {
            Button deleteBtn = new Button("Delete", VaadinIcon.TRASH.create());
            deleteBtn.addThemeVariants(ButtonVariant.LUMO_ERROR, ButtonVariant.LUMO_TERTIARY);
            deleteBtn.addClickListener(e -> confirmDelete());
            getFooter().add(deleteBtn);
        }
    }

    private void handleSave(Task savedTask) {
        if (isNew) {
            savedTask.setUser(currentUser);
        }
        taskRepo.save(savedTask);

        Notification banner = Notification.show(
                isNew ? "Task created." : (savedTask.isCompleted() ? "Great job! Task completed. 🎉" : "Task updated."));
        banner.addThemeVariants(isNew ? NotificationVariant.LUMO_PRIMARY
                : (savedTask.isCompleted() ? NotificationVariant.LUMO_SUCCESS : NotificationVariant.LUMO_PRIMARY));
        banner.setPosition(Notification.Position.TOP_CENTER);
        banner.setDuration(3000);

        close();
        if (onChanged != null) {
            onChanged.run();
        }
    }

    private void confirmDelete() {
        ConfirmDialog confirm = new ConfirmDialog();
        confirm.setHeader("Delete Task?");
        confirm.setText("Are you sure you want to delete this task? This cannot be undone.");
        confirm.setCancelable(true);
        confirm.setConfirmText("Delete");
        confirm.setConfirmButtonTheme("error primary");
        confirm.addConfirmListener(e -> {
            taskRepo.delete(task);
            Notification deleted = Notification.show("Task permanently deleted.");
            deleted.addThemeVariants(NotificationVariant.LUMO_ERROR);
            deleted.setPosition(Notification.Position.TOP_CENTER);
            deleted.setDuration(3000);
            close();
            if (onChanged != null) {
                onChanged.run();
            }
        });
        confirm.open();
    }

    /** Opens a dialog for creating a brand-new task. */
    public static void openForNew(TaskRepository taskRepo, ApplicationUser currentUser, Runnable onChanged) {
        TaskDialog dialog = new TaskDialog(taskRepo, currentUser, new Task(), true, onChanged);
        dialog.open();
    }

    /** Opens a dialog for editing an existing task. */
    public static void openForEdit(TaskRepository taskRepo, ApplicationUser currentUser, Task task, Runnable onChanged) {
        TaskDialog dialog = new TaskDialog(taskRepo, currentUser, task, false, onChanged);
        dialog.open();
    }
}

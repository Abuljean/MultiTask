package com.jry.base.ui.components;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Predicate;

import com.jry.backend.entities.Task;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.checkbox.Checkbox;
import com.vaadin.flow.component.confirmdialog.ConfirmDialog;
import com.vaadin.flow.component.datepicker.DatePicker;
import com.vaadin.flow.component.dialog.Dialog;
import com.vaadin.flow.component.formlayout.FormLayout;
import com.vaadin.flow.component.html.Input;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.icon.VaadinIcon;
import com.vaadin.flow.component.notification.Notification;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.select.Select;
import com.vaadin.flow.component.textfield.TextArea;
import com.vaadin.flow.component.textfield.TextField;
import com.vaadin.flow.component.timepicker.TimePicker;
import com.vaadin.flow.data.binder.Binder;

public class TaskForm extends VerticalLayout {
    private Task task;
    private final Binder<Task> binder = new Binder<>(Task.class);

    private final FormLayout formLayout = new FormLayout();
    private final Button saveBtn = new Button("Save");
    private final Button cancelBtn = new Button("Cancel");

    private final DatePicker dueDatePicker = new DatePicker("Due date");
    private final TimePicker dueTimePicker = new TimePicker("Time (optional)");
    private final Checkbox completedCheckbox = new Checkbox("Mark as Completed");

    private final Select<String> subjectSelect = new Select<>();
    private final Select<String> categorySelect = new Select<>();
    private final Select<String> prioritySelect = new Select<>();

    private static final String PRIORITY_NONE = "No priority";

    private Consumer<Task> onSave;
    private Runnable onCancel;
    private Consumer<String> onDeleteSubject;
    private Consumer<String> onDeleteCategory;

    private final Map<String, String> subjectColorMap = new HashMap<>();
    private final Map<String, String> categoryColorMap = new HashMap<>();

    private final List<String> categoryList = new ArrayList<>();

    private final String ADD_NEW_SUBJECT = "+ Add New Subject...";
    private final String ADD_NEW_CATEGORY = "+ Add New Category...";

    public TaskForm() {
        initDefaultData();

        TextField title = new TextField("Title");
        TextArea description = new TextArea("Description");
        HorizontalLayout dateLayout = new HorizontalLayout(dueDatePicker, dueTimePicker);
        dateLayout.setWidthFull();
        dueDatePicker.setWidth("50%");
        dueTimePicker.setWidth("50%");

        //handles setup
        HorizontalLayout categoryLayout = createCategoryLayout();
        HorizontalLayout subjectLayout = createSubjectLayout();
        categoryLayout.setWidthFull();
        subjectLayout.setWidthFull();


        // --- Priority field (optional) with an info icon explaining how it works ---
        prioritySelect.setLabel("Priority");
        prioritySelect.setItems(PRIORITY_NONE, "1st", "2nd", "3rd");
        prioritySelect.setValue(PRIORITY_NONE);
        prioritySelect.setWidthFull();

        // Info icon with a tooltip explaining the optional priority feature.
        com.vaadin.flow.component.icon.Icon infoIcon =
                com.vaadin.flow.component.icon.VaadinIcon.INFO_CIRCLE_O.create();
        infoIcon.setSize("18px");
        infoIcon.getStyle().set("color", "var(--lumo-secondary-text-color)");
        infoIcon.getStyle().set("cursor", "help");
        infoIcon.getElement().setAttribute("title",
                "Priority is optional. Lower numbers are more important (1st > 2nd > 3rd). "
                + "Tasks are sorted by priority alongside urgency, and you can group by priority "
                + "on the main page. Leave as 'No priority' to skip it.");

        com.vaadin.flow.component.orderedlayout.HorizontalLayout priorityRow =
                new com.vaadin.flow.component.orderedlayout.HorizontalLayout(prioritySelect, infoIcon);
        priorityRow.setWidthFull();
        priorityRow.setAlignItems(com.vaadin.flow.component.orderedlayout.FlexComponent.Alignment.END);
        priorityRow.setFlexGrow(1, prioritySelect);

        // Category, Subject, and Priority all on one row (three across).
        HorizontalLayout categorySubjectPriority =
                new HorizontalLayout(categoryLayout, subjectLayout, priorityRow);
        categorySubjectPriority.setWidthFull();
        categorySubjectPriority.setFlexGrow(1, categoryLayout, subjectLayout, priorityRow);

        binder.bind(completedCheckbox, Task::isCompleted, Task::setCompleted);
        binder.forField(title).asRequired("Please enter a title").bind(Task::getTitle, Task::setTitle);
        binder.bind(description, Task::getDescription, Task::setDescription);
        binder.bind(subjectSelect, Task::getSubject, Task::setSubject);
        binder.bind(categorySelect, Task::getCategory, Task::setCategory);
        // Priority: convert between the label ("1st") and the rank integer (1); "No priority" -> null.
        binder.forField(prioritySelect)
                .withConverter(this::labelToRank, this::rankToLabel)
                .bind(Task::getPriority, Task::setPriority);

        formLayout.setResponsiveSteps(new FormLayout.ResponsiveStep("0", 1));
        formLayout.add(completedCheckbox, title, categorySubjectPriority, description, dateLayout);

        configureButtons();
        add(formLayout, new HorizontalLayout(saveBtn, cancelBtn));
    }

    //specificied layouts

    private HorizontalLayout createCategoryLayout() {
        categorySelect.setLabel("Category");
        updateCategoryItems();

        categorySelect.addValueChangeListener(e -> {
            String selected = e.getValue();
            if (selected != null && categoryColorMap.containsKey(selected) && this.task != null) {
                this.task.setCategoryColor(categoryColorMap.get(selected));
            }
        });

        return createDynamicFieldLayout(
                "Category", categorySelect, ADD_NEW_CATEGORY,
                prev -> openDynamicDialog("Category", categorySelect, prev, true,
                        name -> categoryColorMap.containsKey(name) || name.equals(ADD_NEW_CATEGORY),
                        (name, color) -> {
                            categoryColorMap.put(name, color);
                            updateCategoryItems();
                            if (this.task != null) this.task.setCategoryColor(color);
                        }
                ),
                name -> !name.equals("Uncategorized"),
                name -> {
                    categoryColorMap.remove(name);
                    updateCategoryItems();
                    if (onDeleteCategory != null) onDeleteCategory.accept(name);
                }
        );
    }

    private HorizontalLayout createSubjectLayout() {
        subjectSelect.setLabel("Subject");
        subjectSelect.setEmptySelectionAllowed(true);
        subjectSelect.setEmptySelectionCaption("No Subject");
        updateSubjectItems();

        subjectSelect.addValueChangeListener(e -> {
            String selected = e.getValue();
            if (selected != null && subjectColorMap.containsKey(selected) && this.task != null) {
                this.task.setSubjectColor(subjectColorMap.get(selected));
            }
        });

        return createDynamicFieldLayout(
                "Subject", subjectSelect, ADD_NEW_SUBJECT,
                prev -> openDynamicDialog("Subject", subjectSelect, prev, true,
                        name -> subjectColorMap.containsKey(name) || name.equals(ADD_NEW_SUBJECT),
                        (name, color) -> {
                            subjectColorMap.put(name, color);
                            updateSubjectItems();
                            if (this.task != null) this.task.setSubjectColor(color);
                        }
                ),
                name -> true,
                name -> {
                    subjectColorMap.remove(name);
                    updateSubjectItems();
                    if (onDeleteSubject != null) onDeleteSubject.accept(name);
                }
        );
    }


    //master builder
    private HorizontalLayout createDynamicFieldLayout(
            String entityName, Select<String> select, String addNewOption,
            Consumer<String> onAddNewClick, Predicate<String> canDelete, Consumer<String> onDeleteConfirmed) {

        select.addValueChangeListener(event -> {
            if (addNewOption.equals(event.getValue())) {
                onAddNewClick.accept(event.getOldValue());
            }
        });

        Button deleteBtn = new Button(VaadinIcon.TRASH.create());
        deleteBtn.addThemeVariants(ButtonVariant.LUMO_ERROR, ButtonVariant.LUMO_TERTIARY);
        deleteBtn.setTooltipText("Delete this " + entityName.toLowerCase() + " from ALL tasks");

        deleteBtn.addClickListener(e -> {
            String selected = select.getValue();
            if (selected != null && !selected.isEmpty() && !selected.equals(addNewOption)) {
                if (canDelete.test(selected)) {
                    ConfirmDialog dialog = new ConfirmDialog();
                    dialog.setHeader("Delete " + entityName + "?");
                    dialog.setText("This will permanently remove '" + selected + "' from ALL tasks. Are you sure?");
                    dialog.setCancelable(true);
                    dialog.setConfirmText("Delete globally");
                    dialog.setConfirmButtonTheme("error primary");
                    dialog.addConfirmListener(event -> {
                        select.clear();
                        onDeleteConfirmed.accept(selected);
                    });
                    dialog.open();
                } else {
                    Notification.show("Cannot delete default " + entityName.toLowerCase() + ".");
                }
            } else {
                Notification.show("Please select a valid " + entityName.toLowerCase() + " to delete.");
            }
        });

        HorizontalLayout layout = new HorizontalLayout(select, deleteBtn);
        layout.setAlignItems(Alignment.BASELINE);
        return layout;
    }

    private void openDynamicDialog(
            String entityName, Select<String> select, String previousValue, boolean includeColor,
            Predicate<String> isDuplicate, BiConsumer<String, String> onSave) {

        Dialog dialog = new Dialog();
        dialog.setHeaderTitle("Create New " + entityName);

        TextField nameField = new TextField(entityName + " Name");
        nameField.setWidthFull();

        Input colorPicker = new Input();
        colorPicker.setType("color");
        colorPicker.setValue("#e5e7eb");

        HorizontalLayout colorLayout = new HorizontalLayout(new Span("Select Color: "), colorPicker);
        colorLayout.setAlignItems(Alignment.CENTER);
        colorLayout.setVisible(includeColor); // Hides the color picker entirely for Categories

        Button saveButton = new Button("Save", e -> {
            String newName = nameField.getValue().trim();
            if (!newName.isEmpty() && !isDuplicate.test(newName)) {
                String chosenColor = includeColor ? colorPicker.getValue() : null;
                onSave.accept(newName, chosenColor);
                select.setValue(newName);
                dialog.close();
            } else {
                nameField.setInvalid(true);
                nameField.setErrorMessage("Invalid or duplicate name");
            }
        });
        saveButton.addThemeVariants(ButtonVariant.LUMO_PRIMARY);

        Button cancelButton = new Button("Cancel", e -> {
            select.setValue(previousValue);
            dialog.close();
        });

        VerticalLayout dialogLayout = new VerticalLayout(nameField, colorLayout);
        dialogLayout.setPadding(false);

        dialog.add(dialogLayout);
        dialog.getFooter().add(cancelButton, saveButton);
        dialog.open();
    }

    //event methods + data management
    private void initDefaultData() {
        subjectColorMap.put("Math", "#fecaca");
        subjectColorMap.put("Science", "#bbf7d0");
        subjectColorMap.put("History", "#fef08a");

        categoryColorMap.put("Work", "#e2e8f0");
        categoryColorMap.put("School", "#f3e8ff");
        categoryColorMap.put("Home", "#ccfbf1");
        categoryColorMap.put("Uncategorized", "#fef3c7");
    }

    public void setExistingCategories(Map<String, String> dbCategories) {
        if (dbCategories != null) {
            categoryColorMap.putAll(dbCategories);
            updateCategoryItems();
        }
    }

    public void setExistingSubjects(Map<String, String> dbSubjects) {
        if (dbSubjects != null) {
            subjectColorMap.putAll(dbSubjects);
            updateSubjectItems();
        }
    }

    private void updateCategoryItems() {
        List<String> currentItems = new ArrayList<>(categoryColorMap.keySet());
        currentItems.add(ADD_NEW_CATEGORY);
        categorySelect.setItems(currentItems);
    }

    private void updateSubjectItems() {
        List<String> currentItems = new ArrayList<>(subjectColorMap.keySet());
        currentItems.add(ADD_NEW_SUBJECT);
        subjectSelect.setItems(currentItems);
    }

    private void configureButtons() {
        saveBtn.addThemeVariants(ButtonVariant.LUMO_PRIMARY);
        cancelBtn.addThemeVariants(ButtonVariant.LUMO_TERTIARY);

        cancelBtn.addClickListener(e -> {
            resetForm();
            if(onCancel != null) onCancel.run();
        });

        saveBtn.addClickListener(e -> {
            if (binder.writeBeanIfValid(task)) {
                if (dueDatePicker.getValue() != null) {
                    LocalTime time = dueTimePicker.getValue() != null ? dueTimePicker.getValue() : LocalTime.of(23, 59);
                    task.setDueDate(LocalDateTime.of(dueDatePicker.getValue(), time));
                } else {
                    task.setDueDate(null);
                }
                if(onSave != null) onSave.accept(task);
            } else {
                binder.validate();
            }
        });
    }

    public void setTask(Task task) {
        if (task.getCategory() == null || task.getCategory().isEmpty()) {
            task.setCategory("Uncategorized");
        }
        this.task = task;
        binder.readBean(task);
        updateDateAndTimeFields();
    }

    public void resetForm() {
        binder.readBean(task);
        updateDateAndTimeFields();
    }

    private void updateDateAndTimeFields() {
        if (this.task != null && this.task.getDueDate() != null) {
            dueDatePicker.setValue(this.task.getDueDate().toLocalDate());
            dueTimePicker.setValue(this.task.getDueDate().toLocalTime());
        } else {
            dueDatePicker.clear();
            dueTimePicker.clear();
        }
    }

    public void addSaveListener(Consumer<Task> onSave) { this.onSave = onSave; }
    public void addCancelListener(Runnable onCancel) { this.onCancel = onCancel; }
    public void addDeleteSubjectListener(Consumer<String> onDeleteSubject) { this.onDeleteSubject = onDeleteSubject; }
    public void addDeleteCategoryListener(Consumer<String> onDeleteCategory) { this.onDeleteCategory = onDeleteCategory; }

    public void setEditable(boolean isEditing) {
        binder.setReadOnly(!isEditing);
        dueDatePicker.setReadOnly(!isEditing);
        dueTimePicker.setReadOnly(!isEditing);
        completedCheckbox.setReadOnly(!isEditing);
        saveBtn.setVisible(isEditing);
        cancelBtn.setVisible(isEditing);
    }

    // --- Priority label <-> rank conversion for the binder ---
    // Presentation (Select<String>) holds "No priority"/"1st"/"2nd"/"3rd";
    // model (Task.priority) holds null/1/2/3.
    private Integer labelToRank(String label) {
        if (label == null || PRIORITY_NONE.equals(label)) return null;
        switch (label) {
            case "1st": return 1;
            case "2nd": return 2;
            case "3rd": return 3;
            default:
                // Future custom tiers like "4th" — strip the suffix and parse.
                try {
                    return Integer.parseInt(label.replaceAll("\\D", ""));
                } catch (NumberFormatException e) {
                    return null;
                }
        }
    }

    private String rankToLabel(Integer rank) {
        if (rank == null) return PRIORITY_NONE;
        return com.jry.base.ui.components.Priorities.label(rank);
    }
}
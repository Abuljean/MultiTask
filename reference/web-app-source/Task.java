package com.jry.backend.entities;

import java.time.Instant;
import java.time.LocalDateTime;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.jspecify.annotations.Nullable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;

@Entity
public class Task {
    public static final int DESCRIPTION_MAX_LENGTH = 300;
    public static final int TITLE_MAX_LENGTH = 100;
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)


    @Column(name = "task_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private ApplicationUser user;

    @Column(name = "title", nullable = false, length = TITLE_MAX_LENGTH)
    private String title = "";

    @Column(name = "description", nullable = false, length = DESCRIPTION_MAX_LENGTH)
    private String description = "";

    @Column(name = "creation_date", nullable = false)//nullable is "required fields"
    private Instant creationDate;

    @Column(name = "due_date")
    @Nullable
    private LocalDateTime dueDate;

    @Column(name = "is_completed", nullable = false)
    private boolean isCompleted = false;

    @Column(name = "subject")
    private String subject = "";

    @Column(name = "subject_color")
    private String subjectColor = "#e5e7eb"; // Default light gray

    @Column(name = "category")
    private String category = "Uncategorized"; // Default category

    @Column(name = "category_color")
    private String categoryColor = "#fef3c7"; // Default light yellow

    /**
     * Priority rank: lower number = higher priority. 1 = "1st", 2 = "2nd", 3 = "3rd", etc.
     * NULL means no priority set (optional field). Stored as an Integer so null is
     * distinguishable from "1st". Custom tiers (Stage B) append higher numbers.
     */
    @Column(name = "priority")
    private Integer priority;


    // Add the getter and setter
    public boolean isCompleted() {
        return isCompleted;
    }

    public void setCompleted(boolean completed) {
        isCompleted = completed;
    }

    /** Priority rank (1=1st, 2=2nd...); null = none. */
    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public Task() { // To keep Hibernate happy
    }

    public Task(String title, Instant creationDate) {
        setTitle(title);
        this.creationDate = creationDate;
    }
    public Task(String title, String description, Instant creationDate) {
        setTitle(title);
        setDescription(description);
        this.creationDate = creationDate;
    }

    public Task(String title, String description, Instant creationDate, LocalDateTime dueDate) {
        setTitle(title);
        setDescription(description);
        this.creationDate = creationDate;
        this.dueDate = dueDate;
    }

    public @Nullable Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        if (title.length() > TITLE_MAX_LENGTH) {
            throw new IllegalArgumentException("Title length exceeds " + DESCRIPTION_MAX_LENGTH);
        }
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {//add a character limit tracker
        if (description.length() > DESCRIPTION_MAX_LENGTH) {
            throw new IllegalArgumentException("Description length exceeds " + DESCRIPTION_MAX_LENGTH);
        }
        this.description = description;
    }

    public Instant getCreationDate() {
        return creationDate;
    }
    
    @PrePersist
    protected void onCreate() {
        if (this.creationDate == null) {
            this.creationDate = Instant.now();
        }
    }

    public @Nullable LocalDateTime getDueDate() {
        return dueDate;
    }

    public void setDueDate(@Nullable LocalDateTime dueDate) {
        this.dueDate = dueDate;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getSubjectColor() {
        return subjectColor;
    }

    public void setSubjectColor(String subjectColor) {
        this.subjectColor = subjectColor;
    }

    public String getCategoryColor() {
        return categoryColor;
    }

    public void setCategoryColor(String categoryColor) {
        this.categoryColor = categoryColor;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public ApplicationUser getUser() {
        return user;
    }

    public void setUser(ApplicationUser user) {
        this.user = user;
    }



    @Override
    public boolean equals(Object obj) {
        if (obj == null || !getClass().isAssignableFrom(obj.getClass())) {
            return false;
        }
        if (obj == this) {
            return true;
        }

        Task other = (Task) obj;
        return getId() != null && getId().equals(other.getId());
    }

    // Helper method to check if the task is due within the user's configured urgency
    // window. Pass the user's threshold (hours) AND their timezone — "now" must be
    // computed in the user's zone, otherwise urgency calculations drift when the server
    // is in a different zone than the user.
    public boolean isUrgent(int thresholdHours, java.time.ZoneId userZone) {
        // If it's already done, or has no due date, it's not urgent
        if (isCompleted || dueDate == null) {
            return false;
        }

        // "Now" in the user's wall-clock zone. The due date is already wall-clock
        // (LocalDateTime), so comparing them directly is the right thing — both are
        // "what time the user sees on their clock."
        LocalDateTime nowInUserZone = LocalDateTime.now(userZone);
        LocalDateTime thresholdMoment = nowInUserZone.plusHours(thresholdHours);

        // Return true if the due date is BEFORE the threshold moment
        return dueDate.isBefore(thresholdMoment);
    }

    /**
     * Backwards-compatible: threshold without an explicit zone. Falls back to the
     * server's default zone. Prefer the (int, ZoneId) variant when you have the user.
     */
    public boolean isUrgent(int thresholdHours) {
        return isUrgent(thresholdHours, java.time.ZoneId.systemDefault());
    }

    /**
     * Backwards-compatible no-arg variant. Defaults to 48 hours (the old hardcoded
     * 2-day window). Prefer the parameterized version when you know the user's setting.
     */
    public boolean isUrgent() {
        return isUrgent(48);
    }

    /**
     * Returns true if the due date has passed, evaluated in the user's timezone.
     * Pulled out as its own method so callers don't have to recompute "now" themselves.
     */
    public boolean isPastDue(java.time.ZoneId userZone) {
        if (isCompleted || dueDate == null) {
            return false;
        }
        return dueDate.isBefore(LocalDateTime.now(userZone));
    }

    @Override
    public int hashCode() {
        // Hashcode should never change during the lifetime of an object, so we only use the ID which is assigned once and never changes.
        return getClass().hashCode();
    }
}

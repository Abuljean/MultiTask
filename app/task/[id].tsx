// Task detail/edit — tap any task card to get here. Same sheet as quick-add,
// pre-filled; Save applies an optimistic full-field update.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { TaskFormSheet } from '@/components/task-form-sheet';
import { useUndoToast } from '@/components/undo-toast';
import { animateListChanges } from '@/lib/animate-layout';
import { DEFAULT_CATEGORY, DEFAULT_CATEGORY_COLOR, DEFAULT_SUBJECT_COLOR } from '@/lib/tasks/types';
import { useTasks, useUpdateTask } from '@/lib/tasks/use-tasks';

export default function EditTaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Number(id);
  const { data: tasks } = useTasks();
  const updateTask = useUpdateTask();
  const toast = useUndoToast();

  const task = tasks?.find((t) => t.id === taskId);

  // Cache miss (deep link before data loads, or the task was deleted
  // elsewhere): nothing to edit, leave quietly.
  useEffect(() => {
    if (tasks && !task) {
      router.back();
    }
  }, [tasks, task, router]);

  if (!task) {
    return null;
  }

  return (
    <TaskFormSheet
      submitLabel="Save"
      initial={{
        title: task.title,
        dueDate: task.dueDate,
        description: task.description,
        priority: task.priority,
        category:
          task.category && task.category !== DEFAULT_CATEGORY
            ? { name: task.category, color: task.categoryColor }
            : null,
        subject: task.subject ? { name: task.subject, color: task.subjectColor } : null,
      }}
      onSubmit={(values) => {
        // The edit may change the due date → the card can change groups, so
        // regroups animate like everywhere else.
        animateListChanges();
        updateTask.mutate(
          {
            id: task.id,
            edits: {
              title: values.title,
              dueDate: values.dueDate,
              description: values.description,
              priority: values.priority,
              category: values.category?.name ?? DEFAULT_CATEGORY,
              categoryColor: values.category?.color ?? DEFAULT_CATEGORY_COLOR,
              subject: values.subject?.name ?? '',
              subjectColor: values.subject?.color ?? DEFAULT_SUBJECT_COLOR,
            },
          },
          { onError: () => toast.show({ message: 'Couldn’t save the changes — check your connection.' }) }
        );
      }}
    />
  );
}

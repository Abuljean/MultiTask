// Quick-add — a thin route over the shared TaskFormSheet. Default due time
// is today 11:59 PM; optimistic create with a temp id so the card appears
// in the list (visible behind the closing sheet) the moment Add is tapped.
import { TaskFormSheet } from '@/components/task-form-sheet';
import { useUndoToast } from '@/components/undo-toast';
import { animateListChanges } from '@/lib/animate-layout';
import { markEnter } from '@/lib/enter-marks';
import { endOfToday } from '@/lib/tasks/dates';
import type { NewTask } from '@/lib/tasks/types';
import { useCreateTask } from '@/lib/tasks/use-tasks';

export default function QuickAddScreen() {
  const createTask = useCreateTask();
  const toast = useUndoToast();

  return (
    <TaskFormSheet
      submitLabel="Add task"
      autoFocusTitle
      initial={{ dueDate: endOfToday() }}
      onSubmit={(values) => {
        const input: NewTask = {
          title: values.title,
          dueDate: values.dueDate,
          ...(values.description.length > 0 && { description: values.description }),
          ...(values.priority != null && { priority: values.priority }),
          ...(values.category && { category: values.category.name, categoryColor: values.category.color }),
          ...(values.subject && { subject: values.subject.name, subjectColor: values.subject.color }),
        };
        const tempId = -Date.now();
        animateListChanges();
        markEnter(tempId, 'right');
        createTask.mutate(
          { input, tempId },
          { onError: () => toast.show({ message: 'Couldn’t add the task — check your connection.' }) }
        );
      }}
    />
  );
}

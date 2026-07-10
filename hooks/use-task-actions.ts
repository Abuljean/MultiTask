// The swipe handlers for task cards — extracted so every screen showing
// tasks (Tasks list, Daily view) gets identical behavior: optimistic
// mutations, undo toasts, regroup animation, entrance marks, error surfacing.
import { useUndoToast } from '@/components/undo-toast';
import { animateListChanges } from '@/lib/animate-layout';
import { markEnter } from '@/lib/enter-marks';
import type { Task } from '@/lib/tasks/types';
import {
  useDeleteTask,
  usePermanentlyDeleteTask,
  useRestoreTask,
  useSetTaskCompleted,
} from '@/lib/tasks/use-tasks';

export function useTaskActions() {
  const setCompleted = useSetTaskCompleted();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();
  const permanentlyDelete = usePermanentlyDeleteTask();
  const toast = useUndoToast();

  // A failed mutation rolls the optimistic change back — the task visibly
  // snaps back. Without a message that reads as a spooky bug, so every
  // handler surfaces the failure factually.
  function showError(what: string) {
    return () => toast.show({ message: `Couldn’t ${what} — check your connection.` });
  }

  function handleSwipeRight(task: Task) {
    animateListChanges();
    markEnter(task.id, 'right');
    if (task.deletedAt) {
      restoreTask.mutate(task.id, { onError: showError('restore the task') });
    } else if (task.isCompleted) {
      setCompleted.mutate({ id: task.id, isCompleted: false }, { onError: showError('update the task') });
    } else {
      setCompleted.mutate({ id: task.id, isCompleted: true }, { onError: showError('complete the task') });
      toast.show({
        message: 'Task completed.',
        onUndo: () => {
          animateListChanges();
          markEnter(task.id, 'right');
          setCompleted.mutate({ id: task.id, isCompleted: false }, { onError: showError('update the task') });
        },
      });
    }
  }

  function handleSwipeLeft(task: Task) {
    animateListChanges();
    if (task.deletedAt) {
      permanentlyDelete.mutate(task.id, { onError: showError('delete the task') });
      toast.show({ message: 'Task permanently deleted.' });
    } else {
      markEnter(task.id, 'left'); // it enters the trash leftward
      deleteTask.mutate(task.id, { onError: showError('delete the task') });
      toast.show({
        message: 'Task deleted.',
        onUndo: () => {
          animateListChanges();
          markEnter(task.id, 'right');
          restoreTask.mutate(task.id, { onError: showError('restore the task') });
        },
      });
    }
  }

  return { handleSwipeRight, handleSwipeLeft };
}

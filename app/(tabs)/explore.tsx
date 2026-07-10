// THROWAWAY DEBUG SCREEN — proves the data layer end-to-end (Supabase, RLS,
// wall-clock dates, status derivation) before any real UI exists. It gets
// replaced wholesale when the designed task list is built. Deliberately not
// following the design system: it must look temporary, because it is.
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deriveStatus, type TaskStatus } from '@/lib/tasks/status';
import type { Task } from '@/lib/tasks/types';
import { useCreateTask, useDeleteTask, useSetTaskCompleted, useTasks } from '@/lib/tasks/use-tasks';

// Debug-only colors (the sacred four, light-mode values). The real token
// system arrives with the design pass.
const STATUS_COLORS: Record<TaskStatus, string> = {
  default: '#9ca3af',
  ongoing: '#16a34a',
  urgent: '#ea580c',
  overdue: '#dc2626',
  completed: '#d1d5db',
};

export default function DebugTasksScreen() {
  const insets = useSafeAreaInsets();
  const { data: tasks, isLoading, error, refetch, isRefetching } = useTasks();
  const createTask = useCreateTask();
  const setCompleted = useSetTaskCompleted();
  const deleteTask = useDeleteTask();
  const [title, setTitle] = useState('');

  function addTask() {
    // Debug shortcut: everything is due "tomorrow at noon". The real
    // quick-add (date picker + time dropdown) comes with the designed UI.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    createTask.mutate(
      { title: title.trim(), dueDate: tomorrow },
      {
        onSuccess: () => setTitle(''),
        onError: (e) => Alert.alert('Create failed', e.message),
      }
    );
  }

  function confirmDelete(task: Task) {
    // Plain confirm for the debug screen; the real UI gets undo toasts
    // instead of confirmation dialogs (docs/design/04).
    Alert.alert('Delete task?', task.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask.mutate(task.id) },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.heading}>Tasks (debug)</Text>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New task title (due tomorrow noon)"
          value={title}
          onChangeText={setTitle}
        />
        <Button title="Add" onPress={addTask} disabled={!title.trim() || createTask.isPending} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>Failed to load tasks: {error.message}</Text>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(task) => String(task.id)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<Text style={styles.empty}>No tasks.</Text>}
          renderItem={({ item: task }) => {
            const status = deriveStatus(task);
            return (
              <Pressable
                style={styles.row}
                onPress={() => setCompleted.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                onLongPress={() => confirmDelete(task)}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
                <View style={styles.rowText}>
                  <Text style={[styles.title, task.isCompleted && styles.titleCompleted]} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <Text style={styles.meta}>
                    {status}
                    {task.dueDate
                      ? ` · due ${task.dueDate.toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}`
                      : ' · no due date'}
                    {task.priority ? ` · P${task.priority}` : ''}
                    {` · ${task.category}`}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
      <Text style={styles.hint}>Tap = toggle complete · long-press = delete · pull = refresh</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  heading: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 15 },
  spinner: { marginTop: 32 },
  error: { color: '#dc2626', marginTop: 16 },
  empty: { color: '#888', marginTop: 24, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  rowText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '500' },
  titleCompleted: { textDecorationLine: 'line-through', color: '#999' },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  hint: { fontSize: 11, color: '#aaa', textAlign: 'center', paddingVertical: 8 },
});

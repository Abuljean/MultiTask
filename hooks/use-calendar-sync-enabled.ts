// "Add tasks to my calendar" — per-user, synced across devices via Supabase
// Auth user metadata (same pattern as urgent_threshold_hours). Default OFF:
// writing to someone's calendar is opt-in, never a surprise.
import { useAuth } from '@/hooks/use-auth';

export function useCalendarSyncEnabled(): boolean {
  const { session } = useAuth();
  return session?.user.user_metadata?.calendar_sync_enabled === true;
}

// The user's urgency threshold (hours before due = "urgent"), stored in
// Supabase Auth user metadata — per-user, synced across devices, no extra
// table. Falls back to the same 48h default the web app uses.
import { useAuth } from '@/hooks/use-auth';
import { DEFAULT_URGENCY_THRESHOLD_HOURS } from '@/lib/tasks/status';

export function useUrgencyThreshold(): number {
  const { session } = useAuth();
  const stored = session?.user.user_metadata?.urgent_threshold_hours;
  return typeof stored === 'number' && stored > 0 ? stored : DEFAULT_URGENCY_THRESHOLD_HOURS;
}

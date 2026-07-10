// How long before a deadline the reminder fires — user-configurable in
// Settings (handoff: "~1–2 hours, ideally configurable"), stored in auth
// user metadata like the urgency threshold.
import { useAuth } from '@/hooks/use-auth';
import { DEFAULT_LEAD_MINUTES } from '@/lib/notifications';

export function useNotificationLead(): number {
  const { session } = useAuth();
  const stored = session?.user.user_metadata?.notification_lead_minutes;
  return typeof stored === 'number' && stored > 0 ? stored : DEFAULT_LEAD_MINUTES;
}

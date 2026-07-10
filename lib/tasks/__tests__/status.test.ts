import { addHours } from '../dates';
import { DEFAULT_URGENCY_THRESHOLD_HOURS, deriveStatus } from '../status';

// A fixed "now" makes every test deterministic. Mid-month, midday, no DST
// transition nearby.
const NOW = new Date(2026, 6, 15, 12, 0, 0); // July 15 2026, 12:00 local

function statusFor(dueDate: Date | null, isCompleted = false) {
  return deriveStatus({ isCompleted, dueDate }, { now: NOW });
}

describe('deriveStatus', () => {
  test('completed wins over everything, even a long-overdue date', () => {
    expect(statusFor(addHours(NOW, -1000), true)).toBe('completed');
    expect(statusFor(null, true)).toBe('completed');
    expect(statusFor(addHours(NOW, 1000), true)).toBe('completed');
  });

  test('no due date is default, never urgent or overdue', () => {
    expect(statusFor(null)).toBe('default');
  });

  test('due in the past is overdue', () => {
    expect(statusFor(addHours(NOW, -1))).toBe('overdue');
    expect(statusFor(addHours(NOW, -0.001))).toBe('overdue');
  });

  test('due exactly now is NOT overdue (strict before, matching Java isBefore)', () => {
    expect(statusFor(new Date(NOW.getTime()))).not.toBe('overdue');
  });

  test('due within the 48h default threshold is urgent', () => {
    expect(statusFor(addHours(NOW, 1))).toBe('urgent');
    expect(statusFor(addHours(NOW, 47.9))).toBe('urgent');
  });

  test('due exactly AT the threshold is ongoing, not urgent (strict before)', () => {
    expect(statusFor(addHours(NOW, DEFAULT_URGENCY_THRESHOLD_HOURS))).toBe('ongoing');
  });

  test('due beyond the threshold is ongoing', () => {
    expect(statusFor(addHours(NOW, 72))).toBe('ongoing');
  });

  test('a custom urgency threshold is respected', () => {
    const dueIn12h = addHours(NOW, 12);
    expect(deriveStatus({ isCompleted: false, dueDate: dueIn12h }, { now: NOW, urgencyThresholdHours: 6 })).toBe(
      'ongoing'
    );
    expect(deriveStatus({ isCompleted: false, dueDate: dueIn12h }, { now: NOW, urgencyThresholdHours: 24 })).toBe(
      'urgent'
    );
  });
});

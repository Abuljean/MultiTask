// Surfaces permanently-dropped sync operations (deferred #14): the connector
// counts offline changes it had to skip (RLS/constraint rejections — see
// lib/sync/connector.ts); this hook polls that counter. With `notify`, a
// growth shows a one-time calm toast (mounted once, in the tabs layout);
// Settings reads the plain count for its caption.
import { useEffect, useRef, useState } from 'react';

import { useUndoToast } from '@/components/undo-toast';
import { droppedOpCount } from '@/lib/sync/system';

const POLL_MS = 15000;

export function useDroppedOpCount(options: { notify?: boolean } = {}): number {
  const { notify = false } = options;
  const [count, setCount] = useState(() => droppedOpCount());
  const toast = useUndoToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const lastNotified = useRef(0);

  useEffect(() => {
    const tick = () => {
      const current = droppedOpCount();
      setCount(current);
      if (notify && current > lastNotified.current) {
        lastNotified.current = current;
        toastRef.current.show({
          message:
            current === 1
              ? '1 change couldn’t sync and was skipped.'
              : `${current} changes couldn’t sync and were skipped.`,
        });
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [notify]);

  return count;
}

// Collapsed/expanded state for a list section (Completed, Deleted), persisted
// so the choice sticks across app launches. Defaults to collapsed.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export function useCollapsedSection(storageKey: string): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (stored !== null) setCollapsed(stored === 'true');
    });
  }, [storageKey]);

  const toggle = () =>
    setCollapsed((current) => {
      const next = !current;
      AsyncStorage.setItem(storageKey, String(next));
      return next;
    });

  return [collapsed, toggle];
}

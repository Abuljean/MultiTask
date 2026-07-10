// Whether the Completed section is collapsed — persisted so the choice
// sticks across app launches (developer requirement). Defaults to collapsed.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ui.completedCollapsed';

export function useCompletedCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored !== null) setCollapsed(stored === 'true');
    });
  }, []);

  const toggle = () =>
    setCollapsed((current) => {
      const next = !current;
      AsyncStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });

  return [collapsed, toggle];
}

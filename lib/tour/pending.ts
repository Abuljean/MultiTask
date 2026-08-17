// "New user - run the tour on arrival." Sign-up plants the flag;
// use-first-run-guide consumes it and starts the tour even when this
// device's per-device seen flag is already burned (a fresh account created
// on a well-used device got no tour otherwise - TestFlight 2026-08-17).
// AsyncStorage so the flag survives the kill-app-to-confirm-email round
// trip between sign-up and first sign-in.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ui.tourPending';

export async function markTourPending(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // Storage failure just means no auto-tour. Settings has Replay.
  }
}

/** True at most once - reading the flag clears it. */
export async function consumeTourPending(): Promise<boolean> {
  try {
    const set = (await AsyncStorage.getItem(KEY)) === '1';
    if (set) await AsyncStorage.removeItem(KEY);
    return set;
  } catch {
    return false;
  }
}

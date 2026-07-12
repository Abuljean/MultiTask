// Desktop/web layout constants. Content is centered at a readable width via
// contentContainerStyle on the SCROLLABLE itself (never an outer wrapper
// View) so the browser scrollbar sits at the true window edge and swipe
// exit animations can travel the full viewport before clipping.
import type { ViewStyle } from 'react-native';

export const CONTENT_MAX_WIDTH = 1100;

/** Spread into a ScrollView/SectionList `contentContainerStyle` (or a
 *  non-scrolling header wrapper) to center content on wide screens.
 *  No-op on phones — the max width is wider than any phone. */
export const pageContent: ViewStyle = {
  width: '100%',
  maxWidth: CONTENT_MAX_WIDTH,
  marginHorizontal: 'auto',
};

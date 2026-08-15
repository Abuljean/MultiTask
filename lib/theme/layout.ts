// Desktop/web layout constants. Content is centered at a readable width via
// contentContainerStyle on the SCROLLABLE itself (never an outer wrapper
// View) so the browser scrollbar sits at the true window edge and swipe
// exit animations can travel the full viewport before clipping.
import type { ViewStyle } from 'react-native';

// 1400 (was 1100): the developer wants the space USED — at a typical
// ~1600px laptop window this reads nearly full-bleed; the cap only bites
// on ultrawide monitors where true edge-to-edge would be absurd.
export const CONTENT_MAX_WIDTH = 1400;

/** Spread into a ScrollView/SectionList `contentContainerStyle` (or a
 *  non-scrolling header wrapper) to center content on wide screens.
 *  No-op on phones — the max width is wider than any phone. */
/** Widest a modal sheet ever gets. Matches the web dialog cap so the same
 *  form reads identically on a laptop and on an iPad. */
export const SHEET_MAX_WIDTH = 560;

/** Bottom sheets on a tablet: a centred column that still hugs the bottom
 *  edge, rather than a full-width slab. Native tablets only — see
 *  `useWideNative`. */
export const tabletSheet: ViewStyle = {
  maxWidth: SHEET_MAX_WIDTH,
  alignSelf: 'center',
};

export const pageContent: ViewStyle = {
  width: '100%',
  maxWidth: CONTENT_MAX_WIDTH,
  marginHorizontal: 'auto',
};

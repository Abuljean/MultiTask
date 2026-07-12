// Style packs (docs/design/09 + 10): the CURATED registry.
//
// DISTRIBUTION SECURITY (developer decision 2026-07-12): users can NEVER
// sideload a pack. This array — code shipped inside the app — is the only
// source of installable styles, so "only ours and approved" is enforced
// structurally: there is no import UI, no file picker, no URL loader.
// When the marketplace phase arrives, packs will additionally load from the
// official catalog ONLY, as downloads signed by our private key and verified
// against a public key baked into this binary (doc 10 §APP-7). Approved
// third-party packs go through us: submit → review → we sign → we publish.
import type { ThemeColors } from '@/lib/theme/tokens';

export type StylePack = {
  id: string;
  name: string;
  author: string;
  /** Partial color overrides merged over the base palette, per mode. A pack
   *  may override one color or all of them; both modes stay independent. */
  colors?: { light?: Partial<ThemeColors>; dark?: Partial<ThemeColors> };
};

export const DEFAULT_PACK_ID = 'multitask.default';

export const STYLE_PACKS: StylePack[] = [
  {
    id: DEFAULT_PACK_ID,
    name: 'Multitask',
    author: 'Multitask',
    // No overrides — the hand-tuned base tokens ARE the default style.
  },
];

export function getPack(id: string | null | undefined): StylePack {
  return STYLE_PACKS.find((p) => p.id === id) ?? STYLE_PACKS[0];
}

// Minimal declaration for react-native-web's escape hatch (used only in
// .web.tsx files); the package ships no TypeScript types.
declare module 'react-native-web' {
  import type { ReactElement } from 'react';
  export function unstable_createElement(
    type: string,
    props: Record<string, unknown>
  ): ReactElement;
}

// One shared layout animation for every list change (docs/design/05: motion
// has a job — here it's continuity). Called right before an optimistic cache
// update: rows that move to a new group visibly glide there (spring update),
// rows that appear fade in slightly after the layout settles, rows that
// leave fade out fast. LayoutAnimation animates ALL layout changes in the
// next frame, which is exactly what a list regroup needs.
import { LayoutAnimation } from 'react-native';

export function animateListChanges() {
  LayoutAnimation.configureNext({
    duration: 300,
    create: { type: 'easeInEaseOut', property: 'opacity', duration: 200, delay: 80 },
    update: { type: 'spring', springDamping: 0.85 },
    delete: { type: 'easeInEaseOut', property: 'opacity', duration: 150 },
  });
}

// The Styles screen (docs/design/09 APP-1) — reached from a low-key Settings
// row. The switching logic is fully wired (useStylePacks → provider merge),
// but the catalog currently holds only the default pack, so the screen
// honestly reads "coming soon". NO import path exists by design: styles are
// curated — only packs we ship (or later sign and publish) can ever appear
// here (developer decision 2026-07-12, doc 10 APP-7).
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useStylePacks, useTheme } from '@/lib/theme/use-theme';

export default function StylesScreen() {
  const router = useRouter();
  const { colors, space, radius, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { packs, activeId, setActive } = useStylePacks();

  // Same sheet shell as the other transparent routes.
  const sheetOffset = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: 220 });
    sheetOffset.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [backdropOpacity, sheetOffset]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetOffset.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value * 0.35 }));

  function goBack() {
    router.back();
  }
  function close() {
    backdropOpacity.value = withTiming(0, { duration: 220 });
    sheetOffset.value = withTiming(
      screenHeight,
      { duration: 260, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(goBack)();
      }
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Pressable style={styles.backdropTouch} onPress={close} accessibilityLabel="Close styles" />
      <Animated.View
        style={[
          sheetStyle,
          styles.sheet,
          {
            backgroundColor: colors.surfaceElevated,
            borderTopLeftRadius: radius.card,
            borderTopRightRadius: radius.card,
            padding: space.s4,
            paddingBottom: Math.max(insets.bottom, space.s4),
            gap: space.s3,
          },
        ]}>
        <Text style={[type.h2, { color: colors.textPrimary }]}>Styles</Text>

        {packs.map((pack) => {
          const applied = pack.id === activeId;
          return (
            <Pressable
              key={pack.id}
              onPress={() => setActive(pack.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: applied }}
              style={[
                styles.packRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: applied ? colors.accent : colors.borderSubtle,
                  borderWidth: applied ? 1.5 : 1,
                  borderRadius: radius.card,
                  padding: space.s4,
                },
              ]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                  {pack.name}
                </Text>
                <Text style={[type.caption, { color: colors.textTertiary, fontWeight: '400' }]}>
                  by {pack.author}
                </Text>
              </View>
              {applied && <IconSymbol name="checkmark" size={18} color={colors.accent} />}
            </Pressable>
          );
        })}

        <View
          style={[
            styles.comingSoon,
            {
              borderColor: colors.borderSubtle,
              borderRadius: radius.card,
              padding: space.s4,
              gap: space.s1,
            },
          ]}>
          <Text style={[type.body, { color: colors.textSecondary, fontWeight: '600' }]}>
            More styles coming soon
          </Text>
          <Text style={[type.caption, { color: colors.textTertiary, fontWeight: '400' }]}>
            New looks for your tasks — cards, colors, and animations. Styles are curated: only
            packs published by Multitask and approved artists appear here.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  comingSoon: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});

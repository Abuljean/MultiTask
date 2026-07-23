// SECRET marketplace template (developer request 2026-07-23) — the future
// style-pack storefront per docs/design/09/10. NOT linked from anywhere: it
// ships as a hidden route (/marketplace) so the layout can be designed and
// iterated long before the marketplace phase. Storefront DNA borrowed from
// the big stores (Steam/app stores): a featured hero, horizontal shelves,
// then a browse grid — all through theme tokens, no hard-coded visuals.
// Every pack shown is a PLACEHOLDER; curation stays structural (doc 10
// APP-7): the only real source of packs is the signed registry.
import { Stack, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { pageContent } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/use-theme';

type DemoPack = {
  id: string;
  name: string;
  author: string;
  price: string;
  /** Placeholder cover: a two-stop gradient stands in for pack art. */
  art: [string, string];
  tag?: string;
};

const FEATURED: DemoPack = {
  id: 'aurora',
  name: 'Aurora',
  author: 'Multitask Studio',
  price: 'Free',
  art: ['#4954C7', '#2dd4bf'],
  tag: 'Featured',
};

const SHELF_NEW: DemoPack[] = [
  { id: 'graphite', name: 'Graphite', author: 'Multitask Studio', price: 'Free', art: ['#3a3d45', '#71767f'] },
  { id: 'terracotta', name: 'Terracotta', author: 'Studio Ochre', price: '$1.99', art: ['#c2410c', '#facc15'] },
  { id: 'tidepool', name: 'Tidepool', author: 'North Shore', price: '$1.99', art: ['#0e7490', '#4ade80'] },
  { id: 'ink', name: 'Ink & Paper', author: 'Multitask Studio', price: 'Free', art: ['#1a1a1d', '#e8e5de'] },
];

const GRID: DemoPack[] = [
  ...SHELF_NEW,
  { id: 'meadow', name: 'Meadow', author: 'Fern Collective', price: '$0.99', art: ['#16a34a', '#a3e635'] },
  { id: 'dusk', name: 'Dusk', author: 'Studio Ochre', price: '$0.99', art: ['#7c3aed', '#f472b6'] },
];

function PackArt({ pack, height }: { pack: DemoPack; height: number }) {
  // No gradients dependency — two stacked color fields read as cover art.
  return (
    <View style={{ height, overflow: 'hidden' }}>
      <View style={{ flex: 1.6, backgroundColor: pack.art[0] }} />
      <View style={{ flex: 1, backgroundColor: pack.art[1] }} />
    </View>
  );
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, space, radius, type, monoFont } = useTheme();
  const isWeb = Platform.OS === 'web';

  function PriceChip({ price }: { price: string }) {
    return (
      <View
        style={{
          backgroundColor: price === 'Free' ? colors.accentMuted : colors.accent,
          borderRadius: radius.pill,
          paddingHorizontal: space.s3,
          paddingVertical: 3,
        }}>
        <Text
          style={{
            fontFamily: monoFont,
            fontSize: 12,
            color: price === 'Free' ? colors.accent : colors.textOnAccent,
          }}>
          {price}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[pageContent, { paddingHorizontal: space.s4, paddingBottom: insets.bottom + space.s8 }]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.headerRow, { paddingVertical: space.s3 }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={colors.accent} />
            <Text style={[type.body, { color: colors.accent, fontWeight: '600' }]}>Back</Text>
          </Pressable>
          <Text style={{ fontFamily: monoFont, fontSize: 11, color: colors.textTertiary }}>
            TEMPLATE · not live
          </Text>
        </View>
        <Text style={[type.display, { color: colors.textPrimary }]}>Styles marketplace</Text>
        <Text style={[type.body, { color: colors.textSecondary, marginTop: space.s1, marginBottom: space.s5 }]}>
          Curated looks for your tasks. Every pack is reviewed and signed by Multitask before it
          appears here.
        </Text>

        {/* Featured hero — the storefront's one loud moment. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${FEATURED.name}, featured pack`}
          style={[
            styles.hero,
            { borderRadius: radius.card, borderColor: colors.borderSubtle },
          ]}>
          <PackArt pack={FEATURED} height={isWeb ? 260 : 180} />
          <View style={[styles.heroBar, { backgroundColor: colors.surfaceElevated, padding: space.s4 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: monoFont, fontSize: 11, color: colors.accent }}>
                {FEATURED.tag?.toUpperCase()}
              </Text>
              <Text style={[type.h1, { color: colors.textPrimary }]}>{FEATURED.name}</Text>
              <Text style={[type.caption, { color: colors.textTertiary, fontWeight: '400' }]}>
                by {FEATURED.author}
              </Text>
            </View>
            <PriceChip price={FEATURED.price} />
          </View>
        </Pressable>

        {/* Horizontal shelf */}
        <Text style={[type.h2, { color: colors.textPrimary, marginTop: space.s6, marginBottom: space.s3 }]}>
          New this week
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s3 }}>
          {SHELF_NEW.map((pack) => (
            <Pressable
              key={pack.id}
              accessibilityRole="button"
              accessibilityLabel={`${pack.name} by ${pack.author}, ${pack.price}`}
              style={[
                styles.shelfCard,
                { borderRadius: radius.card, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceElevated },
              ]}>
              <PackArt pack={pack} height={92} />
              <View style={{ padding: space.s3, gap: 2 }}>
                <Text numberOfLines={1} style={[type.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                  {pack.name}
                </Text>
                <View style={styles.rowBetween}>
                  <Text numberOfLines={1} style={[type.caption, { color: colors.textTertiary, fontWeight: '400', flex: 1 }]}>
                    {pack.author}
                  </Text>
                  <PriceChip price={pack.price} />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Browse grid */}
        <Text style={[type.h2, { color: colors.textPrimary, marginTop: space.s6, marginBottom: space.s3 }]}>
          Browse all
        </Text>
        <View style={[styles.grid, { gap: space.s3 }]}>
          {GRID.map((pack) => (
            <Pressable
              key={`g-${pack.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${pack.name} by ${pack.author}, ${pack.price}`}
              style={[
                styles.gridCard,
                { borderRadius: radius.card, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceElevated },
              ]}>
              <PackArt pack={pack} height={72} />
              <View style={{ padding: space.s3, gap: 2 }}>
                <Text numberOfLines={1} style={[type.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                  {pack.name}
                </Text>
                <View style={styles.rowBetween}>
                  <Text numberOfLines={1} style={[type.caption, { color: colors.textTertiary, fontWeight: '400', flex: 1 }]}>
                    {pack.author}
                  </Text>
                  <PriceChip price={pack.price} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={[type.caption, { color: colors.textTertiary, fontWeight: '400', marginTop: space.s8 }]}>
          Template only — packs shown are placeholders. Purchases, downloads, and the signed-catalog
          pipeline arrive with the marketplace phase (docs/design/09–10).
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  hero: { borderWidth: 1, overflow: 'hidden' },
  heroBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shelfCard: { width: 168, borderWidth: 1, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCard: { flexBasis: 160, flexGrow: 1, maxWidth: 220, borderWidth: 1, overflow: 'hidden' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

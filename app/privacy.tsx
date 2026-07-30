// Privacy policy — a PUBLIC route (no account needed): the App Store/Play
// listing links here, reviewers open it signed-out, and Settings links it
// for users. Factual and specific (doc 06 voice) — it describes what the
// app actually does, verified against the codebase, not boilerplate.
import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { pageContent } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/use-theme';

const UPDATED = 'July 30, 2026';
const CONTACT = 'yijack56@gmail.com';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What Multitask collects',
    body: 'Your account email and password (the password is handled by our authentication provider and never visible to us), the tasks, events, categories, and settings you create, and — only if you add one — a profile photo. That is the complete list. There are no ads, no analytics profiles, no tracking across other apps or sites, and your data is never sold or shared for marketing.',
  },
  {
    title: 'Where it lives',
    body: 'Your data is stored with Supabase (our database and authentication provider) on servers in the United States, protected by row-level security so each account can only ever read its own rows. A copy also lives on your own device so the app works offline; signing out removes that local copy.',
  },
  {
    title: 'Crash reports',
    body: 'If the app crashes or hits an internal error, a technical report (stack trace, device model, OS version) is sent to Sentry so the problem can be fixed. These reports are configured to exclude your tasks, events, and personal details — they describe the failure, not your data.',
  },
  {
    title: 'Device permissions',
    body: 'Notifications (optional): used only to remind you about your own tasks — scheduling happens on your device. Calendar (optional, off by default): if you enable “Add tasks to my calendar,” the app writes your tasks into a calendar it creates and removes them when you turn it off. Photos (optional): only opened if you choose a profile picture. The app never reads your existing calendar events or photo library beyond what you pick.',
  },
  {
    title: 'Backups',
    body: 'The database is backed up nightly so your tasks can be restored after a failure. Backups are retained for 90 days, protected by the same access controls, then deleted automatically.',
  },
  {
    title: 'Deleting your data',
    body: `Deleting tasks and events in the app deletes them from the server (trash is emptied permanently). To delete your entire account and everything attached to it, email ${CONTACT} from your account address — deletion is completed within 30 days.`,
  },
  {
    title: 'Children',
    body: 'Multitask is not directed at children under 13, and no accounts are knowingly kept for them.',
  },
  {
    title: 'Changes and contact',
    body: `If this policy changes materially, the date above changes and significant updates are noted in the app. Questions or requests: ${CONTACT}.`,
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, space, radius, type, monoFont } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[pageContent, { paddingHorizontal: space.s4, paddingBottom: insets.bottom + space.s8 }]}
        showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.backButton, { paddingVertical: space.s3 }]}>
          <IconSymbol name="chevron.left" size={20} color={colors.accent} />
          <Text style={[type.body, { color: colors.accent, fontWeight: '600' }]}>Back</Text>
        </Pressable>

        <Text style={[type.display, { color: colors.textPrimary }]}>Privacy policy</Text>
        <Text style={{ fontFamily: monoFont, fontSize: 12, color: colors.textTertiary, marginTop: space.s1, marginBottom: space.s5 }}>
          Multitask Manager · updated {UPDATED}
        </Text>

        <View style={{ gap: space.s3 }}>
          {SECTIONS.map((s) => (
            <View
              key={s.title}
              style={{
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderSubtle,
                borderWidth: 1,
                borderRadius: radius.card,
                padding: space.s4,
                gap: space.s1,
              }}>
              <Text style={[type.h2, { color: colors.textPrimary }]}>{s.title}</Text>
              <Text style={[type.body, { color: colors.textSecondary }]}>{s.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
});

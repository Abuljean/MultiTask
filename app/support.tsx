// Support page. PUBLIC like /terms and /privacy — the App Store listing
// requires a Support URL that anyone can reach without an account, and App
// Review opens it. Same card anatomy as the policy pages; the answers here
// are the questions a real user actually hits first.
import { Stack, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { pageContent } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/use-theme';

const UPDATED = 'August 15, 2026';
const CONTACT = 'yijack56@gmail.com';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'My tasks are not showing up on my other device',
    body: 'Both devices have to be signed in to the same account. Open the app on each one and check the email under Settings. If they match, give it a minute with the screen on. The dot at the top of the Tasks list tells you where sync stands: blue means live, and a red outlined ring with the word offline means the device cannot reach the server yet. Tap that dot to make it try again.',
  },
  {
    title: 'Can I use it without internet?',
    body: 'Yes. Everything you do offline is saved on the device and sent up the moment you get a connection back, so you can add and finish tasks on a plane or underground. You only need a connection the first time you sign in on a device.',
  },
  {
    title: 'I am not getting notifications',
    body: 'Notifications need permission. Go to Settings inside the app and look at the Notifications section, which shows whether permission was granted and offers a button to ask again. If it says permission was denied, iOS will not ask a second time, so you have to turn it back on in the iPhone Settings app under Multitask Manager.',
  },
  {
    title: 'How do I import my schedule?',
    body: 'Open the Calendar tab and tap the tray icon at the top. You can bring in a CSV file of events or tasks. If you do not have one, the same screen has a How do I make a CSV link that gives you a prompt you can paste into any AI assistant along with your schedule, and it will produce a file in the right format.',
  },
  {
    title: 'I signed up on the website years ago',
    body: 'Sign up in the app using the same email address you used on the old site and confirm it. Your old tasks link to the new account automatically once the email matches.',
  },
  {
    title: 'I forgot my password',
    body: 'Tap Reset password in Settings, or use the link on the sign-in screen. A reset email goes to your address. Open that link on a computer or phone browser to set the new password, then sign in again in the app.',
  },
  {
    title: 'How do I delete my account?',
    body: 'Settings has a Delete account button at the bottom. It asks twice, then permanently removes your tasks, events, recurring items and profile photo, and closes the account. It cannot be undone and there is no waiting period.',
  },
  {
    title: 'Still stuck',
    body: `Email ${CONTACT} and describe what happened and what you expected instead. Say which device you are on if you can. This is a small independent project, so replies come from a person and may take a few days.`,
  },
];

export default function SupportScreen() {
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

        <Text style={[type.display, { color: colors.textPrimary }]}>Support</Text>
        <Text style={[type.caption, { fontFamily: monoFont, color: colors.textTertiary, marginTop: space.s1, marginBottom: space.s5 }]}>
          Multitask Manager · updated {UPDATED}
        </Text>

        <Pressable
          // A device with no mail account rejects the mailto: — swallow it
          // rather than throwing. The address is printed right below, so the
          // user still has the support path either way.
          onPress={() => Linking.openURL(`mailto:${CONTACT}`).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel={`Email support at ${CONTACT}`}
          style={{
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.accent,
            borderWidth: 1,
            borderRadius: radius.card,
            padding: space.s4,
            marginBottom: space.s3,
            gap: space.s1,
          }}>
          <Text style={[type.h2, { color: colors.textPrimary }]}>Contact</Text>
          <Text style={[type.body, { color: colors.accent }]}>{CONTACT}</Text>
        </Pressable>

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

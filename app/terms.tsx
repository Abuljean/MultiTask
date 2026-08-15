// Terms of service. A PUBLIC route like /privacy: reviewers and users can
// read it without an account, and the store listing links here. Written in
// plain language on purpose. The liability and warranty sections are the
// part that protects the developer, keep them intact.
import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { pageContent } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/use-theme';

const UPDATED = 'August 15, 2026';
const CONTACT = 'yijack56@gmail.com';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What this is',
    body: 'Multitask Manager is a task manager made by an independent developer. By creating an account or using the app or the website you agree to these terms. If you do not agree, do not use the service.',
  },
  {
    title: 'Your account',
    body: 'You need to be at least 13 years old. Keep your password private. What happens under your account is your responsibility, so tell us if you think someone else got into it.',
  },
  {
    title: 'Your content',
    body: 'Your tasks, events, notes and photos belong to you. You give us permission to store them, back them up, and move them between your devices, because that is what makes the app work. We never sell your content and we never use it for advertising.',
  },
  {
    title: 'What you agree not to do',
    body: 'Do not use the service to store anything illegal. Do not try to break into other accounts or into our systems. Do not overload the service on purpose or resell it as your own.',
  },
  {
    title: 'The service can change',
    body: 'Multitask is free and run by a small team. Features may change or be removed, and the service may be down sometimes. We try to keep your data safe and backed up, but you should keep your own copy of anything you truly cannot lose.',
  },
  {
    title: 'No warranty',
    body: 'The service is provided as is and as available, without any warranty of any kind. We do not promise that it will always be available, error free, or fit for a particular purpose.',
  },
  {
    title: 'Limit of liability',
    body: 'To the fullest extent the law allows, we are not liable for indirect, incidental, or consequential damages, or for lost data, lost profits, or missed deadlines that result from using or not being able to use the service. The service is free, and our total liability for any claim is limited to the amount you paid us, which is zero.',
  },
  {
    title: 'Ending the service or an account',
    body: 'You can delete your account at any time in Settings, which permanently removes your data. We may suspend or close accounts that break these terms. We may also shut the service down, and if that ever happens we will give reasonable notice so you can export what you need.',
  },
  {
    title: 'App stores',
    body: 'If you got the app through the Apple App Store, Apple’s standard licensed application terms also apply. Apple is not responsible for the app or for support.',
  },
  {
    title: 'Changes and contact',
    body: `If these terms change in a meaningful way, the date above changes and we will note it in the app. These terms are governed by the laws of British Columbia, Canada. Questions go to ${CONTACT}.`,
  },
];

export default function TermsScreen() {
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

        <Text style={[type.display, { color: colors.textPrimary }]}>Terms of service</Text>
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

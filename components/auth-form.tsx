// Shared UI for the auth screens (sign-in / sign-up) — the design pass that
// replaces the bare placeholders. The visual concept: the form sits on a card
// with the same anatomy as a task card (left accent bar, elevated surface,
// radius.card), and the wordmark is dated with the same JetBrains Mono line
// cards use for due dates — the screen introduces the app's own visual
// language before you're even signed in. Specs: docs/design/02 (buttons,
// forms) and 03 (tokens). All values flow through lib/theme tokens (rule:
// style-pack seam).
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { monoFont, radius, space, type } from '@/lib/theme/tokens';
import { useTheme } from '@/lib/theme/use-theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Wed, Jul 16" — the due-date idiom from task cards, used as the wordmark's dateline. */
function todayLine(now: Date = new Date()): string {
  return `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
}

/** Screen shell: centered column, wordmark with mono dateline, the form card. */
export function AuthScreen({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={[
          styles.themeToggle,
          { top: insets.top + space.s4, right: space.s5 },
        ]}>
        <ThemeToggleButton />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <View style={styles.wordmarkBlock}>
            <Text style={[styles.wordmark, { color: colors.textPrimary }]} maxFontSizeMultiplier={1.4}>
              Multitask
            </Text>
            <Text
              style={[styles.dateline, { color: colors.textTertiary }]}
              maxFontSizeMultiplier={1.4}>
              {todayLine()}
            </Text>
          </View>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle },
            ]}>
            <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
              {children}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string | null;
  secure?: boolean;
  autoComplete?: 'email' | 'current-password' | 'new-password';
  keyboardType?: 'email-address' | 'default';
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'go';
};

/** Labeled input per docs/design/02 Forms: visible label, focus = accent border,
 *  error = overdue border + caption below. Secure fields get a show/hide eye. */
export function AuthField({
  label,
  value,
  onChangeText,
  error,
  secure = false,
  autoComplete,
  keyboardType = 'default',
  onSubmitEditing,
  returnKeyType,
}: FieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error
    ? colors.statusOverdueAccent
    : focused
      ? colors.accent
      : colors.borderSubtle;

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View>
        <TextInput
          style={[
            styles.input,
            secure && styles.inputWithTrailing,
            {
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderColor,
            },
            // Spec focus state (02-forms): accent border + 2px inner glow.
            // The native web outline is suppressed because this ring replaces
            // it — never remove one without the other.
            focused && !error && { boxShadow: `inset 0 0 0 2px ${colors.accentMuted}` },
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secure && !revealed}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          accessibilityLabel={label}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />
        {secure && (
          <Pressable
            style={styles.eyeButton}
            onPress={() => setRevealed((r) => !r)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}>
            <IconSymbol
              name={revealed ? 'eye.slash' : 'eye'}
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text
          style={[styles.fieldError, { color: colors.statusOverdueAccent }]}
          accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Primary button per docs/design/02: accent fill, 44pt, pressed scale 0.97,
 *  loading replaces the label with a same-size spinner. Never disabled for
 *  validation (pressing surfaces the field errors); only inert while loading. */
export function AuthButton({
  label,
  onPress,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.accent },
        pressed && !loading && styles.buttonPressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.textOnAccent} />
      ) : (
        <Text style={[styles.buttonLabel, { color: colors.textOnAccent }]}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Form-level server message: overdue-red for errors, ongoing-green for
 *  notices (e.g. "confirm your email"), with the matching status icon. */
export function AuthMessage({ kind, text }: { kind: 'error' | 'notice'; text: string }) {
  const { colors } = useTheme();
  const color = kind === 'error' ? colors.statusOverdueAccent : colors.statusOngoingAccent;
  return (
    <View style={styles.message} accessibilityLiveRegion="polite">
      <IconSymbol
        name={kind === 'error' ? 'exclamationmark.triangle.fill' : 'checkmark'}
        size={14}
        color={color}
      />
      <Text style={[styles.messageText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  themeToggle: { position: 'absolute', zIndex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.s10 },
  column: { width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: space.s5 },
  wordmarkBlock: { marginBottom: space.s5, paddingLeft: space.s1 },
  wordmark: { ...type.display },
  dateline: {
    fontFamily: monoFont,
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    marginTop: space.s1,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardBody: { padding: space.s6, paddingLeft: space.s6 + 4, gap: space.s4 },
  cardTitle: { ...type.h2, marginBottom: space.s1 },
  fieldBlock: { gap: space.s1 },
  fieldLabel: { ...type.caption },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: space.s3,
    paddingVertical: space.s2,
    fontSize: type.body.fontSize,
  },
  inputWithTrailing: { paddingRight: space.s10 },
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldError: { ...type.caption },
  button: {
    minHeight: 44,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s4,
    paddingVertical: space.s2,
    marginTop: space.s1,
  },
  buttonPressed: { transform: [{ scale: 0.97 }] },
  buttonLabel: { fontSize: type.body.fontSize, fontWeight: '600' },
  message: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  messageText: { ...type.caption, flex: 1 },
});

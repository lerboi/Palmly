import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppHeader, Button, Icon, Screen, Text } from '@/components/ui';
import { useTheme, useReducedMotion } from '@/theme';
import { type ChatMessage, citationLabel } from './chat';

export interface ChatThreadProps {
  premium: boolean;
  messages: ChatMessage[];
  chips: string[];
  /** Assistant is composing a reply — shows the typing indicator (device SSE stream). */
  typing?: boolean;
  onBack?: () => void;
}

/**
 * Premium chat thread (UIUX §2.11, redesign R19) — grounded on the user's own reading. Assistant
 * answers cite which of their lines they draw on (grounding made visible), and the suggestion
 * chips are follow-ups from their features (never generic, never already-asked). Non-premium sees
 * the unlock gate. English-first, no CJK. The SSE stream is device-gated; here it's the thread +
 * a typing indicator + chips.
 */
export function ChatThread({ premium, messages, chips, typing = false, onBack }: ChatThreadProps) {
  const theme = useTheme();
  const router = useRouter();
  const back = onBack ?? (() => router.back());
  const empty = messages.length === 0;

  if (!premium) {
    return (
      <Screen>
        <AppHeader onBack={back} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
          <IconTile icon="chat" />
          <Text variant="title" style={{ textAlign: 'center' }}>
            Ask about your reading
          </Text>
          <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
            Chat with a reader grounded in your own lines — a Premium feature.
          </Text>
          <Button label="Unlock chat" variant="primary" onPress={() => router.push('/paywall')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm }}>
        <AppHeader title="Ask about your reading" onBack={back} />
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, padding: theme.spacing.lg, gap: theme.spacing.md }}
        >
          {/* A flex spacer bottom-aligns a short conversation near the input (chat-standard);
              it collapses to 0 once the thread overflows and scrolls. */}
          {empty ? null : <View style={{ flex: 1 }} />}
          {empty ? (
            <ChatEmptyState />
          ) : (
            messages.map((m) => <Bubble key={m.id} message={m} />)
          )}
          {typing ? <TypingBubble /> : null}
        </ScrollView>

        {/* suggestion chips — follow-ups grounded in their features */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: theme.spacing.sm }}
        >
          {chips.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              style={{
                backgroundColor: theme.colors.accentMuted,
                borderRadius: theme.radii.pill,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              }}
            >
              <Text variant="small" color={theme.colors.accent}>
                {c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* input bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.lg, borderTopWidth: theme.strokes.hairline, borderTopColor: theme.colors.border }}>
          <TextInput
            placeholder="Ask about your lines…"
            placeholderTextColor={theme.colors.textTertiary}
            style={{
              flex: 1,
              fontFamily: theme.fonts.body,
              fontSize: 16,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surfaceSunken,
              borderRadius: theme.radii.lg,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="send" size={22} color={theme.colors.onAccent} decorative />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function IconTile({ icon }: { icon: 'chat' }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 88,
        height: 88,
        borderRadius: theme.radii.xl,
        backgroundColor: theme.colors.accentMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={40} color={theme.colors.accent} decorative />
    </View>
  );
}

function ChatEmptyState() {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xxl, gap: theme.spacing.md }}>
      <IconTile icon="chat" />
      <Text variant="title" style={{ textAlign: 'center' }}>
        Ask anything about your reading
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
        Every answer is grounded in your own lines. Try a suggestion below to begin.
      </Text>
    </View>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  return (
    <View style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
      <View
        style={[
          {
            backgroundColor: isUser ? theme.colors.accent : theme.colors.surfaceRaised,
            borderWidth: isUser ? 0 : theme.strokes.hairline,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.lg,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          },
          isUser ? null : theme.shadow.sm,
        ]}
      >
        <Text variant="body" color={isUser ? theme.colors.onAccent : theme.colors.textPrimary}>
          {message.text}
        </Text>
      </View>
      {message.citations && message.citations.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs, marginLeft: theme.spacing.xs }}>
          <Icon name="shield" size={13} color={theme.colors.success} decorative />
          <Text variant="caption" tone="success">
            {citationLabel(message.citations)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** The assistant "typing" indicator — three pulsing dots (native; reduce-motion / web → static). */
function TypingBubble() {
  const theme = useTheme();
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <View
        style={[
          {
            flexDirection: 'row',
            gap: 6,
            backgroundColor: theme.colors.surfaceRaised,
            borderWidth: theme.strokes.hairline,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.lg,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
          },
          theme.shadow.sm,
        ]}
        accessibilityLabel="Palmly is typing"
      >
        {[0, 1, 2].map((i) => (
          <TypingDot key={i} index={i} />
        ))}
      </View>
    </View>
  );
}

function TypingDot({ index }: { index: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion && Platform.OS !== 'web';
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    if (animate) {
      opacity.value = withDelay(
        index * 180,
        withRepeat(withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }), -1, true),
      );
    } else {
      opacity.value = [0.9, 0.6, 0.4][index] ?? 0.5;
    }
  }, [animate, index, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.textTertiary }, style]}
    />
  );
}

import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppHeader, Button, Icon, Logomark, Screen, Text } from '@/components/ui';
import { controlHeight, useReducedMotion, useTheme } from '@/theme';
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
 * Premium chat thread (UIUX §2.11, redesign R19 / v2 V18) — grounded on the user's own reading, with
 * a **grounded identity**: a Logomark avatar on the assistant's tailed bubbles and a **palm** citation
 * (their lines, in accent — not a generic green "verified" shield). Bubbles stagger in, typing
 * crossfades to the answer, and the chips / send / input have micro-interactions. Non-premium sees the
 * unlock gate. English-first, no CJK. The SSE stream is device-gated; here it's the thread + typing.
 */
export function ChatThread({ premium, messages, chips, typing = false, onBack }: ChatThreadProps) {
  const theme = useTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const back = onBack ?? (() => router.back());
  const empty = messages.length === 0;

  if (!premium) {
    return (
      <Screen>
        <AppHeader onBack={back} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
          <IconTile />
          <Text variant="title" style={{ textAlign: 'center' }}>
            Ask about your reading
          </Text>
          <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
            Chat with a reader grounded in your own lines — a Premium feature.
          </Text>
          <Button label="Unlock chat" variant="primary" onPress={() => router.push('/paywall?trigger=chat_entry' as Href)} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm }}>
          <AppHeader title="Ask about your reading" onBack={back} showDivider />
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
              messages.map((m, i) => <Bubble key={m.id} message={m} index={i} shouldAnimate={shouldAnimate} />)
            )}
            {typing ? <TypingBubble shouldAnimate={shouldAnimate} /> : null}
          </ScrollView>

          {/* suggestion chips — follow-ups grounded in their features; the right edge fades so the
              last chip peeks (never hard-clips). */}
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center', paddingLeft: theme.spacing.lg, paddingRight: theme.spacing.xxl, gap: theme.spacing.sm, paddingBottom: theme.spacing.sm }}
            >
              {chips.map((c, i) => (
                <Chip key={c} label={c} index={i} shouldAnimate={shouldAnimate} />
              ))}
            </ScrollView>
            <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, height: 44, width: theme.spacing.xxl }}>
              <Svg width={theme.spacing.xxl} height={44}>
                <Defs>
                  <LinearGradient id="chipFade" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={theme.colors.background} stopOpacity={0} />
                    <Stop offset="1" stopColor={theme.colors.background} stopOpacity={1} />
                  </LinearGradient>
                </Defs>
                <Rect width={theme.spacing.xxl} height={44} fill="url(#chipFade)" />
              </Svg>
            </View>
          </View>

          {/* input bar */}
          <InputBar />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Shared reduce-motion-aware press-scale. */
function usePressScale(min = 0.94) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const [held, setHeld] = useState(false);
  const scale = useSharedValue(1);
  const press = theme.motion.spring.press;
  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(held ? min : 1, press);
  }, [held, shouldAnimate, scale, press, min]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { style, onPressIn: () => setHeld(true), onPressOut: () => setHeld(false) };
}

function IconTile() {
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
      <Icon name="chat" size={40} color={theme.colors.accent} decorative />
    </View>
  );
}

/** Empty state — grounded in the Palmly mark (distinct from the non-premium chat-icon gate). */
function ChatEmptyState() {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xxl, gap: theme.spacing.md }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: theme.colors.surfaceRaised,
          borderWidth: theme.strokes.hairline,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Logomark size={48} tone="ink" />
      </View>
      <Text variant="title" style={{ textAlign: 'center' }}>
        Ask anything about your reading
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
        Every answer is grounded in your own lines. Try a suggestion below to begin.
      </Text>
    </View>
  );
}

function Bubble({ message, index, shouldAnimate }: { message: ChatMessage; index: number; shouldAnimate: boolean }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const entering = shouldAnimate
    ? FadeInDown.delay(index * theme.motion.stagger.list).duration(theme.motion.duration.base)
    : undefined;

  const bubble = (
    <View
      style={[
        {
          backgroundColor: isUser ? theme.colors.accent : theme.colors.surfaceRaised,
          borderWidth: isUser ? 0 : theme.strokes.hairline,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
          // Speaker tail — the bottom corner nearest the speaker is squared off.
          borderBottomRightRadius: isUser ? theme.radii.sm : theme.radii.lg,
          borderBottomLeftRadius: isUser ? theme.radii.lg : theme.radii.sm,
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
  );

  if (isUser) {
    return (
      <Animated.View entering={entering} style={{ alignSelf: 'flex-end', maxWidth: '86%' }}>
        {bubble}
      </Animated.View>
    );
  }

  // Assistant: a Logomark avatar + a tailed bubble + a palm citation of their lines.
  return (
    <Animated.View style={{ alignSelf: 'flex-start', maxWidth: '92%', flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' }}>
      <Animated.View entering={entering}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.colors.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Logomark size={20} tone="accent" accessibilityLabel="Palmly" />
        </View>
      </Animated.View>
      <Animated.View entering={entering} style={{ flexShrink: 1 }}>
        {bubble}
        {message.citations && message.citations.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs, marginLeft: theme.spacing.xs }}>
            <Icon name="palm" size={13} color={theme.colors.accent} decorative />
            <Text variant="caption" color={theme.colors.accent}>
              {citationLabel(message.citations)}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

/** The assistant "typing" indicator — a Logomark avatar + three pulsing dots; crossfades to the
 *  answer when it lands (native; reduce-motion / web → static). */
function TypingBubble({ shouldAnimate }: { shouldAnimate: boolean }) {
  const theme = useTheme();
  return (
    <Animated.View
      exiting={shouldAnimate ? FadeOut.duration(theme.motion.duration.fast) : undefined}
      entering={shouldAnimate ? FadeIn : undefined}
      style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: theme.colors.accentMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Logomark size={20} tone="accent" accessibilityLabel="" />
      </View>
      <View
        style={[
          {
            flexDirection: 'row',
            gap: 6,
            backgroundColor: theme.colors.surfaceRaised,
            borderWidth: theme.strokes.hairline,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.lg,
            borderBottomLeftRadius: theme.radii.sm,
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
    </Animated.View>
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

/** A suggestion chip — press-spring + a staggered entrance + a spoken label. */
function Chip({ label, index, shouldAnimate }: { label: string; index: number; shouldAnimate: boolean }) {
  const theme = useTheme();
  const { style, onPressIn, onPressOut } = usePressScale(0.95);
  const entering = shouldAnimate
    ? FadeInDown.delay(index * theme.motion.stagger.list).duration(theme.motion.duration.base)
    : undefined;
  return (
    <Animated.View entering={entering} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          backgroundColor: theme.colors.accentMuted,
          borderRadius: theme.radii.pill,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <Text variant="small" color={theme.colors.accent}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** The input bar — a focus transition on the field + a press-spring send button. */
function InputBar() {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const send = usePressScale(0.9);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.lg,
        borderTopWidth: theme.strokes.hairline,
        borderTopColor: theme.colors.border,
      }}
    >
      <TextInput
        placeholder="Ask about your lines…"
        placeholderTextColor={theme.colors.textTertiary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          fontFamily: theme.fonts.body,
          fontSize: theme.typography.body.fontSize,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radii.lg,
          borderWidth: theme.strokes.hairline,
          borderColor: focused ? theme.colors.accent : 'transparent',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
        }}
      />
      <Animated.View style={send.style}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          onPressIn={send.onPressIn}
          onPressOut={send.onPressOut}
          style={{
            width: controlHeight.md,
            height: controlHeight.md,
            borderRadius: controlHeight.md / 2,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="send" size={22} color={theme.colors.onAccent} decorative />
        </Pressable>
      </Animated.View>
    </View>
  );
}

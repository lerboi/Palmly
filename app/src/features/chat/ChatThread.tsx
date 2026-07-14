import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen, SealBadge, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { type ChatMessage, citationLabel } from './chat';

export interface ChatThreadProps {
  premium: boolean;
  messages: ChatMessage[];
  chips: string[];
}

/**
 * Premium chat thread (UIUX §2.11, P9.T6) — grounded on the user's own reading. Assistant answers
 * cite which of their lines they draw on (grounding made visible), and the suggestion chips are
 * generated from their features (never generic). Non-premium sees the unlock gate. The SSE streaming
 * transport + live grounding/deflection are device-gated; this is the thread screen + chips.
 */
export function ChatThread({ premium, messages, chips }: ChatThreadProps) {
  const theme = useTheme();
  const router = useRouter();

  if (!premium) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
          <SealBadge glyph="问" size={64} />
          <Text variant="title" style={{ textAlign: 'center' }}>
            Ask about your reading
          </Text>
          <Text variant="body" tone="secondary" style={{ textAlign: 'center' }}>
            Chat with a reader grounded in your own lines — a premium feature.
          </Text>
          <Button label="Unlock chat" onPress={() => router.push('/paywall')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
        </ScrollView>

        {/* suggestion chips grounded in their features */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: theme.spacing.sm }}>
          {chips.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              style={{ borderWidth: theme.strokes.hairline, borderColor: theme.colors.accent, borderRadius: theme.radii.pill, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm }}
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
            placeholderTextColor={theme.colors.textSecondary}
            style={{
              flex: 1,
              fontFamily: theme.fonts.body,
              fontSize: 16,
              color: theme.colors.text,
              borderWidth: theme.strokes.hairline,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text color={theme.colors.onAccent}>↑</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  return (
    <View style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
      <View
        style={{
          backgroundColor: isUser ? theme.colors.accent : theme.colors.surface,
          borderWidth: isUser ? 0 : theme.strokes.hairline,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <Text variant="body" color={isUser ? theme.colors.onAccent : theme.colors.text}>
          {message.text}
        </Text>
      </View>
      {message.citations && message.citations.length > 0 ? (
        <Text variant="caption" tone="secondary" style={{ marginTop: 4, marginLeft: theme.spacing.xs }}>
          {citationLabel(message.citations)}
        </Text>
      ) : null}
    </View>
  );
}

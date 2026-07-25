import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { AppHeader, Button, Icon, Logomark, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { linkOAuth, startPhoneLink, verifyPhoneLink, type LinkProvider } from '@/lib/account';
import { track } from '@/lib/analytics';

/** Which surface opened the sheet — drives the "why" copy (UIUX §2.9: copy always states the why). */
export type AccountReason = 'save' | 'fortune' | 'compat' | 'settings';

export interface AccountSheetProps {
  reason: AccountReason;
  /** Compat-accept is the one place identity is structurally required — no skip, honest note. */
  mandatory?: boolean;
  /** The inviter's name, for the compat "so «Name» knows it's you" framing. */
  inviterName?: string;
  onClose: () => void;
  /** Fired after a successful link (the caller closes / proceeds). */
  onLinked: (provider: LinkProvider) => void;
}

function copyFor(reason: AccountReason, inviterName?: string): { title: string; body: string } {
  switch (reason) {
    case 'compat':
      return {
        title: `So ${inviterName || 'your match'} knows it's you`,
        body: "Your reading is already yours — a free account just puts your name to this match so they can see who they're paired with.",
      };
    case 'fortune':
      return {
        title: 'Save your daily fortune',
        // CP-10: the "streak" promise is dropped — the week strip is device-local (D34), so an
        // account does not carry it anywhere. Promise only what linking actually does.
        body: 'Create a free account so your fortune and readings follow you to any device.',
      };
    case 'settings':
      return {
        title: 'Claim your account',
        body: 'Create a free account so your readings, fortune, and compatibility are never lost.',
      };
    case 'save':
    default:
      return {
        title: 'Keep your reading forever',
        body: "Your reading is already yours — a free account just saves it so it's never lost, even on a new phone.",
      };
  }
}

type Mode = 'choices' | 'phone-entry' | 'otp-entry';

/**
 * Account creation sheet (audit F0.8, UIUX §2.9) — never shown before value. Apple / Google /
 * phone-OTP, with **one field visible at a time** and copy that states the why. Under the hood this
 * is anonymous-identity linking: the reading already belongs to the user, so the sheet never
 * threatens data loss and (except at compat-accept) never blocks back-navigation. An unconfigured
 * provider surfaces a warm line, never a crash (dashboard provider config is a human task).
 */
export function AccountSheet({ reason, mandatory = false, inviterName, onClose, onLinked }: AccountSheetProps) {
  const theme = useTheme();
  const { title, body } = copyFor(reason, inviterName);

  const [mode, setMode] = useState<Mode>('choices');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [warm, setWarm] = useState<string | null>(null);

  const succeed = (provider: LinkProvider) => {
    track('account_linked', { provider });
    onLinked(provider);
  };

  const onOAuth = async (provider: 'apple' | 'google') => {
    setWarm(null);
    setBusy(true);
    const res = await linkOAuth(provider);
    setBusy(false);
    if (res.ok) succeed(provider);
    else setWarm(res.warm);
  };

  const onSendCode = async () => {
    setWarm(null);
    setBusy(true);
    const res = await startPhoneLink(phone.trim());
    setBusy(false);
    if (res.ok) setMode('otp-entry');
    else setWarm(res.warm);
  };

  const onVerify = async () => {
    setWarm(null);
    setBusy(true);
    const res = await verifyPhoneLink(phone.trim(), otp.trim());
    setBusy(false);
    if (res.ok) succeed('phone');
    else setWarm(res.warm);
  };

  const fieldStyle = {
    fontFamily: theme.fonts.body,
    fontSize: theme.typography.bodyLarge.fontSize,
    textAlign: 'center' as const,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius: theme.radii.lg,
    borderWidth: theme.strokes.hairline,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  };
  // A centred field with `letterSpacing` renders a trailing space after the LAST character, so the
  // text sits half a letter-space right of centre (Audit-4 CO-15). Pad the left by the same amount.
  const OTP_TRACKING = 6;
  const otpStyle = { ...fieldStyle, letterSpacing: OTP_TRACKING, paddingLeft: theme.spacing.md + OTP_TRACKING };

  return (
    <Screen>
      {/* A modal dismisses with a close, never a back arrow (SN-9). Mandatory linking offers no
          dismiss at all — the caller is mid-claim and needs the account to proceed. */}
      {mandatory ? null : <AppHeader onClose={onClose} />}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <Logomark size={56} tone="accent" accessibilityLabel="" />
          <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
            {title}
          </Text>
          <Text
            variant="body"
            tone="secondary"
            style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 320 }}
          >
            {body}
          </Text>
        </View>

        {warm ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              backgroundColor: theme.colors.surfaceSunken,
              borderRadius: theme.radii.lg,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            <Icon name="warning" size={18} color={theme.colors.danger} decorative />
            <Text variant="caption" color={theme.colors.danger} style={{ flex: 1 }}>
              {warm}
            </Text>
          </View>
        ) : null}

        {mode === 'choices' ? (
          <View style={{ gap: theme.spacing.sm }}>
            {/* Three DISTINCT buttons (Audit-4 CO-7): they were an unmarked solid + two identical
                outlines, so the only way to tell Google from phone was to read the label. Each now
                carries its mark and its own treatment. The store-exact Apple/Google fills and the
                official brand assets remain an owner task (D15) — these are house marks. */}
            <Button
              label="Continue with Apple"
              variant="primary"
              fullWidth
              loading={busy}
              icon={<Icon name="apple" size={18} color={theme.colors.onAccent} decorative />}
              onPress={() => void onOAuth('apple')}
            />
            <Button
              label="Continue with Google"
              variant="secondary"
              fullWidth
              disabled={busy}
              icon={<Icon name="google" size={18} color={theme.colors.accentPressed} decorative />}
              onPress={() => void onOAuth('google')}
            />
            <Button
              label="Continue with phone"
              variant="ghost"
              fullWidth
              disabled={busy}
              icon={<Icon name="chat" size={18} color={theme.colors.accentPressed} decorative />}
              onPress={() => { setWarm(null); setMode('phone-entry'); }}
            />
          </View>
        ) : mode === 'phone-entry' ? (
          <View style={{ gap: theme.spacing.sm }}>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 000 1234"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="phone-pad"
              autoComplete="tel"
              accessibilityLabel="Phone number"
              style={fieldStyle}
            />
            <Button label="Send code" variant="primary" fullWidth loading={busy} disabled={phone.trim().length < 6} onPress={() => void onSendCode()} />
            <Button label="Back" variant="ghost" disabled={busy} onPress={() => { setMode('choices'); setWarm(null); }} />
          </View>
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            <TextInput
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ''))}
              placeholder="123456"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              maxLength={6}
              accessibilityLabel="Verification code"
              style={otpStyle}
            />
            <Button label="Verify" variant="primary" fullWidth loading={busy} disabled={otp.length < 6} onPress={() => void onVerify()} />
            <Button label="Back" variant="ghost" disabled={busy} onPress={() => { setMode('phone-entry'); setOtp(''); setWarm(null); }} />
          </View>
        )}
      </View>

      {mandatory ? (
        <Text variant="caption" tone="tertiary" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Needed so {inviterName || 'your match'} knows it’s you.
        </Text>
      ) : (
        <Button label="Not now" variant="ghost" fullWidth style={{ marginBottom: theme.spacing.md }} onPress={onClose} />
      )}
    </Screen>
  );
}

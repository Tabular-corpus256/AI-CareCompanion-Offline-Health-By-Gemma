import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useTheme } from '@theme';
import { AppText, AppButton, AppInput, AppCard } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { AuthService } from '@services/FirebaseService';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  onNavigateLogin: () => void;
}

export function ForgotPasswordScreen({ onNavigateLogin }: Props) {
  const { colors, isDark } = useTheme();
  const { tr } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sent) {
      timerRef.current = setTimeout(onNavigateLogin, 2500);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
    return () => {};
  }, [sent, onNavigateLogin]);

  const handleReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await AuthService.sendPasswordResetEmail(trimmedEmail);
    } catch {
      // Always show success — don't reveal if email exists (security)
    }
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <View style={[s.container, { backgroundColor: isDark ? '#111214' : colors.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor={isDark ? '#111214' : colors.primary} />
        <View style={s.successWrapper}>
          <View style={[s.successIcon, { backgroundColor: 'rgba(0,184,148,0.15)' }]}>
            <AppIcon name="checkmark-circle" size={56} color="#00B894" />
          </View>
          <AppText variant="heading2" style={{ color: '#fff', marginTop: 16 }}>{tr('resetLinkSent')}</AppText>
          <AppText variant="body" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
            {tr('passwordResetSent')}
          </AppText>
          <AppText variant="small" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 24 }}>
            {tr('redirecting')}
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: isDark ? '#111214' : colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDark ? '#111214' : colors.primary} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AppCard variant="elevated" padding="lg" style={{ width: '100%' }}>
            <View style={s.iconWrap}>
              <View style={[s.lockCircle, { backgroundColor: colors.primaryMuted }]}>
                <AppIcon name="lock-closed-outline" size={28} color={colors.primary} />
              </View>
            </View>
            <AppText variant="heading2" align="center" style={{ marginBottom: 4 }}>
              {tr('forgotPassword')}
            </AppText>
            <AppText variant="body" color="secondary" align="center" style={{ marginBottom: 20 }}>
              {tr('resetPassword')}
            </AppText>

            <AppInput
              placeholder={tr('email')}
              value={email}
              onChangeText={v => { setEmail(v); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<AppIcon name="mail-outline" size={18} color={colors.textSecondary} />}
              containerStyle={{ marginBottom: error ? 6 : 16 }}
            />

            {error ? (
              <AppText variant="small" style={{ color: colors.error, marginBottom: 12 }}>
                {error}
              </AppText>
            ) : null}

            <AppButton variant="primary" fullWidth loading={loading} onPress={handleReset} size="lg">
              {tr('sendResetLink')}
            </AppButton>

            <AppButton variant="ghost" fullWidth onPress={onNavigateLogin} size="sm">
              {tr('backToSignIn')}
            </AppButton>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  iconWrap: { alignItems: 'center', marginBottom: 16 },
  lockCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  successWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successIcon: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
});

export default ForgotPasswordScreen;

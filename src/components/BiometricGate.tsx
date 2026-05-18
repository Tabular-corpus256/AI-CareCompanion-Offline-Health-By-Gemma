import React, { useEffect, useState, useCallback } from 'react';
import { View, StatusBar, Platform, Alert } from 'react-native';
import { useTheme } from '@theme';
import { AppText, AppButton } from '@components/ui';
import { AppIcon } from '@components/AppIcon';

let ReactNativeBiometrics: any = null;
try {
  ReactNativeBiometrics = require('react-native-biometrics').default;
} catch {}

interface Props {
  onUnlock: () => void;
}

export function BiometricGate({ onUnlock }: Props) {
  const { colors, isDark } = useTheme();
  const [checking, setChecking] = useState(true);
  const [biometricFailed, setBiometricFailed] = useState(false);

  const attemptBiometric = useCallback(async () => {
    if (!ReactNativeBiometrics) {
      onUnlock(); // No biometric lib → skip
      return;
    }
    try {
      const rnBiometrics = new ReactNativeBiometrics();
      const { available } = await rnBiometrics.isSensorAvailable();
      if (available) {
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: 'Unlock AI Care Companion',
          cancelButtonText: 'Cancel',
        });
        if (success) {
          onUnlock();
          return;
        }
      }
    } catch {}
    // Biometric not available or failed → try device lock or skip
    setBiometricFailed(true);
    setChecking(false);
  }, [onUnlock]);

  useEffect(() => {
    attemptBiometric();
  }, [attemptBiometric]);

  if (checking && !biometricFailed) return null;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#111214' : colors.primary, padding: 32 }}>
      <StatusBar barStyle="light-content" backgroundColor={isDark ? '#111214' : colors.primary} />
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
        <AppIcon name="finger-print" size={36} color="#fff" />
      </View>
      <AppText variant="heading2" style={{ color: '#fff', marginBottom: 8 }}>Biometric Required</AppText>
      <AppText variant="body" style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 }}>
        Use your device fingerprint or face to unlock the app.
      </AppText>
      <AppButton variant="primary" onPress={attemptBiometric} size="lg" style={{ minWidth: 180 }}>
        Try Again
      </AppButton>
      <AppButton variant="ghost" onPress={onUnlock} size="sm" style={{ marginTop: 16 }}>
        Skip (unsecured)
      </AppButton>
    </View>
  );
}

export default BiometricGate;

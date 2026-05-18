import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
  StatusBar,
} from 'react-native';
import LottieView from 'lottie-react-native';

const HEALTH_ANIM = require('../assets/health_pulse.json');
import { useTheme } from '@theme';
import { AppText, AppButton, AppInput, AppCard } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { AuthService } from '@services/FirebaseService';
import { DatabaseService } from '@services/DatabaseService';
import { useI18n } from '../i18n/I18nContext';
import { useAppDialog } from '@components/DialogProvider';

interface Props {
  onAuthSuccess: () => void;
  onNavigateLogin: () => void;
}

export function SignupScreen({ onAuthSuccess, onNavigateLogin }: Props) {
  const { colors, isDark } = useTheme();
  const { tr } = useI18n();
  const { showDialog } = useAppDialog();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  const logoScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (verified) {
      timerRef.current = setTimeout(onAuthSuccess, 1200);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
    return () => {};
  }, [verified, onAuthSuccess]);

  const checkVerification = async () => {
    setVerifying(true);
    const ok = await AuthService.isEmailVerified();
    if (ok) setVerified(true);
    setVerifying(false);
  };

  const handleSignup = async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      showDialog({ title: 'Missing Info', message: 'Please enter your full name.', icon: 'alert-circle', iconColor: colors.warning });
      return;
    }
    if (!trimmedEmail || !password.trim()) {
      showDialog({ title: 'Missing Info', message: 'Please enter your email and password.', icon: 'alert-circle', iconColor: colors.warning });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showDialog({ title: 'Invalid Email', message: 'Please enter a valid email address.', icon: 'alert-circle', iconColor: colors.warning });
      return;
    }
    if (password.length < 6) {
      showDialog({ title: 'Weak Password', message: 'Password must be at least 6 characters.', icon: 'alert-circle', iconColor: colors.warning });
      return;
    }
    if (password !== confirmPassword) {
      showDialog({ title: 'Password Mismatch', message: 'Passwords do not match. Please try again.', icon: 'alert-circle', iconColor: colors.warning });
      return;
    }
    setLoading(true);
    try {
      await AuthService.signUpWithEmail(trimmedEmail, password, trimmedName);
      // Persist the name into user_preferences for the health profile
      try {
        await DatabaseService.execute(
          "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('profile_name', ?)",
          [trimmedName],
        );
      } catch { /* non-fatal */ }
      setSignedUp(true);
    } catch (e: any) {
      showDialog({ title: 'Sign Up Failed', message: e.message || 'Could not create account', icon: 'close-circle', iconColor: colors.error });
    } finally {
      setLoading(false);
    }
  };

  const BG = isDark ? '#111214' : '#0D7C66';

  if (verified) {
    return (
      <View style={[s.container, { backgroundColor: BG }]}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <View style={s.successWrap}>
          <View style={[s.successIcon, { backgroundColor: 'rgba(0,184,148,0.15)' }]}>
            <AppIcon name="checkmark-circle" size={56} color="#00B894" />
          </View>
          <AppText variant="heading2" style={{ color: '#fff', marginTop: 16 }}>{tr('accountCreated')}</AppText>
          <AppText variant="body" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
            {tr('letsSetup')}
          </AppText>
        </View>
      </View>
    );
  }

  if (signedUp) {
    return (
      <View style={[s.container, { backgroundColor: BG }]}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <View style={s.successWrap}>
          <View style={[s.successIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <AppIcon name="mail-outline" size={48} color="#FFFFFF" />
          </View>
          <AppText variant="heading2" style={{ color: '#fff', marginTop: 16 }}>Verify Your Email</AppText>
          <AppText variant="body" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
            We sent a verification link to {email}. Please verify your email to continue.
          </AppText>
          <AppButton variant="primary" onPress={checkVerification} loading={verifying} size="lg" style={{ marginTop: 24, minWidth: 200 }}>
            I've Verified
          </AppButton>
          <AppButton variant="ghost" onPress={() => AuthService.resendVerificationEmail()} size="sm" style={{ marginTop: 8 }}>
            Resend Email
          </AppButton>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
          <Animated.View style={[s.header, { opacity: fadeIn, transform: [{ scale: logoScale }] }]}>
            <LottieView source={HEALTH_ANIM} autoPlay loop style={s.lottie} />
            <AppText variant="heading1" style={{ color: '#FFFFFF', marginTop: 4, textAlign: 'center' }}>AI Care Companion</AppText>
            <AppText variant="body" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' }}>
              {tr('multiAgent')}  ·  {tr('privateSecure')}
            </AppText>
          </Animated.View>

          <Animated.View style={[s.form, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            <AppCard variant="elevated" padding="lg" style={{ width: '100%' }}>
              <AppText variant="heading2" align="center" style={{ marginBottom: 4 }}>{tr('createAccount')}</AppText>
              <AppText variant="caption" color="secondary" align="center" style={{ marginBottom: 20 }}>
                {tr('email')}
              </AppText>

              <AppInput
                placeholder="Full name *"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoCorrect={false}
                leftIcon={<AppIcon name="personOutline" size={18} color={colors.textSecondary} />}
                containerStyle={{ marginBottom: 12 }}
              />
              <AppInput
                placeholder={tr('email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<AppIcon name="mailOutline" size={18} color={colors.textSecondary} />}
                containerStyle={{ marginBottom: 12 }}
              />
              <AppInput
                placeholder={tr('password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon={<AppIcon name="lockClosedOutline" size={18} color={colors.textSecondary} />}
                containerStyle={{ marginBottom: 12 }}
              />
              <AppInput
                placeholder={tr('confirmPin')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                leftIcon={<AppIcon name="lockClosedOutline" size={18} color={colors.textSecondary} />}
                containerStyle={{ marginBottom: 16 }}
              />

              <AppButton variant="primary" fullWidth loading={loading} onPress={handleSignup} size="lg">
                {tr('createAccount')}
              </AppButton>
            </AppCard>

            <AppButton
              variant="outline"
              fullWidth
              onPress={onNavigateLogin}
              size="md"
              style={s.switchBtn}
            >
              {tr('alreadyHaveAccount')}
            </AppButton>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: 'center', marginBottom: 16, width: '100%' },
  lottie: { width: 110, height: 110 },
  form: { width: '100%', alignItems: 'center' },
  switchBtn: { marginTop: 16, borderColor: 'rgba(255,255,255,0.5)' },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successIcon: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
});

export default SignupScreen;

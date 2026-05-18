import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LottieView from 'lottie-react-native';

import { useTheme } from '@theme';
import { AppText, AppButton, AppInput, AppCard } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { AuthService } from '@services/FirebaseService';
import { useI18n } from '../i18n/I18nContext';
import { useAppDialog } from '@components/DialogProvider';

const HEALTH_ANIM = require('../assets/health_pulse.json');

interface Props {
  onAuthSuccess: () => void;
  onNavigateSignup: () => void;
  onNavigateForgot: () => void;
}

export function LoginScreen({ onAuthSuccess, onNavigateSignup, onNavigateForgot }: Props) {
  const { colors, isDark } = useTheme();
  const { tr } = useI18n();
  const { showDialog } = useAppDialog();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      showDialog({ title: 'Missing Info', message: 'Please enter your email and password.', icon: 'alert-circle', iconColor: colors.warning });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showDialog({ title: 'Invalid Email', message: 'Please enter a valid email address.', icon: 'alert-circle', iconColor: colors.warning });
      return;
    }
    setLoading(true);
    try {
      await AuthService.signInWithEmail(trimmedEmail, password);
      onAuthSuccess();
    } catch (e: any) {
      showDialog({ title: 'Sign In Failed', message: e.message || 'Authentication failed', icon: 'close-circle', iconColor: colors.error });
    } finally {
      setLoading(false);
    }
  };

  const BG = isDark ? '#111214' : '#0D7C66';

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={[s.header, { opacity: fadeIn, transform: [{ scale: logoScale }] }]}>
            <LottieView source={HEALTH_ANIM} autoPlay loop style={s.lottie} />
            <AppText variant="heading1" style={{ color: '#FFFFFF', marginTop: 4, textAlign: 'center' }}>AI Care Companion</AppText>
            <AppText variant="body" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' }}>
              {tr('multiAgent')}  ·  {tr('privateSecure')}  ·  {tr('voiceReady')}
            </AppText>
          </Animated.View>

          <Animated.View style={[s.form, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            <AppCard variant="elevated" padding="lg" style={{ width: '100%' }}>
              <AppText variant="heading2" align="center" style={{ marginBottom: 4 }}>{tr('welcomeBack')}</AppText>
              <AppText variant="caption" color="secondary" align="center" style={{ marginBottom: 20 }}>
                {tr('signIn')}
              </AppText>

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
                containerStyle={{ marginBottom: 8 }}
              />

              <TouchableOpacity onPress={onNavigateForgot} style={s.forgotLink}>
                <AppText variant="small" style={{ color: '#0D7C66' }}>{tr('forgotPassword')}</AppText>
              </TouchableOpacity>

              <AppButton variant="primary" fullWidth loading={loading} onPress={handleLogin} size="lg">
                {tr('signIn')}
              </AppButton>
            </AppCard>

            <AppButton
              variant="outline"
              fullWidth
              onPress={onNavigateSignup}
              size="md"
              style={s.switchBtn}
            >
              {tr('dontHaveAccount')}
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
  header: { alignItems: 'center', marginBottom: 24, width: '100%' },
  lottie: { width: 130, height: 130 },
  form: { width: '100%', alignItems: 'center' },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 16, paddingVertical: 4, paddingHorizontal: 4 },
  switchBtn: { marginTop: 16, borderColor: 'rgba(255,255,255,0.5)' },
});

export default LoginScreen;

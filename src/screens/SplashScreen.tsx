import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import LottieView from 'lottie-react-native';
import { useI18n } from '../i18n/I18nContext';

const HEALTH_ANIM = require('../assets/health_pulse.json');

interface Props {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: Props) {
  const { tr } = useI18n();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(titleSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(subOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(fadeAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => {
      if (!finished.current) {
        finished.current = true;
        onFinish();
      }
    });

    const safety = setTimeout(() => {
      if (!finished.current) {
        finished.current = true;
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(onFinish);
      }
    }, 4500);
    return () => clearTimeout(safety);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D7C66" />

      <Animated.View style={[s.lottieWrap, { opacity: logoOpacity }]}>
        <LottieView
          ref={lottieRef}
          source={HEALTH_ANIM}
          autoPlay
          loop
          style={s.lottie}
        />
      </Animated.View>

      <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleSlide }] }}>
        <Text style={s.title}>AI Care Companion</Text>
      </Animated.View>

      <Animated.View style={{ opacity: subOpacity, alignItems: 'center' }}>
        <Text style={s.subtitle}>{tr('expertCare')}</Text>
        <View style={s.tagRow}>
          <View style={s.tag}><Text style={s.tagText}>Multi-Agent AI</Text></View>
          <View style={s.tag}><Text style={s.tagText}>Private & Secure</Text></View>
          <View style={s.tag}><Text style={s.tagText}>Voice Ready</Text></View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D7C66', justifyContent: 'center', alignItems: 'center' },
  lottieWrap: { marginBottom: 24 },
  lottie: { width: 180, height: 180 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8 },
  tagRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  tag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  tagText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
});

export default SplashScreen;

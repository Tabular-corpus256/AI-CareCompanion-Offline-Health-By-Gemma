import React from 'react';
import { Animated, Easing } from 'react-native';

export function createFadeAnimation(
  value: Animated.Value,
  toValue: number,
  _duration = 300,
) {
  return Animated.timing(value, {
    toValue,
    duration: _duration,
    easing: Easing.ease,
    useNativeDriver: true,
  });
}

export function createSlideAnimation(
  value: Animated.Value,
  toValue: number,
  _duration = 300,
) {
  return Animated.timing(value, {
    toValue,
    duration: _duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
}

export function createScaleAnimation(
  value: Animated.Value,
  toValue: number,
  _duration = 200,
) {
  return Animated.spring(value, {
    toValue,
    friction: 8,
    tension: 40,
    useNativeDriver: true,
  });
}

export function createPulseAnimation(value: Animated.Value) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 1.2,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
  );
}

export function useFadeIn(delay = 0) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(12)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity, translateY]);

  return { opacity, translateY };
}

export function useStaggeredFadeIn(itemCount: number, baseDelay = 50) {
  const [animatedValues] = React.useState(() =>
    Array.from({ length: itemCount }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(16),
    })),
  );

  React.useEffect(() => {
    const animations = animatedValues.map((val, i) =>
      Animated.sequence([
        Animated.delay(i * baseDelay),
        Animated.parallel([
          Animated.timing(val.opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(val.translateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    Animated.stagger(60, animations).start();
  }, [animatedValues, baseDelay]);

  return animatedValues;
}

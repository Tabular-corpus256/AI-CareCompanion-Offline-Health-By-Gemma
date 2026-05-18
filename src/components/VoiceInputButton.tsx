import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '@theme';
import { AppIcon } from './AppIcon';
import type { VoiceState } from '@types';

interface Props {
  voiceState?: VoiceState;
  isAvailable?: boolean;
  isListening?: boolean;
  onStart?: () => void;
  onStop?: () => void;
  onCancel?: () => void;
  partialTranscript?: string;
  color?: string;
  activeColor?: string;
  size?: number;
}

export function VoiceInputButton({
  voiceState,
  isAvailable = true,
  isListening: isListeningProp,
  onStart,
  onStop,
  onCancel,
  partialTranscript,
  color,
  activeColor,
  size = 20,
}: Props) {
  const { colors, borderRadius } = useTheme();

  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;

  const isListening = isListeningProp ?? voiceState === 'listening';
  const isProcessing = voiceState === 'processing';

  useEffect(() => {
    if (isListening) {
      const createPulse = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1.8,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        );

      const p1 = createPulse(pulse1, 0);
      const p2 = createPulse(pulse2, 200);
      const p3 = createPulse(pulse3, 400);

      p1.start();
      p2.start();
      p3.start();

      return () => {
        p1.stop();
        p2.stop();
        p3.stop();
        pulse1.setValue(1);
        pulse2.setValue(1);
        pulse3.setValue(1);
      };
    }
  }, [isListening]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAvailable) return null;

  const handlePress = () => {
    if (isListening) {
      onStop?.();
    } else if (isProcessing) {
      onCancel?.();
    } else {
      onStart?.();
    }
  };

  const iconColor = isListening
    ? activeColor || colors.primary
    : color || colors.textTertiary;

  return (
    <View style={styles.container}>
      {isListening && partialTranscript ? (
        <View
          style={[
            styles.transcriptBubble,
            {
              backgroundColor: colors.surfaceVariant,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text
            style={[styles.transcriptText, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {partialTranscript}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.button,
          {
            backgroundColor: isListening
              ? (activeColor || colors.primary) + '18'
              : 'transparent',
            borderRadius: borderRadius.full,
          },
        ]}
      >
        {isListening && (
          <View style={styles.pulseContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: activeColor || colors.primary,
                  transform: [{ scale: pulse1 }],
                  opacity: pulse1.interpolate({
                    inputRange: [1, 1.8],
                    outputRange: [0.5, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: activeColor || colors.primary,
                  transform: [{ scale: pulse2 }],
                  opacity: pulse2.interpolate({
                    inputRange: [1, 1.8],
                    outputRange: [0.4, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: activeColor || colors.primary,
                  transform: [{ scale: pulse3 }],
                  opacity: pulse3.interpolate({
                    inputRange: [1, 1.8],
                    outputRange: [0.3, 0],
                  }),
                },
              ]}
            />
          </View>
        )}

        <AppIcon
          name={isProcessing ? 'refresh' : 'mic'}
          size={size}
          color={iconColor}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  transcriptBubble: {
    position: 'absolute',
    bottom: 48,
    left: -100,
    right: -100,
    padding: 8,
    zIndex: 10,
  },
  transcriptText: { fontSize: 14, textAlign: 'center' },
  button: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  pulseContainer: {
    ...(StyleSheet.absoluteFill as any),
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
  },
});

export default VoiceInputButton;

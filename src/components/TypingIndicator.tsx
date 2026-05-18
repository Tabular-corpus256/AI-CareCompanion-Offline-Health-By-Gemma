import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@theme';
import { getAgentById } from '../data/agents';

interface Props {
  agentId?: string;
  message?: string;
}

export function TypingIndicator({ agentId, message }: Props) {
  const { colors, borderRadius, shadows } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      );

    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 150);
    const a3 = animateDot(dot3, 300);
    a1.start();
    a2.start();
    a3.start();

    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const agent = agentId ? getAgentById(agentId) : null;
  const displayMessage = message || (agent ? `${agent.displayName.split('(')[0].trim()} is thinking...` : 'AI is thinking...');

  return (
    <View style={[styles.container, { paddingHorizontal: 12 }]}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
        <Text style={styles.avatarEmoji}>🩺</Text>
      </View>

      <View style={[styles.bubble, {
        backgroundColor: colors.chatAI,
        borderRadius: borderRadius.lg,
        borderTopLeftRadius: borderRadius.xs,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        ...shadows.sm,
      }]}>
        {/* Bouncing dots */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { backgroundColor: colors.primary, transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.secondary, transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.primary, transform: [{ translateY: dot3 }] }]} />
        </View>

        {/* Status text */}
        <Text style={[styles.statusText, { color: colors.textSecondary }]} numberOfLines={1}>
          {displayMessage}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  bubble: {
    marginLeft: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: '70%',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default TypingIndicator;

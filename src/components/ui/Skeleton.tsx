import React, { useEffect, useRef } from 'react';
import { View, Animated, type ViewStyle } from 'react-native';
import { useTheme } from '@theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius: br,
  style,
}) => {
  const { colors, borderRadius } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-100%', '100%'],
  });

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius: br ?? borderRadius.sm,
          backgroundColor: colors.shimmer,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: '40%',
          height: '100%',
          backgroundColor: 'rgba(255,255,255,0.18)',
          transform: [{ translateX }],
        }}
      />
    </View>
  );
};

interface SkeletonCardProps {
  lines?: number;
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  style,
}) => {
  const { spacing } = useTheme();
  return (
    <View style={[{ gap: spacing.sm }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === 0 ? '60%' : '100%'}
          height={i === 0 ? 18 : 14}
        />
      ))}
    </View>
  );
};

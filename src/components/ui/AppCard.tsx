import React, { useRef } from 'react';
import { View, TouchableOpacity, Animated, type ViewProps } from 'react-native';
import { useTheme } from '@theme';

interface AppCardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  children: React.ReactNode;
}

export const AppCard: React.FC<AppCardProps> = ({
  variant = 'default',
  padding = 'md',
  onPress,
  style,
  children,
  ...rest
}) => {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 6,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const paddingMap = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  };

  const variantMap = {
    default: {
      backgroundColor: colors.surface,
      borderWidth: 0,
      borderColor: 'transparent',
      ...shadows.sm,
    },
    elevated: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 0,
      borderColor: 'transparent',
      ...shadows.md,
    },
    outlined: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    glass: {
      backgroundColor: colors.glassBg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...shadows.glass,
    },
  };

  const content = (
    <View
      style={[
        {
          borderRadius: borderRadius.lg,
          padding: paddingMap[padding],
          overflow: 'hidden',
          ...variantMap[variant],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          {content}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return content;
};

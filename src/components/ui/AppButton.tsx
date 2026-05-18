import React, { useRef } from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  type TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '@theme';
import { AppText } from './AppText';

interface AppButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const AppButton: React.FC<AppButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  disabled,
  children,
  ...rest
}) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const heightMap = { sm: 38, md: 48, lg: 54 };
  const pxMap = { sm: spacing.md, md: spacing.lg, lg: spacing.xl };
  const radiusMap = {
    sm: borderRadius.sm,
    md: borderRadius.md,
    lg: borderRadius.lg,
  };

  const variantStyles = {
    primary: {
      backgroundColor: disabled ? colors.border : colors.primary,
      borderColor: 'transparent',
    },
    secondary: {
      backgroundColor: disabled ? colors.border : colors.secondary,
      borderColor: 'transparent',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: disabled ? colors.border : colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    danger: {
      backgroundColor: disabled ? colors.border : colors.error,
      borderColor: 'transparent',
    },
  };

  const textColorMap = {
    primary: colors.textOnPrimary,
    secondary: colors.textOnSecondary,
    outline: disabled ? colors.textTertiary : colors.primary,
    ghost: disabled ? colors.textTertiary : colors.primary,
    danger: '#FFFFFF',
  };

  const hasIcon = !!leftIcon || !!rightIcon;
  const isFlex = style && (style as any).flex;
  const hasWidth = style && (style as any).width;

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        width: fullWidth ? '100%' : undefined,
        flex: isFlex ? (style as any).flex : undefined,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        disabled={disabled || loading}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: hasIcon ? spacing.sm : 0,
            height: heightMap[size],
            paddingHorizontal: pxMap[size],
            borderRadius: radiusMap[size],
            borderWidth: variant === 'outline' ? 1.5 : 0,
            width: fullWidth ? '100%' : hasWidth ? (style as any).width : undefined,
            alignSelf: (fullWidth || isFlex || hasWidth) ? undefined : 'flex-start',
            opacity: disabled ? 0.5 : 1,
            ...(variant === 'primary' || variant === 'danger'
              ? shadows.sm
              : {}),
          },
          variantStyles[variant],
          style,
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColorMap[variant]} />
        ) : (
          <>
            {leftIcon}
            <AppText
              variant="button"
              style={{
                color: textColorMap[variant],
              }}
            >
              {children}
            </AppText>
            {rightIcon}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

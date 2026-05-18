import React from 'react';
import { Text, type TextStyle, type TextProps } from 'react-native';
import { useTheme } from '@theme';

type TypographyVariant =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'captionMedium'
  | 'small'
  | 'smallMedium'
  | 'button';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'error'
    | 'success'
    | 'warning'
    | 'onPrimary'
    | 'onSecondary';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  weight?: TextStyle['fontWeight'];
  size?: number;
  children: React.ReactNode;
}

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color,
  align,
  weight,
  size,
  style,
  children,
  ...rest
}) => {
  const { colors, typography } = useTheme();
  const t = typography[variant];

  const colorMap: Record<string, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    onPrimary: colors.textOnPrimary,
    onSecondary: colors.textOnSecondary,
  };

  return (
    <Text
      style={[
        {
          fontSize: size ?? t.fontSize,
          fontWeight: weight ?? t.fontWeight,
          lineHeight: t.lineHeight,
          color: color ? colorMap[color] : colors.textPrimary,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

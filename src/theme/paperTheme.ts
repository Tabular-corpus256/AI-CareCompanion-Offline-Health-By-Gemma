import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { Theme } from './ThemeContext';

export function createPaperTheme(theme: Theme) {
  const isDark = theme.isDark;
  const colors = theme.colors;
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      primaryContainer: colors.primaryMuted,
      secondary: colors.secondary,
      secondaryContainer: colors.secondaryMuted,
      surface: colors.surface,
      surfaceVariant: colors.surfaceVariant,
      background: colors.background,
      error: colors.error,
      errorContainer: colors.errorMuted,
      onPrimary: colors.textOnPrimary,
      onSecondary: colors.textOnSecondary,
      onSurface: colors.textPrimary,
      onSurfaceVariant: colors.textSecondary,
      onBackground: colors.textPrimary,
      onError: '#FFFFFF',
      outline: colors.border,
      outlineVariant: colors.borderLight,
      inverseSurface: isDark ? '#ECEAE7' : '#1A1D21',
      inverseOnSurface: isDark ? '#1A1D21' : '#ECEAE7',
      inversePrimary: isDark ? '#2A9D8F' : '#4DB8AC',
      elevation: isDark ? '#242529' : '#FFFFFF',
    },
    roundness: 12,
  } as const;
}

import React from 'react';
import { View, TouchableOpacity, StatusBar, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme';
import { AppText } from './AppText';
import { AppIcon } from '../AppIcon';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  largeTitle?: boolean;
  backgroundColor?: string;
  variant?: 'light' | 'primary';
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  transparent = false,
  largeTitle = false,
  backgroundColor,
  variant = 'primary',
}) => {
  const { colors, borderRadius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const bgColor =
    backgroundColor ??
    (transparent
      ? 'transparent'
      : variant === 'primary'
      ? colors.primary
      : colors.background);
  const isLight = variant === 'light';

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: bgColor,
        ...(isLight ? shadows.sm : {}),
      }}
    >
      <StatusBar
        barStyle={isLight ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      <View style={styles.container}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
              styles.backBtn,
              {
                borderRadius: borderRadius.md,
                backgroundColor: isLight
                  ? colors.primaryMuted
                  : 'rgba(255,255,255,0.12)',
              },
            ]}
            activeOpacity={0.7}
          >
            <AppIcon
              name="arrow-back"
              size={20}
              color={isLight ? colors.primary : '#FFFFFF'}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}

        <View style={styles.titleContainer}>
          <AppText
            variant={largeTitle ? 'heading2' : 'heading3'}
            align="center"
            numberOfLines={1}
            style={[
              styles.title,
              { color: isLight ? colors.textPrimary : '#FFFFFF' },
            ]}
          >
            {title}
          </AppText>
          {subtitle && (
            <AppText
              variant="small"
              align="center"
              style={[
                styles.subtitle,
                {
                  color: isLight
                    ? colors.textSecondary
                    : 'rgba(255,255,255,0.75)',
                },
              ]}
            >
              {subtitle}
            </AppText>
          )}
        </View>

        {rightAction ? (
          <View style={styles.rightContainer}>{rightAction}</View>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
  },
  spacer: { width: 38 },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  rightContainer: {
    width: 38,
    alignItems: 'flex-end',
  },
});

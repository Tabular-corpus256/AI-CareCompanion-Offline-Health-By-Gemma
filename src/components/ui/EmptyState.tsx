import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@theme';
import { AppText } from './AppText';
import { AppIcon } from '../AppIcon';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, action }) => {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl + 16, paddingHorizontal: spacing.lg }}>
      {icon && (
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.primaryMuted,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <AppIcon name={icon} size={36} color={colors.primary} />
        </View>
      )}
      <AppText variant="heading3" align="center" style={{ marginBottom: spacing.sm }}>
        {title}
      </AppText>
      {subtitle && (
        <AppText variant="body" color="secondary" align="center" style={{ marginBottom: spacing.lg, lineHeight: 22 }}>
          {subtitle}
        </AppText>
      )}
      {action}
    </View>
  );
};

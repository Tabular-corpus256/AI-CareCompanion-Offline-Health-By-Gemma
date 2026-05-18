import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@theme';
import { AppText } from './AppText';

interface SectionTitleProps {
  title: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'lg';
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  action,
  icon,
  size = 'sm',
}) => {
  const { spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
        marginBottom: size === 'lg' ? spacing.md : spacing.sm,
        paddingHorizontal: spacing.md,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        {icon}
        <AppText
          variant={size === 'lg' ? 'heading3' : 'captionMedium'}
          color="secondary"
          style={
            size === 'sm'
              ? { textTransform: 'uppercase', letterSpacing: 0.8 }
              : undefined
          }
        >
          {title}
        </AppText>
      </View>
      {action}
    </View>
  );
};

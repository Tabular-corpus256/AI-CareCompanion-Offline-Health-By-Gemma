import React, { useRef } from 'react';
import { TouchableOpacity, Animated, type ViewStyle } from 'react-native';
import { useTheme } from '@theme';
import { AppText } from './AppText';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected,
  onPress,
  icon,
  style,
}) => {
  const { colors, borderRadius, spacing } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.full,
            borderWidth: 1.5,
            borderColor: selected ? colors.primary : colors.borderLight,
            backgroundColor: selected ? colors.primary : colors.background,
          },
          style,
        ]}
      >
        {icon}
        <AppText
          variant="captionMedium"
          style={{
            color: selected ? colors.textOnPrimary : colors.textPrimary,
          }}
        >
          {label}
        </AppText>
      </TouchableOpacity>
    </Animated.View>
  );
};

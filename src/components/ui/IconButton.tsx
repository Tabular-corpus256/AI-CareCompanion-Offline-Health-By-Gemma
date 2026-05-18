import React from 'react';
import { TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { useTheme } from '@theme';
import Icon from 'react-native-vector-icons/Ionicons';

interface IconButtonProps extends TouchableOpacityProps {
  name: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  _badge?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  size = 24,
  color,
  backgroundColor,
  _badge,
  style,
  ...rest
}) => {
  const { colors } = useTheme();
  const iconColor = color || colors.textPrimary;
  const bg = backgroundColor || 'transparent';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        {
          width: size + 16,
          height: size + 16,
          borderRadius: (size + 16) / 2,
          backgroundColor: bg,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
      {...rest}
    >
      <Icon name={name} size={size} color={iconColor} />
    </TouchableOpacity>
  );
};

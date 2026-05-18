import React from 'react';
import {
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@theme';
import { AppText } from './AppText';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
}

export const AppInput = React.forwardRef<TextInput, AppInputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      containerStyle,
      inputContainerStyle,
      style,
      ...rest
    },
    ref,
  ) => {
    const { colors, spacing, borderRadius } = useTheme();
    const [focused, setFocused] = React.useState(false);
    const isMultiline = rest.multiline;

    return (
      <View style={[{ width: '100%' }, containerStyle]}>
        {label && (
          <AppText
            variant="captionMedium"
            color="secondary"
            style={{ marginBottom: spacing.xs }}
          >
            {label}
          </AppText>
        )}
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: isMultiline ? 'flex-start' : 'center',
              backgroundColor: colors.inputBackground,
              borderRadius: borderRadius.md,
              borderWidth: 1.5,
              borderColor: error
                ? colors.error
                : focused
                ? colors.inputFocusBorder
                : colors.inputBorder,
              paddingHorizontal: spacing.md,
              minHeight: isMultiline ? 90 : 52,
              paddingTop: isMultiline ? spacing.sm : 0,
              paddingBottom: isMultiline ? spacing.sm : 0,
            },
            inputContainerStyle,
          ]}
        >
          {leftIcon && (
            <View
              style={{
                marginRight: spacing.sm,
                marginTop: isMultiline ? spacing.xs : 0,
              }}
            >
              {leftIcon}
            </View>
          )}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textTertiary}
            onFocus={e => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={e => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            style={[
              {
                flex: 1,
                fontSize: 16,
                color: colors.textPrimary,
                paddingVertical: 0,
                textAlignVertical: isMultiline ? 'top' : 'center',
              },
              style,
            ]}
            {...rest}
          />
          {rightIcon && (
            <View
              style={{
                marginLeft: spacing.sm,
                marginTop: isMultiline ? spacing.xs : 0,
              }}
            >
              {rightIcon}
            </View>
          )}
        </View>
        {error && (
          <AppText
            variant="small"
            color="error"
            style={{ marginTop: spacing.xs }}
          >
            {error}
          </AppText>
        )}
      </View>
    );
  },
);

AppInput.displayName = 'AppInput';

import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useTheme } from '@theme';
import { AppText, AppButton } from '@components/ui';
import { AppIcon } from '@components/AppIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface DialogButton {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  buttons?: DialogButton[];
  children?: React.ReactNode;
}

const ICON_BG_MAP: Record<string, string> = {
  primary: '#0D7C6615',
  danger: '#E74C3C15',
  success: '#00B89415',
  warning: '#F39C1215',
};

export function AppDialog({
  visible,
  onClose,
  title,
  message,
  icon,
  iconColor,
  buttons = [{ text: 'OK', onPress: onClose, variant: 'primary' }],
  children,
}: Props) {
  const { colors, borderRadius, isDark, shadows } = useTheme();
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.85,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 30,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scale, opacity, translateY]);

  const resolvedIconColor = iconColor || colors.primary;
  const iconBg = iconColor?.includes('#E7') || iconColor?.includes('#E5')
    ? ICON_BG_MAP.danger
    : iconColor?.includes('#00B')
    ? ICON_BG_MAP.success
    : iconColor?.includes('#F39')
    ? ICON_BG_MAP.warning
    : (resolvedIconColor + '12');

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.overlay, { opacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                s.dialog,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: 24,
                  transform: [{ scale }, { translateY }],
                  ...shadows.xl,
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? colors.borderLight : 'transparent',
                },
              ]}
            >
              {/* Decorative gradient strip at top */}
              <View style={[s.topStrip, { backgroundColor: resolvedIconColor }]} />

              {/* Icon */}
              {icon && (
                <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
                  <AppIcon name={icon} size={28} color={resolvedIconColor} />
                </View>
              )}

              {/* Title */}
              <AppText
                variant="heading3"
                align="center"
                style={{
                  marginBottom: message ? 8 : 4,
                  fontWeight: '700',
                  color: colors.textPrimary,
                  letterSpacing: -0.3,
                }}
              >
                {title}
              </AppText>

              {/* Message */}
              {message && (
                <AppText
                  variant="body"
                  color="secondary"
                  align="center"
                  style={{
                    marginBottom: 24,
                    lineHeight: 22,
                    paddingHorizontal: 8,
                  }}
                >
                  {message}
                </AppText>
              )}

              {/* Custom children */}
              {children}

              {/* Buttons */}
              <View style={[s.btnRow, buttons.length > 2 && s.btnCol]}>
                {buttons.map((btn, i) => (
                  <View key={i} style={buttons.length <= 2 ? { flex: 1 } : { width: '100%' }}>
                    <AppButton
                      variant={btn.variant || 'primary'}
                      onPress={btn.onPress}
                      fullWidth
                      size="md"
                    >
                      {btn.text}
                    </AppButton>
                  </View>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function useDialog() {
  const [state, setState] = React.useState<{
    visible: boolean;
    title: string;
    message?: string;
    icon?: string;
    iconColor?: string;
    buttons?: DialogButton[];
  }>({ visible: false, title: '' });

  const show = (opts: Omit<typeof state, 'visible'>) => setState({ ...opts, visible: true });
  const hide = () => setState(s => ({ ...s, visible: false }));

  return { state, show, hide };
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 28,
    paddingBottom: 24,
    paddingTop: 0,
    alignItems: 'center',
  },
  topStrip: {
    width: '120%',
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
    opacity: 0.6,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  btnCol: {
    flexDirection: 'column',
  },
});

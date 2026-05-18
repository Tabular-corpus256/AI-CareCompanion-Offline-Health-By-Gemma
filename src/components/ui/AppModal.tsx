import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@theme';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'bottom' | 'center';
  style?: ViewStyle;
}

export function AppModal({ visible, onClose, children, position = 'bottom', style }: AppModalProps) {
  const { colors, borderRadius, shadows, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const isBottom = position === 'bottom';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>
        
        <Animated.View
          style={[
            styles.modalContent,
            isBottom ? styles.modalBottom : styles.modalCenter,
            {
              backgroundColor: colors.surfaceElevated,
              transform: [{ translateY: slideAnim }],
              ...shadows.xl,
            },
            isBottom && {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: 40,
            },
            !isBottom && {
              borderRadius: 24,
              width: '90%',
              maxWidth: 400,
              borderWidth: isDark ? 1 : 0,
              borderColor: colors.borderLight,
            },
            style
          ]}
        >
          {isBottom && (
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
          )}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  modalBottom: {
    width: '100%',
    alignSelf: 'center',
  },
  modalCenter: {
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@theme';
import { AppText } from './ui/AppText';
import { AppIcon } from './AppIcon';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors, shadows, isDark } = useTheme();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback(({ message, type = 'info', duration = 3000 }: ToastOptions) => {
    setToast({ message, type, duration });
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 50,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  }, [translateY, opacity]);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [translateY, opacity]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      default: return 'information-circle';
    }
  };

  const getColor = (type: ToastType) => {
    switch (type) {
      case 'success': return colors.success || '#00B894';
      case 'error': return colors.error || '#E74C3C';
      case 'warning': return colors.warning || '#F39C12';
      default: return colors.primary;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: getColor(toast.type || 'info'),
              borderLeftWidth: 4,
              transform: [{ translateY }],
              opacity,
              ...shadows.lg,
            },
          ]}
        >
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={hideToast}
            style={styles.toastContent}
          >
            <AppIcon 
              name={getIcon(toast.type || 'info')} 
              size={22} 
              color={getColor(toast.type || 'info')} 
            />
            <AppText 
              variant="bodyMedium" 
              style={{ flex: 1, marginLeft: 10, color: colors.textPrimary, fontWeight: '600' }}
            >
              {toast.message}
            </AppText>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});

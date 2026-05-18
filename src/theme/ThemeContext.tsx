import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  lightColors,
  darkColors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from './colors';
import { loadThemeMode, saveThemeMode } from '@utils/storage';
import type { ThemeMode } from '@types';

interface Theme {
  colors: typeof lightColors | typeof darkColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  shadows: typeof shadows;
  isDark: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('light');
  const [, setInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadThemeMode();
        if (cancelled) return;
        if (saved) {
          setMode(saved);
        } else if (systemScheme === 'light' || systemScheme === 'dark') {
          setMode(systemScheme);
        }
      } catch {
        // Use default light theme if SQLite fails
      }
      if (!cancelled) setInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [systemScheme]);

  const colors = mode === 'dark' ? darkColors : lightColors;
  const isDark = mode === 'dark';

  const toggleTheme = useCallback(() => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      saveThemeMode(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        colors,
        spacing,
        borderRadius,
        typography,
        shadows,
        isDark,
        mode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export type { Theme };
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

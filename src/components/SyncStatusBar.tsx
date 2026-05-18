import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { AppState } from 'react-native';
import { AppText } from './ui';

type Status = 'online' | 'offline' | 'syncing';

function useNetworkStatus(): Status {
  const [status, setStatus] = useState<Status>('online');
  const checkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = async () => {
    try {
      const res = await fetch('https://www.google.com', { method: 'HEAD' });
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 30_000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
      if (checkRef.current) clearTimeout(checkRef.current);
    };
  }, []);

  return status;
}

interface Props {
  /** If true, renders inline (no absolute positioning) */
  inline?: boolean;
}

export function SyncStatusBar({ inline }: Props) {
  const status = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(-40)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === 'offline') {
      setVisible(true);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
    } else if (visible) {
      Animated.timing(slideAnim, { toValue: -40, duration: 300, useNativeDriver: true }).start(() => setVisible(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (!visible) return null;

  const inner = (
    <Animated.View style={[styles.bar, inline ? styles.inline : styles.absolute, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.dot} />
      <AppText variant="small" style={styles.label}>
        You're offline · Changes will sync when reconnected
      </AppText>
    </Animated.View>
  );

  return inner;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3436',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    zIndex: 999,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  inline: {
    borderRadius: 0,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FDCB6E',
  },
  label: {
    color: '#DFE6E9',
    fontWeight: '500',
  },
});

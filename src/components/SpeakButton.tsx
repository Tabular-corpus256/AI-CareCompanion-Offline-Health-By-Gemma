import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { AppIcon } from './AppIcon';

const getTts = () => {
  try {
    const mod = require('react-native-tts');
    return mod?.default || mod;
  } catch {
    return null;
  }
};

interface Props {
  text: string;
  color?: string;
  size?: number;
}

export function SpeakButton({ text, color = '#4A90E2', size = 18 }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const listenersRef = useRef<any[]>([]);

  useEffect(() => {
    return () => {
      const Tts = getTts();
      if (Tts && listenersRef.current?.length) {
        listenersRef.current.forEach(sub => sub?.remove?.());
      }
      if (state === 'playing') Tts?.stop();
    };
  }, [state]);

  const speak = useCallback(() => {
    const Tts = getTts();
    if (!Tts) return;

    if (state === 'playing' || state === 'loading') {
      Tts.stop();
      setState('idle');
      return;
    }

    setState('loading');
    
    // Clear old listeners
    if (listenersRef.current?.length) {
      listenersRef.current.forEach(sub => sub?.remove?.());
      listenersRef.current = [];
    }

    const subStart = Tts.addEventListener('tts-start', () => setState('playing'));
    const subFinish = Tts.addEventListener('tts-finish', () => setState('idle'));
    const subCancel = Tts.addEventListener('tts-cancel', () => setState('idle'));
    const subError = Tts.addEventListener('tts-error', () => setState('idle'));
    
    listenersRef.current = [subStart, subFinish, subCancel, subError];

    Tts.speak(text);
  }, [text, state]);

  if (!text || text.length < 10) return null;

  return (
    <TouchableOpacity
      onPress={speak}
      style={styles.button}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {state === 'loading' ? (
        <ActivityIndicator
          size="small"
          color={color}
          style={{ width: size, height: size }}
        />
      ) : (
        <AppIcon 
          name={state === 'playing' ? "square" : "volume-medium"} 
          size={size} 
          color={color} 
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { padding: 4 },
});

export default SpeakButton;

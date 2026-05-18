import { useState, useCallback, useRef, useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';
import type { VoiceState } from '@types';
import { ensureMicrophonePermission } from '@utils/permissions';
import { useAppDialog } from '@components/DialogProvider';

const loadVoiceModule = (): any | null => {
  if (!NativeModules?.Voice) return null;

  try {
    const mod = require('@react-native-voice/voice');
    return mod?.default || mod;
  } catch {
    try {
      const mod = require('react-native-voice');
      return mod?.default || mod;
    } catch {
      return null;
    }
  }
};

/**
 * Hook for Speech-to-Text input using react-native-voice.
 * Falls back gracefully if the module isn't installed.
 */
export function useVoiceInput() {
  const { showDialog } = useAppDialog();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const voiceRef = useRef<any>(null);

  useEffect(() => {
    const Voice = loadVoiceModule();
    if (!Voice) return;

    voiceRef.current = Voice;

    const onStart = () => {
      setVoiceState('listening');
    };

    const onEnd = () => {
      setVoiceState('processing');
    };

    const onResults = (e: any) => {
      const results = e?.value;
      if (results && results.length > 0) {
        setTranscript(results[0]);
      }
      setVoiceState('idle');
    };

    const onPartialResults = (e: any) => {
      const results = e?.value;
      if (results && results.length > 0) {
        setPartialTranscript(results[0]);
      }
    };

    const onError = (e: any) => {
      console.warn('Voice error:', e);
      setVoiceState('error');
      setTimeout(() => setVoiceState('idle'), 2000);
    };

    Voice.onSpeechStart = onStart;
    Voice.onSpeechEnd = onEnd;
    Voice.onSpeechResults = onResults;
    Voice.onSpeechPartialResults = onPartialResults;
    Voice.onSpeechError = onError;

    return () => {
      try {
        Voice.onSpeechStart = undefined;
        Voice.onSpeechEnd = undefined;
        Voice.onSpeechResults = undefined;
        Voice.onSpeechPartialResults = undefined;
        Voice.onSpeechError = undefined;
        if (Platform.OS !== 'web') {
          Voice.destroy();
        }
      } catch (err) {
        console.warn('Voice cleanup failed:', err);
      }
      voiceRef.current = null;
    };
  }, []);

  const startListening = useCallback(async (locale?: string) => {
    const Voice = voiceRef.current;
    if (!Voice) {
      showDialog({
        title: 'Voice Not Available',
        message: 'Speech recognition is not available on this device. Please type your message instead.',
        icon: 'mic-off',
        iconColor: '#F39C12',
      });
      return;
    }

    try {
      const hasPermission = await ensureMicrophonePermission();
      if (!hasPermission) return;

      setTranscript('');
      setPartialTranscript('');
      setVoiceState('listening');
      await Voice.start(locale || 'en-US');
    } catch (e: any) {
      console.warn('Failed to start voice:', e);
      setVoiceState('error');
      setTimeout(() => setVoiceState('idle'), 2000);
    }
  }, []);

  const stopListening = useCallback(async () => {
    const Voice = voiceRef.current;
    if (!Voice) return;

    try {
      await Voice.stop();
      setVoiceState('processing');
    } catch (err) {
      console.warn('Voice stop failed:', err);
      setVoiceState('idle');
    }
  }, []);

  const cancelListening = useCallback(async () => {
    const Voice = voiceRef.current;
    if (!Voice) return;

    try {
      await Voice.cancel();
    } catch (err) {
      console.warn('Voice cancel failed:', err);
    }
    setVoiceState('idle');
    setTranscript('');
    setPartialTranscript('');
  }, []);

  const isAvailable = voiceRef.current !== null;

  return {
    voiceState,
    transcript,
    partialTranscript,
    isAvailable,
    isListening: voiceState === 'listening',
    startListening,
    stopListening,
    cancelListening,
  };
}

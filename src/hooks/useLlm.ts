import { useState, useCallback, useRef, useEffect } from 'react';
import { LlmService } from '@services/LlmService';

export function useLlm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetLoading = useCallback((v: boolean) => {
    if (mountedRef.current) setIsLoading(v);
  }, []);

  const safeSetError = useCallback((e: string | null) => {
    if (mountedRef.current) setError(e);
  }, []);

  const generate = useCallback(
    async (prompt: string): Promise<string> => {
      safeSetLoading(true);
      safeSetError(null);
      loadingRef.current = true;
      LlmService.resetAbort();

      try {
        const result = await LlmService.generateResponse(prompt);
        safeSetLoading(false);
        loadingRef.current = false;

        if (!result.ok) {
          safeSetError(result.error);
          return `Error: ${result.error}`;
        }
        return result.data;
      } catch (e: any) {
        safeSetLoading(false);
        loadingRef.current = false;
        safeSetError(e.message);
        return `Error: ${e.message}`;
      }
    },
    [safeSetLoading, safeSetError],
  );

  const streamGenerate = useCallback(
    async (
      prompt: string,
      onToken: (text: string) => void,
    ): Promise<string> => {
      safeSetLoading(true);
      safeSetError(null);
      loadingRef.current = true;
      LlmService.resetAbort();

      try {
        const result = await LlmService.streamGenerateResponse(prompt, text => {
          if (mountedRef.current) onToken(text);
        });
        safeSetLoading(false);
        loadingRef.current = false;

        if (!result.ok) {
          safeSetError(result.error);
          return `Error: ${result.error}`;
        }
        return result.data;
      } catch (e: any) {
        safeSetLoading(false);
        loadingRef.current = false;
        safeSetError(e.message);
        return `Error: ${e.message}`;
      }
    },
    [safeSetLoading, safeSetError],
  );

  const chat = useCallback(
    async (
      message: string,
      history: Array<{ role: string; content: string }>,
    ): Promise<string> => {
      safeSetLoading(true);
      safeSetError(null);
      loadingRef.current = true;
      LlmService.resetAbort();

      try {
        const result = await LlmService.chat(message, history);
        safeSetLoading(false);
        loadingRef.current = false;

        if (!result.ok) {
          safeSetError(result.error);
          return `Error: ${result.error}`;
        }
        return result.data;
      } catch (e: any) {
        safeSetLoading(false);
        loadingRef.current = false;
        safeSetError(e.message);
        return `Error: ${e.message}`;
      }
    },
    [safeSetLoading, safeSetError],
  );

  const streamChat = useCallback(
    async (
      message: string,
      history: Array<{ role: string; content: string }>,
      onToken: (text: string) => void,
    ): Promise<string> => {
      safeSetLoading(true);
      safeSetError(null);
      loadingRef.current = true;
      LlmService.resetAbort();

      try {
        const result = await LlmService.streamChat(message, history, text => {
          if (mountedRef.current) onToken(text);
        });
        safeSetLoading(false);
        loadingRef.current = false;

        if (!result.ok) {
          safeSetError(result.error);
          return `Error: ${result.error}`;
        }
        return result.data;
      } catch (e: any) {
        safeSetLoading(false);
        loadingRef.current = false;
        safeSetError(e.message);
        return `Error: ${e.message}`;
      }
    },
    [safeSetLoading, safeSetError],
  );

  const cancel = useCallback(() => {
    if (loadingRef.current) {
      LlmService.abort();
      safeSetLoading(false);
      loadingRef.current = false;
      safeSetError('Generation cancelled');
    }
  }, [safeSetLoading, safeSetError]);

  return {
    generate,
    streamGenerate,
    chat,
    streamChat,
    cancel,
    isLoading,
    error,
  };
}

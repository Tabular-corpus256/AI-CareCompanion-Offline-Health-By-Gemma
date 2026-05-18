import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  Image,
  Animated,
  Easing,
  ScrollView,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '@theme';
import type { AgentMessage } from '@types';
import { AgentService } from '@services/AgentService';
import { DatabaseService } from '@services/DatabaseService';
import { ChatBubble } from '@components/ChatBubble';
import { useVoiceInput } from '@hooks/useVoiceInput';
import { getAgentById } from '../data/agents';
import { getAgentTheme } from '../data/agentThemes';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { LlmService, SUPPORTED_MODELS } from '@services/LlmService';
import { LocalLlmService, LOCAL_MODEL_ID } from '@services/LocalLlmService';
import { ModelManager } from '@services/ModelManager';
import type { ModelInfo } from '@services/ModelManager';
import { AuthService, SyncService } from '@services/FirebaseService';
import { RecommendationService } from '@services/RecommendationService';
import { AppIcon } from '@components/AppIcon';
import { AppText } from '@components/ui';
import { logError } from '@utils/logger';
import { useHealthProfile } from '../context/HealthProfileContext';
import { useI18n } from '../i18n/I18nContext';
import { useAppDialog } from '@components/DialogProvider';

function stripJson(text: string): string {
  if (!text) return text;
  let c = text;
  c = c.replace(/```json[\s\S]*?```/gi, '');
  c = c.replace(/```[\s\S]*?```/g, '');
  c = c.replace(/\{[\s\S]*?"primary_specialist"[\s\S]*?\}/gi, '');
  c = c.replace(/\{[\s\S]*?"primarySpecialist"[\s\S]*?\}/gi, '');
  c = c.replace(/\{\s*"specialty"\s*:\s*"[^"]+"\s*,\s*"reasoning"\s*:\s*"[^"]*"\s*\}/gi, '');
  c = c.replace(/\[\[TOOL:\w+\|[^\]]*\]\]/g, '');
  c = c.replace(/<\|[^>]+\|>/g, '');
  c = c.replace(/\n{3,}/g, '\n\n').trim();
  if (!c || c.length < 3) return text.trim();
  return c;
}

interface AttachedImage {
  uri: string;
  name: string;
  base64: string;
  mimeType: string;
}

interface Props {
  conversationId: string;
  onMenuOpen: () => void;
  initialMessage?: string;
  forcedAgentId?: string;
}

const DEFAULT_PROMPTS = [
  { icon: 'pulse',       title: 'Check symptoms',  sub: 'Describe how you feel',     prompt: 'I have some symptoms I need help with: ' },
  { icon: 'pill',        title: 'Medicine info',   sub: 'Drug interactions & dosage', prompt: 'Tell me about this medication: ' },
  { icon: 'nutrition',   title: 'Diet advice',     sub: 'Nutrition & wellness tips',  prompt: 'Give me personalized diet advice for ' },
  { icon: 'image',       title: 'Upload photo',    sub: 'Skin, X-ray, scan analysis', prompt: '' },
];

export function ChatScreen({ conversationId, onMenuOpen, initialMessage, forcedAgentId }: Props) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getProfileSummary } = useHealthProfile();
  const { tr, lang } = useI18n();
  const { showDialog, hideDialog } = useAppDialog();

  // ── Agent-specific theming ────────────────────────────────────────────────────
  const activeAgentId = forcedAgentId || 'orchestrator';
  const activeAgent = getAgentById(activeAgentId);
  const agentTheme = getAgentTheme(activeAgentId);
  const agentColor = agentTheme.color;
  const SUGGESTED_PROMPTS = forcedAgentId
    ? [
        ...agentTheme.prompts.map(p => ({ icon: 'chatbubble' as string, title: p.title, sub: p.sub, prompt: p.prompt })),
        { icon: 'image', title: 'Upload photo', sub: 'Visual analysis', prompt: '' },
      ]
    : DEFAULT_PROMPTS;

  // ── Model state ──────────────────────────────────────────────────────────────
  const [modelDropdown, setModelDropdown] = useState(false);
  const [currentModelId, setCurrentModelId] = useState(() => LlmService.getCurrentModel() || SUPPORTED_MODELS[0].id);
  const [localModelInfo, setLocalModelInfo] = useState<ModelInfo | null>(
    ModelManager.getOfflineModelInfo(),
  );

  useEffect(() => { LlmService.refreshModelStatus(); }, []);
  useEffect(() => {
    const unsub = ModelManager.onModelsChanged(models => {
      setLocalModelInfo(models.find(m => m.id === LOCAL_MODEL_ID) || null);
    });
    return () => unsub();
  }, []);

  const isLocalModelSelected = currentModelId === LOCAL_MODEL_ID;
  const currentModelInfo = isLocalModelSelected
    ? null
    : SUPPORTED_MODELS.find(m => m.id === currentModelId);
  const currentModelName = isLocalModelSelected
    ? 'Gemma 4 4B (On Device)'
    : currentModelInfo?.name || 'AI Model';

  // ── Messages & input ─────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [activeFollowUpMsgId, setActiveFollowUpMsgId] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  // ── Selection mode ────────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [conversationTitle, setConversationTitle] = useState('');
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const initialScrollDone = useRef(false);

  // ── Thinking animation ───────────────────────────────────────────────────────
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const dotY1 = useRef(new Animated.Value(0)).current;
  const dotY2 = useRef(new Animated.Value(0)).current;
  const dotY3 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [thinkingText, setThinkingText] = useState('');

  useEffect(() => {
    if (!loading) {
      setThinkingText('');
      dot1.setValue(0); dot2.setValue(0); dot3.setValue(0);
      dotY1.setValue(0); dotY2.setValue(0); dotY3.setValue(0);
      pulseAnim.setValue(1);
      return;
    }
    const phrases = ['Analyzing…', 'Consulting specialists…', 'Reviewing symptoms…', 'Preparing response…'];
    let idx = 0;
    setThinkingText(phrases[0]);
    const phraseInterval = setInterval(() => {
      idx = (idx + 1) % phrases.length;
      setThinkingText(phrases[idx]);
    }, 2200);

    // Bounce dot: rises (negative Y) + fades in, then falls back
    const bounceDot = (opacity: Animated.Value, translateY: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -7, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.25, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.in(Easing.bounce), useNativeDriver: true }),
        ]),
        Animated.delay(360),
      ])).start();

    bounceDot(dot1, dotY1, 0);
    bounceDot(dot2, dotY2, 160);
    bounceDot(dot3, dotY3, 320);

    // Pulse the icon ring
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    return () => {
      clearInterval(phraseInterval);
      dot1.stopAnimation(); dot2.stopAnimation(); dot3.stopAnimation();
      dotY1.stopAnimation(); dotY2.stopAnimation(); dotY3.stopAnimation();
      pulseAnim.stopAnimation();
    };
  }, [loading, dot1, dot2, dot3, dotY1, dotY2, dotY3, pulseAnim]);

  // ── Voice input ──────────────────────────────────────────────────────────────
  const { transcript, isListening, startListening } = useVoiceInput();
  useEffect(() => {
    if (transcript) setInput(prev => (prev ? prev + ' ' + transcript : transcript));
  }, [transcript]);

  // ── Load history ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Reset immediately so the spinner shows on every conversation switch
    setHistoryLoaded(false);
    setMessages([]);
    initialScrollDone.current = false;
    // Cancel any active selection when switching conversations
    setSelectionMode(false);
    setSelectedIds(new Set());

    (async () => {
      try {
        // Load conversation title alongside messages
        DatabaseService.query<{ title: string }>(
          'SELECT title FROM conversations WHERE id = ?',
          [conversationId],
        ).then(rows => { if (rows[0]) setConversationTitle(rows[0].title); }).catch(() => {});

        const rows = await DatabaseService.query<any>(
          'SELECT * FROM agent_chat_history WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT 100',
          [conversationId],
        );
        setMessages(rows.map((r: any) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          timestamp: Number(r.timestamp) || Date.now(),
          agentId: r.agent_id || r.agentId,
          agentDisplayName: r.agent_id ? getAgentById(r.agent_id)?.displayName : r.agentDisplayName,
          imageUri: r.image_uri || r.imageUri,
          imageMimeType: r.image_mime_type || r.imageMimeType,
        })));
      } catch (err) {
        logError('ChatScreen.loadHistory', err, { conversationId });
        setMessages([]);
      }
      setHistoryLoaded(true);
    })();
  }, [conversationId]);

  const sendMessageRef = useRef<((text?: string) => void) | undefined>(undefined);
  useEffect(() => {
    if (historyLoaded && messages.length === 0 && initialMessage && sendMessageRef.current) {
      sendMessageRef.current(initialMessage);
    }
  }, [historyLoaded, messages.length, initialMessage]);

  // ── Persist / sync ────────────────────────────────────────────────────────────
  const persistMessage = useCallback(async (id: string, role: string, content: string, agentId: string, imageUri?: string, imageMimeType?: string) => {
    try {
      const userId = DatabaseService.getCurrentUserId();
      const now = Date.now();
      await DatabaseService.execute(
        'INSERT INTO agent_chat_history (id, conversation_id, agent_id, role, content, timestamp, user_id, image_uri, image_mime_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, conversationId, agentId, role, content, now, userId, imageUri || null, imageMimeType || null],
      );
      const preview = content.length > 80 ? content.substring(0, 80) + '…' : content;
      await DatabaseService.execute(
        'UPDATE conversations SET updated_at = ?, message_count = message_count + 1, last_preview = ? WHERE id = ?',
        [now, preview, conversationId],
      );
      if (AuthService.userId) {
        SyncService.pushMessage(id, AuthService.userId, { agentId, role, content, timestamp: now, conversationId });
      }
    } catch (err) {
      logError('ChatScreen.persistMessage', err, { conversationId, agentId, role });
    }
  }, [conversationId]);

  const addMessage = useCallback((
    role: 'user' | 'assistant',
    content: string,
    agentId: string,
    isStreaming?: boolean,
    imageUri?: string,
    imageMimeType?: string,
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const clean = role === 'assistant' ? stripJson(content) : content;
    const agent = getAgentById(agentId);
    const msg: AgentMessage = { id, role, content: clean, timestamp: Date.now(), agentId, agentDisplayName: agent?.displayName, isStreaming, imageUri, imageMimeType };
    setMessages(prev => [...prev, msg]);
    if (!isStreaming) persistMessage(id, role, clean, agentId, imageUri, imageMimeType);
    return msg;
  }, [persistMessage]);

  const updateStreamingMessage = useCallback((msgId: string, content: string) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], content: stripJson(content) };
      return next;
    });
  }, []);

  const finalizeStreamingMessage = useCallback((msgId: string, responseTimeMs: number) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx === -1) return prev;
      const clean = stripJson(prev[idx].content);
      persistMessage(msgId, 'assistant', clean, prev[idx].agentId || 'orchestrator');
      const next = [...prev];
      next[idx] = { ...next[idx], content: clean, isStreaming: false, responseTimeMs };
      return next;
    });
  }, [persistMessage]);

  const getChatHistory = useCallback(() =>
    messages.filter(m => m.role !== 'system').slice(-10).map(m => ({ role: m.role, content: m.content })),
  [messages]);

  // ── Selection handlers ────────────────────────────────────────────────────────
  const enterSelection = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(messages.filter(m => m.role !== 'system').map(m => m.id)));
  }, [messages]);

  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const placeholders = ids.map(() => '?').join(',');
      await DatabaseService.execute(
        `DELETE FROM agent_chat_history WHERE id IN (${placeholders})`,
        ids,
      );
    } catch (e) {
      logError('ChatScreen.deleteSelected', e);
    }
    setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
    cancelSelection();
  }, [selectedIds, cancelSelection]);

  // ── Send ──────────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (textOverride?: string | any) => {
    const textToUse = typeof textOverride === 'string' ? textOverride : input;
    const text = textToUse.trim();
    if ((!text && attachedImages.length === 0) || loading) return;
    const status = LlmService.getModelStatus();
    if (status.state !== 'ready') { showDialog({ title: 'Not Ready', message: status.error || 'AI is loading, please wait a moment.', icon: 'pulse', iconColor: agentColor }); return; }

    const primaryImage = attachedImages[0] || null;
    const imageUri = primaryImage?.uri;
    const imageBase64 = (primaryImage?.base64 || '').replace(/^data:image\/\w+;base64,/, '');
    const imageMimeType = primaryImage?.mimeType || 'image/jpeg';
    const messageText = text || 'Please analyze this image.';

    setInput('');
    setAttachedImages([]);
    setActiveFollowUpMsgId('');
    addMessage('user', messageText, 'orchestrator', undefined, imageUri, imageMimeType);
    setLoading(true);

    // Save chat images to image_analyses history so they appear in Visual AI Analysis
    if (primaryImage?.uri) {
      const userId = DatabaseService.getCurrentUserId();
      DatabaseService.execute(
        `INSERT OR IGNORE INTO image_analyses (id, local_uri, analysis_type, type_label, type_color, user_prompt, ai_response, timestamp, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `chat-${Date.now()}-${Math.random().toString(36).substr(2,6)}`,
          primaryImage.uri, 'chat_image', 'Chat Image', '#0D7C66',
          messageText, '', Date.now(), userId,
        ],
      ).catch(() => {});
    }

    const startTime = Date.now();
    try {
      const history = getChatHistory();
      const streamMsg = addMessage('assistant', '', 'orchestrator', true);
      let accumulatedResponse = '';

      if (isLocalModelSelected) {
        // ── Offline path ────────────────────────────────────────────────────
        const result = await LocalLlmService.streamChat(
          messageText, history,
          token => { accumulatedResponse = token; updateStreamingMessage(streamMsg.id, token); },
        );
        const elapsed = Date.now() - startTime;
        if (!result.ok) {
          updateStreamingMessage(streamMsg.id, `Error: ${result.error}`);
        }
        finalizeStreamingMessage(streamMsg.id, elapsed);
      } else {
        // ── Cloud path ──────────────────────────────────────────────────────
        const healthSummary = getProfileSummary();
        const result = await AgentService.chatWithOrchestrator(
          messageText, history,
          token => { accumulatedResponse = token; updateStreamingMessage(streamMsg.id, token); },
          lang, healthSummary || undefined, imageBase64 || undefined, imageMimeType, forcedAgentId,
        );
        const elapsed = Date.now() - startTime;
        if (!result.ok) {
          updateStreamingMessage(streamMsg.id, `Error: ${result.error}`);
          finalizeStreamingMessage(streamMsg.id, elapsed);
        } else {
          const primaryId = result.data.routing.primarySpecialist;
          setMessages(prev => prev.map(m => {
            if (m.id === streamMsg.id) {
              const agent = getAgentById(primaryId);
              return { ...m, agentId: primaryId, agentDisplayName: agent?.displayName };
            }
            return m;
          }));
          finalizeStreamingMessage(streamMsg.id, elapsed);
          setActiveFollowUpMsgId(streamMsg.id);
          const userId = DatabaseService.getCurrentUserId();
          if (userId && userId !== 'local' && accumulatedResponse.length > 80) {
            RecommendationService.extractAndCache(accumulatedResponse, userId).catch(() => {});
          }
          // Update the ai_response field for any chat image saved earlier
          if (primaryImage?.uri && accumulatedResponse) {
            DatabaseService.execute(
              `UPDATE image_analyses SET ai_response = ? WHERE local_uri = ? AND analysis_type = 'chat_image' AND ai_response = ''`,
              [accumulatedResponse.slice(0, 2000), primaryImage.uri],
            ).catch(() => {});
          }
        }
      }
    } catch (e: any) {
      logError('ChatScreen.sendMessage', e);
      addMessage('assistant', `Error: ${e.message}`, 'orchestrator');
    } finally {
      setLoading(false);
    }
  }, [input, loading, attachedImages, forcedAgentId, isLocalModelSelected, addMessage, updateStreamingMessage, finalizeStreamingMessage, getChatHistory, getProfileSummary]);

  sendMessageRef.current = sendMessage as any;

  // ── Image picking ─────────────────────────────────────────────────────────────

  // Persist base64 image to app-local permanent storage so the URI
  // survives across app sessions (picker URIs are session-scoped on Android/iOS).
  const saveImagePermanently = useCallback(async (base64: string, mimeType: string): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rnfs = require('react-native-fs');
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const dir = `${rnfs.DocumentDirectoryPath}/chat_images`;
    try { await rnfs.mkdir(dir); } catch {}
    const fname = `chat_img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const destPath = `${dir}/${fname}`;
    await rnfs.writeFile(destPath, base64, 'base64');
    return `file://${destPath}`;
  }, []);

  const addImageAssets = useCallback(async (assets: any[]) => {
    const filtered = assets.filter(a => a.base64).slice(0, 3 - attachedImages.length);
    if (filtered.length === 0) {
      showDialog({ title: 'Image Error', message: 'Could not read image data. Please try another image.', icon: 'image', iconColor: colors.error });
      return;
    }
    const newImages: AttachedImage[] = await Promise.all(
      filtered.map(async a => {
        const mimeType = a.type || 'image/jpeg';
        const rawBase64 = (a.base64 as string).replace(/^data:image\/\w+;base64,/, '');
        let permanentUri: string;
        try {
          permanentUri = await saveImagePermanently(rawBase64, mimeType);
        } catch {
          // Fallback to picker URI if file write fails
          permanentUri = Platform.OS === 'android' && a.uri && !a.uri.startsWith('file://')
            ? `file://${a.uri}`
            : (a.uri || '');
        }
        return { uri: permanentUri, name: a.fileName || `photo_${Date.now()}.jpg`, base64: rawBase64, mimeType };
      }),
    );
    setAttachedImages(prev => [...prev, ...newImages].slice(0, 3));
  }, [attachedImages.length, saveImagePermanently]);

  const pickFromGallery = useCallback(async () => {
    if (attachedImages.length >= 3) { showDialog({ title: 'Limit Reached', message: 'You can attach up to 3 images per message.', icon: 'image', iconColor: colors.warning }); return; }
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.5, maxWidth: 1024, maxHeight: 1024, includeBase64: true, selectionLimit: 3 - attachedImages.length });
      if (result.didCancel || !result.assets?.length) return;
      await addImageAssets(result.assets);
    } catch { showDialog({ title: 'Error', message: 'Could not open image picker.', icon: 'image', iconColor: colors.error }); }
  }, [attachedImages.length, addImageAssets]);

  const pickFromCamera = useCallback(async () => {
    if (attachedImages.length >= 3) { showDialog({ title: 'Limit Reached', message: 'You can attach up to 3 images per message.', icon: 'image', iconColor: colors.warning }); return; }
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) { showDialog({ title: 'Permission Denied', message: 'Camera access is required to take photos.', icon: 'camera', iconColor: colors.error }); return; }
      }
      const result = await launchCamera({ mediaType: 'photo', quality: 0.5, maxWidth: 1024, maxHeight: 1024, includeBase64: true });
      if (result.didCancel || !result.assets?.length) return;
      await addImageAssets(result.assets);
    } catch { showDialog({ title: 'Error', message: 'Could not open camera.', icon: 'camera', iconColor: colors.error }); }
  }, [attachedImages.length, addImageAssets]);

  // ── Prompt animations ─────────────────────────────────────────────────────────
  const promptAnimCount = Math.max(DEFAULT_PROMPTS.length, 4);
  const promptAnims = useRef(Array.from({ length: promptAnimCount }, () => ({ opacity: new Animated.Value(0), translateY: new Animated.Value(20) }))).current;
  const isEmpty = messages.length === 0 && attachedImages.length === 0;

  useEffect(() => {
    if (isEmpty) {
      promptAnims.forEach((anim, i) => {
        Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 1, duration: 400, delay: i * 80, useNativeDriver: true }),
          Animated.timing(anim.translateY, { toValue: 0, duration: 400, delay: i * 80, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [isEmpty, promptAnims]);

  const renderMessage = useCallback(({ item }: { item: AgentMessage }) => (
    <ChatBubble
      message={item}
      onSuggestionTap={sendMessage}
      showSuggestions={item.id === activeFollowUpMsgId}
      onImagePress={() => setPreviewImageUri(item.imageUri || null)}
      selectionMode={selectionMode}
      isSelected={selectedIds.has(item.id)}
      onSelect={() => toggleSelected(item.id)}
      onLongPressSelect={() => enterSelection(item.id)}
    />
  ), [sendMessage, activeFollowUpMsgId, selectionMode, selectedIds, toggleSelected, enterSelection]);

  const isThinking = loading && (!messages.some(m => m.isStreaming) || messages.some(m => m.isStreaming && !m.content));

  if (!historyLoaded) {
    return <HistoryLoader colors={colors} agentColor={agentColor} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onMenuOpen} style={s.headerBtn}>
          <AppIcon name="menu" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Agent identity badge (when forced) */}
        {forcedAgentId && activeAgent ? (
          <View style={[s.modelBtn, { backgroundColor: agentColor + '12', borderColor: agentColor + '30' }]}>
            <AppText style={{ fontSize: 16, marginRight: 2 }}>{agentTheme.emoji}</AppText>
            <AppText variant="smallMedium" style={{ color: agentColor, fontWeight: '700', flex: 1 }} numberOfLines={1}>
              {activeAgent.displayName}
            </AppText>
            <View style={[s.modelOnlineDot, { backgroundColor: agentColor }]} />
          </View>
        ) : (
          /* Model picker button */
          <TouchableOpacity
            onPress={() => setModelDropdown(v => !v)}
            activeOpacity={0.75}
            style={[s.modelBtn, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]}
          >
            <View style={[s.modelOnlineDot, { backgroundColor: isLocalModelSelected ? colors.primary : '#00B894' }]} />
            <AppText variant="smallMedium" style={{ color: colors.textPrimary, fontWeight: '600', flex: 1 }} numberOfLines={1}>
              {currentModelName}
            </AppText>
            <AppIcon name="chevron-down" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('ChatReports', { conversationId, conversationTitle: conversationTitle || undefined })}
          style={s.headerBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <AppIcon name="document-text" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={s.headerBtn}>
          <AppIcon name="more-vert" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Selection toolbar ───────────────────────────────────────────────── */}
      {selectionMode && (
        <View style={[s.selectionBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={cancelSelection} style={s.selBarBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppIcon name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <AppText style={{ flex: 1, fontWeight: '700', fontSize: 15, color: colors.textPrimary }}>
            {selectedIds.size} selected
          </AppText>
          <TouchableOpacity onPress={selectAll} style={[s.selBarBtn, { backgroundColor: colors.primaryMuted, borderRadius: 10, paddingHorizontal: 12 }]}>
            <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>All</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const count = selectedIds.size;
              showDialog({
                title: `Delete ${count} Message${count > 1 ? 's' : ''}`,
                message: `This will permanently remove ${count === 1 ? 'this message' : `these ${count} messages`} from the conversation. This cannot be undone.`,
                icon: 'trash',
                iconColor: colors.error,
                buttons: [
                  { text: 'Cancel', onPress: hideDialog, variant: 'ghost' },
                  { text: 'Delete', onPress: () => { hideDialog(); deleteSelected(); }, variant: 'danger' },
                ],
              });
            }}
            style={[s.selBarBtn, { backgroundColor: colors.errorMuted ?? '#FFE5E5', borderRadius: 10, paddingHorizontal: 12 }]}
            disabled={selectedIds.size === 0}
          >
            <AppIcon name="trash" size={18} color={colors.error} />
            <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.error, marginLeft: 5 }}>Delete</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Model dropdown ───────────────────────────────────────────────────── */}
      {modelDropdown ? (
        <View style={[s.modelDropdown, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.md }]}>
          <View style={[s.modelDropHeader, { borderBottomColor: colors.borderLight }]}>
            <AppText variant="captionMedium" style={{ color: colors.textTertiary, fontWeight: '700', letterSpacing: 0.5 }}>
              SELECT AI MODEL
            </AppText>
            <TouchableOpacity onPress={() => setModelDropdown(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppIcon name="close" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {/* Cloud models */}
            <View style={[s.sectionLabel, { borderBottomColor: colors.borderLight }]}>
              <AppIcon name="cloud" size={12} color={colors.textTertiary} />
              <AppText variant="small" style={{ color: colors.textTertiary, fontWeight: '700', letterSpacing: 0.4 }}>CLOUD</AppText>
            </View>
            {SUPPORTED_MODELS.map(m => {
              const isActive = currentModelId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[s.modelRow, { borderBottomColor: colors.borderLight }, isActive && { backgroundColor: colors.primaryMuted }]}
                  onPress={() => {
                    LlmService.setModel(m.id);
                    setCurrentModelId(m.id);
                    setModelDropdown(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: isActive ? '700' : '500' }}>
                      {m.name}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textTertiary, marginTop: 1 }}>
                      {m.description}
                    </AppText>
                  </View>
                  {isActive ? <AppIcon name="checkmark" size={17} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}

            {/* On-device section */}
            <View style={[s.sectionLabel, { borderBottomColor: colors.borderLight, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight }]}>
              <AppIcon name="phone-portrait" size={12} color={colors.textTertiary} />
              <AppText variant="small" style={{ color: colors.textTertiary, fontWeight: '700', letterSpacing: 0.4 }}>ON DEVICE</AppText>
            </View>
            {/* Local model row */}
            {(() => {
              const localStatus = localModelInfo?.status || 'not_downloaded';
              const localProgress = localModelInfo?.progress || 0;
              const isActive = currentModelId === LOCAL_MODEL_ID;
              const isReady = localStatus === 'ready';
              const isDownloading = localStatus === 'downloading';

              return (
                <TouchableOpacity
                  style={[s.modelRow, { borderBottomColor: colors.borderLight }, isActive && { backgroundColor: colors.primaryMuted }]}
                  onPress={() => {
                    if (!isReady) {
                      setModelDropdown(false);
                      navigation.navigate('ModelManager');
                      return;
                    }
                    setCurrentModelId(LOCAL_MODEL_ID);
                    setModelDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: isActive ? '700' : '500' }}>
                        Gemma 4 4B
                      </AppText>
                      <View style={[s.localBadge, {
                        backgroundColor: isReady
                          ? (colors.successMuted ?? 'rgba(76,175,80,0.12)')
                          : colors.primaryMuted,
                      }]}>
                        <AppText style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: isReady ? (colors.success ?? '#4CAF50') : colors.primary,
                        }}>
                          {isDownloading ? `${localProgress}%` : isReady ? 'READY' : 'DOWNLOAD'}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="caption" style={{ color: colors.textTertiary, marginTop: 1 }}>
                      {isReady ? 'Fully offline · ~2.7 GB' : isDownloading ? `Downloading… ${localProgress}%` : 'Tap to download (~2.7 GB)'}
                    </AppText>
                  </View>
                  {isActive && isReady
                    ? <AppIcon name="checkmark" size={17} color={colors.primary} />
                    : <AppIcon name={isReady ? 'chevron-forward' : 'download'} size={15} color={colors.textTertiary} />
                  }
                </TouchableOpacity>
              );
            })()}
          </ScrollView>
        </View>
      ) : null}

      {/* ── Empty / welcome state ────────────────────────────────────────────── */}
      {isEmpty ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.emptyContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Agent-themed hero */}
          <View style={[s.emptyLogo, { backgroundColor: agentColor + '15' }]}>
            {forcedAgentId ? (
              <AppText style={{ fontSize: 44 }}>{agentTheme.emoji}</AppText>
            ) : (
              <AppIcon name="sparkle" size={44} color={agentColor} />
            )}
          </View>
          <AppText variant="heading2" style={[s.emptyTitle, { color: colors.textPrimary }]}>
            {forcedAgentId ? agentTheme.greeting : tr('howCanIHelp')}
          </AppText>
          {forcedAgentId && activeAgent ? (
            <View style={[s.agentBadgeEmpty, { backgroundColor: agentColor + '12', borderColor: agentColor + '25' }]}>
              <AppText variant="captionMedium" style={{ color: agentColor, fontWeight: '700' }}>
                {activeAgent.specialty}
              </AppText>
            </View>
          ) : null}
          <AppText variant="body" style={[s.emptySub, { color: colors.textSecondary }]}>
            {forcedAgentId ? 'Describe your concern or choose a topic below.' : tr('describeConcern')}
          </AppText>
          <View style={s.promptGrid}>
            {SUGGESTED_PROMPTS.map((p, i) => (
              <Animated.View key={i} style={{ opacity: promptAnims[Math.min(i, promptAnims.length - 1)].opacity, transform: [{ translateY: promptAnims[Math.min(i, promptAnims.length - 1)].translateY }] }}>
                <TouchableOpacity
                  style={[s.promptCard, { backgroundColor: colors.surface, borderColor: forcedAgentId ? agentColor + '20' : colors.borderLight, ...shadows.sm }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (p.icon === 'image') {
                      showDialog({
                        title: 'Upload Image',
                        message: 'Choose how you want to add your image for AI analysis.',
                        icon: 'image',
                        iconColor: agentColor,
                        buttons: [
                          { text: 'Cancel', onPress: hideDialog, variant: 'ghost' },
                          { text: 'Gallery', onPress: () => { hideDialog(); pickFromGallery(); }, variant: 'primary' },
                          { text: 'Camera', onPress: () => { hideDialog(); pickFromCamera(); }, variant: 'primary' },
                        ],
                      });
                    } else {
                      setInput(p.prompt);
                      inputRef.current?.focus();
                    }
                  }}
                >
                  <View style={[s.promptIcon, { backgroundColor: agentColor + '15' }]}>
                    <AppIcon name={p.icon} size={20} color={agentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyMedium" style={[s.promptTitle, { color: colors.textPrimary }]}>{p.title}</AppText>
                    <AppText variant="caption" style={[s.promptSub, { color: colors.textTertiary }]}>{p.sub}</AppText>
                  </View>
                  <View style={[s.promptArrow, { backgroundColor: agentColor + '15' }]}>
                    <AppIcon name="chevron-right" size={14} color={agentColor} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, position: 'relative' }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            extraData={selectionMode ? selectedIds : undefined}
            contentContainerStyle={s.listContent}
            onLayout={() => {
              if (!initialScrollDone.current && messages.length > 0) {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
              }
            }}
            onContentSizeChange={() => {
              if (!initialScrollDone.current && messages.length > 0) {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
                initialScrollDone.current = true;
              } else if (!showScrollBottom) {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
              }
            }}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
              setShowScrollBottom(!isAtBottom);
            }}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              isThinking ? (
                <View style={[s.thinkingBubble, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.sm }]}>
                  {/* Pulsing icon */}
                  <Animated.View style={[s.thinkingIconWrap, { backgroundColor: agentColor + '20', transform: [{ scale: pulseAnim }] }]}>
                    <AppIcon name="sparkle" size={13} color={agentColor} />
                  </Animated.View>

                  {/* Bouncing dots */}
                  <View style={s.dotsRow}>
                    <Animated.View style={[s.dot, { backgroundColor: agentColor, opacity: dot1, transform: [{ translateY: dotY1 }] }]} />
                    <Animated.View style={[s.dot, { backgroundColor: agentColor, opacity: dot2, transform: [{ translateY: dotY2 }] }]} />
                    <Animated.View style={[s.dot, { backgroundColor: agentColor, opacity: dot3, transform: [{ translateY: dotY3 }] }]} />
                  </View>

                  {/* Thinking phrase */}
                  <AppText variant="caption" style={[s.thinkingText, { color: colors.textSecondary }]}>{thinkingText}</AppText>
                </View>
              ) : null
            }
          />
          {showScrollBottom && messages.length > 0 && (
            <TouchableOpacity 
              style={[s.scrollBottomBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.md }]}
              onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
            >
              <AppIcon name="chevron-down" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Image preview strip ──────────────────────────────────────────────── */}
      {attachedImages.length > 0 ? (
        <View style={[s.imagePreview, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {attachedImages.map((img, idx) => (
              <View key={idx} style={{ position: 'relative' }}>
                <Image source={{ uri: img.uri }} style={s.imageThumb} />
                <TouchableOpacity
                  onPress={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                  style={[s.imageRemoveBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                >
                  <AppIcon name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {attachedImages.length < 3 ? (
              <TouchableOpacity
                onPress={pickFromGallery}
                style={[s.imageAddBtn, { borderColor: colors.borderLight, backgroundColor: colors.surfaceVariant }]}
              >
                <AppIcon name="add" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
            <AppText variant="small" style={{ color: colors.textTertiary, marginLeft: 4 }}>
              {attachedImages.length}/3 · Tap send
            </AppText>
          </View>
        </View>
      ) : null}

      {/* ── Attachment Menu ────────────────────────────────────────────────── */}
      {attachmentMenuOpen ? (
        <View style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 4) + 65 : 75,
          left: 12,
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 6,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...shadows.md,
          zIndex: 100,
          elevation: 5,
        }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 }}
            onPress={() => { setAttachmentMenuOpen(false); pickFromGallery(); }}
          >
            <AppIcon name="image" size={22} color={colors.primary} />
            <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '600' }}>Gallery</AppText>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: 8 }} />
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 }}
            onPress={() => { setAttachmentMenuOpen(false); pickFromCamera(); }}
          >
            <AppIcon name="camera" size={22} color={colors.primary} />
            <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '600' }}>Camera</AppText>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Input bar ────────────────────────────────────────────────────────── */}
      <View style={[s.inputBar, { backgroundColor: colors.background, paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 4) : 6 }]}>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {/* Add button */}
          <TouchableOpacity
            onPress={() => setAttachmentMenuOpen(prev => !prev)}
            disabled={loading || attachedImages.length >= 3}
            style={[s.inputActionBtn, { backgroundColor: attachedImages.length > 0 || attachmentMenuOpen ? colors.primaryMuted : colors.surfaceVariant }, (loading || attachedImages.length >= 3) && { opacity: 0.35 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon
              name={attachmentMenuOpen ? "close" : "add"}
              size={24}
              color={attachedImages.length > 0 || attachmentMenuOpen ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            ref={inputRef}
            multiline
            value={input}
            onChangeText={loading ? undefined : setInput}
            editable={!loading}
            placeholder={attachedImages.length > 0 ? 'Add a message (optional)…' : tr('askHealth')}
            placeholderTextColor={colors.textTertiary}
            style={[s.textInput, { color: colors.textPrimary }]}
            maxLength={2000}
            returnKeyType="default"
            scrollEnabled
          />

          {/* Send or mic */}
          {input.trim().length > 0 || attachedImages.length > 0 ? (
            <TouchableOpacity
              onPress={sendMessage}
              disabled={loading}
              style={[s.sendBtn, { backgroundColor: loading ? colors.primaryMuted : colors.primary }]}
            >
              <AppIcon name="send" size={15} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => !loading && startListening('en-US')}
              disabled={loading}
              style={[s.micBtn, { backgroundColor: isListening ? colors.errorMuted : colors.surfaceVariant }, loading && { opacity: 0.35 }]}
            >
              <AppIcon
                name="mic"
                size={20}
                color={isListening ? colors.error : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[s.disclaimer, { color: colors.textTertiary }]}>
          {tr('aiDisclaimer')}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  // Selection toolbar
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  selBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    minWidth: 36,
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  modelOnlineDot: { width: 7, height: 7, borderRadius: 4 },

  // Model dropdown
  modelDropdown: {
    marginHorizontal: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modelDropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  localBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // Empty state
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  emptyLogo: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center', letterSpacing: -0.3 },
  emptySub: { fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 21 },
  agentBadgeEmpty: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  promptGrid: { width: '100%', gap: 10 },
  promptCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  promptIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  promptTitle: { fontSize: 14, fontWeight: '700' },
  promptSub: { fontSize: 12, marginTop: 2 },
  promptArrow: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  // Message list
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },

  // Thinking indicator
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginLeft: 14,
    marginBottom: 14,
  },
  thinkingIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  thinkingText: { fontSize: 13, fontStyle: 'italic', fontWeight: '500' },

  // Image preview
  imagePreview: {
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  imageThumb: { width: 60, height: 60, borderRadius: 10 },
  imageAddBtn: { width: 60, height: 60, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  imageRemoveBadge: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },

  // Input bar
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 30,
    borderWidth: 1,
    gap: 6,
  },
  inputActionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginBottom: 4,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 110,
    minHeight: 32,
  },
  micBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    margin: 2,
    marginBottom: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  disclaimer: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 0,
    letterSpacing: 0.1,
  },
  scrollBottomBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function HistoryLoader({ colors, agentColor }: { colors: any; agentColor: string }) {
  const ring  = useRef(new Animated.Value(1)).current;
  const fade  = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(ring,  { toValue: 1.25, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ring,  { toValue: 1,    duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(fade, { toValue: 1,   duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ])).start();
    return () => { ring.stopAnimation(); fade.stopAnimation(); };
  }, [ring, fade]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 18 }}>
      {/* Outer pulse ring */}
      <Animated.View style={{
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 2, borderColor: agentColor + '40',
        justifyContent: 'center', alignItems: 'center',
        transform: [{ scale: ring }],
      }}>
        {/* Inner filled circle */}
        <Animated.View style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: agentColor + '18',
          justifyContent: 'center', alignItems: 'center',
          opacity: fade,
        }}>
          <AppIcon name="sparkle" size={26} color={agentColor} />
        </Animated.View>
      </Animated.View>

      {/* Three bouncing dots below */}
      <BouncingDots color={agentColor} />
    </View>
  );
}

function BouncingDots({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    dots.forEach((d, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 140),
        Animated.timing(d, { toValue: -8, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(d, { toValue: 0,  duration: 280, easing: Easing.in(Easing.bounce), useNativeDriver: true }),
        Animated.delay(480 - i * 140),
      ])).start();
    });
    return () => dots.forEach(d => d.stopAnimation());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: 0.75, transform: [{ translateY: d }] }}
        />
      ))}
    </View>
  );
}

export default ChatScreen;

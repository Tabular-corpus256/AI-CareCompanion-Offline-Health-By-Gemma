import React, { useMemo, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Share, Animated } from 'react-native';
import { useTheme } from '@theme';
import { AppIcon } from './AppIcon';
import { AppText } from './ui/AppText';
import { SpeakButton } from './SpeakButton';
import type { AgentMessage } from '@types';
import { getAgentById } from '../data/agents';
import { getAgentTheme } from '../data/agentThemes';

// Try to use clipboard; fall back to Share if not installed
let Clipboard: { setString: (s: string) => void } | null = null;
try {
  Clipboard = require('@react-native-clipboard/clipboard').default;
} catch {
  Clipboard = null;
}

async function copyText(text: string) {
  if (Clipboard) {
    try {
      Clipboard.setString(text);
      return;
    } catch {
      // native module not linked — fall through to Share
    }
  }
  try { await Share.share({ message: text }); } catch {}
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function parseSuggestions(content: string): { body: string; suggestions: string[] } {
  const separators = [
    '\n---\n', '\n***\n', 
    '\nFollow-up questions:', '\nSuggested questions:', '\nQuestions you might have:',
    '\n**Follow-up questions:**', '\n**Suggested questions:**', '\n**Questions you might have:**'
  ];
  let sepIndex = -1;
  let separatorLength = 0;
  for (const sep of separators) {
    const idx = content.lastIndexOf(sep);
    if (idx !== -1 && idx > sepIndex) { sepIndex = idx; separatorLength = sep.length; }
  }
  if (sepIndex === -1) return { body: content, suggestions: [] };
  const body = content.slice(0, sepIndex).trim();
  const tail = content.slice(sepIndex + separatorLength).trim();
  const suggestions = tail
    .split('\n')
    .map(s => s.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s+/, '').trim())
    .filter(s => s.length > 0 && s.length < 120);
  return { body, suggestions };
}

function renderInlineBold(text: string, baseStyle: any) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <AppText key={i} style={[baseStyle, { fontWeight: 'bold' }]}>{part.slice(2, -2)}</AppText>;
    }
    return <AppText key={i}>{part}</AppText>;
  });
}

function renderFormattedText(text: string, baseStyle: any, colors: any) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
          return <View key={lineIdx} style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />;
        }
        if (trimmed.startsWith('### ')) {
          return (
            <AppText key={lineIdx} style={[baseStyle, { fontWeight: '700', fontSize: 15, marginTop: 10, marginBottom: 4 }]}>
              {renderInlineBold(trimmed.replace(/^###\s*/, ''), baseStyle)}
            </AppText>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <AppText key={lineIdx} style={[baseStyle, { fontWeight: '700', fontSize: 16, marginTop: 12, marginBottom: 4 }]}>
              {renderInlineBold(trimmed.replace(/^##\s*/, ''), baseStyle)}
            </AppText>
          );
        }
        if (/^[-*•]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <View key={lineIdx} style={{ flexDirection: 'row', paddingLeft: 4, marginVertical: 2 }}>
              <AppText style={[baseStyle, { marginRight: 8, color: colors.primary }]}>•</AppText>
              <AppText style={[baseStyle, { flex: 1 }]}>{renderInlineBold(bulletText, baseStyle)}</AppText>
            </View>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <View key={lineIdx} style={{ flexDirection: 'row', paddingLeft: 4, marginVertical: 2 }}>
              <AppText style={[baseStyle, { marginRight: 8, fontWeight: '700', color: colors.primary, minWidth: 20 }]}>{numMatch[1]}.</AppText>
              <AppText style={[baseStyle, { flex: 1 }]}>{renderInlineBold(numMatch[2], baseStyle)}</AppText>
            </View>
          );
        }
        if (!trimmed) return <View key={lineIdx} style={{ height: 6 }} />;
        return (
          <AppText key={lineIdx} style={baseStyle}>
            {renderInlineBold(trimmed, baseStyle)}
          </AppText>
        );
      })}
    </View>
  );
}

// ─── Copied feedback ──────────────────────────────────────────────────────────

function CopiedBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={s.copiedBadge}>
      <AppIcon name="checkmark" size={11} color="#fff" />
      <AppText style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 3 }}>Copied</AppText>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  message: AgentMessage;
  onSuggestionTap?: (text: string) => void;
  showSuggestions?: boolean;
  onImagePress?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onLongPressSelect?: () => void;
}

function ChatBubbleInner({
  message, onSuggestionTap, showSuggestions = true, onImagePress,
  selectionMode = false, isSelected = false, onSelect, onLongPressSelect,
}: Props) {
  const { colors, borderRadius, shadows } = useTheme();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = useState(false);

  const { body, suggestions } = useMemo(
    () =>
      message.role === 'assistant' && !message.isStreaming
        ? parseSuggestions(message.content)
        : { body: message.content, suggestions: [] as string[] },
    [message.content, message.role, message.isStreaming],
  );

  const agentInfo = useMemo(() => {
    if (message.agentId) {
      const agent = getAgentById(message.agentId);
      const theme = getAgentTheme(message.agentId);
      return agent ? { name: agent.displayName, icon: agent.icon, emoji: theme.emoji, color: theme.color } : null;
    }
    return null;
  }, [message.agentId]);

  const handleCopy = useCallback(async () => {
    const text = isUser ? message.content : body;
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [isUser, message.content, body]);

  const formatTime = (ts: number) => {
    if (!ts || isNaN(ts)) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isSystem) {
    return (
      <View style={[s.systemContainer, { backgroundColor: colors.chatSystem, borderRadius: borderRadius.xl }]}>
        <AppText variant="caption" color="secondary" style={s.systemText}>{message.content}</AppText>
      </View>
    );
  }

  if (message.role === 'assistant' && message.isStreaming && !message.content) {
    return null;
  }

  // ── User bubble ──────────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <View style={[s.userRow, isSelected && s.selectedBg]}>
        {/* Checkmark beside the bubble (flex sibling, right side) */}
        {selectionMode && (
          <View style={[s.check, { borderColor: isSelected ? colors.primary : colors.borderLight, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
            {isSelected && <AppIcon name="checkmark" size={10} color="#fff" />}
          </View>
        )}
        <TouchableOpacity
          activeOpacity={selectionMode ? 0.7 : 0.85}
          onPress={selectionMode ? onSelect : undefined}
          onLongPress={!selectionMode ? (onLongPressSelect ?? handleCopy) : undefined}
          delayLongPress={400}
        >
          <View style={[s.userBubble, { backgroundColor: colors.chatUser, borderRadius: borderRadius.xl }]}>
            {message.imageUri ? (
              <TouchableOpacity activeOpacity={0.9} onPress={selectionMode ? undefined : onImagePress}>
                <Image source={{ uri: message.imageUri }} style={s.inlineImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : null}
            <View style={{ paddingHorizontal: 16, paddingTop: message.imageUri ? 8 : 12, paddingBottom: 12 }}>
              {message.content && message.content !== 'Please analyze this image.' ? (
                <AppText variant="body" style={[s.userBubbleText, { color: colors.chatUserText }]}>
                  {message.content}
                </AppText>
              ) : null}
              {message.imageUri && !message.content ? (
                <AppText variant="body" style={[s.userBubbleText, { color: colors.chatUserText, fontStyle: 'italic', opacity: 0.8 }]}>
                  Analyzing image…
                </AppText>
              ) : null}
              <View style={s.userFooter}>
                <CopiedBadge visible={copied} />
                <AppText variant="small" style={[s.userTime, { color: 'rgba(255,255,255,0.55)' }]}>
                  {formatTime(message.timestamp)}
                </AppText>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Assistant bubble ─────────────────────────────────────────────────────────
  // Streaming messages are not yet persisted — block selection on them
  const canSelect = !message.isStreaming;
  return (
    <View style={[s.aiRow, isSelected && s.selectedBg]}>
      {/* Checkmark beside the avatar (flex sibling, left side) */}
      {selectionMode && canSelect && (
        <View style={[s.check, s.checkAI, { borderColor: isSelected ? colors.primary : colors.borderLight, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
          {isSelected && <AppIcon name="checkmark" size={10} color="#fff" />}
        </View>
      )}

      <View style={[s.aiAvatar, { backgroundColor: agentInfo?.color ? agentInfo.color + '18' : colors.primaryMuted }]}>
        {agentInfo?.emoji ? (
          <AppText style={{ fontSize: 14 }}>{agentInfo.emoji}</AppText>
        ) : (
          <AppIcon name="pulse" size={15} color={colors.primary} />
        )}
      </View>

      <TouchableOpacity
        style={{ flex: 1, maxWidth: '88%' }}
        activeOpacity={canSelect && selectionMode ? 0.7 : 1}
        onPress={canSelect && selectionMode ? onSelect : undefined}
        onLongPress={!selectionMode && canSelect ? onLongPressSelect : undefined}
        delayLongPress={400}
      >
        {agentInfo && agentInfo.name !== 'Orchestrator' ? (
          <AppText variant="small" style={[s.agentName, { color: agentInfo.color || colors.primary }]}>
            {agentInfo.name}
          </AppText>
        ) : null}

        <View style={[s.aiBubble, { backgroundColor: colors.chatAI, borderRadius: borderRadius.xl, borderColor: colors.borderLight }]}>
          {renderFormattedText(body, { color: colors.chatAIText, fontSize: 15, lineHeight: 23, letterSpacing: 0.1 }, colors)}
          {message.isStreaming ? (
            <View style={s.streamingRow}>
              <View style={[s.streamDot, { backgroundColor: colors.primary }]} />
              <View style={[s.streamDot, s.streamDot2, { backgroundColor: colors.primary }]} />
              <View style={[s.streamDot, s.streamDot3, { backgroundColor: colors.primary }]} />
            </View>
          ) : null}
        </View>

        {suggestions.length > 0 && showSuggestions && !selectionMode ? (
          <View style={s.suggestionsRow}>
            {suggestions.map((sug, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() => onSuggestionTap?.(sug)}
                style={[s.suggestionChip, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderColor: colors.borderLight, ...shadows.sm }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="sparkles" size={14} color={colors.primary} />
                  <AppText variant="small" style={{ color: colors.textPrimary, flexShrink: 1, fontWeight: '500' }}>
                    {sug}
                  </AppText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {!selectionMode && (
          <View style={s.aiFooter}>
            <AppText variant="small" color="tertiary" style={s.aiTime}>
              {formatTime(message.timestamp)}
            </AppText>
            {message.responseTimeMs !== undefined ? (
              <View style={[s.timingBadge, { backgroundColor: colors.primaryMuted }]}>
                <AppText variant="small" color="primary" style={s.aiTiming}>
                  {message.responseTimeMs < 1000
                    ? `${message.responseTimeMs}ms`
                    : `${(message.responseTimeMs / 1000).toFixed(1)}s`}
                </AppText>
              </View>
            ) : null}
            {message.id !== 'welcome' ? (
              <SpeakButton text={body} color={colors.textTertiary} size={14} />
            ) : null}
            {!message.isStreaming ? (
              <TouchableOpacity
                onPress={handleCopy}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[s.copyBtn, copied && { backgroundColor: colors.primaryMuted }]}
              >
                {copied ? (
                  <AppIcon name="checkmark" size={13} color={colors.primary} />
                ) : (
                  <AppIcon name="copy" size={13} color={colors.textTertiary} />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  // Selection
  selectedBg: { backgroundColor: 'rgba(13,124,102,0.07)', borderRadius: 14 },
  // Absolute checkmark badge — doesn't affect flex layout at all
  check: { position: 'absolute', top: 6, left: 6, zIndex: 10, width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkAI: { top: 6, right: 6, left: undefined as any },

  // User
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: 4, paddingLeft: 48 },
  userBubble: { overflow: 'hidden' },
  inlineImage: { minWidth: 240, width: '100%', height: 180 },
  userBubbleText: { fontSize: 15, lineHeight: 22 },
  userFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4 },
  userTime: { fontSize: 11 },

  // Copied badge
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },

  // AI
  aiRow: { flexDirection: 'row', marginVertical: 4, gap: 10, alignItems: 'flex-start', paddingRight: 16 },
  aiAvatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  agentName: { fontSize: 10, fontWeight: '700', marginBottom: 3, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.6 },
  aiBubble: { paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1 },
  aiFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6, paddingHorizontal: 4 },
  aiTime: { fontSize: 11 },
  aiTiming: { fontSize: 10, fontWeight: '700' },
  timingBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  copyBtn: { padding: 5, borderRadius: 8 },

  // System
  systemContainer: { alignSelf: 'center', marginVertical: 8, paddingHorizontal: 16, paddingVertical: 6 },
  systemText: { fontSize: 12, fontStyle: 'italic', textAlign: 'center' },

  // Streaming
  streamingRow: { flexDirection: 'row', marginTop: 8, gap: 4 },
  streamDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
  streamDot2: { opacity: 0.5 },
  streamDot3: { opacity: 0.3 },

  // Suggestions
  suggestionsRow: { marginTop: 10, gap: 8, paddingLeft: 2 },
  suggestionChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
});

export const ChatBubble = React.memo(ChatBubbleInner);
export default ChatBubble;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@theme';
import { DatabaseService } from '@services/DatabaseService';
import type { Conversation } from '@types';
import { logError } from '@utils/logger';
import { AppIcon } from '@components/AppIcon';
import { AppDialog, useDialog } from '@components/AppDialog';
import { getAgentById } from '../data/agents';

interface Props {
  visible: boolean;
  onClose: () => void;
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 360);

const AGENT_COLORS: Record<string, string> = {
  orchestrator: '#0D7C66',
  general: '#0D7C66',
  nutrition: '#00B894',
  mental: '#E84393',
  respiratory: '#3498DB',
  fitness: '#F39C12',
};

export function ChatSidebar({
  visible,
  onClose,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: Props) {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [modalVisible, setModalVisible] = useState(visible);
  const [listLoading, setListLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [renameConv, setRenameConv] = useState<Conversation | null>(null);
  const [renameText, setRenameText] = useState('');

  const dialog = useDialog();

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadConversations = useCallback(async (showSpinner = false) => {
    if (showSpinner) setListLoading(true);
    try {
      const rows = await DatabaseService.query<Conversation>(
        'SELECT * FROM conversations WHERE user_id = ? AND (archived IS NULL OR archived = 0) ORDER BY updated_at DESC LIMIT 50',
        [DatabaseService.getCurrentUserId()],
      );
      setConversations(rows);
    } catch (err) {
      // Fallback: table might not have archived column
      try {
        const rows = await DatabaseService.query<Conversation>(
          'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50',
          [DatabaseService.getCurrentUserId()],
        );
        setConversations(rows);
      } catch (err2) {
        logError('ChatSidebar.loadConversations', err2);
      }
    } finally {
      if (showSpinner) setListLoading(false);
    }
  }, []);

  const loadArchivedConversations = useCallback(async () => {
    try {
      const rows = await DatabaseService.query<Conversation>(
        'SELECT * FROM conversations WHERE user_id = ? AND archived = 1 ORDER BY updated_at DESC LIMIT 50',
        [DatabaseService.getCurrentUserId()],
      );
      setArchivedConversations(rows);
    } catch {
      // archived column may not exist yet
      setArchivedConversations([]);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      loadConversations(true);
      loadArchivedConversations();
      setShowArchived(false);
      setSearchText('');
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, loadConversations, loadArchivedConversations, slideAnim, fadeAnim]);

  const handleDelete = (conv: Conversation) => {
    dialog.show({
      title: 'Delete Chat',
      message: `Are you sure you want to delete "${conv.title}"? All messages will be permanently lost.`,
      icon: 'trash',
      iconColor: colors.error,
      buttons: [
        { text: 'Cancel', onPress: () => dialog.hide(), variant: 'ghost' },
        {
          text: 'Delete',
          variant: 'danger',
          onPress: async () => {
            dialog.hide();
            await DatabaseService.execute(
              'DELETE FROM agent_chat_history WHERE conversation_id = ?',
              [conv.id],
            );
            await DatabaseService.execute(
              'DELETE FROM conversations WHERE id = ?',
              [conv.id],
            );
            loadConversations();
            loadArchivedConversations();
            if (conv.id === activeConversationId) {
              onClose();
              onNewChat();
            }
          },
        },
      ],
    });
  };

  const handleArchive = async (conv: Conversation) => {
    try {
      // Try adding archived column if it doesn't exist
      try {
        await DatabaseService.execute(
          'ALTER TABLE conversations ADD COLUMN archived INTEGER DEFAULT 0',
        );
      } catch {
        // Column likely already exists
      }
      await DatabaseService.execute(
        'UPDATE conversations SET archived = 1 WHERE id = ?',
        [conv.id],
      );
      loadConversations();
      loadArchivedConversations();
    } catch (err) {
      logError('ChatSidebar.handleArchive', err);
    }
  };

  const handleUnarchive = async (conv: Conversation) => {
    try {
      await DatabaseService.execute(
        'UPDATE conversations SET archived = 0 WHERE id = ?',
        [conv.id],
      );
      loadConversations();
      loadArchivedConversations();
    } catch (err) {
      logError('ChatSidebar.handleUnarchive', err);
    }
  };

  const showConvOptions = (conv: Conversation, isArchived: boolean) => {
    const buttons = isArchived
      ? [
          { text: 'Unarchive', onPress: () => { dialog.hide(); handleUnarchive(conv); }, variant: 'primary' as const },
          { text: 'Rename', onPress: () => { dialog.hide(); setTimeout(() => { setRenameText(conv.title || 'New Chat'); setRenameConv(conv); }, 300); }, variant: 'ghost' as const },
          { text: 'Delete', onPress: () => { dialog.hide(); handleDelete(conv); }, variant: 'danger' as const },
          { text: 'Cancel', onPress: () => dialog.hide(), variant: 'ghost' as const },
        ]
      : [
          { text: 'Archive', onPress: () => { dialog.hide(); handleArchive(conv); }, variant: 'primary' as const },
          { text: 'Rename', onPress: () => { dialog.hide(); setTimeout(() => { setRenameText(conv.title || 'New Chat'); setRenameConv(conv); }, 300); }, variant: 'ghost' as const },
          { text: 'Delete', onPress: () => { dialog.hide(); handleDelete(conv); }, variant: 'danger' as const },
          { text: 'Cancel', onPress: () => dialog.hide(), variant: 'ghost' as const },
        ];

    dialog.show({
      title: conv.title || 'New Chat',
      message: 'What would you like to do with this conversation?',
      icon: 'chatbubble',
      iconColor: colors.primary,
      buttons,
    });
  };

  const formatTime = (ts: number): string => {
    if (!ts || isNaN(ts) || ts <= 0) return '';
    const diff = Date.now() - ts;
    if (diff < 0 || isNaN(diff)) return '';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      const d = new Date(ts);
      return d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
    }
    if (hours < 48) return 'Yesterday';
    const d = new Date(ts);
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  const getAgentColor = (agentId?: string): string => {
    if (!agentId) return colors.primary;
    for (const key in AGENT_COLORS) {
      if (agentId.toLowerCase().includes(key)) return AGENT_COLORS[key];
    }
    return colors.primary;
  };

  const filteredConversations = searchText
    ? conversations.filter(c =>
        (c.title || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (c.lastPreview || '').toLowerCase().includes(searchText.toLowerCase()),
      )
    : conversations;

  const groupConversations = () => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const thisWeek: Conversation[] = [];
    const older: Conversation[] = [];

    const now = Date.now();
    const dayMs = 86400000;

    filteredConversations.forEach(c => {
      const ts = c.updatedAt;
      if (!ts || isNaN(ts)) {
        older.push(c);
        return;
      }
      const diff = now - ts;
      if (diff < dayMs) today.push(c);
      else if (diff < dayMs * 2) yesterday.push(c);
      else if (diff < dayMs * 7) thisWeek.push(c);
      else older.push(c);
    });

    return { today, yesterday, thisWeek, older };
  };

  const groups = groupConversations();

  const renderGroupHeader = (label: string) => (
    <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>{label}</Text>
  );

  const renderItem = (item: Conversation, isArchived = false) => {
    const isActive = item.id === activeConversationId;
    const agentColor = getAgentColor(item.agentId);
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.convItem,
          {
            backgroundColor: isActive ? colors.primaryMuted : 'transparent',
            borderRadius: borderRadius.md,
          },
        ]}
        onPress={() => {
          if (!isArchived) {
            onSelectConversation(item.id);
            onClose();
          }
        }}
        onLongPress={() => showConvOptions(item, isArchived)}
        activeOpacity={0.7}
      >
        <View style={[styles.convDot, { backgroundColor: agentColor }]}>
          <AppIcon name={getAgentById(item.agentId)?.icon || 'chatbubble'} size={14} color="#fff" />
        </View>
        <View style={styles.convTextContainer}>
          <Text
            style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}
            numberOfLines={1}
          >
            {item.title || 'New Chat'}
          </Text>
          <Text
            style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]}
            numberOfLines={1}
          >
            {item.lastPreview || 'General Health'}
          </Text>
        </View>
        <View style={styles.convRight}>
          <Text style={[typography.small, { color: colors.textTertiary }]}>
            {formatTime(item.updatedAt)}
          </Text>
          <TouchableOpacity onPress={() => showConvOptions(item, isArchived)} style={styles.moreBtn}>
            <AppIcon name="more-vert" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!modalVisible) return null;

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sidebar,
            {
              backgroundColor: colors.background,
              transform: [{ translateX: slideAnim }],
              width: SIDEBAR_WIDTH,
              ...shadows.xl,
            },
          ]}
        >
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.sidebarHeader}>
              <Text style={[typography.heading1, { color: colors.textPrimary, fontWeight: '800' }]}>
                {showArchived ? 'Archived' : 'Chat history'}
              </Text>
              <TouchableOpacity onPress={showArchived ? () => setShowArchived(false) : onClose} style={styles.closeBtn}>
                <AppIcon name={showArchived ? 'arrow-back' : 'close'} size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={[styles.searchBar, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md }]}>
              <AppIcon name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[typography.body, { flex: 1, color: colors.textPrimary, marginLeft: 8, padding: 0 }]}
                placeholder="Search conversations"
                placeholderTextColor={colors.textTertiary}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <AppIcon name="close" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Conversation list */}
            <FlatList
              data={[]}
              renderItem={() => null}
              ListHeaderComponent={
                <View>
                  {/* New Chat Button */}
                  {!showArchived && (
                    <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
                      <TouchableOpacity
                        onPress={() => {
                          onNewChat();
                          onClose();
                        }}
                        style={[
                          styles.newChatBtn,
                          { backgroundColor: colors.primary, borderRadius: borderRadius.lg },
                        ]}
                        activeOpacity={0.8}
                      >
                        <AppIcon name="add" size={20} color="#fff" />
                        <Text style={[typography.button, { color: '#fff', marginLeft: spacing.sm }]}>
                          New Chat
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Skeleton loader */}
                  {listLoading ? (
                    <SkeletonList colors={colors} />
                  ) : showArchived ? (
                    <>
                      {archivedConversations.length === 0 ? (
                        <View style={styles.emptyContainer}>
                          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryMuted }]}>
                            <AppIcon name="archive" size={32} color={colors.primary} />
                          </View>
                          <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginTop: spacing.md }]}>
                            No archived chats
                          </Text>
                          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                            Long press on a chat and select "Archive" to move it here.
                          </Text>
                        </View>
                      ) : (
                        <>
                          {renderGroupHeader('ARCHIVED')}
                          {archivedConversations.map(c => renderItem(c, true))}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {groups.today.length > 0 && (
                        <>
                          {renderGroupHeader('Today')}
                          {groups.today.map(c => renderItem(c))}
                        </>
                      )}
                      {groups.yesterday.length > 0 && (
                        <>
                          {renderGroupHeader('Yesterday')}
                          {groups.yesterday.map(c => renderItem(c))}
                        </>
                      )}
                      {groups.thisWeek.length > 0 && (
                        <>
                          {renderGroupHeader('This week')}
                          {groups.thisWeek.map(c => renderItem(c))}
                        </>
                      )}
                      {groups.older.length > 0 && (
                        <>
                          {renderGroupHeader('Older')}
                          {groups.older.map(c => renderItem(c))}
                        </>
                      )}
                      {filteredConversations.length === 0 && (
                        <View style={styles.emptyContainer}>
                          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryMuted }]}>
                            <AppIcon name="chatbubbles" size={32} color={colors.primary} />
                          </View>
                          <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginTop: spacing.md }]}>
                            {searchText ? 'No results found' : 'No conversations yet'}
                          </Text>
                          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                            {searchText ? 'Try a different search term' : 'Start a new chat to consult with our AI specialists.'}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              }
              contentContainerStyle={{ paddingBottom: spacing.xxl }}
            />

            {/* Footer - Archive */}
            {!showArchived && (
              <TouchableOpacity
                style={[styles.archiveBtn, { borderTopColor: colors.borderLight, borderTopWidth: 1 }]}
                onPress={() => setShowArchived(true)}
              >
                <AppIcon name="archive" size={18} color={colors.textSecondary} />
                <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginLeft: 8 }]}>
                  Archived chats
                </Text>
                <View style={[styles.archiveBadge, { backgroundColor: colors.primaryMuted }]}>
                  <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>
                    {archivedConversations.length}
                  </Text>
                </View>
                <AppIcon name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>

      {/* Dialog */}
      <AppDialog
        visible={dialog.state.visible}
        onClose={dialog.hide}
        title={dialog.state.title}
        message={dialog.state.message}
        icon={dialog.state.icon}
        iconColor={dialog.state.iconColor}
        buttons={dialog.state.buttons}
      />

      {/* Rename Dialog */}
      <AppDialog
        visible={!!renameConv}
        onClose={() => setRenameConv(null)}
        title="Rename Chat"
        icon="create"
        iconColor={colors.primary}
        buttons={[
          { text: 'Cancel', onPress: () => setRenameConv(null), variant: 'ghost' },
          { 
            text: 'Save', 
            variant: 'primary',
            onPress: async () => {
              if (renameConv) {
                await DatabaseService.execute(
                  'UPDATE conversations SET title = ? WHERE id = ?',
                  [renameText.trim() || 'New Chat', renameConv.id]
                );
                setRenameConv(null);
                loadConversations();
                loadArchivedConversations();
              }
            }
          }
        ]}
      >
        <View style={{ width: '100%', marginBottom: 20 }}>
          <TextInput
            value={renameText}
            onChangeText={setRenameText}
            style={[{ borderWidth: 1, borderColor: colors.borderLight, borderRadius: 12, padding: 12, color: colors.textPrimary, fontSize: 16 }]}
            autoFocus
            placeholder="Chat Title"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </AppDialog>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdropTouch: { flex: 1 },
  sidebar: {
    flex: 1,
    height: '100%',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeBtn: { padding: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginBottom: 2,
    gap: 12,
  },
  convDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  convTextContainer: { flex: 1 },
  convRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  moreBtn: { padding: 4 },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  archiveBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});

function SkeletonList({ colors }: { colors: any }) {
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.85, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    return () => shimmer.stopAnimation();
  }, [shimmer]);

  const skeletonBg = colors.surfaceVariant;

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Animated.View
          key={i}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, opacity: shimmer }}
        >
          {/* Avatar circle */}
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: skeletonBg }} />

          {/* Text lines */}
          <View style={{ flex: 1, gap: 7 }}>
            <View style={{ height: 13, borderRadius: 7, backgroundColor: skeletonBg, width: `${55 + (i % 3) * 15}%` }} />
            <View style={{ height: 11, borderRadius: 6, backgroundColor: skeletonBg, width: `${40 + (i % 4) * 10}%` }} />
          </View>

          {/* Timestamp stub */}
          <View style={{ width: 28, height: 10, borderRadius: 5, backgroundColor: skeletonBg }} />
        </Animated.View>
      ))}
    </View>
  );
}

export default ChatSidebar;

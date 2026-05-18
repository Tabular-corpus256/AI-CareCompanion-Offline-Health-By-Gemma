import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '@theme';
import { getAgentById } from '../data/agents';
import { getAgentTheme } from '../data/agentThemes';
import { DatabaseService } from '@services/DatabaseService';
import { AppText, AppInput } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { useI18n } from '../i18n/I18nContext';

interface ChatHistoryItem {
  id: string;
  title: string;
  lastPreview: string;
  updatedAt: number;
  messageCount: number;
}

export function AgentProfileScreen() {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'AgentProfile'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const agentId = route.params?.agentId;
  const agent = getAgentById(agentId);
  const theme = getAgentTheme(agentId);
  const { tr } = useI18n();

  const [concern, setConcern] = useState('');
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'consult' | 'history'>('consult');

  // Load chat history for this agent
  useEffect(() => {
    (async () => {
      try {
        const userId = DatabaseService.getCurrentUserId();
        const rows = await DatabaseService.query<any>(
          'SELECT id, title, last_preview, updated_at, message_count FROM conversations WHERE agent_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 50',
          [agentId, userId],
        );
        setHistory(rows.map((r: any) => ({
          id: r.id,
          title: r.title || 'Chat',
          lastPreview: r.last_preview || '',
          updatedAt: Number(r.updated_at) || 0,
          messageCount: Number(r.message_count) || 0,
        })));
      } catch { setHistory([]); }
    })();
  }, [agentId]);

  if (!agent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <AppText variant="body">Agent not found</AppText>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <AppText variant="button" color="primary">Go Back</AppText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const accentColor = theme.color;

  const handleStartConsultation = () => {
    navigation.replace('AgentChat', { agentId: agent.id, initialMessage: concern.trim() });
  };

  const handleOpenHistory = (convId: string) => {
    navigation.replace('AgentChat', { agentId: agent.id });
  };

  const formatDate = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Capability chips based on agent tools
  const capabilities = useMemo(() => {
    const caps: { icon: string; label: string }[] = [];
    if (agent.supportsImage) caps.push({ icon: 'camera', label: 'Image Analysis' });
    if (agent.tools.length > 0) caps.push({ icon: 'construct', label: `${agent.tools.length} Tools` });
    caps.push({ icon: 'shield-checkmark', label: 'Private & Secure' });
    caps.push({ icon: 'time', label: '24/7 Available' });
    return caps;
  }, [agent]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <AppIcon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleStartConsultation}
            style={[s.headerAction, { backgroundColor: accentColor }]}
          >
            <AppIcon name="chatbubble" size={16} color="#fff" />
            <AppText variant="captionMedium" style={{ color: '#fff', fontWeight: '700', marginLeft: 4 }}>
              New Chat
            </AppText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Hero section with agent-specific color */}
          <View style={[s.heroSection, { backgroundColor: accentColor + '10' }]}>
            <View style={[s.heroOrb, { backgroundColor: accentColor + '08', top: -40, right: -30 }]} />
            <View style={[s.heroOrb, { backgroundColor: accentColor + '06', bottom: -50, left: -20, width: 140, height: 140, borderRadius: 70 }]} />

            <View style={[s.iconWrap, { backgroundColor: accentColor + '18', borderColor: accentColor + '25' }]}>
              <AppText style={{ fontSize: 48 }}>{theme.emoji}</AppText>
            </View>
            <AppText variant="heading1" style={{ color: colors.textPrimary, marginTop: 16, textAlign: 'center', fontSize: 24 }}>
              {agent.displayName}
            </AppText>
            <View style={[s.badge, { backgroundColor: accentColor + '15', borderColor: accentColor + '25' }]}>
              <AppText variant="captionMedium" style={{ color: accentColor, fontWeight: '700' }}>
                {agent.specialty}
              </AppText>
            </View>

            {/* Capability chips */}
            <View style={s.capsRow}>
              {capabilities.map((cap, i) => (
                <View key={i} style={[s.capChip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                  <AppIcon name={cap.icon} size={14} color={accentColor} />
                  <AppText variant="small" style={{ color: colors.textSecondary, fontWeight: '500', marginLeft: 4 }}>
                    {cap.label}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          {/* Tab switcher */}
          <View style={[s.tabRow, { borderColor: colors.borderLight }]}>
            <TouchableOpacity
              style={[s.tab, activeTab === 'consult' && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab('consult')}
            >
              <AppIcon name="create" size={16} color={activeTab === 'consult' ? accentColor : colors.textTertiary} />
              <AppText variant="captionMedium" style={{ color: activeTab === 'consult' ? accentColor : colors.textTertiary, fontWeight: '600', marginLeft: 6 }}>
                Consult
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, activeTab === 'history' && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab('history')}
            >
              <AppIcon name="time" size={16} color={activeTab === 'history' ? accentColor : colors.textTertiary} />
              <AppText variant="captionMedium" style={{ color: activeTab === 'history' ? accentColor : colors.textTertiary, fontWeight: '600', marginLeft: 6 }}>
                History ({history.length})
              </AppText>
            </TouchableOpacity>
          </View>

          {activeTab === 'consult' ? (
            <>
              {/* About */}
              <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.sm }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={[s.cardIcon, { backgroundColor: accentColor + '12' }]}>
                    <AppIcon name="information-circle" size={18} color={accentColor} />
                  </View>
                  <AppText variant="heading3" style={{ color: colors.textPrimary }}>About</AppText>
                </View>
                <AppText variant="body" style={{ color: colors.textSecondary, lineHeight: 22 }}>
                  {agent.systemPrompt.split('\n')[0].replace(/you are a/i, 'A').replace(/\.$/, '')}.
                  Dedicated to providing expert, private, and secure healthcare guidance.
                </AppText>
              </View>

              {/* Quick topics */}
              <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.sm }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={[s.cardIcon, { backgroundColor: accentColor + '12' }]}>
                    <AppIcon name="flash" size={18} color={accentColor} />
                  </View>
                  <AppText variant="heading3" style={{ color: colors.textPrimary }}>Quick Topics</AppText>
                </View>
                {theme.prompts.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.topicRow, { borderColor: colors.borderLight }]}
                    onPress={() => {
                      setConcern(p.prompt);
                      setActiveTab('consult');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[s.topicDot, { backgroundColor: accentColor }]} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '600' }}>{p.title}</AppText>
                      <AppText variant="caption" style={{ color: colors.textTertiary, marginTop: 1 }}>{p.sub}</AppText>
                    </View>
                    <AppIcon name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Consultation form */}
              <View style={[s.formCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.sm }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <View style={[s.cardIcon, { backgroundColor: accentColor + '12' }]}>
                    <AppIcon name="chatbubble-ellipses" size={18} color={accentColor} />
                  </View>
                  <AppText variant="heading3" style={{ color: colors.textPrimary }}>Start Consultation</AppText>
                </View>
                <AppText variant="caption" style={{ color: colors.textTertiary, marginBottom: 16 }}>
                  Describe your symptoms or concerns to get personalized guidance.
                </AppText>

                <AppInput
                  placeholder={`E.g., ${theme.prompts[0]?.prompt || 'Describe your concern...'}`}
                  value={concern}
                  onChangeText={setConcern}
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 100, textAlignVertical: 'top' }}
                  inputContainerStyle={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight }}
                />

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleStartConsultation}
                  style={[s.startBtn, { backgroundColor: accentColor }]}
                >
                  <AppText variant="button" style={{ color: '#fff', fontSize: 16 }}>
                    {concern.trim() ? 'Start Consultation' : 'Skip & Start'}
                  </AppText>
                  <AppIcon name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* History Tab */
            <>
              {history.length === 0 ? (
                <View style={s.emptyHistory}>
                  <View style={[s.emptyHistIcon, { backgroundColor: accentColor + '12' }]}>
                    <AppIcon name="chatbubbles" size={32} color={accentColor} />
                  </View>
                  <AppText variant="bodyMedium" style={{ color: colors.textPrimary, marginTop: 16, fontWeight: '600' }}>
                    No conversations yet
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textTertiary, marginTop: 4, textAlign: 'center' }}>
                    Start your first consultation with {agent.displayName}
                  </AppText>
                  <TouchableOpacity
                    onPress={() => setActiveTab('consult')}
                    style={[s.emptyHistBtn, { backgroundColor: accentColor }]}
                  >
                    <AppIcon name="add" size={18} color="#fff" />
                    <AppText variant="captionMedium" style={{ color: '#fff', fontWeight: '700', marginLeft: 4 }}>
                      Start Now
                    </AppText>
                  </TouchableOpacity>
                </View>
              ) : (
                history.map((item, i) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.historyCard, {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                      ...shadows.sm,
                      borderTopLeftRadius: i === 0 ? 16 : 0,
                      borderTopRightRadius: i === 0 ? 16 : 0,
                      borderBottomLeftRadius: i === history.length - 1 ? 16 : 0,
                      borderBottomRightRadius: i === history.length - 1 ? 16 : 0,
                    }]}
                    onPress={() => handleOpenHistory(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.histIcon, { backgroundColor: accentColor + '12' }]}>
                      <AppIcon name="chatbubble" size={16} color={accentColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '600' }} numberOfLines={1}>
                        {item.title}
                      </AppText>
                      {item.lastPreview ? (
                        <AppText variant="caption" style={{ color: colors.textTertiary, marginTop: 2 }} numberOfLines={2}>
                          {item.lastPreview}
                        </AppText>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <AppText variant="small" style={{ color: colors.textTertiary }}>
                          {formatDate(item.updatedAt)}
                        </AppText>
                        {item.messageCount > 0 ? (
                          <View style={[s.msgCountBadge, { backgroundColor: accentColor + '12' }]}>
                            <AppText variant="small" style={{ color: accentColor, fontWeight: '600', fontSize: 10 }}>
                              {item.messageCount} msgs
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <AppIcon name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
  },
  capsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  capChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  // Cards
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  // Topics
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  topicDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // History
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 20,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  histIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
});

export default AgentProfileScreen;

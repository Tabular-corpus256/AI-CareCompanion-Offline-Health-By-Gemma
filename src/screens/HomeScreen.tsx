import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '@theme';
import { AppText } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { useHealthProfile } from '../context/HealthProfileContext';
import { DatabaseService } from '@services/DatabaseService';
import { LlmService } from '@services/LlmService';
import { AuthService } from '@services/FirebaseService';
import { RecommendationService } from '@services/RecommendationService';
import type { DynamicRecommendation } from '@services/RecommendationService';
import { SideMenu } from '@components/SideMenu';
import { RecDetailModal } from '@components/RecDetailModal';
import { useVoiceInput } from '@hooks/useVoiceInput';
import type { Conversation } from '@types';

const AI_AGENTS = [
  {
    icon: 'medical',
    name: 'General Health',
    status: 'Active',
    statusColor: '#00B894',
    desc: 'Your primary health assistant for any health concerns.',
    bgColor: '#0D7C66',
    agentId: 'general_practice',
  },
  {
    icon: 'nutrition',
    name: 'Nutritionist',
    status: 'Online',
    statusColor: '#00B894',
    desc: 'Get personalized diet plans and nutrition advice.',
    bgColor: '#00B894',
    agentId: 'nutrition_dietetics',
  },
  {
    icon: 'pulse',
    name: 'Respiratory Care',
    status: 'Online',
    statusColor: '#00B894',
    desc: 'Expert guidance for lung health and breathing issues.',
    bgColor: '#3498DB',
    agentId: 'pulmonology',
  },
  {
    icon: 'brain',
    name: 'Mental Wellness',
    status: 'Online',
    statusColor: '#00B894',
    desc: 'Support for stress, anxiety, sleep and mental well-being.',
    bgColor: '#E84393',
    agentId: 'psychiatry',
  },
];

const FALLBACK_RECOMMENDATIONS: DynamicRecommendation[] = [
  {
    title: 'Improve your sleep quality',
    sub: '7 day plan',
    icon: 'moon',
    bgColor: '#1A1B4B',
    textColor: '#FFFFFF',
    accentColor: '#1DB589',
    agentId: 'sleep_medicine',
    description: 'Quality sleep is the foundation of good health. Adults need 7-9 hours per night for optimal physical recovery, immune function, and mental clarity.',
    steps: ['Set a consistent bedtime every night', 'Avoid screens 1 hour before bed', 'Keep your bedroom cool and dark', 'Avoid caffeine after 2 PM'],
  },
  {
    title: 'Balanced diet for better energy',
    sub: 'Personalized plan',
    icon: 'nutrition',
    bgColor: '#FFF5EB',
    textColor: '#1A1B2E',
    accentColor: '#F39C12',
    agentId: 'nutrition_dietetics',
    description: 'A balanced diet rich in whole foods gives your body the nutrients it needs for sustained energy, immune support, and long-term disease prevention.',
    steps: ['Add vegetables to every meal', 'Replace refined carbs with whole grains', 'Drink 8 glasses of water daily', 'Limit processed and fried foods'],
  },
  {
    title: 'Manage stress and anxiety',
    sub: 'Guided program',
    icon: 'self-improvement',
    bgColor: '#E8FFF5',
    textColor: '#1A1B2E',
    accentColor: '#00B894',
    agentId: 'psychiatry',
    description: 'Chronic stress affects your heart, immune system, and mental health. Building daily habits to manage stress can significantly improve your quality of life.',
    steps: ['Practice 10 min mindful breathing daily', 'Take short walks between work sessions', 'Journal your thoughts for 5 minutes', 'Limit news and social media intake'],
  },
];

const AGENT_ICON_COLORS: Record<string, { icon: string; color: string }> = {
  orchestrator: { icon: 'medical', color: '#0D7C66' },
  general_practice: { icon: 'medical', color: '#0D7C66' },
  paediatrics: { icon: 'child-care', color: '#00B894' },
  cardiology: { icon: 'heart', color: '#E74C3C' },
  dermatology: { icon: 'face', color: '#F39C12' },
  neurology: { icon: 'brain', color: '#9B59B6' },
  psychiatry: { icon: 'self-improvement', color: '#0D7C66' },
  nutrition_dietetics: { icon: 'nutrition', color: '#00B894' },
  pulmonology: { icon: 'pulse', color: '#3498DB' },
};

export function HomeScreen() {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useHealthProfile();
  const [menuVisible, setMenuVisible] = useState(false);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [recommendations, setRecommendations] = useState<DynamicRecommendation[]>(FALLBACK_RECOMMENDATIONS);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [selectedRec, setSelectedRec] = useState<DynamicRecommendation | null>(null);
  const [searchText, setSearchText] = useState('');
  const { voiceState, transcript, startListening, stopListening } = useVoiceInput();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Check network connectivity
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const res = await fetch('https://www.google.com', { method: 'HEAD' });
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRecentChats = useCallback(async () => {
    try {
      const userId = DatabaseService.getCurrentUserId();
      if (!userId) return;
      const rows = await DatabaseService.query<Conversation>(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 3',
        [userId],
      );
      setRecentChats(rows);
    } catch (e) {
      console.warn('[HomeScreen] loadRecentChats failed:', e);
    }
  }, []);

  const generateRecommendations = useCallback(async (forceRefresh = false) => {
    if (loadingRecs) return;
    try {
      const userId = DatabaseService.getCurrentUserId();
      if (!userId || userId === 'local') return;

      if (!forceRefresh) {
        const cached = await RecommendationService.getCachedRecommendations(userId);
        if (cached) {
          setRecommendations(cached);
          return;
        }
      }

      // Cache miss or forced refresh — generate from chat history via LLM
      const msgs = await DatabaseService.query<{ content: string; role: string }>(
        'SELECT content, role FROM agent_chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20',
        [userId],
      );
      if (msgs.length < 3) return;
      setLoadingRecs(true);
      const history = msgs
        .reverse()
        .map(m => `${m.role === 'user' ? 'Patient' : 'Doctor'}: ${m.content.slice(0, 150)}`)
        .join('\n');
      const prompt = `Based on this recent health conversation, generate exactly 3 personalised health recommendations as a JSON array. Each item must have: title (max 8 words), sub (max 4 words e.g. "7 day plan"), icon (one of: heart, pulse, nutrition, brain, moon, fitness-center, self-improvement, medical, spa, eco, healing), bgColor (hex), textColor (hex with good contrast), accentColor (hex), agentId (one of: general_practice, nutrition_dietetics, pulmonology, psychiatry, cardiology, dermatology, neurology, paediatrics), description (2-3 sentences of personalized health advice about this recommendation), steps (array of 3-4 short action items max 10 words each). Output ONLY the JSON array, no other text.\n\nConversation:\n${history}`;
      const result = await LlmService.generateResponse(prompt);
      if (result.ok) {
        const jsonMatch = result.data.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as DynamicRecommendation[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const recs = parsed.slice(0, 3);
            setRecommendations(recs);
            // Persist so next focus hit uses cache
            RecommendationService.cacheRecommendations(userId, recs).catch(() => {});
          }
        }
      }
    } catch {
      // non-fatal — keep fallback
    } finally {
      setLoadingRecs(false);
    }
  }, [loadingRecs]);

  // Reload recent chats and regenerate recommendations every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      loadRecentChats();
      generateRecommendations();
    }, [loadRecentChats, generateRecommendations]),
  );

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firebaseName = AuthService.getCurrentUser()?.displayName ?? '';
  const userName = profile.name || firebaseName || 'User';

  const formatChatTime = (ts: number): string => {
    if (!ts || isNaN(ts)) return '';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return new Date(ts).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
    }
    if (hours < 48) return 'Yesterday';
    return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  const getAgentInfo = (agentId?: string) => {
    if (!agentId) return { icon: 'medical', color: '#0D7C66' };
    for (const key in AGENT_ICON_COLORS) {
      if (agentId.toLowerCase().includes(key)) return AGENT_ICON_COLORS[key];
    }
    return { icon: 'medical', color: '#0D7C66' };
  };

  useEffect(() => {
    if (transcript) setSearchText(transcript);
  }, [transcript]);

  const handleSubmit = useCallback(() => {
    const text = searchText.trim();
    if (!text) {
      (navigation as any).navigate('ChatTab');
      return;
    }
    setSearchText('');
    navigation.navigate('AgentChat', { agentId: 'orchestrator', initialMessage: text });
  }, [searchText, navigation]);

  const navigateToChat = () => {
    (navigation as any).navigate('ChatTab');
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNewChat={() => {
          setMenuVisible(false);
          navigateToChat();
        }}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.greetingRow}>
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={() => setMenuVisible(true)}
              >
                <AppIcon name="menu" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <AppText variant="heading2" style={{ color: colors.textPrimary, fontWeight: '800' }}>
                  {greeting()}, {userName.split(' ')[0]} 👋
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: isOnline ? '#00B894' : '#e74c3c' }} />
                  <AppText variant="small" style={{ color: isOnline ? '#00B894' : '#e74c3c', fontWeight: '600' }}>
                    {isOnline ? 'Online · Gemini AI Active' : 'Offline · Limited Mode'}
                  </AppText>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.avatar, { backgroundColor: colors.primary }]}
                onPress={() => {
                  (navigation as any).navigate('ProfileTab');
                }}
              >
                <AppText variant="bodyMedium" style={{ color: '#fff', fontWeight: '700' }}>
                  {userName.charAt(0).toUpperCase()}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Functional search / chat input bar */}
        <View style={[styles.searchBar, {
          backgroundColor: colors.surface,
          borderColor: searchText.length > 0 ? colors.primary : colors.borderLight,
          ...shadows.sm,
        }]}>
          <TouchableOpacity style={styles.searchPlus} onPress={navigateToChat} activeOpacity={0.7}>
            <AppIcon name="add" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <TextInput
            style={{ flex: 1, paddingHorizontal: 8, color: colors.textPrimary, fontSize: 15, paddingVertical: 0 }}
            placeholder="Ask anything about your health..."
            placeholderTextColor={colors.textTertiary}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            blurOnSubmit
          />
          {voiceState === 'listening' ? (
            <TouchableOpacity
              style={[styles.searchMic, { backgroundColor: colors.error }]}
              onPress={stopListening}
              activeOpacity={0.8}
            >
              <AppIcon name="stop" size={18} color="#fff" />
            </TouchableOpacity>
          ) : searchText.trim().length > 0 ? (
            <TouchableOpacity
              style={[styles.searchMic, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <AppIcon name="send" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.searchMic, { backgroundColor: colors.primary }]}
              onPress={() => startListening()}
              activeOpacity={0.8}
            >
              <AppIcon
                name={voiceState === 'processing' ? 'hourglass' : 'mic'}
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Visual AI Analysis banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ImageAnalysis')}
          style={[styles.visionBanner, { borderRadius: borderRadius.xl }]}
        >
          {/* Left gradient blob */}
          <View style={styles.visionBlobLeft} />
          <View style={styles.visionBlobRight} />

          <View style={styles.visionIconCol}>
            <View style={styles.visionIconRing}>
              <View style={styles.visionIconInner}>
                <AppIcon name="camera" size={26} color="#fff" />
              </View>
            </View>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText style={styles.visionTitle}>Visual AI Analysis</AppText>
            <AppText style={styles.visionSub}>
              Analyze skin, X-rays, lab reports, wounds &amp; more
            </AppText>
            <View style={styles.visionTagRow}>
              {['Skin', 'X-Ray', 'Lab', '+ 5 more'].map(tag => (
                <View key={tag} style={styles.visionTag}>
                  <AppText style={styles.visionTagText}>{tag}</AppText>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.visionArrow}>
            <AppIcon name="chevron-right" size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Recommended for you — dynamically generated from chat history */}
        <View style={styles.sectionHeader}>
          <AppText variant="heading3" style={{ color: colors.textPrimary, fontWeight: '700' }}>
            Recommended for you
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {loadingRecs ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <TouchableOpacity onPress={() => generateRecommendations(true)}>
                <AppIcon name="refresh" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('Recommendations')}>
              <AppText variant="captionMedium" style={{ color: colors.primary }}>View all</AppText>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recsRow}>
          {recommendations.map((rec, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.recCard, { backgroundColor: rec.bgColor || colors.surface }]}
              activeOpacity={0.8}
              onPress={() => setSelectedRec(rec)}
            >
              <AppText variant="bodyMedium" style={{ color: rec.textColor || colors.textPrimary, fontWeight: '700', marginBottom: 4 }}>
                {rec.title}
              </AppText>
              <AppText variant="small" style={{ color: rec.textColor || colors.textSecondary, opacity: 0.7 }}>
                {rec.sub}
              </AppText>
              <View style={styles.recArrow}>
                <AppIcon name="chevron-right" size={16} color={rec.accentColor || colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* AI Health Agents */}
        <View style={styles.sectionHeader}>
          <AppText variant="heading3" style={{ color: colors.textPrimary, fontWeight: '700' }}>
            Your AI Health Agents
          </AppText>
          <TouchableOpacity onPress={() => navigation.navigate('AgentSelector')}>
            <AppText variant="captionMedium" style={{ color: colors.primary }}>View all 46</AppText>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agentsRow}>
          {AI_AGENTS.map((agent, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.agentCard, { backgroundColor: colors.surface, ...shadows.sm }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AgentChat', { agentId: agent.agentId })}
            >
              <View style={[styles.agentIconBg, { backgroundColor: agent.bgColor + '18' }]}>
                <View style={[styles.agentIconInner, { backgroundColor: agent.bgColor + '25' }]}>
                  <AppIcon name={agent.icon as any} size={28} color={agent.bgColor} />
                </View>
              </View>
              <AppText variant="captionMedium" style={{ color: colors.textPrimary, textAlign: 'center', marginTop: 10, fontWeight: '600' }}>
                {agent.name}
              </AppText>
              <View style={[styles.statusBadge, { backgroundColor: agent.statusColor + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: agent.statusColor }]} />
                <AppText variant="small" style={{ color: agent.statusColor, fontWeight: '600' }}>
                  {agent.status}
                </AppText>
              </View>
              <AppText
                variant="small"
                numberOfLines={2}
                style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 4, paddingHorizontal: 4, lineHeight: 16 }}
              >
                {agent.desc}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent Chats - from actual DB (3 most recent) */}
        <View style={styles.sectionHeader}>
          <AppText variant="heading3" style={{ color: colors.textPrimary, fontWeight: '700' }}>
            Recent Chats
          </AppText>
          <TouchableOpacity onPress={() => (navigation as any).navigate('ChatTab', { openHistory: true })}>
            <AppText variant="captionMedium" style={{ color: colors.primary }}>View all</AppText>
          </TouchableOpacity>
        </View>

        {recentChats.length === 0 ? (
          <View style={[styles.recentChats, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={styles.emptyChats}>
              <AppIcon name="chatbubbles" size={28} color={colors.textTertiary} />
              <AppText variant="body" style={{ color: colors.textTertiary, marginTop: 8 }}>
                No conversations yet
              </AppText>
              <AppText variant="small" style={{ color: colors.textTertiary, marginTop: 2 }}>
                Start chatting with our AI specialists
              </AppText>
            </View>
          </View>
        ) : (
          <View style={[styles.recentChats, { backgroundColor: colors.surface, ...shadows.sm }]}>
            {recentChats.map((chat, i) => {
              const agentInfo = getAgentInfo(chat.agentId);
              return (
                <TouchableOpacity
                  key={chat.id}
                  style={[
                    styles.chatRow,
                    i < recentChats.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    (navigation as any).navigate('ChatTab');
                  }}
                >
                  <View style={[styles.chatIcon, { backgroundColor: agentInfo.color + '15' }]}>
                    <AppIcon name={agentInfo.icon as any} size={20} color={agentInfo.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '600' }} numberOfLines={1}>
                      {chat.title || 'New Chat'}
                    </AppText>
                    <AppText variant="small" style={{ color: colors.textTertiary, marginTop: 2 }} numberOfLines={1}>
                      {chat.lastPreview || 'General Health'} · {formatChatTime(chat.updatedAt)}
                    </AppText>
                  </View>
                  <AppIcon name="chevron-right" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <RecDetailModal
        rec={selectedRec}
        visible={selectedRec !== null}
        onClose={() => setSelectedRec(null)}
        onStartChat={(agentId) =>
          agentId ? navigation.navigate('AgentChat', { agentId }) : navigateToChat()
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    height: 52,
  },
  searchPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchMic: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  agentsRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  agentCard: {
    width: 150,
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
  },
  agentIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    marginTop: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recsRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  recCard: {
    width: 180,
    padding: 16,
    borderRadius: 18,
    minHeight: 120,
  },
  recArrow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentChats: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  chatIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChats: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },

  // Vision banner
  visionBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    backgroundColor: '#0D7C66',
  },
  visionBlobLeft: {
    position: 'absolute',
    left: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  visionBlobRight: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  visionIconCol: { alignItems: 'center' },
  visionIconRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visionIconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  visionSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 17,
  },
  visionTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  visionTag: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  visionTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  visionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;

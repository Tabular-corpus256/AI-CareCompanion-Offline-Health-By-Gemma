import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useRoute,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '@theme';
import { LlmService } from '@services/LlmService';
import { DatabaseService } from '@services/DatabaseService';
import { ChatSidebar } from '@components/ChatSidebar';
import { SplashScreen } from '@screens/SplashScreen';
import { AuthGate } from '@components/AuthGate';
import { BiometricGate } from '@components/BiometricGate';
import { OnboardingScreen } from '@screens/OnboardingScreen';
import { HomeScreen } from '@screens/HomeScreen';
import { ChatScreen } from '@screens/ChatScreen';
import { SettingsScreen } from '@screens/SettingsScreen';
import { HealthMetricsDashboard } from '@screens/HealthMetricsDashboard';
import { AddMedicationScreen } from '@screens/AddMedicationScreen';
import { MedicationDetailScreen } from '@screens/MedicationDetailScreen';
import { DrugInfoScreen } from '@screens/DrugInfoScreen';
import { AffordableAlternativesScreen } from '@screens/AffordableAlternativesScreen';
import { EmergencySOSScreen } from '@screens/EmergencySOSScreen';
import { FirstAidGuideScreen } from '@screens/FirstAidGuideScreen';
import { FindNearbyDoctorScreen } from '@screens/FindNearbyDoctorScreen';
import { AgentSelectorScreen } from '@screens/AgentSelectorScreen';
import { HealthProfileScreen } from '@screens/HealthProfileScreen';
import { ReminderScheduleScreen } from '@screens/ReminderScheduleScreen';
import { LanguageSelectionScreen } from '@screens/LanguageSelectionScreen';
import { AgentProfileScreen } from '@screens/AgentProfileScreen';
import { RecommendationsScreen } from '@screens/RecommendationsScreen';
import { ModelManagerScreen } from '@screens/ModelManagerScreen';
import { ImageAnalysisScreen } from '@screens/ImageAnalysisScreen';
import { ChatReportsScreen } from '@screens/ChatReportsScreen';
import { AuthService, SyncService } from '@services/FirebaseService';
import { NetworkService } from '@services/NetworkService';
import { ModelManager } from '@services/ModelManager';
import { AppIcon } from '@components/AppIcon';
import { SyncStatusBar } from '@components/SyncStatusBar';
import { getAgentById } from '../data/agents';

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  AgentChat: { agentId: string; initialMessage?: string };
  AddMedication: { medicationId?: string };
  MedicationDetail: { medicationId: string };
  DrugInfo: undefined;
  AffordableAlternatives: { drugName?: string };
  EmergencySOS: undefined;
  FirstAidGuide: undefined;
  FindNearbyDoctor: undefined;
  AgentSelector: undefined;
  HealthProfile: undefined;
  ReminderSchedule: undefined;
  LanguageSelection: undefined;
  AgentProfile: { agentId: string };
  Recommendations: undefined;
  ModelManager: undefined;
  ImageAnalysis: undefined;
  ChatReports: { conversationId: string; conversationTitle?: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  ChatTab: { openHistory?: boolean } | undefined;
  InsightsTab: undefined;
  HealthTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function ChatTabScreen() {
  const { colors } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [convId, setConvId] = useState('');
  const [ready, setReady] = useState(false);
  const route = useRoute<RouteProp<MainTabParamList, 'ChatTab'>>();

  // Auto-open history sidebar when navigated with openHistory param
  useEffect(() => {
    if ((route.params as any)?.openHistory) {
      setSidebarVisible(true);
    }
  }, [(route.params as any)?.openHistory]);

  useEffect(() => {
    (async () => {
      await DatabaseService.init();
      await LlmService.refreshModelStatus();
      await LlmService.fetchModels();
      await LlmService.loadPersistedModel();
      const userId = DatabaseService.getCurrentUserId();
      const conv = await DatabaseService.query<{ id: string }>(
        'SELECT id FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
        [userId],
      );
      if (conv.length > 0) {
        setConvId(conv[0].id);
      } else {
        const id = DatabaseService.uuid();
        const now = Date.now();
        await DatabaseService.execute(
          'INSERT INTO conversations (id, title, created_at, updated_at, agent_id, user_id) VALUES (?,?,?,?,?,?)',
          [id, 'New Chat', now, now, 'orchestrator', userId],
        );
        // Sync new conversation to Firestore
        if (AuthService.userId) {
          SyncService.pushEntity(AuthService.userId, 'conversations', id, {
            title: 'New Chat',
            createdAt: now,
            agentId: 'orchestrator',
          });
        }
        setConvId(id);
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ChatSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeConversationId={convId}
        onSelectConversation={setConvId}
        onNewChat={async () => {
          const id = DatabaseService.uuid();
          const now = Date.now();
          const userId = DatabaseService.getCurrentUserId();
          await DatabaseService.execute(
            'INSERT INTO conversations (id, title, created_at, updated_at, agent_id, user_id) VALUES (?,?,?,?,?,?)',
            [
              id,
              'New Chat',
              now,
              now,
              'orchestrator',
              userId,
            ],
          );
          // Sync new conversation to Firestore
          if (AuthService.userId) {
            SyncService.pushEntity(AuthService.userId, 'conversations', id, {
              title: 'New Chat',
              createdAt: now,
              agentId: 'orchestrator',
            });
          }
          setConvId(id);
        }}
      />
      <ChatScreen
        conversationId={convId}
        onMenuOpen={() => setSidebarVisible(true)}
      />
    </>
  );
}

const TAB_ICON_MAP: Record<string, { active: string; inactive: string }> = {
  HomeTab:     { active: 'home',        inactive: 'home-outline' },
  ChatTab:     { active: 'chatbubble',  inactive: 'chatbubble-outline' },
  InsightsTab: { active: 'bulb',        inactive: 'bulb-outline' },
  HealthTab:   { active: 'person',      inactive: 'person-outline' },
};

function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Edge-to-edge (RN 0.75+): tab bar must grow to cover the system nav bar
  const NAV_BAR_EXTRA = Platform.OS === 'android' ? insets.bottom : 0;
  const TAB_BAR_BASE  = Platform.OS === 'ios' ? 60 : 56;
  const TAB_BAR_HEIGHT = TAB_BAR_BASE + NAV_BAR_EXTRA;

  return (
    <View style={{ flex: 1 }}>
      <SyncStatusBar />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
            borderTopWidth: 1,
            elevation: 12,
            shadowColor: '#0D7C66',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            // Height covers the system nav bar on edge-to-edge Android
            height: Platform.OS === 'ios' ? 84 : TAB_BAR_HEIGHT,
            // Push icon+label up so they sit in the visible portion
            paddingBottom: Platform.OS === 'ios' ? 24 : NAV_BAR_EXTRA + 6,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
          tabBarIcon: ({ focused }) => {
            const icons = TAB_ICON_MAP[route.name] ?? { active: 'circle', inactive: 'circle-outline' };
            return (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: focused ? colors.primaryMuted : 'transparent',
                }}
              >
                <AppIcon
                  name={focused ? icons.active : icons.inactive}
                  size={21}
                  color={focused ? colors.primary : colors.textTertiary}
                />
              </View>
            );
          },
        })}
      >
        <Tab.Screen name="HomeTab"     component={HomeScreen}            options={{ tabBarLabel: 'Home' }} />
        <Tab.Screen name="ChatTab"     component={ChatTabScreen}         options={{ tabBarLabel: 'Chat' }} />
        <Tab.Screen name="InsightsTab" component={RecommendationsScreen} options={{ tabBarLabel: 'Insights' }} />
        <Tab.Screen name="HealthTab"   component={HealthProfileScreen}   options={{ tabBarLabel: 'Profile' }} />
      </Tab.Navigator>
    </View>
  );
}

export function AppNavigator() {
  const { colors, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [biometricUnlocked, setBiometricUnlocked] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const authenticatedRef = useRef(authenticated);
  authenticatedRef.current = authenticated;

  useEffect(() => {
    (async () => {
      try {
        await DatabaseService.init();
        // Check whether the offline model file already exists on disk so
        // ModelManagerScreen shows the correct status on first open.
        await ModelManager.init();
      } catch {}
      setBiometricUnlocked(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AuthService.init();
        DatabaseService.setCurrentUserId(AuthService.userId || null);
        if (AuthService.isSignedIn) setAuthenticated(true);
      } catch (err) {
        console.warn('Auth init failed:', err);
      }
      setAuthChecking(false);
    })();
  }, []);

  useEffect(() => {
    const unsub = AuthService.onAuthStateChange(user => {
      const userId = user?.uid || null;
      DatabaseService.setCurrentUserId(userId);
      NetworkService.setUserId(userId);
      if (userId) {
        setAuthenticated(true);
        // Flush outbox then pull all entities on login
        SyncService.flushOutbox(userId).catch(e =>
          console.warn('[AppNavigator] flushOutbox failed:', e),
        );
        SyncService.syncAll(userId).catch(e =>
          console.warn('[AppNavigator] syncAll failed:', e),
        );
        // Start background flush + foreground sync
        NetworkService.start(
          userId,
          uid => SyncService.syncAll(uid),
          uid => SyncService.flushOutbox(uid),
        );
      } else if (authenticatedRef.current) {
        NetworkService.stop();
        setAuthenticated(false);
      }
    });
    return () => { unsub(); NetworkService.stop(); };
  }, []);

  useEffect(() => {
    if (!authChecking && authenticated) {
      (async () => {
        const rows = await DatabaseService.query<{ value: string }>(
          "SELECT value FROM user_preferences WHERE key = 'has_seen_onboarding'",
        );
        setShowOnboarding(rows.length === 0);
      })();
    }
  }, [authChecking, authenticated]);

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  if (!biometricUnlocked)
    return <BiometricGate onUnlock={() => setBiometricUnlocked(true)} />;
  if (authChecking) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!authenticated) {
    return <AuthGate onAuthSuccess={() => setAuthenticated(true)} />;
  }
  if (showOnboarding === null) return null;
  if (showOnboarding) {
    return (
      <OnboardingScreen
        onDone={async () => {
          await DatabaseService.execute(
            "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('has_seen_onboarding', '1')",
          );
          setShowOnboarding(false);
        }}
      />
    );
  }

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: isDark ? colors.surfaceElevated : colors.surface,
      text: colors.textPrimary,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AgentChat" component={AgentChatScreen} />
        <Stack.Screen name="AddMedication" component={AddMedicationScreen} />
        <Stack.Screen
          name="MedicationDetail"
          component={MedicationDetailScreen}
        />
        <Stack.Screen name="DrugInfo" component={DrugInfoScreen} />
        <Stack.Screen
          name="AffordableAlternatives"
          component={AffordableAlternativesScreen}
        />
        <Stack.Screen name="EmergencySOS" component={EmergencySOSScreen} />
        <Stack.Screen name="FirstAidGuide" component={FirstAidGuideScreen} />
        <Stack.Screen
          name="FindNearbyDoctor"
          component={FindNearbyDoctorScreen}
        />
        <Stack.Screen name="AgentSelector" component={AgentSelectorScreen} />
        <Stack.Screen name="HealthProfile" component={HealthProfileScreen} />
        <Stack.Screen
          name="ReminderSchedule"
          component={ReminderScheduleScreen}
        />
        <Stack.Screen
          name="LanguageSelection"
          component={LanguageSelectionScreen}
        />
        <Stack.Screen name="AgentProfile" component={AgentProfileScreen} />
        <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
        <Stack.Screen name="ModelManager" component={ModelManagerScreen} />
        <Stack.Screen name="ImageAnalysis" component={ImageAnalysisScreen} />
        <Stack.Screen name="ChatReports" component={ChatReportsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Dedicated chat screen for a specific agent
function AgentChatScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'AgentChat'>>();
  const agentId = route.params?.agentId || 'orchestrator';
  const initialMessage = (route.params as any)?.initialMessage || '';
  const agent = getAgentById(agentId);
  const [convId, setConvId] = useState('');
  const [ready, setReady] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const id = DatabaseService.uuid();
      const now = Date.now();
      const title = agent?.displayName || 'Specialist Chat';
      await DatabaseService.execute(
        'INSERT INTO conversations (id, title, created_at, updated_at, agent_id, user_id) VALUES (?,?,?,?,?,?)',
        [
          id,
          title,
          now,
          now,
          agentId,
          DatabaseService.getCurrentUserId(),
        ],
      );
      // Sync conversation to Firestore
      if (AuthService.userId) {
        SyncService.pushEntity(AuthService.userId, 'conversations', id, {
          title,
          createdAt: now,
          agentId,
        });
      }
      setConvId(id);
      setReady(true);
    })();
  }, [agent?.displayName, agentId]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ChatSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeConversationId={convId}
        onSelectConversation={setConvId}
        onNewChat={async () => {
          const id = DatabaseService.uuid();
          const now = Date.now();
          const title = agent?.displayName || 'Specialist Chat';
          await DatabaseService.execute(
            'INSERT INTO conversations (id, title, created_at, updated_at, agent_id, user_id) VALUES (?,?,?,?,?,?)',
            [
              id,
              title,
              now,
              now,
              agentId,
              DatabaseService.getCurrentUserId(),
            ],
          );
          // Sync conversation to Firestore
          if (AuthService.userId) {
            SyncService.pushEntity(AuthService.userId, 'conversations', id, {
              title,
              createdAt: now,
              agentId,
            });
          }
          setConvId(id);
        }}
      />
      <ChatScreen
        conversationId={convId}
        onMenuOpen={() => setSidebarVisible(true)}
        forcedAgentId={agentId}
        initialMessage={initialMessage}
      />
    </>
  );
}

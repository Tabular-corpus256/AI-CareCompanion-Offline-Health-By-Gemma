import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useNavigationState, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '@theme';
import { AppText } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { DatabaseService } from '@services/DatabaseService';
import { RecommendationService } from '@services/RecommendationService';
import type { DynamicRecommendation } from '@services/RecommendationService';
import { RecDetailModal } from '@components/RecDetailModal';

const PAGE_SIZE = 30;

interface Section {
  title: string;
  data: DynamicRecommendation[];
}

function dayLabel(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const diffDays = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
      86400000,
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined });
}

function groupIntoSections(items: DynamicRecommendation[]): Section[] {
  const map: Map<string, DynamicRecommendation[]> = new Map();
  for (const item of items) {
    const label = dayLabel(item.createdAt ?? Date.now());
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function timeStr(ts: number): string {
  return new Date(ts).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
}

interface CardItemProps {
  rec: DynamicRecommendation;
  onPress: (rec: DynamicRecommendation) => void;
  colors: any;
  shadows: any;
}

function CardItem({ rec, onPress, colors, shadows }: CardItemProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}
      activeOpacity={0.75}
      onPress={() => onPress(rec)}
    >
      {/* Colored left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: rec.accentColor || colors.primary }]} />

      {/* Icon blob */}
      <View style={[styles.iconWrap, { backgroundColor: (rec.bgColor || colors.primaryMuted) + '22' }]}>
        <View style={[styles.iconInner, { backgroundColor: (rec.bgColor || colors.primaryMuted) + '44' }]}>
          <AppIcon name={rec.icon as any} size={22} color={rec.bgColor || colors.primary} />
        </View>
      </View>

      {/* Text content */}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            {rec.title}
          </AppText>
          {rec.createdAt ? (
            <AppText variant="small" style={{ color: colors.textTertiary, marginLeft: 8 }}>
              {timeStr(rec.createdAt)}
            </AppText>
          ) : null}
        </View>

        <View style={styles.subRow}>
          <View style={[styles.subBadge, { backgroundColor: (rec.accentColor || colors.primary) + '20' }]}>
            <AppText variant="small" style={{ color: rec.accentColor || colors.primary, fontWeight: '600' }}>
              {rec.sub}
            </AppText>
          </View>
          {rec.agentId ? (
            <AppText variant="small" style={{ color: colors.textTertiary, marginLeft: 6 }}>
              · {rec.agentId.replace(/_/g, ' ')}
            </AppText>
          ) : null}
        </View>

        {rec.description ? (
          <AppText variant="small" style={{ color: colors.textSecondary, marginTop: 6, lineHeight: 18 }} numberOfLines={2}>
            {rec.description}
          </AppText>
        ) : null}

        {rec.steps && rec.steps.length > 0 ? (
          <View style={styles.stepsPreview}>
            <AppIcon name="checkmark-circle" size={13} color={rec.accentColor || colors.primary} />
            <AppText variant="small" style={{ color: colors.textTertiary, marginLeft: 4 }}>
              {rec.steps.length} action step{rec.steps.length > 1 ? 's' : ''}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppIcon name="chevron-right" size={18} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  );
}

export function RecommendationsScreen() {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // When rendered as a bottom tab the route index is 0 (root of its navigator)
  const canGoBack = useNavigationState(state => state?.index > 0);

  const [search, setSearch] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedRec, setSelectedRec] = useState<DynamicRecommendation | null>(null);
  const offsetRef = useRef(0);
  const allItemsRef = useRef<DynamicRecommendation[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCards = useCallback(async (searchTerm: string, reset: boolean) => {
    const userId = DatabaseService.getCurrentUserId();
    if (!userId || userId === 'local') {
      setLoading(false);
      return;
    }
    const offset = reset ? 0 : offsetRef.current;
    const cards = await RecommendationService.getAllCards(userId, {
      search: searchTerm,
      limit: PAGE_SIZE,
      offset,
    });
    if (reset) {
      allItemsRef.current = cards;
    } else {
      allItemsRef.current = [...allItemsRef.current, ...cards];
    }
    offsetRef.current = offset + cards.length;
    setHasMore(cards.length === PAGE_SIZE);
    setSections(groupIntoSections(allItemsRef.current));
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadCards('', true);
      setLoading(false);
    })();
  }, [loadCards]);

  // Refresh when tab is focused (new cards may have been added via chat)
  useFocusEffect(
    useCallback(() => {
      if (allItemsRef.current.length > 0) {
        // Quiet refresh in background — don't show full loading spinner
        loadCards(search, true).catch(() => {});
      }
    }, [loadCards, search]),
  );

  const onSearchChange = useCallback(
    (text: string) => {
      setSearch(text);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(async () => {
        offsetRef.current = 0;
        allItemsRef.current = [];
        setLoading(true);
        await loadCards(text, true);
        setLoading(false);
      }, 320);
    },
    [loadCards],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    offsetRef.current = 0;
    allItemsRef.current = [];
    await loadCards(search, true);
    setRefreshing(false);
  }, [loadCards, search]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadCards(search, false);
    setLoadingMore(false);
  }, [loadCards, loadingMore, hasMore, search]);

  const totalCount = allItemsRef.current.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        {canGoBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <AppIcon name="chevron-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.backBtn, { alignItems: 'flex-start' }]}>
            <AppIcon name="bulb" size={22} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="heading3" style={{ color: colors.textPrimary, fontWeight: '800' }}>
            Health Insights
          </AppText>
          <AppText variant="small" style={{ color: colors.textTertiary, marginTop: 1 }}>
            {loading ? 'Loading…' : `${totalCount} recommendation${totalCount !== 1 ? 's' : ''}`}
          </AppText>
        </View>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]}>
          <AppIcon name="search" size={18} color={colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search recommendations…"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppIcon name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && sections.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centered}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
            <AppIcon name="sparkle" size={36} color={colors.primary} />
          </View>
          <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '700', marginTop: 16 }}>
            {search ? 'No results found' : 'No recommendations yet'}
          </AppText>
          <AppText variant="small" style={{ color: colors.textTertiary, marginTop: 6, textAlign: 'center', maxWidth: 260, lineHeight: 20 }}>
            {search
              ? 'Try different keywords'
              : 'Chat with an AI specialist — insights appear here automatically after each conversation.'}
          </AppText>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id ?? `${item.title}-${item.createdAt}`}
          renderItem={({ item }) => (
            <CardItem
              rec={item}
              onPress={setSelectedRec}
              colors={colors}
              shadows={shadows}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <AppText variant="captionMedium" style={{ color: colors.textTertiary, fontWeight: '700', letterSpacing: 0.6 }}>
                {section.title.toUpperCase()}
              </AppText>
              <View style={[styles.sectionLine, { backgroundColor: colors.borderLight }]} />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      <RecDetailModal
        rec={selectedRec}
        visible={selectedRec !== null}
        onClose={() => setSelectedRec(null)}
        onStartChat={(agentId) => {
          setSelectedRec(null);
          if (agentId) navigation.navigate('AgentChat', { agentId });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
  },
  iconWrap: {
    width: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  subBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stepsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
});

export default RecommendationsScreen;

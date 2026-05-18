import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme';
import { AppText } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { DrugInfoService } from '@services/DrugInfoService';
import type { DrugInfo, DrugSearchEntry } from '@services/DrugInfoService';
import { DatabaseService } from '@services/DatabaseService';

// ─── Drug Card ────────────────────────────────────────────────────────────────

interface WarningRowProps {
  icon: string;
  label: string;
  text: string;
  color: string;
}

function WarningRow({ icon, label, text, color }: WarningRowProps) {
  if (!text) return null;
  return (
    <View style={styles.warningRow}>
      <View style={[styles.warnIconWrap, { backgroundColor: color + '20' }]}>
        <AppIcon name={icon as any} size={14} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText
          variant="small"
          style={{ color, fontWeight: '700', fontSize: 11 }}
        >
          {label}
        </AppText>
        <AppText
          variant="small"
          style={{ color: '#555', lineHeight: 17, marginTop: 1 }}
          numberOfLines={3}
        >
          {text}
        </AppText>
      </View>
    </View>
  );
}

interface DrugCardProps {
  drug: DrugInfo;
  colors: any;
  shadows: any;
}

function isRx(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return (
    s.includes('rx') &&
    !s.includes('not') &&
    !s.includes('non') &&
    !s.includes('otc')
  );
}

function DrugCard({ drug, colors, shadows }: DrugCardProps) {
  const [expanded, setExpanded] = useState(false);
  const rx = isRx(drug.prescriptionStatus);
  const hasWarnings =
    drug.pregnancyWarning ||
    drug.alcoholWarning ||
    drug.breastfeedingWarning ||
    drug.foodWarning;
  const hasExtra = hasWarnings || drug.mechanismOfAction || drug.doseSchedule;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => hasExtra && setExpanded(e => !e)}
        style={styles.cardTop}
      >
        <View style={styles.cardMain}>
          {/* Name row */}
          <View style={styles.nameRow}>
            <AppText
              variant="bodyMedium"
              style={{
                color: colors.textPrimary,
                fontWeight: '700',
                flex: 1,
                lineHeight: 20,
              }}
              numberOfLines={2}
            >
              {drug.name}
            </AppText>
            <View
              style={[
                styles.rxBadge,
                { backgroundColor: rx ? '#FF6B6B20' : '#00B89420' },
              ]}
            >
              <AppText
                variant="small"
                style={{
                  color: rx ? '#D63031' : '#00B894',
                  fontWeight: '700',
                  fontSize: 10,
                }}
              >
                {rx ? 'Rx' : 'OTC'}
              </AppText>
            </View>
          </View>

          {/* Brand */}
          {drug.brandName ? (
            <AppText
              variant="small"
              style={{ color: colors.textTertiary, marginTop: 2 }}
              numberOfLines={1}
            >
              {drug.brandName}
            </AppText>
          ) : null}

          {/* Meta pills */}
          <View style={styles.metaRow}>
            {drug.activeIngredient ? (
              <View
                style={[
                  styles.metaPill,
                  { backgroundColor: colors.primaryMuted },
                ]}
              >
                <AppIcon name="medical" size={11} color={colors.primary} />
                <AppText
                  variant="small"
                  style={{
                    color: colors.primary,
                    fontWeight: '600',
                    fontSize: 11,
                    marginLeft: 3,
                  }}
                  numberOfLines={1}
                >
                  {drug.activeIngredient}
                </AppText>
              </View>
            ) : null}
            {drug.dosageForm ? (
              <View
                style={[
                  styles.metaPill,
                  { backgroundColor: colors.inputBackground },
                ]}
              >
                <AppText
                  variant="small"
                  style={{ color: colors.textSecondary, fontSize: 11 }}
                >
                  {drug.dosageForm}
                </AppText>
              </View>
            ) : null}
            {drug.administrationRoute ? (
              <View
                style={[
                  styles.metaPill,
                  { backgroundColor: colors.inputBackground },
                ]}
              >
                <AppText
                  variant="small"
                  style={{ color: colors.textSecondary, fontSize: 11 }}
                >
                  {drug.administrationRoute}
                </AppText>
              </View>
            ) : null}
          </View>

          {drug.availableStrength ? (
            <AppText
              variant="small"
              style={{ color: colors.textTertiary, marginTop: 4, fontSize: 12 }}
            >
              Strength: {drug.availableStrength}
            </AppText>
          ) : null}
        </View>

        {hasExtra ? (
          <AppIcon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textTertiary}
            style={{ alignSelf: 'flex-start', marginTop: 2 }}
          />
        ) : null}
      </TouchableOpacity>

      {expanded ? (
        <View
          style={[styles.cardExpanded, { borderTopColor: colors.borderLight }]}
        >
          {hasWarnings ? (
            <View style={styles.warningsSection}>
              <AppText
                variant="small"
                style={{
                  color: colors.textTertiary,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                Warnings
              </AppText>
              <WarningRow
                icon="heart"
                label="Pregnancy"
                text={drug.pregnancyWarning ?? ''}
                color="#E84393"
              />
              <WarningRow
                icon="wine"
                label="Alcohol"
                text={drug.alcoholWarning ?? ''}
                color="#E17055"
              />
              <WarningRow
                icon="person"
                label="Breastfeeding"
                text={drug.breastfeedingWarning ?? ''}
                color="#0984E3"
              />
              <WarningRow
                icon="nutrition"
                label="Food"
                text={drug.foodWarning ?? ''}
                color="#00B894"
              />
            </View>
          ) : null}

          {drug.mechanismOfAction ? (
            <View style={styles.expandSection}>
              <AppText
                variant="small"
                style={{
                  color: colors.textTertiary,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                Mechanism of Action
              </AppText>
              <AppText
                variant="small"
                style={{ color: colors.textSecondary, lineHeight: 18 }}
              >
                {drug.mechanismOfAction}
              </AppText>
            </View>
          ) : null}

          {drug.doseSchedule ? (
            <View style={styles.expandSection}>
              <AppText
                variant="small"
                style={{
                  color: colors.textTertiary,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                Dose Schedule
              </AppText>
              <AppText
                variant="small"
                style={{ color: colors.textSecondary, lineHeight: 18 }}
              >
                {drug.doseSchedule}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function DrugInfoScreen() {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<DrugInfo[]>([]);
  const [history, setHistory] = useState<DrugSearchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbUnavailable, setDbUnavailable] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const userId = DatabaseService.getCurrentUserId();

  const loadHistory = useCallback(async () => {
    const h = await DrugInfoService.getHistory(userId);
    setHistory(h);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const runSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;
      setLoading(true);
      setSubmittedQuery(q);
      setResults([]);
      setDbUnavailable(false);
      const items = await DrugInfoService.searchDrugs(q);
      setLoading(false);

      setResults(items);
      if (items.length === 0 && !DrugInfoService.isAvailable) {
        setDbUnavailable(true);
        return;
      }

      await DrugInfoService.saveSearch(userId, q, items.length);
      await loadHistory();
    },
    [userId, loadHistory],
  );

  const handleSearch = useCallback(() => {
    runSearch(input);
    inputRef.current?.blur();
  }, [input, runSearch]);

  const handleHistoryTap = useCallback(
    (entry: DrugSearchEntry) => {
      setInput(entry.query);
      runSearch(entry.query);
    },
    [runSearch],
  );

  const handleClearHistory = useCallback(async () => {
    await DrugInfoService.clearHistory(userId);
    setHistory([]);
  }, [userId]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    await DrugInfoService.deleteHistoryEntry(id);
    setHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  const showHistory = !submittedQuery && !loading;
  const showResults = !!submittedQuery && !loading;
  const showEmpty = showResults && results.length === 0 && !dbUnavailable;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <AppIcon name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText
            variant="heading3"
            style={{ color: colors.textPrimary, fontWeight: '800' }}
          >
            Drug Info
          </AppText>
          <AppText
            variant="small"
            style={{ color: colors.textTertiary, marginTop: 1 }}
          >
            1mg Medicine Database
          </AppText>
        </View>
        <View
          style={[styles.dbBadge, { backgroundColor: colors.primaryMuted }]}
        >
          <AppIcon name="library" size={13} color={colors.primary} />
          <AppText
            variant="small"
            style={{
              color: colors.primary,
              fontWeight: '600',
              fontSize: 10,
              marginLeft: 3,
            }}
          >
            1mg DB
          </AppText>
        </View>
      </View>

      {/* Search bar */}
      <View
        style={[
          styles.searchSection,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <AppIcon name="search" size={18} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Search by name, brand, or ingredient…"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {input.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setInput('');
                setSubmittedQuery('');
                setResults([]);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppIcon
                name="close-circle"
                size={16}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.searchBtn,
            { backgroundColor: loading ? colors.textTertiary : colors.primary },
          ]}
          onPress={handleSearch}
          disabled={loading || !input.trim()}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <AppText
              variant="bodyMedium"
              style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}
            >
              Search
            </AppText>
          )}
        </TouchableOpacity>
      </View>

      {/* DB unavailable banner */}
      {dbUnavailable ? (
        <View
          style={[
            styles.dbWarnBox,
            { backgroundColor: '#FFF3CD', borderColor: '#FFC107' },
          ]}
        >
          <AppIcon name="warning" size={16} color="#856404" />
          <AppText
            variant="small"
            style={{ color: '#856404', flex: 1, marginLeft: 8, lineHeight: 18 }}
          >
            Drug database not found. Place{' '}
            <AppText variant="small" style={{ fontWeight: '700' }}>
              1mg_medicines.db
            </AppText>{' '}
            in{' '}
            <AppText variant="small" style={{ fontWeight: '700' }}>
              android/app/src/main/assets/
            </AppText>{' '}
            and rebuild.
          </AppText>
        </View>
      ) : null}

      {/* Loading */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText
            variant="small"
            style={{ color: colors.textTertiary, marginTop: 12 }}
          >
            Searching medicines…
          </AppText>
        </View>
      ) : null}

      {/* History (when no search submitted) */}
      {showHistory && !loading ? (
        <View style={{ flex: 1 }}>
          {history.length > 0 ? (
            <>
              <View
                style={[
                  styles.historyHeader,
                  { borderBottomColor: colors.borderLight },
                ]}
              >
                <View style={styles.historyTitleRow}>
                  <AppIcon name="time" size={15} color={colors.textTertiary} />
                  <AppText
                    variant="captionMedium"
                    style={{
                      color: colors.textTertiary,
                      fontWeight: '700',
                      letterSpacing: 0.5,
                      marginLeft: 6,
                    }}
                  >
                    RECENT SEARCHES
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={handleClearHistory}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AppText
                    variant="small"
                    style={{ color: colors.primary, fontWeight: '600' }}
                  >
                    Clear all
                  </AppText>
                </TouchableOpacity>
              </View>
              <FlatList
                data={history}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.historyRow,
                      { borderBottomColor: colors.borderLight },
                    ]}
                    onPress={() => handleHistoryTap(item)}
                    activeOpacity={0.7}
                  >
                    <AppIcon
                      name="time-outline"
                      size={16}
                      color={colors.textTertiary}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <AppText
                        variant="bodyMedium"
                        style={{ color: colors.textPrimary, fontWeight: '600' }}
                      >
                        {item.query}
                      </AppText>
                      {item.resultCount > 0 ? (
                        <AppText
                          variant="small"
                          style={{ color: colors.textTertiary, marginTop: 1 }}
                        >
                          {item.resultCount} result
                          {item.resultCount !== 1 ? 's' : ''}
                        </AppText>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteEntry(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ padding: 4 }}
                    >
                      <AppIcon
                        name="close"
                        size={14}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                showsVerticalScrollIndicator={false}
              />
            </>
          ) : (
            <View style={styles.centered}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.primaryMuted },
                ]}
              >
                <AppIcon name="search" size={32} color={colors.primary} />
              </View>
              <AppText
                variant="bodyMedium"
                style={{
                  color: colors.textPrimary,
                  fontWeight: '700',
                  marginTop: 16,
                }}
              >
                Search Drug Information
              </AppText>
              <AppText
                variant="small"
                style={{
                  color: colors.textTertiary,
                  marginTop: 6,
                  textAlign: 'center',
                  maxWidth: 260,
                  lineHeight: 20,
                }}
              >
                Type a medicine name, brand, or active ingredient and press
                Search.
              </AppText>
            </View>
          )}
        </View>
      ) : null}

      {/* Empty results */}
      {showEmpty && !loading ? (
        <View style={styles.centered}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.inputBackground },
            ]}
          >
            <AppIcon
              name="close-circle"
              size={32}
              color={colors.textTertiary}
            />
          </View>
          <AppText
            variant="bodyMedium"
            style={{
              color: colors.textPrimary,
              fontWeight: '700',
              marginTop: 16,
            }}
          >
            No results for "{submittedQuery}"
          </AppText>
          <AppText
            variant="small"
            style={{
              color: colors.textTertiary,
              marginTop: 6,
              textAlign: 'center',
              maxWidth: 260,
              lineHeight: 20,
            }}
          >
            Try a different name, brand, or ingredient.
          </AppText>
        </View>
      ) : null}

      {/* Results */}
      {showResults && results.length > 0 && !loading ? (
        <>
          <View
            style={[
              styles.resultsHeader,
              { backgroundColor: colors.background },
            ]}
          >
            <AppText variant="small" style={{ color: colors.textTertiary }}>
              <AppText
                variant="small"
                style={{ color: colors.primary, fontWeight: '700' }}
              >
                {results.length}
              </AppText>
              {results.length === 30 ? '+' : ''} result
              {results.length !== 1 ? 's' : ''} for{' '}
              <AppText
                variant="small"
                style={{ fontWeight: '600', color: colors.textPrimary }}
              >
                "{submittedQuery}"
              </AppText>
            </AppText>
            {!DrugInfoService.isAvailable && (
              <AppText
                variant="small"
                style={{
                  color: colors.warning,
                  fontWeight: '600',
                  marginTop: 4,
                }}
              >
                Showing basic drug info (1mg database not found)
              </AppText>
            )}
          </View>
          <FlatList
            data={results}
            keyExtractor={(item, idx) => `${item.name}-${idx}`}
            renderItem={({ item }) => (
              <DrugCard drug={item} colors={colors} shadows={shadows} />
            )}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: insets.bottom + 24,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </>
      ) : null}
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
  dbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchBar: {
    flex: 1,
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
  searchBtn: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  dbWarnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Card styles
  card: {
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
  },
  cardMain: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rxBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardExpanded: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    gap: 12,
  },
  warningsSection: {
    gap: 6,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warnIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  expandSection: {
    gap: 2,
  },
});

export default DrugInfoScreen;

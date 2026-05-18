import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme';
import { DatabaseService } from '@services/DatabaseService';
import { AuthService, SyncService } from '@services/FirebaseService';
import { useHealthProfile } from '../context/HealthProfileContext';
import { SimpleBarChart, MetricCard } from '@components/SimpleChart';
import { AppIcon } from '@components/AppIcon';
import { AppText, AppInput, AppCard } from '@components/ui';
import type { HealthMetric } from '@types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const METRIC_TYPES: Array<{
  key: HealthMetric['type'];
  label: string;
  unit: string;
  icon: string;
  color: string;
  placeholder: string;
  emoji: string;
}> = [
  {
    key: 'blood_pressure',
    label: 'Blood Pressure',
    unit: 'mmHg',
    icon: 'favorite',
    color: '#E53935',
    placeholder: '120/80',
    emoji: '🫀',
  },
  {
    key: 'blood_glucose',
    label: 'Blood Glucose',
    unit: 'mg/dL',
    icon: 'water-drop',
    color: '#FB8C00',
    placeholder: '90',
    emoji: '🩸',
  },
  {
    key: 'heart_rate',
    label: 'Heart Rate',
    unit: 'bpm',
    icon: 'monitor-heart',
    color: '#E91E63',
    placeholder: '72',
    emoji: '💓',
  },
  {
    key: 'weight',
    label: 'Weight',
    unit: 'kg',
    icon: 'fitness-center',
    color: '#1E88E5',
    placeholder: '70',
    emoji: '⚖️',
  },
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    icon: 'thermostat',
    color: '#F4511E',
    placeholder: '37.0',
    emoji: '🌡️',
  },
  {
    key: 'oxygen_saturation',
    label: 'SpO₂',
    unit: '%',
    icon: 'air',
    color: '#00ACC1',
    placeholder: '98',
    emoji: '💨',
  },
  {
    key: 'bmi',
    label: 'BMI',
    unit: '',
    icon: 'straighten',
    color: '#7CB342',
    placeholder: '22.5',
    emoji: '📊',
  },
];

function getStatus(
  type: HealthMetric['type'],
  val: string,
): 'normal' | 'warning' | 'danger' {
  const v = parseFloat(val.split('/')[0]);
  if (isNaN(v)) return 'normal';
  if (type === 'blood_pressure') {
    const sys = parseFloat(val.split('/')[0]);
    if (sys >= 180) return 'danger';
    if (sys >= 140) return 'warning';
    return 'normal';
  }
  if (type === 'blood_glucose') {
    if (v > 200) return 'danger';
    if (v > 126) return 'warning';
    return 'normal';
  }
  if (type === 'heart_rate') {
    if (v > 120 || v < 40) return 'danger';
    if (v > 100 || v < 50) return 'warning';
    return 'normal';
  }
  if (type === 'oxygen_saturation') {
    if (v < 90) return 'danger';
    if (v < 95) return 'warning';
    return 'normal';
  }
  if (type === 'temperature') {
    if (v > 40) return 'danger';
    if (v > 37.5) return 'warning';
    return 'normal';
  }
  if (type === 'bmi') {
    if (v < 16 || v > 35) return 'danger';
    if (v < 18.5 || v > 30) return 'warning';
    return 'normal';
  }
  return 'normal';
}

const STATUS_COLORS = {
  normal: '#00B894',
  warning: '#F39C12',
  danger: '#E74C3C',
};

const STATUS_LABELS = {
  normal: 'Normal',
  warning: 'Attention',
  danger: 'Critical',
};

export function HealthMetricsDashboard() {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const navigation = useNavigation();
  const { profile } = useHealthProfile();
  const insets = useSafeAreaInsets();

  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [latestByType, setLatestByType] = useState<
    Partial<Record<HealthMetric['type'], HealthMetric>>
  >({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] =
    useState<HealthMetric['type']>('blood_pressure');
  const [newValue, setNewValue] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const loadMetrics = useCallback(async () => {
    try {
      const rows = await DatabaseService.query<any>(
        'SELECT * FROM health_metrics WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 200',
        [DatabaseService.getCurrentUserId()],
      );
      const typed: HealthMetric[] = rows.map(r => ({
        id: r.id,
        type: r.type,
        value: r.value,
        unit: r.unit,
        recordedAt: r.recorded_at,
        notes: r.notes,
        userId: r.user_id,
      }));
      setMetrics(typed);

      const latest: Partial<Record<HealthMetric['type'], HealthMetric>> = {};
      for (const m of typed) {
        if (!latest[m.type]) latest[m.type] = m;
      }
      setLatestByType(latest);
    } catch (e) {
      console.warn('[HealthMetrics] load failed:', e);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const openAdd = (type: HealthMetric['type']) => {
    setSelectedType(type);
    setNewValue('');
    setNewNotes('');
    setModalVisible(true);
  };

  const saveMetric = async () => {
    if (!newValue.trim()) return;
    const metaDef = METRIC_TYPES.find(m => m.key === selectedType)!;
    const id = DatabaseService.uuid();
    const now = Date.now();
    const userId = DatabaseService.getCurrentUserId();
    await DatabaseService.execute(
      'INSERT INTO health_metrics (id, type, value, unit, recorded_at, notes, user_id) VALUES (?,?,?,?,?,?,?)',
      [
        id,
        selectedType,
        newValue.trim(),
        metaDef.unit,
        now,
        newNotes.trim(),
        userId,
      ],
    );
    // Sync to Firestore
    if (AuthService.userId) {
      SyncService.pushEntity(AuthService.userId, 'health_metrics', id, {
        type: selectedType,
        value: newValue.trim(),
        unit: metaDef.unit,
        recordedAt: now,
        notes: newNotes.trim(),
      });
    }
    setModalVisible(false);
    loadMetrics();
  };

  // Chart data for blood glucose (last 7 readings)
  const glucoseHistory = metrics
    .filter(m => m.type === 'blood_glucose')
    .slice(0, 7)
    .reverse()
    .map(m => ({
      label: new Date(m.recordedAt).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
      }),
      value: parseFloat(m.value) || 0,
    }));

  const bpHistory = metrics
    .filter(m => m.type === 'blood_pressure')
    .slice(0, 7)
    .reverse()
    .map(m => ({
      label: new Date(m.recordedAt).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
      }),
      value: parseFloat(m.value.split('/')[0]) || 0,
    }));

  const bmi =
    profile.weightKg > 0 && profile.heightCm > 0
      ? profile.weightKg / Math.pow(profile.heightCm / 100, 2)
      : 0;

  const bmiCategory = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmiColor = bmi < 18.5 || bmi >= 30 ? '#F39C12' : bmi < 25 ? '#00B894' : '#FB8C00';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 16 }}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <AppText variant="heading1" style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 26 }}>
              Health Dashboard
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 4 }}>
              Track and monitor your vitals
            </AppText>
          </View>
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: colors.primaryMuted }]}
            onPress={() => openAdd('blood_pressure')}
          >
            <AppIcon name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* BMI Summary Card */}
        {bmi > 0 && (
          <View
            style={[
              s.bmiCard,
              {
                backgroundColor: colors.surface,
                borderRadius: 20,
                ...shadows.sm,
              },
            ]}
          >
            <View style={s.bmiLeft}>
              <View style={[s.bmiIconWrap, { backgroundColor: bmiColor + '15' }]}>
                <AppText variant="heading2" style={{ fontSize: 28 }}>📊</AppText>
              </View>
              <View>
                <AppText variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                  Your BMI
                </AppText>
                <AppText variant="heading1" style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 36, lineHeight: 40 }}>
                  {bmi.toFixed(1)}
                </AppText>
              </View>
            </View>
            <View style={s.bmiRight}>
              <View
                style={[
                  s.bmiCategoryBadge,
                  { backgroundColor: bmiColor + '15' },
                ]}
              >
                <View style={[s.bmiDot, { backgroundColor: bmiColor }]} />
                <AppText variant="captionMedium" style={{ color: bmiColor, fontWeight: '600' }}>
                  {bmiCategory}
                </AppText>
              </View>
              <View style={s.bmiStats}>
                <View style={[s.bmiStatPill, { backgroundColor: colors.primaryMuted }]}>
                  <AppText variant="small" style={{ color: colors.primary, fontWeight: '600' }}>
                    {profile.weightKg} kg
                  </AppText>
                </View>
                <View style={[s.bmiStatPill, { backgroundColor: colors.primaryMuted }]}>
                  <AppText variant="small" style={{ color: colors.primary, fontWeight: '600' }}>
                    {profile.heightCm} cm
                  </AppText>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Vital Signs Grid */}
        <AppText variant="captionMedium" color="secondary" style={s.sectionTitle}>
          Vital Signs
        </AppText>
        <View style={s.vitalsGrid}>
          {METRIC_TYPES.slice(0, 6).map(mt => {
            const latest = latestByType[mt.key];
            const status = latest ? getStatus(mt.key, latest.value) : 'normal';
            const statusColor = STATUS_COLORS[status];
            return (
              <TouchableOpacity
                key={mt.key}
                onPress={() => openAdd(mt.key)}
                activeOpacity={0.8}
                style={[
                  s.vitalCard,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: 18,
                    ...shadows.sm,
                    borderLeftWidth: 3,
                    borderLeftColor: latest ? statusColor : colors.borderLight,
                  },
                ]}
              >
                <View style={s.vitalTop}>
                  <View style={[s.vitalIconWrap, { backgroundColor: mt.color + '12' }]}>
                    <AppIcon name={mt.icon} size={18} color={mt.color} />
                  </View>
                  {latest && (
                    <View style={[s.statusTag, { backgroundColor: statusColor + '15' }]}>
                      <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                      <AppText variant="small" style={{ color: statusColor, fontWeight: '600', fontSize: 10 }}>
                        {STATUS_LABELS[status]}
                      </AppText>
                    </View>
                  )}
                </View>
                <AppText variant="small" style={{ color: colors.textTertiary, marginTop: 8, fontWeight: '500' }}>
                  {mt.label}
                </AppText>
                <View style={s.vitalValueRow}>
                  <AppText variant="heading2" style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 22 }}>
                    {latest ? latest.value : '—'}
                  </AppText>
                  {mt.unit && latest ? (
                    <AppText variant="caption" style={{ color: colors.textTertiary, marginLeft: 4 }}>
                      {mt.unit}
                    </AppText>
                  ) : null}
                </View>
                {!latest && (
                  <View style={[s.addBtn, { backgroundColor: mt.color + '12' }]}>
                    <AppIcon name="add" size={14} color={mt.color} />
                    <AppText variant="small" style={{ color: mt.color, fontWeight: '600', marginLeft: 4 }}>
                      Add
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Blood Glucose Chart */}
        {glucoseHistory.length > 1 && (
          <View style={[s.chartCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={s.chartHeader}>
              <View>
                <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  Blood Glucose Trend
                </AppText>
                <AppText variant="small" style={{ color: colors.textTertiary, marginTop: 2 }}>
                  Last {glucoseHistory.length} readings
                </AppText>
              </View>
              <View style={[s.chartBadge, { backgroundColor: '#FB8C0015' }]}>
                <AppText variant="small" style={{ color: '#FB8C00', fontWeight: '600' }}>mg/dL</AppText>
              </View>
            </View>
            <SimpleBarChart
              data={glucoseHistory.map(g => ({
                label: g.label,
                value: g.value,
                unit: 'mg/dL',
                color: '#FB8C00',
              }))}
              title="mg/dL"
              height={160}
            />
          </View>
        )}

        {/* Blood Pressure Chart */}
        {bpHistory.length > 1 && (
          <View style={[s.chartCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={s.chartHeader}>
              <View>
                <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  Blood Pressure Trend
                </AppText>
                <AppText variant="small" style={{ color: colors.textTertiary, marginTop: 2 }}>
                  Systolic (last {bpHistory.length} readings)
                </AppText>
              </View>
              <View style={[s.chartBadge, { backgroundColor: '#E5393515' }]}>
                <AppText variant="small" style={{ color: '#E53935', fontWeight: '600' }}>mmHg</AppText>
              </View>
            </View>
            <SimpleBarChart
              data={bpHistory.map(g => ({
                label: g.label,
                value: g.value,
                unit: 'mmHg',
                color: '#E53935',
              }))}
              title="mmHg"
              height={160}
            />
          </View>
        )}

        {/* Quick Log */}
        <AppText variant="captionMedium" color="secondary" style={s.sectionTitle}>
          Quick Log
        </AppText>
        <View style={s.quickLogGrid}>
          {METRIC_TYPES.map(mt => (
            <TouchableOpacity
              key={mt.key}
              style={[
                s.quickLogBtn,
                {
                  backgroundColor: colors.surface,
                  ...shadows.sm,
                  borderRadius: 14,
                },
              ]}
              onPress={() => openAdd(mt.key)}
              activeOpacity={0.7}
            >
              <AppText style={{ fontSize: 20 }}>{mt.emoji}</AppText>
              <AppText
                variant="small"
                style={{ color: colors.textPrimary, fontWeight: '600', marginTop: 4 }}
                numberOfLines={1}
              >
                {mt.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent history */}
        {metrics.length > 0 && (
          <>
            <AppText variant="captionMedium" color="secondary" style={s.sectionTitle}>
              Recent Readings
            </AppText>
            <View style={[s.historyCard, { backgroundColor: colors.surface, borderRadius: 18, ...shadows.sm }]}>
              {metrics.slice(0, 15).map((m, idx) => {
                const def = METRIC_TYPES.find(mt => mt.key === m.type);
                const st = getStatus(m.type, m.value);
                const stColor = STATUS_COLORS[st];
                return (
                  <View
                    key={m.id}
                    style={[
                      s.historyRow,
                      {
                        borderBottomColor: colors.borderLight,
                        borderBottomWidth:
                          idx < Math.min(metrics.length, 15) - 1 ? 1 : 0,
                      },
                    ]}
                  >
                    <View style={[s.historyIconWrap, { backgroundColor: (def?.color || colors.primary) + '12' }]}>
                      <AppIcon name={def?.icon || 'pulse'} size={16} color={def?.color || colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
                        {def?.label ?? m.type}
                      </AppText>
                      <AppText variant="small" color="tertiary" style={{ marginTop: 2 }}>
                        {new Date(m.recordedAt).toLocaleString()}
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="bodyMedium" style={{ color: stColor, fontWeight: '700' }}>
                        {m.value} {m.unit}
                      </AppText>
                      <View style={[s.miniStatus, { backgroundColor: stColor + '15' }]}>
                        <AppText variant="small" style={{ color: stColor, fontWeight: '600', fontSize: 10 }}>
                          {STATUS_LABELS[st]}
                        </AppText>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Add metric modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
      >
        <View style={s.overlay}>
          <View
            style={[
              s.modalCard,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              },
            ]}
          >
            <View style={[s.modalHandle, { backgroundColor: colors.borderLight }]} />

            {/* Modal header with icon */}
            <View style={s.modalHeader}>
              <View style={[s.modalIconWrap, { backgroundColor: (METRIC_TYPES.find(m => m.key === selectedType)?.color || '#0D7C66') + '15' }]}>
                <AppIcon
                  name={METRIC_TYPES.find(m => m.key === selectedType)?.icon || 'pulse'}
                  size={24}
                  color={METRIC_TYPES.find(m => m.key === selectedType)?.color || '#0D7C66'}
                />
              </View>
              <View>
                <AppText variant="heading3" color="primary" style={{ fontWeight: '700' }}>
                  Log {METRIC_TYPES.find(m => m.key === selectedType)?.label}
                </AppText>
                <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                  Unit: {METRIC_TYPES.find(m => m.key === selectedType)?.unit || 'N/A'}
                </AppText>
              </View>
            </View>

            <AppInput
              placeholder={
                METRIC_TYPES.find(m => m.key === selectedType)?.placeholder
              }
              value={newValue}
              onChangeText={setNewValue}
              keyboardType="decimal-pad"
              autoFocus
              inputContainerStyle={{ borderRadius: 14 }}
            />
            <AppInput
              placeholder="Notes (optional)…"
              value={newNotes}
              onChangeText={setNewNotes}
              multiline
              inputContainerStyle={{ borderRadius: 14 }}
              containerStyle={{ marginTop: spacing.sm }}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[
                  s.modalBtn,
                  { borderColor: colors.border, borderRadius: 14 },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <AppText variant="bodyMedium" color="secondary">
                  Cancel
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.modalBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={saveMetric}
              >
                <AppText variant="bodyMedium" color="onPrimary">
                  Save Reading
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bmiCard: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bmiLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bmiIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bmiRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  bmiCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  bmiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bmiStats: {
    flexDirection: 'row',
    gap: 6,
  },
  bmiStatPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vitalCard: {
    width: (SCREEN_WIDTH - 48 - 10) / 2,
    padding: 14,
  },
  vitalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vitalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  vitalValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  chartCard: {
    padding: 16,
    borderRadius: 18,
    marginTop: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickLogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickLogBtn: {
    width: (SCREEN_WIDTH - 48 - 24) / 4,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  historyCard: {
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStatus: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    padding: 24,
    paddingTop: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalBtn: { flex: 1, padding: 15, alignItems: 'center', borderWidth: 1.5 },
});

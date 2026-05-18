import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@theme';

interface BarItem {
  label: string;
  value: number;
  unit?: string;
  color?: string;
}

interface BarChartProps {
  data: BarItem[];
  maxValue?: number;
  height?: number;
  title?: string;
}

export function SimpleBarChart({ data, maxValue, height = 160, title }: BarChartProps) {
  const { colors, borderRadius } = useTheme();
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.wrapper}>
      {title ? (
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      ) : null}
      <View style={[styles.chart, { height }]}>
        {data.map((item, i) => {
          const barH = Math.max(6, (item.value / max) * (height - 36));
          const barColor = item.color ?? colors.primary;
          return (
            <View key={i} style={styles.barWrapper}>
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {item.value}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: barH,
                    backgroundColor: barColor,
                    borderRadius: borderRadius.sm,
                  },
                ]}
              />
              <Text
                style={[styles.label, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface LinePoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LinePoint[];
  color?: string;
  unit?: string;
  title?: string;
  height?: number;
}

export function SimpleLineChart({ data, color, unit, title, height = 120 }: LineChartProps) {
  const { colors } = useTheme();
  const lineColor = color ?? colors.primary;
  if (!data.length) return null;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values, minVal + 1);
  const range = maxVal - minVal || 1;
  const innerH = height - 40;
  const segW = data.length > 1 ? 100 / (data.length - 1) : 100;

  return (
    <View style={styles.wrapper}>
      {title ? (
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      ) : null}
      <View style={{ height, paddingHorizontal: 8 }}>
        <View style={{ flex: 1, position: 'relative' }}>
          {data.map((pt, i) => {
            const y = innerH - ((pt.value - minVal) / range) * innerH;
            const x = i * segW;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: `${x}%` as any,
                  top: y,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: lineColor,
                  marginLeft: -5,
                  marginTop: -5,
                  borderWidth: 2,
                  borderColor: colors.surface,
                }}
              />
            );
          })}
        </View>
        <View style={styles.lineLabels}>
          {data.map((pt, i) => (
            <Text
              key={i}
              style={[styles.label, { color: colors.textTertiary, flex: 1 }]}
              numberOfLines={1}
            >
              {pt.label}
            </Text>
          ))}
        </View>
      </View>
      <Text style={[styles.unitLabel, { color: colors.textTertiary }]}>
        Range: {minVal}–{maxVal}{unit ? ' ' + unit : ''}
      </Text>
    </View>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  status?: 'normal' | 'warning' | 'danger';
  icon?: string;
}

export function MetricCard({ label, value, unit, status = 'normal' }: MetricCardProps) {
  const { colors, borderRadius, shadows } = useTheme();
  const statusColors: Record<string, string> = {
    normal: colors.success ?? '#4CAF50',
    warning: colors.warning ?? '#FF9800',
    danger: colors.error,
  };
  const statusBg: Record<string, string> = {
    normal: (colors.successMuted ?? 'rgba(76,175,80,0.08)'),
    warning: (colors.warningMuted ?? 'rgba(255,152,0,0.08)'),
    danger: (colors.errorMuted ?? 'rgba(244,67,54,0.08)'),
  };

  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          borderRadius: borderRadius.lg,
          ...shadows.sm,
        },
      ]}
    >
      <View
        style={[
          styles.metricStatusDot,
          { backgroundColor: statusBg[status] },
        ]}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: statusColors[status],
          }}
        />
      </View>
      <Text style={[styles.metricValue, { color: statusColors[status] }]}>{value}</Text>
      {unit ? <Text style={[styles.metricUnit, { color: colors.textTertiary }]}>{unit}</Text> : null}
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 8 },
  title: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4 },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '55%', minHeight: 6 },
  value: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 10, marginTop: 6, textAlign: 'center' },
  lineLabels: { flexDirection: 'row', marginTop: 4 },
  unitLabel: { fontSize: 11, marginTop: 4 },
  metricCard: {
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 100,
    gap: 2,
  },
  metricStatusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  metricUnit: { fontSize: 12, marginTop: 0, fontWeight: '500' },
  metricLabel: { fontSize: 12, marginTop: 4, textAlign: 'center', fontWeight: '500' },
});

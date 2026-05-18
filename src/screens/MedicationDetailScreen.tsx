import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@theme';
import { DatabaseService } from '@services/DatabaseService';
import { AuthService, SyncService } from '@services/FirebaseService';
import { AppIcon } from '@components/AppIcon';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { useAppDialog } from '@components/DialogProvider';
import type { Medication } from '@types';

function DetailRow({ label, value, icon, colors, borderRadius }: { label: string; value: string; icon?: string; colors: any; borderRadius: any }) {
  if (!value) return null;
  return (
    <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
      <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 15, color: colors.textPrimary, lineHeight: 22 }}>{value}</Text>
    </View>
  );
}

export function MedicationDetailScreen() {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { showDialog, hideDialog } = useAppDialog();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { medicationId } = route.params;
  const [med, setMed] = useState<Medication | null>(null);

  useEffect(() => {
    (async () => {
      const row = await DatabaseService.queryFirst<any>(
        'SELECT * FROM medications WHERE id = ?',
        [medicationId],
      );
      if (row) {
        setMed({
          id: row.id,
          name: row.name,
          dosage: row.dosage ?? '',
          frequency: row.frequency ?? '',
          indication: row.indication ?? '',
          startDate: row.start_date,
          endDate: row.end_date,
          reminderEnabled: row.reminder_enabled,
          reminderTimes: row.reminder_times,
          notes: row.notes ?? '',
          userId: row.user_id,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
        });
      }
    })();
  }, [medicationId]);

  const handleDelete = () => {
    showDialog({
      title: 'Delete Medication',
      message: 'Remove this medication permanently? This cannot be undone.',
      icon: 'trash',
      iconColor: colors.error,
      buttons: [
        { text: 'Cancel', onPress: hideDialog, variant: 'ghost' },
        {
          text: 'Delete',
          variant: 'danger',
          onPress: async () => {
            hideDialog();
            const now = Date.now();
            await DatabaseService.execute('UPDATE medications SET deleted_at = ? WHERE id = ?', [now, medicationId]);
            if (AuthService.userId) {
              SyncService.pushEntity(AuthService.userId, 'medications', medicationId, { deletedAt: now }, 'delete');
            }
            navigation.goBack();
          },
        },
      ],
    });
  };

  if (!med) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textTertiary }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = !med.deletedAt && (!med.endDate || med.endDate >= Date.now());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={med.name}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('AddMedication', { medicationId })}>
            <AppIcon name="edit" size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
        {/* Hero card */}
        <View style={[s.heroCard, { backgroundColor: colors.primaryMuted, borderRadius: borderRadius.xl }]}>
          <View style={[s.medIcon, { backgroundColor: colors.surface, borderRadius: borderRadius.lg }]}>
            <AppIcon name="medication" size={32} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.medName, { color: colors.textPrimary }]}>{med.name}</Text>
            <Text style={[s.medDosage, { color: colors.primary }]}>{med.dosage} · {med.frequency}</Text>
            <View style={[s.statusBadge, {
              backgroundColor: isActive ? (colors.successMuted ?? 'rgba(76,175,80,0.12)') : colors.errorMuted,
              borderRadius: borderRadius.full,
            }]}>
              <View style={[s.statusDot, { backgroundColor: isActive ? (colors.success ?? '#4CAF50') : colors.error }]} />
              <Text style={[s.statusTxt, { color: isActive ? (colors.success ?? '#4CAF50') : colors.error }]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={[s.card, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, ...shadows.sm, borderWidth: 1, borderColor: colors.borderLight }]}>
          <DetailRow label="Prescribed For" value={med.indication} colors={colors} borderRadius={borderRadius} />
          <DetailRow label="Dosage" value={med.dosage} colors={colors} borderRadius={borderRadius} />
          <DetailRow label="Frequency" value={med.frequency} colors={colors} borderRadius={borderRadius} />
          <DetailRow label="Start Date" value={med.startDate ? new Date(med.startDate).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'} colors={colors} borderRadius={borderRadius} />
          <DetailRow label="End Date" value={med.endDate ? new Date(med.endDate).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No end date'} colors={colors} borderRadius={borderRadius} />
          <DetailRow label="Reminders" value={med.reminderEnabled ? 'Enabled' : 'Disabled'} colors={colors} borderRadius={borderRadius} />
          <DetailRow label="Notes" value={med.notes} colors={colors} borderRadius={borderRadius} />
        </View>

        {/* Quick actions */}
        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Quick Actions</Text>
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: borderRadius.lg, ...shadows.sm }]}
            onPress={() => navigation.navigate('AffordableAlternatives', { drugName: med.name })}
            activeOpacity={0.7}
          >
            <View style={[s.actionIconWrap, { backgroundColor: colors.primaryMuted }]}>
              <AppIcon name="savings" size={18} color={colors.primary} />
            </View>
            <Text style={[s.actionTxt, { color: colors.textPrimary }]}>Find Alternatives</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: borderRadius.lg, ...shadows.sm }]}
            onPress={() => navigation.navigate('DrugInfo')}
            activeOpacity={0.7}
          >
            <View style={[s.actionIconWrap, { backgroundColor: colors.primaryMuted }]}>
              <AppIcon name="medical" size={18} color={colors.primary} />
            </View>
            <Text style={[s.actionTxt, { color: colors.textPrimary }]}>Drug Info</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.deleteBtn, { borderColor: colors.error, borderRadius: borderRadius.lg }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <AppIcon name="delete" size={18} color={colors.error} />
          <Text style={[s.deleteTxt, { color: colors.error }]}>Delete Medication</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroCard: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  medIcon: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
  medName: { fontSize: 20, fontWeight: '800', marginBottom: 4, letterSpacing: -0.2 },
  medDosage: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 12, fontWeight: '700' },
  card: { padding: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 10, padding: 16, borderWidth: 1 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionTxt: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, padding: 16, borderWidth: 1.5 },
  deleteTxt: { fontSize: 15, fontWeight: '600' },
});

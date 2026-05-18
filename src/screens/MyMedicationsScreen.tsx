import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@theme';
import { DatabaseService } from '@services/DatabaseService';
import { AuthService, SyncService } from '@services/FirebaseService';
import {
  AppText,
  ScreenHeader,
  AppCard,
  AppButton,
  EmptyState,
  SegmentedControl,
} from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { useAppDialog } from '@components/DialogProvider';
import type { Medication } from '@types';

function formatDate(ts: number | null) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isActive(med: Medication) {
  if (med.deletedAt) return false;
  if (med.endDate && med.endDate < Date.now()) return false;
  return true;
}

export function MyMedicationsScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { showDialog, hideDialog } = useAppDialog();
  const navigation = useNavigation<any>();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showActive, setShowActive] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await DatabaseService.query<any>(
        'SELECT * FROM medications WHERE user_id = ? AND (deleted_at IS NULL) ORDER BY updated_at DESC',
        [DatabaseService.getCurrentUserId()],
      );
      setMedications(
        rows.map(r => ({
          id: r.id,
          name: r.name,
          dosage: r.dosage,
          frequency: r.frequency,
          indication: r.indication,
          startDate: r.start_date,
          endDate: r.end_date,
          reminderEnabled: r.reminder_enabled,
          reminderTimes: r.reminder_times,
          notes: r.notes,
          userId: r.user_id,
          updatedAt: r.updated_at,
          deletedAt: r.deleted_at,
        })),
      );
    } catch (e) {
      console.warn('[Medications] load failed:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (id: string) => {
    showDialog({
      title: 'Delete Medication',
      message: 'Are you sure you want to remove this medication?',
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
            await DatabaseService.execute('UPDATE medications SET deleted_at = ? WHERE id = ?', [now, id]);
            if (AuthService.userId) {
              SyncService.pushEntity(AuthService.userId, 'medications', id, { deletedAt: now }, 'delete');
            }
            load();
          },
        },
      ],
    });
  };

  const filtered = medications.filter(m =>
    showActive ? isActive(m) : !isActive(m),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="My Medications"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddMedication', {})}
          >
            <AppIcon name="add" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />

      {/* Tab selector */}
      <SegmentedControl
        segments={[
          `Active (${medications.filter(isActive).length})`,
          `Inactive (${medications.filter(m => !isActive(m)).length})`,
        ]}
        selectedIndex={showActive ? 0 : 1}
        onSelect={index => setShowActive(index === 0)}
      />

      <FlatList
        data={filtered}
        keyExtractor={m => m.id}
        contentContainerStyle={{
          padding: spacing.md,
          gap: 10,
          paddingBottom: 120,
        }}
        renderItem={({ item: med }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('MedicationDetail', { medicationId: med.id })
            }
            activeOpacity={0.85}
          >
            <AppCard variant="default" padding="md">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: spacing.md,
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: borderRadius.full,
                      backgroundColor: colors.primaryMuted,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <AppIcon
                      name="medication"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyMedium">{med.name}</AppText>
                    <AppText variant="caption" color="secondary">
                      {med.dosage} · {med.frequency}
                    </AppText>
                    {med.indication ? (
                      <AppText
                        variant="small"
                        color="tertiary"
                        numberOfLines={1}
                      >
                        For: {med.indication}
                      </AppText>
                    ) : null}
                    <AppText variant="small" color="tertiary">
                      Started: {formatDate(med.startDate) ?? 'Unknown'}
                      {med.endDate ? ` · Ends: ${formatDate(med.endDate)}` : ''}
                    </AppText>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {med.reminderEnabled ? (
                    <AppIcon name="alarm" size={16} color={colors.primary} />
                  ) : null}
                  <TouchableOpacity
                    onPress={() => handleDelete(med.id)}
                    style={{ padding: 4, marginTop: 4 }}
                  >
                    <AppIcon
                      name="trash-outline"
                      size={20}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </AppCard>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="medical"
            title={
              showActive ? 'No active medications' : 'No inactive medications'
            }
            subtitle="Track your medications and get reminder alerts"
            action={
              <AppButton
                variant="primary"
                onPress={() => navigation.navigate('AddMedication', {})}
                style={{ marginTop: spacing.md }}
              >
                + Add Medication
              </AppButton>
            }
          />
        }
      />

      {/* Quick action buttons */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          padding: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          backgroundColor: colors.surface,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        }}
      >
        <AppButton
          variant="outline"
          fullWidth
          onPress={() => navigation.navigate('DrugInfo')}
          leftIcon={<AppIcon name="medical" size={18} color={colors.primary} />}
        >
          Drug Info
        </AppButton>
        <AppButton
          variant="primary"
          fullWidth
          onPress={() => navigation.navigate('AddMedication', {})}
          leftIcon={<AppIcon name="add" size={18} color="#fff" />}
        >
          Add Medication
        </AppButton>
      </View>
    </SafeAreaView>
  );
}

export default MyMedicationsScreen;

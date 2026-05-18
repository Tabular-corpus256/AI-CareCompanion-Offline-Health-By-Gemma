import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@theme';
import { DatabaseService } from '@services/DatabaseService';
import { AuthService, SyncService } from '@services/FirebaseService';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { useAppDialog } from '@components/DialogProvider';
import { AppText, AppInput, Chip } from '@components/ui';

const FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Every 8 hours',
  'As needed',
  'Weekly',
  'Monthly',
];

export function AddMedicationScreen() {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { showDialog } = useAppDialog();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const medicationId = route.params?.medicationId;
  const isEdit = !!medicationId;

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [indication, setIndication] = useState('');
  const [startDate] = useState(Date.now());
  const [endDateStr, setEndDateStr] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      (async () => {
        const row = await DatabaseService.queryFirst<any>(
          'SELECT * FROM medications WHERE id = ?',
          [medicationId],
        );
        if (row) {
          setName(row.name);
          setDosage(row.dosage ?? '');
          setFrequency(row.frequency ?? 'Once daily');
          setIndication(row.indication ?? '');
          setEndDateStr(
            row.end_date
              ? new Date(row.end_date).toISOString().split('T')[0]
              : '',
          );
          setReminderEnabled(row.reminder_enabled === 1);
          setNotes(row.notes ?? '');
        }
      })();
    }
  }, [isEdit, medicationId]);

  const handleSave = async () => {
    if (!name.trim()) {
      showDialog({ title: 'Required', message: 'Please enter the medication name.', icon: 'alert-circle', iconColor: colors.warning });
      return;
    }
    setSaving(true);
    try {
      const userId = DatabaseService.getCurrentUserId();
      const endDate = endDateStr ? new Date(endDateStr).getTime() : null;
      const now = Date.now();
      const medData = {
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        indication: indication.trim(),
        startDate,
        endDate,
        reminderEnabled: reminderEnabled ? 1 : 0,
        notes: notes.trim(),
      };

      if (isEdit) {
        await DatabaseService.execute(
          `UPDATE medications SET name=?,dosage=?,frequency=?,indication=?,end_date=?,reminder_enabled=?,notes=?,updated_at=? WHERE id=?`,
          [
            name.trim(),
            dosage.trim(),
            frequency,
            indication.trim(),
            endDate,
            reminderEnabled ? 1 : 0,
            notes.trim(),
            now,
            medicationId,
          ],
        );
        // Sync update to Firestore
        if (AuthService.userId) {
          SyncService.pushEntity(AuthService.userId, 'medications', medicationId, medData);
        }
      } else {
        const id = DatabaseService.uuid();
        await DatabaseService.execute(
          `INSERT INTO medications (id, name, dosage, frequency, indication, start_date, end_date, reminder_enabled, reminder_times, notes, user_id, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id,
            name.trim(),
            dosage.trim(),
            frequency,
            indication.trim(),
            startDate,
            endDate,
            reminderEnabled ? 1 : 0,
            '[]',
            notes.trim(),
            userId,
            now,
          ],
        );
        // Sync new medication to Firestore
        if (AuthService.userId) {
          SyncService.pushEntity(AuthService.userId, 'medications', id, medData);
        }
      }
      setSaving(false);
      navigation.goBack();
    } catch {
      setSaving(false);
      showDialog({ title: 'Error', message: 'Could not save medication. Please try again.', icon: 'alert-circle', iconColor: colors.error });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={isEdit ? 'Edit Medication' : 'Add Medication'}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <AppText variant="bodyMedium" color="onPrimary">
              {saving ? 'Saving…' : 'Save'}
            </AppText>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            s.card,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              ...shadows.sm,
              borderWidth: 1,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <AppText
            variant="captionMedium"
            color="secondary"
            style={s.fieldLabel}
          >
            Medication Name *
          </AppText>
          <AppInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Metformin, Lisinopril…"
            autoCapitalize="words"
          />

          <AppText
            variant="captionMedium"
            color="secondary"
            style={s.fieldLabel}
          >
            Dosage
          </AppText>
          <AppInput
            value={dosage}
            onChangeText={setDosage}
            placeholder="e.g. 500mg, 10mg"
          />

          <AppText
            variant="captionMedium"
            color="secondary"
            style={s.fieldLabel}
          >
            Frequency
          </AppText>
          <View style={s.row}>
            {FREQUENCIES.map(f => (
              <Chip
                key={f}
                label={f}
                selected={frequency === f}
                onPress={() => setFrequency(f)}
              />
            ))}
          </View>

          <AppText
            variant="captionMedium"
            color="secondary"
            style={s.fieldLabel}
          >
            Prescribed For
          </AppText>
          <AppInput
            value={indication}
            onChangeText={setIndication}
            placeholder="e.g. Type 2 Diabetes, Hypertension"
          />

          <AppText
            variant="captionMedium"
            color="secondary"
            style={s.fieldLabel}
          >
            End Date (optional)
          </AppText>
          <AppInput
            value={endDateStr}
            onChangeText={setEndDateStr}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />

          <View
            style={[
              s.switchRow,
              {
                borderTopWidth: 1,
                borderTopColor: colors.borderLight,
                marginTop: spacing.md,
                paddingTop: spacing.md,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText
                variant="bodyMedium"
                color="primary"
                style={s.switchLabel}
              >
                Reminder
              </AppText>
              <AppText variant="small" color="tertiary" style={s.switchSub}>
                Get reminders to take this medication
              </AppText>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <AppText
            variant="captionMedium"
            color="secondary"
            style={s.fieldLabel}
          >
            Notes
          </AppText>
          <AppInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes, instructions…"
            multiline
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: { padding: 20 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5 },
  chipTxt: { fontSize: 13, fontWeight: '500' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  switchSub: { fontSize: 12, marginTop: 2 },
  saveFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    padding: 16,
  },
  saveFullTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

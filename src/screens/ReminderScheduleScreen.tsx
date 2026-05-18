import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Switch,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@theme';
import { DatabaseService } from '@services/DatabaseService';
import { AuthService, SyncService } from '@services/FirebaseService';
import { AppIcon } from '@components/AppIcon';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { AppText, AppInput, AppCard, Chip } from '@components/ui';
import { useAppDialog } from '@components/DialogProvider';
import type { Reminder } from '@types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const REMINDER_TYPES = [
  { key: 'pill', label: 'Medication', icon: 'pill', color: '#1E88E5' },
  { key: 'water', label: 'Water', icon: 'water', color: '#039BE5' },
  {
    key: 'exercise',
    label: 'Exercise',
    icon: 'fitness-center',
    color: '#43A047',
  },
] as const;

export function ReminderScheduleScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { showDialog, hideDialog } = useAppDialog();
  const navigation = useNavigation<any>();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<Reminder['type']>('pill');
  const [editTime, setEditTime] = useState('08:00');
  const [editDays, setEditDays] = useState<string[]>([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ]);

  const load = useCallback(async () => {
    const rows = await DatabaseService.query<any>(
      'SELECT * FROM reminders WHERE user_id = ? AND (deleted_at IS NULL) ORDER BY time ASC',
      [DatabaseService.getCurrentUserId()],
    );
    setReminders(
      rows.map(r => ({
        id: r.id,
        type: r.type,
        title: r.title,
        time: r.time,
        days: r.days,
        enabled: r.enabled,
        userId: r.user_id,
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at,
      })),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleReminder = async (id: string, current: number) => {
    const now = Date.now();
    const newEnabled = current ? 0 : 1;
    await DatabaseService.execute(
      'UPDATE reminders SET enabled = ?, updated_at = ? WHERE id = ?',
      [newEnabled, now, id],
    );
    // Sync toggle to Firestore
    if (AuthService.userId) {
      SyncService.pushEntity(AuthService.userId, 'reminders', id, { enabled: newEnabled });
    }
    load();
  };

  const deleteReminder = (id: string) => {
    showDialog({
      title: 'Delete Reminder',
      message: 'Remove this reminder permanently?',
      icon: 'alarm',
      iconColor: colors.error,
      buttons: [
        { text: 'Cancel', onPress: hideDialog, variant: 'ghost' },
        {
          text: 'Delete',
          variant: 'danger',
          onPress: async () => {
            hideDialog();
            const now = Date.now();
            await DatabaseService.execute('UPDATE reminders SET deleted_at = ? WHERE id = ?', [now, id]);
            if (AuthService.userId) {
              SyncService.pushEntity(AuthService.userId, 'reminders', id, { deletedAt: now }, 'delete');
            }
            load();
          },
        },
      ],
    });
  };

  const saveReminder = async () => {
    if (!editTitle.trim()) {
      showDialog({ title: 'Required', message: 'Please enter a reminder title.', icon: 'alert-circle', iconColor: colors.warning });
      return;
    }
    const id = DatabaseService.uuid();
    const now = Date.now();
    const userId = DatabaseService.getCurrentUserId();
    const reminderData = {
      type: editType,
      title: editTitle.trim(),
      time: editTime,
      days: editDays.join(','),
      enabled: 1,
    };
    await DatabaseService.execute(
      'INSERT INTO reminders (id, type, title, time, days, enabled, user_id, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [
        id,
        editType,
        editTitle.trim(),
        editTime,
        editDays.join(','),
        1,
        userId,
        now,
      ],
    );
    // Sync new reminder to Firestore
    if (AuthService.userId) {
      SyncService.pushEntity(AuthService.userId, 'reminders', id, reminderData);
    }
    setModalVisible(false);
    load();
  };

  const toggleDay = (day: string) => {
    setEditDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Reminders"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              setEditTitle('');
              setEditType('pill');
              setEditTime('08:00');
              setEditDays(DAYS);
              setModalVisible(true);
            }}
          >
            <AppIcon name="add" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={reminders}
        keyExtractor={r => r.id}
        contentContainerStyle={{
          padding: spacing.md,
          gap: 10,
          paddingBottom: 40,
        }}
        renderItem={({ item: r }) => {
          const typeDef = REMINDER_TYPES.find(t => t.key === r.type)!;
          const days = r.days?.split(',') ?? [];
          return (
            <AppCard
              variant="default"
              padding="md"
              style={{ borderLeftWidth: 4, borderLeftColor: typeDef?.color }}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <View
                  style={[s.icon, { backgroundColor: typeDef?.color + '18' }]}
                >
                  <AppIcon
                    name={typeDef?.icon ?? 'alarm'}
                    size={22}
                    color={typeDef?.color ?? colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyMedium" color="primary" style={s.title}>
                    {r.title}
                  </AppText>
                  <AppText variant="caption" color="secondary" style={s.sub}>
                    {r.time} ·{' '}
                    {days.length === 7 ? 'Every day' : days.join(', ')}
                  </AppText>
                  <View
                    style={[
                      s.typeBadge,
                      {
                        backgroundColor: typeDef?.color + '12',
                        borderRadius: borderRadius.full,
                      },
                    ]}
                  >
                    <AppText
                      variant="smallMedium"
                      style={[s.typeLabel, { color: typeDef?.color }]}
                    >
                      {typeDef?.label}
                    </AppText>
                  </View>
                </View>
                <View style={s.cardRight}>
                  <Switch
                    value={r.enabled === 1}
                    onValueChange={() => toggleReminder(r.id, r.enabled)}
                    trackColor={{ false: colors.border, true: typeDef?.color }}
                    thumbColor="#FFFFFF"
                  />
                  <TouchableOpacity
                    onPress={() => deleteReminder(r.id)}
                    style={{ padding: 4 }}
                  >
                    <AppIcon
                      name="delete-outline"
                      size={18}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </AppCard>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <View
              style={[s.emptyIcon, { backgroundColor: colors.primaryMuted }]}
            >
              <AppIcon name="alarm-off" size={40} color={colors.primary} />
            </View>
            <AppText variant="heading3" color="secondary" style={s.emptyTxt}>
              No reminders set
            </AppText>
            <AppText variant="body" color="tertiary" style={s.emptySubTxt}>
              Create reminders for medications, water & exercise
            </AppText>
            <TouchableOpacity
              style={[
                s.addBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: borderRadius.full,
                },
              ]}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <AppIcon name="add" size={18} color={colors.textOnPrimary} />
              <AppText variant="bodyMedium" color="onPrimary">
                Add Reminder
              </AppText>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add reminder modal */}
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
                borderTopLeftRadius: borderRadius.xxl,
                borderTopRightRadius: borderRadius.xxl,
              },
            ]}
          >
            <View style={s.modalHandle} />
            <AppText variant="heading3" color="primary" style={s.modalTitle}>
              New Reminder
            </AppText>

            <AppText
              variant="captionMedium"
              color="secondary"
              style={s.fieldLabel}
            >
              Title
            </AppText>
            <AppInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="e.g. Take Metformin, Drink water…"
              autoFocus
              inputContainerStyle={{ borderRadius: borderRadius.md }}
            />

            <AppText
              variant="captionMedium"
              color="secondary"
              style={s.fieldLabel}
            >
              Type
            </AppText>
            <View style={s.typeRow}>
              {REMINDER_TYPES.map(t => (
                <Chip
                  key={t.key}
                  label={t.label}
                  selected={editType === t.key}
                  onPress={() => setEditType(t.key)}
                  icon={
                    <AppIcon
                      name={t.icon}
                      size={16}
                      color={
                        editType === t.key
                          ? colors.textOnPrimary
                          : colors.textPrimary
                      }
                    />
                  }
                />
              ))}
            </View>

            <AppText
              variant="captionMedium"
              color="secondary"
              style={s.fieldLabel}
            >
              Time (24h format)
            </AppText>
            <AppInput
              value={editTime}
              onChangeText={setEditTime}
              placeholder="HH:MM (e.g. 08:00)"
              keyboardType="numbers-and-punctuation"
              inputContainerStyle={{ borderRadius: borderRadius.md }}
            />

            <AppText
              variant="captionMedium"
              color="secondary"
              style={s.fieldLabel}
            >
              Days
            </AppText>
            <View style={s.daysRow}>
              {DAYS.map(d => (
                <Chip
                  key={d}
                  label={d}
                  selected={editDays.includes(d)}
                  onPress={() => toggleDay(d)}
                />
              ))}
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[
                  s.modalBtn,
                  { borderColor: colors.border, borderRadius: borderRadius.md },
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
                    borderColor: colors.primary,
                    borderRadius: borderRadius.md,
                  },
                ]}
                onPress={saveReminder}
              >
                <AppText variant="bodyMedium" color="onPrimary">
                  Save
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: 13, marginBottom: 4 },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeLabel: { fontSize: 11, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTxt: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubTxt: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: { padding: 24, paddingTop: 16 },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    padding: 12,
    fontSize: 15,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
  },
  typeChipTxt: { fontSize: 13, fontWeight: '600' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5 },
  dayTxt: { fontSize: 12, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtn: { flex: 1, padding: 15, alignItems: 'center', borderWidth: 1.5 },
});

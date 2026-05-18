import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '@theme';
import { AppText, AppButton, AppInput, AppCard, SectionTitle } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { useHealthProfile } from '../context/HealthProfileContext';
import { useI18n } from '../i18n/I18nContext';
import type { HealthProfile } from '@types';

interface Props { onDone: () => void; }

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const EXERCISE_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { key: 'light', label: 'Light', desc: '1-3 days/week' },
  { key: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { key: 'active', label: 'Active', desc: '6-7 days/week' },
  { key: 'very_active', label: 'Very Active', desc: 'Intense daily exercise' },
] as const;

type ChipKey = 'conditions' | 'allergies' | 'medications';

export function OnboardingScreen({ onDone }: Props) {
  const { colors, borderRadius } = useTheme();
  const { saveProfile } = useHealthProfile();
  const { tr } = useI18n();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [smoker, setSmoker] = useState(false);
  const [alcohol, setAlcohol] = useState(false);
  const [exerciseLevel, setExerciseLevel] = useState('sedentary');
  const [condInput, setCondInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [medInput, setMedInput] = useState('');
  const [saving, setSaving] = useState(false);

  function renderChip(label: string, onRemove: () => void) {
    return (
      <View key={label} style={[s.chip, { backgroundColor: colors.primaryMuted, borderRadius: borderRadius.full }]}>
        <AppText variant="small" style={{ color: colors.primary }}>{label}</AppText>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <AppIcon name="close-outline" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  function renderChipInput(key: ChipKey, placeholder: string, value: string, setter: (v: string) => void) {
    const items = key === 'conditions' ? conditions : key === 'allergies' ? allergies : medications;
    const addFn = key === 'conditions' ? setConditions : key === 'allergies' ? setAllergies : setMedications;
    return (
      <View>
        <View style={s.addRow}>
          <View style={{ flex: 1 }}>
            <AppInput placeholder={placeholder} value={value}
              onChangeText={setter}
              onSubmitEditing={() => {
                if (value.trim()) { addFn(p => [...p, value.trim()]); setter(''); }
              }}
            />
          </View>
          <TouchableOpacity onPress={() => { if (value.trim()) { addFn(p => [...p, value.trim()]); setter(''); } }}
            style={[s.addBtn, { backgroundColor: colors.primary }]}>
            <AppIcon name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={s.chipRow}>{items.map((c, i) => renderChip(c, () => {
          const rm = key === 'conditions' ? setConditions : key === 'allergies' ? setAllergies : setMedications;
          rm(p => p.filter((_, j) => j !== i));
        }))}</View>
      </View>
    );
  }

  function renderSelect(key: string, label: string, desc: string, selected: boolean, onPress: () => void) {
    return (
      <TouchableOpacity key={key} onPress={onPress} activeOpacity={0.7}
        style={[s.option, { borderColor: selected ? colors.primary : colors.borderLight, borderRadius: borderRadius.md }, selected && { backgroundColor: colors.primaryMuted }]}>
        <AppText variant="bodyMedium" style={{ color: selected ? colors.primary : colors.textPrimary }}>{label}</AppText>
        <AppText variant="small" color="tertiary">{desc}</AppText>
      </TouchableOpacity>
    );
  }

  async function handleSave() {
    setSaving(true);
    const profile: HealthProfile = {
      name, age: parseInt(age, 10) || 0, gender: (gender || 'other') as HealthProfile['gender'],
      weightKg: parseFloat(weight) || 0, heightCm: parseFloat(height) || 0,
      bloodGroup, conditions, allergies, currentMedications: medications,
      smoker, alcoholUse: alcohol, exerciseLevel: exerciseLevel as HealthProfile['exerciseLevel'],
    };
    await saveProfile(profile);
    setSaving(false);
    onDone();
  }

  const sa = s;

  return (
    <View style={[sa.container, { backgroundColor: colors.background }]}>
      <View style={sa.headerBar}>
        <AppText variant="heading3">{tr('healthProfile')}</AppText>
        <AppText variant="small" color="tertiary">{tr('helpAiPersonalize')}</AppText>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={sa.body} contentContainerStyle={sa.bodyContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <SectionTitle title={tr('personalInfo')} size="lg" />
          <AppCard variant="elevated" padding="md">
            <AppInput placeholder={tr('fullName')} value={name} onChangeText={setName} containerStyle={{ marginBottom: 10 }} />
            <View style={sa.row2}>
              <View style={{ flex: 1 }}>
                <AppInput placeholder={tr('age')} value={age} onChangeText={setAge} keyboardType="numeric" />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <AppText variant="small" color="tertiary" style={{ marginBottom: 4 }}>{tr('gender')}</AppText>
                <View style={sa.genderRow}>
                  {['male', 'female', 'other'].map(g => (
                    <TouchableOpacity key={g} onPress={() => setGender(g)}
                      style={[sa.genderBtn, { borderRadius: borderRadius.full, borderColor: gender === g ? colors.primary : colors.borderLight }, gender === g && { backgroundColor: colors.primaryMuted }]}>
                      <AppText variant="small" style={{ color: gender === g ? colors.primary : colors.textSecondary, textTransform: 'capitalize' }}>{tr(g as any)}</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </AppCard>

          <SectionTitle title={tr('bodyMetrics')} size="lg" />
          <AppCard variant="elevated" padding="md">
            <View style={sa.row2}>
              <View style={{ flex: 1 }}><AppInput placeholder={tr('weight')} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /></View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}><AppInput placeholder={tr('height')} value={height} onChangeText={setHeight} keyboardType="decimal-pad" /></View>
            </View>
            <View style={{ marginTop: 12 }}>
              <AppText variant="small" color="tertiary" style={{ marginBottom: 6 }}>{tr('bloodGroup')}</AppText>
              <View style={sa.bloodGrid}>
                {BLOOD_GROUPS.map(bg => (
                  <TouchableOpacity key={bg} onPress={() => setBloodGroup(bg)}
                    style={[sa.bloodItem, { borderRadius: borderRadius.md, borderColor: bloodGroup === bg ? colors.primary : colors.borderLight }, bloodGroup === bg && { backgroundColor: colors.primaryMuted }]}>
                    <AppText variant="bodyMedium" style={{ color: bloodGroup === bg ? colors.primary : colors.textPrimary, fontWeight: '700' }}>{bg}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </AppCard>

          <SectionTitle title={tr('medicalConditions')} size="lg" />
          <AppCard variant="elevated" padding="md">{renderChipInput('conditions', 'e.g. Diabetes, Hypertension', condInput, setCondInput)}</AppCard>

          <SectionTitle title={tr('allergies')} size="lg" />
          <AppCard variant="elevated" padding="md">{renderChipInput('allergies', 'e.g. Penicillin, Peanuts', allergyInput, setAllergyInput)}</AppCard>

          <SectionTitle title={tr('currentMedications')} size="lg" />
          <AppCard variant="elevated" padding="md">{renderChipInput('medications', 'e.g. Metformin', medInput, setMedInput)}</AppCard>

          <SectionTitle title={tr('lifestyle')} size="lg" />
          <AppCard variant="elevated" padding="md">
            {renderSelect('smoker', tr('smoker'), 'Do you smoke?', smoker, () => setSmoker(!smoker))}
            <View style={{ height: 6 }} />
            {renderSelect('alcohol', tr('alcohol'), 'Do you consume alcohol?', alcohol, () => setAlcohol(!alcohol))}
            <View style={{ height: 12 }} />
            <AppText variant="small" color="tertiary" style={{ marginBottom: 6 }}>{tr('exerciseLevel')}</AppText>
            {EXERCISE_LEVELS.map(el => renderSelect(el.key, el.label, el.desc, exerciseLevel === el.key, () => setExerciseLevel(el.key)))}
          </AppCard>
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[sa.footer, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
        <AppButton variant="primary" onPress={handleSave} loading={saving} fullWidth size="lg">{tr('saveContinue')}</AppButton>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingBottom: 16 },
  row2: { flexDirection: 'row', alignItems: 'flex-start' },
  genderRow: { flexDirection: 'row', gap: 4 },
  genderBtn: { flex: 1, borderWidth: 1.5, paddingVertical: 10, alignItems: 'center' },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bloodItem: { width: '23%', borderWidth: 1.5, paddingVertical: 10, alignItems: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addBtn: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  option: { padding: 14, borderWidth: 1.5, marginBottom: 4 },
  footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1 },
});

export default OnboardingScreen;

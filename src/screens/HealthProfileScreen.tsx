import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Modal,
  Dimensions,
  Image,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { selectContactPhone } from 'react-native-select-contact';
import { buildProfilePdf } from '../utils/PdfBuilder';
import Share from 'react-native-share';
import { useTheme } from '@theme';
import { useHealthProfile } from '../context/HealthProfileContext';
import type { HealthProfile, HealthMetric } from '@types';
import {
  AppText,
  AppCard,
  AppButton,
  AppInput,
  SegmentedControl,
  Chip,
} from '@components/ui';
import { SimpleBarChart } from '@components/SimpleChart';
import { AppIcon } from '@components/AppIcon';
import { AppDialog } from '@components/AppDialog';
import { useAppDialog } from '@components/DialogProvider';
import { DatabaseService } from '@services/DatabaseService';
import { AuthService, SyncService } from '@services/FirebaseService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const METRIC_TYPES = [
  {
    key: 'blood_pressure' as HealthMetric['type'],
    label: 'Blood Pressure',
    unit: 'mmHg',
    icon: 'heart',
    color: '#E53935',
    placeholder: '120/80',
    emoji: '🫀',
  },
  {
    key: 'blood_glucose' as HealthMetric['type'],
    label: 'Blood Glucose',
    unit: 'mg/dL',
    icon: 'water-drop',
    color: '#FB8C00',
    placeholder: '90',
    emoji: '🩸',
  },
  {
    key: 'heart_rate' as HealthMetric['type'],
    label: 'Heart Rate',
    unit: 'bpm',
    icon: 'pulse',
    color: '#E91E63',
    placeholder: '72',
    emoji: '💓',
  },
  {
    key: 'weight' as HealthMetric['type'],
    label: 'Weight',
    unit: 'kg',
    icon: 'barbell',
    color: '#1E88E5',
    placeholder: '70',
    emoji: '⚖️',
  },
  {
    key: 'temperature' as HealthMetric['type'],
    label: 'Temperature',
    unit: '°C',
    icon: 'thermometer',
    color: '#F4511E',
    placeholder: '37.0',
    emoji: '🌡️',
  },
  {
    key: 'oxygen_saturation' as HealthMetric['type'],
    label: 'SpO₂',
    unit: '%',
    icon: 'water',
    color: '#00ACC1',
    placeholder: '98',
    emoji: '💨',
  },
  {
    key: 'bmi' as HealthMetric['type'],
    label: 'BMI',
    unit: '',
    icon: 'body',
    color: '#7CB342',
    placeholder: '22.5',
    emoji: '📊',
  },
];

function getMetricStatus(
  type: HealthMetric['type'],
  val: string,
): 'normal' | 'warning' | 'danger' {
  const v = parseFloat(val.split('/')[0]);
  if (isNaN(v)) return 'normal';
  if (type === 'blood_pressure') {
    const s = parseFloat(val.split('/')[0]);
    return s >= 180 ? 'danger' : s >= 140 ? 'warning' : 'normal';
  }
  if (type === 'blood_glucose')
    return v > 200 ? 'danger' : v > 126 ? 'warning' : 'normal';
  if (type === 'heart_rate')
    return v > 120 || v < 40
      ? 'danger'
      : v > 100 || v < 50
      ? 'warning'
      : 'normal';
  if (type === 'weight')
    return v > 250 || v < 20
      ? 'danger'
      : v > 150 || v < 40
      ? 'warning'
      : 'normal';
  if (type === 'oxygen_saturation')
    return v < 90 ? 'danger' : v < 95 ? 'warning' : 'normal';
  if (type === 'temperature')
    return v > 40 ? 'danger' : v > 37.5 ? 'warning' : 'normal';
  if (type === 'bmi')
    return v < 16 || v > 35
      ? 'danger'
      : v < 18.5 || v > 30
      ? 'warning'
      : 'normal';
  return 'normal';
}

const STATUS_COLORS = {
  normal: '#00B894',
  warning: '#F39C12',
  danger: '#E74C3C',
};
const STATUS_LABELS = {
  normal: 'Normal',
  warning: 'Caution',
  danger: 'Critical',
};

function relativeTime(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return 'Just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  if (d < 604_800_000) return `${Math.floor(d / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  });
}

const CONDITIONS_SUGGESTIONS = [
  'Diabetes',
  'Hypertension',
  'Heart Disease',
  'Asthma',
  'COPD',
  'Arthritis',
  'Thyroid Disorder',
  'Kidney Disease',
  'Liver Disease',
  'Cancer',
  'HIV/AIDS',
  'Tuberculosis',
  'Epilepsy',
  'Depression/Anxiety',
];

const ALLERGY_SUGGESTIONS = [
  'Peanuts',
  'Penicillin',
  'Lactose',
  'Pollen',
  'Dust Mites',
  'Shellfish',
  'Latex',
  'Bee Stings',
  'Mold',
  'Soy',
  'Eggs',
  'Wheat',
];

const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'Unknown',
];

const TABS = [
  { key: 'personal', icon: 'person', label: 'Personal' },
  { key: 'health', icon: 'heart', label: 'Health' },
  { key: 'vitals', icon: 'pulse', label: 'Vitals' },
  { key: 'lifestyle', icon: 'fitness', label: 'Lifestyle' },
  { key: 'preferences', icon: 'settings', label: 'Prefs' },
];

const GENDER_OPTIONS = ['male', 'female', 'other'];
const ACTIVITY_OPTIONS = ['sedentary', 'light', 'moderate', 'active'];

export function HealthProfileScreen() {
  const { colors, shadows, isDark } = useTheme();
  const { showDialog } = useAppDialog();
  const insets = useSafeAreaInsets();
  const { profile, saveProfile } = useHealthProfile();

  const [form, setForm] = useState<HealthProfile>({ ...profile });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [conditionInput, setConditionInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [familyHistoryInput, setFamilyHistoryInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');

  // Vitals tab state
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [latestByType, setLatestByType] = useState<
    Partial<Record<HealthMetric['type'], HealthMetric>>
  >({});
  const [metricModalVisible, setMetricModalVisible] = useState(false);
  const [selectedMetricType, setSelectedMetricType] =
    useState<HealthMetric['type']>('blood_pressure');
  const [newMetricValue, setNewMetricValue] = useState('');
  const [newMetricNotes, setNewMetricNotes] = useState('');

  const [dobModalVisible, setDobModalVisible] = useState(false);
  const [medModalVisible, setMedModalVisible] = useState(false);
  const [tempMed, setTempMed] = useState({
    name: '',
    dosage: '',
    frequency: '',
  });

  const [tempDob, setTempDob] = useState({
    day: '01',
    month: '01',
    year: String(new Date().getFullYear() - (profile.age || 25)),
  });

  useEffect(() => {
    setForm({ ...profile });
    if (profile.age) {
      setTempDob(prev => ({
        ...prev,
        year: String(new Date().getFullYear() - profile.age),
      }));
    }

    // Initialize input strings based on current units
    const isMetric = profile.units === 'metric' || !profile.units;
    if (profile.heightCm > 0) {
      setHeightInput(
        String(
          isMetric ? profile.heightCm : Math.round(profile.heightCm * 0.393701),
        ),
      );
    }
    if (profile.weightKg > 0) {
      setWeightInput(
        String(
          isMetric ? profile.weightKg : Math.round(profile.weightKg * 2.20462),
        ),
      );
    }
  }, [profile]);

  const loadMetrics = useCallback(async () => {
    try {
      const rows = await DatabaseService.query<any>(
        'SELECT * FROM health_metrics WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 200',
        [DatabaseService.getCurrentUserId()],
      );
      const typed: HealthMetric[] = rows.map((r: any) => ({
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
      console.warn('[Vitals] load failed:', e);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const openAddMetric = (type: HealthMetric['type']) => {
    setSelectedMetricType(type);
    setNewMetricValue('');
    setNewMetricNotes('');
    setMetricModalVisible(true);
  };

  const saveMetric = async () => {
    const val = newMetricValue.trim();
    if (!val) return;

    if (selectedMetricType === 'blood_pressure') {
      if (!/^\d{2,3}\/\d{2,3}$/.test(val)) {
        showDialog({
          title: 'Invalid Format',
          message: 'Blood pressure must be in format like 120/80',
          icon: 'alert-circle',
          iconColor: colors.warning,
        });
        return;
      }
    } else {
      if (isNaN(parseFloat(val))) {
        showDialog({
          title: 'Invalid Input',
          message: 'Please enter a valid number.',
          icon: 'alert-circle',
          iconColor: colors.warning,
        });
        return;
      }
    }

    const def = METRIC_TYPES.find(m => m.key === selectedMetricType)!;
    const id = DatabaseService.uuid();
    const now = Date.now();
    const userId = DatabaseService.getCurrentUserId();

    // Enforce ONE entry allowed
    await DatabaseService.execute(
      'DELETE FROM health_metrics WHERE type = ? AND user_id = ?',
      [selectedMetricType, userId],
    );

    await DatabaseService.execute(
      'INSERT INTO health_metrics (id, type, value, unit, recorded_at, notes, user_id) VALUES (?,?,?,?,?,?,?)',
      [
        id,
        selectedMetricType,
        val,
        def.unit,
        now,
        newMetricNotes.trim(),
        userId,
      ],
    );
    if (AuthService.userId) {
      SyncService.pushEntity(AuthService.userId, 'health_metrics', id, {
        type: selectedMetricType,
        value: val,
        unit: def.unit,
        recordedAt: now,
        notes: newMetricNotes.trim(),
      });
    }
    setMetricModalVisible(false);
    loadMetrics();
  };

  const update = (key: keyof HealthProfile, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      console.log(`[HealthProfile] Updating ${key}:`, value);
      return next;
    });
  };

  const addToArray = (
    key: 'conditions' | 'allergies' | 'familyHistory' | 'vaccinations',
    val: string,
  ) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const arr = (form[key] || []) as string[];
    if (!arr.includes(trimmed)) {
      update(key, [...arr, trimmed]);
    }
    if (key === 'conditions') setConditionInput('');
    if (key === 'allergies') setAllergyInput('');
    if (key === 'familyHistory') setFamilyHistoryInput('');
  };

  const removeFromArray = (
    key: 'conditions' | 'allergies' | 'familyHistory' | 'vaccinations',
    val: string,
  ) => {
    update(
      key,
      ((form[key] || []) as string[]).filter(v => v !== val),
    );
  };

  const handleAddMedication = () => {
    if (!tempMed.name.trim()) return;
    const newMed = { ...tempMed, name: tempMed.name.trim() };
    update('currentMedications', [...(form.currentMedications || []), newMed]);
    setTempMed({ name: '', dosage: '', frequency: '' });
    setMedModalVisible(false);
  };

  const handleRemoveMedication = (index: number) => {
    const meds = [...(form.currentMedications || [])];
    meds.splice(index, 1);
    update('currentMedications', meds);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showDialog({
        title: 'Required',
        message: 'Please enter your name.',
        icon: 'alert-circle',
        iconColor: colors.warning,
      });
      return;
    }
    setSaving(true);
    await saveProfile(form);
    setSaving(false);
    showDialog({
      title: 'Saved',
      message: 'Health profile updated successfully.',
      icon: 'checkmark-circle',
      iconColor: colors.success,
    });
  };

  const filteredConditions = useMemo(() => {
    if (!conditionInput) return [];
    return CONDITIONS_SUGGESTIONS.filter(
      c =>
        c.toLowerCase().includes(conditionInput.toLowerCase()) &&
        !form.conditions.includes(c),
    );
  }, [conditionInput, form.conditions]);

  const filteredAllergies = useMemo(() => {
    if (!allergyInput) return [];
    return ALLERGY_SUGGESTIONS.filter(
      a =>
        a.toLowerCase().includes(allergyInput.toLowerCase()) &&
        !form.allergies.includes(a),
    );
  }, [allergyInput, form.allergies]);

  const userName = form.name ? form.name.trim() : '';
  const initials = userName
    ? userName
        .split(' ')
        .map(n => n.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2)
    : '?';

  const renderTagList = (
    items: string[],
    onRemove: (v: string) => void,
    tagColor?: string,
  ) => {
    if (!items.length) return null;
    return (
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}
      >
        {items.map(item => (
          <TouchableOpacity
            key={item}
            onPress={() => onRemove(item)}
            activeOpacity={0.7}
            style={[
              styles.tag,
              { backgroundColor: tagColor || colors.primaryMuted },
            ]}
          >
            <AppText
              variant="caption"
              style={{ marginRight: 4, color: colors.textPrimary }}
            >
              {item}
            </AppText>
            <AppIcon name="close" size={12} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSectionHeader = (
    icon: string,
    title: string,
    color?: string,
    description?: string,
  ) => (
    <View style={styles.sectionHeader}>
      <View
        style={[
          styles.sectionIcon,
          { backgroundColor: (color || colors.primary) + '15' },
        ]}
      >
        <AppIcon name={icon} size={22} color={color || colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText
          variant="heading3"
          style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 18 }}
        >
          {title}
        </AppText>
        {description && (
          <AppText
            variant="caption"
            color="secondary"
            style={{ marginTop: 2, fontSize: 13 }}
          >
            {description}
          </AppText>
        )}
      </View>
    </View>
  );

  const renderInputField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    options?: any,
  ) => (
    <View style={styles.fieldGroup}>
      <AppText
        variant="captionMedium"
        style={{
          color: colors.textSecondary,
          marginBottom: 6,
          fontWeight: '600',
        }}
      >
        {label}
      </AppText>
      <View
        style={[
          styles.inputBox,
          {
            backgroundColor: isDark ? colors.surfaceVariant : colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
      >
        {options?.icon && (
          <AppIcon
            name={options.icon}
            size={18}
            color={colors.textTertiary}
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary, fontWeight: value ? '500' : '400' },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={options?.keyboardType}
          editable={options?.editable !== false}
        />
        {options?.suffix && (
          <View
            style={[
              styles.suffix,
              { backgroundColor: colors.primaryMuted, borderRadius: 8 },
            ]}
          >
            <AppText
              variant="small"
              style={{ color: colors.primary, fontWeight: '700' }}
            >
              {options.suffix}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );

  const calculateAge = (day: string, month: string, year: string) => {
    const today = new Date();
    const birthDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
    );
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDobConfirm = () => {
    const age = calculateAge(tempDob.day, tempDob.month, tempDob.year);
    update('age', age);
    setDobModalVisible(false);
  };

  const handlePickAvatar = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });
    if (result.assets && result.assets[0].uri) {
      update('avatarUri', result.assets[0].uri);
    }
  };

  const handlePickContact = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        showDialog({
          title: 'Permission Denied',
          message:
            'Please grant contacts permission to pick an emergency contact.',
          icon: 'people',
          iconColor: colors.error,
        });
        return;
      }
    }

    try {
      const selection = await selectContactPhone();
      if (!selection) return;

      const { contact, selectedPhone } = selection;

      setForm(prev => ({
        ...prev,
        emergencyContactName: contact.name,
        emergencyContactPhone: selectedPhone.number,
      }));
    } catch (e) {
      console.log('Contact picker error', e);
      showDialog({
        title: 'Error',
        message: 'Could not open contact picker. Please try again.',
        icon: 'alert-circle',
        iconColor: colors.error,
      });
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const filePath = await buildProfilePdf(form);

      await Share.open({
        url: filePath,
        type: 'application/pdf',
        filename: `HealthProfile_${(form.name || 'User').replace(/\s+/g, '_')}`,
        title: 'Health Profile PDF',
        subject: 'Share Health Profile',
        useInternalStorage: true,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        showDialog({
          title: 'Export Failed',
          message:
            'An error occurred while generating the PDF. Please try again.',
          icon: 'document',
          iconColor: colors.error,
        });
        console.log('PDF Generation Error:', error);
      }
    } finally {
      setExporting(false);
    }
  };

  const renderPersonalTab = () => (
    <View style={styles.tabContent}>
      {renderSectionHeader(
        'person',
        'Personal Details',
        undefined,
        'Basic identifying information',
      )}
      <AppCard style={styles.card}>
        <View style={{ gap: 16, marginBottom: 20 }}>
          {renderInputField(
            'First name',
            form.name.split(' ')[0] || '',
            v =>
              update(
                'name',
                v + ' ' + (form.name.split(' ').slice(1).join(' ') || ''),
              ),
            'Enter first name',
            { icon: 'person' },
          )}
          {renderInputField(
            'Last name',
            form.name.split(' ').slice(1).join(' ') || '',
            v => update('name', (form.name.split(' ')[0] || '') + ' ' + v),
            'Enter last name',
          )}
        </View>

        <View style={{ marginBottom: 20 }}>
          <AppText
            variant="captionMedium"
            style={{
              color: colors.textSecondary,
              marginBottom: 8,
              fontWeight: '600',
            }}
          >
            Gender Identity
          </AppText>
          <SegmentedControl
            segments={GENDER_OPTIONS.map(
              g => g.charAt(0).toUpperCase() + g.slice(1),
            )}
            selectedIndex={GENDER_OPTIONS.indexOf(form.gender)}
            onSelect={idx => update('gender', GENDER_OPTIONS[idx])}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setDobModalVisible(true)}
          style={{ marginBottom: 8 }}
        >
          {renderInputField(
            'Date of birth',
            `${form.age} years old`,
            () => {},
            'Tap to set birth date',
            { icon: 'calendar', editable: false },
          )}
        </TouchableOpacity>
      </AppCard>

      {renderSectionHeader(
        'location',
        'Location',
        colors.success,
        'Where you currently live',
      )}
      <AppCard style={styles.card}>
        <View style={styles.rowFields}>
          {renderInputField(
            'City / Village',
            form.city || '',
            v => update('city', v),
            'Enter city',
            { icon: 'business' },
          )}
          {renderInputField(
            'District',
            form.district || '',
            v => update('district', v),
            'Enter district',
            { icon: 'map' },
          )}
        </View>
      </AppCard>

      {renderSectionHeader(
        'call',
        'Emergency Contact',
        '#E74C3C',
        'Who to contact in a medical emergency',
      )}
      <AppCard style={styles.card}>
        <AppButton
          variant="secondary"
          size="sm"
          leftIcon={
            <AppIcon name="people" size={16} color={colors.textPrimary} />
          }
          onPress={handlePickContact}
          style={{ marginBottom: 16 }}
        >
          Pick from Contacts
        </AppButton>
        <View style={styles.rowFields}>
          {renderInputField(
            'Contact name',
            form.emergencyContactName || '',
            v => update('emergencyContactName', v),
            'Enter name',
            { icon: 'personOutline' },
          )}
          {renderInputField(
            'Relationship',
            form.emergencyContactRelation || '',
            v => update('emergencyContactRelation', v),
            'e.g., Spouse',
          )}
        </View>
        {renderInputField(
          'Phone number',
          form.emergencyContactPhone || '',
          v => update('emergencyContactPhone', v),
          'Enter phone number',
          { icon: 'call', keyboardType: 'phone-pad' },
        )}
      </AppCard>
    </View>
  );

  const renderHealthTab = () => {
    const isMetric = form.units === 'metric' || !form.units;

    // BMI Calculation
    let bmiValue = 0;
    let bmiColor: string = colors.textTertiary;
    let bmiStatus = 'Enter height & weight';

    if (form.heightCm > 0 && form.weightKg > 0) {
      // Always calculate using metric internally
      bmiValue = form.weightKg / Math.pow(form.heightCm / 100, 2);
      if (bmiValue < 18.5) {
        bmiStatus = 'Underweight';
        bmiColor = '#3498DB'; // Blue
      } else if (bmiValue < 25) {
        bmiStatus = 'Healthy';
        bmiColor = '#00B894'; // Green
      } else if (bmiValue < 30) {
        bmiStatus = 'Overweight';
        bmiColor = '#F39C12'; // Orange
      } else {
        bmiStatus = 'Obese';
        bmiColor = '#E74C3C'; // Red
      }
    }

    return (
      <View style={styles.tabContent}>
        {renderSectionHeader(
          'pulse',
          'Vitals & Biometrics',
          '#E74C3C',
          'Your physical measurements',
        )}
        <AppCard style={styles.card}>
          <View style={{ marginBottom: 16 }}>
            <AppText
              variant="captionMedium"
              style={{
                color: colors.textSecondary,
                marginBottom: 8,
                fontWeight: '600',
              }}
            >
              Measurement System
            </AppText>
            <SegmentedControl
              segments={['Metric (cm/kg)', 'Imperial (ft/lbs)']}
              selectedIndex={isMetric ? 0 : 1}
              onSelect={idx => {
                const newMetric = idx === 0;
                if (newMetric !== isMetric) {
                  update('units', newMetric ? 'metric' : 'imperial');
                }
              }}
            />
          </View>

          <View style={styles.rowFields}>
            {renderInputField(
              isMetric ? 'Height (cm)' : 'Height (in)',
              heightInput,
              v => {
                setHeightInput(v);
                const num = parseFloat(v);
                if (!isNaN(num)) {
                  update('heightCm', isMetric ? num : num * 2.54);
                } else if (v === '') {
                  update('heightCm', 0);
                }
              },
              'Enter height',
              {
                icon: 'straighten',
                suffix: isMetric ? 'cm' : 'in',
                keyboardType: 'decimal-pad',
              },
            )}
            {renderInputField(
              isMetric ? 'Weight (kg)' : 'Weight (lbs)',
              weightInput,
              v => {
                setWeightInput(v);
                const num = parseFloat(v);
                if (!isNaN(num)) {
                  update('weightKg', isMetric ? num : num / 2.20462);
                } else if (v === '') {
                  update('weightKg', 0);
                }
              },
              'Enter weight',
              {
                icon: 'fitness-center',
                suffix: isMetric ? 'kg' : 'lbs',
                keyboardType: 'decimal-pad',
              },
            )}
          </View>

          {/* Real-time BMI Visualizer */}
          <View
            style={{
              backgroundColor: bmiColor + '15',
              padding: 12,
              borderRadius: 12,
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText
                variant="captionMedium"
                style={{ color: colors.textSecondary, fontWeight: '600' }}
              >
                BMI
              </AppText>
              <AppText
                variant="heading3"
                style={{ color: bmiColor, fontWeight: '800' }}
              >
                {bmiValue > 0 ? bmiValue.toFixed(1) : '--'}
              </AppText>
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: bmiColor,
                borderRadius: 12,
              }}
            >
              <AppText
                variant="caption"
                style={{ color: '#fff', fontWeight: '700' }}
              >
                {bmiStatus}
              </AppText>
            </View>
          </View>

          <AppText
            variant="captionMedium"
            style={{
              color: colors.textSecondary,
              marginBottom: 8,
              marginTop: 20,
              fontWeight: '600',
            }}
          >
            Blood group (Optional)
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {BLOOD_GROUPS.map(bg => (
              <TouchableOpacity
                key={bg}
                onPress={() => update('bloodGroup', bg)}
                style={[
                  styles.chipBtn,
                  {
                    backgroundColor:
                      form.bloodGroup === bg ? colors.primary : colors.surface,
                    borderColor:
                      form.bloodGroup === bg ? colors.primary : colors.border,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  style={{
                    color: form.bloodGroup === bg ? '#fff' : colors.textPrimary,
                    fontWeight: '500',
                  }}
                >
                  {bg}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </AppCard>

        {renderSectionHeader(
          'medical',
          'Medical History & Regimen',
          '#9B59B6',
          'Conditions, allergies, and medications',
        )}
        <AppCard style={styles.card}>
          {/* Chronic Conditions */}
          <AppText
            variant="captionMedium"
            style={{
              color: colors.textSecondary,
              marginBottom: 6,
              fontWeight: '600',
            }}
          >
            Chronic conditions (if any)
          </AppText>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: isDark
                  ? colors.surfaceVariant
                  : colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <AppIcon
              name="medical"
              size={16}
              color={colors.textTertiary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={conditionInput}
              onChangeText={setConditionInput}
              placeholder="Search or add conditions"
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={() => addToArray('conditions', conditionInput)}
            />
            <TouchableOpacity
              onPress={() => addToArray('conditions', conditionInput)}
            >
              <AppIcon name="add-circle" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {filteredConditions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionScroll}
            >
              {filteredConditions.map(item => (
                <Chip
                  key={item}
                  label={item}
                  selected={false}
                  onPress={() => addToArray('conditions', item)}
                  style={{ marginRight: 8 }}
                />
              ))}
            </ScrollView>
          )}
          {renderTagList(
            form.conditions,
            v => removeFromArray('conditions', v),
            colors.error + '15',
          )}

          {/* Family History */}
          <AppText
            variant="captionMedium"
            style={{
              color: colors.textSecondary,
              marginBottom: 6,
              marginTop: 16,
              fontWeight: '600',
            }}
          >
            Family Medical History
          </AppText>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: isDark
                  ? colors.surfaceVariant
                  : colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <AppIcon
              name="people"
              size={16}
              color={colors.textTertiary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={familyHistoryInput}
              onChangeText={setFamilyHistoryInput}
              placeholder="e.g. Mother: Diabetes"
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={() =>
                addToArray('familyHistory', familyHistoryInput)
              }
            />
            <TouchableOpacity
              onPress={() => addToArray('familyHistory', familyHistoryInput)}
            >
              <AppIcon name="add-circle" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {renderTagList(
            form.familyHistory || [],
            v => removeFromArray('familyHistory', v),
            '#9B59B620',
          )}

          {/* Allergies */}
          <AppText
            variant="captionMedium"
            style={{
              color: colors.textSecondary,
              marginBottom: 6,
              marginTop: 16,
              fontWeight: '600',
            }}
          >
            Allergies (if any)
          </AppText>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: isDark
                  ? colors.surfaceVariant
                  : colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <AppIcon
              name="warning"
              size={16}
              color={colors.textTertiary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={allergyInput}
              onChangeText={setAllergyInput}
              placeholder="Search or add allergies"
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={() => addToArray('allergies', allergyInput)}
            />
            <TouchableOpacity
              onPress={() => addToArray('allergies', allergyInput)}
            >
              <AppIcon name="add-circle" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {filteredAllergies.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionScroll}
            >
              {filteredAllergies.map(item => (
                <Chip
                  key={item}
                  label={item}
                  selected={false}
                  onPress={() => addToArray('allergies', item)}
                  style={{ marginRight: 8 }}
                />
              ))}
            </ScrollView>
          )}
          {renderTagList(
            form.allergies,
            v => removeFromArray('allergies', v),
            colors.warning + '20',
          )}

          {/* Structured Medications */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            <AppText
              variant="captionMedium"
              style={{ color: colors.textSecondary, fontWeight: '600' }}
            >
              Current Medications
            </AppText>
            <TouchableOpacity onPress={() => setMedModalVisible(true)}>
              <AppText
                variant="small"
                style={{ color: colors.primary, fontWeight: '700' }}
              >
                + Add Medication
              </AppText>
            </TouchableOpacity>
          </View>

          {!form.currentMedications || form.currentMedications.length === 0 ? (
            <AppText
              variant="small"
              style={{
                color: colors.textTertiary,
                fontStyle: 'italic',
                paddingVertical: 8,
              }}
            >
              No medications added.
            </AppText>
          ) : (
            <View style={{ gap: 8 }}>
              {form.currentMedications.map((med, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.primaryMuted,
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <AppIcon
                    name="pill"
                    size={20}
                    color={colors.primary}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText
                      variant="bodyMedium"
                      style={{ fontWeight: '700', color: colors.textPrimary }}
                    >
                      {med.name}
                    </AppText>
                    <AppText
                      variant="caption"
                      style={{ color: colors.textSecondary }}
                    >
                      {med.dosage} • {med.frequency}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveMedication(index)}
                    style={{ padding: 4 }}
                  >
                    <AppIcon
                      name="close-circle"
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </AppCard>
      </View>
    );
  };

  const renderLifestyleTab = () => {
    // Calculate sleep duration
    let sleepDurationStr = '--';
    let lifestyleScore = 70; // Baseline

    if (form.bedtime && form.wakeTime) {
      const [bedH, bedM] = form.bedtime.split(':').map(Number);
      const [wakeH, wakeM] = form.wakeTime.split(':').map(Number);
      if (!isNaN(bedH) && !isNaN(wakeH)) {
        let durationMinutes =
          wakeH * 60 + (wakeM || 0) - (bedH * 60 + (bedM || 0));
        if (durationMinutes < 0) durationMinutes += 24 * 60;
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        sleepDurationStr = `${hours}h ${mins > 0 ? mins + 'm' : ''}`;

        // Simple score logic
        if (hours >= 7 && hours <= 9) lifestyleScore += 10;
        else if (hours < 5) lifestyleScore -= 10;
      }
    }

    if (form.exerciseLevel === 'active') lifestyleScore += 15;
    else if (form.exerciseLevel === 'moderate') lifestyleScore += 10;
    else if (form.exerciseLevel === 'sedentary') lifestyleScore -= 10;

    if (form.smoker) lifestyleScore -= 15;
    if (form.alcoholUse) lifestyleScore -= 5;

    if (form.waterGlasses) {
      if (form.waterGlasses >= 8) lifestyleScore += 10;
      else if (form.waterGlasses < 4) lifestyleScore -= 5;
    }

    if (form.stressLevel === 'severe') lifestyleScore -= 15;
    else if (form.stressLevel === 'low') lifestyleScore += 5;

    // Cap score at 100
    lifestyleScore = Math.min(100, Math.max(0, lifestyleScore));
    let scoreColor: string = colors.success;
    if (lifestyleScore < 50) scoreColor = colors.error;
    else if (lifestyleScore < 75) scoreColor = colors.warning;

    return (
      <View style={styles.tabContent}>
        {renderSectionHeader(
          'fitness',
          'Lifestyle Information',
          '#F39C12',
          'Daily habits and routines',
        )}

        <AppCard
          style={[
            styles.card,
            {
              backgroundColor: scoreColor + '15',
              borderColor: scoreColor,
              borderWidth: 1,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <AppText
                variant="captionMedium"
                style={{ color: colors.textSecondary, fontWeight: '700' }}
              >
                LIFESTYLE SCORE
              </AppText>
              <AppText
                variant="heading2"
                style={{ color: scoreColor, fontWeight: '800' }}
              >
                {lifestyleScore}
              </AppText>
              <AppText
                variant="caption"
                style={{ color: colors.textSecondary }}
              >
                Estimated based on your habits
              </AppText>
            </View>
            <View
              style={{
                backgroundColor: scoreColor,
                width: 48,
                height: 48,
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <AppIcon name="star" size={24} color="#fff" />
            </View>
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <AppIcon
              name="restaurant"
              size={20}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <AppText
              variant="heading3"
              style={{ color: colors.textPrimary, fontWeight: '800' }}
            >
              Diet & Hydration
            </AppText>
          </View>

          <AppText
            variant="captionMedium"
            style={{
              color: colors.textSecondary,
              marginBottom: 8,
              fontWeight: '600',
            }}
          >
            Diet Type
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
          >
            {[
              'None',
              'Vegetarian',
              'Vegan',
              'Keto',
              'Paleo',
              'Halal',
              'Kosher',
            ].map(diet => (
              <Chip
                key={diet}
                label={diet}
                selected={form.dietType === diet}
                onPress={() => update('dietType', diet)}
                style={{ marginRight: 8 }}
              />
            ))}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
            }}
          >
            <View>
              <AppText
                variant="captionMedium"
                style={{ color: colors.textSecondary, fontWeight: '600' }}
              >
                Water Intake
              </AppText>
              <AppText
                variant="bodyMedium"
                style={{ color: colors.textPrimary, fontWeight: '700' }}
              >
                {form.waterGlasses || 0} glasses/day
              </AppText>
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
            >
              <TouchableOpacity
                onPress={() =>
                  update(
                    'waterGlasses',
                    Math.max(0, (form.waterGlasses || 0) - 1),
                  )
                }
              >
                <AppIcon
                  name="remove-circle-outline"
                  size={32}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  update('waterGlasses', (form.waterGlasses || 0) + 1)
                }
              >
                <AppIcon
                  name="add-circle-outline"
                  size={32}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <AppIcon
              name="moon"
              size={20}
              color={'#8E44AD'}
              style={{ marginRight: 8 }}
            />
            <AppText
              variant="heading3"
              style={{ color: colors.textPrimary, fontWeight: '800' }}
            >
              Mental Health & Sleep
            </AppText>
          </View>

          <View style={styles.rowFields}>
            <View style={styles.fieldGroup}>
              <AppText
                variant="captionMedium"
                style={{
                  color: colors.textSecondary,
                  marginBottom: 8,
                  fontWeight: '600',
                }}
              >
                Stress Level
              </AppText>
              {['low', 'moderate', 'high', 'severe'].map(level => (
                <TouchableOpacity
                  key={level}
                  onPress={() => update('stressLevel', level)}
                  style={[
                    styles.miniChip,
                    {
                      backgroundColor:
                        form.stressLevel === level
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        form.stressLevel === level
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="small"
                    style={{
                      color:
                        form.stressLevel === level
                          ? '#fff'
                          : colors.textSecondary,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {level}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.fieldGroup}>
              <AppText
                variant="captionMedium"
                style={{
                  color: colors.textSecondary,
                  marginBottom: 8,
                  fontWeight: '600',
                }}
              >
                Energy / Mood
              </AppText>
              {['low', 'moderate', 'high'].map(level => (
                <TouchableOpacity
                  key={level}
                  onPress={() => update('energyLevel', level)}
                  style={[
                    styles.miniChip,
                    {
                      backgroundColor:
                        form.energyLevel === level
                          ? colors.accent
                          : colors.surfaceVariant,
                      borderColor:
                        form.energyLevel === level
                          ? colors.accent
                          : colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="small"
                    style={{
                      color:
                        form.energyLevel === level
                          ? '#fff'
                          : colors.textSecondary,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {level}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <AppText
                variant="captionMedium"
                style={{ color: colors.textSecondary, fontWeight: '600' }}
              >
                Sleep Schedule
              </AppText>
              <AppText
                variant="small"
                style={{ color: colors.primary, fontWeight: '700' }}
              >
                {sleepDurationStr}
              </AppText>
            </View>
            <View style={styles.rowFields}>
              {renderInputField(
                'Bedtime (HH:MM)',
                form.bedtime || '',
                v => update('bedtime', v),
                '22:30',
                { icon: 'moon' },
              )}
              {renderInputField(
                'Wake time (HH:MM)',
                form.wakeTime || '',
                v => update('wakeTime', v),
                '06:30',
                { icon: 'sunny' },
              )}
            </View>
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <AppIcon
              name="cafe"
              size={20}
              color={'#E67E22'}
              style={{ marginRight: 8 }}
            />
            <AppText
              variant="heading3"
              style={{ color: colors.textPrimary, fontWeight: '800' }}
            >
              Substances & Activity
            </AppText>
          </View>

          <View style={styles.rowFields}>
            {renderInputField(
              'Occupation',
              form.occupation || '',
              v => update('occupation', v),
              'Enter occupation',
              { icon: 'briefcase' },
            )}
            <View style={styles.fieldGroup}>
              <AppText
                variant="captionMedium"
                style={{
                  color: colors.textSecondary,
                  marginBottom: 8,
                  fontWeight: '600',
                }}
              >
                Activity Level
              </AppText>
              {ACTIVITY_OPTIONS.map(a => (
                <TouchableOpacity
                  key={a}
                  onPress={() => update('exerciseLevel', a)}
                  style={[
                    styles.miniChip,
                    {
                      backgroundColor:
                        form.exerciseLevel === a
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        form.exerciseLevel === a
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="small"
                    style={{
                      color:
                        form.exerciseLevel === a
                          ? '#fff'
                          : colors.textSecondary,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {a}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.switchRow,
              {
                borderTopColor: colors.borderLight,
                borderTopWidth: 1,
                marginTop: 24,
                paddingTop: 16,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText
                variant="bodyMedium"
                style={{ color: colors.textPrimary, fontWeight: '700' }}
              >
                Smoking
              </AppText>
              <AppText
                variant="caption"
                color="tertiary"
                style={{ marginTop: 2 }}
              >
                Do you smoke?
              </AppText>
            </View>
            <Switch
              value={form.smoker}
              onValueChange={v => update('smoker', v)}
              trackColor={{ true: colors.error, false: colors.border }}
            />
          </View>
          {form.smoker && (
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              {renderInputField(
                'Smoking Frequency',
                form.smokingFrequency || '',
                v => update('smokingFrequency', v),
                'e.g. 1 pack/day',
              )}
            </View>
          )}

          <View
            style={[
              styles.switchRow,
              {
                borderTopColor: form.smoker
                  ? 'transparent'
                  : colors.borderLight,
                borderTopWidth: form.smoker ? 0 : 1,
                paddingTop: form.smoker ? 4 : 16,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText
                variant="bodyMedium"
                style={{ color: colors.textPrimary, fontWeight: '700' }}
              >
                Alcohol consumption
              </AppText>
              <AppText
                variant="caption"
                color="tertiary"
                style={{ marginTop: 2 }}
              >
                Do you drink alcohol?
              </AppText>
            </View>
            <Switch
              value={form.alcoholUse}
              onValueChange={v => update('alcoholUse', v)}
              trackColor={{ true: colors.warning, false: colors.border }}
            />
          </View>
          {form.alcoholUse && (
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              {renderInputField(
                'Drinking Frequency',
                form.alcoholFrequency || '',
                v => update('alcoholFrequency', v),
                'e.g. 2 drinks/week',
              )}
            </View>
          )}
        </AppCard>
      </View>
    );
  };

  const renderPreferencesTab = () => {
    const goals = [
      'Weight Loss',
      'Manage Chronic Illness',
      'Mental Clarity',
      'Better Sleep',
      'Longevity & Aging',
      'Fitness & Muscle',
    ];
    const communicationStyles = [
      {
        id: 'clinical',
        label: 'Direct & Clinical',
        desc: 'Just the facts. Medical terminology is fine.',
      },
      {
        id: 'empathetic',
        label: 'Empathetic & Supportive',
        desc: 'Warm, reassuring, and comforting tone.',
      },
      {
        id: 'holistic',
        label: 'Holistic & Natural',
        desc: 'Focus on lifestyle, diet, and natural remedies first.',
      },
      {
        id: 'educational',
        label: 'Educational',
        desc: 'Explain why things happen in simple terms.',
      },
    ];

    const toggleGoal = (goal: string) => {
      const current = form.primaryGoals || [];
      if (current.includes(goal)) {
        update(
          'primaryGoals',
          current.filter(g => g !== goal),
        );
      } else {
        update('primaryGoals', [...current, goal]);
      }
    };

    return (
      <View style={styles.tabContent}>
        {renderSectionHeader(
          'settings',
          'Preferences',
          '#34495E',
          'App and communication settings',
        )}

        <AppCard style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <AppIcon
              name="flag"
              size={20}
              color={'#34495E'}
              style={{ marginRight: 8 }}
            />
            <AppText
              variant="heading3"
              style={{ color: colors.textPrimary, fontWeight: '800' }}
            >
              Primary Health Goals
            </AppText>
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {goals.map(goal => (
              <Chip
                key={goal}
                label={goal}
                selected={(form.primaryGoals || []).includes(goal)}
                onPress={() => toggleGoal(goal)}
              />
            ))}
          </View>

          <View style={[styles.rowFields, { marginTop: 8 }]}>
            {renderInputField(
              'Preferred Language',
              form.preferredLanguage || '',
              v => update('preferredLanguage', v),
              'e.g. English',
              { icon: 'language' },
            )}
            {renderInputField(
              'Check-in Time',
              form.checkInTime || '',
              v => update('checkInTime', v),
              '08:00',
              { icon: 'time' },
            )}
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <AppIcon
              name="chatbubbles"
              size={20}
              color={'#34495E'}
              style={{ marginRight: 8 }}
            />
            <AppText
              variant="heading3"
              style={{ color: colors.textPrimary, fontWeight: '800' }}
            >
              AI Communication Style
            </AppText>
          </View>
          <View style={{ gap: 12 }}>
            {communicationStyles.map(style => {
              const isSelected = form.communicationStyle === style.id;
              return (
                <TouchableOpacity
                  key={style.id}
                  activeOpacity={0.8}
                  onPress={() => update('communicationStyle', style.id)}
                  style={{
                    borderWidth: 2,
                    borderColor: isSelected
                      ? colors.primary
                      : colors.borderLight,
                    backgroundColor: isSelected
                      ? colors.primary + '10'
                      : colors.surface,
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText
                      variant="bodyMedium"
                      style={{
                        color: isSelected ? colors.primary : colors.textPrimary,
                        fontWeight: '700',
                      }}
                    >
                      {style.label}
                    </AppText>
                    <AppText
                      variant="caption"
                      style={{ color: colors.textSecondary, marginTop: 4 }}
                    >
                      {style.desc}
                    </AppText>
                  </View>
                  {isSelected && (
                    <AppIcon
                      name="checkmark-circle"
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <AppIcon
              name="notifications"
              size={20}
              color={'#34495E'}
              style={{ marginRight: 8 }}
            />
            <AppText
              variant="heading3"
              style={{ color: colors.textPrimary, fontWeight: '800' }}
            >
              Notifications & Reminders
            </AppText>
          </View>

          <View
            style={[
              styles.switchRow,
              {
                borderBottomColor: colors.borderLight,
                borderBottomWidth: 1,
                paddingBottom: 16,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText
                variant="bodyMedium"
                style={{ color: colors.textPrimary, fontWeight: '700' }}
              >
                Medication Reminders
              </AppText>
              <AppText
                variant="caption"
                color="tertiary"
                style={{ marginTop: 2 }}
              >
                Receive push notifications for pills
              </AppText>
            </View>
            <Switch
              value={form.medReminders}
              onValueChange={v => update('medReminders', v)}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          <AppText
            variant="captionMedium"
            style={{
              color: colors.textSecondary,
              marginBottom: 8,
              marginTop: 16,
              fontWeight: '600',
            }}
          >
            Quiet Hours (Do Not Disturb)
          </AppText>
          <View style={styles.rowFields}>
            {renderInputField(
              'Start (HH:MM)',
              form.quietHoursStart || '',
              v => update('quietHoursStart', v),
              '22:00',
              { icon: 'moon' },
            )}
            {renderInputField(
              'End (HH:MM)',
              form.quietHoursEnd || '',
              v => update('quietHoursEnd', v),
              '07:00',
              { icon: 'sunny' },
            )}
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <AppIcon
              name="shield-checkmark"
              size={20}
              color={'#34495E'}
              style={{ marginRight: 8 }}
            />
            <AppText
              variant="heading3"
              style={{ color: colors.textPrimary, fontWeight: '800' }}
            >
              Privacy & Data
            </AppText>
          </View>

          <View style={[styles.switchRow, { marginBottom: 16 }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <AppText
                variant="bodyMedium"
                style={{ color: colors.textPrimary, fontWeight: '700' }}
              >
                Local Storage Only
              </AppText>
              <AppText
                variant="caption"
                color="tertiary"
                style={{ marginTop: 2 }}
              >
                Keep all health data strictly on this device. Disables cloud
                sync backup.
              </AppText>
            </View>
            <Switch
              value={!form.syncToCloud}
              onValueChange={v => update('syncToCloud', !v)}
              trackColor={{ true: colors.success, false: colors.border }}
            />
          </View>

          <AppButton
            variant="outline"
            fullWidth
            leftIcon={
              exporting ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <AppIcon name="download" size={18} color={colors.primary} />
              )
            }
            onPress={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? 'Generating PDF...' : 'Export Medical Data (PDF)'}
          </AppButton>
        </AppCard>
      </View>
    );
  };

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

  const renderVitalsTab = () => {
    const primaryMetrics = METRIC_TYPES.slice(0, 6);
    const bmiMetric = METRIC_TYPES[6];

    // Summary counts
    const statusCounts = { normal: 0, warning: 0, danger: 0 };
    let loggedCount = 0;
    primaryMetrics.forEach(mt => {
      const l = latestByType[mt.key];
      if (l) {
        loggedCount++;
        statusCounts[getMetricStatus(mt.key, l.value)]++;
      }
    });

    // Dark-mode-aware opacity helpers (hex suffix appended to a colour string)
    const bandOp = isDark ? '38' : '18'; // top band background
    const iconOp = isDark ? '50' : '28'; // icon circle inside band
    const pillOp = isDark ? '38' : '1E'; // status / summary pill fill
    const ringOp = isDark ? '90' : '60'; // empty-state ring border
    const ringBgOp = isDark ? '28' : '10'; // empty-state ring fill
    const badgeBgOp = isDark ? '30' : '18'; // log badge fill
    const badgeBrdOp = isDark ? '60' : '40'; // log badge border

    // Card surface: elevate above background in dark mode so cards are visible
    const cardBg = isDark ? colors.surfaceElevated : colors.surface;
    // Card border: use the stronger border token (not borderLight which is near-black in dark)
    const cardBorder = colors.border;

    return (
      <View style={styles.tabContent}>
        {/* ── Section header ─────────────────────────────────────────── */}
        <View style={[vs.sectionHead, { marginBottom: 18 }]}>
          <View style={{ flex: 1 }}>
            <AppText
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: colors.textPrimary,
                letterSpacing: -0.3,
              }}
            >
              Vital Signs
            </AppText>
            <AppText
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              {loggedCount === 0
                ? 'No readings yet — tap a card to log'
                : `${loggedCount} of ${primaryMetrics.length} readings logged`}
            </AppText>
          </View>
          {loggedCount > 0 && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {statusCounts.normal > 0 && (
                <View
                  style={[
                    vs.summaryPill,
                    { backgroundColor: '#00B894' + pillOp },
                  ]}
                >
                  <View
                    style={[vs.summaryDot, { backgroundColor: '#00B894' }]}
                  />
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isDark ? '#55EFC4' : '#00B894',
                    }}
                  >
                    {statusCounts.normal}
                  </AppText>
                </View>
              )}
              {statusCounts.warning > 0 && (
                <View
                  style={[
                    vs.summaryPill,
                    { backgroundColor: '#F39C12' + pillOp },
                  ]}
                >
                  <View
                    style={[
                      vs.summaryDot,
                      { backgroundColor: isDark ? '#FECA57' : '#F39C12' },
                    ]}
                  />
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isDark ? '#FECA57' : '#F39C12',
                    }}
                  >
                    {statusCounts.warning}
                  </AppText>
                </View>
              )}
              {statusCounts.danger > 0 && (
                <View
                  style={[
                    vs.summaryPill,
                    { backgroundColor: '#E74C3C' + pillOp },
                  ]}
                >
                  <View
                    style={[
                      vs.summaryDot,
                      { backgroundColor: isDark ? '#FF6B6B' : '#E74C3C' },
                    ]}
                  />
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isDark ? '#FF6B6B' : '#E74C3C',
                    }}
                  >
                    {statusCounts.danger}
                  </AppText>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Primary metric grid (6 cards, 2 cols) ──────────────────── */}
        <View style={vs.vitalsGrid}>
          {primaryMetrics.map(mt => {
            const latest = latestByType[mt.key];
            const status = latest
              ? getMetricStatus(mt.key, latest.value)
              : 'normal';
            const sc = STATUS_COLORS[status];
            const hasValue = !!latest;

            return (
              <TouchableOpacity
                key={mt.key}
                onPress={() => openAddMetric(mt.key)}
                activeOpacity={0.76}
                style={[
                  vs.vCard,
                  {
                    backgroundColor: cardBg,
                    ...shadows.sm,
                    borderWidth: 1,
                    borderColor: cardBorder,
                    borderStyle: hasValue ? 'solid' : 'dashed',
                  },
                ]}
              >
                {hasValue ? (
                  <>
                    {/* Colored top band */}
                    <View
                      style={[
                        vs.vCardBand,
                        { backgroundColor: mt.color + bandOp },
                      ]}
                    >
                      <View
                        style={[
                          vs.vCardIconWrap,
                          { backgroundColor: mt.color + iconOp },
                        ]}
                      >
                        <AppText style={{ fontSize: 17 }}>{mt.emoji}</AppText>
                      </View>
                      <AppText
                        numberOfLines={1}
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: mt.color,
                          flex: 1,
                          marginLeft: 8,
                          letterSpacing: 0.1,
                        }}
                      >
                        {mt.label}
                      </AppText>
                    </View>

                    {/* Value body */}
                    <View style={vs.vCardBody}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'baseline',
                          gap: 4,
                        }}
                      >
                        <AppText
                          style={{
                            fontSize: 26,
                            fontWeight: '800',
                            color: colors.textPrimary,
                            letterSpacing: -0.5,
                            lineHeight: 32,
                          }}
                        >
                          {latest.value}
                        </AppText>
                        {mt.unit ? (
                          <AppText
                            style={{
                              fontSize: 12,
                              color: colors.textSecondary,
                              fontWeight: '500',
                              marginBottom: 2,
                            }}
                          >
                            {mt.unit}
                          </AppText>
                        ) : null}
                      </View>

                      {/* Status pill + time */}
                      <View style={vs.vCardFooter}>
                        <View
                          style={[
                            vs.statusPill2,
                            { backgroundColor: sc + pillOp },
                          ]}
                        >
                          <View
                            style={[vs.statusDot2, { backgroundColor: sc }]}
                          />
                          <AppText
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color: sc,
                              letterSpacing: 0.4,
                            }}
                          >
                            {STATUS_LABELS[status].toUpperCase()}
                          </AppText>
                        </View>
                        <AppText
                          style={{
                            fontSize: 10,
                            color: colors.textSecondary,
                            fontWeight: '500',
                          }}
                        >
                          {relativeTime(latest.recordedAt)}
                        </AppText>
                      </View>
                    </View>
                  </>
                ) : (
                  /* Empty / not-logged state */
                  <View style={vs.vCardEmpty}>
                    <View
                      style={[
                        vs.emptyRing,
                        {
                          borderColor: mt.color + ringOp,
                          backgroundColor: mt.color + ringBgOp,
                        },
                      ]}
                    >
                      <AppText style={{ fontSize: 24 }}>{mt.emoji}</AppText>
                    </View>
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: colors.textSecondary,
                        marginTop: 10,
                        textAlign: 'center',
                      }}
                    >
                      {mt.label}
                    </AppText>
                    <View
                      style={[
                        vs.logBadge,
                        {
                          backgroundColor: mt.color + badgeBgOp,
                          borderColor: mt.color + badgeBrdOp,
                        },
                      ]}
                    >
                      <AppIcon name="add" size={11} color={mt.color} />
                      <AppText
                        style={{
                          fontSize: 11,
                          color: mt.color,
                          fontWeight: '700',
                          marginLeft: 3,
                        }}
                      >
                        Log
                      </AppText>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── BMI full-width card ─────────────────────────────────────── */}
        {bmiMetric &&
          (() => {
            const latest = latestByType[bmiMetric.key];
            const status = latest
              ? getMetricStatus(bmiMetric.key, latest.value)
              : 'normal';
            const sc = STATUS_COLORS[status];
            return (
              <TouchableOpacity
                onPress={() => openAddMetric(bmiMetric.key)}
                activeOpacity={0.76}
                style={[
                  vs.bmiCard,
                  {
                    backgroundColor: cardBg,
                    borderColor: latest
                      ? bmiMetric.color + (isDark ? '70' : '40')
                      : cardBorder,
                    ...shadows.sm,
                  },
                ]}
              >
                <View
                  style={[
                    vs.bmiBand,
                    { backgroundColor: bmiMetric.color + bandOp },
                  ]}
                >
                  <View
                    style={[
                      vs.bmiIconWrap,
                      { backgroundColor: bmiMetric.color + iconOp },
                    ]}
                  >
                    <AppText style={{ fontSize: 20 }}>
                      {bmiMetric.emoji}
                    </AppText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText
                      style={{
                        fontSize: 14,
                        fontWeight: '800',
                        color: colors.textPrimary,
                      }}
                    >
                      Body Mass Index (BMI)
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginTop: 1,
                      }}
                    >
                      Calculated weight-to-height ratio
                    </AppText>
                  </View>
                  {latest ? (
                    <View
                      style={[vs.statusPill2, { backgroundColor: sc + pillOp }]}
                    >
                      <View style={[vs.statusDot2, { backgroundColor: sc }]} />
                      <AppText
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: sc,
                          letterSpacing: 0.4,
                        }}
                      >
                        {STATUS_LABELS[status].toUpperCase()}
                      </AppText>
                    </View>
                  ) : (
                    <View
                      style={[
                        vs.logBadge,
                        {
                          backgroundColor: bmiMetric.color + badgeBgOp,
                          borderColor: bmiMetric.color + badgeBrdOp,
                        },
                      ]}
                    >
                      <AppIcon name="add" size={11} color={bmiMetric.color} />
                      <AppText
                        style={{
                          fontSize: 11,
                          color: bmiMetric.color,
                          fontWeight: '700',
                          marginLeft: 3,
                        }}
                      >
                        Log
                      </AppText>
                    </View>
                  )}
                </View>
                {latest && (
                  <View
                    style={{
                      paddingHorizontal: 16,
                      paddingBottom: 14,
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 30,
                        fontWeight: '800',
                        color: colors.textPrimary,
                        letterSpacing: -0.5,
                      }}
                    >
                      {latest.value}
                    </AppText>
                    <AppText
                      style={{ fontSize: 13, color: colors.textSecondary }}
                    >
                      kg/m²
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginLeft: 6,
                      }}
                    >
                      {relativeTime(latest.recordedAt)}
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}

        {/* ── Trend charts ────────────────────────────────────────────── */}
        {glucoseHistory.length > 1 && (
          <View
            style={[
              vs.chartCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                ...shadows.sm,
              },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <View
                style={[vs.chartIconDot, { backgroundColor: '#FB8C00' + '20' }]}
              >
                <AppText style={{ fontSize: 13 }}>🩸</AppText>
              </View>
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}
              >
                Blood Glucose Trend
              </AppText>
            </View>
            <SimpleBarChart
              data={glucoseHistory.map(g => ({
                label: g.label,
                value: g.value,
                unit: 'mg/dL',
                color: '#FB8C00',
              }))}
              title="mg/dL"
              height={140}
            />
          </View>
        )}
        {bpHistory.length > 1 && (
          <View
            style={[
              vs.chartCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                ...shadows.sm,
              },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <View
                style={[vs.chartIconDot, { backgroundColor: '#E53935' + '20' }]}
              >
                <AppText style={{ fontSize: 13 }}>🫀</AppText>
              </View>
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}
              >
                Blood Pressure Trend
              </AppText>
            </View>
            <SimpleBarChart
              data={bpHistory.map(g => ({
                label: g.label,
                value: g.value,
                unit: 'mmHg',
                color: '#E53935',
              }))}
              title="mmHg"
              height={140}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Profile Header Card */}
      <View
        style={[
          styles.profileHeader,
          { backgroundColor: colors.primary, paddingTop: insets.top + 24 },
        ]}
      >
        <View style={styles.profileHeaderContent}>
          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handlePickAvatar}
            activeOpacity={0.8}
          >
            {form.avatarUri ? (
              <Image source={{ uri: form.avatarUri }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: 'rgba(255,255,255,0.2)' },
                ]}
              >
                <AppText
                  variant="heading1"
                  style={{ color: '#fff', fontWeight: '800', fontSize: 28 }}
                >
                  {initials}
                </AppText>
              </View>
            )}
            <View
              style={[
                styles.avatarBadge,
                {
                  backgroundColor: '#0D7C66',
                  borderWidth: 2,
                  borderColor: colors.primary,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  right: -2,
                  bottom: -2,
                },
              ]}
            >
              <AppIcon name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Info */}
          <View style={{ flex: 1, marginLeft: 16 }}>
            <AppText
              variant="heading2"
              style={{ color: '#fff', fontWeight: '800' }}
              numberOfLines={1}
            >
              {userName || 'Setup Profile'}
            </AppText>
            <AppText
              variant="caption"
              style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}
            >
              {userName
                ? 'Manage your personal and health information'
                : 'Tap below to add your details'}
            </AppText>
            <View style={styles.privacyBadge}>
              <AppIcon
                name="shield-checkmark"
                size={14}
                color="rgba(255,255,255,0.9)"
              />
              <AppText
                variant="small"
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  marginLeft: 6,
                  fontWeight: '600',
                }}
              >
                Private & secure
              </AppText>
            </View>
          </View>
        </View>

        {/* Quick Stats — 2-column grid */}
        {(form.heightCm > 0 ||
          form.weightKg > 0 ||
          form.conditions.length > 0 ||
          form.bloodGroup) &&
          (() => {
            const isMetric = form.units !== 'imperial';
            const bmi =
              form.heightCm > 0 && form.weightKg > 0
                ? (form.weightKg / Math.pow(form.heightCm / 100, 2)).toFixed(1)
                : null;
            const stats = [
              form.heightCm > 0 && {
                label: 'Height',
                value: isMetric
                  ? `${form.heightCm} cm`
                  : `${Math.round(form.heightCm * 0.393701)} in`,
              },
              form.weightKg > 0 && {
                label: 'Weight',
                value: isMetric
                  ? `${form.weightKg} kg`
                  : `${Math.round(form.weightKg * 2.20462)} lbs`,
              },
              bmi && { label: 'BMI', value: bmi },
              form.bloodGroup &&
                form.bloodGroup !== 'Unknown' && {
                  label: 'Blood',
                  value: form.bloodGroup,
                },
              form.conditions.length > 0 && {
                label: 'Conditions',
                value: String(form.conditions.length),
              },
              (form.currentMedications?.length ?? 0) > 0 && {
                label: 'Meds',
                value: String(form.currentMedications.length),
              },
            ].filter(Boolean) as { label: string; value: string }[];

            return (
              <View style={styles.statsGrid}>
                {stats.map(stat => (
                  <View key={stat.label} style={styles.statCard}>
                    <AppText
                      style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.65)',
                        fontWeight: '600',
                        letterSpacing: 0.5,
                      }}
                    >
                      {stat.label.toUpperCase()}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 15,
                        color: '#fff',
                        fontWeight: '800',
                        marginTop: 2,
                      }}
                    >
                      {stat.value}
                    </AppText>
                  </View>
                ))}
              </View>
            );
          })()}
      </View>

      {/* Tab bar — horizontal scrollable pills */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 10,
          }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : colors.surfaceVariant,
                  },
                ]}
              >
                <AppIcon
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#fff' : colors.textSecondary}
                />
                <AppText
                  variant="small"
                  style={{
                    color: isActive ? '#fff' : colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                    marginLeft: 6,
                    fontSize: 13,
                  }}
                >
                  {tab.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'personal' && renderPersonalTab()}
        {activeTab === 'health' && renderHealthTab()}
        {activeTab === 'vitals' && renderVitalsTab()}
        {activeTab === 'lifestyle' && renderLifestyleTab()}
        {activeTab === 'preferences' && renderPreferencesTab()}

        {/* Save Button (Not sticky) */}
        <View style={{ padding: 20, marginTop: 10 }}>
          <AppButton
            variant="primary"
            fullWidth
            size="md"
            onPress={handleSave}
            disabled={saving}
            style={{ borderRadius: 12, height: 48 }}
          >
            {saving ? 'Saving…' : 'Save & Continue'}
          </AppButton>
        </View>
      </ScrollView>

      {/* Add Metric Modal */}
      <Modal
        visible={metricModalVisible}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
      >
        <View style={vs.overlay}>
          <View style={[vs.modalCard, { backgroundColor: colors.surface }]}>
            <View
              style={[vs.modalHandle, { backgroundColor: colors.borderLight }]}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <View
                style={[
                  vs.modalIcon,
                  {
                    backgroundColor:
                      (METRIC_TYPES.find(m => m.key === selectedMetricType)
                        ?.color || colors.primary) + '18',
                  },
                ]}
              >
                <AppText style={{ fontSize: 24 }}>
                  {METRIC_TYPES.find(m => m.key === selectedMetricType)?.emoji}
                </AppText>
              </View>
              <View>
                <AppText
                  variant="heading3"
                  style={{ fontWeight: '700', color: colors.textPrimary }}
                >
                  Log{' '}
                  {METRIC_TYPES.find(m => m.key === selectedMetricType)?.label}
                </AppText>
                <AppText variant="caption" color="secondary">
                  Unit:{' '}
                  {METRIC_TYPES.find(m => m.key === selectedMetricType)?.unit ||
                    'N/A'}
                </AppText>
              </View>
            </View>
            <AppInput
              placeholder={
                METRIC_TYPES.find(m => m.key === selectedMetricType)
                  ?.placeholder
              }
              value={newMetricValue}
              onChangeText={setNewMetricValue}
              keyboardType="decimal-pad"
              autoFocus
              inputContainerStyle={{ borderRadius: 12 }}
            />
            <AppInput
              placeholder="Notes (optional)…"
              value={newMetricNotes}
              onChangeText={setNewMetricNotes}
              multiline
              inputContainerStyle={{ borderRadius: 12 }}
              containerStyle={{ marginTop: 8 }}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[vs.modalBtn, { borderColor: colors.border }]}
                onPress={() => setMetricModalVisible(false)}
              >
                <AppText variant="bodyMedium" color="secondary">
                  Cancel
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  vs.modalBtn,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={saveMetric}
              >
                <AppText
                  variant="bodyMedium"
                  style={{ color: '#fff', fontWeight: '700' }}
                >
                  Save
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DOB Selector Dialog */}
      <AppDialog
        visible={dobModalVisible}
        onClose={() => setDobModalVisible(false)}
        title="Set Birth Date"
        icon="calendar"
        buttons={[
          {
            text: 'Cancel',
            onPress: () => setDobModalVisible(false),
            variant: 'ghost',
          },
          { text: 'Confirm', onPress: handleDobConfirm, variant: 'primary' },
        ]}
      >
        <View style={styles.dobContainer}>
          <View style={styles.dobField}>
            <AppText variant="caption">Day</AppText>
            <TextInput
              style={[
                styles.dobInput,
                { color: colors.textPrimary, borderColor: colors.borderLight },
              ]}
              value={tempDob.day}
              onChangeText={v =>
                setTempDob(p => ({ ...p, day: v.slice(0, 2) }))
              }
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={styles.dobField}>
            <AppText variant="caption">Month</AppText>
            <TextInput
              style={[
                styles.dobInput,
                { color: colors.textPrimary, borderColor: colors.borderLight },
              ]}
              value={tempDob.month}
              onChangeText={v =>
                setTempDob(p => ({ ...p, month: v.slice(0, 2) }))
              }
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={styles.dobField}>
            <AppText variant="caption">Year</AppText>
            <TextInput
              style={[
                styles.dobInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.borderLight,
                  width: 70,
                },
              ]}
              value={tempDob.year}
              onChangeText={v =>
                setTempDob(p => ({ ...p, year: v.slice(0, 4) }))
              }
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>
        <AppText
          variant="small"
          color="tertiary"
          align="center"
          style={{ marginTop: 12 }}
        >
          Your age will be automatically calculated.
        </AppText>
      </AppDialog>

      {/* Add Medication Dialog */}
      <AppDialog
        visible={medModalVisible}
        onClose={() => setMedModalVisible(false)}
        title="Add Medication"
        icon="pill"
        buttons={[
          {
            text: 'Cancel',
            onPress: () => setMedModalVisible(false),
            variant: 'ghost',
          },
          { text: 'Add', onPress: handleAddMedication, variant: 'primary' },
        ]}
      >
        <View style={{ gap: 12, marginTop: 8 }}>
          {renderInputField(
            'Medication Name',
            tempMed.name,
            v => setTempMed(p => ({ ...p, name: v })),
            'e.g. Lisinopril',
          )}
          <View style={styles.rowFields}>
            {renderInputField(
              'Dosage',
              tempMed.dosage,
              v => setTempMed(p => ({ ...p, dosage: v })),
              'e.g. 10mg',
            )}
            {renderInputField(
              'Frequency',
              tempMed.frequency,
              v => setTempMed(p => ({ ...p, frequency: v })),
              'e.g. Daily',
            )}
          </View>
        </View>
      </AppDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0D7C66',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  miniChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  tabBarScroll: {
    borderBottomWidth: 1,
    flexGrow: 0,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    padding: 16,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fieldGroup: {
    flex: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  suffix: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  suggestionScroll: {
    marginTop: 8,
    marginBottom: 4,
  },
  dobContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  dobField: {
    alignItems: 'center',
    gap: 4,
  },
  dobInput: {
    borderWidth: 1,
    borderRadius: 8,
    width: 50,
    height: 44,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});

const VCARD_W = (SCREEN_WIDTH - 48 - 12) / 2;

const vs = StyleSheet.create({
  // ── Section header ──────────────────────────────────────────────────────
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  summaryDot: { width: 6, height: 6, borderRadius: 3 },

  // ── Primary metric cards (2-col grid) ────────────────────────────────
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vCard: { width: VCARD_W, borderRadius: 18, overflow: 'hidden' },

  // Card with value
  vCardBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  vCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vCardBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 6,
  },
  vCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Status pill (used in grid cards and BMI)
  statusPill2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot2: { width: 5, height: 5, borderRadius: 2.5 },

  // Empty state card
  vCardEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    paddingHorizontal: 10,
  },
  emptyRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 9,
  },

  // ── BMI full-width card ──────────────────────────────────────────────
  bmiCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 2,
    borderWidth: 1,
  },
  bmiBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bmiIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Trend charts ─────────────────────────────────────────────────────
  chartCard: { padding: 16, borderRadius: 18, marginTop: 12, borderWidth: 1 },
  chartIconDot: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Keep legacy keys used by modals ──────────────────────────────────
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    width: (SCREEN_WIDTH - 48 - 24) / 4,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  historyCard: { overflow: 'hidden' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  histIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    padding: 24,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
  },

  // Legacy (kept to avoid ref errors elsewhere if any)
  vitalCard: { width: VCARD_W, padding: 14 },
  vitalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vitalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  addBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
});

export default HealthProfileScreen;

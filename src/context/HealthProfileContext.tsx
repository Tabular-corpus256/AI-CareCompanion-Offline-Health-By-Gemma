import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { DatabaseService } from '@services/DatabaseService';
import { AuthService, SyncService } from '@services/FirebaseService';
import type { HealthProfile } from '@types';

const DEFAULT_PROFILE: HealthProfile = {
  name: '',
  age: 0,
  gender: 'other',
  avatarUri: '',
  city: '',
  district: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  units: 'metric',
  weightKg: 0,
  heightCm: 0,
  bloodGroup: '',
  conditions: [],
  allergies: [],
  currentMedications: [],
  familyHistory: [],
  vaccinations: [],
  smoker: false,
  smokingFrequency: '',
  alcoholUse: false,
  alcoholFrequency: '',
  exerciseLevel: 'sedentary',
  dietType: 'None',
  waterGlasses: 4,
  stressLevel: 'moderate',
  energyLevel: 'moderate',
  bedtime: '22:00',
  wakeTime: '06:00',
  occupation: '',
  preferredLanguage: 'English',
  primaryGoals: [],
  communicationStyle: 'empathetic',
  medReminders: true,
  checkInTime: '08:00',
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  syncToCloud: false,
};

interface HealthProfileContextValue {
  profile: HealthProfile;
  isLoaded: boolean;
  loadProfile: () => Promise<void>;
  saveProfile: (p: HealthProfile) => Promise<void>;
  getProfileSummary: () => string;
}

const HealthProfileContext = createContext<HealthProfileContextValue>({
  profile: DEFAULT_PROFILE,
  isLoaded: false,
  loadProfile: async () => {},
  saveProfile: async () => {},
  getProfileSummary: () => '',
});

export function HealthProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      await DatabaseService.init();
      const row = await DatabaseService.queryFirst<{ value: string }>(
        "SELECT value FROM user_preferences WHERE key = 'health_profile'",
      );
      let loaded: Partial<typeof DEFAULT_PROFILE> = {};
      if (row?.value) {
        loaded = JSON.parse(row.value);
      }
      // If name not set in health profile, fall back to signup name
      if (!loaded.name) {
        const nameRow = await DatabaseService.queryFirst<{ value: string }>(
          "SELECT value FROM user_preferences WHERE key = 'profile_name'",
        );
        if (nameRow?.value) loaded = { ...loaded, name: nameRow.value };
      }
      setProfile({ ...DEFAULT_PROFILE, ...loaded });
    } catch (e) {
      console.warn('[HealthProfileContext] load failed:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveProfile = useCallback(async (p: HealthProfile) => {
    try {
      await DatabaseService.execute(
        "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('health_profile', ?)",
        [JSON.stringify(p)],
      );
      setProfile(p);
      // Sync to Firestore
      if (AuthService.userId) {
        SyncService.pushEntity(
          AuthService.userId,
          'profile',
          'health_profile',
          p as Record<string, any>,
        );
      }
    } catch (e) {
      console.warn('[HealthProfileContext] save failed:', e);
    }
  }, []);

  const getProfileSummary = useCallback((): string => {
    if (!profile.name && !profile.age) return '';
    const bmi =
      profile.heightCm > 0
        ? (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
        : null;
    const lines = [
      `Patient: ${profile.name || 'User'}, ${profile.age}yr, ${profile.gender}`,
      `Weight: ${profile.weightKg}kg, Height: ${profile.heightCm}cm${
        bmi ? `, BMI: ${bmi}` : ''
      }`,
      profile.bloodGroup ? `Blood group: ${profile.bloodGroup}` : '',
      profile.conditions.length
        ? `Conditions: ${profile.conditions.join(', ')}`
        : '',
      profile.allergies.length
        ? `Allergies: ${profile.allergies.join(', ')}`
        : '',
      profile.currentMedications.length
        ? `Current meds: ${profile.currentMedications.join(', ')}`
        : '',
      `Lifestyle: ${profile.smoker ? 'smoker' : 'non-smoker'}, exercise: ${
        profile.exerciseLevel
      }`,
    ].filter(Boolean);
    return `\n\n[PATIENT CONTEXT]\n${lines.join('\n')}`;
  }, [profile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return (
    <HealthProfileContext.Provider
      value={{ profile, isLoaded, loadProfile, saveProfile, getProfileSummary }}
    >
      {children}
    </HealthProfileContext.Provider>
  );
}

export function useHealthProfile() {
  return useContext(HealthProfileContext);
}

export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export type ChatHistoryEntry = { role: 'user' | 'assistant'; content: string };

export type ThemeMode = 'light' | 'dark';

export type ModelStatusState =
  | 'missing'
  | 'downloaded'
  | 'loading'
  | 'ready'
  | 'error';

export interface ModelStatus {
  state: ModelStatusState;
  modelName: string;
  modelPath: string;
  fileSize?: number;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AbortController {
  abort: () => void;
  isAborted: boolean;
}

export function success<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function failure<E = string>(error: E): Result<never, E> {
  return { ok: false, error };
}

export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
}

export interface DoctorAgent {
  id: string;
  displayName: string;
  specialty: string;
  systemPrompt: string;
  tools: string[];
  supportsImage: boolean;
  icon: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  village: string;
  userId: string;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Consultation {
  id: string;
  patientId: string;
  agentId: string;
  userInput: string;
  aiResponse: string;
  userId: string;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Drug {
  name: string;
  indication: string;
  dosageAdult: string;
  dosageChild: string;
  contraindications: string;
}

export interface LabTest {
  testName: string;
  unit: string;
  normalLow: number;
  normalHigh: number;
  interpretationGuide: string;
}

export interface SkinRemedy {
  conditionKeywords: string;
  naturalRemedy: string;
  otcCream: string;
  referralFlag: number;
}

export interface Hospital {
  id: number;
  name: string;
  district: string;
  distanceKm: number;
  phone: string;
  services: string;
}

export interface Reminder {
  id: string;
  type: 'pill' | 'water' | 'exercise';
  title: string;
  time: string;
  days: string;
  enabled: number;
  userId: string;
  updatedAt: number;
  deletedAt: number | null;
}

export interface OutboxEntry {
  id: string;
  operation: 'upsert' | 'delete';
  entity: string;
  entityId: string;
  payload: string;
  createdAt: number;
  attempts: number;
  lastError: string | null;
  userId: string;
}

export interface OrchestratorResult {
  primarySpecialist: string;
  secondarySpecialists: string[];
  confidence: number;
  reasoning: string;
}

/** Enhanced message type with timing and agent metadata */
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isOrchestrator?: boolean;
  routingInfo?: OrchestratorResult;
  /** Which agent produced this response */
  agentId?: string;
  agentDisplayName?: string;
  /** Time in ms the agent took to respond */
  responseTimeMs?: number;
  /** Whether this message is still streaming */
  isStreaming?: boolean;
  /** Local URI of attached image (display only, not persisted) */
  imageUri?: string;
  /** MIME type of attached image */
  imageMimeType?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  agentId: string;
  userId: string;
  messageCount: number;
  lastPreview: string;
}

/** Voice recording state */
export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

/** Medication record for profile */
export interface ProfileMedication {
  name: string;
  dosage: string;
  frequency: string;
}

/** Patient health profile stored globally */
export interface HealthProfile {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  avatarUri?: string;
  city?: string;
  district?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  units?: 'metric' | 'imperial';
  weightKg: number;
  heightCm: number;
  bloodGroup: string;
  conditions: string[];
  allergies: string[];
  currentMedications: ProfileMedication[];
  familyHistory?: string[];
  vaccinations?: string[];
  smoker: boolean;
  smokingFrequency?: string;
  alcoholUse: boolean;
  alcoholFrequency?: string;
  exerciseLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  dietType?: string;
  waterGlasses?: number;
  stressLevel?: 'low' | 'moderate' | 'high' | 'severe';
  energyLevel?: 'low' | 'moderate' | 'high';
  bedtime?: string;
  wakeTime?: string;
  occupation?: string;
  preferredLanguage?: string;
  primaryGoals?: string[];
  communicationStyle?: 'clinical' | 'empathetic' | 'holistic' | 'educational';
  medReminders?: boolean;
  checkInTime?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  syncToCloud?: boolean;
}

/** Medication record */
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  indication: string;
  startDate: number;
  endDate: number | null;
  reminderEnabled: number;
  reminderTimes: string;
  notes: string;
  userId: string;
  updatedAt: number;
  deletedAt: number | null;
}

/** Health metric measurement */
export interface HealthMetric {
  id: string;
  type: 'blood_pressure' | 'blood_glucose' | 'weight' | 'bmi' | 'heart_rate' | 'temperature' | 'oxygen_saturation';
  value: string;
  unit: string;
  recordedAt: number;
  notes: string;
  userId: string;
}

/** First aid guide entry */
export interface FirstAidGuide {
  id: string;
  title: string;
  category: string;
  steps: string[];
  warnings: string[];
  callEmergencyIf: string[];
}

/** Nearby hospital/clinic */
export interface NearbyFacility {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'emergency';
  address: string;
  phone: string;
  distance: string;
  services: string[];
  latitude?: number;
  longitude?: number;
}

import type { ValidationResult } from '@types';

const MAX_PROMPT_LENGTH = 2000;
const MIN_PROMPT_LENGTH = 3;
const URL_PATTERN = /^https?:\/\/.+/i;

export function validateSymptomInput(params: {
  symptoms: string;
  duration: string;
  ageGroup: string;
}): ValidationResult {
  const errors: string[] = [];
  if (
    !params.symptoms.trim() ||
    params.symptoms.trim().length < MIN_PROMPT_LENGTH
  ) {
    errors.push('Please describe your symptoms (at least 3 characters)');
  }
  if (params.symptoms.length > MAX_PROMPT_LENGTH) {
    errors.push(
      `Symptoms description too long (max ${MAX_PROMPT_LENGTH} characters)`,
    );
  }
  if (params.duration.length > 200) {
    errors.push('Duration description too long');
  }
  if (params.ageGroup.length > 100) {
    errors.push('Age group too long');
  }
  return { valid: errors.length === 0, errors };
}

export function validateHealthTipsInput(params: {
  concern: string;
}): ValidationResult {
  const errors: string[] = [];
  if (params.concern.length > MAX_PROMPT_LENGTH) {
    errors.push(
      `Concern description too long (max ${MAX_PROMPT_LENGTH} characters)`,
    );
  }
  return { valid: errors.length === 0, errors };
}

export function validateDietInput(params: {
  restrictions: string;
  calories: string;
  preferences: string;
}): ValidationResult {
  const errors: string[] = [];
  if (params.restrictions.length > 500) {
    errors.push('Dietary restrictions too long');
  }
  if (params.calories && !/^\d+$/.test(params.calories)) {
    errors.push('Calories must be a number');
  }
  if (
    params.calories &&
    (parseInt(params.calories, 10) < 500 ||
      parseInt(params.calories, 10) > 10000)
  ) {
    errors.push('Calories should be between 500 and 10000');
  }
  if (params.preferences.length > 500) {
    errors.push('Food preferences too long');
  }
  return { valid: errors.length === 0, errors };
}

export function validateExerciseInput(params: {
  goals: string;
  limitations: string;
}): ValidationResult {
  const errors: string[] = [];
  if (!params.goals.trim() || params.goals.trim().length < MIN_PROMPT_LENGTH) {
    errors.push('Please describe your fitness goals (at least 3 characters)');
  }
  if (params.goals.length > MAX_PROMPT_LENGTH) {
    errors.push(
      `Goals description too long (max ${MAX_PROMPT_LENGTH} characters)`,
    );
  }
  if (params.limitations.length > 500) {
    errors.push('Limitations description too long');
  }
  return { valid: errors.length === 0, errors };
}

export function validateChatInput(text: string): ValidationResult {
  const errors: string[] = [];
  if (!text.trim()) {
    errors.push('Message cannot be empty');
  }
  if (text.length > MAX_PROMPT_LENGTH) {
    errors.push(`Message too long (max ${MAX_PROMPT_LENGTH} characters)`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateDownloadUrl(url: string): ValidationResult {
  const errors: string[] = [];
  if (!url.trim()) {
    errors.push('URL cannot be empty');
  }
  if (!URL_PATTERN.test(url.trim())) {
    errors.push('Please enter a valid URL starting with http:// or https://');
  }
  return { valid: errors.length === 0, errors };
}

import {
  validateSymptomInput,
  validateDietInput,
  validateExerciseInput,
  validateHealthTipsInput,
  validateChatInput,
  validateDownloadUrl,
} from '../src/utils/validation';

describe('validateSymptomInput', () => {
  it('rejects empty symptoms', () => {
    const result = validateSymptomInput({
      symptoms: '',
      duration: '',
      ageGroup: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects too-short symptoms', () => {
    const result = validateSymptomInput({
      symptoms: 'ab',
      duration: '',
      ageGroup: '',
    });
    expect(result.valid).toBe(false);
  });

  it('accepts valid symptom input', () => {
    const result = validateSymptomInput({
      symptoms: 'headache',
      duration: '2 days',
      ageGroup: '25-34',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects overly long symptoms', () => {
    const result = validateSymptomInput({
      symptoms: 'x'.repeat(2001),
      duration: '',
      ageGroup: '',
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateDietInput', () => {
  it('rejects non-numeric calories', () => {
    const result = validateDietInput({
      restrictions: '',
      calories: 'abc',
      preferences: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('number'))).toBe(true);
  });

  it('rejects calories out of range', () => {
    const result = validateDietInput({
      restrictions: '',
      calories: '100',
      preferences: '',
    });
    expect(result.valid).toBe(false);
  });

  it('accepts valid diet input', () => {
    const result = validateDietInput({
      restrictions: 'vegetarian',
      calories: '2000',
      preferences: '',
    });
    expect(result.valid).toBe(true);
  });
});

describe('validateExerciseInput', () => {
  it('rejects empty goals', () => {
    const result = validateExerciseInput({ goals: '', limitations: '' });
    expect(result.valid).toBe(false);
  });

  it('accepts valid exercise input', () => {
    const result = validateExerciseInput({
      goals: 'Build muscle',
      limitations: '',
    });
    expect(result.valid).toBe(true);
  });
});

describe('validateHealthTipsInput', () => {
  it('accepts empty concern (optional field)', () => {
    const result = validateHealthTipsInput({ concern: '' });
    expect(result.valid).toBe(true);
  });

  it('rejects overly long concern', () => {
    const result = validateHealthTipsInput({ concern: 'x'.repeat(2001) });
    expect(result.valid).toBe(false);
  });
});

describe('validateChatInput', () => {
  it('rejects empty message', () => {
    const result = validateChatInput('');
    expect(result.valid).toBe(false);
  });

  it('rejects whitespace-only message', () => {
    const result = validateChatInput('   ');
    expect(result.valid).toBe(false);
  });

  it('rejects too-long message', () => {
    const result = validateChatInput('x'.repeat(501));
    expect(result.valid).toBe(false);
  });

  it('accepts valid message', () => {
    const result = validateChatInput('Hello, how are you?');
    expect(result.valid).toBe(true);
  });
});

describe('validateDownloadUrl', () => {
  it('rejects empty URL', () => {
    const result = validateDownloadUrl('');
    expect(result.valid).toBe(false);
  });

  it('rejects invalid URL', () => {
    const result = validateDownloadUrl('not-a-url');
    expect(result.valid).toBe(false);
  });

  it('accepts valid HTTPS URL', () => {
    const result = validateDownloadUrl('https://huggingface.co/model.gguf');
    expect(result.valid).toBe(true);
  });

  it('accepts valid HTTP URL', () => {
    const result = validateDownloadUrl('http://example.com/model.gguf');
    expect(result.valid).toBe(true);
  });
});

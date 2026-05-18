import { success, failure } from '../src/types';

describe('Result helpers', () => {
  it('success creates ok result', () => {
    const result = success('data');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('data');
    }
  });

  it('failure creates error result', () => {
    const result = failure('something went wrong');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('something went wrong');
    }
  });
});

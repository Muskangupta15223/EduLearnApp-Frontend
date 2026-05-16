import { buildCoursePaymentKey } from '../payment';

describe('payment utils - course idempotency keys', () => {
  test('builds stable idempotency keys per user and course', () => {
    expect(buildCoursePaymentKey(12, 44)).toBe('12-course-44');
  });

  test('falls back to guest when user id is missing', () => {
    expect(buildCoursePaymentKey(null, 44)).toBe('guest-course-44');
  });

  test('falls back to guest when user id is an empty string', () => {
    expect(buildCoursePaymentKey('', 44)).toBe('guest-course-44');
  });

  test('preserves zero-like course ids in the generated course payment key', () => {
    expect(buildCoursePaymentKey(5, 0)).toBe('5-course-0');
  });

  test('supports string-based user ids in course payment keys', () => {
    expect(buildCoursePaymentKey('user-22', 44)).toBe('user-22-course-44');
  });
});

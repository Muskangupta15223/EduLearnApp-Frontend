import { buildSubscriptionPaymentKey } from '../payment';

describe('payment utils - subscription idempotency keys', () => {
  test('builds stable subscription keys per user and plan', () => {
    expect(buildSubscriptionPaymentKey(12, 'MONTHLY')).toBe('12-subscription-MONTHLY');
  });

  test('falls back to guest for subscription keys when user id is missing', () => {
    expect(buildSubscriptionPaymentKey(undefined, 'ANNUAL')).toBe('guest-subscription-ANNUAL');
  });

  test('falls back to guest for subscription keys when user id is an empty string', () => {
    expect(buildSubscriptionPaymentKey('', 'MONTHLY')).toBe('guest-subscription-MONTHLY');
  });

  test('supports free plan subscription keys', () => {
    expect(buildSubscriptionPaymentKey(88, 'FREE')).toBe('88-subscription-FREE');
  });

  test('supports string-based plan identifiers', () => {
    expect(buildSubscriptionPaymentKey(7, 'COURSE_101')).toBe('7-subscription-COURSE_101');
  });
});

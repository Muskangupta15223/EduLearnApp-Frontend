import { getPostLoginRoute, parseOAuthRedirectParams } from '../auth';

describe('auth utils - routing and invalid oauth cases', () => {
  test('returns null when oauth params are incomplete', () => {
    expect(parseOAuthRedirectParams('?token=abc123')).toBeNull();
  });

  test('returns null when token is missing', () => {
    expect(parseOAuthRedirectParams('?userId=1&email=test%40mail.com')).toBeNull();
  });

  test('returns null when old oauth user payload is invalid json', () => {
    expect(parseOAuthRedirectParams('?token=abc123&user=%7Bbad-json')).toBeNull();
  });

  test('returns null when old oauth user payload cannot be decoded', () => {
    expect(parseOAuthRedirectParams('?token=abc123&user=%E0%A4%A')).toBeNull();
  });

  test('maps roles to their landing routes', () => {
    expect(getPostLoginRoute('ADMIN')).toBe('/admin');
    expect(getPostLoginRoute('INSTRUCTOR')).toBe('/instructor');
    expect(getPostLoginRoute('STUDENT')).toBe('/student');
    expect(getPostLoginRoute(undefined)).toBe('/student');
    expect(getPostLoginRoute('UNKNOWN')).toBe('/student');
  });
});

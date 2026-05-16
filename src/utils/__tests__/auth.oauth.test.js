import { parseOAuthRedirectParams } from '../auth';

describe('auth utils - oauth redirect parsing', () => {
  test('parses new oauth redirect param format with defaults', () => {
    expect(
      parseOAuthRedirectParams('?token=jwt-token&userId=42&email=riya%40mail.com&name=Riya')
    ).toEqual({
      token: 'jwt-token',
      user: {
        id: 42,
        email: 'riya@mail.com',
        name: 'Riya',
        fullName: 'Riya',
        role: 'STUDENT',
        avatarUrl: '',
      },
    });
  });

  test('parses new oauth redirect param format with explicit role and avatar', () => {
    expect(
      parseOAuthRedirectParams(
        '?token=jwt-token&userId=7&email=admin%40mail.com&name=Anika&role=ADMIN&avatarUrl=https%3A%2F%2Fcdn.test%2Favatar.png'
      )
    ).toEqual({
      token: 'jwt-token',
      user: {
        id: 7,
        email: 'admin@mail.com',
        name: 'Anika',
        fullName: 'Anika',
        role: 'ADMIN',
        avatarUrl: 'https://cdn.test/avatar.png',
      },
    });
  });

  test('parses new oauth redirect format when only email is available', () => {
    expect(
      parseOAuthRedirectParams('?token=email-token&email=solo%40mail.com')
    ).toEqual({
      token: 'email-token',
      user: {
        id: undefined,
        email: 'solo@mail.com',
        name: '',
        fullName: '',
        role: 'STUDENT',
        avatarUrl: '',
      },
    });
  });

  test('parses old oauth format when user json is already plain text', () => {
    const rawUser = JSON.stringify({
      id: 3,
      role: 'STUDENT',
      name: 'Dev',
      imageUrl: 'https://cdn.test/plain.png',
    });

    expect(parseOAuthRedirectParams(`?token=plain-token&user=${rawUser}`)).toEqual({
      token: 'plain-token',
      user: {
        id: 3,
        role: 'STUDENT',
        name: 'Dev',
        imageUrl: 'https://cdn.test/plain.png',
        fullName: 'Dev',
        avatarUrl: 'https://cdn.test/plain.png',
      },
    });
  });

  test('parses google oauth redirect params', () => {
    const user = encodeURIComponent(JSON.stringify({
      id: 9,
      role: 'INSTRUCTOR',
      name: 'Asha',
      fullName: 'Asha',
      avatarUrl: 'https://lh3.googleusercontent.com/a-photo',
    }));

    expect(parseOAuthRedirectParams(`?token=abc123&user=${user}`)).toEqual({
      token: 'abc123',
      user: {
        id: 9,
        role: 'INSTRUCTOR',
        name: 'Asha',
        fullName: 'Asha',
        avatarUrl: 'https://lh3.googleusercontent.com/a-photo',
      },
    });
  });

  test('normalizes google picture field into avatarUrl', () => {
    const user = encodeURIComponent(JSON.stringify({
      id: 10,
      role: 'STUDENT',
      name: 'Riya',
      fullName: 'Riya',
      picture: 'https://lh3.googleusercontent.com/google-picture',
    }));

    expect(parseOAuthRedirectParams(`?token=oauth-token&user=${user}`)).toEqual({
      token: 'oauth-token',
      user: {
        id: 10,
        role: 'STUDENT',
        name: 'Riya',
        fullName: 'Riya',
        picture: 'https://lh3.googleusercontent.com/google-picture',
        avatarUrl: 'https://lh3.googleusercontent.com/google-picture',
      },
    });
  });

  test('keeps provided fullName when old oauth format already contains it', () => {
    const user = encodeURIComponent(JSON.stringify({
      id: 11,
      role: 'ADMIN',
      name: 'Rohan',
      fullName: 'Rohan Sharma',
      avatarUrl: 'https://cdn.test/rohan.png',
    }));

    expect(parseOAuthRedirectParams(`?token=admin-token&user=${user}`)).toEqual({
      token: 'admin-token',
      user: {
        id: 11,
        role: 'ADMIN',
        name: 'Rohan',
        fullName: 'Rohan Sharma',
        avatarUrl: 'https://cdn.test/rohan.png',
      },
    });
  });

  test('normalizes legacy profile image fields into avatarUrl', () => {
    const user = encodeURIComponent(JSON.stringify({
      id: 12,
      role: 'STUDENT',
      name: 'Mia',
      profileImage: 'https://cdn.test/profile.png',
    }));

    expect(parseOAuthRedirectParams(`?token=legacy-token&user=${user}`)).toEqual({
      token: 'legacy-token',
      user: {
        id: 12,
        role: 'STUDENT',
        name: 'Mia',
        profileImage: 'https://cdn.test/profile.png',
        fullName: 'Mia',
        avatarUrl: 'https://cdn.test/profile.png',
      },
    });
  });

  test('uses photoUrl when avatarUrl and picture fields are not present', () => {
    const user = encodeURIComponent(JSON.stringify({
      id: 15,
      role: 'INSTRUCTOR',
      name: 'Neha',
      photoUrl: 'https://cdn.test/photo-url.png',
    }));

    expect(parseOAuthRedirectParams(`?token=photo-token&user=${user}`)).toEqual({
      token: 'photo-token',
      user: {
        id: 15,
        role: 'INSTRUCTOR',
        name: 'Neha',
        photoUrl: 'https://cdn.test/photo-url.png',
        fullName: 'Neha',
        avatarUrl: 'https://cdn.test/photo-url.png',
      },
    });
  });
});

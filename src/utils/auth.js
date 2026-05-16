/**
 * parseOAuthRedirectParams
 *
 * Handles two formats from the backend OAuth redirect:
 *   NEW (preferred): ?token=...&userId=...&email=...&name=...&role=...&avatarUrl=...
 *   OLD (fallback):  ?token=...&user=<urlencoded-json>
 *
 * Returns null if no token is present (not an OAuth redirect).
 */
export function parseOAuthRedirectParams(search) {
  const params = new URLSearchParams(search || '');
  const token  = params.get('token');
  if (!token) return null;

  // ── NEW format: individual params ──────────────────────────────
  if (params.has('userId') || params.has('email')) {
    const userId    = params.get('userId');
    const email     = params.get('email')     || '';
    const name      = params.get('name')      || '';
    const role      = params.get('role')      || 'STUDENT';
    const avatarUrl = params.get('avatarUrl') || '';

    return {
      token,
      user: {
        id:        userId ? Number(userId) : undefined,
        email,
        name,
        fullName:  name,
        role,
        avatarUrl,
      },
    };
  }

  // ── OLD format: user JSON in URL param ─────────────────────────
  const userStr = params.get('user');
  if (!userStr) return null;

  try {
    let user;
    try {
      user = JSON.parse(userStr);
    } catch {
      user = JSON.parse(decodeURIComponent(userStr));
    }
    const avatarUrl = user.avatarUrl || user.picture || user.profileImage || user.imageUrl || user.photoUrl || '';
    return {
      token,
      user: { ...user, avatarUrl, fullName: user.fullName || user.name || '' },
    };
  } catch {
    return null;
  }
}

export function getPostLoginRoute(role) {
  if (role === 'ADMIN')      return '/admin';
  if (role === 'INSTRUCTOR') return '/instructor';
  return '/student';
}

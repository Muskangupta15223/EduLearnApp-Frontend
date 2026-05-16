import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// ── Decode JWT payload without verification (verification is done server-side) ──
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// ── Check if a JWT token is expired (with 30 second buffer) ──
function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false; // no exp claim → treat as valid
  const expiresAt = Number(payload.exp) * 1000;
  return Date.now() >= expiresAt - 30_000; // 30s buffer
}

// ── Read initial state from localStorage (safe) ──
function readStoredToken() {
  try {
    const token = localStorage.getItem('edulearn_token');
    if (!token) return null;
    if (isTokenExpired(token)) {
      // Clear expired token immediately on startup
      localStorage.removeItem('edulearn_token');
      localStorage.removeItem('edulearn_user');
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem('edulearn_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser]   = useState(() => readStoredUser());
  // loading=true only while we are actively verifying the token with the backend
  const [loading, setLoading] = useState(() => !!readStoredToken());

  const expiryTimerRef = useRef(null);

  // ── Clear local session data ──
  const clearLocalSession = useCallback(() => {
    localStorage.removeItem('edulearn_token');
    localStorage.removeItem('edulearn_user');
    setToken(null);
    setUser(null);
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  // ── Schedule token expiry auto-logout ──
  const scheduleExpiry = useCallback((jwt) => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    if (!jwt) return;
    const payload = decodeJwtPayload(jwt);
    if (!payload?.exp) return;
    const expiresAt = Number(payload.exp) * 1000;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      clearLocalSession();
      return;
    }
    // Auto-logout 1 minute before expiry to avoid mid-request failures
    const warnAt = Math.max(0, remaining - 60_000);
    expiryTimerRef.current = setTimeout(() => {
      console.info('[AuthContext] Token approaching expiry — logging out');
      clearLocalSession();
    }, warnAt);
  }, [clearLocalSession]);

  // ── On mount / token change: validate token with backend ──
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    // If the token is already expired locally, don't even bother calling backend
    if (isTokenExpired(token)) {
      clearLocalSession();
      setLoading(false);
      return;
    }

    scheduleExpiry(token);

    let cancelled = false;
    setLoading(true);

    authAPI.getMe()
      .then(({ data }) => {
        if (cancelled) return;
        // Accept the response if it has an id (real user object)
        if (data?.id) {
          const merged = {
            ...(readStoredUser() || {}),
            ...data,
            fullName: data.fullName || data.name || readStoredUser()?.fullName,
            avatarUrl: data.avatarUrl || readStoredUser()?.avatarUrl || '',
          };
          localStorage.setItem('edulearn_user', JSON.stringify(merged));
          setUser(merged);
        } else {
          // Backend returned a partial/fallback response but didn't 401.
          // Keep the locally stored user — the token is still valid per the gateway.
          const stored = readStoredUser();
          if (stored) {
            setUser(stored);
          }
          // If no stored user either, just continue with no user (will redirect to login)
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // Token rejected by server — clear session
          console.warn('[AuthContext] Token rejected by server (status=%s) — clearing session', status);
          clearLocalSession();
        } else {
          // Network error or other failure — keep local session to avoid spurious logouts
          console.warn('[AuthContext] getMe() failed (non-auth error: %s) — keeping local session', status ?? 'network');
          const stored = readStoredUser();
          if (stored) setUser(stored);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  // ── Cross-tab sync: listen for storage changes in other tabs ──
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== 'edulearn_token' && event.key !== 'edulearn_user') return;
      const nextToken = localStorage.getItem('edulearn_token');
      const nextUser  = readStoredUser();
      setToken(nextToken);
      setUser(nextUser);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ── Listen for session-expired event dispatched by API interceptor ──
  useEffect(() => {
    const onExpired = () => {
      console.info('[AuthContext] Session expired event received — clearing session');
      clearLocalSession();
      setLoading(false);
    };
    window.addEventListener('edulearn:session-expired', onExpired);
    return () => window.removeEventListener('edulearn:session-expired', onExpired);
  }, [clearLocalSession]);

  // ── Login ──
  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login(email, password);
    const jwt     = data.token || data.accessToken;
    const rawUser = data.user || data;
    if (!jwt) throw new Error('No token received from server');

    const usr = {
      ...rawUser,
      fullName:  rawUser.fullName  || rawUser.name || '',
      avatarUrl: rawUser.avatarUrl || rawUser.picture || rawUser.profileImage || rawUser.imageUrl || rawUser.photoUrl || '',
    };

    localStorage.setItem('edulearn_token', jwt);
    localStorage.setItem('edulearn_user',  JSON.stringify(usr));
    setToken(jwt);
    setUser(usr);
    scheduleExpiry(jwt);
    return usr;
  }, [scheduleExpiry]);

  // ── Register ──
  const register = useCallback(async (payload) => {
    const { data } = await authAPI.register(payload);
    return data;
  }, []);

  // ── Logout ──
  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore — always clear local state */ }
    clearLocalSession();
  }, [clearLocalSession]);

  // ── Update user profile locally ──
  const updateUser = useCallback((updated) => {
    setUser((current) => {
      const merged = { ...current, ...updated };
      localStorage.setItem('edulearn_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  // ── Role helpers ──
  const isAdmin      = user?.role === 'ADMIN';
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  const isStudent    = user?.role === 'STUDENT';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!token && !!user,
      isAdmin,
      isInstructor,
      isStudent,
      login,
      register,
      logout,
      updateUser,
      clearLocalSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getPostLoginRoute, parseOAuthRedirectParams } from '../../utils/auth';
import AuthShell from '../../components/auth/AuthShell';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  React.useEffect(() => {
    try {
      const parsed = parseOAuthRedirectParams(window.location.search);
      if (parsed) {
        localStorage.setItem('edulearn_token', parsed.token);
        localStorage.setItem('edulearn_user', JSON.stringify(parsed.user));
        window.location.href = getPostLoginRoute(parsed.user.role);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get('oauthError');
      if (oauthError) {
        setErr(decodeURIComponent(oauthError));
      }
    } catch {
      setErr('Failed to parse user details from Google login');
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user?.name || user?.fullName?.split(' ')[0] || 'there'}!`);
      navigate(getPostLoginRoute(user?.role));
    } catch (error) {
      setErr(error.response?.data?.error || error.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue."
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="auth-panel auth-panel-simple">
        <PageHead title="Sign in" />
        {err ? <div className="auth-alert">{err}</div> : null}

        <form onSubmit={handleSubmit} className="stack-list">
          <div>
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              required
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>

          <div>
            <div className="auth-footer-row" style={{ marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <input
              className="form-input"
              type="password"
              placeholder="Enter your password"
              required
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, color: 'var(--text-secondary)' }}>
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}

function PageHead({ title }) {
  return (
    <div style={{ marginBottom: 24, textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', margin: '0 0 8px' }}>{title}</h2>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { authAPI } from '../../services/api';
import AuthShell from '../../components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (error) {
      setErr(error.response?.data?.error || 'Something went wrong. Try again.');
    }
    setBusy(false);
  };

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Request a reset link."
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="auth-panel">
        <div style={{ marginBottom: 24 }}>
          <span className="page-eyebrow">Password Reset</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', margin: '10px 0 8px' }}>Forgot password</h2>
          <p>Enter your email address and we will send a reset link if an account exists.</p>
        </div>

        {sent ? (
          <div className="empty-state">
            <div className="empty-state-icon"><MailCheck size={28} /></div>
            <h3>Check your inbox</h3>
            <p>If an account exists for <strong>{email}</strong>, a reset link is on its way.</p>
            <div className="empty-state-action">
              <Link to="/login" className="btn btn-primary">Back to Login</Link>
            </div>
          </div>
        ) : (
          <>
            {err ? <div className="auth-alert">{err}</div> : null}
            <form onSubmit={handleSubmit} className="stack-list">
              <div>
                <label className="form-label">Email address</label>
                <input className="form-input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending...' : 'Send Reset Link'}</button>
            </form>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 18, color: 'var(--text-secondary)' }}>
          Remembered it? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}

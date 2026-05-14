import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { authAPI } from '../../services/api';
import AuthShell from '../../components/auth/AuthShell';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirm) {
      setErr('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setErr('Password must be at least 6 characters');
      return;
    }

    setErr('');
    setBusy(true);
    try {
      await authAPI.resetPassword(token, password);
      setDone(true);
    } catch (error) {
      setErr(error.response?.data?.error || 'Invalid or expired token. Please request a new reset link.');
    }
    setBusy(false);
  };

  if (!token) {
    return (
      <AuthShell
        title="Invalid reset link"
        subtitle="Request a new one to continue."
      >
        <div className="auth-panel">
          <div className="empty-state">
            <div className="empty-state-icon"><ShieldAlert size={28} /></div>
            <h3>Invalid reset link</h3>
            <p>No reset token was found in this link. Please request a new password reset.</p>
            <div className="empty-state-action">
              <Link to="/forgot-password" className="btn btn-primary">Request Reset</Link>
            </div>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a secure password and sign back in."
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="auth-panel">
        <div style={{ marginBottom: 24 }}>
          <span className="page-eyebrow">Set Password</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', margin: '10px 0 8px' }}>Choose a new password</h2>
          <p>Create a secure password and return to your LMS workspace.</p>
        </div>

        {done ? (
          <div className="empty-state">
            <div className="empty-state-icon"><CheckCircle2 size={28} /></div>
            <h3>Password updated</h3>
            <p>Your password has been reset successfully. You can sign in with the new one now.</p>
            <div className="empty-state-action">
              <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>Go to Login</button>
            </div>
          </div>
        ) : (
          <>
            {err ? <div className="auth-alert">{err}</div> : null}
            <form onSubmit={handleSubmit} className="stack-list">
              <div>
                <label className="form-label">New password</label>
                <input className="form-input" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              <div>
                <label className="form-label">Confirm password</label>
                <input className="form-input" type="password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Resetting...' : 'Reset Password'}</button>
            </form>
          </>
        )}
      </motion.div>
    </AuthShell>
  );
}

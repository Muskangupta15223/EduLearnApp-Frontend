import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AuthShell from '../../components/auth/AuthShell';

const ROLES = [
  { value: 'STUDENT', label: 'Student', icon: GraduationCap, description: 'Learn through courses, progress tracking, discussion, and certificates.' },
  { value: 'INSTRUCTOR', label: 'Instructor', icon: BriefcaseBusiness, description: 'Create courses, manage content, and monitor learners and revenue.' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STUDENT' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErr('');
    if (form.password.length < 6) {
      setErr('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      await register(form);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (error) {
      setErr(error.response?.data?.error || error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Create your account and get started."
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="auth-panel auth-panel-simple">
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', margin: '0 0 8px', textAlign: 'center' }}>Create account</h2>
        </div>

        {err ? <div className="auth-alert">{err}</div> : null}

        <form onSubmit={handleSubmit} className="stack-list">
          <div>
            <label className="form-label">Full name</label>
            <input className="form-input" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </div>

          <div>
            <label className="form-label">I want to join as</label>
            <div className="auth-role-grid">
              {ROLES.map((role) => {
                const Icon = role.icon;
                const active = form.role === role.value;
                return (
                  <label key={role.value} className={`auth-role-card ${active ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={active}
                      onChange={() => setForm((current) => ({ ...current, role: role.value }))}
                      style={{ display: 'none' }}
                    />
                    <div className="auth-role-card-row">
                      <div className="metric-card-icon"><Icon size={18} aria-hidden="true" /></div>
                      <strong>{role.label}</strong>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}

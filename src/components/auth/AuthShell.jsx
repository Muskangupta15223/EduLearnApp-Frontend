import React from 'react';
import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { getPostLoginRoute } from '../../utils/auth';

export default function AuthShell({ title, subtitle, children }) {
  const { isAuthenticated, user } = useAuth();
  const brandLink = isAuthenticated ? getPostLoginRoute(user?.role) : '/login';

  return (
    <div className="auth-shell auth-shell-minimal">
      <div className="auth-minimal-topbar">
        <Link to={brandLink} className="auth-brand">
          <span className="auth-brand-mark"><GraduationCap size={22} /></span>
          <span className="sidebar-brand-text">EduLearn</span>
        </Link>
        <ThemeToggle />
      </div>

      <section className="auth-panel-wrap auth-panel-wrap-minimal">
        <div className="auth-simple-intro">
          <span className="page-eyebrow">EduLearn</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
      </section>
    </div>
  );
}

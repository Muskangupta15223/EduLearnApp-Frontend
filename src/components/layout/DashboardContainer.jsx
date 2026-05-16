import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../ui/ThemeToggle';
import ProfilePage from '../../pages/Profile';

/**
 * DashboardContainer — Reusable dashboard shell for admin, instructor, and student roles
 * Accepts navigation configuration and role-specific data, rendering a consistent layout
 * with collapsible sidebar, topbar, profile modal, and main content area
 *
 * Props:
 *  - navItems: Array of {path, label, icon} for navigation
 *  - role: 'admin' | 'instructor' | 'student' for styling/behavior
 *  - currentSection: String to display in topbar eyebrow
 *  - displayName: User display name for avatar/profile
 *  - userRole: Role label (e.g., 'Administrator')
 *  - sidebarFooterActions: Array of {label, icon, onClick, title, className}
 *  - topbarActions: Array of {icon, onClick, title, label} for custom topbar buttons
 *  - showProfileButton: Boolean to show/hide profile button (default: true)
 *  - onLogout: Callback for logout action
 */
export default function DashboardContainer({
  navItems = [],
  role = 'admin',
  currentSection = 'Overview',
  displayName = 'User',
  userRole = 'Administrator',
  sidebarFooterActions = [],
  topbarActions = [],
  showProfileButton = true,
  onLogout,
}) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((current) => !current);
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 780) {
      setSidebarOpen(false);
    }
  };

  const baseClass = 'admin-shell'; // Reuse admin CSS for all roles
  const sidebarClass = 'admin-sidebar';
  const navClass = 'admin-nav';
  const toggleClass = 'admin-sidebar-toggle';
  const topbarClass = 'admin-topbar';
  const contentClass = 'admin-content';
  const mobileShadeClass = 'admin-mobile-shade';
  const modalOverlayClass = 'admin-modal-overlay';
  const modalClass = 'admin-modal';
  const modalHeaderClass = 'admin-modal-header';
  const modalKickerClass = 'admin-modal-kicker';
  const modalCloseClass = 'admin-close';
  const modalBodyClass = 'admin-modal-body';
  const mainClass = 'admin-main';
  const topbarLeftClass = 'admin-topbar-left';
  const topbarActionsClass = 'admin-topbar-actions';
  const topbarDescriptionClass = 'admin-topbar-description';
  const profileTriggerClass = 'admin-profile-trigger';
  const profileMetaClass = 'admin-profile-meta';
  const sidebarFooterClass = 'admin-sidebar-footer';

  return (
    <div className={`app-container ${baseClass} ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <div className={`${mobileShadeClass} ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {profileOpen && (
        <div className={modalOverlayClass} onClick={() => setProfileOpen(false)}>
          <div className={modalClass} onClick={(event) => event.stopPropagation()}>
            <div className={modalHeaderClass}>
              <div>
                <span className={modalKickerClass}>Account</span>
                <h2>Profile & Settings</h2>
              </div>
              <button
                type="button"
                className={`${modalCloseClass} theme-toggle`}
                onClick={() => setProfileOpen(false)}
                aria-label="Close profile window"
              >
                <X size={18} />
              </button>
            </div>
            <div className={modalBodyClass}>
              <ProfilePage embedded={true} />
            </div>
          </div>
        </div>
      )}

      <aside className={`${sidebarClass} ${sidebarOpen ? 'open' : ''}`}>
        <button
          type="button"
          className={`${toggleClass} ${toggleClass}-top`}
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? `Collapse ${role} menu` : `Expand ${role} menu`}
        >
          <span className={`${toggleClass}-icon`} aria-hidden="true">
            {sidebarOpen ? <X size={18} /> : <ChevronRight size={18} />}
          </span>
        </button>

        <nav className={navClass}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isPath = item.path !== undefined;
            const to = isPath ? item.path : item.to;

            return (
              <NavLink
                key={to}
                to={to}
                end={item.end || (to === '/admin' || to === '/instructor' || to === '/student')}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={`${sidebarFooterClass} stack-list`}>
          {sidebarFooterActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                type="button"
                className={`sidebar-link ${action.className || ''}`}
                onClick={action.onClick}
                title={action.title}
                aria-label={action.title}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className={mainClass}>
        <header className={topbarClass}>
          <div className={topbarLeftClass} style={{ flex: 1 }}>
            <div className="page-eyebrow">{currentSection}</div>
            <div className={topbarDescriptionClass} style={{ display: 'none' }}>
              {/* Descriptive text can be added via props if needed */}
            </div>
          </div>
          <div className={topbarActionsClass} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ThemeToggle />
            {topbarActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  className="theme-toggle"
                  title={action.title}
                  onClick={action.onClick}
                  aria-label={action.title}
                >
                  <Icon size={18} aria-hidden="true" />
                </button>
              );
            })}
            {showProfileButton && (
              <button
                type="button"
                className={`sidebar-profile-link ${profileTriggerClass}`}
                title="Open profile and settings"
                onClick={() => setProfileOpen(true)}
              >
                <div className="avatar">
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                </div>
                <span className={profileMetaClass}>
                  <span className={`topbar-user-name`}>{displayName}</span>
                  <span className={`topbar-user-role`}>{userRole}</span>
                </span>
              </button>
            )}
          </div>
        </header>

        <main className={contentClass}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </section>
    </div>
  );
}

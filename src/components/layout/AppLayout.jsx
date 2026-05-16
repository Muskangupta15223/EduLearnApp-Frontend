import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  MessageSquareText,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI } from '../../services/api';
import ThemeToggle from '../ui/ThemeToggle';

const NAV_STUDENT = [
  { path: '/student', label: 'Overview', icon: LayoutDashboard, section: 'Learn' },
  { path: '/student/courses', label: 'Course Catalog', icon: GraduationCap, section: 'Learn' },
  { path: '/student/my-learning', label: 'My Learning', icon: BookOpen, section: 'Learn' },
  { path: '/student/progress', label: 'Progress', icon: BarChart3, section: 'Track' },
  { path: '/student/assessment', label: 'Assessments', icon: Star, section: 'Track' },
  { path: '/student/discussion', label: 'Discussions', icon: MessageSquareText, section: 'Track' },
  { path: '/student/notifications', label: 'Notifications', icon: Bell, section: 'Account' },
  { path: '/student/payment', label: 'Payments', icon: CircleDollarSign, section: 'Account' },
  { path: '/student/profile', label: 'Profile', icon: User, section: 'Account' },
];

const NAV_INSTRUCTOR = [
  { path: '/instructor', label: 'Studio', icon: LayoutDashboard, section: 'Create' },
  { path: '/instructor#courses', label: 'My Courses', icon: LibraryBig, section: 'Create' },
  { path: '/instructor/courses/create', label: 'Create Course', icon: PlusCircle, section: 'Create' },
  { path: '/instructor#analytics', label: 'Analytics', icon: ChartNoAxesCombined, section: 'Insights' },
  { path: '/instructor#students', label: 'Learners', icon: Users, section: 'Insights' },
  { path: '/instructor#notifications', label: 'Notifications', icon: Bell, section: 'Manage' },
  { path: '/instructor#discussion', label: 'Discussions', icon: MessageSquareText, section: 'Manage' },
  { path: '/instructor#profile', label: 'Profile', icon: User, section: 'Manage' },
];

const NAV_ADMIN = [
  { path: '/admin', label: 'Admin Command', icon: ShieldCheck, section: 'Platform' },
  { path: '/admin/users', label: 'Users', icon: Users, section: 'Platform' },
  { path: '/admin/courses', label: 'Courses', icon: LibraryBig, section: 'Platform' },
];

export default function AppLayout() {
  const { user, isInstructor, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
    setAvatarFailed(false);
  }, [location.pathname, location.hash, user?.avatarUrl]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationAPI.getUnreadCount().then((response) => response.data?.count ?? 0),
    refetchInterval: 30000,
  });

  const isInstructorArea = isInstructor && location.pathname.startsWith('/instructor');
  const displayName = user?.fullName || user?.name || 'Learner';
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const showAvatar = user?.avatarUrl && !avatarFailed;

  const navItems = useMemo(() => {
    if (isInstructorArea) return NAV_INSTRUCTOR;

    const items = [...NAV_STUDENT];
    // Note: Instructor nav removed from student view to prevent cross-role UI bleed
    if (isAdmin) {
      items.push(...NAV_ADMIN);
    }
    return items;
  }, [isAdmin, isInstructor, isInstructorArea]);

  const groupedNav = useMemo(() => navItems.reduce((accumulator, item) => {
    const group = accumulator[item.section] || [];
    group.push(item);
    return { ...accumulator, [item.section]: group };
  }, {}), [navItems]);

  const headerCopy = isInstructorArea
    ? 'Creator workspace for course operations, learner progress, and teaching revenue.'
    : 'A focused LMS workspace designed to keep navigation calm and actions clear.';

  const goTo = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className={`app-container ${isInstructorArea ? 'instructor-shell' : ''}`}>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            {isInstructorArea ? <BriefcaseBusiness size={24} /> : <GraduationCap size={24} />}
          </div>
          <div>
            <div className="sidebar-brand-text">EduLearn</div>
            <div className="sidebar-user-role">{isInstructorArea ? 'Instructor Studio' : 'Learning Workspace'}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {Object.entries(groupedNav).map(([section, items]) => (
            <div key={section}>
              <div className="sidebar-section-label">{section}</div>
              {items.map((item) => {
                const Icon = item.icon;
                const [pathname, hash] = item.path.split('#');
                const isActive = location.pathname === pathname && (!hash || location.hash === `#${hash}`);
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => goTo(item.path)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.path === '/student/notifications' && unreadCount > 0 ? <span className="badge badge-purple">{unreadCount}</span> : null}
                    {isActive ? <ChevronRight size={16} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-account">
          <button type="button" className="sidebar-profile-link" onClick={() => goTo('/student/profile')}>
            {showAvatar ? (
              <img className="layout-avatar-img" src={user.avatarUrl} alt="" onError={() => setAvatarFailed(true)} />
            ) : (
              <div className="avatar"><span>{avatarInitial}</span></div>
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-role">{user?.role || 'STUDENT'}</span>
            </span>
          </button>
          <button type="button" className="sidebar-link logout-link" onClick={logout}>
            <LogOut size={18} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="app-header-left" style={{ flex: 1, minWidth: 0 }}>
            <button type="button" className="mobile-menu-button theme-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="page-eyebrow" style={{ marginBottom: 8 }}>{isInstructorArea ? 'Instructor' : 'Workspace'}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{headerCopy}</div>
            </div>
          </div>

          <div className="app-header-actions" style={{ flexWrap: 'wrap' }}>
            <label className="app-search">
              <Search size={16} aria-hidden="true" />
              <input placeholder={isInstructorArea ? 'Search courses, students, analytics...' : 'Search courses, assessments, activity...'} />
            </label>
            <ThemeToggle />
            <button type="button" className="theme-toggle" onClick={() => navigate(isInstructorArea ? '/instructor#notifications' : '/student/notifications')} aria-label="Notifications">
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 ? <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
            </button>
            {isAdmin ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/admin')}>
                <ShieldCheck size={16} aria-hidden="true" /> Admin
              </button>
            ) : null}
          </div>
        </header>

        <main className="app-content">
          {isInstructorArea ? (
            <div className="page-eyebrow" style={{ marginBottom: 16 }}>
              <Sparkles size={14} aria-hidden="true" />
              Revenue, learners, content ops, and publishing flow in one studio.
            </div>
          ) : null}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${location.pathname}${location.hash}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

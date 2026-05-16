import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  GraduationCap,
  Gauge,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardContainer from './DashboardContainer';

const INSTRUCTOR_NAV = [
  { path: '/instructor', label: 'Studio', icon: Gauge, end: true },
  { path: '/instructor/courses', label: 'My Courses', icon: BookOpenCheck },
  { path: '/instructor/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/instructor/students', label: 'Learners', icon: Users },
  { path: '/instructor/discussions', label: 'Discussions', icon: MessageSquareText },
];

export default function InstructorLayout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.name || 'Instructor';

  // Derive current section from pathname
  const currentSection = location.pathname === '/instructor'
    ? 'Studio'
    : location.pathname.includes('/instructor/courses')
        ? 'My Courses'
        : location.pathname.includes('/instructor/analytics')
          ? 'Analytics'
          : location.pathname.includes('/instructor/students')
            ? 'Learners'
            : location.pathname.includes('/instructor/notifications')
              ? 'Notifications'
              : location.pathname.includes('/instructor/discussions')
                ? 'Discussions'
                : 'Studio';

  const sidebarFooterActions = [
    ...(isAdmin ? [{
      label: 'Back to Admin',
      icon: ShieldCheck,
      onClick: () => navigate('/admin'),
      title: 'Back to Admin',
    }] : []),
    {
      label: 'Logout',
      icon: LogOut,
      onClick: logout,
      title: 'Logout',
      className: 'logout-link',
    },
  ];

  const topbarActions = [
    {
      icon: Bell,
      onClick: () => navigate('/instructor/notifications'),
      title: 'Notifications',
    },
  ];

  return (
    <DashboardContainer
      navItems={INSTRUCTOR_NAV}
      role="instructor"
      currentSection={currentSection}
      displayName={displayName}
      userRole="Instructor"
      sidebarFooterActions={sidebarFooterActions}
      topbarActions={topbarActions}
      onLogout={logout}
    />
  );
}

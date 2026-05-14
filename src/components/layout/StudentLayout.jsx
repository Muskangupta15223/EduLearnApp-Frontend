import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  CircleDollarSign,
  GraduationCap,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  House,
  Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardContainer from './DashboardContainer';

const STUDENT_NAV = [
  { path: '/student', label: 'Overview', icon: House, end: true },
  { path: '/student/courses', label: 'Course Catalog', icon: GraduationCap },
  { path: '/student/my-learning', label: 'My Learning', icon: BookOpen },
  { path: '/student/progress', label: 'Progress', icon: BarChart3 },
  { path: '/student/assessment', label: 'Assessments', icon: Star },
  { path: '/student/discussion', label: 'Discussions', icon: MessageSquareText },
  { path: '/student/payment', label: 'Payments', icon: CircleDollarSign },
];

export default function StudentLayout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.name || 'Learner';

  // Derive current section from pathname
  const currentSection = location.pathname === '/student'
    ? 'Overview'
    : location.pathname === '/student/courses'
      ? 'Course Catalog'
      : location.pathname === '/student/my-learning'
        ? 'My Learning'
        : location.pathname === '/student/progress'
          ? 'Progress'
          : location.pathname === '/student/assessment'
            ? 'Assessments'
            : location.pathname === '/student/discussion'
              ? 'Discussions'
              : location.pathname === '/student/notifications'
                ? 'Notifications'
                : location.pathname === '/student/payment'
                  ? 'Payments'
                  : location.pathname === '/student/profile'
                    ? 'Profile'
                    : 'Dashboard';

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
      onClick: () => navigate('/student/notifications'),
      title: 'Notifications',
    },
  ];

  return (
    <DashboardContainer
      navItems={STUDENT_NAV}
      role="student"
      currentSection={currentSection}
      displayName={displayName}
      userRole="Learner"
      sidebarFooterActions={sidebarFooterActions}
      topbarActions={topbarActions}
      showProfileButton={true}
      onLogout={logout}
    />
  );
}

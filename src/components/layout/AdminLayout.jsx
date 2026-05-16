import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Gauge,
  GraduationCap,
  LogOut,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardContainer from './DashboardContainer';

const ADMIN_NAV = [
  { path: '/admin', label: 'Overview', icon: Gauge },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/courses', label: 'Courses', icon: BookOpenCheck },
  { path: '/admin/platform', label: 'Platform', icon: SlidersHorizontal },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.name || 'Administrator';

  const currentSection = location.pathname.endsWith('/users')
    ? 'Users'
    : location.pathname.endsWith('/courses')
      ? 'Courses'
      : location.pathname.endsWith('/platform')
        ? 'Platform'
        : 'Overview';

  const sidebarFooterActions = [
    {
      label: 'Student Workspace',
      icon: GraduationCap,
      onClick: () => navigate('/student'),
      title: 'Student Workspace',
    },
    {
      label: 'Instructor Workspace',
      icon: BriefcaseBusiness,
      onClick: () => navigate('/instructor'),
      title: 'Instructor Workspace',
    },
    {
      label: 'Logout',
      icon: LogOut,
      onClick: logout,
      title: 'Logout',
      className: 'logout-link',
    },
  ];

  return (
    <DashboardContainer
      navItems={ADMIN_NAV}
      role="admin"
      currentSection={currentSection}
      displayName={displayName}
      userRole="Administrator"
      sidebarFooterActions={sidebarFooterActions}
      onLogout={logout}
    />
  );
}

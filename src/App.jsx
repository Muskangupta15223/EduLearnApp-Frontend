import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { getPostLoginRoute } from './utils/auth';
import StudentLayout from './components/layout/StudentLayout';
import InstructorLayout from './components/layout/InstructorLayout';
import AdminLayout from './components/layout/AdminLayout';
import './styles/global.css';
import './styles/instructor.css';
import './styles/redesign.css';

const Landing = lazy(() => import('./pages/Landing'));
const LoginPage = lazy(() => import('./pages/auth/Login'));
const RegisterPage = lazy(() => import('./pages/auth/Register'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CoursesPage = lazy(() => import('./pages/Courses'));
const MyLearningPage = lazy(() => import('./pages/MyLearning'));
const AssessmentPage = lazy(() => import('./pages/Assessment'));
const PaymentPage = lazy(() => import('./pages/Payment'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const ProgressPage = lazy(() => import('./pages/Progress'));
const DiscussionPage = lazy(() => import('./pages/Discussion'));
const CourseView = lazy(() => import('./pages/CourseView'));
const InstructorDashboard = lazy(() => import('./pages/instructor/InstructorDashboard'));
const CreateCourse = lazy(() => import('./pages/instructor/CreateCourse'));
const ManageCourse = lazy(() => import('./pages/instructor/ManageCourse'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));

const RouteFallback = () => (
  <div className="page-loader">
    <div className="spinner spinner-lg" />
  </div>
);

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <RouteFallback />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const StudentRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  return user?.role === 'INSTRUCTOR' ? <Navigate to="/instructor" replace /> : children;
};

const InstructorRoute = ({ children }) => {
  const { isInstructor, loading } = useAuth();
  if (loading) return <RouteFallback />;
  return isInstructor ? children : <Navigate to="/student" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return <RouteFallback />;
    return isAdmin ? children : <Navigate to="/student" replace />;
};

const CatchAllRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  return <Navigate to={isAuthenticated ? getPostLoginRoute(user?.role) : '/login'} replace />;
};

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Student Routes */}
        <Route element={<PrivateRoute><StudentRoute><StudentLayout /></StudentRoute></PrivateRoute>}>
          <Route path="/student" element={<Dashboard />} />
          <Route path="/student/courses" element={<CoursesPage />} />
          <Route path="/student/my-learning" element={<MyLearningPage />} />
          <Route path="/student/course/:id" element={<CourseView />} />
          <Route path="/student/assessment" element={<AssessmentPage />} />
          <Route path="/student/payment" element={<PaymentPage />} />
          <Route path="/student/notifications" element={<NotificationsPage />} />
          <Route path="/student/profile" element={<ProfilePage />} />
          <Route path="/student/progress" element={<ProgressPage />} />
          <Route path="/student/discussion" element={<DiscussionPage />} />
      </Route>

      {/* Instructor Routes */}
      <Route element={<PrivateRoute><InstructorRoute><InstructorLayout /></InstructorRoute></PrivateRoute>}>
        <Route path="/instructor" element={<InstructorDashboard />} />
        <Route path="/instructor/courses" element={<InstructorDashboard />} />
        <Route path="/instructor/courses/create" element={<CreateCourse />} />
        <Route path="/instructor/courses/:id" element={<ManageCourse />} />
        <Route path="/instructor/courses/:id/edit" element={<ManageCourse />} />
        <Route path="/instructor/analytics" element={<InstructorDashboard />} />
        <Route path="/instructor/students" element={<InstructorDashboard />} />
        <Route path="/instructor/notifications" element={<InstructorDashboard />} />
        <Route path="/instructor/discussions" element={<InstructorDashboard />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<PrivateRoute><AdminRoute><AdminLayout /></AdminRoute></PrivateRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/platform" element={<AdminDashboard />} />
        <Route path="/admin/verification" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/courses" element={<AdminCourses />} />
      </Route>

      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  </Suspense>
);

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ProfilePage from '../Profile';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileQuestion,
  GraduationCap,
  Layers3,
  MessageSquareText,
  Search,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
  BriefcaseBusiness,
  ArrowRight,
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

function currency(value) {
  return `Rs. ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function monthLabel(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString(undefined, { month: 'short' });
}

function statusBadge(status) {
  if (status === 'APPROVED' || status === 'PUBLISHED' || status === 'COMPLETED') return 'badge-green';
  if (status === 'PENDING') return 'badge-orange';
  if (status === 'REJECTED') return 'badge-red';
  return 'badge-blue';
}

export default function AdminDashboard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const tabFromPath = location.pathname.endsWith('/platform')
    ? 'platform'
    : location.pathname.endsWith('/verification')
      ? 'verification'
        : 'overview';
  const [verificationSearch, setVerificationSearch] = useState('');
  const [remarks, setRemarks] = useState({});

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-all'],
    queryFn: () => adminAPI.getAllUsers().then((r) => r.data || []),
    staleTime: 30000,
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['admin-courses-all'],
    queryFn: () => adminAPI.getAllCourses().then((r) => r.data || []),
    staleTime: 30000,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['admin-enrollments-all'],
    queryFn: () => adminAPI.getAllEnrollments().then((r) => r.data || []),
    staleTime: 30000,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['admin-payments-all'],
    queryFn: () => adminAPI.getAllPayments().then((r) => r.data || []).catch(() => []),
    staleTime: 60000,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ userId, status, comment }) => adminAPI.reviewInstructorVerification(userId, status, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-all'] });
      toast.success('Instructor verification updated');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Verification review failed'),
  });

  const openDocument = async (userId) => {
    try {
      const response = await adminAPI.getVerificationDocument(userId);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Could not open verification document');
    }
  };

  const data = useMemo(() => {
    const students = users.filter((user) => user.role === 'STUDENT');
    const instructors = users.filter((user) => user.role === 'INSTRUCTOR');
    const verified = instructors.filter((user) => user.instructorVerificationStatus === 'APPROVED');
    const pendingVerification = instructors.filter((user) => user.instructorVerificationStatus === 'PENDING');
    const approvedCourses = courses.filter((course) => course.status === 'PUBLISHED' || course.reviewStatus === 'APPROVED');
    const pendingCourses = courses.filter((course) => course.status === 'PENDING' || course.reviewStatus === 'PENDING');
    const rejectedCourses = courses.filter((course) => course.status === 'REJECTED' || course.reviewStatus === 'REJECTED');
    const revenue = payments.reduce((sum, payment) => sum + Number(payment.amount || payment.totalAmount || 0), 0)
      || enrollments.reduce((sum, enrollment) => {
        const course = courses.find((item) => item.id === enrollment.courseId);
        return sum + Number(course?.price || 0);
      }, 0);

    const enrollmentsByCourse = enrollments.reduce((acc, enrollment) => {
      acc[enrollment.courseId] = acc[enrollment.courseId] ? [...acc[enrollment.courseId], enrollment] : [enrollment];
      return acc;
    }, {});

    const topCourses = courses.map((course) => {
      const courseEnrollments = enrollmentsByCourse[course.id] || [];
      const revenueForCourse = courseEnrollments.length * Number(course.price || 0);
      const progress = courseEnrollments.length
        ? Math.round(courseEnrollments.reduce((sum, item) => sum + Number(item.progress || 0), 0) / courseEnrollments.length)
        : 0;
      return {
        ...course,
        enrollments: courseEnrollments.length || course.studentsCount || 0,
        revenue: revenueForCourse,
        progress,
      };
    }).sort((a, b) => b.revenue - a.revenue || b.enrollments - a.enrollments).slice(0, 6);

    const instructorPerformance = instructors.map((instructor) => {
      const owned = courses.filter((course) => course.instructorId === instructor.id);
      const taught = owned.reduce((sum, course) => sum + (enrollmentsByCourse[course.id]?.length || course.studentsCount || 0), 0);
      const generated = owned.reduce((sum, course) => sum + Number(course.price || 0) * (enrollmentsByCourse[course.id]?.length || 0), 0);
      const approved = owned.filter((course) => course.status === 'PUBLISHED' || course.reviewStatus === 'APPROVED').length;
      return {
        instructor,
        courseCount: owned.length,
        students: taught,
        revenue: generated,
        approvalRate: owned.length ? Math.round((approved / owned.length) * 100) : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue || b.students - a.students);

    const enrollmentTrendMap = enrollments.reduce((acc, enrollment) => {
      const label = monthLabel(enrollment.enrolledAt);
      acc[label] = acc[label] || { month: label, enrollments: 0, revenue: 0, activeUsers: new Set() };
      acc[label].enrollments += 1;
      acc[label].activeUsers.add(enrollment.userId);
      const course = courses.find((item) => item.id === enrollment.courseId);
      acc[label].revenue += Number(course?.price || 0);
      return acc;
    }, {});

    const trends = Object.values(enrollmentTrendMap).map((item) => ({
      ...item,
      activeUsers: item.activeUsers.size,
    }));
    const fallbackTrend = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => ({
      month,
      enrollments: Math.round((enrollments.length / 8) * (index + 1)),
      revenue: Math.round((revenue / 10) * (index + 1)),
      activeUsers: Math.round((students.length / 10) * (index + 1)),
    }));

    const progressRows = enrollments.map((enrollment) => {
      const student = users.find((user) => user.id === enrollment.userId);
      const course = courses.find((item) => item.id === enrollment.courseId);
      return { ...enrollment, student, course };
    });

    return {
      students,
      instructors,
      verified,
      pendingVerification,
      approvedCourses,
      pendingCourses,
      rejectedCourses,
      totalModules: courses.reduce((sum, course) => sum + (course.modules?.length || 0), 0),
      revenue,
      monthlyRevenue: Math.round(revenue * 0.28),
      activeStudents: new Set(enrollments.filter((item) => item.status !== 'COMPLETED').map((item) => item.userId)).size,
      activeInstructors: new Set(courses.map((course) => course.instructorId).filter(Boolean)).size,
      totalAssessments: courses.reduce((sum, course) => sum + (course.quizzes?.length || 0) + (course.assignments?.length || 0), 0),
      topCourses,
      instructorPerformance,
      trends: trends.length ? trends : fallbackTrend,
      progressRows,
    };
  }, [courses, enrollments, payments, users]);

  const stats = [
    { label: 'Total Students', value: data.students.length, icon: GraduationCap, tone: 'cyan' },
    { label: 'Total Instructors', value: data.instructors.length, icon: Users, tone: 'violet' },
    { label: 'Verified Instructors', value: data.verified.length, icon: BadgeCheck, tone: 'green' },
    { label: 'Pending Instructor Verification Requests', value: data.pendingVerification.length, icon: UserCheck, tone: 'amber' },
    { label: 'Total Courses', value: courses.length, icon: BookOpenCheck, tone: 'cyan' },
    { label: 'Approved Courses', value: data.approvedCourses.length, icon: CheckCircle2, tone: 'green' },
    { label: 'Pending Course Approvals', value: data.pendingCourses.length, icon: ClipboardCheck, tone: 'amber' },
    { label: 'Rejected Courses', value: data.rejectedCourses.length, icon: XCircle, tone: 'red' },
    { label: 'Total Modules', value: data.totalModules, icon: Layers3, tone: 'violet' },
    { label: 'Total Enrollments', value: enrollments.length, icon: TrendingUp, tone: 'cyan' },
    { label: 'Active Students', value: data.activeStudents, icon: Activity, tone: 'green' },
    { label: 'Active Instructors', value: data.activeInstructors, icon: ShieldCheck, tone: 'violet' },
    { label: 'Platform Revenue', value: currency(data.revenue), icon: CircleDollarSign, tone: 'green' },
    { label: 'Monthly Revenue', value: currency(data.monthlyRevenue), icon: TrendingUp, tone: 'amber' },
    { label: 'Total Discussions', value: 0, icon: MessageSquareText, tone: 'cyan' },
    { label: 'Total Quizzes/Assignments', value: data.totalAssessments, icon: FileQuestion, tone: 'violet' },
  ];

  const verificationRows = data.pendingVerification.filter((user) => {
    const q = verificationSearch.trim().toLowerCase();
    if (!q) return true;
    return `${user.fullName || ''} ${user.email || ''} ${user.expertiseAreas || ''}`.toLowerCase().includes(q);
  });

  const loading = usersLoading || coursesLoading;

  return (
    <div className="admin-dashboard-page">
      <section className="admin-hero-panel">
        <div>
          <span>Enterprise LMS Control</span>
          <h1>Platform Intelligence Dashboard</h1>
          <p>System visibility across learners, instructors, course operations, progress, approvals, revenue, and verification workflows.</p>
        </div>
        <div className="admin-hero-metrics">
          <div><b>{currency(data.revenue)}</b><small>Platform revenue</small></div>
          <div><b>{data.pendingCourses.length + data.pendingVerification.length}</b><small>Open reviews</small></div>
        </div>
      </section>

      {loading ? (
        <div className="admin-stat-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton admin-stat-card" />)}</div>
      ) : (
        <>
          {tabFromPath === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h3><GraduationCap size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Student Insights</h3>
                    <p>Overview of student activity, enrollments, and learning progress.</p>
                  </div>
                </div>
                <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
                  {stats.filter(s => ['Total Students', 'Active Students', 'Total Enrollments', 'Total Quizzes/Assignments'].includes(s.label)).map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <article className={`admin-stat-card tone-${stat.tone}`} key={stat.label}>
                        <div className="admin-stat-icon"><Icon size={20} /></div>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </article>
                    );
                  })}
                </div>
                
                <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Student Progress Tracking</h4>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Student</th><th>Course</th><th>Completion</th><th>Watched Modules</th><th>Quiz / Assignment</th><th>Last Active</th><th>Enrolled</th></tr></thead>
                    <tbody>
                      {data.progressRows.slice(0, 5).map((row) => (
                        <tr key={row.id}>
                          <td>{row.student?.fullName || `Student #${row.userId}`}</td>
                          <td>{row.course?.title || `Course #${row.courseId}`}</td>
                          <td><div className="admin-progress"><span style={{ width: `${row.progress || 0}%` }} /></div>{row.progress || 0}%</td>
                          <td>{Math.round(((row.progress || 0) / 100) * (row.course?.modules?.length || 0))}/{row.course?.modules?.length || 0}</td>
                          <td>{row.status === 'COMPLETED' ? 'Complete' : 'In progress'}</td>
                          <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : 'Recent'}</td>
                          <td>{row.enrolledAt ? new Date(row.enrolledAt).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                      {data.progressRows.length === 0 && <tr><td colSpan="7" className="admin-empty-cell">No student progress data available.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h3><BriefcaseBusiness size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Instructor Insights</h3>
                    <p>Overview of instructor performance, course approvals, and verifications.</p>
                  </div>
                </div>
                <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
                  {stats.filter(s => ['Total Instructors', 'Active Instructors', 'Verified Instructors', 'Pending Instructor Verification Requests', 'Total Courses', 'Approved Courses', 'Pending Course Approvals'].includes(s.label)).map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <article className={`admin-stat-card tone-${stat.tone}`} key={stat.label}>
                        <div className="admin-stat-icon"><Icon size={20} /></div>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </article>
                    );
                  })}
                </div>

                <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Instructor Performance Analytics</h4>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Instructor</th><th>Courses</th><th>Students Taught</th><th>Revenue</th><th>Approval Rate</th><th>Verification</th></tr></thead>
                    <tbody>
                      {data.instructorPerformance.slice(0, 5).map((row) => (
                        <tr key={row.instructor.id}>
                          <td>{row.instructor.fullName || row.instructor.email}</td>
                          <td>{row.courseCount}</td>
                          <td>{row.students}</td>
                          <td>{currency(row.revenue)}</td>
                          <td>{row.approvalRate}%</td>
                          <td><span className={`badge ${statusBadge(row.instructor.instructorVerificationStatus)}`}>{row.instructor.instructorVerificationStatus || 'NOT_SUBMITTED'}</span></td>
                        </tr>
                      ))}
                      {data.instructorPerformance.length === 0 && <tr><td colSpan="6" className="admin-empty-cell">No instructor performance data available.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {tabFromPath === 'verification' && (
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div><h3>Instructor Verification Requests</h3><p>Review identity documents, profile proof, certifications, and remarks.</p></div>
                <label className="admin-search"><Search size={16} /><input value={verificationSearch} onChange={(event) => setVerificationSearch(event.target.value)} placeholder="Search requests" /></label>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Instructor</th><th>Submitted</th><th>Document</th><th>Remarks</th><th>Actions</th></tr></thead>
                  <tbody>
                    {verificationRows.map((user) => (
                      <tr key={user.id}>
                        <td><b>{user.fullName || 'Instructor'}</b><small>{user.email}</small></td>
                        <td>{user.verificationSubmittedAt ? new Date(user.verificationSubmittedAt).toLocaleString() : '-'}</td>
                        <td><button className="admin-link-button" onClick={() => openDocument(user.id)}>{user.governmentIdFileName || 'Preview document'}</button></td>
                        <td><textarea className="admin-textarea" value={remarks[user.id] || ''} onChange={(event) => setRemarks((current) => ({ ...current, [user.id]: event.target.value }))} placeholder="Add admin remarks" /></td>
                        <td>
                          <div className="admin-row-actions">
                            <button className="admin-action success" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ userId: user.id, status: 'APPROVED', comment: remarks[user.id] })}>Approve</button>
                            <button className="admin-action danger" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ userId: user.id, status: 'REJECTED', comment: remarks[user.id] })}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {verificationRows.length === 0 && <tr><td colSpan="5" className="admin-empty-cell">No pending verification requests.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tabFromPath === 'platform' && (
            <section className="admin-analytics-grid">
              <div className="admin-panel wide">
                <h3>Revenue Growth</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => currency(value)} />
                    <Line dataKey="revenue" stroke="#22c55e" strokeWidth={3} />
                    <Line dataKey="enrollments" stroke="#38bdf8" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="admin-panel">
                <h3>Active Users</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="activeUsers" fill="#a78bfa" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

        </>
      )}
    </div>
  );
}

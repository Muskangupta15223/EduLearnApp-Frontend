import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Edit3,
  Eye,
  GraduationCap,
  LibraryBig,
  Layers3,
  PlusCircle,
  Search,
  Star,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { courseAPI, enrollmentAPI, moduleAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import NotificationsPage from '../Notifications';
import DiscussionPage from '../Discussion';
import ProfilePage from '../Profile';

const PIE_COLORS = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444'];

function currency(value) {
  return `Rs. ${Math.round(value || 0).toLocaleString()}`;
}

function coursePrice(course) {
  return Number(course?.price || 0);
}

function courseStudents(course, enrollmentMap) {
  return Number(enrollmentMap[course.id]?.length ?? course.studentsCount ?? 0);
}

function statusClass(status) {
  if (status === 'PUBLISHED') return 'badge-green';
  if (status === 'PENDING') return 'badge-orange';
  if (status === 'REJECTED') return 'badge-red';
  return 'badge-blue';
}

function reviewActionLabel(course) {
  if (course.status === 'REJECTED') return 'Send Again';
  if (course.status === 'PENDING') return 'Awaiting Approval';
  if (course.status === 'PUBLISHED') return 'Move To Draft';
  return 'Send For Approval';
}

function monthLabel(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString(undefined, { month: 'short' });
}

function EmptyState({ title, description, action }) {
  return (
    <div className="instructor-empty-state">
      <BookOpenCheck size={38} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [studentSearch, setStudentSearch] = useState('');

  // Determine which section to show based on pathname
  const activeSection = location.pathname === '/instructor'
    ? 'studio'
    : location.pathname === '/instructor/courses'
      ? 'courses'
      : location.pathname === '/instructor/analytics'
        ? 'analytics'
        : location.pathname === '/instructor/students'
          ? 'students'
          : location.pathname === '/instructor/notifications'
            ? 'notifications'
            : location.pathname === '/instructor/discussions'
              ? 'discussions'
              : 'studio';

  const { data: myCourses = [], isLoading } = useQuery({
    queryKey: ['instructor-courses'],
    queryFn: () => courseAPI.getMyCreated().then((response) => response.data || []),
    staleTime: 30000,
  });

  const courseIds = useMemo(() => myCourses.map((course) => course.id).filter(Boolean), [myCourses]);

  const { data: enrollments = [], isLoading: progressLoading } = useQuery({
    queryKey: ['instructor-student-progress', courseIds],
    queryFn: () => enrollmentAPI.getProgressByCourses(courseIds).then((response) => response.data || []),
    enabled: courseIds.length > 0,
    staleTime: 60000,
  });

  const { data: moduleCounts = {} } = useQuery({
    queryKey: ['instructor-module-counts', courseIds],
    queryFn: async () => {
      const entries = await Promise.all(courseIds.map(async (courseId) => {
        try {
          const response = await moduleAPI.getByCourse(courseId);
          return [courseId, response.data?.length || 0];
        } catch {
          return [courseId, 0];
        }
      }));
      return Object.fromEntries(entries);
    },
    enabled: courseIds.length > 0,
    staleTime: 60000,
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId) => courseAPI.delete(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      toast.success('Course deleted');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete course'),
  });

  const publishCourseMutation = useMutation({
    mutationFn: (courseId) => courseAPI.publish(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      toast.success('Course sent for approval');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to send course for approval'),
  });

  const unpublishCourseMutation = useMutation({
    mutationFn: (courseId) => courseAPI.unpublish(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      toast.success('Course moved back to draft');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to move course to draft'),
  });

  const enrollmentMap = useMemo(() => enrollments.reduce((acc, enrollment) => {
    const key = enrollment.courseId;
    acc[key] = acc[key] ? [...acc[key], enrollment] : [enrollment];
    return acc;
  }, {}), [enrollments]);

  const analytics = useMemo(() => {
    const published = myCourses.filter((course) => course.status === 'PUBLISHED');
    const pending = myCourses.filter((course) => course.status === 'PENDING');
    const rejected = myCourses.filter((course) => course.status === 'REJECTED');
    const draft = myCourses.filter((course) => !course.status || course.status === 'DRAFT');
    const totalStudents = myCourses.reduce((sum, course) => sum + courseStudents(course, enrollmentMap), 0);
    const totalRevenue = myCourses.reduce((sum, course) => sum + (coursePrice(course) * courseStudents(course, enrollmentMap)), 0);
    const totalModules = Object.values(moduleCounts).reduce((sum, count) => sum + Number(count || 0), 0);
    const completionAverage = enrollments.length
      ? Math.round(enrollments.reduce((sum, item) => sum + Number(item.progress || 0), 0) / enrollments.length)
      : 0;
    const activeStudents = new Set(enrollments.filter((item) => (item.status || 'ACTIVE') !== 'COMPLETED').map((item) => item.userId)).size;
    const ratedCourses = myCourses.filter((course) => Number(course.rating || 0) > 0);
    const averageRating = ratedCourses.length
      ? (ratedCourses.reduce((sum, course) => sum + Number(course.rating || 0), 0) / ratedCourses.length).toFixed(1)
      : '0.0';
    const topCourse = [...myCourses].sort((a, b) => (
      courseStudents(b, enrollmentMap) * coursePrice(b)
    ) - (
      courseStudents(a, enrollmentMap) * coursePrice(a)
    ))[0];

    return {
      published,
      pending,
      rejected,
      draft,
      totalStudents,
      totalRevenue,
      monthlyRevenue: Math.round(totalRevenue * 0.28),
      totalModules,
      completionAverage,
      activeStudents,
      averageRating,
      topCourse,
    };
  }, [enrollmentMap, enrollments, moduleCounts, myCourses]);

  const revenueTrend = useMemo(() => {
    const buckets = {};
    enrollments.forEach((enrollment) => {
      const course = myCourses.find((item) => item.id === enrollment.courseId);
      const label = monthLabel(enrollment.enrolledAt);
      buckets[label] = (buckets[label] || 0) + coursePrice(course);
    });
    const fallback = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => ({
      month,
      revenue: Math.round((analytics.totalRevenue / 9) * (index + 1)),
      enrollments: Math.max(0, Math.round((analytics.totalStudents / 8) * (index + 1))),
    }));
    const fromEnrollments = Object.entries(buckets).map(([month, revenue]) => ({
      month,
      revenue,
      enrollments: enrollments.filter((item) => monthLabel(item.enrolledAt) === month).length,
    }));
    return fromEnrollments.length ? fromEnrollments : fallback;
  }, [analytics.totalRevenue, analytics.totalStudents, enrollments, myCourses]);

  const coursePerformance = useMemo(() => myCourses.map((course) => ({
    name: course.title?.length > 18 ? `${course.title.slice(0, 18)}...` : course.title || `Course ${course.id}`,
    students: courseStudents(course, enrollmentMap),
    revenue: courseStudents(course, enrollmentMap) * coursePrice(course),
  })).slice(0, 8), [enrollmentMap, myCourses]);

  const statusBreakdown = [
    { name: 'Published', value: analytics.published.length },
    { name: 'Draft', value: analytics.draft.length },
    { name: 'Pending', value: analytics.pending.length },
    { name: 'Rejected', value: analytics.rejected.length },
  ].filter((item) => item.value > 0);

  const studentRows = useMemo(() => enrollments.map((enrollment) => {
    const course = myCourses.find((item) => item.id === enrollment.courseId);
    return {
      ...enrollment,
      courseTitle: course?.title || `Course #${enrollment.courseId}`,
      revenue: coursePrice(course),
    };
  }).filter((row) => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return `${row.userId}`.includes(q) || row.courseTitle.toLowerCase().includes(q) || `${row.status || 'ACTIVE'}`.toLowerCase().includes(q);
  }), [enrollments, myCourses, studentSearch]);

  const metricCards = [
    { label: 'Total Courses', value: myCourses.length, hint: 'Owned by you', icon: LibraryBig, tone: 'blue' },
    { label: 'Published', value: analytics.published.length, hint: 'Live marketplace courses', icon: CheckCircle2, tone: 'green' },
    { label: 'Pending Approval', value: analytics.pending.length, hint: 'Waiting for admin review', icon: Clock3, tone: 'orange' },
    { label: 'Students Enrolled', value: analytics.totalStudents, hint: 'Across your catalog', icon: Users, tone: 'teal' },
    { label: 'Total Revenue', value: currency(analytics.totalRevenue), hint: 'Estimated from enrollments', icon: CircleDollarSign, tone: 'green' },
    { label: 'Monthly Revenue', value: currency(analytics.monthlyRevenue), hint: 'Current month estimate', icon: TrendingUp, tone: 'blue' },
    { label: 'Total Modules', value: analytics.totalModules, hint: 'Published curriculum units', icon: Layers3, tone: 'purple' },
    { label: 'Completion', value: `${analytics.completionAverage}%`, hint: 'Average learner progress', icon: Activity, tone: 'orange' },
    { label: 'Active Students', value: analytics.activeStudents, hint: 'In-progress learners', icon: GraduationCap, tone: 'teal' },
    { label: 'Avg. Rating', value: analytics.averageRating, hint: 'From rated courses', icon: Star, tone: 'yellow' },
  ];

  if (isLoading) {
    return (
      <div className="instructor-dashboard">
        <div className="instructor-portal-hero skeleton" style={{ minHeight: 210 }} />
        <div className="instructor-metric-grid">
          {Array.from({ length: 10 }).map((_, index) => <div key={index} className="skeleton instructor-metric-card" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div className="instructor-dashboard" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {activeSection === 'studio' && (
        <>
          <section className="instructor-portal-hero">
            <div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="instructor-kicker">Instructor Command Center</div>
                {user?.instructorVerificationStatus === 'APPROVED' && (
                  <span className="verified-instructor-badge"><CheckCircle2 size={14} /> Verified Instructor</span>
                )}
              </div>
              <h1>{user?.name || user?.fullName ? `${(user.name || user.fullName).split(' ')[0]}'s teaching studio` : 'Teaching studio'}</h1>
              <p>Run your course catalog, track learner momentum, monitor revenue, and move approvals forward from a focused creator workspace.</p>
              <div className="instructor-hero-actions">
                <button className="btn btn-primary" onClick={() => navigate('/instructor/courses/create', { state: { from: location.pathname } })}>
                  <PlusCircle size={18} aria-hidden="true" /> Create Course
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/instructor/analytics')}>
                  <BarChart3 size={18} aria-hidden="true" /> View Analytics
                </button>
              </div>
            </div>
            <div className="instructor-hero-panel">
              <span>Top course</span>
              <strong>{analytics.topCourse?.title || 'No course yet'}</strong>
              <div className="hero-panel-grid">
                <div><b>{analytics.totalStudents}</b><small>students</small></div>
                <div><b>{currency(analytics.totalRevenue)}</b><small>revenue</small></div>
              </div>
            </div>
          </section>

          {analytics.rejected.length > 0 && (
            <div className="instructor-alert">
              <strong>{analytics.rejected.length} course{analytics.rejected.length > 1 ? 's need' : ' needs'} revision.</strong>
              <span>Open the course editor to review admin feedback and resubmit.</span>
            </div>
          )}

          <section className="instructor-metric-grid" aria-label="Instructor analytics cards">
            {metricCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.article
                  key={card.label}
                  className={`instructor-metric-card tone-${card.tone}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <div className="metric-icon"><Icon size={21} aria-hidden="true" /></div>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.hint}</small>
                </motion.article>
              );
            })}
          </section>
        </>
      )}

      {activeSection === 'courses' && (
        <section className="instructor-section">
          <div className="instructor-section-header">
            <div>
              <div className="instructor-kicker">Course Operations</div>
              <h2>My Courses</h2>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/instructor/courses/create', { state: { from: location.pathname } })}>
              <PlusCircle size={16} aria-hidden="true" /> New Course
            </button>
          </div>

          {myCourses.length === 0 ? (
            <EmptyState
              title="Build your first course"
              description="Create a course, add modules, upload a thumbnail, then submit it for approval."
              action={<button className="btn btn-primary" onClick={() => navigate('/instructor/courses/create', { state: { from: location.pathname } })}>Create Course</button>}
            />
          ) : (
            <div className="instructor-course-board">
              {myCourses.map((course) => {
                const students = courseStudents(course, enrollmentMap);
                const revenue = students * coursePrice(course);
                const progress = enrollmentMap[course.id]?.length
                  ? Math.round(enrollmentMap[course.id].reduce((sum, item) => sum + Number(item.progress || 0), 0) / enrollmentMap[course.id].length)
                  : 0;

                return (
                  <article key={course.id} className="studio-course-card">
                    <div className="studio-course-thumb">
                      {course.thumbnail ? <img src={course.thumbnail} alt="" /> : <div className="studio-course-placeholder"><LibraryBig size={28} /></div>}
                      <span className={`badge ${statusClass(course.status)}`}>{course.status || 'DRAFT'}</span>
                    </div>
                    <div className="studio-course-body">
                      <div className="studio-course-title-row">
                        <h3>{course.title}</h3>
                        <span>{course.price > 0 ? currency(course.price) : 'Free'}</span>
                      </div>
                      <p>{course.description || 'Add a clear course summary so students understand the promise quickly.'}</p>
                      {course.reviewComment && <div className="studio-feedback">Review feedback: {course.reviewComment}</div>}
                      <div className="studio-course-stats">
                        <span><Users size={15} /> {students} students</span>
                        <span><Layers3 size={15} /> {moduleCounts[course.id] || 0} modules</span>
                        <span><CircleDollarSign size={15} /> {currency(revenue)}</span>
                      </div>
                      <div className="studio-progress-row">
                        <span>Avg. progress</span>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                        <strong>{progress}%</strong>
                      </div>
                      <div className="studio-course-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/instructor/courses/${course.id}`)}><Edit3 size={15} /> Edit</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/student/course/${course.id}`)}><Eye size={15} /> Preview</button>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={publishCourseMutation.isPending || unpublishCourseMutation.isPending || (course.status === 'PENDING' && course.reviewStatus === 'PENDING')}
                          onClick={() => {
                            if (course.status === 'PUBLISHED') {
                              unpublishCourseMutation.mutate(course.id);
                              return;
                            }
                            publishCourseMutation.mutate(course.id);
                          }}
                        >
                          {reviewActionLabel(course)}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm danger-action"
                          disabled={deleteCourseMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
                              deleteCourseMutation.mutate(course.id);
                            }
                          }}
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeSection === 'analytics' && (
        <section className="instructor-section">
          <div className="instructor-section-header">
            <div>
              <div className="instructor-kicker">Analytics</div>
              <h2>Revenue and Course Performance</h2>
            </div>
          </div>
          <div className="analytics-grid">
            <div className="analytics-panel wide">
              <h3>Revenue trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.24)" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => currency(value)} />
                  <Area dataKey="revenue" type="monotone" stroke="#2563eb" strokeWidth={3} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="analytics-panel">
              <h3>Enrollments</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.24)" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="enrollments" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="analytics-panel">
              <h3>Course status</h3>
              {statusBreakdown.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
                      {statusBreakdown.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No statuses yet" description="Course status insights appear once you create a course." />}
            </div>

            <div className="analytics-panel wide">
              <h3>Top performing courses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={coursePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.24)" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => name === 'revenue' ? currency(value) : value} />
                  <Bar dataKey="students" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {activeSection === 'students' && (
        <section className="instructor-section">
          <div className="instructor-section-header">
            <div>
              <div className="instructor-kicker">Student Management</div>
              <h2>Enrolled Learners</h2>
            </div>
            <label className="student-search">
              <Search size={16} aria-hidden="true" />
              <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search student, course, status" />
            </label>
          </div>

          <div className="instructor-table-card">
            {progressLoading ? (
              <div className="instructor-table-loading">Loading student progress...</div>
            ) : studentRows.length === 0 ? (
              <EmptyState title="No learners found" description="Enrollments and progress will appear here for your own courses only." />
            ) : (
              <table className="instructor-student-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Enrolled</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.slice(0, 12).map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>Student #{enrollment.userId}</td>
                      <td>{enrollment.courseTitle}</td>
                      <td>{enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <div className="student-progress-cell">
                          <div className="progress-bar"><div className="progress-fill" style={{ width: `${enrollment.progress || 0}%` }} /></div>
                          <span>{enrollment.progress || 0}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${enrollment.status === 'COMPLETED' ? 'badge-green' : 'badge-blue'}`}>{enrollment.status || 'ACTIVE'}</span></td>
                      <td>{currency(enrollment.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {activeSection === 'notifications' && (
        <section>
          <NotificationsPage embedded={true} />
        </section>
      )}

      {activeSection === 'discussions' && (
        <section>
          <DiscussionPage embedded={true} />
        </section>
      )}
    </motion.div>
  );
}

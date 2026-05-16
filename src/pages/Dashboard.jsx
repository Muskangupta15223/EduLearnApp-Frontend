import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, BookOpen, Clock3, Compass, GraduationCap, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { enrollmentAPI, notificationAPI } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import EmptyState from '../components/ui/EmptyState';

function learningGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => enrollmentAPI.getMyEnrollments().then((response) => response.data || []),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-preview'],
    queryFn: () => notificationAPI.getAll().then((response) => response.data?.slice(0, 4) ?? []),
  });

  const inProgress = enrollments.filter((item) => item.status === 'ACTIVE' && (item.progress || 0) < 100);
  const completed = enrollments.filter((item) => (item.progress || 0) >= 100 || item.status === 'COMPLETED');
  const hoursLearned = enrollments.reduce((sum, item) => sum + Number(item.hoursLearned || 0), 0);
  const displayName = user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'Learner';

  return (
    <div className="shell-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-grid">
          <div className="dashboard-hero-copy">
            <span className="page-eyebrow">Student Dashboard</span>
            <h1>{learningGreeting()}, {displayName}</h1>
            <p>Stay oriented with a clean learning overview, quick next steps, and progress signals that help you keep moving without the dashboard feeling crowded.</p>
            <div className="dashboard-hero-actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate('/student/my-learning')}>
                <BookOpen size={16} aria-hidden="true" /> Continue Learning
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/student/courses')}>
                <Compass size={16} aria-hidden="true" /> Browse Catalog
              </button>
            </div>
          </div>

          <div className="hero-aside-grid">
            <div className="mini-panel">
              <span className="metric-card-label">Focus Today</span>
              <strong className="metric-card-value">{inProgress.length > 0 ? `${inProgress[0].progress || 0}%` : 'Ready'}</strong>
              <div className="metric-card-hint">{inProgress.length > 0 ? inProgress[0].course?.title || 'Active course' : 'Choose a new course to begin.'}</div>
            </div>
            <div className="mini-panel">
              <span className="metric-card-label">Certificates</span>
              <strong className="metric-card-value">{completed.length}</strong>
              <div className="metric-card-hint">Completed learning paths ready for review.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard icon={GraduationCap} label="Enrolled Courses" value={enrollments.length} hint="Across active and completed tracks" tone="blue" />
        <MetricCard icon={BookOpen} label="In Progress" value={inProgress.length} hint="Courses with remaining lessons" tone="teal" />
        <MetricCard icon={Trophy} label="Completed" value={completed.length} hint="Programs you have finished" tone="orange" />
        <MetricCard icon={Clock3} label="Learning Hours" value={`${hoursLearned}h`} hint="Tracked study time" tone="violet" />
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-section-card">
          <PageHeader
            eyebrow="Continue"
            title="Pick up where you left off"
            description="Your active learning tracks stay here so the next lesson is always easy to find."
            actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/student/my-learning')}>View all</button>}
          />

          {isLoading ? (
            <div className="stack-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="skeleton" style={{ height: 124, borderRadius: 24 }} />
              ))}
            </div>
          ) : inProgress.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No active courses yet"
              description="Explore the catalog and enroll in a course to start building momentum."
              action={<button type="button" className="btn btn-primary" onClick={() => navigate('/student/courses')}>Browse Courses</button>}
            />
          ) : (
            <div className="stack-list">
              {inProgress.slice(0, 4).map((item) => (
                <article key={item.id} className="list-card">
                  <div className="list-row" style={{ alignItems: 'flex-start' }}>
                    <div className="metric-card-icon"><BookOpen size={18} aria-hidden="true" /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <h3>{item.course?.title || 'Active course'}</h3>
                        <span className="badge badge-blue">{item.progress || 0}% complete</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', margin: '8px 0 12px' }}>
                        Last checkpoint: {item.lastLesson || 'Continue your current module and keep your streak going.'}
                      </p>
                      <div className="dashboard-panel-grid">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${item.progress || 0}%` }} />
                        </div>
                        <div className="course-footer">
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Status: {item.status || 'ACTIVE'}</span>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/student/my-learning')}>
                            Resume
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="stack-list">
          <section className="dashboard-insights">
            <PageHeader eyebrow="Activity" title="Recent notifications" description="Key updates from your courses, assessments, and account activity." />
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No new updates" description="Important activity will show up here as you learn and interact." />
            ) : (
              <div className="notifications-list">
                {notifications.map((item) => (
                  <article key={item.id} className="notification-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <strong>{item.title || 'Notification'}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{item.sentAt ? new Date(item.sentAt).toLocaleDateString() : 'Recent'}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)' }}>{item.message}</p>
                  </article>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/student/notifications')}>Open notifications</button>
              </div>
            )}
          </section>

          <section className="dashboard-insights">
            <PageHeader eyebrow="Shortcuts" title="Quick actions" description="Jump straight into the areas students use most often." />
            <div className="stack-list">
              {[
                { label: 'Explore courses', path: '/student/courses' },
                { label: 'Take an assessment', path: '/student/assessment' },
                { label: 'Join discussions', path: '/student/discussion' },
                { label: 'Review progress', path: '/student/progress' },
              ].map((action) => (
                <button
                  key={action.path}
                  type="button"
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => navigate(action.path)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

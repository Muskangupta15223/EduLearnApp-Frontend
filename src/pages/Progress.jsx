import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { enrollmentAPI, courseAPI } from '../services/api';
import { motion } from 'framer-motion';

const statCards = (activeEnrollments, completedCount, overallProgress, focusedCount) => ([
  { icon: 'Books', label: 'Active Courses', value: activeEnrollments.length, color: 'var(--brand-primary)' },
  { icon: 'Done', label: 'Completed', value: completedCount, color: 'var(--brand-accent)' },
  { icon: 'Focus', label: 'Close to Finish', value: focusedCount, color: 'var(--brand-yellow)' },
  { icon: 'Rate', label: 'Average Progress', value: `${overallProgress}%`, color: 'var(--brand-purple)' },
]);

const iconBoxStyle = (color) => ({
  width: 52,
  height: 52,
  borderRadius: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `color-mix(in srgb, ${color} 14%, transparent)`,
  color,
  fontSize: '1.1rem',
  fontWeight: 800,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
});

export default function ProgressPage() {
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['my-enrollments-progress'],
    queryFn: () => enrollmentAPI.getMyEnrollments().then(r => r.data),
    staleTime: 30000,
  });

  const activeEnrollments = enrollments.filter(e => e.status === 'ACTIVE' || e.status === 'COMPLETED');
  const courseIds = activeEnrollments.map(e => e.courseId);

  const { data: publishedCourses = [] } = useQuery({
    queryKey: ['published-courses-progress'],
    queryFn: () => courseAPI.getPublished().then(r => r.data),
    staleTime: 60000,
  });

  const courseMap = publishedCourses.reduce((acc, course) => {
    acc[course.id] = course;
    return acc;
  }, {});

  const overallProgress = activeEnrollments.length > 0
    ? Math.round(activeEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / activeEnrollments.length)
    : 0;
  const completedCount = activeEnrollments.filter(e => (e.progress || 0) >= 100 || e.status === 'COMPLETED').length;
  const focusedCount = activeEnrollments.filter(e => {
    const progress = e.progress || 0;
    return progress >= 70 && progress < 100;
  }).length;
  const longestRun = activeEnrollments.reduce((best, e) => Math.max(best, e.progress || 0), 0);

  if (isLoading) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">My Progress</h1></div>
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 108, borderRadius: 'var(--radius-xl)' }} />)}
        </div>
        <div className="grid-responsive" style={{ marginBottom: 24 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 230, borderRadius: 'var(--radius-xl)' }} />)}
        </div>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 116, borderRadius: 'var(--radius-lg)', marginBottom: 12 }} />)}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <h1 className="page-title">Progress Studio</h1>
        <p className="page-subtitle">A clearer view of momentum, milestones, and what to finish next.</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {statCards(activeEnrollments, completedCount, overallProgress, focusedCount).map((stat, index) => (
          <motion.div
            key={stat.label}
            className="stat-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            style={{ alignItems: 'stretch' }}
          >
            <div style={iconBoxStyle(stat.color)}>{stat.icon}</div>
            <div style={{ display: 'grid', gap: 4 }}>
              <div className="stat-value">{stat.value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid-responsive" style={{ marginBottom: 28, alignItems: 'stretch' }}>
        <motion.div
          className="card"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12 }}
          style={{
            padding: 28,
            background: 'linear-gradient(145deg, color-mix(in srgb, var(--brand-primary) 10%, var(--bg-surface)), var(--bg-surface))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 420 }}>
              <div style={{ color: 'var(--brand-primary)', fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Learning Pulse
              </div>
              <h3 style={{ marginBottom: 10, fontSize: '1.55rem' }}>You are {overallProgress >= 70 ? 'building strong momentum' : overallProgress >= 35 ? 'making steady progress' : 'just getting started'}.</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {completedCount > 0
                  ? `You have already completed ${completedCount} course${completedCount > 1 ? 's' : ''}.`
                  : 'Your first completion milestone is still ahead.'} The highest course progress right now is {longestRun}%.
              </p>
            </div>

            <div style={{ position: 'relative', width: 170, height: 170 }}>
              <svg width="170" height="170" viewBox="0 0 170 170">
                <circle cx="85" cy="85" r="72" fill="none" stroke="var(--border-default)" strokeWidth="14" />
                <motion.circle
                  cx="85"
                  cy="85"
                  r="72"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={452}
                  initial={{ strokeDashoffset: 452 }}
                  animate={{ strokeDashoffset: 452 - (452 * overallProgress / 100) }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                  transform="rotate(-90 85 85)"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '2.6rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>{overallProgress}%</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>portfolio complete</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18 }}
          style={{ padding: 28 }}
        >
          <div style={{ color: 'var(--brand-accent)', fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Next Wins
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Finish zone</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {focusedCount > 0
                  ? `${focusedCount} course${focusedCount > 1 ? 's are' : ' is'} above 70% and close to completion.`
                  : 'No course is in the finish zone yet.'}
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Coverage</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {activeEnrollments.length > 0
                  ? `You are actively tracking ${activeEnrollments.length} enrolled course${activeEnrollments.length > 1 ? 's' : ''}.`
                  : 'Enroll in a course to start building your learning dashboard.'}
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Best streak</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Your strongest single-course run is currently <strong style={{ color: 'var(--text-primary)' }}>{longestRun}%</strong>.
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <h3 style={{ marginBottom: 16 }}>Course Breakdown</h3>
      {activeEnrollments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>Shelf</div>
          <h3>No courses enrolled</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Enroll in courses to unlock progress tracking and completion insights.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {activeEnrollments.map((enrollment, index) => {
            const progress = enrollment.progress || 0;
            const isComplete = progress >= 100 || enrollment.status === 'COMPLETED';
            const course = courseMap[enrollment.courseId];
            const courseTitle = course?.title || `Course #${enrollment.courseId}`;
            const courseLabel = course?.level || course?.language || 'Learning path';
            const courseLevel = course?.level || 'Self-paced';
            const accent = isComplete ? 'var(--brand-accent)' : progress >= 70 ? 'var(--brand-yellow)' : 'var(--brand-primary)';

            return (
              <motion.div
                key={enrollment.id}
                className="card"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                style={{ padding: 22, overflow: 'hidden', position: 'relative' }}
              >
                <div style={{
                  position: 'absolute',
                  inset: '0 auto 0 0',
                  width: 6,
                  background: `linear-gradient(180deg, ${accent}, transparent)`,
                  borderTopLeftRadius: 'var(--radius-xl)',
                  borderBottomLeftRadius: 'var(--radius-xl)',
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 14, minWidth: 0 }}>
                    <div style={iconBoxStyle(accent)}>{isComplete ? 'Done' : `${progress}%`}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span className={`badge ${isComplete ? 'badge-green' : progress >= 70 ? 'badge-yellow' : 'badge-blue'}`}>{isComplete ? 'Completed' : 'In Progress'}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{courseLabel}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{courseLevel}</span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.08rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {courseTitle}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.87rem' }}>
                        {enrollment.lastLesson ? `Last checkpoint: ${enrollment.lastLesson}` : 'Progress updates will appear as you complete modules.'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: accent }}>{progress}%</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {isComplete ? 'Ready for certificate' : `${Math.max(0, 100 - progress)}% remaining`}
                    </div>
                  </div>
                </div>

                <div className="progress-bar" style={{ height: 12, marginBottom: 12 }}>
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.9, delay: 0.18 + index * 0.06 }}
                    style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 55%, white))` }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <span>Status: {enrollment.status}</span>
                  <span>{courseIds.includes(enrollment.courseId) ? 'Synced with enrollment service' : 'Pending sync'}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

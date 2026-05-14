import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, CreditCard, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { courseAPI, enrollmentAPI } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

function Section({ title, description, children }) {
  return (
    <section className="dashboard-section-card">
      <PageHeader eyebrow="Library" title={title} description={description} />
      {children}
    </section>
  );
}

export default function MyLearningPage() {
  const navigate = useNavigate();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['my-learning'],
    queryFn: () => enrollmentAPI.getMyEnrollments().then((response) => response.data || []),
    staleTime: 30000,
  });

  const { data: publishedCourses = [] } = useQuery({
    queryKey: ['published-courses-my-learning'],
    queryFn: () => courseAPI.getPublished().then((response) => response.data || []),
    staleTime: 60000,
  });

  const courseMap = useMemo(() => publishedCourses.reduce((accumulator, course) => {
    accumulator[course.id] = course;
    return accumulator;
  }, {}), [publishedCourses]);

  const groups = {
    active: enrollments.filter((item) => item.status === 'ACTIVE' && (item.progress || 0) < 100),
    pending: enrollments.filter((item) => item.status === 'PENDING_PAYMENT'),
    completed: enrollments.filter((item) => (item.progress || 0) >= 100 || item.status === 'COMPLETED'),
  };

  const downloadCertificate = async (courseId) => {
    try {
      const response = await enrollmentAPI.getCertificate(courseId);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-course-${courseId}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.alert('Certificate is not available yet.');
    }
  };

  const renderCards = (items, type) => {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={type === 'completed' ? Award : type === 'pending' ? CreditCard : PlayCircle}
          title={`No ${type} courses`}
          description={type === 'active'
            ? 'Once you enroll and begin a course, it will appear here.'
            : type === 'pending'
              ? 'Any checkout you have not finished will stay here until payment is complete.'
              : 'Certificates and finished programs will appear here after completion.'}
        />
      );
    }

    return (
      <div className="courses-grid">
        {items.map((enrollment, index) => {
          const course = courseMap[enrollment.courseId];
          const progress = enrollment.progress || 0;
          const isComplete = type === 'completed';
          const isPending = type === 'pending';
          const title = course?.title || `Course #${enrollment.courseId}`;

          return (
            <motion.article
              key={enrollment.id}
              className="course-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="course-thumb" style={{ display: 'grid', placeItems: 'center' }}>
                <div className="metric-card-icon">
                  {isPending ? <CreditCard size={22} /> : isComplete ? <Award size={22} /> : <BookOpen size={22} />}
                </div>
                <div className="course-thumb-badge">
                  <span className={`badge ${isPending ? 'badge-orange' : isComplete ? 'badge-green' : 'badge-blue'}`}>
                    {isPending ? 'Pending Payment' : isComplete ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>

              <div className="course-body">
                <span className="course-category">{course?.level || course?.language || enrollment.status || 'Learning Path'}</span>
                <h3 className="course-title">{title}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {isPending
                    ? 'Complete payment to unlock the full learning experience and begin your modules.'
                    : isComplete
                      ? 'Revisit lessons, review materials, and download your completion certificate.'
                      : 'Return to your current module and continue the next lesson in your path.'}
                </p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: isPending ? '18%' : `${progress}%` }} />
                </div>
                <div className="course-footer">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    {isPending ? 'Awaiting payment' : `${progress}% progress`}
                  </span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {isComplete ? (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadCertificate(enrollment.courseId)}>
                        Certificate
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        if (isPending && course) {
                          navigate('/student/payment', { state: { course } });
                          return;
                        }
                        navigate(`/student/course/${enrollment.courseId}`);
                      }}
                    >
                      {isPending ? 'Resume Payment' : isComplete ? 'Review Course' : 'Continue'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="shell-page">
      <section className="my-learning-hero">
        <PageHeader
          eyebrow="Learning Library"
          title="Your enrolled courses in one place"
          description="Keep active coursework, unfinished payments, and completed certificates organized in a cleaner study workspace."
          actions={<button type="button" className="btn btn-primary" onClick={() => navigate('/student/courses')}>Explore More Courses</button>}
        />
      </section>

      {isLoading ? (
        <div className="courses-grid">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton" style={{ height: 320, borderRadius: 26 }} />)}
        </div>
      ) : enrollments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Your library is empty"
          description="Browse the catalog, enroll in a course, and this space will turn into your personal learning hub."
          action={<button type="button" className="btn btn-primary" onClick={() => navigate('/student/courses')}>Browse Courses</button>}
        />
      ) : (
        <>
          <Section title={`In Progress (${groups.active.length})`} description="Courses you are actively moving through right now.">
            {renderCards(groups.active, 'active')}
          </Section>
          <Section title={`Pending Payment (${groups.pending.length})`} description="Orders that still need payment confirmation before learning access begins.">
            {renderCards(groups.pending, 'pending')}
          </Section>
          <Section title={`Completed (${groups.completed.length})`} description="Finished courses ready for review, refresh, or certificate download.">
            {renderCards(groups.completed, 'completed')}
          </Section>
        </>
      )}
    </div>
  );
}

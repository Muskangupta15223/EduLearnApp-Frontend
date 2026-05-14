import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Filter, Globe2, Search, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { courseAPI, enrollmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

const LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];
const SORT = ['Popularity', 'Rating', 'Price: Low', 'Price: High', 'Newest'];
const LANGUAGES = ['All Languages', 'English', 'Hindi', 'Spanish', 'French'];

function StatusBadge({ enrollment }) {
  if (!enrollment) return null;
  if (enrollment.status === 'PENDING_PAYMENT') return <span className="badge badge-orange">Pending Payment</span>;
  if ((enrollment.progress || 0) >= 100 || enrollment.status === 'COMPLETED') return <span className="badge badge-green">Completed</span>;
  return <span className="badge badge-blue">Enrolled</span>;
}

function isVerifiedInstructorCourse(course) {
  return course.instructorVerified === true || course.instructorVerificationStatus === 'APPROVED';
}

function normalizeModule(module) {
  const lesson = module.lessons?.[0];
  return {
    ...module,
    videoUrl: module.videoUrl || lesson?.videoUrl || '',
    notes: module.notes || lesson?.content || '',
    resources: module.resources || lesson?.resources || [],
  };
}

function CourseDetailModal({ course, enrollment, onClose }) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedModule, setExpandedModule] = useState(0);

  const enrollMutation = useMutation({
    mutationFn: () => enrollmentAPI.enroll(course.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-enrollments'] });
      toast.success(`Successfully enrolled in "${course.title}"`);
      onClose();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Enrollment failed'),
  });

  const modules = (course.modules || []).map(normalizeModule);
  const isPendingPayment = enrollment?.status === 'PENDING_PAYMENT';
  const isEnrolled = !!enrollment && !isPendingPayment;
  const isFree = !course.price || course.price <= 0;

  const handlePrimaryAction = () => {
    if (isPendingPayment || (!isFree && !isEnrolled)) {
      navigate('/student/payment', { state: { course } });
      onClose();
      return;
    }
    if (isEnrolled || (enrollment?.progress || 0) > 0) {
      navigate(`/student/course/${course.id}`);
      onClose();
      return;
    }
    enrollMutation.mutate();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="pill-group" style={{ marginBottom: 12 }}>
              <button type="button" className="active">{course.level || 'All Levels'}</button>
              {course.language ? <button type="button">{course.language}</button> : null}
              {isVerifiedInstructorCourse(course) ? <button type="button">Verified Instructor</button> : null}
            </div>
            <h3 className="modal-title">{course.title}</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>
              By {course.instructorName || 'EduLearn Instructor'} with structured modules, assessments, and resources.
            </p>
          </div>
        </div>

        <div className="modal-body stack-list">
          <article className="thread-card">
            <div className="course-meta">
              <span><Star size={14} aria-hidden="true" /> {course.rating || 'New'}</span>
              <span>{(course.studentsCount || 0).toLocaleString()} learners</span>
              <span>{modules.length} modules</span>
              <span>{isFree ? 'Free' : `Rs. ${Number(course.price || 0).toLocaleString()}`}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 14 }}>{course.description || 'Open the course to explore videos, lessons, resources, and assessments.'}</p>
          </article>

          {modules.length > 0 ? (
            <div className="stack-list">
              {modules.map((module, index) => {
                const open = expandedModule === index;
                return (
                  <article key={module.id || index} className="thread-card">
                    <button type="button" className="course-footer" style={{ width: '100%', background: 'transparent', border: 0, padding: 0 }} onClick={() => setExpandedModule(open ? -1 : index)}>
                      <div style={{ textAlign: 'left' }}>
                        <strong>Module {index + 1}: {module.title}</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: 8 }}>
                          {module.videoUrl ? 'Video lesson included' : 'Notes-based module'}
                        </div>
                      </div>
                      <span className="badge badge-blue">{module.resources?.length || 0} resources</span>
                    </button>
                    {open ? (
                      <div style={{ marginTop: 14 }}>
                        <p style={{ color: 'var(--text-secondary)' }}>{module.description || 'No module overview yet.'}</p>
                        {module.notes ? <div className="mini-panel" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{module.notes}</div> : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          {enrollment ? <StatusBadge enrollment={enrollment} /> : <span style={{ color: 'var(--text-muted)' }}>Ready to start</span>}
          <button type="button" className="btn btn-primary" disabled={enrollMutation.isPending} onClick={handlePrimaryAction}>
            {enrollMutation.isPending
              ? 'Processing...'
              : isPendingPayment
                ? 'Complete Payment'
                : isEnrolled
                  ? 'Open Course'
                  : isFree
                    ? 'Enroll Free'
                    : 'Enroll Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('All Levels');
  const [language, setLanguage] = useState('All Languages');
  const [sort, setSort] = useState('Popularity');
  const [selected, setSelected] = useState(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses', { level, language, search }],
    queryFn: () => courseAPI.getPublished({
      level: level === 'All Levels' ? undefined : level,
      language: language === 'All Languages' ? undefined : language,
      q: search || undefined,
    }).then((response) => response.data || []),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['catalog-enrollments'],
    queryFn: () => enrollmentAPI.getMyEnrollments().then((response) => response.data || []),
    enabled: !!user,
    staleTime: 30000,
  });

  const enrollmentMap = useMemo(() => enrollments.reduce((accumulator, enrollment) => {
    accumulator[enrollment.courseId] = enrollment;
    return accumulator;
  }, {}), [enrollments]);

  const sortedCourses = [...courses].sort((a, b) => {
    if (sort === 'Price: Low') return (a.price || 0) - (b.price || 0);
    if (sort === 'Price: High') return (b.price || 0) - (a.price || 0);
    if (sort === 'Rating') return (b.rating || 0) - (a.rating || 0);
    if (sort === 'Newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    return (b.studentsCount || 0) - (a.studentsCount || 0);
  });

  return (
    <div className="shell-page">
      <PageHeader
        eyebrow="Catalog"
        title="Explore courses"
        description="Discover verified learning experiences with cleaner filters, simpler cards, and a clearer path into enrollment."
      />

      <section className="course-filter-panel">
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) repeat(3, minmax(140px, 0.3fr))' }}>
          <label className="app-search" style={{ width: '100%', minWidth: 0 }}>
            <Search size={16} aria-hidden="true" />
            <input placeholder="Search title, instructor, or topic" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label className="student-search">
            <Filter size={16} aria-hidden="true" />
            <select className="form-input" value={level} onChange={(event) => setLevel(event.target.value)} style={{ border: 0, background: 'transparent', padding: 0 }}>
              {LEVELS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="student-search">
            <Globe2 size={16} aria-hidden="true" />
            <select className="form-input" value={language} onChange={(event) => setLanguage(event.target.value)} style={{ border: 0, background: 'transparent', padding: 0 }}>
              {LANGUAGES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="student-search">
            <Star size={16} aria-hidden="true" />
            <select className="form-input" value={sort} onChange={(event) => setSort(event.target.value)} style={{ border: 0, background: 'transparent', padding: 0 }}>
              {SORT.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </section>

      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{sortedCourses.length}</strong> published courses
      </div>

      {isLoading ? (
        <div className="courses-grid">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton" style={{ height: 340, borderRadius: 26 }} />)}
        </div>
      ) : sortedCourses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses found" description="Try adjusting your search or filters to reveal more catalog options." />
      ) : (
        <div className="courses-grid">
          {sortedCourses.map((course) => {
            const enrollment = enrollmentMap[course.id];
            const isFree = !course.price || course.price <= 0;
            const isPendingPayment = enrollment?.status === 'PENDING_PAYMENT';
            const isEnrolled = !!enrollment && !isPendingPayment;

            return (
              <article key={course.id} className="course-card" onClick={() => setSelected(course)}>
                <div className="course-thumb">
                  {course.thumbnail ? <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  <div className="course-thumb-overlay" />
                  <div className="course-thumb-badge" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isFree ? <span className="badge badge-blue">Free</span> : null}
                    {isVerifiedInstructorCourse(course) ? <span className="badge badge-green">Verified Instructor</span> : null}
                    <StatusBadge enrollment={enrollment} />
                  </div>
                </div>

                <div className="course-body">
                  <span className="course-category">{course.category || 'Course'}</span>
                  <div className="course-footer" style={{ alignItems: 'flex-start' }}>
                    <h3 className="course-title">{course.title}</h3>
                    <span className="badge badge-purple">{course.level || 'All Levels'}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {course.description || 'Explore the course outline, lesson resources, and full module breakdown inside the detail view.'}
                  </p>
                  <div className="course-meta">
                    <span><Star size={14} aria-hidden="true" /> {course.rating || 'New'}</span>
                    <span>{(course.studentsCount || 0).toLocaleString()} students</span>
                    <span>{(course.modules || []).length} modules</span>
                  </div>
                  {enrollment ? (
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: isPendingPayment ? '18%' : `${enrollment.progress || 0}%` }} />
                    </div>
                  ) : null}
                  <div className="course-footer">
                    <strong className={`course-price ${isFree ? 'free' : ''}`}>{isFree ? 'Free' : `Rs. ${Number(course.price || 0).toLocaleString()}`}</strong>
                    <button type="button" className={`btn btn-sm ${isEnrolled ? 'btn-secondary' : 'btn-primary'}`} onClick={(event) => { event.stopPropagation(); setSelected(course); }}>
                      {isPendingPayment ? 'Resume Payment' : isEnrolled ? 'Open' : isFree ? 'Enroll Free' : 'Enroll'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected ? <CourseDetailModal course={selected} enrollment={enrollmentMap[selected.id]} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

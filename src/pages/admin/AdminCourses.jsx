import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownUp, BookOpenCheck, Search, ShieldCheck, Star, TrendingUp } from 'lucide-react';
import { courseAPI, enrollmentAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

function currency(value) {
  return Number(value || 0) <= 0 ? 'Free' : `Rs. ${Number(value || 0).toLocaleString()}`;
}

function badge(status) {
  if (status === 'PUBLISHED' || status === 'APPROVED') return 'badge-green';
  if (status === 'PENDING') return 'badge-orange';
  if (status === 'REJECTED') return 'badge-red';
  return 'badge-blue';
}

export default function AdminCourses() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const initialStatus = new URLSearchParams(location.search).get('status') || 'ALL';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [sort, setSort] = useState('newest');
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin-courses-page'],
    queryFn: () => courseAPI.getAll().then((response) => response.data || []),
    staleTime: 30000,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['admin-course-enrollments'],
    queryFn: () => enrollmentAPI.getAll().then((response) => response.data || []),
    staleTime: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => courseAPI.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses-page'] });
      toast.success('Course approved and published');
    },
    onError: () => toast.error('Failed to approve course'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }) => courseAPI.reject(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses-page'] });
      setRejectingId(null);
      setReason('');
      toast.success('Course rejected with feedback');
    },
    onError: () => toast.error('Failed to reject course'),
  });

  const enrollmentMap = useMemo(() => enrollments.reduce((accumulator, item) => {
    accumulator[item.courseId] = accumulator[item.courseId] ? [...accumulator[item.courseId], item] : [item];
    return accumulator;
  }, {}), [enrollments]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.map((course) => {
      const courseEnrollments = enrollmentMap[course.id] || [];
      const revenue = courseEnrollments.length * Number(course.price || 0);
      const progress = courseEnrollments.length
        ? Math.round(courseEnrollments.reduce((sum, item) => sum + Number(item.progress || 0), 0) / courseEnrollments.length)
        : 0;
      return { ...course, enrollmentCount: courseEnrollments.length || course.studentsCount || 0, revenue, progress };
    }).filter((course) => {
      const matchesSearch = !q || `${course.title || ''} ${course.instructorName || ''} ${course.level || ''} ${course.language || ''}`.toLowerCase().includes(q);
      const matchesStatus = status === 'ALL' || course.status === status || course.reviewStatus === status;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (sort === 'revenue') return b.revenue - a.revenue;
      if (sort === 'students') return b.enrollmentCount - a.enrollmentCount;
      if (sort === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [courses, enrollmentMap, search, sort, status]);

  const cards = [
    { label: 'Total Courses', value: courses.length, icon: BookOpenCheck },
    { label: 'Pending Approval', value: courses.filter((course) => course.status === 'PENDING').length, icon: ShieldCheck },
    { label: 'Total Enrollments', value: enrollments.length, icon: TrendingUp },
    { label: 'Average Rating', value: (courses.reduce((sum, course) => sum + Number(course.rating || 0), 0) / Math.max(1, courses.filter((course) => course.rating).length)).toFixed(1), icon: Star },
  ];

  return (
    <div className="admin-dashboard-page">
      <section className="admin-page-title">
        <div>
          <span>Course Management</span>
          <h1>Catalog Operations and Approval Queue</h1>
          <p>Inspect instructor ownership, modules, enrollments, revenue, progress analytics, ratings, and review controls.</p>
        </div>
      </section>

      <section className="admin-stat-grid compact">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="admin-stat-card tone-green" key={card.label}>
              <div className="admin-stat-icon"><Icon size={20} /></div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          );
        })}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <label className="admin-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses, instructors, level, or language" />
          </label>
          <div className="admin-filter-row">
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="PUBLISHED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Newest</option>
              <option value="revenue">Revenue</option>
              <option value="students">Students</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="skeleton" style={{ height: 420, borderRadius: 8 }} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th><ArrowDownUp size={14} /> Course</th><th>Instructor</th><th>Modules</th><th>Enrollments</th><th>Revenue</th><th>Progress</th><th>Rating</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <b>{course.title}</b>
                      <small>
                        {course.level || 'All levels'} {course.language ? `| ${course.language}` : ''}
                        {course.reviewStatus === 'APPROVED' ? ' | Verified' : ''}
                      </small>
                    </td>
                    <td>{course.instructorName || `Instructor #${course.instructorId || '-'}`}</td>
                    <td>{course.modules?.length || 0}</td>
                    <td>{course.enrollmentCount}</td>
                    <td>{currency(course.revenue)}</td>
                    <td><div className="admin-progress"><span style={{ width: `${course.progress}%` }} /></div>{course.progress}%</td>
                    <td>{course.rating || 'New'}</td>
                    <td><span className={`badge ${badge(course.status)}`}>{course.status || 'DRAFT'}</span></td>
                    <td>
                      {course.status === 'PENDING' ? (
                        <div className="admin-course-actions">
                          <div className="admin-row-actions">
                            <button className="admin-action" onClick={() => navigate(`/course/${course.id}`)}>Preview</button>
                          </div>
                          <div className="admin-row-actions">
                            <button className="admin-action success" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(course.id)}>Approve</button>
                            <button className="admin-action danger" onClick={() => setRejectingId(rejectingId === course.id ? null : course.id)}>Reject</button>
                          </div>
                          {rejectingId === course.id && (
                            <div className="admin-review-box">
                              <textarea className="admin-textarea" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rejection feedback" />
                              <button className="admin-action danger" disabled={rejectMutation.isPending || !reason.trim()} onClick={() => rejectMutation.mutate({ id: course.id, comment: reason })}>Send Feedback</button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="admin-row-actions">
                          <button className="admin-action" onClick={() => navigate(`/course/${course.id}`)}>Preview</button>
                          <span style={{ color: 'var(--admin-muted)' }}>{course.reviewComment || 'No quick action'}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan="9" className="admin-empty-cell">No courses match the current filters.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

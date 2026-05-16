import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, SlidersHorizontal, UserCheck, Users } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZE = 10;

function statusBadge(role, verification) {
  if (role === 'ADMIN') return 'badge-purple';
  if (verification === 'APPROVED') return 'badge-verification';
  if (verification === 'PENDING') return 'badge-orange';
  if (role === 'INSTRUCTOR') return 'badge-blue';
  return 'badge-green';
}

export default function AdminUsers() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const initialRole = new URLSearchParams(location.search).get('role') || 'ALL';
  const [search, setSearch] = useState('');
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users-page'],
    queryFn: () => adminAPI.getAllUsers().then((r) => r.data || []),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['admin-user-enrollments'],
    queryFn: () => adminAPI.getAllEnrollments().then((r) => r.data || []),
    staleTime: 60000,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, nextRole }) => adminAPI.updateRole(userId, nextRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-page'] });
      toast.success('User role updated');
    },
    onError: () => toast.error('Failed to update role'),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !q || `${user.fullName || ''} ${user.name || ''} ${user.email || ''} ${user.role || ''}`.toLowerCase().includes(q);
      const matchesRole = role === 'ALL' || user.role === role;
      const matchesStatus = status === 'ALL'
        || (status === 'VERIFIED' && user.instructorVerificationStatus === 'APPROVED')
        || (status === 'PENDING' && user.instructorVerificationStatus === 'PENDING')
        || (status === 'ACTIVE' && user.role !== 'DEACTIVATED')
        || (status === 'INACTIVE' && user.role === 'DEACTIVATED');
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [role, search, status, users]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const enrollmentMap = useMemo(() => enrollments.reduce((acc, enrollment) => {
    acc[enrollment.userId] = acc[enrollment.userId] ? [...acc[enrollment.userId], enrollment] : [enrollment];
    return acc;
  }, {}), [enrollments]);

  const userStats = [
    { label: 'All Users', value: users.length, icon: Users },
    { label: 'Students', value: users.filter((user) => user.role === 'STUDENT').length, icon: Users },
    { label: 'Instructors', value: users.filter((user) => user.role === 'INSTRUCTOR').length, icon: UserCheck },
    { label: 'Pending Verification', value: users.filter((user) => user.instructorVerificationStatus === 'PENDING').length, icon: SlidersHorizontal },
  ];

  return (
    <div className="admin-dashboard-page">
      <section className="admin-page-title">
        <div>
          <span>User Management</span>
          <h1>Accounts, Activity, and Enrollments</h1>
          <p>Search, filter, paginate, inspect profiles, track enrollments, and manage user roles without touching authentication flows.</p>
        </div>
      </section>

      <section className="admin-stat-grid compact">
        {userStats.map((card) => {
          const Icon = card.icon;
          return (
            <article className="admin-stat-card tone-cyan" key={card.label}>
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
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, email, role" />
          </label>
          <div className="admin-filter-row">
            <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
              <option value="ALL">All roles</option>
              <option value="STUDENT">Students</option>
              <option value="INSTRUCTOR">Instructors</option>
              <option value="ADMIN">Admins</option>
            </select>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Deactivated</option>
              <option value="VERIFIED">Verified instructors</option>
              <option value="PENDING">Pending verification</option>
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
                  <th>User</th><th>Role</th><th>Status</th><th>Enrollments</th><th>Created</th><th>Last Activity</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((user) => (
                  <tr key={user.id}>
                    <td><b>{user.fullName || user.name || 'User'}</b><small>{user.email}</small></td>
                    <td><span className={`badge ${user.role === 'ADMIN' ? 'badge-purple' : user.role === 'INSTRUCTOR' ? 'badge-blue' : 'badge-green'}`}>{user.role || 'STUDENT'}</span></td>
                    <td><span className={`badge ${statusBadge(user.role, user.instructorVerificationStatus)}`}>{user.instructorVerificationStatus || 'ACTIVE'}</span></td>
                    <td>{enrollmentMap[user.id]?.length || 0}</td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
                    <td>{user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Recent'}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-action" onClick={() => setSelected(user)}>View Profile</button>
                        <select
                          value={user.role || 'STUDENT'}
                          disabled={user.role === 'ADMIN'}
                          onChange={(event) => updateRoleMutation.mutate({ userId: user.id, nextRole: event.target.value })}
                        >
                          <option value="STUDENT">Student</option>
                          <option value="INSTRUCTOR">Instructor</option>
                          <option value="DEACTIVATED">Deactivate</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
                {pagedRows.length === 0 && <tr><td colSpan="7" className="admin-empty-cell">No users match the current filters.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-pagination">
          <span>Page {page} of {pageCount} · {rows.length} users</span>
          <div>
            <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <button disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
          </div>
        </div>
      </section>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selected.fullName || selected.name || 'User profile'}</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>{selected.email}</p>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>X</button>
            </div>
            <div className="modal-body">
              <div className="admin-profile-grid">
                <div><span>Role</span><b>{selected.role || 'STUDENT'}</b></div>
                <div><span>Verification</span><b>{selected.instructorVerificationStatus || 'ACTIVE'}</b></div>
                <div><span>Enrollments</span><b>{enrollmentMap[selected.id]?.length || 0}</b></div>
                <div><span>Member ID</span><b>#{selected.id}</b></div>
              </div>
              <h4 style={{ margin: '22px 0 12px' }}>Enrollment History</h4>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Course ID</th><th>Progress</th><th>Status</th><th>Enrolled</th></tr></thead>
                  <tbody>
                    {(enrollmentMap[selected.id] || []).map((item) => (
                      <tr key={item.id}><td>#{item.courseId}</td><td>{item.progress || 0}%</td><td>{item.status || 'ACTIVE'}</td><td>{item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString() : '-'}</td></tr>
                    ))}
                    {!enrollmentMap[selected.id]?.length && <tr><td colSpan="4" className="admin-empty-cell">No enrollment history.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

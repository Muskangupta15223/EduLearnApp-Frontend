import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { notificationAPI } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

export default function NotificationsPage({ embedded }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getAll().then((response) => response.data || []),
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationAPI.getUnreadCount().then((response) => response.data),
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationAPI.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => notificationAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = unreadData?.count || 0;
  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
      ? notifications.filter((item) => !item.isRead)
      : notifications.filter((item) => item.isRead);

  const formatTime = (value) => {
    if (!value) return 'Recent';
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div id="notifications" className={embedded ? 'instructor-section' : 'shell-page'}>
      {!embedded ? (
        <PageHeader
          eyebrow="Inbox"
          title="Notifications"
          description={unreadCount > 0
            ? `You have ${unreadCount} unread update${unreadCount > 1 ? 's' : ''} across your LMS activity.`
            : 'Everything is up to date right now.'}
          actions={unreadCount > 0 ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => markAllReadMutation.mutate()}>
              <CheckCheck size={16} aria-hidden="true" /> Mark all read
            </button>
          ) : null}
        />
      ) : (
        <div className="instructor-section-header">
          <div>
            <div className="instructor-kicker">Updates</div>
            <h2>Notifications</h2>
          </div>
          {unreadCount > 0 ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => markAllReadMutation.mutate()}>
              <CheckCheck size={16} aria-hidden="true" /> Mark all read
            </button>
          ) : null}
        </div>
      )}

      <div className="pill-group">
        {[
          { key: 'all', label: `All (${notifications.length})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'read', label: 'Read' },
        ].map((item) => (
          <button key={item.key} type="button" className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="stack-list">
          {Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton" style={{ height: 110, borderRadius: 24 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications here"
          description={filter === 'unread' ? 'There are no unread updates at the moment.' : 'This feed will populate with activity from across the platform.'}
        />
      ) : (
        <div className="notifications-list">
          {filtered.map((item, index) => (
            <motion.article
              key={item.id}
              className="notification-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              style={{
                borderLeft: !item.isRead ? '4px solid var(--brand-primary)' : '4px solid transparent',
                background: !item.isRead ? 'color-mix(in srgb, var(--bg-soft) 60%, var(--bg-surface-strong))' : undefined,
              }}
              onClick={() => {
                if (!item.isRead) markReadMutation.mutate(item.id);
              }}
            >
              <div className="list-row" style={{ alignItems: 'flex-start' }}>
                <div className="metric-card-icon"><Bell size={18} aria-hidden="true" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{item.title || 'Notification'}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{formatTime(item.sentAt)}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{item.message}</p>
                </div>
                <button
                  type="button"
                  className="theme-toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteMutation.mutate(item.id);
                  }}
                  aria-label="Delete notification"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}

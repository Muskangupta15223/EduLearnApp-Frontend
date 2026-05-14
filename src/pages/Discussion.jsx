import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquareText, PlusCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { courseAPI, discussionAPI, enrollmentAPI } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

function avatarInitial(name) {
  return (name || 'A').slice(0, 2).toUpperCase();
}

function Avatar({ name, src }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt="" onError={() => setFailed(true)} className="layout-avatar-img" style={{ width: 42, height: 42 }} />;
  }
  return <div className="avatar"><span>{avatarInitial(name)}</span></div>;
}

export default function DiscussionPage({ embedded }) {
  const { user } = useAuth();
  const [courseId, setCourseId] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadEnrolledCourses = async () => {
      try {
        const enrollmentResponse = await enrollmentAPI.getMyEnrollments();
        const courseResponse = await courseAPI.getPublished().catch(() => ({ data: [] }));
        const courseMap = (courseResponse.data || []).reduce((accumulator, course) => {
          accumulator[course.id] = course;
          return accumulator;
        }, {});

        const decorated = (enrollmentResponse.data || []).map((enrollment) => ({
          ...enrollment,
          courseTitle: courseMap[enrollment.courseId]?.title || `Course #${enrollment.courseId}`,
          courseLabel: courseMap[enrollment.courseId]?.level || courseMap[enrollment.courseId]?.language || 'Discussion room',
        }));

        setEnrolledCourses(decorated);
        if (decorated.length > 0) {
          setCourseId(decorated[0].courseId);
        }
      } catch {
        setEnrolledCourses([]);
      }
      setLoading(false);
    };

    loadEnrolledCourses();
  }, []);

  useEffect(() => {
    if (!courseId) return;
    discussionAPI.getThreads(courseId).then((response) => {
      setThreads(response.data || []);
    }).catch(() => setThreads([]));
  }, [courseId]);

  const selectedCourse = useMemo(() => enrolledCourses.find((item) => item.courseId === courseId), [courseId, enrolledCourses]);

  const openThread = async (thread) => {
    try {
      const response = await discussionAPI.getThread(courseId, thread.id);
      setSelectedThread(response.data || thread);
    } catch {
      setSelectedThread(thread);
    }
  };

  const createThread = async (event) => {
    event.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    try {
      await discussionAPI.createThread(courseId, {
        title: newTitle,
        content: newContent,
        userName: user?.name || user?.fullName || 'Learner',
      });
      setNewTitle('');
      setNewContent('');
      setShowNewThread(false);
      const response = await discussionAPI.getThreads(courseId);
      setThreads(response.data || []);
    } finally {
      setSubmitting(false);
    }
  };

  const addReply = async () => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    try {
      await discussionAPI.addReply(courseId, selectedThread.id, {
        content: replyContent,
        userName: user?.name || user?.fullName || 'Learner',
      });
      setReplyContent('');
      const response = await discussionAPI.getThread(courseId, selectedThread.id);
      setSelectedThread(response.data || selectedThread);
      const threadList = await discussionAPI.getThreads(courseId);
      setThreads(threadList.data || []);
    } finally {
      setSubmitting(false);
    }
  };

  const wrapperClassName = embedded ? 'instructor-section' : 'shell-page';

  return (
    <div id="discussion" className={wrapperClassName}>
      {!embedded ? (
        <section className="discussion-hero">
          <PageHeader
            eyebrow="Community"
            title="Discussion hub"
            description="Ask clear questions, share context, and keep course conversations attached to the learning flow."
            actions={courseId ? (
              <button type="button" className="btn btn-primary" onClick={() => setShowNewThread(true)}>
                <PlusCircle size={16} aria-hidden="true" /> Start Thread
              </button>
            ) : null}
          />
          {enrolledCourses.length > 0 ? (
            <div className="discussion-hero-grid">
              <div className="mini-panel">
                <strong>{selectedCourse?.courseTitle || 'Choose a course'}</strong>
                <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{selectedCourse?.courseLabel || 'Switch between your enrolled course rooms below.'}</p>
                <div className="pill-group" style={{ marginTop: 16 }}>
                  {enrolledCourses.map((item) => (
                    <button key={item.id} type="button" className={courseId === item.courseId ? 'active' : ''} onClick={() => { setCourseId(item.courseId); setSelectedThread(null); }}>
                      {item.courseTitle}
                    </button>
                  ))}
                </div>
              </div>
              <div className="discussion-metrics-grid">
                <div className="discussion-metric">
                  <span className="metric-card-label">Threads</span>
                  <strong className="metric-card-value">{threads.length}</strong>
                </div>
                <div className="discussion-metric">
                  <span className="metric-card-label">Replies</span>
                  <strong className="metric-card-value">{threads.reduce((sum, item) => sum + (item.replies?.length || 0), 0)}</strong>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="instructor-section-header">
          <div>
            <div className="instructor-kicker">Manage</div>
            <h2>Discussions</h2>
          </div>
          {courseId ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowNewThread(true)}>
              <PlusCircle size={16} aria-hidden="true" /> Start Thread
            </button>
          ) : null}
        </div>
      )}

      {loading ? (
        <div className="stack-list">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton" style={{ height: 116, borderRadius: 24 }} />)}
        </div>
      ) : !courseId ? (
        <EmptyState
          icon={MessageSquareText}
          title="No course rooms available yet"
          description="Enroll in a course first, and its discussion space will appear here automatically."
        />
      ) : threads.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No discussion threads yet"
          description="Start the first thread for this course to ask a question or share context with other learners."
          action={<button type="button" className="btn btn-primary" onClick={() => setShowNewThread(true)}>Start Thread</button>}
        />
      ) : (
        <div className="threads-list">
          {threads.map((thread, index) => (
            <motion.article
              key={thread.id}
              className="thread-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => openThread(thread)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <span className="badge badge-purple">Discussion</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{thread.createdAt ? new Date(thread.createdAt).toLocaleDateString() : 'Recent'}</span>
              </div>
              <h3>{thread.title}</h3>
              <p style={{ color: 'var(--text-secondary)' }}>{thread.content}</p>
              <div className="course-footer">
                <div className="list-row">
                  <Avatar name={thread.userName} src={thread.userAvatarUrl || thread.avatarUrl} />
                  <div>
                    <strong>{thread.userName || 'Anonymous'}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{thread.replies?.length || 0} replies</div>
                  </div>
                </div>
                <button type="button" className="btn btn-secondary btn-sm">Open</button>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showNewThread ? (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewThread(false)}>
            <motion.div className="modal" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Start a new discussion</h3>
              </div>
              <form onSubmit={createThread}>
                <div className="modal-body stack-list">
                  <div>
                    <label className="form-label">Title</label>
                    <input className="form-input" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Details</label>
                    <textarea className="form-input" rows={5} value={newContent} onChange={(event) => setNewContent(event.target.value)} required />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowNewThread(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Posting...' : 'Post Thread'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedThread ? (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedThread(null)}>
            <motion.div className="modal modal-lg" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="badge badge-blue">Thread</span>
                  <h3 className="modal-title" style={{ marginTop: 10 }}>{selectedThread.title}</h3>
                </div>
              </div>
              <div className="modal-body stack-list" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <article className="thread-card">
                  <div className="list-row" style={{ alignItems: 'flex-start' }}>
                    <Avatar name={selectedThread.userName} src={selectedThread.userAvatarUrl || selectedThread.avatarUrl} />
                    <div>
                      <strong>{selectedThread.userName || 'Anonymous'}</strong>
                      <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{selectedThread.content}</p>
                    </div>
                  </div>
                </article>

                {(selectedThread.replies || []).map((reply, index) => (
                  <motion.article key={reply.id || index} className="thread-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                    <div className="list-row" style={{ alignItems: 'flex-start' }}>
                      <Avatar name={reply.userName} src={reply.userAvatarUrl || reply.avatarUrl} />
                      <div>
                        <strong>{reply.userName || 'Anonymous'}</strong>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{reply.content}</p>
                      </div>
                    </div>
                  </motion.article>
                ))}

                <div className="thread-card">
                  <label className="form-label">Add reply</label>
                  <textarea className="form-input" rows={4} value={replyContent} onChange={(event) => setReplyContent(event.target.value)} />
                  <div className="modal-footer" style={{ padding: '18px 0 0', border: 0 }}>
                    <button type="button" className="btn btn-primary" onClick={addReply} disabled={submitting || !replyContent.trim()}>
                      <Send size={16} aria-hidden="true" /> {submitting ? 'Sending...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

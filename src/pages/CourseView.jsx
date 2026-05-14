import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseAPI, enrollmentAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

function toAbsoluteResourceUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url;
}

function getEmbedUrl(rawUrl) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace('www.', '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname.startsWith('/embed/')) return rawUrl;
      if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.split('/')[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      const id = url.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === 'youtu.be') {
      const id = url.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      const id = parts[parts.length - 1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeModule(module) {
  const fallbackLesson = module.lessons?.[0];
  return {
    id: module.id,
    title: module.title,
    description: module.description || '',
    notes: module.notes || fallbackLesson?.content || '',
    videoUrl: module.videoUrl || fallbackLesson?.videoUrl || '',
    duration: module.duration || fallbackLesson?.duration || '',
    resources: module.resources || fallbackLesson?.resources || [],
    progressId: module.contentLessonId || fallbackLesson?.id || module.id,
    isPublished: module.isPublished !== false,
    isLocked: module.isLocked === true || fallbackLesson?.isLocked === true,
  };
}

export default function CourseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: enrollment, isLoading: enrollLoading } = useQuery({
    queryKey: ['my-enrollment', id],
    queryFn: () => enrollmentAPI.isEnrolled(id).then((response) => response.data),
    retry: false,
    enabled: user?.role === 'STUDENT',
  });

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-content', id],
    queryFn: () => courseAPI.getById(id).then((response) => response.data),
  });

  const { data: lessonStatuses = [] } = useQuery({
    queryKey: ['lesson-statuses', id],
    queryFn: () => enrollmentAPI.getLessonStatuses(id).then((response) => response.data),
    enabled: user?.role === 'STUDENT' && !!enrollment?.enrolled,
  });

  const isOwner = user?.id && course?.instructorId === user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const canPreviewUnpublished = isAdmin || isOwner;

  const moduleItems = (course?.modules || [])
    .map(normalizeModule)
    .filter((module) => canPreviewUnpublished || module.isPublished);

  const { mutate: completeModule, isPending: completingModule } = useMutation({
    mutationFn: (progressId) => enrollmentAPI.updateProgress(id, progressId, 100),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-enrollment', id] });
      qc.invalidateQueries({ queryKey: ['lesson-statuses', id] });
      qc.invalidateQueries({ queryKey: ['my-learning'] });
      qc.invalidateQueries({ queryKey: ['my-enrollments-progress'] });
    },
  });

  useEffect(() => {
    if (moduleItems.length > 0 && !activeModule) {
      setActiveModule(moduleItems[0]);
    }
  }, [moduleItems, activeModule]);

  if (courseLoading || (user?.role === 'STUDENT' && enrollLoading)) {
    return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  }

  const hasAccess = isAdmin || isOwner || enrollment?.enrolled;

  if (!hasAccess) {
    return (
      <div className="page-loader">
        <span style={{ fontSize: '3rem' }}>Locked</span>
        <h2 style={{ marginTop: 16 }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>You must be enrolled in this course to view its content.</p>
        <button className="btn btn-primary" onClick={() => navigate('/student/courses')}>Back to Courses</button>
      </div>
    );
  }

  const lessonStatusMap = Object.fromEntries(lessonStatuses.map((status) => [status.lessonId, status]));
  const activeModuleIndex = moduleItems.findIndex((module) => module.id === activeModule?.id);
  const nextModule = activeModuleIndex >= 0 ? moduleItems[activeModuleIndex + 1] : null;
  const activeStatus = lessonStatusMap[activeModule?.progressId];
  const embedUrl = getEmbedUrl(activeModule?.videoUrl);

  const handleCompleteAndNext = () => {
    if (!activeModule) return;

    completeModule(activeModule.progressId, {
      onSuccess: async () => {
        toast.success('Module marked complete');
        if (nextModule) {
          setActiveModule(nextModule);
          return;
        }
        try {
          await enrollmentAPI.markComplete(id);
          qc.invalidateQueries({ queryKey: ['my-learning'] });
          qc.invalidateQueries({ queryKey: ['my-enrollments-progress'] });
          toast.success('Course completed! Your certificate is now available.');
        } catch {
          // no-op
        }
      },
    });
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', overflow: 'hidden', margin: '-24px' }}>
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? 360 : 0 }}
        style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>Course Modules</h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{course?.title}</div>
        </div>

        <div style={{ flex: 1, padding: 12 }}>
          {moduleItems.map((module, index) => {
            const moduleState = lessonStatusMap[module.progressId];
            const completed = moduleState?.status === 'COMPLETED';
            const sequentiallyLocked = index > 0 && lessonStatusMap[moduleItems[index - 1]?.progressId]?.status !== 'COMPLETED';
            const locked = module.isLocked || sequentiallyLocked;
            return (
              <button
                key={module.id}
                onClick={() => !locked && setActiveModule(module)}
                disabled={locked}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  border: '1px solid',
                  borderColor: activeModule?.id === module.id ? 'var(--brand-primary)' : 'var(--border-subtle)',
                  background: activeModule?.id === module.id ? 'rgba(10,132,255,0.08)' : completed ? 'rgba(16,185,129,0.08)' : 'transparent',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.58 : 1,
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Module {index + 1}
                  </span>
                  {completed && <span className="badge badge-green">Done</span>}
                  {locked && !completed && <span className="badge badge-orange">Locked</span>}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{module.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.6 }}>
                  {module.description || 'No overview added yet.'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {module.videoUrl && <span className="badge badge-blue">Video</span>}
                  {module.duration && <span className="badge badge-orange">{module.duration}</span>}
                  {(module.resources || []).length > 0 && <span className="badge badge-purple">{module.resources.length} resources</span>}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)', overflowY: 'auto' }}>
        <div style={{ padding: 24, flex: 1 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '6px 12px',
              marginBottom: 16,
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          </button>

          {activeModule ? (
            <div className="animate-fadeIn">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>{activeModule.title}</h1>
                <p style={{ color: 'var(--text-muted)' }}>{course.title} {activeModule.duration ? `| ${activeModule.duration}` : ''}</p>
              </div>

              {activeModule.videoUrl ? (
                embedUrl ? (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 20, background: '#000', marginBottom: 24 }}>
                    <iframe
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      src={embedUrl}
                      title={activeModule.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Video link needs attention</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                      This module has a video URL, but it is not in a supported embeddable format yet.
                    </p>
                    <a href={activeModule.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                      Open Original Link
                    </a>
                  </div>
                )
              ) : null}

              <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Description and Notes</h3>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
                  {activeModule.notes || activeModule.description || 'This module does not have notes yet.'}
                </div>
                <div style={{ marginTop: 16 }}>
                  <span className={`badge ${activeStatus?.status === 'COMPLETED' ? 'badge-green' : 'badge-blue'}`}>
                    {activeStatus?.status === 'COMPLETED' ? 'Completed' : 'Ready to complete'}
                  </span>
                  {course.reviewStatus === 'APPROVED' && <span className="badge badge-green" style={{ marginLeft: 8 }}>Verified</span>}
                </div>
              </div>

              {(activeModule.resources || []).length > 0 && (
                <div className="glass-card" style={{ padding: 24 }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Resources</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {activeModule.resources.map((resource) => (
                      <a
                        key={resource.id || `${resource.resourceType}-${resource.resourceUrl}`}
                        href={toAbsoluteResourceUrl(resource.resourceUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={resource.resourceUrl?.startsWith('/courses/uploads/') ? '' : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          textDecoration: 'none',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,132,255,0.12)', color: 'var(--brand-primary)', fontSize: '0.8125rem', fontWeight: 700 }}>
                          {resource.resourceType || 'FILE'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{resource.title || 'Untitled resource'}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {resource.fileSize ? `${resource.resourceType} | ${resource.fileSize}` : resource.resourceUrl}
                          </div>
                        </div>
                        <span style={{ color: 'var(--brand-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                          {resource.resourceUrl?.startsWith('/courses/uploads/') ? 'Download' : 'Open'}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="page-loader">
              <span style={{ fontSize: '3rem' }}>Play</span>
              <h3>Select a module to start learning</h3>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/student/my-learning')}>Exit Player</button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" disabled={activeModuleIndex <= 0} onClick={() => activeModuleIndex > 0 && setActiveModule(moduleItems[activeModuleIndex - 1])}>
              Previous
            </button>
            <button className="btn btn-primary" disabled={!activeModule || completingModule} onClick={handleCompleteAndNext}>
              {completingModule ? 'Saving...' : nextModule ? 'Complete & Next' : 'Finish Course'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

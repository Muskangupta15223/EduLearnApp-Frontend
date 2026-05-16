import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { assignmentAPI, courseAPI, discussionAPI, moduleAPI, quizAPI, youtubeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const TABS = ['Modules', 'Quizzes', 'Assignments', 'Discussion', 'Settings'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const emptyModuleForm = () => ({
  id: null,
  title: '',
  description: '',
  notes: '',
  videoUrl: '',
  duration: '',
  resources: [{ title: '', resourceType: 'LINK', resourceUrl: '' }],
  uploadFile: null,
  uploadTitle: '',
  uploadType: 'PDF',
  isPublished: true,
  isLocked: false,
});

const emptyQuizForm = () => ({
  id: null,
  title: '',
  description: '',
  passingScore: 70,
  timeLimitMinutes: '',
});

const emptyQuestionForm = () => ({
  id: null,
  questionText: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: 'A',
  points: 1,
  isPoll: false,
});

const emptyPollForm = () => ({
  id: null,
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  allowMultiple: false,
});

const emptyAssignmentForm = () => ({
  id: null,
  title: '',
  description: '',
  dueDate: '',
  maxScore: 100,
});

function Modal({ title, onClose, onSave, saveLabel = 'Save', disabled, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal modal-lg"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave} disabled={disabled}>{saveLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}

function FormGroup({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="form-label">{label}</label>
      {children}
      {hint && <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{hint}</div>}
    </div>
  );
}

function getStatusBadgeClass(status) {
  if (status === 'PUBLISHED') return 'badge-green';
  if (status === 'PENDING') return 'badge-orange';
  if (status === 'REJECTED') return 'badge-red';
  return 'badge-blue';
}

function getFeedbackBackground(status) {
  return status === 'REJECTED' ? 'rgba(255,59,48,0.08)' : 'rgba(10,132,255,0.08)';
}

function normalizeResourceLinks(resources) {
  return resources.filter(resource => resource.title?.trim() || resource.resourceUrl?.trim());
}

function getResourceIcon(type) {
  if (type === 'ARTICLE' || type === 'RICH_TEXT') return 'TXT';
  if (type === 'PDF') return 'PDF';
  if (type === 'DOC') return 'DOC';
  if (type === 'PPT') return 'PPT';
  if (type === 'SPREADSHEET') return 'XLS';
  if (type === 'ZIP') return 'ZIP';
  if (type === 'IMAGE') return 'IMG';
  if (type === 'LINK') return 'LINK';
  return 'FILE';
}

function extractYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
    /youtube\.com\/shorts\/([^?&#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function YoutubeEmbed({ videoUrl, title }) {
  const [playing, setPlaying] = React.useState(false);
  const videoId = extractYoutubeId(videoUrl);
  if (!videoId) {
    return (
      <div className="module-video-placeholder">
        <div className="module-video-no-url">No video linked</div>
      </div>
    );
  }
  if (playing) {
    return (
      <div className="module-video-frame">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title || 'Module video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    );
  }
  return (
    <div className="module-video-thumb" onClick={() => setPlaying(true)} title="Click to play">
      <img
        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
        alt={title || 'Video thumbnail'}
        className="module-video-thumb-img"
        loading="lazy"
      />
      <div className="module-video-play-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

function SubmissionsModal({ assignmentId, onClose }) {
  const toast = useToast();
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['assignment-submissions', assignmentId],
    queryFn: () => assignmentAPI.getSubmissions(assignmentId).then((r) => r.data),
  });

  const gradeMutation = useMutation({
    mutationFn: ({ subId, score, feedback }) => assignmentAPI.gradeSubmission(subId, { score, feedback }),
    onSuccess: () => toast.success('Graded successfully'),
    onError: () => toast.error('Failed to grade'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal modal-lg" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
        <div className="modal-header">
          <div className="modal-title">Student Submissions</div>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No submissions yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {submissions.map((sub) => (
                <div key={sub.id} style={{ padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <strong>Student #{sub.userId}</strong>
                    <span className={`badge ${sub.grade != null ? 'badge-green' : 'badge-orange'}`}>{sub.grade != null ? `Score: ${sub.grade}` : 'Ungraded'}</span>
                  </div>
                  {sub.submissionText && <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{sub.submissionText}</div>}
                  {sub.fileUrl && <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem' }}>View attachment</a>}
                  {sub.feedback && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>Feedback: {sub.feedback}</div>}
                  {sub.grade == null && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <input className="form-input" type="number" min="0" placeholder="Score" style={{ width: 100, padding: '6px 10px' }} id={`score-${sub.id}`} />
                      <input className="form-input" placeholder="Feedback (optional)" style={{ flex: 1, padding: '6px 10px' }} id={`feedback-${sub.id}`} />
                      <button className="btn btn-primary btn-sm" disabled={gradeMutation.isPending} onClick={() => {
                        const score = document.getElementById(`score-${sub.id}`)?.value;
                        const feedback = document.getElementById(`feedback-${sub.id}`)?.value;
                        if (!score) { toast.error('Enter a score'); return; }
                        gradeMutation.mutate({ subId: sub.id, score: Number(score), feedback });
                      }}>Grade</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ManageCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const thumbnailInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('Modules');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState(null);
  const [expandedQuizId, setExpandedQuizId] = useState(null);
  const [moduleForm, setModuleForm] = useState(emptyModuleForm());
  const [quizForm, setQuizForm] = useState(emptyQuizForm());
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm());
  const [pollForm, setPollForm] = useState(emptyPollForm());
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm());
  const [settingsForm, setSettingsForm] = useState(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubePreview, setYoutubePreview] = useState(null);
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [discussionForm, setDiscussionForm] = useState({ title: '', content: '' });
  const [replyText, setReplyText] = useState('');
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [quizViewMode, setQuizViewMode] = useState('quiz'); // 'quiz' | 'poll'
  const { user } = useAuth();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/instructor/courses', { replace: true });
  };

  const { data: course, isLoading, isError: isCourseError, error: courseError, refetch: refetchCourse } = useQuery({
    queryKey: ['course', id],
    queryFn: () => courseAPI.getById(id).then((response) => response.data),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: modules = [], isError: isModulesError, error: modulesError, refetch: refetchModules } = useQuery({
    queryKey: ['course-modules', id],
    queryFn: () => moduleAPI.getByCourse(id).then((response) => response.data),
    enabled: Boolean(course),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: quizzes = [], isError: isQuizzesError, error: quizzesError, refetch: refetchQuizzes } = useQuery({
    queryKey: ['course-quizzes', id],
    queryFn: () => quizAPI.getByCourse(id).then((response) => response.data),
    enabled: Boolean(course),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: assignments = [], isError: isAssignmentsError, error: assignmentsError, refetch: refetchAssignments } = useQuery({
    queryKey: ['course-assignments', id],
    queryFn: () => assignmentAPI.getByCourse(id).then((response) => response.data),
    enabled: Boolean(course),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: threads = [] } = useQuery({
    queryKey: ['course-discussions', id],
    queryFn: () => discussionAPI.getThreads(id).then((response) => response.data),
    enabled: Boolean(course),
  });

  useEffect(() => {
    if (!course) return;
    setSettingsForm((current) => current ?? {
      title: course.title ?? '',
      description: course.description ?? '',
      price: course.price ?? 0,
      level: course.level ?? LEVELS[0],
      category: course.category ?? '',
      language: course.language ?? '',
    });
  }, [course]);

  const saveModuleMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: moduleForm.title.trim(),
        description: moduleForm.description.trim(),
        notes: moduleForm.notes.trim(),
        videoUrl: moduleForm.videoUrl.trim(),
        duration: moduleForm.duration.trim(),
        isPublished: moduleForm.isPublished,
        isLocked: moduleForm.isLocked,
        resources: normalizeResourceLinks(moduleForm.resources).map((resource, index) => ({
          ...resource,
          displayOrder: index + 1,
        })),
      };

      const response = moduleForm.id
        ? await moduleAPI.update(moduleForm.id, payload)
        : await moduleAPI.create(id, payload);

      const moduleId = response.data.id;
      if (moduleForm.uploadFile) {
        const formData = new FormData();
        formData.append('file', moduleForm.uploadFile);
        if (moduleForm.uploadTitle.trim()) formData.append('title', moduleForm.uploadTitle.trim());
        if (moduleForm.uploadType) formData.append('resourceType', moduleForm.uploadType);
        await moduleAPI.uploadResource(moduleId, formData);
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', id] });
      toast.success(moduleForm.id ? 'Module updated' : 'Module added');
      setShowModuleModal(false);
      setModuleForm(emptyModuleForm());
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save module');
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId) => moduleAPI.delete(moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', id] });
      toast.success('Module removed');
    },
    onError: () => toast.error('Failed to remove module'),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds) => moduleAPI.reorder(id, orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', id] });
      toast.success('Module order updated');
    },
    onError: () => toast.error('Failed to reorder modules'),
  });

  const saveQuizMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: quizForm.title.trim(),
        description: quizForm.description.trim(),
        passingScore: Number(quizForm.passingScore) || 70,
        timeLimitMinutes: quizForm.timeLimitMinutes ? Number(quizForm.timeLimitMinutes) : null,
      };
      return quizForm.id ? quizAPI.update(quizForm.id, payload) : quizAPI.create(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-quizzes', id] });
      toast.success(quizForm.id ? 'Quiz updated' : 'Quiz created');
      setShowQuizModal(false);
      setQuizForm(emptyQuizForm());
    },
    onError: () => toast.error('Failed to save quiz'),
  });

  const deleteQuizMutation = useMutation({
    mutationFn: (quizId) => quizAPI.delete(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-quizzes', id] });
      toast.success('Quiz deleted');
    },
    onError: () => toast.error('Failed to delete quiz'),
  });

  const saveAssignmentMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim(),
        dueDate: assignmentForm.dueDate || null,
        maxScore: Number(assignmentForm.maxScore) || 100,
      };
      return assignmentForm.id ? assignmentAPI.update(assignmentForm.id, payload) : assignmentAPI.create(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-assignments', id] });
      toast.success(assignmentForm.id ? 'Assignment updated' : 'Assignment created');
      setShowAssignmentModal(false);
      setAssignmentForm(emptyAssignmentForm());
    },
    onError: () => toast.error('Failed to save assignment'),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId) => assignmentAPI.delete(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-assignments', id] });
      toast.success('Assignment deleted');
    },
    onError: () => toast.error('Failed to delete assignment'),
  });

  const publishCourseMutation = useMutation({
    mutationFn: () => courseAPI.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] });
      toast.success(course?.status === 'REJECTED' ? 'Course sent again for approval.' : 'Course sent for approval.');
    },
    onError: () => toast.error('Failed to submit course for review'),
  });

  const unpublishCourseMutation = useMutation({
    mutationFn: () => courseAPI.unpublish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] });
      toast.success('Course moved back to draft.');
    },
    onError: () => toast.error('Failed to unpublish course'),
  });

  const updateCourseMutation = useMutation({
    mutationFn: (data) => courseAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] });
      toast.success('Course updated');
    },
    onError: () => toast.error('Failed to update course'),
  });

  const saveQuestionMutation = useMutation({
    mutationFn: () => {
      const payload = {
        questionText: questionForm.questionText.trim(),
        optionA: questionForm.optionA.trim(),
        optionB: questionForm.optionB.trim(),
        optionC: questionForm.optionC.trim(),
        optionD: questionForm.optionD.trim(),
        correctAnswer: questionForm.correctAnswer,
        points: Number(questionForm.points) || 1,
      };
      return questionForm.id ? quizAPI.updateQuestion(questionForm.id, payload) : quizAPI.addQuestion(activeQuizId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-quizzes', id] });
      toast.success(questionForm.id ? 'Question updated' : 'Question added');
      setShowQuestionModal(false);
      setQuestionForm(emptyQuestionForm());
    },
    onError: () => toast.error('Failed to save question'),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId) => quizAPI.deleteQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-quizzes', id] });
      toast.success('Question deleted');
    },
    onError: () => toast.error('Failed to delete question'),
  });

  const createThreadMutation = useMutation({
    mutationFn: () => discussionAPI.createThread(id, { ...discussionForm, userName: user?.name || user?.fullName || 'Instructor' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-discussions', id] });
      toast.success('Discussion started');
      setShowDiscussionModal(false);
      setDiscussionForm({ title: '', content: '' });
    },
    onError: () => toast.error('Failed to create discussion'),
  });

  const addReplyMutation = useMutation({
    mutationFn: ({ threadId, content }) => discussionAPI.addReply(id, threadId, { content, userName: user?.name || user?.fullName || 'Instructor' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-discussions', id] });
      toast.success('Reply posted');
      setReplyText('');
    },
    onError: () => toast.error('Failed to post reply'),
  });

  const openModuleEditor = (module = null) => {
    setYoutubePreview(null);
    if (!module) {
      setModuleForm(emptyModuleForm());
      setShowModuleModal(true);
      return;
    }

    setModuleForm({
      id: module.id,
      title: module.title || '',
      description: module.description || '',
      notes: module.notes || '',
      videoUrl: module.videoUrl || '',
      duration: module.duration || '',
      resources: (module.resources?.length ? module.resources : [{ title: '', resourceType: 'LINK', resourceUrl: '' }]).map((resource) => ({
        id: resource.id,
        title: resource.title || '',
        resourceType: resource.resourceType || 'LINK',
        resourceUrl: resource.resourceUrl || '',
      })),
      uploadFile: null,
      uploadTitle: '',
      uploadType: 'PDF',
      isPublished: module.isPublished !== false,
      isLocked: module.isLocked === true,
    });
    setShowModuleModal(true);
  };

  const openQuizEditor = (quiz = null) => {
    if (!quiz) {
      setQuizForm(emptyQuizForm());
      setShowQuizModal(true);
      return;
    }

    setQuizForm({
      id: quiz.id,
      title: quiz.title || '',
      description: quiz.description || '',
      passingScore: quiz.passingScore || 70,
      timeLimitMinutes: quiz.timeLimitMinutes || '',
    });
    setShowQuizModal(true);
  };

  const openQuestionEditor = (quizId, question = null) => {
    setActiveQuizId(quizId);
    if (!question) {
      setQuestionForm(emptyQuestionForm());
      setShowQuestionModal(true);
      return;
    }

    setQuestionForm({
      id: question.id,
      questionText: question.questionText || '',
      optionA: question.optionA || '',
      optionB: question.optionB || '',
      optionC: question.optionC || '',
      optionD: question.optionD || '',
      correctAnswer: question.correctAnswer || 'A',
      points: question.points || 1,
    });
    setShowQuestionModal(true);
  };

  const openAssignmentEditor = (assignment = null) => {
    if (!assignment) {
      setAssignmentForm(emptyAssignmentForm());
      setShowAssignmentModal(true);
      return;
    }

    setAssignmentForm({
      id: assignment.id,
      title: assignment.title || '',
      description: assignment.description || '',
      dueDate: assignment.dueDate || '',
      maxScore: assignment.maxScore || 100,
    });
    setShowAssignmentModal(true);
  };

  const fetchYoutubeMetadata = async () => {
    if (!moduleForm.videoUrl.trim()) {
      toast.error('Paste a YouTube URL first.');
      return;
    }
    setYoutubeLoading(true);
    try {
      const response = await youtubeAPI.getMetadata(moduleForm.videoUrl.trim());
      const metadata = response.data;
      setYoutubePreview(metadata);
      setModuleForm((current) => ({
        ...current,
        title: current.title || metadata.title || '',
        description: current.description || metadata.seoSummary || '',
        notes: current.notes || metadata.description || metadata.seoSummary || '',
        uploadTitle: current.uploadTitle || metadata.title || '',
      }));
      toast.success('YouTube metadata loaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not fetch YouTube metadata');
    } finally {
      setYoutubeLoading(false);
    }
  };

  const contentErrors = [
    isModulesError ? modulesError?.response?.data?.message || modulesError?.message || 'Failed to load modules.' : null,
    isQuizzesError ? quizzesError?.response?.data?.message || quizzesError?.message || 'Failed to load quizzes.' : null,
    isAssignmentsError ? assignmentsError?.response?.data?.message || assignmentsError?.message || 'Failed to load assignments.' : null,
  ].filter(Boolean);

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="glass-card" style={{ padding: 32, minHeight: 300, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 18px' }} />
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Loading course builder...</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
              Fetching course details before showing the module, quiz, and assignment editor.
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isCourseError) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="glass-card" style={{ padding: 28, maxWidth: 860 }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 10 }}>This course editor could not be opened</div>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 18 }}>
            {courseError?.response?.data?.message || courseError?.message || 'The course details request failed, so the builder UI could not finish rendering.'}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => refetchCourse()}>Retry</button>
            <button className="btn btn-secondary" onClick={handleBack}>Back</button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!course) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Course not found</div>;
  }

  const canSubmitForReview = course.status !== 'PUBLISHED' && course.status !== 'PENDING';
  const submitLabel = course.status === 'REJECTED' ? 'Send For Approval Again' : 'Send For Approval';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={handleBack} style={{ marginBottom: 12 }}>
            Back
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 8 }}>{course.title}</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`badge ${getStatusBadgeClass(course.status)}`}>{course.status || 'DRAFT'}</span>
            {course.reviewStatus === 'APPROVED' && <span className="badge badge-green">Verified</span>}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {course.level || 'All levels'} {course.language ? `| ${course.language}` : ''} | {modules.length} module{modules.length !== 1 ? 's' : ''}
            </span>
          </div>
          {course.reviewComment && (
            <div
              style={{
                marginTop: 16,
                maxWidth: 720,
                padding: 14,
                borderRadius: 'var(--radius-md)',
                background: getFeedbackBackground(course.status),
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
              }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>Review feedback:</strong> {course.reviewComment}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {canSubmitForReview && (
            <button className="btn btn-primary" disabled={publishCourseMutation.isPending || modules.length === 0} onClick={() => publishCourseMutation.mutate()}>
              {publishCourseMutation.isPending ? 'Submitting...' : submitLabel}
            </button>
          )}
          {course.status === 'PUBLISHED' && (
            <button className="btn btn-secondary" disabled={unpublishCourseMutation.isPending} onClick={() => unpublishCourseMutation.mutate()}>
              {unpublishCourseMutation.isPending ? 'Unpublishing...' : 'Unpublish'}
            </button>
          )}
        </div>
      </div>

      {contentErrors.length > 0 && (
        <div className="glass-card" style={{ padding: 18, marginBottom: 24, border: '1px solid rgba(255,159,10,0.35)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Some builder sections failed to load</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 12 }}>
            {contentErrors.join(' ')}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => refetchModules()}>Reload Modules</button>
            <button className="btn btn-secondary btn-sm" onClick={() => refetchQuizzes()}>Reload Quizzes</button>
            <button className="btn btn-secondary btn-sm" onClick={() => refetchAssignments()}>Reload Assignments</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border-subtle)', marginBottom: 28, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 22px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 500,
              fontSize: '0.9rem',
              color: activeTab === tab ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--brand-primary)' : 'transparent'}`,
              marginBottom: -2,
              transition: 'var(--transition)',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Modules' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: 4 }}>Course Modules</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Build the course as modules with one video, rich notes, links, and downloadable files in each section.
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => openModuleEditor()}>+ Add Module</button>
          </div>

          {modules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📦</div>
              <p>Add your first module to start shaping the student experience.</p>
            </div>
          ) : (
            <div className="module-cards-grid">
              {modules.map((module, moduleIndex) => (
                <div key={module.id} className="module-card">
                  {/* Video Preview */}
                  <YoutubeEmbed videoUrl={module.videoUrl} title={module.title} />

                  {/* Card Body */}
                  <div className="module-card-body">
                    <div className="module-card-index">Module {moduleIndex + 1}</div>
                    <div className="module-card-title">{module.title}</div>
                    {module.description && (
                      <div className="module-card-desc">{module.description}</div>
                    )}

                    {/* Badges */}
                    <div className="module-card-badges">
                      {module.duration && <span className="badge badge-orange">{module.duration}</span>}
                      {(module.resources || []).length > 0 && <span className="badge badge-purple">{module.resources.length} resource{module.resources.length !== 1 ? 's' : ''}</span>}
                      {module.notes && <span className="badge badge-green">Notes</span>}
                      {module.isLocked && <span className="badge badge-orange">🔒 Locked</span>}
                      {module.isPublished === false && <span className="badge badge-red">Hidden</span>}
                    </div>

                    {/* Resources mini-list */}
                    {(module.resources || []).length > 0 && (
                      <div className="module-card-resources">
                        {module.resources.slice(0, 3).map((resource) => (
                          <div key={resource.id || resource.resourceUrl} className="module-resource-chip">
                            <span className="module-resource-type">{getResourceIcon(resource.resourceType)}</span>
                            <span className="module-resource-title">{resource.title || 'Resource'}</span>
                          </div>
                        ))}
                        {module.resources.length > 3 && (
                          <div className="module-resource-chip" style={{ color: 'var(--text-muted)' }}>+{module.resources.length - 3} more</div>
                        )}
                      </div>
                    )}

                    {/* Notes preview */}
                    {module.notes && (
                      <div className="module-card-notes">
                        {module.notes.slice(0, 100)}{module.notes.length > 100 ? '...' : ''}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="module-card-footer">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={moduleIndex === 0 || reorderMutation.isPending}
                        onClick={() => { const ids = modules.map((m) => m.id); [ids[moduleIndex - 1], ids[moduleIndex]] = [ids[moduleIndex], ids[moduleIndex - 1]]; reorderMutation.mutate(ids); }}
                        title="Move up"
                      >↑</button>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={moduleIndex === modules.length - 1 || reorderMutation.isPending}
                        onClick={() => { const ids = modules.map((m) => m.id); [ids[moduleIndex], ids[moduleIndex + 1]] = [ids[moduleIndex + 1], ids[moduleIndex]]; reorderMutation.mutate(ids); }}
                        title="Move down"
                      >↓</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openModuleEditor(module)}>Edit</button>
                      <button
                        className="btn btn-secondary btn-sm danger-action"
                        disabled={deleteModuleMutation.isPending}
                        onClick={() => { if (window.confirm(`Delete module "${module.title}"?`)) deleteModuleMutation.mutate(module.id); }}
                      >Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Quizzes' && (
        <div className="quizzes-section">
          {/* Header with Quiz/Poll toggle */}
          <div className="quizzes-section-header">
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: 4 }}>Quizzes &amp; Polls</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Create scored quizzes to assess students, or polls to gather anonymous opinions.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Quiz / Poll toggle */}
              <div className="quiz-poll-toggle">
                <button
                  className={`quiz-poll-tab ${quizViewMode === 'quiz' ? 'active' : ''}`}
                  onClick={() => setQuizViewMode('quiz')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Quizzes
                </button>
                <button
                  className={`quiz-poll-tab ${quizViewMode === 'poll' ? 'active' : ''}`}
                  onClick={() => setQuizViewMode('poll')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  Polls
                </button>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => quizViewMode === 'poll' ? setShowPollModal(true) : openQuizEditor()}
              >
                + {quizViewMode === 'poll' ? 'Create Poll' : 'Create Quiz'}
              </button>
            </div>
          </div>

          {quizViewMode === 'quiz' ? (
            <>
              {quizzes.length === 0 ? (
                <div className="quiz-empty-state">
                  <div className="quiz-empty-icon">📝</div>
                  <h4>No quizzes yet</h4>
                  <p>Create a quiz with multiple-choice questions to assess your students' understanding.</p>
                  <button className="btn btn-primary" onClick={() => openQuizEditor()}>+ Create First Quiz</button>
                </div>
              ) : (
                <div className="quiz-list">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="quiz-card">
                      {/* Quiz header */}
                      <div className="quiz-card-header">
                        <div className="quiz-card-meta">
                          <div className="quiz-card-title">{quiz.title}</div>
                          {quiz.description && <div className="quiz-card-desc">{quiz.description}</div>}
                          <div className="quiz-card-badges">
                            <span className="badge badge-blue">Pass: {quiz.passingScore || 70}%</span>
                            <span className="badge badge-purple">{(quiz.questions || []).length} Q</span>
                            {quiz.timeLimitMinutes && <span className="badge badge-orange">{quiz.timeLimitMinutes} min</span>}
                          </div>
                        </div>
                        <div className="quiz-card-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => openQuizEditor(quiz)}>Edit</button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { setActiveQuizId(quiz.id); setQuestionForm(emptyQuestionForm()); setShowQuestionModal(true); }}
                          >+ Add Question</button>
                          <button
                            className="btn btn-secondary btn-sm danger-action"
                            disabled={deleteQuizMutation.isPending}
                            onClick={() => { if (window.confirm(`Delete quiz "${quiz.title}"?`)) deleteQuizMutation.mutate(quiz.id); }}
                          >Delete</button>
                        </div>
                      </div>

                      {/* Questions list */}
                      {(quiz.questions || []).length > 0 && (
                        <div className="quiz-questions-list">
                          <div
                            className="quiz-expand-toggle"
                            onClick={() => setExpandedQuizId(expandedQuizId === quiz.id ? null : quiz.id)}
                          >
                            <span>{expandedQuizId === quiz.id ? '▲ Hide' : '▼ Show'} {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}</span>
                          </div>
                          {expandedQuizId === quiz.id && (
                            <div className="quiz-questions-expanded">
                              {quiz.questions.map((q, qi) => (
                                <div key={q.id} className="quiz-question-item">
                                  <div className="quiz-q-header">
                                    <span className="quiz-q-num">Q{qi + 1}</span>
                                    <span className="quiz-q-text">{q.questionText}</span>
                                    <span className="quiz-q-pts">{q.points || 1} pt{(q.points || 1) !== 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="quiz-q-options">
                                    {['A', 'B', 'C', 'D'].map((opt) => (
                                      <div
                                        key={opt}
                                        className={`quiz-q-opt ${q.correctAnswer === opt ? 'correct' : ''}`}
                                      >
                                        <span className="quiz-q-opt-letter">{opt}</span>
                                        <span>{q[`option${opt}`] || <em style={{ opacity: 0.4 }}>empty</em>}</span>
                                        {q.correctAnswer === opt && <span className="quiz-q-correct-badge">✓ correct</span>}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="quiz-q-actions">
                                    <button className="btn btn-secondary btn-sm" onClick={() => openQuestionEditor(quiz.id, q)}>Edit</button>
                                    <button
                                      className="btn btn-secondary btn-sm danger-action"
                                      disabled={deleteQuestionMutation.isPending}
                                      onClick={() => { if (window.confirm('Delete this question?')) deleteQuestionMutation.mutate(q.id); }}
                                    >Delete</button>
                                  </div>
                                </div>
                              ))}
                              {/* Inline add question */}
                              <button
                                className="quiz-add-question-inline"
                                onClick={() => { setActiveQuizId(quiz.id); setQuestionForm(emptyQuestionForm()); setShowQuestionModal(true); }}
                              >
                                + Add another question
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Poll section */
            <div className="quiz-empty-state">
              <div className="quiz-empty-icon">📊</div>
              <h4>Polls coming soon</h4>
              <p>Use polls to gather quick opinions from your students without a graded score. This section stores polls locally for preview.</p>
              <button className="btn btn-primary" onClick={() => setShowPollModal(true)}>+ Create First Poll</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Assignments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700 }}>Assignments</h3>
            <button className="btn btn-primary btn-sm" onClick={() => openAssignmentEditor()}>+ Create Assignment</button>
          </div>

          {assignments.length === 0 ? (
            <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>Task</div>
              <p>No assignments yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {assignments.map((assignment) => (
                <div key={assignment.id} className="glass-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{assignment.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 8 }}>{assignment.description}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className="badge badge-orange">
                        Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No deadline'}
                      </span>
                      <span className="badge badge-blue">Max: {assignment.maxScore} pts</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openAssignmentEditor(assignment)}>Edit</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setActiveAssignmentId(assignment.id); setShowSubmissionsModal(true); }}>View Submissions</button>
                    <button className="btn btn-secondary btn-sm danger-action" disabled={deleteAssignmentMutation.isPending} onClick={() => { if (window.confirm(`Delete "${assignment.title}"?`)) deleteAssignmentMutation.mutate(assignment.id); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Discussion' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700 }}>Course Discussions</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowDiscussionModal(true)}>+ New Thread</button>
          </div>

          {threads.length === 0 ? (
            <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>💬</div>
              <p>No discussions yet. Start a conversation with your students.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {threads.map((thread) => (
                <div key={thread.id} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>{thread.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 8 }}>{thread.content}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge badge-blue">{thread.userName || 'Student'}</span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {thread.createdAt ? new Date(thread.createdAt).toLocaleDateString() : ''}
                        </span>
                        {thread.isPinned && <span className="badge badge-orange">Pinned</span>}
                        {thread.isClosed && <span className="badge badge-red">Closed</span>}
                        <span className="badge badge-purple">{(thread.replies || []).length} replies</span>
                      </div>
                    </div>
                  </div>

                  {(thread.replies || []).length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 8 }}>
                      {thread.replies.slice(0, activeThreadId === thread.id ? undefined : 2).map((reply) => (
                        <div key={reply.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand-primary)', flexShrink: 0 }}>
                            {(reply.userName || 'S')[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 2 }}>{reply.userName || 'Student'}</div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{reply.content}</div>
                          </div>
                        </div>
                      ))}
                      {(thread.replies || []).length > 2 && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: 8, fontSize: '0.8125rem' }}
                          onClick={() => setActiveThreadId(activeThreadId === thread.id ? null : thread.id)}
                        >
                          {activeThreadId === thread.id ? 'Show less' : `Show all ${thread.replies.length} replies`}
                        </button>
                      )}
                    </div>
                  )}

                  {!thread.isClosed && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <input
                        className="form-input"
                        style={{ flex: 1, padding: '8px 14px', fontSize: '0.88rem' }}
                        placeholder="Write a reply..."
                        value={activeThreadId === thread.id ? replyText : ''}
                        onFocus={() => setActiveThreadId(thread.id)}
                        onChange={(event) => { setActiveThreadId(thread.id); setReplyText(event.target.value); }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!replyText.trim() || addReplyMutation.isPending}
                        onClick={() => addReplyMutation.mutate({ threadId: thread.id, content: replyText })}
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Settings' && settingsForm && (
        <div className="glass-card" style={{ padding: 28, maxWidth: 720 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 24 }}>Course Settings</h3>

          <FormGroup label="Course Title">
            <input className="form-input" value={settingsForm.title} onChange={(event) => setSettingsForm((current) => ({ ...current, title: event.target.value }))} />
          </FormGroup>

          <FormGroup label="Description">
            <textarea className="form-input" rows={4} value={settingsForm.description || ''} onChange={(event) => setSettingsForm((current) => ({ ...current, description: event.target.value }))} />
          </FormGroup>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormGroup label="Level">
              <select className="form-input form-select" value={settingsForm.level || ''} onChange={(event) => setSettingsForm((current) => ({ ...current, level: event.target.value }))}>
                {LEVELS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </FormGroup>

            <FormGroup label="Category">
              <input className="form-input" placeholder="Web Development" value={settingsForm.category || ''} onChange={(event) => setSettingsForm((current) => ({ ...current, category: event.target.value }))} />
            </FormGroup>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormGroup label="Language">
              <input className="form-input" placeholder="English" value={settingsForm.language || ''} onChange={(event) => setSettingsForm((current) => ({ ...current, language: event.target.value }))} />
            </FormGroup>
            <div />
          </div>

          <FormGroup label="Price (Rs.)" hint="Set to 0 for a free course.">
            <input className="form-input" type="number" min="0" value={settingsForm.price || 0} onChange={(event) => setSettingsForm((current) => ({ ...current, price: Number(event.target.value) }))} />
          </FormGroup>

          <FormGroup label="Course Thumbnail">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {course.thumbnail ? (
                <img src={course.thumbnail} alt="Thumbnail" style={{ width: 180, height: 102, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }} />
              ) : (
                <div style={{ width: 180, height: 102, borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border-subtle)' }}>
                  No thumbnail
                </div>
              )}

              <div>
                <button className="btn btn-secondary btn-sm" disabled={thumbnailUploading} onClick={() => thumbnailInputRef.current?.click()}>
                  {thumbnailUploading ? 'Uploading...' : 'Upload Thumbnail'}
                </button>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;

                    setThumbnailUploading(true);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      await courseAPI.uploadThumbnail(id, formData);
                      queryClient.invalidateQueries({ queryKey: ['course', id] });
                      toast.success('Thumbnail uploaded');
                    } catch (error) {
                      toast.error(error.response?.data?.message || 'Failed to upload thumbnail');
                    } finally {
                      setThumbnailUploading(false);
                      event.target.value = '';
                    }
                  }}
                />
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 6 }}>Recommended: 1280x720 in 16:9.</p>
              </div>
            </div>
          </FormGroup>

          <button className="btn btn-primary" disabled={updateCourseMutation.isPending} onClick={() => updateCourseMutation.mutate(settingsForm)}>
            {updateCourseMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {showModuleModal && (
          <Modal
            title={moduleForm.id ? 'Edit Module' : 'Add Module'}
            onClose={() => {
              setShowModuleModal(false);
              setModuleForm(emptyModuleForm());
              setYoutubePreview(null);
            }}
            onSave={() => saveModuleMutation.mutate()}
            disabled={!moduleForm.title.trim() || saveModuleMutation.isPending}
            saveLabel={saveModuleMutation.isPending ? 'Saving...' : moduleForm.id ? 'Update Module' : 'Save Module'}
          >
            <FormGroup label="Module Title *">
              <input className="form-input" value={moduleForm.title} onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))} placeholder="Module title" />
            </FormGroup>

            <FormGroup label="Short Overview" hint="This appears in the curriculum card and helps students scan the module quickly.">
              <textarea className="form-input" rows={3} value={moduleForm.description} onChange={(event) => setModuleForm((current) => ({ ...current, description: event.target.value }))} />
            </FormGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 16 }}>
              <FormGroup label="Video URL" hint="YouTube and Vimeo links are supported.">
                <input className="form-input" placeholder="https://youtube.com/watch?v=..." value={moduleForm.videoUrl} onChange={(event) => setModuleForm((current) => ({ ...current, videoUrl: event.target.value }))} />
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} disabled={youtubeLoading || !moduleForm.videoUrl.trim()} onClick={fetchYoutubeMetadata}>
                  {youtubeLoading ? 'Fetching...' : 'Fetch YouTube Metadata'}
                </button>
              </FormGroup>

              <FormGroup label="Duration">
                <input className="form-input" placeholder="18 mins" value={moduleForm.duration} onChange={(event) => setModuleForm((current) => ({ ...current, duration: event.target.value }))} />
              </FormGroup>
            </div>

            {youtubePreview && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 16, background: 'var(--bg-surface)' }}>
                {youtubePreview.thumbnailUrl && (
                  <img src={youtubePreview.thumbnailUrl} alt="" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 8 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{youtubePreview.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{youtubePreview.channelName || 'YouTube'} {youtubePreview.duration ? `| ${youtubePreview.duration}` : ''}</div>
                  {youtubePreview.tags?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {youtubePreview.tags.slice(0, 6).map((tag) => <span key={tag} className="badge badge-blue">{tag}</span>)}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <input type="checkbox" checked={moduleForm.isPublished} onChange={(event) => setModuleForm((current) => ({ ...current, isPublished: event.target.checked }))} />
                <span className="form-label" style={{ margin: 0 }}>Published in player</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <input type="checkbox" checked={moduleForm.isLocked} onChange={(event) => setModuleForm((current) => ({ ...current, isLocked: event.target.checked }))} />
                <span className="form-label" style={{ margin: 0 }}>Locked until released</span>
              </label>
            </div>

            <FormGroup label="Rich Description and Notes" hint="Use bullets, timestamps, links, key takeaways, or formatted study notes in plain text.">
              <textarea className="form-input" rows={8} value={moduleForm.notes} onChange={(event) => setModuleForm((current) => ({ ...current, notes: event.target.value }))} placeholder={'00:00 Introduction\n- What students will learn\n- Tools needed\n#basics'} />
            </FormGroup>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label className="form-label" style={{ margin: 0 }}>External references</label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setModuleForm((current) => ({
                    ...current,
                    resources: [...current.resources, { title: '', resourceType: 'LINK', resourceUrl: '' }],
                  }))}
                >
                  + Add Link
                </button>
              </div>

              {moduleForm.resources.map((resource, index) => (
                <div key={resource.id || index} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 36px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                  <select
                    className="form-input form-select"
                    value={resource.resourceType}
                    onChange={(event) => {
                      const updated = [...moduleForm.resources];
                      updated[index] = { ...updated[index], resourceType: event.target.value };
                      setModuleForm((current) => ({ ...current, resources: updated }));
                    }}
                  >
                    <option value="LINK">Link</option>
                    <option value="ARTICLE">Article</option>
                    <option value="PDF">PDF</option>
                    <option value="DOC">DOC</option>
                    <option value="PPT">PPT</option>
                    <option value="SPREADSHEET">Sheet</option>
                    <option value="IMAGE">Image</option>
                    <option value="ZIP">ZIP</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <input
                    className="form-input"
                    placeholder="Title"
                    value={resource.title}
                    onChange={(event) => {
                      const updated = [...moduleForm.resources];
                      updated[index] = { ...updated[index], title: event.target.value };
                      setModuleForm((current) => ({ ...current, resources: updated }));
                    }}
                  />
                  <input
                    className="form-input"
                    placeholder="https://..."
                    value={resource.resourceUrl}
                    onChange={(event) => {
                      const updated = [...moduleForm.resources];
                      updated[index] = { ...updated[index], resourceUrl: event.target.value };
                      setModuleForm((current) => ({ ...current, resources: updated }));
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setModuleForm((current) => ({
                      ...current,
                      resources: current.resources.filter((_, resourceIndex) => resourceIndex !== index),
                    }))}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 16 }}>
              <label className="form-label">Upload file resource</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, marginBottom: 10 }}>
                <input className="form-input" placeholder="Display title for the file" value={moduleForm.uploadTitle} onChange={(event) => setModuleForm((current) => ({ ...current, uploadTitle: event.target.value }))} />
                <select className="form-input form-select" value={moduleForm.uploadType} onChange={(event) => setModuleForm((current) => ({ ...current, uploadType: event.target.value }))}>
                  <option value="ARTICLE">ARTICLE</option>
                  <option value="PDF">PDF</option>
                  <option value="DOC">DOC</option>
                  <option value="PPT">PPT</option>
                  <option value="SPREADSHEET">SPREADSHEET</option>
                  <option value="ZIP">ZIP</option>
                  <option value="IMAGE">IMAGE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <input type="file" className="form-input" accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.ppt,.pptx,.xls,.xlsx" onChange={(event) => setModuleForm((current) => ({ ...current, uploadFile: event.target.files?.[0] || null }))} />
              {moduleForm.uploadFile && (
                <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Selected: {moduleForm.uploadFile.name}
                </div>
              )}
            </div>
          </Modal>
        )}

        {showQuizModal && (
          <Modal
            title={quizForm.id ? 'Edit Quiz' : 'Create Quiz'}
            onClose={() => { setShowQuizModal(false); setQuizForm(emptyQuizForm()); }}
            onSave={() => saveQuizMutation.mutate()}
            disabled={!quizForm.title.trim() || saveQuizMutation.isPending}
            saveLabel={saveQuizMutation.isPending ? 'Saving...' : quizForm.id ? 'Update Quiz' : 'Save Quiz'}
          >
            <FormGroup label="Quiz Title *">
              <input className="form-input" value={quizForm.title} onChange={(event) => setQuizForm((current) => ({ ...current, title: event.target.value }))} />
            </FormGroup>
            <FormGroup label="Description">
              <textarea className="form-input" rows={4} value={quizForm.description} onChange={(event) => setQuizForm((current) => ({ ...current, description: event.target.value }))} />
            </FormGroup>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup label="Passing Score (%)">
                <input className="form-input" type="number" min="0" max="100" value={quizForm.passingScore} onChange={(event) => setQuizForm((current) => ({ ...current, passingScore: Number(event.target.value) }))} />
              </FormGroup>
              <FormGroup label="Time Limit (minutes)" hint="Leave empty for no limit.">
                <input className="form-input" type="number" min="1" placeholder="No limit" value={quizForm.timeLimitMinutes} onChange={(event) => setQuizForm((current) => ({ ...current, timeLimitMinutes: event.target.value }))} />
              </FormGroup>
            </div>
          </Modal>
        )}

        {showQuestionModal && (
          <Modal
            title={questionForm.id ? 'Edit Question' : 'Add Question'}
            onClose={() => { setShowQuestionModal(false); setQuestionForm(emptyQuestionForm()); }}
            onSave={() => saveQuestionMutation.mutate()}
            disabled={!questionForm.questionText.trim() || saveQuestionMutation.isPending}
            saveLabel={saveQuestionMutation.isPending ? 'Saving...' : questionForm.id ? 'Update Question' : 'Save Question'}
          >
            <FormGroup label="Question Text *">
              <textarea className="form-input" rows={3} value={questionForm.questionText} onChange={(event) => setQuestionForm((current) => ({ ...current, questionText: event.target.value }))} placeholder="e.g. What is the capital of France?" />
            </FormGroup>

            {/* Options */}
            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ marginBottom: 12 }}>Answer Options</label>
              <div className="quiz-options-grid">
                {['A', 'B', 'C', 'D'].map((option) => {
                  const isCorrect = questionForm.correctAnswer === option;
                  return (
                    <div
                      key={option}
                      className={`quiz-option-row ${isCorrect ? 'quiz-option-correct' : ''}`}
                      onClick={() => setQuestionForm((current) => ({ ...current, correctAnswer: option }))}
                    >
                      <div className={`quiz-option-letter ${isCorrect ? 'quiz-option-letter-correct' : ''}`}>
                        {isCorrect ? '✓' : option}
                      </div>
                      <input
                        className="quiz-option-input"
                        placeholder={`Option ${option}`}
                        value={questionForm[`option${option}`]}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(event) => setQuestionForm((current) => ({ ...current, [`option${option}`]: event.target.value }))}
                      />
                      <div className="quiz-option-check-hint">
                        {isCorrect ? 'Correct' : 'Click to mark correct'}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                💡 Click on an option row to set it as the correct answer.
              </div>
            </div>

            <FormGroup label="Points per Question">
              <input
                className="form-input"
                type="number"
                min="1"
                value={questionForm.points}
                onChange={(event) => setQuestionForm((current) => ({ ...current, points: Number(event.target.value) }))}
              />
            </FormGroup>
          </Modal>
        )}

        {showPollModal && (
          <Modal
            title={pollForm.id ? 'Edit Poll' : 'Create Poll'}
            onClose={() => { setShowPollModal(false); setPollForm(emptyPollForm()); }}
            onSave={() => { toast.success('Poll saved (preview only — connect to backend to persist)'); setShowPollModal(false); setPollForm(emptyPollForm()); }}
            disabled={!pollForm.question.trim()}
            saveLabel="Save Poll"
          >
            <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              📊 <strong>Poll:</strong> No correct answer — students just pick their preferred option. Results are aggregated anonymously.
            </div>
            <FormGroup label="Poll Question *">
              <textarea className="form-input" rows={2} value={pollForm.question} onChange={(e) => setPollForm((c) => ({ ...c, question: e.target.value }))} placeholder="e.g. Which topic would you like covered next?" />
            </FormGroup>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ marginBottom: 10 }}>Poll Options</label>
              <div className="quiz-options-grid">
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <div key={opt} className="quiz-option-row" style={{ cursor: 'default' }}>
                    <div className="quiz-option-letter" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{opt}</div>
                    <input
                      className="quiz-option-input"
                      placeholder={`Option ${opt}`}
                      value={pollForm[`option${opt}`]}
                      onChange={(e) => setPollForm((c) => ({ ...c, [`option${opt}`]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 4 }}>
              <input type="checkbox" checked={pollForm.allowMultiple} onChange={(e) => setPollForm((c) => ({ ...c, allowMultiple: e.target.checked }))} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Allow multiple selections</span>
            </label>
          </Modal>
        )}

        {showAssignmentModal && (
          <Modal
            title={assignmentForm.id ? 'Edit Assignment' : 'Create Assignment'}
            onClose={() => { setShowAssignmentModal(false); setAssignmentForm(emptyAssignmentForm()); }}
            onSave={() => saveAssignmentMutation.mutate()}
            disabled={!assignmentForm.title.trim() || saveAssignmentMutation.isPending}
            saveLabel={saveAssignmentMutation.isPending ? 'Saving...' : assignmentForm.id ? 'Update Assignment' : 'Save Assignment'}
          >
            <FormGroup label="Assignment Title *">
              <input className="form-input" value={assignmentForm.title} onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))} />
            </FormGroup>
            <FormGroup label="Description">
              <textarea className="form-input" rows={4} value={assignmentForm.description} onChange={(event) => setAssignmentForm((current) => ({ ...current, description: event.target.value }))} />
            </FormGroup>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup label="Due Date">
                <input className="form-input" type="date" value={assignmentForm.dueDate} onChange={(event) => setAssignmentForm((current) => ({ ...current, dueDate: event.target.value }))} />
              </FormGroup>
              <FormGroup label="Max Score">
                <input className="form-input" type="number" min="1" value={assignmentForm.maxScore} onChange={(event) => setAssignmentForm((current) => ({ ...current, maxScore: Number(event.target.value) }))} />
              </FormGroup>
            </div>
          </Modal>
        )}

        {showDiscussionModal && (
          <Modal title="Start Discussion" onClose={() => setShowDiscussionModal(false)} onSave={() => createThreadMutation.mutate()} disabled={!discussionForm.title.trim() || !discussionForm.content.trim() || createThreadMutation.isPending} saveLabel={createThreadMutation.isPending ? 'Posting...' : 'Post Thread'}>
            <FormGroup label="Topic Title *">
              <input className="form-input" value={discussionForm.title} onChange={(event) => setDiscussionForm((current) => ({ ...current, title: event.target.value }))} placeholder="What would you like to discuss?" />
            </FormGroup>
            <FormGroup label="Description *">
              <textarea className="form-input" rows={5} value={discussionForm.content} onChange={(event) => setDiscussionForm((current) => ({ ...current, content: event.target.value }))} placeholder="Provide context or ask a question..." />
            </FormGroup>
          </Modal>
        )}

        {showSubmissionsModal && activeAssignmentId && (
          <SubmissionsModal
            assignmentId={activeAssignmentId}
            onClose={() => { setShowSubmissionsModal(false); setActiveAssignmentId(null); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

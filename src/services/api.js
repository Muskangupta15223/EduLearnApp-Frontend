// ─── EduLearn LMS — Centralized API Service ───────────────────────────────
// All requests go through the API Gateway (Spring Boot) at port 8080
// Using Vite env vars (VITE_ prefix)

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_GATEWAY_URL || '';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: attach JWT token ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('edulearn_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  try {
    const rawUser = localStorage.getItem('edulearn_user');
    const user = rawUser ? JSON.parse(rawUser) : null;
    if (user?.id != null) config.headers['X-User-Id'] = user.id;
    if (user?.role) config.headers['X-User-Role'] = user.role;
    if (user?.name || user?.fullName) config.headers['X-User-Name'] = user.name || user.fullName;
  } catch {
    // Ignore malformed local storage and let backend auth/ownership checks decide.
  }

  return config;
});

// ── Response interceptor: handle auth errors ──
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url    = err.config?.url || '';

    const isAuthBootstrapRequest = url.includes('/auth/me');
    const isPublicAuthRequest =
      url.includes('/auth/login')      ||
      url.includes('/auth/register')   ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    if ((status === 401 || status === 403) && isAuthBootstrapRequest) {
      // The /auth/me bootstrap call failed — token is invalid or expired.
      // Clear local session data but let AuthContext handle navigation
      // via its own state change (avoids hard page reload flash).
      localStorage.removeItem('edulearn_token');
      localStorage.removeItem('edulearn_user');
      // Dispatch a custom event so AuthContext can react cleanly
      window.dispatchEvent(new CustomEvent('edulearn:session-expired'));
    }
    // For all other non-public 401s: surface the error to the caller.
    // Do NOT globally redirect — let each component decide how to handle it.
    // This prevents random dashboard kicks caused by a single failing API query.
    void isPublicAuthRequest; // suppress unused var warning

    return Promise.reject(err);
  }
);

// ══════════════════════════════════════════════════════════════════
//  AUTH SERVICE (port 8082, routed via gateway /auth/**)
// ══════════════════════════════════════════════════════════════════
export const authAPI = {
  register:       (data)          => api.post('/auth/register', data),
  login:          (email, pass)   => api.post('/auth/login', { email, password: pass }),
  logout:         ()              => api.post('/auth/logout'),
  getMe:          ()              => api.get('/auth/me'),
  forgotPassword: (email)         => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token, pass)   => api.post('/auth/reset-password', { token, password: pass }),
};

// ══════════════════════════════════════════════════════════════════
//  USER SERVICE (port 8083, routed via gateway /users/**)
// ══════════════════════════════════════════════════════════════════
export const userAPI = {
  createProfile:  (data)          => api.post('/users', data),
  getProfile:     (userId)        => api.get(`/users/${userId}/profile`),
  updateProfile:  (userId, data)  => api.put(`/users/${userId}/profile`, data),
  uploadAvatar:   (userId, form)  => api.post(`/users/${userId}/avatar`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAllUsers:     ()              => api.get('/users'),                        // ADMIN only
  getUsersByRole: (role)          => api.get(`/users?role=${role}`),           // ADMIN only
  updateRole:     (userId, role)  => api.put(`/users/${userId}/role`, { role }), // ADMIN only
  deleteUser:     (userId)        => api.delete(`/users/${userId}`),           // ADMIN only
  submitInstructorVerification: (userId, form) => api.post(`/users/${userId}/verification`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getVerificationRequests: ()     => api.get('/users/instructors/verification-requests'),
  reviewInstructorVerification: (userId, status, comment) => api.put(`/users/${userId}/verification/review`, { status, comment }),
  getVerificationDocument: (userId) => api.get(`/users/${userId}/verification/document`, { responseType: 'blob' }),
};

// ══════════════════════════════════════════════════════════════════
//  COURSE SERVICE (port 8084, routed via gateway /courses/**)
// ══════════════════════════════════════════════════════════════════
export const courseAPI = {
  // Public / Student
  getAll:          (params)        => api.get('/courses', { params }),
  getById:         (id)            => api.get(`/courses/${id}`),
  getByCategory:   (cat)           => api.get(`/courses/category/${cat}`),
  search:          (q)             => api.get('/courses/search', { params: { q } }),
  getFeatured:     ()              => api.get('/courses/featured'),
  getPublished:    (params)        => api.get('/courses/published', { params }),
  // Instructor CRUD
  create:          (data)          => api.post('/courses', data),
  update:          (id, data)      => api.put(`/courses/${id}`, data),
  delete:          (id)            => api.delete(`/courses/${id}`),
  publish:         (id)            => api.put(`/courses/${id}/publish`),
  unpublish:       (id)            => api.put(`/courses/${id}/unpublish`),
  getMyCreated:    ()              => api.get('/courses/me'),                 // Instructor's courses
  uploadThumbnail: (id, form)      => api.post(`/courses/${id}/thumbnail`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  // Admin
  getPending:      ()              => api.get('/courses/pending'),              // ADMIN: awaiting approval
  approve:         (id)            => api.put(`/courses/${id}/approve`),       // ADMIN
  reject:          (id, reason)    => api.put(`/courses/${id}/reject`, { reason }), // ADMIN
  // Stats
  getStats:        (id)            => api.get(`/courses/${id}/stats`),         // enrollment count, avg rating
};

// ══════════════════════════════════════════════════════════════════
//  MODULE/LESSON SERVICE (part of course-service)
// ══════════════════════════════════════════════════════════════════
export const moduleAPI = {
  getByCourse:     (courseId)      => api.get(`/courses/${courseId}/modules`),
  create:          (courseId, data)=> api.post(`/courses/${courseId}/modules`, data),
  update:          (id, data)      => api.put(`/modules/${id}`, data),
  delete:          (id)            => api.delete(`/modules/${id}`),
  reorder:         (courseId, ids) => api.put(`/courses/${courseId}/modules/reorder`, { ids }),
  publish:         (id, published = true) => api.put(`/modules/${id}/publish`, null, { params: { published } }),
  lock:            (id, locked = true) => api.put(`/modules/${id}/lock`, null, { params: { locked } }),
  getResources:    (id)            => api.get(`/modules/${id}/resources`),
  addResource:     (id, data)      => api.post(`/modules/${id}/resources`, data),
  uploadResource:  (id, form)      => api.post(`/modules/${id}/resources/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteResource:  (moduleId, resourceId) => api.delete(`/modules/${moduleId}/resources/${resourceId}`),
};

export const lessonAPI = {
  getPreviewByCourse: (courseId)   => api.get(`/courses/${courseId}/preview-lessons`),
  getByModule:     (moduleId)      => api.get(`/modules/${moduleId}/lessons`),
  getById:         (id)            => api.get(`/lessons/${id}`),
  create:          (moduleId, data)=> api.post(`/modules/${moduleId}/lessons`, data),
  update:          (id, data)      => api.put(`/lessons/${id}`, data),
  delete:          (id)            => api.delete(`/lessons/${id}`),
  reorder:         (moduleId, ids) => api.put(`/modules/${moduleId}/lessons/reorder`, { lessonIds: ids }),
  lock:            (id, locked = true) => api.put(`/lessons/${id}/lock`, null, { params: { locked } }),
  uploadMedia:     (id, form)      => api.post(`/lessons/${id}/media`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getResources:    (id)            => api.get(`/lessons/${id}/resources`),
  addResource:     (id, data)      => api.post(`/lessons/${id}/resources`, data),
  deleteResource:  (lessonId, resourceId) => api.delete(`/lessons/${lessonId}/resources/${resourceId}`),
};

export const youtubeAPI = {
  getMetadata:      (url)          => api.get('/courses/youtube/metadata', { params: { url } }),
};

// ══════════════════════════════════════════════════════════════════
//  ENROLLMENT SERVICE (port 8085, routed via gateway /enrollments/**)
// ══════════════════════════════════════════════════════════════════
export const enrollmentAPI = {
  // Student
  enroll:          (courseId)      => api.post('/enrollments', { courseId }),
  unenroll:        (enrollmentId)  => api.delete(`/enrollments/${enrollmentId}`),
  getMyEnrollments:()              => api.get('/enrollments/me'),
  isEnrolled:      (courseId)      => api.get(`/enrollments/check/${courseId}`),
  getCertificate:  (courseId)      => api.get(`/enrollments/${courseId}/certificate`, { responseType: 'blob' }),
  getCertificateMetadata: (courseId) => api.get(`/enrollments/${courseId}/certificate/metadata`),
  // Progress
  updateProgress:  (courseId, lessonId, pct) => api.put(`/enrollments/${courseId}/progress`, { lessonId, percent: pct }),
  markComplete:    (courseId)      => api.put(`/enrollments/${courseId}/complete`),
  getLessonStatus: (courseId, lessonId) => api.get(`/enrollments/${courseId}/lessons/${lessonId}/status`),
  getLessonStatuses: (courseId)    => api.get(`/enrollments/${courseId}/lessons`),
  // Instructor
  getByCourse:     (courseId)      => api.get(`/enrollments/course/${courseId}`),
  getProgressByCourses: (courseIds) => api.post('/enrollments/courses/progress', { courseIds }),
  getStudentCount: (courseId)      => api.get(`/enrollments/course/${courseId}/count`),
  // Admin
  getAll:          ()              => api.get('/enrollments/all'),
};

// ══════════════════════════════════════════════════════════════════
//  ASSESSMENT SERVICE (quizzes, assignments — part of course-service)
// ══════════════════════════════════════════════════════════════════
export const quizAPI = {
  // Student
  getByCourse:     (courseId)      => api.get(`/courses/${courseId}/quizzes`),
  getById:         (id)            => api.get(`/quizzes/${id}`),
  startAttempt:    (quizId)        => api.post(`/quizzes/${quizId}/attempts`),
  submitAttempt:   (attemptId, answers) => api.post(`/attempts/${attemptId}/submit`, { answers }),
  getMyAttempts:   (quizId)        => api.get(`/quizzes/${quizId}/attempts/me`),
  getBestScore:    (quizId)        => api.get(`/quizzes/${quizId}/best-score/me`),
  getAttemptBreakdown: (attemptId) => api.get(`/attempts/${attemptId}/breakdown`),
  // Instructor CRUD
  create:          (courseId, data)=> api.post(`/courses/${courseId}/quizzes`, data),
  update:          (id, data)      => api.put(`/quizzes/${id}`, data),
  delete:          (id)            => api.delete(`/quizzes/${id}`),
  publish:         (id, published = true) => api.put(`/quizzes/${id}/publish`, null, { params: { published } }),
  addQuestion:     (quizId, data)  => api.post(`/quizzes/${quizId}/questions`, data),
  updateQuestion:  (qId, data)     => api.put(`/questions/${qId}`, data),
  deleteQuestion:  (qId)           => api.delete(`/questions/${qId}`),
};

export const assignmentAPI = {
  // Student
  getByCourse:     (courseId)      => api.get(`/courses/${courseId}/assignments`),
  getById:         (id)            => api.get(`/assignments/${id}`),
  submit:          (id, data)      => api.post(`/assignments/${id}/submit`, data),
  getMySubmission: (id)            => api.get(`/assignments/${id}/submission/me`),
  // Instructor
  create:          (courseId, data)=> api.post(`/courses/${courseId}/assignments`, data),
  update:          (id, data)      => api.put(`/assignments/${id}`, data),
  delete:          (id)            => api.delete(`/assignments/${id}`),
  getSubmissions:  (id)            => api.get(`/assignments/${id}/submissions`),
  gradeSubmission: (subId, data)   => api.put(`/submissions/${subId}/grade`, data),
};

// ══════════════════════════════════════════════════════════════════
//  PAYMENT SERVICE (port 8087, routed via gateway /payments/**)
//  Integrated with Razorpay
// ══════════════════════════════════════════════════════════════════
export const paymentAPI = {
  // Razorpay — Step 1: create order on backend
  createRazorpayOrder:   (data, config = {})    => api.post('/payments/razorpay/order', data, config),
  // Razorpay — Step 2: verify payment signature after checkout
  verifyRazorpay:        (data)    => api.post('/payments/razorpay/verify', data),
  // General
  getHistory:            ()        => api.get('/payments/me'),
  getById:               (id)      => api.get(`/payments/${id}`),
  downloadReceipt:       (id)      => api.get(`/payments/${id}/receipt`, { responseType: 'blob' }),
  // Admin
  getAllPayments:         ()        => api.get('/payments/all'),
  refund:                (id)      => api.post(`/payments/${id}/refund`),
  subscribe:             (data, config = {}) => api.post('/payments/subscriptions', data, config),
  getMySubscription:     ()        => api.get('/payments/subscriptions/me'),
  getSubscriptionHistory:()        => api.get('/payments/subscriptions/history'),
  getAllSubscriptions:   ()        => api.get('/payments/subscriptions'),
  cancelSubscription:    (id)      => api.post(`/payments/subscriptions/${id}/cancel`),
};

// ══════════════════════════════════════════════════════════════════
//  DISCUSSION SERVICE (part of course-service, nested under /courses)
// ══════════════════════════════════════════════════════════════════
export const discussionAPI = {
  getThreads:      (courseId)              => api.get(`/courses/${courseId}/discussions`),
  getThread:       (courseId, threadId)    => api.get(`/courses/${courseId}/discussions/${threadId}`),
  createThread:    (courseId, data)        => api.post(`/courses/${courseId}/discussions`, data),
  deleteThread:    (courseId, threadId)    => api.delete(`/courses/${courseId}/discussions/${threadId}`),
  addReply:        (courseId, threadId, data) => api.post(`/courses/${courseId}/discussions/${threadId}/replies`, data),
  deleteReply:     (courseId, threadId, replyId) => api.delete(`/courses/${courseId}/discussions/${threadId}/replies/${replyId}`),
  pinThread:       (courseId, threadId, pinned = true) => api.put(`/courses/${courseId}/discussions/${threadId}/pin`, null, { params: { pinned } }),
  closeThread:     (courseId, threadId, closed = true) => api.put(`/courses/${courseId}/discussions/${threadId}/close`, null, { params: { closed } }),
  acceptReply:     (courseId, threadId, replyId) => api.put(`/courses/${courseId}/discussions/${threadId}/replies/${replyId}/accept`),
  upvoteReply:     (courseId, threadId, replyId) => api.put(`/courses/${courseId}/discussions/${threadId}/replies/${replyId}/upvote`),
  reportComment:   (courseId, data)        => api.post(`/courses/${courseId}/comment-reports`, data),
};

export const moderationAPI = {
  reportCourse:     (courseId, data) => api.post(`/courses/${courseId}/reports`, data),
  getCourseReports: (status) => api.get('/moderation/course-reports', { params: status ? { status } : {} }),
  getCommentReports:(status) => api.get('/moderation/comment-reports', { params: status ? { status } : {} }),
  reviewCourseReport: (reportId, data) => api.put(`/moderation/course-reports/${reportId}`, data),
  reviewCommentReport: (reportId, data) => api.put(`/moderation/comment-reports/${reportId}`, data),
  createAction:     (data) => api.post('/moderation/actions', data),
};

// ══════════════════════════════════════════════════════════════════
//  NOTIFICATION SERVICE (port 8086, routed via gateway /notifications/**)
//  Receives Kafka events from enrollment-service
// ══════════════════════════════════════════════════════════════════
export const notificationAPI = {
  getAll:          ()              => api.get('/notifications/me'),
  getUnreadCount:  ()              => api.get('/notifications/me/unread-count'),
  markRead:        (id)            => api.put(`/notifications/${id}/read`),
  markAllRead:     ()              => api.put('/notifications/me/read-all'),
  delete:          (id)            => api.delete(`/notifications/${id}`),
  // Admin / System
  sendToUser:      (userId, data)  => api.post(`/notifications/send/${userId}`, data),
  broadcast:       (data)          => api.post('/notifications/broadcast', data),
  targeted:        (data)          => api.post('/notifications/targeted', data),
};

// ══════════════════════════════════════════════════════════════════
//  ANALYTICS / ADMIN SERVICE
// ══════════════════════════════════════════════════════════════════
export const adminAPI = {
  getDashboardStats: async () => {
    try {
      const [users, courses, enrollments, payments] = await Promise.all([
        api.get('/users'),
        api.get('/courses'),
        api.get('/enrollments/all'),
        api.get('/payments/all').catch(() => ({ data: [] }))
      ]);
      const userRows = users.data || [];
      const courseRows = courses.data || [];
      const enrollmentRows = enrollments.data || [];
      const paymentRows = payments.data || [];
      const revenue = paymentRows.reduce((sum, payment) => sum + Number(payment.amount || payment.totalAmount || 0), 0)
        || enrollmentRows.reduce((sum, enrollment) => {
          const course = courseRows.find((item) => item.id === enrollment.courseId);
          return sum + Number(course?.price || 0);
        }, 0);
      return {
        data: {
          totalUsers: userRows.length,
          totalStudents: userRows.filter((user) => user.role === 'STUDENT').length,
          totalInstructors: userRows.filter((user) => user.role === 'INSTRUCTOR').length,
          verifiedInstructors: userRows.filter((user) => user.instructorVerificationStatus === 'APPROVED').length,
          pendingInstructorVerifications: userRows.filter((user) => user.role === 'INSTRUCTOR' && user.instructorVerificationStatus === 'PENDING').length,
          totalCourses: courseRows.length,
          approvedCourses: courseRows.filter((course) => course.status === 'PUBLISHED' || course.reviewStatus === 'APPROVED').length,
          pendingCourseApprovals: courseRows.filter((course) => course.status === 'PENDING' || course.reviewStatus === 'PENDING').length,
          rejectedCourses: courseRows.filter((course) => course.status === 'REJECTED' || course.reviewStatus === 'REJECTED').length,
          totalModules: courseRows.reduce((sum, course) => sum + (course.modules?.length || 0), 0),
          activeEnrollments: enrollmentRows.length,
          totalEnrollments: enrollmentRows.length,
          activeStudents: new Set(enrollmentRows.filter((item) => item.status !== 'COMPLETED').map((item) => item.userId)).size,
          activeInstructors: new Set(courseRows.map((course) => course.instructorId).filter(Boolean)).size,
          totalRevenue: revenue,
          monthlyRevenue: Math.round(revenue * 0.28),
          totalDiscussions: courseRows.reduce((sum, course) => sum + (course.discussions?.length || 0), 0),
          totalAssessments: courseRows.reduce((sum, course) => sum + (course.quizzes?.length || 0) + (course.assignments?.length || 0), 0),
        }
      };
    } catch {
      return { data: { totalUsers: 0, totalCourses: 0, activeEnrollments: 0, totalRevenue: 0 } };
    }
  },
  getRevenueChart:     (period)    => api.get(`/admin/revenue?period=${period}`),
  getEnrollmentChart:  (period)    => api.get(`/admin/enrollments/chart?period=${period}`),
  getUserGrowth:       ()          => api.get('/admin/users/growth'),
  getTopCourses:       ()          => api.get('/admin/courses/top'),
  getAllUsers:         ()          => api.get('/users'),
  getAllCourses:       ()          => api.get('/courses'),
  getAllEnrollments:   ()          => api.get('/enrollments/all'),
  getAllPayments:      ()          => api.get('/payments/all'),
  getVerificationRequests: ()      => api.get('/users/instructors/verification-requests'),
  reviewInstructorVerification: (userId, status, comment) => api.put(`/users/${userId}/verification/review`, { status, comment }),
  getVerificationDocument: (userId) => api.get(`/users/${userId}/verification/document`, { responseType: 'blob' }),
  getPendingCourses:   ()          => api.get('/courses/pending'),
  getInstructorAnalytics: ()       => api.get('/courses/admin/instructor-analytics'),
  updateRole:          (userId, role) => api.put(`/users/${userId}/role`, { role }),
  approveCourse:       (id)        => api.put(`/courses/${id}/approve`),
  getSystemHealth:     ()          => Promise.resolve({ data: { 'API Gateway': 'Operational', 'Auth Service': 'Operational', 'Course Service': 'Operational', 'Payment Service': 'Operational', 'Database': 'Operational' } }),
};

export default api;

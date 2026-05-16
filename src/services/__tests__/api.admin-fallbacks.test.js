import { loadApiModule } from './helpers/loadApiModule';

describe('admin and fallback service behaviors', () => {
  test('aggregates admin dashboard metrics from service responses', async () => {
    const { exports, axiosInstance } = await loadApiModule();

    axiosInstance.get.mockImplementation((url) => {
      if (url === '/users') {
        return Promise.resolve({
          data: [
            { id: 1, role: 'STUDENT' },
            { id: 2, role: 'INSTRUCTOR', instructorVerificationStatus: 'PENDING' },
            { id: 3, role: 'INSTRUCTOR', instructorVerificationStatus: 'APPROVED' },
          ],
        });
      }

      if (url === '/courses') {
        return Promise.resolve({
          data: [
            {
              id: 11,
              instructorId: 2,
              status: 'PUBLISHED',
              price: 499,
              modules: [{ id: 'm1' }, { id: 'm2' }],
              discussions: [{ id: 'd1' }],
              quizzes: [{ id: 'q1' }],
              assignments: [{ id: 'a1' }],
            },
            {
              id: 12,
              instructorId: 3,
              reviewStatus: 'PENDING',
              price: 299,
              modules: [{ id: 'm3' }],
            },
          ],
        });
      }

      if (url === '/enrollments/all') {
        return Promise.resolve({
          data: [
            { userId: 1, courseId: 11, status: 'ACTIVE' },
            { userId: 1, courseId: 12, status: 'COMPLETED' },
          ],
        });
      }

      if (url === '/payments/all') {
        return Promise.resolve({
          data: [
            { amount: 499 },
            { totalAmount: 299 },
          ],
        });
      }

      return Promise.reject(new Error(`Unexpected url ${url}`));
    });

    const result = await exports.adminAPI.getDashboardStats();

    expect(result).toEqual({
      data: expect.objectContaining({
        totalUsers: 3,
        totalStudents: 1,
        totalInstructors: 2,
        verifiedInstructors: 1,
        pendingInstructorVerifications: 1,
        totalCourses: 2,
        approvedCourses: 1,
        pendingCourseApprovals: 1,
        totalModules: 3,
        totalEnrollments: 2,
        activeStudents: 1,
        activeInstructors: 2,
        totalRevenue: 798,
        monthlyRevenue: 223,
        totalDiscussions: 1,
        totalAssessments: 2,
      }),
    });
  });

  test('falls back safely when dashboard aggregation fails', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    axiosInstance.get.mockRejectedValue(new Error('service unavailable'));

    await expect(exports.adminAPI.getDashboardStats()).resolves.toEqual({
      data: {
        totalUsers: 0,
        totalCourses: 0,
        activeEnrollments: 0,
        totalRevenue: 0,
      },
    });
  });

  test('uses enrollment-derived revenue when payment history is unavailable', async () => {
    const { exports, axiosInstance } = await loadApiModule();

    axiosInstance.get.mockImplementation((url) => {
      if (url === '/users') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/courses') {
        return Promise.resolve({
          data: [
            { id: 100, price: 250, instructorId: 10 },
            { id: 101, price: 400, instructorId: 11 },
          ],
        });
      }

      if (url === '/enrollments/all') {
        return Promise.resolve({
          data: [
            { userId: 1, courseId: 100, status: 'ACTIVE' },
            { userId: 2, courseId: 101, status: 'ACTIVE' },
          ],
        });
      }

      if (url === '/payments/all') {
        return Promise.reject(new Error('payments offline'));
      }

      return Promise.reject(new Error(`Unexpected url ${url}`));
    });

    const result = await exports.adminAPI.getDashboardStats();

    expect(result.data.totalRevenue).toBe(650);
    expect(result.data.monthlyRevenue).toBe(182);
  });

  test('returns system health and routes management endpoints correctly', async () => {
    const { exports, axiosInstance } = await loadApiModule();

    const health = await exports.adminAPI.getSystemHealth();
    exports.adminAPI.approveCourse(77);
    exports.adminAPI.reviewInstructorVerification(55, 'APPROVED', 'Looks good');

    expect(health).toEqual({
      data: {
        'API Gateway': 'Operational',
        'Auth Service': 'Operational',
        'Course Service': 'Operational',
        'Payment Service': 'Operational',
        Database: 'Operational',
      },
    });
    expect(axiosInstance.put).toHaveBeenCalledWith('/courses/77/approve');
    expect(axiosInstance.put).toHaveBeenCalledWith('/users/55/verification/review', {
      status: 'APPROVED',
      comment: 'Looks good',
    });
  });
});

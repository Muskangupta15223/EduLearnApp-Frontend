import { loadApiModule } from './helpers/loadApiModule';

describe('service api wrappers', () => {
  test('user service routes registration-adjacent profile flows correctly', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    const profile = { fullName: 'Riya Sharma' };
    const roleUpdate = { role: 'INSTRUCTOR' };

    exports.userAPI.createProfile(profile);
    exports.userAPI.getProfile(12);
    exports.userAPI.updateProfile(12, profile);
    exports.userAPI.updateRole(12, roleUpdate.role);
    exports.userAPI.deleteUser(12);

    expect(axiosInstance.post).toHaveBeenCalledWith('/users', profile);
    expect(axiosInstance.get).toHaveBeenCalledWith('/users/12/profile');
    expect(axiosInstance.put).toHaveBeenCalledWith('/users/12/profile', profile);
    expect(axiosInstance.put).toHaveBeenCalledWith('/users/12/role', roleUpdate);
    expect(axiosInstance.delete).toHaveBeenCalledWith('/users/12');
  });

  test('course service covers creation, updates, deletions, and listing endpoints', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    const course = { title: 'Distributed Systems' };

    exports.courseAPI.getAll({ category: 'tech' });
    exports.courseAPI.create(course);
    exports.courseAPI.update(7, course);
    exports.courseAPI.delete(7);
    exports.courseAPI.publish(7);
    exports.courseAPI.getMyCreated();

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '/courses', {
      params: { category: 'tech' },
    });
    expect(axiosInstance.post).toHaveBeenCalledWith('/courses', course);
    expect(axiosInstance.put).toHaveBeenCalledWith('/courses/7', course);
    expect(axiosInstance.delete).toHaveBeenCalledWith('/courses/7');
    expect(axiosInstance.put).toHaveBeenCalledWith('/courses/7/publish');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '/courses/me');
  });

  test('module service handles module management and resource operations', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    const modulePayload = { title: 'Week 1' };
    const resourcePayload = { name: 'Slides' };

    exports.moduleAPI.getByCourse(5);
    exports.moduleAPI.create(5, modulePayload);
    exports.moduleAPI.reorder(5, [3, 1, 2]);
    exports.moduleAPI.publish(3, false);
    exports.moduleAPI.addResource(3, resourcePayload);
    exports.moduleAPI.deleteResource(3, 44);

    expect(axiosInstance.get).toHaveBeenCalledWith('/courses/5/modules');
    expect(axiosInstance.post).toHaveBeenCalledWith('/courses/5/modules', modulePayload);
    expect(axiosInstance.put).toHaveBeenCalledWith('/courses/5/modules/reorder', {
      ids: [3, 1, 2],
    });
    expect(axiosInstance.put).toHaveBeenCalledWith('/modules/3/publish', null, {
      params: { published: false },
    });
    expect(axiosInstance.post).toHaveBeenCalledWith('/modules/3/resources', resourcePayload);
    expect(axiosInstance.delete).toHaveBeenCalledWith('/modules/3/resources/44');
  });

  test('enrollment service covers enroll, drop, progress, and instructor reporting flows', async () => {
    const { exports, axiosInstance } = await loadApiModule();

    exports.enrollmentAPI.enroll(91);
    exports.enrollmentAPI.unenroll(13);
    exports.enrollmentAPI.getMyEnrollments();
    exports.enrollmentAPI.updateProgress(91, 4, 80);
    exports.enrollmentAPI.getByCourse(91);
    exports.enrollmentAPI.getProgressByCourses([91, 92]);

    expect(axiosInstance.post).toHaveBeenCalledWith('/enrollments', { courseId: 91 });
    expect(axiosInstance.delete).toHaveBeenCalledWith('/enrollments/13');
    expect(axiosInstance.get).toHaveBeenCalledWith('/enrollments/me');
    expect(axiosInstance.put).toHaveBeenCalledWith('/enrollments/91/progress', {
      lessonId: 4,
      percent: 80,
    });
    expect(axiosInstance.get).toHaveBeenCalledWith('/enrollments/course/91');
    expect(axiosInstance.post).toHaveBeenCalledWith('/enrollments/courses/progress', {
      courseIds: [91, 92],
    });
  });

  test('notification service covers direct sends, targeted sends, preferences-facing reads, and history', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    const message = { title: 'Welcome', body: 'You enrolled successfully.' };

    exports.notificationAPI.getAll();
    exports.notificationAPI.getUnreadCount();
    exports.notificationAPI.markAllRead();
    exports.notificationAPI.sendToUser(12, message);
    exports.notificationAPI.targeted({ role: 'STUDENT', ...message });

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '/notifications/me');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '/notifications/me/unread-count');
    expect(axiosInstance.put).toHaveBeenCalledWith('/notifications/me/read-all');
    expect(axiosInstance.post).toHaveBeenCalledWith('/notifications/send/12', message);
    expect(axiosInstance.post).toHaveBeenCalledWith('/notifications/targeted', {
      role: 'STUDENT',
      ...message,
    });
  });
});

import { loadApiModule } from './helpers/loadApiModule';

describe('learning content service wrappers', () => {
  test('lesson service routes preview, CRUD, reorder, and locking requests', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    const lesson = { title: 'Intro lesson' };

    exports.lessonAPI.getPreviewByCourse(15);
    exports.lessonAPI.getByModule(19);
    exports.lessonAPI.getById(22);
    exports.lessonAPI.create(19, lesson);
    exports.lessonAPI.update(22, lesson);
    exports.lessonAPI.reorder(19, [8, 7, 6]);
    exports.lessonAPI.lock(22, false);
    exports.lessonAPI.delete(22);

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '/courses/15/preview-lessons');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '/modules/19/lessons');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(3, '/lessons/22');
    expect(axiosInstance.post).toHaveBeenCalledWith('/modules/19/lessons', lesson);
    expect(axiosInstance.put).toHaveBeenCalledWith('/lessons/22', lesson);
    expect(axiosInstance.put).toHaveBeenCalledWith('/modules/19/lessons/reorder', {
      lessonIds: [8, 7, 6],
    });
    expect(axiosInstance.put).toHaveBeenCalledWith('/lessons/22/lock', null, {
      params: { locked: false },
    });
    expect(axiosInstance.delete).toHaveBeenCalledWith('/lessons/22');
  });

  test('youtube metadata service passes the requested video url as a query param', async () => {
    const { exports, axiosInstance } = await loadApiModule();

    exports.youtubeAPI.getMetadata('https://youtu.be/demo');

    expect(axiosInstance.get).toHaveBeenCalledWith('/courses/youtube/metadata', {
      params: { url: 'https://youtu.be/demo' },
    });
  });

  test('quiz service covers student attempt flows and instructor authoring flows', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    const quiz = { title: 'Quiz 1' };
    const answers = [{ questionId: 1, answer: 'B' }];

    exports.quizAPI.getByCourse(12);
    exports.quizAPI.getById(44);
    exports.quizAPI.startAttempt(44);
    exports.quizAPI.submitAttempt(60, answers);
    exports.quizAPI.getAttemptBreakdown(60);
    exports.quizAPI.create(12, quiz);
    exports.quizAPI.publish(44, false);
    exports.quizAPI.addQuestion(44, { text: '2 + 2?' });
    exports.quizAPI.deleteQuestion(3);

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '/courses/12/quizzes');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '/quizzes/44');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(3, '/attempts/60/breakdown');
    expect(axiosInstance.post).toHaveBeenNthCalledWith(1, '/quizzes/44/attempts');
    expect(axiosInstance.post).toHaveBeenNthCalledWith(2, '/attempts/60/submit', { answers });
    expect(axiosInstance.post).toHaveBeenNthCalledWith(3, '/courses/12/quizzes', quiz);
    expect(axiosInstance.post).toHaveBeenNthCalledWith(4, '/quizzes/44/questions', { text: '2 + 2?' });
    expect(axiosInstance.put).toHaveBeenCalledWith('/quizzes/44/publish', null, {
      params: { published: false },
    });
    expect(axiosInstance.delete).toHaveBeenCalledWith('/questions/3');
  });

  test('assignment service covers submissions, grading, and instructor management routes', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    const assignment = { title: 'Homework 1' };
    const submission = { content: 'answer' };
    const grade = { score: 9 };

    exports.assignmentAPI.getByCourse(12);
    exports.assignmentAPI.getById(5);
    exports.assignmentAPI.submit(5, submission);
    exports.assignmentAPI.getMySubmission(5);
    exports.assignmentAPI.create(12, assignment);
    exports.assignmentAPI.update(5, assignment);
    exports.assignmentAPI.getSubmissions(5);
    exports.assignmentAPI.gradeSubmission(14, grade);
    exports.assignmentAPI.delete(5);

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '/courses/12/assignments');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '/assignments/5');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(3, '/assignments/5/submission/me');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(4, '/assignments/5/submissions');
    expect(axiosInstance.post).toHaveBeenNthCalledWith(1, '/assignments/5/submit', submission);
    expect(axiosInstance.post).toHaveBeenNthCalledWith(2, '/courses/12/assignments', assignment);
    expect(axiosInstance.put).toHaveBeenNthCalledWith(1, '/assignments/5', assignment);
    expect(axiosInstance.put).toHaveBeenNthCalledWith(2, '/submissions/14/grade', grade);
    expect(axiosInstance.delete).toHaveBeenCalledWith('/assignments/5');
  });
});

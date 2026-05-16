import { loadApiModule } from './helpers/loadApiModule';

describe('payments and community service wrappers', () => {
  test('payment service covers checkout, subscriptions, receipts, and refunds', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    const orderPayload = { amount: 49900 };
    const verifyPayload = { paymentId: 'pay_1' };
    const config = { headers: { 'Idempotency-Key': 'abc' } };

    exports.paymentAPI.createRazorpayOrder(orderPayload, config);
    exports.paymentAPI.verifyRazorpay(verifyPayload);
    exports.paymentAPI.getHistory();
    exports.paymentAPI.getById(7);
    exports.paymentAPI.downloadReceipt(7);
    exports.paymentAPI.refund(7);
    exports.paymentAPI.subscribe({ plan: 'MONTHLY' }, config);
    exports.paymentAPI.getMySubscription();
    exports.paymentAPI.getSubscriptionHistory();
    exports.paymentAPI.getAllSubscriptions();
    exports.paymentAPI.cancelSubscription(9);

    expect(axiosInstance.post).toHaveBeenNthCalledWith(1, '/payments/razorpay/order', orderPayload, config);
    expect(axiosInstance.post).toHaveBeenNthCalledWith(2, '/payments/razorpay/verify', verifyPayload);
    expect(axiosInstance.post).toHaveBeenNthCalledWith(3, '/payments/7/refund');
    expect(axiosInstance.post).toHaveBeenNthCalledWith(4, '/payments/subscriptions', { plan: 'MONTHLY' }, config);
    expect(axiosInstance.post).toHaveBeenNthCalledWith(5, '/payments/subscriptions/9/cancel');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '/payments/me');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '/payments/7');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(3, '/payments/7/receipt', { responseType: 'blob' });
    expect(axiosInstance.get).toHaveBeenNthCalledWith(4, '/payments/subscriptions/me');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(5, '/payments/subscriptions/history');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(6, '/payments/subscriptions');
  });

  test('discussion service covers threads, replies, moderation toggles, and upvotes', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    const thread = { title: 'Need help' };
    const reply = { body: 'Try lesson 2' };

    exports.discussionAPI.getThreads(4);
    exports.discussionAPI.getThread(4, 8);
    exports.discussionAPI.createThread(4, thread);
    exports.discussionAPI.addReply(4, 8, reply);
    exports.discussionAPI.pinThread(4, 8, false);
    exports.discussionAPI.closeThread(4, 8, true);
    exports.discussionAPI.acceptReply(4, 8, 11);
    exports.discussionAPI.upvoteReply(4, 8, 11);
    exports.discussionAPI.deleteReply(4, 8, 11);
    exports.discussionAPI.deleteThread(4, 8);
    exports.discussionAPI.reportComment(4, { reason: 'spam' });

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '/courses/4/discussions');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '/courses/4/discussions/8');
    expect(axiosInstance.post).toHaveBeenNthCalledWith(1, '/courses/4/discussions', thread);
    expect(axiosInstance.post).toHaveBeenNthCalledWith(2, '/courses/4/discussions/8/replies', reply);
    expect(axiosInstance.post).toHaveBeenNthCalledWith(3, '/courses/4/comment-reports', { reason: 'spam' });
    expect(axiosInstance.put).toHaveBeenNthCalledWith(1, '/courses/4/discussions/8/pin', null, {
      params: { pinned: false },
    });
    expect(axiosInstance.put).toHaveBeenNthCalledWith(2, '/courses/4/discussions/8/close', null, {
      params: { closed: true },
    });
    expect(axiosInstance.put).toHaveBeenNthCalledWith(3, '/courses/4/discussions/8/replies/11/accept');
    expect(axiosInstance.put).toHaveBeenNthCalledWith(4, '/courses/4/discussions/8/replies/11/upvote');
    expect(axiosInstance.delete).toHaveBeenNthCalledWith(1, '/courses/4/discussions/8/replies/11');
    expect(axiosInstance.delete).toHaveBeenNthCalledWith(2, '/courses/4/discussions/8');
  });

  test('moderation service covers reporting and review workflows', async () => {
    const { exports, axiosInstance } = await loadApiModule();
    const reviewPayload = { status: 'RESOLVED' };
    const actionPayload = { actionType: 'WARN' };

    exports.moderationAPI.reportCourse(10, { reason: 'outdated' });
    exports.moderationAPI.getCourseReports('PENDING');
    exports.moderationAPI.getCommentReports();
    exports.moderationAPI.reviewCourseReport(3, reviewPayload);
    exports.moderationAPI.reviewCommentReport(4, reviewPayload);
    exports.moderationAPI.createAction(actionPayload);

    expect(axiosInstance.post).toHaveBeenNthCalledWith(1, '/courses/10/reports', { reason: 'outdated' });
    expect(axiosInstance.post).toHaveBeenNthCalledWith(2, '/moderation/actions', actionPayload);
    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '/moderation/course-reports', {
      params: { status: 'PENDING' },
    });
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '/moderation/comment-reports', {
      params: {},
    });
    expect(axiosInstance.put).toHaveBeenNthCalledWith(1, '/moderation/course-reports/3', reviewPayload);
    expect(axiosInstance.put).toHaveBeenNthCalledWith(2, '/moderation/comment-reports/4', reviewPayload);
  });
});

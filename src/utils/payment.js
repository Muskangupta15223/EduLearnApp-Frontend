export function buildCoursePaymentKey(userId, courseId) {
  return `${userId || 'guest'}-course-${courseId}`;
}

export function buildSubscriptionPaymentKey(userId, plan) {
  return `${userId || 'guest'}-subscription-${plan}`;
}

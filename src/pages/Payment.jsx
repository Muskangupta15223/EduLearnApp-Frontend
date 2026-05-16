import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildCoursePaymentKey, buildSubscriptionPaymentKey } from '../utils/payment';

const SUBSCRIPTION_PLANS = [
  {
    key: 'FREE',
    title: 'Explorer',
    price: 0,
    period: 'forever',
    description: 'Start learning with a free access tier and upgrade when you need more structure.',
    highlights: 'Free plan, starter access, no payment needed',
  },
  {
    key: 'MONTHLY',
    title: 'Pro Monthly',
    price: 499,
    period: 'per month',
    description: 'Best for focused learners who want premium access without a long commitment.',
    highlights: 'Premium access, monthly billing, cancel anytime',
  },
  {
    key: 'ANNUAL',
    title: 'Pro Annual',
    price: 4999,
    period: 'per year',
    description: 'Lower effective monthly cost for learners who want uninterrupted momentum.',
    highlights: 'Best value, annual access, premium track',
  },
];

const PAYMENT_MODES = ['CARD', 'UPI', 'NET_BANKING', 'WALLET'];

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export default function PaymentPage() {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const course = location.state?.course;

  const { data: history = [] } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => paymentAPI.getHistory().then(r => r.data),
    enabled: !course,
  });

  const { data: currentSubscription } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: () => paymentAPI.getMySubscription().then(r => r.data),
    enabled: !course,
  });

  const { data: subscriptionHistory = [] } = useQuery({
    queryKey: ['subscription-history'],
    queryFn: () => paymentAPI.getSubscriptionHistory().then(r => r.data),
    enabled: !course,
  });

  const { mutate: startPayment, isPending } = useMutation({
    mutationFn: selectedCourse => paymentAPI.createRazorpayOrder(
      {
        plan: `COURSE_${selectedCourse.id}`,
        amount: selectedCourse.price,
        courseId: selectedCourse.id,
      },
      {
        headers: {
          'Idempotency-Key': buildCoursePaymentKey(user?.id, selectedCourse.id),
        },
      }
    ),
    onSuccess: async (res, selectedCourse) => {
      const order = res.data;
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Payment gateway failed to load. Please try again.');
        return;
      }

      const options = {
        key: order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'EduLearn LMS',
        description: `Enrollment: ${selectedCourse.title}`,
        order_id: order.razorpayOrderId,
        notes: {
          courseId: selectedCourse.id,
          plan: `COURSE_${selectedCourse.id}`,
          paymentId: order.paymentId,
        },
        prefill: { name: user?.fullName || user?.name, email: user?.email },
        theme: { color: '#0A84FF' },
        handler: async response => {
          try {
            await paymentAPI.verifyRazorpay({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              plan: `COURSE_${selectedCourse.id}`,
            });
            toast.success(`Successfully enrolled in ${selectedCourse.title}!`);
            navigate('/student/my-learning');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed. Contact support if amount was deducted.');
          }
        },
        modal: { ondismiss: () => toast.info('Payment cancelled') },
      };

      if (!options.key) {
        toast.error('Payment gateway is not configured. Please contact support.');
        return;
      }

      new window.Razorpay(options).open();
    },
    onError: err => toast.error(err.response?.data?.message || 'Could not initiate payment'),
  });

  const { mutate: subscribeToPlan, isPending: subscribing } = useMutation({
    mutationFn: ({ plan, paymentMode, autoRenew }) => paymentAPI.subscribe(
      { plan, paymentMode, autoRenew },
      {
        headers: {
          'Idempotency-Key': buildSubscriptionPaymentKey(user?.id, plan),
        },
      }
    ),
    onSuccess: response => {
      const subscription = response.data;
      toast.success(`${subscription.plan} subscription is now active.`);
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-history'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: err => toast.error(err.response?.data?.message || 'Could not activate subscription'),
  });

  const { mutate: cancelSubscription, isPending: cancellingSubscription } = useMutation({
    mutationFn: subscriptionId => paymentAPI.cancelSubscription(subscriptionId),
    onSuccess: () => {
      toast.success('Subscription cancelled.');
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-history'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: err => toast.error(err.response?.data?.message || 'Could not cancel subscription'),
  });

  const activePlan = currentSubscription?.plan;

  const activatePlan = (planKey) => {
    if (planKey === 'FREE') {
      subscribeToPlan({ plan: 'FREE', paymentMode: null, autoRenew: false });
      return;
    }
    subscribeToPlan({ plan: planKey, paymentMode: 'CARD', autoRenew: planKey !== 'FREE' });
  };

  const getSubscriptionBadgeClass = (status) => {
    if (status === 'ACTIVE') return 'badge-green';
    if (status === 'CANCELLED') return 'badge-orange';
    if (status === 'EXPIRED') return 'badge-red';
    return 'badge-blue';
  };

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <h1 className="page-title">{course ? 'Secure Checkout' : 'Payments and Plans'}</h1>
        <p className="page-subtitle">
          {course ? 'Complete your purchase to unlock the course' : 'Manage course purchases, receipts, and subscription access in one place.'}
        </p>
      </div>

      {course ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 350px)', gap: 32, alignItems: 'start' }}>
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Order Summary</h3>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              {course.thumbnail ? (
                <img src={course.thumbnail} alt="" style={{ width: 120, height: 70, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
              ) : (
                <div style={{ width: 120, height: 70, background: 'var(--brand-primary-soft)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>Book</div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{course.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>By {course.instructorName || 'EduLearn Instructor'}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Original Price</span>
                <span style={{ fontWeight: 600 }}>Rs. {course.price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: '1.2rem', fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: 'var(--brand-primary)' }}>Rs. {course.price}</span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 10 }}
              disabled={isPending || !user}
              onClick={() => startPayment(course)}
            >
              {isPending ? <><span className="spinner" /> Processing...</> : `Pay Rs. ${course.price} Securely`}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 12 }}>
              Payments are processed securely via Razorpay.
            </p>
          </div>

          <div className="card" style={{ background: 'var(--bg-elevated)', border: 'none' }}>
            <h4 style={{ marginBottom: 16 }}>Why learn with us?</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>Access</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Lifetime Access</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Learn on your schedule.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>Proof</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Certificate of Completion</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Stand out to employers.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 40 }}>
          {/* Section 1: Current Subscription Summary */}
          <div className="card card-compact" style={{ background: 'linear-gradient(135deg, var(--brand-primary-soft), transparent)', border: '1px solid var(--brand-primary-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ marginBottom: 4, fontSize: '1.2rem' }}>Current Subscription</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Manage your active plan and upcoming renewals.
                </p>
              </div>
              {currentSubscription ? (
                <span className={`badge ${getSubscriptionBadgeClass(currentSubscription.status)}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  {currentSubscription.status}
                </span>
              ) : (
                <span className="badge badge-blue">No active plan</span>
              )}
            </div>

            {currentSubscription ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 20 }}>
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Plan</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand-primary)' }}>{currentSubscription.plan}</div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Renews / Ends</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{currentSubscription.endDate || 'N/A'}</div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Paid</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Rs. {currentSubscription.amountPaid}</div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                You are currently on the Free tier. Upgrade below to unlock premium features.
              </div>
            )}

            {currentSubscription?.status === 'ACTIVE' && currentSubscription.plan !== 'FREE' && (
              <div style={{ marginTop: 20 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={cancellingSubscription}
                  onClick={() => cancelSubscription(currentSubscription.id)}
                >
                  {cancellingSubscription ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Payment History (Transactions) */}
          <section>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Payment History</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>View and download receipts for all your course and subscription purchases.</p>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Description</th><th>Txn ID</th><th>Amount</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>No transactions found</td></tr>
                  ) : history.map(txn => (
                    <tr key={txn.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(txn.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ fontWeight: 600 }}>{txn.planReference || 'Course Purchase'}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{txn.razorpayPaymentId || txn.gatewayTransactionId || 'N/A'}</td>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Rs. {txn.amount}</td>
                      <td><span className={`badge ${txn.status === 'SUCCESS' ? 'badge-green' : txn.status === 'REFUNDED' ? 'badge-purple' : txn.status === 'FAILED' ? 'badge-red' : 'badge-orange'}`}>{txn.status}</span></td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={async () => {
                            try {
                              const response = await paymentAPI.downloadReceipt(txn.id);
                              downloadBlob(response.data, `receipt-${txn.id}.txt`);
                            } catch {
                              toast.error('Could not download receipt');
                            }
                          }}
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Subscription Plans */}
          <section>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 4 }}>Subscription Plans</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Choose a plan that fits your learning journey.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isActive = activePlan === plan.key && currentSubscription?.status === 'ACTIVE';
                return (
                  <div key={plan.key} className="card card-compact" style={{ 
                    position: 'relative', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderColor: isActive ? 'var(--brand-primary)' : 'var(--border-default)',
                    background: isActive ? 'color-mix(in srgb, var(--brand-primary) 4%, var(--bg-surface))' : 'var(--bg-surface)',
                    boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{plan.title}</h4>
                      {isActive && <span className="badge badge-green">Current</span>}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>{plan.price === 0 ? 'Free' : `Rs. ${plan.price}`}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: 6 }}>/ {plan.period.replace('per ', '')}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 16, flex: 1 }}>{plan.description}</p>
                    <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <span style={{ color: 'var(--brand-accent)' }}>✓</span> {plan.highlights}
                      </div>
                    </div>
                    <button
                      className={isActive ? 'btn btn-secondary' : 'btn btn-primary'}
                      style={{ width: '100%', marginTop: 16 }}
                      disabled={subscribing || isActive}
                      onClick={() => activatePlan(plan.key)}
                    >
                      {isActive ? 'Active Plan' : subscribing ? 'Processing...' : `Get ${plan.title}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 4: Subscription History */}
          <section>
            <div className="card card-compact">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>Subscription Timeline</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>History of your plan changes and billing cycles.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                   {PAYMENT_MODES.slice(0, 2).map((mode) => <span key={mode} className="badge badge-blue" style={{ fontSize: '0.8125rem' }}>{mode}</span>)}
                </div>
              </div>
              {subscriptionHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.9rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>No history found.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {subscriptionHistory.map((subscription) => (
                    <div key={subscription.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{subscription.plan}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{subscription.startDate} — {subscription.endDate || 'Present'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Rs. {subscription.amountPaid}</div>
                        <span className={`badge ${getSubscriptionBadgeClass(subscription.status)}`} style={{ fontSize: '0.8125rem', marginTop: 4 }}>{subscription.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

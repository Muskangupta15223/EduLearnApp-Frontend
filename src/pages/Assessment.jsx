import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { quizAPI, enrollmentAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

function QuizRunner({ quiz, questions, onClose }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const timerRef = useRef();

  useEffect(() => {
    const doStart = async () => {
      try {
        const res = await quizAPI.startAttempt(quiz.id);
        setAttemptId(res.data?.id);
      } catch { /* ignore */ }
    };
    doStart();
  }, [quiz.id]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    try {
      if (attemptId) {
        const res = await quizAPI.submitAttempt(attemptId, answers);
        setResult(res.data);
      } else {
        // Fallback local evaluation
        let score = 0;
        questions.forEach(q => {
          if (answers[q.id] && answers[q.id].toUpperCase() === q.correctAnswer?.toUpperCase()) score += (q.points || 1);
        });
        const maxScore = questions.reduce((s, q) => s + (q.points || 1), 0);
        setResult({ score, maxScore, isPassed: score >= (quiz.passingScore || 70) });
      }
    } catch {
      let score = 0;
      questions.forEach(q => {
        if (answers[q.id] && answers[q.id].toUpperCase() === q.correctAnswer?.toUpperCase()) score += (q.points || 1);
      });
      const maxScore = questions.reduce((s, q) => s + (q.points || 1), 0);
      setResult({ score, maxScore, isPassed: score >= (quiz.passingScore || 70) });
    }
    setSubmitted(true);
  };

  const q = questions[current];
  const isLow = timeLeft < 60;
  const options = [
    { key: 'A', text: q?.optionA },
    { key: 'B', text: q?.optionB },
    { key: 'C', text: q?.optionC },
    { key: 'D', text: q?.optionD },
  ].filter(o => o.text);

  if (submitted && result) {
    const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
    const passed = result.isPassed;
    return (
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="modal" initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ textAlign: 'center' }}>
          <div className="modal-body" style={{ padding: '48px 32px' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
              style={{ fontSize: '5rem', marginBottom: 16 }}>{passed ? '🎉' : '😔'}</motion.div>
            <h2 style={{ marginBottom: 8 }}>{passed ? 'Congratulations!' : 'Keep trying!'}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              {passed ? "You've passed the quiz!" : `You need ${quiz.passingScore || 70}% to pass.`}
            </p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              style={{ fontSize: '4rem', fontWeight: 900, color: passed ? 'var(--brand-accent)' : '#f97316', marginBottom: 8 }}>
              {pct}%
            </motion.div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>
              Score: {result.score}/{result.maxScore}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 28 }}>
              Passing: {quiz.passingScore || 70}%
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="modal modal-lg" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{quiz.title}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Question {current + 1} of {questions.length}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: '6px 14px', borderRadius: 'var(--radius-pill)',
              background: isLow ? 'rgba(255,59,48,0.15)' : 'var(--bg-elevated)',
              color: isLow ? '#FF3B30' : 'var(--text-primary)', fontWeight: 700, fontSize: '1rem',
              animation: isLow ? 'pulse 1s infinite' : 'none'
            }}>⏱ {fmt(timeLeft)}</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="progress-bar" style={{ marginBottom: 24 }}>
            <motion.div className="progress-fill" animate={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-purple))',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
            }}>{current + 1}</div>
            <h3 style={{ fontSize: '1.1rem', lineHeight: 1.6, fontWeight: 600 }}>{q.questionText}</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {options.map((opt) => (
              <motion.div key={opt.key} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                style={{
                  padding: '14px 18px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: answers[q.id] === opt.key ? '2px solid var(--brand-primary)' : '1px solid var(--border-default)',
                  background: answers[q.id] === opt.key ? 'var(--brand-primary-soft)' : 'var(--bg-surface)',
                  display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s ease'
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: answers[q.id] === opt.key ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                  color: answers[q.id] === opt.key ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700, fontSize: '0.8rem'
                }}>{opt.key}</div>
                <span style={{ fontSize: '0.95rem' }}>{opt.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Question nav dots */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 24 }}>
            {questions.map((_, i) => (
              <div key={i} onClick={() => setCurrent(i)} style={{
                width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: '0.8125rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
                background: i === current ? 'var(--brand-primary)' : answers[questions[i].id] ? 'var(--brand-accent)' : 'var(--bg-elevated)',
                color: i === current || answers[questions[i].id] ? '#fff' : 'var(--text-muted)',
              }}>{i + 1}</div>
            ))}
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>← Previous</button>
          {current < questions.length - 1
            ? <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>Next →</button>
            : <button className="btn btn-primary" onClick={() => handleSubmit(false)}>Submit Quiz ✓</button>}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AssessmentPage() {
  const toast = useToast();
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Fetch enrolled courses
  const { data: enrollments = [] } = useQuery({
    queryKey: ['my-enrollments-assess'],
    queryFn: () => enrollmentAPI.getMyEnrollments().then(r => r.data),
    staleTime: 60000,
  });

  // Fetch quizzes for selected course
  const { data: quizzes = [], isLoading, refetch } = useQuery({
    queryKey: ['quizzes', selectedCourse],
    queryFn: () => selectedCourse ? quizAPI.getByCourse(selectedCourse).then(r => r.data) : Promise.resolve([]),
    enabled: !!selectedCourse,
  });

  useEffect(() => {
    if (enrollments.length > 0 && !selectedCourse) {
      setSelectedCourse(enrollments[0].courseId);
    }
  }, [enrollments]);

  const handleStartQuiz = async (quiz) => {
    try {
      const res = await quizAPI.getById(quiz.id);
      const q = res.data;
      setQuizQuestions(q?.questions || []);
      setActiveQuiz(q || quiz);
    } catch {
      toast.error('Failed to load quiz');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <h1 className="page-title">🧠 Assessments</h1>
        <p className="page-subtitle">Test your knowledge with timed quizzes</p>
      </div>

      {/* Course selector */}
      {enrollments.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          {enrollments.map(e => (
            <motion.button whileHover={{ scale: 1.04 }} key={e.id}
              className={`btn btn-sm ${selectedCourse === e.courseId ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-pill)' }}
              onClick={() => setSelectedCourse(e.courseId)}>
              Course #{e.courseId}
            </motion.button>
          ))}
        </div>
      )}

      {!selectedCourse && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>📝</div>
          <h3 style={{ marginBottom: 8 }}>No Enrolled Courses</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Enroll in a course to access quizzes.</p>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 20 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {quizzes.map((quiz, i) => (
            <motion.div key={quiz.id} className="card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }} whileHover={{ y: -5, boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.4, marginBottom: 6 }}>{quiz.title}</div>
                {quiz.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{quiz.description}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <span className="badge badge-purple">📝 {quiz.questions?.length || '?'} questions</span>
                <span className="badge badge-orange">🎯 Pass: {quiz.passingScore || 70}%</span>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="btn btn-primary" style={{ width: '100%' }}
                onClick={() => handleStartQuiz(quiz)}>
                ▶ Start Quiz
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}

      {selectedCourse && !isLoading && quizzes.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
          <h3>No quizzes available</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>No quizzes have been created for this course yet.</p>
        </div>
      )}

      <AnimatePresence>
        {activeQuiz && quizQuestions.length > 0 && (
          <QuizRunner
            quiz={activeQuiz}
            questions={quizQuestions}
            onClose={() => { setActiveQuiz(null); setQuizQuestions([]); refetch(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

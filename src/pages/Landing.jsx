import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  CirclePlay,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { courseAPI } from '../services/api';
import heroImage from '../assets/landingPage-img.jpg';

const HERO_WORDS = ['clear progress', 'confident teams', 'better outcomes', 'organized learning'];

const PLATFORM_METRICS = [
  { value: 50000, suffix: '+', label: 'Students' },
  { value: 1200, suffix: '+', label: 'Courses' },
  { value: 320, suffix: '+', label: 'Instructors' },
];

const QUICK_FEATURES = [
  { icon: Layers3, title: 'Structured courses' },
  { icon: ClipboardCheck, title: 'Assessments built in' },
  { icon: ShieldCheck, title: 'Verified teaching' },
];

const FAQS = [
  {
    question: 'Free and paid courses both supported?',
    answer: 'Yes. Learners can browse and enroll in both free and paid courses inside the same experience.',
  },
  {
    question: 'Is it only for students?',
    answer: 'No. EduLearn fits students, instructors, institutes, and training teams.',
  },
  {
    question: 'Does the redesign change functionality?',
    answer: 'No. This is a UI pass only, so your existing authentication, routing, and APIs stay intact.',
  },
];

const FOOTER_LINKS = {
  platform: ['Courses', 'Highlights', 'FAQ'],
  account: ['Log In', 'Create Account', 'Become Instructor'],
  categories: ['Business', 'Healthcare', 'Languages', 'Finance'],
};

const fallbackCourses = [
  { id: 1, title: 'Business Communication', category: 'Business', level: 'Intermediate', price: 1299, rating: 4.8, studentsCount: 12400, duration: '28h', instructorName: 'Maya Chen' },
  { id: 2, title: 'Patient Care Foundations', category: 'Healthcare', level: 'Beginner', price: 999, rating: 4.9, studentsCount: 9800, duration: '32h', instructorName: 'Sofia Rivera' },
  { id: 3, title: 'English for Professionals', category: 'Languages', level: 'All Levels', price: 0, rating: 4.7, studentsCount: 5600, duration: '24h', instructorName: 'Noah Bell' },
  { id: 4, title: 'Finance for Managers', category: 'Finance', level: 'Intermediate', price: 1499, rating: 4.6, studentsCount: 7200, duration: '30h', instructorName: 'Ishaan Rao' },
];

function isVerifiedInstructorCourse(course) {
  return course.instructorVerified === true || course.instructorVerificationStatus === 'APPROVED';
}

function formatMetric(value, suffix = '') {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K${suffix}`;
  }
  return `${value}${suffix}`;
}

function CountUp({ target, suffix, label }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frameId;
    const startTime = performance.now();
    const duration = 1000;

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplay(Math.round(target * progress));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [target]);

  return (
    <div className="landing-reboot-metric-card">
      <strong>{formatMetric(display, suffix)}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const [faqOpen, setFaqOpen] = useState(0);
  const [category, setCategory] = useState('All');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('edulearn_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['landing-featured-courses'],
    queryFn: () => courseAPI.getFeatured().then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('edulearn_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroWordIndex((current) => (current + 1) % HERO_WORDS.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, []);

  const displayCourses = courses.length ? courses.slice(0, 4) : fallbackCourses;
  const categories = ['All', ...new Set(displayCourses.map((course) => course.category).filter(Boolean))];
  const filteredCourses = category === 'All' ? displayCourses : displayCourses.filter((course) => course.category === category);
  const authState = { fromLanding: true };

  return (
    <div className="landing-reboot landing-reboot-compact">
      <nav className="landing-reboot-nav">
        <div className="container landing-reboot-nav-inner">
          <Link to="/" className="landing-reboot-brand" aria-label="EduLearn home">
            <span className="landing-reboot-brand-mark"><GraduationCap size={22} /></span>
            <span className="landing-reboot-brand-text">EduLearn</span>
          </Link>

          <div className="landing-reboot-links">
            <a href="#courses">Courses</a>
            <a href="#highlights">Highlights</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="landing-reboot-actions">
            <button type="button" className="theme-toggle" onClick={() => setIsDark((current) => !current)} aria-label="Toggle theme">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/login" state={authState} className="landing-reboot-link-btn">Log In</Link>
            <Link to="/register" state={authState} className="landing-reboot-primary-btn">Start</Link>
          </div>

          <button
            type="button"
            className="landing-reboot-menu"
            onClick={() => setMobileNavOpen((current) => !current)}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className={`landing-reboot-mobile ${mobileNavOpen ? 'open' : ''}`}>
          <a href="#courses" onClick={() => setMobileNavOpen(false)}>Courses</a>
          <a href="#highlights" onClick={() => setMobileNavOpen(false)}>Highlights</a>
          <a href="#faq" onClick={() => setMobileNavOpen(false)}>FAQ</a>
          <div className="landing-reboot-mobile-actions">
            <button type="button" className="theme-toggle" onClick={() => setIsDark((current) => !current)}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />} Theme
            </button>
            <Link to="/login" state={authState}>Log In</Link>
            <Link to="/register" state={authState}>Start</Link>
          </div>
        </div>
      </nav>

      <header className="landing-reboot-hero">
        <div className="container landing-reboot-hero-grid">
          <motion.div
            className="landing-reboot-copy"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="landing-reboot-kicker">
              <Sparkles size={15} />
              Simple, modern LMS
            </div>
            <h1>
              Learning that feels calm,
              <br />
              <span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={HERO_WORDS[heroWordIndex]}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.28 }}
                  >
                    {HERO_WORDS[heroWordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>
            <p>Courses, progress, payments, discussion, and teaching tools in one clean experience.</p>
            <div className="landing-reboot-hero-actions">
              <Link to="/register" state={authState} className="landing-reboot-primary-btn">
                Start Learning <ArrowRight size={16} />
              </Link>
              <Link to="/register" state={authState} className="landing-reboot-secondary-btn">
                Teach on EduLearn <BriefcaseBusiness size={16} />
              </Link>
            </div>
            <div className="landing-reboot-proof">
              <span><BadgeCheck size={16} /> Verified</span>
              <span><CirclePlay size={16} /> Guided</span>
              <span><TrendingUp size={16} /> Progress</span>
            </div>
          </motion.div>

          <motion.div
            className="landing-reboot-visual landing-reboot-hero-media"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <div className="landing-reboot-image-card">
              <img src={heroImage} alt="Student and teacher learning together" className="landing-reboot-hero-image" />
            </div>

            <div className="landing-reboot-mini-card landing-reboot-mini-card-top">
              <strong>24 live courses</strong>
              <span>Across top categories</span>
            </div>

            <div className="landing-reboot-mini-card landing-reboot-mini-card-bottom">
              <strong>4.8 average rating</strong>
              <span>Trusted by learners</span>
            </div>
          </motion.div>
        </div>
      </header>

      <section className="landing-reboot-metrics">
        <div className="container landing-reboot-metrics-grid landing-reboot-metrics-grid-compact">
          {PLATFORM_METRICS.map((metric) => (
            <CountUp key={metric.label} target={metric.value} suffix={metric.suffix} label={metric.label} />
          ))}
        </div>
      </section>

      <section id="courses" className="landing-reboot-section landing-reboot-section-contrast landing-reboot-section-tight">
        <div className="container">
          <div className="landing-reboot-section-head light">
            <span>Courses</span>
            <h2>Clean course cards. Quick decisions.</h2>
            <p>Browse by category and enroll faster.</p>
          </div>

          <div className="landing-reboot-catalog-actions">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`landing-reboot-chip ${item === category ? 'active' : ''}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="landing-reboot-course-grid landing-reboot-course-grid-wide">
            {filteredCourses.map((course, index) => (
              <motion.article
                key={course.id}
                className="landing-reboot-course-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.06 }}
                onClick={() => navigate('/register', { state: authState })}
              >
                <div className="landing-reboot-course-top">
                  <span>{course.category || 'Course'}</span>
                  <div><Star size={14} fill="currentColor" /> {course.rating || 'New'}</div>
                </div>
                <h3>{course.title}</h3>
                <p>By {course.instructorName || 'EduLearn Instructor'}</p>
                <div className="landing-reboot-course-meta">
                  <span><Users size={14} /> {(course.studentsCount || 0).toLocaleString()}</span>
                  <span><BookOpen size={14} /> {course.duration || 'Self paced'}</span>
                  <span><BadgeCheck size={14} /> {isVerifiedInstructorCourse(course) ? 'Verified' : course.level || 'Open'}</span>
                </div>
                <div className="landing-reboot-course-bottom">
                  <strong>{Number(course.price || 0) === 0 ? 'Free' : `Rs. ${Number(course.price || 0).toLocaleString()}`}</strong>
                  <button type="button">
                    Enroll <ArrowRight size={14} />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="highlights" className="landing-reboot-section landing-reboot-section-tight">
        <div className="container">
          <div className="landing-reboot-feature-grid">
            {QUICK_FEATURES.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  className="landing-reboot-feature-card"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <div className="landing-reboot-role-icon">
                    <Icon size={22} />
                  </div>
                  <h3>{item.title}</h3>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="landing-reboot-section landing-reboot-section-tight">
        <div className="container landing-reboot-faq-grid landing-reboot-faq-grid-compact">
          <div className="landing-reboot-section-head">
            <span>FAQ</span>
            <h2>Short answers.</h2>
            <p>Everything important, without too much text.</p>
          </div>

          <div className="landing-reboot-faq-list">
            {FAQS.map((item, index) => {
              const open = faqOpen === index;
              return (
                <div key={item.question} className={`landing-reboot-faq-item ${open ? 'open' : ''}`}>
                  <button type="button" onClick={() => setFaqOpen(open ? -1 : index)}>
                    <span>{item.question}</span>
                    <ChevronDown size={18} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        className="landing-reboot-faq-answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                      >
                        <p>{item.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-reboot-section landing-reboot-section-tight">
        <div className="container">
          <div className="landing-reboot-cta-band">
            <div>
              <span className="landing-reboot-kicker">Get started</span>
              <h2>Start learning with a cleaner experience.</h2>
            </div>
            <div className="landing-reboot-cta-actions">
              <Link to="/register" state={authState} className="landing-reboot-primary-btn">Create account</Link>
              <Link to="/login" state={authState} className="landing-reboot-secondary-btn">Log in</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-reboot-footer">
        <div className="container landing-reboot-footer-grid landing-reboot-footer-grid-rich">
          <div className="landing-reboot-footer-brand">
            <div className="landing-reboot-brand">
              <span className="landing-reboot-brand-mark"><GraduationCap size={20} /></span>
              <span className="landing-reboot-brand-text">EduLearn</span>
            </div>
            <p>Simple learning. Better structure. Built for students, instructors, and training teams.</p>
            <div className="landing-reboot-footer-badges">
              <span><BadgeCheck size={14} /> Verified courses</span>
              <span><Users size={14} /> Active learners</span>
              <span><BookOpen size={14} /> Guided learning</span>
            </div>
          </div>
          <div>
            <b>Platform</b>
            <a href="#courses">{FOOTER_LINKS.platform[0]}</a>
            <a href="#highlights">{FOOTER_LINKS.platform[1]}</a>
            <a href="#faq">{FOOTER_LINKS.platform[2]}</a>
          </div>
          <div>
            <b>Account</b>
            <Link to="/login" state={authState}>{FOOTER_LINKS.account[0]}</Link>
            <Link to="/register" state={authState}>{FOOTER_LINKS.account[1]}</Link>
            <Link to="/register" state={authState}>{FOOTER_LINKS.account[2]}</Link>
          </div>
          <div>
            <b>Categories</b>
            {FOOTER_LINKS.categories.map((item) => (
              <span key={item} className="landing-reboot-footer-text-link">{item}</span>
            ))}
          </div>
          <div>
            <b>Support</b>
            <span className="landing-reboot-footer-text-link">Help Center</span>
            <span className="landing-reboot-footer-text-link">Payments</span>
            <span className="landing-reboot-footer-text-link">Certificates</span>
          </div>
        </div>
        <div className="container landing-reboot-footer-bottom">
          <span>© 2026 EduLearn. All rights reserved.</span>
          <div className="landing-reboot-footer-bottom-links">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

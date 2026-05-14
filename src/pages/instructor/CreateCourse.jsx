import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  CircleDollarSign,
  ImagePlus,
  Layers3,
  Rocket,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { courseAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const CATEGORIES = ['Programming', 'Web Development', 'Data Science', 'AI & ML', 'Mobile Development', 'Cloud & DevOps', 'Design', 'Business', 'Marketing', 'Other'];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Other'];

export default function CreateCourse() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const thumbnailInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    level: LEVELS[0],
    category: CATEGORIES[0],
    language: LANGUAGES[0],
    price: 0,
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const thumbnailPreview = useMemo(() => {
    if (!thumbnailFile) return '';
    return URL.createObjectURL(thumbnailFile);
  }, [thumbnailFile]);

  useEffect(() => () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
  }, [thumbnailPreview]);

  const returnToPreviousRoute = () => {
    const fallbackRoute = '/instructor/courses';
    const fromRoute = location.state?.from;
    if (fromRoute) {
      navigate(fromRoute, { replace: true });
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackRoute, { replace: true });
  };

  const { mutate: createCourse, isPending } = useMutation({
    mutationFn: async data => {
      const response = await courseAPI.create(data);
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append('file', thumbnailFile);
        await courseAPI.uploadThumbnail(response.data.id, formData);
      }
      return response;
    },
    onSuccess: res => {
      toast.success('Course created successfully!');
      queryClient.invalidateQueries(['instructor-courses']);
      navigate(`/instructor/courses/${res.data.id}`);
    },
    onError: err => {
      toast.error(err.response?.data?.message || 'Failed to create course');
    },
  });

  const handleSubmit = event => {
    event.preventDefault();
    createCourse(form);
  };

  const checks = [
    { label: 'Course title', done: form.title.trim().length >= 6 },
    { label: 'Student promise', done: form.description.trim().length >= 30 },
    { label: 'Audience level', done: Boolean(form.level) },
    { label: 'Pricing selected', done: Number(form.price) >= 0 },
    { label: 'Thumbnail ready', done: Boolean(thumbnailFile) },
  ];
  const readiness = Math.round((checks.filter(check => check.done).length / checks.length) * 100);
  const dismissCreateCourse = returnToPreviousRoute;

  const modal = (
    <div className="studio-create-overlay" role="presentation" onClick={dismissCreateCourse}>
      <motion.div
        className="studio-create-modal"
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="studio-create-modal-header">
          <button className="studio-back-button" type="button" onClick={() => navigate('/instructor')}>
            <ArrowLeft size={17} aria-hidden="true" /> Dashboard
          </button>
          <div className="studio-create-modal-title">
            <div className="instructor-kicker">Course Launchpad</div>
            <h1>Create a course students can trust</h1>
          </div>
          <div className="studio-readiness">
            <span>Launch readiness</span>
            <strong>{readiness}%</strong>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${readiness}%` }} /></div>
          </div>
          <button type="button" className="studio-create-close" onClick={dismissCreateCourse} aria-label="Close create course window" title="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="studio-create-modal-copy">Package the core promise, level, pricing, and visual identity first. You will move into the content builder immediately after creation.</p>

        <div className="studio-create-grid">
          <form className="studio-create-form" onSubmit={handleSubmit}>
          <div className="studio-form-section">
            <div className="studio-form-heading">
              <BookOpenCheck size={20} aria-hidden="true" />
              <div>
                <h2>Course essentials</h2>
                <p>Use clear, outcome-driven language. This becomes the foundation of your course listing.</p>
              </div>
            </div>

            <label className="studio-field">
              <span>Course Title</span>
              <input
                className="form-input"
                placeholder="e.g. Data Analytics for Product Managers"
                required
                value={form.title}
                onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
              />
            </label>

            <label className="studio-field">
              <span>Student Promise</span>
              <textarea
                className="form-input"
                placeholder="Describe the outcome, target learner, and practical skills students will gain."
                rows={5}
                required
                value={form.description}
                onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
              />
            </label>
          </div>

          <div className="studio-form-section">
            <div className="studio-form-heading">
              <Layers3 size={20} aria-hidden="true" />
              <div>
                <h2>Positioning</h2>
                <p>Set the course level and price before building modules.</p>
              </div>
            </div>

            <div className="studio-two-col">
              <label className="studio-field">
                <span>Level</span>
                <select className="form-input form-select" value={form.level} onChange={event => setForm(current => ({ ...current, level: event.target.value }))}>
                  {LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>

              <label className="studio-field">
                <span>Price (Rs.)</span>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  required
                  value={form.price}
                  onChange={event => setForm(current => ({ ...current, price: Number(event.target.value) }))}
                />
              </label>
            </div>

            <div className="studio-two-col">
              <label className="studio-field">
                <span>Category</span>
                <select className="form-input form-select" value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))}>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </label>

              <label className="studio-field">
                <span>Language</span>
                <select className="form-input form-select" value={form.language} onChange={event => setForm(current => ({ ...current, language: event.target.value }))}>
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="studio-form-section">
            <div className="studio-form-heading">
              <ImagePlus size={20} aria-hidden="true" />
              <div>
                <h2>Course identity</h2>
                <p>A sharp 16:9 thumbnail helps the course feel ready before review.</p>
              </div>
            </div>

            <div className="studio-upload-row">
              <div className="studio-thumb-preview">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail preview" />
                ) : (
                  <div>
                    <UploadCloud size={30} aria-hidden="true" />
                    <span>16:9 preview</span>
                  </div>
                )}
              </div>
              <div>
                <button type="button" className="btn btn-secondary" onClick={() => thumbnailInputRef.current?.click()}>
                  <ImagePlus size={17} aria-hidden="true" /> {thumbnailFile ? 'Replace Thumbnail' : 'Upload Thumbnail'}
                </button>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={event => setThumbnailFile(event.target.files?.[0] || null)}
                />
                <p className="studio-upload-hint">{thumbnailFile ? thumbnailFile.name : 'Recommended 1280x720, JPG or PNG.'}</p>
              </div>
            </div>
          </div>

          <div className="studio-create-actions">
            <button type="button" className="btn btn-secondary" onClick={dismissCreateCourse}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? <><span className="spinner" /> Creating...</> : <><Rocket size={18} aria-hidden="true" /> Create and Build</>}
            </button>
          </div>
          </form>

          <aside className="studio-create-side">
          <div className="studio-preview-card">
            <div className="studio-preview-thumb">
              {thumbnailPreview ? <img src={thumbnailPreview} alt="" /> : <Sparkles size={34} aria-hidden="true" />}
            </div>
            <div className="studio-preview-body">
              <span className="badge badge-blue">{form.level}</span>
              <h3>{form.title || 'Your course title'}</h3>
              <p>{form.description || 'Your course promise will preview here as you type.'}</p>
              <div className="studio-preview-meta">
                <span><CircleDollarSign size={15} aria-hidden="true" /> {Number(form.price) > 0 ? `Rs. ${Number(form.price).toLocaleString()}` : 'Free'}</span>
                <span><Layers3 size={15} aria-hidden="true" /> Builder next</span>
              </div>
            </div>
          </div>

          <div className="studio-checklist-card">
            <h3>Review checklist</h3>
            {checks.map(check => (
              <div key={check.label} className={check.done ? 'done' : ''}>
                <CheckCircle2 size={17} aria-hidden="true" />
                <span>{check.label}</span>
              </div>
            ))}
          </div>
          </aside>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modal, document.body);
}

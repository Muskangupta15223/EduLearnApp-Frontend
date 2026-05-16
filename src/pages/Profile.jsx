import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Camera, Check, Edit3, Mail, ShieldCheck, Upload, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userAPI } from '../services/api';

function verificationTone(status) {
  if (status === 'APPROVED') return 'badge-green';
  if (status === 'PENDING') return 'badge-orange';
  if (status === 'REJECTED') return 'badge-red';
  return 'badge-blue';
}

export default function ProfilePage({ embedded }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verificationFile, setVerificationFile] = useState(null);
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const normalizeAvatarUrl = (url) => url?.trim() || '';

  useEffect(() => {
    if (!user?.id) return;

    userAPI.getProfile(user.id).then((res) => {
      const profile = res.data;
      if (!profile) return;

      const freshName = profile.fullName || profile.name || user.name || '';
      const freshBio = profile.bio || '';
      const freshAvatar = profile.avatarUrl || '';

      setName(freshName);
      setBio(freshBio);
      setAvatarUrl(freshAvatar);
      setAvatarFailed(false);
      updateUser({
        name: freshName,
        fullName: freshName,
        bio: freshBio,
        avatarUrl: freshAvatar,
        instructorVerificationStatus: profile.instructorVerificationStatus,
        governmentIdFileName: profile.governmentIdFileName,
        verificationComment: profile.verificationComment,
      });
    }).catch(() => {
      // Fall back to auth context if profile record has not been created yet.
    });
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Please log in again before saving your profile');
      return;
    }

    setSaving(true);
    try {
      const cleanAvatarUrl = normalizeAvatarUrl(avatarUrl);
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role || 'STUDENT',
        fullName: name,
        bio,
        avatarUrl: cleanAvatarUrl,
      };

      let savedProfile;
      try {
        const res = await userAPI.updateProfile(user.id, payload);
        savedProfile = res.data;
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error;
        }
        const res = await userAPI.createProfile(payload);
        savedProfile = res.data;
      }

      const savedName = savedProfile?.fullName || name;
      const savedBio = savedProfile?.bio ?? bio;
      const savedAvatarUrl = savedProfile?.avatarUrl ?? cleanAvatarUrl;
      setName(savedName);
      setBio(savedBio);
      setAvatarUrl(savedAvatarUrl);
      setAvatarFailed(false);
      updateUser({ name: savedName, fullName: savedName, bio: savedBio, avatarUrl: savedAvatarUrl });
      toast.success('Profile updated!');
      setEditing(false);
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.response?.data?.error;
      toast.error(message || `Failed to update profile${status ? ` (${status})` : ''}`);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await userAPI.uploadAvatar(user?.id, formData);
      const newUrl = res.data?.avatarUrl || '';
      setAvatarUrl(newUrl);
      setAvatarFailed(false);
      updateUser({ avatarUrl: newUrl });
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
    }
    setUploading(false);
    event.target.value = '';
  };

  const resetEdits = () => {
    setEditing(false);
    setName(user?.name || user?.fullName || '');
    setBio(user?.bio || '');
    setAvatarUrl(user?.avatarUrl || '');
    setAvatarFailed(false);
  };

  const submitVerification = async () => {
    if (!verificationFile) {
      toast.error('Choose a document before submitting verification');
      return;
    }

    setVerificationSubmitting(true);
    try {
      const form = new FormData();
      form.append('file', verificationFile);
      const { data } = await userAPI.submitInstructorVerification(user.id, form);
      updateUser({
        instructorVerificationStatus: data.instructorVerificationStatus,
        governmentIdFileName: data.governmentIdFileName,
        verificationComment: data.verificationComment,
      });
      setVerificationFile(null);
      toast.success('Verification request submitted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification submission failed');
    }
    setVerificationSubmitting(false);
  };

  const displayName = name || user?.name || user?.fullName || 'User';
  const verificationStatus = user?.instructorVerificationStatus || (user?.role === 'INSTRUCTOR' ? 'NOT_SUBMITTED' : 'NOT_REQUIRED');
  const displayAvatarUrl = normalizeAvatarUrl(avatarUrl);
  const showAvatarImage = displayAvatarUrl && !avatarFailed;
  const initial = displayName.charAt(0)?.toUpperCase() || '?';
  const roleLabel = user?.role || 'STUDENT';

  const profileFacts = useMemo(() => [
    { label: 'Email', value: user?.email || '-' },
    { label: 'Role', value: roleLabel },
    { label: 'Provider', value: user?.provider || 'LOCAL' },
    { label: 'Member ID', value: user?.id ? `#${user.id}` : '-' },
  ], [roleLabel, user?.email, user?.id, user?.provider]);

  return (
    <motion.div
      id="profile"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${embedded ? 'instructor-section' : ''} profile-shell`}
    >
      {!embedded ? (
        <div className="page-header">
          <h1 className="page-title profile-page-title">
            <User size={32} aria-hidden="true" />
            Profile
          </h1>
          <p className="page-subtitle">Manage your identity, profile details, and instructor verification from one organized workspace.</p>
        </div>
      ) : (
        <div className="instructor-section-header">
          <div>
            <div className="instructor-kicker">Account</div>
            <h2>Profile & Settings</h2>
          </div>
        </div>
      )}

      <section className="profile-hero-card card">
        <div className="profile-hero-main">
          <div className="profile-avatar-wrap">
            {showAvatarImage ? (
              <img
                src={displayAvatarUrl}
                alt={`${displayName} avatar`}
                onError={() => setAvatarFailed(true)}
                className="profile-avatar-image"
              />
            ) : (
              <div className="profile-avatar-fallback">{initial}</div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="profile-avatar-action"
              title="Change avatar"
              aria-label="Change avatar"
            >
              {uploading ? '...' : <Camera size={16} aria-hidden="true" />}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
          </div>

          <div className="profile-hero-copy">
            <div className="profile-eyebrow">Account Identity</div>
            <h2>{displayName}</h2>
            <div className="profile-hero-meta">
              <span><Mail size={15} aria-hidden="true" /> {user?.email || '-'}</span>
              <span className={`badge ${roleLabel === 'ADMIN' ? 'badge-purple' : roleLabel === 'INSTRUCTOR' ? 'badge-blue' : 'badge-green'}`}>{roleLabel}</span>
              {roleLabel === 'INSTRUCTOR' && verificationStatus === 'APPROVED' && (
                <span className="verified-instructor-badge"><BadgeCheck size={14} /> Verified Instructor</span>
              )}
            </div>
            <p>{bio || 'Add a short professional summary so students, peers, and admins understand who you are at a glance.'}</p>
          </div>
        </div>

        <div className="profile-hero-side">
          {roleLabel !== 'ADMIN' && (
            <div className="profile-hero-chip">
              <span>Verification</span>
              <strong>{verificationStatus.replaceAll('_', ' ')}</strong>
            </div>
          )}
        </div>
      </section>

      <div className="profile-layout-grid">
        <section className="card profile-editor-card">
          <div className="profile-card-head">
            <div>
              <div className="profile-eyebrow">Editable Details</div>
              <h3>Account Details</h3>
            </div>
            {!editing ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                <Edit3 size={15} aria-hidden="true" /> Edit
              </button>
            ) : (
              <div className="profile-head-actions">
                <button className="btn btn-secondary btn-sm" onClick={resetEdits}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : <><Check size={15} aria-hidden="true" /> Save</>}
                </button>
              </div>
            )}
          </div>

          <div className="profile-form-grid">
            <div className="profile-field-block">
              <label className="form-label">Full Name</label>
              {editing ? (
                <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} />
              ) : (
                <div className="profile-readonly-field">{displayName}</div>
              )}
            </div>

            <div className="profile-field-block">
              <label className="form-label">Email Address</label>
              <div className="profile-readonly-field profile-readonly-inline">
                <span>{user?.email || '-'}</span>
                <span className="badge badge-green">Verified</span>
              </div>
            </div>

            <div className="profile-field-block profile-field-span">
              <label className="form-label">Profile Image URL</label>
              {editing ? (
                <input
                  className="form-input"
                  type="text"
                  placeholder="Paste a direct image URL, for example https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(event) => {
                    setAvatarUrl(event.target.value);
                    setAvatarFailed(false);
                  }}
                />
              ) : (
                <div className="profile-readonly-field profile-url-field">
                  {avatarUrl || 'No profile image URL set.'}
                </div>
              )}
              {displayAvatarUrl && avatarFailed && (
                <p className="profile-helper-text">
                  This link could not be displayed as an image. Use a direct image file URL or upload a file.
                </p>
              )}
            </div>

            <div className="profile-field-block profile-field-span">
              <label className="form-label">Bio</label>
              {editing ? (
                <textarea
                  className="form-input"
                  rows={5}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Tell us about yourself..."
                  style={{ resize: 'vertical' }}
                />
              ) : (
                <div className="profile-readonly-field profile-bio-field">
                  {bio || 'No bio added yet.'}
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="profile-sidebar-stack">
          <section className="card profile-summary-card">
            <div className="profile-card-head">
              <div>
                <div className="profile-eyebrow">Snapshot</div>
                <h3>Account Overview</h3>
              </div>
            </div>
            <div className="profile-facts-list">
              {profileFacts.map((fact) => (
                <div key={fact.label} className="profile-fact-row">
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="card profile-summary-card">
            <div className="profile-card-head">
              <div>
                <div className="profile-eyebrow">Visibility</div>
                <h3>Public Facing</h3>
              </div>
            </div>
            <div className="profile-visibility-box">
              <strong>{displayName}</strong>
              <span>{bio || 'Your bio will appear here once added.'}</span>
              {roleLabel === 'INSTRUCTOR' && verificationStatus === 'APPROVED' && (
                <div className="verified-instructor-badge"><BadgeCheck size={14} /> Trusted instructor badge active</div>
              )}
            </div>
          </section>
        </aside>

        {roleLabel === 'INSTRUCTOR' && (
          <section className="card profile-verification-card">
            <div className="profile-card-head">
              <div>
                <div className="profile-eyebrow">Instructor Trust</div>
                <h3>Verified Instructor Application</h3>
                <p className="profile-section-copy">Submit identity proof or professional certificates for admin review. Approved instructors receive a verified badge across the catalog and course experience.</p>
              </div>
              <span className={`badge ${verificationTone(verificationStatus)}`}>{verificationStatus}</span>
            </div>

            <div className="profile-verification-grid">
              <div className="profile-verification-dropzone">
                <ShieldCheck size={28} aria-hidden="true" />
                <strong>{user?.governmentIdFileName || verificationFile?.name || 'Identity document or certificate'}</strong>
                <span>PDF, PNG, JPG, JPEG, or WebP. Stored privately and reviewed by admins only.</span>
                <label className="btn btn-secondary btn-sm">
                  <Upload size={15} aria-hidden="true" /> Choose File
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    onChange={(event) => setVerificationFile(event.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div className="profile-verification-panel">
                <div className="profile-fact-row">
                  <span>Current status</span>
                  <strong>{verificationStatus}</strong>
                </div>
                <div className="profile-fact-row profile-fact-column">
                  <span>Admin remarks</span>
                  <strong>{user?.verificationComment || 'No remarks yet.'}</strong>
                </div>
                <button className="btn btn-primary" disabled={verificationSubmitting || !verificationFile} onClick={submitVerification}>
                  {verificationSubmitting ? 'Submitting...' : 'Apply for Verification'}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}

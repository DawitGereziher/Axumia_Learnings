'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import AvatarUploader from '@/components/settings/AvatarUploader';
import SecurityPanel from '@/components/settings/SecurityPanel';
import VideoIntegrationPanel from '@/components/settings/VideoIntegrationPanel';
import DocumentUploader from '@/components/DocumentUploader';
import { User, Brain, DollarSign, Globe, Lock, Save, Loader2, Plus, X, Coins, Link2, ShieldCheck, FileCheck, Star } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Tab = 'profile' | 'skills' | 'rates' | 'social' | 'video' | 'security' | 'kyc';

const LANGUAGE_OPTIONS = ['Amharic', 'English', 'Afaan Oromo', 'Tigrinya', 'Somali', 'Arabic', 'French'];
const SUBJECT_SUGGESTIONS = [
  'Mathematics','Physics','Chemistry','Biology','Computer Science','Python',
  'JavaScript','React','Machine Learning','Data Analysis','English','History',
  'Economics','Statistics','Algebra','Calculus','Web Development','Mobile Development',
];

export default function InstructorSettingsPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',   label: t.settings?.tabProfile || 'Profile',        icon: <User size={16} /> },
    { id: 'skills',    label: t.settings?.tabSkills  || 'Skills',         icon: <Brain size={16} /> },
    { id: 'rates',     label: t.settings?.tabRates   || 'Rates',          icon: <DollarSign size={16} /> },
    { id: 'social',    label: t.settings?.tabSocial  || 'Social Links',   icon: <Globe size={16} /> },
    { id: 'video',     label: t.settings?.tabVideo   || 'Video Integration', icon: <Link2 size={16} /> },
    { id: 'kyc',       label: 'KYC Verification',                         icon: <ShieldCheck size={16} /> },
    { id: 'security',  label: t.settings?.tabSecurity|| 'Security',       icon: <Lock size={16} /> },
  ];

  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileForm, setProfileForm] = useState({
    first_name: '', last_name: '', bio: '', headline: '', location: '', experience_years: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [ratesForm, setRatesForm] = useState({ hourly_rate: '' });
  const [socialForm, setSocialForm] = useState({
    website_url: '', linkedin_url: '', twitter_url: '', youtube_url: '',
  });
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [kycDocs, setKycDocs] = useState<string[]>([]);
  const [kycStatus, setKycStatus] = useState<string>('pending');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'instructor' && user.role !== 'admin') router.push('/settings/student');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    authFetch(`${API}/api/users/me`)
      .then(r => r.ok && r.json())
      .then(d => {
        if (!d) return;
        setProfile(d);
        setProfileForm({
          first_name: d.first_name || '',
          last_name:  d.last_name  || '',
          bio:        d.instructorProfile?.bio || '',
          headline:   d.instructorProfile?.headline || '',
          location:   d.instructorProfile?.location || '',
          experience_years: d.instructorProfile?.experience_years?.toString() || '',
        });
        setSkills(d.instructorProfile?.skills || []);
        setLanguages(d.instructorProfile?.languages || []);
        setRatesForm({ hourly_rate: d.instructorProfile?.hourly_rate?.toString() || '' });
        setSocialForm({
          website_url:  d.instructorProfile?.website_url  || '',
          linkedin_url: d.instructorProfile?.linkedin_url || '',
          twitter_url:  d.instructorProfile?.twitter_url  || '',
          youtube_url:  d.instructorProfile?.youtube_url  || '',
        });
        setCoverImage(d.instructorProfile?.cover_image || null);
        setProfileImage(d.instructorProfile?.profile_image || d.image || null);
        setKycDocs(d.instructorProfile?.kyc_docs || []);
        setKycStatus(d.instructorProfile?.kyc_status || 'pending');
      })
      .catch(() => {});
  }, [user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const saveKyc = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/users/me/instructor-profile/rich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kyc_docs: kycDocs, kyc_status: 'submitted' }),
      });
      setKycStatus('submitted');
      showMessage('success', 'KYC documents submitted for review.');
    } catch { showMessage('error', 'Failed to submit KYC documents.'); }
    finally { setSaving(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          image: profileImage || undefined,
        }),
      });
      await authFetch(`${API}/api/users/me/instructor-profile/rich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: profileForm.bio, headline: profileForm.headline,
          location: profileForm.location,
          experience_years: profileForm.experience_years ? parseInt(profileForm.experience_years) : undefined,
          cover_image:   coverImage   ?? undefined,
          profile_image: profileImage ?? undefined,
        }),
      });
      showMessage('success', 'Profile saved successfully.');
    } catch { showMessage('error', 'Failed to save profile.'); }
    finally { setSaving(false); }
  };

  const saveSkills = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/users/me/instructor-profile/rich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills, languages }),
      });
      showMessage('success', 'Skills & languages saved.');
    } catch { showMessage('error', 'Failed to save skills.'); }
    finally { setSaving(false); }
  };

  const saveRates = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/users/me/instructor-profile/rich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourly_rate: parseFloat(ratesForm.hourly_rate) }),
      });
      showMessage('success', 'Rates updated.');
    } catch { showMessage('error', 'Failed to save rates.'); }
    finally { setSaving(false); }
  };

  const saveSocial = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/users/me/instructor-profile/rich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(socialForm),
      });
      showMessage('success', 'Social links saved.');
    } catch { showMessage('error', 'Failed to save links.'); }
    finally { setSaving(false); }
  };

  const addSkill = (s: string) => {
    const trimmed = s.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 20) {
      setSkills(prev => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (s: string) => setSkills(prev => prev.filter(x => x !== s));

  const toggleLanguage = (lang: string) =>
    setLanguages(prev => prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1.1rem',
    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
    borderRadius: 12, color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
    transition: 'border-color 0.15s',
  };

  if (loading || !user) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--pine-deep)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ paddingTop: '80px', flex: 1 }}>
        <div className="container" style={{ maxWidth: 1060, padding: '2rem 1.5rem 5rem' }}>
          
          {/* ── Figma Hero Banner Container ────────────────────────── */}
          <div style={{
            background: 'var(--pine-deep)',
            borderRadius: 24,
            padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(12, 59, 46, 0.2)',
            marginBottom: '2.5rem',
          }}>
            <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -50, left: '20%', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.04)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.3rem 0.9rem', fontSize: '0.72rem',
                fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '0.85rem',
              }}>
                E D U C A T O R  P O R T A L
              </div>

              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', lineHeight: 1.2,
                color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.02em',
              }}>
                {t.settings?.titleInstructor || 'Instructor Settings'}
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.92rem' }}>
                {user.email} · <span style={{ color: '#fde047', fontWeight: 700 }}>{t.settings?.instructorRole || 'Verified Instructor Profile'}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: '2rem', alignItems: 'start' }}>
            {/* Tab sidebar */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: '88px' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  id={`settings-tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    padding: '0.75rem 1.1rem', borderRadius: 999, border: '1px solid',
                    background: tab === t.id ? 'var(--pine-deep)' : 'transparent',
                    borderColor: tab === t.id ? 'var(--pine-deep)' : 'transparent',
                    color: tab === t.id ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: tab === t.id ? 700 : 500,
                    fontSize: '0.88rem', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.15s',
                    boxShadow: tab === t.id ? '0 4px 12px rgba(12, 59, 46, 0.2)' : 'none',
                  }}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </nav>

            {/* Content panel */}
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 24, padding: 'clamp(1.5rem, 3vw, 2.5rem)', minHeight: 480,
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            }}>
              {message && (
                <div style={{
                  background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: message.type === 'success' ? '#34d399' : '#fca5a5',
                  borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1.5rem',
                }}>
                  {message.text}
                </div>
              )}

              {/* ── Profile Tab ──────────────────────────────────────────── */}
              {tab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t.settings?.profileInfo || 'Profile Information'}</h2>

                  {/* Cover Photo */}
                  <div>
                    <AvatarUploader
                      label="Cover Photo"
                      currentUrl={coverImage}
                      aspectRatio="3:1"
                      shape="rect"
                      onUpload={(key, url) => setCoverImage(url || key)}
                    />
                  </div>

                  {/* Profile Pic + Name */}
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <AvatarUploader
                      label="Profile Photo"
                      currentUrl={profileImage}
                      aspectRatio="1:1"
                      shape="circle"
                      onUpload={(key, url) => setProfileImage(url || key)}
                    />
                    <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>First Name</label>
                          <input id="inst-first-name" type="text" style={inputStyle}
                            value={profileForm.first_name}
                            onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                            placeholder="First name" />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>Last Name</label>
                          <input id="inst-last-name" type="text" style={inputStyle}
                            value={profileForm.last_name}
                            onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                            placeholder="Last name" />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>Professional Headline</label>
                        <input id="inst-headline" type="text" style={inputStyle}
                          value={profileForm.headline}
                          onChange={e => setProfileForm(p => ({ ...p, headline: e.target.value }))}
                          placeholder="e.g. Senior Software Engineer & CS Educator" maxLength={100} />
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
                      Bio <span style={{ color: '#475569', fontWeight: 400 }}>({profileForm.bio.length}/800)</span>
                    </label>
                    <textarea id="inst-bio" style={{ ...inputStyle, resize: 'vertical', minHeight: 130 }}
                      value={profileForm.bio}
                      onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell students about your background, teaching style, and what makes you unique..."
                      maxLength={800} rows={5} />
                  </div>

                  {/* Location & Experience */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>Location</label>
                      <input id="inst-location" type="text" style={inputStyle}
                        value={profileForm.location}
                        onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))}
                        placeholder="e.g. Addis Ababa, Ethiopia" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>Years of Experience</label>
                      <input id="inst-experience" type="number" style={inputStyle}
                        value={profileForm.experience_years}
                        onChange={e => setProfileForm(p => ({ ...p, experience_years: e.target.value }))}
                        placeholder="e.g. 5" min="0" max="60" />
                    </div>
                  </div>

                  <button id="save-profile-btn"
                    onClick={saveProfile} disabled={saving}
                    style={{
                      background: 'var(--pine-deep)', color: '#ffffff',
                      border: 'none', borderRadius: 999,
                      padding: '0.75rem 1.75rem', fontWeight: 700, fontSize: '0.9rem',
                      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(12, 59, 46, 0.2)',
                      width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      transition: 'all 0.2s',
                    }}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              )}

              {/* ── Skills & Languages Tab ──────────────────────────────── */}
              {tab === 'skills' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Skills & Expertise</h2>

                  {/* Skills */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
                      Skills <span style={{ color: '#475569', fontWeight: 400 }}>({skills.length}/20)</span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        id="skill-input"
                        type="text"
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="Add a skill (e.g. Python)..."
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); }}}
                        list="skill-suggestions"
                      />
                      <datalist id="skill-suggestions">
                        {SUBJECT_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                      </datalist>
                      <button id="add-skill-btn" onClick={() => addSkill(skillInput)}
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '0 1rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Plus size={15} /> Add
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {skills.map(s => (
                        <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 999, padding: '0.35rem 0.75rem', fontSize: '0.82rem', fontWeight: 600 }}>
                          {s}
                          <button onClick={() => removeSkill(s)} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', lineHeight: 1, padding: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                        </span>
                      ))}
                      {skills.length === 0 && <p style={{ color: '#475569', fontSize: '0.85rem' }}>No skills added yet.</p>}
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>Teaching Languages</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {LANGUAGE_OPTIONS.map(lang => (
                        <button
                          key={lang}
                          id={`lang-${lang.replace(/\s/g, '-')}`}
                          onClick={() => toggleLanguage(lang)}
                          style={{
                            padding: '0.45rem 0.9rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                            background: languages.includes(lang) ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                            color: languages.includes(lang) ? '#34d399' : '#94a3b8',
                            border: `1px solid ${languages.includes(lang) ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            transition: 'all 0.15s',
                          }}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button id="save-skills-btn"
                    onClick={saveSkills} disabled={saving}
                    style={{
                      background: 'var(--pine-deep)', color: '#ffffff',
                      border: 'none', borderRadius: 999,
                      padding: '0.75rem 1.75rem', fontWeight: 700, fontSize: '0.9rem',
                      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(12, 59, 46, 0.2)',
                      width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      transition: 'all 0.2s',
                    }}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save Skills & Languages'}
                  </button>
                </div>
              )}

              {/* ── Rates Tab ───────────────────────────────────────────── */}
              {tab === 'rates' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Rates & Earnings</h2>

                  <div style={{ maxWidth: 360 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                      Hourly Rate (ETB)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#d4af37', fontWeight: 700, fontSize: '0.9rem', pointerEvents: 'none' }}>ETB</span>
                      <input id="inst-rate" type="number"
                        style={{ ...inputStyle, paddingLeft: '3.2rem' }}
                        value={ratesForm.hourly_rate}
                        onChange={e => setRatesForm({ hourly_rate: e.target.value })}
                        min="50" step="50" placeholder="e.g. 500" />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.5rem' }}>
                      Used for live tutoring sessions and help request bids.
                    </p>
                  </div>

                  {/* Earnings summary */}
                  <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 14, padding: '1.25rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Coins size={18} /> Earnings Overview
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', fontSize: '0.88rem' }}>
                      {[
                        { label: 'Total Students', value: profile?.instructorProfile?.total_students ?? 0 },
                        { label: 'Total Sessions', value: profile?.instructorProfile?.total_sessions ?? 0 },
                        { label: 'Avg Rating', value: (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Star size={14} fill="#f59e0b" color="#f59e0b" /> {profile?.instructorProfile?.avg_rating ?? '0.0'}
                          </span>
                        ) },
                      ].map(stat => (
                        <div key={stat.label}>
                          <div style={{ color: '#475569', fontSize: '0.72rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem' }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button id="save-rates-btn"
                    onClick={saveRates} disabled={saving}
                    style={{
                      background: 'var(--pine-deep)', color: '#ffffff',
                      border: 'none', borderRadius: 999,
                      padding: '0.75rem 1.75rem', fontWeight: 700, fontSize: '0.9rem',
                      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(12, 59, 46, 0.2)',
                      width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      transition: 'all 0.2s',
                    }}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save Rate'}
                  </button>
                </div>
              )}

              {/* ── Social Links Tab ────────────────────────────────────── */}
              {tab === 'social' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Social & Web Links</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', maxWidth: 520 }}>
                    {[
                      { key: 'website_url',  label: 'Website',  placeholder: 'https://yoursite.com' },
                      { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourprofile' },
                      { key: 'twitter_url',  label: 'Twitter / X', placeholder: 'https://twitter.com/yourhandle' },
                      { key: 'youtube_url',  label: 'YouTube',  placeholder: 'https://youtube.com/@yourchannel' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>{label}</label>
                        <input
                          id={`social-${key}`}
                          type="url"
                          style={inputStyle}
                          placeholder={placeholder}
                          value={(socialForm as any)[key]}
                          onChange={e => setSocialForm(p => ({ ...p, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <button id="save-social-btn"
                    onClick={saveSocial} disabled={saving}
                    style={{
                      background: 'var(--pine-deep)', color: '#ffffff',
                      border: 'none', borderRadius: 999,
                      padding: '0.75rem 1.75rem', fontWeight: 700, fontSize: '0.9rem',
                      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(12, 59, 46, 0.2)',
                      width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      transition: 'all 0.2s',
                    }}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save Links'}
                  </button>
                </div>
              )}

              {/* ── Video Integration Tab ─────────────────────────────────── */}
              {tab === 'video' && <VideoIntegrationPanel />}

              {/* ── KYC Verification Tab ───────────────────────────────── */}
              {tab === 'kyc' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <div>
                    <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Instructor Identity Verification (KYC)</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      Upload identity documents (National ID, Passport, or Teaching License) to get verified as an active instructor. Documents are stored in secure private storage.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Current Status:</div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: 20,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: kycStatus === 'approved' ? 'rgba(16,185,129,0.2)' : kycStatus === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                      color: kycStatus === 'approved' ? '#34d399' : kycStatus === 'rejected' ? '#fca5a5' : '#fbbf24',
                    }}>
                      {kycStatus}
                    </span>
                  </div>

                  <div>
                    <DocumentUploader
                      label="Upload Identity / Certification Document"
                      bucket="private"
                      folder="kyc"
                      onUpload={(key) => {
                        if (!kycDocs.includes(key)) {
                          setKycDocs(prev => [...prev, key]);
                        }
                      }}
                    />
                  </div>

                  {kycDocs.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                        Uploaded Documents ({kycDocs.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {kycDocs.map((docKey, idx) => (
                          <div key={docKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                            <span style={{ fontSize: '0.85rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <FileCheck size={16} color="#34d399" /> Document #{idx + 1}
                            </span>
                            <button
                              onClick={() => setKycDocs(prev => prev.filter(k => k !== docKey))}
                              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={saveKyc}
                    disabled={saving || kycDocs.length === 0}
                    style={{
                      background: 'var(--pine-deep)', color: '#ffffff',
                      border: 'none', borderRadius: 999,
                      padding: '0.75rem 1.75rem', fontWeight: 700, fontSize: '0.9rem',
                      cursor: (saving || kycDocs.length === 0) ? 'not-allowed' : 'pointer',
                      opacity: (saving || kycDocs.length === 0) ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(12, 59, 46, 0.2)',
                      width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {saving ? 'Submitting...' : 'Submit KYC Application'}
                  </button>
                </div>
              )}

              {/* ── Security Tab ────────────────────────────────────────── */}
              {tab === 'security' && <SecurityPanel />}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

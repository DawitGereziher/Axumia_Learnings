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
import Link from 'next/link';
import {
  User,
  Brain,
  DollarSign,
  Globe,
  Lock,
  Save,
  Loader2,
  Plus,
  X,
  Coins,
  Link2,
  ShieldCheck,
  FileCheck,
  Star,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText,
  Camera,
  Award,
  Check,
  RefreshCw,
  ExternalLink,
  Eye,
  Sparkles,
  Calendar,
  MessageSquare,
  BookOpen,
  MapPin,
  Clock,
  ArrowRight,
  TrendingUp,
  Percent,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Tab = 'profile' | 'skills' | 'rates' | 'social' | 'video' | 'kyc' | 'security';

const LANGUAGE_OPTIONS = ['Amharic', 'English', 'Afaan Oromo', 'Tigrinya', 'Somali', 'Arabic', 'French'];
const ETHIOPIAN_REGIONS = [
  'Addis Ababa', 'Oromia', 'Amhara', 'Tigray', 'Sidama', 'Somali',
  'South Ethiopia', 'Central Ethiopia', 'South West Ethiopia',
  'Dire Dawa', 'Harari', 'Afar', 'Benishangul-Gumuz', 'Gambela',
];
const ID_TYPES = [
  { value: 'fayda_national_id', label: '🇪🇹 Fayda National ID (Recommended)' },
  { value: 'passport', label: 'Ethiopian Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'kebele_id', label: 'Resident / Kebele ID' },
];
const EDUCATION_LEVELS = [
  "Bachelor's Degree", "Master's Degree", "Doctorate / Ph.D.",
  "Higher Diploma", "Teaching Certificate / License", "Professional Certification",
];
const SUBJECT_SUGGESTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Python',
  'JavaScript', 'React', 'Machine Learning', 'Data Analysis', 'English', 'History',
  'Economics', 'Statistics', 'Algebra', 'Calculus', 'Web Development', 'Mobile Development',
];

const TIMEZONES = [
  { value: 'Africa/Addis_Ababa', label: '🇪🇹 East Africa Time (EAT, UTC+3) — Addis Ababa' },
  { value: 'UTC', label: '🌐 Coordinated Universal Time (UTC)' },
  { value: 'Europe/London', label: '🇬🇧 London (GMT/BST, UTC+0/+1)' },
  { value: 'America/New_York', label: '🇺🇸 US Eastern (EST/EDT, UTC-5/-4)' },
  { value: 'Asia/Dubai', label: '🇦🇪 Gulf Standard Time (GST, UTC+4)' },
];

export default function InstructorSettingsPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'profile',   label: t.settings?.tabProfile || 'Profile & Identity', icon: <User size={16} /> },
    { id: 'skills',    label: t.settings?.tabSkills  || 'Skills & Expertise',  icon: <Brain size={16} /> },
    { id: 'rates',     label: t.settings?.tabRates   || 'Rates & Earnings',    icon: <DollarSign size={16} /> },
    { id: 'social',    label: t.settings?.tabSocial  || 'Social & Web',        icon: <Globe size={16} /> },
    { id: 'video',     label: t.settings?.tabVideo   || 'Virtual Classroom',   icon: <Link2 size={16} /> },
    { id: 'kyc',       label: 'KYC & Fayda ID',                                icon: <ShieldCheck size={16} />, badge: 'REQUIRED' },
    { id: 'security',  label: t.settings?.tabSecurity|| 'Security & 2FA',      icon: <Lock size={16} /> },
  ];

  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    headline: '',
    location: '',
    timezone: 'Africa/Addis_Ababa',
    experience_years: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [ratesForm, setRatesForm] = useState({ hourly_rate: '500' });
  const [socialForm, setSocialForm] = useState({
    website_url: '',
    linkedin_url: '',
    twitter_url: '',
    youtube_url: '',
    github_url: '',
    telegram_handle: '',
  });
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // ── High-Security KYC & Fayda Verification State ──────────────────────
  const [kycStatus, setKycStatus] = useState<string>('pending');
  const [kycRejectionReason, setKycRejectionReason] = useState<string | null>(null);
  const [kycSubmittedAt, setKycSubmittedAt] = useState<string | null>(null);
  const [kycReviewedAt, setKycReviewedAt] = useState<string | null>(null);

  const [kycForm, setKycForm] = useState({
    legal_name: '',
    phone: '',
    date_of_birth: '',
    gender: 'Male',
    region: 'Addis Ababa',
    residential_address: '',
    country: 'Ethiopia',
    id_type: 'fayda_national_id',
    fayda_fan_number: '',
    tin_number: '',
    id_number: '',
    id_expiry: '',
    education_level: "Bachelor's Degree",
    institution: '',
    notes: '',
  });

  const [idFrontDoc, setIdFrontDoc] = useState<string | null>(null);
  const [idBackDoc, setIdBackDoc] = useState<string | null>(null);
  const [selfieDoc, setSelfieDoc] = useState<string | null>(null);
  const [certificateDoc, setCertificateDoc] = useState<string | null>(null);
  const [kycDocs, setKycDocs] = useState<string[]>([]);

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
        const inst = d.instructorProfile;
        const kd = (inst?.kyc_data as any) || {};

        setProfileForm({
          first_name: d.first_name || '',
          last_name:  d.last_name  || '',
          bio:        inst?.bio || '',
          headline:   inst?.headline || '',
          location:   inst?.location || '',
          timezone:   kd?.timezone || 'Africa/Addis_Ababa',
          experience_years: inst?.experience_years?.toString() || '',
        });
        setSkills(inst?.skills || []);
        setLanguages(inst?.languages || []);
        setRatesForm({ hourly_rate: inst?.hourly_rate?.toString() || '500' });
        setSocialForm({
          website_url:  inst?.website_url  || '',
          linkedin_url: inst?.linkedin_url || '',
          twitter_url:  inst?.twitter_url  || '',
          youtube_url:  inst?.youtube_url  || '',
          github_url:   kd?.github_url     || '',
          telegram_handle: kd?.telegram_handle || '',
        });
        setCoverImage(inst?.cover_image || null);
        setProfileImage(inst?.profile_image || d.image || null);

        // KYC fields
        setKycStatus(inst?.kyc_status || 'pending');
        setKycRejectionReason(inst?.kyc_rejection_reason || null);
        setKycSubmittedAt(inst?.kyc_submitted_at || null);
        setKycReviewedAt(inst?.kyc_reviewed_at || null);

        setKycForm({
          legal_name:          kd.legal_name          || `${d.first_name || ''} ${d.last_name || ''}`.trim(),
          phone:               kd.phone               || d.phone || '',
          date_of_birth:       kd.date_of_birth       || '',
          gender:              kd.gender              || 'Male',
          region:              kd.region              || 'Addis Ababa',
          residential_address: kd.residential_address || '',
          country:             kd.country             || 'Ethiopia',
          id_type:             kd.id_type             || 'fayda_national_id',
          fayda_fan_number:    inst?.fayda_fan_number || kd.fayda_fan_number || '',
          tin_number:          kd.tin_number          || '',
          id_number:           kd.id_number           || '',
          id_expiry:           kd.id_expiry           || '',
          education_level:     kd.education_level     || "Bachelor's Degree",
          institution:         kd.institution         || '',
          notes:               kd.notes               || '',
        });

        setIdFrontDoc(inst?.id_front_url || kd.id_front_doc || null);
        setIdBackDoc(inst?.id_back_url || kd.id_back_doc || null);
        setSelfieDoc(inst?.selfie_url || kd.selfie_doc || null);
        setCertificateDoc(kd.certificate_doc || null);
        setKycDocs(inst?.kyc_docs || []);
      })
      .catch(() => {});
  }, [user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4500);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: profileForm.first_name.trim(),
          last_name:  profileForm.last_name.trim(),
          image: profileImage || undefined,
        }),
      });
      await authFetch(`${API}/api/users/me/instructor-profile/rich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: profileForm.bio.trim(),
          headline: profileForm.headline.trim(),
          location: profileForm.location.trim(),
          experience_years: profileForm.experience_years ? parseInt(profileForm.experience_years) : undefined,
          cover_image:   coverImage   ?? undefined,
          profile_image: profileImage ?? undefined,
        }),
      });
      showMessage('success', 'Profile and identity updated successfully.');
    } catch {
      showMessage('error', 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const saveSkills = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/users/me/instructor-profile/rich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills, languages }),
      });
      showMessage('success', 'Skills and teaching languages updated.');
    } catch {
      showMessage('error', 'Failed to save skills.');
    } finally {
      setSaving(false);
    }
  };

  const saveRates = async () => {
    setSaving(true);
    try {
      const rateVal = parseFloat(ratesForm.hourly_rate);
      if (isNaN(rateVal) || rateVal < 50) {
        showMessage('error', 'Hourly rate must be at least 50 ETB.');
        setSaving(false);
        return;
      }
      await authFetch(`${API}/api/users/me/instructor-profile/rich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourly_rate: rateVal }),
      });
      showMessage('success', 'Session rates updated.');
    } catch {
      showMessage('error', 'Failed to save session rates.');
    } finally {
      setSaving(false);
    }
  };

  const saveSocial = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/users/me/instructor-profile/rich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_url:  socialForm.website_url.trim()  || undefined,
          linkedin_url: socialForm.linkedin_url.trim() || undefined,
          twitter_url:  socialForm.twitter_url.trim()  || undefined,
          youtube_url:  socialForm.youtube_url.trim()  || undefined,
        }),
      });
      showMessage('success', 'Social profiles updated.');
    } catch {
      showMessage('error', 'Failed to save social links.');
    } finally {
      setSaving(false);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFrontDoc) {
      showMessage('error', 'Please upload the front photo of your ID document.');
      return;
    }
    if (!selfieDoc) {
      showMessage('error', 'Please upload a clear selfie photo for liveness and identity matching.');
      return;
    }
    if (kycForm.id_type === 'fayda_national_id' && !kycForm.fayda_fan_number.trim()) {
      showMessage('error', 'Please provide your 16-digit Fayda Identification Number (FAN).');
      return;
    }

    setSaving(true);
    try {
      const allDocs = [idFrontDoc, idBackDoc, selfieDoc, certificateDoc].filter(Boolean) as string[];

      const payload = {
        legal_name:          kycForm.legal_name.trim(),
        phone:               kycForm.phone.trim(),
        date_of_birth:       kycForm.date_of_birth || undefined,
        gender:              kycForm.gender || undefined,
        region:              kycForm.region,
        residential_address: kycForm.residential_address.trim() || undefined,
        country:             kycForm.country,
        id_type:             kycForm.id_type,
        fayda_fan_number:    kycForm.fayda_fan_number.trim() || undefined,
        tin_number:          kycForm.tin_number.trim() || undefined,
        id_number:           kycForm.id_number.trim() || undefined,
        id_expiry:           kycForm.id_expiry || undefined,
        education_level:     kycForm.education_level || undefined,
        institution:         kycForm.institution.trim() || undefined,
        notes:               kycForm.notes.trim() || undefined,
        id_front_doc:        idFrontDoc,
        id_back_doc:         idBackDoc || undefined,
        selfie_doc:          selfieDoc,
        certificate_doc:     certificateDoc || undefined,
        kyc_docs:            allDocs,
      };

      const res = await authFetch(`${API}/api/users/me/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to submit KYC application');

      setKycStatus('submitted');
      setKycSubmittedAt(new Date().toISOString());
      showMessage('success', 'Fayda ID and verification documents submitted! Our compliance team will review your credentials.');
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to submit verification.');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (s: string) => {
    const trimmed = s.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 25) {
      setSkills(prev => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (s: string) => setSkills(prev => prev.filter(x => x !== s));

  const toggleLanguage = (lang: string) =>
    setLanguages(prev => prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--card-border)',
    borderRadius: 12,
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  // Hourly rate fee breakdown calculator
  const numericRate = parseFloat(ratesForm.hourly_rate) || 0;
  const platformFee = Math.round(numericRate * 0.1);
  const netEarnings = Math.max(0, numericRate - platformFee);
  const usdEst = (numericRate / 120).toFixed(1); // Approximate conversion for diaspora display

  if (loading || !user) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--pine-deep)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* ── Full Width Desktop Workspace Container ─────────────────── */}
      <div style={{ paddingTop: '80px', flex: 1 }}>
        <div style={{
          width: '100%',
          maxWidth: 1720,
          margin: '0 auto',
          padding: '1.5rem clamp(1rem, 2.5vw, 2.5rem) 5rem',
          boxSizing: 'border-box',
        }}>

          {/* ── Header Banner Container ───────────────────────────────── */}
          <div style={{
            background: 'var(--pine-deep)',
            borderRadius: 24,
            padding: '1.75rem clamp(1.5rem, 3vw, 2.5rem)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(12, 59, 46, 0.2)',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}>
            <div style={{ position: 'absolute', top: -50, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 999, padding: '0.25rem 0.8rem', fontSize: '0.72rem',
                fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#fde047', marginBottom: '0.5rem',
              }}>
                <Sparkles size={13} /> E D U C A T O R  S T U D I O
              </div>
              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', lineHeight: 1.15,
                color: '#ffffff', margin: '0 0 0.35rem', letterSpacing: '-0.02em',
              }}>
                Instructor Studio &amp; Profile Hub
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.88rem', margin: 0 }}>
                {user.email} · <span style={{ color: '#fde047', fontWeight: 700 }}>
                  {kycStatus === 'approved' ? '✓ Verified Instructor' : 'Instructor Profile'}
                </span>
              </p>
            </div>

            {/* Quick Metrics Badge Strip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: '0.75rem 1.25rem', backdropFilter: 'blur(10px)',
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Hourly Rate</div>
                <div style={{ fontWeight: 800, color: '#fde047', fontSize: '1.1rem' }}>{ratesForm.hourly_rate} ETB</div>
              </div>
              <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Verification</div>
                <div style={{
                  fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase',
                  color: kycStatus === 'approved' ? '#34d399' : kycStatus === 'submitted' ? '#fbbf24' : '#fca5a5',
                }}>
                  ● {kycStatus}
                </div>
              </div>
              <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <Link
                  href="/instructor/courses"
                  style={{
                    background: 'rgba(255,255,255,0.15)', color: '#fff',
                    borderRadius: 999, padding: '0.35rem 0.9rem', fontSize: '0.75rem',
                    fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  Manage Courses <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Two-Column Desktop Layout ────────────────────────────── */}
          <div className="settings-split-layout" style={{
            display: 'grid',
            gridTemplateColumns: 'clamp(230px, 18vw, 270px) minmax(0, 1fr)',
            gap: '2rem',
            alignItems: 'start',
          }}>
            {/* Sidebar Rail */}
            <nav className="settings-sidebar-nav" style={{
              display: 'flex', flexDirection: 'column', gap: '0.45rem',
              position: 'sticky', top: '88px',
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 20, padding: '0.75rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
            }}>
              {TABS.map(t => {
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    id={`settings-tab-${t.id}`}
                    onClick={() => setTab(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid',
                      background: isActive ? 'var(--pine-deep)' : 'transparent',
                      borderColor: isActive ? 'var(--pine-deep)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.88rem', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </div>
                    {t.badge && (
                      <span style={{
                        fontSize: '0.65rem', padding: '1px 6px', borderRadius: 999,
                        background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(239,68,68,0.15)',
                        color: isActive ? '#fff' : '#ef4444', fontWeight: 800,
                      }}>
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Main Content Workspace (Full Width Desktop Grid) */}
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 24, padding: 'clamp(1.5rem, 2.5vw, 2.5rem)', minHeight: 600,
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            }}>
              {message && (
                <div style={{
                  background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: message.type === 'success' ? '#34d399' : '#fca5a5',
                  borderRadius: 12, padding: '0.75rem 1.25rem', fontSize: '0.88rem', marginBottom: '1.75rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 1: Profile & Public Directory Identity
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'profile' && (
                <div className="profile-two-col-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) clamp(300px, 30vw, 380px)', gap: '2.5rem', alignItems: 'start' }}>
                  {/* Left Column: Form Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                        Educator Profile &amp; Bio
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                        This information is publicly presented across the Axumia student marketplace and tutor directories.
                      </p>
                    </div>

                    {/* Banner & Avatar Row */}
                    <div>
                      <AvatarUploader
                        label="Wide Profile Banner Image (16:9 or 3:1 ratio)"
                        currentUrl={coverImage}
                        aspectRatio="3:1"
                        shape="rect"
                        onUpload={(key, url) => setCoverImage(url || key)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <AvatarUploader
                        label="Profile Avatar (Headshot)"
                        currentUrl={profileImage}
                        aspectRatio="1:1"
                        shape="circle"
                        onUpload={(key, url) => setProfileImage(url || key)}
                      />
                      <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>First Name</label>
                            <input
                              type="text"
                              style={inputStyle}
                              value={profileForm.first_name}
                              onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                              placeholder="First name"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Last Name</label>
                            <input
                              type="text"
                              style={inputStyle}
                              value={profileForm.last_name}
                              onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                              placeholder="Last name"
                            />
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Professional Headline</label>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{profileForm.headline.length}/100</span>
                          </div>
                          <input
                            type="text"
                            style={inputStyle}
                            value={profileForm.headline}
                            onChange={e => setProfileForm(p => ({ ...p, headline: e.target.value }))}
                            placeholder="e.g. Senior Software Engineer &amp; CS University Lecturer"
                            maxLength={100}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>About &amp; Teaching Philosophy</label>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{profileForm.bio.length}/1200</span>
                      </div>
                      <textarea
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 140, lineHeight: 1.6 }}
                        value={profileForm.bio}
                        onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Introduce your teaching style, past student successes, and what makes your approach effective..."
                        maxLength={1200}
                        rows={5}
                      />
                    </div>

                    {/* Location, Timezone, Experience */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Location / City</label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={profileForm.location}
                          onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))}
                          placeholder="Addis Ababa, Ethiopia"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Primary Time Zone</label>
                        <select
                          style={inputStyle}
                          value={profileForm.timezone}
                          onChange={e => setProfileForm(p => ({ ...p, timezone: e.target.value }))}
                        >
                          {TIMEZONES.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Years of Experience</label>
                        <input
                          type="number"
                          style={inputStyle}
                          value={profileForm.experience_years}
                          onChange={e => setProfileForm(p => ({ ...p, experience_years: e.target.value }))}
                          placeholder="e.g. 5"
                          min="0"
                          max="60"
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={saveProfile}
                        disabled={saving}
                        style={{
                          background: 'var(--pine-deep)', color: '#ffffff',
                          border: 'none', borderRadius: 999,
                          padding: '0.8rem 2rem', fontWeight: 700, fontSize: '0.9rem',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                          boxShadow: '0 4px 14px rgba(12, 59, 46, 0.25)',
                        }}
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Live Directory Preview Card */}
                  <div style={{ position: 'sticky', top: '90px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                      color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: '0.75rem',
                    }}>
                      <Eye size={14} /> Live Directory Card Preview
                    </div>

                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--card-border)',
                      borderRadius: 20,
                      overflow: 'hidden',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.06)',
                    }}>
                      {/* Banner Mockup */}
                      <div style={{
                        height: 100,
                        background: coverImage ? `url(${coverImage}) center/cover no-repeat` : 'linear-gradient(135deg, #0c3b2e, #10b981)',
                        position: 'relative',
                      }}>
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                          borderRadius: 999, padding: '2px 8px', fontSize: '0.7rem',
                          color: '#fff', fontWeight: 700,
                        }}>
                          {profileForm.experience_years ? `${profileForm.experience_years}+ yrs exp` : 'Instructor'}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '1.25rem', paddingTop: '0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -32, marginBottom: '0.75rem' }}>
                          <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            border: '3px solid var(--bg-secondary)', overflow: 'hidden',
                            background: '#0c3b2e', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '1.2rem',
                          }}>
                            {profileImage ? (
                              <img src={profileImage} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (profileForm.first_name?.[0] || 'I') + (profileForm.last_name?.[0] || '')
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Rate</div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)' }}>
                              {ratesForm.hourly_rate} ETB<span style={{ fontSize: '0.7rem', color: '#64748b' }}>/hr</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{profileForm.first_name || 'Your'} {profileForm.last_name || 'Name'}</span>
                          {kycStatus === 'approved' && <CheckCircle2 size={15} color="#34d399" />}
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2, marginBottom: '0.75rem', lineHeight: 1.3 }}>
                          {profileForm.headline || 'Your professional teaching headline will appear here.'}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={12} /> {profileForm.location || 'Addis Ababa'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Star size={12} fill="#f59e0b" color="#f59e0b" /> 4.9 (124)
                          </span>
                        </div>

                        {/* Skill Pills Mockup */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: '1rem' }}>
                          {(skills.length > 0 ? skills.slice(0, 4) : ['Mathematics', 'Computer Science', 'Python']).map(s => (
                            <span key={s} style={{
                              fontSize: '0.7rem', padding: '2px 7px', borderRadius: 999,
                              background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                              border: '1px solid rgba(99,102,241,0.25)', fontWeight: 600,
                            }}>
                              {s}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          style={{
                            width: '100%', padding: '0.65rem', borderRadius: 10,
                            background: 'var(--pine-deep)', color: '#fff', border: 'none',
                            fontWeight: 700, fontSize: '0.82rem', cursor: 'default',
                            boxShadow: '0 4px 12px rgba(12, 59, 46, 0.2)',
                          }}
                        >
                          Book 1-on-1 Session
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 2: Skills & Teaching Expertise
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'skills' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                      Expertise, Subjects &amp; Languages
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                      Define your teaching subjects and languages so students can discover you via category filters.
                    </p>
                  </div>

                  {/* Skills Tag Section */}
                  <div style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                    borderRadius: 18, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Subject Tags &amp; Specializations ({skills.length}/25)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Press Enter or Click + Add</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="Type a subject or skill (e.g. Calculus, Machine Learning, Organic Chemistry)..."
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSkill(skillInput);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addSkill(skillInput)}
                        style={{
                          background: 'rgba(16,185,129,0.15)', color: '#34d399',
                          border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12,
                          padding: '0 1.25rem', fontWeight: 700, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.88rem',
                        }}
                      >
                        <Plus size={16} /> Add
                      </button>
                    </div>

                    {/* Quick suggestion pills */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Suggested Topics:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {SUBJECT_SUGGESTIONS.map(s => {
                          const isAdded = skills.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => isAdded ? removeSkill(s) : addSkill(s)}
                              style={{
                                padding: '3px 9px', borderRadius: 999, fontSize: '0.75rem',
                                background: isAdded ? 'rgba(99,102,241,0.2)' : 'var(--card-bg)',
                                color: isAdded ? '#818cf8' : 'var(--text-secondary)',
                                border: `1px solid ${isAdded ? 'rgba(99,102,241,0.4)' : 'var(--card-border)'}`,
                                cursor: 'pointer', fontWeight: isAdded ? 700 : 500,
                              }}
                            >
                              {isAdded ? '✓ ' : '+ '} {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Skills List */}
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
                      paddingTop: '0.75rem', borderTop: '1px solid var(--card-border)', minHeight: 48,
                    }}>
                      {skills.map(s => (
                        <span key={s} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.3)', borderRadius: 999,
                          padding: '0.35rem 0.85rem', fontSize: '0.82rem', fontWeight: 700,
                        }}>
                          {s}
                          <button
                            type="button"
                            onClick={() => removeSkill(s)}
                            style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                      {skills.length === 0 && (
                        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No skills added yet. Add your main teaching areas above.</div>
                      )}
                    </div>
                  </div>

                  {/* Languages Section */}
                  <div style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                    borderRadius: 18, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                  }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Languages You Can Teach In
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                      {LANGUAGE_OPTIONS.map(lang => {
                        const isSelected = languages.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => toggleLanguage(lang)}
                            style={{
                              padding: '0.55rem 1.1rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 700,
                              background: isSelected ? 'rgba(16,185,129,0.18)' : 'var(--card-bg)',
                              color: isSelected ? '#34d399' : 'var(--text-secondary)',
                              border: `1px solid ${isSelected ? 'rgba(16,185,129,0.45)' : 'var(--card-border)'}`,
                              cursor: 'pointer', transition: 'all 0.15s',
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            {isSelected ? <Check size={14} /> : <Plus size={14} />} {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={saveSkills}
                      disabled={saving}
                      style={{
                        background: 'var(--pine-deep)', color: '#ffffff',
                        border: 'none', borderRadius: 999,
                        padding: '0.8rem 2rem', fontWeight: 700, fontSize: '0.9rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(12, 59, 46, 0.25)',
                      }}
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Saving...' : 'Save Skills & Languages'}
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 3: Rates, Pricing & Earnings Calculator
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'rates' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                      1-on-1 Tutoring Rates &amp; Revenue Breakdown
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                      Set your hourly session pricing. Payments are secured in escrow and settled instantly via Telebirr or CBE Birr.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
                    {/* Rate Input + Calculator */}
                    <div style={{
                      background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                      borderRadius: 18, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
                    }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                          Base Hourly Session Rate (ETB)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#fde047', fontWeight: 800, fontSize: '0.95rem' }}>
                            ETB
                          </span>
                          <input
                            type="number"
                            style={{ ...inputStyle, paddingLeft: '3.4rem', fontSize: '1.1rem', fontWeight: 700 }}
                            value={ratesForm.hourly_rate}
                            onChange={e => setRatesForm({ hourly_rate: e.target.value })}
                            min="50"
                            step="50"
                          />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.4rem' }}>
                          Diaspora student equivalent: <strong>≈ ${usdEst} USD</strong> per 60-min session.
                        </div>
                      </div>

                      {/* Interactive Fee Breakdown Card */}
                      <div style={{
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        borderRadius: 14, padding: '1.25rem',
                      }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                          Transparent Earnings Calculator
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.86rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Student Booking Price:</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{numericRate} ETB</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>Platform Escrow &amp; Payment Fee (10%):</span>
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>- {platformFee} ETB</span>
                          </div>
                          <div style={{ height: 1, background: 'var(--card-border)', margin: '4px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                            <span style={{ fontWeight: 800, color: '#34d399' }}>Your Net Take-Home:</span>
                            <span style={{ fontWeight: 800, color: '#34d399', fontSize: '1.15rem' }}>{netEarnings} ETB</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={saveRates}
                        disabled={saving}
                        style={{
                          background: 'var(--pine-deep)', color: '#ffffff',
                          border: 'none', borderRadius: 999,
                          padding: '0.75rem 1.75rem', fontWeight: 700, fontSize: '0.88rem',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          boxShadow: '0 4px 14px rgba(12, 59, 46, 0.25)',
                        }}
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Update Session Pricing'}
                      </button>
                    </div>

                    {/* Financial Metrics & Payout Portal Shortcut */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(16,185,129,0.06) 100%)',
                        border: '1px solid rgba(212,175,55,0.25)',
                        borderRadius: 18, padding: '1.75rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{
                            fontWeight: 800, fontSize: '1.05rem', margin: 0,
                            display: 'flex', alignItems: 'center', gap: 6, color: '#fde047',
                          }}>
                            <Coins size={18} /> Payout &amp; Balance Summary
                          </h3>
                          <Link
                            href="/instructor/payouts"
                            style={{
                              fontSize: '0.78rem', color: '#818cf8', fontWeight: 700, textDecoration: 'none',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            Open Payouts <ExternalLink size={12} />
                          </Link>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                          <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: 12, border: '1px solid var(--card-border)' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Available Balance</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', marginTop: 2 }}>
                              {profile?.instructorProfile?.earnings_balance ? `${profile.instructorProfile.earnings_balance.toLocaleString()} ETB` : '0 ETB'}
                            </div>
                          </div>
                          <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: 12, border: '1px solid var(--card-border)' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Completed Sessions</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                              {profile?.instructorProfile?.total_sessions ?? 0}
                            </div>
                          </div>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                          Payouts are disbursed automatically every week or on-demand to your verified Telebirr or Commercial Bank of Ethiopia (CBE) account.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 4: Social Links & Web Presence
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'social' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                      Social Profiles &amp; Digital Portfolio
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                      Connect your external profiles so students can verify your public work, repositories, and teaching portfolio.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {[
                      { key: 'linkedin_url', label: 'LinkedIn Profile', placeholder: 'https://linkedin.com/in/username', icon: '💼', color: '#0077b5' },
                      { key: 'website_url',  label: 'Personal Website / Portfolio', placeholder: 'https://yourportfolio.com', icon: '🌐', color: '#10b981' },
                      { key: 'youtube_url',  label: 'YouTube Teaching Channel', placeholder: 'https://youtube.com/@channel', icon: '▶️', color: '#ef4444' },
                      { key: 'twitter_url',  label: 'Twitter / X Profile', placeholder: 'https://x.com/username', icon: '🐦', color: '#38bdf8' },
                    ].map(({ key, label, placeholder, icon, color }) => {
                      const val = (socialForm as any)[key] || '';
                      return (
                        <div
                          key={key}
                          style={{
                            background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                            borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              <span>{icon}</span>
                              <span>{label}</span>
                            </div>
                            {val ? (
                              <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>ACTIVE</span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>NOT SET</span>
                            )}
                          </div>

                          <input
                            type="url"
                            style={inputStyle}
                            placeholder={placeholder}
                            value={val}
                            onChange={e => setSocialForm(p => ({ ...p, [key]: e.target.value }))}
                          />

                          {val && (
                            <a
                              href={val}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                alignSelf: 'flex-start', fontSize: '0.78rem', color: '#818cf8',
                                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600,
                              }}
                            >
                              Test Link <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={saveSocial}
                      disabled={saving}
                      style={{
                        background: 'var(--pine-deep)', color: '#ffffff',
                        border: 'none', borderRadius: 999,
                        padding: '0.8rem 2rem', fontWeight: 700, fontSize: '0.9rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(12, 59, 46, 0.25)',
                      }}
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Saving...' : 'Save Social Profiles'}
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 5: Video & Virtual Classroom Integration
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'video' && <VideoIntegrationPanel />}

              {/* ════════════════════════════════════════════════════════════
                  TAB 6: KYC Verification
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'kyc' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Status Banner */}
                  {kycStatus === 'approved' && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 16, padding: '1.25rem 1.5rem',
                      display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    }}>
                      <CheckCircle2 size={24} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem', marginBottom: '0.25rem' }}>
                          Verified Instructor Identity
                        </div>
                        <p style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                          Your Ethiopian Fayda / National ID verification is complete and your instructor profile is active. You are authorized to publish paid courses, host live 1-on-1 tutoring sessions, and receive payouts via Telebirr or CBE.
                        </p>
                      </div>
                    </div>
                  )}

                  {kycStatus === 'submitted' && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 16, padding: '1.25rem 1.5rem',
                      display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    }}>
                      <Info size={24} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1rem', marginBottom: '0.25rem' }}>
                          Application Under Review
                        </div>
                        <p style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                          Your Fayda ID and credentials have been submitted and are currently in the compliance verification queue. Applications are typically processed within 12 to 24 hours. You can update your submission below at any time.
                        </p>
                        {kycSubmittedAt && (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                            Submitted on: {new Date(kycSubmittedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {kycStatus === 'rejected' && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 16, padding: '1.25rem 1.5rem',
                      display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    }}>
                      <AlertTriangle size={24} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 800, color: '#f87171', fontSize: '1rem', marginBottom: '0.25rem' }}>
                          KYC Review Attention Required
                        </div>
                        <p style={{ color: '#fca5a5', fontSize: '0.88rem', margin: '0 0 0.5rem', fontWeight: 600 }}>
                          Review Feedback: {kycRejectionReason || 'One or more submitted documents could not be verified.'}
                        </p>
                        <p style={{ color: '#cbd5e1', fontSize: '0.82rem', margin: 0 }}>
                          Please review your Fayda FAN number, ensure your photos and selfie are clear and uncropped, and resubmit below.
                        </p>
                      </div>
                    </div>
                  )}

                  {kycStatus === 'pending' && (
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: 16, padding: '1.25rem 1.5rem',
                      display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    }}>
                      <ShieldCheck size={24} color="#818cf8" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 800, color: '#818cf8', fontSize: '1rem', marginBottom: '0.25rem' }}>
                          Identity Verification Required
                        </div>
                        <p style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                          To ensure student trust and prevent academic fraud, all instructors are required to complete one-time identity verification. Please provide your Fayda National ID number and upload verification documents.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Verification Form */}
                  <form onSubmit={handleKycSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Part 1: Personal Details */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
                        1. Legal Personal Information
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Full Legal Name (as on National ID) *</label>
                          <input type="text" required style={inputStyle} value={kycForm.legal_name} onChange={e => setKycForm(p => ({ ...p, legal_name: e.target.value }))} placeholder="Abebe Bikila Kebede" />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Phone Number *</label>
                          <input type="tel" required style={inputStyle} value={kycForm.phone} onChange={e => setKycForm(p => ({ ...p, phone: e.target.value }))} placeholder="+251 91 122 3344" />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Date of Birth</label>
                          <input type="date" style={inputStyle} value={kycForm.date_of_birth} onChange={e => setKycForm(p => ({ ...p, date_of_birth: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Gender</label>
                          <select style={inputStyle} value={kycForm.gender} onChange={e => setKycForm(p => ({ ...p, gender: e.target.value }))}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Region / City Administration</label>
                          <select style={inputStyle} value={kycForm.region} onChange={e => setKycForm(p => ({ ...p, region: e.target.value }))}>
                            {ETHIOPIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Residential Address / Woreda</label>
                          <input type="text" style={inputStyle} value={kycForm.residential_address} onChange={e => setKycForm(p => ({ ...p, residential_address: e.target.value }))} placeholder="Bole Sub-city, Woreda 03" />
                        </div>
                      </div>
                    </div>

                    {/* Part 2: ID & Fayda */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
                        2. Ethiopian Fayda &amp; National Identification
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Identification Document Type</label>
                          <select style={inputStyle} value={kycForm.id_type} onChange={e => setKycForm(p => ({ ...p, id_type: e.target.value }))}>
                            {ID_TYPES.map(it => <option key={it.value} value={it.value}>{it.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#fde047', marginBottom: '0.35rem' }}>
                            🇪🇹 Fayda FAN Number (16 digits) *
                          </label>
                          <input
                            type="text"
                            required
                            style={{ ...inputStyle, borderColor: 'rgba(253,224,71,0.4)', fontWeight: 700, letterSpacing: '0.08em' }}
                            value={kycForm.fayda_fan_number}
                            onChange={e => setKycForm(p => ({ ...p, fayda_fan_number: e.target.value }))}
                            placeholder="e.g. 1234 5678 9012 3456"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Tax Identification Number (TIN - optional)</label>
                          <input type="text" style={inputStyle} value={kycForm.tin_number} onChange={e => setKycForm(p => ({ ...p, tin_number: e.target.value }))} placeholder="10-digit TIN number" />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Highest Educational Attainment</label>
                          <select style={inputStyle} value={kycForm.education_level} onChange={e => setKycForm(p => ({ ...p, education_level: e.target.value }))}>
                            {EDUCATION_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Part 3: Document Uploads */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
                        3. Verification Documents &amp; Liveness Selfie
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        <DocumentUploader
                          label="Front Photo of National ID / Fayda Card *"
                          currentUrl={idFrontDoc}
                          folder="kyc"
                          allowedTypes={['image/jpeg', 'image/png', 'application/pdf']}
                          onUpload={(key, url) => setIdFrontDoc(url || key)}
                        />
                        <DocumentUploader
                          label="Back Photo of National ID (if applicable)"
                          currentUrl={idBackDoc}
                          folder="kyc"
                          allowedTypes={['image/jpeg', 'image/png', 'application/pdf']}
                          onUpload={(key, url) => setIdBackDoc(url || key)}
                        />
                        <DocumentUploader
                          label="Liveness Selfie (Holding ID or clear headshot) *"
                          currentUrl={selfieDoc}
                          folder="kyc"
                          allowedTypes={['image/jpeg', 'image/png']}
                          onUpload={(key, url) => setSelfieDoc(url || key)}
                        />
                        <DocumentUploader
                          label="Degree Certificate / Teaching License (Optional)"
                          currentUrl={certificateDoc}
                          folder="kyc"
                          allowedTypes={['image/jpeg', 'image/png', 'application/pdf']}
                          onUpload={(key, url) => setCertificateDoc(url || key)}
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{
                          background: 'var(--pine-deep)', color: '#ffffff',
                          border: 'none', borderRadius: 999,
                          padding: '0.85rem 2.2rem', fontWeight: 800, fontSize: '0.95rem',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                          boxShadow: '0 4px 16px rgba(12, 59, 46, 0.3)',
                        }}
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={18} />}
                        {saving ? 'Submitting Verification...' : 'Submit Verification for Approval'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 7: Security & 2FA
                 ════════════════════════════════════════════════════════════ */}
              {tab === 'security' && <SecurityPanel />}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <style>{`
        @media (max-width: 960px) {
          .settings-split-layout {
            grid-template-columns: 1fr !important;
          }
          .settings-sidebar-nav {
            position: static !important;
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            padding: 0.5rem !important;
            margin-bottom: 1rem !important;
          }
          .profile-two-col-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { authFetch } from '@/lib/auth';
import {
  BarChart3, Users, ShieldCheck, Wallet, CheckCircle2,
  XCircle, Clock, Search, RefreshCw, ChevronRight,
  TrendingUp, DollarSign, BookOpen, AlertTriangle,
  Loader2, Eye, Filter, Download, Plus, Trash2, Edit3, Settings, Cpu,
  Copy, Check, ExternalLink, Image as ImageIcon, FileText, Phone, MapPin, Award, Calendar,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface PlatformStats {
  users: { total: number; students: number; instructors: number };
  content: { publishedCourses: number };
  finance: { totalRevenue: string | number; pendingPayouts: number; pendingKycApprovals: number };
}

interface KycProfile {
  id: string;
  user_id: string;
  kyc_status: string;
  bio: string | null;
  headline: string | null;
  hourly_rate: string;
  fayda_fan_number?: string | null;
  tin_number?: string | null;
  kyc_submitted_at?: string | null;
  kyc_reviewed_at?: string | null;
  kyc_reviewed_by?: string | null;
  kyc_rejection_reason?: string | null;
  kyc_data?: {
    legal_name?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    region?: string;
    residential_address?: string;
    country?: string;
    id_type?: string;
    id_number?: string;
    id_expiry?: string;
    education_level?: string;
    institution?: string;
    notes?: string;
    fayda_fan_number?: string;
    tin_number?: string;
  };
  signedKycDocs?: Array<{ key: string; url: string | null }>;
  docPreviews?: {
    id_front?: { key: string; url: string | null; label: string };
    id_back?: { key: string; url: string | null; label: string };
    selfie?: { key: string; url: string | null; label: string };
    certificate?: { key: string; url: string | null; label: string };
  };
  created_at: string;
  updated_at: string;
  user: { email: string; first_name: string | null; last_name: string | null };
}

interface Payout {
  id: string;
  instructor_id: string;
  amount: string;
  currency: string;
  status: string;
  method: string;
  account_details?: string | null;
  paid_at: string | null;
  created_at: string;
  transaction?: { amount: string; currency: string; created_at: string };
}

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_email_verified: boolean;
  created_at: string;
  instructorProfile: { kyc_status: string; is_active: boolean } | null;
}

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: string | number;
  created_at: string;
  instructor: { user: { first_name: string; last_name: string; email: string } };
  category: { name: string } | null;
  _count: { purchases: number; lessons: number };
}

interface TransactionRow {
  id: string;
  provider_tx_ref: string | null;
  amount: string | number;
  platform_fee: string | number;
  currency: string;
  status: string;
  created_at: string;
  user: { email: string; first_name: string; last_name: string } | null;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  _count?: { courses: number };
}

type Tab = 'stats' | 'kyc' | 'payouts' | 'users' | 'courses' | 'transactions' | 'categories';

const api = {
  get: (path: string) =>
    authFetch(`${API}/api/admin${path}`).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).message || `HTTP ${r.status}`);
      return r.json();
    }),
  post: (path: string, body?: object) =>
    authFetch(`${API}/api/admin${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).message || `HTTP ${r.status}`);
      return r.json();
    }),
  patch: (path: string, body: object) =>
    authFetch(`${API}/api/admin${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).message || `HTTP ${r.status}`);
      return r.json();
    }),
};

function NoteDialog({
  title, actionLabel, actionColor, placeholder, onConfirm, onCancel, busy,
}: {
  title: string; actionLabel: string; actionColor: string; placeholder?: string;
  onConfirm: (note: string) => void; onCancel: () => void; busy: boolean;
}) {
  const [note, setNote] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 440,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      }}>
        <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: '#f8fafc' }}>{title}</h3>
        <textarea
          placeholder={placeholder || 'Internal note (optional)…'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          style={{
            width: '100%', padding: '0.85rem 1rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, color: '#f8fafc', fontSize: '0.9rem',
            resize: 'vertical', outline: 'none', marginBottom: '1.25rem',
          }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.65rem 1.25rem', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
            }}
          >Cancel</button>
          <button
            onClick={() => onConfirm(note)}
            disabled={busy}
            style={{
              padding: '0.65rem 1.25rem', borderRadius: 10,
              background: actionColor, border: 'none',
              color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '0.88rem', opacity: busy ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('stats');

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [queues, setQueues] = useState<any>(null);

  const [kyc, setKyc] = useState<KycProfile[]>([]);
  const [kycDialog, setKycDialog] = useState<{ profile: KycProfile; action: 'approved' | 'rejected' } | null>(null);
  const [kycBusy, setKycBusy] = useState(false);
  const [kycFilter, setKycFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [docModal, setDocModal] = useState<{ url: string; title: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutDialog, setPayoutDialog] = useState<{ payout: Payout; action: 'paid' | 'failed' } | null>(null);
  const [payoutBusy, setPayoutBusy] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userRoleBusy, setUserRoleBusy] = useState<string | null>(null);

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseStatusFilter, setCourseStatusFilter] = useState('');

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [txSearch, setTxSearch] = useState('');

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [catSubmitting, setCatSubmitting] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user && user.role !== 'admin') router.push('/dashboard');
  }, [user, authLoading, router]);

  const loadOverview = useCallback(async () => {
    try {
      const [st, q] = await Promise.all([api.get('/stats'), api.get('/queues/status')]);
      setStats(st);
      setQueues(q.queues || null);
    } catch (e: any) { showToast(e.message, false); }
  }, [showToast]);

  const loadKyc = useCallback(async (filter: 'pending' | 'approved' | 'rejected' | 'all' = kycFilter) => {
    try {
      let endpoint = '/kyc/pending';
      if (filter === 'all') {
        endpoint = '/kyc/all';
      } else if (filter !== 'pending') {
        endpoint = `/kyc/all?status=${filter}`;
      }
      const data = await api.get(endpoint);
      setKyc(data || []);
    } catch (e: any) { showToast(e.message, false); }
  }, [kycFilter, showToast]);

  const loadPayouts = useCallback(async () => {
    try { setPayouts(await api.get('/payouts/all')); } catch (e: any) { showToast(e.message, false); }
  }, [showToast]);

  const loadUsers = useCallback(async () => {
    const qs = new URLSearchParams({ limit: '100' });
    if (userRoleFilter) qs.set('role', userRoleFilter);
    if (userSearch) qs.set('search', userSearch);
    try { const d = await api.get(`/users?${qs}`); setUsers(d.data || []); } catch (e: any) { showToast(e.message, false); }
  }, [userSearch, userRoleFilter, showToast]);

  const loadCourses = useCallback(async () => {
    const qs = new URLSearchParams({ limit: '100' });
    if (courseStatusFilter) qs.set('status', courseStatusFilter);
    if (courseSearch) qs.set('search', courseSearch);
    try { const d = await api.get(`/courses?${qs}`); setCourses(d.data || []); } catch (e: any) { showToast(e.message, false); }
  }, [courseSearch, courseStatusFilter, showToast]);

  const loadTransactions = useCallback(async () => {
    const qs = new URLSearchParams({ limit: '100' });
    if (txSearch) qs.set('search', txSearch);
    try { const d = await api.get(`/transactions?${qs}`); setTransactions(d.data || []); } catch (e: any) { showToast(e.message, false); }
  }, [txSearch, showToast]);

  const loadCategories = useCallback(async () => {
    try { setCategories(await api.get('/categories')); } catch (e: any) { showToast(e.message, false); }
  }, [showToast]);

  useEffect(() => {
    if (user?.role === 'admin') loadOverview();
  }, [user, loadOverview]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (tab === 'kyc') loadKyc(kycFilter);
    else if (tab === 'payouts') loadPayouts();
    else if (tab === 'users') loadUsers();
    else if (tab === 'courses') loadCourses();
    else if (tab === 'transactions') loadTransactions();
    else if (tab === 'categories') loadCategories();
  }, [tab, user]); // eslint-disable-line

  useEffect(() => {
    if (tab === 'kyc') loadKyc(kycFilter);
  }, [kycFilter]); // eslint-disable-line

  useEffect(() => {
    if (tab === 'users') {
      const t = setTimeout(() => loadUsers(), 300);
      return () => clearTimeout(t);
    }
  }, [userSearch, userRoleFilter]); // eslint-disable-line

  useEffect(() => {
    if (tab === 'courses') {
      const t = setTimeout(() => loadCourses(), 300);
      return () => clearTimeout(t);
    }
  }, [courseSearch, courseStatusFilter]); // eslint-disable-line

  const handleKycAction = async (note: string) => {
    if (!kycDialog) return;
    setKycBusy(true);
    try {
      await api.patch(`/kyc/${kycDialog.profile.id}`, { status: kycDialog.action, notes: note || undefined });
      showToast(`KYC application ${kycDialog.action} successfully.`);
      setKycDialog(null);
      loadKyc(kycFilter);
      loadOverview();
    } catch (e: any) { showToast(e.message, false); }
    finally { setKycBusy(false); }
  };

  const handlePayoutAction = async (note: string) => {
    if (!payoutDialog) return;
    setPayoutBusy(true);
    try {
      await api.patch(`/payouts/${payoutDialog.payout.id}`, { status: payoutDialog.action, notes: note || undefined });
      showToast(`Payout marked as ${payoutDialog.action}.`);
      setPayoutDialog(null);
      loadPayouts();
      loadOverview();
    } catch (e: any) { showToast(e.message, false); }
    finally { setPayoutBusy(false); }
  };

  const handleCourseStatus = async (courseId: string, status: string) => {
    try {
      await api.patch(`/courses/${courseId}/status`, { status });
      showToast(`Course status changed to ${status}`);
      loadCourses();
    } catch (e: any) { showToast(e.message, false); }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.post(`/courses/${courseId}/delete`);
      showToast('Course deleted');
      loadCourses();
    } catch (e: any) { showToast(e.message, false); }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatSubmitting(true);
    try {
      await api.post('/categories', { name: newCatName.trim(), icon: newCatIcon.trim() || undefined });
      showToast('Category created');
      setNewCatName('');
      setNewCatIcon('');
      loadCategories();
    } catch (e: any) { showToast(e.message, false); }
    finally { setCatSubmitting(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.post(`/categories/${id}/delete`);
      showToast('Category deleted');
      loadCategories();
    } catch (e: any) { showToast(e.message, false); }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.get('/transactions/export-csv');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ethiolearn_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      showToast('Exported CSV file');
    } catch (e: any) { showToast(e.message, false); }
  };

  if (authLoading || !user) return null;
  if (user.role !== 'admin') return null;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'stats', label: 'Overview', icon: <BarChart3 size={15} /> },
    { id: 'kyc', label: 'KYC Reviews', icon: <ShieldCheck size={15} />, badge: stats?.finance.pendingKycApprovals },
    { id: 'payouts', label: 'Payout Queue', icon: <Wallet size={15} />, badge: stats?.finance.pendingPayouts },
    { id: 'users', label: 'Users', icon: <Users size={15} /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen size={15} /> },
    { id: 'transactions', label: 'Ledger', icon: <DollarSign size={15} /> },
    { id: 'categories', label: 'Categories', icon: <Settings size={15} /> },
  ];

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#080a0f', color: '#f8fafc' }}>
      <Navbar />

      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 600,
          background: toast.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          borderRadius: 12, padding: '0.85rem 1.25rem', color: toast.ok ? '#34d399' : '#fca5a5',
          fontWeight: 600, fontSize: '0.9rem', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {kycDialog && (
        <NoteDialog
          title={kycDialog.action === 'approved' ? 'Approve Instructor KYC' : 'Reject Instructor KYC Application'}
          actionLabel={kycDialog.action === 'approved' ? 'Approve & Activate' : 'Reject Application'}
          actionColor={kycDialog.action === 'approved' ? '#10b981' : '#ef4444'}
          placeholder={kycDialog.action === 'approved'
            ? 'Approval note (optional)...'
            : 'Specific rejection reason (e.g. Fayda FAN mismatch, blurry ID photo) - this will be shown to the applicant...'}
          onConfirm={handleKycAction}
          onCancel={() => setKycDialog(null)}
          busy={kycBusy}
        />
      )}

      {/* Document Inspection Lightbox Modal */}
      {docModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 700,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
          }}
          onClick={() => setDocModal(null)}
        >
          <div
            style={{
              background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 20, maxWidth: 880, width: '100%', maxHeight: '92vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 30px 90px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="#d4af37" /> {docModal.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <a
                  href={docModal.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: 8, background: 'rgba(255,255,255,0.08)',
                    color: '#818cf8', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                  }}
                >
                  <ExternalLink size={14} /> Full Resolution
                </a>
                <button
                  onClick={() => setDocModal(null)}
                  style={{
                    background: 'none', border: 'none', color: '#94a3b8',
                    fontSize: '1.25rem', cursor: 'pointer', padding: '0.2rem 0.5rem',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{
              flex: 1, overflow: 'auto', padding: '1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617',
            }}>
              {docModal.url.match(/\.(pdf)($|\?)/i) ? (
                <iframe src={docModal.url} style={{ width: '100%', height: '65vh', border: 'none', borderRadius: 12 }} />
              ) : (
                <img
                  src={docModal.url}
                  alt={docModal.title}
                  style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: 12 }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {payoutDialog && (
        <NoteDialog
          title={payoutDialog.action === 'paid' ? 'Mark Payout Paid' : 'Mark Payout Failed'}
          actionLabel={payoutDialog.action === 'paid' ? 'Mark Paid' : 'Mark Failed'}
          actionColor={payoutDialog.action === 'paid' ? '#10b981' : '#ef4444'}
          onConfirm={handlePayoutAction}
          onCancel={() => setPayoutDialog(null)}
          busy={payoutBusy}
        />
      )}

      <div style={{ paddingTop: '80px', flex: 1 }}>
        <div style={{ background: 'linear-gradient(180deg, rgba(212,175,55,0.06) 0%, transparent 100%)' }}>
          <div className="container" style={{ padding: '2rem 1.5rem 0' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 999, padding: '0.3rem 0.85rem', fontSize: '0.78rem', color: '#d4af37', fontWeight: 600, marginBottom: '0.75rem' }}>
                <ShieldCheck size={14} /> Platform Operations
              </div>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '2.2rem', marginBottom: '0.3rem' }}>
                EthioLearn Admin <span style={{ color: '#d4af37' }}>Console</span>
              </h1>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid rgba(255,255,255,0.07)', overflowX: 'auto' }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.75rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer',
                    color: tab === t.id ? '#d4af37' : '#64748b',
                    fontWeight: tab === t.id ? 700 : 500, fontSize: '0.88rem',
                    borderBottom: `2px solid ${tab === t.id ? '#d4af37' : 'transparent'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.icon} {t.label}
                  {!!t.badge && t.badge > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.45rem' }}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container" style={{ padding: '2rem 1.5rem 5rem' }}>

          {/* OVERVIEW */}
          {tab === 'stats' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Total Users</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: '0.4rem 0' }}>{stats?.users.total ?? 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{stats?.users.students ?? 0} Students · {stats?.users.instructors ?? 0} Instructors</div>
                </div>

                <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>Total Gross Revenue</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', margin: '0.4rem 0' }}>
                    {Number(stats?.finance.totalRevenue ?? 0).toLocaleString()} <span style={{ fontSize: '1rem' }}>ETB</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>15% Commission platform model</div>
                </div>

                <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>Pending KYC Applications</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', margin: '0.4rem 0' }}>{stats?.finance.pendingKycApprovals ?? 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Awaiting verification & activation</div>
                </div>

                <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>Published Courses</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8', margin: '0.4rem 0' }}>{stats?.content.publishedCourses ?? 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Live on public catalog</div>
                </div>
              </div>

              {/* BullMQ Queues */}
              {queues && (
                <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.5rem' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={18} color="#818cf8" /> BullMQ Asynchronous Queues Status
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {Object.entries(queues).map(([name, count]: [string, any]) => (
                      <div key={name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                          {name} Queue
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div>Completed: <strong style={{ color: '#34d399' }}>{count.completed}</strong></div>
                          <div>Active / Waiting: <strong style={{ color: '#818cf8' }}>{count.active + count.waiting}</strong></div>
                          <div>Failed: <strong style={{ color: '#ef4444' }}>{count.failed}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KYC REVIEWS */}
          {tab === 'kyc' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Header & Filter Controls */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '1rem',
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: '1rem 1.25rem',
              }}>
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#f8fafc', margin: 0 }}>
                    Instructor Identity Verification (KYC)
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0' }}>
                    Verify Ethiopian Fayda FAN numbers, government IDs, and selfie liveness before activating instructor status.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setKycFilter(f)}
                      style={{
                        padding: '0.45rem 0.9rem', borderRadius: 999, border: 'none',
                        background: kycFilter === f ? '#d4af37' : 'rgba(255,255,255,0.06)',
                        color: kycFilter === f ? '#0f172a' : '#cbd5e1',
                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                        textTransform: 'capitalize', transition: 'all 0.15s',
                      }}
                    >
                      {f === 'pending' ? 'Pending Review' : f}
                    </button>
                  ))}
                  <button
                    onClick={() => loadKyc(kycFilter)}
                    style={{
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8', borderRadius: 8, padding: '0.45rem 0.75rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                      fontSize: '0.8rem', fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
              </div>

              {/* Applications List */}
              {kyc.length === 0 ? (
                <div style={{
                  padding: '4rem 2rem', textAlign: 'center',
                  background: 'rgba(15,23,42,0.4)', borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.06)', color: '#64748b',
                }}>
                  <ShieldCheck size={42} color="#334155" style={{ margin: '0 auto 1rem' }} />
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    No {kycFilter === 'all' ? '' : kycFilter} KYC applications found
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 400, margin: '0 auto' }}>
                    When instructors submit their Fayda Access Number and ID documents, they will appear here for compliance review.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {kyc.map((p) => {
                    const kd = p.kyc_data || {};
                    const fan = p.fayda_fan_number || kd.fayda_fan_number;
                    const tin = p.tin_number || kd.tin_number;
                    const legalName = kd.legal_name || [p.user.first_name, p.user.last_name].filter(Boolean).join(' ').trim() || 'Instructor Applicant';
                    const docs = p.docPreviews || {};

                    return (
                      <div
                        key={p.id}
                        style={{
                          background: 'rgba(15,23,42,0.7)',
                          border: `1px solid ${
                            p.kyc_status === 'submitted'
                              ? 'rgba(212,175,55,0.35)'
                              : p.kyc_status === 'approved'
                              ? 'rgba(16,185,129,0.25)'
                              : 'rgba(255,255,255,0.08)'
                          }`,
                          borderRadius: 20, padding: '1.75rem',
                          display: 'flex', flexDirection: 'column', gap: '1.25rem',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                        }}
                      >
                        {/* Header: User Info & Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                              border: '2px solid rgba(212,175,55,0.3)',
                              color: '#d4af37', fontWeight: 800, fontSize: '1.1rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {(legalName[0] || 'I').toUpperCase()}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f8fafc' }}>
                                  {legalName}
                                </span>
                                <span style={{
                                  padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem',
                                  fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                  background:
                                    p.kyc_status === 'approved'
                                      ? 'rgba(16,185,129,0.18)'
                                      : p.kyc_status === 'rejected'
                                      ? 'rgba(239,68,68,0.18)'
                                      : 'rgba(245,158,11,0.18)',
                                  color:
                                    p.kyc_status === 'approved'
                                      ? '#34d399'
                                      : p.kyc_status === 'rejected'
                                      ? '#f87171'
                                      : '#fbbf24',
                                  border: `1px solid ${
                                    p.kyc_status === 'approved'
                                      ? 'rgba(16,185,129,0.4)'
                                      : p.kyc_status === 'rejected'
                                      ? 'rgba(239,68,68,0.4)'
                                      : 'rgba(245,158,11,0.4)'
                                  }`,
                                }}>
                                  {p.kyc_status === 'submitted' ? 'Under Review' : p.kyc_status}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 4, flexWrap: 'wrap', fontSize: '0.82rem', color: '#94a3b8' }}>
                                <span>✉ {p.user.email}</span>
                                {kd.phone && (
                                  <a href={`tel:${kd.phone}`} style={{ color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Phone size={13} /> {kd.phone}
                                  </a>
                                )}
                                {(kd.region || kd.residential_address) && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#cbd5e1' }}>
                                    <MapPin size={13} color="#d4af37" /> {[kd.region, kd.residential_address].filter(Boolean).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <button
                              onClick={() => setKycDialog({ profile: p, action: 'approved' })}
                              style={{
                                padding: '0.55rem 1.25rem', borderRadius: 10,
                                background: '#10b981', border: 'none',
                                color: '#ffffff', fontWeight: 700, cursor: 'pointer',
                                fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                                boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                              }}
                            >
                              <CheckCircle2 size={15} /> Approve Instructor
                            </button>
                            <button
                              onClick={() => setKycDialog({ profile: p, action: 'rejected' })}
                              style={{
                                padding: '0.55rem 1.1rem', borderRadius: 10,
                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171', fontWeight: 700, cursor: 'pointer',
                                fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                              }}
                            >
                              <XCircle size={15} /> Reject
                            </button>
                          </div>
                        </div>

                        {/* Highlighted Fayda FAN & National Identification Banner */}
                        <div style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 14, padding: '1rem 1.25rem',
                          display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center',
                        }}>
                          {/* Fayda FAN Badge */}
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            background: fan ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${fan ? 'rgba(212, 175, 55, 0.35)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 10, padding: '0.4rem 0.85rem',
                          }}>
                            <span>🇪🇹</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d4af37', textTransform: 'uppercase' }}>
                              Fayda FAN:
                            </span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>
                              {fan || 'Not Provided'}
                            </span>
                            {fan && (
                              <button
                                onClick={() => copyToClipboard(fan, `fan-${p.id}`)}
                                title="Copy Fayda Access Number"
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                              >
                                {copiedKey === `fan-${p.id}` ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                              </button>
                            )}
                          </div>

                          {/* TIN Badge */}
                          {tin && (
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                              background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.35)',
                              borderRadius: 10, padding: '0.4rem 0.85rem',
                            }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase' }}>
                                Taxpayer ID (TIN):
                              </span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
                                {tin}
                              </span>
                              <button
                                onClick={() => copyToClipboard(tin, `tin-${p.id}`)}
                                title="Copy TIN"
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                              >
                                {copiedKey === `tin-${p.id}` ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                              </button>
                            </div>
                          )}

                          {/* ID Document Type & Number */}
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem', color: '#cbd5e1',
                          }}>
                            <FileText size={14} color="#38bdf8" />
                            <strong style={{ color: '#f8fafc' }}>{kd.id_type || 'National ID'}</strong>
                            {kd.id_number && <span>· #{kd.id_number}</span>}
                            {kd.id_expiry && <span>· Exp: {kd.id_expiry}</span>}
                          </div>

                          {/* DOB & Gender */}
                          {(kd.date_of_birth || kd.gender) && (
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.4rem 0.8rem',
                              fontSize: '0.8rem', color: '#cbd5e1',
                            }}>
                              <Calendar size={14} color="#f59e0b" />
                              <span>DOB: {kd.date_of_birth || 'N/A'} ({kd.gender || 'Not specified'})</span>
                            </div>
                          )}

                          {/* Academic Qualification */}
                          {(kd.education_level || kd.institution) && (
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.4rem 0.8rem',
                              fontSize: '0.8rem', color: '#cbd5e1',
                            }}>
                              <Award size={14} color="#a855f7" />
                              <span>{kd.education_level || 'Degree'} {kd.institution ? `— ${kd.institution}` : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Document Inspection Gallery */}
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <ShieldCheck size={14} color="#d4af37" /> Official Verification Documents & Biometric Selfie:
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {/* Front ID Card */}
                            <div style={{
                              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 12, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399' }}>
                                  🪪 ID / Fayda Front
                                </span>
                                {docs.id_front?.url && (
                                  <button
                                    onClick={() => setDocModal({ url: docs.id_front!.url!, title: `${legalName} — National ID Front` })}
                                    style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}
                                  >
                                    <Eye size={12} /> Inspect
                                  </button>
                                )}
                              </div>
                              {docs.id_front?.url ? (
                                <div
                                  onClick={() => setDocModal({ url: docs.id_front!.url!, title: `${legalName} — National ID Front` })}
                                  style={{ height: 110, borderRadius: 8, overflow: 'hidden', background: '#020617', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <img src={docs.id_front.url} alt="ID Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              ) : (
                                <div style={{ height: 110, borderRadius: 8, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                                  Not uploaded
                                </div>
                              )}
                            </div>

                            {/* Back ID Card */}
                            <div style={{
                              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 12, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8' }}>
                                  🪪 ID / Fayda Back
                                </span>
                                {docs.id_back?.url && (
                                  <button
                                    onClick={() => setDocModal({ url: docs.id_back!.url!, title: `${legalName} — National ID Back` })}
                                    style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}
                                  >
                                    <Eye size={12} /> Inspect
                                  </button>
                                )}
                              </div>
                              {docs.id_back?.url ? (
                                <div
                                  onClick={() => setDocModal({ url: docs.id_back!.url!, title: `${legalName} — National ID Back` })}
                                  style={{ height: 110, borderRadius: 8, overflow: 'hidden', background: '#020617', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <img src={docs.id_back.url} alt="ID Back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              ) : (
                                <div style={{ height: 110, borderRadius: 8, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                                  Not uploaded
                                </div>
                              )}
                            </div>

                            {/* Verification Selfie */}
                            <div style={{
                              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 12, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24' }}>
                                  🤳 Verification Selfie
                                </span>
                                {docs.selfie?.url && (
                                  <button
                                    onClick={() => setDocModal({ url: docs.selfie!.url!, title: `${legalName} — Verification Selfie` })}
                                    style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}
                                  >
                                    <Eye size={12} /> Inspect
                                  </button>
                                )}
                              </div>
                              {docs.selfie?.url ? (
                                <div
                                  onClick={() => setDocModal({ url: docs.selfie!.url!, title: `${legalName} — Verification Selfie` })}
                                  style={{ height: 110, borderRadius: 8, overflow: 'hidden', background: '#020617', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <img src={docs.selfie.url} alt="Verification Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              ) : (
                                <div style={{ height: 110, borderRadius: 8, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                                  Not uploaded
                                </div>
                              )}
                            </div>

                            {/* Certificate / Degree */}
                            <div style={{
                              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 12, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d4af37' }}>
                                  📜 Degree / Certificate
                                </span>
                                {docs.certificate?.url && (
                                  <button
                                    onClick={() => setDocModal({ url: docs.certificate!.url!, title: `${legalName} — Degree / Certificate` })}
                                    style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}
                                  >
                                    <Eye size={12} /> Inspect
                                  </button>
                                )}
                              </div>
                              {docs.certificate?.url ? (
                                <div
                                  onClick={() => setDocModal({ url: docs.certificate!.url!, title: `${legalName} — Degree / Certificate` })}
                                  style={{ height: 110, borderRadius: 8, overflow: 'hidden', background: '#020617', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  {docs.certificate.url.match(/\.pdf($|\?)/i) ? (
                                    <div style={{ color: '#d4af37', textAlign: 'center', padding: '0.5rem' }}>
                                      <FileText size={32} style={{ margin: '0 auto 4px' }} />
                                      <span style={{ fontSize: '0.75rem' }}>View PDF Document</span>
                                    </div>
                                  ) : (
                                    <img src={docs.certificate.url} alt="Certificate" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  )}
                                </div>
                              ) : (
                                <div style={{ height: 110, borderRadius: 8, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                                  Not uploaded
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Extra Documents Link Bar if any */}
                        {p.signedKycDocs && p.signedKycDocs.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', paddingTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>All Attached Files:</span>
                            {p.signedKycDocs.map((doc, idx) => (
                              <button
                                key={idx}
                                onClick={() => doc.url && setDocModal({ url: doc.url, title: `Document #${idx + 1}` })}
                                style={{
                                  padding: '0.35rem 0.75rem', borderRadius: 8,
                                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#818cf8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                                }}
                              >
                                📄 File #{idx + 1}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Applicant Notes / Qualifications */}
                        {(kd.notes || p.bio) && (
                          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <strong style={{ color: '#94a3b8' }}>Applicant Statement: </strong>
                            {kd.notes || p.bio}
                          </div>
                        )}

                        {/* Rejection Feedback Note if previously rejected */}
                        {p.kyc_rejection_reason && (
                          <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#fca5a5',
                          }}>
                            <strong>Previous Review Feedback: </strong> {p.kyc_rejection_reason}
                            {p.kyc_reviewed_by && <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>— By {p.kyc_reviewed_by}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PAYOUTS */}
          {tab === 'payouts' && (
            <div>
              <h2 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '1rem' }}>Instructor Payout Requests</h2>
              {payouts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(15,23,42,0.5)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }}>
                  No payout requests recorded.
                </div>
              ) : (
                <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr 120px 180px', padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    <span>Amount</span>
                    <span>Method</span>
                    <span>Account Details</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  {payouts.map((p) => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr 120px 180px', padding: '1rem 1.25rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#d4af37' }}>{Number(p.amount).toLocaleString()} ETB</div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'capitalize' }}>{p.method.replace('_', ' ')}</div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{p.account_details || '—'}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: p.status === 'paid' ? '#34d399' : p.status === 'pending' ? '#f59e0b' : '#ef4444' }}>
                        {p.status.toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {p.status === 'pending' && (
                          <>
                            <button onClick={() => setPayoutDialog({ payout: p, action: 'paid' })} style={{ padding: '0.35rem 0.65rem', borderRadius: 6, background: '#10b981', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                              Mark Paid
                            </button>
                            <button onClick={() => setPayoutDialog({ payout: p, action: 'failed' })} style={{ padding: '0.35rem 0.65rem', borderRadius: 6, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                              Fail
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <input
                  type="search"
                  placeholder="Search by name or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 240, padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
                />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  style={{ padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
                >
                  <option value="">All Roles</option>
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 120px 140px', padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  <span>User</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span>Joined</span>
                </div>
                {users.map((u) => (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 120px 140px', padding: '0.9rem 1.25rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{u.first_name} {u.last_name || ''}</div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{u.email}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: u.role === 'admin' ? '#d4af37' : u.role === 'instructor' ? '#818cf8' : '#34d399', textTransform: 'capitalize' }}>
                      {u.role}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{new Date(u.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COURSES */}
          {tab === 'courses' && (
            <div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <input
                  type="search"
                  placeholder="Search course title…"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 240, padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
                />
                <select
                  value={courseStatusFilter}
                  onChange={(e) => setCourseStatusFilter(e.target.value)}
                  style={{ padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
                >
                  <option value="">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 100px 100px 200px', padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  <span>Course Title</span>
                  <span>Instructor</span>
                  <span>Price</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {courses.map((c) => (
                  <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 100px 100px 200px', padding: '0.9rem 1.25rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{c.title}</div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{c.instructor?.user?.email}</div>
                    <div style={{ fontWeight: 700, color: '#d4af37', fontSize: '0.85rem' }}>{Number(c.price) === 0 ? 'Free' : `${c.price} ETB`}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: c.status === 'published' ? '#34d399' : '#f59e0b', textTransform: 'capitalize' }}>{c.status}</div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {c.status !== 'published' && (
                        <button onClick={() => handleCourseStatus(c.id, 'published')} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: '#10b981', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                          Publish
                        </button>
                      )}
                      {c.status !== 'archived' && (
                        <button onClick={() => handleCourseStatus(c.id, 'archived')} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                          Archive
                        </button>
                      )}
                      <button onClick={() => handleDeleteCourse(c.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TRANSACTIONS LEDGER */}
          {tab === 'transactions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <input
                  type="search"
                  placeholder="Search TxRef or email…"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  style={{ minWidth: 260, padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
                />
                <button
                  onClick={handleExportCsv}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: 10, background: '#818cf8', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Download size={16} /> Export CSV Ledger
                </button>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 120px 120px 100px', padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  <span>Tx Reference</span>
                  <span>Payer</span>
                  <span>Amount</span>
                  <span>Commission</span>
                  <span>Status</span>
                </div>
                {transactions.map((t) => (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 120px 120px 100px', padding: '0.9rem 1.25rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc', fontFamily: 'monospace' }}>{t.provider_tx_ref || t.id.slice(0, 13)}</div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{t.user?.email || 'Guest'}</div>
                    <div style={{ fontWeight: 700, color: '#34d399' }}>{Number(t.amount).toLocaleString()} ETB</div>
                    <div style={{ fontSize: '0.82rem', color: '#d4af37' }}>{Number(t.platform_fee).toLocaleString()} ETB</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: t.status === 'paid' ? '#34d399' : '#f59e0b', textTransform: 'uppercase' }}>{t.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORIES */}
          {tab === 'categories' && (
            <div>
              <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="New Category Name (e.g. Software Development)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{ flex: 1, minWidth: 260, padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f8fafc', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={catSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.4rem', borderRadius: 10, background: '#10b981', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus size={16} /> Add Category
                </button>
              </form>

              <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 100px', padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  <span>Category Name</span>
                  <span>Slug</span>
                  <span>Courses</span>
                  <span>Action</span>
                </div>
                {categories.map((cat) => (
                  <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 100px', padding: '0.9rem 1.25rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{cat.name}</div>
                    <div style={{ fontSize: '0.82rem', color: '#818cf8', fontFamily: 'monospace' }}>{cat.slug}</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{cat._count?.courses ?? 0}</div>
                    <div>
                      <button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: '0.35rem 0.65rem', borderRadius: 6, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <Footer />
    </main>
  );
}

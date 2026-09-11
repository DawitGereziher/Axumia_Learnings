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
  signedKycDocs?: Array<{ key: string; url: string | null }>;
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
  title, actionLabel, actionColor, onConfirm, onCancel, busy,
}: {
  title: string; actionLabel: string; actionColor: string;
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
          placeholder="Internal note (optional)…"
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

  const loadKyc = useCallback(async () => {
    try { setKyc(await api.get('/kyc/pending')); } catch (e: any) { showToast(e.message, false); }
  }, [showToast]);

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
    if (tab === 'kyc') loadKyc();
    else if (tab === 'payouts') loadPayouts();
    else if (tab === 'users') loadUsers();
    else if (tab === 'courses') loadCourses();
    else if (tab === 'transactions') loadTransactions();
    else if (tab === 'categories') loadCategories();
  }, [tab, user]); // eslint-disable-line

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
      showToast(`KYC ${kycDialog.action} successfully.`);
      setKycDialog(null);
      loadKyc();
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
          title={kycDialog.action === 'approved' ? 'Approve Instructor KYC' : 'Reject Instructor KYC'}
          actionLabel={kycDialog.action === 'approved' ? 'Approve' : 'Reject'}
          actionColor={kycDialog.action === 'approved' ? '#10b981' : '#ef4444'}
          onConfirm={handleKycAction}
          onCancel={() => setKycDialog(null)}
          busy={kycBusy}
        />
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
            <div>
              <h2 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '1rem' }}>Pending Instructor KYC Applications</h2>
              {kyc.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(15,23,42,0.5)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }}>
                  No pending KYC applications. All instructors are verified!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {kyc.map((p) => (
                    <div key={p.id} style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>
                            {p.user.first_name} {p.user.last_name} ({p.user.email})
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#818cf8', marginTop: 2 }}>{p.headline || 'Instructor Applicant'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setKycDialog({ profile: p, action: 'approved' })}
                            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: '#10b981', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Approve Profile
                          </button>
                          <button
                            onClick={() => setKycDialog({ profile: p, action: 'rejected' })}
                            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      {p.bio && <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '1rem' }}>{p.bio}</p>}

                      {p.signedKycDocs && p.signedKycDocs.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>Uploaded Verification Documents:</div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {p.signedKycDocs.map((doc, idx) => (
                              <a
                                key={idx}
                                href={doc.url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                style={{ padding: '0.4rem 0.8rem', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#818cf8', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}
                              >
                                📄 View Document #{idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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

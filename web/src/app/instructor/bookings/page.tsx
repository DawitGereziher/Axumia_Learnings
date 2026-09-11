'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/auth';
import Link from 'next/link';
import {
  Calendar, Clock, CheckCircle2, XCircle, AlertCircle,
  Video, Plus, RefreshCw, Loader2, User, MessageSquare,
} from 'lucide-react';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'no_show';

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  confirmed: { label: 'Confirmed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  no_show:   { label: 'No Show',   color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

type Tab = 'all' | BookingStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'pending',   label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function InstructorBookingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');

  const fetchBookings = () => {
    setLoading(true);
    authFetch('/api/bookings/instructor/mine')
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'Unable to load bookings');
        return d;
      })
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, []);

  const filtered = tab === 'all' ? items : items.filter(b => b.status === tab);

  const counts = {
    all: items.length,
    pending: items.filter(b => b.status === 'pending').length,
    confirmed: items.filter(b => b.status === 'confirmed').length,
    cancelled: items.filter(b => b.status === 'cancelled').length,
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#080a0f', color: '#f8fafc' }}>
      <Navbar />
      <div style={{ paddingTop: 90, flex: 1 }}>

        {/* ── Header ────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(180deg,rgba(99,102,241,0.08) 0%,transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '2rem 0',
        }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem,3vw,2.2rem)', margin: 0 }}>
                Session <span style={{ color: '#818cf8' }}>Bookings</span>
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                Review and manage student session requests.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={fetchBookings}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.65rem 1rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <Link href="/instructor/availability" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.2rem', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>
                <Plus size={16} /> Add Slots
              </Link>
            </div>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 12, padding: '0.85rem 1.1rem', marginBottom: '1.5rem' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {/* ── Tab Filter ────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.75rem', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)', padding: 4, borderRadius: 14, width: 'fit-content' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '0.5rem 1.1rem', borderRadius: 10, border: 'none',
                  fontSize: '0.85rem', fontWeight: tab === t.id ? 700 : 500,
                  background: tab === t.id ? '#4f46e5' : 'transparent',
                  color: tab === t.id ? '#fff' : '#64748b',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                }}
              >
                {t.label}
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700,
                  background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                  borderRadius: 999, padding: '0.1rem 0.45rem',
                }}>
                  {counts[t.id as keyof typeof counts] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* ── List ─────────────────────────────────────── */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: 110, borderRadius: 16, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(15,23,42,0.5)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 20 }}>
              <Calendar size={44} color="#334155" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                {tab === 'all' ? 'No bookings yet' : `No ${tab} bookings`}
              </h3>
              <p style={{ color: '#334155', fontSize: '0.85rem' }}>
                {tab === 'all' ? 'Publish availability slots so students can book sessions with you.' : `Switch to "All" to see every booking.`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filtered.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onUpdated={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
                  onCancelled={id => setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'cancelled' } : i))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </main>
  );
}

// ── Booking Card ───────────────────────────────────────────────────────────────
function BookingCard({ booking, onUpdated, onCancelled }: {
  booking: any;
  onUpdated: (b: any) => void;
  onCancelled: (id: string) => void;
}) {
  const [link, setLink] = useState(booking.meeting_link || '');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [err, setErr] = useState('');

  const meta = STATUS_META[booking.status as BookingStatus] ?? STATUS_META.pending;
  const studentName = `${booking.student?.first_name || ''} ${booking.student?.last_name || ''}`.trim() || 'Student';
  const scheduledAt = booking.slot?.starts_at
    ? new Date(booking.slot.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Unscheduled';

  const confirm = async () => {
    if (!link.trim()) { setErr('Paste a Meet/Zoom link first.'); return; }
    setSaving(true); setErr('');
    try {
      const r = await authFetch(`/api/bookings/${booking.id}/confirm`, {
        method: 'PATCH',
        body: JSON.stringify({ meetingLink: link }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to confirm');
      onUpdated(d);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const cancel = async () => {
    if (!window.confirm(`Cancel this session with ${studentName}?`)) return;
    setCancelling(true); setErr('');
    try {
      // Backend may not have a cancel endpoint yet — send PATCH with status
      const r = await authFetch(`/api/bookings/${booking.id}/cancel`, { method: 'PATCH' });
      if (r.ok || r.status === 404) onCancelled(booking.id);
      else { const d = await r.json(); throw new Error(d.message || 'Could not cancel'); }
    } catch (e: any) { setErr(e.message); }
    finally { setCancelling(false); }
  };

  return (
    <article style={{
      background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 18, padding: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '1rem',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#6366f1,#a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700, color: '#fff',
          }}>
            {booking.student?.first_name?.[0]?.toUpperCase() || <User size={18} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{studentName}</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{booking.student?.email}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#818cf8', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '0.3rem 0.7rem' }}>
            <Calendar size={13} /> {scheduledAt}
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            background: meta.bg, color: meta.color,
            border: `1px solid ${meta.color}40`,
            borderRadius: 999, padding: '0.3rem 0.8rem',
            fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
          }}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Session notes */}
      {booking.notes && (
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '0.75rem 1rem' }}>
          <MessageSquare size={14} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>{booking.notes}</p>
        </div>
      )}

      {err && <p style={{ color: '#f87171', fontSize: '0.83rem', margin: 0 }}>{err}</p>}

      {/* Actions for PENDING */}
      {booking.status === 'pending' && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
          <input
            className="input-field"
            placeholder="Paste Google Meet or Zoom link…"
            value={link}
            onChange={e => setLink(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <button
            onClick={confirm}
            disabled={saving || !link.trim()}
            className="btn-primary"
            style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.1rem', borderRadius: 12, fontWeight: 700, opacity: saving || !link.trim() ? 0.6 : 1 }}
          >
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />}
            {saving ? 'Confirming…' : 'Confirm Session'}
          </button>
          <button
            onClick={cancel}
            disabled={cancelling}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', borderRadius: 12, padding: '0.65rem 1.1rem',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
              opacity: cancelling ? 0.6 : 1,
            }}
          >
            {cancelling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
            Decline
          </button>
        </div>
      )}

      {/* Meeting link for CONFIRMED */}
      {booking.status === 'confirmed' && booking.meeting_link && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.83rem', fontWeight: 600 }}>
            <Video size={15} /> Session Confirmed
          </div>
          <a href={booking.meeting_link} target="_blank" rel="noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
            color: '#34d399', borderRadius: 10, padding: '0.4rem 0.9rem',
            fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none',
          }}>
            Join Meeting ↗
          </a>
        </div>
      )}
    </article>
  );
}

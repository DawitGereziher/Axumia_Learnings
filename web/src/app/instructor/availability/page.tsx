'use client';

import React, { FormEvent, useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  Plus, Calendar, Clock, Trash2, CheckCircle2, AlertCircle,
  RefreshCw, Loader2, CalendarDays, ChevronRight, X,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function AvailabilityPage() {
  const { user } = useAuth();

  // Existing slots
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [createErr, setCreateErr] = useState('');

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Fetch profile id first, then slots
  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      // Get my instructor profile id
      const meRes = await authFetch(`${API}/api/users/me`);
      const me = await meRes.json();
      const pid = me?.instructorProfile?.id;
      if (!pid) { setLoadingSlots(false); return; }
      setProfileId(pid);

      const res = await fetch(`${API}/api/bookings/slots/instructor/${pid}`);
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally { setLoadingSlots(false); }
  }, []);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateMsg(''); setCreateErr('');

    if (new Date(ends) <= new Date(starts)) {
      setCreateErr('End time must be after start time.');
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch('/api/bookings/slots', {
        method: 'POST',
        body: JSON.stringify({
          starts_at: new Date(starts).toISOString(),
          ends_at: new Date(ends).toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not create slot');
      setCreateMsg('Slot published successfully!');
      setStarts(''); setEnds('');
      setShowForm(false);
      fetchSlots();
    } catch (err: any) { setCreateErr(err.message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (slotId: string) => {
    if (!confirm('Delete this slot? Any pending bookings for it may be affected.')) return;
    setDeletingId(slotId);
    try {
      const res = await authFetch(`/api/bookings/slots/${slotId}`, { method: 'DELETE' });
      if (res.ok || res.status === 404) {
        setSlots(prev => prev.filter(s => s.id !== slotId));
      }
    } catch { /* silent */ } finally { setDeletingId(null); }
  };

  // Group slots by date
  const grouped = slots.reduce<Record<string, any[]>>((acc, s) => {
    const key = new Date(s.starts_at).toDateString();
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});

  const now = new Date();

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#080a0f', color: '#f8fafc' }}>
      <Navbar />
      <div style={{ paddingTop: 90, flex: 1 }}>

        {/* ── Header ────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(180deg,rgba(16,185,129,0.08) 0%,transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '2rem 0',
        }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem,3vw,2.2rem)', margin: 0 }}>
                Manage <span style={{ color: '#34d399' }}>Availability</span>
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                Set when students can book 1-on-1 sessions. Slots appear on your booking page.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => fetchSlots()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '0.65rem 1rem', color: '#94a3b8',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <Link href="/instructor/bookings" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '0.65rem 1rem', color: '#94a3b8',
                fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none',
              }}>
                View Bookings <ChevronRight size={14} />
              </Link>
              <button
                onClick={() => { setShowForm(true); setCreateErr(''); setCreateMsg(''); }}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.2rem', borderRadius: 12, fontWeight: 700 }}
              >
                <Plus size={16} /> Add Slot
              </button>
            </div>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>

          {/* Global success */}
          {createMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', borderRadius: 12, padding: '0.85rem 1.1rem', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={18} /> {createMsg}
              <button onClick={() => setCreateMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
            </div>
          )}

          {/* ── Slots List ────────────────────────────────────── */}
          {loadingSlots ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: 90, borderRadius: 16, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '5rem 2rem',
              background: 'rgba(15,23,42,0.6)', border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 20,
            }}>
              <CalendarDays size={48} color="#334155" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>No slots published yet</h3>
              <p style={{ color: '#334155', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                Add your first availability window so students can book sessions with you.
              </p>
              <button onClick={() => setShowForm(true)} className="btn-primary" style={{ padding: '0.65rem 1.4rem', borderRadius: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Plus size={16} /> Add Your First Slot
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Stats bar */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Slots', value: slots.length, color: '#818cf8' },
                  { label: 'Upcoming', value: slots.filter(s => new Date(s.starts_at) > now).length, color: '#10b981' },
                  { label: 'Booked', value: slots.filter(s => s.booking).length, color: '#f59e0b' },
                  { label: 'Available', value: slots.filter(s => !s.booking && new Date(s.starts_at) > now).length, color: '#34d399' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '0.85rem 1.25rem', minWidth: 110 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Grouped by date */}
              {Object.entries(grouped).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime()).map(([dateStr, daySlots]) => (
                <div key={dateStr}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <Calendar size={15} color="#818cf8" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#818cf8' }}>{dateStr}</span>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>· {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                    {daySlots.map((s: any) => {
                      const isPast = new Date(s.starts_at) < now;
                      const isBooked = !!s.booking;
                      return (
                        <div key={s.id} style={{
                          background: isPast ? 'rgba(15,23,42,0.4)' : isBooked ? 'rgba(245,158,11,0.08)' : 'rgba(15,23,42,0.7)',
                          border: `1px solid ${isBooked ? 'rgba(245,158,11,0.3)' : isPast ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 14, padding: '1.1rem 1.25rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          opacity: isPast ? 0.55 : 1,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                              background: isBooked ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: isBooked ? '#f59e0b' : '#34d399',
                            }}>
                              <Clock size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f8fafc' }}>
                                {formatTime(s.starts_at)} → {formatTime(s.ends_at)}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                                {formatDate(s.starts_at)}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{
                              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                              padding: '0.2rem 0.6rem', borderRadius: 999,
                              background: isPast ? 'rgba(100,116,139,0.15)' : isBooked ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)',
                              color: isPast ? '#64748b' : isBooked ? '#f59e0b' : '#34d399',
                              border: `1px solid ${isPast ? 'rgba(100,116,139,0.2)' : isBooked ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
                            }}>
                              {isPast ? 'Past' : isBooked ? 'Booked' : 'Open'}
                            </span>

                            {!isBooked && !isPast && (
                              <button
                                onClick={() => handleDelete(s.id)}
                                disabled={deletingId === s.id}
                                title="Delete slot"
                                style={{
                                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                  borderRadius: 8, padding: '0.35rem', color: '#f87171',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                                  opacity: deletingId === s.id ? 0.5 : 1,
                                }}
                              >
                                {deletingId === s.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Slot Modal ─────────────────────────────────── */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div style={{
            background: 'linear-gradient(160deg,#0f172a,#0c1222)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 24, padding: '2rem', maxWidth: 460, width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>Add Availability Slot</h3>
                <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.25rem' }}>Students will be able to book this time window.</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
            </div>

            {createErr && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                <AlertCircle size={16} /> {createErr}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Session Start
                </label>
                <input
                  type="datetime-local"
                  required
                  value={starts}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => setStarts(e.target.value)}
                  style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: '0.95rem', outline: 'none', colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Session End
                </label>
                <input
                  type="datetime-local"
                  required
                  value={ends}
                  min={starts || new Date().toISOString().slice(0, 16)}
                  onChange={e => setEnds(e.target.value)}
                  style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: '0.95rem', outline: 'none', colorScheme: 'dark' }}
                />
              </div>
              {starts && ends && new Date(ends) > new Date(starts) && (
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '0.65rem 0.9rem', fontSize: '0.82rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={14} />
                  Duration: {Math.round((new Date(ends).getTime() - new Date(starts).getTime()) / 60000)} minutes
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary" style={{ flex: 1, padding: '0.85rem', borderRadius: 12, fontWeight: 700, opacity: creating ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  {creating ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Publishing…</> : <><Plus size={15} /> Publish Slot</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </main>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch } from '@/lib/auth';
import {
  User,
  Users,
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  ArrowLeft,
  Sparkles,
  CreditCard,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

export default function BookInstructorSessionPage() {
  const { id } = useParams(); // instructor user_id or profile id
  const router = useRouter();
  const { t } = useLanguage();

  const [instructor, setInstructor] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [sessionType, setSessionType] = useState<'1-on-1' | '1-on-many' | 'group-class'>('1-on-1');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchInstructorData();
  }, [id]);

  const fetchInstructorData = async () => {
    try {
      setLoading(true);
      // 1. Fetch instructor details
      const resInst = await fetch(`${API}/api/users/instructors/${id}`);
      const dataInst = await resInst.json();

      let profile = dataInst.data || dataInst;
      // If fetching by user_id failed or returned array, find matching profile
      if (!profile || !profile.id) {
        const resAll = await fetch(`${API}/api/users/instructors`);
        const dataAll = await resAll.json();
        profile = (dataAll.data || []).find((i: any) => i.user_id === id || i.id === id);
      }

      setInstructor(profile);

      if (profile?.id) {
        // 2. Fetch available slots
        const resSlots = await fetch(`${API}/api/bookings/slots/instructor/${profile.id}`);
        if (resSlots.ok) {
          const slotsData = await resSlots.json();
          setSlots(Array.isArray(slotsData) ? slotsData : []);
          if (Array.isArray(slotsData) && slotsData.length > 0) {
            setSelectedSlotId(slotsData[0].id);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load instructor schedule.');
    } finally {
      setLoading(false);
    }
  };

  const baseRate = Number(instructor?.hourly_rate || 500);

  // Pricing multipliers
  const getMultiplier = () => {
    if (sessionType === '1-on-many') return 0.6;
    if (sessionType === 'group-class') return 0.4;
    return 1.0;
  };

  const calculatedPrice = Math.round(baseRate * getMultiplier());

  const handleBooking = async () => {
    if (!selectedSlotId) {
      setError('Please select an available date and time slot.');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push(`/login?redirect=/book-session/${id}`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Step 1: Request Booking
      const reqRes = await fetch(`${API}/api/bookings/request/${selectedSlotId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_type: sessionType,
          notes,
        }),
      });

      if (!reqRes.ok) {
        const errData = await reqRes.json();
        throw new Error(errData.message || 'Failed to request session slot');
      }

      const booking = await reqRes.json();

      // Step 2: Initiate Payment (Chapa)
      const payRes = await authFetch(`/api/payments/bookings/${booking.id}/checkout`, {
        method: 'POST',
      });

      if (!payRes.ok) {
        const payErr = await payRes.json();
        throw new Error(payErr.message || 'Failed to initiate payment');
      }

      const payData = await payRes.json();

      if (payData.checkoutUrl) {
        window.location.href = payData.checkoutUrl;
      } else {
        router.push(`/dashboard?booking_success=${booking.id}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const avatarUrl = getFullUrl(instructor?.profile_image || instructor?.user?.image);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      <div style={{ paddingTop: '80px', flex: 1, paddingBottom: '4rem' }}>
        {/* Header section */}
        <div style={{ background: 'linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)', padding: '2.5rem 1.5rem 1.5rem', borderBottom: '1px solid var(--card-border)' }}>
          <div className="container" style={{ maxWidth: 960 }}>
            <Link href="/book-session" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#818cf8', fontSize: '0.9rem', marginBottom: '1rem', textDecoration: 'none', fontWeight: 500 }}>
              <ArrowLeft size={16} /> Back to All Instructors
            </Link>

            {loading ? (
              <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />
            ) : instructor ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                  background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#6366f1,#a78bfa)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', fontWeight: 700, color: '#fff', overflow: 'hidden',
                }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={instructor.user?.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    instructor.user?.first_name?.[0] || 'I'
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.75rem', fontWeight: 700 }}>
                      Book a Session with {instructor.user?.first_name} {instructor.user?.last_name}
                    </h1>
                    <span className="badge badge-accent" style={{ fontSize: '0.75rem' }}>Verified Instructor</span>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                    {instructor.headline || 'Expert Educator & Tutor'}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {instructor?.avg_rating ? (
                    <div style={{ color: '#f59e0b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
                      <Star size={16} fill="#f59e0b" color="#f59e0b" /> {Number(instructor.avg_rating).toFixed(1)}
                      {instructor.total_students > 0 && <span style={{ color: '#94a3b8', fontWeight: 400 }}>({instructor.total_students} students)</span>}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '0.25rem' }}>New Instructor</div>
                  )}
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#818cf8' }}>
                    {baseRate} ETB <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 400 }}>base rate / hr</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Form Container */}
        <div className="container" style={{ maxWidth: 960, marginTop: '2rem' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '1rem 1.25rem', borderRadius: 12, color: '#ef4444', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {/* Left Column: Options & Slot Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              
              {/* Step 1: Choose Session Type */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} color="#818cf8" /> 1. Select Session Format
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Choose the learning environment that best fits your goals and budget.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Option A: 1-on-1 */}
                  <div
                    onClick={() => setSessionType('1-on-1')}
                    style={{
                      border: sessionType === '1-on-1' ? '2px solid #6366f1' : '1px solid var(--card-border)',
                      background: sessionType === '1-on-1' ? 'rgba(99,102,241,0.06)' : 'var(--bg-secondary)',
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ padding: '0.5rem', borderRadius: 8, background: sessionType === '1-on-1' ? '#6366f1' : 'rgba(255,255,255,0.06)', color: '#fff' }}>
                      <User size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>1-on-1 Private Session</span>
                        <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>Standard Rate</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                        Dedicated 1-on-1 live video tutoring tailored 100% to your personal learning pace.
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>
                        {baseRate} ETB <span style={{ fontWeight: 400, color: '#94a3b8' }}>/ hour</span>
                      </div>
                    </div>
                  </div>

                  {/* Option B: 1-on-Many */}
                  <div
                    onClick={() => setSessionType('1-on-many')}
                    style={{
                      border: sessionType === '1-on-many' ? '2px solid #6366f1' : '1px solid var(--card-border)',
                      background: sessionType === '1-on-many' ? 'rgba(99,102,241,0.06)' : 'var(--bg-secondary)',
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ padding: '0.5rem', borderRadius: 8, background: sessionType === '1-on-many' ? '#6366f1' : 'rgba(255,255,255,0.06)', color: '#fff' }}>
                      <Users size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>1-on-Many / Small Group</span>
                        <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 999, fontWeight: 600 }}>Save 40%</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                        Collaborative workshop with 2–5 peers. Great for project teamwork & Q&A.
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#22c55e' }}>
                        {Math.round(baseRate * 0.6)} ETB <span style={{ fontWeight: 400, color: '#94a3b8' }}>/ student (40% discount)</span>
                      </div>
                    </div>
                  </div>

                  {/* Option C: Group Class */}
                  <div
                    onClick={() => setSessionType('group-class')}
                    style={{
                      border: sessionType === 'group-class' ? '2px solid #6366f1' : '1px solid var(--card-border)',
                      background: sessionType === 'group-class' ? 'rgba(99,102,241,0.06)' : 'var(--bg-secondary)',
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ padding: '0.5rem', borderRadius: 8, background: sessionType === 'group-class' ? '#6366f1' : 'rgba(255,255,255,0.06)', color: '#fff' }}>
                      <GraduationCap size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Group Class / Masterclass</span>
                        <span style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 999, fontWeight: 600 }}>Save 60%</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                        Interactive webinar-style masterclass (6+ students) with open structured lecture.
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#a855f7' }}>
                        {Math.round(baseRate * 0.4)} ETB <span style={{ fontWeight: 400, color: '#94a3b8' }}>/ student (60% discount)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Select Date & Slot */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} color="#818cf8" /> 2. Pick Available Date & Slot
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Select an open time slot from the instructor&apos;s active calendar.
                </p>

                {slots.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                    No upcoming open slots available right now. Check back soon or request a slot.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {slots.map((s: any) => {
                      const startDate = new Date(s.starts_at);
                      const isSelected = selectedSlotId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSlotId(s.id)}
                          style={{
                            border: isSelected ? '2px solid #6366f1' : '1px solid var(--card-border)',
                            background: isSelected ? 'rgba(99,102,241,0.15)' : 'var(--bg-secondary)',
                            color: isSelected ? '#fff' : 'inherit',
                            padding: '0.75rem 1rem',
                            borderRadius: 10,
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                            {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: isSelected ? '#a5b4fc' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                            <Clock size={12} />
                            {startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Session Topics & Goal */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  3. Topics & Learning Goals (Optional)
                </h3>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="e.g. Help with Python assignment on data structures, or Grade 12 math exam prep..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

            </div>

            {/* Right Column: Order Summary Card */}
            <div>
              <div className="card" style={{ padding: '1.75rem', position: 'sticky', top: '100px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
                  Booking Summary
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Instructor:</span>
                    <span style={{ color: '#fff', fontWeight: 500 }}>{instructor?.user?.first_name} {instructor?.user?.last_name}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Format:</span>
                    <span style={{ color: '#fff', fontWeight: 500, textTransform: 'capitalize' }}>
                      {sessionType.replace('-', ' ')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Base Hourly Rate:</span>
                    <span>{baseRate} ETB</span>
                  </div>

                  {sessionType !== '1-on-1' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
                      <span>Group Discount:</span>
                      <span>-{baseRate - calculatedPrice} ETB</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '1rem', marginTop: '0.5rem', fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>
                    <span>Total Amount:</span>
                    <span style={{ color: '#818cf8' }}>{calculatedPrice} ETB</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBooking}
                  disabled={submitting || !selectedSlotId}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: submitting || !selectedSlotId ? 0.7 : 1,
                  }}
                >
                  <CreditCard size={18} />
                  {submitting ? 'Processing Booking...' : 'Proceed to Payment (Chapa)'}
                </button>

                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={14} color="#22c55e" /> Escrow protected payment release
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={14} color="#22c55e" /> Automated Google Meet link on confirmation
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={14} color="#22c55e" /> Full refund if session is cancelled
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

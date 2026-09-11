'use client';

import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/auth';
import { coursesApi, type CourseProgress, type CourseLesson, type LessonMaterial } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedYouTubePlayer from '@/components/ProtectedYouTubePlayer';
import QuizPlayer from '@/components/quiz/QuizPlayer';
import { awardXP } from '@/components/gamification/GamificationWidget';



// ─── Helpers ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function fmtDuration(s: number | null | undefined) {
  if (!s) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function materialIcon(type: string) {
  const map: Record<string, string> = {
    pdf: '📄', document: '📝', link: '🔗', zip: '📦', image: '🖼', other: '📎',
  };
  return map[type] || '📎';
}

type TabId = 'overview' | 'notes' | 'materials' | 'quiz';


// ─── Main Component ───────────────────────────────────────────────────────────

export default function CourseLearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params as any) as { slug: string };
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Course + progress state
  const [course, setCourse]           = useState<any>(null);
  const [progress, setProgress]       = useState<CourseProgress | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [videoUrl, setVideoUrl]         = useState('');
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [pageError, setPageError]       = useState('');

  // UI state
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab]       = useState<TabId>('overview');
  const [completionToast, setCompletionToast] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Certificate
  const [claimingCert, setClaimingCert] = useState(false);
  const [certResult, setCertResult]     = useState<any>(null);

  // Notes (localStorage per lesson)
  const [noteText, setNoteText]         = useState('');
  const [noteSaved, setNoteSaved]       = useState(false);
  const noteSaveTimer                   = useRef<NodeJS.Timeout | null>(null);

  // Materials for active lesson
  const [materials, setMaterials]       = useState<LessonMaterial[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pdfPreviewModalUrl, setPdfPreviewModalUrl] = useState<{ url: string; title: string } | null>(null);

  // Refs for heartbeat / concurrent safety
  const videoRef         = useRef<HTMLVideoElement>(null);
  const heartbeatRef     = useRef<NodeJS.Timeout | null>(null);
  const activeLessonRef  = useRef<CourseLesson | null>(null);
  const progressRef      = useRef<CourseProgress | null>(null);
  const courseRef        = useRef<any>(null);

  useEffect(() => { activeLessonRef.current  = activeLesson; }, [activeLesson]);
  useEffect(() => { progressRef.current      = progress;     }, [progress]);
  useEffect(() => { courseRef.current        = course;       }, [course]);

  // ── Load Note for active lesson from localStorage ──────────────────────────
  useEffect(() => {
    if (!activeLesson?.id) return;
    const saved = localStorage.getItem(`note:${activeLesson.id}`) || '';
    setNoteText(saved);
    setNoteSaved(false);
  }, [activeLesson?.id]);

  // ── Load Materials for active lesson ──────────────────────────────────────
  useEffect(() => {
    if (!activeLesson?.id) { setMaterials([]); return; }
    const ms = (activeLesson as any).materials ?? [];
    setMaterials(ms);
  }, [activeLesson?.id]);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    (async () => {
      try {
        const res  = await fetch(`${API}/api/courses/${slug}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Course not found');
        setCourse(data);
        const courseId = data.id;

        const purchaseRes  = await authFetch(`/api/courses/${courseId}/check-purchase`);
        const purchaseData = await purchaseRes.json();
        if (!purchaseData?.purchased) { router.push(`/courses/${slug}`); return; }

        const progRes = await authFetch(`/api/courses/${courseId}/progress`);
        if (progRes.ok) {
          const prog: CourseProgress = await progRes.json();
          setProgress(prog);
          const firstUnfinished = prog.lessons?.find(l => !prog.progressMap[l.id]?.completed);
          const defaultLesson   = firstUnfinished || prog.lessons?.[0];
          if (defaultLesson) doLoadLesson(defaultLesson, courseId, prog.purchaseId);
        }
      } catch (e: any) {
        setPageError(e.message);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user, authLoading]);

  // ── Progress helpers ────────────────────────────────────────────────────────
  const refreshProgress = useCallback(async (courseId: string) => {
    const res = await authFetch(`/api/courses/${courseId}/progress`);
    if (res.ok) setProgress(await res.json());
  }, []);

  const sendProgress = useCallback(async (
    lessonId: string, watched: number, total: number, purchaseId: string,
  ) => {
    try {
      const res = await authFetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          watchedSeconds: Math.floor(watched),
          totalSeconds:   Math.floor(total),
          purchaseId,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated.completed) {
          const cId = courseRef.current?.id;
          await refreshProgress(cId);
          const prev = progressRef.current?.progressMap?.[lessonId];
          if (!prev?.completed) {
            setCompletionToast(`✅ "${activeLessonRef.current?.title}" completed!`);
            setTimeout(() => setCompletionToast(''), 3500);
            // Award XP non-blockingly — gamification is fire-and-forget
            awardXP('lesson_complete', { lesson_id: lessonId, course_id: cId });
          }
        }
      }
    } catch { /* silent */ }
  }, [refreshProgress]);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
  }, []);

  const startHeartbeat = useCallback((lessonId: string, purchaseId: string) => {
    clearHeartbeat();
    heartbeatRef.current = setInterval(() => {
      const vid = videoRef.current;
      if (vid && !vid.paused && !vid.ended && vid.duration > 0) {
        sendProgress(lessonId, vid.currentTime, vid.duration, purchaseId);
      }
    }, 10_000);
  }, [clearHeartbeat, sendProgress]);

  useEffect(() => () => clearHeartbeat(), [clearHeartbeat]);

  // ── Load a lesson ──────────────────────────────────────────────────────────
  const doLoadLesson = useCallback(async (
    lesson: CourseLesson, courseId?: string, purchaseId?: string,
  ) => {
    setActiveLesson(lesson);
    setVideoUrl('');
    setLoadingVideo(true);
    clearHeartbeat();
    setActiveTab('overview');

    const pid = purchaseId || progressRef.current?.purchaseId || '';
    const cid = courseId   || courseRef.current?.id || '';

    try {
      const res  = await authFetch(`/api/courses/lessons/${lesson.id}/video-url`);
      const data = await res.json();
      if (res.ok && data.url) {
        setVideoUrl(data.url);
        if (pid) {
          if ((lesson as any).requires_progress === false) {
            await sendProgress(lesson.id, 0, 0, pid);
            refreshProgress(cid);
          } else {
            startHeartbeat(lesson.id, pid);
          }
        }
      }
    } catch { /* silent */ }
    setLoadingVideo(false);
  }, [clearHeartbeat, sendProgress, startHeartbeat, refreshProgress]);

  // ── Notes auto-save ─────────────────────────────────────────────────────────
  const handleNoteChange = (val: string) => {
    setNoteText(val);
    setNoteSaved(false);
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(() => {
      if (activeLesson?.id) {
        localStorage.setItem(`note:${activeLesson.id}`, val);
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 2000);
      }
    }, 800);
  };

  // ── Material download ───────────────────────────────────────────────────────
  const handleDownload = useCallback(async (mat: LessonMaterial) => {
    setDownloadingId(mat.id);
    try {
      const res  = await authFetch(`/api/courses/materials/${mat.id}/download-url`);
      const data = await res.json();
      if (res.ok && data.url) {
        const a = document.createElement('a');
        a.href     = data.url;
        a.download = data.fileName || mat.title;
        a.target   = '_blank';
        a.rel      = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch { /* silent */ }
    setDownloadingId(null);
  }, []);

  const handlePreviewPdf = useCallback(async (mat: LessonMaterial) => {
    try {
      const res  = await authFetch(`/api/courses/materials/${mat.id}/download-url`);
      const data = await res.json();
      if (res.ok && data.url) {
        setPdfPreviewModalUrl({ url: data.url, title: mat.title });
      }
    } catch { /* silent */ }
  }, []);

  // ── Certificate ─────────────────────────────────────────────────────────────
  const handleClaimCertificate = async () => {
    if (!course) return;
    setClaimingCert(true); setCertResult(null);
    try {
      const res  = await authFetch(`/api/certificates/courses/${course.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not generate certificate');
      setCertResult(data);
    } catch (e: any) {
      setCertResult({ error: e.message });
    }
    setClaimingCert(false);
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const lessons       = progress?.lessons ?? [];
  const currentIndex  = lessons.findIndex(l => l.id === activeLesson?.id);
  const prevLesson    = currentIndex > 0                ? lessons[currentIndex - 1] : null;
  const nextLesson    = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const completionPct = progress?.completionPct ?? 0;
  const isComplete    = progress?.courseCompleted || completionPct >= 100;

  const sections = progress?.sections ?? [];
  const sectionMap = useMemo(() => {
    const map: Record<string, CourseLesson[]> = {};
    const unsectioned: CourseLesson[] = [];
    for (const l of lessons) {
      if (l.section_id) {
        if (!map[l.section_id]) map[l.section_id] = [];
        map[l.section_id].push(l);
      } else {
        unsectioned.push(l);
      }
    }
    return { map, unsectioned };
  }, [lessons]);

  const isPdf = activeLesson?.content_type === 'pdf' || videoUrl.toLowerCase().includes('.pdf');
  const isReading = (activeLesson?.content_type as string) === 'reading' || activeLesson?.content_type === 'text' || (!videoUrl && (activeLesson as any)?.requires_progress === false);
  const isYoutube = !isPdf && !isReading && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
    || videoUrl.includes('youtube-nocookie.com'));
  const isVideo   = !isPdf && !isReading && !isYoutube && (
    videoUrl.includes('.mp4') || videoUrl.includes('.webm') ||
    activeLesson?.content_type === 'video'
  );

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Render: loading ─────────────────────────────────────────────────────────
  if (authLoading || (!course && !pageError)) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090f' }}>
        <div className="learn-spinner" />
        <style>{`
          .learn-spinner {
            width: 44px; height: 44px; border-radius: 50%;
            border: 3px solid rgba(99,102,241,0.2);
            border-top-color: #6366f1;
            animation: learnSpin 0.7s linear infinite;
          }
          @keyframes learnSpin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    );
  }

  // ── Render: error ───────────────────────────────────────────────────────────
  if (pageError) return (
    <main style={{ minHeight: '100vh', background: '#07090f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h1 style={{ color: '#f87171', fontWeight: 700, fontSize: '1.2rem' }}>{pageError}</h1>
      <Link href="/courses" style={{ color: '#818cf8', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to courses</Link>
    </main>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#07090f', overflow: 'hidden' }}>

      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <header style={{
        height: 56, background: 'rgba(13,17,23,0.98)', borderBottom: '1px solid rgba(99,102,241,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1rem', flexShrink: 0, zIndex: 60,
        backdropFilter: 'blur(12px)',
      }}>
        {/* Left: back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <Link href={`/courses/${slug}`} style={{
            color: '#6366f1', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600,
            padding: '0.3rem 0.6rem', borderRadius: 8, background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            ← Back
          </Link>
          <span style={{
            fontWeight: 700, fontSize: '0.88rem', color: '#f1f5f9',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'none',
          }} className="topbar-title">{course?.title}</span>
        </div>

        {/* Center: progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '0 1 260px' }}>
          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${completionPct}%`, height: '100%',
              background: completionPct >= 100 ? '#10b981' : 'linear-gradient(90deg,#6366f1,#818cf8)',
              borderRadius: 99, transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {completionPct}%
          </span>
        </div>

        {/* Right: sidebar toggle */}
        <button
          onClick={() => {
            if (window.innerWidth < 768) {
              setMobileMenuOpen(o => !o);
            } else {
              setSidebarOpen(o => !o);
            }
          }}
          style={{
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 8, padding: '0.35rem 0.75rem', color: '#818cf8',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {sidebarOpen ? '✕ Hide' : '☰'} <span className="sidebar-label" style={{ display: 'none' }}>Curriculum</span>
        </button>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ── Player Column ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Video area */}
          <div style={{
            background: '#000', flexShrink: 0, position: 'relative',
            aspectRatio: '16/9', maxHeight: 'calc(100dvh - 56px - 52px - 44px)',
          }}>
            {loadingVideo ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                <div className="learn-spinner" />
              </div>
            ) : isPdf ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
                <div style={{
                  padding: '0.6rem 1rem', background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>
                    <span style={{ fontSize: '1.1rem' }}>📄</span>
                    <span>Document Viewer: {activeLesson?.title}</span>
                  </div>
                  {(videoUrl || (activeLesson as any)?.external_url) && (
                    <a
                      href={videoUrl || (activeLesson as any)?.external_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '0.78rem', padding: '0.3rem 0.6rem', borderRadius: 6,
                        background: 'rgba(99,102,241,0.15)', color: '#818cf8', textDecoration: 'none',
                        border: '1px solid rgba(99,102,241,0.3)', fontWeight: 600,
                      }}
                    >
                      ↗ Open Full Window
                    </a>
                  )}
                </div>
                <iframe
                  src={videoUrl || (activeLesson as any)?.external_url}
                  style={{ width: '100%', flex: 1, border: 'none' }}
                  title="PDF Reader"
                />
              </div>
            ) : isReading ? (
              <div style={{
                width: '100%', height: '100%', overflowY: 'auto', padding: '2rem',
                background: '#0a0d14', color: '#e2e8f0', display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ maxWidth: 750, margin: '0 auto', width: '100%' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontSize: '0.78rem', fontWeight: 600, marginBottom: '1rem' }}>
                    📖 Reading &amp; Lecture Notes
                  </div>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', fontFamily: 'Outfit, sans-serif' }}>
                    {activeLesson?.title}
                  </h1>
                  <div style={{ lineHeight: 1.8, fontSize: '0.95rem', color: '#cbd5e1', whiteSpace: 'pre-line' }}>
                    {activeLesson?.description || 'No reading notes provided for this lesson. Please check the Resources tab below for attached files.'}
                  </div>
                </div>
              </div>
            ) : !videoUrl ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0c12', color: '#374151' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem', opacity: 0.3 }}>▶</div>
                <p style={{ fontSize: '0.88rem', color: '#475569' }}>Select a lesson from the sidebar</p>
              </div>
            ) : isYoutube ? (
              <ProtectedYouTubePlayer
                videoUrl={videoUrl}
                title={activeLesson?.title}
                autoplay
                style={{ borderRadius: 0, minHeight: 0, height: '100%' }}
              />
            ) : isVideo ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', background: '#000' }}
                onEnded={() => {
                  const vid = videoRef.current;
                  const pid = progressRef.current?.purchaseId || '';
                  const lid = activeLessonRef.current?.id || '';
                  if (vid && pid && lid) sendProgress(lid, vid.duration, vid.duration, pid);
                }}
              />
            ) : (
              <iframe src={videoUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
            )}
          </div>

          {/* ── Lesson nav bar ────────────────────────────────────────────── */}
          <div style={{
            padding: '0.5rem 1rem', background: 'rgba(13,17,23,0.95)',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0, height: 52,
          }}>
            <button
              onClick={() => prevLesson && doLoadLesson(prevLesson)}
              disabled={!prevLesson}
              style={{
                background: prevLesson ? 'rgba(99,102,241,0.1)' : 'transparent',
                border: `1px solid ${prevLesson ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8, color: prevLesson ? '#818cf8' : '#374151',
                padding: '0.35rem 0.85rem', cursor: prevLesson ? 'pointer' : 'not-allowed',
                fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s',
              }}
            >
              ← Prev
            </button>

            <div style={{ textAlign: 'center', flex: 1, padding: '0 0.75rem', minWidth: 0 }}>
              <div style={{
                fontWeight: 700, fontSize: '0.87rem', color: '#f1f5f9',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {activeLesson?.title || 'No lesson selected'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 1 }}>
                {currentIndex >= 0 ? `${currentIndex + 1} / ${lessons.length}` : ''}
                {activeLesson?.duration_s ? ` · ${fmtDuration(activeLesson.duration_s)}` : ''}
              </div>
            </div>

            <button
              onClick={() => nextLesson && doLoadLesson(nextLesson)}
              disabled={!nextLesson}
              style={{
                background: nextLesson ? 'rgba(99,102,241,0.1)' : 'transparent',
                border: `1px solid ${nextLesson ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8, color: nextLesson ? '#818cf8' : '#374151',
                padding: '0.35rem 0.85rem', cursor: nextLesson ? 'pointer' : 'not-allowed',
                fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s',
              }}
            >
              Next →
            </button>
          </div>

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div style={{
            height: 44, display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: '#0d1117', flexShrink: 0,
          }}>
            {(['overview', 'notes', 'materials', 'quiz'] as TabId[]).map(tab => {
              const labels: Record<TabId, string> = {
                overview:  'Overview',
                notes:     `Notes${noteText ? ' •' : ''}`,
                materials: `Materials${materials.length > 0 ? ` (${materials.length})` : ''}`,
                quiz:      'Quiz',
              };

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    color: activeTab === tab ? '#818cf8' : '#64748b',
                    fontWeight: activeTab === tab ? 700 : 500,
                    fontSize: '0.8rem', cursor: 'pointer',
                    borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                    transition: 'all 0.15s', letterSpacing: '0.01em',
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* ── Tab content ───────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', background: '#07090f' }}>

            {/* Overview */}
            {activeTab === 'overview' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeLesson?.description && (
                  <div style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12, padding: '1rem',
                  }}>
                    <h3 style={{ fontWeight: 600, fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                      About this lesson
                    </h3>
                    <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.7 }}>
                      {activeLesson.description}
                    </p>
                  </div>
                )}

                {/* Course completion + certificate */}
                {isComplete && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(212,175,55,0.05))',
                    border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '1.25rem',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#34d399', marginBottom: '0.25rem' }}>
                      🎉 Course Complete!
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.83rem', marginBottom: '1rem' }}>
                      You've finished all lessons. Claim your certificate now.
                    </p>
                    {certResult?.error && (
                      <div style={{ color: '#f87171', fontSize: '0.83rem', marginBottom: '0.75rem' }}>
                        ⚠ {certResult.error}
                      </div>
                    )}
                    {certResult?.downloadUrl ? (
                      <a
                        href={certResult.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                          background: 'linear-gradient(135deg,#d4af37,#b58c28)',
                          color: '#fff', padding: '0.6rem 1.5rem', borderRadius: 10,
                          fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                        }}
                      >
                        📥 Download Certificate PDF
                      </a>
                    ) : (
                      <button
                        onClick={handleClaimCertificate}
                        disabled={claimingCert}
                        style={{
                          background: 'linear-gradient(135deg,#d4af37,#b58c28)',
                          border: 'none', color: '#fff', padding: '0.6rem 1.5rem',
                          borderRadius: 10, fontWeight: 700, fontSize: '0.9rem',
                          cursor: claimingCert ? 'wait' : 'pointer',
                          opacity: claimingCert ? 0.7 : 1,
                        }}
                      >
                        🎓 {claimingCert ? 'Generating…' : 'Claim Certificate'}
                      </button>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!activeLesson?.description && !isComplete && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#374151' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>▶</div>
                    <p style={{ fontSize: '0.85rem' }}>Select a lesson to see its details here.</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {activeTab === 'notes' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '0.85rem', color: '#94a3b8' }}>
                    My Notes — {activeLesson?.title || 'Select a lesson'}
                  </h3>
                  {noteSaved && (
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                      ✓ Saved
                    </span>
                  )}
                </div>
                <textarea
                  value={noteText}
                  onChange={e => handleNoteChange(e.target.value)}
                  disabled={!activeLesson}
                  placeholder={activeLesson ? 'Write your notes for this lesson…' : 'Select a lesson first'}
                  style={{
                    flex: 1, minHeight: 240, resize: 'vertical',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '0.875rem', color: '#f1f5f9',
                    fontSize: '0.875rem', lineHeight: 1.7, outline: 'none',
                    fontFamily: 'var(--font-inter), sans-serif',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
                <p style={{ fontSize: '0.72rem', color: '#374151' }}>
                  Notes are saved locally in your browser per lesson.
                </p>
              </div>
            )}

            {/* Materials */}
            {activeTab === 'materials' && (
              <div style={{ padding: '1.25rem' }}>

                {materials.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#374151' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
                    <p style={{ fontSize: '0.85rem' }}>No materials for this lesson.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                      Lesson Resources ({materials.length})
                    </h3>
                    {materials.map(mat => (
                      <div key={mat.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10, padding: '0.875rem 1rem',
                        transition: 'border-color 0.15s',
                      }}>
                        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                          {materialIcon(mat.material_type)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mat.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>
                            {mat.material_type.toUpperCase()}
                            {mat.file_size ? ` · ${fmtFileSize(mat.file_size)}` : ''}
                          </div>
                          {mat.description && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>
                              {mat.description}
                            </div>
                          )}
                        </div>
                        {(mat.material_type === 'pdf' || mat.file_name?.toLowerCase().endsWith('.pdf')) && (
                          <button
                            onClick={() => handlePreviewPdf(mat)}
                            style={{
                              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                              borderRadius: 8, color: '#818cf8', padding: '0.4rem 0.75rem',
                              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            👁 Preview
                          </button>
                        )}
                        {mat.is_downloadable && (
                          <button
                            onClick={() => handleDownload(mat)}
                            disabled={downloadingId === mat.id}
                            style={{
                              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                              borderRadius: 8, color: '#818cf8', padding: '0.4rem 0.75rem',
                              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                              opacity: downloadingId === mat.id ? 0.6 : 1,
                            }}
                          >
                            {downloadingId === mat.id ? '…' : '↓ Download'}
                          </button>
                        )}
                        {mat.material_type === 'link' && mat.file_url && (
                          <a
                            href={mat.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                              borderRadius: 8, color: '#818cf8', padding: '0.4rem 0.75rem',
                              fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', flexShrink: 0,
                            }}
                          >
                            Open ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quiz */}
            {activeTab === 'quiz' && activeLesson && (
              <div style={{ padding: '1.25rem' }}>
                <QuizPlayer lessonId={activeLesson.id} />
              </div>
            )}
            {activeTab === 'quiz' && !activeLesson && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#374151', fontSize: '0.85rem' }}>
                Select a lesson to view its quiz.
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar (desktop) ─────────────────────────────────────────────── */}
        {sidebarOpen && (
          <aside style={{
            width: 320, background: '#0d1117', borderLeft: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column', flexShrink: 0,
          }} className="learn-sidebar">
            <SidebarContent
              sections={sections}
              sectionMap={sectionMap.map}
              unsectioned={sectionMap.unsectioned}
              lessons={lessons}
              activeLesson={activeLesson}
              progress={progress}
              completionPct={completionPct}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              doLoadLesson={doLoadLesson}
            />
          </aside>
        )}

        {/* ── Mobile sidebar overlay ────────────────────────────────────────── */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 70 }}
            />
            {/* Drawer */}
            <aside style={{
              position: 'fixed', top: 56, right: 0, bottom: 0, width: 320,
              background: '#0d1117', borderLeft: '1px solid rgba(99,102,241,0.15)',
              display: 'flex', flexDirection: 'column', zIndex: 80,
              animation: 'slideInRight 0.2s ease',
            }}>
              <SidebarContent
                sections={sections}
                sectionMap={sectionMap.map}
                unsectioned={sectionMap.unsectioned}
                lessons={lessons}
                activeLesson={activeLesson}
                progress={progress}
                completionPct={completionPct}
                collapsedSections={collapsedSections}
                toggleSection={toggleSection}
                doLoadLesson={(l) => { doLoadLesson(l); setMobileMenuOpen(false); }}
              />
            </aside>
          </>
        )}
      </div>

      {/* ── Completion Toast ──────────────────────────────────────────────────── */}
      {completionToast && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg,#10b981,#059669)',
          color: '#fff', padding: '0.75rem 1.75rem', borderRadius: 12,
          fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '0 8px 32px rgba(16,185,129,0.35)', zIndex: 9999,
          animation: 'slideUpToast 0.3s ease',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          {completionToast}
        </div>
      )}

      <style>{`
        @keyframes learnSpin { to { transform: rotate(360deg); } }
        @keyframes slideUpToast {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

        /* Mobile responsive */
        @media (max-width: 767px) {
          .learn-sidebar { display: none !important; }
          .topbar-title  { display: block !important; max-width: 140px; }
          .sidebar-label { display: inline !important; }
        }
        @media (min-width: 768px) {
          .topbar-title  { display: block !important; }
          .sidebar-label { display: inline !important; }
        }
      `}</style>

      {/* Modal PDF Preview for Materials */}
      {pdfPreviewModalUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            height: 54, background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
              <span>📄</span> Preview: {pdfPreviewModalUrl.title}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <a
                href={pdfPreviewModalUrl.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: 6, background: 'rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600,
                }}
              >
                Open in Tab ↗
              </a>
              <button
                type="button"
                onClick={() => setPdfPreviewModalUrl(null)}
                style={{
                  background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem',
                  cursor: 'pointer', padding: '0.2rem 0.5rem', fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>
          </div>
          <iframe
            src={pdfPreviewModalUrl.url}
            style={{ width: '100%', flex: 1, border: 'none' }}
            title="PDF Document Preview"
          />
        </div>
      )}
    </main>
  );
}

// ─── Sidebar Content Component ────────────────────────────────────────────────

interface SidebarProps {
  sections: any[];
  sectionMap: Record<string, CourseLesson[]>;
  unsectioned: CourseLesson[];
  lessons: CourseLesson[];
  activeLesson: CourseLesson | null;
  progress: CourseProgress | null;
  completionPct: number;
  collapsedSections: Set<string>;
  toggleSection: (id: string) => void;
  doLoadLesson: (l: CourseLesson) => void;
}

function SidebarContent({
  sections, sectionMap, unsectioned, lessons,
  activeLesson, progress, completionPct,
  collapsedSections, toggleSection, doLoadLesson,
}: SidebarProps) {
  return (
    <>
      {/* Header */}
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f1f5f9', marginBottom: '0.5rem' }}>
          Course Content
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#475569', marginBottom: '0.4rem' }}>
          <span>{progress?.completedLessons ?? 0} / {progress?.totalLessons ?? 0} completed</span>
          <span style={{ color: completionPct >= 100 ? '#10b981' : '#6366f1', fontWeight: 700 }}>
            {completionPct}%
          </span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            width: `${completionPct}%`, height: '100%',
            background: completionPct >= 100 ? '#10b981' : 'linear-gradient(90deg,#6366f1,#818cf8)',
            borderRadius: 99, transition: 'width 0.5s',
          }} />
        </div>
      </div>

      {/* Lesson list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {sections.length > 0 ? (
          <>
            {sections.map((sec: any) => {
              const sl = sectionMap[sec.id] || [];
              if (!sl.length) return null;
              const done = sl.filter(l => progress?.progressMap?.[l.id]?.completed).length;
              const isCollapsed = collapsedSections.has(sec.id);
              return (
                <div key={sec.id}>
                  <button
                    onClick={() => toggleSection(sec.id)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.02)',
                      border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {sec.title}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#374151', marginTop: 1 }}>
                        {done}/{sl.length} completed
                      </div>
                    </div>
                    <span style={{ color: '#475569', fontSize: '0.7rem' }}>
                      {isCollapsed ? '▿' : '▾'}
                    </span>
                  </button>
                  {!isCollapsed && sl.map(l => (
                    <LessonRow
                      key={l.id} lesson={l}
                      active={activeLesson?.id === l.id}
                      progressMap={progress?.progressMap}
                      onClick={() => doLoadLesson(l)}
                    />
                  ))}
                </div>
              );
            })}
            {unsectioned.length > 0 && (
              <div>
                <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#374151', fontWeight: 600 }}>Other Lessons</div>
                </div>
                {unsectioned.map(l => (
                  <LessonRow
                    key={l.id} lesson={l}
                    active={activeLesson?.id === l.id}
                    progressMap={progress?.progressMap}
                    onClick={() => doLoadLesson(l)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          lessons.map(l => (
            <LessonRow
              key={l.id} lesson={l}
              active={activeLesson?.id === l.id}
              progressMap={progress?.progressMap}
              onClick={() => doLoadLesson(l)}
            />
          ))
        )}
      </div>
    </>
  );
}

// ─── Lesson Row ───────────────────────────────────────────────────────────────

interface LessonRowProps {
  lesson: CourseLesson;
  active: boolean;
  progressMap: Record<string, any> | undefined;
  onClick: () => void;
}

function LessonRow({ lesson, active, progressMap, onClick }: LessonRowProps) {
  const prog        = progressMap?.[lesson.id];
  const isCompleted = !!prog?.completed;
  const pct         = prog?.pct ?? 0;

  const typeIcon: Record<string, string> = {
    video: '🎞', youtube: '▶', pdf: '📄', audio: '🎵', text: '📖', quiz: '❓',
  };
  const icon = typeIcon[lesson.content_type] ?? '▶';

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '0.7rem 1rem', background: active ? 'rgba(99,102,241,0.08)' : 'transparent',
        borderLeft: `3px solid ${active ? '#6366f1' : 'transparent'}`,
        border: 'none', borderTop: '1px solid rgba(255,255,255,0.025)',
        cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.7rem',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.015)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {/* Status circle */}
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: isCompleted ? '#10b981' : active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
        border: `2px solid ${isCompleted ? '#10b981' : active ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.6rem', color: '#fff', fontWeight: 800,
      }}>
        {isCompleted ? '✓' : active ? '▶' : ''}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.82rem', fontWeight: active ? 700 : 500,
          color: active ? '#f1f5f9' : isCompleted ? '#4b5563' : '#cbd5e1',
          lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {icon} {lesson.title}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#374151', marginTop: 2, display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
          {lesson.duration_s && <span>{fmtDuration(lesson.duration_s)}</span>}
          {lesson.is_free_preview && (
            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.65rem', border: '1px solid rgba(16,185,129,0.3)', padding: '0 3px', borderRadius: 3 }}>
              FREE
            </span>
          )}
        </div>
        {pct > 0 && !isCompleted && (
          <div style={{ marginTop: 4, height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#6366f1', borderRadius: 99 }} />
          </div>
        )}
      </div>
    </button>
  );
}

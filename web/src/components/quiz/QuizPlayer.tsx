'use client';

import React, { useEffect, useState, useRef } from 'react';
import { authFetch } from '@/lib/auth';
import { awardXP } from '@/components/gamification/GamificationWidget';


// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'text';
  options: string[];
  points: number;
  position: number;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  pass_score: number;
  time_limit?: number;   // minutes
  max_attempts: number;
  is_gating: boolean;
  questions: QuizQuestion[];
}

interface GradedAnswer {
  question_id: string;
  answer: string;
  is_correct: boolean;
  explanation?: string;
}

interface AttemptResult {
  attempt_id: string;
  score: number;
  passed: boolean;
  pass_score: number;
  earned: number;
  total: number;
  time_taken?: number;
  answers: GradedAnswer[];
}

interface PastAttempt {
  id: string;
  score: number;
  passed: boolean;
  completed_at: string;
}

// ─── Sub-component: Score Ring ────────────────────────────────────────────────

function ScoreRing({ score, passed }: { score: number; passed: boolean }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = passed ? '#22c55e' : '#ef4444';

  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={10} />
        <circle
          cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
          {passed ? '✓ Passed' : '✗ Failed'}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface QuizPlayerProps {
  lessonId: string;
}

export default function QuizPlayer({ lessonId }: QuizPlayerProps) {
  const [quiz, setQuiz]               = useState<Quiz | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // Quiz-taking state
  const [started, setStarted]         = useState(false);
  const [answers, setAnswers]         = useState<Record<string, string>>({});  // questionId → answer
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState<AttemptResult | null>(null);

  // Past attempts
  const [pastAttempts, setPastAttempts] = useState<PastAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft]       = useState<number | null>(null);  // seconds
  const timerRef                      = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef                  = useRef<number>(0);

  // ── Fetch quiz ────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    authFetch(`/api/quizzes/lesson/${lessonId}`)
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('Failed to load quiz');
        return r.json();
      })
      .then((data) => setQuiz(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [lessonId]);

  // ── Fetch past attempts whenever quiz is loaded ───────────────────────────
  useEffect(() => {
    if (!quiz) return;
    setLoadingAttempts(true);
    authFetch(`/api/quizzes/${quiz.id}/attempts/mine`)
      .then((r) => r.ok ? r.json() : [])
      .then(setPastAttempts)
      .finally(() => setLoadingAttempts(false));
  }, [quiz]);

  // ── Timer countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!started || timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(true); return; }

    timerRef.current = setTimeout(() => setTimeLeft((t) => (t ?? 1) - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [started, timeLeft]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleStart() {
    setAnswers({});
    setResult(null);
    setStarted(true);
    startTimeRef.current = Date.now();
    if (quiz?.time_limit) setTimeLeft(quiz.time_limit * 60);
  }

  function handleAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(timedOut = false) {
    if (!quiz) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const time_taken = Math.round((Date.now() - startTimeRef.current) / 1000);

    const payload = {
      answers: quiz.questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] ?? '',
      })),
      time_taken,
    };

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/quizzes/${quiz.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      setResult(data);
      setStarted(false);
      setTimeLeft(null);
      // Award XP if the attempt was passed (fire-and-forget, non-blocking)
      if (data.passed) {
        const reason = data.score === 100 ? 'quiz_perfect' : 'quiz_passed';
        awardXP(reason, { quiz_id: quiz.id, score: data.score });
      }
      // Refresh attempts list
      authFetch(`/api/quizzes/${quiz.id}/attempts/mine`)
        .then((r) => r.ok ? r.json() : [])
        .then(setPastAttempts);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  function fmtTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ─── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading quiz…
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{
        padding: '2.5rem', textAlign: 'center', color: '#64748b',
        background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
        <p style={{ fontWeight: 600, color: '#94a3b8' }}>No quiz for this lesson yet</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>The instructor hasn't added a quiz here.</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz.questions.length;
  const bestAttempt = pastAttempts.find((a) => a.passed) ?? pastAttempts[0];
  const attemptsUsed = pastAttempts.length;
  const attemptsLeft = quiz.max_attempts > 0 ? quiz.max_attempts - attemptsUsed : null;
  const canAttempt = attemptsLeft === null || attemptsLeft > 0;

  // ── Result screen ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Result header */}
        <div style={{
          background: result.passed
            ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08))'
            : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))',
          border: `1px solid ${result.passed ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 20, padding: '2rem',
          display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
        }}>
          <ScoreRing score={result.score} passed={result.passed} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#f8fafc' }}>
              {result.passed ? '🎉 You Passed!' : '📚 Keep Studying'}
            </div>
            <div style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '0.9rem' }}>
              You scored <strong style={{ color: '#f8fafc' }}>{result.score}%</strong> — passing score is {result.pass_score}%
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.3rem 0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                ✓ {result.answers.filter((a) => a.is_correct).length} correct
              </span>
              <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.3rem 0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                ✗ {result.answers.filter((a) => !a.is_correct).length} wrong
              </span>
              {result.time_taken && (
                <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.3rem 0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                  ⏱ {fmtTime(result.time_taken)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              {canAttempt && (
                <button
                  onClick={handleStart}
                  style={{
                    padding: '0.55rem 1.25rem', borderRadius: 10,
                    background: '#0c3b2e', color: '#fde047', fontWeight: 700, fontSize: '0.88rem',
                    border: '1px solid rgba(253,224,71,0.3)', cursor: 'pointer',
                  }}
                >
                  Try Again {attemptsLeft !== null ? `(${attemptsLeft} left)` : ''}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Question Review
          </h3>
          {quiz.questions.map((q, i) => {
            const gradedAnswer = result.answers.find((a) => a.question_id === q.id);
            const correct = gradedAnswer?.is_correct ?? false;
            return (
              <div key={q.id} style={{
                background: correct ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${correct ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: 14, padding: '1.25rem',
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: correct ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                    color: correct ? '#22c55e' : '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700,
                  }}>
                    {correct ? '✓' : '✗'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '0.4rem' }}>
                      Q{i + 1}. {q.question}
                    </p>
                    {q.type !== 'text' && q.options.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
                        {q.options.map((opt, oi) => {
                          const isStudentPick = gradedAnswer?.answer === String(oi);
                          const isCorrectOption = /* we know the correct index only after grading */ false; // intentional — don't reveal to cheat
                          return (
                            <div key={oi} style={{
                              padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.85rem',
                              background: isStudentPick
                                ? (correct ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)')
                                : 'rgba(255,255,255,0.04)',
                              color: isStudentPick ? '#f8fafc' : '#64748b',
                              border: isStudentPick
                                ? `1px solid ${correct ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`
                                : '1px solid transparent',
                            }}>
                              {isStudentPick ? (correct ? '✓ ' : '✗ ') : ''}{opt}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.type === 'text' && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                        Your answer: <strong style={{ color: '#f1f5f9' }}>{gradedAnswer?.answer || '(empty)'}</strong>
                      </div>
                    )}
                    {gradedAnswer?.explanation && (
                      <div style={{
                        fontSize: '0.82rem', color: '#94a3b8',
                        background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                        padding: '0.5rem 0.75rem', marginTop: '0.3rem',
                        borderLeft: '3px solid rgba(99,102,241,0.5)',
                      }}>
                        💡 {gradedAnswer.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Quiz-taking screen ────────────────────────────────────────────────────
  if (started) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Header bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(12,59,46,0.25)', borderRadius: 12, padding: '0.75rem 1.25rem',
          border: '1px solid rgba(12,59,46,0.5)',
        }}>
          <span style={{ fontWeight: 700, color: '#fde047', fontSize: '0.9rem' }}>
            {quiz.title}
          </span>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              {answeredCount}/{totalQuestions} answered
            </span>
            {timeLeft !== null && (
              <span style={{
                fontSize: '0.88rem', fontWeight: 700, fontFamily: 'monospace',
                color: timeLeft < 60 ? '#ef4444' : '#10b981',
                background: 'rgba(255,255,255,0.08)', borderRadius: 8,
                padding: '0.25rem 0.65rem',
              }}>
                ⏱ {fmtTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        {/* Questions */}
        {quiz.questions.map((q, i) => (
          <div key={q.id} style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${answers[q.id] !== undefined ? 'rgba(253,224,71,0.25)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 16, padding: '1.5rem',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: answers[q.id] !== undefined ? '#0c3b2e' : 'rgba(255,255,255,0.08)',
                color: answers[q.id] !== undefined ? '#fde047' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)',
              }}>
                {i + 1}
              </span>
              <p style={{ fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5, flex: 1 }}>{q.question}</p>
            </div>

            {/* Multiple choice / True-false options */}
            {(q.type === 'multiple_choice' || q.type === 'true_false') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === String(oi);
                  return (
                    <button
                      key={oi}
                      onClick={() => handleAnswer(q.id, String(oi))}
                      style={{
                        textAlign: 'left', padding: '0.7rem 1rem', borderRadius: 10,
                        cursor: 'pointer', fontWeight: selected ? 700 : 400,
                        fontSize: '0.9rem', transition: 'all 0.15s',
                        background: selected ? 'rgba(12,59,46,0.5)' : 'rgba(255,255,255,0.04)',
                        color: selected ? '#fde047' : '#cbd5e1',
                        border: selected ? '1px solid rgba(253,224,71,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span style={{
                        display: 'inline-flex', width: 22, height: 22, borderRadius: '50%',
                        background: selected ? '#fde047' : 'rgba(255,255,255,0.1)',
                        color: selected ? '#0c3b2e' : '#64748b',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 700, marginRight: '0.75rem',
                      }}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Text input */}
            {q.type === 'text' && (
              <input
                type="text"
                placeholder="Type your answer…"
                value={answers[q.id] ?? ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#f8fafc', fontSize: '0.9rem', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        ))}

        {/* Submit button */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          style={{
            padding: '0.9rem 2rem', borderRadius: 12, fontWeight: 700,
            fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #0c3b2e, #15805a)',
            color: '#fde047', border: '1px solid rgba(253,224,71,0.3)',
            opacity: submitting ? 0.7 : 1, transition: 'opacity 0.2s',
          }}
        >
          {submitting ? 'Grading…' : `Submit Quiz (${answeredCount}/${totalQuestions} answered)`}
        </button>
      </div>
    );
  }

  // ── Landing screen (pre-start) ────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Quiz info card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(12,59,46,0.3), rgba(21,128,90,0.15))',
        border: '1px solid rgba(12,59,46,0.5)', borderRadius: 20, padding: '2rem',
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fde047', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          LESSON QUIZ
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#f8fafc', marginBottom: '0.5rem' }}>
          {quiz.title}
        </h2>
        {quiz.description && (
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            {quiz.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.35rem 0.85rem', fontSize: '0.82rem', color: '#94a3b8' }}>
            📋 {quiz.questions.length} questions
          </span>
          <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.35rem 0.85rem', fontSize: '0.82rem', color: '#94a3b8' }}>
            🎯 Pass: {quiz.pass_score}%
          </span>
          {quiz.time_limit && (
            <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.35rem 0.85rem', fontSize: '0.82rem', color: '#94a3b8' }}>
              ⏱ {quiz.time_limit} min limit
            </span>
          )}
          <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.35rem 0.85rem', fontSize: '0.82rem', color: '#94a3b8' }}>
            🔄 {quiz.max_attempts === 0 ? 'Unlimited' : quiz.max_attempts} attempt{quiz.max_attempts !== 1 ? 's' : ''}
          </span>
          {quiz.is_gating && (
            <span style={{ background: 'rgba(253,224,71,0.1)', borderRadius: 8, padding: '0.35rem 0.85rem', fontSize: '0.82rem', color: '#fde047', border: '1px solid rgba(253,224,71,0.2)' }}>
              🔒 Required to continue
            </span>
          )}
        </div>
      </div>

      {/* Past attempts summary */}
      {pastAttempts.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            Your Attempts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pastAttempts.map((a, i) => (
              <div key={a.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0.75rem', borderRadius: 8,
                background: a.passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${a.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
              }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Attempt #{pastAttempts.length - i}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: a.passed ? '#22c55e' : '#ef4444' }}>
                  {a.score}% — {a.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start button */}
      {error && <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</p>}
      {canAttempt ? (
        <button
          onClick={handleStart}
          style={{
            padding: '1rem 2rem', borderRadius: 14, fontWeight: 700, fontSize: '1rem',
            cursor: 'pointer', background: 'linear-gradient(135deg, #0c3b2e, #15805a)',
            color: '#fde047', border: '1px solid rgba(253,224,71,0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(12,59,46,0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          {pastAttempts.length > 0 ? `Retry Quiz ${attemptsLeft !== null ? `(${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left)` : ''}` : 'Start Quiz'}
        </button>
      ) : (
        <div style={{
          padding: '1rem', borderRadius: 12, textAlign: 'center',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', fontWeight: 600, fontSize: '0.9rem',
        }}>
          You've used all {quiz.max_attempts} attempt(s) for this quiz.
        </div>
      )}
    </div>
  );
}

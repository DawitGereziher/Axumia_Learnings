'use client';

import React, { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'text';
  options: string[];
  correct: string;
  explanation?: string;
  points: number;
  position: number;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  pass_score: number;
  time_limit?: number | null;
  max_attempts: number;
  is_gating: boolean;
  questions: QuizQuestion[];
}

interface QuizBuilderProps {
  lessonId: string;
  lessonTitle: string;
}

// ─── Empty question form state ────────────────────────────────────────────────

type QuestionFormState = {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'text';
  options: string[];
  correct: string;
  explanation: string;
  points: number;
};

const emptyQuestion = (): QuestionFormState => ({
  question: '',
  type: 'multiple_choice',
  options: ['', '', '', ''],
  correct: '0',
  explanation: '',
  points: 1,
});


// ─── Sub-component: Question Form ─────────────────────────────────────────────

function QuestionForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: QuestionFormState;
  onSave: (data: QuestionFormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<QuestionFormState>(initial);

  function setField<K extends keyof QuestionFormState>(key: K, value: QuestionFormState[K]) {

    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setOption(index: number, value: string) {
    const next = [...form.options];
    next[index] = value;
    setField('options', next);
  }

  function addOption() {
    if (form.options.length >= 6) return;
    setField('options', [...form.options, '']);
  }

  function removeOption(index: number) {
    if (form.options.length <= 2) return;
    const next = form.options.filter((_, i) => i !== index);
    // If correct index pointed beyond new length, reset it
    const newCorrect = parseInt(form.correct) >= next.length ? '0' : form.correct;
    setForm((prev) => ({ ...prev, options: next, correct: newCorrect }));
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#f8fafc', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 700,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem',
  };

  return (
    <div style={{
      background: 'rgba(12,59,46,0.15)', border: '1px solid rgba(12,59,46,0.4)',
      borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
    }}>

      {/* Question type selector */}
      <div>
        <label style={labelStyle}>Question Type</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['multiple_choice', 'true_false', 'text'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                const next = { ...form, type: t };
                if (t === 'true_false') next.options = ['True', 'False'];
                if (t === 'text') next.options = [];
                setForm(next);
              }}
              style={{
                padding: '0.45rem 0.9rem', borderRadius: 8, cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 600,
                background: form.type === t ? '#0c3b2e' : 'rgba(255,255,255,0.06)',
                color: form.type === t ? '#fde047' : '#94a3b8',
                border: form.type === t ? '1px solid rgba(253,224,71,0.35)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {t === 'multiple_choice' ? 'Multiple Choice' : t === 'true_false' ? 'True / False' : 'Text Answer'}
            </button>
          ))}
        </div>
      </div>

      {/* Question text */}
      <div>
        <label style={labelStyle}>Question *</label>
        <textarea
          rows={2}
          placeholder="Enter your question…"
          value={form.question}
          onChange={(e) => setField('question', e.target.value)}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {/* Options for MC */}
      {form.type === 'multiple_choice' && (
        <div>
          <label style={labelStyle}>Answer Options (select the correct one)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {form.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => setField('correct', String(i))}
                  title="Mark as correct"
                  style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                    background: form.correct === String(i) ? '#22c55e' : 'rgba(255,255,255,0.08)',
                    border: form.correct === String(i) ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.15)',
                    color: form.correct === String(i) ? '#fff' : '#64748b',
                    fontSize: '0.75rem', fontWeight: 700,
                  }}
                >
                  {form.correct === String(i) ? '✓' : String.fromCharCode(65 + i)}
                </button>
                <input
                  type="text"
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {form.options.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    style={{
                      width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)',
                      color: '#ef4444', fontSize: '1rem', flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {form.options.length < 6 && (
              <button
                onClick={addOption}
                style={{
                  padding: '0.45rem', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)',
                  color: '#64748b', fontSize: '0.85rem',
                }}
              >
                + Add Option
              </button>
            )}
          </div>
        </div>
      )}

      {/* Options for True/False */}
      {form.type === 'true_false' && (
        <div>
          <label style={labelStyle}>Correct Answer</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {['True', 'False'].map((label, i) => (
              <button
                key={label}
                onClick={() => setField('correct', String(i))}
                style={{
                  flex: 1, padding: '0.7rem', borderRadius: 10, cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.9rem',
                  background: form.correct === String(i) ? (i === 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)') : 'rgba(255,255,255,0.05)',
                  color: form.correct === String(i) ? (i === 0 ? '#22c55e' : '#ef4444') : '#64748b',
                  border: form.correct === String(i)
                    ? `1px solid ${i === 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`
                    : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Correct answer keyword for text type */}
      {form.type === 'text' && (
        <div>
          <label style={labelStyle}>Correct Answer / Keyword *</label>
          <input
            type="text"
            placeholder="e.g. photosynthesis (case-insensitive match)"
            value={form.correct}
            onChange={(e) => setField('correct', e.target.value)}
            style={inputStyle}
          />
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
            Student's answer is correct if it contains this keyword.
          </p>
        </div>
      )}

      {/* Explanation */}
      <div>
        <label style={labelStyle}>Explanation (shown after answering — optional)</label>
        <input
          type="text"
          placeholder="Why is this the correct answer?"
          value={form.explanation}
          onChange={(e) => setField('explanation', e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Points */}
      <div>
        <label style={labelStyle}>Points</label>
        <input
          type="number"
          min={1}
          value={form.points}
          onChange={(e) => setField('points', parseInt(e.target.value) || 1)}
          style={{ ...inputStyle, width: 80 }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.question.trim()}
          style={{
            padding: '0.6rem 1.4rem', borderRadius: 10, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #0c3b2e, #15805a)',
            color: '#fde047', border: '1px solid rgba(253,224,71,0.3)',
            opacity: saving || !form.question.trim() ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Question'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '0.6rem 1.2rem', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuizBuilder({ lessonId, lessonTitle }: QuizBuilderProps) {
  const [quiz, setQuiz]           = useState<Quiz | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [message, setMessage]     = useState('');

  // Quiz settings form
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [passScore, setPassScore]       = useState(70);
  const [timeLimit, setTimeLimit]       = useState('');
  const [maxAttempts, setMaxAttempts]   = useState(3);
  const [isGating, setIsGating]         = useState(true);

  // Question form
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion]   = useState<QuizQuestion | null>(null);
  const [questionSaving, setQuestionSaving]     = useState(false);

  // ── Load quiz ────────────────────────────────────────────────────────────
  async function loadQuiz() {
    setLoading(true);
    try {
      const res = await authFetch(`/api/quizzes/lesson/${lessonId}`);
      if (res.status === 404) { setQuiz(null); return; }
      if (!res.ok) throw new Error('Failed to load quiz');
      const data: Quiz = await res.json();
      setQuiz(data);
      // Populate settings form
      setTitle(data.title);
      setDescription(data.description ?? '');
      setPassScore(data.pass_score);
      setTimeLimit(data.time_limit ? String(data.time_limit) : '');
      setMaxAttempts(data.max_attempts);
      setIsGating(data.is_gating);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadQuiz(); }, [lessonId]);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }

  // ── Create quiz ───────────────────────────────────────────────────────────
  async function handleCreateQuiz() {
    if (!title.trim()) return setError('Please enter a quiz title');
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id:    lessonId,
          title:        title.trim(),
          description:  description.trim() || undefined,
          pass_score:   passScore,
          time_limit:   timeLimit ? parseInt(timeLimit) : null,
          max_attempts: maxAttempts,
          is_gating:    isGating,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create quiz');
      setQuiz(data);
      setSettingsOpen(false);
      flash('Quiz created!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Update quiz settings ──────────────────────────────────────────────────
  async function handleUpdateQuiz() {
    if (!quiz) return;
    setSaving(true);
    setError('');
    try {
      const res = await authFetch(`/api/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:        title.trim(),
          description:  description.trim() || undefined,
          pass_score:   passScore,
          time_limit:   timeLimit ? parseInt(timeLimit) : null,
          max_attempts: maxAttempts,
          is_gating:    isGating,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update quiz');
      setQuiz(data);
      setSettingsOpen(false);
      flash('Settings saved!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete quiz ───────────────────────────────────────────────────────────
  async function handleDeleteQuiz() {
    if (!quiz || !confirm('Delete this entire quiz and all its questions? This cannot be undone.')) return;
    setSaving(true);
    try {
      await authFetch(`/api/quizzes/${quiz.id}`, { method: 'DELETE' });
      setQuiz(null);
      setTitle('');
      flash('Quiz deleted');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Save question (add or update) ─────────────────────────────────────────
  async function handleSaveQuestion(formData: QuestionFormState) {

    if (!quiz) return;
    setQuestionSaving(true);
    setError('');
    try {
      const payload = {
        question:    formData.question.trim(),
        type:        formData.type,
        options:     formData.type === 'text' ? [] : formData.options.filter((o) => o.trim()),
        correct:     formData.correct,
        explanation: formData.explanation?.trim() || undefined,
        points:      formData.points,
      };

      let res: Response;
      if (editingQuestion) {
        res = await authFetch(`/api/quizzes/${quiz.id}/questions/${editingQuestion.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch(`/api/quizzes/${quiz.id}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save question');

      await loadQuiz(); // refresh to get updated order
      setShowQuestionForm(false);
      setEditingQuestion(null);
      flash(editingQuestion ? 'Question updated!' : 'Question added!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setQuestionSaving(false);
    }
  }

  // ── Delete question ───────────────────────────────────────────────────────
  async function handleDeleteQuestion(questionId: string) {
    if (!quiz || !confirm('Delete this question?')) return;
    try {
      const res = await authFetch(`/api/quizzes/${quiz.id}/questions/${questionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete question');
      await loadQuiz();
      flash('Question deleted');
    } catch (e: any) {
      setError(e.message);
    }
  }

  // ── Reorder question ──────────────────────────────────────────────────────
  async function handleReorder(questionId: string, direction: 'up' | 'down') {
    if (!quiz) return;
    try {
      await authFetch(`/api/quizzes/${quiz.id}/questions/${questionId}/reorder?direction=${direction}`, {
        method: 'PATCH',
      });
      await loadQuiz();
    } catch (e: any) {
      setError(e.message);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#f8fafc', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 700,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem',
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 800 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(12,59,46,0.4), rgba(21,128,90,0.2))',
        border: '1px solid rgba(12,59,46,0.5)', borderRadius: 18, padding: '1.5rem',
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fde047', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
          QUIZ BUILDER
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#f8fafc', marginBottom: '0.25rem' }}>
          {quiz ? quiz.title : 'No quiz yet'}
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Lesson: {lessonTitle}</p>
        {quiz && (
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 7, padding: '0.3rem 0.7rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 7, padding: '0.3rem 0.7rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              Pass: {quiz.pass_score}%
            </span>
            {quiz.time_limit && (
              <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 7, padding: '0.3rem 0.7rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                ⏱ {quiz.time_limit} min
              </span>
            )}
            <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 7, padding: '0.3rem 0.7rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              {quiz.max_attempts === 0 ? 'Unlimited attempts' : `Max ${quiz.max_attempts} attempts`}
            </span>
            {quiz.is_gating && (
              <span style={{ background: 'rgba(253,224,71,0.1)', borderRadius: 7, padding: '0.3rem 0.7rem', fontSize: '0.78rem', color: '#fde047', border: '1px solid rgba(253,224,71,0.2)' }}>
                🔒 Gating on
              </span>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: '0.9rem', fontWeight: 600 }}>
          ✓ {message}
        </div>
      )}
      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          style={{
            padding: '0.55rem 1.15rem', borderRadius: 10, cursor: 'pointer',
            fontWeight: 600, fontSize: '0.88rem',
            background: settingsOpen ? 'rgba(12,59,46,0.4)' : 'rgba(255,255,255,0.06)',
            color: settingsOpen ? '#fde047' : '#94a3b8',
            border: settingsOpen ? '1px solid rgba(253,224,71,0.3)' : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          ⚙️ {quiz ? 'Quiz Settings' : 'Create Quiz'}
        </button>
        {quiz && (
          <>
            <button
              onClick={() => { setShowQuestionForm(true); setEditingQuestion(null); }}
              style={{
                padding: '0.55rem 1.15rem', borderRadius: 10, cursor: 'pointer',
                fontWeight: 600, fontSize: '0.88rem',
                background: 'linear-gradient(135deg, #0c3b2e, #15805a)',
                color: '#fde047', border: '1px solid rgba(253,224,71,0.3)',
              }}
            >
              + Add Question
            </button>
            <button
              onClick={handleDeleteQuiz}
              disabled={saving}
              style={{
                padding: '0.55rem 1.15rem', borderRadius: 10, cursor: 'pointer',
                fontWeight: 600, fontSize: '0.88rem',
                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.25)',
                marginLeft: 'auto',
              }}
            >
              Delete Quiz
            </button>
          </>
        )}
      </div>

      {/* Settings form */}
      {settingsOpen && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          <div>
            <label style={labelStyle}>Quiz Title *</label>
            <input type="text" placeholder="e.g. Module 1 Review Quiz" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Description (optional)</label>
            <textarea rows={2} placeholder="Brief instructions for students…" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Pass Score (%)</label>
              <input type="number" min={0} max={100} value={passScore} onChange={(e) => setPassScore(parseInt(e.target.value) || 70)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Time Limit (minutes)</label>
              <input type="number" min={1} placeholder="No limit" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Max Attempts (0 = unlimited)</label>
              <input type="number" min={0} value={maxAttempts} onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 0)} style={inputStyle} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={isGating} onChange={(e) => setIsGating(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#0c3b2e' }} />
            <span style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
              <strong>Require passing</strong> to unlock the next lesson
            </span>
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={quiz ? handleUpdateQuiz : handleCreateQuiz}
              disabled={saving || !title.trim()}
              style={{
                padding: '0.65rem 1.5rem', borderRadius: 10, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #0c3b2e, #15805a)',
                color: '#fde047', border: '1px solid rgba(253,224,71,0.3)',
                opacity: saving || !title.trim() ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : quiz ? 'Save Settings' : 'Create Quiz'}
            </button>
            <button onClick={() => setSettingsOpen(false)} style={{ padding: '0.65rem 1.2rem', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit question form */}
      {showQuestionForm && (
        <QuestionForm
          initial={editingQuestion ? {
            question:    editingQuestion.question,
            type:        editingQuestion.type,
            options:     editingQuestion.options.length ? editingQuestion.options : ['', '', '', ''],
            correct:     editingQuestion.correct,
            explanation: editingQuestion.explanation ?? '',
            points:      editingQuestion.points,
          } : emptyQuestion()}
          onSave={handleSaveQuestion}
          onCancel={() => { setShowQuestionForm(false); setEditingQuestion(null); }}
          saving={questionSaving}
        />
      )}

      {/* Questions list */}
      {quiz && quiz.questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Questions ({quiz.questions.length})
          </h3>
          {quiz.questions.map((q, i) => (
            <div key={q.id} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '1rem 1.25rem',
              display: 'flex', gap: '1rem', alignItems: 'flex-start',
            }}>
              {/* Position badge */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(12,59,46,0.4)', border: '1px solid rgba(12,59,46,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700, color: '#fde047',
              }}>
                {i + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '0.3rem', lineHeight: 1.4 }}>{q.question}</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '0.2rem 0.5rem' }}>
                    {q.type === 'multiple_choice' ? 'MC' : q.type === 'true_false' ? 'T/F' : 'Text'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                  {q.explanation && <span style={{ fontSize: '0.75rem', color: '#6366f1' }}>has explanation</span>}
                </div>
              </div>

              {/* Reorder + Edit + Delete */}
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button onClick={() => handleReorder(q.id, 'up')} disabled={i === 0} title="Move up"
                  style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', cursor: i === 0 ? 'not-allowed' : 'pointer', color: '#64748b', opacity: i === 0 ? 0.3 : 1 }}>
                  ↑
                </button>
                <button onClick={() => handleReorder(q.id, 'down')} disabled={i === quiz.questions.length - 1} title="Move down"
                  style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', cursor: i === quiz.questions.length - 1 ? 'not-allowed' : 'pointer', color: '#64748b', opacity: i === quiz.questions.length - 1 ? 0.3 : 1 }}>
                  ↓
                </button>
                <button onClick={() => { setEditingQuestion(q); setShowQuestionForm(true); }} title="Edit question"
                  style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', cursor: 'pointer', color: '#818cf8', fontSize: '0.8rem' }}>
                  ✏
                </button>
                <button onClick={() => handleDeleteQuestion(q.id)} title="Delete question"
                  style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444', fontSize: '0.9rem' }}>
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {quiz && quiz.questions.length === 0 && !showQuestionForm && (
        <div style={{
          padding: '2.5rem', textAlign: 'center', color: '#64748b',
          background: 'rgba(255,255,255,0.02)', borderRadius: 14,
          border: '1px dashed rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❓</div>
          <p style={{ fontWeight: 600, color: '#94a3b8' }}>No questions yet</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>Click "Add Question" to build your quiz.</p>
        </div>
      )}
    </div>
  );
}

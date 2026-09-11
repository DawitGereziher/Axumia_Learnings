'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { authFetch } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import AvatarUploader from '@/components/settings/AvatarUploader';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Play,
  Upload,
  Sparkles,
  BookOpen,
  DollarSign,
  Eye,
  FileText,
  Video,
  Layers,
  HelpCircle,
  AlertCircle,
  Save,
  CheckCircle2,
  GraduationCap,
  Paperclip,
  FileCheck,
} from 'lucide-react';
import MaterialUploader, { UploadedMaterial } from '@/components/instructor/MaterialUploader';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface SectionInput {
  tempId: string;
  id?: string;
  title: string;
  lessons: LessonInput[];
}

interface LessonInput {
  tempId: string;
  id?: string;
  title: string;
  description: string;
  content_type: 'youtube' | 'reading' | 'pdf';
  youtube_url: string;
  pdf_url?: string;
  duration_s: number;
  is_free_preview: boolean;
  materials?: UploadedMaterial[];
  showMaterials?: boolean;
}

export default function CourseCreationWizardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Course Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [level, setLevel] = useState('beginner');
  const [language, setLanguage] = useState('en');
  const [tags, setTags] = useState<string>('python, web, programming');

  // Pricing & Media
  const [price, setPrice] = useState('0');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [learningObjectives, setLearningObjectives] = useState<string[]>([
    'Understand fundamental principles and concepts',
    'Build real-world practical projects',
  ]);
  const [prerequisites, setPrerequisites] = useState<string[]>([
    'Basic computer skills & internet connection',
  ]);

  // Curriculum Sections & Lessons
  const [sections, setSections] = useState<SectionInput[]>([
    {
      tempId: 'sec-1',
      title: 'Getting Started & Introduction',
      lessons: [
        {
          tempId: 'les-1',
          title: 'Welcome to the Course',
          description: 'Overview of topics covered and learning environment setup',
          content_type: 'youtube',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          duration_s: 300,
          is_free_preview: true,
          materials: [],
        },
      ],
    },
  ]);

  useEffect(() => {
    fetch(`${API}/api/courses/categories`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
          if (data.length > 0) setCategoryId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Section & Lesson Helpers
  const addSection = () => {
    setSections([
      ...sections,
      {
        tempId: `sec-${Date.now()}`,
        title: `Section ${sections.length + 1}: New Section`,
        lessons: [],
      },
    ]);
  };

  const removeSection = (secTempId: string) => {
    setSections(sections.filter((s) => s.tempId !== secTempId));
  };

  const updateSectionTitle = (secTempId: string, title: string) => {
    setSections(
      sections.map((s) => (s.tempId === secTempId ? { ...s, title } : s))
    );
  };

  const addLesson = (secTempId: string) => {
    setSections(
      sections.map((s) => {
        if (s.tempId === secTempId) {
          return {
            ...s,
            lessons: [
              ...s.lessons,
              {
                tempId: `les-${Date.now()}`,
                title: 'New Lesson',
                description: '',
                content_type: 'youtube',
                youtube_url: '',
                pdf_url: '',
                duration_s: 600,
                is_free_preview: false,
                materials: [],
              },
            ],
          };
        }
        return s;
      })
    );
  };

  const addMaterialToLesson = (secTempId: string, lesTempId: string, material: UploadedMaterial) => {
    setSections(
      sections.map((s) => {
        if (s.tempId === secTempId) {
          return {
            ...s,
            lessons: s.lessons.map((l) => {
              if (l.tempId === lesTempId) {
                return { ...l, materials: [...(l.materials || []), material] };
              }
              return l;
            }),
          };
        }
        return s;
      })
    );
  };

  const removeMaterialFromLesson = (secTempId: string, lesTempId: string, matIdx: number) => {
    setSections(
      sections.map((s) => {
        if (s.tempId === secTempId) {
          return {
            ...s,
            lessons: s.lessons.map((l) => {
              if (l.tempId === lesTempId) {
                return { ...l, materials: (l.materials || []).filter((_, i) => i !== matIdx) };
              }
              return l;
            }),
          };
        }
        return s;
      })
    );
  };

  const removeLesson = (secTempId: string, lesTempId: string) => {
    setSections(
      sections.map((s) => {
        if (s.tempId === secTempId) {
          return {
            ...s,
            lessons: s.lessons.filter((l) => l.tempId !== lesTempId),
          };
        }
        return s;
      })
    );
  };

  const updateLesson = (
    secTempId: string,
    lesTempId: string,
    field: keyof LessonInput,
    value: any
  ) => {
    setSections(
      sections.map((s) => {
        if (s.tempId === secTempId) {
          return {
            ...s,
            lessons: s.lessons.map((l) =>
              l.tempId === lesTempId ? { ...l, [field]: value } : l
            ),
          };
        }
        return s;
      })
    );
  };

  const handleObjectiveChange = (index: number, val: string) => {
    const updated = [...learningObjectives];
    updated[index] = val;
    setLearningObjectives(updated);
  };

  const addObjective = () => {
    setLearningObjectives([...learningObjectives, '']);
  };

  const removeObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const handlePrereqChange = (index: number, val: string) => {
    const updated = [...prerequisites];
    updated[index] = val;
    setPrerequisites(updated);
  };

  const addPrereq = () => {
    setPrerequisites([...prerequisites, '']);
  };

  const removePrereq = (index: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== index));
  };

  // Submit Handler: Creates Course, Sections & Lessons
  const handlePublish = async (shouldPublish = false) => {
    if (!title.trim()) {
      setError('Course title is required.');
      setCurrentStep(1);
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Create Base Course
      const coursePayload = {
        title,
        description,
        price: Number(price),
        category_id: categoryId || undefined,
        level,
        language,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        thumbnail_url: thumbnailUrl || undefined,
        thumbnail: thumbnailUrl || undefined,
        learning_objectives: learningObjectives.filter(Boolean),
        prerequisites: prerequisites.filter(Boolean),
      };

      const res = await authFetch('/api/courses', {
        method: 'POST',
        body: JSON.stringify(coursePayload),
      });

      const courseData = await res.json();
      if (!res.ok) throw new Error(courseData.message || 'Failed to create course');

      const courseId = courseData.id;

      // 2. Create Sections and Lessons
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        const secRes = await authFetch(`/api/courses/${courseId}/sections`, {
          method: 'POST',
          body: JSON.stringify({
            title: sec.title,
            position: sIdx + 1,
          }),
        });

        const secData = await secRes.json();
        const sectionId = secRes.ok ? secData.id : undefined;

        for (let lIdx = 0; lIdx < sec.lessons.length; lIdx++) {
          const les = sec.lessons[lIdx];
          const lessonRes = await authFetch(`/api/courses/${courseId}/lessons`, {
            method: 'POST',
            body: JSON.stringify({
              title: les.title,
              description: les.description,
              position: lIdx + 1,
              is_free_preview: les.is_free_preview,
              content_type: les.content_type || 'youtube',
              youtube_url: les.content_type === 'youtube' ? les.youtube_url : undefined,
              external_url: les.content_type === 'pdf' ? les.pdf_url : undefined,
              section_id: sectionId,
              duration_s: Number(les.duration_s) || 300,
            }),
          });

          const lessonData = await lessonRes.json();
          if (lessonRes.ok && lessonData?.id && les.materials && les.materials.length > 0) {
            for (const mat of les.materials) {
              await authFetch(`/api/courses/lessons/${lessonData.id}/materials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mat),
              });
            }
          }
        }
      }

      // 3. Publish if requested
      if (shouldPublish) {
        await authFetch(`/api/courses/${courseId}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_published: true }),
        });
      }

      router.push(`/courses/${courseData.slug || courseId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while creating the course.');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 1, label: 'Basic Info', icon: BookOpen },
    { num: 2, label: 'Curriculum', icon: Layers },
    { num: 3, label: 'Pricing & Media', icon: DollarSign },
    { num: 4, label: 'Objectives', icon: GraduationCap },
    { num: 5, label: 'Preview & Publish', icon: Eye },
  ];

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      <div style={{ paddingTop: '80px', flex: 1, paddingBottom: '4rem' }}>
        
        {/* Wizard Header Banner */}
        <div style={{ background: 'linear-gradient(180deg, rgba(99,102,241,0.1) 0%, transparent 100%)', padding: '2.5rem 1.5rem 1.5rem', borderBottom: '1px solid var(--card-border)' }}>
          <div className="container" style={{ maxWidth: 1000 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-accent" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Instructor Portal</span>
                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800 }}>
                  Course Creation Wizard
                </h1>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => handlePublish(false)}
                  disabled={saving}
                  className="btn-ghost"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
                >
                  <Save size={16} /> Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handlePublish(true)}
                  disabled={saving}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
                >
                  <Sparkles size={16} /> {saving ? 'Publishing...' : 'Publish Course'}
                </button>
              </div>
            </div>

            {/* Stepper Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.num;
                const isDone = currentStep > step.num;
                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => setCurrentStep(step.num)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 10,
                      border: isActive
                        ? '2px solid #6366f1'
                        : isDone
                        ? '1px solid rgba(34,197,94,0.4)'
                        : '1px solid var(--card-border)',
                      background: isActive
                        ? 'rgba(99,102,241,0.15)'
                        : isDone
                        ? 'rgba(34,197,94,0.08)'
                        : 'var(--bg-secondary)',
                      color: isActive ? '#fff' : isDone ? '#4ade80' : '#94a3b8',
                      cursor: 'pointer',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.85rem',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: isActive ? '#6366f1' : isDone ? '#22c55e' : 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {isDone ? <Check size={14} /> : step.num}
                    </div>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Wizard Form Body */}
        <div className="container" style={{ maxWidth: 1000, marginTop: '2.5rem' }}>
          
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '1rem 1.25rem', color: '#fca5a5', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {/* STEP 1: BASIC INFO */}
          {currentStep === 1 && (
            <div className="card" style={{ padding: '2.25rem' }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Step 1: Basic Course Information
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
                Provide compelling title, category, and overview details to attract students.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    Course Title *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Complete Full-Stack Web Development Bootcamp in Amharic"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    Description & Overview
                  </label>
                  <textarea
                    className="input-field"
                    rows={5}
                    placeholder="Detailed explanation of what students will learn, skills acquired, and real-world outcomes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                      Category
                    </label>
                    <select
                      className="input-field"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                      Target Level
                    </label>
                    <select
                      className="input-field"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="all-levels">All Levels</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                      Teaching Language
                    </label>
                    <select
                      className="input-field"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="en">English</option>
                      <option value="am">Amharic (አማርኛ)</option>
                      <option value="om">Afan Oromo</option>
                      <option value="ti">Tigrinya</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    Tags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. React, Next.js, TypeScript, Tailwind"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CURRICULUM BUILDER */}
          {currentStep === 2 && (
            <div className="card" style={{ padding: '2.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Step 2: Course Curriculum & Lessons
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    Organize content into sections and add video lessons or previews.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addSection}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <Plus size={16} /> Add Section
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {sections.map((section, sIdx) => (
                  <div
                    key={section.tempId}
                    style={{
                      border: '1px solid var(--card-border)',
                      borderRadius: 12,
                      background: 'var(--bg-secondary)',
                      padding: '1.5rem',
                    }}
                  >
                    {/* Section Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <span style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.9rem' }}>
                        Section {sIdx + 1}:
                      </span>
                      <input
                        type="text"
                        className="input-field"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(section.tempId, e.target.value)}
                        style={{ flex: 1, fontWeight: 600 }}
                        placeholder="Section Title"
                      />
                      {sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSection(section.tempId)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    {/* Lessons list inside section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1rem', borderLeft: '2px solid rgba(99,102,241,0.2)' }}>
                      {section.lessons.map((lesson, lIdx) => (
                        <div
                          key={lesson.tempId}
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 10,
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Video size={16} color="#818cf8" />
                            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
                              Lesson {lIdx + 1}
                            </span>
                            <input
                              type="text"
                              className="input-field"
                              placeholder="Lesson Title"
                              value={lesson.title}
                              onChange={(e) => updateLesson(section.tempId, lesson.tempId, 'title', e.target.value)}
                              style={{ flex: 1, fontSize: '0.9rem' }}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#4ade80', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={lesson.is_free_preview}
                                onChange={(e) => updateLesson(section.tempId, lesson.tempId, 'is_free_preview', e.target.checked)}
                              />
                              Free Preview
                            </label>
                            <button
                              type="button"
                              onClick={() => removeLesson(section.tempId, lesson.tempId)}
                              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* Lesson Format Selector */}
                          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700 }}>Lesson Type:</span>
                            {[
                              { id: 'youtube', label: '🎥 Video Lesson', icon: Video },
                              { id: 'reading', label: '📖 Reading / Article', icon: FileText },
                              { id: 'pdf', label: '📄 PDF Document Lesson', icon: BookOpen },
                            ].map((fmt) => {
                              const active = (lesson.content_type || 'youtube') === fmt.id;
                              return (
                                <button
                                  key={fmt.id}
                                  type="button"
                                  onClick={() => updateLesson(section.tempId, lesson.tempId, 'content_type', fmt.id)}
                                  style={{
                                    padding: '0.35rem 0.85rem', borderRadius: 8,
                                    fontSize: '0.82rem', fontWeight: 700,
                                    border: active ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
                                    background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(129,140,248,0.2) 100%)' : 'rgba(255,255,255,0.03)',
                                    color: active ? '#ffffff' : '#94a3b8',
                                    boxShadow: active ? '0 0 12px rgba(99,102,241,0.35)' : 'none',
                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {fmt.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Dynamic Inputs based on Lesson Format */}
                          {(lesson.content_type || 'youtube') === 'youtube' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.75rem' }}>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="YouTube Video URL or Storage Video Key (e.g. https://youtube.com/...)"
                                value={lesson.youtube_url}
                                onChange={(e) => updateLesson(section.tempId, lesson.tempId, 'youtube_url', e.target.value)}
                                style={{ fontSize: '0.85rem' }}
                              />
                              <input
                                type="number"
                                className="input-field"
                                placeholder="Duration (sec)"
                                value={lesson.duration_s}
                                onChange={(e) => updateLesson(section.tempId, lesson.tempId, 'duration_s', Number(e.target.value))}
                                style={{ fontSize: '0.85rem' }}
                              />
                            </div>
                          )}

                          {lesson.content_type === 'reading' && (
                            <div>
                              <textarea
                                className="input-field"
                                rows={3}
                                placeholder="Write the lecture notes, reading summary, or article content for this lesson..."
                                value={lesson.description}
                                onChange={(e) => updateLesson(section.tempId, lesson.tempId, 'description', e.target.value)}
                                style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                              />
                            </div>
                          )}

                          {lesson.content_type === 'pdf' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {lesson.pdf_url ? (
                                <div style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '0.5rem 0.8rem', background: 'rgba(99,102,241,0.08)',
                                  border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8,
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#818cf8', fontWeight: 600 }}>
                                    <FileCheck size={16} /> Main PDF: {lesson.pdf_url.split('/').pop()}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => updateLesson(section.tempId, lesson.tempId, 'pdf_url', '')}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : (
                                <MaterialUploader
                                  label="Upload Main PDF Document for this Lesson"
                                  allowedExtensions={['.pdf']}
                                  onUploaded={(mat) => updateLesson(section.tempId, lesson.tempId, 'pdf_url', mat.file_url)}
                                />
                              )}
                            </div>
                          )}

                          {/* Attached Supplementary Materials / Reading Files */}
                          <div style={{
                            background: 'rgba(255,255,255,0.015)', border: '1px solid var(--card-border)',
                            borderRadius: 8, padding: '0.75rem', marginTop: '0.25rem',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Paperclip size={14} color="#818cf8" /> Lesson Materials &amp; Downloads ({lesson.materials?.length || 0})
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                PDF, Word (.docx), PPTX, ZIP
                              </span>
                            </div>

                            {/* Attached materials list */}
                            {lesson.materials && lesson.materials.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                {lesson.materials.map((mat, mIdx) => (
                                  <div
                                    key={mIdx}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                                      padding: '0.35rem 0.65rem', background: 'rgba(99,102,241,0.1)',
                                      border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6,
                                      fontSize: '0.78rem', color: '#f1f5f9',
                                    }}
                                  >
                                    <FileText size={13} color="#818cf8" />
                                    <span style={{ fontWeight: 600 }}>{mat.title}</span>
                                    <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                                      ({(mat.file_size / (1024 * 1024)).toFixed(1)} MB)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeMaterialFromLesson(section.tempId, lesson.tempId, mIdx)}
                                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 1 }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Uploader dropzone */}
                            <MaterialUploader
                              label="Attach Reading Material (PDF, Word .docx, PPTX, ZIP)"
                              onUploaded={(mat) => addMaterialToLesson(section.tempId, lesson.tempId, mat)}
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addLesson(section.tempId)}
                        style={{
                          background: 'rgba(99,102,241,0.06)',
                          border: '1px dashed rgba(99,102,241,0.3)',
                          borderRadius: 8,
                          padding: '0.6rem',
                          color: '#818cf8',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          marginTop: '0.5rem',
                        }}
                      >
                        <Plus size={14} /> Add Lesson to Section
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: PRICING & MEDIA */}
          {currentStep === 3 && (
            <div className="card" style={{ padding: '2.25rem' }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Step 3: Pricing & Cover Image
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
                Set your course pricing in ETB and add a visually striking course thumbnail.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    Course Price (ETB)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder="0 for Free"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      style={{ width: 220, fontSize: '1.1rem', fontWeight: 700 }}
                    />
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                      {Number(price) === 0 ? '(Free Course)' : 'ETB'}
                    </span>
                  </div>
                </div>

                <div>
                  <AvatarUploader
                    label="Course Thumbnail Image (Stored in Cloudflare Public Storage)"
                    currentUrl={thumbnailUrl}
                    aspectRatio="16:9"
                    shape="rect"
                    folder="thumbnail"
                    onUpload={(key, publicUrl) => {
                      setThumbnailUrl(publicUrl || key);
                    }}
                  />

                  <div style={{ marginTop: '0.85rem' }}>
                    <details style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <summary style={{ cursor: 'pointer', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Or provide an external image URL manually
                      </summary>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="https://images.unsplash.com/... or Cloudflare R2 URL"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </details>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: OBJECTIVES & PREREQUISITES */}
          {currentStep === 4 && (
            <div className="card" style={{ padding: '2.25rem' }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Step 4: Learning Objectives & Prerequisites
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
                Help prospective students understand key takeaways and initial requirements.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Learning Objectives */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      What will students learn?
                    </label>
                    <button type="button" onClick={addObjective} className="btn-ghost" style={{ fontSize: '0.8rem' }}>
                      + Add Objective
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {learningObjectives.map((obj, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="input-field"
                          value={obj}
                          onChange={(e) => handleObjectiveChange(i, e.target.value)}
                          placeholder={`Objective ${i + 1}`}
                          style={{ flex: 1, fontSize: '0.88rem' }}
                        />
                        <button type="button" onClick={() => removeObjective(i)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prerequisites */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      Requirements / Prerequisites
                    </label>
                    <button type="button" onClick={addPrereq} className="btn-ghost" style={{ fontSize: '0.8rem' }}>
                      + Add Requirement
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {prerequisites.map((req, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="input-field"
                          value={req}
                          onChange={(e) => handlePrereqChange(i, e.target.value)}
                          placeholder={`Requirement ${i + 1}`}
                          style={{ flex: 1, fontSize: '0.88rem' }}
                        />
                        <button type="button" onClick={() => removePrereq(i)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PREVIEW & PUBLISH */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="card" style={{ padding: '2.25rem' }}>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Step 5: Live Course Preview
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Here is how your course listing will look to students on EthioLearn.
                </p>

                {/* Preview Card */}
                <div
                  style={{
                    border: '1px solid var(--card-border)',
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: 'var(--bg-secondary)',
                    maxWidth: 400,
                  }}
                >
                  <div style={{ height: 180, background: '#1c1d1f', position: 'relative' }}>
                    <img
                      src={thumbnailUrl || '/assets/hero-course-cover1.jpg'}
                      onError={(e) => (e.currentTarget.src = '/assets/hero-course-cover2.jpg')}
                      alt={title || 'Course Preview'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span className="badge badge-accent" style={{ position: 'absolute', top: 12, left: 12, fontSize: '0.7rem' }}>
                      {level}
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem', lineHeight: 1.3 }}>
                      {title || 'Untitled Course'}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1rem' }}>
                      {description ? (description.length > 90 ? `${description.slice(0, 90)}...` : description) : 'Course description preview...'}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '0.85rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818cf8' }}>
                        {Number(price) === 0 ? 'Free' : `${price} ETB`}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {sections.reduce((acc, s) => acc + s.lessons.length, 0)} lessons
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Publish Bar */}
              <div
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              >
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 2 }}>
                    Ready to launch your course?
                  </h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                    Clicking publish makes your course immediately available in the course catalog.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => handlePublish(false)}
                    disabled={saving}
                    className="btn-ghost"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePublish(true)}
                    disabled={saving}
                    className="btn-primary"
                    style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
                  >
                    {saving ? 'Publishing...' : '🚀 Publish Course Now'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="btn-ghost"
              style={{ opacity: currentStep === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ChevronLeft size={16} /> Previous Step
            </button>

            {currentStep < 5 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Next Step <ChevronRight size={16} />
              </button>
            )}
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}

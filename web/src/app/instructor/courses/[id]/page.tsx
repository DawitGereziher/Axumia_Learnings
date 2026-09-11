'use client';

import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import ReviewList from '@/components/reviews/ReviewList';
import InstructorResponseForm from '@/components/reviews/InstructorResponseForm';
import AvatarUploader from '@/components/settings/AvatarUploader';
import DocumentUploader from '@/components/DocumentUploader';
import MaterialUploader, { UploadedMaterial } from '@/components/instructor/MaterialUploader';
import { Paperclip, FileText, Trash2, X } from 'lucide-react';

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;
  const router = useRouter();

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Course form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [status, setStatus] = useState('draft');
  const [level, setLevel] = useState('beginner');
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // New Lesson form state
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonPreview, setLessonPreview] = useState(false);
  const [lessonVideoKey, setLessonVideoKey] = useState('');
  const [lessonContentType, setLessonContentType] = useState('youtube');
  const [lessonYoutubeUrl, setLessonYoutubeUrl] = useState('');
  const [lessonExternalUrl, setLessonExternalUrl] = useState('');
  const [lessonEmbedCode, setLessonEmbedCode] = useState('');
  const [lessonSectionId, setLessonSectionId] = useState('');
  const [lessonDurationMin, setLessonDurationMin] = useState('');
  const [lessonDurationSec, setLessonDurationSec] = useState('');
  const [lessonRequiresProgress, setLessonRequiresProgress] = useState(true);
  const [addingLesson, setAddingLesson] = useState(false);
  
  // Sections state
  const [sections, setSections] = useState<any[]>([]);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');
  
  // Materials state
  const [selectedLessonForMaterials, setSelectedLessonForMaterials] = useState<string | null>(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialType, setMaterialType] = useState('pdf');
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialFileName, setMaterialFileName] = useState('');
  const [materialDownloadable, setMaterialDownloadable] = useState(true);
  const [materialPreview, setMaterialPreview] = useState(false);
  
  // Reviews state
  const [activeTab, setActiveTab] = useState<'content' | 'reviews'>('content');
  const [respondingToReview, setRespondingToReview] = useState<string | null>(null);

  const fetchCourse = async () => {
    try {
      const res = await authFetch(`/api/courses/${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not fetch course');
      setCourse(data);
      setTitle(data.title);
      setDescription(data.description);
      setPrice(data.price);
      setStatus(data.status);
      setLevel(data.level);
      setThumbnail(data.thumbnail || null);
      
      // Fetch sections
      const sectionsRes = await authFetch(`/api/courses/${courseId}/sections`);
      const sectionsData = await sectionsRes.json();
      if (sectionsRes.ok) setSections(sectionsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await authFetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, description, price, status, level, thumbnail }),
      });
      if (!res.ok) throw new Error('Could not update course');
      setMessage('Course updated successfully.');
      fetchCourse();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await authFetch(`/api/courses/${courseId}/sections`, {
        method: 'POST',
        body: JSON.stringify({ title: newSectionTitle, description: newSectionDesc }),
      });
      if (!res.ok) throw new Error('Could not add section');
      setMessage('Section added successfully.');
      setShowSectionForm(false);
      setNewSectionTitle('');
      setNewSectionDesc('');
      fetchCourse();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section? All lessons in this section will be moved to the course root.')) return;
    try {
      const res = await authFetch(`/api/courses/sections/${sectionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete section');
      setMessage('Section deleted.');
      fetchCourse();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingLesson(true);
    setMessage('');
    setError('');
    try {
      const lessonData: any = {
        title: lessonTitle,
        description: lessonDesc,
        is_free_preview: lessonPreview,
        content_type: lessonContentType,
        requires_progress: lessonRequiresProgress,
      };

      // Duration in seconds
      const mins = parseInt(lessonDurationMin || '0', 10);
      const secs = parseInt(lessonDurationSec || '0', 10);
      const durationS = mins * 60 + secs;
      if (durationS > 0) lessonData.duration_s = durationS;

      if (lessonContentType === 'video') {
        lessonData.video_key = lessonVideoKey;
      } else if (lessonContentType === 'youtube') {
        lessonData.youtube_url = lessonYoutubeUrl;
      } else if (lessonContentType === 'pdf') {
        lessonData.external_url = lessonExternalUrl;
      } else if (lessonContentType === 'external') {
        lessonData.external_url = lessonExternalUrl;
      } else if (lessonContentType === 'embedded') {
        lessonData.embed_code = lessonEmbedCode;
      }

      if (lessonSectionId) {
        lessonData.section_id = lessonSectionId;
      }

      const res = await authFetch(`/api/courses/${courseId}/lessons`, {
        method: 'POST',
        body: JSON.stringify(lessonData),
      });
      if (!res.ok) throw new Error('Could not add lesson');
      setMessage('Lesson added successfully.');
      setLessonTitle('');
      setLessonDesc('');
      setLessonPreview(false);
      setLessonVideoKey('');
      setLessonYoutubeUrl('');
      setLessonExternalUrl('');
      setLessonEmbedCode('');
      setLessonSectionId('');
      setLessonDurationMin('');
      setLessonDurationSec('');
      setLessonRequiresProgress(true);
      setLessonContentType('video');
      fetchCourse();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
      const res = await authFetch(`/api/courses/lessons/${lessonId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete lesson');
      setMessage('Lesson deleted.');
      fetchCourse();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await authFetch(`/api/courses/lessons/${selectedLessonForMaterials}/materials`, {
        method: 'POST',
        body: JSON.stringify({
          title: materialTitle,
          material_type: materialType,
          file_url: materialUrl,
          file_name: materialFileName,
          is_downloadable: materialDownloadable,
          is_free_preview: materialPreview,
        }),
      });
      if (!res.ok) throw new Error('Could not add material');
      setMessage('Material added successfully.');
      setShowMaterialForm(false);
      setSelectedLessonForMaterials(null);
      setMaterialTitle('');
      setMaterialUrl('');
      setMaterialFileName('');
      fetchCourse();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      const res = await authFetch(`/api/courses/materials/${materialId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete material');
      setMessage('Material deleted.');
      fetchCourse();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDirectAddMaterial = async (lessonId: string, mat: UploadedMaterial) => {
    try {
      const res = await authFetch(`/api/courses/lessons/${lessonId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mat),
      });
      if (!res.ok) throw new Error('Could not add material');
      setMessage('Material attached successfully.');
      fetchCourse();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRespondToReview = (reviewId: string) => {
    setRespondingToReview(reviewId);
  };

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (error && !course) {
    return (
      <main>
        <Navbar />
        <div className="container section" style={{ paddingTop: 120, textAlign: 'center' }}>
          <p style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Navbar />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 60%)' }}>
        <div className="container section" style={{ maxWidth: 960 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.8rem' }}>
                Manage <span className="gradient-text">{course.title}</span>
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Edit course metadata, status, and manage lessons.</p>
            </div>
            <button onClick={() => router.push(`/courses/${course.slug}`)} className="btn-ghost" style={{ fontSize: '0.85rem' }}>
              View Public Page ↗
            </button>
          </div>

          {message && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '0.75rem 1rem', color: '#6ee7b7', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={() => setActiveTab('content')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 8,
                background: activeTab === 'content' ? '#6366f1' : '#18181b',
                color: activeTab === 'content' ? '#fff' : '#9ca3af',
                border: activeTab === 'content' ? 'none' : '1px solid #374151',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: activeTab === 'content' ? 600 : 400,
              }}
            >
              📚 Course Content
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 8,
                background: activeTab === 'reviews' ? '#6366f1' : '#18181b',
                color: activeTab === 'reviews' ? '#fff' : '#9ca3af',
                border: activeTab === 'reviews' ? 'none' : '1px solid #374151',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: activeTab === 'reviews' ? 600 : 400,
              }}
            >
              ⭐ Reviews & Feedback
            </button>
          </div>

          {activeTab === 'content' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Course Sections */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Course Sections</h2>
                  <button 
                    onClick={() => setShowSectionForm(!showSectionForm)}
                    className="btn-primary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  >
                    {showSectionForm ? 'Cancel' : '+ Add Section'}
                  </button>
                </div>

                {showSectionForm && (
                  <form onSubmit={handleAddSection} className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <input 
                      className="input-field" 
                      placeholder="Section title" 
                      value={newSectionTitle}
                      onChange={e => setNewSectionTitle(e.target.value)}
                      style={{ marginBottom: '1rem' }}
                      required
                    />
                    <textarea 
                      className="input-field" 
                      placeholder="Section description (optional)" 
                      rows={2}
                      value={newSectionDesc}
                      onChange={e => setNewSectionDesc(e.target.value)}
                      style={{ marginBottom: '1rem' }}
                    />
                    <button type="submit" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                      Create Section
                    </button>
                  </form>
                )}

                {sections.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {sections.map((section: any) => (
                      <div key={section.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{section.title}</div>
                          {section.description && <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{section.description}</div>}
                        </div>
                        <button 
                          onClick={() => handleDeleteSection(section.id)}
                          style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass" style={{ padding: '1.5rem', borderRadius: 10, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    No sections yet. Add sections to organize your course content.
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Course details form */}
                <form onSubmit={handleUpdateCourse} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>Course Details</h2>

                  <div>
                    <AvatarUploader
                      label="Course Thumbnail Image (Stored in Cloudflare Public Storage)"
                      currentUrl={thumbnail}
                      aspectRatio="16:9"
                      shape="rect"
                      folder="thumbnail"
                      onUpload={(key, publicUrl) => setThumbnail(publicUrl || key)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Title</label>
                    <input className="input-field" value={title} onChange={e => setTitle(e.target.value)} />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Description</label>
                    <textarea className="input-field" rows={5} value={description} onChange={e => setDescription(e.target.value)} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Price (ETB)</label>
                      <input className="input-field" type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Publish Status</label>
                      <select className="input-field" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="draft">Draft (Hidden)</option>
                        <option value="published">Published (Visible)</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
                    Save Course Details
                  </button>
                </form>

                {/* Lessons section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Add lesson form */}
                  <form onSubmit={handleAddLesson} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>Add New Lesson</h2>
                    
                    <input className="input-field" required placeholder="Lesson title" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} />
                    <textarea className="input-field" placeholder="Brief lesson description" rows={2} value={lessonDesc} onChange={e => setLessonDesc(e.target.value)} />
                    
                    {/* Content Type Selection */}
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Content Type</label>
                      <select 
                        className="input-field" 
                        value={lessonContentType} 
                        onChange={e => setLessonContentType(e.target.value)}
                        style={{ marginBottom: '1rem' }}
                      >
                        <option value="youtube">YouTube Video</option>
                        <option value="video">Direct Uploaded Video</option>
                        <option value="reading">Reading / Article (Lecture Notes)</option>
                        <option value="pdf">PDF Document Lesson</option>
                        <option value="external">External URL</option>
                        <option value="embedded">Embedded Content</option>
                      </select>
                    </div>

                    {/* PDF Lesson Upload */}
                    {lessonContentType === 'pdf' && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                          Primary PDF Document
                        </label>
                        {lessonExternalUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'rgba(99,102,241,0.1)', borderRadius: 8 }}>
                            <span style={{ fontSize: '0.82rem', color: '#818cf8', fontWeight: 600 }}>
                              PDF: {lessonExternalUrl.split('/').pop()}
                            </span>
                            <button
                              type="button"
                              onClick={() => setLessonExternalUrl('')}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <MaterialUploader
                            label="Upload Main PDF Document for this Lesson"
                            allowedExtensions={['.pdf']}
                            onUploaded={(mat) => setLessonExternalUrl(mat.file_url)}
                          />
                        )}
                      </div>
                    )}

                    {/* YouTube URL (for YouTube content type) */}
                    {lessonContentType === 'youtube' && (
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                          YouTube URL (unlisted video)
                        </label>
                        <input 
                          className="input-field" 
                          placeholder="https://www.youtube.com/watch?v=..." 
                          value={lessonYoutubeUrl}
                          onChange={e => setLessonYoutubeUrl(e.target.value)}
                          style={{ marginBottom: '1rem' }}
                        />
                      </div>
                    )}

                    {/* External URL (for external content type) */}
                    {lessonContentType === 'external' && (
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                          External URL
                        </label>
                        <input 
                          className="input-field" 
                          placeholder="https://..." 
                          value={lessonExternalUrl}
                          onChange={e => setLessonExternalUrl(e.target.value)}
                          style={{ marginBottom: '1rem' }}
                        />
                      </div>
                    )}

                    {/* Embed Code (for embedded content type) */}
                    {lessonContentType === 'embedded' && (
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                          Embed Code
                        </label>
                        <textarea 
                          className="input-field" 
                          placeholder="<iframe>...</iframe>" 
                          rows={3}
                          value={lessonEmbedCode}
                          onChange={e => setLessonEmbedCode(e.target.value)}
                          style={{ marginBottom: '1rem' }}
                        />
                      </div>
                    )}

                    {/* Video Key (for S3 video content type) */}
                    {lessonContentType === 'video' && (
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                          S3 Video Key
                        </label>
                        <input 
                          className="input-field" 
                          placeholder="videos/course-name/lesson1.mp4" 
                          value={lessonVideoKey}
                          onChange={e => setLessonVideoKey(e.target.value)}
                          style={{ marginBottom: '1rem' }}
                        />
                      </div>
                    )}

                    {/* Section selection */}
                    {sections.length > 0 && (
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                          Add to Section (optional)
                        </label>
                        <select 
                          className="input-field" 
                          value={lessonSectionId}
                          onChange={e => setLessonSectionId(e.target.value)}
                          style={{ marginBottom: '1rem' }}
                        >
                          <option value="">No section (root level)</option>
                          {sections.map((section: any) => (
                            <option key={section.id} value={section.id}>{section.title}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Duration inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Duration (minutes)</label>
                        <input className="input-field" type="number" min="0" placeholder="e.g. 12" value={lessonDurationMin} onChange={e => setLessonDurationMin(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Seconds</label>
                        <input className="input-field" type="number" min="0" max="59" placeholder="e.g. 30" value={lessonDurationSec} onChange={e => setLessonDurationSec(e.target.value)} />
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: -8 }}>Enter video duration so progress tracking works accurately.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer' }}>
                        <input type="checkbox" checked={lessonPreview} onChange={e => setLessonPreview(e.target.checked)} />
                        Available as free preview
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer' }}>
                        <input type="checkbox" checked={lessonRequiresProgress} onChange={e => setLessonRequiresProgress(e.target.checked)} />
                        Requires watch progress (uncheck for text/reading lessons)
                      </label>
                    </div>

                    <button type="submit" className="btn-primary" disabled={addingLesson} style={{ fontSize: '0.85rem' }}>
                      {addingLesson ? 'Adding...' : '+ Add Lesson'}
                    </button>
                  </form>

                  {/* Lessons list */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                      Course Lessons ({course.lessons?.length || 0})
                    </h2>
                    
                    {!course.lessons?.length ? (
                      <div className="glass" style={{ padding: '1.5rem', borderRadius: 10, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                        No lessons yet. Add your first lesson above.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {course.lessons.map((lesson: any, idx: number) => {
                          const dS = lesson.duration_s;
                          const durStr = dS ? `${Math.floor(dS/60)}:${(dS%60).toString().padStart(2,'0')}` : '';
                          const section = sections.find((s: any) => s.id === lesson.section_id);
                          const typeIcon = lesson.content_type === 'youtube' ? '▶' : lesson.content_type === 'video' ? '🎞' : lesson.content_type === 'pdf' ? '📄' : '▶';
                          return (
                          <div key={lesson.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', borderLeft: '3px solid rgba(99,102,241,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#475569' }}>{idx + 1}.</span>
                                  {typeIcon} {lesson.title}
                                  {lesson.is_free_preview && <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 999, padding: '1px 6px' }}>FREE</span>}
                                </div>
                                <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: 3, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                  <span style={{ textTransform: 'capitalize' }}>{lesson.content_type}</span>
                                  {durStr && <span>⏱ {durStr}</span>}
                                  {section && <span>📂 {section.title}</span>}
                                  {!lesson.requires_progress && <span style={{ color: '#d4af37' }}>📖 Reading</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLessonForMaterials(selectedLessonForMaterials === lesson.id ? null : lesson.id)}
                                  style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: 6,
                                    background: selectedLessonForMaterials === lesson.id ? '#4f46e5' : '#374151',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Paperclip size={13} /> {selectedLessonForMaterials === lesson.id ? 'Close' : '+ Materials'}
                                </button>
                                <Link
                                  href={`/instructor/courses/${courseId}/quiz/${lesson.id}`}
                                  style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: 6,
                                    background: 'rgba(12,59,46,0.6)',
                                    color: '#fde047',
                                    border: '1px solid rgba(253,224,71,0.25)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    textDecoration: 'none',
                                    fontWeight: 600,
                                  }}
                                >
                                  📝 Quiz
                                </Link>
                                <button 
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* Attached Materials Chips */}
                            {lesson.materials && lesson.materials.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', paddingTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                {lesson.materials.map((mat: any) => (
                                  <div
                                    key={mat.id}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 5,
                                      padding: '3px 8px', borderRadius: 6,
                                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                      fontSize: '0.75rem', color: '#cbd5e1',
                                    }}
                                  >
                                    <FileText size={12} color="#818cf8" />
                                    <span>{mat.title}</span>
                                    {mat.file_size ? (
                                      <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                                        ({(mat.file_size / (1024 * 1024)).toFixed(1)} MB)
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMaterial(mat.id)}
                                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, marginLeft: 2 }}
                                      title="Delete material"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Inline Material Uploader for this lesson */}
                            {selectedLessonForMaterials === lesson.id && (
                              <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(99,102,241,0.05)', borderRadius: 8, border: '1px dashed rgba(99,102,241,0.3)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#818cf8', marginBottom: '0.4rem' }}>
                                  Attach file to &quot;{lesson.title}&quot;
                                </div>
                                <MaterialUploader
                                  label="Attach PDF, Word doc (.docx), PPTX, or ZIP"
                                  onUploaded={(mat) => handleDirectAddMaterial(lesson.id, mat)}
                                />
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Materials form (shown when lesson is selected) */}
                  {selectedLessonForMaterials && (
                    <form onSubmit={handleAddMaterial} className="card" style={{ padding: '1.5rem', border: '1px solid #6366f1' }}>
                      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Add Material to Lesson
                      </h2>
                      
                      <input 
                        className="input-field" 
                        placeholder="Material title" 
                        value={materialTitle}
                        onChange={e => setMaterialTitle(e.target.value)}
                        style={{ marginBottom: '1rem' }}
                        required
                      />
                      
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Material Type</label>
                        <select 
                          className="input-field" 
                          value={materialType}
                          onChange={e => setMaterialType(e.target.value)}
                          style={{ marginBottom: '1rem' }}
                        >
                          <option value="pdf">PDF Document</option>
                          <option value="video">Video File</option>
                          <option value="image">Image</option>
                          <option value="link">External Link</option>
                          <option value="other">Other File</option>
                        </select>
                      </div>
                      
                      {materialType === 'link' ? (
                        <input 
                          className="input-field" 
                          placeholder="External Link URL (https://...)" 
                          value={materialUrl}
                          onChange={e => setMaterialUrl(e.target.value)}
                          style={{ marginBottom: '1rem' }}
                          required
                        />
                      ) : (
                        <div style={{ marginBottom: '1rem' }}>
                          <DocumentUploader
                            label="Upload File to Private Storage"
                            bucket="private"
                            folder="pdf"
                            onUpload={(key, name, size) => {
                              setMaterialUrl(key);
                              if (!materialFileName) setMaterialFileName(name);
                              if (!materialTitle) setMaterialTitle(name.replace(/\.[^/.]+$/, ''));
                            }}
                          />
                        </div>
                      )}
                      
                      <input 
                        className="input-field" 
                        placeholder="File Display Name (e.g., Lesson Notes PDF)" 
                        value={materialFileName}
                        onChange={e => setMaterialFileName(e.target.value)}
                        style={{ marginBottom: '1rem' }}
                      />

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={materialDownloadable} 
                          onChange={e => setMaterialDownloadable(e.target.checked)} 
                        />
                        Allow students to download this material
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={materialPreview} 
                          onChange={e => setMaterialPreview(e.target.checked)} 
                        />
                        Available as free preview
                      </label>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                          Add Material
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowMaterialForm(false);
                            setSelectedLessonForMaterials(null);
                          }}
                          className="btn-ghost"
                          style={{ fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Materials list for selected lesson */}
                  {selectedLessonForMaterials && course.lessons?.find((l: any) => l.id === selectedLessonForMaterials)?.materials?.length > 0 && (
                    <div className="card" style={{ padding: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Lesson Materials
                      </h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {course.lessons.find((l: any) => l.id === selectedLessonForMaterials)?.materials.map((material: any) => (
                          <div key={material.id} className="card" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{material.title}</div>
                              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                {material.material_type} • {material.is_downloadable ? 'Downloadable' : 'View only'}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteMaterial(material.id)}
                              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem', background: '#09090b', borderRadius: 12 }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>
                  Student Reviews & Feedback
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Respond to student reviews to build engagement and improve your course.
                </p>
              </div>

              {respondingToReview && (
                <InstructorResponseForm
                  courseId={courseId}
                  reviewId={respondingToReview}
                  onResponseSubmitted={() => setRespondingToReview(null)}
                  onCancel={() => setRespondingToReview(null)}
                />
              )}

              <ReviewList
                courseId={courseId}
                showWriteReview={false}
                onWriteReview={() => {}}
                userHasReviewed={false}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
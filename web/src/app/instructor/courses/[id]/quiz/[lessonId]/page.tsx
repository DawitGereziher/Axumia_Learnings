'use client';

import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { authFetch } from '@/lib/auth';
import QuizBuilder from '@/components/quiz/QuizBuilder';

export default function QuizBuilderPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = use(params);
  const [lessonTitle, setLessonTitle] = useState('Loading…');

  // Fetch the lesson title for display in the builder header
  useEffect(() => {
    authFetch(`/api/courses/${courseId}`)
      .then((r) => r.json())
      .then((course) => {
        const lesson = course?.lessons?.find((l: any) => l.id === lessonId);
        if (lesson) setLessonTitle(lesson.title);
      })
      .catch(() => setLessonTitle('Lesson'));
  }, [courseId, lessonId]);

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#060f1a', padding: '2rem 1.5rem', paddingTop: '5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Breadcrumb */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
            <Link href="/instructor" style={{ color: '#64748b', textDecoration: 'none' }}>Instructor</Link>
            <span>›</span>
            <Link href={`/instructor/courses/${courseId}`} style={{ color: '#64748b', textDecoration: 'none' }}>Course Editor</Link>
            <span>›</span>
            <span style={{ color: '#94a3b8' }}>Quiz Builder</span>
          </div>

          {/* Quiz builder component */}
          <QuizBuilder lessonId={lessonId} lessonTitle={lessonTitle} />
        </div>
      </main>
    </>
  );
}

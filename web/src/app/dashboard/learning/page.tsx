'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LearningRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/my-courses');
  }, [router]);

  return null;
}

'use client';

import React, { useRef, useState } from 'react';
import { Camera, Pencil, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/auth';

interface AvatarUploaderProps {
  currentUrl?: string | null;
  label: string;
  aspectRatio?: '1:1' | '3:1' | '16:9';  // 1:1 for profile pic, 3:1 for cover, 16:9 for course thumbnail
  onUpload: (s3Key: string, previewUrl: string) => void;
  shape?: 'circle' | 'rect';
  folder?: 'profile' | 'cover' | 'thumbnail';
}

/**
 * AvatarUploader — drag-and-drop file picker with real Cloudflare R2 direct upload.
 * 1. Requests a pre-signed upload URL from backend POST /api/storage/upload-url
 * 2. PUTs file directly from browser to R2 public bucket
 * 3. Returns the saved key and public URL to parent form
 */
export const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

export default function AvatarUploader({
  currentUrl, label, aspectRatio = '1:1', onUpload, shape = 'circle', folder,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(getFullUrl(currentUrl));
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    setPreview(getFullUrl(currentUrl));
  }, [currentUrl]);

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    setUploadError(null);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl); // show immediately for UX

    try {
      const isThumbnail = aspectRatio === '16:9' || folder === 'thumbnail';
      const isCover = aspectRatio === '3:1' || folder === 'cover';
      const folderType = folder || (isThumbnail ? 'thumbnail' : isCover ? 'cover' : 'profile');

      // 1. Get Pre-signed Upload URL from backend API (always public bucket for public assets)
      const res = await authFetch('/api/storage/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          bucket: 'public',
          contentType: file.type,
          folder: folderType,
          fileName: file.name,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Failed to get upload URL (${res.status}): ${errBody}`);
      }

      const data = await res.json();

      if (!data.uploadUrl) {
        throw new Error('Backend did not return an uploadUrl — check R2 credentials in backend/.env');
      }

      // 2. Upload file directly to Cloudflare R2 via pre-signed PUT URL
      const uploadRes = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`R2 upload failed (${uploadRes.status}): ${uploadRes.statusText}. Check that your R2 bucket CORS policy allows PUT from this origin.`);
      }

      // 3. Update preview with public CDN URL and trigger callback
      const finalUrl = data.publicUrl || localUrl;
      setPreview(finalUrl);
      onUpload(data.key, finalUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AvatarUploader] Upload failed:', msg);
      setUploadError(msg);
      // Revert preview to what was there before
      setPreview(getFullUrl(currentUrl));
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const isCover = aspectRatio === '3:1';
  const isThumbnail = aspectRatio === '16:9';
  const isWide = isCover || isThumbnail;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>{label}</label>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        id={`avatar-uploader-${label.replace(/\s+/g, '-').toLowerCase()}`}
        style={{
          position: 'relative',
          width: isThumbnail ? '100%' : isCover ? '100%' : shape === 'circle' ? 112 : 112,
          maxWidth: isThumbnail ? 380 : undefined,
          aspectRatio: isThumbnail ? '16/9' : undefined,
          height: isThumbnail ? 'auto' : isCover ? 140 : 112,
          borderRadius: shape === 'circle' ? '50%' : 14,
          background: preview ? 'transparent' : 'rgba(255,255,255,0.04)',
          border: `2px dashed ${dragging ? 'rgba(16,185,129,0.7)' : 'rgba(255,255,255,0.15)'}`,
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'border-color 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {preview ? (
          <img src={preview} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center', padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Camera size={isWide ? 28 : 22} color="#94a3b8" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {isThumbnail ? 'Upload course thumbnail' : isCover ? 'Upload cover photo' : 'Upload photo'}
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
          opacity: 0, transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
        >
          {uploading ? (
            <span style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Loader2 size={14} className="animate-spin" /> Uploading...
            </span>
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Pencil size={13} /> Change
            </span>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <p style={{ fontSize: '0.72rem', color: '#475569' }}>
        Drag & drop or click to upload · JPG, PNG, WEBP
      </p>
      {uploadError && (
        <p style={{
          fontSize: '0.7rem', color: '#fca5a5',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 6, padding: '0.4rem 0.6rem', marginTop: '0.25rem', lineHeight: 1.4,
          maxWidth: 260,
        }}>
          Upload failed — {uploadError}
        </p>
      )}
    </div>
  );
}

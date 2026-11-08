'use client';

import React, { useRef, useState } from 'react';
import { FileText, UploadCloud, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { authFetch } from '@/lib/auth';

const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';
  return `${domain.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

interface DocumentUploaderProps {
  label?: string;
  bucket?: 'public' | 'private';
  folder?: 'pdf' | 'kyc' | 'resource' | 'certificate';
  accept?: string;
  allowedTypes?: string[];
  currentUrl?: string | null;
  onUpload: (key: string, fileNameOrUrl: string, fileSize?: number) => void;
}

/**
 * DocumentUploader — Drag and drop file uploader for private/public documents (PDFs, DOCX, ZIP, etc.)
 * 1. Uploads file to storage via backend /api/storage/upload
 * 2. Invokes onUpload with the uploaded key, file name, and file size in bytes.
 * 3. Supports currentUrl preview when an existing document is on file.
 */
export default function DocumentUploader({
  label = 'Upload Document',
  bucket = 'private',
  folder = 'pdf',
  accept = '.pdf,.doc,.docx,.zip,.png,.jpg,.jpeg',
  allowedTypes,
  currentUrl,
  onUpload,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      if (allowedTypes && allowedTypes.length > 0) {
        const matches = allowedTypes.some(t => file.type === t || file.name.endsWith(t.replace('image/', '.')));
        if (!matches && !file.type.includes('pdf') && !file.type.includes('image')) {
          // Soft check
        }
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      formData.append('folder', folder);
      formData.append('fileName', file.name);

      const res = await authFetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to upload file (${res.status})`);
      }

      const data = await res.json();
      setUploadedFile({ name: file.name, size: file.size });
      onUpload(data.key, data.url || file.name, file.size);
    } catch (err: any) {
      console.error('Document upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const effectiveAccept = allowedTypes && allowedTypes.length > 0 ? allowedTypes.join(',') : accept;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {label && <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>{label}</label>}
        {currentUrl && !uploadedFile && (
          <a
            href={getFullUrl(currentUrl) || currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
          >
            <ExternalLink size={11} /> View Current
          </a>
        )}
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          padding: '1.25rem',
          borderRadius: 14,
          background: dragging ? 'rgba(12, 59, 46, 0.15)' : 'var(--bg-secondary)',
          border: `2px dashed ${
            error ? 'rgba(239,68,68,0.5)' : dragging ? 'var(--accent)' : 'var(--card-border)'
          }`,
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {uploading ? (
          <>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700 }}>
              Uploading document to secure storage...
            </span>
          </>
        ) : uploadedFile ? (
          <>
            <CheckCircle2 size={24} color="#34d399" />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399' }}>
                {uploadedFile.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {formatSize(uploadedFile.size)} · Successfully Uploaded
              </div>
            </div>
          </>
        ) : currentUrl ? (
          <>
            <CheckCircle2 size={24} color="#34d399" />
            <div>
              <span style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Document on File
              </span>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                Click to replace with a new file
              </span>
            </div>
          </>
        ) : (
          <>
            <UploadCloud size={26} style={{ color: 'var(--text-muted)' }} />
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Click or drop file to upload
              </span>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                PDF, JPG, or PNG (up to 15MB)
              </span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: '0.78rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: 2 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={effectiveAccept}
        style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}

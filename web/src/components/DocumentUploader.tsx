'use client';

import React, { useRef, useState } from 'react';
import { FileText, UploadCloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { authFetch } from '@/lib/auth';

interface DocumentUploaderProps {
  label?: string;
  bucket?: 'public' | 'private';
  folder?: 'pdf' | 'kyc' | 'resource' | 'certificate';
  accept?: string;
  onUpload: (key: string, fileName: string, fileSize: number) => void;
}

/**
 * DocumentUploader — Drag and drop file uploader for private/public documents (PDFs, DOCX, ZIP, etc.)
 * 1. Requests a pre-signed upload URL from backend POST /api/storage/upload-url
 * 2. Uploads file directly to Cloudflare R2 via pre-signed PUT URL
 * 3. Invokes onUpload with the uploaded key, file name, and file size in bytes.
 */
export default function DocumentUploader({
  label = 'Upload Document',
  bucket = 'private',
  folder = 'pdf',
  accept = '.pdf,.doc,.docx,.zip,.png,.jpg,.jpeg',
  onUpload,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // 1. Get Pre-signed Upload URL from backend API
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
      onUpload(data.key, file.name, file.size);
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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {label && <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>{label}</label>}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          padding: '1.25rem',
          borderRadius: 12,
          background: dragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
          border: `2px dashed ${
            error ? 'rgba(239,68,68,0.5)' : dragging ? '#6366f1' : 'rgba(255,255,255,0.12)'
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
            <Loader2 size={24} className="animate-spin" color="#818cf8" />
            <span style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 600 }}>
              Uploading directly to R2...
            </span>
          </>
        ) : uploadedFile ? (
          <>
            <CheckCircle2 size={24} color="#34d399" />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#34d399' }}>
                {uploadedFile.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {formatSize(uploadedFile.size)} · Uploaded
              </div>
            </div>
          </>
        ) : (
          <>
            <UploadCloud size={26} color="#94a3b8" />
            <div>
              <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>
                Click to upload document
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: 2 }}>
                or drag and drop here (PDF, DOCX, ZIP)
              </span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: '0.78rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: 4 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, FileCode, FileArchive, Check, Loader2, X, Paperclip } from 'lucide-react';
import { authFetch } from '@/lib/auth';

export interface UploadedMaterial {
  title: string;
  description?: string;
  material_type: 'pdf' | 'document' | 'zip' | 'other';
  file_url: string; // R2 key
  file_name: string;
  file_size: number;
  is_downloadable?: boolean;
}

interface MaterialUploaderProps {
  onUploaded: (material: UploadedMaterial) => void;
  allowedExtensions?: string[];
  label?: string;
}

export default function MaterialUploader({
  onUploaded,
  allowedExtensions = ['.pdf', '.doc', '.docx', '.pptx', '.ppt', '.zip', '.txt'],
  label = 'Upload Material (PDF, Word, PPT, ZIP)',
}: MaterialUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getMaterialType = (fileName: string): 'pdf' | 'document' | 'zip' | 'other' => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'txt', 'rtf', 'odt', 'ppt', 'pptx'].includes(ext)) return 'document';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip';
    return 'other';
  };

  const handleFile = async (file: File) => {
    setError('');
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!allowedExtensions.includes(ext)) {
      setError(`Unsupported file type. Please upload: ${allowedExtensions.join(', ')}`);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the 50 MB limit.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'private');
      formData.append('folder', 'material');
      formData.append('fileName', file.name);

      const res = await authFetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to upload document');
      }

      const { key } = await res.json();

      // Callback
      const materialType = getMaterialType(file.name);
      onUploaded({
        title: file.name.replace(/\.[^/.]+$/, ''), // remove extension for title
        file_url: key,
        file_name: file.name,
        file_size: file.size,
        material_type: materialType,
        is_downloadable: true,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? 'var(--pine-deep, #0c3b2e)' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 12,
          padding: '1.25rem 1rem',
          background: dragOver ? 'rgba(12,59,46,0.08)' : 'rgba(255,255,255,0.02)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          transition: 'all 0.15s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedExtensions.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: '#818cf8', fontSize: '0.85rem' }}>
            <Loader2 size={18} className="animate-spin" />
            <span>Uploading to secure storage...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
            <Paperclip size={20} color="#94a3b8" />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
              {label}
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted, #94a3b8)' }}>
              Drag &amp; drop or click to browse (PDF, Word, PPTX, ZIP up to 50MB)
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <X size={13} /> {error}
        </div>
      )}
    </div>
  );
}

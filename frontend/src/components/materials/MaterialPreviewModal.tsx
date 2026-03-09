'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { materialsService } from '@/services/materials.service';
import type { ClassEventMaterial } from '@/types/material';

// ============================================
// Helpers
// ============================================

function getFileIconPath(mimeType: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf') return '/icons/files/pdf.svg';
  if (ext === 'doc' || ext === 'docx') return '/icons/files/doc.svg';
  if (ext === 'xls' || ext === 'xlsx') return '/icons/files/xls.svg';
  if (ext === 'ppt' || ext === 'pptx') return '/icons/files/ppt.svg';
  if (ext === 'txt') return '/icons/files/txt.svg';
  if (ext === 'csv') return '/icons/files/excel.svg';
  if (ext === 'zip' || ext === 'rar' || ext === '7z') return '/icons/files/zip.svg';
  if (ext === 'mp3' || ext === 'wav' || ext === 'ogg') return '/icons/files/mp3.svg';
  if (ext === 'mp4' || ext === 'avi' || ext === 'mov' || ext === 'mkv') return '/icons/files/video.svg';

  if (mimeType.includes('pdf')) return '/icons/files/pdf.svg';
  if (mimeType.includes('word') || mimeType.includes('document')) return '/icons/files/doc.svg';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '/icons/files/xls.svg';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '/icons/files/ppt.svg';
  if (mimeType.startsWith('image/')) return '/icons/files/image.svg';
  if (mimeType.startsWith('video/')) return '/icons/files/video.svg';
  if (mimeType.startsWith('audio/')) return '/icons/files/mp3.svg';
  if (mimeType.includes('text/')) return '/icons/files/txt.svg';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '/icons/files/zip.svg';

  return '/icons/files/text.svg';
}

function getFileExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ext ? `.${ext}` : '';
}

function getFileNameWithoutExt(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
}

function canPreviewMime(mimeType: string): boolean {
  return (
    mimeType.includes('pdf') ||
    mimeType.startsWith('image/')
  );
}

// ============================================
// Component
// ============================================

interface MaterialPreviewModalProps {
  material: ClassEventMaterial;
  onClose: () => void;
}

export default function MaterialPreviewModal({
  material,
  onClose,
}: MaterialPreviewModalProps) {
  const fileName = material.displayName || material.fileResource.originalName;
  const mimeType = material.fileResource.mimeType;
  const canPreview = canPreviewMime(mimeType);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(canPreview);
  const [error, setError] = useState(false);

  const nameOnly = getFileNameWithoutExt(fileName);
  const ext = getFileExtension(fileName);
  const iconPath = getFileIconPath(mimeType, fileName);
  const isImage = mimeType.startsWith('image/');

  // Load authorized preview link
  useEffect(() => {
    if (!canPreview) return;

    materialsService
      .getAuthorizedLink(material.id, 'view')
      .then((data) => {
        setPreviewUrl(data.url);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [material.id, canPreview]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleDownload = async () => {
    try {
      const data = await materialsService.getAuthorizedLink(material.id, 'download');
      const a = document.createElement('a');
      a.href = data.url;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      materialsService.downloadMaterial(material.id, fileName);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col">
      {/* Header */}
      <div className="self-stretch p-4 bg-gray-900 flex items-center gap-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
        >
          <Icon name="close" size={24} className="text-icon-white" />
        </button>

        {/* File info */}
        <div className="flex-1 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconPath} alt={ext || 'file'} className="w-8 h-8" />
          <div className="flex items-start">
            <span className="text-text-white text-lg font-normal leading-5">
              {nameOnly}
            </span>
            <span className="text-text-white text-lg font-normal leading-5">
              {ext}
            </span>
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <Icon name="download" size={16} className="text-icon-white" />
          <span className="text-text-white text-sm font-medium leading-4">
            Descargar
          </span>
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-auto flex flex-col justify-center items-center bg-gray-900">
        {loading && (
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        )}

        {error && (
          <div className="flex flex-col items-center gap-4">
            <Icon name="error" size={48} className="text-icon-tertiary" />
            <p className="text-text-white text-sm">Error al cargar la vista previa</p>
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg text-text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Descargar archivo
            </button>
          </div>
        )}

        {!loading && !error && !canPreview && (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconPath} alt={ext || 'file'} className="w-16 h-16 opacity-50" />
            <p className="text-text-white text-sm">
              Vista previa no disponible para este tipo de archivo
            </p>
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg text-text-white text-sm font-medium hover:opacity-90 "
            >
              Descargar archivo
            </button>
          </div>
        )}

        {previewUrl && !isImage && (
          <iframe
            src={previewUrl}
            className="absolute inset-0 w-full h-full"
            title={fileName}
          />
        )}

        {previewUrl && isImage && (
          <div className="py-4 px-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={fileName}
              className="max-w-full max-h-[calc(100vh-80px)] object-contain"
            />
          </div>
        )}

      </div>
    </div>
  );
}

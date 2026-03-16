'use client';

import { useEffect, useState, useCallback } from 'react';
import Icon from '@/components/ui/Icon';
import { materialsService } from '@/services/materials.service';
import type { ClassEventMaterial, FolderMaterial } from '@/types/material';

// ============================================
// Types
// ============================================

export type PreviewableMaterial = ClassEventMaterial | FolderMaterial;

// ============================================
// Helpers
// ============================================

function getMimeTypeFromExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function resolveMaterialInfo(material: PreviewableMaterial) {
  const isClassEvent = 'fileResource' in material;
  const fileName = isClassEvent
    ? (material as ClassEventMaterial).displayName || (material as ClassEventMaterial).fileResource.originalName
    : material.displayName;
  const mimeType = isClassEvent
    ? (material as ClassEventMaterial).fileResource.mimeType
    : getMimeTypeFromExtension(material.displayName);
  return { fileName, mimeType };
}

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

type PreviewType = 'pdf' | 'image' | 'office' | false;

function getPreviewType(mimeType: string): PreviewType {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType.includes('word') || mimeType.includes('document') ||
    mimeType.includes('sheet') || mimeType.includes('excel') ||
    mimeType.includes('presentation') || mimeType.includes('powerpoint') ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.ms-powerpoint'
  ) return 'office';
  return false;
}

// ============================================
// Component
// ============================================

interface MaterialPreviewModalProps {
  materials: PreviewableMaterial[];
  initialIndex: number;
  onClose: () => void;
}

export default function MaterialPreviewModal({
  materials,
  initialIndex,
  onClose,
}: MaterialPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Preview fetch state keyed by materialId to avoid synchronous setState resets
  const [preview, setPreview] = useState<{
    materialId: string;
    url: string | null;
    loading: boolean;
    error: boolean;
  }>({ materialId: '', url: null, loading: false, error: false });

  const material = materials[currentIndex];
  const { fileName, mimeType } = resolveMaterialInfo(material);
  const previewType = getPreviewType(mimeType);

  // Derive display state: if preview belongs to a different material, show loading/reset
  const isCurrentPreview = preview.materialId === material.id;
  const previewUrl = isCurrentPreview ? preview.url : null;
  const loading = isCurrentPreview ? preview.loading : !!previewType;
  const error = isCurrentPreview ? preview.error : false;

  const nameOnly = getFileNameWithoutExt(fileName);
  const ext = getFileExtension(fileName);
  const iconPath = getFileIconPath(mimeType, fileName);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < materials.length - 1;

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < materials.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, materials.length]);

  // Load authorized preview link when material changes
  useEffect(() => {
    if (!previewType) return;

    let stale = false;
    const mode = previewType === 'office' ? 'download' : 'view';

    materialsService
      .getAuthorizedLink(material.id, mode)
      .then((data) => {
        if (stale) return;
        const url = previewType === 'office'
          ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.url)}`
          : data.url;
        setPreview({ materialId: material.id, url, loading: false, error: false });
      })
      .catch(() => {
        if (stale) return;
        setPreview({ materialId: material.id, url: null, loading: false, error: true });
      });

    return () => { stale = true; };
  }, [material.id, previewType]);

  // Keyboard: Escape to close, arrow keys to navigate
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goToPrev, goToNext]);

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
          {materials.length > 1 && (
            <span className="text-white/50 text-sm font-normal leading-4 ml-2">
              {currentIndex + 1} / {materials.length}
            </span>
          )}
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

        {!loading && !error && !previewType && (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconPath} alt={ext || 'file'} className="w-16 h-16 opacity-50" />
            <p className="text-text-white text-sm">
              Vista previa no disponible para este tipo de archivo
            </p>
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg text-text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Descargar archivo
            </button>
          </div>
        )}

        {previewUrl && (previewType === 'pdf' || previewType === 'office') && (
          <iframe
            src={previewUrl}
            className="absolute inset-0 w-full h-full"
            title={fileName}
          />
        )}

        {previewUrl && previewType === 'image' && (
          <div className="py-4 px-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={fileName}
              className="max-w-full max-h-[calc(100vh-80px)] object-contain"
            />
          </div>
        )}

        {/* Navigation buttons */}
        {materials.length > 1 && (
          <>
            {/* Previous */}
            <button
              onClick={goToPrev}
              disabled={!hasPrev}
              className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800 rounded-full inline-flex justify-center items-center transition-opacity ${
                hasPrev ? 'opacity-100 hover:bg-gray-700 cursor-pointer' : 'opacity-30 cursor-default'
              }`}
            >
              <Icon name="chevron_left" size={20} className="text-white" variant="rounded" />
            </button>

            {/* Next */}
            <button
              onClick={goToNext}
              disabled={!hasNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800 rounded-full inline-flex justify-center items-center transition-opacity ${
                hasNext ? 'opacity-100 hover:bg-gray-700 cursor-pointer' : 'opacity-30 cursor-default'
              }`}
            >
              <Icon name="chevron_right" size={20} className="text-white" variant="rounded" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

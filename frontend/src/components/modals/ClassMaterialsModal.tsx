'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/Icon';
import type { ClassEvent } from '@/types/classEvent';
import type { ClassEventMaterial } from '@/types/material';
import { materialsService } from '@/services/materials.service';

// ============================================
// Helpers
// ============================================

function getFileIconPath(mimeType: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // By extension first (more specific)
  if (ext === 'pdf') return '/icons/files/pdf.svg';
  if (ext === 'doc' || ext === 'docx') return '/icons/files/doc.svg';
  if (ext === 'xls' || ext === 'xlsx') return '/icons/files/xls.svg';
  if (ext === 'ppt' || ext === 'pptx') return '/icons/files/ppt.svg';
  if (ext === 'txt') return '/icons/files/txt.svg';
  if (ext === 'csv') return '/icons/files/excel.svg';
  if (ext === 'zip' || ext === 'rar' || ext === '7z') return '/icons/files/zip.svg';
  if (ext === 'svg') return '/icons/files/svg.svg';
  if (ext === 'js' || ext === 'jsx') return '/icons/files/javascript.svg';
  if (ext === 'css') return '/icons/files/css.svg';
  if (ext === 'php') return '/icons/files/php.svg';
  if (ext === 'sql') return '/icons/files/sql.svg';
  if (ext === 'mp3' || ext === 'wav' || ext === 'ogg') return '/icons/files/mp3.svg';
  if (ext === 'mp4' || ext === 'avi' || ext === 'mov' || ext === 'mkv') return '/icons/files/video.svg';
  if (ext === 'ttf' || ext === 'otf' || ext === 'woff') return '/icons/files/ttf.svg';
  if (ext === 'apk') return '/icons/files/apk.svg';
  if (ext === 'iso') return '/icons/files/iso.svg';
  if (ext === 'psd') return '/icons/files/psd.svg';
  if (ext === 'ai') return '/icons/files/adobe illustrator.svg';

  // By mimeType fallback
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
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) return '';
  return fileName.substring(dotIndex);
}

function getFileNameWithoutExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) return fileName;
  return fileName.substring(0, dotIndex);
}

function formatLastModified(iso: string): string {
  const date = new Date(iso);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const h = date.getHours();
  const m = date.getMinutes();
  const hourNum = h % 12 || 12;
  const ampm = h >= 12 ? 'pm' : 'am';
  const timeStr = m === 0 ? `${hourNum}${ampm}` : `${hourNum}:${m.toString().padStart(2, '0')}${ampm}`;
  return `${day}/${month}/${year} - ${timeStr}`;
}

// ============================================
// Material Row
// ============================================

function MaterialRow({ material }: { material: ClassEventMaterial }) {
  const [downloading, setDownloading] = useState(false);
  const fileName = material.displayName || material.fileResource.originalName;
  const nameWithoutExt = getFileNameWithoutExtension(fileName);
  const ext = getFileExtension(fileName);
  const lastModified = material.fileVersion.createdAt || material.createdAt;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await materialsService.downloadMaterial(material.id, fileName);
    } catch (err) {
      console.error('Error al descargar:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="self-stretch p-3 bg-bg-secondary rounded-lg inline-flex justify-start items-center gap-3">
      {/* File type icon */}
      <img
        src={getFileIconPath(material.fileResource.mimeType, fileName)}
        alt=""
        className="w-8 h-8 shrink-0"
      />

      {/* File info */}
      <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
        <div className="self-stretch inline-flex justify-start items-start">
          <span className="text-text-primary text-sm font-normal leading-4 line-clamp-1">
            {nameWithoutExt}
          </span>
          <span className="text-text-primary text-sm font-normal leading-4">
            {ext}
          </span>
        </div>
        <span className="text-text-tertiary text-[10px] font-normal leading-3">
          Última modificación: {formatLastModified(lastModified)}
        </span>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="p-1 rounded-full flex justify-center items-center hover:bg-bg-tertiary transition-colors disabled:opacity-50"
        title="Descargar"
      >
        <Icon
          name={downloading ? 'hourglass_empty' : 'download'}
          size={20}
          className="text-icon-tertiary"
        />
      </button>
    </div>
  );
}

// ============================================
// Modal
// ============================================

interface ClassMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ClassEvent[];
  materialsByEvent: Record<string, ClassEventMaterial[]>;
  loadingMaterialsMap: Record<string, boolean>;
  initialEventId?: string;
}

export default function ClassMaterialsModal({
  isOpen,
  onClose,
  events,
  materialsByEvent,
  loadingMaterialsMap,
  initialEventId,
}: ClassMaterialsModalProps) {
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Set initial tab
  useEffect(() => {
    if (isOpen) {
      if (initialEventId) {
        setActiveEventId(initialEventId);
      } else if (events.length > 0) {
        setActiveEventId(events[0].id);
      }
    }
  }, [isOpen, initialEventId, events]);

  // Escape key + scroll lock
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const activeEvent = events.find((e) => e.id === activeEventId);
  const activeMaterials = materialsByEvent[activeEventId] || [];
  const isLoadingMaterials = loadingMaterialsMap[activeEventId] || false;

  const handleDownloadAll = async () => {
    if (activeMaterials.length === 0) return;
    setDownloadingAll(true);
    try {
      for (const material of activeMaterials) {
        const fileName = material.displayName || material.fileResource.originalName;
        await materialsService.downloadMaterial(material.id, fileName);
      }
    } catch (err) {
      console.error('Error al descargar materiales:', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/25" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-[800px] bg-bg-primary rounded-xl shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.25)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col animate-slideUp">
        {/* Header */}
        <div className="pl-6 pr-3 py-3 border-b border-stroke-secondary flex items-center gap-3">
          <h2 className="flex-1 text-text-primary text-xl font-semibold leading-6">
            Materiales de Clase
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full flex justify-center items-center hover:bg-bg-secondary transition-colors"
          >
            <Icon name="close" size={24} className="text-icon-tertiary" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Class Tabs */}
          <div className="self-stretch flex items-center gap-0 border-b border-stroke-secondary overflow-x-auto">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => setActiveEventId(event.id)}
                className={`px-4 py-2.5 w-full whitespace-nowrap text-sm font-medium leading-4 transition-colors border-b-2 ${
                  activeEventId === event.id
                    ? 'text-text-accent-primary border-accent-solid'
                    : 'text-text-tertiary border-transparent hover:text-text-secondary'
                }`}
              >
                Clase {event.sessionNumber}
              </button>
            ))}
          </div>

          {/* Subtitle */}
          {activeEvent && (
            <div className="flex flex-col gap-0.5">
              <span className="text-text-primary text-base font-semibold leading-5">
                Materiales: Clase {activeEvent.sessionNumber}
              </span>
              <span className="text-text-tertiary text-sm font-normal leading-4">
                {activeEvent.topic}
              </span>
            </div>
          )}

          {/* Materials list (scrollable) */}
          <div className="h-64 overflow-y-auto flex flex-col gap-2 pr-1 scrollbar-thin scrollbar-thumb-stroke-secondary scrollbar-track-transparent">
            {isLoadingMaterials ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-accent-solid border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeMaterials.length === 0 ? (
              <div className="self-stretch px-5 py-10 bg-bg-secondary rounded-lg inline-flex flex-col justify-center items-center gap-2">
                <span className="self-stretch text-center text-text-disabled text-xs font-normal leading-4">No hay materiales disponibles para esta clase</span>
              </div>
            ) : (
              activeMaterials.map((material) => (
                <MaterialRow key={material.id} material={material} />
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stroke-secondary flex justify-end items-center gap-4">
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1.5 text-sm font-medium leading-4 text-text-tertiary hover:bg-bg-secondary transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll || activeMaterials.length === 0}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex justify-center items-center gap-1.5 text-sm font-medium leading-4 text-text-white hover:bg-bg-accent-solid-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingAll ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="download" size={16} className="text-icon-white" />
            )}
            Descargar Todo
          </button>
        </div>
      </div>
    </div>
  );
}

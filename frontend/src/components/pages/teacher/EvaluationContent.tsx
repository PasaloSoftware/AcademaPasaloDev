'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useToast } from '@/components/ui/ToastContainer';
import { coursesService } from '@/services/courses.service';
import { materialsService } from '@/services/materials.service';
import { getAccessToken } from '@/lib/storage';
import Icon from '@/components/ui/Icon';
import FloatingSelect from '@/components/ui/FloatingSelect';
import { EvaluationPageContent } from '@/components/pages/student/EvaluationShared';
import type { MaterialFolder } from '@/types/material';

interface EvaluationContentProps {
  cursoId: string;
  evalId: string;
}

// ============================================
// Upload helpers
// ============================================

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isAllowedFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_EXTENSIONS.includes(ext) && file.size <= MAX_FILE_SIZE;
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? '' : fileName.substring(dotIndex);
}

function getFileNameWithoutExt(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? fileName : fileName.substring(0, dotIndex);
}

function getTimeRemaining(entry: StagedFileEntry): string {
  if (entry.progress <= 0 || !entry.startTime) return '';
  const elapsed = (Date.now() - entry.startTime) / 1000;
  if (elapsed < 1) return '';
  const totalEstimate = elapsed / (entry.progress / 100);
  const remaining = Math.max(0, totalEstimate - elapsed);
  if (remaining < 60) return `Quedan ${Math.ceil(remaining)} segundos`;
  return `Quedan ${Math.ceil(remaining / 60)} minutos`;
}

function getFileIconPath(_mimeType: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return '/icons/files/pdf.svg';
  if (ext === 'doc' || ext === 'docx') return '/icons/files/doc.svg';
  if (ext === 'xls' || ext === 'xlsx') return '/icons/files/xls.svg';
  return '/icons/files/text.svg';
}

// ============================================
// Component
// ============================================

interface StagedFileEntry {
  id: string;
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  startTime: number;
  xhr: XMLHttpRequest | null;
}

export default function EvaluationContent({
  cursoId,
  evalId,
}: EvaluationContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [courseName, setCourseName] = useState<string>('');
  const [evalShortName, setEvalShortName] = useState<string>('');
  const [evalFullName, setEvalFullName] = useState<string>('');

  // Upload view state
  const [showUploadView, setShowUploadView] = useState(false);
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [stagedFiles, setStagedFiles] = useState<StagedFileEntry[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadCourseData() {
      try {
        const enrollments = await coursesService.getMyCourseCycles();
        const found = enrollments.find(
          (e) => e.courseCycle.id === cursoId,
        );
        if (found) {
          setCourseName(found.courseCycle.course.name);
        }
      } catch (err) {
        console.error('Error al cargar nombre del curso:', err);
      }
    }

    async function loadEvalNames() {
      try {
        const data = await coursesService.getCourseContent(cursoId);
        const eval_ = data.evaluations.find((e) => e.id === evalId);
        if (eval_) {
          setEvalShortName(eval_.shortName);
          setEvalFullName(eval_.fullName);
        }
      } catch (err) {
        console.error('Error al cargar datos de evaluación:', err);
      }
    }

    loadCourseData();
    loadEvalNames();
  }, [cursoId, evalId]);

  useEffect(() => {
    if (!courseName) return;
    setBreadcrumbItems([
      { label: 'Cursos' },
      { label: courseName, href: `/plataforma/curso/${cursoId}` },
      { label: 'Ciclo Vigente', href: `/plataforma/curso/${cursoId}` },
      { label: evalShortName },
    ]);
  }, [setBreadcrumbItems, courseName, evalShortName, cursoId]);

  const handleEvalNameDetected = useCallback((name: string) => {
    if (!evalShortName) {
      setEvalShortName(name);
    }
  }, [evalShortName]);

  const getClassPageUrl = useCallback(
    (eventId: string) =>
      `/plataforma/curso/${cursoId}/evaluacion/${evalId}/clase/${eventId}`,
    [cursoId, evalId],
  );

  // ---- Upload handlers ----

  const openUploadView = useCallback(async (preselectedFolderId?: string) => {
    try {
      // Load "Material Adicional" subfolders as categories
      const rootFolders = await materialsService.getRootFolders(evalId);
      const matAdicional = rootFolders.find((f) => f.name.toLowerCase().includes('adicional'));
      if (matAdicional) {
        const contents = await materialsService.getFolderContents(matAdicional.id);
        const subfolders = contents.folders.map((f) => ({ ...f, visibleFrom: f.visibleFrom }));
        setFolders(subfolders);
        setSelectedFolderId(preselectedFolderId || subfolders[0]?.id || null);
      } else {
        // Fallback: use root folders
        setFolders(rootFolders);
        setSelectedFolderId(preselectedFolderId || rootFolders[0]?.id || null);
      }
    } catch {
      setFolders([]);
    }
    setStagedFiles([]);
    setUploadError(null);
    setIsUploading(false);
    setShowUploadView(true);
  }, [evalId]);

  const addFiles = useCallback((fileList: FileList) => {
    setUploadError(null);
    const newEntries: StagedFileEntry[] = [];
    const errors: string[] = [];
    Array.from(fileList).forEach((file) => {
      if (!isAllowedFile(file)) {
        errors.push(file.size > MAX_FILE_SIZE ? `"${file.name}" excede 10 MB` : `"${file.name}" tipo no permitido`);
        return;
      }
      newEntries.push({ id: `${file.name}-${Date.now()}-${Math.random()}`, file, progress: 0, status: 'idle', startTime: 0, xhr: null });
    });
    if (errors.length) setUploadError(errors.join('. '));
    if (newEntries.length) setStagedFiles((prev) => [...prev, ...newEntries]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [addFiles]);

  const handleRemoveFile = useCallback((fileId: string) => {
    setStagedFiles((prev) => {
      const entry = prev.find((f) => f.id === fileId);
      if (entry?.xhr) entry.xhr.abort();
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  const uploadSingleFile = useCallback(
    (entry: StagedFileEntry, folderId: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', entry.file);
        formData.append('materialFolderId', folderId);
        formData.append('displayName', entry.file.name);

        const xhr = new XMLHttpRequest();
        setStagedFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: 'uploading' as const, startTime: Date.now(), xhr } : f));

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setStagedFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, progress: Math.round((e.loaded / e.total) * 100) } : f));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setStagedFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: 'uploaded' as const, progress: 100, xhr: null } : f));
            resolve();
          } else {
            setStagedFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: 'error' as const, xhr: null } : f));
            let msg = `Error al subir "${entry.file.name}"`;
            try {
              const body = JSON.parse(xhr.responseText);
              if (xhr.status === 409) msg = `"${entry.file.name}" ya existe en esta evaluación`;
              else if (body?.message) msg = body.message;
            } catch { /* keep default */ }
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => {
          setStagedFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: 'error' as const, xhr: null } : f));
          reject(new Error(`Error de red al subir "${entry.file.name}"`));
        };

        const token = getAccessToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        xhr.open('POST', `${apiUrl}/materials`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      }),
    [],
  );

  const handleStartUpload = useCallback(async () => {
    const pending = stagedFiles.filter((f) => f.status === 'idle' || f.status === 'error');
    if (!pending.length || !selectedFolderId) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      for (const entry of pending) {
        await uploadSingleFile(entry, selectedFolderId);
      }

      setTimeout(() => {
        setShowUploadView(false);
        setStagedFiles([]);
        setIsUploading(false);
        showToast({ type: 'success', title: 'Material subido con éxito', description: `El material ha sido subido en ${evalShortName}.` });
        // Force page reload to refresh folder contents
        router.refresh();
      }, 1200);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir materiales');
      setIsUploading(false);
    }
  }, [stagedFiles, selectedFolderId, uploadSingleFile, showToast, evalShortName, router]);

  const handleCancelUpload = useCallback(() => {
    stagedFiles.forEach((f) => f.xhr?.abort());
    setStagedFiles([]);
    setIsUploading(false);
    setUploadError(null);
    setShowUploadView(false);
  }, [stagedFiles]);

  // ---- Upload View ----
  if (showUploadView) {
    const hasPending = stagedFiles.some((f) => f.status === 'idle' || f.status === 'error');
    const canSubmit = hasPending && !isUploading && !!selectedFolderId;

    const folderOptions = folders.map((f) => ({ value: f.id, label: f.name }));

    return (
      <div className="w-full flex flex-col gap-8">
        {/* Back link */}
        <button
          onClick={handleCancelUpload}
          className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex items-center gap-2 self-start"
        >
          <Icon name="arrow_back" size={20} className="text-icon-accent-primary" />
          <span className="text-text-accent-primary text-base font-medium leading-4">
            Volver a {evalShortName}
          </span>
        </button>

        {/* Upload Card */}
        <div className="p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-end gap-4">
          <div className="self-stretch flex items-center gap-1">
            <Icon name="add_circle" size={20} className="text-icon-accent-primary" variant="rounded" />
            <span className="text-text-primary text-base font-semibold leading-5">Nuevo Material</span>
          </div>

          {/* Category selector */}
          <FloatingSelect
            label="Categoría"
            value={selectedFolderId}
            options={folderOptions}
            onChange={(val) => setSelectedFolderId(val)}
            allLabel="Seleccionar carpeta"
            className="self-stretch"
          />

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ backgroundImage: 'url(/images/upload-dropzone.png)', backgroundSize: 'contain', backgroundPosition: 'center' }}
            className={`self-stretch px-5 py-8 rounded-xl border-2 border-dashed flex flex-col justify-center items-center gap-3 overflow-hidden transition-colors ${
              isDragOver ? 'border-deep-blue-700 bg-bg-accent-light' : 'border-stroke-primary'
            }`}
          >
            <div className="w-12 h-12 bg-bg-info-primary-light rounded-full flex items-center justify-center">
              <Icon name="cloud_upload" size={24} className="text-icon-info-primary" variant="rounded" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-text-primary text-base font-semibold leading-5">Arrastra y suelta tus archivos aquí</span>
              <span className="text-text-quartiary text-xs font-normal leading-4">PDF, DOC, DOCX, XLS, XLSX (Máx. 10 MB)</span>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple onChange={handleSelectFile} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-bg-info-primary-light rounded-lg inline-flex items-center gap-1.5 hover:bg-bg-info-primary-light/80 transition-colors"
            >
              <Icon name="upload_file" size={16} className="text-icon-info-primary" variant="outlined" />
              <span className="text-text-info-primary text-sm font-medium leading-4">Seleccionar Archivos</span>
            </button>
          </div>

          {/* Error */}
          {uploadError && <span className="self-stretch text-text-error-primary text-sm">{uploadError}</span>}

          {/* Selected Files */}
          {stagedFiles.length > 0 && (
            <div className="self-stretch flex flex-col gap-2">
              <span className="text-text-quartiary text-sm font-semibold leading-4">Archivos seleccionados</span>
              {stagedFiles.map((entry) => {
                const ext = getFileExtension(entry.file.name);
                const nameOnly = getFileNameWithoutExt(entry.file.name);
                const iconPath = getFileIconPath(entry.file.type, entry.file.name);
                return (
                  <div key={entry.id} className="p-3 bg-bg-secondary rounded-lg flex flex-col gap-3">
                    <div className="flex items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={iconPath} alt={ext} className="w-8 h-8 flex-shrink-0" />
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <div className="flex items-start">
                          <span className="text-text-primary text-sm font-normal leading-4 truncate">{nameOnly}</span>
                          <span className="text-text-primary text-sm font-normal leading-4 flex-shrink-0">{ext}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-text-tertiary text-[10px] font-normal leading-3">{formatBytes(entry.file.size)}</span>
                          {entry.status === 'uploading' && (
                            <>
                              <div className="w-0.5 h-0.5 bg-gray-900 rounded-full" />
                              <span className="text-text-tertiary text-[10px] font-normal leading-3">{getTimeRemaining(entry)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.status === 'uploaded' && <Icon name="check_circle" size={16} className="text-icon-success-primary" variant="rounded" />}
                        {entry.status === 'error' && <Icon name="error" size={16} className="text-text-error-primary" variant="rounded" />}
                        {entry.status !== 'uploading' && (
                          <button onClick={() => handleRemoveFile(entry.id)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors">
                            <Icon name="close" size={16} className="text-icon-tertiary" />
                          </button>
                        )}
                      </div>
                    </div>
                    {entry.status === 'uploading' && (
                      <div className="w-full h-1 bg-bg-disabled rounded-full overflow-hidden">
                        <div className="h-full bg-deep-blue-700 rounded-full transition-all duration-300" style={{ width: `${entry.progress}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-4">
          <button onClick={handleCancelUpload} className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-1.5 hover:bg-bg-secondary transition-colors">
            <span className="text-text-tertiary text-sm font-medium leading-4">Cancelar</span>
          </button>
          <button
            onClick={handleStartUpload}
            disabled={!canSubmit}
            className={`px-6 py-3 rounded-lg flex items-center gap-1.5 ${canSubmit ? 'bg-bg-accent-primary-solid hover:opacity-90 transition-opacity' : 'bg-bg-disabled'}`}
          >
            <span className={`text-sm font-medium leading-4 ${canSubmit ? 'text-text-white' : 'text-text-disabled'}`}>
              {isUploading ? 'Subiendo...' : 'Subir Material'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ---- Normal View ----
  return (
    <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
      {/* Back Link */}
      <Link
        href={`/plataforma/curso/${cursoId}`}
        className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex justify-center items-center gap-2 mb-6"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          Volver al Ciclo Vigente
        </span>
      </Link>

      {/* Banner */}
      <div
        className="self-stretch px-10 py-8 relative rounded-xl inline-flex flex-col justify-center items-start gap-2 overflow-hidden mb-8"
        style={{
          background:
            'linear-gradient(to right, var(--muted-indigo-800), var(--muted-indigo-700), var(--muted-indigo-200))',
        }}
      >
        <div className="w-40 h-40 absolute right-[-36px] top-[-12px] overflow-hidden">
          <Icon name="school" size={160} className="text-muted-indigo-700" />
        </div>
        <div className="self-stretch flex flex-col justify-center items-start gap-0.5">
          <span className="self-stretch text-text-white text-3xl font-semibold leading-10">
            {evalShortName}
          </span>
          {evalFullName && (
            <span className="self-stretch text-text-white text-sm font-normal leading-4">
              {evalFullName.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Tabs + Content (shared) */}
      <EvaluationPageContent
        evalId={evalId}
        getClassPageUrl={getClassPageUrl}
        onEvalNameDetected={handleEvalNameDetected}
        canUploadMaterials
        onUploadMaterial={openUploadView}
      />
    </div>
  );
}

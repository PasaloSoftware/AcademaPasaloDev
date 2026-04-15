'use client';

import { useState, useCallback, useRef } from 'react';
import Icon from '@/components/ui/Icon';
import FloatingSelect from '@/components/ui/FloatingSelect';
import FloatingInput from '@/components/ui/FloatingInput';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastContainer';
import { getAccessToken } from '@/lib/storage';

// ============================================
// Helpers
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

function getFileIconPath(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return '/icons/files/pdf.svg';
  if (ext === 'doc' || ext === 'docx') return '/icons/files/doc.svg';
  if (ext === 'xls' || ext === 'xlsx') return '/icons/files/xls.svg';
  if (ext === 'ppt' || ext === 'pptx') return '/icons/files/ppt.svg';
  if (ext === 'txt') return '/icons/files/txt.svg';
  return '/icons/files/text.svg';
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

// ============================================
// Types
// ============================================

interface StagedFileEntry {
  id: string;
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  startTime: number;
  xhr: XMLHttpRequest | null;
}

export interface MaterialUploadFolder {
  id: string;
  name: string;
}

export interface MaterialUploadViewProps {
  /** Carpetas disponibles como categorías */
  folders: MaterialUploadFolder[];
  /** Carpeta preseleccionada */
  defaultFolderId?: string;
  /** Texto del botón de volver, ej: "Volver a PC1" */
  backLabel: string;
  /** Texto para el toast de éxito, ej: "El material ha sido subido en PC1." */
  successDescription?: string;
  /** Callback al cancelar o completar */
  onClose: () => void;
  /** Callback tras subida exitosa (para refrescar datos) */
  onSuccess?: () => void;
}

// ============================================
// Component
// ============================================

export default function MaterialUploadView({
  folders,
  defaultFolderId,
  backLabel,
  successDescription,
  onClose,
  onSuccess,
}: MaterialUploadViewProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    defaultFolderId || folders[0]?.id || null,
  );
  const [stagedFiles, setStagedFiles] = useState<StagedFileEntry[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // ---- Handlers ----

  const addFiles = useCallback((fileList: FileList) => {
    setUploadError(null);
    const newEntries: StagedFileEntry[] = [];
    const errors: string[] = [];
    Array.from(fileList).forEach((file) => {
      if (!isAllowedFile(file)) {
        errors.push(
          file.size > MAX_FILE_SIZE
            ? `"${file.name}" excede 10 MB`
            : `"${file.name}" tipo no permitido`,
        );
        return;
      }
      newEntries.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: 'idle',
        startTime: 0,
        xhr: null,
      });
    });
    if (errors.length) setUploadError(errors.join('. '));
    if (newEntries.length) setStagedFiles((prev) => [...prev, ...newEntries]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleSelectFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) addFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [addFiles],
  );

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
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'uploading' as const, startTime: Date.now(), xhr }
              : f,
          ),
        );

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setStagedFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id
                  ? { ...f, progress: Math.round((e.loaded / e.total) * 100) }
                  : f,
              ),
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setStagedFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id
                  ? { ...f, status: 'uploaded' as const, progress: 100, xhr: null }
                  : f,
              ),
            );
            resolve();
          } else {
            setStagedFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id ? { ...f, status: 'error' as const, xhr: null } : f,
              ),
            );
            let msg = `Error al subir "${entry.file.name}"`;
            try {
              const body = JSON.parse(xhr.responseText);
              if (xhr.status === 409) msg = `"${entry.file.name}" ya existe en esta evaluación`;
              else if (body?.message) msg = body.message;
            } catch {
              /* keep default */
            }
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => {
          setStagedFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id ? { ...f, status: 'error' as const, xhr: null } : f,
            ),
          );
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
        showToast({
          type: 'success',
          title: 'Material subido con éxito',
          description: successDescription || 'El material ha sido subido correctamente.',
        });
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir materiales');
      setIsUploading(false);
    }
  }, [stagedFiles, selectedFolderId, uploadSingleFile, showToast, successDescription, onSuccess, onClose]);

  const handleCancel = useCallback(() => {
    stagedFiles.forEach((f) => f.xhr?.abort());
    onClose();
  }, [stagedFiles, onClose]);

  // ---- Derived state ----

  const hasPending = stagedFiles.some((f) => f.status === 'idle' || f.status === 'error');
  const canSubmit = hasPending && !isUploading && !!selectedFolderId;
  const allUploaded = stagedFiles.length > 0 && stagedFiles.every((f) => f.status === 'uploaded');
  const folderOptions = folders.map((f) => ({ value: f.id, label: f.name }));

  // ---- Render ----

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Back link */}
      <button
        onClick={handleCancel}
        className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex items-center gap-2 self-start"
      >
        <Icon name="arrow_back" size={20} className="text-icon-accent-primary" />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          {backLabel}
        </span>
      </button>

      {/* Upload Card */}
      <div className="p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-end gap-4">
        <div className="self-stretch flex items-center gap-1">
          <Icon name="add_circle" size={20} className="text-icon-accent-primary" variant="rounded" />
          <span className="text-text-primary text-base font-semibold leading-5">Nuevo Material</span>
        </div>

        {/* Category selector */}
        {folders.length > 1 && (
          <FloatingSelect
            label="Categoría"
            value={selectedFolderId}
            options={folderOptions}
            onChange={(val) => setSelectedFolderId(val)}
            allLabel="Seleccionar carpeta"
            className="self-stretch"
          />
        )}

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            backgroundImage: 'url(/images/upload-dropzone.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
          }}
          className={`self-stretch px-5 py-8 rounded-xl border-2 border-dashed flex flex-col justify-center items-center gap-3 overflow-hidden transition-colors ${
            isDragOver ? 'border-deep-blue-700 bg-bg-accent-light' : 'border-stroke-primary'
          }`}
        >
          <div className="w-12 h-12 bg-bg-info-primary-light rounded-full flex items-center justify-center">
            <Icon name="cloud_upload" size={24} className="text-icon-info-primary" variant="rounded" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-text-primary text-base font-semibold leading-5">
              Arrastra y suelta tus archivos aquí
            </span>
            <span className="text-gray-600 text-xs font-normal leading-4">
              PDF, DOC, DOCX, XLS, XLSX (Máx. 10 MB)
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            multiple
            onChange={handleSelectFile}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-bg-info-primary-light rounded-lg inline-flex items-center gap-1.5 hover:bg-bg-info-primary-light/80 transition-colors"
          >
            <Icon name="file_upload" size={16} className="text-icon-info-primary" variant="outlined" />
            <span className="text-text-info-primary text-sm font-medium leading-4">
              Seleccionar Archivos
            </span>
          </button>
        </div>

        {/* Error */}
        {uploadError && (
          <span className="self-stretch text-text-error-primary text-sm">{uploadError}</span>
        )}

        {/* Selected Files */}
        {stagedFiles.length > 0 && (
          <div className="self-stretch flex flex-col gap-2">
            <span className="text-gray-600 text-sm font-semibold leading-4">
              Archivos seleccionados
            </span>
            {stagedFiles.map((entry) => {
              const ext = getFileExtension(entry.file.name);
              const nameOnly = getFileNameWithoutExt(entry.file.name);
              const iconPath = getFileIconPath(entry.file.name);
              return (
                <div key={entry.id} className="p-3 bg-bg-secondary rounded-lg flex flex-col gap-3">
                  <div className="flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={iconPath} alt={ext} className="w-8 h-8 flex-shrink-0" />
                    <button
                      type="button"
                      onClick={() => {
                        setRenameTarget({ id: entry.id, name: entry.file.name });
                        setRenameValue(getFileNameWithoutExt(entry.file.name));
                      }}
                      className="flex-1 flex flex-col gap-1 min-w-0 text-left hover:opacity-70 transition-opacity cursor-pointer"
                    >
                      <div className="flex items-start">
                        <span className="text-text-primary text-sm font-normal leading-4 truncate">
                          {nameOnly}
                        </span>
                        <span className="text-text-primary text-sm font-normal leading-4 flex-shrink-0">
                          {ext}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-tertiary text-[10px] font-normal leading-3">
                          {formatBytes(entry.file.size)}
                        </span>
                        {entry.status === 'uploading' && (
                          <>
                            <div className="w-0.5 h-0.5 bg-gray-900 rounded-full" />
                            <span className="text-text-tertiary text-[10px] font-normal leading-3">
                              {getTimeRemaining(entry)}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {entry.status === 'uploaded' && (
                        <Icon
                          name="check_circle"
                          size={16}
                          className="text-icon-success-primary"
                          variant="rounded"
                        />
                      )}
                      {entry.status === 'error' && (
                        <Icon
                          name="error"
                          size={16}
                          className="text-text-error-primary"
                          variant="rounded"
                        />
                      )}
                      {entry.status !== 'uploading' && (
                        <>
                          <button
                            onClick={() => {
                              const url = URL.createObjectURL(entry.file);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = entry.file.name;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors"
                            title="Descargar"
                          >
                            <Icon name="download" size={20} className="text-icon-tertiary" />
                          </button>
                          <button
                            onClick={() => handleRemoveFile(entry.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors"
                            title="Eliminar"
                          >
                            <Icon name="close" size={16} className="text-icon-tertiary" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {entry.status === 'uploading' && (
                    <div className="w-full h-1 bg-bg-disabled rounded-full overflow-hidden">
                      <div
                        className="h-full bg-deep-blue-700 rounded-full transition-all duration-300"
                        style={{ width: `${entry.progress}%` }}
                      />
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
        <button
          onClick={handleCancel}
          className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-1.5 hover:bg-bg-secondary transition-colors"
        >
          <span className="text-text-tertiary text-sm font-medium leading-4">Cancelar</span>
        </button>
        <button
          onClick={handleStartUpload}
          disabled={!canSubmit}
          className={`px-6 py-3 rounded-lg flex items-center gap-1.5 ${
            canSubmit
              ? 'bg-bg-accent-primary-solid hover:opacity-90 transition-opacity'
              : 'bg-bg-disabled'
          }`}
        >
          <span
            className={`text-sm font-medium leading-4 ${
              canSubmit ? 'text-text-white' : 'text-text-disabled'
            }`}
          >
            {isUploading ? 'Subiendo...' : allUploaded ? 'Listo' : 'Subir Material'}
          </span>
        </button>
      </div>

      {/* Rename Modal */}
      <Modal
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Renombrar archivo"
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => setRenameTarget(null)}>
              Cancelar
            </Modal.Button>
            <Modal.Button
              disabled={!renameValue.trim()}
              onClick={() => {
                if (!renameTarget || !renameValue.trim()) return;
                const ext = getFileExtension(renameTarget.name);
                const newName = renameValue.trim() + ext;
                setStagedFiles((prev) =>
                  prev.map((f) => {
                    if (f.id !== renameTarget.id) return f;
                    const renamed = new File([f.file], newName, { type: f.file.type });
                    return { ...f, file: renamed };
                  }),
                );
                setRenameTarget(null);
              }}
            >
              Guardar
            </Modal.Button>
          </>
        }
      >
        <FloatingInput
          id="rename-file"
          label="Nombre del archivo"
          value={renameValue}
          onChange={setRenameValue}
        />
      </Modal>
    </div>
  );
}

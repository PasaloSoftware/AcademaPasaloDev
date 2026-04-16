'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { coursesService } from '@/services/courses.service';
import { materialsService } from '@/services/materials.service';
import type { FolderMaterial } from '@/types/material';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import FloatingInput from '@/components/ui/FloatingInput';
import { useToast } from '@/components/ui/ToastContainer';
import ExpandableFolderList from '@/components/shared/ExpandableFolderList';
import MaterialPreviewModal from '@/components/materials/MaterialPreviewModal';
import MaterialUploadView from '@/components/shared/MaterialUploadView';
import type { MaterialUploadFolder } from '@/components/shared/MaterialUploadView';
import type {
  ExpandableFolder,
  FolderIconConfig,
  MaterialAction,
} from '@/components/shared/ExpandableFolderList';

const typeIconConfigs: Record<string, FolderIconConfig> = {
  PD: {
    name: 'folder',
    variant: 'rounded',
    bgClosed: 'bg-bg-info-primary-light',
    colorClosed: 'text-icon-info-primary',
    bgOpen: 'bg-bg-info-primary-solid',
    colorOpen: 'text-icon-white',
  },
  PC: {
    name: 'folder',
    variant: 'rounded',
    bgClosed: 'bg-bg-info-secondary-light',
    colorClosed: 'text-icon-info-secondary',
    bgOpen: 'bg-info-secondary-solid',
    colorOpen: 'text-icon-white',
  },
  EX: {
    name: 'folder',
    variant: 'rounded',
    bgClosed: 'bg-bg-success-light',
    colorClosed: 'text-icon-success-primary',
    bgOpen: 'bg-bg-success-solid',
    colorOpen: 'text-icon-white',
  },
};

const defaultTypeIconConfig: FolderIconConfig = {
  name: 'folder',
  variant: 'rounded',
  bgClosed: 'bg-bg-quartiary',
  colorClosed: 'text-icon-secondary',
  bgOpen: 'bg-gray-700',
  colorOpen: 'text-icon-white',
};

interface BancoEnunciadosContentProps {
  cursoId: string;
  typeCode: string;
  previewData?: {
    courseName: string;
    backHref?: string;
    manageBreadcrumb?: boolean;
  };
}

export default function BancoEnunciadosContent({
  cursoId,
  typeCode,
  previewData,
}: BancoEnunciadosContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [courseName, setCourseName] = useState('');
  const [typeName, setTypeName] = useState('');
  const [folders, setFolders] = useState<ExpandableFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMaterials, setPreviewMaterials] = useState<FolderMaterial[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [folderIdMap, setFolderIdMap] = useState<Record<string, string>>({});

  // Upload state
  const [showUploadView, setShowUploadView] = useState(false);
  const [uploadFolders, setUploadFolders] = useState<MaterialUploadFolder[]>([]);
  const [preselectedFolderId, setPreselectedFolderId] = useState<string | undefined>();

  useEffect(() => {
    if (previewData) {
      setCourseName(previewData.courseName);
      return;
    }

    async function loadCourseName() {
      try {
        const enrollments = await coursesService.getMyCourseCycles();
        const found = enrollments.find((e) => e.courseCycle.id === cursoId);
        if (found) setCourseName(found.courseCycle.course.name);
      } catch (err) {
        console.error('Error al cargar nombre del curso:', err);
      }
    }

    if (cursoId) loadCourseName();
  }, [cursoId, previewData]);

  useEffect(() => {
    async function loadBancoData() {
      setLoading(true);
      setError(null);
      try {
        const bankStructure = await coursesService.getBankStructure(cursoId);
        const typeItem = bankStructure.items.find(
          (item) => item.evaluationTypeCode === typeCode,
        );

        setTypeName(typeItem?.evaluationTypeName || '');
        const entries = typeItem?.entries || [];

        if (entries.length === 0) {
          setFolders([]);
          setFolderIdMap({});
          setLoading(false);
          return;
        }

        const folderResults = await Promise.all(
          entries.map(async (entry) => {
            const fallbackId = `${entry.evaluationTypeCode}-${entry.evaluationNumber}`;
            const uiFolderId = entry.folderId || `missing-${fallbackId}`;
            try {
              if (!entry.folderId) {
                return {
                  uiFolderId,
                  label: entry.label,
                  backendFolderId: null,
                  materialCount: 0,
                };
              }
              const contents = await materialsService.getFolderContents(
                entry.folderId,
              );
              return {
                uiFolderId,
                label: entry.label,
                backendFolderId: entry.folderId,
                materialCount: contents.materials.length,
              };
            } catch {
              return {
                uiFolderId,
                label: entry.label,
                backendFolderId: entry.folderId,
                materialCount: 0,
              };
            }
          }),
        );

        const expandableFolders: ExpandableFolder[] = [];
        const map: Record<string, string> = {};

        for (const result of folderResults) {
          expandableFolders.push({
            id: result.uiFolderId,
            name: result.label,
            materialCount: result.materialCount,
          });
          if (result.backendFolderId) map[result.uiFolderId] = result.backendFolderId;
        }

        setFolders(expandableFolders);
        setFolderIdMap(map);
      } catch (err) {
        console.error('Error al cargar banco de enunciados:', err);
        setError('Error al cargar el banco de enunciados');
      } finally {
        setLoading(false);
      }
    }

    if (cursoId && typeCode) loadBancoData();
  }, [cursoId, typeCode]);

  useEffect(() => {
    if (!courseName) return;
    if (previewData?.manageBreadcrumb === false) return;

    const backHref = previewData?.backHref || `/plataforma/curso/${cursoId}`;
    setBreadcrumbItems([
      { label: 'Cursos' },
      { label: courseName, href: backHref },
      { label: 'Banco de Enunciados', href: backHref },
      { label: typeName || typeCode },
    ]);
  }, [setBreadcrumbItems, courseName, typeName, typeCode, cursoId, previewData]);

  const loadFolderMaterials = useCallback(
    async (uiFolderId: string): Promise<FolderMaterial[]> => {
      const backendFolderId = folderIdMap[uiFolderId];
      if (!backendFolderId) return [];
      const contents = await materialsService.getFolderContents(backendFolderId);
      return contents.materials;
    },
    [folderIdMap],
  );

  const handleDownloadMaterial = useCallback(async (mat: FolderMaterial) => {
    try {
      const data = await materialsService.getAuthorizedLink(mat.id, 'download');
      const a = document.createElement('a');
      a.href = data.url;
      a.download = mat.displayName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      await materialsService.downloadMaterial(mat.id, mat.displayName);
    }
  }, []);

  const openUploadView = useCallback((backendFolderId?: string) => {
    // Build upload folder list from the folderIdMap (banco folders with backend IDs)
    const available: MaterialUploadFolder[] = folders
      .filter((f) => folderIdMap[f.id])
      .map((f) => ({ id: folderIdMap[f.id], name: f.name }));
    setUploadFolders(available);
    setPreselectedFolderId(backendFolderId);
    setShowUploadView(true);
  }, [folders, folderIdMap]);

  const handleUploadToFolder = useCallback((uiFolderId: string) => {
    const backendId = folderIdMap[uiFolderId];
    if (backendId) openUploadView(backendId);
  }, [folderIdMap, openUploadView]);

  // ---- Material menu actions ----
  const [infoMat, setInfoMat] = useState<FolderMaterial | null>(null);
  const [renameMat, setRenameMat] = useState<FolderMaterial | null>(null);
  const [renameMatValue, setRenameMatValue] = useState('');
  const [renameMatLoading, setRenameMatLoading] = useState(false);
  const [deleteMat, setDeleteMat] = useState<FolderMaterial | null>(null);
  const [deleteMatLoading, setDeleteMatLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMaterialAction = useCallback((material: FolderMaterial, action: MaterialAction) => {
    if (action === 'rename') {
      setRenameMat(material);
      const dotIdx = material.displayName.lastIndexOf('.');
      setRenameMatValue(dotIdx > 0 ? material.displayName.substring(0, dotIdx) : material.displayName);
    }
    if (action === 'download') {
      handleDownloadMaterial(material);
    }
    if (action === 'info') {
      setInfoMat(material);
    }
    if (action === 'delete') {
      setDeleteMat(material);
    }
  }, [handleDownloadMaterial]);

  const handleRenameMatSubmit = useCallback(async () => {
    if (!renameMat || !renameMatValue.trim()) return;
    setRenameMatLoading(true);
    try {
      const ext = renameMat.displayName.lastIndexOf('.') > 0
        ? renameMat.displayName.substring(renameMat.displayName.lastIndexOf('.'))
        : '';
      await materialsService.renameDisplayName(renameMat.id, renameMatValue.trim() + ext);
      setRenameMat(null);
      setRefreshKey((k) => k + 1);
      router.refresh();
      showToast({ type: 'success', title: 'Nombre actualizado', description: 'El material ha sido renombrado.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo renombrar.' });
    } finally {
      setRenameMatLoading(false);
    }
  }, [renameMat, renameMatValue, showToast, router]);

  const handleDeleteMatSubmit = useCallback(async () => {
    if (!deleteMat) return;
    setDeleteMatLoading(true);
    try {
      await materialsService.requestDeletion(deleteMat.id, 'Eliminado por docente');
      setDeleteMat(null);
      setRefreshKey((k) => k + 1);
      router.refresh();
      showToast({ type: 'success', title: 'Solicitud enviada', description: 'El material se ocultará hasta aprobación.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo eliminar.' });
    } finally {
      setDeleteMatLoading(false);
    }
  }, [deleteMat, showToast, router]);

  const iconConfig = typeIconConfigs[typeCode] || defaultTypeIconConfig;
  const displayTitle =
    typeName ||
    {
      PD: 'Prácticas Dirigidas',
      PC: 'Prácticas Calificadas',
      EX: 'Exámenes',
    }[typeCode] ||
    typeCode;

  if (loading) {
    return (
      <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
        <div className="self-stretch animate-pulse">
          <div className="h-5 w-48 bg-bg-secondary rounded mb-6" />
          <div className="h-10 w-64 bg-bg-secondary rounded mb-8" />
          <div className="flex flex-col gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-bg-secondary rounded-lg border border-stroke-primary"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-stroke-primary p-12 text-center">
        <Icon
          name="error"
          size={64}
          className="text-error-solid mb-4 mx-auto"
        />
        <h1 className="text-2xl font-bold text-primary mb-2">{error}</h1>
        <p className="text-secondary mb-6">
          No se pudo cargar el banco de enunciados.
        </p>
      </div>
    );
  }

  if (showUploadView) {
    return (
      <MaterialUploadView
        folders={uploadFolders}
        defaultFolderId={preselectedFolderId}
        backLabel={`Volver a ${displayTitle}`}
        successDescription={`El material ha sido subido en ${displayTitle}.`}
        onClose={() => setShowUploadView(false)}
        onSuccess={() => router.refresh()}
      />
    );
  }

  return (
    <div className="w-full inline-flex flex-col justify-start items-start gap-8">
      <Link
        href={previewData?.backHref || `/plataforma/curso/${cursoId}`}
        className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex justify-center items-center gap-2"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          Volver al Banco de Enunciados
        </span>
      </Link>

      {folders.length > 0 ? (
        <ExpandableFolderList
          title={displayTitle}
          folders={folders}
          loadFolderMaterials={loadFolderMaterials}
          onDownloadMaterial={handleDownloadMaterial}
          onPreviewMaterial={(mats, idx) => { setPreviewMaterials(mats); setPreviewIndex(idx); }}
          iconConfig={iconConfig}
          headerAction={
            <button
              onClick={() => openUploadView()}
              className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors"
            >
              <Icon name="cloud_upload" size={16} className="text-icon-white" variant="rounded" />
              <span className="text-text-white text-sm font-medium leading-4">Subir Material</span>
            </button>
          }
          onUploadToFolder={handleUploadToFolder}
          onMaterialAction={handleMaterialAction}
        />
      ) : (
        <>
          <div className="self-stretch inline-flex justify-start items-center">
            <span className="flex-1 text-text-primary text-3xl font-semibold leading-10">
              {displayTitle}
            </span>
          </div>
          <div className="self-stretch p-12 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col items-center justify-center gap-4">
            <Icon
              name="folder_open"
              size={64}
              className="text-icon-tertiary"
              variant="rounded"
            />
            <div className="text-center">
              <p className="text-text-primary font-semibold mb-2">
                No hay enunciados disponibles
              </p>
              <p className="text-text-secondary text-sm">
                Los enunciados aparecerán aquí cuando sean subidos
              </p>
            </div>
          </div>
        </>
      )}

      {previewMaterials && (
        <MaterialPreviewModal
          materials={previewMaterials}
          initialIndex={previewIndex}
          onClose={() => setPreviewMaterials(null)}
        />
      )}

      {/* Rename Material Modal */}
      <Modal
        isOpen={!!renameMat}
        onClose={() => setRenameMat(null)}
        title="Cambiar nombre"
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => setRenameMat(null)}>Cancelar</Modal.Button>
            <Modal.Button disabled={!renameMatValue.trim()} loading={renameMatLoading} loadingText="Guardando..." onClick={handleRenameMatSubmit}>Guardar</Modal.Button>
          </>
        }
      >
        <FloatingInput id="rename-banco-material" label="Nombre" value={renameMatValue} onChange={setRenameMatValue} />
      </Modal>

      {/* Delete Material Modal */}
      <Modal
        isOpen={!!deleteMat}
        onClose={() => setDeleteMat(null)}
        title="¿Eliminar este material?"
        size="sm"
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => setDeleteMat(null)}>Cancelar</Modal.Button>
            <Modal.Button variant="danger" loading={deleteMatLoading} loadingText="Eliminando..." onClick={handleDeleteMatSubmit}>Eliminar</Modal.Button>
          </>
        }
      >
        <p className="text-text-tertiary text-base font-normal leading-5">
          La solicitud de eliminación será enviada a los administradores y el material se ocultará hasta que sea aprobada.
        </p>
      </Modal>

      {/* Material Info Modal */}
      {infoMat && (
        <Modal
          isOpen
          onClose={() => setInfoMat(null)}
          title="Información del material"
          size="sm"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-text-secondary text-xs font-medium leading-4">Nombre</span>
              <span className="text-text-tertiary text-base font-normal leading-4">
                {infoMat.displayName.lastIndexOf('.') > 0
                  ? infoMat.displayName.substring(0, infoMat.displayName.lastIndexOf('.'))
                  : infoMat.displayName}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-text-secondary text-xs font-medium leading-4">Tipo</span>
              <span className="text-text-tertiary text-base font-normal leading-4">
                {(infoMat.displayName.split('.').pop() || 'Desconocido').toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-text-secondary text-xs font-medium leading-4">Subido</span>
              <span className="text-text-tertiary text-base font-normal leading-4">
                {new Date(infoMat.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' })}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

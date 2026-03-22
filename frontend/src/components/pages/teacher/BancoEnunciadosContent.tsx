'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { coursesService } from '@/services/courses.service';
import { materialsService } from '@/services/materials.service';
import type { FolderMaterial } from '@/types/material';
import Icon from '@/components/ui/Icon';
import ExpandableFolderList from '@/components/shared/ExpandableFolderList';
import MaterialPreviewModal from '@/components/materials/MaterialPreviewModal';
import type {
  ExpandableFolder,
  FolderIconConfig,
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
}

export default function BancoEnunciadosContent({
  cursoId,
  typeCode,
}: BancoEnunciadosContentProps) {
  const { setBreadcrumbItems } = useBreadcrumb();

  const [courseName, setCourseName] = useState('');
  const [typeName, setTypeName] = useState('');
  const [folders, setFolders] = useState<ExpandableFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMaterials, setPreviewMaterials] = useState<FolderMaterial[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [folderIdMap, setFolderIdMap] = useState<Record<string, string>>({});

  useEffect(() => {
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
  }, [cursoId]);

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
    setBreadcrumbItems([
      { label: 'Cursos' },
      { label: courseName, href: `/plataforma/curso/${cursoId}` },
      { label: 'Banco de Enunciados', href: `/plataforma/curso/${cursoId}` },
      { label: typeName || typeCode },
    ]);
  }, [setBreadcrumbItems, courseName, typeName, typeCode, cursoId]);

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

  return (
    <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden gap-8">
      <Link
        href={`/plataforma/curso/${cursoId}`}
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
    </div>
  );
}

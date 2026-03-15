"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { coursesService } from "@/services/courses.service";
import { materialsService } from "@/services/materials.service";
import { enrollmentService } from "@/services/enrollment.service";
import type { Enrollment } from "@/types/enrollment";
import type { CycleEvaluation } from "@/types/curso";
import type { FolderMaterial } from "@/types/material";
import Icon from "@/components/ui/Icon";
import ExpandableFolderList from "@/components/shared/ExpandableFolderList";
import MaterialPreviewModal from "@/components/materials/MaterialPreviewModal";
import type {
  ExpandableFolder,
  FolderIconConfig,
} from "@/components/shared/ExpandableFolderList";

// ============================================
// Icon config per evaluation type code
// ============================================

const typeIconConfigs: Record<string, FolderIconConfig> = {
  PD: {
    name: "folder",
    variant: "rounded",
    bgClosed: "bg-bg-info-primary-light",
    colorClosed: "text-icon-info-primary",
    bgOpen: "bg-bg-info-primary-solid",
    colorOpen: "text-icon-white",
  },
  PC: {
    name: "folder",
    variant: "rounded",
    bgClosed: "bg-bg-info-secondary-light",
    colorClosed: "text-icon-info-secondary",
    bgOpen: "bg-bg-info-secondary-solid",
    colorOpen: "text-icon-white",
  },
  EX: {
    name: "folder",
    variant: "rounded",
    bgClosed: "bg-bg-success-light",
    colorClosed: "text-icon-success-primary",
    bgOpen: "bg-bg-success-solid",
    colorOpen: "text-icon-white",
  },
};

const defaultTypeIconConfig: FolderIconConfig = {
  name: "folder",
  variant: "rounded",
  bgClosed: "bg-bg-quartiary",
  colorClosed: "text-icon-secondary",
  bgOpen: "bg-gray-700",
  colorOpen: "text-icon-white",
};

// ============================================
// Props
// ============================================

interface BancoEnunciadosContentProps {
  cursoId: string;
  typeCode: string;
}

// ============================================
// Component
// ============================================

export default function BancoEnunciadosContent({
  cursoId,
  typeCode,
}: BancoEnunciadosContentProps) {
  const { setBreadcrumbItems } = useBreadcrumb();

  const [courseName, setCourseName] = useState("");
  const [typeName, setTypeName] = useState("");
  const [folders, setFolders] = useState<ExpandableFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMaterials, setPreviewMaterials] = useState<FolderMaterial[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Mapping: folder id (evaluation id) → enunciados folder id (for loading materials)
  const [enunciadosFolderMap, setEnunciadosFolderMap] = useState<
    Record<string, string>
  >({});

  // Load course name
  useEffect(() => {
    async function loadCourseName() {
      try {
        const response = await enrollmentService.getMyCourses();
        const enrollments = Array.isArray(response)
          ? response
          : response.data || [];
        const found = enrollments.find(
          (e: Enrollment) => e.courseCycle.id === cursoId,
        );
        if (found) {
          setCourseName(found.courseCycle.course.name);
        }
      } catch (err) {
        console.error("Error al cargar nombre del curso:", err);
      }
    }

    if (cursoId) loadCourseName();
  }, [cursoId]);

  // Load evaluations of the selected type + resolve their enunciados folders
  useEffect(() => {
    async function loadBancoData() {
      setLoading(true);
      setError(null);
      try {
        // Get bank structure for the type name
        const bankStructure = await coursesService.getBankStructure(cursoId);
        const typeItem = bankStructure.items.find(
          (item) => item.evaluationTypeCode === typeCode,
        );
        if (typeItem) {
          setTypeName(typeItem.evaluationTypeName);
        }

        // Get evaluations from current cycle, filter by typeCode
        const cycleData = await coursesService.getCurrentCycleContent(cursoId);
        const typeEvaluations = cycleData.evaluations.filter(
          (e: CycleEvaluation) => e.evaluationTypeCode === typeCode,
        );

        if (typeEvaluations.length === 0) {
          setFolders([]);
          setLoading(false);
          return;
        }

        // For each evaluation, resolve its "Enunciados" folder
        const folderResults = await Promise.all(
          typeEvaluations.map(async (evaluation) => {
            try {
              const rootFolders = await materialsService.getRootFolders(
                evaluation.id,
              );
              const matAdicional = rootFolders.find((f) =>
                f.name.toLowerCase().includes("adicional"),
              );
              if (!matAdicional) {
                return {
                  evalId: evaluation.id,
                  shortName: evaluation.shortName,
                  enunciadosFolderId: null,
                  materialCount: 0,
                };
              }

              const contents = await materialsService.getFolderContents(
                matAdicional.id,
              );
              const enunciadosFolder = contents.folders.find((f) =>
                f.name.toLowerCase().includes("enunciados"),
              );
              if (!enunciadosFolder) {
                return {
                  evalId: evaluation.id,
                  shortName: evaluation.shortName,
                  enunciadosFolderId: null,
                  materialCount: 0,
                };
              }

              return {
                evalId: evaluation.id,
                shortName: evaluation.shortName,
                enunciadosFolderId: enunciadosFolder.id,
                materialCount:
                  contents.subfolderMaterialCount?.[enunciadosFolder.id] ?? 0,
              };
            } catch {
              return {
                evalId: evaluation.id,
                shortName: evaluation.shortName,
                enunciadosFolderId: null,
                materialCount: 0,
              };
            }
          }),
        );

        // Build folder list and folder mapping
        const expandableFolders: ExpandableFolder[] = [];
        const folderMap: Record<string, string> = {};

        for (const result of folderResults) {
          if (result.enunciadosFolderId) {
            expandableFolders.push({
              id: result.evalId,
              name: result.shortName,
              materialCount: result.materialCount,
            });
            folderMap[result.evalId] = result.enunciadosFolderId;
          }
        }

        setFolders(expandableFolders);
        setEnunciadosFolderMap(folderMap);
      } catch (err) {
        console.error("Error al cargar banco de enunciados:", err);
        setError("Error al cargar el banco de enunciados");
      } finally {
        setLoading(false);
      }
    }

    if (cursoId && typeCode) loadBancoData();
  }, [cursoId, typeCode]);

  // Breadcrumb
  useEffect(() => {
    if (!courseName) return;
    setBreadcrumbItems([
      { label: "Cursos" },
      { label: courseName, href: `/plataforma/curso/${cursoId}` },
      { label: "Banco de Enunciados", href: `/plataforma/curso/${cursoId}` },
      { label: typeName || typeCode },
    ]);
  }, [setBreadcrumbItems, courseName, typeName, typeCode, cursoId]);

  // Load materials for a folder (uses the enunciados folder id mapping)
  const loadFolderMaterials = useCallback(
    async (evalId: string): Promise<FolderMaterial[]> => {
      const enunciadosFolderId = enunciadosFolderMap[evalId];
      if (!enunciadosFolderId) return [];
      const contents =
        await materialsService.getFolderContents(enunciadosFolderId);
      return contents.materials;
    },
    [enunciadosFolderMap],
  );

  // Download handler
  const handleDownloadMaterial = useCallback(async (mat: FolderMaterial) => {
    try {
      const data = await materialsService.getAuthorizedLink(mat.id, "download");
      const a = document.createElement("a");
      a.href = data.url;
      a.download = mat.displayName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
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
      PD: "Prácticas Dirigidas",
      PC: "Prácticas Calificadas",
      EX: "Exámenes",
    }[typeCode] ||
    typeCode;

  // ============================================
  // Loading state
  // ============================================

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

  // ============================================
  // Error state
  // ============================================

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
      {/* Back Link */}
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
      {/* Folder list with title + expand/collapse */}
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

      {/* Material Preview Modal */}
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

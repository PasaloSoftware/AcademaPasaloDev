"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import {
  CourseDeleteConfirmModal,
  CourseEditorFooter,
  CourseEditorHeader,
  CourseEditorTabs,
  CourseEmptyStatePanel,
  CourseMaterialFolderModal,
  CourseEvaluationList,
  CourseGeneralInfoSection,
  CourseInfoBanner,
  CourseProfessorManagerModal,
  CourseResourceCard,
  CourseSectionCard,
  CourseSelectQuantityModal,
  CourseEditorTab,
  ProfessorModalOption,
  getEvaluationTypeMeta,
  normalizeCourseTypeName,
} from "@/components/pages/admin/CourseEditorShared";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/components/ui/ToastContainer";
import { usersService } from "@/services/users.service";
import type { AdminCourseCycleProfessor } from "@/services/courses.service";
import { coursesService } from "@/services/courses.service";
import { evaluationsService } from "@/services/evaluations.service";
import type { CourseType, EvaluationType } from "@/types/api";

const EVALUATION_NAME_META: Record<
  string,
  { singular: string; plural: string; short: string }
> = {
  PC: {
    singular: "Práctica Calificada",
    plural: "Prácticas Calificadas",
    short: "PC",
  },
  EX: {
    singular: "Examen",
    plural: "Exámenes",
    short: "EX",
  },
  LAB: {
    singular: "Laboratorio",
    plural: "Laboratorios",
    short: "LAB",
  },
  TUTORING: {
    singular: "Tutoría",
    plural: "Tutorías",
    short: "TUT",
  },
};

type EvaluationDraft = {
  id: string;
  evaluationTypeId: string;
  evaluationTypeCode: string;
  evaluationTypeName: string;
  number: number;
  shortName: string;
  fullName: string;
};

type EvaluationModalMode = "create" | "edit";
type MaterialModalMode = "create" | "edit";

type BankAdditionalFolderType =
  | "PRACTICAS_DIRIGIDAS"
  | "LABORATORIOS_DIRIGIDOS"
  | "OTRO";

type AdditionalFolderDraft = {
  id: string;
  title: string;
  description: string;
};

type BankAdditionalFolderDraft = {
  id: string;
  type: BankAdditionalFolderType;
  title: string;
  evaluationCount: number;
};

type DeleteTarget =
  | {
      kind: "evaluation";
      id: string;
    }
  | {
      kind: "bank-group";
      evaluationTypeId: string;
      title: string;
    }
  | {
      kind: "bank-additional";
      id: string;
      title: string;
    }
  | {
      kind: "material";
      id: string;
      title: string;
    };

const DEFAULT_MATERIAL_FOLDERS: AdditionalFolderDraft[] = [
  {
    id: "material-default-enunciados",
    title: "Enunciados",
    description: "Recopilación de enunciados adicionales de una evaluación.",
  },
  {
    id: "material-default-resumenes",
    title: "Resúmenes",
    description: "Recopilación de resúmenes de temas de una evaluación.",
  },
];

const BANK_ADDITIONAL_FOLDER_META: Record<
  BankAdditionalFolderType,
  { label: string }
> = {
  PRACTICAS_DIRIGIDAS: {
    label: "Prácticas Dirigidas",
  },
  LABORATORIOS_DIRIGIDOS: {
    label: "Laboratorios Dirigidos",
  },
  OTRO: {
    label: "Otro",
  },
};

function getEvaluationTextMeta(type: Pick<EvaluationType, "code" | "name">) {
  return (
    EVALUATION_NAME_META[String(type.code || "").toUpperCase()] || {
      singular: type.name,
      plural: `${type.name}s`,
      short: String(type.code || type.name || "EV")
        .trim()
        .toUpperCase(),
    }
  );
}

function buildEvaluationDraft(
  type: Pick<EvaluationType, "id" | "code" | "name">,
  number: number,
): EvaluationDraft {
  const meta = getEvaluationTextMeta(type);
  return {
    id: `${type.id}-${number}-${crypto.randomUUID()}`,
    evaluationTypeId: type.id,
    evaluationTypeCode: type.code,
    evaluationTypeName: type.name,
    number,
    shortName: `${meta.short}${number}`,
    fullName: `${meta.singular} ${number}`,
  };
}

function normalizeDrafts(
  drafts: EvaluationDraft[],
  typesById: Map<string, EvaluationType>,
): EvaluationDraft[] {
  const counters = new Map<string, number>();

  return drafts.map((draft) => {
    const nextNumber = (counters.get(draft.evaluationTypeId) || 0) + 1;
    counters.set(draft.evaluationTypeId, nextNumber);

    const type =
      typesById.get(draft.evaluationTypeId) ||
      ({
        id: draft.evaluationTypeId,
        code: draft.evaluationTypeCode,
        name: draft.evaluationTypeName,
      } satisfies EvaluationType);

    const normalized = buildEvaluationDraft(type, nextNumber);
    return {
      ...draft,
      number: normalized.number,
      shortName: normalized.shortName,
      fullName: normalized.fullName,
      evaluationTypeCode: type.code,
      evaluationTypeName: type.name,
    };
  });
}

export default function CursoCreateContent() {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [evaluationTypes, setEvaluationTypes] = useState<EvaluationType[]>([]);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedProfessors, setSelectedProfessors] = useState<
    AdminCourseCycleProfessor[]
  >([]);
  const [activeTab, setActiveTab] = useState<CourseEditorTab>("structure");
  const [loading, setLoading] = useState(true);
  const [professorModalOpen, setProfessorModalOpen] = useState(false);
  const [availableProfessors, setAvailableProfessors] = useState<
    ProfessorModalOption[]
  >([]);
  const [professorOptionsLoading, setProfessorOptionsLoading] = useState(false);
  const [professorSearch, setProfessorSearch] = useState("");
  const [debouncedProfessorSearch, setDebouncedProfessorSearch] = useState("");
  const [professorActionLoadingId, setProfessorActionLoadingId] = useState<
    string | null
  >(null);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [evaluationModalMode, setEvaluationModalMode] =
    useState<EvaluationModalMode>("create");
  const [editingEvaluationTypeId, setEditingEvaluationTypeId] = useState<
    string | null
  >(null);
  const [evaluationTypeId, setEvaluationTypeId] = useState<string | null>(null);
  const [evaluationQuantity, setEvaluationQuantity] = useState("");
  const [evaluationQuantityError, setEvaluationQuantityError] = useState("");
  const [draftEvaluations, setDraftEvaluations] = useState<EvaluationDraft[]>(
    [],
  );
  const [bankAdditionalModalOpen, setBankAdditionalModalOpen] = useState(false);
  const [editingBankAdditionalFolderId, setEditingBankAdditionalFolderId] =
    useState<string | null>(null);
  const [bankAdditionalFolderType, setBankAdditionalFolderType] =
    useState<BankAdditionalFolderType | null>(null);
  const [bankAdditionalFolderQuantity, setBankAdditionalFolderQuantity] =
    useState("");
  const [
    bankAdditionalFolderQuantityError,
    setBankAdditionalFolderQuantityError,
  ] = useState("");
  const [bankAdditionalFolders, setBankAdditionalFolders] = useState<
    BankAdditionalFolderDraft[]
  >([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialModalMode, setMaterialModalMode] =
    useState<MaterialModalMode>("create");
  const [editingMaterialFolderId, setEditingMaterialFolderId] = useState<
    string | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [materialFolderName, setMaterialFolderName] = useState("");
  const [materialFolderDescription, setMaterialFolderDescription] =
    useState("");
  const [materialFolders, setMaterialFolders] = useState<
    AdditionalFolderDraft[]
  >(DEFAULT_MATERIAL_FOLDERS);
  const [draggedEvaluationId, setDraggedEvaluationId] = useState<string | null>(
    null,
  );
  const [dragOverEvaluationId, setDragOverEvaluationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setBreadcrumbItems([
      {
        icon: "class",
        label: "Gestión de Cursos",
        href: "/plataforma/admin/cursos",
      },
      { label: "Crear Curso" },
    ]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedProfessorSearch(professorSearch.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [professorSearch]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [types, evaluationTypeCatalog] = await Promise.all([
        coursesService.getCourseTypes(),
        evaluationsService.getTypes(),
      ]);
      setCourseTypes(types);
      setEvaluationTypes(evaluationTypeCatalog);
    } catch (error) {
      console.error("Error al cargar datos de creación del curso:", error);
      showToast({
        type: "error",
        title: "No se pudo preparar la creación",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const typeOptions = useMemo(
    () =>
      courseTypes.map((type) => ({
        value: type.id,
        label: normalizeCourseTypeName(type.name),
      })),
    [courseTypes],
  );

  const evaluationTypeOptions = useMemo(
    () =>
      evaluationTypes.map((type) => ({
        value: type.id,
        label: type.name,
      })),
    [evaluationTypes],
  );

  const bankAdditionalFolderTypeOptions = useMemo(
    () =>
      Object.entries(BANK_ADDITIONAL_FOLDER_META).map(([value, meta]) => ({
        value,
        label: meta.label,
      })),
    [],
  );

  const evaluationTypesById = useMemo(
    () => new Map(evaluationTypes.map((type) => [type.id, type])),
    [evaluationTypes],
  );

  const selectedProfessorIds = useMemo(
    () => new Set(selectedProfessors.map((professor) => professor.id)),
    [selectedProfessors],
  );

  const remainingProfessorOptions = useMemo(
    () =>
      availableProfessors.filter(
        (professor) => !selectedProfessorIds.has(professor.id),
      ),
    [availableProfessors, selectedProfessorIds],
  );

  const bankGroups = useMemo(() => {
    const grouped = new Map<
      string,
      { type: EvaluationType; items: EvaluationDraft[] }
    >();

    for (const draft of draftEvaluations) {
      const type =
        evaluationTypesById.get(draft.evaluationTypeId) ||
        ({
          id: draft.evaluationTypeId,
          code: draft.evaluationTypeCode,
          name: draft.evaluationTypeName,
        } satisfies EvaluationType);

      const current = grouped.get(draft.evaluationTypeId);
      if (current) {
        current.items.push(draft);
      } else {
        grouped.set(draft.evaluationTypeId, { type, items: [draft] });
      }
    }

    return Array.from(grouped.values());
  }, [draftEvaluations, evaluationTypesById]);

  const isEvaluationModalSaveDisabled =
    !evaluationTypeId ||
    !evaluationQuantity ||
    Number(evaluationQuantity) <= 0 ||
    Boolean(evaluationQuantityError);
  const isMaterialModalSaveDisabled =
    materialFolderName.trim().length === 0 ||
    materialFolderDescription.trim().length === 0;
  const isBankAdditionalModalSaveDisabled =
    !bankAdditionalFolderType ||
    !bankAdditionalFolderQuantity ||
    Number(bankAdditionalFolderQuantity) <= 0 ||
    Boolean(bankAdditionalFolderQuantityError);

  const loadProfessorOptions = useCallback(async () => {
    setProfessorOptionsLoading(true);
    try {
      const response = await usersService.getAdminUsers({
        page: 1,
        search: debouncedProfessorSearch || undefined,
        roles: "PROFESSOR",
        status: "ACTIVE",
      });

      setAvailableProfessors(
        response.items.map((user) => {
          const fullName = user.fullName.trim();
          const parts = fullName.split(/\s+/);
          const firstName = parts[0] || fullName;
          const lastName1 = parts[1] || "";
          const lastName2 = parts.slice(2).join(" ");

          return {
            id: user.id,
            firstName,
            lastName1,
            lastName2,
            fullName,
          };
        }),
      );
    } catch (error) {
      console.error("Error al cargar asesores disponibles:", error);
      showToast({
        type: "error",
        title: "No se pudieron cargar los asesores",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setProfessorOptionsLoading(false);
    }
  }, [debouncedProfessorSearch, showToast]);

  useEffect(() => {
    if (!professorModalOpen) return;
    loadProfessorOptions();
  }, [professorModalOpen, loadProfessorOptions]);

  const handleAddProfessor = async (professor: ProfessorModalOption) => {
    setProfessorActionLoadingId(professor.id);
    setSelectedProfessors((current) => [
      ...current,
      {
        id: professor.id,
        firstName: professor.firstName,
        lastName1: professor.lastName1,
        lastName2: professor.lastName2,
        profilePhotoUrl: null,
      },
    ]);
    setProfessorActionLoadingId(null);
  };

  const handleRemoveProfessor = async (professorId: string) => {
    setProfessorActionLoadingId(professorId);
    setSelectedProfessors((current) =>
      current.filter((professor) => professor.id !== professorId),
    );
    setProfessorActionLoadingId(null);
  };

  const handleEvaluationQuantityChange = (value: string) => {
    const sanitized = value.replace(/\D/g, "");

    if (!sanitized) {
      setEvaluationQuantity("");
      setEvaluationQuantityError("");
      return;
    }

    setEvaluationQuantity(sanitized);

    if (Number(sanitized) === 0) {
      setEvaluationQuantityError(
        "No se permite ingresar 0 en Cantidad de Evaluaciones.",
      );
      return;
    }

    setEvaluationQuantity(String(Number(sanitized)));
    setEvaluationQuantityError("");
  };

  const resetEvaluationModal = () => {
    setEvaluationModalMode("create");
    setEditingEvaluationTypeId(null);
    setEvaluationTypeId(null);
    setEvaluationQuantity("");
    setEvaluationQuantityError("");
  };

  const handleBankAdditionalFolderQuantityChange = (value: string) => {
    const sanitized = value.replace(/\D/g, "");

    if (!sanitized) {
      setBankAdditionalFolderQuantity("");
      setBankAdditionalFolderQuantityError("");
      return;
    }

    setBankAdditionalFolderQuantity(sanitized);

    if (Number(sanitized) === 0) {
      setBankAdditionalFolderQuantityError(
        "No se permite ingresar 0 en Cantidad de Evaluaciones.",
      );
      return;
    }

    setBankAdditionalFolderQuantity(String(Number(sanitized)));
    setBankAdditionalFolderQuantityError("");
  };

  const resetMaterialModal = () => {
    setMaterialModalMode("create");
    setEditingMaterialFolderId(null);
    setMaterialFolderName("");
    setMaterialFolderDescription("");
  };

  const resetBankAdditionalModal = () => {
    setEditingBankAdditionalFolderId(null);
    setBankAdditionalFolderType(null);
    setBankAdditionalFolderQuantity("");
    setBankAdditionalFolderQuantityError("");
  };

  const openCreateEvaluationModal = () => {
    resetEvaluationModal();
    setEvaluationModalMode("create");
    setEvaluationModalOpen(true);
  };

  const openEditEvaluationModal = (evaluationId: string) => {
    const target = draftEvaluations.find(
      (evaluation) => evaluation.id === evaluationId,
    );
    if (!target) return;

    const quantity = draftEvaluations.filter(
      (evaluation) => evaluation.evaluationTypeId === target.evaluationTypeId,
    ).length;

    setEvaluationModalMode("edit");
    setEditingEvaluationTypeId(target.evaluationTypeId);
    setEvaluationTypeId(target.evaluationTypeId);
    setEvaluationQuantity(String(quantity));
    setEvaluationQuantityError("");
    setEvaluationModalOpen(true);
  };

  const openEditBankAdditionalModal = (folderId: string) => {
    const folder = bankAdditionalFolders.find((item) => item.id === folderId);
    if (!folder) return;

    setEditingBankAdditionalFolderId(folderId);
    setBankAdditionalFolderType(folder.type);
    setBankAdditionalFolderQuantity(String(folder.evaluationCount));
    setBankAdditionalFolderQuantityError("");
    setBankAdditionalModalOpen(true);
  };

  const openCreateMaterialModal = () => {
    resetMaterialModal();
    setMaterialModalMode("create");
    setMaterialModalOpen(true);
  };

  const openEditMaterialModal = (folderId: string) => {
    const folder = materialFolders.find((item) => item.id === folderId);
    if (!folder) return;

    setMaterialModalMode("edit");
    setEditingMaterialFolderId(folderId);
    setMaterialFolderName(folder.title);
    setMaterialFolderDescription(folder.description);
    setMaterialModalOpen(true);
  };

  const handleCreateEvaluations = () => {
    if (!evaluationTypeId) return;

    const quantity = Number(evaluationQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setEvaluationQuantityError("Ingresa una cantidad válida mayor que cero.");
      return;
    }

    const selectedEvaluationType = evaluationTypesById.get(evaluationTypeId);
    if (!selectedEvaluationType) {
      showToast({
        type: "error",
        title: "Tipo no disponible",
        description: "No se encontró el tipo de evaluación seleccionado.",
      });
      return;
    }

    if (
      evaluationModalMode === "edit" &&
      editingEvaluationTypeId &&
      evaluationTypeId !== editingEvaluationTypeId &&
      draftEvaluations.some(
        (draft) => draft.evaluationTypeId === evaluationTypeId,
      )
    ) {
      showToast({
        type: "error",
        title: "Tipo duplicado",
        description:
          "Ya existe un grupo de evaluaciones con ese tipo. Edita el grupo existente o conserva el tipo actual.",
      });
      return;
    }

    setDraftEvaluations((current) => {
      if (evaluationModalMode === "edit" && editingEvaluationTypeId) {
        const baseDrafts = current.filter(
          (draft) => draft.evaluationTypeId !== editingEvaluationTypeId,
        );

        const nextDrafts = Array.from({ length: quantity }, (_, index) =>
          buildEvaluationDraft(selectedEvaluationType, index + 1),
        );

        return normalizeDrafts(
          [...baseDrafts, ...nextDrafts],
          evaluationTypesById,
        );
      }

      const currentCountForType = current.filter(
        (draft) => draft.evaluationTypeId === evaluationTypeId,
      ).length;

      const nextDrafts = Array.from({ length: quantity }, (_, index) =>
        buildEvaluationDraft(
          selectedEvaluationType,
          currentCountForType + index + 1,
        ),
      );

      return [...current, ...nextDrafts];
    });

    showToast({
      type: "success",
      title:
        evaluationModalMode === "edit"
          ? "Evaluación actualizada"
          : "Evaluaciones añadidas",
      description:
        evaluationModalMode === "edit"
          ? `Se actualizó ${selectedEvaluationType.name} a ${quantity} evaluaciones.`
          : `Se agregaron ${quantity} evaluaciones de tipo ${selectedEvaluationType.name}.`,
    });

    resetEvaluationModal();
    setEvaluationModalOpen(false);
  };

  const handleDeleteEvaluation = (evaluationId: string) => {
    setDraftEvaluations((current) => {
      const filtered = current.filter(
        (evaluation) => evaluation.id !== evaluationId,
      );
      return normalizeDrafts(filtered, evaluationTypesById);
    });
  };

  const requestDeleteEvaluation = (evaluationId: string) => {
    setDeleteTarget({
      kind: "evaluation",
      id: evaluationId,
    });
  };

  const moveEvaluation = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    setDraftEvaluations((current) => {
      const draggedIndex = current.findIndex(
        (evaluation) => evaluation.id === draggedId,
      );
      const targetIndex = current.findIndex(
        (evaluation) => evaluation.id === targetId,
      );

      if (draggedIndex === -1 || targetIndex === -1) return current;

      const next = [...current];
      const [draggedItem] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, draggedItem);
      return next;
    });
  };

  const handleCreateAdditionalFolders = () => {
    const trimmedName = materialFolderName.trim();
    const trimmedDescription = materialFolderDescription.trim();

    if (!trimmedName || !trimmedDescription) {
      return;
    }

    setMaterialFolders((current) => {
      if (materialModalMode === "edit" && editingMaterialFolderId) {
        return current.map((folder) =>
          folder.id === editingMaterialFolderId
            ? {
                ...folder,
                title: trimmedName,
                description: trimmedDescription,
              }
            : folder,
        );
      }

      return [
        ...current,
        {
          id: crypto.randomUUID(),
          title: trimmedName,
          description: trimmedDescription,
        } satisfies AdditionalFolderDraft,
      ];
    });

    showToast({
      type: "success",
      title:
        materialModalMode === "edit"
          ? "Carpeta actualizada"
          : "Carpeta añadida",
      description:
        materialModalMode === "edit"
          ? `Se actualizó la carpeta ${trimmedName}.`
          : `Se agregó la carpeta ${trimmedName}.`,
    });

    resetMaterialModal();
    setMaterialModalOpen(false);
  };

  const handleCreateBankAdditionalFolders = () => {
    if (!bankAdditionalFolderType) return;

    const quantity = Number(bankAdditionalFolderQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setBankAdditionalFolderQuantityError(
        "Ingresa una cantidad válida mayor que cero.",
      );
      return;
    }

    const meta = BANK_ADDITIONAL_FOLDER_META[bankAdditionalFolderType];

    if (
      editingBankAdditionalFolderId &&
      bankAdditionalFolders.some(
        (folder) =>
          folder.id !== editingBankAdditionalFolderId &&
          folder.type === bankAdditionalFolderType,
      )
    ) {
      showToast({
        type: "error",
        title: "Tipo duplicado",
        description:
          "Ya existe una carpeta adicional del banco con ese tipo. Edita la existente o conserva el tipo actual.",
      });
      return;
    }

    setBankAdditionalFolders((current) => {
      if (editingBankAdditionalFolderId) {
        return current.map((folder) =>
          folder.id === editingBankAdditionalFolderId
            ? {
                ...folder,
                type: bankAdditionalFolderType,
                title: meta.label,
                evaluationCount: quantity,
              }
            : folder,
        );
      }

      const existingFolderIndex = current.findIndex(
        (folder) => folder.type === bankAdditionalFolderType,
      );

      if (existingFolderIndex >= 0) {
        return current.map((folder, index) =>
          index === existingFolderIndex
            ? {
                ...folder,
                evaluationCount: folder.evaluationCount + quantity,
              }
            : folder,
        );
      }

      return [
        ...current,
        {
          id: crypto.randomUUID(),
          type: bankAdditionalFolderType,
          title: meta.label,
          evaluationCount: quantity,
        } satisfies BankAdditionalFolderDraft,
      ];
    });

    showToast({
      type: "success",
      title: editingBankAdditionalFolderId
        ? "Carpeta actualizada"
        : "Carpetas del banco añadidas",
      description: editingBankAdditionalFolderId
        ? `Se actualizó ${meta.label} a ${quantity} evaluaciones.`
        : `Se agregaron ${quantity} carpetas de tipo ${meta.label}.`,
    });

    resetBankAdditionalModal();
    setBankAdditionalModalOpen(false);
  };

  const handleDeleteMaterialFolder = (folderId: string) => {
    setMaterialFolders((current) =>
      current.filter((folder) => folder.id !== folderId),
    );
  };

  const handleDeleteBankAdditionalFolder = (folderId: string) => {
    setBankAdditionalFolders((current) =>
      current.filter((folder) => folder.id !== folderId),
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    switch (deleteTarget.kind) {
      case "evaluation":
        handleDeleteEvaluation(deleteTarget.id);
        showToast({
          type: "success",
          title: "Evaluación eliminada",
          description: "La evaluación fue eliminada correctamente.",
        });
        break;
      case "bank-group":
        setDraftEvaluations((current) =>
          normalizeDrafts(
            current.filter(
              (evaluation) =>
                evaluation.evaluationTypeId !== deleteTarget.evaluationTypeId,
            ),
            evaluationTypesById,
          ),
        );
        showToast({
          type: "success",
          title: "Carpeta eliminada",
          description: `Se eliminó ${deleteTarget.title} del banco de enunciados.`,
        });
        break;
      case "bank-additional":
        handleDeleteBankAdditionalFolder(deleteTarget.id);
        showToast({
          type: "success",
          title: "Carpeta eliminada",
          description: `Se eliminó ${deleteTarget.title} del banco de enunciados.`,
        });
        break;
      case "material":
        handleDeleteMaterialFolder(deleteTarget.id);
        showToast({
          type: "success",
          title: "Carpeta eliminada",
          description: `Se eliminó ${deleteTarget.title} de material adicional.`,
        });
        break;
    }

    setDeleteTarget(null);
  };

  const deleteModalConfig = useMemo(() => {
    if (!deleteTarget) return null;

    if (deleteTarget.kind === "evaluation") {
      return {
        title: "¿Eliminar esta evaluación?",
        description:
          "¿Estás seguro de que deseas eliminar esta evaluación? Si la evaluación tiene materiales asociados, estos también serán eliminados.",
      };
    }

    return {
      title: "¿Eliminar esta carpeta?",
      description:
        "¿Estás seguro de que deseas eliminar esta carpeta? Si la carpeta tiene materiales asociados, estos también serán eliminados.",
    };
  }, [deleteTarget]);

  const handleSave = () => {
    showToast({
      type: "info",
      title: "Creación pendiente",
      description:
        "La pantalla ya quedó preparada con evaluaciones sincronizadas y catálogo real de tipos. Para guardar por backend aún falta cerrar el dato de nivel académico que exige el contrato actual.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-solid border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary">Preparando creación del curso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full inline-flex flex-col justify-start items-start gap-8 overflow-hidden">
      <CourseEditorHeader
        title="Crear Curso"
        backLabel="Volver a Gestión de Cursos"
        onBack={() => router.push("/plataforma/admin/cursos")}
      />

      <CourseGeneralInfoSection
        courseName={courseName}
        onCourseNameChange={setCourseName}
        courseCode={courseCode}
        onCourseCodeChange={setCourseCode}
        selectedType={selectedType}
        onSelectedTypeChange={setSelectedType}
        typeOptions={typeOptions}
        professors={selectedProfessors}
        onOpenProfessorModal={() => setProfessorModalOpen(true)}
      />

      <CourseEditorTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "structure" ? (
        <div className="self-stretch flex flex-col justify-start items-start gap-8">
          <CourseSectionCard
            title="Configuración de Evaluaciones"
            icon="assignment"
            actions={
              <button
                onClick={openCreateEvaluationModal}
                className="px-4 py-2 bg-bg-accent-primary-solid rounded flex justify-center items-center gap-1 hover:bg-bg-accent-solid-hover transition-colors"
              >
                <Icon name="add" size={14} className="text-icon-white" />
                <span className="text-text-white text-xs font-medium leading-4">
                  Añadir evaluación
                </span>
              </button>
            }
            description={
              <>
                Desde aquí puedes definir la estructura del curso y administrar
                el banco de enunciados. Las evaluaciones se mostrarán en el
                orden que establezcas. Arrastra cualquier evaluación para
                reordenarla fácilmente.
              </>
            }
          >
            {draftEvaluations.length === 0 ? (
              <CourseEmptyStatePanel
                icon="sd_card_alert"
                title="Aún no hay evaluaciones configuradas"
                description={
                  <>
                    Comience por añadir la primera evaluación para
                    <br />
                    estructurar el plan académico de este curso.
                  </>
                }
              />
            ) : (
              <CourseEvaluationList
                evaluations={draftEvaluations}
                draggedEvaluationId={draggedEvaluationId}
                dragOverEvaluationId={dragOverEvaluationId}
                onDragStart={(evaluationId) => {
                  setDraggedEvaluationId(evaluationId);
                  setDragOverEvaluationId(evaluationId);
                }}
                onDragOver={(evaluationId) => {
                  if (dragOverEvaluationId !== evaluationId) {
                    setDragOverEvaluationId(evaluationId);
                  }
                }}
                onDrop={(evaluationId) => {
                  if (draggedEvaluationId) {
                    moveEvaluation(draggedEvaluationId, evaluationId);
                  }
                  setDraggedEvaluationId(null);
                  setDragOverEvaluationId(null);
                }}
                onDragEnd={() => {
                  setDraggedEvaluationId(null);
                  setDragOverEvaluationId(null);
                }}
                onEdit={openEditEvaluationModal}
                onDelete={requestDeleteEvaluation}
              />
            )}
          </CourseSectionCard>

          <CourseSectionCard
            title="Banco de Enunciados"
            icon="chrome_reader_mode"
          >
            <CourseInfoBanner
              title="Sincronización"
              description="El banco de enunciados se generará cuando se ingrese al menos una evaluación. Toda evaluación que se agregue, también se duplicará en este."
            />
            {bankGroups.length === 0 && bankAdditionalFolders.length === 0 ? (
              <CourseEmptyStatePanel
                icon="sd_card_alert"
                title="Aún no hay evaluaciones configuradas"
                description={
                  <>
                    Primero configure las evaluaciones para generar el
                    <br />
                    banco de enunciados.
                  </>
                }
              />
            ) : (
              <div className="self-stretch grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {bankGroups.map(({ type, items }) => {
                  const typeMeta = getEvaluationTypeMeta(type.code);
                  const titleMeta = getEvaluationTextMeta(type);
                  return (
                    <CourseResourceCard
                      key={type.id}
                      title={titleMeta.plural}
                      description={`Contiene ${items.length} evaluaciones.`}
                      iconName="folder"
                      iconToneClassName={typeMeta.text}
                      iconWrapperClassName={typeMeta.bg}
                      actions={
                        <div className="inline-flex justify-end items-center gap-2">
                          <button
                            onClick={() => openEditEvaluationModal(items[0].id)}
                            className="p-1 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                            title="Editar carpeta"
                          >
                            <Icon
                              name="edit"
                              size={20}
                              className="text-icon-tertiary"
                            />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                kind: "bank-group",
                                evaluationTypeId: type.id,
                                title: titleMeta.plural,
                              })
                            }
                            className="p-1 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                            title="Eliminar carpeta"
                          >
                            <Icon
                              name="delete"
                              size={20}
                              className="text-icon-tertiary"
                            />
                          </button>
                        </div>
                      }
                    />
                  );
                })}
                {bankAdditionalFolders.map((folder) => (
                  <CourseResourceCard
                    key={folder.id}
                    title={folder.title}
                    description={`Contiene ${folder.evaluationCount} evaluaciones.`}
                    actions={
                      <div className="inline-flex justify-end items-center gap-2">
                        <button
                          onClick={() => openEditBankAdditionalModal(folder.id)}
                          className="p-1 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                          title="Editar carpeta"
                        >
                          <Icon
                            name="edit"
                            size={20}
                            className="text-icon-tertiary"
                          />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              kind: "bank-additional",
                              id: folder.id,
                              title: folder.title,
                            })
                          }
                          className="p-1 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                          title="Eliminar carpeta"
                        >
                          <Icon
                            name="delete"
                            size={20}
                            className="text-icon-tertiary"
                          />
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </CourseSectionCard>

          <CourseSectionCard
            title="Material Adicional"
            icon="article"
            actions={
              <button
                onClick={openCreateMaterialModal}
                className="px-4 py-2 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1 hover:bg-bg-accent-light transition-colors"
              >
                <Icon
                  name="add"
                  size={14}
                  className="text-icon-accent-primary"
                />
                <span className="text-text-accent-primary text-xs font-medium leading-4">
                  Añadir carpeta adicional
                </span>
              </button>
            }
          >
            <div className="self-stretch grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {materialFolders.map((folder) => (
                <CourseResourceCard
                  key={folder.id}
                  title={folder.title}
                  description={folder.description}
                  actions={
                    <div className="inline-flex justify-end items-center gap-2">
                      <button
                        onClick={() => openEditMaterialModal(folder.id)}
                        className="p-1 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                      >
                        <Icon
                          name="edit"
                          size={20}
                          className="text-icon-tertiary"
                        />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            kind: "material",
                            id: folder.id,
                            title: folder.title,
                          })
                        }
                        className="p-1 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                      >
                        <Icon
                          name="delete"
                          size={20}
                          className="text-icon-tertiary"
                        />
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          </CourseSectionCard>
        </div>
      ) : (
        <CourseSectionCard title="Gestión de Alumnos" icon="groups">
          <CourseEmptyStatePanel
            icon="groups"
            title="Disponible después de crear el curso"
            description="Primero crea el curso y su ciclo inicial. Luego desde aquí podrás matricular alumnos y administrar la lista de inscritos."
          />
        </CourseSectionCard>
      )}

      <CourseEditorFooter
        onCancel={() => router.push("/plataforma/admin/cursos")}
        onSave={handleSave}
        saveDisabled
      />

      <CourseProfessorManagerModal
        isOpen={professorModalOpen}
        onClose={() => {
          if (professorActionLoadingId) return;
          setProfessorSearch("");
          setProfessorModalOpen(false);
        }}
        assignedProfessors={selectedProfessors}
        availableProfessors={remainingProfessorOptions}
        professorOptionsLoading={professorOptionsLoading}
        professorSearch={professorSearch}
        onProfessorSearchChange={setProfessorSearch}
        actionLoadingId={professorActionLoadingId}
        onAddProfessor={handleAddProfessor}
        onRemoveProfessor={handleRemoveProfessor}
      />

      <CourseDeleteConfirmModal
        isOpen={Boolean(deleteTarget && deleteModalConfig)}
        onClose={() => setDeleteTarget(null)}
        title={deleteModalConfig?.title || ""}
        description={deleteModalConfig?.description || ""}
        onConfirm={confirmDelete}
      />

      <CourseSelectQuantityModal
        isOpen={evaluationModalOpen}
        onClose={() => {
          resetEvaluationModal();
          setEvaluationModalOpen(false);
        }}
        title={
          evaluationModalMode === "edit"
            ? "Editar Evaluación"
            : "Crear Nueva Evaluación"
        }
        selectLabel="Tipo de Evaluación"
        quantityLabel="Cantidad de Evaluaciones"
        selectValue={evaluationTypeId}
        onSelectChange={setEvaluationTypeId}
        selectOptions={evaluationTypeOptions}
        selectPlaceholder="Tipo de Evaluación"
        quantityValue={evaluationQuantity}
        onQuantityChange={handleEvaluationQuantityChange}
        quantityError={evaluationQuantityError}
        onSave={handleCreateEvaluations}
        saveDisabled={isEvaluationModalSaveDisabled}
      />

      <CourseSelectQuantityModal
        isOpen={bankAdditionalModalOpen}
        onClose={() => {
          resetBankAdditionalModal();
          setBankAdditionalModalOpen(false);
        }}
        title={
          editingBankAdditionalFolderId
            ? "Editar Carpeta Adicional"
            : "Crear Nueva Carpeta Adicional"
        }
        selectLabel="Tipo de Carpeta Adicional"
        quantityLabel="Cantidad de Evaluaciones"
        selectValue={bankAdditionalFolderType}
        onSelectChange={(value) =>
          setBankAdditionalFolderType(value as BankAdditionalFolderType | null)
        }
        selectOptions={bankAdditionalFolderTypeOptions}
        selectPlaceholder="Tipo de Carpeta Adicional"
        quantityValue={bankAdditionalFolderQuantity}
        onQuantityChange={handleBankAdditionalFolderQuantityChange}
        quantityError={bankAdditionalFolderQuantityError}
        onSave={handleCreateBankAdditionalFolders}
        saveDisabled={isBankAdditionalModalSaveDisabled}
      />

      <CourseMaterialFolderModal
        isOpen={materialModalOpen}
        title={
          materialModalMode === "edit"
            ? "Editar Carpeta Adicional"
            : "Crear Nueva Carpeta Adicional"
        }
        nameValue={materialFolderName}
        onNameChange={setMaterialFolderName}
        descriptionValue={materialFolderDescription}
        onDescriptionChange={setMaterialFolderDescription}
        onSave={handleCreateAdditionalFolders}
        onClose={() => {
          resetMaterialModal();
          setMaterialModalOpen(false);
        }}
        saveDisabled={isMaterialModalSaveDisabled}
      />
    </div>
  );
}

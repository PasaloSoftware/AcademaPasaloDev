"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import CourseStudentsManagementSection from "@/components/pages/admin/CourseStudentsManagementSection";
import {
  CourseDeleteConfirmModal,
  CourseEditorFooter,
  CourseEditorHeader,
  CourseEditorTabs,
  CourseEvaluationList,
  CourseMaterialFolderModal,
  CourseProfessorManagerModal,
  CourseResourceCard,
  CourseSectionCard,
  CourseInfoBanner,
  CourseGeneralInfoSection,
  CourseSelectQuantityModal,
  CourseEditorTab,
  ProfessorModalOption,
  getEvaluationTypeMeta,
  getProfessorDisplayName,
  normalizeCourseTypeName,
} from "@/components/pages/admin/CourseEditorShared";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/components/ui/ToastContainer";
import {
  coursesService,
  type AdminCourseCycleItem,
  type AdminCourseCycleListResponse,
} from "@/services/courses.service";
import { evaluationsService } from "@/services/evaluations.service";
import { usersService } from "@/services/users.service";
import type { CourseType } from "@/types/api";
import type {
  BankStructureResponse,
  CurrentCycleResponse,
} from "@/types/curso";

interface CursoEditContentProps {
  cursoId: string;
}

type MaterialFolderDraft = {
  id: string;
  title: string;
  description: string;
};

type DeleteTarget =
  | { kind: "evaluation"; evaluationId: string }
  | { kind: "bank-folder"; evaluationTypeCode: string }
  | { kind: "material"; folderId: string };

const DEFAULT_MATERIAL_FOLDERS: MaterialFolderDraft[] = [
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

export default function CursoEditContent({ cursoId }: CursoEditContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [courseCycle, setCourseCycle] = useState<AdminCourseCycleItem | null>(
    null,
  );
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [bankStructure, setBankStructure] =
    useState<BankStructureResponse | null>(null);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [initialTypeName, setInitialTypeName] = useState("");
  const [orderedEvaluations, setOrderedEvaluations] = useState<
    CurrentCycleResponse["evaluations"]
  >([]);
  const [initialEvaluationOrder, setInitialEvaluationOrder] = useState<
    string[]
  >([]);
  const [draggedEvaluationId, setDraggedEvaluationId] = useState<string | null>(
    null,
  );
  const [dragOverEvaluationId, setDragOverEvaluationId] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState<CourseEditorTab>("structure");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(
    null,
  );
  const [evaluationQuantity, setEvaluationQuantity] = useState("");
  const [evaluationQuantityError, setEvaluationQuantityError] = useState("");
  const [bankFolderModalOpen, setBankFolderModalOpen] = useState(false);
  const [editingBankFolderCode, setEditingBankFolderCode] = useState<
    string | null
  >(null);
  const [bankFolderQuantity, setBankFolderQuantity] = useState("");
  const [bankFolderQuantityError, setBankFolderQuantityError] = useState("");
  const [materialFolders, setMaterialFolders] = useState<MaterialFolderDraft[]>(
    DEFAULT_MATERIAL_FOLDERS,
  );
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editingMaterialFolderId, setEditingMaterialFolderId] = useState<
    string | null
  >(null);
  const [materialFolderName, setMaterialFolderName] = useState("");
  const [materialFolderDescription, setMaterialFolderDescription] =
    useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const loadCourseEditData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [catalog, firstPage, types, content, bank] = await Promise.all([
        coursesService.findAll(),
        coursesService.getAdminCourseCycles({ page: 1, pageSize: 100 }),
        coursesService.getCourseTypes(),
        coursesService.getCourseContent(cursoId),
        coursesService.getBankStructure(cursoId).catch(() => null),
      ]);

      const cycleItems = [...firstPage.items];
      let page = 2;
      while (page <= firstPage.totalPages) {
        const response: AdminCourseCycleListResponse =
          await coursesService.getAdminCourseCycles({ page, pageSize: 100 });
        cycleItems.push(...response.items);
        page += 1;
      }

      const selectedCycle =
        cycleItems.find((item) => item.courseCycleId === cursoId) || null;
      if (!selectedCycle) {
        throw new Error("No se encontro el curso solicitado.");
      }

      const selectedCourse =
        catalog.find((course) => course.id === selectedCycle.course.id) || null;
      const normalizedTypeName = normalizeCourseTypeName(
        selectedCourse?.courseType?.name,
      );
      const matchedType =
        types.find(
          (type) => normalizeCourseTypeName(type.name) === normalizedTypeName,
        ) || null;

      setCourseCycle(selectedCycle);
      setCourseTypes(types);
      setOrderedEvaluations(content.evaluations || []);
      setInitialEvaluationOrder(
        (content.evaluations || []).map((evaluation) => evaluation.id),
      );
      setBankStructure(bank);
      setCourseName(selectedCycle.course.name);
      setCourseCode(selectedCycle.course.code);
      setSelectedType(matchedType?.id || null);
      setInitialTypeName(normalizedTypeName);
      setBreadcrumbItems([
        {
          icon: "class",
          label: "Gestión de Cursos",
          href: "/plataforma/admin/cursos",
        },
        {
          label: selectedCycle.course.name,
          href: `/plataforma/curso/${cursoId}`,
        },
        { label: "Editar Curso" },
      ]);
    } catch (err) {
      console.error("Error al cargar edicion del curso:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar la edicion del curso.",
      );
    } finally {
      setLoading(false);
    }
  }, [cursoId, setBreadcrumbItems]);

  useEffect(() => {
    if (!cursoId) return;
    loadCourseEditData();
  }, [cursoId, loadCourseEditData]);

  const selectedTypeName = useMemo(() => {
    const found = courseTypes.find((type) => type.id === selectedType);
    return normalizeCourseTypeName(found?.name || "");
  }, [courseTypes, selectedType]);

  const typeOptions = useMemo(
    () =>
      courseTypes.map((type) => ({
        value: type.id,
        label: normalizeCourseTypeName(type.name),
      })),
    [courseTypes],
  );

  const selectedProfessorIds = useMemo(
    () =>
      new Set((courseCycle?.professors || []).map((professor) => professor.id)),
    [courseCycle],
  );

  const remainingProfessorOptions = useMemo(
    () =>
      availableProfessors.filter(
        (professor) => !selectedProfessorIds.has(professor.id),
      ),
    [availableProfessors, selectedProfessorIds],
  );

  const evaluations = orderedEvaluations;
  const evaluationOrderChanged =
    initialEvaluationOrder.length !== evaluations.length ||
    initialEvaluationOrder.some(
      (evaluationId, index) => evaluations[index]?.id !== evaluationId,
    );
  const currentCourse = courseCycle?.course;
  const isDirty = currentCourse
    ? courseName !== currentCourse.name ||
      courseCode !== currentCourse.code ||
      selectedTypeName !== initialTypeName ||
      evaluationOrderChanged
    : false;

  const evaluationTypeOptions = useMemo(
    () =>
      orderedEvaluations.map((evaluation) => ({
        value: evaluation.id,
        label: evaluation.fullName,
      })),
    [orderedEvaluations],
  );

  const bankFolderTypeOptions = useMemo(
    () =>
      (bankStructure?.items || []).map((item) => ({
        value: item.evaluationTypeCode,
        label: item.evaluationTypeName,
      })),
    [bankStructure],
  );

  const isEvaluationModalSaveDisabled =
    !editingEvaluationId ||
    !evaluationQuantity ||
    Number(evaluationQuantity) <= 0 ||
    Boolean(evaluationQuantityError);
  const isBankFolderModalSaveDisabled =
    !editingBankFolderCode ||
    !bankFolderQuantity ||
    Number(bankFolderQuantity) <= 0 ||
    Boolean(bankFolderQuantityError);
  const isMaterialModalSaveDisabled =
    materialFolderName.trim().length === 0 ||
    materialFolderDescription.trim().length === 0;

  const moveEvaluation = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    setOrderedEvaluations((current) => {
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

  const handleQuantityChange = (
    value: string,
    setValue: (next: string) => void,
    setError: (next: string) => void,
  ) => {
    const sanitized = value.replace(/\D/g, "");

    if (!sanitized) {
      setValue("");
      setError("");
      return;
    }

    setValue(sanitized);

    if (Number(sanitized) === 0) {
      setError("No se permite ingresar 0 en Cantidad de Evaluaciones.");
      return;
    }

    setValue(String(Number(sanitized)));
    setError("");
  };

  const resetEvaluationModal = () => {
    setEditingEvaluationId(null);
    setEvaluationQuantity("");
    setEvaluationQuantityError("");
  };

  const resetBankFolderModal = () => {
    setEditingBankFolderCode(null);
    setBankFolderQuantity("");
    setBankFolderQuantityError("");
  };

  const resetMaterialModal = () => {
    setEditingMaterialFolderId(null);
    setMaterialFolderName("");
    setMaterialFolderDescription("");
  };

  const openEditEvaluationModal = (evaluationId: string) => {
    const evaluation = orderedEvaluations.find(
      (item) => item.id === evaluationId,
    );
    if (!evaluation) return;

    const quantity = orderedEvaluations.filter(
      (item) => item.evaluationTypeCode === evaluation.evaluationTypeCode,
    ).length;

    setEditingEvaluationId(evaluationId);
    setEvaluationQuantity(String(quantity));
    setEvaluationQuantityError("");
    setEvaluationModalOpen(true);
  };

  const openEditBankFolderModal = (evaluationTypeCode: string) => {
    const folder = bankStructure?.items.find(
      (item) => item.evaluationTypeCode === evaluationTypeCode,
    );
    if (!folder) return;

    setEditingBankFolderCode(folder.evaluationTypeCode);
    setBankFolderQuantity(String(folder.entries?.length || 0));
    setBankFolderQuantityError("");
    setBankFolderModalOpen(true);
  };

  const openEditMaterialModal = (folderId: string) => {
    const folder = materialFolders.find((item) => item.id === folderId);
    if (!folder) return;

    setEditingMaterialFolderId(folderId);
    setMaterialFolderName(folder.title);
    setMaterialFolderDescription(folder.description);
    setMaterialModalOpen(true);
  };

  const handleSave = async () => {
    if (!courseCycle) return;

    if (!evaluationOrderChanged) {
      showToast({
        type: "info",
        title: "Guardado pendiente",
        description:
          "La edicion general del curso aun no esta conectada. Por ahora solo se puede guardar el orden de evaluaciones.",
      });
      return;
    }

    setSaving(true);
    try {
      const nextIds = evaluations.map((evaluation) => evaluation.id);
      await evaluationsService.reorderByCourseCycle(cursoId, nextIds);
      setInitialEvaluationOrder(nextIds);
      showToast({
        type: "success",
        title: "Orden actualizado",
        description:
          courseName !== courseCycle.course.name ||
          courseCode !== courseCycle.course.code ||
          selectedTypeName !== initialTypeName
            ? "El orden de evaluaciones se guardo correctamente. Los cambios de informacion general aun siguen pendientes."
            : "El orden de evaluaciones se guardo correctamente.",
      });
    } catch (err) {
      console.error("Error al guardar el orden de evaluaciones:", err);
      showToast({
        type: "error",
        title: "No se pudo guardar",
        description:
          err instanceof Error
            ? err.message
            : "Ocurrio un error al guardar el orden de evaluaciones.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePendingAction = (action: string) => {
    showToast({
      type: "info",
      title: `${action} pendiente`,
      description: `La accion de ${action.toLowerCase()} se habilitara en el siguiente paso.`,
    });
  };

  const handleSaveEditedEvaluation = () => {
    const evaluation = orderedEvaluations.find(
      (item) => item.id === editingEvaluationId,
    );
    if (!evaluation) return;

    showToast({
      type: "info",
      title: "Edición pendiente de backend",
      description:
        "La API actual permite crear y reordenar evaluaciones, pero aún no expone edición o eliminación individual de evaluaciones académicas.",
    });
    resetEvaluationModal();
    setEvaluationModalOpen(false);
  };

  const handleSaveEditedBankFolder = async () => {
    if (!editingBankFolderCode) return;

    const folder = bankStructure?.items.find(
      (item) => item.evaluationTypeCode === editingBankFolderCode,
    );
    if (!folder) return;

    try {
      await coursesService.updateBankFolder(cursoId, editingBankFolderCode, {
        groupName: folder.evaluationTypeName,
        items: Array.from(
          { length: Number(bankFolderQuantity) },
          (_, index) => `${editingBankFolderCode}${index + 1}`,
        ),
      });

      const refreshedBank = await coursesService.getBankStructure(cursoId);
      setBankStructure(refreshedBank);
      showToast({
        type: "success",
        title: "Carpeta actualizada",
        description: "La carpeta del banco se actualizó correctamente.",
      });
      resetBankFolderModal();
      setBankFolderModalOpen(false);
    } catch (err) {
      console.error("Error al actualizar carpeta del banco:", err);
      showToast({
        type: "error",
        title: "No se pudo actualizar la carpeta",
        description:
          err instanceof Error ? err.message : "Ocurrió un error inesperado.",
      });
    }
  };

  const handleSaveMaterialFolder = () => {
    const trimmedName = materialFolderName.trim();
    const trimmedDescription = materialFolderDescription.trim();
    if (!trimmedName || !trimmedDescription || !editingMaterialFolderId) return;

    setMaterialFolders((current) =>
      current.map((folder) =>
        folder.id === editingMaterialFolderId
          ? {
              ...folder,
              title: trimmedName,
              description: trimmedDescription,
            }
          : folder,
      ),
    );

    showToast({
      type: "success",
      title: "Carpeta actualizada",
      description: `Se actualizó la carpeta ${trimmedName}.`,
    });
    resetMaterialModal();
    setMaterialModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.kind === "evaluation") {
      showToast({
        type: "info",
        title: "Eliminación pendiente de backend",
        description:
          "La API actual aún no expone eliminación individual de evaluaciones académicas.",
      });
      setDeleteTarget(null);
      return;
    }

    if (deleteTarget.kind === "bank-folder") {
      try {
        await coursesService.deleteBankFolder(
          cursoId,
          deleteTarget.evaluationTypeCode,
        );
        const refreshedBank = await coursesService.getBankStructure(cursoId);
        setBankStructure(refreshedBank);
        showToast({
          type: "success",
          title: "Carpeta eliminada",
          description: "La carpeta del banco fue eliminada correctamente.",
        });
      } catch (err) {
        console.error("Error al eliminar carpeta del banco:", err);
        showToast({
          type: "error",
          title: "No se pudo eliminar la carpeta",
          description:
            err instanceof Error ? err.message : "Ocurrió un error inesperado.",
        });
      } finally {
        setDeleteTarget(null);
      }
      return;
    }

    setMaterialFolders((current) =>
      current.filter((folder) => folder.id !== deleteTarget.folderId),
    );
    showToast({
      type: "success",
      title: "Carpeta eliminada",
      description:
        "La carpeta de material adicional fue eliminada correctamente.",
    });
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedProfessorSearch(professorSearch.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [professorSearch]);

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
    } catch (err) {
      console.error("Error al cargar asesores disponibles:", err);
      showToast({
        type: "error",
        title: "No se pudieron cargar los asesores",
        description:
          err instanceof Error ? err.message : "Ocurrio un error inesperado.",
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
    if (!courseCycle || courseCycle.professors.length >= 2) return;

    setProfessorActionLoadingId(professor.id);
    try {
      await coursesService.assignProfessorToCourseCycle(cursoId, professor.id);
      setCourseCycle({
        ...courseCycle,
        professors: [
          ...courseCycle.professors,
          {
            id: professor.id,
            firstName: professor.firstName,
            lastName1: professor.lastName1,
            lastName2: professor.lastName2,
            profilePhotoUrl: null,
          },
        ],
      });
      showToast({
        type: "success",
        title: "Asesor agregado",
        description: `${professor.fullName} fue asignado al curso.`,
      });
    } catch (err) {
      console.error("Error al asignar asesor:", err);
      showToast({
        type: "error",
        title: "No se pudo asignar el asesor",
        description:
          err instanceof Error ? err.message : "Ocurrio un error inesperado.",
      });
    } finally {
      setProfessorActionLoadingId(null);
    }
  };

  const handleRemoveProfessor = async (professorId: string) => {
    if (!courseCycle) return;

    const professor = courseCycle.professors.find(
      (item) => item.id === professorId,
    );
    if (!professor) return;

    setProfessorActionLoadingId(professorId);
    try {
      await coursesService.revokeProfessorFromCourseCycle(cursoId, professorId);
      setCourseCycle({
        ...courseCycle,
        professors: courseCycle.professors.filter(
          (item) => item.id !== professorId,
        ),
      });
      showToast({
        type: "success",
        title: "Asesor removido",
        description: `${getProfessorDisplayName(professor)} fue retirado del curso.`,
      });
    } catch (err) {
      console.error("Error al remover asesor:", err);
      showToast({
        type: "error",
        title: "No se pudo remover el asesor",
        description:
          err instanceof Error ? err.message : "Ocurrio un error inesperado.",
      });
    } finally {
      setProfessorActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-solid border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary">Cargando edicion del curso...</p>
        </div>
      </div>
    );
  }

  if (error || !courseCycle) {
    return (
      <div className="bg-bg-primary rounded-2xl border border-stroke-primary p-12 text-center">
        <Icon
          name="error"
          size={64}
          className="text-error-solid mb-4 mx-auto"
        />
        <h1 className="text-2xl font-bold text-primary mb-2">
          {error || "Curso no encontrado"}
        </h1>
        <p className="text-secondary mb-6">
          No pudimos cargar la pagina de edicion del curso.
        </p>
        <button
          onClick={() => router.push(`/plataforma/curso/${cursoId}`)}
          className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg text-text-white text-sm font-medium leading-4 hover:bg-bg-accent-solid-hover transition-colors"
        >
          Volver al Curso
        </button>
      </div>
    );
  }

  return (
    <div className="w-full inline-flex flex-col justify-start items-start gap-8 overflow-hidden">
      <CourseEditorHeader
        title="Editar Curso"
        backLabel={`Volver a ${courseCycle.course.name}`}
        onBack={() => router.push(`/plataforma/curso/${cursoId}`)}
      />

      <CourseGeneralInfoSection
        courseName={courseName}
        onCourseNameChange={setCourseName}
        courseCode={courseCode}
        onCourseCodeChange={setCourseCode}
        selectedType={selectedType}
        onSelectedTypeChange={setSelectedType}
        typeOptions={typeOptions}
        professors={courseCycle.professors}
        onOpenProfessorModal={() => setProfessorModalOpen(true)}
      />

      <CourseEditorTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "structure" ? (
        <div className="self-stretch flex flex-col justify-start items-start gap-8">
          <CourseSectionCard
            title="Configuracion de Evaluaciones"
            icon="assignment"
            actions={
              <button
                onClick={() => handlePendingAction("Añadir evaluación")}
                className="px-4 py-2 bg-bg-accent-primary-solid rounded flex justify-center items-center gap-1 hover:bg-bg-accent-solid-hover transition-colors"
              >
                <Icon name="add" size={14} className="text-icon-white" />
                <span className="text-text-white text-xs font-medium leading-4">
                  Añadir evaluación
                </span>
              </button>
            }
          >
            <CourseEvaluationList
              evaluations={evaluations}
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
              onDelete={(evaluationId) =>
                setDeleteTarget({ kind: "evaluation", evaluationId })
              }
            />
          </CourseSectionCard>

          <CourseSectionCard
            title="Banco de Enunciados"
            icon="chrome_reader_mode"
          >
            <CourseInfoBanner
              title="Sincronización"
              description="El banco de enunciados se generará cuando se ingrese al menos una evaluación. Toda evaluación que se agregue, también se duplicará en este."
            />
            <div className="self-stretch grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(bankStructure?.items || []).map((item) => {
                const typeMeta = getEvaluationTypeMeta(item.evaluationTypeCode);
                return (
                  <CourseResourceCard
                    key={item.evaluationTypeId}
                    title={item.evaluationTypeName}
                    description={`Contiene ${item.entries?.length || 0} evaluaciones.`}
                    iconName="folder"
                    iconToneClassName={typeMeta.text}
                    iconWrapperClassName={typeMeta.bg}
                    actions={
                      <div className="inline-flex justify-end items-center gap-2">
                        <button
                          onClick={() =>
                            openEditBankFolderModal(item.evaluationTypeCode)
                          }
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
                              kind: "bank-folder",
                              evaluationTypeCode: item.evaluationTypeCode,
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
              {!bankStructure?.items?.length && (
                <div className="md:col-span-2 xl:col-span-3 self-stretch p-6 bg-bg-secondary rounded-xl border border-dashed border-stroke-secondary text-text-tertiary text-sm">
                  No hay estructura de banco configurada para este curso.
                </div>
              )}
            </div>
          </CourseSectionCard>

          {/*<CourseSectionCard
            title="Material Adicional"
            icon="article"
            actions={
              <button
                onClick={() =>
                  handlePendingAction("Añadir carpeta de material")
                }
                className="px-4 py-2 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1 hover:bg-bg-accent-light transition-colors"
              >
                <Icon
                  name="add"
                  size={14}
                  className="text-icon-accent-primary"
                />
                <span className="text-text-accent-primary text-xs font-medium leading-4">
                  Añadir carpeta
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
                            kind: "material",
                            folderId: folder.id,
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
          </CourseSectionCard>*/}
        </div>
      ) : (
        <CourseStudentsManagementSection
          courseCycleId={cursoId}
          enabled={activeTab === "students"}
          containerClassName="self-stretch p-6 bg-bg-primary rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] border border-stroke-secondary inline-flex flex-col justify-start items-start gap-6"
          headerTrailing={<div className="w-28 h-6" />}
        />
      )}

      <CourseEditorFooter
        onCancel={() => router.push(`/plataforma/curso/${cursoId}`)}
        onSave={handleSave}
        saveDisabled={!isDirty || saving}
        saveLoading={saving}
        saveLoadingLabel="Guardando cambios..."
      />

      <CourseProfessorManagerModal
        isOpen={professorModalOpen}
        onClose={() => {
          if (professorActionLoadingId) return;
          setProfessorSearch("");
          setProfessorModalOpen(false);
        }}
        assignedProfessors={courseCycle.professors}
        availableProfessors={remainingProfessorOptions}
        professorOptionsLoading={professorOptionsLoading}
        professorSearch={professorSearch}
        onProfessorSearchChange={setProfessorSearch}
        actionLoadingId={professorActionLoadingId}
        onAddProfessor={handleAddProfessor}
        onRemoveProfessor={handleRemoveProfessor}
      />

      <CourseSelectQuantityModal
        isOpen={evaluationModalOpen}
        onClose={() => {
          resetEvaluationModal();
          setEvaluationModalOpen(false);
        }}
        title="Editar Evaluación"
        selectLabel="Tipo de Evaluación"
        quantityLabel="Cantidad de Evaluaciones"
        selectValue={editingEvaluationId}
        onSelectChange={() => undefined}
        selectOptions={evaluationTypeOptions}
        selectPlaceholder="Tipo de Evaluación"
        quantityValue={evaluationQuantity}
        onQuantityChange={(value) =>
          handleQuantityChange(
            value,
            setEvaluationQuantity,
            setEvaluationQuantityError,
          )
        }
        quantityError={evaluationQuantityError}
        onSave={handleSaveEditedEvaluation}
        saveDisabled={isEvaluationModalSaveDisabled}
        selectDisabled
      />

      <CourseSelectQuantityModal
        isOpen={bankFolderModalOpen}
        onClose={() => {
          resetBankFolderModal();
          setBankFolderModalOpen(false);
        }}
        title="Editar Carpeta Adicional"
        selectLabel="Tipo de Carpeta Adicional"
        quantityLabel="Cantidad de Evaluaciones"
        selectValue={editingBankFolderCode}
        onSelectChange={() => undefined}
        selectOptions={bankFolderTypeOptions}
        selectPlaceholder="Tipo de Carpeta Adicional"
        quantityValue={bankFolderQuantity}
        onQuantityChange={(value) =>
          handleQuantityChange(
            value,
            setBankFolderQuantity,
            setBankFolderQuantityError,
          )
        }
        quantityError={bankFolderQuantityError}
        onSave={handleSaveEditedBankFolder}
        saveDisabled={isBankFolderModalSaveDisabled}
        selectDisabled
      />

      <CourseMaterialFolderModal
        isOpen={materialModalOpen}
        onClose={() => {
          resetMaterialModal();
          setMaterialModalOpen(false);
        }}
        title="Editar Carpeta Adicional"
        nameValue={materialFolderName}
        onNameChange={setMaterialFolderName}
        descriptionValue={materialFolderDescription}
        onDescriptionChange={setMaterialFolderDescription}
        onSave={handleSaveMaterialFolder}
        saveDisabled={isMaterialModalSaveDisabled}
      />

      <CourseDeleteConfirmModal
        isOpen={Boolean(deleteTarget && deleteModalConfig)}
        onClose={() => setDeleteTarget(null)}
        title={deleteModalConfig?.title || ""}
        description={deleteModalConfig?.description || ""}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

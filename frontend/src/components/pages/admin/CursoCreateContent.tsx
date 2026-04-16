"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import {
  CourseEditorFooter,
  CourseEditorHeader,
  CourseEditorTabs,
  CourseEmptyStatePanel,
  CourseGeneralInfoSection,
  CourseInfoBanner,
  CourseProfessorManagerModal,
  CourseResourceCard,
  CourseSectionCard,
  CourseEditorTab,
  ProfessorModalOption,
  normalizeCourseTypeName,
} from "@/components/pages/admin/CourseEditorShared";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/components/ui/ToastContainer";
import { usersService } from "@/services/users.service";
import type { AdminCourseCycleProfessor } from "@/services/courses.service";
import { coursesService } from "@/services/courses.service";
import type { CourseType } from "@/types/api";

export default function CursoCreateContent() {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
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
      const types = await coursesService.getCourseTypes();
      setCourseTypes(types);
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

  const handlePendingAction = (action: string) => {
    showToast({
      type: "info",
      title: `${action} pendiente`,
      description: `La acción de ${action.toLowerCase()} se habilitará en el siguiente paso.`,
    });
  };

  const handleSave = () => {
    showToast({
      type: "info",
      title: "Creación pendiente",
      description:
        "La pantalla ya quedó preparada sobre la base compartida, pero el guardado completo se conectará cuando terminemos el flujo de estructura inicial.",
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
                onClick={() => handlePendingAction("Añadir evaluación")}
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
          </CourseSectionCard>

          <CourseSectionCard
            title="Banco de Enunciados"
            icon="chrome_reader_mode"
            actions={
              <button
                disabled
                className="px-4 py-2 bg-bg-disabled rounded flex justify-center items-center gap-1 cursor-not-allowed"
              >
                <Icon name="add" size={14} className="text-icon-disabled" />
                <span className="text-text-disabled text-xs font-medium leading-4">
                  Añadir carpeta adicional
                </span>
              </button>
            }
          >
            <CourseInfoBanner
              title="Sincronización"
              description="El banco de enunciados se generará cuando se ingrese al menos una evaluación. Toda evaluación que se agregue, también se duplicará en este."
            />
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
          </CourseSectionCard>

          <CourseSectionCard
            title="Material Adicional"
            icon="article"
            actions={
              <button
                onClick={() => handlePendingAction("Añadir carpeta adicional")}
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
              <CourseResourceCard
                title="Enunciados"
                description="Recopilación de enunciados adicionales de una evaluación."
                actions={
                  <div className="inline-flex justify-end items-center gap-2">
                    <button
                      onClick={() =>
                        handlePendingAction("Editar carpeta de material")
                      }
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
                        handlePendingAction("Eliminar carpeta de material")
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
              <CourseResourceCard
                title="Resúmenes"
                description="Recopilación de resúmenes de temas de una evaluación."
                actions={
                  <div className="inline-flex justify-end items-center gap-2">
                    <button
                      onClick={() =>
                        handlePendingAction("Editar carpeta de material")
                      }
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
                        handlePendingAction("Eliminar carpeta de material")
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
    </div>
  );
}

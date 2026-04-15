"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import FloatingInput from "@/components/ui/FloatingInput";
import FloatingSelect from "@/components/ui/FloatingSelect";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/components/ui/ToastContainer";
import {
  coursesService,
  type AdminCourseCycleItem,
  type AdminCourseCycleListResponse,
  type AdminCourseCycleProfessor,
} from "@/services/courses.service";
import { evaluationsService } from "@/services/evaluations.service";
import {
  enrollmentService,
  type AdminCourseCycleStudentItem,
} from "@/services/enrollment.service";
import type { CourseType } from "@/types/api";
import type {
  BankStructureResponse,
  CurrentCycleResponse,
} from "@/types/curso";

interface CursoEditContentProps {
  cursoId: string;
}

type EditTab = "structure" | "students";

const STUDENTS_PAGE_SIZE = 10;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i += 1
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function normalizeCourseTypeName(name?: string | null): string {
  if (!name) return "Sin unidad";
  const normalized = name.trim().toLowerCase();
  if (normalized === "ciencias") return "Ciencias";
  if (normalized === "letras") return "Letras";
  if (normalized === "facultad") return "Facultad";
  return name.trim();
}

function getProfessorDisplayName(professor: AdminCourseCycleProfessor): string {
  return [professor.firstName, professor.lastName1, professor.lastName2]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getEvaluationTypeMeta(code: string): {
  label: string;
  bg: string;
  text: string;
} {
  const normalized = code.toUpperCase();
  if (normalized.startsWith("PC")) {
    return {
      label: "Practica Calificada",
      bg: "bg-bg-info-secondary-light",
      text: "text-text-info-secondary",
    };
  }

  if (normalized.startsWith("EX")) {
    return {
      label: "Examen",
      bg: "bg-bg-success-light",
      text: "text-text-success-primary",
    };
  }

  return {
    label: normalized,
    bg: "bg-bg-secondary",
    text: "text-text-secondary",
  };
}

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
  const [activeTab, setActiveTab] = useState<EditTab>("structure");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<AdminCourseCycleStudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsSearch, setStudentsSearch] = useState("");
  const [debouncedStudentsSearch, setDebouncedStudentsSearch] = useState("");
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsTotalItems, setStudentsTotalItems] = useState(0);
  const [studentsTotalPages, setStudentsTotalPages] = useState(0);
  const [cancelEnrollmentId, setCancelEnrollmentId] = useState<string | null>(
    null,
  );
  const [cancelEnrollmentName, setCancelEnrollmentName] = useState<
    string | null
  >(null);
  const [cancelEnrollmentLoading, setCancelEnrollmentLoading] = useState(false);

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
          label: "Gestion de Cursos",
          href: "/plataforma/admin/cursos",
        },
        { label: "Curso", href: `/plataforma/curso/${cursoId}` },
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStudentsSearch(studentsSearch);
      setStudentsPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [studentsSearch]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const response = await enrollmentService.getAdminStudentsByCourseCycle({
        courseCycleId: cursoId,
        page: studentsPage,
        pageSize: STUDENTS_PAGE_SIZE,
        search: debouncedStudentsSearch.trim() || undefined,
      });

      setStudents(response.items);
      setStudentsTotalItems(response.totalItems);
      setStudentsTotalPages(response.totalPages);
    } catch (err) {
      console.error("Error al cargar alumnos matriculados:", err);
      showToast({
        type: "error",
        title: "No se pudieron cargar los alumnos",
        description:
          err instanceof Error ? err.message : "Ocurrio un error inesperado.",
      });
    } finally {
      setStudentsLoading(false);
    }
  }, [cursoId, studentsPage, debouncedStudentsSearch, showToast]);

  useEffect(() => {
    if (!cursoId) return;
    if (activeTab !== "students") return;
    loadStudents();
  }, [cursoId, activeTab, loadStudents]);

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

  const evaluations = orderedEvaluations;
  const studentsRangeStart =
    studentsTotalItems === 0 ? 0 : (studentsPage - 1) * STUDENTS_PAGE_SIZE + 1;
  const studentsRangeEnd = Math.min(
    studentsPage * STUDENTS_PAGE_SIZE,
    studentsTotalItems,
  );
  const studentsPageNumbers = getPageNumbers(
    Math.min(studentsPage, Math.max(1, studentsTotalPages || 1)),
    Math.max(1, studentsTotalPages || 1),
  );
  const evaluationOrderChanged =
    initialEvaluationOrder.length !== evaluations.length ||
    initialEvaluationOrder.some(
      (evaluationId, index) => evaluations[index]?.id !== evaluationId,
    );
  const isDirty =
    Boolean(courseCycle) &&
    (courseName !== courseCycle.course.name ||
      courseCode !== courseCycle.course.code ||
      selectedTypeName !== initialTypeName ||
      evaluationOrderChanged);

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

  const handleSave = async () => {
    if (!evaluationOrderChanged) {
      showToast({
        type: "info",
        title: "Guardado pendiente",
        description:
          "La edicion general del curso aun no esta conectada. Por ahora solo se puede guardar el orden de evaluaciones.",
      });
      return;
    }

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
    }
  };

  const handlePendingAction = (action: string) => {
    showToast({
      type: "info",
      title: `${action} pendiente`,
      description: `La accion de ${action.toLowerCase()} se habilitara en el siguiente paso.`,
    });
  };

  const handleCancelEnrollment = async () => {
    if (!cancelEnrollmentId) return;

    setCancelEnrollmentLoading(true);
    try {
      await enrollmentService.cancel(cancelEnrollmentId);
      setCancelEnrollmentId(null);
      setCancelEnrollmentName(null);
      showToast({
        type: "success",
        title: "Matricula cancelada",
        description: "La matricula del alumno se cancelo correctamente.",
      });
      await loadStudents();
    } catch (err) {
      console.error("Error al cancelar matricula:", err);
      showToast({
        type: "error",
        title: "No se pudo cancelar la matricula",
        description:
          err instanceof Error ? err.message : "Ocurrio un error inesperado.",
      });
    } finally {
      setCancelEnrollmentLoading(false);
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
      <button
        onClick={() => router.push(`/plataforma/curso/${cursoId}`)}
        className="p-1 rounded-lg inline-flex justify-center items-center gap-2 hover:bg-bg-accent-light transition-colors"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          Volver a {courseCycle.course.name}
        </span>
      </button>

      <div className="self-stretch text-text-primary text-3xl font-semibold leading-8">
        Editar Curso
      </div>

      <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
        <div className="self-stretch inline-flex justify-start items-start gap-2">
          <Icon name="info" size={20} className="text-icon-info-secondary" />
          <div className="flex-1 text-text-primary text-lg font-semibold leading-5">
            Informacion General
          </div>
        </div>
        <div className="self-stretch flex flex-col justify-start items-start gap-4">
          <FloatingInput
            id="course-name"
            label="Nombre del Curso"
            value={courseName}
            onChange={setCourseName}
          />
          <FloatingInput
            id="course-code"
            label="Abreviatura del Curso"
            value={courseCode}
            onChange={setCourseCode}
          />
          <FloatingSelect
            label="Unidad"
            value={selectedType}
            options={typeOptions}
            onChange={setSelectedType}
            allLabel="Selecciona una unidad"
            className="w-full"
            variant="floating"
            size="large"
          />
          <div className="self-stretch relative inline-flex flex-col justify-start items-start gap-1">
            <div className="self-stretch min-h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
              <div className="flex-1 flex justify-start items-center gap-2 flex-wrap">
                {courseCycle.professors.length === 0 ? (
                  <span className="text-text-tertiary text-base font-normal leading-4">
                    Sin asesores asignados
                  </span>
                ) : (
                  courseCycle.professors.map((professor) => (
                    <div
                      key={professor.id}
                      className="px-2.5 py-1.5 bg-bg-info-primary-light rounded-full flex justify-center items-center gap-1"
                    >
                      <span className="text-text-info-primary text-xs font-medium leading-3">
                        {getProfessorDisplayName(professor)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePendingAction("Editar asesores")}
                        className="inline-flex items-center justify-center"
                      >
                        <Icon
                          name="close"
                          size={14}
                          className="text-icon-info-primary"
                          variant="outlined"
                        />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => handlePendingAction("Editar asesores")}
              >
                <Icon
                  name="expand_more"
                  size={16}
                  className="text-icon-tertiary"
                />
              </button>
            </div>
            <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
              <span className="text-text-tertiary text-xs font-normal leading-4">
                Asesor asignado
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-1 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-center items-center">
        <button
          onClick={() => setActiveTab("structure")}
          className={`px-6 py-3 rounded-lg flex justify-center items-center gap-2 ${activeTab === "structure" ? "bg-bg-accent-primary-solid" : "bg-bg-primary"}`}
        >
          <div
            className={`text-center text-base leading-4 ${activeTab === "structure" ? "text-text-white font-medium" : "text-text-secondary font-normal"}`}
          >
            Gestion de Estructura
          </div>
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`px-6 py-3 rounded-lg flex justify-center items-center gap-2 ${activeTab === "students" ? "bg-bg-accent-primary-solid" : "bg-bg-primary"}`}
        >
          <div
            className={`text-center text-base leading-4 ${activeTab === "students" ? "text-text-white font-medium" : "text-text-secondary font-normal"}`}
          >
            Gestion de Alumnos
          </div>
        </button>
      </div>

      {activeTab === "structure" ? (
        <div className="self-stretch flex flex-col justify-start items-start gap-8">
          <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
            <div className="self-stretch inline-flex justify-start items-center gap-2">
              <Icon
                name="assignment"
                size={20}
                className="text-icon-info-secondary"
              />
              <div className="flex-1 text-text-primary text-lg font-semibold leading-5">
                Configuracion de Evaluaciones
              </div>
              <button
                onClick={() => handlePendingAction("Anadir evaluacion")}
                className="px-4 py-2 bg-bg-accent-primary-solid rounded flex justify-center items-center gap-1 hover:bg-bg-accent-solid-hover transition-colors"
              >
                <Icon name="add" size={14} className="text-icon-white" />
                <span className="text-text-white text-xs font-medium leading-4">
                  Anadir evaluacion
                </span>
              </button>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-3">
              {evaluations.map((evaluation) => {
                const typeMeta = getEvaluationTypeMeta(
                  evaluation.evaluationTypeCode,
                );
                const isDragging = draggedEvaluationId === evaluation.id;
                const isDragTarget =
                  dragOverEvaluationId === evaluation.id &&
                  draggedEvaluationId !== evaluation.id;
                return (
                  <div
                    key={evaluation.id}
                    draggable
                    onDragStart={() => {
                      setDraggedEvaluationId(evaluation.id);
                      setDragOverEvaluationId(evaluation.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (dragOverEvaluationId !== evaluation.id) {
                        setDragOverEvaluationId(evaluation.id);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedEvaluationId) {
                        moveEvaluation(draggedEvaluationId, evaluation.id);
                      }
                      setDraggedEvaluationId(null);
                      setDragOverEvaluationId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedEvaluationId(null);
                      setDragOverEvaluationId(null);
                    }}
                    className={`self-stretch p-4 bg-bg-primary rounded-2xl outline outline-1 outline-offset-[-1px] inline-flex justify-start items-center gap-6 flex-wrap lg:flex-nowrap transition-colors ${
                      isDragTarget
                        ? "outline-stroke-accent-primary bg-bg-accent-light"
                        : "outline-stroke-secondary"
                    } ${isDragging ? "opacity-60" : ""}`}
                  >
                    <div className="flex-1 flex justify-start items-center gap-6 min-w-[260px]">
                      <button
                        type="button"
                        onClick={(event) => event.preventDefault()}
                        className="cursor-grab active:cursor-grabbing rounded-lg p-1 hover:bg-bg-secondary transition-colors"
                        title="Arrastra para reordenar"
                      >
                        <Icon
                          name="drag_indicator"
                          size={28}
                          className="text-gray-500"
                        />
                      </button>
                      <div className="inline-flex flex-col justify-start items-start gap-1">
                        <div className="text-text-primary text-lg font-medium leading-5">
                          {evaluation.fullName}
                        </div>
                        <div className="inline-flex justify-start items-start gap-4">
                          <div className="flex justify-start items-center gap-1">
                            <Icon
                              name="collections_bookmark"
                              size={12}
                              className="text-icon-tertiary"
                            />
                            <div className="text-text-quartiary text-xs font-normal leading-4">
                              {evaluation.shortName}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end items-center gap-4 flex-wrap ml-auto">
                      <span
                        className={`px-2.5 py-1.5 ${typeMeta.bg} rounded-full flex justify-center items-center gap-1`}
                      >
                        <span
                          className={`${typeMeta.text} text-xs font-medium leading-3`}
                        >
                          {typeMeta.label}
                        </span>
                      </span>
                      <div className="flex justify-start items-center gap-2">
                        <button
                          onClick={() =>
                            handlePendingAction("Editar evaluacion")
                          }
                          className="p-0.5 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                        >
                          <Icon
                            name="edit"
                            size={16}
                            className="text-icon-tertiary"
                          />
                        </button>
                        <button
                          onClick={() =>
                            handlePendingAction("Eliminar evaluacion")
                          }
                          className="p-0.5 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                        >
                          <Icon
                            name="delete"
                            size={16}
                            className="text-icon-tertiary"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
            <div className="self-stretch inline-flex justify-start items-center gap-2">
              <Icon
                name="chrome_reader_mode"
                size={20}
                className="text-icon-info-secondary"
              />
              <div className="flex-1 text-text-primary text-lg font-semibold leading-5">
                Banco de Enunciados
              </div>
              <button
                onClick={() => handlePendingAction("Anadir carpeta al banco")}
                className="px-4 py-2 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1 hover:bg-bg-accent-light transition-colors"
              >
                <Icon
                  name="create_new_folder"
                  size={14}
                  className="text-icon-accent-primary"
                />
                <span className="text-text-accent-primary text-xs font-medium leading-4">
                  Anadir carpeta
                </span>
              </button>
            </div>
            <div className="self-stretch grid grid-cols-1 md:grid-cols-2 gap-4">
              {(bankStructure?.items || []).map((item) => {
                const typeMeta = getEvaluationTypeMeta(item.evaluationTypeCode);
                return (
                  <div
                    key={item.evaluationTypeId}
                    className="min-h-52 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-between items-start gap-6"
                  >
                    <div className="self-stretch flex flex-col justify-start items-start gap-4">
                      <div
                        className={`p-3 ${typeMeta.bg} rounded-xl inline-flex justify-start items-center`}
                      >
                        <Icon
                          name="folder"
                          size={24}
                          className={typeMeta.text}
                        />
                      </div>
                      <div className="self-stretch flex flex-col justify-start items-start gap-1">
                        <div className="self-stretch text-text-primary text-lg font-semibold leading-5">
                          {item.evaluationTypeName}
                        </div>
                        <div className="self-stretch text-text-secondary text-xs font-normal leading-4">
                          Contiene {item.entries?.length || 0} evaluaciones.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handlePendingAction("Gestionar enunciados")
                      }
                      className="px-1 py-1.5 rounded-lg inline-flex justify-center items-center gap-2 hover:bg-bg-accent-light transition-colors"
                    >
                      <span className="text-text-accent-primary text-base font-medium leading-4">
                        Gestionar Enunciados
                      </span>
                    </button>
                  </div>
                );
              })}
              {!bankStructure?.items?.length && (
                <div className="md:col-span-2 self-stretch p-6 bg-bg-secondary rounded-xl border border-dashed border-stroke-secondary text-text-tertiary text-sm">
                  No hay estructura de banco configurada para este curso.
                </div>
              )}
            </div>
          </div>

          <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
            <div className="self-stretch inline-flex justify-start items-center gap-2">
              <Icon
                name="article"
                size={20}
                className="text-icon-info-secondary"
              />
              <div className="flex-1 text-text-primary text-lg font-semibold leading-5">
                Material Adicional
              </div>
              <button
                onClick={() =>
                  handlePendingAction("Anadir carpeta de material")
                }
                className="px-4 py-2 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex justify-center items-center gap-1 hover:bg-bg-accent-light transition-colors"
              >
                <Icon
                  name="create_new_folder"
                  size={14}
                  className="text-icon-accent-primary"
                />
                <span className="text-text-accent-primary text-xs font-medium leading-4">
                  Anadir carpeta
                </span>
              </button>
            </div>
            <div className="self-stretch grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Enunciados", "Resumenes"].map((label) => (
                <div
                  key={label}
                  className="min-h-52 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-between items-start gap-6"
                >
                  <div className="self-stretch flex flex-col justify-start items-start gap-4">
                    <div className="w-12 h-12 p-2 bg-bg-disabled rounded-xl inline-flex justify-center items-center">
                      <Icon
                        name="folder"
                        size={24}
                        className="text-icon-disabled"
                      />
                    </div>
                    <div className="self-stretch flex flex-col justify-start items-start gap-1">
                      <div className="self-stretch text-text-primary text-lg font-semibold leading-5">
                        {label}
                      </div>
                      <div className="self-stretch text-text-secondary text-xs font-normal leading-4">
                        Gestion de material adicional pendiente de integracion.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePendingAction("Gestionar material")}
                    className="px-1 py-1.5 rounded-lg inline-flex justify-center items-center gap-2 hover:bg-bg-accent-light transition-colors"
                  >
                    <span className="text-text-accent-primary text-base font-medium leading-4">
                      Gestionar Material
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="self-stretch p-6 bg-bg-primary rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-slate-100 inline-flex flex-col justify-start items-start gap-6">
          <div className="self-stretch inline-flex justify-start items-center gap-5">
            <div className="flex-1 flex justify-start items-center gap-2">
              <Icon
                name="school"
                size={20}
                className="text-icon-info-secondary"
              />
              <div className="justify-center text-text-primary text-lg font-semibold leading-5">
                Gestion de Alumnos
              </div>
            </div>
            <div className="w-28 h-6" />
          </div>

          <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2 focus-within:outline-stroke-accent-secondary transition-colors">
            <Icon name="search" size={16} className="text-icon-tertiary" />
            <input
              type="text"
              value={studentsSearch}
              onChange={(event) => setStudentsSearch(event.target.value)}
              placeholder="Buscar nombre o correo para matricular..."
              className="flex-1 bg-transparent outline-none text-text-primary text-base font-normal leading-4 placeholder:text-text-tertiary"
            />
          </div>

          <div className="self-stretch flex flex-col justify-start items-start gap-5">
            <div className="self-stretch justify-center text-text-quartiary text-sm font-semibold leading-4">
              Alumnos Matriculados
            </div>
            <div className="self-stretch bg-bg-primary rounded-xl outline outline-1 outline-stroke-primary flex flex-col justify-start items-start overflow-hidden">
              <div className="self-stretch overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr>
                      <th className="h-12 p-4 bg-bg-tertiary rounded-tl-xl border-b border-stroke-primary text-left">
                        <span className="text-text-secondary text-sm font-medium leading-4">
                          Nombre Completo
                        </span>
                      </th>
                      <th className="h-12 p-4 bg-bg-tertiary border-b border-stroke-primary text-left">
                        <span className="text-text-secondary text-sm font-medium leading-4">
                          Correo Electrónico
                        </span>
                      </th>
                      <th className="h-12 p-4 bg-bg-tertiary rounded-tr-xl border-b border-stroke-primary text-center w-24">
                        <span className="text-text-secondary text-sm font-medium leading-4">
                          Acciones
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsLoading ? (
                      <tr>
                        <td colSpan={3} className="py-16 text-center">
                          <div className="w-8 h-8 border-3 border-accent-solid border-t-transparent rounded-full animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Icon
                              name="school"
                              size={32}
                              className="text-icon-tertiary"
                            />
                            <span className="text-text-tertiary text-sm">
                              No se encontraron alumnos matriculados
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      students.map((student) => (
                        <tr
                          key={student.enrollmentId}
                          className="border-b border-stroke-primary last:border-b-0"
                        >
                          <td className="h-14 px-4 py-2">
                            <div className="flex-1 justify-start text-text-tertiary text-sm font-normal leading-4 line-clamp-2">
                              {student.fullName}
                            </div>
                          </td>
                          <td className="h-14 px-4 py-2">
                            <div className="flex-1 justify-start text-text-tertiary text-sm font-normal leading-4 line-clamp-2">
                              {student.email}
                            </div>
                          </td>
                          <td className="h-14 px-4 py-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/plataforma/admin/usuarios/${student.userId}`,
                                  )
                                }
                                className="p-1 rounded-full hover:bg-bg-secondary transition-colors"
                                title="Ver usuario"
                              >
                                <Icon
                                  name="visibility"
                                  size={20}
                                  className="text-icon-tertiary"
                                />
                              </button>
                              <button
                                onClick={() => {
                                  setCancelEnrollmentId(student.enrollmentId);
                                  setCancelEnrollmentName(student.fullName);
                                }}
                                className="p-1 rounded-full hover:bg-bg-secondary transition-colors"
                                title="Cancelar matrícula"
                              >
                                <Icon
                                  name="person_remove"
                                  size={20}
                                  className="text-icon-tertiary"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {studentsTotalItems > 0 && (
                <div className="self-stretch px-4 py-3 flex flex-col justify-start items-start gap-2.5">
                  <div className="self-stretch inline-flex justify-between items-center">
                    <div className="flex justify-center items-center gap-1">
                      <div className="justify-start text-text-tertiary text-sm font-normal leading-4">
                        Mostrando
                      </div>
                      <div className="flex justify-start items-center">
                        <div className="justify-start text-text-tertiary text-sm font-medium leading-4">
                          {studentsRangeStart}
                        </div>
                        <div className="justify-start text-text-tertiary text-sm font-medium leading-4">
                          -
                        </div>
                        <div className="justify-start text-text-tertiary text-sm font-medium leading-4">
                          {studentsRangeEnd}
                        </div>
                      </div>
                      <div className="justify-start text-text-tertiary text-sm font-normal leading-4">
                        de
                      </div>
                      <div className="justify-start text-text-tertiary text-sm font-medium leading-4">
                        {studentsTotalItems}
                      </div>
                    </div>
                    <div className="flex justify-start items-center gap-2">
                      <button
                        onClick={() =>
                          setStudentsPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={studentsPage === 1}
                        className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1 overflow-hidden disabled:opacity-40"
                      >
                        <Icon
                          name="chevron_left"
                          size={16}
                          className="text-icon-tertiary"
                        />
                      </button>
                      <div className="flex justify-start items-center gap-2">
                        {studentsPageNumbers.map((page, idx) =>
                          page === "..." ? (
                            <span
                              key={`students-dots-${idx}`}
                              className="min-w-8 px-1 py-2 text-text-tertiary text-sm font-normal leading-4"
                            >
                              ...
                            </span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => setStudentsPage(page)}
                              className={`min-w-8 px-1 py-2 rounded-lg inline-flex flex-col justify-center items-center ${
                                page === studentsPage
                                  ? "bg-bg-accent-primary-solid text-text-white text-sm font-medium leading-4"
                                  : "text-text-tertiary text-sm font-normal leading-4 hover:bg-bg-secondary"
                              }`}
                            >
                              {page}
                            </button>
                          ),
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setStudentsPage((prev) =>
                            Math.min(Math.max(1, studentsTotalPages), prev + 1),
                          )
                        }
                        disabled={
                          studentsPage >= Math.max(1, studentsTotalPages)
                        }
                        className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1 overflow-hidden disabled:opacity-40"
                      >
                        <Icon
                          name="chevron_right"
                          size={16}
                          className="text-icon-tertiary"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="self-stretch inline-flex justify-end items-center gap-4">
        <button
          onClick={() => router.push(`/plataforma/curso/${cursoId}`)}
          className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1.5 hover:bg-bg-secondary transition-colors"
        >
          <span className="text-text-tertiary text-sm font-medium leading-4">
            Cancelar
          </span>
        </button>
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className={`px-6 py-3 rounded-lg flex justify-center items-center gap-1.5 ${isDirty ? "bg-bg-accent-primary-solid hover:bg-bg-accent-solid-hover" : "bg-bg-disabled cursor-not-allowed"}`}
        >
          <span
            className={`${isDirty ? "text-text-white" : "text-text-disabled"} text-sm font-medium leading-4`}
          >
            Guardar
          </span>
        </button>
      </div>

      <Modal
        isOpen={Boolean(cancelEnrollmentId)}
        onClose={() => {
          if (cancelEnrollmentLoading) return;
          setCancelEnrollmentId(null);
          setCancelEnrollmentName(null);
        }}
        title="Cancelar matrícula"
        size="sm"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => {
                setCancelEnrollmentId(null);
                setCancelEnrollmentName(null);
              }}
              disabled={cancelEnrollmentLoading}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              variant="danger"
              onClick={handleCancelEnrollment}
              loading={cancelEnrollmentLoading}
              loadingText="Cancelando..."
            >
              Retirar alumno
            </Modal.Button>
          </>
        }
      >
        <p className="text-text-secondary text-sm leading-5">
          {cancelEnrollmentName
            ? `Se cancelará la matrícula de ${cancelEnrollmentName} en este curso.`
            : "Se cancelará la matrícula del alumno en este curso."}
        </p>
      </Modal>
    </div>
  );
}

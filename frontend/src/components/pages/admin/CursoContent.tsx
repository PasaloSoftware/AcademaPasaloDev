"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/components/ui/ToastContainer";
import {
  coursesService,
  type AdminCourseCycleItem,
  type AdminCourseCycleListResponse,
} from "@/services/courses.service";
import {
  enrollmentService,
  type AdminCourseCycleStudentItem,
} from "@/services/enrollment.service";
import { getCourseColor } from "@/lib/courseColors";
import type { CurrentCycleResponse } from "@/types/curso";
import type { Course } from "@/types/api";

interface CursoContentProps {
  cursoId: string;
}

const STUDENTS_PAGE_SIZE = 10;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

const COURSE_TYPE_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  Ciencias: {
    bg: "bg-bg-success-light",
    text: "text-text-success-primary",
    label: "CIENCIAS",
  },
  Letras: {
    bg: "bg-bg-warning-light",
    text: "text-text-warning-primary",
    label: "LETRAS",
  },
  Facultad: {
    bg: "bg-bg-info-primary-light",
    text: "text-text-info-primary",
    label: "FACULTAD",
  },
};

function normalizeCourseTypeName(name?: string | null): string {
  if (!name) return "Sin unidad";
  const normalized = name.trim().toLowerCase();
  if (normalized === "ciencias") return "Ciencias";
  if (normalized === "letras") return "Letras";
  if (normalized === "facultad") return "Facultad";
  return name.trim();
}

function getProfessorInitials(firstName: string, lastName1: string): string {
  return `${firstName[0] || "X"}${lastName1[0] || "X"}`.toUpperCase();
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

function CourseTypeTag({ type }: { type: string }) {
  const style = COURSE_TYPE_STYLES[type] || {
    bg: "bg-bg-secondary",
    text: "text-text-secondary",
    label: type.toUpperCase(),
  };

  return (
    <span
      className={`px-2.5 py-1.5 ${style.bg} rounded-full inline-flex justify-center items-center gap-1`}
    >
      <span className={`${style.text} text-xs font-medium leading-3`}>
        {style.label}
      </span>
    </span>
  );
}

function StatusTag({ active }: { active: boolean }) {
  return (
    <span
      className={`px-2.5 py-1.5 rounded-full inline-flex justify-center items-center gap-1 ${active ? "bg-bg-success-light" : "bg-bg-tertiary"}`}
    >
      <span
        className={`${active ? "text-text-success-primary" : "text-text-disabled"} text-xs font-medium leading-3`}
      >
        {active ? "ACTIVO" : "INACTIVO"}
      </span>
    </span>
  );
}

export default function CursoContent({ cursoId }: CursoContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [courseCycle, setCourseCycle] = useState<AdminCourseCycleItem | null>(
    null,
  );
  const [course, setCourse] = useState<Course | null>(null);
  const [courseTypeName, setCourseTypeName] = useState("Sin unidad");
  const [currentContent, setCurrentContent] =
    useState<CurrentCycleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
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

  const loadCourseDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [catalog, content, firstPage] = await Promise.all([
        coursesService.findAll(),
        coursesService.getCourseContent(cursoId),
        coursesService.getAdminCourseCycles({ page: 1, pageSize: 100 }),
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
      if (!selectedCourse) {
        throw new Error("No se encontro la materia del curso solicitado.");
      }

      setCourseCycle(selectedCycle);
      setCourse(selectedCourse);
      setCurrentContent(content);
      setCourseTypeName(
        normalizeCourseTypeName(selectedCourse.courseType?.name),
      );
      setBreadcrumbItems([
        {
          icon: "class",
          label: "Gestion de Cursos",
          href: "/plataforma/admin/cursos",
        },
        { label: "Curso" },
      ]);
    } catch (err) {
      console.error("Error al cargar detalle del curso:", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar el curso.",
      );
    } finally {
      setLoading(false);
    }
  }, [cursoId, setBreadcrumbItems]);

  useEffect(() => {
    if (!cursoId) return;
    loadCourseDetail();
  }, [cursoId, loadCourseDetail]);

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
    loadStudents();
  }, [cursoId, loadStudents]);

  const courseColors = useMemo(
    () => getCourseColor(courseCycle?.course.code || cursoId),
    [courseCycle?.course.code, cursoId],
  );

  const evaluations = currentContent?.evaluations || [];
  const professorNames =
    courseCycle?.professors
      .map((professor) =>
        `${professor.firstName} ${professor.lastName1}`.trim(),
      )
      .join(" & ") || "Sin asignar";
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

  const handleToggleStatus = async () => {
    if (!course) return;

    setStatusSaving(true);
    try {
      const updated = await coursesService.updateStatus(
        course.id,
        !course.isActive,
      );
      setCourse(updated);
      setStatusModalOpen(false);
      showToast({
        type: "success",
        title: updated.isActive ? "Curso activado" : "Curso inactivado",
        description: updated.isActive
          ? "La materia vuelve a estar disponible en el panel administrativo."
          : "La materia fue desactivada correctamente.",
      });
    } catch (err) {
      console.error("Error al actualizar estado del curso:", err);
      showToast({
        type: "error",
        title: "No se pudo actualizar el estado",
        description:
          err instanceof Error ? err.message : "Ocurrio un error inesperado.",
      });
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!course) return;

    setDeleteSaving(true);
    try {
      await coursesService.delete(course.id);
      setDeleteModalOpen(false);
      showToast({
        type: "success",
        title: "Curso eliminado",
        description: "La materia se elimino correctamente.",
      });
      router.push("/plataforma/admin/cursos");
    } catch (err) {
      console.error("Error al eliminar curso:", err);
      showToast({
        type: "error",
        title: "No se pudo eliminar el curso",
        description:
          err instanceof Error ? err.message : "Ocurrio un error inesperado.",
      });
    } finally {
      setDeleteSaving(false);
    }
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
          <p className="text-secondary">Cargando detalle del curso...</p>
        </div>
      </div>
    );
  }

  if (error || !courseCycle || !course) {
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
          No pudimos cargar el detalle administrativo del curso.
        </p>
        <button
          onClick={() => router.push("/plataforma/admin/cursos")}
          className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg text-text-white text-sm font-medium leading-4 hover:bg-bg-accent-solid-hover transition-colors"
        >
          Volver a Gestion de Cursos
        </button>
      </div>
    );
  }

  return (
    <div className="w-full inline-flex flex-col justify-start items-start gap-8 overflow-hidden">
      <button
        onClick={() => router.push("/plataforma/admin/cursos")}
        className="p-1 rounded-lg inline-flex justify-center items-center gap-2 hover:bg-bg-accent-light transition-colors"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          Volver a Gestion de Cursos
        </span>
      </button>

      <div className="self-stretch grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_192px] gap-4 items-start">
        <div className="flex self-stretch">
          <div
            className="w-5 rounded-tl-xl rounded-bl-xl"
            style={{ backgroundColor: courseColors.primary }}
          />
          <div className="flex-1 p-6 relative bg-bg-primary rounded-tr-xl rounded-br-xl border-r border-t border-b border-stroke-secondary flex justify-start items-center gap-8 overflow-hidden">
            <div
              className="w-24 h-24 left-[-50px] top-[128px] absolute rounded-full opacity-20"
              style={{ backgroundColor: courseColors.primary }}
            />
            <div className="flex-1 inline-flex flex-col justify-start items-start gap-4 z-10">
              <div className="self-stretch flex flex-col justify-start items-start">
                <div className="self-stretch text-text-primary text-2xl font-bold leading-7">
                  {courseCycle.course.name}
                </div>
                <div className="self-stretch text-text-info-primary text-base font-medium leading-5">
                  {courseCycle.course.code}
                </div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-2 flex-wrap">
                <CourseTypeTag type={courseTypeName} />
                <StatusTag active={course.isActive} />
              </div>
            </div>
            <div
              className="w-32 h-32 right-[-48px] top-[-66px] absolute rounded-full opacity-15"
              style={{ backgroundColor: courseColors.primary }}
            />
          </div>
        </div>

        <div className="w-full p-5 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-center items-start gap-2 overflow-hidden">
          <div className="self-stretch text-text-tertiary text-base font-semibold leading-5">
            Acciones
          </div>
          <div className="self-stretch flex flex-col justify-start items-start">
            <button
              onClick={() => router.push(`/plataforma/curso/${cursoId}/editar`)}
              className="self-stretch p-2 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors"
            >
              <Icon name="edit" size={20} className="text-icon-secondary" />
              <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                Editar
              </span>
            </button>
            <button
              onClick={() => setStatusModalOpen(true)}
              className="self-stretch p-2 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors"
            >
              <Icon
                name={course.isActive ? "person_off" : "check_circle"}
                size={20}
                className="text-icon-secondary"
              />
              <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                {course.isActive ? "Inactivar" : "Activar"}
              </span>
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="self-stretch p-2 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors"
            >
              <Icon name="delete" size={20} className="text-icon-secondary" />
              <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                Eliminar
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
        <div className="self-stretch inline-flex justify-start items-start gap-2">
          <Icon name="person" size={20} className="text-icon-info-secondary" />
          <div className="flex-1 text-text-primary text-lg font-semibold leading-5">
            Detalle del Curso
          </div>
        </div>
        <div className="self-stretch flex flex-col justify-start items-start gap-6">
          <div className="self-stretch inline-flex justify-start items-start gap-6 flex-wrap content-start">
            <div className="flex-1 min-w-[280px] inline-flex flex-col justify-start items-start gap-1">
              <div className="self-stretch text-gray-600 text-sm font-semibold leading-4">
                Asesor
              </div>
              <div className="self-stretch inline-flex justify-start items-center gap-1.5">
                <div className="flex -space-x-2">
                  {courseCycle.professors.length > 0 ? (
                    courseCycle.professors
                      .slice(0, 2)
                      .map((professor, index) => (
                        <div
                          key={professor.id}
                          className={`w-7 h-7 rounded-full border border-stroke-white overflow-hidden flex items-center justify-center ${index === 0 ? "bg-bg-success-solid" : "bg-bg-info-primary-solid"}`}
                        >
                          {professor.profilePhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={professor.profilePhotoUrl}
                              alt={`${professor.firstName} ${professor.lastName1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-center text-text-white text-[8px] font-medium leading-[10px]">
                              {getProfessorInitials(
                                professor.firstName,
                                professor.lastName1,
                              )}
                            </span>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-bg-disabled flex items-center justify-center">
                      <span className="text-center text-text-disabled text-[8px] font-medium leading-[10px]">
                        --
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 inline-flex flex-col justify-center items-start gap-0.5">
                  <div className="self-stretch text-text-secondary text-sm font-normal leading-4 line-clamp-2">
                    {professorNames}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[180px] inline-flex flex-col justify-start items-start gap-1">
              <div className="self-stretch text-gray-600 text-sm font-semibold leading-4">
                Alumnos matriculados
              </div>
              <div className="self-stretch text-text-primary text-base font-medium leading-4">
                {studentsTotalItems}
              </div>
            </div>
            <div className="flex-1 min-w-[180px] inline-flex flex-col justify-start items-start gap-1">
              <div className="self-stretch text-gray-600 text-sm font-semibold leading-4">
                Ciclo
              </div>
              <div className="self-stretch text-text-primary text-base font-medium leading-4">
                {courseCycle.academicCycle.code}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="self-stretch grid grid-cols-1 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)] 2xl:grid-cols-[minmax(0,1.22fr)_minmax(380px,0.86fr)] gap-8 items-start">
        <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start gap-6">
          <div className="self-stretch inline-flex justify-start items-center gap-5">
            <div className="flex-1 flex justify-start items-center gap-2">
              <Icon
                name="school"
                size={20}
                className="text-icon-info-secondary"
              />
              <div className="text-text-primary text-lg font-semibold leading-5">
                Gestion de Alumnos
              </div>
            </div>
          </div>
          <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2 focus-within:outline-stroke-accent-secondary transition-colors">
            <Icon name="search" size={16} className="text-icon-tertiary" />
            <input
              type="text"
              value={studentsSearch}
              onChange={(e) => setStudentsSearch(e.target.value)}
              placeholder="Buscar nombre o correo para matricular..."
              className="flex-1 bg-transparent outline-none text-text-primary text-base font-normal leading-4 placeholder:text-text-tertiary"
            />
          </div>

          <div className="self-stretch inline-flex flex-col justify-start items-start gap-5">
            <div className="self-stretch text-text-quartiary text-sm font-semibold leading-4">
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
                            <div className="text-text-tertiary text-sm font-normal leading-4 line-clamp-2">
                              {student.fullName}
                            </div>
                          </td>
                          <td className="h-14 px-4 py-2">
                            <div className="text-text-tertiary text-sm font-normal leading-4 line-clamp-2">
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
                <div className="self-stretch px-4 py-3 flex justify-between items-center">
                  <div className="flex justify-center items-center gap-1">
                    <div className="text-text-tertiary text-sm font-normal leading-4">
                      Mostrando
                    </div>
                    <div className="flex justify-start items-center">
                      <div className="text-text-tertiary text-sm font-medium leading-4">
                        {studentsRangeStart}
                      </div>
                      <div className="text-text-tertiary text-sm font-medium leading-4">
                        -
                      </div>
                      <div className="text-text-tertiary text-sm font-medium leading-4">
                        {studentsRangeEnd}
                      </div>
                    </div>
                    <div className="text-text-tertiary text-sm font-normal leading-4">
                      de
                    </div>
                    <div className="text-text-tertiary text-sm font-medium leading-4">
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
                            className={`min-w-8 px-1 py-2 rounded-lg text-sm leading-4 ${
                              page === studentsPage
                                ? "bg-bg-accent-primary-solid text-text-white font-medium"
                                : "text-text-tertiary font-normal hover:bg-bg-secondary"
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
                      disabled={studentsPage >= Math.max(1, studentsTotalPages)}
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
              )}
            </div>
          </div>
        </div>

        <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start gap-6">
          <div className="self-stretch inline-flex justify-start items-start gap-2">
            <Icon
              name="assignment"
              size={20}
              className="text-icon-info-secondary"
            />
            <div className="flex-1 text-text-primary text-lg font-semibold leading-5">
              Estructura de Evaluaciones
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-3">
            {evaluations.length === 0 ? (
              <div className="self-stretch p-6 bg-bg-primary rounded-2xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary text-text-tertiary text-sm">
                Este curso aun no tiene evaluaciones configuradas.
              </div>
            ) : (
              evaluations.map((evaluation) => {
                const typeMeta = getEvaluationTypeMeta(
                  evaluation.evaluationTypeCode,
                );
                return (
                  <div
                    key={evaluation.id}
                    className="self-stretch p-4 bg-bg-primary rounded-2xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-start items-center gap-6"
                  >
                    <div className="flex-1 flex justify-start items-center gap-6">
                      <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                        <div className="self-stretch inline-flex justify-start items-start gap-2 flex-wrap">
                          <div className="flex-1 min-w-[220px] text-text-primary text-lg font-medium leading-5">
                            {evaluation.fullName}
                          </div>
                          <span
                            className={`px-2.5 py-1.5 ${typeMeta.bg} rounded-full flex justify-center items-center gap-1`}
                          >
                            <span
                              className={`${typeMeta.text} text-xs font-medium leading-3`}
                            >
                              {typeMeta.label}
                            </span>
                          </span>
                        </div>
                        <div className="self-stretch inline-flex justify-start items-start gap-4">
                          <div className="self-stretch flex justify-start items-center gap-1">
                            <Icon
                              name="collections_bookmark"
                              size={12}
                              className="text-icon-tertiary"
                            />
                            <div className="text-gray-600 text-xs font-normal leading-4">
                              {evaluation.shortName}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={statusModalOpen}
        onClose={() => !statusSaving && setStatusModalOpen(false)}
        title={course.isActive ? "Inactivar curso" : "Activar curso"}
        size="sm"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => setStatusModalOpen(false)}
              disabled={statusSaving}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              variant={course.isActive ? "danger" : "primary"}
              onClick={handleToggleStatus}
              loading={statusSaving}
              loadingText={course.isActive ? "Inactivando..." : "Activando..."}
            >
              {course.isActive ? "Inactivar" : "Activar"}
            </Modal.Button>
          </>
        }
      >
        <p className="text-text-secondary text-sm leading-5">
          {course.isActive
            ? "La materia dejara de figurar como activa en el panel administrativo."
            : "La materia volvera a figurar como activa en el panel administrativo."}
        </p>
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !deleteSaving && setDeleteModalOpen(false)}
        title="Eliminar curso"
        size="sm"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteSaving}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              variant="danger"
              onClick={handleDeleteCourse}
              loading={deleteSaving}
              loadingText="Eliminando..."
            >
              Eliminar
            </Modal.Button>
          </>
        }
      >
        <p className="text-text-secondary text-sm leading-5">
          Esta accion eliminara la materia si no tiene curso-ciclos ni registros
          relacionados. Si existen dependencias, el sistema bloqueara la
          eliminacion.
        </p>
      </Modal>

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

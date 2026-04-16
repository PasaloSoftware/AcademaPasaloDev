"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastContainer";
import {
  enrollmentService,
  type AdminCourseCycleStudentItem,
} from "@/services/enrollment.service";

interface CourseStudentsManagementSectionProps {
  courseCycleId: string;
  enabled?: boolean;
  containerClassName?: string;
  headerTrailing?: ReactNode;
  onTotalItemsChange?: (totalItems: number) => void;
}

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

export default function CourseStudentsManagementSection({
  courseCycleId,
  enabled = true,
  containerClassName = "self-stretch p-6 bg-bg-primary rounded-xl border border-stroke-secondary inline-flex flex-col justify-start items-start gap-6",
  headerTrailing,
  onTotalItemsChange,
}: CourseStudentsManagementSectionProps) {
  const { showToast } = useToast();

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStudentsSearch(studentsSearch);
      setStudentsPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [studentsSearch]);

  const loadStudents = useCallback(async () => {
    if (!enabled) {
      setStudentsLoading(false);
      return;
    }

    setStudentsLoading(true);
    try {
      const response = await enrollmentService.getAdminStudentsByCourseCycle({
        courseCycleId,
        page: studentsPage,
        pageSize: STUDENTS_PAGE_SIZE,
        search: debouncedStudentsSearch.trim() || undefined,
      });

      setStudents(response.items);
      setStudentsTotalItems(response.totalItems);
      setStudentsTotalPages(response.totalPages);
      onTotalItemsChange?.(response.totalItems);
    } catch (err) {
      console.error("Error al cargar alumnos matriculados:", err);
      setStudents([]);
      setStudentsTotalItems(0);
      setStudentsTotalPages(0);
      onTotalItemsChange?.(0);
      showToast({
        type: "error",
        title: "No se pudieron cargar los alumnos",
        description:
          err instanceof Error ? err.message : "Ocurrio un error inesperado.",
      });
    } finally {
      setStudentsLoading(false);
    }
  }, [
    enabled,
    courseCycleId,
    studentsPage,
    debouncedStudentsSearch,
    onTotalItemsChange,
    showToast,
  ]);

  useEffect(() => {
    if (!courseCycleId || !enabled) return;
    loadStudents();
  }, [courseCycleId, enabled, loadStudents]);

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

  return (
    <>
      <div className={containerClassName}>
        <div className="self-stretch inline-flex justify-start items-center gap-5">
          <div className="flex-1 flex justify-start items-center gap-2">
            <Icon
              name="school"
              size={20}
              className="text-icon-info-secondary"
            />
            <div className="text-text-primary text-lg font-semibold leading-5">
              Gestión de Alumnos
            </div>
          </div>
          {headerTrailing}
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

        <div className="self-stretch inline-flex flex-col justify-start items-start gap-5">
          <div className="self-stretch text-text-quartiary text-sm font-semibold leading-4">
            Alumnos Matriculados
          </div>
          <div className="self-stretch bg-bg-primary rounded-xl outline outline-1 outline-stroke-primary flex flex-col justify-start items-start overflow-hidden">
            <div className="self-stretch overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className="h-12 w-[40%] p-4 bg-bg-tertiary rounded-tl-xl border-b border-stroke-primary text-left">
                      <span className="text-text-secondary text-sm font-medium leading-4">
                        Nombre Completo
                      </span>
                    </th>
                    <th className="h-12 w-[40%] p-4 bg-bg-tertiary border-b border-stroke-primary text-left">
                      <span className="text-text-secondary text-sm font-medium leading-4">
                        Correo Electrónico
                      </span>
                    </th>
                    <th className="h-12 w-16 p-4 bg-bg-tertiary rounded-tr-xl border-b border-stroke-primary text-center">
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
                          <div className="text-text-tertiary text-sm font-normal leading-4 break-words line-clamp-2">
                            {student.fullName}
                          </div>
                        </td>
                        <td className="h-14 px-4 py-2">
                          <div className="text-text-tertiary text-sm font-normal leading-4 break-all line-clamp-2">
                            {student.email}
                          </div>
                        </td>
                        <td className="h-14 px-2 py-2 align-middle">
                          <div className="flex h-full items-center justify-center">
                            <button
                              onClick={() => {
                                setCancelEnrollmentId(student.enrollmentId);
                                setCancelEnrollmentName(student.fullName);
                              }}
                              className="inline-flex items-center justify-center p-1 rounded-full leading-none hover:bg-bg-secondary transition-colors"
                              title="Cancelar matrícula"
                            >
                              <Icon
                                name="delete"
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
              <div className="border-t self-stretch px-4 py-3 flex justify-between items-center">
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
    </>
  );
}

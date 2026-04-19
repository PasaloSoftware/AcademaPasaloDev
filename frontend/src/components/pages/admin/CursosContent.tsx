"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import FloatingSelect from "@/components/ui/FloatingSelect";
import Modal from "@/components/ui/Modal";
import AdvancedFiltersSidebar from "@/components/pages/admin/AdvancedFiltersSidebar";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/components/ui/ToastContainer";
import {
  coursesService,
  type AdminCourseCycleItem,
  type AdminCourseCycleListResponse,
  type AdminCourseCycleProfessor,
} from "@/services/courses.service";
import type { Course } from "@/types/api";

type CourseSortField = "courseName" | "courseType" | "advisor" | "status";
type CourseSortOrder = "ASC" | "DESC";
type CourseStatusFilter = "ACTIVE" | "INACTIVE" | "";

type CourseManagementRow = {
  courseId: string;
  courseCode: string;
  courseName: string;
  courseTypeName: string;
  academicCycleCode: string | null;
  advisorLabel: string;
  studentCountLabel: string;
  isActive: boolean;
  courseCycleId: string | null;
};

const PAGE_SIZE = 10;
const COURSE_TYPE_FILTER_ORDER = ["Todos", "Ciencias", "Letras", "Facultad"];

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
    bg: "bg-warning-light",
    text: "text-text-warning-primary",
    label: "LETRAS",
  },
  Facultad: {
    bg: "bg-bg-info-primary-light",
    text: "text-text-info-primary",
    label: "FACULTAD",
  },
};

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

function normalizeCourseTypeName(name?: string | null): string {
  if (!name) return "Sin unidad";
  const normalized = name.trim().toLowerCase();
  if (normalized === "ciencias") return "Ciencias";
  if (normalized === "letras") return "Letras";
  if (normalized === "facultad") return "Facultad";
  return name.trim();
}

function pickPreferredCycle(
  courseCycles: AdminCourseCycleItem[],
): AdminCourseCycleItem | null {
  if (courseCycles.length === 0) return null;
  const currentCycle = courseCycles.find(
    (cycle) => cycle.academicCycle.isCurrent,
  );
  if (currentCycle) return currentCycle;

  return [...courseCycles].sort((a, b) => {
    const aTime = new Date(a.academicCycle.startDate).getTime();
    const bTime = new Date(b.academicCycle.startDate).getTime();
    return bTime - aTime;
  })[0];
}

function getAdvisorLabel(professors: AdminCourseCycleProfessor[]): string {
  if (professors.length === 0) return "Sin asignar";
  const names = professors
    .map((professor) =>
      [professor.firstName, professor.lastName1, professor.lastName2]
        .filter(Boolean)
        .join(" ")
        .trim(),
    )
    .filter(Boolean);

  if (names.length === 0) return "Sin asignar";
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}

function CourseTypeTag({ type }: { type: string }) {
  const style = COURSE_TYPE_STYLES[type] || {
    bg: "bg-bg-secondary",
    text: "text-text-secondary",
    label: type.toUpperCase(),
  };

  return (
    <span
      className={`px-2.5 py-1.5 ${style.bg} rounded-full inline-flex justify-center items-center whitespace-nowrap`}
    >
      <span className={`${style.text} text-xs font-medium leading-3`}>
        {style.label}
      </span>
    </span>
  );
}

export default function CursosContent() {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [rows, setRows] = useState<CourseManagementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [cycleFilter, setCycleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CourseStatusFilter>("");
  const [sortBy, setSortBy] = useState<CourseSortField>("courseName");
  const [sortOrder, setSortOrder] = useState<CourseSortOrder>("ASC");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarType, setSidebarType] = useState("Todos");
  const [sidebarCycle, setSidebarCycle] = useState<string | null>(null);
  const [sidebarStatus, setSidebarStatus] = useState<CourseStatusFilter>("");

  const [menuCourseId, setMenuCourseId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<CourseManagementRow | null>(
    null,
  );
  const [statusSaving, setStatusSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBreadcrumbItems([{ icon: "class", label: "Gestión de Cursos" }]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, cycleFilter, statusFilter]);

  useEffect(() => {
    if (!menuCourseId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuCourseId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuCourseId]);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, firstPage] = await Promise.all([
        coursesService.findAll(),
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

      const cyclesByCourseId = new Map<string, AdminCourseCycleItem[]>();
      for (const item of cycleItems) {
        const current = cyclesByCourseId.get(item.course.id) || [];
        current.push(item);
        cyclesByCourseId.set(item.course.id, current);
      }

      const mappedRows = catalog.map((course: Course) => {
        const relatedCycles = cyclesByCourseId.get(course.id) || [];
        const preferredCycle = pickPreferredCycle(relatedCycles);
        const courseTypeName = normalizeCourseTypeName(course.courseType?.name);

        return {
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          courseTypeName,
          academicCycleCode: preferredCycle?.academicCycle.code || null,
          advisorLabel: preferredCycle
            ? getAdvisorLabel(preferredCycle.professors)
            : "Sin asignar",
          studentCountLabel: preferredCycle
            ? String(preferredCycle.studentCount ?? 0)
            : "-",
          isActive: course.isActive,
          courseCycleId: preferredCycle?.courseCycleId || null,
        } satisfies CourseManagementRow;
      });

      setRows(mappedRows);
    } catch (error) {
      console.error("Error al cargar cursos:", error);
      showToast({
        type: "error",
        title: "No se pudieron cargar los cursos",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrio un error inesperado.",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const availableTypeFilters = useMemo(() => {
    const names = Array.from(
      new Set(rows.map((row) => row.courseTypeName).filter(Boolean)),
    );
    const sorted = names.sort((a, b) => {
      const ia = COURSE_TYPE_FILTER_ORDER.indexOf(a);
      const ib = COURSE_TYPE_FILTER_ORDER.indexOf(b);
      return (
        (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b)
      );
    });
    return ["Todos", ...sorted.filter((name) => name !== "Todos")];
  }, [rows]);

  const availableCycleOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.academicCycleCode).filter(Boolean)),
      )
        .sort((a, b) => String(b).localeCompare(String(a)))
        .map((cycle) => ({ value: String(cycle), label: String(cycle) })),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.courseName.toLowerCase().includes(term) ||
        row.courseCode.toLowerCase().includes(term);
      const matchesType =
        typeFilter === "Todos" || row.courseTypeName === typeFilter;
      const matchesCycle =
        !cycleFilter || row.academicCycleCode === cycleFilter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" ? row.isActive : !row.isActive);
      return matchesSearch && matchesType && matchesCycle && matchesStatus;
    });

    filtered.sort((a, b) => {
      let result = 0;
      if (sortBy === "courseName")
        result = a.courseName.localeCompare(b.courseName);
      if (sortBy === "courseType")
        result = a.courseTypeName.localeCompare(b.courseTypeName);
      if (sortBy === "advisor")
        result = a.advisorLabel.localeCompare(b.advisorLabel);
      if (sortBy === "status") result = Number(a.isActive) - Number(b.isActive);
      return sortOrder === "ASC" ? result : -result;
    });

    return filtered;
  }, [
    rows,
    debouncedSearch,
    typeFilter,
    cycleFilter,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalItems);
  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const activeFilterCount = [
    typeFilter !== "Todos",
    Boolean(cycleFilter),
    Boolean(statusFilter),
  ].filter(Boolean).length;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleSort = (field: CourseSortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
      return;
    }
    setSortBy(field);
    setSortOrder("ASC");
  };

  const openSidebar = () => {
    setSidebarType(typeFilter);
    setSidebarCycle(cycleFilter);
    setSidebarStatus(statusFilter);
    setSidebarOpen(true);
  };

  const applySidebarFilters = () => {
    setTypeFilter(sidebarType);
    setCycleFilter(sidebarCycle);
    setStatusFilter(sidebarStatus);
    setSidebarOpen(false);
  };

  const clearSidebarFilters = () => {
    setSidebarType("Todos");
    setSidebarCycle(null);
    setSidebarStatus("");
  };

  const handleCreateCourse = () => {
    router.push("/plataforma/admin/cursos/crear");
  };

  const goToCourse = (row: CourseManagementRow) => {
    if (!row.courseCycleId) {
      showToast({
        type: "info",
        title: "Curso sin ciclo disponible",
        description:
          "Este curso todavia no tiene un ciclo abierto para mostrar su detalle.",
      });
      return;
    }
    router.push(`/plataforma/curso/${encodeURIComponent(row.courseCycleId)}`);
  };

  const goToCourseEdit = (row: CourseManagementRow) => {
    if (!row.courseCycleId) {
      showToast({
        type: "info",
        title: "Curso sin ciclo disponible",
        description:
          "Este curso todavía no tiene un ciclo abierto para editar su configuración.",
      });
      return;
    }
    router.push(
      `/plataforma/curso/${encodeURIComponent(row.courseCycleId)}/editar`,
    );
  };

  const handleToggleCourseStatus = async () => {
    if (!statusTarget) return;

    setStatusSaving(true);
    try {
      const updated = await coursesService.updateStatus(
        statusTarget.courseId,
        !statusTarget.isActive,
      );
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.courseId === statusTarget.courseId
            ? { ...row, isActive: updated.isActive }
            : row,
        ),
      );
      setStatusTarget(null);
      showToast({
        type: "success",
        title: updated.isActive ? "Curso activado" : "Curso inactivado",
        description: updated.isActive
          ? "La materia vuelve a estar disponible en gestión de cursos."
          : "La materia fue desactivada correctamente.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "No se pudo actualizar el estado",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-text-primary text-3xl font-semibold leading-10">
          Gestión de Cursos
        </h1>
        <button
          onClick={handleCreateCourse}
          className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors"
        >
          <Icon name="add" size={16} className="text-icon-white" />
          <span className="text-text-white text-sm font-medium leading-4">
            Crear Curso
          </span>
        </button>
      </div>

      <div className="p-3 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex-1 h-10 px-2.5 py-3 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex items-center gap-2 focus-within:outline-stroke-accent-secondary transition-colors">
            <Icon name="search" size={16} className="text-icon-tertiary" />
            <input
              type="text"
              placeholder="Buscar por nombre"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-text-primary text-sm font-normal leading-4 bg-transparent outline-none placeholder:text-text-tertiary"
            />
          </div>

          <button
            onClick={openSidebar}
            className="h-10 px-6 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex items-center justify-center gap-1.5 hover:bg-bg-accent-light transition-colors"
          >
            <Icon
              name="filter_list"
              size={16}
              className="text-icon-accent-primary"
            />
            <span className="text-text-accent-primary text-sm font-medium leading-4">
              Filtros
            </span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-bg-accent-primary-solid rounded-full flex items-center justify-center text-text-white text-[10px] font-medium">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {availableTypeFilters.map((filter) => {
            const isActive = typeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setTypeFilter(filter)}
                className={`px-4 py-2 rounded-full text-sm font-medium leading-4 transition-colors ${
                  isActive
                    ? "bg-bg-accent-primary-solid text-text-white"
                    : "bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary text-text-accent-primary hover:bg-bg-accent-light"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-bg-primary rounded-xl outline outline-1 outline-stroke-primary flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr>
                <th
                  className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-left first:rounded-tl-xl cursor-pointer select-none"
                  onClick={() => handleSort("courseName")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary text-sm font-medium leading-4">
                      Nombre del Curso
                    </span>
                    <Icon
                      name={
                        sortBy === "courseName"
                          ? sortOrder === "ASC"
                            ? "arrow_upward"
                            : "arrow_downward"
                          : "swap_vert"
                      }
                      size={16}
                      className={
                        sortBy === "courseName"
                          ? "text-icon-accent-primary"
                          : "text-icon-secondary"
                      }
                    />
                  </div>
                </th>
                <th
                  className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-left w-32 cursor-pointer select-none"
                  onClick={() => handleSort("courseType")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary text-sm font-medium leading-4">
                      Unidad
                    </span>
                    <Icon
                      name={
                        sortBy === "courseType"
                          ? sortOrder === "ASC"
                            ? "arrow_upward"
                            : "arrow_downward"
                          : "swap_vert"
                      }
                      size={16}
                      className={
                        sortBy === "courseType"
                          ? "text-icon-accent-primary"
                          : "text-icon-secondary"
                      }
                    />
                  </div>
                </th>
                <th
                  className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-left w-56 cursor-pointer select-none"
                  onClick={() => handleSort("advisor")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary text-sm font-medium leading-4">
                      Asesor
                    </span>
                    <Icon
                      name={
                        sortBy === "advisor"
                          ? sortOrder === "ASC"
                            ? "arrow_upward"
                            : "arrow_downward"
                          : "swap_vert"
                      }
                      size={16}
                      className={
                        sortBy === "advisor"
                          ? "text-icon-accent-primary"
                          : "text-icon-secondary"
                      }
                    />
                  </div>
                </th>
                <th className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-right w-24">
                  <span className="text-text-secondary text-sm font-medium leading-4">
                    Alumnos
                  </span>
                </th>
                <th
                  className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-left w-20 cursor-pointer select-none"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary text-sm font-medium leading-4">
                      Estado
                    </span>
                    <Icon
                      name={
                        sortBy === "status"
                          ? sortOrder === "ASC"
                            ? "arrow_upward"
                            : "arrow_downward"
                          : "swap_vert"
                      }
                      size={16}
                      className={
                        sortBy === "status"
                          ? "text-icon-accent-primary"
                          : "text-icon-secondary"
                      }
                    />
                  </div>
                </th>
                <th className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-center w-20 last:rounded-tr-xl">
                  <span className="text-text-secondary text-sm font-medium leading-4">
                    Acciones
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="w-8 h-8 border-3 border-accent-solid border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Icon
                        name="school"
                        size={48}
                        className="text-icon-tertiary"
                        variant="rounded"
                      />
                      <span className="text-text-tertiary text-sm">
                        No se encontraron cursos
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.courseId}
                    onClick={() => goToCourse(row)}
                    className="border-b border-stroke-primary last:border-b-0 cursor-pointer hover:bg-bg-secondary transition-colors"
                  >
                    <td className="h-14 px-4 py-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-text-tertiary text-sm font-normal leading-4 line-clamp-2">
                          {row.courseName}
                        </span>
                        <span className="text-text-tertiary text-xs font-normal leading-3">
                          {row.courseCode}
                        </span>
                      </div>
                    </td>
                    <td className="h-14 px-4 py-2 w-32">
                      <CourseTypeTag type={row.courseTypeName} />
                    </td>
                    <td className="h-14 px-4 py-2 w-56">
                      <span className="text-text-secondary text-sm font-normal leading-4 line-clamp-2">
                        {row.advisorLabel}
                      </span>
                    </td>
                    <td className="h-14 px-4 py-2 w-24 text-right">
                      <span className="text-text-tertiary text-sm font-normal leading-4">
                        {row.studentCountLabel}
                      </span>
                    </td>
                    <td className="h-14 px-4 py-2 w-24">
                      {row.isActive ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-icon-success-primary rounded-full" />
                          <span className="text-text-success-primary text-xs font-medium leading-3">
                            Activo
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-icon-placeholder rounded-full" />
                          <span className="text-text-disabled text-xs font-medium leading-3">
                            Inactivo
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="h-14 px-4 py-2 w-20 text-center relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuCourseId(
                            menuCourseId === row.courseId ? null : row.courseId,
                          );
                        }}
                        className="p-1 rounded-full hover:bg-bg-secondary transition-colors"
                      >
                        <Icon
                          name="more_vert"
                          size={20}
                          className="text-icon-tertiary"
                        />
                      </button>
                      {menuCourseId === row.courseId && (
                        <div
                          ref={menuRef}
                          className="absolute right-8 top-10 z-30 w-48 p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuCourseId(null);
                              goToCourse(row);
                            }}
                            className="self-stretch px-2 py-3 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors"
                          >
                            <Icon
                              name="visibility"
                              size={20}
                              className="text-icon-secondary"
                              variant="rounded"
                            />
                            <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                              Ver
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuCourseId(null);
                              goToCourseEdit(row);
                            }}
                            className="self-stretch px-2 py-3 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors"
                          >
                            <Icon
                              name="edit"
                              size={20}
                              className="text-icon-secondary"
                              variant="rounded"
                            />
                            <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                              Editar
                            </span>
                          </button>
                          <div className="self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-stroke-secondary" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuCourseId(null);
                              setStatusTarget(row);
                            }}
                            className="self-stretch px-2 py-3 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors"
                          >
                            <Icon
                              name={
                                row.isActive ? "person_off" : "check_circle"
                              }
                              size={20}
                              className="text-icon-secondary"
                              variant="rounded"
                            />
                            <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                              {row.isActive ? "Inactivar" : "Activar"}
                            </span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalItems > 0 && (
          <div className="px-4 py-3 flex flex-col gap-3 border-t md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-text-tertiary text-sm font-normal leading-4">
                Mostrando
              </span>
              <span className="text-text-tertiary text-sm font-medium leading-4">
                {rangeStart}-{rangeEnd}
              </span>
              <span className="text-text-tertiary text-sm font-normal leading-4">
                de
              </span>
              <span className="text-text-tertiary text-sm font-medium leading-4">
                {totalItems}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center disabled:opacity-40"
              >
                <Icon
                  name="chevron_left"
                  size={16}
                  className="text-icon-tertiary"
                />
              </button>
              <div className="flex items-center gap-2">
                {pageNumbers.map((page, index) =>
                  page === "..." ? (
                    <span
                      key={`dots-${index}`}
                      className="min-w-8 px-1 py-2 text-center text-text-tertiary text-sm font-normal leading-4"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-8 px-1 py-2 rounded-lg text-sm font-medium leading-4 ${
                        page === currentPage
                          ? "bg-bg-accent-primary-solid text-text-white"
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
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center disabled:opacity-40"
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

      <AdvancedFiltersSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onClear={clearSidebarFilters}
        onApply={applySidebarFilters}
      >
        <div className="flex flex-col gap-4">
          <span className="text-gray-600 text-base font-semibold leading-5">
            Unidad
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {availableTypeFilters.map((filter) => {
              const isActive = sidebarType === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setSidebarType(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium leading-4 transition-colors ${
                    isActive
                      ? "bg-bg-accent-primary-solid text-text-white"
                      : "bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary text-text-accent-primary hover:bg-bg-accent-light"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-gray-600 text-base font-semibold leading-5">
            Ciclo
          </span>
          <FloatingSelect
            label="Ciclo"
            value={sidebarCycle}
            options={availableCycleOptions}
            onChange={setSidebarCycle}
            allLabel="Todos"
            className="w-full"
            variant="filled"
            size="large"
          />
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-gray-600 text-base font-semibold leading-5">
            Estado
          </span>
          <div className="flex flex-col gap-2">
            {(
              [
                ["ACTIVE", "Activo"],
                ["INACTIVE", "Inactivo"],
              ] as const
            ).map(([value, label]) => {
              const checked = sidebarStatus === value;
              return (
                <button
                  key={value}
                  onClick={() => setSidebarStatus(checked ? "" : value)}
                  className="flex items-center gap-1"
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${checked ? "bg-bg-accent-primary-solid border-bg-accent-primary-solid" : "border-icon-tertiary bg-transparent"}`}
                  >
                    {checked && (
                      <Icon
                        name="check"
                        size={14}
                        className="text-icon-white"
                      />
                    )}
                  </div>
                  <span className="flex-1 text-text-secondary text-base font-normal leading-4 text-left">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </AdvancedFiltersSidebar>

      <Modal
        isOpen={Boolean(statusTarget)}
        onClose={() => !statusSaving && setStatusTarget(null)}
        title={statusTarget?.isActive ? "Inactivar curso" : "Activar curso"}
        size="sm"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => setStatusTarget(null)}
              disabled={statusSaving}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              variant={statusTarget?.isActive ? "danger" : "primary"}
              onClick={() => void handleToggleCourseStatus()}
              loading={statusSaving}
              loadingText={
                statusTarget?.isActive ? "Inactivando..." : "Activando..."
              }
            >
              {statusTarget?.isActive ? "Inactivar" : "Activar"}
            </Modal.Button>
          </>
        }
      >
        <p className="text-text-secondary text-sm leading-5">
          {statusTarget?.isActive
            ? "Esta acción desactivará la materia en gestión de cursos. Podrás volver a activarla más adelante."
            : "Esta acción volverá a activar la materia y la mostrará nuevamente como disponible."}
        </p>
      </Modal>
    </div>
  );
}

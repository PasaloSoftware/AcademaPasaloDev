"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import CourseCard from "@/components/courses/CourseCard";
import DaySchedule from "@/components/dashboard/DaySchedule";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { coursesService } from "@/services/courses.service";
import type { AdminCourseCycleItem } from "@/services/courses.service";
import { getCourseColor } from "@/lib/courseColors";

const MAX_VISIBLE_COURSES = 4;

export default function InicioContent() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [courseCycles, setCourseCycles] = useState<AdminCourseCycleItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { setBreadcrumbItems } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbItems([{ icon: "home", label: "Inicio" }]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    async function loadCourseCycles() {
      setLoading(true);
      setError(null);
      try {
        const response = await coursesService.getAdminCourseCycles({
          page: 1,
          pageSize: MAX_VISIBLE_COURSES,
        });
        setCourseCycles(response.items);
        setTotalItems(response.totalItems);
      } catch (err) {
        console.error("Error al cargar cursos:", err);
        setError(
          err instanceof Error ? err.message : "Error al cargar los cursos",
        );
      } finally {
        setLoading(false);
      }
    }

    loadCourseCycles();
  }, []);

  const getProfessorInitials = (item: AdminCourseCycleItem): string => {
    if (item.professors.length === 0) return "XX";
    const prof = item.professors[0];
    return `${prof.firstName[0]}${prof.lastName1[0]}`.toUpperCase();
  };

  const getProfessorName = (item: AdminCourseCycleItem): string => {
    if (item.professors.length === 0) return "Sin asignar";
    return item.professors
      .map((p) => `${p.firstName} ${p.lastName1}`)
      .join(" & ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-solid border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary">Cargando cursos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Icon
            name="error"
            size={64}
            className="text-error-solid mb-4 mx-auto"
          />
          <p className="text-lg font-semibold text-primary mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-accent-solid text-white rounded-lg hover:bg-accent-solid-hover transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_348px] gap-12">
      {/* Columna Izquierda: Cursos */}
      <div className="flex flex-col gap-5">
        <div className="space-y-8">
          {/* Header: Cursos con toggles */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Icon name="class" size={32} className="text-accent-secondary" />
              <h1 className="text-3xl font-semibold text-primary">Cursos</h1>
            </div>

            {/* Toggle Galería/Lista */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-2 rounded flex items-center gap-1 transition-colors ${
                  viewMode === "grid"
                    ? "bg-accent-solid"
                    : "bg-white border border-accent-primary hover:bg-accent-light"
                }`}
              >
                <Icon
                  name="grid_view"
                  size={16}
                  className={
                    viewMode === "grid" ? "text-white" : "text-accent-primary"
                  }
                />
                <span
                  className={`text-sm font-medium ${viewMode === "grid" ? "text-white" : "text-accent-primary"}`}
                >
                  Galería
                </span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-2.5 py-2 rounded flex items-center gap-1 transition-colors ${
                  viewMode === "list"
                    ? "bg-accent-solid"
                    : "bg-white border border-accent-primary hover:bg-accent-light"
                }`}
              >
                <Icon
                  name="view_list"
                  size={16}
                  className={
                    viewMode === "list" ? "text-white" : "text-accent-primary"
                  }
                />
                <span
                  className={`text-sm font-medium ${viewMode === "list" ? "text-white" : "text-accent-primary"}`}
                >
                  Lista
                </span>
              </button>
            </div>
          </div>

          {/* Grid de Cursos */}
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                : "flex flex-col gap-6"
            }
            style={viewMode === "grid" ? { gridAutoRows: "1fr" } : undefined}
          >
            {courseCycles.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <Icon
                  name="school"
                  size={64}
                  className="text-secondary mx-auto mb-4"
                />
                <p className="text-lg font-semibold text-primary mb-2">
                  No hay cursos registrados
                </p>
                <p className="text-secondary">
                  Los cursos aparecerán aquí cuando se creen en el sistema
                </p>
              </div>
            ) : (
              courseCycles.map((item) => {
                const courseCode = item.course.code;
                const courseColor = getCourseColor(courseCode);

                const teachers =
                  item.professors.length > 0
                    ? item.professors.map((p) => ({
                        initials:
                          `${p.firstName[0]}${p.lastName1[0]}`.toUpperCase(),
                        name: `${p.firstName} ${p.lastName1}`,
                        avatarColor: courseColor.primary,
                        photoUrl: p.profilePhotoUrl || undefined,
                      }))
                    : [
                        {
                          initials: "XX",
                          name: "Sin asignar",
                          avatarColor: courseColor.primary,
                        },
                      ];

                return (
                  <div
                    key={item.courseCycleId}
                    className="flex flex-col gap-3 h-full"
                  >
                    <CourseCard
                      headerColor={courseColor.primary}
                      category="CIENCIAS"
                      cycle={item.academicCycle.code}
                      title={item.course.name}
                      teachers={teachers}
                      onViewCourse={() =>
                        router.push(`/plataforma/curso/${item.courseCycleId}`)
                      }
                      variant={viewMode}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ver todos los cursos */}
        {totalItems > MAX_VISIBLE_COURSES && (
          <div className="flex justify-center p-1 rounded-lg">
            <button
              onClick={() => router.push("/plataforma/admin/cursos")}
              className="text-text-accent-primary text-sm font-medium leading-4 hover:underline"
            >
              Ver todos los cursos
            </button>
          </div>
        )}
      </div>

      {/* Columna Derecha: Agenda */}
      <div className="space-y-6">
        <DaySchedule />
      </div>
    </div>
  );
}

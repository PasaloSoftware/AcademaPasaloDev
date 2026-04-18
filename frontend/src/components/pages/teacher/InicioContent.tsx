"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import CourseCard from "@/components/courses/CourseCard";
import DaySchedule from "@/components/dashboard/DaySchedule";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useAuth } from "@/contexts/AuthContext";
import { coursesService } from "@/services/courses.service";
import type { Enrollment } from "@/types/enrollment";
import { getCourseColor } from "@/lib/courseColors";

export default function InicioContent() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const { setBreadcrumbItems } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbItems([{ icon: "home", label: "Inicio" }]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      setError(null);
      try {
        const data = await coursesService.getMyCourseCycles();
        setEnrollments(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar los cursos",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadCourses();
  }, []);

  const getTeacherInitials = (): string => {
    if (!user) return "XX";
    return `${user.firstName[0]}${(user.lastName1 || "X")[0]}`.toUpperCase();
  };

  const getTeacherName = (): string => {
    if (!user) return "";
    return `${user.firstName} ${user.lastName1 || ""}`.trim();
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent-solid border-t-transparent"></div>
          <p className="text-secondary">Cargando cursos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Icon
            name="error"
            size={64}
            className="mx-auto mb-4 text-error-solid"
          />
          <p className="mb-2 text-lg font-semibold text-primary">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-accent-solid px-4 py-2 text-white transition-colors hover:bg-accent-solid-hover"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-[1fr_348px] xl:gap-12">
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <Icon
              name="class"
              size={24}
              className="text-accent-secondary sm:h-8 sm:w-8"
            />
            <h1 className="text-xl font-semibold text-primary sm:text-3xl">
              Mis Cursos
            </h1>
          </div>

          <div className="flex items-center gap-2 self-end sm:gap-3">
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Ver cursos en galer�a"
              className={`flex items-center gap-1 rounded px-2 py-1.5 transition-colors sm:px-2.5 sm:py-2 ${
                viewMode === "grid"
                  ? "bg-accent-solid"
                  : "border border-accent-primary bg-white hover:bg-accent-light"
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
                className={`hidden text-sm font-medium sm:inline ${
                  viewMode === "grid" ? "text-white" : "text-accent-primary"
                }`}
              >
                Galeria
              </span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              aria-label="Ver cursos en lista"
              className={`flex items-center gap-1 rounded px-2 py-1.5 transition-colors sm:px-2.5 sm:py-2 ${
                viewMode === "list"
                  ? "bg-accent-solid"
                  : "border border-accent-primary bg-white hover:bg-accent-light"
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
                className={`hidden text-sm font-medium sm:inline ${
                  viewMode === "list" ? "text-white" : "text-accent-primary"
                }`}
              >
                Lista
              </span>
            </button>
          </div>
        </div>

        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
              : "flex flex-col gap-4 md:gap-6"
          }
          style={viewMode === "grid" ? { gridAutoRows: "1fr" } : undefined}
        >
          {enrollments.length === 0 ? (
            <div className="col-span-2 py-12 text-center">
              <Icon
                name="school"
                size={64}
                className="mx-auto mb-4 text-secondary"
              />
              <p className="mb-2 text-lg font-semibold text-primary">
                No tienes cursos asignados
              </p>
              <p className="text-secondary">
                Los cursos aparecer�n aqu� cuando un administrador te asigne
              </p>
            </div>
          ) : (
            enrollments.map((enrollment) => {
              const courseCode = enrollment.courseCycle.course.code || "";
              const courseColor = getCourseColor(courseCode);

              return (
                <div
                  key={enrollment.courseCycle.id}
                  className="flex h-full flex-col gap-3"
                >
                  <CourseCard
                    headerColor={courseColor.primary}
                    category={
                      enrollment.courseCycle.course.courseType?.name?.toUpperCase() ||
                      "CIENCIAS"
                    }
                    cycle={
                      enrollment.courseCycle.course.cycleLevel?.name?.toUpperCase() ||
                      ""
                    }
                    title={enrollment.courseCycle.course.name}
                    teachers={[
                      {
                        initials: getTeacherInitials(),
                        name: getTeacherName(),
                        avatarColor: courseColor.primary,
                        photoUrl: user?.profilePhotoUrl,
                      },
                    ]}
                    onViewCourse={() =>
                      router.push(
                        `/plataforma/curso/${enrollment.courseCycle.id}`,
                      )
                    }
                    variant={viewMode}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-6">
        <DaySchedule />
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import CourseCard from "@/components/courses/CourseCard";
import AgendarTutoriaModal from "@/components/modals/AgendarTutoriaModal";
import DaySchedule from "@/components/dashboard/DaySchedule";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { enrollmentService } from "@/services/enrollment.service";
import { classEventService } from "@/services/classEvent.service";
import { Enrollment } from "@/types/enrollment";
import { ClassEvent } from "@/types/classEvent";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getCourseColor } from "@/lib/courseColors";

export default function InicioContent() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<ClassEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [copyingLink, setCopyingLink] = useState<string | null>(null);
  const router = useRouter();

  const { setBreadcrumbItems } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbItems([{ icon: "home", label: "Inicio" }]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    async function loadEnrollments() {
      setLoading(true);
      setError(null);
      try {
        const response = await enrollmentService.getMyCourses();

        if (Array.isArray(response)) {
          setEnrollments(response);
        } else if (response && "data" in response) {
          setEnrollments(response.data || []);
        } else {
          setEnrollments([]);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error al cargar los cursos";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    void loadEnrollments();
  }, []);

  useEffect(() => {
    async function loadUpcomingEvents() {
      setLoadingEvents(true);
      try {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const start = today.toISOString().split("T")[0];
        const end = nextWeek.toISOString().split("T")[0];

        const events = await classEventService.getMySchedule({ start, end });

        const futureEvents = events
          .filter(
            (event) =>
              !event.isCancelled && event.sessionStatus !== "FINALIZADA",
          )
          .sort(
            (a, b) =>
              new Date(a.startDatetime).getTime() -
              new Date(b.startDatetime).getTime(),
          )
          .slice(0, 10);

        setUpcomingEvents(futureEvents);
      } catch {
      } finally {
        setLoadingEvents(false);
      }
    }

    void loadUpcomingEvents();
  }, []);

  const handleAgendarTutoria = (curso: string, tema: string) => {
    const mensaje = `�Hola! Quisiera agendar una tutoria de ${curso} para la evaluaci�n o tema ${tema}`;
    const url = `https://wa.me/903006775?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const handleJoinMeeting = (event: ClassEvent) => {
    try {
      classEventService.joinMeeting(event);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al abrir la reuni�n");
    }
  };

  const handleCopyMeetingLink = async (event: ClassEvent) => {
    setCopyingLink(event.id);
    try {
      await classEventService.copyMeetingLink(event);
      setTimeout(() => setCopyingLink(null), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al copiar el link");
      setCopyingLink(null);
    }
  };

  const formatEventDateTime = (
    startDatetime: string,
    endDatetime: string,
  ): string => {
    const start = parseISO(startDatetime);
    const end = parseISO(endDatetime);

    const dayName = format(start, "EEEE", { locale: es });
    const day = format(start, "d", { locale: es });
    const month = format(start, "MMM", { locale: es });
    const startTime = format(start, "h:mm a", { locale: es });
    const endTime = format(end, "h:mm a", { locale: es });

    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${day} ${month} � ${startTime} - ${endTime}`;
  };

  const eventsByCourse = upcomingEvents.reduce<Record<string, ClassEvent[]>>(
    (acc, event) => {
      if (!acc[event.courseCode]) {
        acc[event.courseCode] = [];
      }
      acc[event.courseCode].push(event);
      return acc;
    },
    {},
  );

  const getProfessorInitials = (enrollment: Enrollment): string => {
    const professors = enrollment.courseCycle.professors;
    if (professors.length === 0) return "XX";
    const prof = professors[0];
    return `${prof.firstName[0]}${prof.lastName1[0]}`.toUpperCase();
  };

  const getProfessorName = (enrollment: Enrollment): string => {
    const professors = enrollment.courseCycle.professors;
    if (professors.length === 0) return "Sin asignar";
    const prof = professors[0];
    return `${prof.firstName} ${prof.lastName1}`;
  };

  void loadingEvents;
  void copyingLink;
  void handleJoinMeeting;
  void handleCopyMeetingLink;
  void formatEventDateTime;

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
                No tienes cursos matriculados
              </p>
              <p className="text-secondary">
                Contacta a tu coordinador para matricularte en cursos
              </p>
            </div>
          ) : (
            enrollments.map((enrollment) => {
              const courseCode = enrollment.courseCycle.course.code;
              const courseColor = getCourseColor(courseCode);

              return (
                <div key={enrollment.id} className="flex h-full flex-col gap-3">
                  <CourseCard
                    headerColor={courseColor.primary}
                    category="CIENCIAS"
                    cycle={enrollment.courseCycle.course.cycleLevel.name}
                    title={enrollment.courseCycle.course.name}
                    teachers={[
                      {
                        initials: getProfessorInitials(enrollment),
                        name: getProfessorName(enrollment),
                        avatarColor: courseColor.primary,
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

        <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-info-secondary-solid p-4 sm:gap-5 sm:p-6">
          <div className="absolute -bottom-6 -right-10 h-28 w-28 sm:bottom-20 sm:right-[-28px] sm:h-40 sm:w-40">
            <Icon
              name="help"
              size={160}
              className="h-full w-full text-magenta-violet-500"
            />
          </div>

          <div className="relative z-10 max-w-[17rem] space-y-2 sm:max-w-none sm:space-y-3">
            <h2 className="text-base font-semibold text-white sm:text-xl">
              Necesitas ayuda extra?
            </h2>
            <p className="text-xs text-white sm:text-sm">
              Agenda una tutoria personalizada con nuestros docentes y despeja
              todas tus dudas hoy mismo.
            </p>
          </div>

          <div className="relative z-10 flex justify-end">
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg border border-magenta-violet-700 bg-magenta-violet-50 px-4 py-3 text-sm font-medium text-magenta-violet-700 transition-colors hover:bg-magenta-violet-100 sm:px-6"
            >
              Agendar tutoria
            </button>
          </div>
        </div>
      </div>

      <AgendarTutoriaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAgendarTutoria}
      />
    </div>
  );
}

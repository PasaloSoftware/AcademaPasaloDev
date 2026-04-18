"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import DaySchedule from "@/components/dashboard/DaySchedule";
import EnrollmentRegistrationModal from "@/components/pages/admin/EnrollmentRegistrationModal";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { coursesService } from "@/services/courses.service";
import { usersService } from "@/services/users.service";

interface AdminDashboardStats {
  activeStudents: number;
  teachers: number;
  courses: number;
}

function StatCard({
  icon,
  iconWrapperClassName,
  iconClassName,
  label,
  value,
}: {
  icon: string;
  iconWrapperClassName: string;
  iconClassName: string;
  label: string;
  value: number;
}) {
  return (
    <div className="inline-flex flex-1 flex-col items-start justify-start gap-4 rounded-xl bg-bg-primary p-4 outline outline-1 outline-offset-[-1px] outline-gray-100 sm:p-6">
      <div
        className={`inline-flex items-center justify-center rounded-xl p-2.5 sm:p-3 ${iconWrapperClassName}`}
      >
        <Icon name={icon} size={20} className={iconClassName} />
      </div>
      <div className="self-stretch">
        <div className="self-stretch text-xs font-medium uppercase leading-4 text-gray-600 sm:text-sm">
          {label}
        </div>
        <div className="self-stretch text-2xl font-extrabold leading-8 text-text-primary sm:text-3xl sm:leading-9">
          {value}
        </div>
      </div>
    </div>
  );
}

function QuickAccessCard({
  icon,
  title,
  onClick,
}: {
  icon: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-bg-info-secondary-light p-4 transition-colors hover:bg-bg-info-secondary-light/80 sm:p-6"
    >
      <Icon
        name={icon}
        size={24}
        className="text-icon-info-secondary sm:h-8 sm:w-8"
      />
      <div className="self-stretch whitespace-pre-line text-center text-xs font-medium leading-4 text-text-info-secondary sm:text-sm">
        {title}
      </div>
    </button>
  );
}

export default function InicioContent() {
  const [stats, setStats] = useState<AdminDashboardStats>({
    activeStudents: 0,
    teachers: 0,
    courses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);

  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [studentsResponse, teachersResponse, courses] = await Promise.all([
        usersService.getAdminUsers({
          roles: "STUDENT",
          status: "ACTIVE",
        }),
        usersService.getAdminUsers({
          roles: "PROFESSOR",
          status: "ACTIVE",
        }),
        coursesService.findAll(),
      ]);

      setStats({
        activeStudents: studentsResponse.totalItems,
        teachers: teachersResponse.totalItems,
        courses: courses.length,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los datos del inicio.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setBreadcrumbItems([{ icon: "home", label: "Inicio" }]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent-solid border-t-transparent" />
          <p className="text-secondary">Cargando panel administrativo...</p>
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
            onClick={() => void loadDashboard()}
            className="mt-4 rounded-lg bg-accent-solid px-4 py-2 text-white transition-colors hover:bg-accent-solid-hover"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-[1fr_348px] xl:gap-12">
        <div className="self-stretch">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
            <StatCard
              icon="how_to_reg"
              iconWrapperClassName="bg-bg-accent-light"
              iconClassName="text-icon-accent-primary"
              label="Alumnos Activos"
              value={stats.activeStudents}
            />
            <StatCard
              icon="work"
              iconWrapperClassName="bg-bg-info-primary-light"
              iconClassName="text-icon-info-primary"
              label="Docentes"
              value={stats.teachers}
            />
            <StatCard
              icon="class"
              iconWrapperClassName="bg-bg-tertiary"
              iconClassName="text-icon-tertiary"
              label="Cursos"
              value={stats.courses}
            />
          </div>

          <div className="mt-6 flex flex-col gap-6 md:mt-8">
            <div className="inline-flex items-center justify-start">
              <div className="flex items-center gap-1 sm:gap-2">
                <Icon
                  name="bolt"
                  size={24}
                  className="text-accent-secondary sm:h-8 sm:w-8"
                />
                <div className="text-xl font-semibold leading-7 text-text-primary sm:text-3xl sm:leading-8">
                  Accesos Rapidos
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-6 xl:grid-cols-4">
              <QuickAccessCard
                icon="person_add_alt"
                title={"Registrar\nUsuario"}
                onClick={() =>
                  router.push("/plataforma/admin/usuarios/registrar")
                }
              />
              <QuickAccessCard
                icon="assignment_ind"
                title={"Nueva\nMatricula"}
                onClick={() => setIsEnrollmentModalOpen(true)}
              />
              <QuickAccessCard
                icon="add_to_photos"
                title={"Crear\nCurso"}
                onClick={() => router.push("/plataforma/admin/cursos/crear")}
              />
              <QuickAccessCard
                icon="grid_view"
                title="Gestionar Cursos"
                onClick={() => router.push("/plataforma/admin/cursos")}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <DaySchedule />
        </div>
      </div>

      <EnrollmentRegistrationModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => setIsEnrollmentModalOpen(false)}
        onEnrollmentCreated={({ isNewStudent }) => {
          if (isNewStudent) {
            setStats((prev) => ({
              ...prev,
              activeStudents: prev.activeStudents + 1,
            }));
          }
          setIsEnrollmentModalOpen(false);
        }}
      />
    </>
  );
}

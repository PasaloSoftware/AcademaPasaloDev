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
    <div className="flex-1 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-gray-100 inline-flex flex-col justify-start items-start gap-4">
      <div
        className={`p-3 rounded-xl inline-flex justify-center items-center ${iconWrapperClassName}`}
      >
        <Icon name={icon} size={24} className={iconClassName} />
      </div>
      <div className="self-stretch flex flex-col justify-start items-start gap-1">
        <div className="self-stretch text-gray-600 text-sm font-medium leading-4 uppercase">
          {label}
        </div>
        <div className="self-stretch text-text-primary text-3xl font-extrabold leading-9">
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
      className="flex-1 p-6 bg-bg-info-secondary-light rounded-xl inline-flex flex-col justify-center items-center gap-3 hover:bg-bg-info-secondary-light/80 transition-colors"
    >
      <Icon name={icon} size={32} className="text-icon-info-secondary" />
      <div className="self-stretch text-center text-text-info-secondary text-sm font-medium leading-4 whitespace-pre-line">
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
      console.error("Error al cargar el dashboard admin:", err);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-solid border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary">Cargando panel administrativo...</p>
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
            onClick={() => void loadDashboard()}
            className="mt-4 px-4 py-2 bg-accent-solid text-white rounded-lg hover:bg-accent-solid-hover transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_348px] gap-12">
        <div className="self-stretch flex flex-col justify-start items-start gap-6">
          <div className="self-stretch grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <div className="self-stretch flex flex-col justify-start items-start gap-6">
            <div className="self-stretch inline-flex justify-start items-center">
              <div className="flex justify-start items-center gap-2">
                <Icon name="bolt" size={32} className="text-accent-secondary" />
                <div className="justify-start text-text-primary text-3xl font-semibold leading-8">
                  Accesos Rapidos
                </div>
              </div>
            </div>

            <div className="self-stretch grid grid-cols-2 xl:grid-cols-4 gap-6">
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

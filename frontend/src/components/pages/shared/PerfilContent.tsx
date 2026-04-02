'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import CourseCard from '@/components/courses/CourseCard';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { getRoleFriendlyName } from '@/components/dashboard/RoleSwitcher';
import { enrollmentService } from '@/services/enrollment.service';
import { getCourseColor } from '@/lib/courseColors';
import type { Enrollment } from '@/types/enrollment';

export default function PerfilContent() {
  const { user } = useAuth();
  const { setBreadcrumbItems } = useBreadcrumb();
  const router = useRouter();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    setBreadcrumbItems([{ label: 'Mi Perfil' }]);
  }, [setBreadcrumbItems]);

  // Load enrolled courses
  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await enrollmentService.getMyCourses();
        const data: Enrollment[] = Array.isArray(response)
          ? response
          : response.data || [];
        setEnrollments(data);
      } catch (err) {
        console.error('Error al cargar cursos:', err);
      } finally {
        setLoadingCourses(false);
      }
    }
    loadCourses();
  }, []);

  if (!user) return null;

  const fullName = [user.firstName, user.lastName1, user.lastName2]
    .filter(Boolean)
    .join(' ');

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName1?.[0] ?? ''}`.toUpperCase();

  const getTeachers = (enrollment: Enrollment) => {
    const courseCode = enrollment.courseCycle.course.code;
    const courseColor = getCourseColor(courseCode);
    return enrollment.courseCycle.professors.map((prof) => ({
      initials: `${prof.firstName[0]}${prof.lastName1[0]}`.toUpperCase(),
      name: `${prof.firstName} ${prof.lastName1}`,
      avatarColor: courseColor.primary,
      photoUrl: prof.profilePhotoUrl || undefined,
    }));
  };

  return (
    <div className="w-full inline-flex flex-col justify-start items-start gap-8 overflow-hidden">
      {/* ====== Header Card ====== */}
      <div className="self-stretch p-6 relative bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-start items-center gap-8 overflow-hidden">
        {/* Decorative circles */}
        <div className="w-24 h-24 left-[-50px] top-[128px] absolute bg-fuchsia-800/20 rounded-full" />
        <div className="w-32 h-32 right-[-56px] top-[-66px] absolute bg-purple-900/20 rounded-full" />

        {/* Photo */}
        <div className="relative inline-flex flex-col justify-start items-start">
          {user.profilePhotoUrl ? (
            <img
              src={user.profilePhotoUrl}
              alt={fullName}
              className="w-32 h-32 rounded-full object-cover outline outline-4 outline-gray-100"
            />
          ) : (
            <div className="w-32 h-32 bg-bg-info-primary-solid rounded-full flex items-center justify-center outline outline-4 outline-gray-100">
              <span className="text-4xl font-bold text-text-white">{initials}</span>
            </div>
          )}
        </div>

        {/* Name + Email + Badges */}
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-4">
          <div className="self-stretch flex flex-col justify-start items-start">
            <span className="self-stretch text-text-primary text-2xl font-bold leading-7">
              {fullName}
            </span>
            <span className="self-stretch text-text-info-primary text-base font-medium leading-5">
              {user.email}
            </span>
          </div>
          <div className="self-stretch inline-flex justify-start items-start gap-2">
            {user.roles.map((role) => (
              <div
                key={role.code}
                className="px-2.5 py-1.5 bg-bg-accent-light rounded-full flex justify-center items-center gap-1"
              >
                <span className="text-text-accent-primary text-xs font-medium leading-3 uppercase">
                  {getRoleFriendlyName(role.code)}
                </span>
              </div>
            ))}
            <div className="px-2.5 py-1.5 bg-bg-success-light rounded-full flex justify-center items-center gap-1">
              <span className="text-text-success-primary text-xs font-medium leading-3">
                ACTIVO
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ====== Información Personal ====== */}
      <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
        <div className="self-stretch inline-flex justify-start items-start gap-2">
          <Icon name="person" size={20} className="text-icon-info-secondary" />
          <span className="flex-1 text-text-primary text-lg font-semibold leading-5">
            Información Personal
          </span>
        </div>

        <div className="self-stretch flex flex-col justify-start items-start gap-6">
          {/* Row 1: Nombres + Primer Apellido */}
          <div className="self-stretch inline-flex justify-start items-start gap-6 flex-wrap content-start">
            <InfoField label="Nombres" value={user.firstName} />
            <InfoField label="Primer Apellido" value={user.lastName1} />
          </div>
          {/* Row 2: Segundo Apellido + Correo */}
          <div className="self-stretch inline-flex justify-start items-start gap-6 flex-wrap content-start">
            <InfoField label="Segundo Apellido" value={user.lastName2} />
            <InfoField label="Correo Electrónico" value={user.email} />
          </div>
          {/* Row 3: Teléfono + Carrera */}
          <div className="self-stretch inline-flex justify-start items-start gap-6 flex-wrap content-start">
            <InfoField label="Teléfono" value={user.phone} />
            <InfoField label="Carrera" value={user.career} />
          </div>
        </div>
      </div>

      {/* ====== Cursos Inscritos (solo para roles con cursos) ====== */}
      {user.roles.some((r) => r.code === 'STUDENT' || r.code === 'PROFESSOR') && (
      <div className="self-stretch p-6 bg-white rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-slate-100 flex flex-col justify-start items-start gap-6">
        <div className="self-stretch inline-flex justify-start items-center gap-5">
          <div className="flex-1 flex justify-start items-start gap-2">
            <Icon name="school" size={20} className="text-icon-info-secondary" />
            <span className="text-text-primary text-lg font-semibold leading-5">
              Cursos Inscritos
            </span>
          </div>
          {!loadingCourses && (
            <span className="text-gray-600 text-base font-medium leading-4">
              {enrollments.length} {enrollments.length === 1 ? 'Curso' : 'Cursos'} en total
            </span>
          )}
        </div>

        {loadingCourses ? (
          <div className="self-stretch animate-pulse flex gap-6 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[240px] h-80 bg-bg-secondary rounded-xl flex-shrink-0" />
            ))}
          </div>
        ) : enrollments.length > 0 ? (
          <div className="self-stretch overflow-x-auto">
            <div className="inline-flex gap-6">
              {enrollments.map((enrollment) => {
                const courseCode = enrollment.courseCycle.course.code;
                const courseColor = getCourseColor(courseCode);
                const teachers = getTeachers(enrollment);

                return (
                  <div key={enrollment.id} className="w-[394px] flex-shrink-0">
                    <CourseCard
                      headerColor={courseColor.primary}
                      category="CIENCIAS"
                      cycle={enrollment.courseCycle.course.cycleLevel.name}
                      title={enrollment.courseCycle.course.name}
                      teachers={teachers}
                      onViewCourse={() => router.push(`/plataforma/curso/${enrollment.courseCycle.id}`)}
                      variant="grid"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="self-stretch p-8 flex flex-col items-center justify-center gap-3">
            <Icon name="school" size={48} className="text-icon-tertiary" />
            <span className="text-text-secondary text-sm">No estás inscrito en ningún curso</span>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
      <div className="self-stretch flex flex-col justify-start items-start">
        <span className="self-stretch text-gray-600 text-sm font-semibold leading-4">
          {label}
        </span>
      </div>
      <div className="self-stretch flex flex-col justify-start items-start">
        <span className="self-stretch text-text-primary text-base font-medium leading-6">
          {value || '-'}
        </span>
      </div>
    </div>
  );
}

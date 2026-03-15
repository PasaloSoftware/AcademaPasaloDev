'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import CourseCard from '@/components/courses/CourseCard';
import DaySchedule from '@/components/dashboard/DaySchedule';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/contexts/AuthContext';
import { coursesService } from '@/services/courses.service';
import type { CourseCycle } from '@/types/api';
import { getCourseColor } from '@/lib/courseColors';

export default function InicioContent() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [courseCycles, setCourseCycles] = useState<CourseCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const { setBreadcrumbItems } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbItems([{ icon: 'home', label: 'Inicio' }]);
  }, [setBreadcrumbItems]);

  // Cargar cursos asignados al profesor
  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      setError(null);
      try {
        const data = await coursesService.getMyCourseCycles();
        setCourseCycles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error al cargar cursos:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar los cursos');
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  // Obtener iniciales del profesor (el propio usuario)
  const getTeacherInitials = (): string => {
    if (!user) return 'XX';
    return `${user.firstName[0]}${(user.lastName1 || 'X')[0]}`.toUpperCase();
  };

  const getTeacherName = (): string => {
    if (!user) return '';
    return `${user.firstName} ${user.lastName1 || ''}`.trim();
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
          <Icon name="error" size={64} className="text-error-solid mb-4 mx-auto" />
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
      <div className="space-y-9">
        {/* Header: Mis Cursos con toggles */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icon name="class" size={32} className="text-accent-secondary" />
            <h1 className="text-3xl font-semibold text-primary">Mis Cursos</h1>
          </div>

          {/* Toggle Galería/Lista */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-2 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-accent-solid'
                  : 'bg-white border border-accent-primary hover:bg-accent-light'
              }`}
            >
              <Icon
                name="grid_view"
                size={16}
                className={viewMode === 'grid' ? 'text-white' : 'text-accent-primary'}
              />
              <span className={`text-sm font-medium ${viewMode === 'grid' ? 'text-white' : 'text-accent-primary'}`}>
                Galería
              </span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-2 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent-solid'
                  : 'bg-white border border-accent-primary hover:bg-accent-light'
              }`}
            >
              <Icon
                name="view_list"
                size={16}
                className={viewMode === 'list' ? 'text-white' : 'text-accent-primary'}
              />
              <span className={`text-sm font-medium ${viewMode === 'list' ? 'text-white' : 'text-accent-primary'}`}>
                Lista
              </span>
            </button>
          </div>
        </div>

        {/* Grid de Cursos */}
        <div
          className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-6'}
          style={viewMode === 'grid' ? { gridAutoRows: '1fr' } : undefined}
        >
          {courseCycles.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <Icon name="school" size={64} className="text-secondary mx-auto mb-4" />
              <p className="text-lg font-semibold text-primary mb-2">No tienes cursos asignados</p>
              <p className="text-secondary">Los cursos aparecerán aquí cuando un administrador te asigne</p>
            </div>
          ) : (
            courseCycles.map((cc) => {
              const courseCode = cc.course?.code || '';
              const courseColor = getCourseColor(courseCode);

              return (
                <div key={cc.id} className="flex flex-col gap-3 h-full">
                  <CourseCard
                    headerColor={courseColor.primary}
                    category="CIENCIAS"
                    cycle={cc.academicCycle?.code || ''}
                    title={cc.course?.name || ''}
                    teachers={[
                      {
                        initials: getTeacherInitials(),
                        name: getTeacherName(),
                        avatarColor: courseColor.primary,
                        photoUrl: user?.profilePhotoUrl,
                      }
                    ]}
                    onViewCourse={() => router.push(`/plataforma/curso/${cc.id}`)}
                    variant={viewMode}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Columna Derecha: Agenda */}
      <div className="space-y-6">
        <DaySchedule />
      </div>
    </div>
  );
}

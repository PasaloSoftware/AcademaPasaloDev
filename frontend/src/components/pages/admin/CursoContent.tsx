'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useToast } from '@/components/ui/ToastContainer';
import { coursesService, type AdminCourseCycleItem, type AdminCourseCycleListResponse } from '@/services/courses.service';
import { getCourseColor } from '@/lib/courseColors';
import type { CurrentCycleResponse } from '@/types/curso';

interface CursoContentProps {
  cursoId: string;
}

const COURSE_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Ciencias: { bg: 'bg-bg-success-light', text: 'text-text-success-primary', label: 'CIENCIAS' },
  Letras: { bg: 'bg-bg-warning-light', text: 'text-text-warning-primary', label: 'LETRAS' },
  Facultad: { bg: 'bg-bg-info-primary-light', text: 'text-text-info-primary', label: 'FACULTAD' },
};

function normalizeCourseTypeName(name?: string | null): string {
  if (!name) return 'Sin unidad';
  const normalized = name.trim().toLowerCase();
  if (normalized === 'ciencias') return 'Ciencias';
  if (normalized === 'letras') return 'Letras';
  if (normalized === 'facultad') return 'Facultad';
  return name.trim();
}

function getProfessorInitials(firstName: string, lastName1: string): string {
  return `${firstName[0] || 'X'}${lastName1[0] || 'X'}`.toUpperCase();
}

function getEvaluationTypeMeta(code: string): { label: string; bg: string; text: string } {
  const normalized = code.toUpperCase();
  if (normalized.startsWith('PC')) {
    return {
      label: 'Practica Calificada',
      bg: 'bg-bg-info-secondary-light',
      text: 'text-text-info-secondary',
    };
  }

  if (normalized.startsWith('EX')) {
    return {
      label: 'Examen',
      bg: 'bg-bg-success-light',
      text: 'text-text-success-primary',
    };
  }

  return {
    label: normalized,
    bg: 'bg-bg-secondary',
    text: 'text-text-secondary',
  };
}

function CourseTypeTag({ type }: { type: string }) {
  const style = COURSE_TYPE_STYLES[type] || {
    bg: 'bg-bg-secondary',
    text: 'text-text-secondary',
    label: type.toUpperCase(),
  };

  return (
    <span className={`px-2.5 py-1.5 ${style.bg} rounded-full inline-flex justify-center items-center gap-1`}>
      <span className={`${style.text} text-xs font-medium leading-3`}>{style.label}</span>
    </span>
  );
}

function StatusTag({ active }: { active: boolean }) {
  return (
    <span className={`px-2.5 py-1.5 rounded-full inline-flex justify-center items-center gap-1 ${active ? 'bg-bg-success-light' : 'bg-bg-tertiary'}`}>
      <span className={`${active ? 'text-text-success-primary' : 'text-text-disabled'} text-xs font-medium leading-3`}>
        {active ? 'ACTIVO' : 'INACTIVO'}
      </span>
    </span>
  );
}

export default function CursoContent({ cursoId }: CursoContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [courseCycle, setCourseCycle] = useState<AdminCourseCycleItem | null>(null);
  const [courseTypeName, setCourseTypeName] = useState('Sin unidad');
  const [currentContent, setCurrentContent] = useState<CurrentCycleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const response: AdminCourseCycleListResponse = await coursesService.getAdminCourseCycles({ page, pageSize: 100 });
        cycleItems.push(...response.items);
        page += 1;
      }

      const selectedCycle = cycleItems.find((item) => item.courseCycleId === cursoId) || null;

      if (!selectedCycle) {
        throw new Error('No se encontro el curso solicitado.');
      }

      const selectedCourse = catalog.find((course) => course.id === selectedCycle.course.id) || null;
      setCourseCycle(selectedCycle);
      setCurrentContent(content);
      setCourseTypeName(normalizeCourseTypeName(selectedCourse?.courseType?.name));
      setBreadcrumbItems([
        { icon: 'class', label: 'Gestion de Cursos', href: '/plataforma/admin/cursos' },
        { label: 'Curso' },
      ]);
    } catch (err) {
      console.error('Error al cargar detalle del curso:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el curso.');
    } finally {
      setLoading(false);
    }
  }, [cursoId, setBreadcrumbItems]);

  useEffect(() => {
    if (!cursoId) return;
    loadCourseDetail();
  }, [cursoId, loadCourseDetail]);

  const courseColors = useMemo(
    () => getCourseColor(courseCycle?.course.code || cursoId),
    [courseCycle?.course.code, cursoId],
  );

  const evaluations = currentContent?.evaluations || [];
  const professorNames = courseCycle?.professors.map((professor) => `${professor.firstName} ${professor.lastName1}`.trim()).join(' & ') || 'Sin asignar';

  const handlePendingAction = (action: string) => {
    showToast({
      type: 'info',
      title: `${action} pendiente`,
      description: `La accion de ${action.toLowerCase()} del curso se conectara en el siguiente paso con el backend oficial.`,
    });
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

  if (error || !courseCycle) {
    return (
      <div className="bg-bg-primary rounded-2xl border border-stroke-primary p-12 text-center">
        <Icon name="error" size={64} className="text-error-solid mb-4 mx-auto" />
        <h1 className="text-2xl font-bold text-primary mb-2">{error || 'Curso no encontrado'}</h1>
        <p className="text-secondary mb-6">No pudimos cargar el detalle administrativo del curso.</p>
        <button
          onClick={() => router.push('/plataforma/admin/cursos')}
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
        onClick={() => router.push('/plataforma/admin/cursos')}
        className="p-1 rounded-lg inline-flex justify-center items-center gap-2 hover:bg-bg-accent-light transition-colors"
      >
        <Icon name="arrow_back" size={20} className="text-icon-accent-primary" />
        <span className="text-text-accent-primary text-base font-medium leading-4">Volver a Gestion de Cursos</span>
      </button>

      <div className="self-stretch grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_192px] gap-4 items-start">
        <div className="flex self-stretch">
          <div className="w-5 rounded-tl-xl rounded-bl-xl" style={{ backgroundColor: courseColors.primary }} />
          <div className="flex-1 p-6 relative bg-bg-primary rounded-tr-xl rounded-br-xl border-r border-t border-b border-stroke-secondary flex justify-start items-center gap-8 overflow-hidden">
            <div className="w-24 h-24 left-[-50px] top-[128px] absolute rounded-full opacity-20" style={{ backgroundColor: courseColors.primary }} />
            <div className="flex-1 inline-flex flex-col justify-start items-start gap-4 z-10">
              <div className="self-stretch flex flex-col justify-start items-start">
                <div className="self-stretch text-text-primary text-2xl font-bold leading-7">{courseCycle.course.name}</div>
                <div className="self-stretch text-text-info-primary text-base font-medium leading-5">{courseCycle.course.code}</div>
              </div>
              <div className="self-stretch inline-flex justify-start items-start gap-2 flex-wrap">
                <CourseTypeTag type={courseTypeName} />
                <StatusTag active={courseCycle.academicCycle.isCurrent} />
              </div>
            </div>
            <div className="w-32 h-32 right-[-48px] top-[-66px] absolute rounded-full opacity-15" style={{ backgroundColor: courseColors.primary }} />
          </div>
        </div>

        <div className="w-full p-5 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-center items-start gap-2 overflow-hidden">
          <div className="self-stretch text-text-tertiary text-base font-semibold leading-5">Acciones</div>
          <div className="self-stretch flex flex-col justify-start items-start">
            <button onClick={() => handlePendingAction('Editar')} className="self-stretch p-2 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors">
              <Icon name="edit" size={20} className="text-icon-secondary" />
              <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">Editar</span>
            </button>
            <button onClick={() => handlePendingAction(courseCycle.academicCycle.isCurrent ? 'Inactivar' : 'Activar')} className="self-stretch p-2 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors">
              <Icon name={courseCycle.academicCycle.isCurrent ? 'person_off' : 'check_circle'} size={20} className="text-icon-secondary" />
              <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">{courseCycle.academicCycle.isCurrent ? 'Inactivar' : 'Activar'}</span>
            </button>
            <button onClick={() => handlePendingAction('Eliminar')} className="self-stretch p-2 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors">
              <Icon name="delete" size={20} className="text-icon-secondary" />
              <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">Eliminar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
        <div className="self-stretch inline-flex justify-start items-start gap-2">
          <Icon name="person" size={20} className="text-icon-info-secondary" />
          <div className="flex-1 text-text-primary text-lg font-semibold leading-5">Detalle del Curso</div>
        </div>
        <div className="self-stretch flex flex-col justify-start items-start gap-6">
          <div className="self-stretch inline-flex justify-start items-start gap-6 flex-wrap content-start">
            <div className="flex-1 min-w-[280px] inline-flex flex-col justify-start items-start gap-1">
              <div className="self-stretch text-text-quartiary text-sm font-semibold leading-4">Asesor</div>
              <div className="self-stretch inline-flex justify-start items-center gap-1.5">
                <div className="flex -space-x-2">
                  {courseCycle.professors.length > 0 ? courseCycle.professors.slice(0, 2).map((professor, index) => (
                    <div key={professor.id} className={`w-7 h-7 rounded-full border border-stroke-white overflow-hidden flex items-center justify-center ${index === 0 ? 'bg-bg-success-solid' : 'bg-bg-info-primary-solid'}`}>
                      {professor.profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={professor.profilePhotoUrl} alt={`${professor.firstName} ${professor.lastName1}`} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-center text-text-white text-[8px] font-medium leading-[10px]">{getProfessorInitials(professor.firstName, professor.lastName1)}</span>
                      )}
                    </div>
                  )) : (
                    <div className="w-7 h-7 rounded-full bg-bg-disabled flex items-center justify-center">
                      <span className="text-center text-text-disabled text-[8px] font-medium leading-[10px]">--</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 inline-flex flex-col justify-center items-start gap-0.5">
                  <div className="self-stretch text-text-secondary text-sm font-normal leading-4 line-clamp-2">{professorNames}</div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[180px] inline-flex flex-col justify-start items-start gap-1">
              <div className="self-stretch text-text-quartiary text-sm font-semibold leading-4">Alumnos matriculados</div>
              <div className="self-stretch text-text-primary text-base font-medium leading-4">-</div>
            </div>
            <div className="flex-1 min-w-[180px] inline-flex flex-col justify-start items-start gap-1">
              <div className="self-stretch text-text-quartiary text-sm font-semibold leading-4">Ciclo</div>
              <div className="self-stretch text-text-primary text-base font-medium leading-4">{courseCycle.academicCycle.code}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="self-stretch inline-flex flex-col justify-start items-start gap-6">
        <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start gap-6">
          <div className="self-stretch inline-flex justify-start items-start gap-2">
            <Icon name="school" size={20} className="text-icon-info-secondary" />
            <div className="flex-1 text-text-primary text-lg font-semibold leading-5">Estructura de Evaluaciones</div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-3">
            {evaluations.length === 0 ? (
              <div className="self-stretch p-6 bg-bg-primary rounded-2xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary text-text-tertiary text-sm">
                Este curso aun no tiene evaluaciones configuradas.
              </div>
            ) : (
              evaluations.map((evaluation) => {
                const typeMeta = getEvaluationTypeMeta(evaluation.evaluationTypeCode);
                return (
                  <div key={evaluation.id} className="self-stretch p-4 bg-bg-primary rounded-2xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-start items-center gap-6">
                    <div className="flex-1 flex justify-start items-center gap-6">
                      <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                        <div className="self-stretch inline-flex justify-start items-start gap-2 flex-wrap">
                          <div className="flex-1 min-w-[220px] text-text-primary text-lg font-medium leading-5">{evaluation.fullName}</div>
                          <span className={`px-2.5 py-1.5 ${typeMeta.bg} rounded-full flex justify-center items-center gap-1`}>
                            <span className={`${typeMeta.text} text-xs font-medium leading-3`}>{typeMeta.label}</span>
                          </span>
                        </div>
                        <div className="self-stretch inline-flex justify-start items-start gap-4">
                          <div className="self-stretch flex justify-start items-center gap-1">
                            <Icon name="bookmark" size={12} className="text-icon-tertiary" />
                            <div className="text-text-quartiary text-xs font-normal leading-4">{evaluation.shortName}</div>
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

        <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start gap-6">
          <div className="self-stretch inline-flex justify-start items-center gap-5">
            <div className="flex-1 flex justify-start items-center gap-2">
              <Icon name="groups" size={20} className="text-icon-info-secondary" />
              <div className="text-text-primary text-lg font-semibold leading-5">Gestion de Alumnos</div>
            </div>
          </div>
          <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2 opacity-70">
            <Icon name="search" size={16} className="text-icon-tertiary" />
            <div className="flex-1 text-text-tertiary text-base font-normal leading-4">Buscar nombre o correo para matricular...</div>
          </div>
          <div className="self-stretch p-6 bg-bg-secondary rounded-xl border border-dashed border-stroke-secondary text-center">
            <div className="flex flex-col items-center gap-2">
              <Icon name="info" size={32} className="text-icon-tertiary" />
              <div className="text-text-primary text-sm font-medium leading-4">Listado de alumnos pendiente de integracion</div>
              <div className="text-text-tertiary text-sm leading-4 max-w-2xl">
                El backend actual no expone aun un endpoint administrativo para listar matriculados por curso-ciclo. Deje la seccion preparada para conectarla cuando ese contrato exista.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

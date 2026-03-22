'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/contexts/AuthContext';
import { coursesService } from '@/services/courses.service';
import type { Enrollment } from '@/types/enrollment';
import type {
  CurrentCycleResponse,
  PreviousCyclesResponse,
  BankStructureResponse,
} from '@/types/curso';
import Icon from '@/components/ui/Icon';
import {
  EvaluationCard,
  PreviousCycleCard,
  BancoCategoryCard,
  sortEvaluations,
} from '@/components/shared/evaluationHelpers';

interface CursoContentProps {
  cursoId: string;
}

type TabOption = 'vigente' | 'anteriores' | 'banco';

export default function CursoContent({ cursoId }: CursoContentProps) {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { user } = useAuth();

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [currentCycle, setCurrentCycle] = useState<CurrentCycleResponse | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorContent, setErrorContent] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabOption>('vigente');

  const [previousCycles, setPreviousCycles] = useState<PreviousCyclesResponse | null>(null);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const [bankStructure, setBankStructure] = useState<BankStructureResponse | null>(null);
  const [loadingBank, setLoadingBank] = useState(false);

  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadEnrollment() {
      setLoadingCourse(true);
      setError(null);
      try {
        const data = await coursesService.getMyCourseCycles();
        const found = data.find(
          (e) => e.courseCycle.id === cursoId,
        );
        if (found) {
          setEnrollment(found);
          setBreadcrumbItems([
            { label: 'Cursos' },
            { label: found.courseCycle.course.name },
          ]);
        } else {
          setError('No se encontró el curso asignado');
        }
      } catch (err) {
        console.error('Error al cargar curso:', err);
        setError('Error al cargar los datos del curso');
      } finally {
        setLoadingCourse(false);
      }
    }

    if (cursoId) loadEnrollment();
  }, [cursoId, setBreadcrumbItems]);

  useEffect(() => {
    async function loadContent() {
      setLoadingContent(true);
      setErrorContent(null);
      try {
        const data = await coursesService.getCourseContent(cursoId);
        setCurrentCycle(data);
      } catch (err) {
        console.error('Error al cargar contenido del ciclo:', err);
        setErrorContent('Error al cargar las evaluaciones');
      } finally {
        setLoadingContent(false);
      }
    }

    if (cursoId) loadContent();
  }, [cursoId]);

  useEffect(() => {
    async function loadPreviousCycles() {
      setLoadingPrevious(true);
      try {
        const data = await coursesService.getPreviousCycles(cursoId);
        setPreviousCycles(data);
      } catch (err) {
        console.error('Error al cargar ciclos anteriores:', err);
      } finally {
        setLoadingPrevious(false);
      }
    }

    if (cursoId) loadPreviousCycles();
  }, [cursoId]);

  useEffect(() => {
    async function loadBankStructure() {
      setLoadingBank(true);
      try {
        const data = await coursesService.getBankStructure(cursoId);
        setBankStructure(data);
      } catch (err) {
        console.error('Error al cargar banco de enunciados:', err);
      } finally {
        setLoadingBank(false);
      }
    }

    if (cursoId) loadBankStructure();
  }, [cursoId]);

  useEffect(() => {
    async function loadIntroVideo() {
      try {
        const data = await coursesService.getIntroVideoLink(cursoId);
        if (data?.url) {
          setIntroVideoUrl(data.url);
        }
      } catch {
        // No intro video available
      }
    }

    if (cursoId) loadIntroVideo();
  }, [cursoId]);

  const getTeacherInitials = (): string => {
    if (!user) return 'XX';
    return `${user.firstName[0]}${(user.lastName1 || 'X')[0]}`.toUpperCase();
  };

  const getTeacherName = (): string => {
    if (!user) return '';
    return `${user.firstName} ${user.lastName1 || ''}`.trim();
  };

  if (loadingCourse || loadingContent) {
    return (
      <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
        <div className="self-stretch animate-pulse">
          <div className="flex gap-8">
            <div className="flex-1 space-y-5">
              <div className="flex gap-2">
                <div className="h-7 w-24 bg-bg-secondary rounded-full" />
                <div className="h-7 w-20 bg-bg-secondary rounded-full" />
              </div>
              <div className="h-12 bg-bg-secondary rounded w-3/4" />
              <div className="h-6 bg-bg-secondary rounded w-1/3" />
            </div>
            <div className="flex-1 h-44 bg-bg-secondary rounded-lg" />
          </div>
          <div className="mt-8 h-12 w-[575px] bg-bg-secondary rounded-xl" />
          <div className="mt-8 space-y-0">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-bg-secondary rounded-2xl border border-stroke-primary"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || errorContent || !enrollment) {
    return (
      <div className="bg-white rounded-2xl border border-stroke-primary p-12 text-center">
        <Icon
          name="error"
          size={64}
          className="text-error-solid mb-4 mx-auto"
        />
        <h1 className="text-2xl font-bold text-primary mb-2">
          {error || errorContent || 'Curso no encontrado'}
        </h1>
        <p className="text-secondary mb-6">
          El curso solicitado no está disponible.
        </p>
      </div>
    );
  }

  const courseName = enrollment.courseCycle.course.name;
  const courseTypeName = enrollment.courseCycle.course.courseType?.name || 'CIENCIAS';
  const evaluations = currentCycle?.evaluations || [];

  const tabs: { key: TabOption; label: string }[] = [
    { key: 'vigente', label: 'Ciclo Vigente' },
    { key: 'anteriores', label: 'Ciclos Pasados' },
    { key: 'banco', label: 'Banco de Enunciados' },
  ];

  return (
    <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
      {/* HEADER SECTION */}
      <div className="self-stretch inline-flex justify-start items-start gap-8 overflow-hidden mb-8">
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-4">
          {/* Tags */}
          <div className="inline-flex justify-start items-center gap-2">
            <div className="px-2.5 py-1.5 bg-bg-success-light rounded-full flex justify-center items-center gap-1">
              <span className="text-text-success-primary text-xs font-medium leading-3">
                {courseTypeName.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="self-stretch inline-flex justify-start items-center gap-2">
            <div className="flex-1 text-text-primary text-4xl font-bold leading-[48px]">
              {courseName}
            </div>
          </div>

          {/* Teacher (self) */}
          <div className="self-stretch flex flex-col justify-start items-start gap-4">
            <div className="self-stretch inline-flex justify-start items-center gap-2">
              <div className="w-6 h-6 p-1 bg-bg-success-solid rounded-full flex justify-center items-center gap-2">
                <span className="text-center text-text-white text-[10px] font-medium leading-3">
                  {getTeacherInitials()}
                </span>
              </div>
              <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
                <span className="text-text-secondary text-[10px] font-medium leading-3">
                  DOCENTE
                </span>
                <span className="self-stretch text-text-secondary text-base font-normal leading-4 line-clamp-1">
                  {getTeacherName()}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback */}
        </div>

        {/* Right: Intro Video */}
        <div className="h-[190px] aspect-video rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary overflow-hidden">
          {introVideoUrl ? (
            <iframe
              src={introVideoUrl}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Video introductorio del curso"
            />
          ) : (
            <div className="w-full h-full py-14 px-5 bg-bg-tertiary inline-flex flex-col justify-center items-center gap-3">
              <div className="p-2 bg-bg-accent-primary-solid rounded-full inline-flex justify-start items-center gap-2">
                <Icon name="play_arrow" size={24} className="text-icon-white" />
              </div>
              <div className="self-stretch flex flex-col justify-center items-center gap-1">
                <span className="text-center text-text-secondary text-xs font-medium leading-4">
                  Video: Curso - Clase introductoria
                </span>
                <span className="text-center text-text-tertiary text-xs font-normal leading-4 line-clamp-1">
                  Profesor(a): {getTeacherName()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABS + CONTENT SECTION */}
      <div className="self-stretch inline-flex flex-col justify-start items-start gap-8">
        {/* Horizontal Pill Tabs */}
        <div className="w-[567px] p-1 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-start gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-2 py-2.5 rounded-lg flex justify-start items-center gap-2 transition-colors ${
                activeTab === tab.key
                  ? 'bg-bg-accent-primary-solid'
                  : 'bg-bg-primary hover:bg-bg-secondary'
              }`}
            >
              <div className="flex-1 flex justify-start items-center gap-2">
                <span
                  className={`flex-1 text-center text-[15px] leading-4 whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'text-text-white'
                      : 'text-text-secondary'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* TAB: Ciclo Vigente */}
        {activeTab === 'vigente' && (
          <div className="self-stretch flex flex-col justify-start items-start gap-6 overflow-hidden">
            <div className="self-stretch h-7 inline-flex justify-start items-center gap-4">
              <span className="text-text-primary text-2xl font-semibold leading-7">
                Ciclo Vigente {currentCycle?.cycleCode || ''}
              </span>
            </div>

            {evaluations.length > 0 ? (
              <div className="self-stretch grid grid-cols-3 gap-8">
                {sortEvaluations(evaluations).map((evaluation) => (
                  <EvaluationCard
                    key={evaluation.id}
                    evaluation={evaluation}
                    forceEnabled
                    onSelect={(eval_) =>
                      router.push(
                        `/plataforma/curso/${cursoId}/evaluacion/${eval_.id}`,
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="self-stretch p-12 bg-bg-secondary rounded-2xl border border-stroke-primary flex flex-col items-center justify-center gap-4">
                <Icon
                  name="event_available"
                  size={64}
                  className="text-icon-tertiary"
                />
                <div className="text-center">
                  <p className="text-text-primary font-semibold mb-2">
                    No hay evaluaciones disponibles
                  </p>
                  <p className="text-text-secondary text-sm">
                    Las evaluaciones aparecerán aquí cuando sean creadas
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Ciclos Pasados */}
        {activeTab === 'anteriores' && (
          <div className="self-stretch flex flex-col justify-start items-start gap-6 overflow-hidden">
            <div className="self-stretch h-7 inline-flex justify-start items-center gap-4">
              <span className="text-text-primary text-2xl font-semibold leading-7">
                Ciclos Pasados
              </span>
            </div>

            {loadingPrevious ? (
              <div className="self-stretch flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
              </div>
            ) : previousCycles && previousCycles.cycles.length > 0 ? (
              <div className="self-stretch grid grid-cols-3 gap-8">
                {previousCycles.cycles.map((cycle) => (
                  <PreviousCycleCard
                    key={cycle.cycleCode}
                    cycleCode={cycle.cycleCode}
                    onViewCycle={(code) =>
                      router.push(
                        `/plataforma/curso/${cursoId}/ciclo-anterior/${code}`,
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="self-stretch p-12 bg-white rounded-2xl border border-stroke-primary flex flex-col items-center justify-center gap-4">
                <Icon
                  name="history"
                  size={64}
                  className="text-icon-tertiary"
                />
                <div className="text-center">
                  <p className="text-text-primary font-semibold mb-2">
                    No hay ciclos pasados disponibles
                  </p>
                  <p className="text-text-secondary text-sm">
                    Los ciclos pasados aparecerán aquí cuando estén disponibles
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Banco de Enunciados */}
        {activeTab === 'banco' && (
          <div className="self-stretch flex flex-col justify-start items-start gap-6 overflow-hidden">
            <div className="self-stretch h-7 inline-flex justify-start items-center gap-4">
              <span className="text-text-primary text-2xl font-semibold leading-7">
                Banco de Enunciados
              </span>
            </div>

            {loadingBank ? (
              <div className="self-stretch flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-accent-solid border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bankStructure && bankStructure.items.length > 0 ? (
              <div className="self-stretch grid grid-cols-3 gap-8">
                {bankStructure.items.map((item) => (
                  <BancoCategoryCard
                    key={item.evaluationTypeCode}
                    typeCode={item.evaluationTypeCode}
                    typeName={item.evaluationTypeName}
                    onSelect={() =>
                      router.push(
                        `/plataforma/curso/${cursoId}/banco/${item.evaluationTypeCode}`,
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="self-stretch p-12 bg-bg-secondary rounded-2xl border border-stroke-primary flex flex-col items-center justify-center gap-4">
                <Icon
                  name="folder_open"
                  size={64}
                  className="text-icon-tertiary"
                />
                <div className="text-center">
                  <p className="text-text-primary font-semibold mb-2">
                    No hay banco de enunciados disponible
                  </p>
                  <p className="text-text-secondary text-sm">
                    El banco de enunciados aparecerá aquí cuando sea configurado
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

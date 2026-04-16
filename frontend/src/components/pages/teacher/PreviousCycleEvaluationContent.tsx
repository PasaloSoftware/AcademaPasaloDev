'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { coursesService } from '@/services/courses.service';
import Icon from '@/components/ui/Icon';
import { EvaluationPageContent } from '../student/EvaluationShared';

interface PreviousCycleEvaluationContentProps {
  cursoId: string;
  cycleCode: string;
  evalId: string;
  previewData?: {
    courseName: string;
    evalShortName?: string;
    evalFullName?: string;
    backHref?: string;
    backLabel?: string;
    getClassPageUrl?: (eventId: string) => string;
    manageBreadcrumb?: boolean;
  };
}

export default function PreviousCycleEvaluationContent({
  cursoId,
  cycleCode,
  evalId,
  previewData,
}: PreviousCycleEvaluationContentProps) {
  const { setBreadcrumbItems } = useBreadcrumb();

  const [courseName, setCourseName] = useState<string>('');
  const [evalShortName, setEvalShortName] = useState<string>('');
  const [evalFullName, setEvalFullName] = useState<string>('');

  useEffect(() => {
    if (previewData) {
      setCourseName(previewData.courseName);
      setEvalShortName(previewData.evalShortName || '');
      setEvalFullName(previewData.evalFullName || '');
      return;
    }

    async function loadCourseData() {
      try {
        const enrollments = await coursesService.getMyCourseCycles();
        const found = enrollments.find(
          (e) => e.courseCycle.id === cursoId,
        );
        if (found) {
          setCourseName(found.courseCycle.course.name);
        }
      } catch (err) {
        console.error('Error al cargar nombre del curso:', err);
      }
    }

    async function loadEvalNames() {
      try {
        const data = await coursesService.getPreviousCycleContent(cursoId, cycleCode);
        const eval_ = data.evaluations.find((e) => e.id === evalId);
        if (eval_) {
          setEvalShortName(eval_.shortName);
          setEvalFullName(eval_.fullName);
        }
      } catch (err) {
        console.error('Error al cargar datos de evaluación:', err);
      }
    }

    loadCourseData();
    loadEvalNames();
  }, [cursoId, cycleCode, evalId, previewData]);

  useEffect(() => {
    if (!courseName) return;
    if (previewData?.manageBreadcrumb === false) return;

    const previousCycleHref =
      previewData?.backHref ||
      `/plataforma/curso/${cursoId}/ciclo-anterior/${cycleCode}`;
    const cyclesRootHref = `/plataforma/curso/${cursoId}`;
    setBreadcrumbItems([
      { label: 'Cursos' },
      { label: courseName, href: cyclesRootHref },
      { label: 'Ciclos Anteriores', href: cyclesRootHref },
      { label: `Ciclo ${cycleCode}`, href: previousCycleHref },
      { label: evalShortName },
    ]);
  }, [setBreadcrumbItems, courseName, evalShortName, cursoId, cycleCode, previewData]);

  const handleEvalNameDetected = useCallback((name: string) => {
    if (!evalShortName) {
      setEvalShortName(name);
    }
  }, [evalShortName]);

  const getClassPageUrl = useCallback(
    (eventId: string) =>
      previewData?.getClassPageUrl?.(eventId) ||
      `/plataforma/curso/${cursoId}/ciclo-anterior/${cycleCode}/evaluacion/${evalId}/clase/${eventId}`,
    [cursoId, cycleCode, evalId, previewData],
  );

  return (
    <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
      <Link
        href={
          previewData?.backHref ||
          `/plataforma/curso/${cursoId}/ciclo-anterior/${cycleCode}`
        }
        className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex justify-center items-center gap-2 mb-6"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          {previewData?.backLabel || `Volver al Ciclo ${cycleCode}`}
        </span>
      </Link>

      <div className="self-stretch px-10 py-8 relative bg-gradient-to-r from-magenta-violet-800 via-magenta-violet-600 to-muted-indigo-200 rounded-xl inline-flex flex-col justify-center items-start gap-2 overflow-hidden mb-8">
        <div className="w-40 h-40 absolute right-[-12] top-[-1.5] overflow-hidden">
          <Icon name="inventory_2" size={200} className="text-icon-info-secondary" />
        </div>
        <div className="self-stretch flex flex-col justify-center items-start gap-0.5">
          <span className="self-stretch text-text-white text-3xl font-semibold leading-10">
            {evalShortName}
          </span>
          {evalFullName && (
            <span className="self-stretch text-text-white text-sm font-normal leading-4">
              {evalFullName.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <EvaluationPageContent
        evalId={evalId}
        getClassPageUrl={getClassPageUrl}
        onEvalNameDetected={handleEvalNameDetected}
      />
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { coursesService } from '@/services/courses.service';
import type { CourseCycle } from '@/types/api';
import Icon from '@/components/ui/Icon';
import { EvaluationPageContent } from '@/components/pages/student/EvaluationShared';

interface EvaluationContentProps {
  cursoId: string;
  evalId: string;
}

export default function EvaluationContent({
  cursoId,
  evalId,
}: EvaluationContentProps) {
  const { setBreadcrumbItems } = useBreadcrumb();

  const [courseName, setCourseName] = useState<string>('');
  const [evalShortName, setEvalShortName] = useState<string>('');
  const [evalFullName, setEvalFullName] = useState<string>('');

  useEffect(() => {
    async function loadCourseData() {
      try {
        const courses = await coursesService.getMyCourseCycles();
        const found = (Array.isArray(courses) ? courses : []).find(
          (cc: CourseCycle) => cc.id === cursoId,
        );
        if (found) {
          setCourseName(found.course?.name || '');
        }
      } catch (err) {
        console.error('Error al cargar nombre del curso:', err);
      }
    }

    async function loadEvalNames() {
      try {
        const data = await coursesService.getCourseContent(cursoId);
        const eval_ = data.evaluations.find((e) => e.id === evalId);
        if (eval_) {
          setEvalShortName(eval_.name || eval_.evaluationType);
          setEvalFullName(eval_.evaluationType);
        }
      } catch (err) {
        console.error('Error al cargar datos de evaluación:', err);
      }
    }

    loadCourseData();
    loadEvalNames();
  }, [cursoId, evalId]);

  useEffect(() => {
    if (!courseName) return;
    setBreadcrumbItems([
      { label: 'Cursos' },
      { label: courseName, href: `/plataforma/curso/${cursoId}` },
      { label: 'Ciclo Vigente', href: `/plataforma/curso/${cursoId}` },
      { label: evalShortName },
    ]);
  }, [setBreadcrumbItems, courseName, evalShortName, cursoId]);

  const handleEvalNameDetected = useCallback((name: string) => {
    if (!evalShortName) {
      setEvalShortName(name);
    }
  }, [evalShortName]);

  const getClassPageUrl = useCallback(
    (eventId: string) =>
      `/plataforma/curso/${cursoId}/evaluacion/${evalId}/clase/${eventId}`,
    [cursoId, evalId],
  );

  return (
    <div className="w-full inline-flex flex-col justify-start items-start overflow-hidden">
      {/* Back Link */}
      <Link
        href={`/plataforma/curso/${cursoId}`}
        className="p-1 rounded-lg hover:bg-bg-secondary transition-colors inline-flex justify-center items-center gap-2 mb-6"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          Volver al Ciclo Vigente
        </span>
      </Link>

      {/* Banner */}
      <div
        className="self-stretch px-10 py-8 relative rounded-xl inline-flex flex-col justify-center items-start gap-2 overflow-hidden mb-8"
        style={{
          background:
            'linear-gradient(to right, var(--muted-indigo-800), var(--muted-indigo-700), var(--muted-indigo-200))',
        }}
      >
        <div className="w-40 h-40 absolute right-[-36px] top-[-12px] overflow-hidden">
          <Icon name="school" size={160} className="text-muted-indigo-700" />
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

      {/* Tabs + Content (shared) */}
      <EvaluationPageContent
        evalId={evalId}
        getClassPageUrl={getClassPageUrl}
        onEvalNameDetected={handleEvalNameDetected}
      />
    </div>
  );
}

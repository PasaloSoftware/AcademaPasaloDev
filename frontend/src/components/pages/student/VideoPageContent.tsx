'use client';

import { useCallback } from 'react';
import { enrollmentService } from '@/services/enrollment.service';
import { coursesService } from '@/services/courses.service';
import type { Enrollment } from '@/types/enrollment';
import VideoPageLayout from '@/components/shared/VideoPageLayout';

interface VideoPageContentProps {
  cursoId: string;
  evalId: string;
  eventId: string;
}

export default function VideoPageContent({ cursoId, evalId, eventId }: VideoPageContentProps) {
  const resolveNames = useCallback(async (cId: string, eId: string) => {
    let courseName = '';
    let evalShortName = '';

    try {
      const response = await enrollmentService.getMyCourses();
      const enrollments: Enrollment[] = Array.isArray(response)
        ? response
        : response.data || [];
      const found = enrollments.find((e) => e.courseCycle.id === cId);
      if (found) courseName = found.courseCycle.course.name;
    } catch (err) {
      console.error('Error al cargar nombre del curso:', err);
    }

    try {
      const data = await coursesService.getCurrentCycleContent(cId);
      const eval_ = data.evaluations.find((e) => e.id === eId);
      if (eval_) evalShortName = eval_.shortName;
    } catch (err) {
      console.error('Error al cargar datos de evaluación:', err);
    }

    return { courseName, evalShortName };
  }, []);

  return (
    <VideoPageLayout
      cursoId={cursoId}
      evalId={evalId}
      eventId={eventId}
      resolveNames={resolveNames}
    />
  );
}

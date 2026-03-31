import { useState, useEffect, useMemo } from 'react';
import { coursesService } from '@/services/courses.service';
import type { Enrollment } from '@/types/enrollment';

export function useTeacherCourses() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await coursesService.getMyCourseCycles();
      setEnrollments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cursos');
      console.error('Error loading teacher courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const courseCycles = useMemo(() => {
    return enrollments.map((e) => e.courseCycle);
  }, [enrollments]);

  const uniqueCourses = useMemo(() => {
    if (!enrollments || enrollments.length === 0) return [];

    return enrollments.reduce((acc, enrollment) => {
      const course = enrollment.courseCycle.course;
      if (course && !acc.find((c) => c.id === course.id)) {
        acc.push({ id: course.id, code: course.code, name: course.name });
      }
      return acc;
    }, [] as Array<{ id: string; code: string; name: string }>);
  }, [enrollments]);

  return {
    enrollments,
    courseCycles,
    uniqueCourses,
    loading,
    error,
    refetch: loadCourses,
  };
}

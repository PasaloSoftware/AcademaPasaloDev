'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/Icon';
import { usersService } from '@/services/users.service';
import type { AdminUserDetailCourse } from '@/services/users.service';
import { getCourseColor } from '@/lib/courseColors';

// ============================================
// Types
// ============================================

interface CourseCatalogItem {
  courseId: string;
  courseCode: string;
  courseName: string;
}

interface CourseCycleOption {
  courseCycleId: string;
  academicCycleCode: string;
}

// ============================================
// Role tag (small, for section headers)
// ============================================

const ROLE_TAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Alumno: { bg: 'bg-bg-accent-light', text: 'text-text-accent-primary', label: 'ALUMNO' },
  Asesor: { bg: 'bg-bg-info-primary-light', text: 'text-text-info-primary', label: 'ASESOR' },
};

function RoleTag({ role }: { role: string }) {
  const style = ROLE_TAG_STYLES[role] || { bg: 'bg-bg-quartiary', text: 'text-text-secondary', label: role.toUpperCase() };
  return (
    <span className={`px-2.5 py-1.5 ${style.bg} rounded-full inline-flex items-center whitespace-nowrap`}>
      <span className={`${style.text} text-xs font-medium leading-3`}>{style.label}</span>
    </span>
  );
}

// ============================================
// Course card
// ============================================

function CourseCard({
  course,
  onRemove,
  showEdit,
  readOnly,
}: {
  course: AdminUserDetailCourse;
  onRemove?: () => void;
  showEdit?: boolean;
  readOnly?: boolean;
}) {
  const color = getCourseColor(course.courseCode);
  return (
    <div className="bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center">
      <div className="w-5 self-stretch rounded-tl-xl rounded-bl-xl" style={{ backgroundColor: color.primary }} />
      <div className="flex-1 h-16 px-4 flex items-center gap-5">
        <span className="flex-1 text-text-primary text-sm font-semibold leading-4 line-clamp-2">{course.courseName}</span>
        {!readOnly && (
          <div className="flex items-center gap-1">
            {showEdit && (
              <button className="p-1 rounded-full hover:bg-bg-secondary transition-colors">
                <Icon name="edit" size={20} className="text-icon-tertiary" variant="rounded" />
              </button>
            )}
            {onRemove && (
              <button onClick={onRemove} className="p-1 rounded-full hover:bg-bg-secondary transition-colors">
                <Icon name="close" size={20} className="text-icon-tertiary" variant="rounded" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Course search input with autocomplete
// ============================================

function CourseSearchInput({
  placeholder,
  existingCourseIds,
  onSelect,
}: {
  placeholder: string;
  existingCourseIds: string[];
  onSelect: (course: CourseCatalogItem, courseCycleId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<CourseCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load catalog once
  useEffect(() => {
    usersService.getCourseCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = catalog.filter((c) =>
    !existingCourseIds.includes(c.courseId) &&
    (c.courseName.toLowerCase().includes(query.toLowerCase()) || c.courseCode.toLowerCase().includes(query.toLowerCase()))
  );

  const handleSelect = async (course: CourseCatalogItem) => {
    setLoading(true);
    try {
      const cycleData = await usersService.getCourseCycleOptions(course.courseId);
      if (cycleData.currentCycle) {
        onSelect(course, cycleData.currentCycle.courseCycleId);
      }
    } catch {
      // Could not get cycle info
    } finally {
      setLoading(false);
      setQuery('');
      setShowDropdown(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-2 focus-within:outline-stroke-accent-secondary transition-colors">
        <Icon name="search" size={16} className="text-icon-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="flex-1 text-text-primary text-base font-normal leading-4 bg-transparent outline-none placeholder:text-text-tertiary"
        />
        {loading && <div className="w-4 h-4 border-2 border-accent-solid border-t-transparent rounded-full animate-spin" />}
      </div>
      {showDropdown && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-10 max-h-60 overflow-y-auto p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-text-tertiary text-sm">No se encontraron cursos</div>
          ) : (
            filtered.slice(0, 8).map((course) => (
              <button
                key={course.courseId}
                onClick={() => handleSelect(course)}
                className="px-2 py-3 rounded text-left hover:bg-bg-secondary transition-colors flex items-center gap-2"
              >
                <span className="text-text-tertiary text-xs font-medium">{course.courseCode}</span>
                <span className="flex-1 text-text-secondary text-sm font-normal leading-4">{course.courseName}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Enrollment Section (student)
// ============================================

export function EnrollmentSection({
  courses,
  onCoursesChange,
  readOnly = false,
}: {
  courses: AdminUserDetailCourse[];
  onCoursesChange?: (courses: AdminUserDetailCourse[]) => void;
  readOnly?: boolean;
}) {
  const existingCourseIds = courses.map((c) => c.courseId);

  const handleAdd = (catalog: CourseCatalogItem, courseCycleId: string) => {
    if (!onCoursesChange) return;
    const newCourse: AdminUserDetailCourse = {
      relationId: `new-${Date.now()}`,
      courseId: catalog.courseId,
      courseCycleId,
      courseCode: catalog.courseCode,
      courseName: catalog.courseName,
      academicCycleCode: '',
    };
    onCoursesChange([...courses, newCourse]);
  };

  const handleRemove = (relationId: string) => {
    if (!onCoursesChange) return;
    onCoursesChange(courses.filter((c) => c.relationId !== relationId));
  };

  return (
    <div className="p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <div className="flex-1 flex items-center gap-2">
          <Icon name="school" size={20} className="text-icon-info-secondary" variant="rounded" />
          <span className="text-text-primary text-lg font-semibold leading-5">Gestión de Matrícula</span>
        </div>
        <RoleTag role="Alumno" />
      </div>

      {!readOnly && (
        <CourseSearchInput
          placeholder="Buscar curso para matricular..."
          existingCourseIds={existingCourseIds}
          onSelect={handleAdd}
        />
      )}

      <div className="flex flex-col gap-5">
        <span className="text-gray-600 text-sm font-semibold leading-4">Cursos Matriculados</span>
        {courses.length === 0 ? (
          <span className="text-text-tertiary text-sm">No tiene cursos matriculados</span>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {courses.map((course) => (
              <CourseCard
                key={course.relationId}
                course={course}
                showEdit={!readOnly}
                readOnly={readOnly}
                onRemove={!readOnly ? () => handleRemove(course.relationId) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Teaching Section (professor)
// ============================================

export function TeachingSection({
  courses,
  onCoursesChange,
  readOnly = false,
}: {
  courses: AdminUserDetailCourse[];
  onCoursesChange?: (courses: AdminUserDetailCourse[]) => void;
  readOnly?: boolean;
}) {
  const existingCourseIds = courses.map((c) => c.courseId);

  const handleAdd = (catalog: CourseCatalogItem, courseCycleId: string) => {
    if (!onCoursesChange) return;
    const newCourse: AdminUserDetailCourse = {
      relationId: `new-${Date.now()}`,
      courseId: catalog.courseId,
      courseCycleId,
      courseCode: catalog.courseCode,
      courseName: catalog.courseName,
      academicCycleCode: '',
    };
    onCoursesChange([...courses, newCourse]);
  };

  const handleRemove = (relationId: string) => {
    if (!onCoursesChange) return;
    onCoursesChange(courses.filter((c) => c.relationId !== relationId));
  };

  return (
    <div className="p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <div className="flex-1 flex items-center gap-2">
          <Icon name="assignment_ind" size={20} className="text-icon-info-secondary" variant="rounded" />
          <span className="text-text-primary text-lg font-semibold leading-5">Gestión de Cursos a Cargo</span>
        </div>
        <RoleTag role="Asesor" />
      </div>

      {!readOnly && (
        <CourseSearchInput
          placeholder="Buscar curso para asignar..."
          existingCourseIds={existingCourseIds}
          onSelect={handleAdd}
        />
      )}

      <div className="flex flex-col gap-5">
        <span className="text-gray-600 text-sm font-semibold leading-4">Cursos Asignados</span>
        {courses.length === 0 ? (
          <span className="text-text-tertiary text-sm">No tiene cursos asignados</span>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {courses.map((course) => (
              <CourseCard
                key={course.relationId}
                course={course}
                readOnly={readOnly}
                onRemove={!readOnly ? () => handleRemove(course.relationId) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

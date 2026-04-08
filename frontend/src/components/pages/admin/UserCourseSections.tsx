'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/Icon';
import FloatingInput from '@/components/ui/FloatingInput';
import Modal from '@/components/ui/Modal';
import { usersService } from '@/services/users.service';
import type { AdminUserDetailCourse } from '@/services/users.service';

// Re-export types used by consumers
export type { AdminUserDetailCourse };
import { getCourseColor } from '@/lib/courseColors';

// ============================================
// Personal Info types
// ============================================

export interface PersonalInfoData {
  firstName: string;
  lastName1: string;
  lastName2: string;
  email: string;
  phone: string;
  career: { id: number; name: string } | null;
}

// ============================================
// Searchable career select
// ============================================

function CareerSearchSelect({
  value,
  careers,
  onChange,
}: {
  value: { id: number; name: string } | null;
  careers: Array<{ id: number; name: string }>;
  onChange: (career: { id: number; name: string } | null) => void;
}) {
  const [query, setQuery] = useState(value?.name || '');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const prevName = useRef(value?.name || '');

  if (value?.name !== prevName.current) {
    prevName.current = value?.name || '';
    if (query !== (value?.name || '')) {
      setQuery(value?.name || '');
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value?.name || '');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value]);

  const filtered = careers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const isFilled = !!value;

  return (
    <div ref={wrapperRef} className="self-stretch relative flex flex-col justify-start items-start gap-1">
      <div className={`self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] ${open ? 'outline-stroke-accent-secondary' : 'outline-stroke-primary'} inline-flex justify-start items-center gap-2 transition-colors`}>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null); }}
          onFocus={() => setOpen(true)}
          placeholder={isFilled ? '' : 'Carrera'}
          className="flex-1 text-text-primary text-base font-normal leading-4 bg-transparent outline-none placeholder:text-text-tertiary"
        />
        <Icon name="expand_more" size={20} className="text-icon-tertiary" />
      </div>
      {(isFilled || open) && (
        <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
          <span className={`text-xs font-normal leading-4 ${open ? 'text-text-accent-primary' : 'text-text-tertiary'}`}>Carrera</span>
        </div>
      )}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-10 max-h-60 overflow-y-auto p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-text-tertiary text-sm">No se encontraron carreras</div>
          ) : (
            filtered.map((career) => (
              <button
                key={career.id}
                onClick={() => { onChange(career); setQuery(career.name); setOpen(false); }}
                className={`px-2 py-3 rounded text-left text-sm font-normal leading-4 hover:bg-bg-secondary transition-colors ${value?.id === career.id ? 'text-text-accent-primary font-medium' : 'text-text-secondary'}`}
              >
                {career.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Personal Info Section
// ============================================

export function PersonalInfoSection({
  data,
  onChange,
  idPrefix = 'user',
}: {
  data: PersonalInfoData;
  onChange: (field: keyof PersonalInfoData, value: string | { id: number; name: string } | null) => void;
  idPrefix?: string;
}) {
  const [careers, setCareers] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    usersService.getCareers().then(setCareers).catch(() => setCareers([]));
  }, []);

  return (
    <div className="p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-6">
      <div className="flex items-start gap-2">
        <Icon name="person" size={20} className="text-icon-info-secondary" variant="rounded" />
        <span className="flex-1 text-text-primary text-lg font-semibold leading-5">Información Personal</span>
      </div>
      <div className="flex flex-col gap-4">
        <FloatingInput id={`${idPrefix}-firstName`} label="Nombres" value={data.firstName} onChange={(v) => onChange('firstName', v)} />
        <FloatingInput id={`${idPrefix}-lastName1`} label="Primer Apellido" value={data.lastName1} onChange={(v) => onChange('lastName1', v)} />
        <FloatingInput id={`${idPrefix}-lastName2`} label="Segundo Apellido" value={data.lastName2} onChange={(v) => onChange('lastName2', v)} />
        <FloatingInput id={`${idPrefix}-email`} label="Correo Electrónico" value={data.email} onChange={(v) => onChange('email', v)} />
        <FloatingInput id={`${idPrefix}-phone`} label="Teléfono" value={data.phone} onChange={(v) => onChange('phone', v)} />
        <CareerSearchSelect value={data.career} careers={careers} onChange={(v) => onChange('career', v)} />
      </div>
    </div>
  );
}

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
  onEdit,
  readOnly,
}: {
  course: AdminUserDetailCourse;
  onRemove?: () => void;
  onEdit?: () => void;
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
            {onEdit && (
              <button onClick={onEdit} className="p-1 rounded-full hover:bg-bg-secondary transition-colors flex items-center justify-center">
                <Icon name="edit" size={20} className="text-icon-tertiary" variant="rounded" />
              </button>
            )}
            {onRemove && (
              <button onClick={onRemove} className="p-1 rounded-full hover:bg-bg-secondary transition-colors flex items-center justify-center">
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
// Enrollment Modal
// ============================================

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: {
    courseCycleId: string;
    courseId: string;
    courseCode: string;
    courseName: string;
    enrollmentTypeCode: 'FULL' | 'PARTIAL';
    evaluationIds: string[];
    historicalCourseCycleIds: string[];
  }) => void;
  courseName: string;
  courseId: string;
  courseCycleId: string;
  studentName: string;
  initialEnrollmentTypeCode?: 'FULL' | 'PARTIAL';
  initialEvaluationIds?: string[];
  initialHistoricalCourseCycleIds?: string[];
}

function EnrollmentModal({
  isOpen,
  onClose,
  onSave,
  courseName,
  courseId,
  courseCycleId,
  studentName,
  initialEnrollmentTypeCode,
  initialEvaluationIds,
  initialHistoricalCourseCycleIds,
}: EnrollmentModalProps) {
  const [enrollmentType, setEnrollmentType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [evaluations, setEvaluations] = useState<Array<{ id: string; shortName: string }>>([]);
  const [selectedEvalIds, setSelectedEvalIds] = useState<Set<string>>(new Set());
  const [historicalCycles, setHistoricalCycles] = useState<Array<{ courseCycleId: string; academicCycleCode: string }>>([]);
  const [selectedHistoricalIds, setSelectedHistoricalIds] = useState<Set<string>>(new Set());
  const [showHistorical, setShowHistorical] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!isOpen || !courseCycleId) return;
    setLoadingDetail(true);
    setEnrollmentType(initialEnrollmentTypeCode || 'FULL');
    setSelectedEvalIds(new Set(initialEvaluationIds || []));
    setSelectedHistoricalIds(new Set());
    setShowHistorical(initialEnrollmentTypeCode === 'FULL');

    usersService.getCourseCycleDetail(courseCycleId)
      .then((detail) => {
        setEvaluations(detail.evaluations.map((e) => ({ id: e.id, shortName: e.shortName })));
        setHistoricalCycles(detail.historicalCycles);
        setSelectedHistoricalIds(
          new Set(
            initialHistoricalCourseCycleIds &&
            initialHistoricalCourseCycleIds.length > 0
              ? initialHistoricalCourseCycleIds
              : detail.historicalCycles.map((c) => c.courseCycleId),
          ),
        );
      })
      .catch(() => { setEvaluations([]); setHistoricalCycles([]); })
      .finally(() => setLoadingDetail(false));
  }, [
    isOpen,
    courseCycleId,
    initialEnrollmentTypeCode,
    initialEvaluationIds,
    initialHistoricalCourseCycleIds,
  ]);

  const toggleEval = (id: string) => {
    setSelectedEvalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleHistorical = (id: string) => {
    setSelectedHistoricalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSave = enrollmentType === 'FULL' || selectedEvalIds.size > 0;


  const handleSave = () => {
    onSave({
      courseCycleId,
      courseId,
      courseCode: '',
      courseName,
      enrollmentTypeCode: enrollmentType,
      evaluationIds: enrollmentType === 'PARTIAL' ? Array.from(selectedEvalIds) : [],
      historicalCourseCycleIds: showHistorical ? Array.from(selectedHistoricalIds) : [],
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Matrícula"
      size="lg"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={onClose}>Cancelar</Modal.Button>
          <Modal.Button disabled={!canSave || loadingDetail} onClick={handleSave}>Guardar</Modal.Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Curso (disabled) */}
        <div className="self-stretch relative flex flex-col gap-1">
          <div className="h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-2">
            <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">{courseName}</span>
            <Icon name="expand_more" size={20} className="text-gray-500" />
          </div>
          <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex">
            <span className="text-text-tertiary text-xs font-normal leading-4">Curso Seleccionado</span>
          </div>
        </div>

        {/* Alumno (disabled) */}
        <div className="self-stretch relative flex flex-col gap-1">
          <div className="h-12 px-3 py-3.5 bg-gray-200 rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-2">
            <span className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1">{studentName}</span>
            <Icon name="expand_more" size={20} className="text-gray-500" />
          </div>
          <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex">
            <span className="text-text-tertiary text-xs font-normal leading-4">Alumno</span>
          </div>
        </div>

        {/* Enrollment type */}
        <div className="flex flex-col gap-2">
          <span className="text-text-quartiary text-sm font-medium leading-4">Modalidad de Inscripción</span>

          {/* FULL */}
          <button
            onClick={() => setEnrollmentType('FULL')}
            className={`p-4 rounded-lg flex flex-col gap-0 transition-colors ${
              enrollmentType === 'FULL'
                ? 'outline outline-1 outline-stroke-accent-primary'
                : 'outline outline-1 outline-stroke-secondary'
            }`}
          >
            <div className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${enrollmentType === 'FULL' ? 'border-bg-accent-primary-solid' : 'border-icon-tertiary'}`}>
                {enrollmentType === 'FULL' && <div className="w-2.5 h-2.5 rounded-full bg-bg-accent-primary-solid" />}
              </div>
              <span className="flex-1 text-text-primary text-base font-normal leading-4 text-left">Ciclo completo</span>
            </div>
            <span className="pl-6 text-text-tertiary text-xs font-light leading-3 text-left">Acceso a todas las evaluaciones</span>
          </button>

          {/* PARTIAL */}
          <div className="flex flex-col">
            <button
              onClick={() => {
                setEnrollmentType('PARTIAL');
                setShowHistorical(false);
              }}
              className={`p-4 rounded-lg flex flex-col gap-0 transition-colors ${
                enrollmentType === 'PARTIAL'
                  ? 'outline outline-1 outline-stroke-accent-primary'
                  : 'outline outline-1 outline-stroke-secondary'
              }`}
            >
              <div className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${enrollmentType === 'PARTIAL' ? 'border-bg-accent-primary-solid' : 'border-icon-tertiary'}`}>
                  {enrollmentType === 'PARTIAL' && <div className="w-2.5 h-2.5 rounded-full bg-bg-accent-primary-solid" />}
                </div>
                <span className="flex-1 text-text-primary text-base font-normal leading-4 text-left">Evaluaciones una a una</span>
              </div>
              <span className="pl-6 text-text-tertiary text-xs font-light leading-3 text-left">Acceso a evaluaciones específicas</span>
            </button>

            {/* Evaluation checkboxes */}
            {enrollmentType === 'PARTIAL' && evaluations.length > 0 && (
              <div className="pl-4 pt-4 border-l-2 border-stroke-secondary grid grid-cols-3 gap-3">
                {evaluations.map((ev) => {
                  const checked = selectedEvalIds.has(ev.id);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => toggleEval(ev.id)}
                      className={`p-2 rounded-lg flex items-center gap-1 ${checked ? 'outline outline-1 outline-stroke-accent-primary' : 'outline outline-1 outline-offset-[-1px] outline-stroke-disabled'}`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${checked ? 'bg-bg-accent-primary-solid border-bg-accent-primary-solid' : 'border-icon-tertiary'}`}>
                        {checked && <Icon name="check" size={14} className="text-icon-white" />}
                      </div>
                      <span className="flex-1 text-text-secondary text-base font-normal leading-4 text-left">{ev.shortName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Historical cycles */}
        <div className="p-6 bg-bg-info-primary-light rounded-xl flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-3">
              <div className="p-2 bg-muted-indigo-100 rounded-lg flex items-center justify-center">
                <Icon name="inventory_2" size={24} className="text-icon-info-primary" variant="rounded" />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-text-primary text-base font-semibold leading-5">Ciclos Pasados</span>
                <span className="text-text-quartiary text-xs font-normal leading-4">Habilitar material histórico</span>
              </div>
            </div>
            {/* Toggle */}
            <button
              onClick={() => setShowHistorical(!showHistorical)}
              className={`w-10 h-6 rounded-full relative transition-colors ${showHistorical ? 'bg-bg-info-primary-solid' : 'bg-bg-info-primary-light outline outline-1 outline-stroke-info-primary'}`}
            >
              <div className={`w-4 h-4 rounded-full absolute top-[4px] transition-all ${showHistorical ? 'left-[20px] bg-bg-tertiary' : 'left-[3px] bg-bg-info-primary-solid'}`} />
            </button>
          </div>

            {showHistorical && historicalCycles.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {historicalCycles.map((cycle) => {
              const checked = selectedHistoricalIds.has(cycle.courseCycleId);
              return (
                <button
                key={cycle.courseCycleId}
                onClick={() => toggleHistorical(cycle.courseCycleId)}
                className="p-2 rounded-lg flex items-center gap-1 bg-white"
                >
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${checked ? 'bg-bg-accent-primary-solid border-bg-accent-primary-solid' : 'border-icon-tertiary'}`}>
                  {checked && <Icon name="check" size={14} className="text-icon-white" />}
                </div>
                <span className="flex-1 text-text-secondary text-base font-normal leading-4 text-left">{cycle.academicCycleCode}</span>
                </button>
              );
              })}
            </div>
            )}
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// Enrollment Section (student)
// ============================================

export function EnrollmentSection({
  courses,
  onCoursesChange,
  readOnly = false,
  studentName = '',
}: {
  courses: AdminUserDetailCourse[];
  onCoursesChange?: (courses: AdminUserDetailCourse[]) => void;
  readOnly?: boolean;
  studentName?: string;
}) {
  const existingCourseIds = courses.map((c) => c.courseId);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingCourse, setPendingCourse] = useState<{ courseId: string; courseName: string; courseCode: string; courseCycleId: string } | null>(null);
  const [editingRelationId, setEditingRelationId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<{
    enrollmentTypeCode?: 'FULL' | 'PARTIAL';
    evaluationIds?: string[];
    historicalCourseCycleIds?: string[];
  } | null>(null);

  const handleSearchSelect = (catalog: CourseCatalogItem, courseCycleId: string) => {
    setEditingRelationId(null);
    setEditingConfig(null);
    setPendingCourse({ courseId: catalog.courseId, courseName: catalog.courseName, courseCode: catalog.courseCode, courseCycleId });
    setModalOpen(true);
  };

  const handleModalSave = (config: {
    courseCycleId: string;
    courseId: string;
    courseName: string;
    enrollmentTypeCode: 'FULL' | 'PARTIAL';
    evaluationIds: string[];
    historicalCourseCycleIds: string[];
  }) => {
    if (!onCoursesChange || !pendingCourse) return;

    if (editingRelationId) {
      // Update existing course
      onCoursesChange(courses.map((c) =>
        c.relationId === editingRelationId
          ? { ...c, enrollmentTypeCode: config.enrollmentTypeCode, evaluationIds: config.evaluationIds, historicalCourseCycleIds: config.historicalCourseCycleIds }
          : c,
      ));
    } else {
      // Add new course
      const newCourse: AdminUserDetailCourse = {
        relationId: `new-${Date.now()}`,
        courseId: pendingCourse.courseId,
        courseCycleId: config.courseCycleId,
        courseCode: pendingCourse.courseCode,
        courseName: pendingCourse.courseName,
        academicCycleCode: '',
        enrollmentTypeCode: config.enrollmentTypeCode,
        evaluationIds: config.evaluationIds,
        historicalCourseCycleIds: config.historicalCourseCycleIds,
      };
      onCoursesChange([...courses, newCourse]);
    }
    setPendingCourse(null);
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
          onSelect={handleSearchSelect}
        />
      )}

      {courses.length > 0 && (
        <div className="flex flex-col gap-5">
          <span className="text-gray-600 text-sm font-semibold leading-4">Cursos Matriculados</span>
          <div className="grid grid-cols-3 gap-5">
            {courses.map((course) => (
              <CourseCard
                key={course.relationId}
                course={course}
                readOnly={readOnly}
                onEdit={!readOnly ? () => {
                  setPendingCourse({ courseId: course.courseId, courseName: course.courseName, courseCode: course.courseCode, courseCycleId: course.courseCycleId });
                  setEditingRelationId(course.relationId);
                  setEditingConfig({
                    enrollmentTypeCode: course.enrollmentTypeCode,
                    evaluationIds: course.evaluationIds || [],
                    historicalCourseCycleIds: course.historicalCourseCycleIds || [],
                  });
                  setModalOpen(true);
                } : undefined}
                onRemove={!readOnly ? () => handleRemove(course.relationId) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {pendingCourse && (
        <EnrollmentModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setPendingCourse(null);
            setEditingRelationId(null);
            setEditingConfig(null);
          }}
          onSave={handleModalSave}
          courseName={pendingCourse.courseName}
          courseId={pendingCourse.courseId}
          courseCycleId={pendingCourse.courseCycleId}
          studentName={studentName}
          initialEnrollmentTypeCode={editingConfig?.enrollmentTypeCode}
          initialEvaluationIds={editingConfig?.evaluationIds}
          initialHistoricalCourseCycleIds={editingConfig?.historicalCourseCycleIds}
        />
      )}
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
          <Icon name="work" size={20} className="text-icon-info-secondary" variant="rounded" />
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

      {courses.length > 0 && (
        <div className="flex flex-col gap-5">
          <span className="text-gray-600 text-sm font-semibold leading-4">Cursos Asignados</span>
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
        </div>
      )}
    </div>
  );
}

// ============================================
// Role Assignment Section (shared by Create & Edit)
// ============================================

const ROLE_OPTIONS = [
  { code: 'STUDENT', label: 'Alumno', adminOnly: false },
  { code: 'PROFESSOR', label: 'Asesor', adminOnly: false },
  { code: 'ADMIN', label: 'Administrador', adminOnly: true },
  { code: 'SUPER_ADMIN', label: 'Superadministrador', adminOnly: true },
];

/** Maps backend role labels (e.g. "Alumno") to role codes (e.g. "STUDENT") */
export function mapBackendRolesToCodes(backendRoles: string[]): Set<string> {
  const codes = new Set<string>();
  backendRoles.forEach((r) => {
    const found = ROLE_OPTIONS.find((o) => o.label === r);
    if (found) codes.add(found.code);
  });
  return codes;
}

export function RoleAssignmentSection({
  selectedRoles,
  onToggleRole,
  enrolledCourses,
  onEnrolledCoursesChange,
  teachingCourses,
  onTeachingCoursesChange,
  studentName = '',
}: {
  selectedRoles: Set<string>;
  onToggleRole: (code: string) => void;
  enrolledCourses: AdminUserDetailCourse[];
  onEnrolledCoursesChange: (courses: AdminUserDetailCourse[]) => void;
  teachingCourses: AdminUserDetailCourse[];
  onTeachingCoursesChange: (courses: AdminUserDetailCourse[]) => void;
  studentName?: string;
}) {
  const hasStudentRole = selectedRoles.has('STUDENT');
  const hasTeacherRole = selectedRoles.has('PROFESSOR');

  return (
    <div className="flex flex-col">
      <div className="p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-6">
        <div className="flex items-start gap-2">
          <Icon name="assignment_ind" size={20} className="text-icon-info-secondary" variant="rounded" />
          <span className="flex-1 text-text-primary text-lg font-semibold leading-5">Asignación de Roles</span>
        </div>
        <div className="flex flex-col gap-4">
          {ROLE_OPTIONS.map(({ code, label, adminOnly }) => {
            const checked = selectedRoles.has(code);
            const disabled = adminOnly;
            return (
              <button
                key={code}
                onClick={() => !disabled && onToggleRole(code)}
                disabled={disabled}
                className={`self-stretch p-4 rounded-lg flex items-center gap-2 transition-colors ${
                  disabled
                    ? 'bg-gray-200 cursor-not-allowed'
                    : checked
                      ? 'bg-bg-primary outline outline-1 outline-stroke-accent-primary'
                      : 'bg-bg-primary outline outline-1 outline-stroke-primary hover:bg-bg-secondary'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                  disabled
                    ? 'border-gray-500 bg-transparent'
                    : checked
                      ? 'bg-bg-accent-primary-solid border-bg-accent-primary-solid'
                      : 'border-icon-tertiary bg-transparent'
                }`}>
                  {checked && !disabled && <Icon name="check" size={14} className="text-icon-white" />}
                </div>
                <span className={`flex-1 text-base font-normal leading-4 text-left ${disabled ? 'text-text-disabled' : 'text-text-secondary'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {(hasStudentRole || hasTeacherRole) && (
        <div className="border-l-2 pl-4 pt-4 border-stroke-secondary flex flex-col gap-4">
          {hasStudentRole && (
            <EnrollmentSection courses={enrolledCourses} onCoursesChange={onEnrolledCoursesChange} studentName={studentName} />
          )}
          {hasTeacherRole && (
            <TeachingSection courses={teachingCourses} onCoursesChange={onTeachingCoursesChange} />
          )}
        </div>
      )}
    </div>
  );
}

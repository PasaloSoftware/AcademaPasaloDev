'use client';

import type { CalendarView } from '@/hooks/useCalendar';
import Icon from '@/components/ui/Icon';
import FloatingSelect from '@/components/ui/FloatingSelect';

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

interface CalendarHeaderProps {
  title: string;
  currentMonthYear: string;
  view: CalendarView;
  selectedCourseId: string | null;
  courses: CourseOption[];
  loadingCourses: boolean;
  onViewChange: (view: CalendarView) => void;
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
  onCourseChange: (courseCode: string | null) => void;
  actions?: React.ReactNode;
}

export default function CalendarHeader({
  title,
  currentMonthYear,
  view,
  selectedCourseId,
  courses,
  loadingCourses,
  onViewChange,
  onNext,
  onPrevious,
  onToday,
  onCourseChange,
  actions,
}: CalendarHeaderProps) {
  const selectOptions = courses.map((c) => ({
    value: c.code,
    label: c.name,
  }));

  return (
    <>
      <div className="flex justify-between items-center flex-shrink-0">
        <h1 className="text-3xl font-semibold text-text-primary">{title}</h1>

        <div className="flex items-center gap-3">
          {actions}

          <FloatingSelect
            label="Curso"
            value={selectedCourseId}
            options={selectOptions}
            onChange={onCourseChange}
            allLabel="Todos"
            disabled={loadingCourses}
          />
        </div>
      </div>

      <div className="p-4 bg-bg-primary rounded-xl border border-stroke-primary flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-5">
            <button
              onClick={onToday}
              className="px-4 py-3 bg-bg-primary rounded-lg border border-stroke-accent-primary text-sm font-medium text-text-accent-primary hover:bg-accent-light transition-colors"
            >
              Hoy
            </button>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={onPrevious}
                  className="p-1 rounded-lg hover:bg-bg-secondary transition-colors"
                  aria-label="Anterior"
                >
                  <Icon name="chevron_left" size={16} className="text-icon-accent-primary" />
                </button>
                <button
                  onClick={onNext}
                  className="p-1 rounded-lg hover:bg-bg-secondary transition-colors"
                  aria-label="Siguiente"
                >
                  <Icon name="chevron_right" size={16} className="text-icon-accent-primary" />
                </button>
              </div>

              <div className="flex items-center gap-1 capitalize">
                <span className="text-xl font-medium text-text-primary">
                  {currentMonthYear}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onViewChange('weekly')}
              className={`px-2.5 py-2 rounded flex items-center gap-1 text-sm font-medium transition-colors ${
                view === 'weekly'
                  ? 'bg-deep-blue-700 text-white'
                  : 'bg-bg-primary text-text-accent-primary border border-stroke-accent-primary hover:bg-accent-light'
              }`}
            >
              <Icon name="calendar_view_week" size={16} />
              Semanal
            </button>
            <button
              onClick={() => onViewChange('monthly')}
              className={`px-2.5 py-2 rounded flex items-center gap-1 text-sm font-medium transition-colors ${
                view === 'monthly'
                  ? 'bg-deep-blue-700 text-white'
                  : 'bg-bg-primary text-text-accent-primary border border-stroke-accent-primary hover:bg-accent-light'
              }`}
            >
              <Icon name="calendar_view_month" size={16} />
              Mensual
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

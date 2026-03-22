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
    <div className="self-stretch flex flex-col gap-8 flex-shrink-0">
      {/* Row 1: Title + Actions (Crear Evento) */}
      <div className="self-stretch inline-flex justify-between items-center">
        <h1 className="text-text-primary text-3xl font-semibold leading-10">
          Calendario de Clases
        </h1>
        {actions}
      </div>

      {/* Row 2: Course filter + Controls bar */}
      <div className="self-stretch inline-flex justify-between items-stretch">
        {/* Left: Course filter (stretches to match controls bar height) */}
        <FloatingSelect
          label="Curso"
          value={selectedCourseId}
          options={selectOptions}
          onChange={onCourseChange}
          allLabel="Todos"
          disabled={loadingCourses}
        />

        {/* Right: Controls bar */}
        <div className="p-2 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex justify-center items-center">
          {/* Today button */}
          <div className="pr-6 border-r border-stroke-primary flex justify-start items-start">
            <button
              onClick={onToday}
              className="px-6 py-2 bg-bg-accent-light rounded-lg flex justify-center items-center gap-1.5 hover:bg-bg-accent-light/80 transition-colors"
            >
              <span className="text-text-accent-primary text-sm font-medium leading-4">
                Hoy
              </span>
            </button>
          </div>

          {/* View toggles */}
          <div className="px-6 border-r border-stroke-secondary flex justify-center items-center">
            <div className="flex justify-start items-center gap-2.5">
              <button
                onClick={() => onViewChange('weekly')}
                className={`px-2.5 py-2 rounded flex justify-center items-center gap-1 text-sm font-medium transition-colors ${
                  view === 'weekly'
                    ? 'bg-bg-accent-primary-solid text-text-white'
                    : 'bg-bg-primary text-text-accent-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary'
                }`}
              >
                <Icon name="calendar_view_week" size={16} className={view === 'weekly' ? 'text-icon-white' : 'text-icon-accent-primary'} />
                <span>Semanal</span>
              </button>
              <button
                onClick={() => onViewChange('monthly')}
                className={`px-2.5 py-2 rounded flex justify-center items-center gap-1 text-sm font-medium transition-colors ${
                  view === 'monthly'
                    ? 'bg-bg-accent-primary-solid text-text-white'
                    : 'bg-bg-primary text-text-accent-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary'
                }`}
              >
                <Icon name="calendar_view_month" size={16} className={view === 'monthly' ? 'text-icon-white' : 'text-icon-accent-primary'} />
                <span>Mensual</span>
              </button>
            </div>
          </div>

          {/* Month/Year + Navigation */}
          <div className="pl-6 py-1 flex justify-center items-center">
            <div className="flex justify-start items-center gap-2">
              <span className="text-text-primary text-lg font-medium leading-5">
                {currentMonthYear}
              </span>
              <div className="flex justify-start items-center gap-2">
                <button
                  onClick={onPrevious}
                  className="p-1 rounded-lg flex justify-center items-center hover:bg-bg-secondary transition-colors"
                >
                  <Icon name="chevron_left" size={16} className="text-icon-accent-primary" />
                </button>
                <button
                  onClick={onNext}
                  className="p-1 rounded-lg flex justify-center items-center hover:bg-bg-secondary transition-colors"
                >
                  <Icon name="chevron_right" size={16} className="text-icon-accent-primary" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

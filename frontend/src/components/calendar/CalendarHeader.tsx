"use client";

import { useState, useRef, useEffect } from "react";
import type { CalendarView } from "@/hooks/useCalendar";
import Icon from "@/components/ui/Icon";

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

interface CalendarHeaderProps {
  title: string;
  currentMonthYear: string;
  view: CalendarView;
  selectedCourseIds: Set<string>;
  courses: CourseOption[];
  loadingCourses: boolean;
  onViewChange: (view: CalendarView) => void;
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
  onCourseChange: (courseIds: Set<string>) => void;
  actions?: React.ReactNode;
  leftActions?: React.ReactNode;
  courseBaseLabel?: string;
  emptyCourseStateLabel?: string;
  emptyCourseSearchLabel?: string;
}

// ============================================
// Searchable checkbox dropdown for courses
// ============================================

function CourseFilterDropdown({
  courses,
  selectedIds,
  onChange,
  disabled,
  baseLabel = "Todos los cursos",
  emptyStateLabel = "No hay cursos disponibles",
  emptySearchLabel = "No se encontraron cursos",
}: {
  courses: CourseOption[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
  disabled?: boolean;
  baseLabel?: string;
  emptyStateLabel?: string;
  emptySearchLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.code.toLowerCase().includes(query.toLowerCase()),
  );

  const toggleCourse = (code: string) => {
    const next = new Set(selectedIds);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(next);
  };

  const allSelected = selectedIds.size === 0;
  const label = allSelected
    ? baseLabel
    : selectedIds.size === 1
      ? courses.find((c) => selectedIds.has(c.code))?.name || "Curso"
      : `${selectedIds.size} cursos`;

  return (
    <div ref={wrapperRef} className="relative self-stretch">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`h-full min-w-[200px] px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] ${open ? "outline-stroke-accent-secondary" : "outline-stroke-primary"} inline-flex justify-start items-center gap-2 transition-colors`}
      >
        <span
          className={`flex-1 text-base font-normal leading-4 text-left line-clamp-1 ${allSelected ? "text-text-tertiary" : "text-text-primary"}`}
        >
          {label}
        </span>
        <Icon
          name="expand_more"
          size={20}
          className={open ? "text-icon-accent-primary" : "text-icon-tertiary"}
        />
      </button>

      {/* Floating label */}
      {(!allSelected || open) && (
        <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex">
          <span
            className={`text-xs font-normal leading-4 ${open ? "text-text-accent-primary" : "text-text-tertiary"}`}
          >
            Curso
          </span>
        </div>
      )}

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 w-72 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col">
          {/* Search */}
          <div className="px-3 py-2 border-b border-stroke-secondary">
            <div className="flex items-center gap-2">
              <Icon name="search" size={16} className="text-icon-tertiary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar curso..."
                className="flex-1 text-sm text-text-primary bg-transparent outline-none placeholder:text-text-tertiary"
                autoFocus
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto p-1 flex flex-col">
            {/* "Todos" option */}
            <button
              onClick={() => {
                onChange(new Set());
              }}
              className={`px-2 py-2.5 rounded flex items-center gap-2 hover:bg-bg-secondary transition-colors ${allSelected ? "bg-bg-accent-light" : ""}`}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center ${allSelected ? "bg-bg-accent-primary-solid border-bg-accent-primary-solid" : "border-icon-tertiary"}`}
              >
                {allSelected && (
                  <Icon name="check" size={12} className="text-icon-white" />
                )}
              </div>
              <span
                className={`flex-1 text-sm font-normal leading-4 text-left ${allSelected ? "text-text-accent-primary font-medium" : "text-text-secondary"}`}
              >
                Todos
              </span>
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-text-tertiary text-sm">
                {courses.length === 0 ? emptyStateLabel : emptySearchLabel}
              </div>
            ) : (
              filtered.map((course) => {
                const checked = selectedIds.has(course.code);
                return (
                  <button
                    key={course.code}
                    onClick={() => toggleCourse(course.code)}
                    className="px-2 py-2.5 rounded flex items-center gap-2 hover:bg-bg-secondary transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${checked ? "bg-bg-accent-primary-solid border-bg-accent-primary-solid" : "border-icon-tertiary"}`}
                    >
                      {checked && (
                        <Icon
                          name="check"
                          size={12}
                          className="text-icon-white"
                        />
                      )}
                    </div>
                    <span
                      className={`flex-1 text-sm font-normal leading-4 text-left ${checked ? "text-text-accent-primary font-medium" : "text-text-secondary"}`}
                    >
                      {course.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main header
// ============================================

export default function CalendarHeader({
  currentMonthYear,
  view,
  selectedCourseIds,
  courses,
  loadingCourses,
  onViewChange,
  onNext,
  onPrevious,
  onToday,
  onCourseChange,
  actions,
  leftActions,
  courseBaseLabel,
  emptyCourseStateLabel,
  emptyCourseSearchLabel,
}: CalendarHeaderProps) {
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
        {/* Left: Course filter */}
        <div className="flex items-stretch gap-4">
          <CourseFilterDropdown
            courses={courses}
            selectedIds={selectedCourseIds}
            onChange={onCourseChange}
            disabled={loadingCourses}
            baseLabel={courseBaseLabel}
            emptyStateLabel={emptyCourseStateLabel}
            emptySearchLabel={emptyCourseSearchLabel}
          />
          {leftActions}
        </div>

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
                onClick={() => onViewChange("weekly")}
                className={`px-2.5 py-2 rounded flex justify-center items-center gap-1 text-sm font-medium transition-colors ${
                  view === "weekly"
                    ? "bg-bg-accent-primary-solid text-text-white"
                    : "bg-bg-primary text-text-accent-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary"
                }`}
              >
                <Icon
                  name="calendar_view_week"
                  size={16}
                  className={
                    view === "weekly"
                      ? "text-icon-white"
                      : "text-icon-accent-primary"
                  }
                />
                <span>Semanal</span>
              </button>
              <button
                onClick={() => onViewChange("monthly")}
                className={`px-2.5 py-2 rounded flex justify-center items-center gap-1 text-sm font-medium transition-colors ${
                  view === "monthly"
                    ? "bg-bg-accent-primary-solid text-text-white"
                    : "bg-bg-primary text-text-accent-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary"
                }`}
              >
                <Icon
                  name="calendar_view_month"
                  size={16}
                  className={
                    view === "monthly"
                      ? "text-icon-white"
                      : "text-icon-accent-primary"
                  }
                />
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
                  <Icon
                    name="chevron_left"
                    size={16}
                    className="text-icon-accent-primary"
                  />
                </button>
                <button
                  onClick={onNext}
                  className="p-1 rounded-lg flex justify-center items-center hover:bg-bg-secondary transition-colors"
                >
                  <Icon
                    name="chevron_right"
                    size={16}
                    className="text-icon-accent-primary"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

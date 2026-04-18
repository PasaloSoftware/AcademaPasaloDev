"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useCalendar } from "@/hooks/useCalendar";
import {
  classEventService,
  type DiscoveryLayer,
  type GlobalSessionItem,
  type GlobalSessionsGroup,
} from "@/services/classEvent.service";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useAuth } from "@/contexts/AuthContext";
import type { ClassEvent } from "@/types/classEvent";
import type { CourseCycle } from "@/types/enrollment";
import EventDetailModal from "@/components/modals/EventDetailModal";
import CreateClassModal from "@/components/modals/CreateClassModal";
import EditClassModal from "@/components/modals/EditClassModal";
import CancelEventDialog from "@/components/modals/CancelEventDialog";
import AdvancedFiltersSidebar from "@/components/pages/admin/AdvancedFiltersSidebar";
import {
  CalendarHeader,
  CalendarWeeklyView,
  CalendarMonthlyView,
  CalendarLoading,
} from "@/components/calendar";
import Icon from "@/components/ui/Icon";
import FloatingSelect from "@/components/ui/FloatingSelect";

type TeacherCalendarScope = "mine" | "all";
type TeacherCalendarUnit = "ALL" | "CIENCIAS" | "LETRAS" | "FACULTAD";

interface TeacherCalendarFilters {
  scope: TeacherCalendarScope;
  unit: TeacherCalendarUnit;
  cycleId: string;
}

interface VisibleCourseCycle {
  courseCycleId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  courseTypeCode: string;
  academicCycleId: string;
  academicCycleCode: string;
  isMine: boolean;
}

const DEFAULT_FILTERS: TeacherCalendarFilters = {
  scope: "mine",
  unit: "ALL",
  cycleId: "ALL",
};

const EMPTY_CREATOR = {
  id: "",
  firstName: "Sin",
  lastName1: "asignar",
  profilePhotoUrl: null,
};

function normalizeUnitCode(value?: string | null): TeacherCalendarUnit | null {
  const normalized = value?.trim().toUpperCase();

  if (normalized === "CIENCIAS") return "CIENCIAS";
  if (normalized === "LETRAS") return "LETRAS";
  if (normalized === "FACULTAD") return "FACULTAD";

  return null;
}

function unitLabel(unit: TeacherCalendarUnit) {
  if (unit === "ALL") return "Todos";
  return unit.charAt(0) + unit.slice(1).toLowerCase();
}

function buildOwnVisibleCourseCycle(
  courseCycle: CourseCycle,
): VisibleCourseCycle {
  return {
    courseCycleId: courseCycle.id,
    courseId: courseCycle.courseId,
    courseCode: courseCycle.course.code,
    courseName: courseCycle.course.name,
    courseTypeCode:
      normalizeUnitCode(courseCycle.course.courseType?.name) ??
      normalizeUnitCode(courseCycle.course.courseType?.code) ??
      "CIENCIAS",
    academicCycleId: courseCycle.academicCycleId,
    academicCycleCode: courseCycle.academicCycle.code,
    isMine: true,
  };
}

function buildDiscoveryVisibleCourseCycle(
  layer: DiscoveryLayer,
  sourceCycle: CourseCycle,
): VisibleCourseCycle {
  return {
    courseCycleId: layer.courseCycleId,
    courseId: layer.courseId,
    courseCode: layer.courseCode,
    courseName: layer.courseName,
    courseTypeCode: normalizeUnitCode(layer.courseTypeCode) ?? "CIENCIAS",
    academicCycleId: sourceCycle.academicCycleId,
    academicCycleCode: sourceCycle.academicCycle.code,
    isMine: false,
  };
}

function mapGlobalSessionToClassEvent(
  group: GlobalSessionsGroup,
  session: GlobalSessionItem,
): ClassEvent {
  return {
    id: session.eventId,
    sessionNumber: session.sessionNumber,
    title: session.title,
    topic: session.topic ?? "",
    startDatetime: session.startDatetime,
    endDatetime: session.endDatetime,
    liveMeetingUrl: null,
    recordingUrl: null,
    recordingStatus: "NOT_AVAILABLE",
    isCancelled: false,
    sessionStatus: "PROGRAMADA",
    canJoinLive: false,
    canWatchRecording: false,
    canCopyLiveLink: false,
    canCopyRecordingLink: false,
    courseName: group.courseName,
    courseCode: group.courseCode,
    courseCycleId: group.courseCycleId,
    evaluationId: session.evaluationId,
    evaluationName: "",
    creator: EMPTY_CREATOR,
    professors: [],
    createdAt: session.startDatetime,
    updatedAt: null,
  };
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full flex justify-center items-center gap-1 transition-colors ${
        active
          ? "bg-bg-accent-primary-solid text-text-white"
          : "bg-bg-primary text-text-accent-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary hover:bg-bg-accent-light"
      }`}
    >
      <span className="text-sm font-medium leading-4">{label}</span>
    </button>
  );
}

export default function CalendarioContent() {
  const {
    events,
    loading,
    view,
    selectedCourseIds,
    currentDate,
    goToNext,
    goToPrevious,
    goToToday,
    changeView,
    goToDate,
    filterByCourse,
    getCurrentMonthYear,
    getWeekDays,
    isToday,
    refreshEvents,
  } = useCalendar();

  const searchParams = useSearchParams();
  const {
    courseCycles,
    uniqueCourses,
    loading: loadingCourses,
  } = useTeacherCourses();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { user } = useAuth();
  const deepLinkHandled = useRef(false);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] =
    useState<TeacherCalendarFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] =
    useState<TeacherCalendarFilters>(DEFAULT_FILTERS);
  const [visibleCourseCycles, setVisibleCourseCycles] = useState<
    VisibleCourseCycle[]
  >([]);
  const [loadingVisibleCourses, setLoadingVisibleCourses] = useState(false);
  const [globalEvents, setGlobalEvents] = useState<ClassEvent[]>([]);
  const [loadingGlobalEvents, setLoadingGlobalEvents] = useState(false);
  const [globalEventIds, setGlobalEventIds] = useState<Set<string>>(new Set());

  // Detail modal state
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState<
    { x: number; y: number } | undefined
  >();

  // CRUD modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<ClassEvent | null>(null);
  const [eventToCancel, setEventToCancel] = useState<ClassEvent | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<ClassEvent | null>(
    null,
  );

  const weekDays = getWeekDays();

  const currentRange = useMemo(() => {
    const start =
      view === "weekly"
        ? startOfWeek(currentDate, { weekStartsOn: 0 })
        : startOfMonth(currentDate);
    const end =
      view === "weekly"
        ? endOfWeek(currentDate, { weekStartsOn: 0 })
        : endOfMonth(currentDate);

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, [currentDate, view]);

  const cycleOptions = useMemo(() => {
    const unique = new Map<string, { id: string; code: string }>();

    courseCycles.forEach((courseCycle) => {
      unique.set(courseCycle.academicCycleId, {
        id: courseCycle.academicCycleId,
        code: courseCycle.academicCycle.code,
      });
    });

    return Array.from(unique.values()).sort((a, b) =>
      b.code.localeCompare(a.code),
    );
  }, [courseCycles]);

  const filteredVisibleCourseCycles = useMemo(() => {
    return visibleCourseCycles.filter((courseCycle) => {
      const matchesUnit =
        appliedFilters.unit === "ALL" ||
        courseCycle.courseTypeCode === appliedFilters.unit;
      const matchesCycle =
        appliedFilters.cycleId === "ALL" ||
        courseCycle.academicCycleId === appliedFilters.cycleId;

      return matchesUnit && matchesCycle;
    });
  }, [appliedFilters.cycleId, appliedFilters.unit, visibleCourseCycles]);

  const headerCourses = useMemo(() => {
    if (appliedFilters.scope === "mine") {
      return uniqueCourses;
    }

    const unique = new Map<
      string,
      { id: string; code: string; name: string }
    >();

    filteredVisibleCourseCycles.forEach((courseCycle) => {
      if (!unique.has(courseCycle.courseCode)) {
        unique.set(courseCycle.courseCode, {
          id: courseCycle.courseId,
          code: courseCycle.courseCode,
          name: courseCycle.courseName,
        });
      }
    });

    return Array.from(unique.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [appliedFilters.scope, filteredVisibleCourseCycles, uniqueCourses]);

  useEffect(() => {
    const availableCodes = new Set(headerCourses.map((course) => course.code));
    const sanitizedSelection = new Set(
      Array.from(selectedCourseIds).filter((courseCode) =>
        availableCodes.has(courseCode),
      ),
    );

    if (sanitizedSelection.size !== selectedCourseIds.size) {
      filterByCourse(sanitizedSelection);
    }
  }, [filterByCourse, headerCourses, selectedCourseIds]);

  useEffect(() => {
    let isMounted = true;

    const loadVisibleCourseCycles = async () => {
      if (courseCycles.length === 0) {
        setVisibleCourseCycles([]);
        return;
      }

      setLoadingVisibleCourses(true);

      try {
        const ownCourseCycles = courseCycles.map(buildOwnVisibleCourseCycle);
        const sourceCycleMap = new Map(
          courseCycles.map((courseCycle) => [courseCycle.id, courseCycle]),
        );

        const discoveryResults = await Promise.all(
          courseCycles.map(async (courseCycle) => {
            try {
              const layers = await classEventService.getDiscoveryLayers(
                courseCycle.id,
              );
              return layers.map((layer) =>
                buildDiscoveryVisibleCourseCycle(layer, courseCycle),
              );
            } catch (error) {
              console.error(
                "Error loading discovery layers for teacher calendar:",
                error,
              );
              return [];
            }
          }),
        );

        if (!isMounted) return;

        const merged = new Map<string, VisibleCourseCycle>();

        [...ownCourseCycles, ...discoveryResults.flat()].forEach(
          (courseCycle) => {
            const existing = merged.get(courseCycle.courseCycleId);
            if (!existing) {
              merged.set(courseCycle.courseCycleId, courseCycle);
              return;
            }

            merged.set(courseCycle.courseCycleId, {
              ...existing,
              ...courseCycle,
              isMine: existing.isMine || courseCycle.isMine,
              academicCycleId:
                existing.academicCycleId || courseCycle.academicCycleId,
              academicCycleCode:
                existing.academicCycleCode || courseCycle.academicCycleCode,
            });
          },
        );

        sourceCycleMap.forEach((sourceCycle) => {
          if (!merged.has(sourceCycle.id)) {
            merged.set(sourceCycle.id, buildOwnVisibleCourseCycle(sourceCycle));
          }
        });

        setVisibleCourseCycles(
          Array.from(merged.values()).sort((a, b) =>
            a.courseName.localeCompare(b.courseName),
          ),
        );
      } finally {
        if (isMounted) {
          setLoadingVisibleCourses(false);
        }
      }
    };

    loadVisibleCourseCycles();

    return () => {
      isMounted = false;
    };
  }, [courseCycles]);

  const loadGlobalEvents = useCallback(async () => {
    if (appliedFilters.scope !== "all") {
      setGlobalEvents([]);
      setGlobalEventIds(new Set());
      return;
    }

    if (filteredVisibleCourseCycles.length === 0) {
      setGlobalEvents([]);
      setGlobalEventIds(new Set());
      return;
    }

    setLoadingGlobalEvents(true);

    try {
      const groupedCourseCycleIds = filteredVisibleCourseCycles.reduce(
        (acc, courseCycle) => {
          const key = `${courseCycle.courseTypeCode}:${courseCycle.academicCycleId}`;
          if (!acc.has(key)) {
            acc.set(key, []);
          }

          const group = acc.get(key);
          if (group && !group.includes(courseCycle.courseCycleId)) {
            group.push(courseCycle.courseCycleId);
          }

          return acc;
        },
        new Map<string, string[]>(),
      );

      const groupedResponses = await Promise.all(
        Array.from(groupedCourseCycleIds.values()).map((courseCycleIds) =>
          classEventService.getGlobalSessions({
            courseCycleIds,
            startDate: currentRange.startDate,
            endDate: currentRange.endDate,
          }),
        ),
      );

      const mappedEvents = groupedResponses
        .flat()
        .flatMap((group) =>
          group.sessions.map((session) =>
            mapGlobalSessionToClassEvent(group, session),
          ),
        )
        .sort(
          (a, b) =>
            new Date(a.startDatetime).getTime() -
            new Date(b.startDatetime).getTime(),
        );

      setGlobalEvents(mappedEvents);
      setGlobalEventIds(new Set(mappedEvents.map((event) => event.id)));
    } catch (error) {
      console.error("Error loading global teacher calendar sessions:", error);
      setGlobalEvents([]);
      setGlobalEventIds(new Set());
    } finally {
      setLoadingGlobalEvents(false);
    }
  }, [
    appliedFilters.scope,
    currentRange.endDate,
    currentRange.startDate,
    filteredVisibleCourseCycles,
  ]);

  useEffect(() => {
    loadGlobalEvents();
  }, [loadGlobalEvents]);

  const displayEvents = useMemo(() => {
    const baseEvents = appliedFilters.scope === "all" ? globalEvents : events;

    if (selectedCourseIds.size === 0) {
      return baseEvents;
    }

    return baseEvents.filter((event) =>
      selectedCourseIds.has(event.courseCode),
    );
  }, [appliedFilters.scope, events, globalEvents, selectedCourseIds]);

  useEffect(() => {
    if (deepLinkHandled.current || loading) return;
    const eventId = searchParams.get("eventId");
    if (!eventId) return;

    const found = [...displayEvents, ...events, ...globalEvents].find(
      (event) => event.id === eventId,
    );

    deepLinkHandled.current = true;
    changeView("weekly");

    if (found) {
      goToDate(new Date(found.startDatetime));
      setSelectedEvent(found);
      setIsDetailOpen(true);
      return;
    }

    classEventService
      .getEventDetail(eventId)
      .then((event) => {
        goToDate(new Date(event.startDatetime));
        setSelectedEvent(event);
        setIsDetailOpen(true);
      })
      .catch((error) => {
        console.error("Error al cargar evento desde notificación:", error);
      });
  }, [
    changeView,
    displayEvents,
    events,
    globalEvents,
    goToDate,
    loading,
    searchParams,
  ]);

  useEffect(() => {
    setBreadcrumbItems([{ icon: "event", label: "Calendario" }]);
  }, [setBreadcrumbItems]);

  const isEventOwner = (event: ClassEvent) => {
    if (!user) return false;
    return (
      event.creator?.id === user.id ||
      event.professors?.some((professor) => professor.id === user.id)
    );
  };

  const handleEventClick = async (event: ClassEvent, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorPosition({
      x: rect.right - 16,
      y: rect.top - 24,
    });
    setSelectedEvent(event);
    setIsDetailOpen(true);

    if (!globalEventIds.has(event.id)) {
      return;
    }

    try {
      const fullEvent = await classEventService.getEventDetail(event.id);
      setSelectedEvent(fullEvent);
    } catch (error) {
      console.error("Error hydrating global teacher calendar event:", error);
    }
  };

  const handleEdit = () => {
    if (selectedEvent) {
      setEventToEdit(selectedEvent);
      setIsEditOpen(true);
    }
  };

  const handleCancel = () => {
    if (selectedEvent) {
      setEventToCancel(selectedEvent);
      setIsCancelOpen(true);
    }
  };

  const handleDuplicate = () => {
    if (selectedEvent) {
      setDuplicateSource(selectedEvent);
    }
  };

  const refreshVisibleEvents = useCallback(() => {
    refreshEvents();
    void loadGlobalEvents();
  }, [loadGlobalEvents, refreshEvents]);

  const handleEventMutated = () => {
    refreshVisibleEvents();
    setSelectedEvent(null);
    setEventToEdit(null);
    setEventToCancel(null);
  };

  const ownerOfSelected = selectedEvent ? isEventOwner(selectedEvent) : false;
  const headerLoading =
    loadingCourses || (appliedFilters.scope === "all" && loadingVisibleCourses);
  const calendarLoading =
    loading || (appliedFilters.scope === "all" && loadingGlobalEvents);

  const openFilters = () => {
    setDraftFilters(appliedFilters);
    setIsFiltersOpen(true);
  };

  const clearDraftFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
  };

  const applyDraftFilters = () => {
    setAppliedFilters(draftFilters);
    setIsFiltersOpen(false);
  };

  return (
    <div className="flex flex-col gap-8 max-h-[calc(100vh-152px)]">
      <CalendarHeader
        title="Calendario de Clases"
        currentMonthYear={getCurrentMonthYear()}
        view={view}
        selectedCourseIds={selectedCourseIds}
        courses={headerCourses}
        loadingCourses={headerLoading}
        onViewChange={changeView}
        onNext={goToNext}
        onPrevious={goToPrevious}
        onToday={goToToday}
        onCourseChange={filterByCourse}
        courseBaseLabel="Todos"
        emptyCourseStateLabel="No hay cursos para los filtros aplicados"
        emptyCourseSearchLabel="No se encontraron cursos con esa búsqueda"
        leftActions={
          <button
            type="button"
            onClick={openFilters}
            className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
          >
            <Icon
              name="filter_list"
              size={16}
              className="text-icon-accent-primary"
            />
            <span className="text-text-accent-primary text-sm font-medium leading-4">
              Filtros
            </span>
          </button>
        }
        actions={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg inline-flex justify-center items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Icon name="add" size={16} className="text-icon-white" />
            <span className="text-text-white text-sm font-medium leading-4">
              Crear Clase
            </span>
          </button>
        }
      />

      {calendarLoading ? (
        <CalendarLoading />
      ) : view === "weekly" ? (
        <CalendarWeeklyView
          weekDays={weekDays}
          events={displayEvents}
          loading={calendarLoading}
          currentDate={currentDate}
          isToday={isToday}
          onEventClick={handleEventClick}
          selectedEventId={isDetailOpen ? selectedEvent?.id : null}
          disableScroll={isDetailOpen}
        />
      ) : (
        <CalendarMonthlyView
          currentDate={currentDate}
          events={displayEvents}
          isToday={isToday}
          onEventClick={handleEventClick}
          selectedEventId={isDetailOpen ? selectedEvent?.id : null}
          disableScroll={isDetailOpen}
        />
      )}

      <AdvancedFiltersSidebar
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        onClear={clearDraftFilters}
        onApply={applyDraftFilters}
      >
        <div className="self-stretch flex flex-col justify-center items-start gap-4">
          <div className="self-stretch text-text-quartiary text-base font-semibold leading-5">
            Cursos
          </div>
          <div className="self-stretch flex justify-start items-center gap-2 flex-wrap">
            <FilterChip
              active={draftFilters.scope === "mine"}
              label="Mis cursos"
              onClick={() =>
                setDraftFilters((current) => ({ ...current, scope: "mine" }))
              }
            />
            <FilterChip
              active={draftFilters.scope === "all"}
              label="Todos"
              onClick={() =>
                setDraftFilters((current) => ({ ...current, scope: "all" }))
              }
            />
          </div>
        </div>

        <div className="self-stretch flex flex-col justify-center items-start gap-4">
          <div className="self-stretch text-text-quartiary text-base font-semibold leading-5">
            Unidad
          </div>
          <div className="self-stretch flex justify-start items-center gap-2 flex-wrap">
            {(
              ["ALL", "CIENCIAS", "LETRAS", "FACULTAD"] as TeacherCalendarUnit[]
            ).map((unit) => (
              <FilterChip
                key={unit}
                active={draftFilters.unit === unit}
                label={unitLabel(unit)}
                onClick={() =>
                  setDraftFilters((current) => ({ ...current, unit }))
                }
              />
            ))}
          </div>
        </div>

        <div className="self-stretch flex flex-col justify-center items-start gap-4">
          <div className="self-stretch text-text-quartiary text-base font-semibold leading-5">
            Ciclo
          </div>
          <FloatingSelect
            label="Ciclo"
            value={draftFilters.cycleId === "ALL" ? null : draftFilters.cycleId}
            options={cycleOptions.map((cycle) => ({
              value: cycle.id,
              label: cycle.code,
            }))}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                cycleId: value ?? "ALL",
              }))
            }
            allLabel="Todos"
            className="w-full"
            variant="filled"
            size="large"
          />
        </div>
      </AdvancedFiltersSidebar>

      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailOpen}
        anchorPosition={anchorPosition}
        calendarView={view === "monthly" ? "monthly" : "weekly"}
        canEdit={ownerOfSelected}
        canCancel={ownerOfSelected}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onDuplicate={ownerOfSelected ? handleDuplicate : undefined}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEvent(null);
          setAnchorPosition(undefined);
        }}
      />

      {(isCreateOpen || duplicateSource) && courseCycles.length > 0 && (
        <CreateClassModal
          isOpen={isCreateOpen || !!duplicateSource}
          onClose={() => {
            setIsCreateOpen(false);
            setDuplicateSource(null);
          }}
          onCreated={handleEventMutated}
          duplicateFrom={duplicateSource || undefined}
          courseName={
            duplicateSource?.courseName || courseCycles[0]?.course?.name || ""
          }
          courseCycleId={
            duplicateSource?.courseCycleId || courseCycles[0]?.id || ""
          }
          evaluationId={duplicateSource?.evaluationId}
          evaluationName={duplicateSource?.evaluationName}
          courseProfessors={
            duplicateSource?.professors || courseCycles[0]?.professors || []
          }
          courseOptions={
            courseCycles.length > 1
              ? courseCycles.map((courseCycle) => ({
                  id: courseCycle.id,
                  name: courseCycle.course.name,
                  professors: courseCycle.professors || [],
                }))
              : undefined
          }
          allowEvalSelection
        />
      )}

      {eventToEdit && (
        <EditClassModal
          isOpen={isEditOpen}
          event={eventToEdit}
          onClose={() => {
            setIsEditOpen(false);
            setEventToEdit(null);
          }}
          onSaved={handleEventMutated}
        />
      )}

      <CancelEventDialog
        isOpen={isCancelOpen}
        event={eventToCancel}
        onClose={() => {
          setIsCancelOpen(false);
          setEventToCancel(null);
        }}
        onCancelled={handleEventMutated}
      />
    </div>
  );
}

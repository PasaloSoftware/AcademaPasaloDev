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
  type GlobalFilterCatalogCourseCycle,
  type GlobalSessionItem,
  type GlobalSessionsGroup,
} from "@/services/classEvent.service";
import {
  coursesService,
  type AdminCourseCycleProfessor,
} from "@/services/courses.service";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import type { ClassEvent } from "@/types/classEvent";
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

type AdminCalendarUnit = "ALL" | "CIENCIAS" | "LETRAS" | "FACULTAD";

interface AdminCalendarFilters {
  unit: AdminCalendarUnit;
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
}

const DEFAULT_FILTERS: AdminCalendarFilters = {
  unit: "ALL",
  cycleId: "ALL",
};

const EMPTY_CREATOR = {
  id: "",
  firstName: "Sin",
  lastName1: "asignar",
  profilePhotoUrl: null,
};

function normalizeUnitCode(value?: string | null): AdminCalendarUnit | null {
  const normalized = value?.trim().toUpperCase();

  if (normalized === "CIENCIAS") return "CIENCIAS";
  if (normalized === "LETRAS") return "LETRAS";
  if (normalized === "FACULTAD") return "FACULTAD";

  return null;
}

function unitLabel(unit: AdminCalendarUnit) {
  if (unit === "ALL") return "Todos";
  return unit.charAt(0) + unit.slice(1).toLowerCase();
}

function mapGlobalFilterCourseCycle(
  item: GlobalFilterCatalogCourseCycle,
): VisibleCourseCycle {
  return {
    courseCycleId: item.courseCycleId,
    courseId: item.courseId,
    courseCode: item.courseCode,
    courseName: item.courseName,
    courseTypeCode: normalizeUnitCode(item.courseTypeCode) ?? "CIENCIAS",
    academicCycleId: item.academicCycleId,
    academicCycleCode: item.academicCycleCode,
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
  } = useCalendar({ enabled: false });

  const searchParams = useSearchParams();
  const { setBreadcrumbItems } = useBreadcrumb();
  const deepLinkHandled = useRef(false);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] =
    useState<AdminCalendarFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] =
    useState<AdminCalendarFilters>(DEFAULT_FILTERS);
  const [allCourseCycles, setAllCourseCycles] = useState<VisibleCourseCycle[]>(
    [],
  );
  const [professorsByCourseCycle, setProfessorsByCourseCycle] = useState<
    Record<string, AdminCourseCycleProfessor[]>
  >({});
  const [loadingCourseCycles, setLoadingCourseCycles] = useState(true);
  const [loadingCreateOptions, setLoadingCreateOptions] = useState(false);
  const [globalEvents, setGlobalEvents] = useState<ClassEvent[]>([]);
  const [loadingGlobalEvents, setLoadingGlobalEvents] = useState(false);
  const [globalEventIds, setGlobalEventIds] = useState<Set<string>>(new Set());

  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState<
    { x: number; y: number } | undefined
  >();

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

  useEffect(() => {
    let isMounted = true;

    const loadCalendarCatalog = async () => {
      setLoadingCourseCycles(true);

      try {
        const catalog = await classEventService.getGlobalFilterCatalog();

        if (!isMounted) return;

        const mappedCourseCycles = catalog.courseCycles.map((item) =>
          mapGlobalFilterCourseCycle(item),
        );

        setAllCourseCycles(
          mappedCourseCycles.sort((a, b) =>
            a.courseName.localeCompare(b.courseName),
          ),
        );
      } catch (error) {
        console.error("Error loading admin calendar catalog:", error);
        if (isMounted) {
          setAllCourseCycles([]);
        }
      } finally {
        if (isMounted) {
          setLoadingCourseCycles(false);
        }
      }
    };

    void loadCalendarCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const cycleOptions = useMemo(() => {
    const unique = new Map<string, { id: string; code: string }>();

    allCourseCycles.forEach((courseCycle) => {
      unique.set(courseCycle.academicCycleId, {
        id: courseCycle.academicCycleId,
        code: courseCycle.academicCycleCode,
      });
    });

    return Array.from(unique.values()).sort((a, b) =>
      b.code.localeCompare(a.code),
    );
  }, [allCourseCycles]);

  const filteredVisibleCourseCycles = useMemo(() => {
    return allCourseCycles.filter((courseCycle) => {
      const matchesUnit =
        appliedFilters.unit === "ALL" ||
        courseCycle.courseTypeCode === appliedFilters.unit;
      const matchesCycle =
        appliedFilters.cycleId === "ALL" ||
        courseCycle.academicCycleId === appliedFilters.cycleId;

      return matchesUnit && matchesCycle;
    });
  }, [allCourseCycles, appliedFilters.cycleId, appliedFilters.unit]);

  const headerCourses = useMemo(() => {
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
  }, [filteredVisibleCourseCycles]);

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

  const loadGlobalEvents = useCallback(async () => {
    if (filteredVisibleCourseCycles.length === 0) {
      setGlobalEvents([]);
      setGlobalEventIds(new Set());
      return;
    }

    setLoadingGlobalEvents(true);

    try {
      const groupedResponses = await classEventService.getGlobalSessionsByFilters(
        {
          startDate: currentRange.startDate,
          endDate: currentRange.endDate,
          academicCycleId:
            appliedFilters.cycleId === "ALL" ? undefined : appliedFilters.cycleId,
          courseTypeCode:
            appliedFilters.unit === "ALL" ? undefined : appliedFilters.unit,
        },
      );

      const mappedEvents = groupedResponses
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
      console.error("Error loading admin calendar global sessions:", error);
      setGlobalEvents([]);
      setGlobalEventIds(new Set());
    } finally {
      setLoadingGlobalEvents(false);
    }
  }, [
    appliedFilters.cycleId,
    appliedFilters.unit,
    currentRange.endDate,
    currentRange.startDate,
    filteredVisibleCourseCycles,
  ]);

  useEffect(() => {
    void loadGlobalEvents();
  }, [loadGlobalEvents]);

  const displayEvents = useMemo(() => {
    if (selectedCourseIds.size === 0) {
      return globalEvents;
    }

    return globalEvents.filter((event) =>
      selectedCourseIds.has(event.courseCode),
    );
  }, [globalEvents, selectedCourseIds]);

  useEffect(() => {
    setBreadcrumbItems([{ icon: "event", label: "Calendario" }]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    if (deepLinkHandled.current || loadingGlobalEvents) return;
    const eventId = searchParams.get("eventId");
    if (!eventId) return;

    deepLinkHandled.current = true;
    changeView("weekly");

    const found = displayEvents.find((event) => event.id === eventId);

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
  }, [changeView, displayEvents, goToDate, loadingGlobalEvents, searchParams]);

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
      console.error("Error hydrating admin calendar event:", error);
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

  const ensureProfessorsLoaded = useCallback(
    async (courseCycleIds: string[]) => {
      const uniqueIds = [...new Set(courseCycleIds)];
      const missingIds = uniqueIds.filter(
        (id) => professorsByCourseCycle[id] === undefined,
      );

      if (missingIds.length === 0) return;

      const fetched = await Promise.all(
        missingIds.map(
          async (
            courseCycleId,
          ): Promise<[string, AdminCourseCycleProfessor[]]> => {
          try {
            const professors =
              await coursesService.getProfessorsByCourseCycle(courseCycleId);
            return [
              courseCycleId,
              professors.map((professor) => ({
                ...professor,
                lastName2: "",
              })),
            ];
          } catch {
            return [courseCycleId, []];
          }
          },
        ),
      );

      setProfessorsByCourseCycle((previous) => {
        const next = { ...previous };
        fetched.forEach(([courseCycleId, professors]) => {
          next[courseCycleId] = professors;
        });
        return next;
      });
    },
    [professorsByCourseCycle],
  );

  const handleOpenCreate = useCallback(async () => {
    const courseCycleIds = filteredVisibleCourseCycles.map(
      (courseCycle) => courseCycle.courseCycleId,
    );

    if (courseCycleIds.length === 0) return;

    setLoadingCreateOptions(true);
    try {
      await ensureProfessorsLoaded(courseCycleIds);
      setIsCreateOpen(true);
    } finally {
      setLoadingCreateOptions(false);
    }
  }, [ensureProfessorsLoaded, filteredVisibleCourseCycles]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedEvent) return;

    setLoadingCreateOptions(true);
    try {
      await ensureProfessorsLoaded([selectedEvent.courseCycleId]);
      setDuplicateSource(selectedEvent);
    } finally {
      setLoadingCreateOptions(false);
    }
  }, [ensureProfessorsLoaded, selectedEvent]);

  const handleEventMutated = () => {
    void loadGlobalEvents();
    setSelectedEvent(null);
    setEventToEdit(null);
    setEventToCancel(null);
  };

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

  const courseOptions = filteredVisibleCourseCycles.map((courseCycle) => ({
    id: courseCycle.courseCycleId,
    name: courseCycle.courseName,
    professors: (
      professorsByCourseCycle[courseCycle.courseCycleId] || []
    ).map((professor) => ({
      id: professor.id,
      firstName: professor.firstName,
      lastName1: professor.lastName1,
      profilePhotoUrl: professor.profilePhotoUrl,
    })),
  }));

  const defaultCourseOption = courseOptions[0];
  const calendarLoading = loadingCourseCycles || loadingGlobalEvents;

  return (
    <div className="flex flex-col gap-8 max-h-[calc(100vh-152px)]">
      <CalendarHeader
        title="Calendario de Clases"
        currentMonthYear={getCurrentMonthYear()}
        view={view}
        selectedCourseIds={selectedCourseIds}
        courses={headerCourses}
        loadingCourses={loadingCourseCycles}
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
            onClick={() => void handleOpenCreate()}
            disabled={loadingCreateOptions || courseOptions.length === 0}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg inline-flex justify-center items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Icon name="add" size={16} className="text-icon-white" />
            <span className="text-text-white text-sm font-medium leading-4">
              {loadingCreateOptions ? "Cargando..." : "Crear Clase"}
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
            Unidad
          </div>
          <div className="self-stretch flex justify-start items-center gap-2 flex-wrap">
            {(
              ["ALL", "CIENCIAS", "LETRAS", "FACULTAD"] as AdminCalendarUnit[]
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
        canEdit
        canCancel
        onEdit={handleEdit}
        onCancel={handleCancel}
        onDuplicate={() => void handleDuplicate()}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEvent(null);
          setAnchorPosition(undefined);
        }}
      />

      {(isCreateOpen || duplicateSource) && courseOptions.length > 0 && (
        <CreateClassModal
          isOpen={isCreateOpen || !!duplicateSource}
          onClose={() => {
            setIsCreateOpen(false);
            setDuplicateSource(null);
          }}
          onCreated={handleEventMutated}
          duplicateFrom={duplicateSource || undefined}
          courseName={
            duplicateSource?.courseName || defaultCourseOption?.name || ""
          }
          courseCycleId={
            duplicateSource?.courseCycleId || defaultCourseOption?.id || ""
          }
          evaluationId={duplicateSource?.evaluationId}
          evaluationName={duplicateSource?.evaluationName}
          courseProfessors={
            (duplicateSource
              ? professorsByCourseCycle[duplicateSource.courseCycleId]
              : undefined) ||
            duplicateSource?.professors ||
            defaultCourseOption?.professors ||
            []
          }
          courseOptions={courseOptions}
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

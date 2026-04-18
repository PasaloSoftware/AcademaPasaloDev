"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCalendar } from "@/hooks/useCalendar";
import { useEnrollments } from "@/hooks/useEnrollments";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { classEventService } from "@/services/classEvent.service";
import type { ClassEvent } from "@/types/classEvent";
import EventDetailModal from "@/components/modals/EventDetailModal";
import {
  CalendarHeader,
  CalendarWeeklyView,
  CalendarMonthlyView,
  CalendarLoading,
} from "@/components/calendar";

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
  } = useCalendar();

  const searchParams = useSearchParams();
  const { uniqueCourses, loading: loadingCourses } = useEnrollments();
  const { setBreadcrumbItems } = useBreadcrumb();
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState<
    { x: number; y: number } | undefined
  >();
  const deepLinkHandled = useRef(false);

  const weekDays = getWeekDays();

  useEffect(() => {
    setBreadcrumbItems([{ icon: "event", label: "Calendario" }]);
  }, [setBreadcrumbItems]);

  useEffect(() => {
    if (deepLinkHandled.current || loading) return;
    const eventId = searchParams.get("eventId");
    if (!eventId) return;

    deepLinkHandled.current = true;
    changeView("weekly");

    const found = events.find((e) => e.id === eventId);
    if (found) {
      goToDate(new Date(found.startDatetime));
      setSelectedEvent(found);
      setIsModalOpen(true);
    } else {
      classEventService
        .getEventDetail(eventId)
        .then((event) => {
          goToDate(new Date(event.startDatetime));
          setSelectedEvent(event);
          setIsModalOpen(true);
        })
        .catch((err) => {
          console.error("Error al cargar evento desde notificación:", err);
        });
    }
  }, [searchParams, events, loading, changeView, goToDate]);

  const handleEventClick = (event: ClassEvent, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorPosition({
      x: rect.right - 16,
      y: rect.top - 24,
    });
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-8 max-h-[calc(100vh-152px)]">
      <CalendarHeader
        title="Calendario de Clases"
        currentMonthYear={getCurrentMonthYear()}
        view={view}
        selectedCourseIds={selectedCourseIds}
        courses={uniqueCourses}
        loadingCourses={loadingCourses}
        onViewChange={changeView}
        onNext={goToNext}
        onPrevious={goToPrevious}
        onToday={goToToday}
        onCourseChange={filterByCourse}
      />

      {loading ? (
        <CalendarLoading />
      ) : view === "weekly" ? (
        <CalendarWeeklyView
          weekDays={weekDays}
          events={events}
          loading={loading}
          currentDate={currentDate}
          isToday={isToday}
          onEventClick={handleEventClick}
          selectedEventId={isModalOpen ? selectedEvent?.id : null}
          disableScroll={isModalOpen}
        />
      ) : (
        <CalendarMonthlyView
          currentDate={currentDate}
          events={events}
          isToday={isToday}
          onEventClick={handleEventClick}
          selectedEventId={isModalOpen ? selectedEvent?.id : null}
          disableScroll={isModalOpen}
        />
      )}

      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        anchorPosition={anchorPosition}
        calendarView={view === "monthly" ? "monthly" : "weekly"}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
          setAnchorPosition(undefined);
        }}
      />
    </div>
  );
}

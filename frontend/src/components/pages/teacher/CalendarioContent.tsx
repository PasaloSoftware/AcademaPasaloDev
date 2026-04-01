"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCalendar } from "@/hooks/useCalendar";
import { classEventService } from "@/services/classEvent.service";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useAuth } from "@/contexts/AuthContext";
import type { ClassEvent } from "@/types/classEvent";
import EventDetailModal from "@/components/modals/EventDetailModal";
import CreateEventModal from "@/components/modals/CreateEventModal";
import EditEventModal from "@/components/modals/EditEventModal";
import CancelEventDialog from "@/components/modals/CancelEventDialog";
import {
  CalendarHeader,
  CalendarWeeklyView,
  CalendarMonthlyView,
  CalendarLoading,
} from "@/components/calendar";
import Icon from "@/components/ui/Icon";

export default function CalendarioContent() {
  const {
    events,
    loading,
    view,
    selectedCourseId,
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
  const { courseCycles, uniqueCourses, loading: loadingCourses } = useTeacherCourses();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { user } = useAuth();
  const deepLinkHandled = useRef(false);

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

  const weekDays = getWeekDays();

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
      setIsDetailOpen(true);
    } else {
      classEventService.getEventDetail(eventId).then((event) => {
        goToDate(new Date(event.startDatetime));
        setSelectedEvent(event);
        setIsDetailOpen(true);
      }).catch((err) => {
        console.error("Error al cargar evento desde notificación:", err);
      });
    }
  }, [searchParams, events, loading, changeView, goToDate]);

  useEffect(() => {
    setBreadcrumbItems([{ icon: "event", label: "Calendario" }]);
  }, [setBreadcrumbItems]);

  const isEventOwner = (event: ClassEvent) => {
    if (!user) return false;
    return (
      event.creator?.id === user.id ||
      event.professors?.some((p) => p.id === user.id)
    );
  };

  const handleEventClick = (event: ClassEvent, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorPosition({
      x: rect.right - 16,
      y: rect.top - 24,
    });
    setSelectedEvent(event);
    setIsDetailOpen(true);
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

  const handleEventMutated = () => {
    refreshEvents();
    setSelectedEvent(null);
    setEventToEdit(null);
    setEventToCancel(null);
  };

  const ownerOfSelected = selectedEvent ? isEventOwner(selectedEvent) : false;

  return (
    <div className="flex flex-col gap-8 max-h-[calc(100vh-152px)]">
      <CalendarHeader
        title="Calendario de Clases"
        currentMonthYear={getCurrentMonthYear()}
        view={view}
        selectedCourseId={selectedCourseId}
        courses={uniqueCourses}
        loadingCourses={loadingCourses}
        onViewChange={changeView}
        onNext={goToNext}
        onPrevious={goToPrevious}
        onToday={goToToday}
        onCourseChange={filterByCourse}
        actions={
            <button
            onClick={() => setIsCreateOpen(true)}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg inline-flex justify-center items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
            <Icon name="add" size={16} className="text-icon-white" />
            <span className="text-text-white text-sm font-medium leading-4">
              Crear Evento
            </span>
            </button>
        }
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
          selectedEventId={isDetailOpen ? selectedEvent?.id : null}
        />
      ) : (
        <CalendarMonthlyView
          currentDate={currentDate}
          events={events}
          isToday={isToday}
          onEventClick={handleEventClick}
          selectedEventId={isDetailOpen ? selectedEvent?.id : null}
        />
      )}

      {/* Event Detail Modal (with edit/cancel for owned events) */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailOpen}
        anchorPosition={anchorPosition}
        calendarView={view === 'monthly' ? 'monthly' : 'weekly'}
        canEdit={ownerOfSelected}
        canCancel={ownerOfSelected}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEvent(null);
          setAnchorPosition(undefined);
        }}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleEventMutated}
        courseCycles={courseCycles}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={isEditOpen}
        event={eventToEdit}
        onClose={() => {
          setIsEditOpen(false);
          setEventToEdit(null);
        }}
        onUpdated={handleEventMutated}
      />

      {/* Cancel Event Dialog */}
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

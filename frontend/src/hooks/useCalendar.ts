// ============================================
// USE CALENDAR HOOK - Gestión del Calendario de Clases
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { classEventService } from '@/services/classEvent.service';
import type { ClassEvent } from '@/types/classEvent';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export type CalendarView = 'weekly' | 'monthly';

export function useCalendar() {
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('weekly');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const loadEvents = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      };
      const events = await classEventService.getMySchedule(params);
      setEvents(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar eventos');
      console.error('❌ [useCalendar] Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let start: Date;
    let end: Date;

    if (view === 'weekly') {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    loadEvents(start, end);
  }, [currentDate, view, loadEvents]);

  const goToNext = () => {
    if (view === 'weekly') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToPrevious = () => {
    if (view === 'weekly') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const changeView = (newView: CalendarView) => {
    setView(newView);
  };

  const goToDate = (date: Date) => {
    setCurrentDate(date);
  };

  const filterByCourse = (courseId: string | null) => {
    setSelectedCourseId(courseId);
  };

  const filteredEvents = useMemo(() => {
    console.log('🔍 [useCalendar] Filtrando eventos. Total:', events?.length || 0, 'Curso seleccionado:', selectedCourseId);

    if (!events || events.length === 0) {
      console.log('🔍 [useCalendar] No hay eventos para filtrar');
      return [];
    }

    if (selectedCourseId) {
      const filtered = events.filter((event) =>
        event.courseName.includes(selectedCourseId) || event.courseCode === selectedCourseId
      );
      console.log('🔍 [useCalendar] Eventos filtrados por curso:', filtered.length);
      return filtered;
    }

    console.log('🔍 [useCalendar] Devolviendo todos los eventos:', events.length);
    return events;
  }, [events, selectedCourseId]);

  const getCurrentMonthYear = () => {
    const str = format(currentDate, 'MMMM \'de\' yyyy', { locale: es });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return {
    events: filteredEvents,
    loading,
    error,
    currentDate,
    view,
    selectedCourseId,
    goToNext,
    goToPrevious,
    goToToday,
    changeView,
    goToDate,
    filterByCourse,
    getCurrentMonthYear,
    getWeekDays,
    isToday,
    refreshEvents: () => {
      const start = view === 'weekly'
        ? startOfWeek(currentDate, { weekStartsOn: 0 })
        : startOfMonth(currentDate);
      const end = view === 'weekly'
        ? endOfWeek(currentDate, { weekStartsOn: 0 })
        : endOfMonth(currentDate);
      loadEvents(start, end);
    }
  };
}

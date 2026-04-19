"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { classEventService } from "@/services/classEvent.service";
import { ClassEvent } from "@/types/classEvent";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { getCourseColor } from "@/lib/courseColors";
import { useAuth } from "@/contexts/AuthContext";

type DayScheduleEvent = Pick<
  ClassEvent,
  | "id"
  | "title"
  | "courseName"
  | "courseCode"
  | "startDatetime"
  | "endDatetime"
  | "sessionStatus"
  | "liveMeetingUrl"
  | "isCancelled"
>;

export default function DaySchedule() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<DayScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const weekRange = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return {
      weekStart,
      weekEnd,
      weekDays: Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
      weekStartIso: format(weekStart, "yyyy-MM-dd"),
      weekEndIso: format(weekEnd, "yyyy-MM-dd"),
    };
  }, [currentDate]);

  const { weekStart, weekEnd, weekDays, weekStartIso, weekEndIso } = weekRange;
  const activeRoleCode = useMemo(() => {
    if (!user?.roles?.length) return null;
    if (user.lastActiveRoleId) {
      const activeRole = user.roles.find(
        (role) => (role.id || role.code) === user.lastActiveRoleId,
      );
      if (activeRole) return activeRole.code;
    }
    return user.roles[0]?.code || null;
  }, [user]);

  const isAdminView =
    activeRoleCode === "ADMIN" || activeRoleCode === "SUPER_ADMIN";

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const loadSchedule = async (start: string, end: string) => {
    setLoading(true);
    setError(null);

    try {
      const eventsData = isAdminView
        ? await classEventService.getAdminDayWidgetSchedule({ start, end })
        : await classEventService.getMyDayWidgetSchedule({ start, end });
      setEvents(eventsData);
    } catch {
      setError("Error al cargar los eventos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedule(weekStartIso, weekEndIso);
  }, [weekStartIso, weekEndIso, isAdminView]);

  const goToPreviousWeek = () => {
    setCurrentDate((prev) => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentDate((prev) => addDays(prev, 7));
  };

  const todayEvents = events.filter((event) =>
    isSameDay(parseISO(event.startDatetime), currentDate),
  );

  const formatTimeRange = (start: string, end: string) => {
    const startDate = parseISO(start);
    const endDate = parseISO(end);

    const startMinutes = startDate.getMinutes();
    const endMinutes = endDate.getMinutes();

    if (startMinutes === 0 && endMinutes === 0) {
      const startTime = format(startDate, "h", { locale: es });
      const endTime = format(endDate, "h a", { locale: es })
        .replace(" ", "")
        .toLowerCase();

      return `${startTime} - ${endTime}`;
    }

    const startTime = format(startDate, startMinutes === 0 ? "h" : "h:mm", {
      locale: es,
    });

    const endTime = format(endDate, endMinutes === 0 ? "h a" : "h:mm a", {
      locale: es,
    })
      .replace(" ", "")
      .toLowerCase();

    return `${startTime} - ${endTime}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-stroke-primary bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-stroke-primary p-3">
        <div className="flex items-center gap-1">
          <Icon name="event" size={20} className="text-magenta-violet-500" />
          <h2 className="text-sm font-semibold text-primary">Agenda del Día</h2>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-0.5">
            {format(weekStart, "M") !== format(weekEnd, "M") ? (
              <>
                <span className="text-xs capitalize text-primary sm:text-sm">
                  {format(weekStart, "MMM", { locale: es })}
                </span>
                <span className="text-xs text-primary sm:text-sm">-</span>
                <span className="text-xs capitalize text-primary sm:text-sm">
                  {format(weekEnd, "MMM", { locale: es })}
                </span>
              </>
            ) : (
              <span className="text-xs capitalize text-primary sm:text-sm">
                {format(currentDate, "MMM", { locale: es })}
              </span>
            )}
            <span className="text-xs text-primary sm:text-sm">
              {format(currentDate, "yyyy")}
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={goToPreviousWeek}
              className="flex items-center justify-center rounded-lg p-1 hover:bg-secondary-hover"
              aria-label="Semana anterior"
            >
              <Icon
                name="chevron_left"
                size={16}
                className="text-accent-primary"
              />
            </button>
            <button
              onClick={goToNextWeek}
              className="flex items-center justify-center rounded-lg p-1 hover:bg-secondary-hover"
              aria-label="Semana siguiente"
            >
              <Icon
                name="chevron_right"
                size={16}
                className="text-accent-primary"
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 p-3">
        {weekDays.map((day, index) => {
          const isSelected = isSameDay(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={index}
              onClick={() => setCurrentDate(day)}
              className={`flex flex-1 flex-col items-center gap-px rounded-xl px-1.5 py-1.5 transition-colors sm:px-2 ${
                isSelected
                  ? "bg-muted-indigo-50"
                  : "bg-white hover:bg-secondary-hover"
              }`}
            >
              <span
                className={`text-[8px] font-semibold uppercase ${
                  isToday || isSelected
                    ? "text-info-primary-solid"
                    : "text-tertiary"
                }`}
              >
                {format(day, "EEE", { locale: es }).substring(0, 3)}
              </span>
              <div
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full p-0.5 ${
                  isToday ? "bg-info-primary-solid" : ""
                }`}
              >
                <span
                  className={`text-xs font-medium ${
                    isToday
                      ? "text-white"
                      : isToday || isSelected
                        ? "text-info-primary-solid"
                        : "text-primary"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 px-3 pb-3">
        {loading ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-info-primary-solid border-t-transparent"></div>
            <p className="text-sm text-secondary">Cargando eventos...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <Icon
              name="error"
              size={32}
              className="mx-auto mb-2 text-error-solid"
            />
            <p className="text-sm text-error-solid">{error}</p>
            <button
              onClick={() => void loadSchedule(weekStartIso, weekEndIso)}
              className="mt-2 text-sm text-accent-primary hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : todayEvents.length === 0 ? (
          <div className="p-6 text-center">
            <Icon
              name="event_busy"
              size={32}
              className="mx-auto mb-2 text-gray-600"
              variant="outlined"
            />
            <p className="text-sm text-gray-600">
              No tienes clases programadas
            </p>
          </div>
        ) : (
          todayEvents.map((event) => {
            const colors = getCourseColor(event.courseCode);

            const startMs = new Date(event.startDatetime).getTime();
            const isLive = event.sessionStatus === "EN_CURSO";
            const isLiveSoon =
              event.sessionStatus === "PROGRAMADA" &&
              startMs - now <= 60 * 60 * 1000 &&
              startMs - now > 0;
            const canJoinNow =
              (isLive || isLiveSoon) &&
              !!event.liveMeetingUrl &&
              !event.isCancelled;

            return (
              <div
                key={event.id}
                className="overflow-hidden rounded-xl border-l-4"
                style={{
                  backgroundColor: colors.secondary,
                  borderLeftColor: colors.primary,
                }}
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start gap-1">
                      <span className="text-[10px] font-medium text-primary">
                        {event.title}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="truncate text-xs font-medium text-primary">
                        {event.courseName}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-xs text-secondary">
                        {formatTimeRange(
                          event.startDatetime,
                          event.endDatetime,
                        )}
                      </span>
                    </div>
                  </div>
                  {canJoinNow && (
                    <button
                      onClick={() =>
                        window.open(
                          event.liveMeetingUrl!,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      className="rounded-lg px-2 py-1.5 transition-colors hover:bg-white/70 sm:px-3"
                    >
                      <span className="text-xs font-medium text-accent-primary sm:text-sm">
                        Unirse
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="inline-flex w-full flex-col items-center justify-start border-t border-stroke-secondary p-3">
        <Link
          href="/plataforma/calendario"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-bg-secondary"
        >
          <span className="text-sm font-medium leading-4 text-text-accent-primary">
            Ver Calendario Completo
          </span>
        </Link>
      </div>
    </div>
  );
}

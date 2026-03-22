"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ClassEvent } from "@/types/classEvent";
import { getCourseColor } from "@/lib/courseColors";
import { getSessionCardType, SessionBadge } from "@/components/pages/student/EvaluationShared";
import Icon from "../ui/Icon";

interface EventDetailModalProps {
  event: ClassEvent | null;
  isOpen: boolean;
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
  calendarView?: "weekly" | "monthly";
  canEdit?: boolean;
  canCancel?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
}

export default function EventDetailModal({
  event,
  isOpen,
  onClose,
  anchorPosition,
  calendarView = "weekly",
  canEdit,
  canCancel,
  onEdit,
  onCancel,
}: EventDetailModalProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !event || !anchorPosition || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 8;

    let top: number;
    let left: number;

    top = anchorPosition.y;
    if (calendarView === "monthly") {
      left = anchorPosition.x + 24;
    } else {
      left = anchorPosition.x + 32;
    }

    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = anchorPosition.x - tooltipRect.width - 32;
    }

    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding;
    }

    if (top < padding) {
      top = padding;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }, [isOpen, event, anchorPosition, calendarView]);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      const calendarContainer = document.getElementById(
        "calendar-scroll-container",
      );
      if (calendarContainer) {
        calendarContainer.style.overflow = "hidden";
      }

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);

        if (calendarContainer) {
          calendarContainer.style.overflow = "";
        }
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const colors = getCourseColor(event.courseCode);
  const cardType = getSessionCardType(event);

  const formatDate = () => {
    const date = new Date(event.startDatetime);
    const day = format(date, "EEEE", { locale: es });
    const dayNum = format(date, "d");
    const month = format(date, "MMMM", { locale: es });

    return `${day.charAt(0).toUpperCase() + day.slice(1)}, ${dayNum} de ${month}`;
  };

  const formatTime = () => {
    const start = new Date(event.startDatetime);
    const end = new Date(event.endDatetime);

    const formatTimeStr = (hour: number, min: number) => {
      const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return min > 0 ? `${h}:${min.toString().padStart(2, "0")}` : `${h}`;
    };

    const period = end.getHours() >= 12 ? "pm" : "am";

    return `${formatTimeStr(start.getHours(), start.getMinutes())} - ${formatTimeStr(end.getHours(), end.getMinutes())}${period}`;
  };

  const getTeacherInitials = () => {
    if (!event.creator) return "XX";
    return `${event.creator.firstName[0]}${event.creator.lastName1[0]}`.toUpperCase();
  };

  const getTeacherName = () => {
    if (!event.creator) return "Sin asignar";
    return `${event.creator.firstName} ${event.creator.lastName1}`;
  };

  const isTeacher = canEdit !== undefined || canCancel !== undefined;

  const startMs = new Date(event.startDatetime).getTime();
  const isLiveSoon =
    event.sessionStatus === "EN_CURSO" ||
    (event.sessionStatus === "PROGRAMADA" &&
      startMs - now <= 60 * 60 * 1000 &&
      startMs - now > 0);
  const canJoin = isLiveSoon && !!event.liveMeetingUrl && !event.isCancelled;
  const canViewRecording =
    event.sessionStatus === "FINALIZADA" &&
    event.canWatchRecording &&
    !event.isCancelled;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 w-96 bg-bg-primary rounded-xl shadow-[0px_0px_8px_0px_rgba(0,0,0,0.25)] outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex flex-col justify-start items-end"
    >
      {/* Header actions */}
      <div className="self-stretch px-2 pt-3 pb-2 inline-flex justify-end items-center gap-4">
        {isTeacher && !event.isCancelled && (
          <div className="flex justify-start items-center gap-2">
            {canEdit && onEdit && (
              <button
                onClick={() => { onClose(); onEdit(); }}
                className="p-1 rounded-full flex justify-center items-center hover:bg-bg-secondary transition-colors"
              >
                <Icon name="edit" size={20} className="text-icon-tertiary" />
              </button>
            )}
            {canCancel && onCancel && (
              <button
                onClick={() => { onClose(); onCancel(); }}
                className="p-1 rounded-full flex justify-center items-center hover:bg-bg-secondary transition-colors"
              >
                <Icon name="delete" size={20} className="text-icon-tertiary" />
              </button>
            )}
          </div>
        )}
        <button
          onClick={onClose}
          className="p-1 rounded-full flex justify-center items-center hover:bg-bg-secondary transition-colors"
        >
          <Icon name="close" size={20} className="text-icon-tertiary" />
        </button>
      </div>

      {/* Content */}
      <div className="self-stretch px-6 pb-6 flex flex-col justify-start items-end gap-3">
        {/* Color + Info */}
        <div className="self-stretch p-0.5 inline-flex justify-start items-start gap-2.5">
          <div className="py-1 flex justify-start items-center">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors.primary }}
            />
          </div>
          <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
            {/* Title + Badge */}
            <div className="self-stretch inline-flex justify-between items-start">
              <span className="text-text-primary text-xl font-medium leading-6 line-clamp-1">
                Clase {event.sessionNumber} - {event.evaluationName}
              </span>
              <SessionBadge event={event} cardType={cardType} />
            </div>

            {/* Course name */}
            <div className="self-stretch inline-flex justify-start items-center">
              <span className="flex-1 text-text-primary text-base font-normal leading-5 line-clamp-3">
                {event.courseName}
              </span>
            </div>

            {/* Date + Time */}
            <div className="self-stretch inline-flex justify-start items-start gap-1.5">
              <span className="text-text-secondary text-sm font-normal leading-4">
                {formatDate()}
              </span>
              <span className="text-text-secondary text-sm font-normal leading-4">
                •
              </span>
              <span className="flex-1 text-text-secondary text-sm font-normal leading-4">
                {formatTime()}
              </span>
            </div>
          </div>
        </div>

        {/* Asesor */}
        <div className="self-stretch inline-flex justify-start items-center gap-2">
          <div className="w-7 h-7 p-1 bg-bg-info-primary-solid rounded-full flex justify-center items-center gap-2">
            <span className="text-center text-text-white text-[8px] font-medium leading-[10px]">
              {getTeacherInitials()}
            </span>
          </div>
          <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
            <span className="text-text-quartiary text-[8px] font-medium leading-[10px]">
              ASESOR
            </span>
            <span className="self-stretch text-text-secondary text-sm font-normal leading-4 line-clamp-1">
              {getTeacherName()}
            </span>
          </div>
        </div>

        {/* Topic + Link */}
        <div className="self-stretch flex flex-col justify-start items-start gap-1">
          {event.topic && (
            <div className="self-stretch p-0.5 inline-flex justify-start items-start gap-2.5">
              <Icon name="subject" size={16} variant="outlined" className="text-icon-secondary" />
              <span className="flex-1 text-text-primary text-base font-normal leading-4">
                {event.topic}
              </span>
            </div>
          )}
          {event.liveMeetingUrl && (
            <div className="self-stretch p-0.5 inline-flex justify-start items-center gap-2.5 overflow-hidden">
              <Icon name="link" size={16} variant="outlined" className="text-icon-secondary" />
              <a
                href={event.liveMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1 hover:text-text-accent-primary transition-colors"
              >
                {event.liveMeetingUrl}
              </a>
            </div>
          )}
        </div>

        {/* CTA Button */}
        {!event.isCancelled && canJoin && (
          <button
            onClick={() => window.open(event.liveMeetingUrl!, "_blank", "noopener,noreferrer")}
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors"
          >
            <Icon name="videocam" size={16} className="text-icon-white" />
            <span className="text-text-white text-sm font-medium leading-4">
              Unirme a la Clase
            </span>
          </button>
        )}

        {!event.isCancelled && canViewRecording && (
          <button
            onClick={() =>
              router.push(
                `/plataforma/curso/${event.courseCycleId}/evaluacion/${event.evaluationId}/clase/${event.id}`,
              )
            }
            className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors"
          >
            <Icon name="play_arrow" size={16} className="text-icon-white" />
            <span className="text-text-white text-sm font-medium leading-4">
              Ver Grabación
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

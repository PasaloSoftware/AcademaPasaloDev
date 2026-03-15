"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ClassEvent } from "@/types/classEvent";
import { getCourseColor } from "@/lib/courseColors";
import {
  MdClose,
  MdLink,
  MdContentCopy,
  MdCheck,
  MdEdit,
  MdEventBusy,
} from "react-icons/md";
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
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();

  // Tick every 30s for join-button reactivity
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
      // Monthly: appear below the event, centered horizontally
      left = anchorPosition.x + 24;
    } else {
      // Weekly: appear to the right of the event
      left = anchorPosition.x + 32;
    }

    // Ajustar si se sale por la derecha
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = anchorPosition.x - tooltipRect.width - 32;
    }

    // Ajustar si se sale por abajo
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding;
    }

    // Ajustar si se sale por arriba
    if (top < padding) {
      top = padding;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }, [isOpen, event, anchorPosition, calendarView]);

  // Bloquear scroll cuando el tooltip está abierto
  useEffect(() => {
    if (isOpen) {
      // Bloquear scroll del body
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      // Bloquear scroll del calendario específicamente
      const calendarContainer = document.getElementById(
        "calendar-scroll-container",
      );
      if (calendarContainer) {
        calendarContainer.style.overflow = "hidden";
      }

      return () => {
        // Restaurar scroll cuando se cierra
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);

        // Restaurar scroll del calendario
        if (calendarContainer) {
          calendarContainer.style.overflow = "";
        }
      };
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera
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

    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const endHour = end.getHours();
    const endMin = end.getMinutes();

    const formatTimeStr = (hour: number, min: number) => {
      const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return min > 0 ? `${h}:${min.toString().padStart(2, "0")}` : `${h}`;
    };

    const period = endHour >= 12 ? "pm" : "am";

    return `${formatTimeStr(startHour, startMin)} - ${formatTimeStr(endHour, endMin)}${period}`;
  };

  const getTeacherInitials = () => {
    if (!event.creator) return "XX";
    return `${event.creator.firstName[0]}${event.creator.lastName1[0]}`.toUpperCase();
  };

  const getTeacherName = () => {
    if (!event.creator) return "Sin asignar";
    return `${event.creator.firstName} ${event.creator.lastName1}`;
  };

  const handleCopySummary = async () => {
    const lines = [
      `${event.courseName}`,
      `${formatDate()} · ${formatTime()}`,
      `Asesor: ${getTeacherName()}`,
    ];

    if (event.topic) lines.push(`Tema: ${event.topic}`);
    if (event.liveMeetingUrl) lines.push(`Link: ${event.liveMeetingUrl}`);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para navegadores sin clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = lines.join("\n");
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      ref={tooltipRef}
      className="shadow-[0px_0px_8px_0px_rgba(0,0,0,0.25)] fixed z-50 w-96 bg-bg-primary rounded-2xl border border-stroke-primary"
    >
      {/* Header con acciones */}
      <div className="self-stretch px-2 pt-3 pb-2 flex justify-end items-center gap-1">
        <button
          onClick={onClose}
          className="p-1 rounded-full flex justify-center items-center hover:bg-bg-secondary transition-colors"
        >
          <MdClose className="w-5 h-5 text-icon-tertiary" />
        </button>
      </div>

      {/* Contenido principal */}
      <div className="self-stretch px-6 pb-6 flex flex-col justify-start items-start gap-3">
        {/* Color + Info del curso */}
        <div className="self-stretch p-0.5 flex justify-start items-start gap-2.5">
          {/* Cuadrado de color */}
          <div className="py-0.5 flex justify-start items-center gap-2.5">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors.primary }}
            />
          </div>

          {/* Título y detalles */}
          <div className="flex-1 flex flex-col justify-start items-start gap-1">
            {/* Clase # - Título */}
            <div className="self-stretch flex justify-start items-start gap-0.5">
              <div className="flex justify-start items-center">
                <div className="text-text-primary text-base font-normal font-['Poppins'] leading-5 line-clamp-1">
                  {event.sessionNumber}° Clase
                </div>
              </div>
            </div>

            {/* Nombre del curso */}
            <div className="self-stretch flex justify-start items-center">
              <div className="flex-1 text-text-primary text-xl font-medium font-['Poppins'] leading-6 line-clamp-3">
                {event.courseName}
              </div>
            </div>

            {/* Fecha y hora */}
            <div className="self-stretch flex justify-start items-start gap-1.5">
              <div className="flex justify-start items-center gap-0.5">
                <div className="text-text-secondary text-sm font-normal font-['Poppins'] leading-4">
                  {formatDate()}
                </div>
              </div>
              <div className="text-text-secondary text-sm font-normal font-['Poppins'] leading-4">
                •
              </div>
              <div className="flex-1 flex justify-start items-center gap-0.5">
                <div className="text-text-secondary text-sm font-normal font-['Poppins'] leading-4">
                  {formatTime()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Asesor */}
        <div className="self-stretch flex justify-start items-center gap-2">
          {/* Avatar */}
          {event.creator?.profilePhotoUrl ? (
            <img
              src={event.creator.profilePhotoUrl}
              alt={getTeacherName()}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-5 h-5 p-1 rounded-full flex justify-center items-center gap-2"
              style={{ backgroundColor: colors.primary }}
            >
              <div className="text-text-white text-[8px] font-medium font-['Poppins'] leading-[10px]">
                {getTeacherInitials()}
              </div>
            </div>
          )}

          {/* Nombre */}
          <div className="flex-1 flex justify-start items-start gap-1">
            <div className="text-text-secondary text-sm font-medium font-['Poppins'] leading-4">
              Asesor:
            </div>
            <div className="flex-1 text-text-secondary text-sm font-normal font-['Poppins'] leading-4 line-clamp-1">
              {getTeacherName()}
            </div>
          </div>
        </div>

        {/* Topic */}
        {event.topic && (
          <div className="self-stretch p-0.5 flex justify-start items-start gap-2.5">
            <Icon
              name="topic"
              size={16}
              variant="outlined"
              className="text-icon-secondary"
            />
            <div className="flex-1 text-text-primary text-base font-normal font-['Poppins'] leading-4">
              {event.topic}
            </div>
          </div>
        )}

        {/* Link de reunión */}
        {event.liveMeetingUrl && (
          <div className="self-stretch p-0.5 flex justify-start items-center gap-2.5 overflow-hidden">
            <MdLink className="w-4 h-4 text-icon-secondary flex-shrink-0" />
            <div className="flex-1 flex justify-start items-center overflow-hidden">
              <a
                href={event.liveMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-text-primary text-base font-normal font-['Poppins'] leading-5 line-clamp-1 hover:text-text-accent-primary transition-colors"
              >
                {event.liveMeetingUrl}
              </a>
            </div>
          </div>
        )}

        {/* Teacher actions */}
        {(canEdit || canCancel) && !event.isCancelled && (
          <div className="self-stretch flex items-center gap-2 pt-2">
            {canEdit && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent-light text-text-accent-primary text-sm font-medium hover:bg-accent-light/80 transition-colors"
              >
                <MdEdit className="w-4 h-4" />
                Editar
              </button>
            )}
            {canCancel && onCancel && (
              <button
                onClick={() => {
                  onClose();
                  onCancel();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-error-light text-error-solid text-sm font-medium hover:bg-error-light/80 transition-colors"
              >
                <MdEventBusy className="w-4 h-4" />
                Cancelar
              </button>
            )}
          </div>
        )}

        {/* Join / Recording action button */}
        {!event.isCancelled && event.sessionStatus !== 'FINALIZADA' && (() => {
          const startMs = new Date(event.startDatetime).getTime();
          const isLiveSoon = event.sessionStatus === 'EN_CURSO' ||
            (event.sessionStatus === 'PROGRAMADA' &&
              startMs - now <= 60 * 60 * 1000 &&
              startMs - now > 0);
          const canJoin = isLiveSoon && !!event.liveMeetingUrl;

          return (
            <div className="flex justify-end w-full">
              <button
                onClick={() => {
                  if (canJoin) {
                    window.open(event.liveMeetingUrl!, '_blank', 'noopener,noreferrer');
                  }
                }}
                disabled={!canJoin}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium font-['Poppins'] transition-colors ${
                  canJoin
                    ? 'bg-bg-accent-primary-solid text-text-white hover:bg-bg-accent-primary-solid/90 cursor-pointer'
                    : 'bg-bg-disabled text-text-disabled cursor-not-allowed'
                }`}
              >
                <Icon name="videocam" size={20} className={canJoin ? 'text-icon-white' : 'text-icon-disabled'} />
                Unirse a la Clase
              </button>
            </div>
          );
        })()}

        {!event.isCancelled && event.sessionStatus === 'FINALIZADA' && (
          <div className="flex justify-end w-full">
            <button
              onClick={() => {
                if (event.canWatchRecording) {
                  router.push(
                    `/plataforma/curso/${event.courseCycleId}/evaluacion/${event.evaluationId}/clase/${event.id}`
                  );
                }
              }}
              disabled={!event.canWatchRecording}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium font-['Poppins'] transition-colors ${
                event.canWatchRecording
                  ? 'bg-bg-accent-primary-solid text-text-white hover:bg-bg-accent-primary-solid/90 cursor-pointer'
                  : 'bg-bg-accent-primary-solid/40 text-text-white/60 cursor-not-allowed'
              }`}
            >
              <Icon name="play_arrow" size={20} className="text-current" />
              Ver Grabación
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

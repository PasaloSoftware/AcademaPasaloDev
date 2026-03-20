"use client";

import { useState, useEffect } from "react";
import { classEventService } from "@/services/classEvent.service";
import type { ClassEvent } from "@/types/classEvent";
import Modal from "@/components/ui/Modal";

interface EditEventModalProps {
  isOpen: boolean;
  event: ClassEvent | null;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditEventModal({
  isOpen,
  event,
  onClose,
  onUpdated,
}: EditEventModalProps) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [liveMeetingUrl, setLiveMeetingUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;

    setTitle(event.title);
    setTopic(event.topic || "");
    setLiveMeetingUrl(event.liveMeetingUrl || "");

    const start = new Date(event.startDatetime);
    const end = new Date(event.endDatetime);

    setStartDate(start.toISOString().split("T")[0]);
    setStartTime(
      `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`,
    );
    setEndDate(end.toISOString().split("T")[0]);
    setEndTime(
      `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`,
    );
    setError(null);
  }, [event]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setError(null);

    if (!title || !startDate || !startTime || !endDate || !endTime) {
      setError("Por favor completa todos los campos requeridos.");
      return;
    }

    const startDatetime = `${startDate}T${startTime}:00`;
    const endDatetime = `${endDate}T${endTime}:00`;

    if (new Date(endDatetime) <= new Date(startDatetime)) {
      setError("La hora de fin debe ser posterior a la hora de inicio.");
      return;
    }

    setSubmitting(true);
    try {
      await classEventService.updateEvent(event.id, {
        title,
        topic: topic || undefined,
        startDatetime,
        endDatetime,
        liveMeetingUrl: liveMeetingUrl || undefined,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar el evento.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) return null;

  const inputClasses = "h-10 px-3 bg-bg-primary rounded-lg border border-stroke-primary text-sm text-text-primary focus:outline-none focus:border-stroke-accent-primary";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Evento"
      size="md"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Modal.Button>
          <Modal.Button
            variant="primary"
            loading={submitting}
            loadingText="Guardando..."
            onClick={() => {
              const form = document.getElementById('edit-event-form') as HTMLFormElement;
              form?.requestSubmit();
            }}
          >
            Guardar Cambios
          </Modal.Button>
        </>
      }
    >
      <form id="edit-event-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="px-4 py-3 bg-bg-error-light text-text-error-primary text-sm rounded-lg">
            {error}
          </div>
        )}

        <p className="text-sm text-text-secondary">
          {event.courseName} - {event.evaluationName}
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            className={inputClasses}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Tema</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Tema de la clase"
            maxLength={120}
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Fecha inicio *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClasses} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Hora inicio *</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClasses} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Fecha fin *</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClasses} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Hora fin *</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClasses} required />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Link de reunión</label>
          <input
            type="url"
            value={liveMeetingUrl}
            onChange={(e) => setLiveMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/..."
            maxLength={500}
            className={inputClasses}
          />
        </div>
      </form>
    </Modal>
  );
}

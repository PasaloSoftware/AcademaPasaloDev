"use client";

import { useState, useEffect } from "react";
import { classEventService } from "@/services/classEvent.service";
import { evaluationsService } from "@/services/evaluations.service";
import type { Evaluation } from "@/types/api";
import type { CourseCycle } from "@/types/enrollment";
import Modal from "@/components/ui/Modal";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  courseCycles: CourseCycle[];
}

export default function CreateEventModal({
  isOpen,
  onClose,
  onCreated,
  courseCycles,
}: CreateEventModalProps) {
  const [selectedCourseCycleId, setSelectedCourseCycleId] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState("");
  const [sessionNumber, setSessionNumber] = useState(1);
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
    if (!selectedCourseCycleId) {
      setEvaluations([]);
      setSelectedEvaluationId("");
      return;
    }

    const loadEvaluations = async () => {
      setLoadingEvaluations(true);
      try {
        const data = await evaluationsService.findByCourseCycle(selectedCourseCycleId);
        setEvaluations(data);
        setSelectedEvaluationId("");
      } catch (err) {
        console.error("Error loading evaluations:", err);
        setEvaluations([]);
      } finally {
        setLoadingEvaluations(false);
      }
    };

    loadEvaluations();
  }, [selectedCourseCycleId]);

  useEffect(() => {
    if (!selectedEvaluationId || !sessionNumber) return;

    const evaluation = evaluations.find((e) => e.id === selectedEvaluationId);
    if (evaluation) {
      const evalName = evaluation.evaluationType
        ? `${evaluation.evaluationType.code}${evaluation.number}`
        : `Eval ${evaluation.number}`;
      setTitle(`${sessionNumber}° Clase - ${evalName}`);
    }
  }, [selectedEvaluationId, sessionNumber, evaluations]);

  useEffect(() => {
    if (startDate && !endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const resetForm = () => {
    setSelectedCourseCycleId("");
    setEvaluations([]);
    setSelectedEvaluationId("");
    setSessionNumber(1);
    setTitle("");
    setTopic("");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setLiveMeetingUrl("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedEvaluationId || !title || !topic || !startDate || !startTime || !endDate || !endTime || !liveMeetingUrl) {
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
      await classEventService.createEvent({
        evaluationId: selectedEvaluationId,
        sessionNumber,
        title,
        topic,
        startDatetime,
        endDatetime,
        liveMeetingUrl,
      });
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear el evento.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getEvaluationLabel = (ev: Evaluation) => {
    if (ev.evaluationType) {
      return `${ev.evaluationType.code}${ev.number} - ${ev.evaluationType.name}`;
    }
    return `Evaluación ${ev.number}`;
  };

  const inputClasses = "h-10 px-3 bg-bg-primary rounded-lg border border-stroke-primary text-sm text-text-primary focus:outline-none focus:border-stroke-accent-primary";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar Evento"
      size="md"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Modal.Button>
          <Modal.Button
            variant="primary"
            type="submit"
            loading={submitting}
            loadingText="Registrando..."
            onClick={() => {
              const form = document.getElementById('create-event-form') as HTMLFormElement;
              form?.requestSubmit();
            }}
          >
            Registrar Evento
          </Modal.Button>
        </>
      }
    >
      <form id="create-event-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="px-4 py-3 bg-bg-error-light text-text-error-primary text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Curso *</label>
          <select
            value={selectedCourseCycleId}
            onChange={(e) => setSelectedCourseCycleId(e.target.value)}
            className={inputClasses}
            required
          >
            <option value="">Selecciona un curso</option>
            {courseCycles.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.course?.code} - {cc.course?.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Evaluación *</label>
          <select
            value={selectedEvaluationId}
            onChange={(e) => setSelectedEvaluationId(e.target.value)}
            className={`${inputClasses} disabled:opacity-50`}
            disabled={!selectedCourseCycleId || loadingEvaluations}
            required
          >
            <option value="">
              {loadingEvaluations ? "Cargando..." : "Selecciona una evaluación"}
            </option>
            {evaluations.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {getEvaluationLabel(ev)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">N° de Sesión *</label>
          <input
            type="number"
            min={1}
            value={sessionNumber}
            onChange={(e) => setSessionNumber(parseInt(e.target.value) || 1)}
            className={inputClasses}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: 1° Clase - PC1"
            maxLength={255}
            className={inputClasses}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Tema *</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Tema de la clase"
            maxLength={120}
            className={inputClasses}
            required
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
          <label className="text-sm font-medium text-text-secondary">Link de reunión *</label>
          <input
            type="url"
            value={liveMeetingUrl}
            onChange={(e) => setLiveMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/..."
            maxLength={500}
            className={inputClasses}
            required
          />
        </div>
      </form>
    </Modal>
  );
}

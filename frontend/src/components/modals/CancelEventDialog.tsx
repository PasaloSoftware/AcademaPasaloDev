"use client";

import { useState } from "react";
import { classEventService } from "@/services/classEvent.service";
import type { ClassEvent } from "@/types/classEvent";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";

interface CancelEventDialogProps {
  isOpen: boolean;
  event: ClassEvent | null;
  onClose: () => void;
  onCancelled: () => void;
}

export default function CancelEventDialog({
  isOpen,
  event,
  onClose,
  onCancelled,
}: CancelEventDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!event) return;
    setError(null);
    setSubmitting(true);

    try {
      await classEventService.cancelEvent(event.id);
      onCancelled();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cancelar el evento.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar Evento"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={onClose}>
            Volver
          </Modal.Button>
          <Modal.Button
            variant="danger"
            onClick={handleConfirm}
            loading={submitting}
            loadingText="Cancelando..."
          >
            Confirmar Cancelación
          </Modal.Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-bg-error-light rounded-full flex-shrink-0">
          <Icon name="warning" size={20} className="text-bg-error-solid" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text-primary">
            ¿Estás seguro de que deseas cancelar este evento?
          </p>
          <p className="text-sm text-text-secondary">
            <strong>{event.title}</strong> &middot; {event.courseName}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            Esta acción no se puede deshacer.
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-bg-error-light text-text-error-primary text-sm rounded-lg">
          {error}
        </div>
      )}
    </Modal>
  );
}

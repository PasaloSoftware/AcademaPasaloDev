"use client";

import { useState } from "react";
import { classEventService } from "@/services/classEvent.service";
import type { ClassEvent } from "@/types/classEvent";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastContainer";

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
  const { showToast } = useToast();

  const handleConfirm = async () => {
    if (!event) return;
    setError(null);
    setSubmitting(true);

    try {
      await classEventService.cancelEvent(event.id);
      onCancelled();
      onClose();
      showToast({ type: "success", title: "Evento eliminado con éxito", description: "La clase ha sido eliminada correctamente." });
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
      title="¿Eliminar esta clase?"
      size="sm"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={onClose}>
            Cancelar
          </Modal.Button>
          <Modal.Button
            variant="danger"
            onClick={handleConfirm}
            loading={submitting}
            loadingText="Eliminando..."
          >
            Eliminar
          </Modal.Button>
        </>
      }
    >
      <p className="text-text-tertiary text-base font-normal leading-4">
        ¿Estás seguro de que deseas eliminar esta clase? Si la clase tiene materiales asociados, estos también serán eliminados.
      </p>

      {error && (
        <div className="px-4 py-3 bg-bg-error-light text-text-error-primary text-sm rounded-lg">
          {error}
        </div>
      )}
    </Modal>
  );
}

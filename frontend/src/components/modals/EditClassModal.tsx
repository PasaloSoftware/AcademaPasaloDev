'use client';

import { useState } from 'react';
import { classEventService } from '@/services/classEvent.service';
import type { ClassEvent } from '@/types/classEvent';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastContainer';
import ClassFormFields from './ClassFormFields';

interface EditClassModalProps {
  isOpen: boolean;
  event: ClassEvent;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditClassModal({ isOpen, event, onClose, onSaved }: EditClassModalProps) {
  const { showToast } = useToast();
  const start = new Date(event.startDatetime);
  const end = new Date(event.endDatetime);

  const [topic, setTopic] = useState(event.topic);
  const [startDate, setStartDate] = useState(start.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(start.toTimeString().slice(0, 5));
  const [endDate, setEndDate] = useState(end.toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState(end.toTimeString().slice(0, 5));
  const [meetingUrl, setMeetingUrl] = useState(event.liveMeetingUrl || '');
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const hasChanges =
    topic !== event.topic ||
    startDate !== start.toISOString().split('T')[0] ||
    startTime !== start.toTimeString().slice(0, 5) ||
    endDate !== end.toISOString().split('T')[0] ||
    endTime !== end.toTimeString().slice(0, 5) ||
    meetingUrl !== (event.liveMeetingUrl || '');

  const handleClose = () => {
    if (hasChanges) setShowDiscard(true);
    else onClose();
  };

  const handleSaveClick = () => {
    if (!hasChanges) { onClose(); return; }
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    if (!topic.trim()) return;
    const startDt = `${startDate}T${startTime}:00`;
    const endDt = `${endDate}T${endTime}:00`;
    if (new Date(endDt) <= new Date(startDt)) {
      showToast({ type: 'error', title: 'Error', description: 'La hora de fin debe ser posterior a la de inicio.' });
      setShowSaveConfirm(false);
      return;
    }
    setSaving(true);
    try {
      await classEventService.updateEvent(event.id, {
        topic: topic.trim(),
        startDatetime: startDt,
        endDatetime: endDt,
        liveMeetingUrl: meetingUrl.trim() || undefined,
      });
      setShowSaveConfirm(false);
      onSaved();
      onClose();
      showToast({ type: 'success', title: 'Evento guardado con éxito', description: 'La clase ha sido guardada correctamente.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo actualizar.' });
    } finally {
      setSaving(false);
    }
  };

  const autoTitle = `Clase ${event.sessionNumber} - ${event.evaluationName}`;
  const profNames = event.professors.map((p) => `${p.firstName} ${p.lastName1}`);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Editar Clase"
        size="lg"
        footer={
          <>
            <Modal.Button variant="secondary" onClick={handleClose}>Cancelar</Modal.Button>
            <Modal.Button disabled={!topic.trim()} onClick={handleSaveClick}>Guardar</Modal.Button>
          </>
        }
      >
        <ClassFormFields
          courseName={event.courseName}
          evaluationName={event.evaluationName}
          startDate={startDate} startTime={startTime} endDate={endDate} endTime={endTime}
          onStartDateChange={setStartDate} onStartTimeChange={setStartTime}
          onEndDateChange={setEndDate} onEndTimeChange={setEndTime}
          autoTitle={autoTitle}
          topic={topic} onTopicChange={setTopic}
          meetingUrl={meetingUrl} onMeetingUrlChange={setMeetingUrl}
          professorNames={profNames}
          idPrefix="edit-class"
        />
      </Modal>

      <Modal
        isOpen={showDiscard}
        onClose={() => setShowDiscard(false)}
        title="¿Descartar los cambios no guardados?"
        size="sm"
        zIndex={60}
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => setShowDiscard(false)}>Cancelar</Modal.Button>
            <Modal.Button variant="danger" onClick={() => { setShowDiscard(false); onClose(); }}>Descartar</Modal.Button>
          </>
        }
      >
        <p className="text-text-tertiary text-base font-normal leading-4">
          Si cancelas, perderás todos los cambios no guardados en esta clase. ¿Seguro que deseas descartar los cambios?
        </p>
      </Modal>

      <Modal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        title="¿Guardar cambios en la clase?"
        size="sm"
        zIndex={60}
        footer={
          <>
            <Modal.Button variant="secondary" onClick={() => { setShowSaveConfirm(false); onClose(); }}>Descartar</Modal.Button>
            <Modal.Button loading={saving} loadingText="Guardando..." onClick={handleConfirmSave}>Guardar</Modal.Button>
          </>
        }
      >
        <p className="text-text-tertiary text-base font-normal leading-4">
          Has modificado algunos datos de la clase. ¿Deseas guardar los cambios realizados?
        </p>
      </Modal>
    </>
  );
}
